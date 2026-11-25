"""In-app notifications (the bell in the top bar)."""
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import Notification


def notify(*, user, title: str, body: str = "", link: str = "", kind=Notification.Kind.GENERAL, dedupe_key=None):
    """Creates a notification; with `dedupe_key`, at most one per user per key."""
    if dedupe_key and Notification.objects.filter(user=user, dedupe_key=dedupe_key).exists():
        return None
    try:
        with transaction.atomic():
            return Notification.objects.create(
                user=user, kind=kind, title=title[:200], body=body, link=link[:300], dedupe_key=dedupe_key
            )
    except IntegrityError:  # lost a race with an identical notify()
        return None


def sync_reminders(user) -> None:
    """Creates any reminders that are due right now. Called whenever the bell
    is checked, so reminders work without a periodic background job."""
    profile = getattr(user, "student_profile", None)
    if profile is None:
        return

    from apps.interviews.models import InterviewSession

    now = timezone.now()
    upcoming = InterviewSession.objects.filter(
        student=profile,
        status=InterviewSession.Status.SCHEDULED,
        scheduled_at__isnull=False,
        scheduled_at__lte=now + timedelta(hours=24),
    ).select_related("avatar")
    for session in upcoming:
        when = timezone.localtime(session.scheduled_at).strftime("%d %b, %I:%M %p")
        notify(
            user=user,
            kind=Notification.Kind.SCHEDULED,
            title="Upcoming interview" if session.scheduled_at > now else "Your scheduled interview is ready",
            body=f"With {session.avatar.name} at {when}. Start it from your Interviews page.",
            link="/interviews",
            dedupe_key=f"scheduled:{session.id}",
        )

    from apps.engagement.services import activity_dates

    dates = activity_dates(profile)
    today = timezone.localdate()
    if dates and (today - max(dates)).days >= 3:
        notify(
            user=user,
            kind=Notification.Kind.REMINDER,
            title="We miss you! Time for a quick practice",
            body="A 5-minute practice keeps your skills sharp. Try today's daily question.",
            link="/dashboard",
            dedupe_key=f"inactive:{today.isoformat()}",
        )
