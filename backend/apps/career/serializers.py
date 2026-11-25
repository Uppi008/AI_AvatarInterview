from rest_framework import serializers

from apps.resumes.models import Resume

from .models import AnswerPractice, CodeReview, GroupDiscussion, JobMatch, Quiz, StudyPlan

LANGUAGES = ("en", "hi", "te")


class JobMatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobMatch
        fields = [
            "id", "resume", "job_title", "company", "job_description", "language", "match_score", "verdict",
            "matched_skills", "missing_skills", "strengths", "resume_tips", "likely_questions",
            "cover_letter_subject", "cover_letter", "created_at",
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


CODE_LANGUAGES = ("Python", "JavaScript", "TypeScript", "Java", "C++", "C", "C#", "Go", "SQL")


class QuizSerializer(serializers.ModelSerializer):
    questions = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = [
            "id", "topic", "difficulty", "language", "category", "time_limit_seconds", "time_taken_seconds",
            "questions", "answers", "score", "submitted_at", "created_at",
        ]
        read_only_fields = fields

    def get_questions(self, quiz):
        # Until it's submitted, don't send the answers to the browser.
        if quiz.submitted_at:
            return quiz.questions
        return [{"question": q["question"], "options": q["options"]} for q in quiz.questions]


class QuizCreateSerializer(serializers.Serializer):
    topic = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    difficulty = serializers.ChoiceField(choices=Quiz.Difficulty.choices, default=Quiz.Difficulty.MEDIUM)
    count = serializers.IntegerField(min_value=3, max_value=20, default=10)
    language = serializers.ChoiceField(choices=LANGUAGES, required=False)
    category = serializers.ChoiceField(choices=Quiz.Category.choices, default=Quiz.Category.GENERAL)

    def validate(self, attrs):
        # A topic quiz needs a topic; an aptitude section already has one.
        if attrs["category"] == Quiz.Category.GENERAL and len(attrs.get("topic", "").strip()) < 2:
            raise serializers.ValidationError({"topic": "Enter a topic (at least 2 characters)."})
        return attrs


class QuizSubmitSerializer(serializers.Serializer):
    answers = serializers.ListField(child=serializers.IntegerField(min_value=0, max_value=3, allow_null=True))
    time_taken_seconds = serializers.IntegerField(min_value=0, required=False, allow_null=True)

    def validate_answers(self, value):
        quiz = self.context["quiz"]
        if quiz.submitted_at:
            raise serializers.ValidationError("This quiz was already submitted.")
        if len(value) != len(quiz.questions):
            raise serializers.ValidationError(f"Expected {len(quiz.questions)} answers.")
        return value


class CodeReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = CodeReview
        fields = [
            "id", "problem", "code", "code_language", "language", "analysis", "correctness_score",
            "readability_score", "efficiency_score", "time_complexity", "space_complexity", "verdict", "bugs",
            "improvements", "improved_code", "follow_up_question", "created_at",
        ]
        read_only_fields = fields


class CodeReviewCreateSerializer(serializers.Serializer):
    problem = serializers.CharField(min_length=10, max_length=3000)
    code = serializers.CharField(min_length=10, max_length=8000, trim_whitespace=False)
    code_language = serializers.ChoiceField(choices=CODE_LANGUAGES)
    language = serializers.ChoiceField(choices=LANGUAGES, required=False)


class GroupDiscussionSerializer(serializers.ModelSerializer):
    user_turns = serializers.IntegerField(read_only=True)
    max_user_turns = serializers.SerializerMethodField()

    class Meta:
        model = GroupDiscussion
        fields = [
            "id", "topic", "language", "participants", "transcript", "overall_score", "content_score",
            "communication_score", "leadership_score", "listening_score", "summary", "strengths",
            "improvements", "finished_at", "user_turns", "max_user_turns", "created_at",
        ]
        read_only_fields = fields

    def get_max_user_turns(self, obj) -> int:
        from .services import GD_MAX_USER_TURNS

        return GD_MAX_USER_TURNS


class GroupDiscussionCreateSerializer(serializers.Serializer):
    topic = serializers.CharField(max_length=300, required=False, allow_blank=True, default="")
    language = serializers.ChoiceField(choices=LANGUAGES, required=False)


class GroupDiscussionTurnSerializer(serializers.Serializer):
    message = serializers.CharField(min_length=2, max_length=1500)
