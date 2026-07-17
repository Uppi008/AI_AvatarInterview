from django.db import migrations

LANGUAGES = [
    ("en", "English"),
    ("hi", "Hindi"),
    ("te", "Telugu"),
]

AI_MODEL_CONFIGS = [
    ("groq", "llama-3.3-70b-versatile", "question_generation"),
    ("groq", "llama-3.3-70b-versatile", "answer_evaluation"),
    ("groq", "llama-3.3-70b-versatile", "resume_extraction"),
]


def seed_defaults(apps, schema_editor):
    LanguageConfig = apps.get_model("admin_panel", "LanguageConfig")
    AIModelConfig = apps.get_model("admin_panel", "AIModelConfig")

    for code, name in LANGUAGES:
        LanguageConfig.objects.get_or_create(code=code, defaults={"name": name, "is_active": True})

    for provider, model_name, purpose in AI_MODEL_CONFIGS:
        AIModelConfig.objects.get_or_create(
            purpose=purpose,
            is_active=True,
            defaults={"provider": provider, "model_name": model_name, "config": {}},
        )


def remove_defaults(apps, schema_editor):
    LanguageConfig = apps.get_model("admin_panel", "LanguageConfig")
    AIModelConfig = apps.get_model("admin_panel", "AIModelConfig")
    LanguageConfig.objects.filter(code__in=[code for code, _ in LANGUAGES]).delete()
    AIModelConfig.objects.filter(purpose__in=[purpose for _, _, purpose in AI_MODEL_CONFIGS]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("admin_panel", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_defaults, remove_defaults),
    ]
