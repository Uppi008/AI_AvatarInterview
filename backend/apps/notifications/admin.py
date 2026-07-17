from django.contrib import admin

from .models import EmailLog


@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = ["recipient_email", "email_type", "status", "sent_at", "created_at"]
    list_filter = ["email_type", "status"]
    search_fields = ["recipient_email"]
    readonly_fields = ["user", "email_type", "recipient_email", "subject", "related_session", "sent_at"]
