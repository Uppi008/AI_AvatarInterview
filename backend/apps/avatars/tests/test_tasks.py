from unittest.mock import patch

import pytest
from django.core.files.base import ContentFile

from apps.avatars.models import CustomAvatar
from apps.avatars.tasks import generate_custom_avatar_task

pytestmark = pytest.mark.django_db

# CELERY_TASK_ALWAYS_EAGER + CELERY_TASK_EAGER_PROPAGATES (config/settings/
# test.py) make .delay() below run synchronously in-process with self
# properly bound, and re-raise the task's exception into the test instead
# of swallowing it (correct for a test asserting on failure behavior; a
# real async worker would instead just log it and mark the task failed).


class TestGenerateCustomAvatarTask:
    def test_no_face_in_photo_fails_gracefully(self, custom_avatar):
        """Exercises the real OpenCV Haar-cascade pipeline (no mocking) against
        a real, valid, but faceless PNG -- it should correctly find nothing
        and fail with a clear reason rather than fabricate a result."""
        with pytest.raises(ValueError, match="No face detected"):
            generate_custom_avatar_task.delay(custom_avatar_id=str(custom_avatar.id))

        custom_avatar.refresh_from_db()
        assert custom_avatar.status == CustomAvatar.Status.FAILED
        assert "no face" in custom_avatar.failure_reason.lower()

    def test_detected_face_produces_ready_avatar(self, custom_avatar):
        # Face detection accuracy against a real photo can't be verified in
        # this environment (no real face image available); this mocks only
        # the detection step to prove the crop/resize/save pipeline around
        # it is wired correctly.
        with patch("apps.avatars.tasks._detect_largest_face", return_value=(20, 20, 80, 80)):
            generate_custom_avatar_task.delay(custom_avatar_id=str(custom_avatar.id))

        custom_avatar.refresh_from_db()
        assert custom_avatar.status == CustomAvatar.Status.READY
        assert custom_avatar.generated_avatar_image.name

    def test_unreadable_photo_fails_gracefully(self, custom_avatar):
        custom_avatar.source_photo.save("bad.png", ContentFile(b"not an image at all"), save=True)

        with pytest.raises(ValueError, match="Could not read"):
            generate_custom_avatar_task.delay(custom_avatar_id=str(custom_avatar.id))

        custom_avatar.refresh_from_db()
        assert custom_avatar.status == CustomAvatar.Status.FAILED
        assert "could not read" in custom_avatar.failure_reason.lower()
