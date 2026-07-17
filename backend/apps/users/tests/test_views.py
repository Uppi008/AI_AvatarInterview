import pytest
from django.core import mail

from apps.users.models import EmailVerificationToken, User

pytestmark = pytest.mark.django_db


class TestRegisterView:
    def test_register_creates_user(self, api_client):
        response = api_client.post(
            "/api/v1/auth/register/",
            {
                "email": "fresh@example.com",
                "full_name": "Fresh User",
                "password": "StrongPass123!",
                "password_confirm": "StrongPass123!",
            },
        )

        assert response.status_code == 201
        assert User.objects.filter(email="fresh@example.com").exists()
        assert len(mail.outbox) == 1

    def test_register_rejects_mismatched_passwords(self, api_client):
        response = api_client.post(
            "/api/v1/auth/register/",
            {
                "email": "fresh@example.com",
                "full_name": "Fresh User",
                "password": "StrongPass123!",
                "password_confirm": "Different123!",
            },
        )

        assert response.status_code == 400
        assert not User.objects.filter(email="fresh@example.com").exists()

    def test_register_rejects_duplicate_email(self, api_client, user):
        response = api_client.post(
            "/api/v1/auth/register/",
            {
                "email": user.email,
                "full_name": "Someone Else",
                "password": "StrongPass123!",
                "password_confirm": "StrongPass123!",
            },
        )

        assert response.status_code == 400


class TestLoginView:
    def test_login_returns_tokens(self, api_client, user):
        user.set_password("TestPass123!")
        user.save()

        response = api_client.post("/api/v1/auth/login/", {"email": user.email, "password": "TestPass123!"})

        assert response.status_code == 200
        assert "access" in response.data
        assert "refresh" in response.data
        assert response.data["user"]["email"] == user.email

    def test_login_rejects_wrong_password(self, api_client, user):
        response = api_client.post("/api/v1/auth/login/", {"email": user.email, "password": "WrongPassword"})

        assert response.status_code == 401


class TestVerifyEmailView:
    def test_verifies_with_valid_token(self, api_client, user):
        from datetime import timedelta

        from django.utils import timezone

        token = EmailVerificationToken.objects.create(
            user=user, token="valid-tok", expires_at=timezone.now() + timedelta(hours=1)
        )

        response = api_client.post("/api/v1/auth/verify-email/", {"token": token.token})

        assert response.status_code == 200
        user.refresh_from_db()
        assert user.is_email_verified is True

    def test_rejects_invalid_token(self, api_client):
        response = api_client.post("/api/v1/auth/verify-email/", {"token": "garbage"})

        assert response.status_code == 400


class TestMeProfileView:
    def test_requires_auth(self, api_client):
        response = api_client.get("/api/v1/users/me/")

        assert response.status_code == 401

    def test_returns_own_profile(self, auth_client, student):
        response = auth_client.get("/api/v1/users/me/")

        assert response.status_code == 200
        assert response.data["user"]["email"] == student.user.email

    def test_updates_full_name(self, auth_client, student):
        response = auth_client.patch(
            "/api/v1/users/me/", {"user": {"full_name": "Updated Name"}}, format="json"
        )

        assert response.status_code == 200
        student.user.refresh_from_db()
        assert student.user.full_name == "Updated Name"
