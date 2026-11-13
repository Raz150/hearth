"use client";

import { useEffect, useState } from "react";

export type ThemeChoice = "system" | "light" | "dark";
const THEME_COLOR = { light: "#eef0df", dark: "#1a201b" };

/** Runs before paint (inlined in <head>) so the saved theme never flashes. */
export const themeScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

function apply(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") delete root.dataset.theme;
  else root.dataset.theme = choice;
  const dark = choice === "dark" || (choice === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  // Override Safari's toolbar colour; the media-query metas only know the system setting.
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", THEME_COLOR[dark ? "dark" : "light"]));
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  useEffect(() => {
    try {
      const t = localStorage.getItem("theme");
      if (t === "light" || t === "dark") setChoice(t); // eslint-disable-line react-hooks/set-state-in-effect -- read once after hydration
    } catch {}
  }, []);
  return {
    choice,
    setTheme(next: ThemeChoice) {
      setChoice(next);
      apply(next);
      try {
        if (next === "system") localStorage.removeItem("theme");
        else localStorage.setItem("theme", next);
      } catch {}
    },
  };
}
