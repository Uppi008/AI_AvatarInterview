import os

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

# django_asgi_app must be constructed before importing anything that touches
# models, so Channels' app registry is populated first.
django_asgi_app = get_asgi_application()

from apps.interviews.middleware import JWTAuthMiddlewareStack  # noqa: E402
from apps.interviews.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        # JWT (not Django sessions) is the app's auth scheme everywhere else,
        # so the WebSocket handshake is authenticated the same way.
        "websocket": JWTAuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
    }
)
