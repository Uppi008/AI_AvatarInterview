from django.db.models import Avg, Count
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.interviews.models import InterviewSession
from apps.reports.models import InterviewReport
from apps.users.models import User
from common.permissions import IsAdminRole

from . import services
from .models import AIModelConfig, LanguageConfig, PlatformSetting
from .serializers import (
    AIModelConfigSerializer,
    LanguageConfigSerializer,
    PlatformAnalyticsSerializer,
    PlatformSettingSerializer,
)


class LanguageConfigViewSet(viewsets.ModelViewSet):
    """Admin CRUD for which languages the platform currently supports."""

    queryset = LanguageConfig.objects.all()
    serializer_class = LanguageConfigSerializer
    permission_classes = [IsAdminRole]


class AIModelConfigViewSet(viewsets.ModelViewSet):
    """Admin CRUD for which LLM/model backs each AI task (Module 8)."""

    queryset = AIModelConfig.objects.all()
    serializer_class = AIModelConfigSerializer
    permission_classes = [IsAdminRole]

    def perform_create(self, serializer):
        instance = serializer.save()
        if instance.is_active:
            services.set_active_ai_model_config(instance)

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.is_active:
            services.set_active_ai_model_config(instance)


class PlatformSettingViewSet(viewsets.ModelViewSet):
    queryset = PlatformSetting.objects.all()
    serializer_class = PlatformSettingSerializer
    permission_classes = [IsAdminRole]
    lookup_field = "key"


class PlatformAnalyticsView(APIView):
    """GET /api/v1/admin/analytics/ — platform-wide numbers for the admin dashboard."""

    permission_classes = [IsAdminRole]

    def get(self, request):
        sessions = InterviewSession.objects.all()
        avg_score = InterviewReport.objects.aggregate(avg=Avg("overall_score"))["avg"] or 0

        data = {
            "total_students": User.objects.filter(role=User.Role.STUDENT).count(),
            "total_interviews": sessions.count(),
            "completed_interviews": sessions.filter(status=InterviewSession.Status.COMPLETED).count(),
            "terminated_interviews": sessions.filter(status=InterviewSession.Status.TERMINATED).count(),
            "average_overall_score": round(float(avg_score), 2),
            "avatar_usage": dict(sessions.values_list("avatar__name").annotate(count=Count("id")).order_by()),
            "language_usage": dict(sessions.values_list("language").annotate(count=Count("id")).order_by()),
        }
        return Response(PlatformAnalyticsSerializer(data).data)
