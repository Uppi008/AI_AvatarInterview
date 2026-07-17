import io
from unittest.mock import patch

import pytest
from django.core.files.base import ContentFile

from apps.resumes.models import Resume
from apps.resumes.tasks import parse_resume_task

pytestmark = pytest.mark.django_db


def _valid_pdf_bytes(text: str = "Hello resume") -> bytes:
    from pypdf import PdfWriter

    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


class TestParseResumeTask:
    def test_extracts_text_and_completes(self, resume):
        resume.file.save("resume.pdf", ContentFile(_valid_pdf_bytes()), save=True)

        with patch("apps.ai_engine.services.extract_resume_entities") as mock_extract:
            parse_resume_task.delay(resume_id=str(resume.id))

        resume.refresh_from_db()
        assert resume.parsing_status == Resume.ParsingStatus.COMPLETED
        mock_extract.assert_called_once()

    def test_structured_extraction_failure_does_not_fail_the_task(self, resume):
        """extract_resume_entities failing (e.g. no GROQ_API_KEY) shouldn't
        make an otherwise-successful text extraction look failed."""
        resume.file.save("resume.pdf", ContentFile(_valid_pdf_bytes()), save=True)

        with patch("apps.ai_engine.services.extract_resume_entities", side_effect=RuntimeError("no key")):
            parse_resume_task.delay(resume_id=str(resume.id))  # must not raise

        resume.refresh_from_db()
        assert resume.parsing_status == Resume.ParsingStatus.COMPLETED

    def test_corrupt_file_marks_failed(self, resume):
        resume.file.save("resume.pdf", ContentFile(b"not a real pdf"), save=True)

        with pytest.raises(Exception):
            parse_resume_task.delay(resume_id=str(resume.id))

        resume.refresh_from_db()
        assert resume.parsing_status == Resume.ParsingStatus.FAILED
        assert resume.parsing_error
