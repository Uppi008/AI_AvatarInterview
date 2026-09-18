"""llama-3.3-70b-versatile has been retired from Groq's API (confirmed via
GET /openai/v1/models -- it's no longer in the catalog), so every
AIModelConfig row still pointing at it 404s at request time regardless of
GROQ_MODEL/DEFAULT_MODELS in code: get_chat_model() reads the active DB row
for a purpose before ever falling back to those. Repoints existing rows
that still have the old value at a current, verified-working model.
"""
from django.db import migrations

OLD_MODEL = "llama-3.3-70b-versatile"
NEW_MODEL = "openai/gpt-oss-120b"


def update_model(apps, schema_editor):
    AIModelConfig = apps.get_model("admin_panel", "AIModelConfig")
    AIModelConfig.objects.filter(provider="groq", model_name=OLD_MODEL).update(model_name=NEW_MODEL)


class Migration(migrations.Migration):
    dependencies = [
        ("admin_panel", "0003_alter_aimodelconfig_purpose"),
    ]

    operations = [
        migrations.RunPython(update_model, migrations.RunPython.noop),
    ]
