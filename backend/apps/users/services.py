import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import EmailVerificationToken, PasswordResetToken, SocialAccount, StudentProfile, User


def register_user(*, email: str, full_name: str, password: str, preferred_language: str = User.Language.ENGLISH) -> User:
    user = User.objects.create_user(
        email=email, full_name=full_name, password=password, preferred_language=preferred_language
    )
    StudentProfile.objects.create(user=user)
    issue_email_verification(user)
    return user


def issue_email_verification(user: User) -> EmailVerificationToken:
    token = EmailVerificationToken.objects.create(
        user=user,
        token=secrets.token_urlsafe(32),
        expires_at=timezone.now() + timedelta(hours=24),
    )
    from .tasks import send_verification_email_task

    send_verification_email_task.delay(user_id=str(user.id), token=token.token)
    return token


def verify_email(token: str) -> User:
    record = EmailVerificationToken.objects.select_related("user").get(token=token, is_used=False)
    if record.is_expired:
        raise ValueError("Verification link has expired. Please request a new one.")
    record.is_used = True
    record.save(update_fields=["is_used"])
    user = record.user
    user.is_email_verified = True
    user.save(update_fields=["is_email_verified"])
    return user


def request_password_reset(email: str) -> None:
    user = User.objects.filter(email__iexact=email).first()
    if not user:
        # Do not reveal whether the account exists.
        return
    token = PasswordResetToken.objects.create(
        user=user, token=secrets.token_urlsafe(32), expires_at=timezone.now() + timedelta(hours=1)
    )
    from .tasks import send_password_reset_email_task

    send_password_reset_email_task.delay(user_id=str(user.id), token=token.token)


def reset_password(*, token: str, new_password: str) -> User:
    record = PasswordResetToken.objects.select_related("user").get(token=token, is_used=False)
    if record.is_expired:
        raise ValueError("Reset link has expired. Please request a new one.")
    record.is_used = True
    record.save(update_fields=["is_used"])
    user = record.user
    user.set_password(new_password)
    user.save(update_fields=["password"])
    return user


def change_password(*, user: User, old_password: str, new_password: str) -> None:
    if not user.check_password(old_password):
        raise ValueError("Current password is incorrect.")
    user.set_password(new_password)
    user.save(update_fields=["password"])


def google_login(*, id_token_str: str) -> User:
    """Verifies a Google Sign-In ID token and returns the matching (or newly
    created) local user. Raises ValueError on an invalid/expired token.
    """
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token as google_id_token

    try:
        payload = google_id_token.verify_oauth2_token(
            id_token_str, google_requests.Request(), settings.GOOGLE_OAUTH_CLIENT_ID
        )
    except ValueError:
        raise

    email = payload["email"]
    full_name = payload.get("name", email.split("@")[0])
    user, created = User.objects.get_or_create(
        email=email, defaults={"full_name": full_name, "is_email_verified": True}
    )
    if created:
        StudentProfile.objects.create(user=user)
        user.set_unusable_password()
        user.save(update_fields=["password"])

    SocialAccount.objects.get_or_create(
        user=user, provider=SocialAccount.Provider.GOOGLE, provider_uid=payload["sub"]
    )
    return user
