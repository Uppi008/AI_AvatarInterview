from unittest.mock import patch

import pytest

from apps.ai_engine.schemas import CodeReviewResult, CoverLetterResult, QuizQuestion, QuizResult
from apps.career.models import JobMatch, Quiz
from tests.factories import StudentProfileFactory

pytestmark = pytest.mark.django_db

FAKE_QUIZ = QuizResult(
    questions=[
        QuizQuestion(question=f"Q{i}", options=["a", "b", "c", "d"], correct_index=i % 4, explanation="why")
        for i in range(4)
    ]
)
FAKE_REVIEW = CodeReviewResult(
    analysis="Two nested loops",
    correctness_score=40,
    readability_score=70,
    efficiency_score=30,
    time_complexity="O(n^2)",
    space_complexity="O(1)",
    verdict="Works but slow",
    bugs=["Returns the same index twice"],
    improved_code="def f(): pass",
)


class TestQuiz:
    url = "/api/v1/career/quizzes/"

    def _create(self, auth_client):
        with patch("apps.ai_engine.services.generate_quiz", return_value=FAKE_QUIZ):
            return auth_client.post(self.url, {"topic": "Django ORM", "difficulty": "easy", "count": 4})

    def test_answers_are_hidden_until_submitted(self, auth_client):
        response = self._create(auth_client)

        assert response.status_code == 201
        assert response.data["questions"][0] == {"question": "Q0", "options": ["a", "b", "c", "d"]}
        detail = auth_client.get(f"{self.url}{response.data['id']}/")
        assert "correct_index" not in detail.data["questions"][0]

    def test_submit_scores_on_the_server_and_reveals_answers(self, auth_client):
        quiz_id = self._create(auth_client).data["id"]

        # correct: 0,1,2,3 -> two right, one wrong, one skipped
        response = auth_client.post(f"{self.url}{quiz_id}/submit/", {"answers": [0, 1, 0, None]})

        assert response.status_code == 200
        assert float(response.data["score"]) == 50
        assert response.data["questions"][1]["correct_index"] == 1
        assert response.data["questions"][1]["explanation"] == "why"

    def test_cannot_submit_twice_or_with_wrong_length(self, auth_client):
        quiz_id = self._create(auth_client).data["id"]

        short = auth_client.post(f"{self.url}{quiz_id}/submit/", {"answers": [0]})
        auth_client.post(f"{self.url}{quiz_id}/submit/", {"answers": [0, 0, 0, 0]})
        again = auth_client.post(f"{self.url}{quiz_id}/submit/", {"answers": [1, 1, 1, 1]})

        assert short.status_code == 400
        assert again.status_code == 400
        assert float(Quiz.objects.get().score) == 25

    def test_cannot_submit_someone_elses_quiz(self, auth_client):
        other = Quiz.objects.create(student=StudentProfileFactory(), topic="x", questions=FAKE_QUIZ.dict()["questions"])

        response = auth_client.post(f"{self.url}{other.id}/submit/", {"answers": [0, 1, 2, 3]})

        assert response.status_code == 404


class TestCodeReview:
    def test_reviews_code(self, auth_client):
        with patch("apps.ai_engine.services.review_code", return_value=FAKE_REVIEW) as ai:
            response = auth_client.post(
                "/api/v1/career/code-reviews/",
                {"problem": "Two sum problem here", "code": "def f():\n    return 1", "code_language": "Python"},
            )

        assert response.status_code == 201
        assert response.data["time_complexity"] == "O(n^2)"
        assert response.data["bugs"] == ["Returns the same index twice"]
        assert ai.call_args.kwargs["code"] == "def f():\n    return 1"  # indentation kept

    def test_rejects_unknown_language(self, auth_client):
        response = auth_client.post(
            "/api/v1/career/code-reviews/",
            {"problem": "Two sum problem here", "code": "print('hello')", "code_language": "Brainfuck"},
        )

        assert response.status_code == 400


class TestCoverLetter:
    def test_writes_and_saves_cover_letter(self, auth_client, student):
        match = JobMatch.objects.create(student=student, job_title="Dev", company="Infosys", job_description="x")
        fake = CoverLetterResult(subject="Application", letter="Dear team...")

        with patch("apps.ai_engine.services.write_cover_letter", return_value=fake) as ai:
            response = auth_client.post(f"/api/v1/career/job-matches/{match.id}/cover-letter/")

        assert response.status_code == 200
        assert response.data["cover_letter"] == "Dear team..."
        assert ai.call_args.kwargs["candidate_name"] == student.user.full_name
        match.refresh_from_db()
        assert match.cover_letter_subject == "Application"

    def test_ai_failure_is_503(self, auth_client, student):
        match = JobMatch.objects.create(student=student, job_description="x")

        with patch("apps.ai_engine.services.write_cover_letter", side_effect=RuntimeError("down")):
            response = auth_client.post(f"/api/v1/career/job-matches/{match.id}/cover-letter/")

        assert response.status_code == 503
