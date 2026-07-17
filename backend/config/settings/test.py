"""Settings for the automated test suite: fast, hermetic, no external services.

Everything that would normally hit the network (LLM calls, TTS/STT, email)
is either mocked at the test level or made a no-op here; nothing in this
file should require Redis, Postgres, or real API keys to run.
"""
from .base import *  # noqa: F401,F403

DEBUG = False

DATABASES = {
    "default": {
        # A file (not :memory:) because Channels consumer tests hit the DB
        # from a separate thread via database_sync_to_async -- an in-memory
        # SQLite database is connection-local, so a second thread opening
        # its own connection would see an entirely different (or locked)
        # database rather than the same one the test set up.
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "test_db.sqlite3",  # noqa: F405
    }
}

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# Runs Celery tasks synchronously, in-process -- no broker needed, and
# exceptions inside a task propagate to the caller instead of being
# swallowed, which is what a test asserting on task behavior wants.
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

CHANNEL_LAYERS = {
    "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"},
}

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]  # fast, not for prod

GROQ_API_KEY = "test-key"  # never actually called; LLM calls are mocked in tests
