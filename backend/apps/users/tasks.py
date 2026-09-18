from celery import shared_task
from django.conf import settings

from apps.notifications.models import EmailLog
from apps.notifications.services import send_transactional_email

from .models import User


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def send_verification_email_task(self, *, user_id: str, token: str):
    try:
        user = User.objects.get(id=user_id)
        link = f"{settings.FRONTEND_BASE_URL}/verify-email?token={token}"
        send_transactional_email(
            user=user,
            email_type=EmailLog.EmailType.EMAIL_VERIFICATION,
            subject="Verify your AI_AvatarInterview account",
            message=(
                f"Welcome to AI_AvatarInterview, {user.full_name}!\n\n"
                f"Verify your email address to activate your account:\n{link}\n\n"
                "This link expires in 24 hours."
            ),
        )
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def send_password_reset_email_task(self, *, user_id: str, token: str):
    try:
        user = User.objects.get(id=user_id)
        link = f"{settings.FRONTEND_BASE_URL}/reset-password?token={token}"
        send_transactional_email(
            user=user,
            email_type=EmailLog.EmailType.PASSWORD_RESET,
            subject="Reset your AI_AvatarInterview password",
            message=(
                f"Hi {user.full_name},\n\n"
                f"Reset your password using this link:\n{link}\n\n"
                "This link expires in 1 hour. If you didn't request this, you can safely ignore this email."
            ),
        )
    except Exception as exc:
        raise self.retry(exc=exc)
