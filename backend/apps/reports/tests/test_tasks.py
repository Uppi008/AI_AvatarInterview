import pytest

from apps.notifications.models import EmailLog
from apps.reports.models import InterviewReport
from apps.reports.tasks import render_and_email_report_task
from tests.factories import InterviewSessionFactory

pytestmark = pytest.mark.django_db

# CELERY_TASK_ALWAYS_EAGER (config/settings/test.py) makes .delay() below run
# synchronously in-process, so we can assert on DB/email state right after.


def test_render_and_email_report_task_persists_pdf_and_emails_it():
    session = InterviewSessionFactory()
    report = InterviewReport.objects.create(session=session, overall_score=88)

    render_and_email_report_task.delay(report_id=str(report.id))

    report.refresh_from_db()
    assert report.pdf_file.name
    assert report.pdf_file.read().startswith(b"%PDF-")
    assert report.emailed_at is not None

    log = EmailLog.objects.get(user=session.student.user, email_type=EmailLog.EmailType.INTERVIEW_REPORT)
    assert log.status == EmailLog.Status.SENT


def test_pdf_is_kept_even_when_email_sending_fails():
    """Regression: on hosts that block SMTP, the PDF used to be rendered but
    never saved because the email error aborted the task before save()."""
    from unittest.mock import patch

    session = InterviewSessionFactory()
    report = InterviewReport.objects.create(session=session, overall_score=70)

    with patch("apps.reports.tasks.send_transactional_email", side_effect=OSError("SMTP blocked")):
        with pytest.raises(OSError):
            render_and_email_report_task.delay(report_id=str(report.id))

    report.refresh_from_db()
    assert report.pdf_file.name
    assert report.pdf_file.read().startswith(b"%PDF-")
    assert report.emailed_at is None
