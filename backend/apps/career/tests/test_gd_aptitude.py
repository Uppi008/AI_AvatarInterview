"""Group discussion practice and timed aptitude tests."""
from unittest.mock import patch

import pytest

from apps.ai_engine.schemas import (
    GDEvaluationResult,
    GDLine,
    GDParticipant,
    GDReplyResult,
    GDStartResult,
    QuizQuestion,
    QuizResult,
)
from apps.career import services
from apps.career.models import GroupDiscussion, Quiz

pytestmark = pytest.mark.django_db

GD_URL = "/api/v1/career/group-discussions/"

FAKE_START = GDStartResult(
    topic="Should AI replace teachers?",
    participants=[
        GDParticipant(name="Ravi", stance="in favour"),
        GDParticipant(name="Priya", stance="against"),
        GDParticipant(name="Arjun", stance="neutral"),
    ],
    opening=[
        GDLine(speaker="Ravi", text="AI can personalise learning."),
        GDLine(speaker="Ghost", text="Not a participant -- must be dropped."),
    ],
)
FAKE_REPLY = GDReplyResult(
    lines=[GDLine(speaker="Priya", text="But empathy matters."), GDLine(speaker="Nobody", text="dropped")]
)
FAKE_EVAL = GDEvaluationResult(
    content_score=80, communication_score=70, leadership_score=60, listening_score=90,
    summary="Good points.", strengths=["Clear"], improvements=["Summarise at the end"],
)


class TestGroupDiscussion:
    def _start(self, auth_client):
        with patch("apps.ai_engine.services.start_group_discussion", return_value=FAKE_START):
            return auth_client.post(GD_URL, {}, format="json")

    def test_start_creates_participants_and_valid_opening(self, auth_client):
        response = self._start(auth_client)

        assert response.status_code == 201
        assert response.data["topic"] == "Should AI replace teachers?"
        assert [p["name"] for p in response.data["participants"]] == ["Ravi", "Priya", "Arjun"]
        assert [line["speaker"] for line in response.data["transcript"]] == ["Ravi"]

    def test_respond_appends_user_and_ai_lines(self, auth_client, student):
        gd_id = self._start(auth_client).data["id"]
        with patch("apps.ai_engine.services.continue_group_discussion", return_value=FAKE_REPLY):
            response = auth_client.post(f"{GD_URL}{gd_id}/respond/", {"message": "Teachers inspire."}, format="json")

        assert response.status_code == 200
        lines = response.data["transcript"]
        assert lines[-2]["is_user"] is True and lines[-2]["text"] == "Teachers inspire."
        assert lines[-1]["speaker"] == "Priya"
        assert response.data["user_turns"] == 1

    def test_cannot_finish_without_speaking(self, auth_client):
        gd_id = self._start(auth_client).data["id"]
        assert auth_client.post(f"{GD_URL}{gd_id}/finish/").status_code == 400

    def test_finish_scores_and_blocks_more_turns(self, auth_client):
        gd_id = self._start(auth_client).data["id"]
        with patch("apps.ai_engine.services.continue_group_discussion", return_value=FAKE_REPLY):
            auth_client.post(f"{GD_URL}{gd_id}/respond/", {"message": "My point here."}, format="json")
        with patch("apps.ai_engine.services.evaluate_group_discussion", return_value=FAKE_EVAL):
            finished = auth_client.post(f"{GD_URL}{gd_id}/finish/")

        assert finished.status_code == 200
        assert float(finished.data["overall_score"]) == 75
        assert finished.data["finished_at"] is not None
        more = auth_client.post(f"{GD_URL}{gd_id}/respond/", {"message": "One more thing"}, format="json")
        assert more.status_code == 400

    def test_turn_limit(self, auth_client, student):
        gd = GroupDiscussion.objects.create(
            student=student, topic="t", participants=[{"name": "Ravi", "stance": "x"}],
            transcript=[{"speaker": "Me", "text": "x", "is_user": True}] * services.GD_MAX_USER_TURNS,
        )
        response = auth_client.post(f"{GD_URL}{gd.id}/respond/", {"message": "too many"}, format="json")
        assert response.status_code == 400


FAKE_APTITUDE = QuizResult(
    questions=[
        QuizQuestion(question=f"Q{i}", options=["1", "2", "3", "4"], correct_index=0, explanation="work")
        for i in range(5)
    ]
)


class TestAptitude:
    url = "/api/v1/career/quizzes/"

    def test_aptitude_section_is_timed_and_needs_no_topic(self, auth_client):
        with patch("apps.ai_engine.services.generate_quiz", return_value=FAKE_APTITUDE) as gen:
            response = auth_client.post(self.url, {"category": "quantitative", "count": 5}, format="json")

        assert response.status_code == 201
        assert response.data["category"] == "quantitative"
        assert response.data["time_limit_seconds"] == 5 * services.APTITUDE_SECONDS_PER_QUESTION
        assert response.data["topic"] == "Quantitative aptitude"
        assert gen.call_args.kwargs["category"] == "quantitative"

    def test_topic_quiz_still_requires_a_topic(self, auth_client):
        assert auth_client.post(self.url, {"count": 5}, format="json").status_code == 400

    def test_submit_records_time_taken(self, auth_client):
        with patch("apps.ai_engine.services.generate_quiz", return_value=FAKE_APTITUDE):
            quiz_id = auth_client.post(self.url, {"category": "logical", "count": 5}, format="json").data["id"]

        response = auth_client.post(
            f"{self.url}{quiz_id}/submit/", {"answers": [0, 0, 1, None, 0], "time_taken_seconds": 140}, format="json"
        )

        assert response.status_code == 200
        assert float(response.data["score"]) == 60
        assert Quiz.objects.get(id=quiz_id).time_taken_seconds == 140
