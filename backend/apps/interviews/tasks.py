import logging

from celery import shared_task

from .models import InterviewSession

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2)
def generate_report_task(self, *, session_id: str):
    """Aggregates scoring into an InterviewReport once a session ends, via
    apps.ai_engine.aggregate_session_report; PDF rendering + email are
    handled by apps.reports.
    """
    session = InterviewSession.objects.get(id=session_id)

    from apps.ai_engine.services import aggregate_session_report

    try:
        report_data = aggregate_session_report(session=session)
    except ValueError:
        # No evaluated answers (e.g. the student ended the interview before
        # answering anything) -- nothing to report, not a failure to retry.
        logger.info("Nothing to aggregate for session %s: no evaluated answers.", session_id)
        return
    except Exception as exc:
        raise self.retry(exc=exc)

    from apps.reports.services import create_report_and_send_email

    create_report_and_send_email(session=session, report_data=report_data)
