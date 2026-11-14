"use client";

import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { cx, FILL, HIT_44, type Tone } from "./shared";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

const ROW_LABEL = "inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold";

/** Bare checkbox, for rows that are themselves a <label> (list rows). Round for lists; square for settings. */
export const checkboxClass = (square = false) =>
  cx(
    "grid size-6 shrink-0 cursor-pointer appearance-none place-content-center border-2 border-edge-control bg-surface transition-colors",
    square ? "rounded-[7px]" : "rounded-full",
    // ink tick: a rotated L drawn with two borders
    "checked:border-edge-on-fill checked:bg-done checked:before:h-[5px] checked:before:w-[9px] checked:before:-translate-y-px checked:before:-rotate-45 checked:before:border-b-2 checked:before:border-l-2 checked:before:border-edge-on-fill checked:before:content-['']",
  );

export function Checkbox({ label, square, className, ...props }: InputProps & { label: ReactNode; square?: boolean }) {
  return (
    <label className={cx(ROW_LABEL, className)}>
      <input type="checkbox" className={checkboxClass(square)} {...props} />
      {label}
    </label>
  );
}

export function Radio({ label, className, ...props }: InputProps & { label: ReactNode; name: string }) {
  return (
    <label className={cx(ROW_LABEL, className)}>
      <input
        type="radio"
        className="grid size-6 shrink-0 cursor-pointer appearance-none place-content-center rounded-full border-2 border-edge-control bg-surface checked:border-[var(--radio)] checked:before:size-2.5 checked:before:rounded-full checked:before:bg-[var(--radio)] checked:before:content-['']"
        {...props}
      />
      {label}
    </label>
  );
}

/** Radio group with its legend inline, e.g. "Paid by  ○ H  ○ W  ○ Split". */
export function RadioGroup<T extends string>({ legend, options, value, onChange }: { legend: string; options: readonly { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const name = useId();
  return (
    <fieldset className="flex flex-wrap items-center gap-x-[18px]">
      <legend className="float-left mr-1.5 text-xs font-semibold text-muted">{legend}</legend>
      {options.map((o) => (
        <Radio key={o.value} name={name} label={o.label} checked={value === o.value} onChange={() => onChange(o.value)} />
      ))}
    </fieldset>
  );
}

/** 52 × 30 switch with a label on the left. */
export function Toggle({ label, className, ...props }: InputProps & { label: ReactNode }) {
  return (
    <label className={cx("flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-semibold", className)}>
      {label}
      <input
        type="checkbox"
        role="switch"
        className="relative h-[30px] w-[52px] shrink-0 cursor-pointer appearance-none rounded-full border-2 border-edge-control bg-surface transition-colors before:absolute before:left-[3px] before:top-[3px] before:size-5 before:rounded-full before:border-2 before:border-edge-on-fill before:bg-money before:transition-[left] before:content-[''] checked:border-edge-on-fill checked:bg-chores checked:before:left-[25px] checked:before:bg-surface"
        {...props}
      />
    </label>
  );
}

/** Segmented control; the white segment slides to the one you pick. */
export function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: readonly { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const group = useId();
  return (
    <div role="group" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-[3px] rounded-control border-2 border-edge-control bg-surface-sunken p-[3px]">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={cx("relative h-[38px] rounded-[9px] text-sm", on ? "font-display font-bold" : "font-semibold")}
          >
            {on && <motion.span layoutId={group} aria-hidden className="absolute inset-0 rounded-[9px] border-2 border-edge-control bg-surface" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Filter chip (34 tall, 44 tap area). Selected = money fill. */
/** Chip look, for labels that wrap a native input (date pickers). `fill` swaps the selected colour, e.g. a person's. */
export const chipClass = (selected: boolean, fill = "bg-money") =>
  cx(
    "inline-flex h-[34px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full border-2 px-3.5 text-[13px] transition-colors [&_svg]:size-3.5",
    selected ? cx("border-edge-on-fill font-bold text-on-fill", fill) : "border-edge-control bg-surface font-semibold text-fg",
    HIT_44,
  );

export function Chip({ selected, fill, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean; fill?: string }) {
  return <button type="button" aria-pressed={selected} className={cx(chipClass(selected, fill), className)} {...props} />;
}

/** Round 24 checkbox in a 44 tap area, for rows whose text is a separate button. */
export function Tick({ label, className, ...props }: InputProps & { label: string }) {
  return (
    <label className={cx("grid size-11 shrink-0 cursor-pointer place-items-center", className)}>
      <input type="checkbox" aria-label={label} className={checkboxClass()} {...props} />
    </label>
  );
}

/** Chip with an × to remove it, e.g. a tag on an item. */
export function RemovableChip({ children, onRemove, removeLabel }: { children: ReactNode; onRemove: () => void; removeLabel: string }) {
  return (
    <span className="inline-flex h-[34px] items-center gap-1 rounded-full border-2 border-edge-card bg-chores-tint pl-3 pr-1.5 text-[13px] font-semibold text-fg">
      {children}
      <button type="button" aria-label={removeLabel} onClick={onRemove} className={cx("flex size-[22px] items-center justify-center", HIT_44)}>
        <X aria-hidden className="size-3.5" strokeWidth={2.6} />
      </button>
    </span>
  );
}

/** 24 count circle. */
export function CountBadge({ count, tone = "shopping", label }: { count: number; tone?: Tone; label?: string }) {
  return (
    <span
      aria-label={label}
      className={cx("inline-flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-edge-on-fill px-1.5 text-xs font-bold text-on-fill", FILL[tone])}
    >
      {count}
    </span>
  );
}

/** Small "NEW" tag (24 tall, radius 6), as in the kit reference. */
export function NewTag({ children = "New" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center rounded-[6px] border-2 border-edge-on-fill bg-money px-2 font-display text-[11px] font-bold uppercase tracking-[1px] text-on-fill">
      {children}
    </span>
  );
}

/** 26 status pill, e.g. "Done", "Due today". */
export function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={cx("inline-flex h-[26px] items-center rounded-full border-2 border-edge-on-fill px-2.5 text-xs font-bold text-on-fill", FILL[tone])}>
      {children}
    </span>
  );
}
