import type { ReactNode } from "react";
import { cx } from "./shared";

/** Which of you: each person keeps one colour everywhere. */
export type Person = "h" | "w";

const PERSON = { h: "bg-person-h", w: "bg-person-w" } as const;

const SIZE = {
  48: "size-12 border-2 font-display text-lg",
  38: "size-[38px] border-2 font-display text-[15px]",
  30: "size-[30px] border-2 text-xs",
  18: "size-[18px] border-[1.5px] text-[10px]",
} as const;

export function Avatar({ person, initial, size = 38, online, className }: { person: Person; initial: string; size?: keyof typeof SIZE; online?: boolean; className?: string }) {
  return (
    <span
      className={cx("relative inline-flex shrink-0 items-center justify-center rounded-full border-edge-on-fill font-bold text-on-fill", PERSON[person], SIZE[size], className)}
    >
      {initial}
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-edge-on-fill bg-done">
          <span className="sr-only">online</span>
        </span>
      )}
    </span>
  );
}

/** Both of you, overlapped. */
export function AvatarPair({ h = "H", w = "W" }: { h?: string; w?: string }) {
  return (
    <span className="inline-flex">
      <Avatar person="h" initial={h} size={30} />
      <Avatar person="w" initial={w} size={30} className="-ml-2" />
    </span>
  );
}

/** "added by W" tag. */
export function Byline({ person, initial, children }: { person: Person; initial: string; children: ReactNode }) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full border-2 border-edge-control bg-surface pl-[3px] pr-2.5 text-xs font-semibold text-fg">
      <Avatar person={person} initial={initial} size={18} />
      {children}
    </span>
  );
}
