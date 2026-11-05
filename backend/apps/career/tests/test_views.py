from unittest.mock import patch

import pytest

from apps.ai_engine.schemas import (
    AnswerCoachResult,
    JobMatchResult,
    LikelyQuestion,
    StudyDay,
    StudyPlanResult,
)
from apps.career.models import JobMatch, StudyPlan
from apps.interviews.models import InterviewSession
from apps.reports.models import InterviewReport
from apps.resumes.models import Resume
from tests.factories import InterviewSessionFactory, ResumeFactory, StudentProfileFactory

pytestmark = pytest.mark.django_db

JOB_DESCRIPTION = "We need a backend engineer with Python, Django, PostgreSQL and REST API experience. " * 2

FAKE_MATCH = JobMatchResult(
    match_score=74,
    verdict="Good fit",
    matched_skills=["Python"],
    missing_skills=["Kubernetes"],
    likely_questions=[LikelyQuestion(question="Explain Django ORM", why_asked="Core stack")],
)
FAKE_COACH = AnswerCoachResult(
    overall_score=61, clarity_score=70, relevance_score=65, impact_score=40, improved_answer="Better answer"
)
FAKE_PLAN = StudyPlanResult(
    summary="Plan",
    focus_areas=["SQL"],
    days=[StudyDay(day=d, title=f"Day {d}", focus="SQL", tasks=["Read", "Practice"]) for d in range(1, 4)],
)


class TestJobMatch:
    url = "/api/v1/career/job-matches/"

    def test_uses_the_students_parsed_resume(self, auth_client, student):
        resume = ResumeFactory(student=student, parsing_status=Resume.ParsingStatus.COMPLETED, raw_text="Python dev")

        with patch("apps.ai_engine.services.match_resume_to_job", return_value=FAKE_MATCH) as ai:
            response = auth_client.post(self.url, {"job_description": JOB_DESCRIPTION, "job_title": "Backend"})

        assert response.status_code == 201
        assert float(response.data["match_score"]) == 74
        assert response.data["likely_questions"][0]["question"] == "Explain Django ORM"
        assert ai.call_args.kwargs["resume_text"] == "Python dev"
        assert JobMatch.objects.get().resume == resume

    def test_rejects_a_too_short_job_description(self, auth_client):
        response = auth_client.post(self.url, {"job_description": "Python dev"})

        assert response.status_code == 400

    def test_cannot_pick_another_students_resume(self, auth_client):
        other = ResumeFactory(student=StudentProfileFactory())

        response = auth_client.post(self.url, {"job_description": JOB_DESCRIPTION, "resume": str(other.id)})

        assert response.status_code == 400

    def test_ai_failure_returns_503_not_500(self, auth_client):
        with patch("apps.ai_engine.services.match_resume_to_job", side_effect=RuntimeError("groq down")):
            response = auth_client.post(self.url, {"job_description": JOB_DESCRIPTION})

        assert response.status_code == 503
        assert not JobMatch.objects.exists()

    def test_lists_only_own_matches(self, auth_client):
        JobMatch.objects.create(student=StudentProfileFactory(), job_description="x")

        response = auth_client.get(self.url)

        assert response.status_code == 200
        assert response.data["count"] == 0


class TestAnswerPractice:
    url = "/api/v1/career/answer-practices/"

    def test_scores_answer_and_adds_delivery_stats(self, auth_client):
        with patch("apps.ai_engine.services.coach_answer", return_value=FAKE_COACH):
            response = auth_client.post(
                self.url,
                {"question": "Tell me about a hard bug.", "answer": "Um, I basically fixed a memory leak in 2 days."},
            )

        assert response.status_code == 201
        assert response.data["improved_answer"] == "Better answer"
        assert response.data["delivery"]["filler_count"] == 2
        assert response.data["star"]["result"]["present"] is False


class TestStudyPlan:
    url = "/api/v1/career/study-plans/"

    def test_builds_plan_from_report_weaknesses(self, auth_client, student, avatar):
        session = InterviewSessionFactory(student=student, avatar=avatar, status=InterviewSession.Status.COMPLETED)
        InterviewReport.objects.create(session=session, weaknesses=["Weak SQL joins"], strengths=["Clear"])

        with patch("apps.ai_engine.services.build_study_plan", return_value=FAKE_PLAN) as ai:
            response = auth_client.post(self.url, {"days": 3, "target_role": "Backend"})

        assert response.status_code == 201
        assert ai.call_args.kwargs["weaknesses"] == ["Weak SQL joins"]
        assert response.data["total_tasks"] == 6
        assert response.data["sources"] == {"reports": 1, "resume": False}

    def test_tick_off_tasks_and_reject_unknown_ones(self, auth_client, student):
        plan = StudyPlan.objects.create(student=student, days=[d.dict() for d in FAKE_PLAN.days])
        url = f"{self.url}{plan.id}/"

        ok = auth_client.patch(url, {"completed_tasks": ["1-0", "2-1", "1-0"]})
        bad = auth_client.patch(url, {"completed_tasks": ["9-0"]})

        assert ok.status_code == 200
        assert ok.data["completed_tasks"] == ["1-0", "2-1"]
        assert bad.status_code == 400

    def test_days_must_be_in_range(self, auth_client):
        response = auth_client.post(self.url, {"days": 30})

        assert response.status_code == 400
