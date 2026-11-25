from rest_framework import serializers

from .models import InterviewReport


class InterviewReportSerializer(serializers.ModelSerializer):
    hiring_recommendation_display = serializers.CharField(source="get_hiring_recommendation_display", read_only=True)

    class Meta:
        model = InterviewReport
        fields = [
            "id", "session", "overall_score", "communication_score", "technical_score",
            "confidence_score", "body_language_score", "eye_contact_score", "resume_matching_score",
            "voice_clarity_score", "grammar_score", "problem_solving_score",
            "strengths", "weaknesses", "improvement_tips", "spoken_summary", "learning_roadmap",
            "career_suggestions", "recommended_courses", "recommended_certifications", "recommended_projects",
            "hiring_recommendation", "hiring_recommendation_display", "hiring_recommendation_reason",
            "pdf_file", "generated_at", "emailed_at", "share_token",
        ]
        read_only_fields = fields


class SharedReportSerializer(serializers.ModelSerializer):
    """What anyone with a share link may see: scores and the coaching
    summary -- never the student's email, answers, or the PDF."""

    candidate_name = serializers.SerializerMethodField()
    avatar_name = serializers.CharField(source="session.avatar.name", read_only=True)
    target_role = serializers.CharField(source="session.target_role", read_only=True)
    interview_date = serializers.DateTimeField(source="session.started_at", read_only=True)
    hiring_recommendation_display = serializers.CharField(source="get_hiring_recommendation_display", read_only=True)

    class Meta:
        model = InterviewReport
        fields = [
            "candidate_name", "avatar_name", "target_role", "interview_date",
            "overall_score", "communication_score", "technical_score", "confidence_score",
            "body_language_score", "eye_contact_score", "voice_clarity_score", "grammar_score",
            "problem_solving_score", "strengths", "improvement_tips",
            "hiring_recommendation", "hiring_recommendation_display", "generated_at",
        ]
        read_only_fields = fields

    def get_candidate_name(self, report) -> str:
        # First name only: a shared link can travel anywhere.
        full_name = report.session.student.user.full_name or ""
        return full_name.split(" ")[0] if full_name else "Candidate"
