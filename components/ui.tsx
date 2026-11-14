"use client";

import type { ReactNode } from "react";
import { MotionConfig, motion } from "motion/react";
import { Avatar } from "@/components/kit/avatar";
import { useStore, type Member } from "@/lib/store";

/** Screen wrapper: 52 top (plus the notch), 20 left, 22 right for the hero offset, room for the tab bar below.
 *  No entrance animation: tab switches should feel instant, as on iOS. */
export function Page({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-[18px] pl-5 pr-[22px] pt-[calc(env(safe-area-inset-top)+52px)] pb-[calc(env(safe-area-inset-bottom)+120px)]">
      {children}
    </main>
  );
}

/** Motion follows the phone's Reduce Motion setting (springs, slides and confetti become instant). */
export function MotionPrefs({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Small meta line above a 30/700 title, e.g. "Saturday, 14 November" / "Our home". */
export function PageHeader({ kicker, title, aside }: { kicker: ReactNode; title: string; aside?: ReactNode }) {
  return (
    <header className="flex min-h-14 items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-[13px] font-semibold text-muted">{kicker}</p>
        <h1 className="font-display text-[30px] font-bold leading-none tracking-[-1px]">{title}</h1>
      </div>
      {aside}
    </header>
  );
}

/** Heading over a group that isn't inside a card. */
export function Section({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between px-0.5">
        <h2 className="font-display text-[15px] font-bold">{title}</h2>
        {note && <span className="text-xs font-semibold text-muted">{note}</span>}
      </div>
      {children}
    </section>
  );
}

/** Quiet empty line inside a card. */
export function Quiet({ children }: { children: ReactNode }) {
  return <p className="px-3.5 py-4 text-sm font-medium text-muted">{children}</p>;
}

/** A person's initial in their colour. */
export function Face({ member, size = 30 }: { member?: Member; size?: 18 | 30 | 38 | 48 }) {
  const s = useStore();
  const person = s.person(member?.id);
  if (!member || !person) return null;
  return <Avatar person={person} initial={member.name.slice(0, 1).toUpperCase()} size={size} />;
}

/** Both of you, overlapped (home header). */
export function Faces() {
  const s = useStore();
  return (
    <span className="inline-flex" aria-label={s.members.map((m) => m.name).join(" and ")}>
      {s.members.map((m, i) => (
        <span key={m.id} className={i ? "-ml-2" : undefined}>
          <Face member={m} size={38} />
        </span>
      ))}
    </span>
  );
}

/** A name in running text. */
export function Who({ member }: { member?: Member }) {
  return member ? <span className="font-semibold text-fg">{member.name}</span> : null;
}

const CONFETTI = ["bg-shopping", "bg-chores", "bg-money", "bg-hero", "bg-done", "bg-person-w"];
const PIECES = Array.from({ length: 24 }, (_, i) => ({
  x: (i * 47) % 100, // spread across the screen without Math.random (keeps render pure)
  delay: (i % 7) * 0.09,
  drift: ((i * 29) % 60) - 30,
  spin: ((i * 83) % 360) - 180,
  size: 9 + ((i * 13) % 7),
  round: i % 3 === 0,
}));

/** Outlined confetti in the category colours. Re-key to replay. */
export function Confetti() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {PIECES.map((p, i) => (
        <motion.span
          key={i}
          className={`absolute -top-6 border-2 border-edge-on-fill ${p.round ? "rounded-full" : "rounded-[3px]"} ${CONFETTI[i % CONFETTI.length]}`}
          style={{ left: `${p.x}%`, width: p.size, height: p.size }}
          initial={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: "105vh", x: p.drift, rotate: p.spin, opacity: [1, 1, 0] }}
          transition={{ duration: 2.4, delay: p.delay, ease: [0.25, 0.6, 0.4, 1] }}
        />
      ))}
    </div>
  );
}
