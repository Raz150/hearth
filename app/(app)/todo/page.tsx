"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, ListChecks, Plus, Trash2, X } from "lucide-react";
import { Sheet } from "@/components/sheet";
import { Chip, chipClass, chipStyle, HIT, InkCheck, LATE, Page, PageHeader, Section, Struck, Who } from "@/components/ui";
import { addDays, formatDay, klToday, parseQuickAdd, relativeDue, TAG, thisWeekend } from "@/lib/date";
import { useStore, type Todo, type TodoMeta } from "@/lib/store";

const WHEN: [string, (today: string) => string][] = [
  ["Today", (t) => t],
  ["Tomorrow", (t) => addDays(t, 1)],
  ["Weekend", thisWeekend],
];

/** People and dates. Tap a lit chip to clear it. */
function WhoWhen({ value, set }: { value: Pick<TodoMeta, "assignee" | "due">; set: (patch: Partial<TodoMeta>) => void }) {
  const s = useStore();
  const today = klToday();
  const presets = WHEN.map(([label, fn]) => [label, fn(today)] as const);
  const custom = value.due && !presets.some(([, d]) => d === value.due) ? value.due : undefined;
  return (
    <div className="flex flex-wrap gap-x-1.5 gap-y-2">
      {s.members.map((m) => (
        <Chip key={m.id} on={value.assignee === m.id} onClick={() => set({ assignee: value.assignee === m.id ? undefined : m.id })} ink={m.ink}>
          {m.name}
        </Chip>
      ))}
      <span aria-hidden className="mx-0.5 w-px self-stretch bg-line" />
      {presets.map(([label, d]) => (
        <Chip key={label} on={value.due === d} onClick={() => set({ due: value.due === d ? undefined : d })}>
          {label}
        </Chip>
      ))}
      {/* Native date input laid over the chip: iOS opens its own wheel picker, with a Reset button to clear. */}
      <label className={chipClass(!!custom)} style={chipStyle(!!custom)}>
        <CalendarDays className="size-3.5" aria-hidden />
        {custom ? formatDay(custom, { day: "numeric", month: "short" }) : "Pick"}
        <input
          type="date"
          aria-label="Pick a due date"
          value={value.due ?? ""}
          onChange={(e) => set({ due: e.target.value || undefined })}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}

/** Bottom sheet with everything about one to-do. Changes save as they're made. */
function TodoSheet({ todo: t, knownTags, onClose }: { todo: Todo; knownTags: string[]; onClose: () => void }) {
  const s = useStore();
  const meta: TodoMeta & { title: string } = { title: t.title, assignee: t.assignee, due: t.due, priority: t.priority, tags: t.tags };
  const edit = (patch: Partial<TodoMeta & { title: string }>) => s.editTodo(t.id, { ...meta, ...patch });
  const tags = [...new Set([...knownTags, ...t.tags])];
  const important = t.priority > 0;

  function addTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const tag = e.currentTarget.value.trim().replace(/^#/, "").toLowerCase();
    if (TAG.test(tag) && !t.tags.includes(tag) && t.tags.length < 5) edit({ tags: [...t.tags, tag] });
    e.currentTarget.value = "";
  }

  return (
    <Sheet label={t.title} onClose={onClose}>
        <input
          key={t.id}
          defaultValue={t.title}
          maxLength={200}
          aria-label="Title"
          onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== t.title && edit({ title: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="w-full bg-transparent font-serif text-2xl leading-tight outline-none focus:underline focus:decoration-line focus:underline-offset-8"
        />

        <ul className="mt-3">
          {t.steps.map((x) => (
            <li key={x.id} className="flex items-center">
              <button type="button" onClick={() => s.toggleStep(t.id, x.id)} aria-pressed={x.done} aria-label={x.title} className="-ml-3 grid size-11 shrink-0 place-items-center">
                <span className={`size-[1.1rem] rounded-[5px] border-[1.5px] transition-colors ${x.done ? "border-accent bg-accent" : "border-ink-soft"}`} />
              </button>
              <span className={`flex-1 ${x.done ? "text-ink-soft line-through" : ""}`}>{x.title}</span>
              <button type="button" onClick={() => s.removeStep(t.id, x.id)} aria-label={`Remove ${x.title}`} className="-mr-3 grid size-11 place-items-center text-ink-soft">
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        <form
          className="flex items-center"
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem("step") as HTMLInputElement;
            s.addStep(t.id, input.value);
            input.value = ""; // stay focused so steps can be typed one after another
          }}
        >
          <Plus className="mr-2.5 size-4 shrink-0 text-ink-soft" aria-hidden />
          <input name="step" maxLength={120} enterKeyHint="enter" placeholder="Add a step" aria-label="Add a step" className="min-h-11 flex-1 bg-transparent outline-none placeholder:text-ink-soft/70" />
        </form>

        <div className="mt-5 space-y-4 border-t border-dashed border-line pt-4">
          <WhoWhen value={t} set={edit} />
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
            <button
              type="button"
              aria-pressed={important}
              onClick={() => edit({ priority: important ? 0 : 1 })}
              className={`relative mr-1 h-7 rounded-full border px-2.5 text-base leading-none transition-colors ${HIT} ${important ? "border-transparent" : "border-line text-ink-soft"}`}
            >
              <span className={`marker ${important ? "" : "marker-off"}`}>Important</span>
            </button>
            {tags.map((x) => (
              <Chip key={x} on={t.tags.includes(x)} onClick={() => edit({ tags: t.tags.includes(x) ? t.tags.filter((y) => y !== x) : [...t.tags, x].slice(0, 5) })}>
                #{x}
              </Chip>
            ))}
            {t.tags.length < 5 && (
              <input
                onKeyDown={addTag}
                maxLength={21}
                enterKeyHint="done"
                autoCapitalize="none"
                placeholder="+ tag"
                aria-label="New tag"
                className="h-7 w-20 rounded-full border border-dashed border-line bg-transparent px-2.5 font-hand text-sm outline-none focus:border-accent"
              />
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onClose();
              s.removeTodo(t.id);
            }}
            className="-ml-2 flex min-h-11 items-center gap-1.5 px-2 font-hand text-base"
            style={{ color: LATE }}
          >
            <Trash2 className="size-4" /> Delete
          </button>
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl bg-accent px-5 font-hand text-base text-paper">
            Done
          </button>
        </div>
    </Sheet>
  );
}

export default function TodoPage() {
  const s = useStore();
  const today = klToday();
  const [title, setTitle] = useState("");
  // Per field: undefined = follow what's typed ("tmr", "@name", "!", "#tag"); otherwise the user's choice (null = cleared).
  const [picked, setPicked] = useState<{ [K in keyof TodoMeta]?: TodoMeta[K] | null }>({});
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [mine, setMine] = useState(false);
  const [tagFilter, setTagFilter] = useState<string>();
  const dragged = useRef(false); // a swipe shouldn't also count as a tap

  const typed = parseQuickAdd(title, {
    today: picked.due === undefined ? today : undefined,
    me: s.me,
    members: picked.assignee === undefined ? s.members : undefined,
    priority: picked.priority === undefined,
    tags: picked.tags === undefined,
  });
  const meta: TodoMeta = {
    assignee: picked.assignee === undefined ? typed.assignee : (picked.assignee ?? undefined),
    due: picked.due === undefined ? typed.due : (picked.due ?? undefined),
    priority: picked.priority ?? typed.priority ?? 0,
    tags: picked.tags ?? typed.tags,
  };
  const pick = (patch: Partial<TodoMeta>) => setPicked((p) => ({ ...p, ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, v ?? null])) }));
  const knownTags = [...new Set(s.todos.flatMap((t) => t.tags))].sort();
  const sheetTodo = s.todos.find((t) => t.id === sheetId); // closes by itself if the to-do is deleted on the other phone

  const shown = s.todos.filter((t) => (!mine || t.assignee === s.me) && (!tagFilter || t.tags.includes(tagFilter)));
  // Soonest first, important first on the same day; undated keep newest-first (sort is stable).
  const open = shown.filter((t) => !t.doneBy).sort((a, b) => (a.due ?? "~").localeCompare(b.due ?? "~") || b.priority - a.priority);
  const done = shown.filter((t) => t.doneBy);
  const groups: [string, Todo[]][] = [
    ["Overdue", open.filter((t) => t.due && t.due < today)],
    ["Today", open.filter((t) => t.due === today)],
    ["Coming up", open.filter((t) => t.due && t.due > today)],
    ["Someday", open.filter((t) => !t.due)],
  ];

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!typed.title) return;
    s.addTodo(typed.title, meta);
    setTitle("");
    setPicked({});
  }

  const row = (t: Todo) => {
    const by = s.member(t.doneBy);
    const stepsDone = t.steps.filter((x) => x.done).length;
    const late = !!t.due && t.due < today;
    return (
      <motion.li
        key={t.id}
        layout="position"
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.25 }}
        className="relative overflow-hidden border-b border-line/60 last:border-0"
      >
        {/* revealed behind the row while swiping left */}
        <div aria-hidden className="absolute inset-0 flex items-center justify-end gap-1.5 px-3 font-hand text-sm" style={{ color: LATE }}>
          delete <Trash2 className="size-4" />
        </div>
        <motion.div
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0.5, right: 0 }}
          onDragStart={() => (dragged.current = true)}
          onDragEnd={(_, i) => {
            setTimeout(() => (dragged.current = false));
            if (i.offset.x < -90) s.removeTodo(t.id);
          }}
          className="relative flex items-center gap-1 bg-paper"
        >
          <InkCheck done={!!t.doneBy} ink={by?.ink ?? s.member(s.me)?.ink} onToggle={() => s.toggleTodo(t.id)} label={t.title} />
          <button type="button" onClick={() => !dragged.current && setSheetId(t.id)} aria-haspopup="dialog" className="min-w-0 flex-1 py-2.5 text-left">
            <span className="block">
              <span className={`marker ${t.priority > 0 && !t.doneBy ? "" : "marker-off"}`}>
                <Struck done={!!t.doneBy} ink={by?.ink}>{t.title}</Struck>
              </span>
            </span>
            {!t.doneBy && ((t.due && t.due !== today) || t.tags.length > 0 || t.steps.length > 0) && (
              <span className="flex flex-wrap items-center gap-x-3 text-sm text-ink-soft">
                {t.due && t.due !== today && (
                  <span style={late ? { color: LATE } : undefined}>
                    {formatDay(t.due, { weekday: "short", day: "numeric", month: "short" })}, {relativeDue(t.due, today)}
                  </span>
                )}
                {t.steps.length > 0 && (
                  <span className="inline-flex items-center gap-1" aria-label={`${stepsDone} of ${t.steps.length} steps done`}>
                    <ListChecks className="size-3.5" aria-hidden /> {stepsDone}/{t.steps.length}
                  </span>
                )}
                {t.tags.map((x) => (
                  <span key={x}>#{x}</span>
                ))}
              </span>
            )}
          </button>
          <span className="pr-2">
            <Who member={s.member(t.doneBy ?? t.assignee)} />
          </span>
        </motion.div>
      </motion.li>
    );
  };

  // What the typed words turned into, beyond who/when (those light up their chips): tap to undo.
  const extras = [
    ...(meta.priority > 0 ? [{ key: "!", label: <span className="marker">important</span>, clear: () => pick({ priority: 0 }) }] : []),
    ...meta.tags.map((x) => ({ key: x, label: <>#{x}</>, clear: () => pick({ tags: meta.tags.filter((y) => y !== x) }) })),
  ];

  return (
    <Page>
      <PageHeader kicker="our list" title="To-do" />

      <form onSubmit={add} className="mb-5 rounded-2xl border border-line bg-card p-1.5 pl-4 focus-within:border-accent">
        <div className="flex items-center gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="Write something down…"
            className="min-h-11 flex-1 bg-transparent text-lg outline-none placeholder:text-ink-soft/70"
          />
          <button type="submit" aria-label="Add" className="grid size-11 place-items-center rounded-xl bg-accent text-paper active:scale-90 transition-transform disabled:opacity-40" disabled={!typed.title}>
            <Plus className="size-5" />
          </button>
        </div>
        <AnimatePresence initial={false}>
          {title.trim() && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="space-y-2 pt-1 pr-2 pb-1.5">
                <WhoWhen value={meta} set={pick} />
                {extras.length > 0 ? (
                  <div className="flex flex-wrap gap-x-1.5 gap-y-2">
                    {extras.map((x) => (
                      <button key={x.key} type="button" onClick={x.clear} aria-label="Remove" className={`relative inline-flex h-7 items-center gap-1 rounded-full bg-paper-deep px-2.5 text-sm leading-none text-ink ${HIT}`}>
                        {x.label} <X className="size-3.5 text-ink-soft" aria-hidden />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-soft">Type “!” for important, “#” for a tag, “@” for who.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {s.todos.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-x-1.5 gap-y-2" role="group" aria-label="Show">
          <Chip on={mine} onClick={() => setMine(!mine)} ink={s.member(s.me)?.ink}>
            Mine
          </Chip>
          {knownTags.map((x) => (
            <Chip key={x} on={tagFilter === x} onClick={() => setTagFilter(tagFilter === x ? undefined : x)}>
              #{x}
            </Chip>
          ))}
        </div>
      )}

      {open.length === 0 && (
        <Section title="Still to do">
          <p className="px-1 py-2 font-hand text-ink-soft">{mine || tagFilter ? "Nothing here. Clear the filter to see everything." : "All done, well done ✿"}</p>
        </Section>
      )}
      {groups.map(
        ([label, items]) =>
          items.length > 0 && (
            <Section key={label} title={label} note={`${items.length}`}>
              <ul>
                <AnimatePresence initial={false}>{items.map(row)}</AnimatePresence>
              </ul>
            </Section>
          ),
      )}

      {done.length > 0 && (
        <Section title="Done">
          <ul>
            <AnimatePresence initial={false}>{done.map(row)}</AnimatePresence>
          </ul>
        </Section>
      )}

      <AnimatePresence>{sheetTodo && <TodoSheet key={sheetTodo.id} todo={sheetTodo} knownTags={knownTags} onClose={() => setSheetId(null)} />}</AnimatePresence>
    </Page>
  );
}
