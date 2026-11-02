import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { authApi } from "@/features/auth/authApi";
import { tokenStorage } from "@/services/apiClient";
import { makeTestStore } from "@/test/test-utils";

import { useAuthBootstrap } from "./useAuthBootstrap";

vi.mock("@/features/auth/authApi");

function wrapper({ children }: { children: ReactNode }) {
  return <Provider store={makeTestStore()}>{children}</Provider>;
}

describe("useAuthBootstrap", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("is initialized immediately when there is no stored token", () => {
    const { result } = renderHook(() => useAuthBootstrap(), { wrapper });

    expect(result.current).toBe(true);
    expect(authApi.getMe).not.toHaveBeenCalled();
  });

  it("stops blocking the app after the timeout when the backend never answers", async () => {
    // Regression: a sleeping/down backend left the whole app -- including the
    // login page -- on a blank spinner until the 60s request timeout.
    tokenStorage.set("access", "refresh");
    vi.mocked(authApi.getMe).mockReturnValue(new Promise(() => {}) as never);

    const { result } = renderHook(() => useAuthBootstrap(), { wrapper });
    expect(result.current).toBe(false);

    await act(async () => {
      vi.advanceTimersByTime(6000);
    });

    expect(result.current).toBe(true);
  });
});
