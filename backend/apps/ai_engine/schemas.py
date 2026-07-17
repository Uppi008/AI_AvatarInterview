"""Pydantic schemas the LLM is constrained to via with_structured_output().

Keeping these separate from the Django models: they describe what the LLM
is allowed to return, not what gets persisted -- services.py maps between
the two deliberately, rather than handing the model a Django model to fill in.
"""
from typing import Literal, Optional

from pydantic import BaseModel, Field


# --- Resume extraction ---
class ExtractedSkill(BaseModel):
    name: str
    category: Literal["technical", "soft", "tool"] = "technical"


class ExtractedProject(BaseModel):
    title: str
    description: str = ""
    technologies: list[str] = Field(default_factory=list)
    duration: str = ""


class ExtractedExperience(BaseModel):
    company: str
    role: str
    description: str = ""
    is_current: bool = False


class ExtractedEducation(BaseModel):
    institution: str
    degree: str
    field_of_study: str = ""


class ExtractedCertification(BaseModel):
    name: str
    issuer: str = ""


class ResumeExtractionResult(BaseModel):
    summary: str = Field(description="2-3 sentence overview of the candidate")
    skills: list[ExtractedSkill] = Field(default_factory=list)
    projects: list[ExtractedProject] = Field(default_factory=list)
    experiences: list[ExtractedExperience] = Field(default_factory=list)
    education: list[ExtractedEducation] = Field(default_factory=list)
    certifications: list[ExtractedCertification] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    suggested_focus_areas: list[str] = Field(
        default_factory=list, description="Topics an interviewer should probe given gaps or ambiguities"
    )


# --- Question generation ---
class GeneratedQuestion(BaseModel):
    question_text: str
    question_type: Literal["resume_based", "behavioral", "coding"]
    difficulty: Literal["easy", "medium", "hard"] = "medium"


class QuestionBankResult(BaseModel):
    questions: list[GeneratedQuestion]


# --- Answer evaluation ---
class AnswerEvaluationResult(BaseModel):
    technical_score: float = Field(ge=0, le=100)
    communication_score: float = Field(ge=0, le=100)
    relevance_score: float = Field(ge=0, le=100)
    confidence_score: float = Field(ge=0, le=100)
    feedback: str = Field(description="1-2 sentences of specific, constructive feedback")
    follow_up_question: Optional[str] = Field(
        default=None, description="A natural follow-up question, only if the answer invites one"
    )


# --- Report summary (qualitative synthesis over the whole session) ---
class ReportSummaryResult(BaseModel):
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    improvement_tips: list[str] = Field(default_factory=list)
