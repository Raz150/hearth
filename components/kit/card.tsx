"use client";

import { useState, type HTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Heart } from "lucide-react";
import { cx, FILL, HIT_44, META, PRESS, type Tone } from "./shared";

/** Depth: info = border only (lists, tables) · interactive = hard shadow (things you tap) · hero = stacked shadow (one per screen). */
export type Level = "info" | "interactive" | "hero";

const LEVEL: Record<Level, string> = {
  info: "border-edge-card",
  interactive: "border-edge-card shadow-hard",
  hero: "border-edge-hero shadow-hero",
};

export const cardClass = (level: Level = "info") => cx("rounded-card border-2 bg-surface text-fg", LEVEL[level]);

export function Card({ level, className, ...props }: HTMLAttributes<HTMLDivElement> & { level?: Level }) {
  return <div className={cx(cardClass(level), "p-3.5", className)} {...props} />;
}

/** A link or a plain box: tappable cards get the press motion. */
function Tappable({ href, className, children }: { href?: string; className: string; children: ReactNode }) {
  return href ? (
    <Link href={href} className={cx("block", PRESS, className)}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}

/** 88-tall category tile: icon on top, number + label at the bottom. Money numbers are 20 instead of 24. */
export function StatTile({ tone, icon, value, label, href }: { tone: Tone; icon: ReactNode; value: ReactNode; label: string; href?: string }) {
  return (
    <Tappable
      href={href}
      className={cx("flex h-[88px] flex-col justify-between rounded-card border-2 border-edge-on-fill px-3 py-2.5 text-on-fill shadow-hard [&_svg]:size-5", FILL[tone])}
    >
      <span aria-hidden>{icon}</span>
      <span className="flex flex-col">
        <span className={cx("font-display font-bold leading-[1.1]", tone === "money" ? "text-xl" : "text-2xl")}>{value}</span>
        <span className="text-xs font-semibold">{label}</span>
      </span>
    </Tappable>
  );
}

/**
 * The note between you two: the one loud thing. Title bar with a real heart button (leave `onHeart` out on your
 * own note), typewriter text, then meta and the Reply pill. Pass `children` to show an editor in place of the text.
 */
export function NoteWindow({
  title,
  text,
  meta,
  hearted,
  heartLabel,
  onHeart,
  action,
  onAction,
  children,
}: {
  title: string;
  text?: string;
  meta?: string;
  hearted?: boolean;
  heartLabel?: string;
  onHeart?: () => void;
  action?: string;
  onAction?: () => void;
  children?: ReactNode;
}) {
  const [pops, setPops] = useState(0);
  return (
    <article className="overflow-hidden rounded-card border-2 border-edge-hero bg-surface-note text-fg shadow-hero">
      <header className="flex h-[34px] items-center justify-between border-b-2 border-edge-on-fill bg-money pl-3.5 pr-2.5 text-on-fill">
        <h2 className="font-display text-[13px] font-bold">{title}</h2>
        {onHeart && (
          <button
            type="button"
            aria-pressed={hearted}
            aria-label={hearted ? "Heart sent" : heartLabel}
            disabled={hearted}
            onClick={() => {
              setPops((n) => n + 1);
              onHeart();
            }}
            className={cx("flex size-[26px] items-center justify-center rounded-[6px] border-[1.5px] border-edge-on-fill", hearted ? "bg-shopping" : "bg-surface", HIT_44)}
          >
            <motion.span key={pops} initial={pops ? { scale: 0.3 } : false} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 600, damping: 12 }}>
              <Heart aria-hidden className={cx("size-3.5 text-on-fill", hearted ? "fill-surface-note" : "fill-shopping")} strokeWidth={2.2} />
            </motion.span>
          </button>
        )}
      </header>
      <div className="flex flex-col gap-3.5 px-4 pb-3.5 pt-4">
        {children ?? <p className="font-note text-[21px] leading-[1.3]">{text}</p>}
        {!children && (meta || action) && (
          <div className="flex items-center justify-between gap-3">
            <span className={META}>{meta}</span>
            {action && (
              <button type="button" onClick={onAction} className={cx("h-[34px] shrink-0 rounded-full border-2 border-edge-on-fill bg-chores px-4 text-[13px] font-bold text-on-fill", HIT_44)}>
                {action}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

/** Event with a big time on the right, e.g. "Dinner at Mak's · 7:30 PM". */
export function EventCard({ title, meta, time, period, href }: { title: string; meta: string; time: string; period?: string; href?: string }) {
  return (
    <Tappable href={href} className={cx(cardClass("interactive"), "flex items-center justify-between gap-3 p-3.5")}>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-display text-[17px] font-bold">{title}</span>
        <span className={META}>{meta}</span>
      </span>
      <span className="shrink-0 font-display text-[28px] font-bold tracking-[-1px]">
        {time}
        {period && <span className="text-xs tracking-normal"> {period}</span>}
      </span>
    </Tappable>
  );
}

/** Category-filled card for something special, e.g. "Date night". */
export function HighlightCard({ tone, icon, title, meta, href }: { tone: Tone; icon: ReactNode; title: string; meta: string; href?: string }) {
  return (
    <Tappable href={href} className={cx("flex flex-col gap-2 rounded-card border-2 border-edge-on-fill p-3.5 text-on-fill shadow-hard", FILL[tone])}>
      <span aria-hidden className="flex size-[30px] items-center justify-center rounded-full border-2 border-edge-card bg-surface text-fg [&_svg]:size-4">
        {icon}
      </span>
      <span className="font-display text-[22px] font-bold leading-[1.1]">{title}</span>
      <span className="text-xs font-semibold">{meta}</span>
    </Tappable>
  );
}

/** Dashed "nothing here" box with one action. */
export function EmptyState({ icon, title, action, onAction }: { icon: ReactNode; title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-card border-2 border-dashed border-edge-control p-[18px] text-center text-fg">
      <span aria-hidden className="flex size-11 items-center justify-center rounded-control border-[1.5px] border-dashed border-edge-control bg-chores-tint [&_svg]:size-[22px]">
        {icon}
      </span>
      <p className="font-display text-[15px] font-bold">{title}</p>
      {action && (
        <button type="button" onClick={onAction} className={cx("h-9 rounded-[10px] border-2 border-edge-control bg-surface px-3.5 text-[13px] font-bold", HIT_44)}>
          {action}
        </button>
      )}
    </div>
  );
}
