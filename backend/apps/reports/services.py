import io

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
    """Renders the interview report as a one-page PDF via reportlab."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    student = report.session.student
    avatar_name = report.session.avatar.name

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("ReportTitle", parent=styles["Title"], textColor=colors.HexColor("#4F46E5"))
    heading_style = ParagraphStyle("ReportHeading", parent=styles["Heading2"], spaceBefore=16, spaceAfter=6)
    body_style = styles["BodyText"]
    score_style = ParagraphStyle(
        "OverallScore", parent=styles["Title"], fontSize=36, textColor=colors.HexColor("#4F46E5"), spaceAfter=4
    )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter, topMargin=0.75 * inch, bottomMargin=0.75 * inch, title="Interview Report"
    )

    elements = [
        Paragraph("AI_AvatarInterview — Interview Report", title_style),
        Paragraph(
            f"{student.user.full_name} &middot; Interviewed by {avatar_name} &middot; "
            f"{report.generated_at.strftime('%B %d, %Y')}",
            body_style,
        ),
        Spacer(1, 0.3 * inch),
        Paragraph(f"{report.overall_score}/100", score_style),
        Paragraph("Overall score", body_style),
        Paragraph("Score breakdown", heading_style),
        Table(
            [
                ["Communication", f"{report.communication_score}/100"],
                ["Technical", f"{report.technical_score}/100"],
                ["Confidence", f"{report.confidence_score}/100"],
                ["Body language", f"{report.body_language_score}/100"],
                ["Eye contact", f"{report.eye_contact_score}/100"],
                ["Resume match", f"{report.resume_matching_score}/100"],
            ],
            colWidths=[3 * inch, 2 * inch],
            style=TableStyle(
                [
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.HexColor("#E2E8F0")),
                ]
            ),
        ),
    ]

    for heading, items in (
        ("Strengths", report.strengths),
        ("Areas to improve", report.weaknesses),
        ("Improvement tips", report.improvement_tips),
    ):
        elements.append(Paragraph(heading, heading_style))
        if items:
            for item in items:
                elements.append(Paragraph(f"&bull; {item}", body_style))
        else:
            elements.append(Paragraph("—", body_style))

    doc.build(elements)
    return buffer.getvalue()
