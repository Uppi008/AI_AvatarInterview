import logging

from celery import shared_task
from django.utils import timezone

from apps.notifications.models import EmailLog
from apps.notifications.services import send_transactional_email

from .models import InterviewReport

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2)
def render_and_email_report_task(self, *, report_id: str):
    """Emails the finished report to the student (Module 9 + 10).

    Attaches the rendered PDF once `reports.services.render_pdf` is
    implemented (Phase 9); until then it emails a plain-text summary so
    the pipeline works end-to-end.
    """
    report = InterviewReport.objects.select_related("session__student__user").get(id=report_id)
    user = report.session.student.user

    pdf_bytes = None
    try:
        from .services import render_pdf

        pdf_bytes = render_pdf(report)
    except NotImplementedError:
        logger.info("PDF rendering for report %s awaits Phase 9 polish.", report_id)

    message = (
        f"Hi {user.full_name},\n\n"
        "Your AI_AvatarInterview results are ready.\n\n"
        f"Overall score: {report.overall_score}/100\n"
        f"Communication: {report.communication_score} | Technical: {report.technical_score} | "
        f"Confidence: {report.confidence_score}\n\n"
        "Log in to your dashboard for the full breakdown."
    )

    attachment = ("interview_report.pdf", pdf_bytes, "application/pdf") if pdf_bytes else None
    send_transactional_email(
        user=user,
        email_type=EmailLog.EmailType.INTERVIEW_REPORT,
        subject="Your AI_AvatarInterview results are ready",
        message=message,
        related_session=report.session,
        attachment=attachment,
    )
    report.emailed_at = timezone.now()
    report.save(update_fields=["emailed_at"])
