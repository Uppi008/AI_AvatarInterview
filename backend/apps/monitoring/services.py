from django.conf import settings

from apps.interviews.models import InterviewSession

from .models import ProctoringEvent

#: Event types severe enough to count toward the auto-termination threshold.
#: Purely informational nudges (e.g. LOOKING_AWAY, HEAD_ROTATION briefly)
#: are logged as warnings but don't count on their own.
VIOLATION_EVENT_TYPES = {
    ProctoringEvent.EventType.NO_FACE,
    ProctoringEvent.EventType.MULTIPLE_FACES,
    ProctoringEvent.EventType.TAB_SWITCH,
    ProctoringEvent.EventType.WINDOW_MINIMIZED,
    ProctoringEvent.EventType.MOBILE_USAGE,
    ProctoringEvent.EventType.MIC_DISABLED,
    ProctoringEvent.EventType.CAMERA_DISABLED,
    ProctoringEvent.EventType.INTERNET_DISCONNECTED,
    ProctoringEvent.EventType.INAPPROPRIATE_CONTENT,
}


def record_event(*, session: InterviewSession, event_type: str, metadata: dict | None = None) -> ProctoringEvent:
    """Logs a proctoring signal and, if it's violation-grade, increments the
    session's violation counter -- auto-terminating at MAX_INTERVIEW_VIOLATIONS
    (Module 7/8: 4 alerts -> terminate interview, return to dashboard).
    """
    severity = (
        ProctoringEvent.Severity.VIOLATION
        if event_type in VIOLATION_EVENT_TYPES
        else ProctoringEvent.Severity.WARNING
    )
    event = ProctoringEvent.objects.create(
        session=session, event_type=event_type, severity=severity, metadata=metadata or {}
    )

    if severity == ProctoringEvent.Severity.VIOLATION:
        session.violation_count += 1
        session.save(update_fields=["violation_count"])

        if session.violation_count >= settings.MAX_INTERVIEW_VIOLATIONS:
            event.triggered_termination = True
            event.save(update_fields=["triggered_termination"])

            from apps.interviews.services import end_session

            end_session(session=session, reason="Interview auto-terminated: too many proctoring violations.")

    return event
