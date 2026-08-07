from django.apps import AppConfig
from django.core.checks import Warning, register


class AiEngineConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.ai_engine"
    label = "ai_engine"

    def ready(self):
        register(check_llm_provider_configured)


def check_llm_provider_configured(app_configs, **kwargs):
    """Surfaces a missing LLM API key at startup (manage.py check/runserver/
    deploy) instead of as a runtime 500 the first time a student starts an
    interview -- llm_client.get_chat_model() only validates this lazily, at
    call time, since it needs to read the per-purpose AIModelConfig first.
    """
    from django.conf import settings

    errors = []
    if settings.LLM_PROVIDER == "groq" and not settings.GROQ_API_KEY:
        errors.append(
            Warning(
                "LLM_PROVIDER is 'groq' but GROQ_API_KEY is not set.",
                hint="Set GROQ_API_KEY in .env, or every question-generation/scoring/TTS "
                "call will fail at runtime with a 500 instead of at startup.",
                id="ai_engine.W001",
            )
        )
    return errors
