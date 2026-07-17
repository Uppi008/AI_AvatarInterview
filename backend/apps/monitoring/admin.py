from django.contrib import admin

from .models import ProctoringEvent


@admin.register(ProctoringEvent)
class ProctoringEventAdmin(admin.ModelAdmin):
    list_display = ["session", "event_type", "severity", "triggered_termination", "detected_at"]
    list_filter = ["event_type", "severity", "triggered_termination"]
    search_fields = ["session__student__user__email"]
