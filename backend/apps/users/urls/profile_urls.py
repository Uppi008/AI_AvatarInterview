from django.urls import path

from apps.users import views

urlpatterns = [
    path("me/", views.MeProfileView.as_view(), name="user-me"),
]
