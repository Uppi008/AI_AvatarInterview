from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel


def report_pdf_upload_path(instance, filename):
    return f"reports/{instance.session_id}/{filename}"


class InterviewReport(BaseModel):
    """Aggregated, final scoring and feedback for a completed interview session."""

    class HiringRecommendation(models.TextChoices):
        STRONG_HIRE = "strong_hire", _("Strong Hire")
        HIRE = "hire", _("Hire")
        NO_HIRE = "no_hire", _("No Hire")
        STRONG_NO_HIRE = "strong_no_hire", _("Strong No Hire")

    session = models.OneToOneField("interviews.InterviewSession", on_delete=models.CASCADE, related_name="report")
    overall_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    communication_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    technical_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    confidence_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    body_language_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    eye_contact_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    resume_matching_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    voice_clarity_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    grammar_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    problem_solving_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    strengths = models.JSONField(default=list)
    weaknesses = models.JSONField(default=list)
    improvement_tips = models.JSONField(default=list)
    spoken_summary = models.TextField(
        blank=True, default="", help_text="The interviewer's natural-language closing remarks."
    )
    learning_roadmap = models.JSONField(default=list)
    career_suggestions = models.JSONField(default=list)
    recommended_courses = models.JSONField(default=list)
    recommended_certifications = models.JSONField(default=list)
    recommended_projects = models.JSONField(default=list)
    hiring_recommendation = models.CharField(
        max_length=20, choices=HiringRecommendation.choices, blank=True, default=""
    )
    hiring_recommendation_reason = models.TextField(blank=True, default="")
    pdf_file = models.FileField(upload_to=report_pdf_upload_path, blank=True, null=True)
    generated_at = models.DateTimeField(auto_now_add=True)
    emailed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "interview_reports"

    def __str__(self):
        return f"Report<{self.session_id}> overall={self.overall_score}"
