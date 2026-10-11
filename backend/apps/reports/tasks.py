from celery import shared_task
from django.utils import timezone

from apps.notifications.models import EmailLog
from apps.notifications.services import send_transactional_email

from .models import InterviewReport


@shared_task(bind=True, max_retries=2)
def render_and_email_report_task(self, *, report_id: str):
    """Renders the finished report as a PDF, stores it, and emails it to the student."""
    from django.core.files.base import ContentFile

    report = InterviewReport.objects.select_related("session__student__user").get(id=report_id)
    user = report.session.student.user

    from .services import render_pdf

    pdf_bytes = render_pdf(report)
    # Persist the PDF before attempting email: on hosts that block outbound
    # SMTP (e.g. Render's free plan) the send below raises, and the report
    # must still be downloadable from the dashboard.
    report.pdf_file.save(f"{report.id}.pdf", ContentFile(pdf_bytes), save=True)

    message = (
        f"Hi {user.full_name},\n\n"
        "Your AI_AvatarInterview results are ready.\n\n"
        f"Overall score: {report.overall_score}/100\n"
        f"Communication: {report.communication_score} | Technical: {report.technical_score} | "
        f"Confidence: {report.confidence_score}\n\n"
        "Log in to your dashboard for the full breakdown."
    )

    attachment = ("interview_report.pdf", pdf_bytes, "application/pdf")
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
