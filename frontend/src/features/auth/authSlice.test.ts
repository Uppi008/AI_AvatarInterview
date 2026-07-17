import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { tokenStorage } from "@/services/apiClient";

import { authApi } from "./authApi";
import authReducer, { fetchCurrentUser, login, logout, register } from "./authSlice";
import type { User } from "./types";

vi.mock("./authApi");

const mockUser: User = {
  id: "user-1",
  email: "demo@example.com",
  full_name: "Demo User",
  role: "student",
  preferred_language: "en",
  dark_mode_enabled: false,
  is_email_verified: true,
  created_at: "2026-01-01T00:00:00Z",
};

function makeStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

describe("authSlice", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("login", () => {
    it("stores tokens and the user on success", async () => {
      vi.mocked(authApi.login).mockResolvedValue({
        data: { access: "access-tok", refresh: "refresh-tok", user: mockUser },
      } as never);
      const store = makeStore();

      await store.dispatch(login({ email: mockUser.email, password: "pass" }));

      expect(store.getState().auth.user).toEqual(mockUser);
      expect(store.getState().auth.status).toBe("succeeded");
      expect(tokenStorage.getAccess()).toBe("access-tok");
      expect(tokenStorage.getRefresh()).toBe("refresh-tok");
    });

    it("surfaces an error message and doesn't store tokens on failure", async () => {
      vi.mocked(authApi.login).mockRejectedValue(new Error("Invalid credentials"));
      const store = makeStore();

      await store.dispatch(login({ email: "bad@example.com", password: "wrong" }));

      const state = store.getState().auth;
      expect(state.status).toBe("failed");
      expect(state.user).toBeNull();
      expect(tokenStorage.getAccess()).toBeNull();
    });
  });

  describe("register", () => {
    it("succeeds without logging the user in (email verification required)", async () => {
      vi.mocked(authApi.register).mockResolvedValue({
        data: { detail: "Check your email.", user: mockUser },
      } as never);
      const store = makeStore();

      await store.dispatch(
        register({ email: mockUser.email, full_name: "Demo", password: "pass", password_confirm: "pass" })
      );

      expect(store.getState().auth.status).toBe("succeeded");
      expect(tokenStorage.getAccess()).toBeNull();
    });
  });

  describe("fetchCurrentUser", () => {
    it("populates the user from /users/me/", async () => {
      vi.mocked(authApi.getMe).mockResolvedValue({
        data: { id: "p1", user: mockUser, phone_number: "", profile_photo: null, bio: "", date_of_birth: null, institution: "", graduation_year: null },
      } as never);
      const store = makeStore();

      await store.dispatch(fetchCurrentUser());

      expect(store.getState().auth.user).toEqual(mockUser);
    });

    it("clears the user when the session is invalid", async () => {
      vi.mocked(authApi.getMe).mockRejectedValue(new Error("401"));
      const store = configureStore({
        reducer: { auth: authReducer },
        preloadedState: { auth: { user: mockUser, status: "succeeded" as const, error: null } },
      });

      await store.dispatch(fetchCurrentUser());

      expect(store.getState().auth.user).toBeNull();
    });
  });

  describe("logout", () => {
    it("clears tokens and user state", () => {
      tokenStorage.set("a", "b");
      const store = configureStore({
        reducer: { auth: authReducer },
        preloadedState: { auth: { user: mockUser, status: "succeeded" as const, error: null } },
      });

      store.dispatch(logout());

      expect(store.getState().auth.user).toBeNull();
      expect(tokenStorage.getAccess()).toBeNull();
    });
  });
});
