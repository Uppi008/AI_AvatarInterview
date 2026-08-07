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
            "pdf_file", "generated_at", "emailed_at",
        ]
        read_only_fields = fields
