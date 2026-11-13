"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { inkText, type Member } from "@/lib/mock";

/** Rubber stamp that thumps down, e.g. "PAID 7 NOV". */
export function Stamp({ show, ink, children }: { show: boolean; ink: string; children: ReactNode }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          aria-hidden
          initial={{ scale: 1.8, opacity: 0, rotate: -24 }}
          animate={{ scale: 1, opacity: 0.9, rotate: -10 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}
          className="inline-block whitespace-nowrap rounded-md border-2 px-2 py-0.5 font-hand text-xs tracking-[0.15em] uppercase"
          style={{ borderColor: ink, color: inkText(ink) }}
        >
          {children}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return (
    <main className="relative z-10 mx-auto max-w-md px-5 pt-[calc(env(safe-area-inset-top)+1.75rem)] pb-[calc(env(safe-area-inset-bottom)+7rem)]">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </main>
  );
}

export function PageHeader({ kicker, title, aside }: { kicker: string; title: string; aside?: ReactNode }) {
  return (
    <header className="mb-7 flex items-end justify-between gap-4">
      <div>
        <p className="font-hand text-base leading-none text-accent">{kicker}</p>
        <h1 className="mt-1 font-serif text-4xl font-medium tracking-tight [font-variation-settings:'SOFT'_100]">{title}</h1>
      </div>
      {aside}
    </header>
  );
}

export function Section({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return (
    <section className="mb-8">
      <div className="mb-2 flex items-baseline justify-between border-b border-dashed border-line pb-1.5">
        <h2 className="font-serif text-lg italic text-ink-soft">{title}</h2>
        {note && <span className="font-hand text-sm text-ink-soft">{note}</span>}
      </div>
      {children}
    </section>
  );
}

/** A person's name typed in their ink. */
export function Who({ member, prefix }: { member?: Member; prefix?: string }) {
  if (!member) return null;
  return (
    <span className="font-hand text-sm" style={{ color: inkText(member.ink) }}>
      {prefix}
      {member.name}
    </span>
  );
}

/** Round check that fills with the doer's ink and draws a tick. */
export function InkCheck({ done, ink, onToggle, label }: { done: boolean; ink?: string; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={done}
      aria-label={label}
      className="grid size-11 shrink-0 place-items-center rounded-full active:scale-90 transition-transform"
    >
      <motion.span
        className="grid size-7 place-items-center rounded-full border-2"
        animate={{ borderColor: done ? ink : "var(--ink-soft)", backgroundColor: done ? ink : "rgba(0,0,0,0)" }}
        transition={{ duration: 0.2 }}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={false} animate={{ pathLength: done ? 1 : 0 }} transition={{ duration: 0.3, delay: done ? 0.08 : 0 }} />
        </svg>
      </motion.span>
    </button>
  );
}

/** Text with a hand-drawn strike-through in the doer's ink. */
export function Struck({ done, ink, children }: { done: boolean; ink?: string; children: ReactNode }) {
  return (
    <span className="relative inline">
      <span className={done ? "text-ink-soft transition-colors" : "transition-colors"}>{children}</span>
      <motion.span
        aria-hidden
        className="pointer-events-none absolute left-[-2px] right-[-2px] top-1/2 h-[2px] origin-left -rotate-1 rounded-full"
        style={{ backgroundColor: ink }}
        initial={false}
        animate={{ scaleX: done ? 1 : 0 }}
        transition={{ duration: 0.35, ease: [0.65, 0, 0.35, 1] }}
      />
    </span>
  );
}

/** A strip of washi tape; place inside a `relative` parent. */
export function Tape({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute -top-2.5 z-10 h-5 w-20 bg-accent-soft/80 shadow-sm [mask-image:linear-gradient(90deg,transparent_0,#000_4px,#000_calc(100%-4px),transparent_100%)] ${className}`}
    />
  );
}

/** Paper card; uneven corner radii read as hand-cut rather than machine-perfect. */
export function Card({ children, className = "", tape }: { children: ReactNode; className?: string; tape?: boolean }) {
  return (
    <div
      className={`relative rounded-[1.1rem_0.85rem_1.2rem_0.95rem] border border-line bg-card shadow-[0_1px_0_var(--line),0_10px_24px_-18px_rgba(40,50,30,0.35)] ${className}`}
    >
      {tape && <Tape className="left-1/2 -translate-x-1/2 rotate-[-3deg]" />}
      {children}
    </div>
  );
}

const PETALS = Array.from({ length: 22 }, (_, i) => ({
  x: (i * 47) % 100, // spread across the screen without Math.random (keeps render pure)
  delay: (i % 7) * 0.09,
  drift: ((i * 29) % 60) - 30,
  spin: ((i * 83) % 360) - 180,
  size: 8 + ((i * 13) % 8),
}));

/** Gentle shower of petals in both inks. Re-key to replay. */
export function Petals({ inks }: { inks: string[] }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {PETALS.map((p, i) => (
        <motion.span
          key={i}
          className="absolute -top-6 rounded-[60%_0_60%_0]"
          style={{ left: `${p.x}%`, width: p.size, height: p.size * 1.4, backgroundColor: inks[i % inks.length] }}
          initial={{ y: 0, x: 0, rotate: 0, opacity: 0.95 }}
          animate={{ y: "105vh", x: p.drift, rotate: p.spin, opacity: [0.95, 0.95, 0] }}
          transition={{ duration: 2.6, delay: p.delay, ease: [0.25, 0.6, 0.4, 1] }}
        />
      ))}
    </div>
  );
}
