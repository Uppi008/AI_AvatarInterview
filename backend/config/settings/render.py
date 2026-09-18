"""
Render.com overrides on top of prod.py.

The VPS path in docs/DEPLOYMENT.md puts nginx in front of the backend
container, and nginx serves /static/ and /media/ directly from a shared
volume -- Django never touches those requests. Render's web services have
no such sidecar: this process is the only thing standing behind Render's
edge, so it has to serve its own static files. Whitenoise is layered in
here (not in prod.py) to keep that VPS path exactly as documented.
"""
import os

from .prod import *  # noqa: F401,F403

MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")  # noqa: F405

STORAGES["staticfiles"] = {  # noqa: F405
    "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"
}

# Render assigns a *.onrender.com hostname per service and exposes it via
# this env var -- append it so ALLOWED_HOSTS/CSRF_TRUSTED_ORIGINS don't need
# the exact value hardcoded into render.yaml before the first deploy.
RENDER_EXTERNAL_HOSTNAME = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)  # noqa: F405
    CSRF_TRUSTED_ORIGINS.append(f"https://{RENDER_EXTERNAL_HOSTNAME}")  # noqa: F405
