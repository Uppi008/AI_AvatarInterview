from rest_framework import serializers

from apps.resumes.models import Resume

from .models import AnswerPractice, JobMatch, StudyPlan

LANGUAGES = ("en", "hi", "te")


class JobMatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobMatch
        fields = [
            "id", "resume", "job_title", "company", "job_description", "language", "match_score", "verdict",
            "matched_skills", "missing_skills", "strengths", "resume_tips", "likely_questions", "created_at",
        ]
        read_only_fields = fields


class JobMatchCreateSerializer(serializers.Serializer):
    job_description = serializers.CharField(min_length=80, max_length=8000)
    job_title = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    company = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    resume = serializers.PrimaryKeyRelatedField(queryset=Resume.objects.none(), required=False, allow_null=True)
    language = serializers.ChoiceField(choices=LANGUAGES, required=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request:
            # Only the student's own resumes are selectable.
            self.fields["resume"].queryset = Resume.objects.filter(student__user=request.user)


class AnswerPracticeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnswerPractice
        fields = [
            "id", "question", "answer", "target_role", "language", "overall_score", "clarity_score",
            "relevance_score", "impact_score", "star", "strengths", "improvements", "improved_answer", "delivery",
            "created_at",
        ]
        read_only_fields = fields


class AnswerPracticeCreateSerializer(serializers.Serializer):
    question = serializers.CharField(min_length=10, max_length=1000)
    answer = serializers.CharField(min_length=20, max_length=6000)
    target_role = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    language = serializers.ChoiceField(choices=LANGUAGES, required=False)


class StudyPlanSerializer(serializers.ModelSerializer):
    total_tasks = serializers.IntegerField(read_only=True)

    class Meta:
        model = StudyPlan
        fields = [
            "id", "target_role", "language", "summary", "focus_areas", "days", "completed_tasks", "total_tasks",
            "sources", "created_at",
        ]
        read_only_fields = [f for f in fields if f != "completed_tasks"]

    def validate_completed_tasks(self, value):
        valid = {
            f"{day.get('day')}-{i}" for day in self.instance.days for i in range(len(day.get("tasks", [])))
        }
        if not isinstance(value, list) or any(not isinstance(v, str) or v not in valid for v in value):
            raise serializers.ValidationError("Contains a task that isn't in this plan.")
        return sorted(set(value))


class StudyPlanCreateSerializer(serializers.Serializer):
    target_role = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    days = serializers.IntegerField(min_value=3, max_value=14, default=7)
    language = serializers.ChoiceField(choices=LANGUAGES, required=False)
