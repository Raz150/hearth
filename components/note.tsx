"use client";

import { useState } from "react";
import { Button } from "@/components/kit/button";
import { NoteWindow } from "@/components/kit/card";
import { klTime, useStore } from "@/lib/store";

const MAX = 140;

/** The note either of us leaves for the other: the one loud thing on Today. */
export function StickyNote() {
  const s = useStore();
  const [draft, setDraft] = useState<string | null>(null);
  const by = s.member(s.note?.by);
  const mine = s.note?.by === s.me;
  const other = s.members.find((m) => m.id !== s.me);

  function save(e: React.FormEvent) {
    e.preventDefault();
    s.setNote(draft ?? "");
    setDraft(null);
  }

  if (draft !== null) {
    return (
      <NoteWindow title={other ? `Note for ${other.name}` : "Note"}>
        <form onSubmit={save} className="flex flex-col gap-3">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={MAX}
            rows={3}
            aria-label="Note"
            placeholder={other ? `Write a note for ${other.name}…` : "Write a note…"}
            className="w-full resize-none rounded-control border-2 border-edge-control bg-surface px-3.5 py-3 font-note text-base text-fg placeholder:text-subtle focus:shadow-focus"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted">{MAX - draft.length} left</span>
            <div className="flex gap-2.5">
              <Button variant="secondary" size="sm" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              {/* An empty send would delete the current note: only allow that for your own, and say so. */}
              <Button type="submit" size="sm" variant={mine && !draft.trim() ? "danger" : "primary"} disabled={!draft.trim() && !(mine && s.note)}>
                {mine && !draft.trim() ? "Delete note" : "Send"}
              </Button>
            </div>
          </div>
        </form>
      </NoteWindow>
    );
  }

  if (!s.note) {
    return (
      <NoteWindow
        title="Note"
        text={other ? `Nothing from ${other.name} yet.` : "No note yet."}
        action="Write one"
        onAction={() => setDraft("")}
      />
    );
  }

  return (
    <NoteWindow
      title={mine ? "Your note" : `From ${by?.name ?? "them"}`}
      text={s.note.text}
      meta={`Sent ${klTime(s.note.at)}`}
      onHeart={mine ? undefined : s.heartNote}
      hearted={s.noteHearted}
      heartLabel={`Send a heart back to ${by?.name ?? "them"}`}
      action={mine ? "Edit" : "Reply"}
      onAction={() => setDraft(mine ? s.note!.text : "")}
    />
  );
}
