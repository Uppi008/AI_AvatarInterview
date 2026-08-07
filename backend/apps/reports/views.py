from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, viewsets

from common.permissions import IsStudent

from .models import InterviewReport
from .serializers import InterviewReportSerializer


class InterviewReportViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Read-only access to a student's own interview reports.

    Supports ?session=<id> so the frontend can look up a specific session's
    report without knowing the report's own id (the report screen is linked
    to from a session, not vice versa).
    """

    serializer_class = InterviewReportSerializer
    permission_classes = [IsStudent]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["session"]

    def get_queryset(self):
        return InterviewReport.objects.filter(session__student__user=self.request.user)
