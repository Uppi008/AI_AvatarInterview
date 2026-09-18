"""Idempotently re-saves any built-in avatar's image file that's missing
from storage, from the git-tracked source in apps/avatars/seed_images/.

Migrations 0003/0004 only ever run once (Django tracks that in the
persistent django_migrations table), but on a host with no persistent
disk -- e.g. Render's free plan -- the image *files* those migrations
wrote live on the container's ephemeral filesystem and vanish on every
restart/redeploy, even though the Avatar rows (in the real, persistent
database) still reference them by name. Run this on every boot so the
catalog is self-healing regardless of how many times the container has
been recycled.
"""
import os

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from apps.avatars.models import Avatar

SEED_IMAGES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "seed_images")

# Avatar.Category -> seed image filename (apps/avatars/seed_images/) --
# mirrors migrations/0004_replace_placeholder_avatar_images.py.
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


class Command(BaseCommand):
    help = "Re-saves any built-in avatar's image file that's missing from storage."

    def handle(self, *args, **options):
        restored = 0
        for avatar in Avatar.objects.filter(category__in=CATEGORY_IMAGES):
            if avatar.image and avatar.image.storage.exists(avatar.image.name):
                continue

            filename = CATEGORY_IMAGES[avatar.category]
            path = os.path.join(SEED_IMAGES_DIR, filename)
            if not os.path.exists(path):
                self.stderr.write(f"Seed image missing on disk, skipping: {path}")
                continue

            with open(path, "rb") as f:
                avatar.image.save(filename, ContentFile(f.read()), save=True)
            restored += 1
            self.stdout.write(f"Restored image for avatar '{avatar.name}' ({avatar.category}).")

        if restored:
            self.stdout.write(self.style.SUCCESS(f"Restored {restored} avatar image(s)."))
        else:
            self.stdout.write("All avatar images already present.")
