"""Pydantic schemas the LLM is constrained to via with_structured_output().

Keeping these separate from the Django models: they describe what the LLM
is allowed to return, not what gets persisted -- services.py maps between
the two deliberately, rather than handing the model a Django model to fill in.
"""
from typing import Literal, Optional

# langchain_groq==0.1.6 checks schemas against its own bundled
# langchain_core.pydantic_v1.BaseModel (not plain `pydantic.BaseModel`) to
# decide whether to parse structured output into a model instance vs. a
# raw dict. Importing from here -- rather than `pydantic` directly --
# keeps with_structured_output() actually returning parsed instances.
from langchain_core.pydantic_v1 import BaseModel, Field


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


# --- Content moderation ---
class ModerationResult(BaseModel):
    is_safe: bool = Field(
        default=True,
        description=(
            "False only if the text contains or requests sexual/adult, hateful, violent, or "
            "abusive content. Blunt, negative, or off-topic interview answers are still safe."
        ),
    )
    reason: str = Field(default="", description="Brief reason if unsafe, empty string if safe")


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
    voice_clarity_score: float = Field(
        ge=0, le=100, description="How clearly the answer was articulated -- from the transcript's fluency/pacing, not audio quality"
    )
    grammar_score: float = Field(ge=0, le=100, description="Grammatical correctness of the answer as transcribed")
    problem_solving_score: float = Field(
        ge=0, le=100, description="Quality of reasoning/approach shown, independent of raw technical correctness"
    )
    feedback: str = Field(description="1-2 sentences of specific, constructive feedback")
    follow_up_question: Optional[str] = Field(
        default=None, description="A natural follow-up question, only if the answer invites one"
    )


# --- Report summary (qualitative synthesis over the whole session) ---
class ReportSummaryResult(BaseModel):
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    improvement_tips: list[str] = Field(default_factory=list)
    spoken_summary: str = Field(
        default="",
        description=(
            "A short, natural closing statement in the interviewer's own voice -- the way a "
            "real interviewer wraps up in person: thanks the candidate, comments specifically "
            "on what stood out (backed by the actual scores given), gives one honest area to "
            "work on, and closes encouragingly. Plain spoken language, not a bulleted report."
        ),
    )
    learning_roadmap: list[str] = Field(
        default_factory=list,
        description="3-6 concrete, ordered next steps to close the gaps this candidate showed.",
    )
    career_suggestions: list[str] = Field(
        default_factory=list,
        description="2-4 realistic role/track suggestions given this candidate's demonstrated strengths.",
    )
    hiring_recommendation: Literal["strong_hire", "hire", "no_hire", "strong_no_hire"] = Field(
        default="hire", description="Overall hiring signal based on the full interview performance."
    )
    hiring_recommendation_reason: str = Field(
        default="", description="One sentence explaining the hiring recommendation, referencing the actual scores."
    )
    recommended_courses: list[str] = Field(
        default_factory=list, description="2-4 specific course names or topics to study to close the gaps shown."
    )
    recommended_certifications: list[str] = Field(
        default_factory=list, description="1-3 relevant certifications worth pursuing."
    )
    recommended_projects: list[str] = Field(
        default_factory=list, description="2-3 concrete project ideas that would strengthen this candidate's profile."
    )


# --- Career Lab: resume vs. job description ---
class LikelyQuestion(BaseModel):
    question: str
    why_asked: str = Field(default="", description="One short line on which job requirement this probes")


class JobMatchResult(BaseModel):
    match_score: float = Field(ge=0, le=100, description="How well the resume fits this job, 0-100")
    verdict: str = Field(description="One sentence overall fit verdict")
    matched_skills: list[str] = Field(default_factory=list, description="Job requirements the resume clearly shows")
    missing_skills: list[str] = Field(default_factory=list, description="Job requirements absent from the resume")
    strengths: list[str] = Field(default_factory=list, description="2-4 reasons this candidate stands out for the role")
    resume_tips: list[str] = Field(
        default_factory=list, description="3-5 specific edits to tailor the resume to this job, honestly"
    )
    likely_questions: list[LikelyQuestion] = Field(
        default_factory=list, description="5 questions this employer is likely to ask this candidate"
    )


# --- Career Lab: answer coach ---
class StarComponent(BaseModel):
    present: bool = False
    comment: str = Field(default="", description="One short line on this part of the answer")


class StarBreakdown(BaseModel):
    situation: StarComponent = Field(default_factory=StarComponent)
    task: StarComponent = Field(default_factory=StarComponent)
    action: StarComponent = Field(default_factory=StarComponent)
    result: StarComponent = Field(default_factory=StarComponent)


class AnswerCoachResult(BaseModel):
    overall_score: float = Field(ge=0, le=100)
    clarity_score: float = Field(ge=0, le=100)
    relevance_score: float = Field(ge=0, le=100)
    impact_score: float = Field(ge=0, le=100, description="Concrete results, numbers, ownership")
    star: StarBreakdown = Field(default_factory=StarBreakdown)
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list, description="2-4 specific, actionable changes")
    improved_answer: str = Field(
        description=(
            "A stronger version of the candidate's own answer, keeping their facts -- never invent "
            "employers, numbers or achievements; use [placeholders] where a detail is missing."
        )
    )


# --- Career Lab: study plan ---
class StudyDay(BaseModel):
    # No day number here: the model mangled it in long outputs ('"day": 4",'),
    # failing the whole call. Days are numbered by position in services.
    title: str
    focus: str = Field(description="The skill or weakness this day targets")
    tasks: list[str] = Field(default_factory=list, description="2-3 short, concrete tasks, each doable in under an hour")
    practice_question: str = Field(default="", description="One interview question to answer out loud that day")
    resources: list[str] = Field(
        default_factory=list, description="1-2 free resources by name (official docs, well-known free courses)"
    )


class StudyPlanResult(BaseModel):
    summary: str = Field(description="Two sentences on what this plan fixes and why")
    focus_areas: list[str] = Field(default_factory=list)
    days: list[StudyDay] = Field(default_factory=list)


# --- Career Lab: skill quiz ---
class QuizQuestion(BaseModel):
    question: str
    options: list[str] = Field(description="Exactly 4 answer options, plain text, no 'A)' prefixes")
    correct_index: int = Field(ge=0, le=3, description="0-based index of the correct option")
    explanation: str = Field(description="One or two sentences on why the answer is correct")


class QuizResult(BaseModel):
    questions: list[QuizQuestion] = Field(default_factory=list)


# --- Career Lab: code review ---
class CodeReviewResult(BaseModel):
    # Asked for first so the model traces the SUBMITTED code before rating it;
    # without it, it reported the complexity of its own improved version.
    analysis: str = Field(
        description="2-3 sentences tracing how the SUBMITTED code runs: its loops/recursion and what each does"
    )
    correctness_score: float = Field(ge=0, le=100, description="Does it solve the stated problem, incl. edge cases")
    readability_score: float = Field(ge=0, le=100)
    efficiency_score: float = Field(ge=0, le=100)
    time_complexity: str = Field(
        description="Big-O time of the SUBMITTED code as written (not the improved version), e.g. 'O(n^2)'"
    )
    space_complexity: str = Field(description="Big-O extra space of the SUBMITTED code as written")
    verdict: str = Field(description="One sentence overall verdict, as an interviewer would say it")
    bugs: list[str] = Field(default_factory=list, description="Concrete bugs or failing edge cases; empty if none")
    improvements: list[str] = Field(default_factory=list, description="2-4 specific improvements")
    improved_code: str = Field(description="A corrected, idiomatic version in the same language")
    follow_up_question: str = Field(default="", description="A follow-up an interviewer would ask next")


# --- Career Lab: cover letter ---
class CoverLetterResult(BaseModel):
    subject: str = Field(description="Email subject line for the application")
    letter: str = Field(description="The cover letter body, 180-260 words, plain paragraphs")
