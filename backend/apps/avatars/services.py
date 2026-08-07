from .models import CustomAvatar


def queue_avatar_generation(custom_avatar: CustomAvatar) -> None:
    from .tasks import generate_custom_avatar_task

    generate_custom_avatar_task.delay(custom_avatar_id=str(custom_avatar.id))


AVATAR_SIZE = 512
FACE_PADDING_RATIO = 0.6  # extra context kept around the detected face box


def process_face_photo(image_bytes: bytes) -> bytes:
    """Detects the largest face in a photo, crops a padded square around it,
    and resizes to a standard avatar size -- shared by CustomAvatar
    generation (apps.avatars.tasks) and the built-in avatar catalog's seed
    images (apps.avatars.migrations), so there's one face-crop pipeline
    rather than two copies of the same OpenCV logic.
    """
    import cv2
    import numpy as np

    raw = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(raw, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not read the photo. Try a different file (JPEG/PNG).")

    face_box = _detect_largest_face(image)
    if face_box is None:
        raise ValueError("No face detected in the photo. Use a clear, front-facing photo.")

    cropped = _crop_to_face(image, face_box)
    resized = cv2.resize(cropped, (AVATAR_SIZE, AVATAR_SIZE), interpolation=cv2.INTER_AREA)

    success, buffer = cv2.imencode(".jpg", resized, [cv2.IMWRITE_JPEG_QUALITY, 90])
    if not success:
        raise ValueError("Failed to encode the processed avatar image.")
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
