from rest_framework import serializers

from .models import AIModelConfig, LanguageConfig, PlatformSetting


class LanguageConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = LanguageConfig
        fields = ["id", "code", "name", "is_active"]


class AIModelConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIModelConfig
        fields = ["id", "provider", "model_name", "purpose", "is_active", "config"]
        read_only_fields = ["id"]


class PlatformSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSetting
        fields = ["id", "key", "value", "description"]


class PlatformAnalyticsSerializer(serializers.Serializer):
    total_students = serializers.IntegerField()
    total_interviews = serializers.IntegerField()
    completed_interviews = serializers.IntegerField()
    terminated_interviews = serializers.IntegerField()
    average_overall_score = serializers.FloatField()
    avatar_usage = serializers.DictField()
    language_usage = serializers.DictField()
