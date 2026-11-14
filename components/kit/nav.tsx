"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { ChevronLeft } from "lucide-react";
import { formatDay } from "@/lib/date";
import { iconButtonClass } from "./button";
import { cx, FILL, type Tone } from "./shared";

/** Back · title · action. `action` is usually an <IconButton>. */
export function TopBar({ title, back, action }: { title: string; back?: string; action?: ReactNode }) {
  return (
    <header className="flex h-14 items-center justify-between gap-2">
      {back ? (
        <Link href={back} aria-label="Back" className={iconButtonClass}>
          <ChevronLeft aria-hidden strokeWidth={2.4} />
        </Link>
      ) : (
        <span className="size-11" />
      )}
      <h1 className="truncate font-display text-[19px] font-bold">{title}</h1>
      {action ?? <span className="size-11" />}
    </header>
  );
}

export type Tab = { href: string; label: string; icon: ReactNode };

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));

/** Floating tab bar. The active tab is a peach chip with its label; the chip slides between tabs. */
export function TabBar({ tabs, floating = true }: { tabs: readonly Tab[]; floating?: boolean }) {
  const path = usePathname();
  return (
    <nav
      aria-label="Main"
      className={cx(
        "flex h-[62px] items-center justify-between rounded-nav border-2 border-edge-card bg-surface-sunken px-2 text-fg shadow-hard",
        floating && "fixed inset-x-[18px] bottom-[calc(26px+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md",
      )}
    >
      {tabs.map((t) => {
        const on = isActive(path, t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? "page" : undefined}
            aria-label={on ? undefined : t.label}
            className={cx("relative flex h-11 items-center justify-center [&_svg]:size-5", on ? "gap-2 px-3.5 text-on-fill" : "w-11 [&_svg]:size-[22px]")}
          >
            {on && <motion.span layoutId="tab-chip" aria-hidden className="absolute inset-0 rounded-control border-2 border-edge-on-fill bg-hero" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            <span aria-hidden className="relative">
              {t.icon}
            </span>
            {on && <span className="relative font-display text-[15px] font-bold">{t.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

const weekday = (d: string) => formatDay(d, { weekday: "short" });
const dayNum = (d: string) => formatDay(d, { day: "numeric" });

/** Pick a day (YYYY-MM-DD). Days before `today` are muted. */
export function DayPicker({ days, value, today, onChange }: { days: readonly string[]; value: string; today: string; onChange: (d: string) => void }) {
  return (
    <div role="group" aria-label="Day" className="grid auto-cols-fr grid-flow-col items-center rounded-card border-2 border-edge-card bg-surface p-2 text-fg shadow-hard">
      {days.map((d) => {
        const on = d === value;
        return (
          <button
            key={d}
            type="button"
            aria-pressed={on}
            aria-label={formatDay(d, { weekday: "long", day: "numeric", month: "long" })}
            onClick={() => onChange(d)}
            className={cx("flex h-[60px] flex-col items-center justify-center rounded-control", on && "border-2 border-edge-on-fill bg-chores text-on-fill")}
          >
            {on ? (
              <>
                <span className="text-[11px] font-bold">{weekday(d)}</span>
                <span className="font-display text-xl font-bold">{dayNum(d)}</span>
              </>
            ) : (
              <>
                <span className={cx("font-display text-[17px] font-bold", d < today && "text-muted")}>{dayNum(d)}</span>
                <span className="text-[11px] font-semibold text-muted">{weekday(d)}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Seven days with today as an ink pill and 5px event dots. Info level: you read it, you don't tap it. */
export function WeekStrip({ days, today, dots = {} }: { days: readonly string[]; today: string; dots?: Partial<Record<string, Tone>> }) {
  return (
    <ol className="grid grid-cols-7 items-center gap-0.5 rounded-card border-2 border-edge-card bg-surface px-2 pb-2 pt-2.5 text-fg">
      {days.map((d) => {
        const dot = dots[d];
        const extra = <span className="sr-only">{(d === today ? ", today" : "") + (dot ? ", has plans" : "")}</span>;
        return d === today ? (
          <li key={d} className="flex h-[62px] flex-col items-center justify-center gap-px rounded-control border-2 border-fg bg-fg text-page">
            <span className="text-[11px] font-bold">{weekday(d)}</span>
            <span className="font-display text-xl font-bold leading-none">{dayNum(d)}</span>
            {dot && <span className={cx("size-[5px] rounded-full", FILL[dot])} />}
            {extra}
          </li>
        ) : (
          <li key={d} className="flex flex-col items-center gap-0.5">
            <span className={cx("font-display text-[17px] font-bold", d < today && "text-muted")}>{dayNum(d)}</span>
            <span className="text-[11px] text-muted">{weekday(d)}</span>
            {dot && <span className={cx("size-[5px] rounded-full border border-edge-on-fill", FILL[dot])} />}
            {extra}
          </li>
        );
      })}
    </ol>
  );
}
