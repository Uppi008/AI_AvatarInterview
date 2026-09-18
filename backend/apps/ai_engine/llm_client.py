"""Provider dispatch for chat models used across the AI engine.

An admin can point any AIModelConfig.purpose at a different provider/model
from the admin panel; this is the only place that translates that choice
into an actual LangChain chat model instance. Adding a new provider means
adding one branch here -- no call site changes.
"""
from django.conf import settings

DEFAULT_MODELS = {
    "groq": "openai/gpt-oss-120b",
}


def get_chat_model(purpose: str, *, temperature: float = 0.4):
    from apps.admin_panel.models import AIModelConfig

    config = AIModelConfig.objects.filter(purpose=purpose, is_active=True).first()
    provider = config.provider if config else settings.LLM_PROVIDER
    model_name = (config.model_name if config else None) or settings.GROQ_MODEL or DEFAULT_MODELS.get(provider)
    extra_config = config.config if config else {}

    if provider == "groq":
        from langchain_groq import ChatGroq

        if not settings.GROQ_API_KEY:
            raise RuntimeError(
                "GROQ_API_KEY is not configured. Set it in .env before using AI features."
            )
        return ChatGroq(
            api_key=settings.GROQ_API_KEY,
            model=model_name,
            temperature=extra_config.get("temperature", temperature),
        )

    raise ValueError(
        f"LLM provider '{provider}' is not implemented yet. Only 'groq' is wired up; "
        "add a branch here to support gemini/openrouter/ollama."
    )
