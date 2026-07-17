from unittest.mock import patch

import pytest

from apps.reports import services
from apps.reports.models import InterviewReport
from tests.factories import InterviewSessionFactory

pytestmark = pytest.mark.django_db


def _make_report(**overrides):
    session = InterviewSessionFactory()
    defaults = dict(
        overall_score=82,
        communication_score=80,
        technical_score=85,
        confidence_score=78,
        body_language_score=90,
        eye_contact_score=88,
        resume_matching_score=75,
        strengths=["Clear communication", "Strong Python fundamentals"],
        weaknesses=["Vague on system design tradeoffs"],
        improvement_tips=["Practice explaining tradeoffs out loud"],
    )
    defaults.update(overrides)
    return InterviewReport.objects.create(session=session, **defaults)


def test_render_pdf_returns_nonempty_pdf_bytes():
    report = _make_report()

    pdf_bytes = services.render_pdf(report)

    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes.startswith(b"%PDF-")
    assert len(pdf_bytes) > 500


def test_render_pdf_handles_empty_lists():
    report = _make_report(strengths=[], weaknesses=[], improvement_tips=[])

    pdf_bytes = services.render_pdf(report)

    assert pdf_bytes.startswith(b"%PDF-")


def test_create_report_and_send_email_queues_render_task():
    session = InterviewSessionFactory()

    with patch("apps.reports.tasks.render_and_email_report_task.delay") as delay:
        report = services.create_report_and_send_email(
            session=session,
            report_data={"overall_score": 91, "strengths": ["Great"], "weaknesses": [], "improvement_tips": []},
        )

    assert report.overall_score == 91
    delay.assert_called_once_with(report_id=str(report.id))
