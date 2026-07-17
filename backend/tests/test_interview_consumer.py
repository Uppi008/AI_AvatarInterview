"""End-to-end test of the live interview WebSocket protocol via Channels'
WebsocketCommunicator (in-process, no real network/server needed).

Formalizes the manual verification done by hand while building Phase 7:
JWT handshake auth, question delivery, text-answer scoring, the skip bug
(skipped questions must not be resent), and the 4-violation proctoring
auto-terminate flow. TTS (edge-tts) is not mocked -- it needs no API key
and this confirms the consumer's graceful fallback (`audio_base64: None`)
never gets exercised unexpectedly; if it starts flaking in CI on a
network-restricted runner, that's the first thing to make configurable.
"""
from unittest.mock import patch

import pytest
from channels.testing import WebsocketCommunicator
from rest_framework_simplejwt.tokens import RefreshToken

from apps.ai_engine import schemas
from apps.interviews.models import InterviewSession
from tests.mocks import make_fake_chat_model

# transaction=True (not the default transaction-wrapped db fixture): the
# consumer's database_sync_to_async calls run on a separate thread with
# their own DB connection, which needs to actually see committed rows
# rather than a transaction only the main test thread is inside.
pytestmark = pytest.mark.django_db(transaction=True)


def ws_url(session_id, token):
    return f"/ws/interview/{session_id}/?token={token}"


@pytest.fixture
def fake_llm():
    questions = schemas.QuestionBankResult(
        questions=[
            schemas.GeneratedQuestion(question_text="Tell me about yourself.", question_type="behavioral", difficulty="easy"),
            schemas.GeneratedQuestion(question_text="Describe a challenging project.", question_type="resume_based", difficulty="medium"),
        ]
    )
    evaluation = schemas.AnswerEvaluationResult(
        technical_score=80, communication_score=75, relevance_score=85, confidence_score=70,
        feedback="Solid answer.", follow_up_question=None,
    )
    summary = schemas.ReportSummaryResult(strengths=["Clear"], weaknesses=[], improvement_tips=["Be concise"])

    return make_fake_chat_model(
        (schemas.QuestionBankResult, questions),
        (schemas.AnswerEvaluationResult, evaluation),
        (schemas.ReportSummaryResult, summary),
    )


@pytest.mark.asyncio
async def test_full_question_flow_and_completion(student, avatar, fake_llm):
    from asgiref.sync import sync_to_async

    from apps.interviews import services as interview_services
    from config.asgi import application

    with patch("apps.ai_engine.services.get_chat_model", return_value=fake_llm):
        session = await sync_to_async(interview_services.start_session)(
            student=student, avatar_id=avatar.id, language="en"
        )
        token = str(RefreshToken.for_user(student.user).access_token)
        communicator = WebsocketCommunicator(application, ws_url(session.id, token))

        connected, _ = await communicator.connect(timeout=10)
        assert connected

        first = await communicator.receive_json_from(timeout=20)
        assert first["type"] == "question"
        assert first["progress"] == {"answered": 0, "total": 2}

        await communicator.send_json_to({"type": "answer_text", "text": "I'm a backend engineer."})
        evaluation = await communicator.receive_json_from(timeout=10)
        assert evaluation["type"] == "evaluation"
        assert evaluation["scores"]["technical"] == 80.0

        second = await communicator.receive_json_from(timeout=20)
        assert second["type"] == "question"
        assert second["progress"] == {"answered": 1, "total": 2}

        await communicator.send_json_to({"type": "skip_question"})
        complete = await communicator.receive_json_from(timeout=10)
        assert complete["type"] == "interview_complete"
        ended = await communicator.receive_json_from(timeout=10)
        assert ended["type"] == "interview_ended"

        await communicator.disconnect()


@pytest.mark.asyncio
async def test_skip_does_not_resend_the_skipped_question(student, avatar, fake_llm):
    """Regression test for a real bug caught during Phase 7 manual testing:
    the "awaiting answer" query didn't exclude skipped=True, so skipping
    re-sent the same question instead of advancing."""
    from asgiref.sync import sync_to_async

    from apps.interviews import services as interview_services
    from config.asgi import application

    with patch("apps.ai_engine.services.get_chat_model", return_value=fake_llm):
        session = await sync_to_async(interview_services.start_session)(
            student=student, avatar_id=avatar.id, language="en"
        )
        token = str(RefreshToken.for_user(student.user).access_token)
        communicator = WebsocketCommunicator(application, ws_url(session.id, token))
        connected, _ = await communicator.connect(timeout=10)
        assert connected

        first = await communicator.receive_json_from(timeout=20)
        first_question_id = first["question"]["id"]

        await communicator.send_json_to({"type": "skip_question"})
        second = await communicator.receive_json_from(timeout=20)

        assert second["type"] == "question"
        assert second["question"]["id"] != first_question_id

        await communicator.disconnect()


@pytest.mark.asyncio
async def test_four_violations_auto_terminates(student, avatar, fake_llm):
    from asgiref.sync import sync_to_async

    from apps.interviews import services as interview_services
    from config.asgi import application

    with patch("apps.ai_engine.services.get_chat_model", return_value=fake_llm):
        session = await sync_to_async(interview_services.start_session)(
            student=student, avatar_id=avatar.id, language="en"
        )
        token = str(RefreshToken.for_user(student.user).access_token)
        communicator = WebsocketCommunicator(application, ws_url(session.id, token))
        connected, _ = await communicator.connect(timeout=10)
        assert connected
        await communicator.receive_json_from(timeout=20)  # first question

        for i in range(1, 5):
            await communicator.send_json_to({"type": "proctoring_event", "event_type": "no_face", "metadata": {}})
            msg = await communicator.receive_json_from(timeout=10)
            if i < 4:
                assert msg["type"] == "violation_warning"
                assert msg["violation_count"] == i
            else:
                assert msg["type"] == "interview_terminated"
                assert msg["violation_count"] == 4

        session_refreshed = await sync_to_async(InterviewSession.objects.get)(id=session.id)
        assert session_refreshed.status == InterviewSession.Status.TERMINATED

        await communicator.disconnect()


@pytest.mark.asyncio
async def test_rejects_unauthenticated_connection(interview_session):
    from config.asgi import application

    communicator = WebsocketCommunicator(application, ws_url(interview_session.id, "not-a-real-token"))
    connected, _ = await communicator.connect(timeout=10)

    assert connected is False


@pytest.mark.asyncio
async def test_rejects_session_owned_by_another_student(avatar, fake_llm):
    from asgiref.sync import sync_to_async

    from apps.interviews import services as interview_services
    from config.asgi import application
    from tests.factories import StudentProfileFactory

    with patch("apps.ai_engine.services.get_chat_model", return_value=fake_llm):
        owner = await sync_to_async(StudentProfileFactory)()
        session = await sync_to_async(interview_services.start_session)(
            student=owner, avatar_id=avatar.id, language="en"
        )

        intruder = await sync_to_async(StudentProfileFactory)()
        token = str(RefreshToken.for_user(intruder.user).access_token)
        communicator = WebsocketCommunicator(application, ws_url(session.id, token))
        connected, _ = await communicator.connect(timeout=10)

        assert connected is False
