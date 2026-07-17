from rest_framework import serializers

from .models import ProctoringEvent


class ProctoringEventCreateSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()
    event_type = serializers.ChoiceField(choices=ProctoringEvent.EventType.choices)
    metadata = serializers.JSONField(required=False, default=dict)


class ProctoringEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProctoringEvent
        fields = ["id", "session", "event_type", "severity", "detected_at", "metadata", "triggered_termination"]
        read_only_fields = fields
