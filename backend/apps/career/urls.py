from rest_framework.routers import DefaultRouter

from .views import AnswerPracticeViewSet, CodeReviewViewSet, JobMatchViewSet, QuizViewSet, StudyPlanViewSet

router = DefaultRouter()
router.register("job-matches", JobMatchViewSet, basename="job-match")
router.register("answer-practices", AnswerPracticeViewSet, basename="answer-practice")
router.register("study-plans", StudyPlanViewSet, basename="study-plan")
router.register("quizzes", QuizViewSet, basename="quiz")
router.register("code-reviews", CodeReviewViewSet, basename="code-review")

urlpatterns = router.urls
