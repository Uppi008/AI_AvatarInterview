import { apiClient } from "@/services/apiClient";
import type {
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  StudentProfile,
  User,
} from "./types";

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiClient.post<{ detail: string; user: User }>("/auth/register/", payload),

  login: (payload: LoginPayload) => apiClient.post<LoginResponse>("/auth/login/", payload),

  verifyEmail: (token: string) =>
    apiClient.post<{ detail: string; user: User }>("/auth/verify-email/", { token }),

  forgotPassword: (email: string) =>
    apiClient.post<{ detail: string }>("/auth/forgot-password/", { email }),

  resetPassword: (token: string, new_password: string) =>
    apiClient.post<{ detail: string }>("/auth/reset-password/", { token, new_password }),

  changePassword: (old_password: string, new_password: string) =>
    apiClient.post<{ detail: string }>("/auth/change-password/", { old_password, new_password }),

  googleLogin: (id_token: string) => apiClient.post<LoginResponse>("/auth/google/", { id_token }),

  getMe: () => apiClient.get<StudentProfile>("/users/me/"),

  updateMe: (payload: FormData | Partial<StudentProfile>) =>
    apiClient.patch<StudentProfile>("/users/me/", payload, {
      headers:
        payload instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
    }),
};
