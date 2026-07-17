from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from common.permissions import IsStudent
from common.throttling import ScopedThrottleOnCreateMixin

from . import services
from .models import InterviewSession
from .serializers import (
    InterviewSessionCreateSerializer,
    InterviewSessionDetailSerializer,
    InterviewSessionListSerializer,
)


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
            .select_related("avatar", "resume")
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
        session = services.start_session(
            student=request.user.student_profile,
            avatar_id=serializer.validated_data["avatar_id"],
            resume_id=serializer.validated_data.get("resume_id"),
            language=serializer.validated_data["language"],
        )
        return Response(InterviewSessionDetailSerializer(session).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def end(self, request, pk=None):
        session = self.get_object()
        session = services.end_session(session=session)
        return Response(InterviewSessionDetailSerializer(session).data)
