"""Interview setup (role/company/type/count), scheduling and retake."""
from datetime import timedelta
from unittest.mock import patch

import pytest
from django.utils import timezone

from apps.ai_engine.schemas import GeneratedQuestion, QuestionBankResult
from apps.ai_engine.services import _question_mix_instruction, _target_context, generate_question_bank
from apps.interviews.models import InterviewSession
from tests.factories import InterviewSessionFactory, StudentProfileFactory
from tests.mocks import make_fake_chat_model

pytestmark = pytest.mark.django_db

URL = "/api/v1/interviews/"


def _fake_bank(session):
    from apps.interviews.models import InterviewQuestion

    return [
        InterviewQuestion.objects.create(
            session=session, question_text="Q", question_type="behavioral", order_index=0
        )
    ]


class TestInterviewSetup:
    def test_create_stores_role_company_type_and_count(self, auth_client, avatar):
        with patch("apps.ai_engine.services.generate_question_bank", side_effect=lambda session: _fake_bank(session)):
            response = auth_client.post(
                URL,
                {
                    "avatar_id": str(avatar.id),
                    "target_role": "Java Developer",
                    "company": "TCS",
                    "job_description": "Spring Boot {microservices}",
                    "interview_type": "technical",
                    "question_count": 5,
                },
                format="json",
            )

        assert response.status_code == 201
        session = InterviewSession.objects.get()
        assert (session.target_role, session.company, session.interview_type, session.question_count) == (
            "Java Developer", "TCS", "technical", 5,
        )
        assert response.data["status"] == "in_progress"

    def test_question_count_is_bounded(self, auth_client, avatar):
        response = auth_client.post(URL, {"avatar_id": str(avatar.id), "question_count": 50}, format="json")
        assert response.status_code == 400

    def test_prompt_includes_target_job_and_caps_question_count(self, interview_session):
        interview_session.target_role = "Data Analyst"
        interview_session.company = "Infosys"
        interview_session.job_description = "SQL and {Power BI}"
        interview_session.interview_type = InterviewSession.InterviewType.HR
        interview_session.question_count = 2
        interview_session.save()
        bank = QuestionBankResult(
            questions=[GeneratedQuestion(question_text=f"Q{i}", question_type="behavioral") for i in range(4)]
        )

        context = _target_context(interview_session)
        assert "Data Analyst" in context and "Infosys" in context and "{Power BI}" in context
        assert "no coding" in _question_mix_instruction(interview_session)

        with patch("apps.ai_engine.services.get_chat_model", return_value=make_fake_chat_model((QuestionBankResult, bank))):
            questions = generate_question_bank(session=interview_session)
        assert len(questions) == 2  # capped to question_count even if the model returns more


class TestScheduling:
    def test_schedule_books_without_generating_questions(self, auth_client, avatar):
        when = (timezone.now() + timedelta(days=1)).isoformat()
        with patch("apps.ai_engine.services.generate_question_bank") as gen:
            response = auth_client.post(URL, {"avatar_id": str(avatar.id), "scheduled_at": when}, format="json")

        assert response.status_code == 201
        assert response.data["status"] == "scheduled"
        gen.assert_not_called()

    def test_cannot_schedule_in_the_past(self, auth_client, avatar):
        when = (timezone.now() - timedelta(hours=1)).isoformat()
        response = auth_client.post(URL, {"avatar_id": str(avatar.id), "scheduled_at": when}, format="json")
        assert response.status_code == 400

    def test_begin_generates_questions_and_goes_live(self, auth_client, student, avatar):
        session = InterviewSessionFactory(
            student=student, avatar=avatar, status=InterviewSession.Status.SCHEDULED,
            scheduled_at=timezone.now() + timedelta(hours=2),
        )
        with patch("apps.ai_engine.services.generate_question_bank", side_effect=lambda session: _fake_bank(session)):
            response = auth_client.post(f"{URL}{session.id}/begin/")

        assert response.status_code == 200
        session.refresh_from_db()
        assert session.status == InterviewSession.Status.IN_PROGRESS
        assert session.started_at is not None
        assert session.questions.count() == 1

    def test_failed_begin_keeps_the_booking(self, auth_client, student, avatar):
        session = InterviewSessionFactory(student=student, avatar=avatar, status=InterviewSession.Status.SCHEDULED)
        with patch("apps.ai_engine.services.generate_question_bank", side_effect=RuntimeError("LLM down")):
            response = auth_client.post(f"{URL}{session.id}/begin/")
        assert response.status_code == 500
        session.refresh_from_db()
        assert session.status == InterviewSession.Status.SCHEDULED

    def test_begin_rejects_a_session_that_is_not_scheduled(self, auth_client, interview_session):
        response = auth_client.post(f"{URL}{interview_session.id}/begin/")
        assert response.status_code == 400

    def test_cancel_only_scheduled(self, auth_client, student, avatar, interview_session):
        booked = InterviewSessionFactory(student=student, avatar=avatar, status=InterviewSession.Status.SCHEDULED)

        assert auth_client.post(f"{URL}{interview_session.id}/cancel/").status_code == 400
        assert auth_client.post(f"{URL}{booked.id}/cancel/").status_code == 204
        assert not InterviewSession.objects.filter(id=booked.id).exists()

    def test_cannot_touch_another_students_session(self, auth_client, avatar):
        other = InterviewSessionFactory(
            student=StudentProfileFactory(), avatar=avatar, status=InterviewSession.Status.SCHEDULED
        )
        assert auth_client.post(f"{URL}{other.id}/cancel/").status_code == 404


class TestRetake:
    def test_retake_copies_the_setup(self, auth_client, student, avatar):
        original = InterviewSessionFactory(
            student=student, avatar=avatar, status=InterviewSession.Status.COMPLETED,
            personality="strict_hr", target_role="SDE", company="Amazon", interview_type="technical",
            question_count=9, language="hi",
        )
        with patch("apps.ai_engine.services.generate_question_bank", side_effect=lambda session: _fake_bank(session)):
            response = auth_client.post(f"{URL}{original.id}/retake/")

        assert response.status_code == 201
        new = InterviewSession.objects.get(id=response.data["id"])
        assert new.id != original.id
        assert (new.avatar_id, new.personality, new.target_role, new.company, new.interview_type,
                new.question_count, new.language) == (
            avatar.id, "strict_hr", "SDE", "Amazon", "technical", 9, "hi",
        )
        assert new.status == InterviewSession.Status.IN_PROGRESS
