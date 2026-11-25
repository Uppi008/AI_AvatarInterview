"""Career Lab business logic. All LLM calls go through apps.ai_engine."""
from django.utils import timezone

from apps.ai_engine import services as ai
from apps.reports.models import InterviewReport
from apps.resumes.models import Resume

from .delivery import analyze_delivery
from .models import AnswerPractice, CodeReview, GroupDiscussion, JobMatch, Quiz, StudyPlan

# How many recent interview reports feed a study plan.
REPORTS_FOR_PLAN = 5


def _active_resume(student):
    return (
        Resume.objects.filter(student=student, parsing_status=Resume.ParsingStatus.COMPLETED)
        .order_by("-is_active", "-created_at")
        .first()
    )


def create_job_match(*, student, job_description: str, job_title: str = "", company: str = "",
                     resume=None, language: str = "en") -> JobMatch:
    resume = resume or _active_resume(student)
    result = ai.match_resume_to_job(
        resume_text=resume.raw_text if resume else "",
        job_title=job_title,
        job_description=job_description,
        language=language,
    )
    return JobMatch.objects.create(
        student=student,
        resume=resume,
        job_title=job_title,
        company=company,
        job_description=job_description,
        language=language,
        match_score=round(result.match_score, 2),
        verdict=result.verdict,
        matched_skills=result.matched_skills,
        missing_skills=result.missing_skills,
        strengths=result.strengths,
        resume_tips=result.resume_tips,
        likely_questions=[q.dict() for q in result.likely_questions],
    )


def create_answer_practice(*, student, question: str, answer: str, target_role: str = "",
                           language: str = "en") -> AnswerPractice:
    result = ai.coach_answer(question=question, answer=answer, target_role=target_role, language=language)
    return AnswerPractice.objects.create(
        student=student,
        question=question,
        answer=answer,
        target_role=target_role,
        language=language,
        overall_score=round(result.overall_score, 2),
        clarity_score=round(result.clarity_score, 2),
        relevance_score=round(result.relevance_score, 2),
        impact_score=round(result.impact_score, 2),
        star=result.star.dict(),
        strengths=result.strengths,
        improvements=result.improvements,
        improved_answer=result.improved_answer,
        delivery=analyze_delivery(answer),
    )


def _dedupe(items):
    seen, out = set(), []
    for item in items:
        key = item.strip().lower()
        if key and key not in seen:
            seen.add(key)
            out.append(item.strip())
    return out


def create_study_plan(*, student, target_role: str = "", days: int = 7, language: str = "en") -> StudyPlan:
    """Builds the plan from the candidate's real weak spots: their latest
    interview reports first, then their resume's AI insight."""
    reports = list(
        InterviewReport.objects.filter(session__student=student).order_by("-generated_at")[:REPORTS_FOR_PLAN]
    )
    weaknesses = [w for r in reports for w in (r.weaknesses or [])]
    strengths = [s for r in reports for s in (r.strengths or [])]

    resume = _active_resume(student)
    insight = getattr(resume, "insight", None) if resume else None
    if insight:
        weaknesses += list(insight.weaknesses or []) + list(insight.suggested_focus_areas or [])
        strengths += list(insight.strengths or [])

    result = ai.build_study_plan(
        weaknesses=_dedupe(weaknesses),
        strengths=_dedupe(strengths),
        target_role=target_role,
        days=days,
        language=language,
    )
    return StudyPlan.objects.create(
        student=student,
        target_role=target_role,
        language=language,
        summary=result.summary,
        focus_areas=result.focus_areas,
        days=[{"day": i, **d.dict()} for i, d in enumerate(result.days, start=1)],
        sources={"reports": len(reports), "resume": bool(insight)},
    )


def add_cover_letter(*, match: JobMatch) -> JobMatch:
    student = match.student
    resume = match.resume or _active_resume(student)
    result = ai.write_cover_letter(
        resume_text=resume.raw_text if resume else "",
        job_title=match.job_title,
        company=match.company,
        job_description=match.job_description,
        candidate_name=student.user.full_name,
        language=match.language,
    )
    match.cover_letter_subject = result.subject[:255]
    match.cover_letter = result.letter
    match.save(update_fields=["cover_letter_subject", "cover_letter", "updated_at"])
    return match


# Seconds allowed per question in a timed aptitude section.
APTITUDE_SECONDS_PER_QUESTION = 60


def create_quiz(
    *, student, topic: str = "", difficulty: str = "medium", count: int = 10, language: str = "en",
    category: str = Quiz.Category.GENERAL,
) -> Quiz:
    result = ai.generate_quiz(topic=topic, difficulty=difficulty, count=count, language=language, category=category)
    is_aptitude = category != Quiz.Category.GENERAL
    return Quiz.objects.create(
        student=student,
        topic=topic or Quiz.Category(category).label,
        difficulty=difficulty,
        language=language,
        category=category,
        time_limit_seconds=len(result.questions) * APTITUDE_SECONDS_PER_QUESTION if is_aptitude else 0,
        questions=[q.dict() for q in result.questions],
    )


def submit_quiz(*, quiz: Quiz, answers: list, time_taken_seconds: int | None = None) -> Quiz:
    """Scores server-side: the correct answers never reach the browser
    before submission (see QuizSerializer)."""
    correct = sum(1 for q, a in zip(quiz.questions, answers) if a == q["correct_index"])
    quiz.answers = answers
    quiz.score = round(correct / len(quiz.questions) * 100, 2) if quiz.questions else 0
    quiz.submitted_at = timezone.now()
    quiz.time_taken_seconds = time_taken_seconds
    quiz.save(update_fields=["answers", "score", "submitted_at", "time_taken_seconds", "updated_at"])
    return quiz


def create_code_review(*, student, problem: str, code: str, code_language: str, language: str = "en") -> CodeReview:
    result = ai.review_code(problem=problem, code=code, language=code_language, explain_in=language)
    return CodeReview.objects.create(
        student=student,
        problem=problem,
        code=code,
        code_language=code_language,
        language=language,
        analysis=result.analysis,
        correctness_score=round(result.correctness_score, 2),
        readability_score=round(result.readability_score, 2),
        efficiency_score=round(result.efficiency_score, 2),
        time_complexity=result.time_complexity[:60],
        space_complexity=result.space_complexity[:60],
        verdict=result.verdict,
        bugs=result.bugs,
        improvements=result.improvements,
        improved_code=result.improved_code,
        follow_up_question=result.follow_up_question,
    )


# --------------------------------------------------------------------------
# Group discussion
# --------------------------------------------------------------------------
# Enough for a real discussion; keeps a single GD from burning the AI quota.
GD_MAX_USER_TURNS = 10
GD_MIN_USER_TURNS_TO_SCORE = 1


def _candidate_name(student) -> str:
    full_name = student.user.full_name or ""
    return full_name.split(" ")[0] if full_name else "You"


def create_group_discussion(*, student, topic: str = "", language: str = "en") -> GroupDiscussion:
    result = ai.start_group_discussion(topic=topic, language=language)
    participants = [p.dict() for p in result.participants[:3]]
    names = {p["name"] for p in participants}
    opening = [
        {"speaker": line.speaker, "text": line.text, "is_user": False}
        for line in result.opening
        if line.speaker in names
    ]
    return GroupDiscussion.objects.create(
        student=student,
        topic=result.topic[:300] or topic[:300],
        language=language,
        participants=participants,
        transcript=opening,
    )


def add_group_discussion_turn(*, discussion: GroupDiscussion, message: str) -> GroupDiscussion:
    if discussion.finished_at:
        raise ValueError("This discussion has already finished.")
    if discussion.user_turns >= GD_MAX_USER_TURNS:
        raise ValueError("You've reached the turn limit. Finish the discussion to get your feedback.")
    speaker = _candidate_name(discussion.student)
    transcript = discussion.transcript + [{"speaker": speaker, "text": message.strip(), "is_user": True}]
    reply = ai.continue_group_discussion(
        topic=discussion.topic,
        participants=discussion.participants,
        transcript=transcript,
        language=discussion.language,
    )
    allowed = {p["name"] for p in discussion.participants}
    transcript += [
        {"speaker": line.speaker, "text": line.text, "is_user": False}
        for line in reply.lines
        if line.speaker in allowed
    ]
    discussion.transcript = transcript
    discussion.save(update_fields=["transcript", "updated_at"])
    return discussion


def finish_group_discussion(*, discussion: GroupDiscussion) -> GroupDiscussion:
    if discussion.finished_at:
        return discussion
    if discussion.user_turns < GD_MIN_USER_TURNS_TO_SCORE:
        raise ValueError("Say at least one thing in the discussion before finishing it.")
    result = ai.evaluate_group_discussion(
        topic=discussion.topic,
        transcript=discussion.transcript,
        candidate=_candidate_name(discussion.student),
        language=discussion.language,
    )
    scores = [result.content_score, result.communication_score, result.leadership_score, result.listening_score]
    discussion.content_score = round(result.content_score, 2)
    discussion.communication_score = round(result.communication_score, 2)
    discussion.leadership_score = round(result.leadership_score, 2)
    discussion.listening_score = round(result.listening_score, 2)
    discussion.overall_score = round(sum(scores) / len(scores), 2)
    discussion.summary = result.summary
    discussion.strengths = result.strengths
    discussion.improvements = result.improvements
    discussion.finished_at = timezone.now()
    discussion.save()
    return discussion
