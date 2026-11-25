import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import uiReducer, { setSidebarOpen, setTheme, toggleSidebar, toggleTheme } from "./uiSlice";

describe("uiSlice", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const initialState = { theme: "light" as const, sidebarOpen: false };

  it("toggleTheme flips light to dark and persists it", () => {
    const state = uiReducer(initialState, toggleTheme());

    expect(state.theme).toBe("dark");
    expect(localStorage.getItem("ai_avatar_theme")).toBe("dark");
  });

  it("toggleTheme flips dark back to light", () => {
    const state = uiReducer({ ...initialState, theme: "dark" }, toggleTheme());

    expect(state.theme).toBe("light");
  });

  it("setTheme sets an explicit value", () => {
    const state = uiReducer(initialState, setTheme("dark"));

    expect(state.theme).toBe("dark");
    expect(localStorage.getItem("ai_avatar_theme")).toBe("dark");
  });

  it("toggleSidebar flips sidebarOpen", () => {
    const state = uiReducer(initialState, toggleSidebar());

    expect(state.sidebarOpen).toBe(true);
    expect(uiReducer(state, toggleSidebar()).sidebarOpen).toBe(false);
  });

  it("setSidebarOpen sets an explicit value", () => {
    const open = uiReducer(initialState, setSidebarOpen(true));

    expect(open.sidebarOpen).toBe(true);
    expect(uiReducer(open, setSidebarOpen(false)).sidebarOpen).toBe(false);
    expect(uiReducer(initialState, setSidebarOpen(false)).sidebarOpen).toBe(false);
  });
});
