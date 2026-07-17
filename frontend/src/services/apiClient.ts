import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const ACCESS_TOKEN_KEY = "ai_avatar_access_token";
const REFRESH_TOKEN_KEY = "ai_avatar_refresh_token";

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  setAccess: (access: string) => localStorage.setItem(ACCESS_TOKEN_KEY, access),
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) {
    throw new Error("No refresh token available.");
  }
  const { data } = await axios.post<{ access: string }>(
    `${import.meta.env.VITE_API_BASE_URL}/auth/refresh/`,
    { refresh }
  );
  tokenStorage.setAccess(data.access);
  return data.access;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
        const newAccess = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(originalRequest);
      } catch {
        tokenStorage.clear();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

/** Shape of the {"success": false, "error": {...}} envelope common/exceptions.py returns. */
export interface ApiErrorPayload {
  success: false;
  error: {
    code: string;
    detail: string | Record<string, unknown>;
    fields: Record<string, string[]> | null;
  };
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as ApiErrorPayload | undefined;
    const detail = payload?.error?.detail;
    if (typeof detail === "string") return detail;
    if (payload?.error?.fields) {
      const first = Object.values(payload.error.fields)[0];
      if (Array.isArray(first)) return first[0];
    }
  }
  return fallback;
}
