from django.contrib import admin

from .models import AnswerEvaluation, InterviewAnswer, InterviewQuestion, InterviewSession


class InterviewQuestionInline(admin.TabularInline):
    model = InterviewQuestion
    fk_name = "session"
    extra = 0


@admin.register(InterviewSession)
class InterviewSessionAdmin(admin.ModelAdmin):
    list_display = ["id", "student", "avatar", "status", "language", "violation_count", "started_at"]
    list_filter = ["status", "language"]
    search_fields = ["student__user__email"]
    inlines = [InterviewQuestionInline]


@admin.register(InterviewQuestion)
class InterviewQuestionAdmin(admin.ModelAdmin):
    list_display = ["session", "question_type", "order_index", "skipped"]
    list_filter = ["question_type", "difficulty"]


@admin.register(InterviewAnswer)
class InterviewAnswerAdmin(admin.ModelAdmin):
    list_display = ["question", "response_time_seconds", "answered_at"]


@admin.register(AnswerEvaluation)
class AnswerEvaluationAdmin(admin.ModelAdmin):
    list_display = ["answer", "technical_score", "communication_score", "relevance_score", "confidence_score"]
