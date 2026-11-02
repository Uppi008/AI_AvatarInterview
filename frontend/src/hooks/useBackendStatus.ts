import { useEffect, useState } from "react";

import { isBackendReachable } from "@/services/apiClient";

export type BackendStatus = "checking" | "online" | "offline";

const RETRY_MS = 15_000;

/** Probes the API's health endpoint, re-checking every RETRY_MS while it is
 * unreachable, so the UI can explain a sleeping/down server up front. */
export function useBackendStatus(): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>("checking");

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const check = async () => {
      const ok = await isBackendReachable();
      if (cancelled) return;
      setStatus(ok ? "online" : "offline");
      if (!ok) timer = window.setTimeout(() => void check(), RETRY_MS);
    };
    void check();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  return status;
}
