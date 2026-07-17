from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
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
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
