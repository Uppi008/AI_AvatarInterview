import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { logout as logoutAction } from "@/features/auth/authSlice";
import { tokenStorage } from "@/services/apiClient";

export function useAuth() {
  const user = useAppSelector((state) => state.auth.user);
  const status = useAppSelector((state) => state.auth.status);
  const dispatch = useAppDispatch();

  return {
    user,
    status,
    isAuthenticated: Boolean(user && tokenStorage.getAccess()),
    logout: () => dispatch(logoutAction()),
  };
}
