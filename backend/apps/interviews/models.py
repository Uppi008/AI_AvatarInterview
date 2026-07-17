from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel


class InterviewSession(BaseModel):
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", _("Scheduled")
        IN_PROGRESS = "in_progress", _("In Progress")
        COMPLETED = "completed", _("Completed")
        TERMINATED = "terminated", _("Terminated")
        ABANDONED = "abandoned", _("Abandoned")

    class Language(models.TextChoices):
        ENGLISH = "en", _("English")
        HINDI = "hi", _("Hindi")
        TELUGU = "te", _("Telugu")

    student = models.ForeignKey("users.StudentProfile", on_delete=models.CASCADE, related_name="interview_sessions")
    avatar = models.ForeignKey("avatars.Avatar", on_delete=models.PROTECT, related_name="interview_sessions")
    resume = models.ForeignKey(
        "resumes.Resume", on_delete=models.SET_NULL, null=True, blank=True, related_name="interview_sessions"
    )
    language = models.CharField(max_length=5, choices=Language.choices, default=Language.ENGLISH)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.SCHEDULED)
    scheduled_at = models.DateTimeField(blank=True, null=True)
    started_at = models.DateTimeField(blank=True, null=True)
    ended_at = models.DateTimeField(blank=True, null=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    violation_count = models.PositiveSmallIntegerField(default=0)
    termination_reason = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "interview_sessions"
        indexes = [
            models.Index(fields=["student", "status"]),
            models.Index(fields=["started_at"]),
        ]

    def __str__(self):
        return f"Session<{self.id}> {self.student_id} [{self.status}]"


class InterviewQuestion(BaseModel):
    class QuestionType(models.TextChoices):
        RESUME_BASED = "resume_based", _("Resume-based")
        BEHAVIORAL = "behavioral", _("Behavioral")
        CODING = "coding", _("Coding")
        FOLLOW_UP = "follow_up", _("Follow-up")

    class Difficulty(models.TextChoices):
        EASY = "easy", _("Easy")
        MEDIUM = "medium", _("Medium")
        HARD = "hard", _("Hard")

    session = models.ForeignKey(InterviewSession, on_delete=models.CASCADE, related_name="questions")
    parent_question = models.ForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True, related_name="follow_ups"
    )
    question_text = models.TextField()
    question_type = models.CharField(max_length=15, choices=QuestionType.choices)
    difficulty = models.CharField(max_length=10, choices=Difficulty.choices, default=Difficulty.MEDIUM)
    order_index = models.PositiveSmallIntegerField()
    asked_at = models.DateTimeField(blank=True, null=True)
    skipped = models.BooleanField(default=False)

    class Meta:
        db_table = "interview_questions"
        ordering = ["order_index"]
        indexes = [models.Index(fields=["session", "order_index"])]


class InterviewAnswer(BaseModel):
    question = models.OneToOneField(InterviewQuestion, on_delete=models.CASCADE, related_name="answer")
    transcript_text = models.TextField(blank=True)
    audio_file = models.FileField(upload_to="interview_audio/%Y/%m/%d/", blank=True, null=True)
    response_time_seconds = models.PositiveIntegerField(default=0)
    answered_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "interview_answers"


class AnswerEvaluation(BaseModel):
    """Rubric-based, per-answer scoring produced by the AI evaluation chain."""

    answer = models.OneToOneField(InterviewAnswer, on_delete=models.CASCADE, related_name="evaluation")
    technical_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    communication_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    relevance_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    confidence_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    feedback_text = models.TextField(blank=True)
    evaluated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "answer_evaluations"
