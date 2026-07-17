from django.contrib import admin

from .models import InterviewReport


@admin.register(InterviewReport)
class InterviewReportAdmin(admin.ModelAdmin):
    list_display = ["session", "overall_score", "generated_at", "emailed_at"]
    search_fields = ["session__student__user__email"]
