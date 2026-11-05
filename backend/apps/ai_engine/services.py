"""Single integration boundary for LLM/LangChain calls.

Every other app talks to the LLM only through this module (never directly
to Groq/LangChain), so swapping providers touches one file (llm_client.py).
See docs/ARCHITECTURE.md section 6 for the chain design.

Design note on report aggregation: numeric sub-scores that come from
*text* (technical/communication/confidence/relevance) are produced by the
per-answer evaluation chain. body_language_score and eye_contact_score are
NOT asked of the LLM -- it has no way to actually observe those, and
guessing would just be a plausible-looking hallucination. They're derived
deterministically from apps.monitoring.ProctoringEvent counts instead; the
LLM is only used for what it can legitimately do: synthesizing strengths/
weaknesses/tips from the transcript.
"""
import logging
import random

from langchain_core.prompts import ChatPromptTemplate

from .llm_client import get_chat_model
from .schemas import (
    AnswerCoachResult,
    AnswerEvaluationResult,
    CodeReviewResult,
    CoverLetterResult,
    JobMatchResult,
    ModerationResult,
    QuestionBankResult,
    QuizResult,
    ReportSummaryResult,
    ResumeExtractionResult,
    StudyPlanResult,
)

logger = logging.getLogger(__name__)

LANGUAGE_NAMES = {"en": "English", "hi": "Hindi", "te": "Telugu"}

# ProctoringEvent types that penalize each derived score. Weights are a
# simple, tunable heuristic given only discrete violation counts are
# available today; Phase 7's richer per-frame vision metrics can replace
# this with a real per-frame gaze/pose score later.
EYE_CONTACT_EVENT_TYPES = ("looking_away", "head_rotation")
EYE_CONTACT_PENALTY_PER_EVENT = 5
BODY_LANGUAGE_EVENT_TYPES = ("no_face", "multiple_faces", "lip_movement_anomaly")
BODY_LANGUAGE_PENALTY_PER_EVENT = 8


def _language_name(code: str) -> str:
    return LANGUAGE_NAMES.get(code, "English")


def _effective_style(session) -> dict:
    """Resolves the interview_style/speaking_style/difficulty in effect for a
    session: its personality override if one was picked (apps.interviews.
    models.PERSONALITY_PROFILES), otherwise the chosen avatar's own defaults.
    Shared by question generation and answer evaluation so personality shapes
    both what's asked and how the interviewer responds, not just one of them.
    """
    from apps.interviews.models import PERSONALITY_PROFILES

    avatar = session.avatar
    profile = PERSONALITY_PROFILES.get(session.personality) or {}
    return {
        "interview_style": profile.get("interview_style") or avatar.interview_style or "professional and structured",
        "speaking_style": profile.get("speaking_style") or avatar.speaking_style or "clear and neutral",
        "difficulty": profile.get("difficulty") or avatar.difficulty,
    }


# =====================================================================
# Content moderation
# =====================================================================
def moderate_text(text: str) -> ModerationResult:
    """Screens a candidate's free-text/transcribed answer for disallowed
    content (sexual/adult, hateful, violent, abusive) before it's scored.
    Called from the WS consumer on every answer; flagged text is logged as a
    ProctoringEvent (apps.monitoring) and goes through the same warn ->
    auto-terminate escalation as camera/browser violations, rather than a
    separate safety pipeline.
    """
    model = get_chat_model("moderation", temperature=0).with_structured_output(ModerationResult)
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a content-safety filter for a job-interview platform. Given the "
                "candidate's message below, decide if it contains or requests sexual/adult, "
                "hateful, violent, or abusive content. Ordinary interview answers -- even "
                "blunt, negative, incorrect, or off-topic ones -- are safe. Only flag genuine "
                "policy violations.",
            ),
            ("human", "{text}"),
        ]
    )
    return (prompt | model).invoke({"text": text[:4000]})


# =====================================================================
# Resume extraction
# =====================================================================
def extract_resume_entities(resume) -> None:
    """Runs the resume-extraction chain and persists ResumeSkill,
    ResumeProject, ResumeExperience, ResumeEducation, ResumeCertification,
    and ResumeInsight from the resume's `raw_text`.
    """
    from apps.resumes.models import (
        ResumeCertification,
        ResumeEducation,
        ResumeExperience,
        ResumeInsight,
        ResumeProject,
        ResumeSkill,
    )

    if not resume.raw_text.strip():
        raise ValueError("Resume has no extracted text to analyze yet.")

    model = get_chat_model("resume_extraction").with_structured_output(ResumeExtractionResult)
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are an expert technical recruiter. Extract structured information from "
                "the resume text below. Be factual -- only include what is actually stated or "
                "strongly implied; never invent employers, dates, or skills.",
            ),
            ("human", "Resume text:\n\n{resume_text}"),
        ]
    )
    result: ResumeExtractionResult = (prompt | model).invoke({"resume_text": resume.raw_text[:12000]})

    ResumeSkill.objects.filter(resume=resume).delete()
    ResumeSkill.objects.bulk_create(
        [ResumeSkill(resume=resume, name=s.name, category=s.category) for s in result.skills]
    )

    ResumeProject.objects.filter(resume=resume).delete()
    ResumeProject.objects.bulk_create(
        [
            ResumeProject(
                resume=resume,
                title=p.title,
                description=p.description,
                technologies=p.technologies,
                duration=p.duration,
            )
            for p in result.projects
        ]
    )

    ResumeExperience.objects.filter(resume=resume).delete()
    ResumeExperience.objects.bulk_create(
        [
            ResumeExperience(
                resume=resume, company=e.company, role=e.role, description=e.description, is_current=e.is_current
            )
            for e in result.experiences
        ]
    )

    ResumeEducation.objects.filter(resume=resume).delete()
    ResumeEducation.objects.bulk_create(
        [
            ResumeEducation(
                resume=resume, institution=ed.institution, degree=ed.degree, field_of_study=ed.field_of_study
            )
            for ed in result.education
        ]
    )

    ResumeCertification.objects.filter(resume=resume).delete()
    ResumeCertification.objects.bulk_create(
        [ResumeCertification(resume=resume, name=c.name, issuer=c.issuer) for c in result.certifications]
    )

    ResumeInsight.objects.update_or_create(
        resume=resume,
        defaults={
            "summary": result.summary,
            "strengths": result.strengths,
            "weaknesses": result.weaknesses,
            "suggested_focus_areas": result.suggested_focus_areas,
        },
    )


# =====================================================================
# Question generation
# =====================================================================
def generate_question_bank(*, session) -> list:
    """Generates the initial ordered set of InterviewQuestion rows for a
    session, based on the student's resume, language, and the interview
    style/speaking-style/difficulty in effect -- the avatar's own defaults,
    unless the session picked a personality override (apps.interviews.
    models.PERSONALITY_PROFILES), which lets a student pair any avatar's
    look/voice with a different interview style.
    """
    from apps.interviews.models import InterviewQuestion

    avatar = session.avatar
    resume = session.resume
    style = _effective_style(session)

    resume_context = "No resume was provided; ask general and behavioral questions."
    if resume:
        skills = ", ".join(s.name for s in resume.skills.all()[:15])
        projects = "; ".join(p.title for p in resume.projects.all()[:5])
        experiences = "; ".join(f"{e.role} at {e.company}" for e in resume.experiences.all()[:5])
        insight_summary = getattr(getattr(resume, "insight", None), "summary", "") or resume.raw_text[:1500]
        resume_context = (
            f"Skills: {skills or 'none listed'}\n"
            f"Projects: {projects or 'none listed'}\n"
            f"Experience: {experiences or 'none listed'}\n"
            f"Resume summary: {insight_summary}"
        )

    model = get_chat_model("question_generation").with_structured_output(QuestionBankResult)
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are {avatar_name}, a {category} conducting a mock job interview. "
                "Your interview style: {interview_style}. Speaking style: {speaking_style}. "
                "Target difficulty: {difficulty}. Respond entirely in {language}.\n\n"
                "First, judge the candidate's experience level from the resume context below. "
                "If it shows no professional roles (only education, personal, or academic "
                "projects), treat them as a FRESHER: focus on fundamentals, their academic/"
                "personal projects, problem-solving approach, and learning potential rather than "
                "assuming production experience. If it shows one or more professional roles, "
                "treat them as EXPERIENCED at a level matching their apparent seniority: ask "
                "real-world, scenario-based questions grounded in the specific technologies "
                "actually listed in their skills/experience (e.g. system-design trade-offs, "
                "debugging a plausible bug in their stated stack, decisions they made on a named "
                "project) rather than generic textbook questions. Only ask about technologies "
                "that actually appear in the resume context below -- never invent an unrelated "
                "stack.\n\n"
                "Generate a well-structured interview question bank: 2-3 resume-based questions "
                "tailored to the candidate's actual background, 2-3 behavioral questions, and "
                "(only if this persona is technical) 1-2 coding/problem-solving questions "
                "calibrated to their experience level. 6 to 8 questions total, ordered from "
                "easier to harder.",
            ),
            ("human", "Candidate resume context:\n{resume_context}"),
        ]
    )
    result: QuestionBankResult = (prompt | model).invoke(
        {
            "avatar_name": avatar.name,
            "category": avatar.get_category_display(),
            "interview_style": style["interview_style"],
            "speaking_style": style["speaking_style"],
            "difficulty": style["difficulty"],
            "language": _language_name(session.language),
            "resume_context": resume_context,
        }
    )

    questions = [
        InterviewQuestion(
            session=session,
            question_text=q.question_text,
            question_type=q.question_type,
            difficulty=q.difficulty,
            order_index=i,
        )
        for i, q in enumerate(result.questions)
    ]
    return InterviewQuestion.objects.bulk_create(questions)


# =====================================================================
# Answer evaluation
# =====================================================================
def evaluate_answer(*, question, answer) -> dict:
    """Scores a single answer and, for a top-level (non-follow-up) question
    whose answer was vague or incomplete, creates one follow-up question.
    """
    from apps.interviews.models import AnswerEvaluation, InterviewQuestion

    session = question.session
    style = _effective_style(session)
    model = get_chat_model("answer_evaluation").with_structured_output(AnswerEvaluationResult)
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are {avatar_name}, a {category} evaluating a candidate's interview answer out "
                "loud, in conversation -- not writing a written report. Your interview style: "
                "{interview_style}. Speaking style: {speaking_style}. Let that style shape your tone "
                "-- a Strict HR persona is more exacting, a Mentor persona is warmer and more "
                "encouraging -- but score fairly on a 0-100 scale for each dimension regardless of "
                "tone: technical accuracy, communication, relevance to the question, confidence, "
                "voice clarity (fluency/pacing as shown in the transcript, not audio quality), "
                "grammar, and quality of problem-solving approach. Write feedback as you'd actually "
                "say it to their face: open with a short, natural reaction (e.g. 'Good, that's "
                "clear.' / 'Nice, I like that example.' / 'Hmm, a bit thin, but okay.') that matches "
                "how well they actually did, then at most one brief constructive sentence. 1-2 "
                "sentences total, in {language}. Only propose a follow-up question if the answer was "
                "vague, incomplete, or invites a natural deeper probe -- otherwise leave it null.",
            ),
            ("human", "Question ({question_type}): {question_text}\n\nCandidate's answer:\n{answer_text}"),
        ]
    )
    result: AnswerEvaluationResult = (prompt | model).invoke(
        {
            "avatar_name": session.avatar.name,
            "category": session.avatar.get_category_display(),
            "interview_style": style["interview_style"],
            "speaking_style": style["speaking_style"],
            "language": _language_name(session.language),
            "question_type": question.question_type,
            "question_text": question.question_text,
            "answer_text": answer.transcript_text or "(no answer given)",
        }
    )

    evaluation, _ = AnswerEvaluation.objects.update_or_create(
        answer=answer,
        defaults={
            "technical_score": result.technical_score,
            "communication_score": result.communication_score,
            "relevance_score": result.relevance_score,
            "confidence_score": result.confidence_score,
            "voice_clarity_score": result.voice_clarity_score,
            "grammar_score": result.grammar_score,
            "problem_solving_score": result.problem_solving_score,
            "feedback_text": result.feedback,
        },
    )

    follow_up_question = None
    if result.follow_up_question and question.parent_question_id is None:
        next_order = InterviewQuestion.objects.filter(session=session).count()
        follow_up_question = InterviewQuestion.objects.create(
            session=session,
            parent_question=question,
            question_text=result.follow_up_question,
            question_type=InterviewQuestion.QuestionType.FOLLOW_UP,
            difficulty=question.difficulty,
            order_index=next_order,
        )

    return {"evaluation": evaluation, "follow_up_question": follow_up_question}


# =====================================================================
# Report aggregation
# =====================================================================
def aggregate_session_report(*, session) -> dict:
    """Aggregates all per-answer evaluations + proctoring history into the
    final InterviewReport fields.
    """
    from django.db.models import Avg

    from apps.interviews.models import AnswerEvaluation, InterviewQuestion

    evaluations = AnswerEvaluation.objects.filter(answer__question__session=session)
    if not evaluations.exists():
        raise ValueError("No evaluated answers to aggregate for this session.")

    aggregates = evaluations.aggregate(
        technical=Avg("technical_score"),
        communication=Avg("communication_score"),
        confidence=Avg("confidence_score"),
        relevance=Avg("relevance_score"),
        voice_clarity=Avg("voice_clarity_score"),
        grammar=Avg("grammar_score"),
        problem_solving=Avg("problem_solving_score"),
    )
    technical = round(float(aggregates["technical"] or 0), 2)
    communication = round(float(aggregates["communication"] or 0), 2)
    confidence = round(float(aggregates["confidence"] or 0), 2)
    relevance = round(float(aggregates["relevance"] or 0), 2)
    voice_clarity = round(float(aggregates["voice_clarity"] or 0), 2)
    grammar = round(float(aggregates["grammar"] or 0), 2)
    problem_solving = round(float(aggregates["problem_solving"] or 0), 2)

    resume_based = evaluations.filter(answer__question__question_type=InterviewQuestion.QuestionType.RESUME_BASED)
    resume_based_avg = resume_based.aggregate(avg=Avg("relevance_score"))["avg"]
    resume_matching = round(float(resume_based_avg if resume_based_avg is not None else relevance), 2)

    body_language, eye_contact = _proctoring_derived_scores(session)

    overall = round(
        (
            technical
            + communication
            + confidence
            + body_language
            + eye_contact
            + resume_matching
            + voice_clarity
            + grammar
            + problem_solving
        )
        / 9,
        2,
    )

    scores = {
        "overall": overall,
        "technical": technical,
        "communication": communication,
        "confidence": confidence,
        "body_language": body_language,
        "eye_contact": eye_contact,
        "resume_matching": resume_matching,
        "voice_clarity": voice_clarity,
        "grammar": grammar,
        "problem_solving": problem_solving,
    }
    summary = _summarize_session(session, evaluations, scores)

    return {
        "overall_score": overall,
        "communication_score": communication,
        "technical_score": technical,
        "confidence_score": confidence,
        "body_language_score": body_language,
        "eye_contact_score": eye_contact,
        "resume_matching_score": resume_matching,
        "voice_clarity_score": voice_clarity,
        "grammar_score": grammar,
        "problem_solving_score": problem_solving,
        "strengths": summary.strengths,
        "weaknesses": summary.weaknesses,
        "improvement_tips": summary.improvement_tips,
        "spoken_summary": summary.spoken_summary,
        "learning_roadmap": summary.learning_roadmap,
        "career_suggestions": summary.career_suggestions,
        "hiring_recommendation": summary.hiring_recommendation,
        "hiring_recommendation_reason": summary.hiring_recommendation_reason,
        "recommended_courses": summary.recommended_courses,
        "recommended_certifications": summary.recommended_certifications,
        "recommended_projects": summary.recommended_projects,
    }


def _proctoring_derived_scores(session) -> tuple[float, float]:
    from apps.monitoring.models import ProctoringEvent

    events = ProctoringEvent.objects.filter(session=session)
    eye_contact_penalty = events.filter(event_type__in=EYE_CONTACT_EVENT_TYPES).count() * EYE_CONTACT_PENALTY_PER_EVENT
    body_language_penalty = (
        events.filter(event_type__in=BODY_LANGUAGE_EVENT_TYPES).count() * BODY_LANGUAGE_PENALTY_PER_EVENT
    )
    body_language_score = max(0.0, 100.0 - body_language_penalty)
    eye_contact_score = max(0.0, 100.0 - eye_contact_penalty)
    return body_language_score, eye_contact_score


def _summarize_session(session, evaluations, scores: dict) -> ReportSummaryResult:
    transcript_lines = []
    for evaluation in evaluations.select_related("answer__question"):
        q = evaluation.answer.question
        transcript_lines.append(
            f"Q: {q.question_text}\nA: {evaluation.answer.transcript_text}\nFeedback: {evaluation.feedback_text}"
        )
    transcript = "\n\n".join(transcript_lines)[:12000]

    score_summary = (
        f"Overall: {scores['overall']}/100 | Technical: {scores['technical']}/100 | "
        f"Communication: {scores['communication']}/100 | Confidence: {scores['confidence']}/100 | "
        f"Body language: {scores['body_language']}/100 | Eye contact: {scores['eye_contact']}/100 | "
        f"Resume match: {scores['resume_matching']}/100 | Voice clarity: {scores['voice_clarity']}/100 | "
        f"Grammar: {scores['grammar']}/100 | Problem solving: {scores['problem_solving']}/100"
    )

    # Reuses the "answer_evaluation" purpose/config -- this is the same kind
    # of task (LLM judging interview performance from text), just summarized
    # across the whole session rather than one answer at a time.
    model = get_chat_model("answer_evaluation").with_structured_output(ReportSummaryResult)
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are {avatar_name}, a {category}, wrapping up the mock interview you just "
                "conducted. Based on the Q&A transcript, per-answer feedback, and the measured "
                "scores below, identify concrete strengths, weaknesses, and 3-5 actionable "
                "improvement tips -- then write spoken_summary as the actual closing remarks you'd "
                "say out loud to the candidate: thank them, speak specifically to what the scores "
                "show (e.g. only praise eye contact/body language if those scores are actually "
                "high, only flag them if low), and close encouragingly. Also propose: a short "
                "learning_roadmap (3-6 concrete next steps); 2-4 realistic career_suggestions; "
                "2-4 recommended_courses (specific course names or topics); 1-3 "
                "recommended_certifications; 2-3 recommended_projects that would strengthen their "
                "profile; and a hiring_recommendation (strong_hire/hire/no_hire/strong_no_hire) with "
                "a one-sentence hiring_recommendation_reason grounded in the actual scores -- be an "
                "honest, calibrated judge, not uniformly positive. Never invent numbers not given "
                "below. Respond entirely in {language} (except the hiring_recommendation value "
                "itself, which must stay one of the four literal English options).",
            ),
            ("human", "Measured scores:\n{score_summary}\n\nTranscript:\n{transcript}"),
        ]
    )
    return (prompt | model).invoke(
        {
            "avatar_name": session.avatar.name,
            "category": session.avatar.get_category_display(),
            "score_summary": score_summary,
            "transcript": transcript,
            "language": _language_name(session.language),
        }
    )


# =====================================================================
# Career Lab (apps.career): job match, answer coach, study plan
# =====================================================================
# Long structured outputs occasionally come back as malformed tool-call JSON,
# which Groq rejects with 400 "tool_use_failed". A fresh sample almost always
# parses, so retry those (and only those) a couple of times.
STRUCTURED_OUTPUT_ATTEMPTS = 3


def _invoke_structured(chain, inputs: dict):
    for attempt in range(1, STRUCTURED_OUTPUT_ATTEMPTS + 1):
        try:
            return chain.invoke(inputs)
        except Exception as exc:
            if "tool_use_failed" not in str(exc) or attempt == STRUCTURED_OUTPUT_ATTEMPTS:
                raise
            logger.warning("Malformed structured output (attempt %s), retrying", attempt)


def match_resume_to_job(*, resume_text: str, job_title: str, job_description: str, language: str = "en") -> JobMatchResult:
    """Scores a resume against a pasted job description and lists the gaps,
    tailoring tips and the questions that employer is likely to ask."""
    model = get_chat_model("career_coach", temperature=0.2).with_structured_output(JobMatchResult)
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a senior technical recruiter screening a candidate for the job below. "
                "Compare the resume to the job's actual requirements and be a calibrated, honest "
                "judge: a resume missing core requirements should score below 50. Only list a skill "
                "as matched if the resume shows it; never invent experience. Resume tips must be "
                "truthful edits (re-wording, re-ordering, surfacing real work), not fabrication. "
                "Respond entirely in {language}.",
            ),
            (
                "human",
                "Job title: {job_title}\n\nJob description:\n{job_description}\n\nResume:\n{resume_text}",
            ),
        ]
    )
    return _invoke_structured(
        prompt | model,
        {
            "job_title": job_title or "(not given)",
            "job_description": job_description[:8000],
            "resume_text": resume_text[:10000] or "(no resume uploaded -- judge from the job alone)",
            "language": _language_name(language),
        }
    )


def coach_answer(*, question: str, answer: str, target_role: str = "", language: str = "en") -> AnswerCoachResult:
    """Grades a practice answer, breaks it down by STAR, and rewrites it
    stronger while keeping the candidate's own facts."""
    model = get_chat_model("career_coach", temperature=0.3).with_structured_output(AnswerCoachResult)
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are an expert interview coach. Grade the candidate's answer to the interview "
                "question honestly (a vague, one-line answer scores low). Check it against the STAR "
                "structure (Situation, Task, Action, Result) -- for technical questions, treat "
                "Situation/Task as the problem framing and Result as the outcome or trade-offs. "
                "Then write improved_answer: the same story, told better, keeping only facts the "
                "candidate gave and using [placeholders] for missing details. Respond entirely in "
                "{language}.",
            ),
            ("human", "Target role: {target_role}\n\nQuestion: {question}\n\nCandidate's answer:\n{answer}"),
        ]
    )
    return _invoke_structured(
        prompt | model,
        {
            "question": question[:1000],
            "answer": answer[:6000],
            "target_role": target_role or "(not given)",
            "language": _language_name(language),
        }
    )


def build_study_plan(
    *, weaknesses: list[str], strengths: list[str], target_role: str, days: int, language: str = "en"
) -> StudyPlanResult:
    """A day-by-day prep plan that targets the weaknesses the candidate's own
    interviews and resume actually showed."""
    model = get_chat_model("career_coach", temperature=0.4).with_structured_output(StudyPlanResult)
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are an interview-prep mentor. Build exactly {days} days of study, one list entry "
                "per day in order, from fundamentals to mock practice. Target the listed "
                "weaknesses first; give 2-3 short tasks per day, each one sentence and under an hour; recommend only free "
                "resources that really exist (official docs, freeCodeCamp, MDN, LeetCode free "
                "problems, CS50, etc.). Respond entirely in {language}.",
            ),
            (
                "human",
                "Target role: {target_role}\n\nWeaknesses seen in their interviews/resume:\n{weaknesses}"
                "\n\nStrengths:\n{strengths}",
            ),
        ]
    )
    result: StudyPlanResult = _invoke_structured(
        prompt | model,
        {
            "days": days,
            "target_role": target_role or "Software engineer",
            "weaknesses": "\n".join(f"- {w}" for w in weaknesses[:15]) or "- (none recorded yet -- general prep)",
            "strengths": "\n".join(f"- {s}" for s in strengths[:10]) or "- (none recorded yet)",
            "language": _language_name(language),
        }
    )
    result.days = result.days[:days]
    return result


def generate_quiz(*, topic: str, difficulty: str, count: int, language: str = "en") -> QuizResult:
    """Multiple-choice questions for self-testing on an interview topic."""
    model = get_chat_model("career_coach", temperature=0.6).with_structured_output(QuizResult)
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a technical interviewer writing a {difficulty} multiple-choice quiz. Write "
                "exactly {count} questions on the topic below, the kind asked in real job interviews. "
                "Each has exactly 4 plausible options with one unambiguously correct answer; vary "
                "which position is correct. Keep questions and options short; put any code inline. "
                "Respond entirely in {language}.",
            ),
            ("human", "Topic: {topic}"),
        ]
    )
    result: QuizResult = _invoke_structured(
        prompt | model,
        {"topic": topic[:200], "difficulty": difficulty, "count": count, "language": _language_name(language)},
    )
    # Drop anything malformed rather than show a broken question.
    result.questions = [
        q for q in result.questions if len(q.options) == 4 and 0 <= q.correct_index <= 3
    ][:count]
    if not result.questions:
        raise RuntimeError("The model returned no usable quiz questions.")
    # The model puts the right answer first most of the time, which makes the
    # quiz guessable; shuffle each question's options and follow the answer.
    for q in result.questions:
        correct = q.options[q.correct_index]
        random.shuffle(q.options)
        q.correct_index = q.options.index(correct)
    return result


def review_code(*, problem: str, code: str, language: str, explain_in: str = "en") -> CodeReviewResult:
    """Reviews a coding-round answer like an interviewer: correctness first,
    then complexity, readability and a corrected version."""
    model = get_chat_model("career_coach", temperature=0.2).with_structured_output(CodeReviewResult)
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a senior engineer reviewing a candidate's solution in a coding interview. "
                "Mentally run the code on normal and edge-case inputs before judging. Score "
                "correctness strictly (code that doesn't solve the problem scores below 40). First "
                "trace their code in `analysis`, then give time/space complexity of THEIR code exactly "
                "as written (nested loops over the input are O(n^2) even if a faster approach "
                "exists) -- never the complexity of your improved version. improved_code must be "
                "complete, correct {language} code. Write all prose in {explain_in}.",
            ),
            ("human", "Problem:\n{problem}\n\nCandidate's {language} code:\n```\n{code}\n```"),
        ]
    )
    return _invoke_structured(
        prompt | model,
        {
            "problem": problem[:3000],
            "code": code[:8000],
            "language": language,
            "explain_in": _language_name(explain_in),
        },
    )


def write_cover_letter(
    *, resume_text: str, job_title: str, company: str, job_description: str, candidate_name: str, language: str = "en"
) -> CoverLetterResult:
    model = get_chat_model("career_coach", temperature=0.5).with_structured_output(CoverLetterResult)
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "Write a concise, specific cover letter for this candidate and job. Use only "
                "achievements and skills that appear in the resume -- never invent employers, "
                "numbers or experience. Connect 2-3 real resume points to the job's top "
                "requirements, sound human (no cliches like 'I am writing to express my "
                "interest'), and sign off with the candidate's name. Respond entirely in {language}.",
            ),
            (
                "human",
                "Candidate: {name}\nJob: {job_title} at {company}\n\nJob description:\n{job_description}"
                "\n\nResume:\n{resume_text}",
            ),
        ]
    )
    return _invoke_structured(
        prompt | model,
        {
            "name": candidate_name or "the candidate",
            "job_title": job_title or "the role",
            "company": company or "your company",
            "job_description": job_description[:6000],
            "resume_text": resume_text[:8000] or "(no resume available -- keep it general and honest)",
            "language": _language_name(language),
        },
    )
