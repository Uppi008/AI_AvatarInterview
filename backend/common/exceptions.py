import logging

from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """Wraps DRF's default handler so every error response has the same
    shape: {"success": False, "error": {"code": ..., "detail": ..., "fields": ...}}.
    """
    response = drf_exception_handler(exc, context)

    if response is None:
        logger.exception("Unhandled exception in %s", context.get("view"))
        return response

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
