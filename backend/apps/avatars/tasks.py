import logging

from celery import shared_task

from .models import CustomAvatar

logger = logging.getLogger(__name__)

AVATAR_SIZE = 512
FACE_PADDING_RATIO = 0.6  # extra context kept around the detected face box


@shared_task(bind=True, max_retries=2)
def generate_custom_avatar_task(self, *, custom_avatar_id: str):
    """Builds a student's custom avatar from their uploaded photo.

    Uses OpenCV's bundled Haar cascade to find the face, crops a padded
    square around it, and resizes to a standard avatar size. This is a
    deterministic face-centering/cropping pipeline, not a generative one --
    true photorealistic avatar synthesis (e.g. via a diffusion/GAN model or
    a commercial avatar API) is a natural next extension once a suitable
    model/API is chosen, but isn't implemented here.
    """
    custom_avatar = CustomAvatar.objects.get(id=custom_avatar_id)
    custom_avatar.status = CustomAvatar.Status.PROCESSING
    custom_avatar.save(update_fields=["status"])

    try:
        image_bytes = _build_avatar_image(custom_avatar)

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


def _build_avatar_image(custom_avatar: CustomAvatar) -> bytes:
    import cv2
    import numpy as np

    custom_avatar.source_photo.open("rb")
    try:
        raw = np.frombuffer(custom_avatar.source_photo.read(), dtype=np.uint8)
    finally:
        custom_avatar.source_photo.close()

    image = cv2.imdecode(raw, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not read the uploaded photo. Try a different file (JPEG/PNG).")

    face_box = _detect_largest_face(image)
    if face_box is None:
        raise ValueError("No face detected in the uploaded photo. Upload a clear, front-facing photo.")

    cropped = _crop_to_face(image, face_box)
    resized = cv2.resize(cropped, (AVATAR_SIZE, AVATAR_SIZE), interpolation=cv2.INTER_AREA)

    success, buffer = cv2.imencode(".jpg", resized, [cv2.IMWRITE_JPEG_QUALITY, 90])
    if not success:
        raise ValueError("Failed to encode the generated avatar image.")
    return buffer.tobytes()


def _detect_largest_face(image):
    """Returns the (x, y, w, h) box of the largest detected face, or None."""
    import cv2

    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    classifier = cv2.CascadeClassifier(cascade_path)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = classifier.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
    if len(faces) == 0:
        return None
    # Largest detected box by area, in case of multiple faces/false positives.
    return max(faces, key=lambda box: box[2] * box[3])


def _crop_to_face(image, face_box):
    x, y, w, h = face_box
    cx, cy = x + w / 2, y + h / 2
    half_side = max(w, h) * (1 + FACE_PADDING_RATIO) / 2

    img_h, img_w = image.shape[:2]
    x0 = max(0, int(cx - half_side))
    y0 = max(0, int(cy - half_side))
    x1 = min(img_w, int(cx + half_side))
    y1 = min(img_h, int(cy + half_side))
    return image[y0:y1, x0:x1]
