import secrets

from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsStudent

from .models import InterviewReport
from .serializers import InterviewReportSerializer, SharedReportSerializer


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

    @action(detail=True, methods=["post", "delete"])
    def share(self, request, pk=None):
        """POST creates (or returns) a public read-only link token; DELETE revokes it."""
        report = self.get_object()
        if request.method == "DELETE":
            report.share_token = None
            report.save(update_fields=["share_token", "updated_at"])
            return Response(status=status.HTTP_204_NO_CONTENT)
        if not report.share_token:
            report.share_token = secrets.token_urlsafe(24)
            report.save(update_fields=["share_token", "updated_at"])
        return Response({"share_token": report.share_token})


class SharedReportView(APIView):
    """GET /api/v1/reports/shared/<token>/ -- public, read-only report summary."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request, token):
        report = get_object_or_404(
            InterviewReport.objects.select_related("session__avatar", "session__student__user"),
            share_token=token,
        )
        return Response(SharedReportSerializer(report).data)
