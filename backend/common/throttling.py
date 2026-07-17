class ScopedThrottleOnCreateMixin:
    """Applies `throttle_scope` only to the `create` action.

    DRF's ScopedRateThrottle reads `view.throttle_scope` for every action on
    a viewset, so a plain `throttle_scope = "resume_upload"` class attribute
    throttles list/retrieve too -- not just the upload it was meant for.
    Mix this in (after setting `throttle_scope`) to limit the mutating
    action alone.
    """

    def get_throttles(self):
        if self.action != "create":
            return []
        return super().get_throttles()
