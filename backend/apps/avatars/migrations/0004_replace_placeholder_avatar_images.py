"""Replaces the PIL-generated placeholder portraits (colored circle +
initials) from 0003_seed_avatars with real avatar photos.

The photos are AI-generated synthetic faces (StyleGAN2 -- nobody real, no
consent/right-of-publicity issue), each run through the same face-detect
+ crop + resize pipeline apps.avatars.services.process_face_photo uses for
student-uploaded CustomAvatar photos, so the catalog and custom-avatar
paths produce visually consistent results. Bundled under
apps/avatars/seed_images/<category>.jpg -- swap those files and rerun a
similar migration whenever better photos are available; nothing else
about the avatar depends on how the image was sourced.
"""
import os

from django.db import migrations

SEED_IMAGES_DIR = os.path.join(os.path.dirname(__file__), "..", "seed_images")

# category -> seed image filename (apps/avatars/seed_images/).
CATEGORY_IMAGES = {
    "hr_manager": "hr_manager.jpg",
    "technical_interviewer": "technical_interviewer.jpg",
    "senior_manager": "senior_manager.jpg",
    "ceo": "ceo.jpg",
    "female_hr": "female_hr.jpg",
    "male_hr": "male_hr.jpg",
    "friendly_brother": "friendly_brother.jpg",
    "friendly_sister": "friendly_sister.jpg",
    "parent_style": "parent_style.jpg",
    "corporate_recruiter": "corporate_recruiter.jpg",
}


def replace_images(apps, schema_editor):
    from django.core.files.base import ContentFile

    Avatar = apps.get_model("avatars", "Avatar")

    for category, filename in CATEGORY_IMAGES.items():
        avatar = Avatar.objects.filter(category=category).first()
        if avatar is None:
            continue

        path = os.path.join(SEED_IMAGES_DIR, filename)
        if not os.path.exists(path):
            continue

        # Snapshot the OLD name as a plain string before saving -- avatar.image
        # is mutated in place by .save() below, so a bare `old = avatar.image`
        # alias would end up pointing at the *new* file by the time it's used,
        # and deleting it would delete what was just written instead of the
        # placeholder it's replacing.
        old_name = avatar.image.name
        old_storage = avatar.image.storage

        with open(path, "rb") as f:
            avatar.image.save(filename, ContentFile(f.read()), save=True)

        if old_name and old_storage.exists(old_name):
            old_storage.delete(old_name)


def noop_reverse(apps, schema_editor):
    # Placeholder regeneration isn't reversed here -- 0003_seed_avatars'
    # own reverse (remove_avatars) already handles fully undoing the seed
    # if this migration's parent gets unapplied.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("avatars", "0003_seed_avatars"),
    ]

    operations = [
        migrations.RunPython(replace_images, noop_reverse),
    ]
