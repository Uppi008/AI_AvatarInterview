import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """Wraps DRF's default handler so every error response has the same
    shape: {"success": False, "error": {"code": ..., "detail": ..., "fields": ...}}.
    """
    response = drf_exception_handler(exc, context)

    if response is None:
        # Not a DRF-recognized exception (APIException/Http404/PermissionDenied)
        # -- e.g. a plain RuntimeError from a misconfigured integration, like
        # GROQ_API_KEY being unset. Left as-is, DRF hands this to Django's
        # default handling, which returns a bare HTML/empty 500 with none of
        # this envelope -- exactly what the frontend's getApiErrorMessage()
        # can't parse, so every such failure looks like an identical generic
        # "try again" with no hint of what actually broke. Log the real
        # exception (with traceback) server-side and still return the
        # envelope, so the failure is at least visible as a real 500 in the
        # browser's network tab instead of silently falling through.
        logger.exception("Unhandled exception in %s", context.get("view"))
        return Response(
            {
                "success": False,
                "error": {
                    "code": exc.__class__.__name__,
                    "detail": "Something went wrong on our end. Please try again.",
                    "fields": None,
                },
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    detail = response.data
    fields = None
    if isinstance(detail, dict) and not any(k in detail for k in ("detail", "non_field_errors")):
        fields = detail
        detail = "Validation failed."
    elif isinstance(detail, dict):
        detail = detail.get("detail") or detail.get("non_field_errors") or detail

    response.data = {
        "success": False,
        "error": {
            "code": exc.__class__.__name__,
            "detail": detail,
            "fields": fields,
        },
    }
    return response
