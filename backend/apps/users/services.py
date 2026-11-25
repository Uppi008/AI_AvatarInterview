import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import EmailVerificationToken, PasswordResetToken, SocialAccount, StudentProfile, User

logger = logging.getLogger(__name__)


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


class GoogleLoginError(ValueError):
    """A Google sign-in that can't be completed; the message is safe to show."""


# Google's servers and the machine's clock are rarely in perfect sync; without
# leeway a fresh token is rejected as "used too early" (seen for real with a
# PC clock ~4.5 min slow). 300s matches the default acceptable skew of Google's
# own GoogleIdTokenVerifier; tokens are still bounded by their 1h lifetime.
GOOGLE_CLOCK_SKEW_SECONDS = 300


def google_login(*, id_token_str: str) -> User:
    """Verifies a Google Sign-In ID token and returns the matching (or newly
    created) local user. Raises GoogleLoginError with a user-facing reason.
    """
    from google.auth import exceptions as google_exceptions
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token as google_id_token

    if not settings.GOOGLE_OAUTH_CLIENT_ID:
        raise GoogleLoginError(
            "Google sign-in isn't set up on the server yet (GOOGLE_OAUTH_CLIENT_ID is empty). "
            "Set it in .env and restart the backend."
        )

    try:
        payload = google_id_token.verify_oauth2_token(
            id_token_str,
            google_requests.Request(),
            settings.GOOGLE_OAUTH_CLIENT_ID,
            clock_skew_in_seconds=GOOGLE_CLOCK_SKEW_SECONDS,
        )
    except google_exceptions.TransportError as exc:
        logger.warning("Google sign-in: couldn't fetch Google's certificates: %s", exc)
        raise GoogleLoginError("Couldn't reach Google to verify your sign-in. Check your internet and try again.") from exc
    except ValueError as exc:
        reason = str(exc)
        logger.warning("Google sign-in rejected: %s", reason)
        lowered = reason.lower()
        if "audience" in lowered or "recipient" in lowered:
            raise GoogleLoginError(
                "This Google sign-in was made for a different app. The frontend VITE_GOOGLE_CLIENT_ID and "
                "backend GOOGLE_OAUTH_CLIENT_ID must be the same value (restart both after changing)."
            ) from exc
        if "too early" in lowered or "expired" in lowered or "too late" in lowered:
            raise GoogleLoginError(
                "Your computer's clock seems to be off, so Google's sign-in looked expired. "
                "Set the date and time to automatic and try again."
            ) from exc
        raise GoogleLoginError("Google sign-in couldn't be verified. Please try again.") from exc

    if not payload.get("email") or not payload.get("email_verified"):
        raise GoogleLoginError("Your Google account's email isn't verified, so it can't be used to sign in.")

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
