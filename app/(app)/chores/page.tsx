"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, Heart, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/kit/button";
import { Card, EmptyState } from "@/components/kit/card";
import { ListCard } from "@/components/kit/list";
import { Chip, CountBadge, StatusPill, Tick, chipClass } from "@/components/kit/selection";
import { HIT_44, cx } from "@/components/kit/shared";
import { Sheet } from "@/components/sheet";
import { Face, Page, PageHeader, Who } from "@/components/ui";
import { addDays, daysBetween, formatDay, klToday, relativeDue, weekStart } from "@/lib/date";
import { useStore, type Chore, type ChoreMeta } from "@/lib/store";

const EVERY: [number, string][] = [
  [1, "Daily"],
  [7, "Weekly"],
  [14, "Fortnightly"],
  [30, "Monthly"],
];
const every = (n: number) => (n === 1 ? "every day" : n === 7 ? "weekly" : n === 14 ? "every 2 weeks" : n === 30 ? "monthly" : `every ${n} days`);
const PERSON_FILL = { h: "bg-person-h", w: "bg-person-w" } as const;

const ago = (ymd: string, today: string) => {
  const n = daysBetween(ymd, today);
  return n === 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`;
};

/** How often + whose job it is. */
function Options({ value, set }: { value: Pick<ChoreMeta, "everyDays" | "owner">; set: (patch: Partial<ChoreMeta>) => void }) {
  const s = useStore();
  // Own text state, so typing "14" doesn't snap to Daily at the "1" and wipe the box.
  const [typed, setTyped] = useState(() => (EVERY.some(([n]) => n === value.everyDays) ? "" : String(value.everyDays)));
  const custom = typed !== "";
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="How often">
        {EVERY.map(([n, label]) => (
          <Chip
            key={n}
            selected={!custom && value.everyDays === n}
            onClick={() => {
              setTyped("");
              set({ everyDays: n });
            }}
          >
            {label}
          </Chip>
        ))}
        <label className={chipClass(custom)}>
          every
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={365}
            placeholder="–"
            aria-label="Every how many days"
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
              const n = Number(e.target.value);
              if (n >= 1 && n <= 365) set({ everyDays: Math.round(n) });
            }}
            className="w-8 bg-transparent text-center text-base placeholder:text-current focus:outline-none"
          />
          days
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Whose job">
        <span className="mr-0.5 text-xs font-semibold text-muted">Whose job</span>
        <Chip selected={!value.owner} onClick={() => set({ owner: undefined })}>
          Either of us
        </Chip>
        {s.members.map((m) => (
          <Chip key={m.id} selected={value.owner === m.id} fill={PERSON_FILL[s.person(m.id) ?? "h"]} onClick={() => set({ owner: m.id })}>
            {m.name}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function ChoreSheet({ chore: c, onClose }: { chore: Chore; onClose: () => void }) {
  const s = useStore();
  const today = klToday();
  const meta: ChoreMeta = { title: c.title, everyDays: c.everyDays, owner: c.owner, nextDue: c.nextDue };
  const edit = (patch: Partial<ChoreMeta>) => s.editChore(c.id, { ...meta, ...patch });

  return (
    <Sheet label={c.title} onClose={onClose}>
      <input
        key={c.id}
        defaultValue={c.title}
        maxLength={100}
        aria-label="Chore name"
        onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== c.title && edit({ title: e.target.value })}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className="h-12 w-full rounded-control border-2 border-edge-control bg-surface px-3.5 font-display text-xl font-bold text-fg focus:shadow-focus"
      />
      <p className="mt-2 text-xs font-semibold text-muted">
        {c.lastOn ? (
          <>
            Last done by <Who member={s.member(c.lastBy)} />, {ago(c.lastOn, today)}
          </>
        ) : (
          "Not done yet"
        )}
      </p>

      <div className="mt-5 flex flex-col gap-3 border-t-[1.5px] border-dashed border-divider pt-4">
        <Options
          value={meta}
          // Due date follows the new rhythm from the last time it was done.
          set={(p) => edit(p.everyDays && c.lastOn ? { ...p, nextDue: addDays(c.lastOn, p.everyDays) } : p)}
        />
        <label className={cx(chipClass(false), "w-fit")}>
          <CalendarDays aria-hidden />
          Next due {formatDay(c.nextDue, { weekday: "short", day: "numeric", month: "short" })}, {relativeDue(c.nextDue, today)}
          {/* Native date input laid over the chip: iOS opens its own wheel picker. */}
          <input type="date" aria-label="Next due" value={c.nextDue} onChange={(e) => e.target.value && edit({ nextDue: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            onClose();
            s.removeChore(c.id);
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

export default function ChoresPage() {
  const s = useStore();
  const today = klToday();
  const [title, setTitle] = useState("");
  const [draft, setDraft] = useState<Pick<ChoreMeta, "everyDays" | "owner">>({ everyDays: 7 });
  const [sheetId, setSheetId] = useState<string | null>(null);
  const sheetChore = s.chores.find((c) => c.id === sheetId); // closes by itself if deleted on the other phone
  const since = weekStart(today);
  const week = s.log.filter((l) => l.kind === "chore" && klToday(new Date(l.at)) >= since);

  const chores = [...s.chores].sort((a, b) => a.nextDue.localeCompare(b.nextDue));
  // Ticked chores land in "Done today" instead of jumping to wherever their next due date puts them.
  const groups: [string, Chore[]][] = [
    ["Due", chores.filter((c) => c.lastOn !== today && c.nextDue <= today)],
    ["Coming up", chores.filter((c) => c.lastOn !== today && c.nextDue > today)],
    ["Done today", chores.filter((c) => c.lastOn === today)],
  ];

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    s.addChore({ title, ...draft, nextDue: today });
    setTitle("");
    setDraft({ everyDays: 7 });
  }

  const row = (c: Chore) => {
    const n = daysBetween(today, c.nextDue);
    const doneToday = c.lastOn === today;
    const by = s.member(c.lastBy);
    // How close it is to due: empty right after it's done, full on the due day.
    const fill = Math.min(1, Math.max(0, 1 - n / c.everyDays));
    const canThank =
      !!by && by.id !== s.me && !!c.lastOn && c.lastOn >= since &&
      !s.log.some((l) => l.kind === "thanks" && l.by === s.me && l.text === s.thanksText(c) && klToday(new Date(l.at)) >= c.lastOn!);
    return (
      <motion.li
        key={c.id}
        layout="position"
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.25 }}
        className="flex min-h-[54px] items-center gap-2 bg-surface pl-3.5 pr-1.5"
      >
        <button type="button" onClick={() => setSheetId(c.id)} aria-haspopup="dialog" className="min-w-0 flex-1 py-2 text-left">
          <span className={cx("block text-sm font-bold", doneToday && "text-subtle line-through")}>{c.title}</span>
          <span className="block text-xs font-semibold text-muted">
            {doneToday ? (
              <>
                by <Who member={by} />, next {relativeDue(c.nextDue, today)}
              </>
            ) : (
              <>
                <span className={n < 0 ? "text-error-text" : n === 0 ? "text-fg" : undefined}>{n < -1 ? relativeDue(c.nextDue, today) : `due ${relativeDue(c.nextDue, today)}`}</span>, {every(c.everyDays)}
              </>
            )}
          </span>
          {!doneToday && (
            <span aria-hidden className="mt-1.5 block h-2 w-full max-w-36 overflow-hidden rounded-full border-[1.5px] border-edge-control bg-surface">
              <motion.span
                className={cx("block h-full origin-left", n < 0 ? "bg-danger" : "bg-chores")}
                initial={false}
                animate={{ scaleX: fill }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
          )}
        </button>
        {doneToday ? <StatusPill tone="chores">Done</StatusPill> : <Face member={s.member(c.owner)} />}
        {canThank && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.8 }}
            onClick={() => s.thank(c.id)}
            aria-label={`Thank ${by.name} for ${c.title}`}
            className={cx("flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-edge-on-fill bg-hero text-on-fill", HIT_44)}
          >
            <Heart className="size-4 fill-shopping" aria-hidden strokeWidth={2.2} />
          </motion.button>
        )}
        <Tick label={`Done: ${c.title}`} checked={doneToday} onChange={() => s.toggleChore(c.id)} />
      </motion.li>
    );
  };

  return (
    <Page>
      <PageHeader kicker="Keeping house" title="Chores" />

      {/* Seeing the shared effort is what makes a split feel fair, more than the exact numbers. */}
      {s.chores.length > 0 && (
        <Card className="flex flex-col gap-3">
          <p className="font-display text-[15px] font-bold">Done this week: {week.length}</p>
          {s.members.map((m) => {
            const k = week.filter((l) => l.by === m.id).length;
            const person = s.person(m.id) ?? "h";
            return (
              <div key={m.id} className="flex items-center gap-3">
                <Face member={m} />
                <span className="w-16 truncate text-sm font-bold">{m.name}</span>
                <div className="flex flex-1 flex-wrap gap-1.5" aria-label={`${k} chores`}>
                  {Array.from({ length: k }, (_, i) => (
                    <motion.span
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20, delay: i * 0.04 }}
                      className={cx("size-3.5 rounded-full border-[1.5px] border-edge-on-fill", PERSON_FILL[person])}
                    />
                  ))}
                  {k === 0 && <span className="text-xs font-semibold text-muted">None yet</span>}
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {s.chores.length === 0 && (
        <EmptyState icon={<Sparkles strokeWidth={2} />} title="List the chores that keep coming back. Each one shows when it's next due, so neither of you has to remember." />
      )}

      {groups.map(
        ([label, items]) =>
          items.length > 0 && (
            <ListCard key={label} title={label} tint={label === "Due" ? "chores" : "none"} aside={<CountBadge count={items.length} tone="chores" />}>
              <ul className="divide-y-[1.5px] divide-dashed divide-divider">
                <AnimatePresence initial={false}>{items.map(row)}</AnimatePresence>
              </ul>
            </ListCard>
          ),
      )}
      {s.chores.length > 0 && groups[0][1].length === 0 && <p className="px-0.5 text-sm font-semibold text-muted">Nothing due. The house is happy.</p>}

      {/* Adding is rare and ticking is daily, so the form sits below the list. */}
      <form onSubmit={add} className="rounded-card border-2 border-dashed border-edge-control text-fg transition-shadow focus-within:border-solid focus-within:bg-surface focus-within:shadow-focus">
        <div className="flex h-12 items-center gap-2.5 pl-3.5 pr-1.5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            enterKeyHint="done"
            placeholder="Add a chore…"
            aria-label="New chore"
            className="h-full min-w-0 flex-1 bg-transparent text-base font-medium placeholder:text-subtle focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Add chore"
            disabled={!title.trim()}
            className={cx("flex size-9 shrink-0 items-center justify-center rounded-icon border-2 border-edge-control bg-primary text-primary-fg transition-opacity disabled:opacity-40", HIT_44)}
          >
            <Plus className="size-5" strokeWidth={2.6} />
          </button>
        </div>
        <AnimatePresence initial={false}>
          {title.trim() && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="border-t-[1.5px] border-dashed border-divider px-3.5 pb-3 pt-2.5">
                <Options value={draft} set={(p) => setDraft((d) => ({ ...d, ...p }))} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      <AnimatePresence>{sheetChore && <ChoreSheet key={sheetChore.id} chore={sheetChore} onClose={() => setSheetId(null)} />}</AnimatePresence>
    </Page>
  );
}
