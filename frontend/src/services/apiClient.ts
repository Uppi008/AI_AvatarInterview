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
  // Without this, a hung backend request (e.g. a free-tier host waking from
  // an idle spin-down) leaves the UI spinning forever instead of surfacing
  // a clear, retryable error.
  timeout: 60_000,
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

/**
 * Polls the backend's /healthz/ until it answers (or `maxWaitMs` passes).
 *
 * Render's free plan spins the backend down after ~15 min idle, and a cold
 * start takes 1-2 minutes. During that window Render's proxy answers with an
 * error page that has no CORS headers, so the browser reports a bare network
 * error and auth requests fail with no usable message. Waking it first lets
 * the real request land on a running server. Never throws: if the deadline
 * passes, the caller's own request surfaces the error.
 */
function healthUrl(): string | null {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (!base) return null;
  return new URL("/healthz/", new URL(base, window.location.origin)).toString();
}

/** One health probe: true if the backend answered within `timeoutMs`. */
export async function isBackendReachable(timeoutMs = 8_000): Promise<boolean> {
  const url = healthUrl();
  if (!url) return true;
  try {
    await axios.get(url, { timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

export async function wakeBackend(maxWaitMs = 150_000): Promise<void> {
  const url = healthUrl();
  if (!url) return;
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    try {
      await axios.get(url, { timeout: 20_000 });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 3_000));
    }
  }
}

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
    // No response at all: timeout, DNS/network failure, or a CORS-less error
    // page from the host's proxy while the backend is still starting up.
    if (!error.response) {
      return "Can't reach the server right now -- it may be starting up. Please wait a minute and try again.";
    }
    const payload = error.response.data as ApiErrorPayload | undefined;
    // Field errors are more specific than the envelope's generic
    // "Validation failed." detail, so prefer them when present.
    if (payload?.error?.fields) {
      const first = Object.values(payload.error.fields)[0];
      if (Array.isArray(first)) return first[0];
    }
    const detail = payload?.error?.detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}
