"use client";

import { Button } from "@heroui/react";
import { SunMoon } from "lucide-react";

export function ThemeToggle() {
  return (
    <Button
      variant="tertiary"
      isIconOnly
      className="size-11"
      aria-label="Switch between light and dark mode"
      onPress={() => {
        const root = document.documentElement;
        const next = root.dataset.theme === "dark" ? "light" : "dark";
        root.dataset.theme = next;
        localStorage.setItem("theme", next);
        document
          .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
          .forEach((meta) => (meta.content = next === "dark" ? "#121218" : "#f6f6fb"));
      }}
    >
      <SunMoon aria-hidden="true" className="size-5" />
    </Button>
  );
}
