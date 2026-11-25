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


class Notification(BaseModel):
    """An in-app message shown under the bell in the top bar."""

    class Kind(models.TextChoices):
        REPORT_READY = "report_ready", _("Report ready")
        REMINDER = "reminder", _("Reminder")
        SCHEDULED = "scheduled", _("Scheduled interview")
        BADGE = "badge", _("Badge earned")
        GENERAL = "general", _("General")

    user = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="notifications")
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.GENERAL)
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    link = models.CharField(max_length=300, blank=True, help_text="In-app path to open, e.g. /interviews/<id>/report")
    read_at = models.DateTimeField(null=True, blank=True)
    # Lets the same event (e.g. one report, one day's reminder) notify only once.
    dedupe_key = models.CharField(max_length=120, null=True, blank=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "read_at"])]
        constraints = [
            models.UniqueConstraint(fields=["user", "dedupe_key"], name="unique_notification_dedupe_key")
        ]

    def __str__(self):
        return f"Notification<{self.user_id}> {self.title}"
