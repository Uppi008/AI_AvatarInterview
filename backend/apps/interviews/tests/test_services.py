from unittest.mock import patch

import pytest

from apps.interviews import services as interview_services
from apps.interviews.models import InterviewSession

pytestmark = pytest.mark.django_db


class TestStartSession:
    def test_creates_session_with_questions(self, student, avatar):
        def fake_generate(*, session):
            from tests.factories import InterviewQuestionFactory

            return [InterviewQuestionFactory(session=session, order_index=0)]

        with patch("apps.ai_engine.services.generate_question_bank", side_effect=fake_generate):
            session = interview_services.start_session(student=student, avatar_id=avatar.id, language="en")

        assert session.status == InterviewSession.Status.IN_PROGRESS
        assert session.questions.count() == 1

    def test_uses_active_resume_when_none_specified(self, student, avatar, resume):
        with patch("apps.ai_engine.services.generate_question_bank", return_value=[]):
            session = interview_services.start_session(student=student, avatar_id=avatar.id, language="en")

        assert session.resume_id == resume.id

    def test_rolls_back_session_when_question_generation_fails(self, student, avatar):
        before = InterviewSession.objects.count()

        with patch("apps.ai_engine.services.generate_question_bank", side_effect=RuntimeError("no API key")):
            with pytest.raises(RuntimeError):
                interview_services.start_session(student=student, avatar_id=avatar.id, language="en")

        assert InterviewSession.objects.count() == before


class TestEndSession:
    def test_marks_completed_without_reason(self, interview_session):
        with patch("apps.interviews.tasks.generate_report_task.delay"):
            ended = interview_services.end_session(session=interview_session)

        assert ended.status == InterviewSession.Status.COMPLETED
        assert ended.ended_at is not None

    def test_marks_terminated_with_reason(self, interview_session):
        with patch("apps.interviews.tasks.generate_report_task.delay"):
            ended = interview_services.end_session(session=interview_session, reason="Too many violations.")

        assert ended.status == InterviewSession.Status.TERMINATED
        assert ended.termination_reason == "Too many violations."

    def test_queues_report_generation(self, interview_session):
        with patch("apps.interviews.tasks.generate_report_task.delay") as mock_delay:
            interview_services.end_session(session=interview_session)

        mock_delay.assert_called_once_with(session_id=str(interview_session.id))
