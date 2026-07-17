from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel


def avatar_image_upload_path(instance, filename):
    return f"avatars/catalog/{instance.id}/{filename}"


class Avatar(BaseModel):
    """A selectable AI interviewer persona from the built-in catalog."""

    class Category(models.TextChoices):
        HR_MANAGER = "hr_manager", _("HR Manager")
        TECHNICAL_INTERVIEWER = "technical_interviewer", _("Technical Interviewer")
        SENIOR_MANAGER = "senior_manager", _("Senior Manager")
        CEO = "ceo", _("CEO")
        FEMALE_HR = "female_hr", _("Female HR")
        MALE_HR = "male_hr", _("Male HR")
        FRIENDLY_BROTHER = "friendly_brother", _("Friendly Brother")
        FRIENDLY_SISTER = "friendly_sister", _("Friendly Sister")
        PARENT_STYLE = "parent_style", _("Parent Style")
        CORPORATE_RECRUITER = "corporate_recruiter", _("Corporate Recruiter")

    class Difficulty(models.TextChoices):
        EASY = "easy", _("Easy")
        MEDIUM = "medium", _("Medium")
        HARD = "hard", _("Hard")

    name = models.CharField(max_length=100)
    category = models.CharField(max_length=30, choices=Category.choices)
    image = models.ImageField(upload_to=avatar_image_upload_path)
    voice_id = models.CharField(max_length=100, help_text="TTS voice identifier, e.g. an edge-tts voice name")
    speaking_style = models.CharField(max_length=255, blank=True)
    interview_style = models.TextField(blank=True)
    difficulty = models.CharField(max_length=10, choices=Difficulty.choices, default=Difficulty.MEDIUM)
    emotion_profile = models.JSONField(default=dict, blank=True, help_text="Baseline expressiveness tuning for the avatar renderer")
    supported_languages = models.JSONField(default=list, help_text="e.g. ['en', 'hi', 'te']")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "avatars"
        indexes = [
            models.Index(fields=["category"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return self.name


def custom_avatar_source_upload_path(instance, filename):
    return f"avatars/custom/{instance.student_id}/source_{filename}"


def custom_avatar_generated_upload_path(instance, filename):
    return f"avatars/custom/{instance.student_id}/generated_{filename}"


class CustomAvatar(BaseModel):
    """A student-generated avatar built from an uploaded photo."""

    class Status(models.TextChoices):
        PENDING = "pending", _("Pending")
        PROCESSING = "processing", _("Processing")
        READY = "ready", _("Ready")
        FAILED = "failed", _("Failed")

    student = models.ForeignKey("users.StudentProfile", on_delete=models.CASCADE, related_name="custom_avatars")
    source_photo = models.ImageField(upload_to=custom_avatar_source_upload_path)
    generated_avatar_image = models.ImageField(upload_to=custom_avatar_generated_upload_path, blank=True, null=True)
    voice_clone_id = models.CharField(max_length=100, blank=True, help_text="Reserved for future voice cloning support")
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    failure_reason = models.TextField(blank=True)

    class Meta:
        db_table = "custom_avatars"
        indexes = [models.Index(fields=["student", "status"])]

    def __str__(self):
        return f"CustomAvatar<{self.student_id}> [{self.status}]"
