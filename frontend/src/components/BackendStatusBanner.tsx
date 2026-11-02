import { CloudOff, Loader2 } from "lucide-react";

import { useBackendStatus } from "@/hooks/useBackendStatus";

/** Explains, before the user tries to sign in, that the API can't be reached. */
export function BackendStatusBanner() {
  const status = useBackendStatus();
  if (status !== "offline") return null;

  return (
    <div
      role="status"
      className="relative z-20 mx-auto mb-2 flex max-w-3xl items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900 shadow-sm backdrop-blur dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-200"
    >
      <CloudOff className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold">Our server isn't responding right now</p>
        <p className="mt-0.5 text-amber-800/90 dark:text-amber-300/90">
          It may be waking up, which can take a minute. If this message stays, the service is temporarily down —
          please try again later.
        </p>
      </div>
      <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin opacity-60" aria-label="Retrying" />
    </div>
  );
}
