import re

from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve as serve_static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from .views import health_check

urlpatterns = [
    path("healthz/", health_check, name="health-check"),
    path("django-admin/", admin.site.urls),
    # --- API schema / docs ---
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    # --- Domain APIs ---
    path("api/v1/auth/", include("apps.users.urls.auth_urls")),
    path("api/v1/users/", include("apps.users.urls.profile_urls")),
    path("api/v1/avatars/", include("apps.avatars.urls")),
    path("api/v1/resumes/", include("apps.resumes.urls")),
    path("api/v1/interviews/", include("apps.interviews.urls")),
    path("api/v1/monitoring/", include("apps.monitoring.urls")),
    path("api/v1/reports/", include("apps.reports.urls")),
    path("api/v1/admin/", include("apps.admin_panel.urls")),
    path("api/v1/career/", include("apps.career.urls")),
]

if settings.DEBUG or getattr(settings, "SERVE_MEDIA_FILES", False):
    # Not django.conf.urls.static.static(): that helper no-ops unless
    # settings.DEBUG is True, regardless of what this `if` evaluates to --
    # it has its own hardcoded DEBUG check baked in, so it can't be used to
    # serve media in a DEBUG=False environment like config.settings.render.
    urlpatterns += [
        re_path(
            r"^%s(?P<path>.*)$" % re.escape(settings.MEDIA_URL.lstrip("/")),
            serve_static,
            {"document_root": settings.MEDIA_ROOT},
        ),
    ]
