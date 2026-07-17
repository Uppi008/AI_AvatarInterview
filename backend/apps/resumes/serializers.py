from rest_framework import serializers

from .models import (
    Resume,
    ResumeCertification,
    ResumeEducation,
    ResumeExperience,
    ResumeInsight,
    ResumeProject,
    ResumeSkill,
)

ALLOWED_EXTENSIONS = {"pdf", "docx"}
MAX_RESUME_SIZE_MB = 10


class ResumeUploadSerializer(serializers.Serializer):
    file = serializers.FileField()

    def validate_file(self, value):
        ext = value.name.rsplit(".", 1)[-1].lower() if "." in value.name else ""
        if ext not in ALLOWED_EXTENSIONS:
            raise serializers.ValidationError("Only PDF and DOCX resumes are supported.")
        if value.size > MAX_RESUME_SIZE_MB * 1024 * 1024:
            raise serializers.ValidationError(f"File too large (max {MAX_RESUME_SIZE_MB}MB).")
        return value


class ResumeSkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeSkill
        fields = ["id", "name", "category"]


class ResumeProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeProject
        fields = ["id", "title", "description", "technologies", "duration"]


class ResumeExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeExperience
        fields = ["id", "company", "role", "start_date", "end_date", "is_current", "description"]


class ResumeEducationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeEducation
        fields = ["id", "institution", "degree", "field_of_study", "start_date", "end_date", "grade"]


class ResumeCertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeCertification
        fields = ["id", "name", "issuer", "issue_date"]


class ResumeInsightSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeInsight
        fields = ["summary", "strengths", "weaknesses", "suggested_focus_areas"]


class ResumeSerializer(serializers.ModelSerializer):
    skills = ResumeSkillSerializer(many=True, read_only=True)
    projects = ResumeProjectSerializer(many=True, read_only=True)
    experiences = ResumeExperienceSerializer(many=True, read_only=True)
    education_history = ResumeEducationSerializer(many=True, read_only=True)
    certifications = ResumeCertificationSerializer(many=True, read_only=True)
    insight = ResumeInsightSerializer(read_only=True)

    class Meta:
        model = Resume
        fields = [
            "id", "file", "original_filename", "file_type", "parsing_status", "parsing_error",
            "is_active", "created_at", "skills", "projects", "experiences",
            "education_history", "certifications", "insight",
        ]
        read_only_fields = fields
