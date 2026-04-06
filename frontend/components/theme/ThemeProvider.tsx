"use client";

import { useEffect } from "react";
import { useUIStore } from "@/stores/ui";

const STORAGE_KEY = "meowone-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "light" || v === "dark") setTheme(v);
    } catch {
      /* ignore */
    }
  }, [setTheme]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  return <>{children}</>;
}
