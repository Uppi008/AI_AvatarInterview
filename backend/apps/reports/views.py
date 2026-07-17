from rest_framework import mixins, viewsets

from common.permissions import IsStudent

from .models import InterviewReport
from .serializers import InterviewReportSerializer


class InterviewReportViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Read-only access to a student's own interview reports."""

    serializer_class = InterviewReportSerializer
    permission_classes = [IsStudent]

    def get_queryset(self):
        return InterviewReport.objects.filter(session__student__user=self.request.user)
