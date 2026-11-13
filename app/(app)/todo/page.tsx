"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { InkCheck, Page, PageHeader, Section, Struck, Who } from "@/components/ui";
import { addDays, formatDay, klToday, relativeDue, thisWeekend } from "@/lib/date";
import { inkText, useStore, type Todo } from "@/lib/mock";

const WHEN: [string, (today: string) => string][] = [
  ["Today", (t) => t],
  ["Tomorrow", (t) => addDays(t, 1)],
  ["Weekend", thisWeekend],
];

function Chip({ on, onClick, ink, children }: { on: boolean; onClick: () => void; ink?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`min-h-9 rounded-full border px-3 font-hand text-xs transition-colors ${on ? "border-transparent text-paper" : "border-line text-ink-soft"}`}
      style={on ? { backgroundColor: ink ? inkText(ink) : "var(--accent)" } : ink ? { color: inkText(ink) } : undefined}
    >
      {children}
    </button>
  );
}

export default function TodoPage() {
  const s = useStore();
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<string>();
  const [due, setDue] = useState<string>();
  const [editing, setEditing] = useState<string | null>(null);
  const open = s.todos.filter((t) => !t.doneBy);
  const done = s.todos.filter((t) => t.doneBy);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    s.addTodo(t.slice(0, 200), { assignee, due });
    setTitle("");
    setAssignee(undefined);
    setDue(undefined);
  }

  function saveEdit(id: string, value: string) {
    if (value.trim()) s.renameTodo(id, value.trim());
    setEditing(null);
  }

  const row = (t: Todo) => {
    const by = s.member(t.doneBy);
    return (
      <motion.li
        key={t.id}
        layout
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.25 }}
        className="relative overflow-hidden border-b border-line/60 last:border-0"
      >
        {/* revealed behind the row while swiping */}
        <div aria-hidden className="absolute inset-0 flex items-center justify-between px-3 font-hand text-xs">
          <span className="flex items-center gap-1.5 text-accent">
            <Pencil className="size-4" /> edit
          </span>
          <span className="flex items-center gap-1.5 text-[#c0675f]">
            delete <Trash2 className="size-4" />
          </span>
        </div>
        <motion.div
          drag={editing === t.id ? false : "x"}
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.5}
          onDragEnd={(_, i) => {
            if (i.offset.x < -90) s.removeTodo(t.id);
            else if (i.offset.x > 90) setEditing(t.id);
          }}
          className="relative flex items-center gap-1 bg-paper"
        >
          <InkCheck done={!!t.doneBy} ink={by?.ink ?? s.member(s.me)?.ink} onToggle={() => s.toggleTodo(t.id)} label={t.title} />
          <div className="min-w-0 flex-1 py-2.5">
            {editing === t.id ? (
              <form onSubmit={(e) => { e.preventDefault(); saveEdit(t.id, new FormData(e.currentTarget).get("title") as string); }}>
                <input
                  name="title"
                  autoFocus
                  defaultValue={t.title}
                  maxLength={200}
                  aria-label="Edit to-do"
                  onBlur={(e) => saveEdit(t.id, e.target.value)}
                  className="w-full rounded-md bg-card px-2 py-1 outline-none ring-1 ring-accent"
                />
              </form>
            ) : (
              <Struck done={!!t.doneBy} ink={by?.ink}>{t.title}</Struck>
            )}
            {t.due && !t.doneBy && editing !== t.id && (
              <p className="text-sm text-ink-soft">
                {formatDay(t.due, { day: "numeric", month: "short" })} · {relativeDue(t.due, klToday())}
              </p>
            )}
          </div>
          <span className="pr-2">
            <Who member={s.member(t.doneBy ?? t.assignee)} />
          </span>
        </motion.div>
      </motion.li>
    );
  };

  return (
    <Page>
      <PageHeader kicker="our list" title="To-do" />

      <form onSubmit={add} className="mb-8 rounded-2xl border border-line bg-card p-1.5 pl-4 focus-within:border-accent">
        <div className="flex items-center gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="Write something down…"
            className="min-h-11 flex-1 bg-transparent text-base outline-none placeholder:text-ink-soft/70"
          />
          <button type="submit" aria-label="Add" className="grid size-11 place-items-center rounded-xl bg-accent text-paper active:scale-90 transition-transform disabled:opacity-40" disabled={!title.trim()}>
            <Plus className="size-5" />
          </button>
        </div>
        <AnimatePresence initial={false}>
          {title.trim() && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-1.5 pt-1 pb-1.5 pr-2">
                {s.members.map((m) => (
                  <Chip key={m.id} on={assignee === m.id} onClick={() => setAssignee(assignee === m.id ? undefined : m.id)} ink={m.ink}>
                    {m.name}
                  </Chip>
                ))}
                <span aria-hidden className="mx-1 w-px self-stretch bg-line" />
                {WHEN.map(([label, fn]) => {
                  const d = fn(klToday());
                  return (
                    <Chip key={label} on={due === d} onClick={() => setDue(due === d ? undefined : d)}>
                      {label}
                    </Chip>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      <Section title="Still to do" note={open.length ? `${open.length} left` : undefined}>
        {open.length === 0 && <p className="px-1 py-2 font-hand text-ink-soft">all done, well done ✿</p>}
        <ul>
          <AnimatePresence initial={false}>{open.map(row)}</AnimatePresence>
        </ul>
        {s.todos.length > 0 && <p className="mt-3 text-center font-hand text-xs text-ink-soft">swipe → to edit · ← to delete</p>}
      </Section>

      {done.length > 0 && (
        <Section title="Done">
          <ul>
            <AnimatePresence initial={false}>{done.map(row)}</AnimatePresence>
          </ul>
        </Section>
      )}
    </Page>
  );
}
