import { useEffect, useState } from "react";

import { useAppDispatch } from "@/app/hooks";
import { fetchCurrentUser } from "@/features/auth/authSlice";
import { tokenStorage } from "@/services/apiClient";

/** Longest we hold the whole app on a spinner waiting for the backend. */
const BOOTSTRAP_TIMEOUT_MS = 6000;

/** Resolves the logged-in user (if any) from a stored token before the app
 * renders routes, so ProtectedRoute never has to guess at a loading state.
 *
 * Capped by BOOTSTRAP_TIMEOUT_MS: if the backend is asleep or down, the app
 * renders anyway (the login page must never depend on the API answering).
 * A late successful response still signs the user in via the auth slice. */
export function useAuthBootstrap(): boolean {
  const dispatch = useAppDispatch();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!tokenStorage.getAccess()) {
      setInitialized(true);
      return;
    }
    const timer = window.setTimeout(() => setInitialized(true), BOOTSTRAP_TIMEOUT_MS);
    void dispatch(fetchCurrentUser()).finally(() => {
      window.clearTimeout(timer);
      setInitialized(true);
    });
    return () => window.clearTimeout(timer);
  }, [dispatch]);

  return initialized;
}
