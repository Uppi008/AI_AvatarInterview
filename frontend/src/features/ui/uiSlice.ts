import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  const stored = localStorage.getItem("ai_avatar_theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

interface UiState {
  theme: Theme;
  sidebarOpen: boolean;
}

const initialState: UiState = {
  theme: getInitialTheme(),
  sidebarOpen: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload;
      localStorage.setItem("ai_avatar_theme", action.payload);
    },
    toggleTheme(state) {
      state.theme = state.theme === "light" ? "dark" : "light";
      localStorage.setItem("ai_avatar_theme", state.theme);
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
  },
});

export const { setTheme, toggleTheme, toggleSidebar } = uiSlice.actions;
export default uiSlice.reducer;
