"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { BookOpen, HandHeart, ListChecks, Sparkles, Receipt } from "lucide-react";

const TABS = [
  { href: "/", label: "Today", icon: BookOpen },
  { href: "/todo", label: "To-do", icon: ListChecks },
  { href: "/chores", label: "Chores", icon: Sparkles },
  { href: "/bills", label: "Bills", icon: Receipt },
  { href: "/doa", label: "Doa", icon: HandHeart },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 px-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
      <ul className="mx-auto flex max-w-md gap-1 rounded-[1.75rem] border border-line bg-card/85 p-1.5 shadow-[0_12px_30px_-12px_rgba(40,50,30,0.35)] backdrop-blur-md">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-3xl text-xs font-medium transition-colors ${active ? "text-ink" : "text-ink-soft"}`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-3xl bg-accent-soft"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon className="relative size-5" strokeWidth={active ? 2.2 : 1.8} />
                <span className="relative">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
