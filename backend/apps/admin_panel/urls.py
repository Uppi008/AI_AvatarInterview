from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import AIModelConfigViewSet, LanguageConfigViewSet, PlatformAnalyticsView, PlatformSettingViewSet

router = DefaultRouter()
router.register("languages", LanguageConfigViewSet, basename="admin-language")
router.register("ai-models", AIModelConfigViewSet, basename="admin-ai-model")
router.register("settings", PlatformSettingViewSet, basename="admin-setting")

urlpatterns = [
    path("analytics/", PlatformAnalyticsView.as_view(), name="admin-analytics"),
] + router.urls
