from django.utils import timezone

from apps.avatars.models import Avatar
from apps.resumes.models import Resume

from .models import InterviewSession


def start_session(
    *,
    student,
    avatar_id,
    resume_id=None,
    language: str = InterviewSession.Language.ENGLISH,
    personality: str = "",
) -> InterviewSession:
    """Creates the session, then generates its question bank.

    Deliberately NOT wrapped in one @transaction.atomic block: generate_question_bank()
    is a network call to the LLM provider, and holding a DB transaction open for the
    duration of an external HTTP call ties up a DB connection for as long as that call
    takes. The session is committed first; if question generation fails (bad/missing API
    key, LLM outage), it's deleted as a compensating action instead -- same end result
    (no orphaned questionless session left IN_PROGRESS), without blocking a DB connection
    on the network call.
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
        personality=personality,
        status=InterviewSession.Status.IN_PROGRESS,
        started_at=timezone.now(),
    )

    from apps.ai_engine.services import generate_question_bank

    try:
        generate_question_bank(session=session)
    except Exception:
        session.delete()
        raise

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


def generate_report_now(*, session: InterviewSession):
    """Builds (or rebuilds) a finished session's report synchronously.

    The recovery path for when the post-interview task failed (e.g. a
    transient LLM error -- with eager Celery on the free tier there is no
    worker left to retry it). Raises ValueError if no answers were scored.
    """
    from apps.ai_engine.services import aggregate_session_report
    from apps.reports.services import create_report_and_send_email

    report_data = aggregate_session_report(session=session)
    return create_report_and_send_email(session=session, report_data=report_data)
