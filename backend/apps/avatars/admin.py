from django.contrib import admin

from .models import Avatar, CustomAvatar


@admin.register(Avatar)
class AvatarAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "difficulty", "is_active"]
    list_filter = ["category", "difficulty", "is_active"]
    search_fields = ["name"]


@admin.register(CustomAvatar)
class CustomAvatarAdmin(admin.ModelAdmin):
    list_display = ["student", "status", "created_at"]
    list_filter = ["status"]
    readonly_fields = ["failure_reason"]
