import logging

from django.db.models import Count
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.response import Response

from common.permissions import IsStudent
from common.throttling import ScopedThrottleOnCreateMixin

from . import services
from .models import InterviewSession
from apps.reports.serializers import InterviewReportSerializer

from .serializers import (
    InterviewSessionCreateSerializer,
    InterviewSessionDetailSerializer,
    InterviewSessionListSerializer,
)

logger = logging.getLogger(__name__)


class ScoringUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "We couldn't score this interview right now. Please try again in a minute."
    default_code = "scoring_unavailable"


class InterviewSessionViewSet(
    ScopedThrottleOnCreateMixin,
    mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet
):
    """Session lifecycle over REST: create/list/retrieve/end.

    The live question-by-question exchange (speak/listen/follow-up/skip/
    repeat/timer) happens over the WebSocket in apps.interviews.consumers,
    fully implemented in Phase 7.
    """

    permission_classes = [IsStudent]
    throttle_scope = "interview_start"

    def get_queryset(self):
        return (
            InterviewSession.objects.filter(student__user=self.request.user)
            .select_related("avatar", "resume", "report")
            .annotate(answered_count=Count("questions__answer"))
            .order_by("-created_at")
        )

    def get_serializer_class(self):
        if self.action == "create":
            return InterviewSessionCreateSerializer
        if self.action == "retrieve":
            return InterviewSessionDetailSerializer
        return InterviewSessionListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        session = services.start_session(
            student=request.user.student_profile,
            avatar_id=data["avatar_id"],
            resume_id=data.get("resume_id"),
            language=data["language"],
            personality=data.get("personality", ""),
            target_role=data.get("target_role", ""),
            company=data.get("company", ""),
            job_description=data.get("job_description", ""),
            interview_type=data["interview_type"],
            question_count=data["question_count"],
            scheduled_at=data.get("scheduled_at"),
        )
        return Response(InterviewSessionDetailSerializer(session).data, status=status.HTTP_201_CREATED)

    def get_throttles(self):
        # These also generate a question bank with the LLM, like `create`.
        if self.action in ("begin", "retake"):
            return [throttle() for throttle in self.throttle_classes]
        return super().get_throttles()

    @action(detail=True, methods=["post"])
    def begin(self, request, pk=None):
        """Starts a scheduled interview now (generates its questions)."""
        session = self.get_object()
        try:
            session = services.begin_scheduled_session(session=session)
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from None
        return Response(InterviewSessionDetailSerializer(session).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Cancels (deletes) a scheduled interview that hasn't started."""
        session = self.get_object()
        if session.status != InterviewSession.Status.SCHEDULED:
            raise ValidationError({"detail": "Only a scheduled interview can be cancelled."})
        session.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def retake(self, request, pk=None):
        """Starts a new interview with the same interviewer and setup."""
        new_session = services.retake_session(session=self.get_object())
        return Response(InterviewSessionDetailSerializer(new_session).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def end(self, request, pk=None):
        session = self.get_object()
        session = services.end_session(session=session)
        return Response(InterviewSessionDetailSerializer(session).data)

    @action(detail=True, methods=["post"], url_path="generate-report")
    def generate_report(self, request, pk=None):
        """Builds the report on demand -- recovers sessions whose automatic
        post-interview report generation failed."""
        session = self.get_object()
        if session.status not in (InterviewSession.Status.COMPLETED, InterviewSession.Status.TERMINATED):
            raise ValidationError({"detail": "Finish the interview before generating its report."})
        try:
            report = services.generate_report_now(session=session)
        except ValueError:
            raise ValidationError(
                {"detail": "This interview has no answered questions, so there's nothing to score."}
            ) from None
        except Exception as exc:
            logger.exception("On-demand report generation failed for session %s", session.id)
            raise ScoringUnavailable() from exc
        return Response(InterviewReportSerializer(report, context={"request": request}).data, status=status.HTTP_201_CREATED)
