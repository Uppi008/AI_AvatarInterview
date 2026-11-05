from django.contrib import admin

from .models import AnswerPractice, CodeReview, JobMatch, Quiz, StudyPlan


@admin.register(JobMatch)
class JobMatchAdmin(admin.ModelAdmin):
    list_display = ["student", "job_title", "company", "match_score", "created_at"]
    search_fields = ["student__user__email", "job_title", "company"]


@admin.register(AnswerPractice)
class AnswerPracticeAdmin(admin.ModelAdmin):
    list_display = ["student", "overall_score", "created_at"]
    search_fields = ["student__user__email", "question"]


@admin.register(StudyPlan)
class StudyPlanAdmin(admin.ModelAdmin):
    list_display = ["student", "target_role", "created_at"]
    search_fields = ["student__user__email", "target_role"]


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ["student", "topic", "difficulty", "score", "created_at"]
    search_fields = ["student__user__email", "topic"]


@admin.register(CodeReview)
class CodeReviewAdmin(admin.ModelAdmin):
    list_display = ["student", "code_language", "correctness_score", "created_at"]
    search_fields = ["student__user__email", "problem"]
