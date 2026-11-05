import logging

from django.db import DatabaseError
from rest_framework import mixins, status, viewsets
from rest_framework.exceptions import APIException
from rest_framework.response import Response

from common.permissions import IsStudent
from common.throttling import ScopedThrottleOnCreateMixin

from . import services
from .models import AnswerPractice, JobMatch, StudyPlan
from .serializers import (
    AnswerPracticeCreateSerializer,
    AnswerPracticeSerializer,
    JobMatchCreateSerializer,
    JobMatchSerializer,
    StudyPlanCreateSerializer,
    StudyPlanSerializer,
)

logger = logging.getLogger(__name__)


class CoachUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "The AI coach is busy right now. Please try again in a minute."
    default_code = "coach_unavailable"


def _coach_error(exc: Exception) -> CoachUnavailable:
    """Names the real cause when it's one the user/admin can act on, instead
    of a generic "busy" for every failure."""
    name = type(exc).__name__
    if name in ("AuthenticationError", "PermissionDeniedError") or "GROQ_API_KEY" in str(exc):
        return CoachUnavailable(
            "The AI service key is missing or expired. The site admin needs to set a new GROQ_API_KEY on the server.",
            code="ai_key_invalid",
        )
    if name == "RateLimitError":
        return CoachUnavailable(
            "The free AI quota is used up for the moment. Please try again in a few minutes.",
            code="ai_rate_limited",
        )
    return CoachUnavailable()


class _CareerViewSet(
    ScopedThrottleOnCreateMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """Shared shape: list/retrieve/delete your own rows; create runs the AI.

    Subclasses set `model`, `create_serializer_class` and `run()`.
    """

    permission_classes = [IsStudent]
    throttle_scope = "career_ai"
    model = None
    create_serializer_class = None

    def get_queryset(self):
        return self.model.objects.filter(student__user=self.request.user)

    def run(self, student, data):
        raise NotImplementedError

    def create(self, request, *args, **kwargs):
        serializer = self.create_serializer_class(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        data.setdefault("language", request.user.preferred_language or "en")
        try:
            obj = self.run(request.user.student_profile, data)
        except DatabaseError:
            # Not the AI's fault (e.g. unapplied migrations) -- let it surface
            # as a real 500 instead of a misleading "AI is busy".
            raise
        except Exception as exc:
            logger.exception("Career Lab %s failed", self.basename)
            raise _coach_error(exc) from exc
        return Response(self.get_serializer(obj).data, status=status.HTTP_201_CREATED)


class JobMatchViewSet(_CareerViewSet):
    """Paste a job description; get a fit score, skill gaps, resume tips and
    the questions that employer is likely to ask."""

    model = JobMatch
    serializer_class = JobMatchSerializer
    create_serializer_class = JobMatchCreateSerializer

    def run(self, student, data):
        return services.create_job_match(student=student, **data)


class AnswerPracticeViewSet(_CareerViewSet):
    """Practice one answer: STAR breakdown, scores, delivery stats and a
    rewritten, stronger version."""

    model = AnswerPractice
    serializer_class = AnswerPracticeSerializer
    create_serializer_class = AnswerPracticeCreateSerializer

    def run(self, student, data):
        return services.create_answer_practice(student=student, **data)


class StudyPlanViewSet(mixins.UpdateModelMixin, _CareerViewSet):
    """A day-by-day plan built from the student's weakest areas. PATCH
    `completed_tasks` to tick tasks off."""

    model = StudyPlan
    serializer_class = StudyPlanSerializer
    create_serializer_class = StudyPlanCreateSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def run(self, student, data):
        return services.create_study_plan(student=student, **data)
