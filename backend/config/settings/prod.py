import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

from .base import *  # noqa: F401,F403

DEBUG = False

# Off by default: docs/DEPLOYMENT.md deploys over plain HTTP first and adds
# TLS as a follow-up step, and the Docker healthcheck hits this container
# directly (no proxy, no X-Forwarded-Proto). Turning these on before a real
# HTTPS listener exists in front of the app causes a redirect loop -- every
# request, including the healthcheck, gets 301'd to an https:// endpoint
# that doesn't exist yet. Set DJANGO_SECURE_SSL_REDIRECT=True in .env once
# nginx's :443 server block (docker/nginx/nginx.prod.conf) is live.
SECURE_SSL_REDIRECT = env.bool("DJANGO_SECURE_SSL_REDIRECT", default=False)  # noqa: F405
SESSION_COOKIE_SECURE = SECURE_SSL_REDIRECT
CSRF_COOKIE_SECURE = SECURE_SSL_REDIRECT
SECURE_HSTS_SECONDS = 31536000 if SECURE_SSL_REDIRECT else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = SECURE_SSL_REDIRECT
SECURE_HSTS_PRELOAD = SECURE_SSL_REDIRECT
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"

# Nginx serves /static/ and /media/ directly (see docker/nginx/nginx.conf) --
# Django never serves them itself in production, so no whitenoise. Manifest
# storage still gives collectstatic content-hashed filenames for cache-busting.
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.ManifestStaticFilesStorage"},
}

if env.bool("USE_S3", default=False):  # noqa: F405
    STORAGES["default"] = {"BACKEND": "storages.backends.s3boto3.S3Boto3Storage"}
    AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID", default="")  # noqa: F405
    AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY", default="")  # noqa: F405
    AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME", default="")  # noqa: F405
    AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="")  # noqa: F405
    AWS_DEFAULT_ACL = None
    AWS_S3_FILE_OVERWRITE = False

SENTRY_DSN = env("SENTRY_DSN", default="")  # noqa: F405
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        traces_sample_rate=0.2,
        send_default_pii=False,
    )
