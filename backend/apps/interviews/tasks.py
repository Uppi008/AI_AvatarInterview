import logging

from celery import shared_task

from .models import InterviewSession

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2)
def generate_report_task(self, *, session_id: str):
    """Aggregates scoring into an InterviewReport once a session ends.

    Score aggregation is implemented in Phase 5
    (apps.ai_engine.aggregate_session_report); PDF rendering + email are
    handled by apps.reports.
    """
    session = InterviewSession.objects.get(id=session_id)

    from apps.ai_engine.services import aggregate_session_report

    try:
        report_data = aggregate_session_report(session=session)
    except NotImplementedError:
        logger.info("Report aggregation for session %s awaits Phase 5.", session_id)
        return

    from apps.reports.services import create_report_and_send_email

    create_report_and_send_email(session=session, report_data=report_data)
