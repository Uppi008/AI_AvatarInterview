from django.contrib import admin

from .models import (
    Resume,
    ResumeCertification,
    ResumeEducation,
    ResumeExperience,
    ResumeInsight,
    ResumeProject,
    ResumeSkill,
)


class ResumeSkillInline(admin.TabularInline):
    model = ResumeSkill
    extra = 0


class ResumeProjectInline(admin.TabularInline):
    model = ResumeProject
    extra = 0


class ResumeExperienceInline(admin.TabularInline):
    model = ResumeExperience
    extra = 0


class ResumeEducationInline(admin.TabularInline):
    model = ResumeEducation
    extra = 0


class ResumeCertificationInline(admin.TabularInline):
    model = ResumeCertification
    extra = 0


@admin.register(Resume)
class ResumeAdmin(admin.ModelAdmin):
    list_display = ["original_filename", "student", "file_type", "parsing_status", "is_active", "created_at"]
    list_filter = ["file_type", "parsing_status", "is_active"]
    search_fields = ["original_filename", "student__user__email"]
    inlines = [
        ResumeSkillInline, ResumeProjectInline, ResumeExperienceInline,
        ResumeEducationInline, ResumeCertificationInline,
    ]


@admin.register(ResumeInsight)
class ResumeInsightAdmin(admin.ModelAdmin):
    list_display = ["resume"]
