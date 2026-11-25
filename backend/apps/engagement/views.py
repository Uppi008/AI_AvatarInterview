from datetime import datetime, time

from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.career.models import AnswerPractice
from apps.career.serializers import AnswerPracticeSerializer
from apps.notifications.in_app import notify
from apps.notifications.models import Notification
from common.permissions import IsStudent

from . import services


class ProgressView(APIView):
    """GET /api/v1/engagement/progress/ -- practice streak and badges."""

    permission_classes = [IsStudent]

    def get(self, request):
        student = request.user.student_profile
        streak = services.compute_streak(services.activity_dates(student))
        badges = services.compute_badges(student, streak)
        for badge in badges:
            if badge["earned"]:
                notify(
                    user=request.user,
                    kind=Notification.Kind.BADGE,
                    title=f"Badge earned: {badge['title']}",
                    body=badge["description"],
                    link="/dashboard",
                    dedupe_key=f"badge:{badge['id']}",
                )
        return Response({"streak": streak, "badges": badges})


class DailyQuestionView(APIView):
    """GET /api/v1/engagement/daily-question/ -- today's question, plus the
    student's Answer Coach result for it if they already answered today.
    Answers are submitted through POST /api/v1/career/answer-practices/."""

    permission_classes = [IsStudent]

    def get(self, request):
        today = timezone.localdate()
        question = services.daily_question(today)
        start = timezone.make_aware(datetime.combine(today, time.min))
        practice = (
            AnswerPractice.objects.filter(
                student=request.user.student_profile, question=question, created_at__gte=start
            )
            .order_by("-created_at")
            .first()
        )
        return Response(
            {
                "date": today.isoformat(),
                "question": question,
                "practice": AnswerPracticeSerializer(practice).data if practice else None,
            }
        )
