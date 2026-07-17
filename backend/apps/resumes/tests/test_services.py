from unittest.mock import patch

import pytest
from django.core.files.base import ContentFile

from apps.resumes.models import Resume
from apps.resumes.services import upload_resume

pytestmark = pytest.mark.django_db


class TestUploadResume:
    def test_creates_resume_and_queues_parsing(self, student):
        file_obj = ContentFile(b"%PDF-1.4 fake pdf bytes", name="resume.pdf")

        with patch("apps.resumes.tasks.parse_resume_task.delay") as mock_delay:
            resume = upload_resume(student=student, file=file_obj, original_filename="resume.pdf", file_type="pdf")

        assert resume.student == student
        assert resume.is_active is True
        mock_delay.assert_called_once_with(resume_id=str(resume.id))

    def test_demotes_previous_active_resume(self, student, resume):
        assert resume.is_active is True
        new_file = ContentFile(b"%PDF-1.4 fake pdf bytes v2", name="resume2.pdf")

        with patch("apps.resumes.tasks.parse_resume_task.delay"):
            new_resume = upload_resume(
                student=student, file=new_file, original_filename="resume2.pdf", file_type="pdf"
            )

        resume.refresh_from_db()
        assert resume.is_active is False
        assert new_resume.is_active is True
        assert Resume.objects.filter(student=student, is_active=True).count() == 1
