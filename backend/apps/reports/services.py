from .models import InterviewReport


def create_report_and_send_email(*, session, report_data: dict) -> InterviewReport:
    report, _ = InterviewReport.objects.update_or_create(
        session=session,
        defaults={
            "overall_score": report_data.get("overall_score", 0),
            "communication_score": report_data.get("communication_score", 0),
            "technical_score": report_data.get("technical_score", 0),
            "confidence_score": report_data.get("confidence_score", 0),
            "body_language_score": report_data.get("body_language_score", 0),
            "eye_contact_score": report_data.get("eye_contact_score", 0),
            "resume_matching_score": report_data.get("resume_matching_score", 0),
            "strengths": report_data.get("strengths", []),
            "weaknesses": report_data.get("weaknesses", []),
            "improvement_tips": report_data.get("improvement_tips", []),
        },
    )

    from .tasks import render_and_email_report_task

    render_and_email_report_task.delay(report_id=str(report.id))
    return report


def render_pdf(report: InterviewReport) -> bytes:
    """Renders the report as a PDF (reportlab). Full layout implemented as
    part of Phase 9 deployment polish; until then the email task sends a
    plain-text summary instead of an attachment.
    """
    raise NotImplementedError("PDF report rendering is finished in Phase 9.")
