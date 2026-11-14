"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, Settings2 } from "lucide-react";
import { iconButtonClass } from "@/components/kit/button";
import { cx } from "@/components/kit/shared";

const TITLES: Record<string, string> = { "/": "Today", "/todo": "To-do", "/chores": "Chores", "/doa": "Doa", "/settings": "Settings" };

/** Clear over the page's big title, then solid with a small title once that title scrolls away. Settings gear on every screen but Settings. */
export function TopBar() {
  const path = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 64); // roughly when the big title has gone under the bar
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [path]);

  return (
    <header
      className={cx(
        "pointer-events-none fixed inset-x-0 top-0 z-20 pt-[env(safe-area-inset-top)] transition-[background-color,border-color] duration-200",
        scrolled ? "border-b-2 border-edge-card bg-page" : "border-b-2 border-transparent",
      )}
    >
      <div className="mx-auto grid h-[52px] max-w-md grid-cols-[1fr_auto_1fr] items-center pl-5 pr-[22px]">
        <div className="pointer-events-auto">
          {path === "/settings" && (
            <Link
              href="/"
              aria-label="Back"
              className={iconButtonClass}
              // Back to whichever tab opened Settings; fall back to Today when Settings was the first page (fresh PWA launch).
              onClick={(e) => {
                if (history.length > 1) {
                  e.preventDefault();
                  router.back();
                }
              }}
            >
              <ChevronLeft aria-hidden strokeWidth={2.4} />
            </Link>
          )}
        </div>
        <p aria-hidden={!scrolled} className={cx("font-display text-base font-bold transition-opacity duration-200", scrolled ? "opacity-100" : "opacity-0")}>
          {TITLES[path]}
        </p>
        <div className="pointer-events-auto flex justify-end">
          {path !== "/settings" && (
            <Link href="/settings" aria-label="Settings" className={iconButtonClass}>
              <Settings2 aria-hidden strokeWidth={2.2} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
