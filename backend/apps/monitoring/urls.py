from rest_framework.routers import DefaultRouter

from .views import ProctoringEventViewSet

router = DefaultRouter()
router.register("events", ProctoringEventViewSet, basename="proctoring-event")

urlpatterns = router.urls
