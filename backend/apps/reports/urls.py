from rest_framework.routers import DefaultRouter

from .views import InterviewReportViewSet

router = DefaultRouter()
router.register("", InterviewReportViewSet, basename="report")

urlpatterns = router.urls
