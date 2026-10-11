from unittest.mock import patch

import pytest

from apps.interviews.models import AnswerEvaluation, InterviewAnswer, InterviewSession
from apps.reports.models import InterviewReport

pytestmark = pytest.mark.django_db


def _answer(question, score=70):
    answer = InterviewAnswer.objects.create(question=question, transcript_text="My answer")
    AnswerEvaluation.objects.create(
        answer=answer, technical_score=score, communication_score=score, relevance_score=score, confidence_score=score
    )
    return answer


FAKE_REPORT_DATA = {"overall_score": 72, "strengths": ["Clear"], "weaknesses": [], "improvement_tips": ["Be concise"]}


class TestGenerateReportEndpoint:
    def url(self, session):
        return f"/api/v1/interviews/{session.id}/generate-report/"

    def test_creates_report_for_finished_session_with_answers(self, auth_client, interview_session, make_question):
        interview_session.status = InterviewSession.Status.COMPLETED
        interview_session.save()
        _answer(make_question(interview_session))

        with patch("apps.ai_engine.services.aggregate_session_report", return_value=FAKE_REPORT_DATA):
            response = auth_client.post(self.url(interview_session))

        assert response.status_code == 201
        assert float(response.data["overall_score"]) == 72
        assert InterviewReport.objects.filter(session=interview_session).exists()

    def test_rejects_session_with_no_answers(self, auth_client, interview_session):
        interview_session.status = InterviewSession.Status.COMPLETED
        interview_session.save()

        response = auth_client.post(self.url(interview_session))

        assert response.status_code == 400
        assert "no answered questions" in response.data["error"]["detail"]

    def test_rejects_unfinished_session(self, auth_client, interview_session):
        interview_session.status = InterviewSession.Status.IN_PROGRESS
        interview_session.save()

        response = auth_client.post(self.url(interview_session))

        assert response.status_code == 400
        assert "Finish the interview" in response.data["error"]["detail"]

    def test_llm_failure_returns_retryable_503(self, auth_client, interview_session, make_question):
        interview_session.status = InterviewSession.Status.COMPLETED
        interview_session.save()
        _answer(make_question(interview_session))

        with patch("apps.ai_engine.services.aggregate_session_report", side_effect=RuntimeError("LLM down")):
            response = auth_client.post(self.url(interview_session))

        assert response.status_code == 503
        assert not InterviewReport.objects.filter(session=interview_session).exists()

    def test_cannot_generate_for_another_students_session(self, auth_client, avatar):
        from tests.factories import InterviewSessionFactory

        other = InterviewSessionFactory(avatar=avatar, status=InterviewSession.Status.COMPLETED)

        response = auth_client.post(self.url(other))

        assert response.status_code == 404


class TestSessionListFields:
    def test_list_includes_answered_count_and_report_score(self, auth_client, interview_session, make_question):
        _answer(make_question(interview_session, order_index=0))
        make_question(interview_session, order_index=1)  # asked but unanswered
        InterviewReport.objects.create(session=interview_session, overall_score=81.5)

        response = auth_client.get("/api/v1/interviews/")

        row = response.data["results"][0]
        assert row["answered_count"] == 1
        assert row["report_score"] == 81.5

    def test_report_score_is_null_without_report(self, auth_client, interview_session):
        response = auth_client.get("/api/v1/interviews/")

        row = response.data["results"][0]
        assert row["answered_count"] == 0
        assert row["report_score"] is None
