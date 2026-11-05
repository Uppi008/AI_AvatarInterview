import logging

from django.db import DatabaseError
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException
from rest_framework.response import Response

from common.permissions import IsStudent
from common.throttling import ScopedThrottleOnCreateMixin

from . import services
from .models import AnswerPractice, CodeReview, JobMatch, Quiz, StudyPlan
from .serializers import (
    AnswerPracticeCreateSerializer,
    AnswerPracticeSerializer,
    CodeReviewCreateSerializer,
    CodeReviewSerializer,
    JobMatchCreateSerializer,
    JobMatchSerializer,
    QuizCreateSerializer,
    QuizSerializer,
    QuizSubmitSerializer,
    StudyPlanCreateSerializer,
    StudyPlanSerializer,
)

logger = logging.getLogger(__name__)


class CoachUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "The AI coach is busy right now. Please try again in a minute."
    default_code = "coach_unavailable"


def _coach_error(exc: Exception) -> CoachUnavailable:
    """Names the real cause when it's one the user/admin can act on, instead
    of a generic "busy" for every failure."""
    name = type(exc).__name__
    if name in ("AuthenticationError", "PermissionDeniedError") or "GROQ_API_KEY" in str(exc):
        return CoachUnavailable(
            "The AI service key is missing or expired. The site admin needs to set a new GROQ_API_KEY on the server.",
            code="ai_key_invalid",
        )
    if name == "RateLimitError":
        return CoachUnavailable(
            "The free AI quota is used up for the moment. Please try again in a few minutes.",
            code="ai_rate_limited",
        )
    return CoachUnavailable()


class _CareerViewSet(
    ScopedThrottleOnCreateMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """Shared shape: list/retrieve/delete your own rows; create runs the AI.

    Subclasses set `model`, `create_serializer_class` and `run()`.
    """

    permission_classes = [IsStudent]
    throttle_scope = "career_ai"
    model = None
    create_serializer_class = None

    # Actions besides `create` that also call the LLM, so share its throttle.
    ai_actions = ()

    def get_queryset(self):
        return self.model.objects.filter(student__user=self.request.user)

    def get_throttles(self):
        if self.action in self.ai_actions:
            return [throttle() for throttle in self.throttle_classes]
        return super().get_throttles()

    def run(self, student, data):
        raise NotImplementedError

    def call_ai(self, fn, *args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except DatabaseError:
            # Not the AI's fault (e.g. unapplied migrations) -- let it surface
            # as a real 500 instead of a misleading "AI is busy".
            raise
        except Exception as exc:
            logger.exception("Career Lab %s failed", self.basename)
            raise _coach_error(exc) from exc

    def create(self, request, *args, **kwargs):
        serializer = self.create_serializer_class(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        data.setdefault("language", request.user.preferred_language or "en")
        obj = self.call_ai(self.run, request.user.student_profile, data)
        return Response(self.get_serializer(obj).data, status=status.HTTP_201_CREATED)


class JobMatchViewSet(_CareerViewSet):
    """Paste a job description; get a fit score, skill gaps, resume tips and
    the questions that employer is likely to ask."""

    model = JobMatch
    serializer_class = JobMatchSerializer
    create_serializer_class = JobMatchCreateSerializer

    ai_actions = ("cover_letter",)

    def run(self, student, data):
        return services.create_job_match(student=student, **data)

    @action(detail=True, methods=["post"], url_path="cover-letter")
    def cover_letter(self, request, pk=None):
        """Writes (or rewrites) a cover letter for this job from the resume."""
        match = self.call_ai(services.add_cover_letter, match=self.get_object())
        return Response(self.get_serializer(match).data)


class AnswerPracticeViewSet(_CareerViewSet):
    """Practice one answer: STAR breakdown, scores, delivery stats and a
    rewritten, stronger version."""

    model = AnswerPractice
    serializer_class = AnswerPracticeSerializer
    create_serializer_class = AnswerPracticeCreateSerializer

    def run(self, student, data):
        return services.create_answer_practice(student=student, **data)


class StudyPlanViewSet(mixins.UpdateModelMixin, _CareerViewSet):
    """A day-by-day plan built from the student's weakest areas. PATCH
    `completed_tasks` to tick tasks off."""

    model = StudyPlan
    serializer_class = StudyPlanSerializer
    create_serializer_class = StudyPlanCreateSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def run(self, student, data):
        return services.create_study_plan(student=student, **data)


class QuizViewSet(_CareerViewSet):
    """AI-written multiple-choice quiz on any topic. Answers stay hidden
    until POST `{id}/submit/` with one option index (or null) per question."""

    model = Quiz
    serializer_class = QuizSerializer
    create_serializer_class = QuizCreateSerializer

    def run(self, student, data):
        return services.create_quiz(student=student, **data)

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        quiz = self.get_object()
        serializer = QuizSubmitSerializer(data=request.data, context={"quiz": quiz})
        serializer.is_valid(raise_exception=True)
        quiz = services.submit_quiz(quiz=quiz, answers=serializer.validated_data["answers"])
        return Response(self.get_serializer(quiz).data)


class CodeReviewViewSet(_CareerViewSet):
    """Paste a problem and your solution; get correctness, complexity, bugs
    and a corrected version, reviewed like a coding round."""

    model = CodeReview
    serializer_class = CodeReviewSerializer
    create_serializer_class = CodeReviewCreateSerializer

    def run(self, student, data):
        return services.create_code_review(student=student, **data)
