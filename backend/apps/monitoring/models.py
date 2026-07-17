from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel


class ProctoringEvent(BaseModel):
    """A single proctoring signal raised during a live interview session.

    Covers both vision-based signals (face/eye/head detection, reported by
    client-side MediaPipe and cross-checked server-side) and browser-level
    signals (tab switch, mic/camera disabled, offline).
    """

    class EventType(models.TextChoices):
        NO_FACE = "no_face", _("No Face Detected")
        MULTIPLE_FACES = "multiple_faces", _("Multiple Faces Detected")
        LOOKING_AWAY = "looking_away", _("Looking Away")
        HEAD_ROTATION = "head_rotation", _("Excessive Head Rotation")
        LIP_MOVEMENT_ANOMALY = "lip_movement_anomaly", _("Lip Movement Anomaly")
        MOBILE_USAGE = "mobile_usage", _("Mobile Usage Detected")
        TAB_SWITCH = "tab_switch", _("Tab Switched")
        WINDOW_MINIMIZED = "window_minimized", _("Window Minimized")
        BROWSER_REFRESH = "browser_refresh", _("Browser Refreshed")
        MIC_DISABLED = "mic_disabled", _("Microphone Disabled")
        CAMERA_DISABLED = "camera_disabled", _("Camera Disabled")
        INTERNET_DISCONNECTED = "internet_disconnected", _("Internet Disconnected")

    class Severity(models.TextChoices):
        WARNING = "warning", _("Warning")
        VIOLATION = "violation", _("Violation")

    session = models.ForeignKey(
        "interviews.InterviewSession", on_delete=models.CASCADE, related_name="proctoring_events"
    )
    event_type = models.CharField(max_length=30, choices=EventType.choices)
    severity = models.CharField(max_length=10, choices=Severity.choices, default=Severity.WARNING)
    detected_at = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True, help_text="Detector confidence, frame timestamp, etc.")
    triggered_termination = models.BooleanField(default=False)

    class Meta:
        db_table = "proctoring_events"
        indexes = [
            models.Index(fields=["session", "event_type"]),
            models.Index(fields=["session", "severity"]),
        ]
