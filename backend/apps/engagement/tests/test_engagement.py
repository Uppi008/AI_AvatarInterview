"""Streaks, badges, daily question, notifications, report sharing, admin dashboard."""
from datetime import date, timedelta
from unittest.mock import patch

import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.career.models import AnswerPractice, Quiz
from apps.engagement import services
from apps.interviews.models import InterviewSession
from apps.notifications.in_app import notify
from apps.notifications.models import Notification
from apps.reports.models import InterviewReport
from apps.reports.services import create_report_and_send_email
from apps.users.models import User
from tests.factories import InterviewSessionFactory, StudentProfileFactory, UserFactory

pytestmark = pytest.mark.django_db


class TestStreak:
    def test_current_streak_counts_back_from_today(self):
        today = date(2026, 11, 25)
        dates = {today, today - timedelta(days=1), today - timedelta(days=2), today - timedelta(days=5)}

        streak = services.compute_streak(dates, today=today)

        assert streak["current"] == 3
        assert streak["longest"] == 3
        assert streak["active_today"] is True
        assert [d["active"] for d in streak["last_7_days"]] == [False, True, False, False, True, True, True]

    def test_streak_survives_until_the_end_of_the_next_day(self):
        today = date(2026, 11, 25)
        streak = services.compute_streak({today - timedelta(days=1), today - timedelta(days=2)}, today=today)
        assert streak["current"] == 2
        assert streak["active_today"] is False

    def test_missed_two_days_resets_current_but_not_longest(self):
        today = date(2026, 11, 25)
        old_run = {today - timedelta(days=d) for d in range(5, 10)}
        streak = services.compute_streak(old_run, today=today)
        assert streak["current"] == 0
        assert streak["longest"] == 5

    def test_daily_question_is_stable_per_day(self):
        day = date(2026, 1, 1)
        assert services.daily_question(day) == services.daily_question(day)
        assert services.daily_question(day) != services.daily_question(day + timedelta(days=1))


class TestProgressEndpoint:
    def test_progress_reports_streak_badges_and_notifies_new_badges(self, auth_client, student):
        AnswerPractice.objects.create(student=student, question="q", answer="a")
        InterviewSessionFactory(student=student, status=InterviewSession.Status.COMPLETED, started_at=timezone.now())

        response = auth_client.get("/api/v1/engagement/progress/")

        assert response.status_code == 200
        assert response.data["streak"]["current"] == 1
        badges = {b["id"]: b for b in response.data["badges"]}
        assert badges["first_interview"]["earned"] is True
        assert badges["interviews_5"]["earned"] is False
        assert badges["interviews_5"]["progress"] == 1
        # Earned badge -> exactly one notification, even when checked twice.
        auth_client.get("/api/v1/engagement/progress/")
        assert Notification.objects.filter(user=student.user, dedupe_key="badge:first_interview").count() == 1

    def test_aptitude_and_topic_quizzes_count_toward_different_badges(self, auth_client, student):
        Quiz.objects.create(student=student, topic="x", category="quantitative", score=85, submitted_at=timezone.now())

        badges = {b["id"]: b for b in auth_client.get("/api/v1/engagement/progress/").data["badges"]}

        assert badges["aptitude_80"]["earned"] is True
        assert badges["quiz_ace"]["earned"] is False

    def test_daily_question_shows_todays_answer(self, auth_client, student):
        first = auth_client.get("/api/v1/engagement/daily-question/")
        assert first.data["practice"] is None

        AnswerPractice.objects.create(student=student, question=first.data["question"], answer="My answer", overall_score=72)

        second = auth_client.get("/api/v1/engagement/daily-question/")
        assert second.data["practice"]["answer"] == "My answer"


class TestNotifications:
    url = "/api/v1/notifications/"

    def test_dedupe_key_prevents_duplicates(self, user):
        assert notify(user=user, title="a", dedupe_key="k") is not None
        assert notify(user=user, title="a", dedupe_key="k") is None
        assert Notification.objects.filter(user=user).count() == 1

    def test_report_creation_notifies_once(self, interview_session):
        with patch("apps.reports.tasks.render_and_email_report_task.delay"):
            create_report_and_send_email(session=interview_session, report_data={"overall_score": 77})
            create_report_and_send_email(session=interview_session, report_data={"overall_score": 80})

        notes = Notification.objects.filter(user=interview_session.student.user, kind="report_ready")
        assert notes.count() == 1
        assert notes.get().link == f"/interviews/{interview_session.id}/report"

    def test_list_read_and_read_all(self, auth_client, student):
        a = notify(user=student.user, title="one")
        notify(user=student.user, title="two")
        notify(user=UserFactory(), title="someone else's")

        listed = auth_client.get(self.url)
        assert listed.data["count"] == 2
        assert listed.data["unread_count"] == 2

        auth_client.post(f"{self.url}{a.id}/read/")
        assert auth_client.get(self.url).data["unread_count"] == 1

        auth_client.post(f"{self.url}read-all/")
        assert auth_client.get(self.url).data["unread_count"] == 0

    def test_cannot_read_someone_elses_notification(self, auth_client):
        other = notify(user=UserFactory(), title="private")
        assert auth_client.post(f"{self.url}{other.id}/read/").status_code == 404

    def test_upcoming_scheduled_interview_creates_a_reminder(self, auth_client, student):
        InterviewSessionFactory(
            student=student, status=InterviewSession.Status.SCHEDULED, scheduled_at=timezone.now() + timedelta(hours=3)
        )
        InterviewSessionFactory(
            student=student, status=InterviewSession.Status.SCHEDULED, scheduled_at=timezone.now() + timedelta(days=4)
        )

        auth_client.get(self.url)
        auth_client.get(self.url)

        assert Notification.objects.filter(user=student.user, kind="scheduled").count() == 1


class TestReportSharing:
    def _report(self, session):
        return InterviewReport.objects.create(session=session, overall_score=81, strengths=["Clear"])

    def test_share_creates_a_public_link_and_revoke_removes_it(self, auth_client, interview_session):
        report = self._report(interview_session)

        token = auth_client.post(f"/api/v1/reports/{report.id}/share/").data["share_token"]
        again = auth_client.post(f"/api/v1/reports/{report.id}/share/").data["share_token"]
        assert token and token == again

        public = APIClient().get(f"/api/v1/reports/shared/{token}/")
        assert public.status_code == 200
        assert float(public.data["overall_score"]) == 81
        assert "email" not in str(public.data)
        assert public.data["candidate_name"] == interview_session.student.user.full_name.split(" ")[0]

        assert auth_client.delete(f"/api/v1/reports/{report.id}/share/").status_code == 204
        assert APIClient().get(f"/api/v1/reports/shared/{token}/").status_code == 404

    def test_cannot_share_someone_elses_report(self, auth_client):
        report = self._report(InterviewSessionFactory(student=StudentProfileFactory()))
        assert auth_client.post(f"/api/v1/reports/{report.id}/share/").status_code == 404


class TestAdminStudents:
    url = "/api/v1/admin/students/"

    def _admin_client(self):
        admin = UserFactory(role=User.Role.ADMIN)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(admin).access_token}")
        return client

    def test_lists_students_with_progress_and_filters(self):
        a = StudentProfileFactory(institution="JNTU")
        StudentProfileFactory(institution="Osmania")
        session = InterviewSessionFactory(student=a, status=InterviewSession.Status.COMPLETED, started_at=timezone.now())
        InterviewReport.objects.create(session=session, overall_score=70)

        client = self._admin_client()
        everyone = client.get(self.url)
        jntu = client.get(self.url, {"institution": "JNTU"})

        assert everyone.status_code == 200
        assert everyone.data["count"] == 2
        assert everyone.data["institutions"] == ["JNTU", "Osmania"]
        assert jntu.data["count"] == 1
        row = jntu.data["results"][0]
        assert row["interviews_completed"] == 1
        assert row["average_score"] == 70.0

    def test_students_cannot_see_it(self, auth_client):
        assert auth_client.get(self.url).status_code == 403
