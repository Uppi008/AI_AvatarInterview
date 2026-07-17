from rest_framework import serializers

from .models import InterviewReport


class InterviewReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewReport
        fields = [
            "id", "session", "overall_score", "communication_score", "technical_score",
            "confidence_score", "body_language_score", "eye_contact_score", "resume_matching_score",
            "strengths", "weaknesses", "improvement_tips", "pdf_file", "generated_at", "emailed_at",
        ]
        read_only_fields = fields
