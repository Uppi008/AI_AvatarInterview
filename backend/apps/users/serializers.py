from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import StudentProfile, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "email", "full_name", "role", "preferred_language",
            "dark_mode_enabled", "is_email_verified", "created_at",
        ]
        read_only_fields = ["id", "email", "role", "is_email_verified", "created_at"]


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Login serializer keyed on email (USERNAME_FIELD) that also returns
    the authenticated user's profile alongside the token pair.
    """

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    preferred_language = serializers.ChoiceField(choices=User.Language.choices, default=User.Language.ENGLISH)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs


class VerifyEmailSerializer(serializers.Serializer):
    token = serializers.CharField()


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, validators=[validate_password])


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])


class GoogleLoginSerializer(serializers.Serializer):
    id_token = serializers.CharField()


class StudentProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer()

    class Meta:
        model = StudentProfile
        fields = [
            "id", "user", "phone_number", "profile_photo", "bio",
            "date_of_birth", "institution", "graduation_year",
        ]
        read_only_fields = ["id"]

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", None)
        if user_data:
            user = instance.user
            for field in ("full_name", "preferred_language", "dark_mode_enabled"):
                if field in user_data:
                    setattr(user, field, user_data[field])
            user.save()
        return super().update(instance, validated_data)
