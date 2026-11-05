from rest_framework.routers import DefaultRouter

from .views import AnswerPracticeViewSet, JobMatchViewSet, StudyPlanViewSet

router = DefaultRouter()
router.register("job-matches", JobMatchViewSet, basename="job-match")
router.register("answer-practices", AnswerPracticeViewSet, basename="answer-practice")
router.register("study-plans", StudyPlanViewSet, basename="study-plan")

urlpatterns = router.urls
