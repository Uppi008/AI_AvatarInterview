from rest_framework import mixins, viewsets
from rest_framework.response import Response

from common.permissions import IsStudent
from common.throttling import ScopedThrottleOnCreateMixin

from . import services
from .models import Resume
from .serializers import ResumeSerializer, ResumeUploadSerializer


class ResumeViewSet(
    ScopedThrottleOnCreateMixin,
    mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet
):
    """List/retrieve a student's own resumes and upload new ones.

    Uploading a new resume automatically demotes the previous one
    (`is_active=False`) and queues background parsing.
    """

    permission_classes = [IsStudent]
    throttle_scope = "resume_upload"

    def get_queryset(self):
        return Resume.objects.filter(student__user=self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return ResumeUploadSerializer
        return ResumeSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        file_obj = serializer.validated_data["file"]
        ext = file_obj.name.rsplit(".", 1)[-1].lower()
        resume = services.upload_resume(
            student=request.user.student_profile,
            file=file_obj,
            original_filename=file_obj.name,
            file_type=ext,
        )
        return Response(ResumeSerializer(resume).data, status=201)
