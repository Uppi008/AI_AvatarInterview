from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel


class EmailLog(BaseModel):
    """Audit trail of every transactional email the platform sends."""

    class EmailType(models.TextChoices):
        EMAIL_VERIFICATION = "email_verification", _("Email Verification")
        PASSWORD_RESET = "password_reset", _("Password Reset")
        INTERVIEW_REPORT = "interview_report", _("Interview Report")
        GENERAL = "general", _("General")

    class Status(models.TextChoices):
        QUEUED = "queued", _("Queued")
        SENT = "sent", _("Sent")
        FAILED = "failed", _("Failed")

    user = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="email_logs")
    email_type = models.CharField(max_length=25, choices=EmailType.choices)
    recipient_email = models.EmailField()
    subject = models.CharField(max_length=255)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.QUEUED)
    related_session = models.ForeignKey(
        "interviews.InterviewSession",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="email_logs",
    )
    error_message = models.TextField(blank=True)
    sent_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "email_logs"
        indexes = [models.Index(fields=["user", "email_type"])]
