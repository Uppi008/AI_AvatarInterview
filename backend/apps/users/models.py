from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel


class UserManager(BaseUserManager):
    """Manager for the email-authenticated custom User model."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_email_verified", True)
        extra_fields.setdefault("role", User.Role.ADMIN)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    """Custom user model, authenticated by email instead of username."""

    class Role(models.TextChoices):
        STUDENT = "student", _("Student")
        ADMIN = "admin", _("Admin")

    class Language(models.TextChoices):
        ENGLISH = "en", _("English")
        HINDI = "hi", _("Hindi")
        TELUGU = "te", _("Telugu")

    email = models.EmailField(_("email address"), unique=True, db_index=True)
    full_name = models.CharField(max_length=150)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.STUDENT)
    preferred_language = models.CharField(max_length=5, choices=Language.choices, default=Language.ENGLISH)
    dark_mode_enabled = models.BooleanField(default=False)

    is_email_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    objects = UserManager()

    class Meta:
        db_table = "users"
        indexes = [models.Index(fields=["role"])]

    def __str__(self):
        return self.email


def profile_photo_upload_path(instance, filename):
    return f"profile_photos/{instance.user_id}/{filename}"


class StudentProfile(BaseModel):
    """One-to-one extension of User holding student-specific fields."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="student_profile")
    phone_number = models.CharField(max_length=20, blank=True)
    profile_photo = models.ImageField(upload_to=profile_photo_upload_path, blank=True, null=True)
    bio = models.TextField(blank=True)
    date_of_birth = models.DateField(blank=True, null=True)
    institution = models.CharField(max_length=255, blank=True)
    graduation_year = models.PositiveIntegerField(blank=True, null=True)

    class Meta:
        db_table = "student_profiles"

    def __str__(self):
        return f"Profile<{self.user.email}>"


class EmailVerificationToken(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="email_verification_tokens")
    token = models.CharField(max_length=128, unique=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        db_table = "email_verification_tokens"
        indexes = [models.Index(fields=["token"])]

    @property
    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at


class PasswordResetToken(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="password_reset_tokens")
    token = models.CharField(max_length=128, unique=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        db_table = "password_reset_tokens"
        indexes = [models.Index(fields=["token"])]

    @property
    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at


class SocialAccount(BaseModel):
    """Links a User to a third-party auth provider (Google, etc.)."""

    class Provider(models.TextChoices):
        GOOGLE = "google", _("Google")

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="social_accounts")
    provider = models.CharField(max_length=20, choices=Provider.choices)
    provider_uid = models.CharField(max_length=255)

    class Meta:
        db_table = "social_accounts"
        constraints = [
            models.UniqueConstraint(fields=["provider", "provider_uid"], name="unique_provider_account")
        ]
