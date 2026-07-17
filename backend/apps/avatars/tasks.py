import logging

from celery import shared_task

from .models import CustomAvatar

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2)
def generate_custom_avatar_task(self, *, custom_avatar_id: str):
    """Generates a talking-avatar image/rig from the student's uploaded photo.

    Real face-based avatar generation (Module 4) is implemented in Phase 6;
    for now this marks the avatar ready using the source photo directly so
    the rest of the pipeline (selection, interview flow) has something to
    point at end-to-end.
    """
    custom_avatar = CustomAvatar.objects.get(id=custom_avatar_id)
    custom_avatar.status = CustomAvatar.Status.PROCESSING
    custom_avatar.save(update_fields=["status"])

    try:
        # TODO(Phase 6): replace with real image-to-avatar generation.
        custom_avatar.generated_avatar_image = custom_avatar.source_photo
        custom_avatar.status = CustomAvatar.Status.READY
        custom_avatar.save(update_fields=["generated_avatar_image", "status"])
    except Exception as exc:
        custom_avatar.status = CustomAvatar.Status.FAILED
        custom_avatar.failure_reason = str(exc)
        custom_avatar.save(update_fields=["status", "failure_reason"])
        raise
