from django.db import connection
from django.http import JsonResponse


def health_check(request):
    """Liveness/readiness probe for orchestrators/load balancers.

    Deliberately unauthenticated and outside /api/v1/ (not a versioned API
    contract) -- just confirms the process is up and can reach its database.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception as exc:
        return JsonResponse({"status": "error", "detail": str(exc)}, status=503)

    return JsonResponse({"status": "ok"})
