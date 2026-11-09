"use client";

import { House, ListChecks, ReceiptText, UtensilsCrossed, WashingMachine, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function Tab({ href, label, Icon }: { href: string; label: string; Icon: LucideIcon }) {
  const active = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${active ? "text-foreground" : "text-muted"}`}
    >
      <span className={`flex h-8 w-14 items-center justify-center rounded-full ${active ? "bg-accent-soft" : ""}`}>
        <Icon aria-hidden="true" className="size-5" />
      </span>
      {label}
    </Link>
  );
}

export function BottomNav() {
  return (
    <nav aria-label="Main" className="grid grid-cols-5 border-t border-separator bg-surface px-1 pb-[env(safe-area-inset-bottom)]">
      <Tab href="/" label="Home" Icon={House} />
      <Tab href="/todo" label="To-do" Icon={ListChecks} />
      <Tab href="/dinner" label="Dinner" Icon={UtensilsCrossed} />
      <Tab href="/chores" label="Chores" Icon={WashingMachine} />
      <Tab href="/bills" label="Bills" Icon={ReceiptText} />
    </nav>
  );
}
