"""AI Career Lab: practice tools that sit around the live interview.

- JobMatch: a resume scored against a pasted job description.
- AnswerPractice: one practice answer, graded + rewritten by the coach.
- StudyPlan: a day-by-day prep plan built from the candidate's own weak spots.

The LLM output is stored as plain JSON (not normalized tables) because
these are read back whole and never queried by their inner fields.
"""
from django.db import models

from common.models import BaseModel


class JobMatch(BaseModel):
    student = models.ForeignKey("users.StudentProfile", on_delete=models.CASCADE, related_name="job_matches")
    resume = models.ForeignKey("resumes.Resume", on_delete=models.SET_NULL, null=True, blank=True)
    job_title = models.CharField(max_length=150, blank=True)
    company = models.CharField(max_length=150, blank=True)
    job_description = models.TextField()
    language = models.CharField(max_length=5, default="en")
    match_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    verdict = models.TextField(blank=True)
    matched_skills = models.JSONField(default=list)
    missing_skills = models.JSONField(default=list)
    strengths = models.JSONField(default=list)
    resume_tips = models.JSONField(default=list)
    likely_questions = models.JSONField(default=list, help_text="[{question, why_asked}]")

    class Meta:
        db_table = "career_job_matches"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["student", "-created_at"])]

    def __str__(self):
        return f"{self.job_title or 'Job'} match ({self.match_score})"


class AnswerPractice(BaseModel):
    student = models.ForeignKey("users.StudentProfile", on_delete=models.CASCADE, related_name="answer_practices")
    question = models.TextField()
    answer = models.TextField()
    target_role = models.CharField(max_length=150, blank=True)
    language = models.CharField(max_length=5, default="en")
    overall_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    clarity_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    relevance_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    impact_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    star = models.JSONField(default=dict, help_text="{situation|task|action|result: {present, comment}}")
    strengths = models.JSONField(default=list)
    improvements = models.JSONField(default=list)
    improved_answer = models.TextField(blank=True)
    delivery = models.JSONField(default=dict, help_text="Deterministic stats from career.delivery")

    class Meta:
        db_table = "career_answer_practices"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["student", "-created_at"])]


class StudyPlan(BaseModel):
    student = models.ForeignKey("users.StudentProfile", on_delete=models.CASCADE, related_name="study_plans")
    target_role = models.CharField(max_length=150, blank=True)
    language = models.CharField(max_length=5, default="en")
    summary = models.TextField(blank=True)
    focus_areas = models.JSONField(default=list)
    days = models.JSONField(default=list, help_text="[{day, title, focus, tasks, practice_question, resources}]")
    completed_tasks = models.JSONField(default=list, help_text='Checked-off task keys, e.g. "2-0" = day 2, task 0')
    sources = models.JSONField(default=dict, help_text="How many reports/resumes the plan was built from")

    class Meta:
        db_table = "career_study_plans"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["student", "-created_at"])]

    @property
    def total_tasks(self) -> int:
        return sum(len(day.get("tasks", [])) for day in self.days)
