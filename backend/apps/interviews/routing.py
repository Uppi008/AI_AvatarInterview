from django.urls import re_path

from .consumers import InterviewSessionConsumer

websocket_urlpatterns = [
    re_path(r"^ws/interview/(?P<session_id>[0-9a-f-]+)/$", InterviewSessionConsumer.as_asgi()),
]
