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
        voice_clarity_score=80, grammar_score=85, problem_solving_score=75,
        feedback="Solid answer.", follow_up_question=None,
    )
    summary = schemas.ReportSummaryResult(strengths=["Clear"], weaknesses=[], improvement_tips=["Be concise"])
    moderation = schemas.ModerationResult(is_safe=True, reason="")

    return make_fake_chat_model(
        (schemas.QuestionBankResult, questions),
        (schemas.AnswerEvaluationResult, evaluation),
        (schemas.ReportSummaryResult, summary),
        (schemas.ModerationResult, moderation),
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
        acknowledgement = await communicator.receive_json_from(timeout=10)
        assert acknowledgement["type"] == "acknowledgement"
        assert acknowledgement["kind"] == "manual_skip"
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
        acknowledgement = await communicator.receive_json_from(timeout=10)
        assert acknowledgement["type"] == "acknowledgement"
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
async def test_unsafe_answer_is_flagged_and_not_scored(student, avatar):
    """Regression coverage for the content-safety gate added alongside the
    fresher/experienced question prompt work: a flagged answer must not
    reach evaluate_answer (no evaluation message, no InterviewAnswer row)
    and must surface through the same violation_warning path as camera/
    browser violations."""
    from asgiref.sync import sync_to_async

    from apps.ai_engine import schemas as ai_schemas
    from apps.interviews import services as interview_services
    from apps.interviews.models import InterviewAnswer
    from config.asgi import application

    questions = ai_schemas.QuestionBankResult(
        questions=[
            ai_schemas.GeneratedQuestion(question_text="Tell me about yourself.", question_type="behavioral", difficulty="easy"),
        ]
    )
    unsafe = ai_schemas.ModerationResult(is_safe=False, reason="Contains abusive language.")
    fake_llm = make_fake_chat_model(
        (ai_schemas.QuestionBankResult, questions),
        (ai_schemas.ModerationResult, unsafe),
    )

    with patch("apps.ai_engine.services.get_chat_model", return_value=fake_llm):
        session = await sync_to_async(interview_services.start_session)(
            student=student, avatar_id=avatar.id, language="en"
        )
        token = str(RefreshToken.for_user(student.user).access_token)
        communicator = WebsocketCommunicator(application, ws_url(session.id, token))
        connected, _ = await communicator.connect(timeout=10)
        assert connected
        await communicator.receive_json_from(timeout=20)  # first question

        await communicator.send_json_to({"type": "answer_text", "text": "some disallowed content"})
        msg = await communicator.receive_json_from(timeout=10)

        assert msg["type"] == "violation_warning"
        assert msg["event_type"] == "inappropriate_content"
        assert msg["violation_count"] == 1
        assert await sync_to_async(InterviewAnswer.objects.filter(question__session=session).exists)() is False

        await communicator.disconnect()


@pytest.mark.asyncio
async def test_dont_know_answer_is_acknowledged_and_advances_without_scoring(student, avatar, fake_llm):
    """"I don't know" must be recognized in the answer's own text (Case 1):
    acknowledged naturally, question marked skipped, and no InterviewAnswer/
    evaluation created for it -- it isn't a scored attempt."""
    from asgiref.sync import sync_to_async

    from apps.interviews import services as interview_services
    from apps.interviews.models import InterviewAnswer
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

        await communicator.send_json_to({"type": "answer_text", "text": "Sorry, I don't know."})
        acknowledgement = await communicator.receive_json_from(timeout=10)
        assert acknowledgement["type"] == "acknowledgement"
        assert acknowledgement["kind"] == "dont_know"

        second = await communicator.receive_json_from(timeout=20)
        assert second["type"] == "question"
        assert second["question"]["id"] != first["question"]["id"]

        assert await sync_to_async(InterviewAnswer.objects.filter(question__session=session).exists)() is False

        await communicator.disconnect()


@pytest.mark.asyncio
async def test_voice_skip_command_advances_like_manual_skip(student, avatar, fake_llm):
    """Case 2: a spoken/typed "next question" advances immediately, same as
    clicking the Skip button, without needing that separate message type."""
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
        await communicator.receive_json_from(timeout=20)

        await communicator.send_json_to({"type": "answer_text", "text": "Next question"})
        acknowledgement = await communicator.receive_json_from(timeout=10)
        assert acknowledgement["type"] == "acknowledgement"
        assert acknowledgement["kind"] == "skip"

        second = await communicator.receive_json_from(timeout=20)
        assert second["type"] == "question"

        await communicator.disconnect()


@pytest.mark.asyncio
async def test_check_silence_sends_a_nudge_without_advancing(student, avatar, fake_llm):
    """Case 3 (first stage): the client-timer nudge prompts the candidate
    but must not skip the question or touch its state -- they can still
    answer normally afterward."""
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

        await communicator.send_json_to({"type": "check_silence"})
        nudge = await communicator.receive_json_from(timeout=10)
        assert nudge["type"] == "silence_nudge"
        assert nudge["text"]

        # Still answerable normally after the nudge -- it didn't advance/skip.
        await communicator.send_json_to({"type": "answer_text", "text": "I'm a backend engineer."})
        evaluation = await communicator.receive_json_from(timeout=10)
        assert evaluation["type"] == "evaluation"
        assert evaluation["question_id"] == first["question"]["id"]

        await communicator.disconnect()


@pytest.mark.asyncio
async def test_silence_timeout_skip_uses_a_fitting_acknowledgement(student, avatar, fake_llm):
    """Case 3 (second stage): the client's auto-skip after a second timeout
    sends {"reason": "silence_timeout"} so the remark fits a timeout rather
    than sounding like a response to a verbal "skip" request."""
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
        await communicator.receive_json_from(timeout=20)

        await communicator.send_json_to({"type": "skip_question", "reason": "silence_timeout"})
        acknowledgement = await communicator.receive_json_from(timeout=10)
        assert acknowledgement["type"] == "acknowledgement"
        assert acknowledgement["kind"] == "silence_timeout"

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
