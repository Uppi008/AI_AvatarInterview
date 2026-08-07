import logging

from celery import shared_task

from .models import CustomAvatar

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2)
def generate_custom_avatar_task(self, *, custom_avatar_id: str):
    """Builds a student's custom avatar from their uploaded photo.

    Uses OpenCV's bundled Haar cascade (via apps.avatars.services.
    process_face_photo) to find the face, crops a padded square around it,
    and resizes to a standard avatar size. This is a deterministic
    face-centering/cropping pipeline, not a generative one -- true
    photorealistic avatar synthesis (e.g. via a diffusion/GAN model or a
    commercial avatar API) is a natural next extension once a suitable
    model/API is chosen, but isn't implemented here.
    """
    from .services import process_face_photo

    custom_avatar = CustomAvatar.objects.get(id=custom_avatar_id)
    custom_avatar.status = CustomAvatar.Status.PROCESSING
    custom_avatar.save(update_fields=["status"])

    try:
        custom_avatar.source_photo.open("rb")
        try:
            source_bytes = custom_avatar.source_photo.read()
        finally:
            custom_avatar.source_photo.close()

        image_bytes = process_face_photo(source_bytes)

        from django.core.files.base import ContentFile

        custom_avatar.generated_avatar_image.save(
            f"{custom_avatar.id}.jpg", ContentFile(image_bytes), save=False
        )
        custom_avatar.status = CustomAvatar.Status.READY
        custom_avatar.save(update_fields=["generated_avatar_image", "status"])
    except Exception as exc:
        custom_avatar.status = CustomAvatar.Status.FAILED
        custom_avatar.failure_reason = str(exc)
        custom_avatar.save(update_fields=["status", "failure_reason"])
        raise
