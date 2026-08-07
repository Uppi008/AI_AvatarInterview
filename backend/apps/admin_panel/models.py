from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel


class LanguageConfig(BaseModel):
    """Admin-managed set of languages the platform currently supports."""

    code = models.CharField(max_length=5, unique=True, help_text="ISO 639-1 code, e.g. en, hi, te")
    name = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "language_configs"

    def __str__(self):
        return self.code


class AIModelConfig(BaseModel):
    """Admin-managed mapping of which LLM/model backs each AI task.

    Lets an admin swap providers (e.g. groq -> gemini) or tune parameters
    without a deploy; ai_engine.services reads the active row per purpose.
    """

    class Purpose(models.TextChoices):
        QUESTION_GENERATION = "question_generation", _("Question Generation")
        ANSWER_EVALUATION = "answer_evaluation", _("Answer Evaluation")
        SPEECH_TO_TEXT = "speech_to_text", _("Speech to Text")
        TEXT_TO_SPEECH = "text_to_speech", _("Text to Speech")
        RESUME_EXTRACTION = "resume_extraction", _("Resume Extraction")
        MODERATION = "moderation", _("Content Moderation")

    provider = models.CharField(max_length=50, help_text="e.g. groq, gemini, openrouter, ollama")
    model_name = models.CharField(max_length=100)
    purpose = models.CharField(max_length=30, choices=Purpose.choices)
    is_active = models.BooleanField(default=True)
    config = models.JSONField(default=dict, blank=True, help_text="temperature, max_tokens, etc.")

    class Meta:
        db_table = "ai_model_configs"
        constraints = [
            models.UniqueConstraint(
                fields=["purpose"],
                condition=models.Q(is_active=True),
                name="unique_active_config_per_purpose",
            )
        ]

    def __str__(self):
        return f"{self.purpose}:{self.provider}/{self.model_name}"


class PlatformSetting(BaseModel):
    """Generic admin-editable key/value store for platform-wide toggles."""

    key = models.CharField(max_length=100, unique=True)
    value = models.JSONField()
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "platform_settings"

    def __str__(self):
        return self.key
