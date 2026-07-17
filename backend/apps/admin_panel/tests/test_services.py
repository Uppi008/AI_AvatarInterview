import pytest

from apps.admin_panel.models import AIModelConfig
from apps.admin_panel.services import set_active_ai_model_config

pytestmark = pytest.mark.django_db


class TestSetActiveAiModelConfig:
    def test_deactivates_other_configs_for_same_purpose(self):
        # migrations/0002_seed_defaults.py already seeds an active config
        # for this purpose -- start from a clean slate for it.
        AIModelConfig.objects.filter(purpose=AIModelConfig.Purpose.ANSWER_EVALUATION).delete()
        old = AIModelConfig.objects.create(
            provider="groq", model_name="old-model", purpose=AIModelConfig.Purpose.ANSWER_EVALUATION, is_active=True
        )
        new = AIModelConfig.objects.create(
            provider="groq", model_name="new-model", purpose=AIModelConfig.Purpose.ANSWER_EVALUATION, is_active=False
        )

        set_active_ai_model_config(new)

        old.refresh_from_db()
        new.refresh_from_db()
        assert old.is_active is False
        assert new.is_active is True

    def test_does_not_affect_other_purposes(self):
        AIModelConfig.objects.filter(
            purpose__in=[AIModelConfig.Purpose.QUESTION_GENERATION, AIModelConfig.Purpose.ANSWER_EVALUATION]
        ).delete()
        other_purpose = AIModelConfig.objects.create(
            provider="groq", model_name="q-model", purpose=AIModelConfig.Purpose.QUESTION_GENERATION, is_active=True
        )
        new = AIModelConfig.objects.create(
            provider="groq", model_name="new-model", purpose=AIModelConfig.Purpose.ANSWER_EVALUATION, is_active=False
        )

        set_active_ai_model_config(new)

        other_purpose.refresh_from_db()
        assert other_purpose.is_active is True
