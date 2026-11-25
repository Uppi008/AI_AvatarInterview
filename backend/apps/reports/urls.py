from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import InterviewReportViewSet, SharedReportView

router = DefaultRouter()
router.register("", InterviewReportViewSet, basename="report")

urlpatterns = [
    path("shared/<str:token>/", SharedReportView.as_view(), name="shared-report"),
] + router.urls
