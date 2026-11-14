import { Check } from "lucide-react";
import { cx, FILL, type Tone } from "./shared";

/** − 2 + quantity stepper. */
export function Stepper({ label, value, onChange, min = 0, max = 99 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  const btn = "flex size-11 items-center justify-center text-xl font-bold disabled:text-subtle";
  return (
    <div role="group" aria-label={label} className="inline-flex w-fit self-start overflow-hidden rounded-control border-2 border-edge-card bg-surface text-fg">
      <button type="button" aria-label={`Less ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className={cx(btn, "border-r-2 border-edge-control")}>
        −
      </button>
      <output aria-live="polite" className="flex w-10 items-center justify-center bg-money font-display text-base font-bold text-on-fill">
        {value}
      </output>
      <button type="button" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className={cx(btn, "border-l-2 border-edge-control")}>
        +
      </button>
    </div>
  );
}

const pct = (v: number) => Math.min(100, Math.max(0, v));

/** Budget-style bar: label and percent above an 18-tall pill. `value` is 0–100. */
export function ProgressBar({ label, value, tone = "shopping" }: { label: string; value: number; tone?: Tone }) {
  const v = Math.round(pct(value));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-[13px] font-bold">
        <span>{label}</span>
        <span>{v}%</span>
      </div>
      <div role="progressbar" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} className="h-[18px] overflow-hidden rounded-full border-2 border-edge-card bg-surface">
        {v > 0 && <div className={cx("h-full border-r-2 border-edge-on-fill transition-[width] duration-500", FILL[tone])} style={{ width: `${v}%` }} />}
      </div>
    </div>
  );
}

/** Striped "Syncing…" bar. Leave `value` out when progress is unknown; the stripes keep moving either way. */
export function LoadingBar({ label, value }: { label: string; value?: number }) {
  const v = value === undefined ? undefined : Math.round(pct(value));
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-display text-[13px] font-bold">{label}</span>
      <div role="progressbar" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} className="h-3.5 overflow-hidden rounded-[4px] border-2 border-edge-card bg-surface">
        <div
          className="h-full animate-stripes border-r-2 border-edge-card bg-[repeating-linear-gradient(-45deg,var(--chores)_0,var(--chores)_6px,var(--surface)_6px,var(--surface)_10px)] transition-[width] duration-500"
          style={{ width: `${v ?? 100}%` }}
        />
      </div>
    </div>
  );
}

/** Listed → Bought → Paid → Stored. `done` = how many steps are finished. */
export function StepTracker({ steps, done }: { steps: readonly string[]; done: number }) {
  return (
    <div
      role="progressbar"
      aria-label="Progress"
      aria-valuemin={0}
      aria-valuemax={steps.length}
      aria-valuenow={done}
      aria-valuetext={done ? `${steps[done - 1]} (${done} of ${steps.length})` : "Not started"}
      className="flex flex-col gap-1.5"
    >
      <div className="flex items-center">
        {steps.map((s, i) => (
          <div key={s} className={cx("flex items-center", i > 0 && "flex-1")}>
            {i > 0 &&
              (i < done ? (
                <span className="h-1 flex-1 border-y-[1.5px] border-edge-on-fill bg-done" />
              ) : (
                <span className="flex-1 border-t-2 border-dashed border-edge-card" />
              ))}
            <span
              className={cx(
                "flex size-[26px] shrink-0 items-center justify-center rounded-full border-2",
                i < done ? "border-edge-on-fill bg-done text-on-fill" : "border-edge-card bg-surface",
              )}
            >
              {i < done && <Check aria-hidden className="size-3" strokeWidth={3.4} />}
            </span>
          </div>
        ))}
      </div>
      <div aria-hidden className="flex justify-between text-[11px] font-semibold text-muted">
        {steps.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
    </div>
  );
}
