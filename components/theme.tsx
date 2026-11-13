"use client";

import { useEffect, useState } from "react";
import { THEME_COLOR } from "@/lib/theme-color";

export type ThemeChoice = "system" | "light" | "dark";

// The choice lives in a cookie so the server can put data-theme on <html> in the very first HTML: no flash, no script.
function apply(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") delete root.dataset.theme;
  else root.dataset.theme = choice;
  document.cookie = choice === "system" ? "theme=; path=/; max-age=0; samesite=lax" : `theme=${choice}; path=/; max-age=31536000; samesite=lax`;
  const dark = choice === "dark" || (choice === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  // Keep Safari's toolbar colour in step without a reload.
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", THEME_COLOR[dark ? "dark" : "light"]));
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    if (t === "light" || t === "dark") setChoice(t); // eslint-disable-line react-hooks/set-state-in-effect -- read once after hydration
  }, []);
  return {
    choice,
    setTheme(next: ThemeChoice) {
      setChoice(next);
      apply(next);
    },
  };
}
