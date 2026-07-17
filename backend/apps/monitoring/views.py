from rest_framework import mixins, viewsets
from rest_framework.exceptions import PermissionDenied

from apps.interviews.models import InterviewSession
from common.permissions import IsStudent

from . import services
from .models import ProctoringEvent
from .serializers import ProctoringEventCreateSerializer, ProctoringEventSerializer


class ProctoringEventViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    """REST fallback for logging proctoring signals.

    The primary live path is the interview WebSocket (Phase 7), which
    calls the same `monitoring.services.record_event` function; this
    endpoint exists for clients/tests that aren't on the WS connection.
    """

    permission_classes = [IsStudent]

    def get_queryset(self):
        return ProctoringEvent.objects.filter(session__student__user=self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return ProctoringEventCreateSerializer
        return ProctoringEventSerializer

    def perform_create(self, serializer):
        session = InterviewSession.objects.get(
            id=serializer.validated_data["session_id"], student__user=self.request.user
        )
        if session.status != InterviewSession.Status.IN_PROGRESS:
            raise PermissionDenied("Session is not in progress.")
        event = services.record_event(
            session=session,
            event_type=serializer.validated_data["event_type"],
            metadata=serializer.validated_data.get("metadata", {}),
        )
        serializer.instance = event
