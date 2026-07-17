from rest_framework import serializers

from .models import Avatar, CustomAvatar


class AvatarSerializer(serializers.ModelSerializer):
    class Meta:
        model = Avatar
        fields = [
            "id", "name", "category", "image", "voice_id", "speaking_style",
            "interview_style", "difficulty", "emotion_profile", "supported_languages",
        ]


class CustomAvatarSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomAvatar
        fields = ["id", "source_photo", "generated_avatar_image", "status", "failure_reason", "created_at"]
        read_only_fields = ["id", "generated_avatar_image", "status", "failure_reason", "created_at"]
