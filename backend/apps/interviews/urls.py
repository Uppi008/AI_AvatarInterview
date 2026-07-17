from rest_framework.routers import DefaultRouter

from .views import InterviewSessionViewSet

router = DefaultRouter()
router.register("", InterviewSessionViewSet, basename="interview-session")

urlpatterns = router.urls
