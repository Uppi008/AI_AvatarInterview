import { useEffect, useRef } from "react";

import type { ProctoringEventType } from "../ws-types";

type OnViolation = (eventType: ProctoringEventType, metadata?: Record<string, unknown>) => void;

/** Browser-level proctoring signals that don't need camera access:
 * tab switching, window losing focus, going offline, and a best-effort
 * refresh/close signal.
 *
 * `browser_refresh` is sent from a `beforeunload` handler, which the
 * browser gives very little time to run -- the WS message may not reach
 * the server before the connection tears down. That's a known limitation
 * here, not a bug: a reliable version would need `navigator.sendBeacon`
 * to a cookie- or header-free endpoint, which the JWT-authenticated REST
 * API doesn't offer.
 */
export function useBrowserSignals(onViolation: OnViolation, enabled: boolean) {
  const onViolationRef = useRef(onViolation);
  onViolationRef.current = onViolation;

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        onViolationRef.current("tab_switch");
      }
    };
    const handleBlur = () => onViolationRef.current("window_minimized");
    const handleBeforeUnload = () => onViolationRef.current("browser_refresh");
    const handleOffline = () => onViolationRef.current("internet_disconnected");

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("offline", handleOffline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("offline", handleOffline);
    };
  }, [enabled]);
}
