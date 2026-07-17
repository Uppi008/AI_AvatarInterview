import logging

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import EmailLog

logger = logging.getLogger(__name__)


def send_transactional_email(
    *, user, email_type, subject, message, related_session=None, html_message=None, attachment=None
) -> EmailLog:
    """Sends an email and records the attempt in EmailLog regardless of outcome.

    `attachment` is an optional (filename, content_bytes, mimetype) tuple, used
    by reports.services when emailing the PDF interview report.
    """
    log = EmailLog.objects.create(
        user=user,
        email_type=email_type,
        recipient_email=user.email,
        subject=subject,
        related_session=related_session,
    )
    try:
        if attachment:
            from django.core.mail import EmailMessage

            email = EmailMessage(
                subject=subject,
                body=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user.email],
            )
            email.attach(*attachment)
            email.send(fail_silently=False)
        else:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
    except Exception as exc:
        logger.exception("Failed to send %s email to %s", email_type, user.email)
        log.status = EmailLog.Status.FAILED
        log.error_message = str(exc)
        log.save(update_fields=["status", "error_message"])
        raise
    else:
        log.status = EmailLog.Status.SENT
        log.sent_at = timezone.now()
        log.save(update_fields=["status", "sent_at"])
    return log
