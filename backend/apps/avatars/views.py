from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, permissions, viewsets

from common.permissions import IsStudent
from common.throttling import ScopedThrottleOnCreateMixin

from . import services
from .models import Avatar, CustomAvatar
from .serializers import AvatarSerializer, CustomAvatarSerializer


class AvatarViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Read-only catalog of built-in interviewer avatars.

    Admin CRUD over the catalog lives under /api/v1/admin/avatars/
    (apps.admin_panel) — students only ever browse/select here.
    """

    queryset = Avatar.objects.filter(is_active=True)
    serializer_class = AvatarSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["category", "difficulty"]


class CustomAvatarViewSet(
    ScopedThrottleOnCreateMixin,
    mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """Student-generated avatars built from an uploaded photo (Module 4)."""

    serializer_class = CustomAvatarSerializer
    permission_classes = [IsStudent]
    throttle_scope = "resume_upload"

    def get_queryset(self):
        return CustomAvatar.objects.filter(student__user=self.request.user)

    def perform_create(self, serializer):
        custom_avatar = serializer.save(student=self.request.user.student_profile)
        services.queue_avatar_generation(custom_avatar)
