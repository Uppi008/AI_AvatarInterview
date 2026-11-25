from django.urls import path

from .views import DailyQuestionView, ProgressView

urlpatterns = [
    path("progress/", ProgressView.as_view(), name="engagement-progress"),
    path("daily-question/", DailyQuestionView.as_view(), name="engagement-daily-question"),
]
