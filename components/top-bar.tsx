"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, Settings2 } from "lucide-react";

const TITLES: Record<string, string> = { "/": "Today", "/todo": "To-do", "/chores": "Chores", "/bills": "Bills", "/settings": "Settings" };

/** iOS-style bar: clear over the page's big title, then solid with a small title once that title scrolls away. */
export function TopBar() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 64); // roughly when the big title has gone under the bar
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [path]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-20 pt-[env(safe-area-inset-top)] transition-[background-color,border-color] duration-200 ${scrolled ? "border-b border-line bg-paper/85 backdrop-blur-md" : "border-b border-transparent"}`}
    >
      <div className="mx-auto grid h-11 max-w-md grid-cols-[1fr_auto_1fr] items-center px-3">
        <div>
          {path === "/settings" && (
            <Link href="/" className="-ml-1 inline-flex min-h-11 items-center gap-0.5 pr-3 text-ink-soft">
              <ChevronLeft className="size-5" /> Today
            </Link>
          )}
        </div>
        <p aria-hidden={!scrolled} className={`font-serif text-base font-medium transition-opacity duration-200 ${scrolled ? "opacity-100" : "opacity-0"}`}>
          {TITLES[path]}
        </p>
        <div className="flex justify-end">
          {path !== "/settings" && (
            <Link href="/settings" aria-label="Settings" className="grid size-11 place-items-center rounded-full text-ink-soft transition-transform active:scale-95">
              <Settings2 className="size-5" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
