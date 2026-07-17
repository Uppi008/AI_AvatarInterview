import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { setTheme, toggleTheme, type Theme } from "@/features/ui/uiSlice";

export function useTheme() {
  const theme = useAppSelector((state) => state.ui.theme);
  const dispatch = useAppDispatch();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return {
    theme,
    setTheme: (value: Theme) => dispatch(setTheme(value)),
    toggleTheme: () => dispatch(toggleTheme()),
  };
}
