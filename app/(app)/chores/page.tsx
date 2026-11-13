"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, Heart, Plus, Trash2 } from "lucide-react";
import { Sheet } from "@/components/sheet";
import { Card, Chip, chipClass, chipStyle, InkCheck, LATE, Page, PageHeader, Section, Stamp, Struck, Who } from "@/components/ui";
import { addDays, daysBetween, formatDay, klToday, relativeDue, weekStart } from "@/lib/date";
import { inkText, useStore, type Chore, type ChoreMeta } from "@/lib/store";

const EVERY: [number, string][] = [
  [1, "Daily"],
  [7, "Weekly"],
  [14, "Fortnightly"],
  [30, "Monthly"],
];
const every = (n: number) => (n === 1 ? "every day" : n === 7 ? "weekly" : n === 14 ? "every 2 weeks" : n === 30 ? "monthly" : `every ${n} days`);

const ago = (ymd: string, today: string) => {
  const n = daysBetween(ymd, today);
  return n === 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`;
};

/** How often + whose job it is. */
function Options({ value, set }: { value: Pick<ChoreMeta, "everyDays" | "owner">; set: (patch: Partial<ChoreMeta>) => void }) {
  const s = useStore();
  const custom = !EVERY.some(([n]) => n === value.everyDays);
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-x-1.5 gap-y-2" role="group" aria-label="How often">
        {EVERY.map(([n, label]) => (
          <Chip key={n} on={value.everyDays === n} onClick={() => set({ everyDays: n })}>
            {label}
          </Chip>
        ))}
        <label className={chipClass(custom)} style={chipStyle(custom)}>
          every
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={365}
            placeholder="–"
            aria-label="Every how many days"
            value={custom ? value.everyDays : ""}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (n >= 1 && n <= 365) set({ everyDays: Math.round(n) });
            }}
            className="w-8 bg-transparent text-center outline-none placeholder:text-current"
          />
          days
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2" role="group" aria-label="Whose job">
        <span className="mr-0.5 font-hand text-sm text-ink-soft">whose job</span>
        <Chip on={!value.owner} onClick={() => set({ owner: undefined })}>
          Either of us
        </Chip>
        {s.members.map((m) => (
          <Chip key={m.id} on={value.owner === m.id} onClick={() => set({ owner: m.id })} ink={m.ink}>
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
        className="w-full bg-transparent font-serif text-2xl leading-tight outline-none focus:underline focus:decoration-line focus:underline-offset-8"
      />
      <p className="mt-1 text-sm text-ink-soft">
        {c.lastOn ? (
          <>
            last done by <Who member={s.member(c.lastBy)} />, {ago(c.lastOn, today)}
          </>
        ) : (
          "not done yet"
        )}
      </p>

      <div className="mt-5 space-y-4 border-t border-dashed border-line pt-4">
        <Options
          value={meta}
          // Due date follows the new rhythm from the last time it was done.
          set={(p) => edit(p.everyDays && c.lastOn ? { ...p, nextDue: addDays(c.lastOn, p.everyDays) } : p)}
        />
        <label className={`${chipClass(false)} w-fit`}>
          <CalendarDays className="size-3.5" aria-hidden />
          next due {formatDay(c.nextDue, { weekday: "short", day: "numeric", month: "short" })}, {relativeDue(c.nextDue, today)}
          {/* Native date input laid over the chip: iOS opens its own wheel picker. */}
          <input
            type="date"
            aria-label="Next due"
            value={c.nextDue}
            onChange={(e) => e.target.value && edit({ nextDue: e.target.value })}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            onClose();
            s.removeChore(c.id);
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
        className="flex items-center gap-1 border-b border-line/60 last:border-0"
      >
        <InkCheck done={doneToday} ink={s.member(doneToday ? c.lastBy : s.me)?.ink} onToggle={() => s.toggleChore(c.id)} label={`Mark ${c.title} done`} />
        <button type="button" onClick={() => setSheetId(c.id)} aria-haspopup="dialog" className="min-w-0 flex-1 py-2.5 text-left">
          <span className="block">
            <Struck done={doneToday} ink={by?.ink}>{c.title}</Struck>
          </span>
          <span className="block text-sm text-ink-soft">
            {doneToday ? (
              <>
                by <Who member={by} />, next {relativeDue(c.nextDue, today)}
              </>
            ) : (
              <>
                <span className={n === 0 ? "font-semibold text-ink" : undefined} style={n < 0 ? { color: LATE } : undefined}>
                  {n < -1 ? relativeDue(c.nextDue, today) : `due ${relativeDue(c.nextDue, today)}`}
                </span>
                , {every(c.everyDays)}
              </>
            )}
          </span>
          {!doneToday && (
            <span aria-hidden className="mt-1.5 block h-1 w-full max-w-36 overflow-hidden rounded-full bg-paper-deep">
              <motion.span
                className="block h-full origin-left rounded-full"
                style={{ backgroundColor: n < 0 ? LATE : "var(--accent)" }}
                initial={false}
                animate={{ scaleX: fill }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
          )}
        </button>
        <span className="flex shrink-0 items-center">
          {doneToday ? (
            <Stamp show ink={by?.ink ?? ""}>
              done
            </Stamp>
          ) : (
            <Who member={s.member(c.owner)} />
          )}
          {canThank && (
            <button
              type="button"
              onClick={() => s.thank(c.id)}
              aria-label={`Thank ${by.name} for ${c.title}`}
              className="-mr-2 grid size-11 place-items-center rounded-full transition-transform active:scale-75"
              style={{ color: inkText(by.ink) }}
            >
              <Heart className="size-5" aria-hidden />
            </button>
          )}
        </span>
      </motion.li>
    );
  };

  return (
    <Page>
      <PageHeader kicker="keeping house" title="Chores" />

      {/* Seeing the shared effort is what makes a split feel fair, more than the exact numbers. */}
      {s.chores.length > 0 && (
        <Card tape className="mb-8 px-5 pt-6 pb-4">
          <p className="mb-3 font-hand text-sm text-ink-soft">done this week: {week.length}</p>
          <div className="space-y-2.5">
            {s.members.map((m) => {
              const k = week.filter((l) => l.by === m.id).length;
              return (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="w-16 truncate font-hand text-sm" style={{ color: inkText(m.ink) }}>
                    {m.name}
                  </span>
                  <div className="flex flex-1 flex-wrap gap-1.5" aria-label={`${k} chores`}>
                    {Array.from({ length: k }, (_, i) => (
                      <motion.span
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 20, delay: i * 0.04 }}
                        className="size-3.5 rounded-full"
                        style={{ backgroundColor: m.ink }}
                      />
                    ))}
                    {k === 0 && <span className="text-sm text-ink-soft">none yet</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {s.chores.length === 0 && (
        <p className="mb-4 px-1 font-hand text-lg text-ink-soft">
          List the chores that keep coming back. Each one shows when it&apos;s next due, so neither of you has to remember.
        </p>
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
      {s.chores.length > 0 && groups[0][1].length === 0 && <p className="-mt-4 mb-8 px-1 font-hand text-ink-soft">nothing due, the house is happy ✿</p>}

      {/* Adding is rare and ticking is daily, so the form sits below the list. */}
      <form onSubmit={add} className="rounded-2xl border border-dashed border-line p-1.5 pl-4 focus-within:border-solid focus-within:border-accent focus-within:bg-card">
        <div className="flex items-center gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            enterKeyHint="done"
            placeholder="Add a chore…"
            aria-label="New chore"
            className="min-h-11 flex-1 bg-transparent text-lg outline-none placeholder:text-ink-soft/70"
          />
          <button type="submit" aria-label="Add chore" disabled={!title.trim()} className="grid size-11 place-items-center rounded-xl bg-accent text-paper transition-transform active:scale-90 disabled:opacity-40">
            <Plus className="size-5" />
          </button>
        </div>
        <AnimatePresence initial={false}>
          {title.trim() && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="pt-1 pr-2 pb-1.5">
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
