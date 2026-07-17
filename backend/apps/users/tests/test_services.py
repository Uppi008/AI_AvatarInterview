from datetime import timedelta

import pytest
from django.core import mail
from django.utils import timezone

from apps.users import services
from apps.users.models import EmailVerificationToken, PasswordResetToken, StudentProfile, User

pytestmark = pytest.mark.django_db


class TestRegisterUser:
    def test_creates_user_and_profile(self):
        user = services.register_user(email="new@example.com", full_name="New User", password="StrongPass123!")

        assert user.email == "new@example.com"
        assert user.check_password("StrongPass123!")
        assert user.is_email_verified is False
        assert StudentProfile.objects.filter(user=user).exists()

    def test_sends_verification_email(self):
        services.register_user(email="new@example.com", full_name="New User", password="StrongPass123!")

        assert len(mail.outbox) == 1
        assert "Verify your AI_AvatarInterview account" in mail.outbox[0].subject
        assert EmailVerificationToken.objects.filter(user__email="new@example.com").exists()


class TestVerifyEmail:
    def test_marks_user_verified(self, user):
        token = EmailVerificationToken.objects.create(
            user=user, token="abc123", expires_at=timezone.now() + timedelta(hours=1)
        )

        verified_user = services.verify_email(token.token)

        assert verified_user.is_email_verified is True
        token.refresh_from_db()
        assert token.is_used is True

    def test_rejects_expired_token(self, user):
        token = EmailVerificationToken.objects.create(
            user=user, token="expired-token", expires_at=timezone.now() - timedelta(hours=1)
        )

        with pytest.raises(ValueError, match="expired"):
            services.verify_email(token.token)

    def test_rejects_unknown_token(self):
        with pytest.raises(EmailVerificationToken.DoesNotExist):
            services.verify_email("does-not-exist")

    def test_rejects_already_used_token(self, user):
        token = EmailVerificationToken.objects.create(
            user=user, token="used-token", expires_at=timezone.now() + timedelta(hours=1), is_used=True
        )

        with pytest.raises(EmailVerificationToken.DoesNotExist):
            services.verify_email(token.token)


class TestPasswordReset:
    def test_request_creates_token_and_emails_it(self, user):
        services.request_password_reset(user.email)

        assert PasswordResetToken.objects.filter(user=user).exists()
        assert len(mail.outbox) == 1
        assert "Reset your AI_AvatarInterview password" in mail.outbox[0].subject

    def test_request_for_unknown_email_is_silent(self):
        """Doesn't leak whether an account exists: no error, no email."""
        services.request_password_reset("nobody@example.com")

        assert len(mail.outbox) == 0

    def test_reset_changes_password(self, user):
        old_hash = user.password
        token = PasswordResetToken.objects.create(
            user=user, token="reset-tok", expires_at=timezone.now() + timedelta(hours=1)
        )

        services.reset_password(token=token.token, new_password="BrandNewPass123!")

        user.refresh_from_db()
        assert user.password != old_hash
        assert user.check_password("BrandNewPass123!")
        token.refresh_from_db()
        assert token.is_used is True

    def test_reset_rejects_expired_token(self, user):
        token = PasswordResetToken.objects.create(
            user=user, token="expired", expires_at=timezone.now() - timedelta(hours=1)
        )

        with pytest.raises(ValueError, match="expired"):
            services.reset_password(token=token.token, new_password="whatever123")


class TestChangePassword:
    def test_changes_with_correct_old_password(self, user):
        user.set_password("OldPass123!")
        user.save()

        services.change_password(user=user, old_password="OldPass123!", new_password="NewPass123!")

        user.refresh_from_db()
        assert user.check_password("NewPass123!")

    def test_rejects_incorrect_old_password(self, user):
        user.set_password("OldPass123!")
        user.save()

        with pytest.raises(ValueError, match="incorrect"):
            services.change_password(user=user, old_password="WrongPass", new_password="NewPass123!")
