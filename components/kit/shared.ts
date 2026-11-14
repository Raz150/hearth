/** Shared bits for the Outline Pop kit (docs/design/DESIGN.md). Colours only via token utilities. */

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

/** Category colours. Text on any of these fills is always on-fill (dark) in both themes. */
export type Tone = "shopping" | "chores" | "money" | "hero" | "danger" | "done";

export const FILL: Record<Tone, string> = {
  shopping: "bg-shopping",
  chores: "bg-chores",
  money: "bg-money",
  hero: "bg-hero",
  danger: "bg-danger",
  done: "bg-done",
};

/** Pressed: the shadow disappears and the element moves 3px right and down. */
export const PRESS = "transition-[translate,box-shadow] duration-100 ease-out active:translate-x-[3px] active:translate-y-[3px] active:shadow-none";

/** Invisible tap area so a control drawn smaller than 44px still gets a 44px-tall (and at least 44px-wide) target. */
export const HIT_44 =
  "relative after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-[max(100%,2.75rem)] after:-translate-1/2 after:content-['']";

/** Meta text: times, "added by W". */
export const META = "text-xs font-semibold text-muted";
