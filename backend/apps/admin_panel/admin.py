from django.contrib import admin

from .models import AIModelConfig, LanguageConfig, PlatformSetting


@admin.register(LanguageConfig)
class LanguageConfigAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "is_active"]


@admin.register(AIModelConfig)
class AIModelConfigAdmin(admin.ModelAdmin):
    list_display = ["purpose", "provider", "model_name", "is_active"]
    list_filter = ["purpose", "provider", "is_active"]


@admin.register(PlatformSetting)
class PlatformSettingAdmin(admin.ModelAdmin):
    list_display = ["key", "description"]
