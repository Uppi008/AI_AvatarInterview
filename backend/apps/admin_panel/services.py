from django.db import transaction

from .models import AIModelConfig


@transaction.atomic
def set_active_ai_model_config(config: AIModelConfig) -> AIModelConfig:
    """Deactivates any other config for the same purpose so the DB's
    "one active config per purpose" constraint never race-conditions
    against an admin flipping two rows to active in quick succession.
    """
    AIModelConfig.objects.filter(purpose=config.purpose, is_active=True).exclude(pk=config.pk).update(
        is_active=False
    )
    config.is_active = True
    config.save(update_fields=["is_active"])
    return config
