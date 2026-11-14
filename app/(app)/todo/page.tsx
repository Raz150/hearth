"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, Clock, ListChecks, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/card";
import { ListCard } from "@/components/kit/list";
import { Chip, CountBadge, Tick, chipClass } from "@/components/kit/selection";
import { HIT_44, cx } from "@/components/kit/shared";
import { Sheet } from "@/components/sheet";
import { Face, Page, PageHeader } from "@/components/ui";
import { addDays, formatDay, formatTime, klToday, parseQuickAdd, relativeDue, TAG, thisWeekend } from "@/lib/date";
import { useStore, type Todo, type TodoMeta } from "@/lib/store";

const WHEN: [string, (today: string) => string][] = [
  ["Today", (t) => t],
  ["Tomorrow", (t) => addDays(t, 1)],
  ["Weekend", thisWeekend],
];

const PERSON_FILL = { h: "bg-person-h", w: "bg-person-w" } as const;

/** People and dates. Tap a lit chip to clear it. */
function WhoWhen({ value, set }: { value: Pick<TodoMeta, "assignee" | "due" | "dueTime">; set: (patch: Partial<TodoMeta>) => void }) {
  const s = useStore();
  const today = klToday();
  const presets = WHEN.map(([label, fn]) => [label, fn(today)] as const);
  const custom = value.due && !presets.some(([, d]) => d === value.due) ? value.due : undefined;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {s.members.map((m) => (
        <Chip key={m.id} selected={value.assignee === m.id} fill={PERSON_FILL[s.person(m.id) ?? "h"]} onClick={() => set({ assignee: value.assignee === m.id ? undefined : m.id })}>
          {m.name}
        </Chip>
      ))}
      <span aria-hidden className="mx-0.5 h-6 border-l-[1.5px] border-dashed border-divider" />
      {presets.map(([label, d]) => (
        <Chip key={label} selected={value.due === d} onClick={() => set({ due: value.due === d ? undefined : d })}>
          {label}
        </Chip>
      ))}
      {/* Native date input laid over the chip: iOS opens its own wheel picker, with a Reset button to clear. */}
      <label className={chipClass(!!custom)}>
        <CalendarDays aria-hidden />
        {custom ? formatDay(custom, { day: "numeric", month: "short" }) : "Pick"}
        <input
          type="date"
          aria-label="Pick a due date"
          value={value.due ?? ""}
          onChange={(e) => set({ due: e.target.value || undefined })}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      {value.due && (
        <label className={chipClass(!!value.dueTime)}>
          <Clock aria-hidden />
          {value.dueTime ? `by ${formatTime(value.dueTime)}` : "Time"}
          <input
            type="time"
            aria-label="Due by (time)"
            value={value.dueTime ?? ""}
            onChange={(e) => set({ dueTime: e.target.value || undefined })}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      )}
    </div>
  );
}

const BIG_INPUT =
  "h-12 w-full rounded-control border-2 border-edge-control bg-surface px-3.5 font-display text-xl font-bold text-fg placeholder:text-subtle focus:shadow-focus";

/** Bottom sheet with everything about one to-do. Changes save as they're made. */
function TodoSheet({ todo: t, knownTags, onClose }: { todo: Todo; knownTags: string[]; onClose: () => void }) {
  const s = useStore();
  const meta: TodoMeta & { title: string } = { title: t.title, assignee: t.assignee, due: t.due, dueTime: t.dueTime, priority: t.priority, tags: t.tags };
  const edit = (patch: Partial<TodoMeta & { title: string }>) => s.editTodo(t.id, { ...meta, ...patch });
  const tags = [...new Set([...knownTags, ...t.tags])];
  const important = t.priority > 0;

  // On Enter and on blur, so a tag typed before tapping Done isn't lost.
  function addTag(input: HTMLInputElement) {
    const tag = input.value.trim().replace(/^#/, "").toLowerCase();
    if (TAG.test(tag) && !t.tags.includes(tag) && t.tags.length < 5) edit({ tags: [...t.tags, tag] });
    input.value = "";
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
        className={BIG_INPUT}
      />

      <div className="mt-4 overflow-hidden rounded-card border-2 border-edge-card">
        <ul className="divide-y-[1.5px] divide-dashed divide-divider">
          {t.steps.map((x) => (
            <li key={x.id} className="flex min-h-12 items-center pl-1.5 pr-1">
              <Tick label={x.title} checked={x.done} onChange={() => s.toggleStep(t.id, x.id)} />
              <span className={cx("flex-1 text-sm font-semibold", x.done && "text-subtle line-through")}>{x.title}</span>
              <button type="button" onClick={() => s.removeStep(t.id, x.id)} aria-label={`Delete ${x.title}`} className="grid size-11 place-items-center text-muted">
                <X className="size-4" strokeWidth={2.4} />
              </button>
            </li>
          ))}
          <li>
            <form
              className="flex min-h-12 items-center gap-2.5 px-3.5"
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem("step") as HTMLInputElement;
                s.addStep(t.id, input.value);
                input.value = ""; // stay focused so steps can be typed one after another
              }}
            >
              <Plus className="size-4 shrink-0" strokeWidth={2.6} aria-hidden />
              <input
                name="step"
                maxLength={120}
                enterKeyHint="enter"
                placeholder="Add a step"
                aria-label="Add a step"
                onBlur={(e) => {
                  s.addStep(t.id, e.target.value); // ignores blanks
                  e.target.value = "";
                }}
                className="h-11 flex-1 bg-transparent text-base font-medium placeholder:text-subtle focus:outline-none"
              />
            </form>
          </li>
        </ul>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t-[1.5px] border-dashed border-divider pt-4">
        <WhoWhen value={t} set={edit} />
        <div className="flex flex-wrap items-center gap-2">
          <Chip selected={important} onClick={() => edit({ priority: important ? 0 : 1 })}>
            Important
          </Chip>
          {tags.map((x) => (
            <Chip key={x} selected={t.tags.includes(x)} fill="bg-chores" onClick={() => edit({ tags: t.tags.includes(x) ? t.tags.filter((y) => y !== x) : [...t.tags, x].slice(0, 5) })}>
              #{x}
            </Chip>
          ))}
          {t.tags.length < 5 && (
            <input
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                addTag(e.currentTarget);
              }}
              onBlur={(e) => addTag(e.currentTarget)}
              maxLength={21}
              enterKeyHint="done"
              autoCapitalize="none"
              placeholder="+ tag"
              aria-label="New tag"
              className="h-[34px] w-24 rounded-full border-2 border-dashed border-edge-control bg-transparent px-3.5 text-base font-semibold placeholder:text-subtle focus:border-solid focus:shadow-focus"
            />
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            onClose();
            s.removeTodo(t.id);
          }}
        >
          <Trash2 aria-hidden className="size-4" strokeWidth={2.2} /> Delete
        </Button>
        <Button size="sm" onClick={onClose}>
          Done
        </Button>
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
    dueTime: picked.dueTime ?? undefined,
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
    ["Done", done],
  ];

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!typed.title) return;
    s.addTodo(typed.title, meta);
    setTitle("");
    setPicked({});
  }

  const row = (t: Todo) => {
    const stepsDone = t.steps.filter((x) => x.done).length;
    const late = !!t.due && t.due < today;
    const isDone = !!t.doneBy;
    return (
      <motion.li
        key={t.id}
        layout="position"
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.25 }}
        className="relative overflow-hidden"
      >
        {/* revealed behind the row while swiping left */}
        <div aria-hidden className="absolute inset-0 flex items-center justify-end gap-1.5 bg-danger px-4 text-sm font-bold text-on-fill">
          Delete <Trash2 className="size-4" strokeWidth={2.2} />
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
          className="relative flex min-h-[54px] items-center gap-2 bg-surface pl-3.5 pr-1.5"
        >
          <button type="button" onClick={() => !dragged.current && setSheetId(t.id)} aria-haspopup="dialog" className="min-w-0 flex-1 py-2 text-left">
            <span className="block text-sm font-bold">
              <span className={cx("marker", (t.priority === 0 || isDone) && "marker-off", isDone && "text-subtle line-through")}>{t.title}</span>
            </span>
            {!isDone && ((t.due && (t.due !== today || t.dueTime)) || t.tags.length > 0 || t.steps.length > 0) && (
              <span className="flex flex-wrap items-center gap-x-2.5 text-xs font-semibold text-muted">
                {t.due && (t.due !== today || t.dueTime) && (
                  <span className={late ? "text-error-text" : undefined}>
                    {t.due !== today && `${formatDay(t.due, { weekday: "short", day: "numeric", month: "short" })}, ${relativeDue(t.due, today)}`}
                    {t.dueTime && `${t.due !== today ? ", " : ""}by ${formatTime(t.dueTime)}`}
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
          <Face member={s.member(t.doneBy ?? t.assignee)} />
          <Tick label={`Done: ${t.title}`} checked={isDone} onChange={() => s.toggleTodo(t.id)} />
        </motion.div>
      </motion.li>
    );
  };

  // What the typed words turned into, beyond who/when (those light up their chips): tap to undo.
  const extras = [
    ...(meta.priority > 0 ? [{ key: "!", label: "Important", clear: () => pick({ priority: 0 }) }] : []),
    ...meta.tags.map((x) => ({ key: x, label: `#${x}`, clear: () => pick({ tags: meta.tags.filter((y) => y !== x) }) })),
  ];

  return (
    <Page>
      <PageHeader kicker="Our list" title="To-do" />

      <form onSubmit={add} className="rounded-card border-2 border-edge-control bg-surface text-fg shadow-hard transition-shadow focus-within:shadow-focus">
        <div className="flex h-12 items-center gap-2.5 pl-3.5 pr-1.5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            aria-label="New to-do"
            placeholder="Write something down…"
            className="h-full min-w-0 flex-1 bg-transparent text-base font-medium placeholder:text-subtle focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Add"
            disabled={!typed.title}
            className={cx("flex size-9 shrink-0 items-center justify-center rounded-icon border-2 border-edge-control bg-primary text-primary-fg transition-opacity disabled:opacity-40", HIT_44)}
          >
            <Plus className="size-5" strokeWidth={2.6} />
          </button>
        </div>
        <AnimatePresence initial={false}>
          {title.trim() && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="flex flex-col gap-2.5 border-t-[1.5px] border-dashed border-divider px-3.5 pb-3 pt-2.5">
                <WhoWhen value={meta} set={pick} />
                {extras.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {extras.map((x) => (
                      <button key={x.key} type="button" onClick={x.clear} aria-label={`Remove ${x.label}`} className={cx("inline-flex h-[34px] items-center gap-1 rounded-full border-2 border-edge-control bg-chores-tint px-3 text-[13px] font-semibold [&_svg]:size-3.5", HIT_44)}>
                        {x.label} <X aria-hidden strokeWidth={2.6} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-muted">Type “!” for important, “#” for a tag, “@” for who.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {s.todos.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Show">
          <Chip selected={mine} fill={PERSON_FILL[s.person(s.me) ?? "h"]} onClick={() => setMine(!mine)}>
            Mine
          </Chip>
          {knownTags.map((x) => (
            <Chip key={x} selected={tagFilter === x} onClick={() => setTagFilter(tagFilter === x ? undefined : x)}>
              #{x}
            </Chip>
          ))}
        </div>
      )}

      {open.length === 0 && done.length === 0 && (
        <EmptyState
          icon={<ListChecks strokeWidth={2} />}
          title={mine || tagFilter ? "Nothing matches this filter." : "The list is empty. Write the first thing down above."}
          action={mine || tagFilter ? "Clear filter" : undefined}
          onAction={() => {
            setMine(false);
            setTagFilter(undefined);
          }}
        />
      )}
      {groups.map(
        ([label, items]) =>
          items.length > 0 && (
            <ListCard key={label} title={label} tint={label === "Today" ? "shopping" : "none"} aside={<CountBadge count={items.length} tone={label === "Overdue" ? "danger" : label === "Done" ? "done" : "shopping"} />}>
              <ul className="divide-y-[1.5px] divide-dashed divide-divider">
                <AnimatePresence initial={false}>{items.map(row)}</AnimatePresence>
              </ul>
            </ListCard>
          ),
      )}

      <AnimatePresence>{sheetTodo && <TodoSheet key={sheetTodo.id} todo={sheetTodo} knownTags={knownTags} onClose={() => setSheetId(null)} />}</AnimatePresence>
    </Page>
  );
}
