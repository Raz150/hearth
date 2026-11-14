"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { ChevronDown, ScanBarcode, Search as SearchIcon } from "lucide-react";
import { cx, HIT_44 } from "./shared";

// 16px text: iOS Safari zooms the page into any input smaller than that.
const CONTROL =
  "w-full rounded-control border-2 border-edge-control bg-surface px-3.5 text-base font-medium text-fg placeholder:text-subtle transition-shadow focus:shadow-focus aria-invalid:bg-error-bg aria-invalid:shadow-error";

type LabelProps = { label: string; error?: string };

function Labelled({ id, label, error, children }: LabelProps & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs font-semibold text-error-text">
          {error}
        </p>
      )}
    </div>
  );
}

const errorProps = (id: string, error?: string) => (error ? { "aria-invalid": true, "aria-describedby": `${id}-error` } : {});

/** Labelled text input. Pass `error` to show the error state and message. */
export function Field({ label, error, className, ...props }: LabelProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Labelled id={id} label={label} error={error}>
      <input id={id} className={cx(CONTROL, "h-12", className)} {...errorProps(id, error)} {...props} />
    </Labelled>
  );
}

/** Native select (the iOS picker is the best picker), drawn like an input with a chevron. */
export function Select({ label, error, className, children, ...props }: LabelProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Labelled id={id} label={label} error={error}>
      <div className="relative">
        <select id={id} className={cx(CONTROL, "h-12 appearance-none pr-10", className)} {...errorProps(id, error)} {...props}>
          {children}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 size-[18px] -translate-y-1/2" strokeWidth={2.2} />
      </div>
    </Labelled>
  );
}

/** Textarea for notes between you two: typewriter font. */
export function NoteTextarea({ label, error, className, ...props }: LabelProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Labelled id={id} label={label} error={error}>
      <textarea id={id} className={cx(CONTROL, "h-[88px] resize-none py-3 font-note", className)} {...errorProps(id, error)} {...props} />
    </Labelled>
  );
}

/** 52-tall search box; `onScan` adds the dashed divider and the scan button. */
export function SearchField({ label, onScan, className, ...props }: { label: string; onScan?: () => void } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div
      className={cx(
        "flex h-[52px] items-center gap-2.5 rounded-card border-2 border-edge-card bg-surface pl-3.5 text-fg shadow-hard transition-shadow focus-within:shadow-focus",
        className,
      )}
    >
      <SearchIcon aria-hidden className="size-[18px] shrink-0" strokeWidth={2.2} />
      <input
        type="search"
        aria-label={label}
        placeholder={label}
        className="h-full min-w-0 flex-1 bg-transparent text-base font-medium placeholder:text-subtle focus:outline-none"
        {...props}
      />
      {onScan && (
        <>
          <span aria-hidden className="self-stretch border-l-[1.5px] border-dashed border-divider" />
          <button
            type="button"
            aria-label="Scan barcode"
            onClick={onScan}
            className={cx("mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-icon border-2 border-edge-on-fill bg-chores text-on-fill", HIT_44)}
          >
            <ScanBarcode aria-hidden className="size-[18px]" strokeWidth={2} />
          </button>
        </>
      )}
    </div>
  );
}
