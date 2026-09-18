"""
Render.com overrides on top of prod.py.

The VPS path in docs/DEPLOYMENT.md puts nginx in front of the backend
container, and nginx serves /static/ and /media/ directly from a shared
volume -- Django never touches those requests. Render's web services have
no such sidecar: this process is the only thing standing behind Render's
edge, so it has to serve both itself. Whitenoise (static) and
SERVE_MEDIA_FILES (media, via Django's own static.serve view) are layered
in here, not in prod.py, to keep that VPS path exactly as documented.
"""
import os

from .prod import *  # noqa: F401,F403

MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")  # noqa: F405

STORAGES["staticfiles"] = {  # noqa: F405
    "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"
}

# config/urls.py only wires up MEDIA_URL when settings.DEBUG is True
# (Django's own docs warn this view isn't hardened/optimized for real
# traffic -- fine for a free-tier demo, not fine to silently turn on
# everywhere prod.py is used). Without either flag, every avatar/resume/
# report image 404s since there's no nginx here to serve /media/ instead.
SERVE_MEDIA_FILES = True

# Render assigns a *.onrender.com hostname per service and exposes it via
# this env var -- append it so ALLOWED_HOSTS/CSRF_TRUSTED_ORIGINS don't need
# the exact value hardcoded into render.yaml before the first deploy.
RENDER_EXTERNAL_HOSTNAME = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)  # noqa: F405
    CSRF_TRUSTED_ORIGINS.append(f"https://{RENDER_EXTERNAL_HOSTNAME}")  # noqa: F405
