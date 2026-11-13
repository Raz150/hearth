"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Tape } from "./ui";
import { inkText, klTime, useStore } from "@/lib/store";

/** A typed sticky note either of us can leave for the other. */
export function StickyNote() {
  const s = useStore();
  const [draft, setDraft] = useState<string | null>(null);
  const by = s.member(s.note?.by);

  function save(e: React.FormEvent) {
    e.preventDefault();
    s.setNote(draft ?? "");
    setDraft(null);
  }

  return (
    <motion.div
      initial={{ rotate: -3, y: -6, opacity: 0 }}
      animate={{ rotate: -1.2, y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="relative mb-8 rounded-sm bg-[color-mix(in_oklab,var(--highlight)_45%,var(--card))] px-5 pt-6 pb-4 shadow-[0_14px_24px_-16px_rgba(40,40,20,0.5)]"
    >
      <Tape className="left-1/2 -translate-x-1/2 rotate-2" />

      {draft !== null ? (
        <form onSubmit={save}>
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={140}
            rows={3}
            aria-label="Note"
            placeholder="leave a little note…"
            className="w-full resize-none bg-transparent font-hand text-base leading-relaxed outline-none placeholder:text-ink-soft"
          />
          <div className="flex items-center justify-between">
            <span className="font-hand text-xs text-ink-soft">{140 - draft.length} left</span>
            <div className="flex gap-1">
              <button type="button" onClick={() => setDraft(null)} className="min-h-11 px-3 text-sm text-ink-soft">
                Cancel
              </button>
              <button type="submit" className="min-h-11 px-3 text-sm font-semibold text-accent">
                Pin it
              </button>
            </div>
          </div>
        </form>
      ) : (
        <button onClick={() => setDraft(s.note?.text ?? "")} className="block min-h-11 w-full text-left">
          {s.note ? (
            <>
              <p className="font-hand text-base leading-relaxed">{s.note.text}</p>
              <p className="mt-2 text-right font-hand text-xs" style={{ color: by && inkText(by.ink) }}>
                — {by?.name}, {klTime(s.note.at)}
              </p>
            </>
          ) : (
            <p className="font-hand text-ink-soft">tap to leave a note for each other…</p>
          )}
        </button>
      )}
    </motion.div>
  );
}
