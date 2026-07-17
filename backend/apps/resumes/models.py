from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel


def resume_upload_path(instance, filename):
    return f"resumes/{instance.student_id}/{filename}"


class Resume(BaseModel):
    class FileType(models.TextChoices):
        PDF = "pdf", "PDF"
        DOCX = "docx", "DOCX"

    class ParsingStatus(models.TextChoices):
        PENDING = "pending", _("Pending")
        PROCESSING = "processing", _("Processing")
        COMPLETED = "completed", _("Completed")
        FAILED = "failed", _("Failed")

    student = models.ForeignKey("users.StudentProfile", on_delete=models.CASCADE, related_name="resumes")
    file = models.FileField(upload_to=resume_upload_path)
    original_filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=10, choices=FileType.choices)
    raw_text = models.TextField(blank=True)
    parsing_status = models.CharField(max_length=15, choices=ParsingStatus.choices, default=ParsingStatus.PENDING)
    parsing_error = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, help_text="Most recently uploaded resume used for new interviews")

    class Meta:
        db_table = "resumes"
        indexes = [models.Index(fields=["student", "is_active"])]

    def __str__(self):
        return f"{self.original_filename} ({self.student_id})"


class ResumeSkill(BaseModel):
    class Category(models.TextChoices):
        TECHNICAL = "technical", _("Technical")
        SOFT = "soft", _("Soft Skill")
        TOOL = "tool", _("Tool/Platform")

    resume = models.ForeignKey(Resume, on_delete=models.CASCADE, related_name="skills")
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=15, choices=Category.choices, default=Category.TECHNICAL)

    class Meta:
        db_table = "resume_skills"
        indexes = [models.Index(fields=["resume"])]


class ResumeProject(BaseModel):
    resume = models.ForeignKey(Resume, on_delete=models.CASCADE, related_name="projects")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    technologies = models.JSONField(default=list)
    duration = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = "resume_projects"


class ResumeExperience(BaseModel):
    resume = models.ForeignKey(Resume, on_delete=models.CASCADE, related_name="experiences")
    company = models.CharField(max_length=255)
    role = models.CharField(max_length=255)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    is_current = models.BooleanField(default=False)
    description = models.TextField(blank=True)

    class Meta:
        db_table = "resume_experiences"


class ResumeEducation(BaseModel):
    resume = models.ForeignKey(Resume, on_delete=models.CASCADE, related_name="education_history")
    institution = models.CharField(max_length=255)
    degree = models.CharField(max_length=255)
    field_of_study = models.CharField(max_length=255, blank=True)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    grade = models.CharField(max_length=50, blank=True)

    class Meta:
        db_table = "resume_education"


class ResumeCertification(BaseModel):
    resume = models.ForeignKey(Resume, on_delete=models.CASCADE, related_name="certifications")
    name = models.CharField(max_length=255)
    issuer = models.CharField(max_length=255, blank=True)
    issue_date = models.DateField(blank=True, null=True)

    class Meta:
        db_table = "resume_certifications"


class ResumeInsight(BaseModel):
    """LLM-generated qualitative summary, one-to-one with a resume.

    Strengths/weaknesses are free-form LLM output, not independently
    queried entities, so they stay as JSON here rather than their own
    normalized tables.
    """

    resume = models.OneToOneField(Resume, on_delete=models.CASCADE, related_name="insight")
    summary = models.TextField(blank=True)
    strengths = models.JSONField(default=list)
    weaknesses = models.JSONField(default=list)
    suggested_focus_areas = models.JSONField(default=list)

    class Meta:
        db_table = "resume_insights"
