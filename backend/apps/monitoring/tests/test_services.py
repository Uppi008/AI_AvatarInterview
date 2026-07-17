from unittest.mock import patch

import pytest

from apps.interviews.models import InterviewSession
from apps.monitoring import services as monitoring_services
from apps.monitoring.models import ProctoringEvent

pytestmark = pytest.mark.django_db


class TestRecordEvent:
    def test_violation_event_increments_counter(self, interview_session):
        monitoring_services.record_event(session=interview_session, event_type=ProctoringEvent.EventType.NO_FACE)

        interview_session.refresh_from_db()
        assert interview_session.violation_count == 1

    def test_warning_event_does_not_increment_counter(self, interview_session):
        monitoring_services.record_event(
            session=interview_session, event_type=ProctoringEvent.EventType.LOOKING_AWAY
        )

        interview_session.refresh_from_db()
        assert interview_session.violation_count == 0

    def test_persists_event_with_metadata(self, interview_session):
        event = monitoring_services.record_event(
            session=interview_session,
            event_type=ProctoringEvent.EventType.MULTIPLE_FACES,
            metadata={"face_count": 2},
        )

        assert event.metadata == {"face_count": 2}
        assert event.severity == ProctoringEvent.Severity.VIOLATION

    def test_fourth_violation_auto_terminates(self, interview_session):
        with patch("apps.interviews.tasks.generate_report_task.delay"):
            for _ in range(3):
                event = monitoring_services.record_event(
                    session=interview_session, event_type=ProctoringEvent.EventType.NO_FACE
                )
                assert event.triggered_termination is False

            final_event = monitoring_services.record_event(
                session=interview_session, event_type=ProctoringEvent.EventType.NO_FACE
            )

        assert final_event.triggered_termination is True
        interview_session.refresh_from_db()
        assert interview_session.status == InterviewSession.Status.TERMINATED
        assert interview_session.violation_count == 4
        assert "too many proctoring violations" in interview_session.termination_reason.lower()

    def test_violation_history_is_fully_stored(self, interview_session):
        with patch("apps.interviews.tasks.generate_report_task.delay"):
            for _ in range(4):
                monitoring_services.record_event(
                    session=interview_session, event_type=ProctoringEvent.EventType.TAB_SWITCH
                )

        events = ProctoringEvent.objects.filter(session=interview_session).order_by("created_at")
        assert events.count() == 4
        assert [e.triggered_termination for e in events] == [False, False, False, True]
