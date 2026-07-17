import { useEffect, useState } from "react";

import { useAppDispatch } from "@/app/hooks";
import { fetchCurrentUser } from "@/features/auth/authSlice";
import { tokenStorage } from "@/services/apiClient";

/** Resolves the logged-in user (if any) from a stored token before the app
 * renders routes, so ProtectedRoute never has to guess at a loading state. */
export function useAuthBootstrap(): boolean {
  const dispatch = useAppDispatch();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!tokenStorage.getAccess()) {
      setInitialized(true);
      return;
    }
    void dispatch(fetchCurrentUser()).finally(() => setInitialized(true));
  }, [dispatch]);

  return initialized;
}
