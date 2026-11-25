from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .in_app import sync_reminders
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "kind", "title", "body", "link", "read_at", "created_at"]
        read_only_fields = fields


class NotificationViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """The logged-in user's notifications, newest first.

    GET also creates any reminders that have become due, and the response
    carries `unread_count` for the bell badge.
    """

    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        sync_reminders(request.user)
        response = super().list(request, *args, **kwargs)
        response.data["unread_count"] = self.get_queryset().filter(read_at__isnull=True).count()
        return response

    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        notification = get_object_or_404(self.get_queryset(), pk=pk)
        if notification.read_at is None:
            notification.read_at = timezone.now()
            notification.save(update_fields=["read_at", "updated_at"])
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=["post"], url_path="read-all")
    def read_all(self, request):
        updated = self.get_queryset().filter(read_at__isnull=True).update(read_at=timezone.now())
        return Response({"updated": updated})
