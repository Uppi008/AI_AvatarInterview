"""Live interview WebSocket protocol.

Client -> server messages (`{"type": ...}`):
  - answer_audio   {audio_base64, mime_type}  -- STT'd, moderated, intent-checked, scored, advances
  - answer_text    {text}                     -- moderated, intent-checked, scored, advances
  - skip_question  {reason?}                  -- reason: "silence_timeout" picks a fitting acknowledgement
  - repeat_question {}
  - check_silence  {}                         -- client-timer nudge when the candidate hasn't started answering
  - end_interview  {}
  - proctoring_event {event_type, metadata}

Server -> client messages:
  - question            {question: {...}, progress: {answered, total}}
  - evaluation           {question_id, feedback, scores, audio_base64}
  - acknowledgement       {text, audio_base64, kind}  -- spoken remark before auto-advancing (dont_know/skip/silence)
  - silence_nudge         {text, audio_base64}         -- spoken check-in; does not advance
  - interview_complete   {}                     -- all questions done
  - interview_terminated {reason, violation_count}
  - interview_ended      {session_id}
  - violation_warning    {event_type, violation_count, max_violations}
  - monitoring_notice    {event_type}           -- non-violation-grade signal
  - error                {detail}

Question state is tracked entirely server-side via InterviewQuestion.asked_at
/ its related InterviewAnswer, so a client can never claim to be answering a
question it wasn't actually sent -- every handler re-derives "the question
currently awaiting an answer" itself rather than trusting a client-supplied ID.

"I don't know" / "skip this question" are detected from the answer's own text
(apps.interviews.intent) rather than requiring a separate button/message --
matches how a real interviewer just listens for those phrases mid-conversation.
Both routes into the same _acknowledge_and_advance() path as the explicit
skip_question message and the silence-timeout auto-skip, just with a
different spoken remark and `kind`.
"""
import base64
import logging
import random

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.conf import settings

from apps.monitoring.models import ProctoringEvent

from . import intent
from .models import InterviewAnswer, InterviewQuestion, InterviewSession

logger = logging.getLogger(__name__)

# Small, varied phrasing pools so the same acknowledgement isn't repeated
# verbatim every time -- randomly picked per occurrence, not LLM-generated
# (these are reactive, not content-bearing, so a fixed pool reads just as
# natural and avoids a TTS-blocking LLM round trip on every skip).
ACKNOWLEDGEMENTS = {
    "dont_know": [
        "No problem, that's completely okay.",
        "That's okay -- not everyone knows every topic. Let's move to the next question.",
        "Don't worry about it, let's continue.",
    ],
    "skip": [
        "Sure, let's move to the next question.",
        "Okay, skipping ahead.",
        "Got it, next question coming up.",
    ],
    "manual_skip": [
        "Okay, let's move on.",
        "Sure, moving to the next question.",
    ],
    "silence_timeout": [
        "Let's continue to the next question.",
        "No worries, let's move on to the next one.",
    ],
}
SILENCE_NUDGES = [
    "I noticed you haven't answered yet. Would you like to try answering?",
    "Take your time -- if you're unsure, we can move to the next question.",
    "Still there? Feel free to answer, or let me know if you'd like to skip this one.",
]


class InterviewSessionConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.session_id = self.scope["url_route"]["kwargs"]["session_id"]
        user = self.scope["user"]

        if not user.is_authenticated:
            await self.close(code=4001)
            return

        self.session = await self._get_owned_session(user)
        if self.session is None:
            await self.close(code=4004)
            return

        if self.session.status != InterviewSession.Status.IN_PROGRESS:
            await self.close(code=4009)
            return

        self.group_name = f"interview_{self.session_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        await self._advance_and_send()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        handler = {
            "answer_audio": self._handle_answer_audio,
            "answer_text": self._handle_answer_text,
            "skip_question": self._handle_skip,
            "repeat_question": self._handle_repeat,
            "check_silence": self._handle_check_silence,
            "end_interview": self._handle_end,
            "proctoring_event": self._handle_proctoring_event,
        }.get(content.get("type"))

        if handler is None:
            await self.send_json({"type": "error", "detail": f"Unknown message type '{content.get('type')}'."})
            return

        try:
            await handler(content)
        except Exception:
            logger.exception("Error handling '%s' for session %s", content.get("type"), self.session_id)
            await self.send_json({"type": "error", "detail": "Something went wrong processing that."})

    # --- message handlers ------------------------------------------------
    async def _handle_answer_audio(self, content):
        question = await self._get_awaiting_answer_question()
        if question is None:
            await self.send_json({"type": "error", "detail": "No active question to answer."})
            return

        from apps.ai_engine.speech import transcribe_speech

        audio_bytes = base64.b64decode(content["audio_base64"])
        transcript = await transcribe_speech(audio_bytes, language=self.session.language)
        if await self._flag_if_unsafe(transcript):
            return
        if await self._handle_conversational_intent(question, transcript):
            return
        await self._save_and_evaluate(question, transcript, audio_bytes)

    async def _handle_answer_text(self, content):
        question = await self._get_awaiting_answer_question()
        if question is None:
            await self.send_json({"type": "error", "detail": "No active question to answer."})
            return
        text = content.get("text", "")
        if await self._flag_if_unsafe(text):
            return
        if await self._handle_conversational_intent(question, text):
            return
        await self._save_and_evaluate(question, text, None)

    async def _handle_conversational_intent(self, question, text: str) -> bool:
        """Detects "I don't know" / "skip this question" in the answer's own
        text and, if matched, acknowledges naturally and advances instead of
        scoring it as an attempted answer. Returns True if handled."""
        if intent.is_dont_know(text):
            await self._acknowledge_and_advance(question, kind="dont_know")
            return True
        if intent.is_skip_request(text):
            await self._acknowledge_and_advance(question, kind="skip")
            return True
        return False

    async def _handle_skip(self, content):
        question = await self._get_awaiting_answer_question()
        if question is None:
            await self.send_json({"type": "error", "detail": "No question to skip."})
            return
        # The frontend's silence-detection timer sends {"reason": "silence_timeout"}
        # for its second-stage auto-skip so the remark fits ("let's move on") rather
        # than sounding like a response to a verbal skip request.
        kind = "silence_timeout" if content.get("reason") == "silence_timeout" else "manual_skip"
        await self._acknowledge_and_advance(question, kind=kind)

    async def _handle_repeat(self, content):
        question = await self._get_awaiting_answer_question()
        if question is None:
            await self.send_json({"type": "error", "detail": "No question to repeat."})
            return
        await self._send_question_payload(question)

    async def _handle_check_silence(self, content):
        """Client-side timer nudge -- does not advance the question, just
        prompts the candidate. Silently ignored if they've since answered."""
        question = await self._get_awaiting_answer_question()
        if question is None:
            return
        text = random.choice(SILENCE_NUDGES)
        audio_base64 = await self._synthesize_text(text)
        await self.send_json({"type": "silence_nudge", "text": text, "audio_base64": audio_base64})

    async def _acknowledge_and_advance(self, question, kind: str):
        text = random.choice(ACKNOWLEDGEMENTS[kind])
        audio_base64 = await self._synthesize_text(text)
        await self.send_json({"type": "acknowledgement", "text": text, "audio_base64": audio_base64, "kind": kind})
        await self._mark_skipped(question)
        await self._advance_and_send()

    async def _handle_end(self, content):
        await self._end_session()
        await self.send_json({"type": "interview_ended", "session_id": str(self.session_id)})
        await self.close()

    async def _handle_proctoring_event(self, content):
        event_type = content.get("event_type")
        metadata = content.get("metadata", {})
        result = await self._record_event(event_type, metadata)
        await self._send_violation_result(event_type, result)

    async def _flag_if_unsafe(self, text: str) -> bool:
        """Screens an answer's text through the moderation chain before it's
        scored. Flagged content is logged and escalated through the exact
        same warn -> auto-terminate pipeline as camera/browser violations
        (apps.monitoring), and the current question is left unanswered
        rather than scoring an unsafe response. Returns True if the caller
        should stop processing this answer.
        """
        if not text or not text.strip():
            return False

        moderation = await self._moderate(text)
        if moderation.is_safe:
            return False

        result = await self._record_event(
            ProctoringEvent.EventType.INAPPROPRIATE_CONTENT, {"reason": moderation.reason}
        )
        await self._send_violation_result(ProctoringEvent.EventType.INAPPROPRIATE_CONTENT, result)
        return True

    async def _send_violation_result(self, event_type, result):
        if result["terminated"]:
            await self.send_json(
                {
                    "type": "interview_terminated",
                    "reason": result["reason"],
                    "violation_count": result["violation_count"],
                }
            )
            await self.close()
            return

        await self.send_json(
            {
                "type": "violation_warning" if result["severity"] == "violation" else "monitoring_notice",
                "event_type": event_type,
                "violation_count": result["violation_count"],
                "max_violations": settings.MAX_INTERVIEW_VIOLATIONS,
            }
        )

    # --- question flow -----------------------------------------------------
    async def _advance_and_send(self):
        """Sends the question awaiting an answer if the client just (re)connected
        mid-question, otherwise the next not-yet-asked one."""
        question = await self._get_awaiting_answer_question()
        already_asked = question is not None
        if question is None:
            question = await self._get_next_pending_question()

        if question is None:
            await self._finish_interview()
            return

        if not already_asked:
            await self._mark_asked(question)

        await self._send_question_payload(question)

    async def _save_and_evaluate(self, question, transcript, audio_bytes):
        answer = await self._create_answer(question, transcript, audio_bytes)
        result = await self._evaluate(question, answer)
        evaluation = result["evaluation"]
        feedback_audio = await self._synthesize_text(evaluation.feedback_text)

        await self.send_json(
            {
                "type": "evaluation",
                "question_id": str(question.id),
                "feedback": evaluation.feedback_text,
                "audio_base64": feedback_audio,
                "scores": {
                    "technical": float(evaluation.technical_score),
                    "communication": float(evaluation.communication_score),
                    "relevance": float(evaluation.relevance_score),
                    "confidence": float(evaluation.confidence_score),
                    "voice_clarity": float(evaluation.voice_clarity_score),
                    "grammar": float(evaluation.grammar_score),
                    "problem_solving": float(evaluation.problem_solving_score),
                },
            }
        )

        follow_up = result["follow_up_question"]
        if follow_up is not None:
            # Asked immediately, ahead of whatever's next in order_index --
            # a follow-up only makes sense right after the answer it followed.
            await self._mark_asked(follow_up)
            await self._send_question_payload(follow_up)
        else:
            await self._advance_and_send()

    async def _finish_interview(self):
        await self.send_json({"type": "interview_complete"})
        await self._end_session()
        await self.send_json({"type": "interview_ended", "session_id": str(self.session_id)})
        await self.close()

    async def _send_question_payload(self, question):
        audio_base64 = await self._synthesize_text(question.question_text)
        progress = await self._question_progress()
        await self.send_json(
            {
                "type": "question",
                "question": {
                    "id": str(question.id),
                    "text": question.question_text,
                    "question_type": question.question_type,
                    "difficulty": question.difficulty,
                    "order_index": question.order_index,
                    "audio_base64": audio_base64,
                },
                "progress": progress,
            }
        )

    async def _synthesize_text(self, text: str):
        """TTS for any spoken remark -- questions, per-answer feedback,
        acknowledgements, and silence nudges all funnel through here so
        every turn uses the same avatar voice consistently."""
        from apps.ai_engine.speech import synthesize_speech

        if not text:
            return None
        voice = self.session.avatar.voice_for(self.session.language)
        if not voice:
            return None
        try:
            return await synthesize_speech(text, voice)
        except Exception:
            logger.exception("TTS failed for session %s", self.session_id)
            return None

    # --- DB access (sync ORM wrapped for the async consumer) ---------------
    @database_sync_to_async
    def _get_owned_session(self, user):
        return (
            InterviewSession.objects.filter(id=self.session_id, student__user=user)
            .select_related("avatar", "student")
            .first()
        )

    @database_sync_to_async
    def _get_awaiting_answer_question(self):
        return (
            InterviewQuestion.objects.filter(
                session_id=self.session_id, asked_at__isnull=False, answer__isnull=True, skipped=False
            )
            .order_by("-asked_at")
            .first()
        )

    @database_sync_to_async
    def _get_next_pending_question(self):
        return (
            InterviewQuestion.objects.filter(session_id=self.session_id, asked_at__isnull=True, skipped=False)
            .order_by("order_index")
            .first()
        )

    @database_sync_to_async
    def _mark_asked(self, question):
        from django.utils import timezone

        question.asked_at = timezone.now()
        question.save(update_fields=["asked_at"])

    @database_sync_to_async
    def _mark_skipped(self, question):
        question.skipped = True
        question.save(update_fields=["skipped"])

    @database_sync_to_async
    def _question_progress(self):
        total = InterviewQuestion.objects.filter(session_id=self.session_id).count()
        answered = InterviewQuestion.objects.filter(
            session_id=self.session_id, answer__isnull=False
        ).count()
        return {"answered": answered, "total": total}

    @database_sync_to_async
    def _create_answer(self, question, transcript, audio_bytes):
        from django.core.files.base import ContentFile
        from django.utils import timezone

        answer = InterviewAnswer.objects.create(
            question=question, transcript_text=transcript or "", answered_at=timezone.now()
        )
        if audio_bytes:
            answer.audio_file.save(f"{question.id}.webm", ContentFile(audio_bytes), save=True)
        return answer

    @database_sync_to_async
    def _evaluate(self, question, answer):
        from apps.ai_engine.services import evaluate_answer

        return evaluate_answer(question=question, answer=answer)

    @database_sync_to_async
    def _moderate(self, text):
        from apps.ai_engine.services import moderate_text

        return moderate_text(text)

    @database_sync_to_async
    def _end_session(self):
        from apps.interviews.services import end_session

        end_session(session=self.session)

    @database_sync_to_async
    def _record_event(self, event_type, metadata):
        from apps.monitoring.services import record_event

        # record_event / end_session mutate self.session in place (same
        # Python object, not a fresh query), so its fields are already
        # current here. Do NOT call self.session.refresh_from_db(): it
        # clears the select_related("avatar", "student") cache, and the
        # next lazy access to self.session.avatar from a plain async method
        # (not database_sync_to_async-wrapped) then trips Django's
        # SynchronousOnlyOperation guard.
        event = record_event(session=self.session, event_type=event_type, metadata=metadata)
        return {
            "terminated": event.triggered_termination,
            "reason": self.session.termination_reason,
            "violation_count": self.session.violation_count,
            "severity": event.severity,
        }
