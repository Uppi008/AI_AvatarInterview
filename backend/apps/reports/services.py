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
            "voice_clarity_score": report_data.get("voice_clarity_score", 0),
            "grammar_score": report_data.get("grammar_score", 0),
            "problem_solving_score": report_data.get("problem_solving_score", 0),
            "strengths": report_data.get("strengths", []),
            "weaknesses": report_data.get("weaknesses", []),
            "improvement_tips": report_data.get("improvement_tips", []),
            "spoken_summary": report_data.get("spoken_summary", ""),
            "learning_roadmap": report_data.get("learning_roadmap", []),
            "career_suggestions": report_data.get("career_suggestions", []),
            "recommended_courses": report_data.get("recommended_courses", []),
            "recommended_certifications": report_data.get("recommended_certifications", []),
            "recommended_projects": report_data.get("recommended_projects", []),
            "hiring_recommendation": report_data.get("hiring_recommendation", ""),
            "hiring_recommendation_reason": report_data.get("hiring_recommendation_reason", ""),
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
    quote_style = ParagraphStyle(
        "SpokenSummary", parent=styles["BodyText"], fontName="Helvetica-Oblique", spaceBefore=6, spaceAfter=6
    )
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
    ]

    if report.spoken_summary:
        elements.append(Paragraph(f"&ldquo;{report.spoken_summary}&rdquo;", quote_style))

    if report.hiring_recommendation:
        elements.append(
            Paragraph(
                f"Hiring recommendation: <b>{report.get_hiring_recommendation_display()}</b>"
                + (f" -- {report.hiring_recommendation_reason}" if report.hiring_recommendation_reason else ""),
                body_style,
            )
        )

    elements += [
        Paragraph("Score breakdown", heading_style),
        Table(
            [
                ["Communication", f"{report.communication_score}/100"],
                ["Technical", f"{report.technical_score}/100"],
                ["Confidence", f"{report.confidence_score}/100"],
                ["Body language", f"{report.body_language_score}/100"],
                ["Eye contact", f"{report.eye_contact_score}/100"],
                ["Resume match", f"{report.resume_matching_score}/100"],
                ["Voice clarity", f"{report.voice_clarity_score}/100"],
                ["Grammar", f"{report.grammar_score}/100"],
                ["Problem solving", f"{report.problem_solving_score}/100"],
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
        ("Learning roadmap", report.learning_roadmap),
        ("Career suggestions", report.career_suggestions),
        ("Recommended courses", report.recommended_courses),
        ("Recommended certifications", report.recommended_certifications),
        ("Recommended projects", report.recommended_projects),
    ):
        elements.append(Paragraph(heading, heading_style))
        if items:
            for item in items:
                elements.append(Paragraph(f"&bull; {item}", body_style))
        else:
            elements.append(Paragraph("—", body_style))

    doc.build(elements)
    return buffer.getvalue()
