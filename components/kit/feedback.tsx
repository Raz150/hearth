"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Check, X } from "lucide-react";
import { Avatar, type Person } from "./avatar";
import { cx, HIT_44, META } from "./shared";

/**
 * Retro-window confirm dialog: coral title bar, a real close button, hero shadow.
 * Native <dialog>, so focus is trapped and Esc closes it.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Yes, delete",
  cancelLabel = "No",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (open && !d?.open) d?.showModal();
    if (!open && d?.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose} // fires for Esc too
      onClick={(e) => e.target === e.currentTarget && onClose()} // tap on the backdrop
      className="m-auto w-[calc(100%-40px)] max-w-sm overflow-visible bg-transparent p-0 open:animate-pop backdrop:bg-[color-mix(in_srgb,var(--shadow)_45%,transparent)]"
    >
      <DialogWindow title={title} confirmLabel={confirmLabel} cancelLabel={cancelLabel} onConfirm={onConfirm} onClose={onClose}>
        {children}
      </DialogWindow>
    </dialog>
  );
}

/** The retro window itself, without the modal behaviour (the kit page shows it in place). */
export function DialogWindow({
  title,
  children,
  confirmLabel = "Yes, delete",
  cancelLabel = "No",
  onConfirm,
  onClose,
}: {
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const small = "h-10 rounded-[10px] border-2 px-4 text-sm font-bold";
  return (
    <div className="overflow-hidden rounded-card border-2 border-edge-hero bg-surface text-fg shadow-hero">
      <header className="flex h-8 items-center justify-between border-b-2 border-edge-on-fill bg-danger pl-3 pr-2.5 text-on-fill">
        <h2 className="font-display text-[13px] font-bold">{title}</h2>
        <button type="button" aria-label="Close" onClick={onClose} className={cx("flex size-[22px] items-center justify-center rounded-[4px] border-[1.5px] border-edge-control bg-surface text-fg", HIT_44)}>
          <X aria-hidden className="size-[11px]" strokeWidth={3.4} />
        </button>
      </header>
      <div className="flex flex-col gap-3.5 p-3.5">
        <div className="text-sm">{children}</div>
        <div className="flex justify-end gap-2.5">
          <button type="button" onClick={onClose} className={cx(small, "border-edge-control bg-surface", HIT_44)}>
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cx(small, "border-edge-on-fill bg-danger text-on-fill shadow-hard transition-[translate,box-shadow] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none", HIT_44)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** 52-tall toast: done circle, message, optional Undo. Position it yourself (it doesn't float). */
export function Toast({ message, onUndo, error }: { message: string; onUndo?: () => void; error?: boolean }) {
  const Icon = error ? X : Check;
  return (
    <div role={error ? "alert" : "status"} className="flex h-[52px] items-center gap-2.5 rounded-card border-2 border-edge-card bg-surface pl-2.5 pr-2 text-fg shadow-hard">
      <span aria-hidden className={cx("flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-edge-on-fill text-on-fill", error ? "bg-danger" : "bg-done")}>
        <Icon className="size-[13px]" strokeWidth={3.4} />
      </span>
      <span className="flex-1 truncate text-sm font-semibold">{message}</span>
      {onUndo && (
        <button type="button" onClick={onUndo} className="h-11 px-3 text-sm font-bold underline">
          Undo
        </button>
      )}
    </div>
  );
}

/** Chat bubble; `mine` puts it on the right. */
export function MessageBubble({ person, initial, text, time, mine }: { person: Person; initial: string; text: string; time: string; mine?: boolean }) {
  return (
    <div className={cx("flex items-end gap-2", mine && "flex-row-reverse")}>
      <Avatar person={person} initial={initial} size={30} />
      <div
        className={cx(
          "flex max-w-[75%] flex-col gap-0.5 border-2 border-edge-card bg-surface px-3 py-2.5 text-fg",
          mine ? "rounded-[14px_14px_4px_14px]" : "rounded-[14px_14px_14px_4px]",
        )}
      >
        <p className="text-sm font-semibold">{text}</p>
        <span className={META}>{time}</span>
      </div>
    </div>
  );
}
