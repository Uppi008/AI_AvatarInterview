"""Practice streaks, badges and the daily question.

Nothing here is stored: streaks and badges are derived from what the student
has actually done (interviews, Career Lab activity), so they can never drift
out of sync with the real history.
"""
from datetime import date, timedelta

from django.db.models import Max
from django.utils import timezone

# One question per day, the same for everyone; answered through the Answer Coach.
DAILY_QUESTIONS = [
    "Tell me about yourself.",
    "Why do you want to work for our company?",
    "What is your greatest strength, and how has it helped you?",
    "What is a weakness you are actively working on?",
    "Describe a time you faced a conflict in a team. How did you handle it?",
    "Tell me about a project you are most proud of.",
    "Where do you see yourself in five years?",
    "Describe a time you failed. What did you learn?",
    "How do you handle pressure and tight deadlines?",
    "Why should we hire you over other candidates?",
    "Tell me about a time you showed leadership without having the title.",
    "How do you prioritize when you have several urgent tasks?",
    "Describe a difficult bug or problem you solved. How did you approach it?",
    "Tell me about a time you had to learn something new quickly.",
    "How do you handle feedback or criticism?",
    "Describe a time you went beyond what was expected of you.",
    "What motivates you to do your best work?",
    "Tell me about a time you disagreed with a senior or a teacher.",
    "How would your friends or teammates describe you?",
    "What do you know about the role you are applying for?",
    "Describe a situation where you had to work with someone difficult.",
    "Tell me about a decision you made with incomplete information.",
    "How do you stay up to date with new technologies or trends in your field?",
    "Describe a time you improved a process or made something more efficient.",
    "What would you do in your first 30 days in this job?",
    "Tell me about a goal you set and how you achieved it.",
    "Why are you interested in this field?",
    "Describe a time you had to explain something complex to a non-expert.",
    "How do you make sure your work is high quality?",
    "Tell me about a mistake you made in a project. How did you fix it?",
    "What are your salary expectations, and how did you arrive at them?",
    "Describe your ideal work environment.",
    "Tell me about a time you helped a teammate succeed.",
    "How do you handle a situation where you do not know the answer?",
    "What is one thing you would change about your last project, and why?",
    "Do you have any questions for us?",
]


def daily_question(for_date: date | None = None) -> str:
    day = for_date or timezone.localdate()
    return DAILY_QUESTIONS[day.toordinal() % len(DAILY_QUESTIONS)]


def activity_dates(student, days: int = 400) -> set:
    """Local calendar dates on which the student practiced anything."""
    from apps.career.models import AnswerPractice, CodeReview, GroupDiscussion, JobMatch, Quiz
    from apps.interviews.models import InterviewSession

    since = timezone.now() - timedelta(days=days)
    stamps = list(
        InterviewSession.objects.filter(student=student, started_at__gte=since).values_list("started_at", flat=True)
    )
    stamps += Quiz.objects.filter(student=student, submitted_at__gte=since).values_list("submitted_at", flat=True)
    for model in (AnswerPractice, CodeReview, JobMatch, GroupDiscussion):
        stamps += model.objects.filter(student=student, created_at__gte=since).values_list("created_at", flat=True)
    return {timezone.localdate(stamp) for stamp in stamps if stamp}


def compute_streak(dates: set, today: date | None = None) -> dict:
    today = today or timezone.localdate()
    # A streak stays alive until the end of the day after the last practice.
    anchor = today if today in dates else today - timedelta(days=1)
    current = 0
    while anchor - timedelta(days=current) in dates:
        current += 1

    longest = run = 0
    previous = None
    for day in sorted(dates):
        run = run + 1 if previous and (day - previous).days == 1 else 1
        longest = max(longest, run)
        previous = day

    last_7 = []
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        last_7.append({"date": day.isoformat(), "active": day in dates})
    return {
        "current": current,
        "longest": longest,
        "active_today": today in dates,
        "total_active_days": len(dates),
        "last_7_days": last_7,
    }


# id, title, description, metric, target
BADGES = [
    ("first_interview", "First Step", "Complete your first mock interview", "interviews", 1),
    ("interviews_5", "Getting Serious", "Complete 5 mock interviews", "interviews", 5),
    ("interviews_10", "Interview Pro", "Complete 10 mock interviews", "interviews", 10),
    ("score_70", "Solid Performer", "Score 70+ in an interview", "best_score", 70),
    ("score_90", "Top Talent", "Score 90+ in an interview", "best_score", 90),
    ("streak_3", "On a Roll", "Practice 3 days in a row", "longest_streak", 3),
    ("streak_7", "Unstoppable", "Practice 7 days in a row", "longest_streak", 7),
    ("coach_5", "Answer Crafter", "Practice 5 answers with the Answer Coach", "practices", 5),
    ("quiz_ace", "Quiz Ace", "Get 100% in a skill quiz", "best_quiz", 100),
    ("aptitude_80", "Sharp Mind", "Score 80+ in an aptitude test", "best_aptitude", 80),
    ("gd_debut", "Voice in the Room", "Finish a group discussion", "discussions", 1),
    ("resume_ready", "Ready to Apply", "Upload and analyse your resume", "resume", 1),
]


def compute_badges(student, streak: dict) -> list:
    from apps.career.models import AnswerPractice, GroupDiscussion, Quiz
    from apps.interviews.models import InterviewSession
    from apps.reports.models import InterviewReport
    from apps.resumes.models import Resume

    quizzes = Quiz.objects.filter(student=student, submitted_at__isnull=False)
    best_report = InterviewReport.objects.filter(session__student=student).aggregate(m=Max("overall_score"))["m"]
    best_quiz = quizzes.filter(category=Quiz.Category.GENERAL).aggregate(m=Max("score"))["m"]
    best_aptitude = quizzes.exclude(category=Quiz.Category.GENERAL).aggregate(m=Max("score"))["m"]
    metrics = {
        "interviews": InterviewSession.objects.filter(
            student=student, status=InterviewSession.Status.COMPLETED
        ).count(),
        "best_score": float(best_report or 0),
        "longest_streak": streak["longest"],
        "practices": AnswerPractice.objects.filter(student=student).count(),
        "best_quiz": float(best_quiz or 0),
        "best_aptitude": float(best_aptitude or 0),
        "discussions": GroupDiscussion.objects.filter(student=student, finished_at__isnull=False).count(),
        "resume": int(
            Resume.objects.filter(student=student, parsing_status=Resume.ParsingStatus.COMPLETED).exists()
        ),
    }
    return [
        {
            "id": badge_id,
            "title": title,
            "description": description,
            "progress": min(metrics[metric], target),
            "target": target,
            "earned": metrics[metric] >= target,
        }
        for badge_id, title, description, metric, target in BADGES
    ]
