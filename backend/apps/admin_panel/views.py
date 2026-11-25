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


class StudentProgressView(APIView):
    """GET /api/v1/admin/students/?institution=&search= -- every student's
    practice progress, for a college placement officer (TPO) dashboard."""

    permission_classes = [IsAdminRole]

    def get(self, request):
        from django.db.models import Max, Q

        from apps.users.models import StudentProfile

        completed = Q(interview_sessions__status=InterviewSession.Status.COMPLETED)
        students = (
            StudentProfile.objects.filter(user__role=User.Role.STUDENT)
            .select_related("user")
            .annotate(
                interviews_completed=Count("interview_sessions", filter=completed, distinct=True),
                average_score=Avg("interview_sessions__report__overall_score"),
                best_score=Max("interview_sessions__report__overall_score"),
                last_interview_at=Max("interview_sessions__started_at"),
            )
            .order_by("-last_interview_at", "user__full_name")
        )
        institution = request.query_params.get("institution", "").strip()
        if institution:
            students = students.filter(institution__iexact=institution)
        search = request.query_params.get("search", "").strip()
        if search:
            students = students.filter(Q(user__full_name__icontains=search) | Q(user__email__icontains=search))

        rows = [
            {
                "id": str(s.id),
                "full_name": s.user.full_name,
                "email": s.user.email,
                "institution": s.institution,
                "graduation_year": s.graduation_year,
                "interviews_completed": s.interviews_completed,
                "average_score": round(float(s.average_score), 1) if s.average_score is not None else None,
                "best_score": round(float(s.best_score), 1) if s.best_score is not None else None,
                "last_interview_at": s.last_interview_at,
                "joined_at": s.user.created_at,
            }
            for s in students[:500]
        ]
        institutions = sorted(
            {i for i in StudentProfile.objects.exclude(institution="").values_list("institution", flat=True)}
        )
        return Response({"count": len(rows), "institutions": institutions, "results": rows})
