"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
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
            // With six tabs on a 375pt iPhone the icon tabs give up a few px (~39 wide, still 44 tall); the chip never shrinks.
            className={cx("relative flex h-11 items-center justify-center [&_svg]:size-5", on ? "shrink-0 gap-2 px-3.5 text-on-fill" : "w-11 [&_svg]:size-[22px]")}
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

/** What a day holds: shift bars (a person fill class each), one dot per kind of thing, and words for screen readers. */
export type DayMarks = { shifts?: string[]; dots?: Tone[]; label?: string };

/**
 * Seven days you can pick from. The picked day is an ink pill that slides; today keeps a ring.
 * Swipe sideways (or the hidden prev/next buttons) to page a week with `onWeek`.
 */
export function WeekStrip({ days, today, value, onChange, onWeek, marks = {} }: { days: readonly string[]; today: string; value: string; onChange: (d: string) => void; onWeek?: (dir: -1 | 1) => void; marks?: Partial<Record<string, DayMarks>> }) {
  const week = (dir: -1 | 1) => onWeek?.(dir);
  // Which way the last page went, so the new week slides in from that side.
  const [seen, setSeen] = useState({ first: days[0], dir: 1 });
  const dragged = useRef(false);
  if (seen.first !== days[0]) setSeen({ first: days[0], dir: days[0] > seen.first ? 1 : -1 });
  return (
    <div role="group" aria-label="Week" className="relative overflow-hidden rounded-card border-2 border-edge-card bg-surface text-fg">
      {onWeek && (
        <button type="button" onClick={() => week(-1)} className="sr-only focus:not-sr-only focus:absolute focus:left-1 focus:top-1 focus:z-10">
          Previous week
        </button>
      )}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.ol
          key={days[0]}
          initial={{ opacity: 0, x: 60 * seen.dir }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 * seen.dir }}
          transition={{ type: "spring", stiffness: 420, damping: 38 }}
          drag={onWeek ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.25}
          onPointerDown={() => (dragged.current = false)}
          onDragStart={() => (dragged.current = true)}
          onClickCapture={(e) => dragged.current && e.stopPropagation()} // a swipe isn't a tap on the day under the finger
          onDragEnd={(_, i) => Math.abs(i.offset.x) > 50 && week(i.offset.x > 0 ? -1 : 1)}
          className="grid touch-pan-y grid-cols-7 gap-0.5 px-1.5 py-1.5"
        >
          {days.map((d) => {
            const on = d === value;
            const m = marks[d] ?? {};
            return (
              <li key={d}>
                <button
                  type="button"
                  aria-pressed={on}
                  aria-label={[formatDay(d, { weekday: "long", day: "numeric", month: "long" }), d === today && "today", m.label].filter(Boolean).join(", ")}
                  onClick={() => onChange(d)}
                  className="relative flex h-[70px] w-full flex-col items-center justify-center gap-0.5 rounded-control transition-transform active:scale-95"
                >
                  {on && <motion.span layoutId="week-pick" aria-hidden className="absolute inset-0 rounded-control border-2 border-fg bg-fg" transition={{ type: "spring", stiffness: 520, damping: 36 }} />}
                  <span aria-hidden className={cx("relative text-[11px] font-semibold", on ? "font-bold text-page" : "text-muted")}>{weekday(d)}</span>
                  <span
                    aria-hidden
                    className={cx(
                      "relative grid size-7 place-items-center rounded-full font-display text-[17px] font-bold leading-none",
                      on ? "text-page" : d < today && "text-muted",
                      d === today && !on && "ring-2 ring-fg",
                    )}
                  >
                    {dayNum(d)}
                  </span>
                  <span aria-hidden className="relative flex h-[5px] items-center gap-0.5">
                    {m.shifts?.map((fill, i) => <span key={i} className={cx("h-[5px] w-2.5 rounded-full border border-edge-on-fill", fill)} />)}
                    {m.dots?.map((t) => <span key={t} className={cx("size-[5px] rounded-full border border-edge-on-fill", FILL[t])} />)}
                  </span>
                </button>
              </li>
            );
          })}
        </motion.ol>
      </AnimatePresence>
      {onWeek && (
        <button type="button" onClick={() => week(1)} className="sr-only focus:not-sr-only focus:absolute focus:right-1 focus:top-1 focus:z-10">
          Next week
        </button>
      )}
    </div>
  );
}
