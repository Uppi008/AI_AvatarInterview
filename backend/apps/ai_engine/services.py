"""Single integration boundary for LLM/LangChain calls.

Every other app talks to the LLM only through this module (never directly
to Groq/LangChain), so swapping providers touches one file. See
docs/ARCHITECTURE.md section 6 for the chain design.

Implemented in Phase 5 (AI Integration). Callers in Phase 3 (resumes,
interviews) already call these functions and handle NotImplementedError
so the pipeline is wired end-to-end ahead of the real implementation.
"""
from apps.resumes.models import Resume


def extract_resume_entities(resume: "Resume") -> None:
    """Runs the resume-extraction chain: populates ResumeSkill, ResumeProject,
    ResumeExperience, ResumeEducation, ResumeCertification, and ResumeInsight
    for the given resume from its `raw_text`.
    """
    raise NotImplementedError("Resume entity extraction lands in Phase 5.")


def generate_question_bank(*, session) -> list:
    """Generates the initial ordered set of InterviewQuestion rows for a
    session, based on the student's resume + the selected avatar's persona
    and difficulty."""
    raise NotImplementedError("Question generation lands in Phase 5.")


def evaluate_answer(*, question, answer) -> dict:
    """Scores a single answer (technical/communication/relevance/confidence)
    and optionally proposes a follow-up question."""
    raise NotImplementedError("Answer evaluation lands in Phase 5.")


def aggregate_session_report(*, session) -> dict:
    """Aggregates all per-answer evaluations + proctoring history into the
    final InterviewReport fields (overall/communication/technical/confidence/
    body_language/eye_contact/resume_matching scores, strengths, weaknesses,
    improvement tips)."""
    raise NotImplementedError("Report aggregation lands in Phase 5.")
