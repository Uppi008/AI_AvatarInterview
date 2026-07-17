from django.db import transaction
from django.utils import timezone

from apps.avatars.models import Avatar
from apps.resumes.models import Resume

from .models import InterviewSession


@transaction.atomic
def start_session(
    *, student, avatar_id, resume_id=None, language: str = InterviewSession.Language.ENGLISH
) -> InterviewSession:
    """Creates the session and generates its question bank in one
    transaction: if question generation fails (bad/missing API key, LLM
    outage), the session creation rolls back too, rather than leaving a
    broken, questionless session sitting in IN_PROGRESS.
    """
    avatar = Avatar.objects.get(id=avatar_id, is_active=True)

    if resume_id:
        resume = Resume.objects.get(id=resume_id, student=student)
    else:
        resume = Resume.objects.filter(student=student, is_active=True).first()

    session = InterviewSession.objects.create(
        student=student,
        avatar=avatar,
        resume=resume,
        language=language,
        status=InterviewSession.Status.IN_PROGRESS,
        started_at=timezone.now(),
    )

    from apps.ai_engine.services import generate_question_bank

    generate_question_bank(session=session)

    return session


def end_session(*, session: InterviewSession, reason: str = "") -> InterviewSession:
    session.status = InterviewSession.Status.TERMINATED if reason else InterviewSession.Status.COMPLETED
    session.ended_at = timezone.now()
    if session.started_at:
        session.duration_seconds = int((session.ended_at - session.started_at).total_seconds())
    if reason:
        session.termination_reason = reason
    session.save(update_fields=["status", "ended_at", "duration_seconds", "termination_reason"])

    from .tasks import generate_report_task

    generate_report_task.delay(session_id=str(session.id))
    return session
