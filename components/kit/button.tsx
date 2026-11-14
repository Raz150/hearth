import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx, HIT_44, PRESS } from "./shared";

type Variant = "primary" | "secondary" | "shopping" | "chores" | "money" | "danger";
type Size = "md" | "sm" | "block";

// [fill + text, edge, shadow]
const VARIANT: Record<Variant, [string, string, string]> = {
  primary: ["bg-primary text-primary-fg", "border-edge-control", "shadow-primary"],
  secondary: ["bg-surface text-fg", "border-edge-control", "shadow-hard"],
  shopping: ["bg-shopping text-on-fill", "border-edge-on-fill", "shadow-hard"],
  chores: ["bg-chores text-on-fill", "border-edge-on-fill", "shadow-hard"],
  money: ["bg-money text-on-fill", "border-edge-on-fill", "shadow-hard"],
  danger: ["bg-danger text-on-fill", "border-edge-on-fill", "shadow-hard"],
};

const SIZE: Record<Size, string> = {
  md: "h-12 px-[22px] has-[svg]:px-[18px] rounded-control font-display text-[15px]",
  sm: `h-10 px-4 rounded-[10px] text-sm ${HIT_44}`,
  // Block button: hero (stacked) shadow, so one per screen.
  block: "h-[52px] w-full rounded-card font-display text-base",
};

const DISABLED =
  "disabled:pointer-events-none disabled:border-disabled-edge disabled:bg-disabled disabled:text-subtle disabled:shadow-none";

/** Class for a button, so links can look the same: <Link className={buttonClass()} />. Main action is primary (ink). */
export function buttonClass({ variant = "primary", size = "md" }: { variant?: Variant; size?: Size } = {}) {
  const [fill, edge, shadow] = VARIANT[variant];
  return cx(
    "inline-flex shrink-0 select-none items-center justify-center gap-2 border-2 font-bold",
    fill,
    size === "block" ? "border-edge-hero shadow-hero" : cx(edge, shadow),
    SIZE[size],
    PRESS,
    DISABLED,
  );
}

export function Button({ variant, size, className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={cx(buttonClass({ variant, size }), className)} {...props} />;
}

/** 44 × 44 outlined square (no shadow). Put the icon inside; `label` is read out instead of it. */
export const iconButtonClass =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-control border-2 border-edge-control bg-surface text-fg transition-transform active:translate-x-[3px] active:translate-y-[3px] [&_svg]:size-5";

export function IconButton({ label, className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button type={type} aria-label={label} className={cx(iconButtonClass, className)} {...props} />;
}

/** Round 56 "+" button with a hard shadow. */
export function Fab({ label, children, className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cx("inline-flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-edge-on-fill bg-money text-on-fill shadow-hard [&_svg]:size-6", PRESS, className)}
      {...props}
    >
      {children}
    </button>
  );
}

/** Text link, e.g. "See all →". */
export const linkClass = "inline-flex min-h-11 items-center text-sm font-bold text-fg underline underline-offset-2";
