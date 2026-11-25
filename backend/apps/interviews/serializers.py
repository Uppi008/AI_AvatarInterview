from django.utils import timezone
from rest_framework import serializers

from .models import AnswerEvaluation, InterviewAnswer, InterviewQuestion, InterviewSession


class AnswerEvaluationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnswerEvaluation
        fields = [
            "technical_score", "communication_score", "relevance_score", "confidence_score",
            "grammar_score", "feedback_text", "model_answer",
        ]


class InterviewAnswerSerializer(serializers.ModelSerializer):
    evaluation = AnswerEvaluationSerializer(read_only=True)

    class Meta:
        model = InterviewAnswer
        fields = ["transcript_text", "audio_file", "response_time_seconds", "answered_at", "evaluation"]


class InterviewQuestionSerializer(serializers.ModelSerializer):
    answer = InterviewAnswerSerializer(read_only=True)
    follow_ups = serializers.SerializerMethodField()

    class Meta:
        model = InterviewQuestion
        fields = [
            "id", "question_text", "question_type", "difficulty",
            "order_index", "asked_at", "skipped", "answer", "follow_ups",
        ]

    def get_follow_ups(self, obj):
        return InterviewQuestionSerializer(obj.follow_ups.all(), many=True).data


class InterviewSessionListSerializer(serializers.ModelSerializer):
    avatar_name = serializers.CharField(source="avatar.name", read_only=True)
    avatar_image = serializers.ImageField(source="avatar.image", read_only=True)
    answered_count = serializers.SerializerMethodField()
    report_score = serializers.SerializerMethodField()

    class Meta:
        model = InterviewSession
        fields = [
            "id", "avatar", "avatar_name", "avatar_image", "language", "personality", "status",
            "scheduled_at", "started_at", "ended_at", "duration_seconds", "violation_count",
            "answered_count", "report_score", "target_role", "company", "interview_type", "question_count",
        ]

    def get_answered_count(self, obj) -> int:
        # Annotated by the viewset's queryset; computed directly for sessions
        # serialized outside it (e.g. the create/end responses).
        annotated = getattr(obj, "answered_count", None)
        if annotated is not None:
            return annotated
        return InterviewAnswer.objects.filter(question__session=obj).count()

    def get_report_score(self, obj) -> float | None:
        try:
            return float(obj.report.overall_score)
        except InterviewSession.report.RelatedObjectDoesNotExist:
            return None


class InterviewSessionDetailSerializer(InterviewSessionListSerializer):
    questions = InterviewQuestionSerializer(many=True, read_only=True)

    class Meta(InterviewSessionListSerializer.Meta):
        fields = InterviewSessionListSerializer.Meta.fields + [
            "termination_reason", "resume", "job_description", "questions",
        ]


class InterviewSessionCreateSerializer(serializers.Serializer):
    avatar_id = serializers.UUIDField()
    resume_id = serializers.UUIDField(required=False, allow_null=True)
    language = serializers.ChoiceField(
        choices=InterviewSession.Language.choices, default=InterviewSession.Language.ENGLISH
    )
    personality = serializers.ChoiceField(
        choices=InterviewSession.Personality.choices, required=False, allow_blank=True, default=""
    )
    target_role = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    company = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    job_description = serializers.CharField(max_length=6000, required=False, allow_blank=True, default="")
    interview_type = serializers.ChoiceField(
        choices=InterviewSession.InterviewType.choices, default=InterviewSession.InterviewType.MIXED
    )
    question_count = serializers.IntegerField(min_value=3, max_value=15, default=7)
    scheduled_at = serializers.DateTimeField(required=False, allow_null=True)

    def validate_scheduled_at(self, value):
        if value and value <= timezone.now():
            raise serializers.ValidationError("Pick a time in the future.")
        return value
