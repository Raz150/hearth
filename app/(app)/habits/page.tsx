"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, GraduationCap, Heart, Plus, Sprout, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/card";
import { ConfirmDialog } from "@/components/kit/feedback";
import { ListCard } from "@/components/kit/list";
import { Stepper } from "@/components/kit/progress";
import { Chip, CountBadge, StatusPill } from "@/components/kit/selection";
import { HIT_44, cx } from "@/components/kit/shared";
import { Sheet } from "@/components/sheet";
import { Confetti, Face, Page, PageHeader } from "@/components/ui";
import { addDays, formatDay, klToday, weekStart } from "@/lib/date";
import { FEELS, sentence, doneIn, goodWeeks, isFor, ratingDue, readyToGraduate } from "@/lib/habits";
import { useStore, type Habit, type HabitMeta } from "@/lib/store";

const PERSON_FILL = { h: "bg-person-h", w: "bg-person-w" } as const;
const INPUT = "min-w-0 flex-1 bg-transparent text-base font-medium placeholder:text-subtle focus:outline-none";
const timesAWeek = (n: number) => (n === 7 ? "every day" : n === 1 ? "once a week" : `${n} days a week`);
// Avatar · seven days · count. The weekday header and every person's row share these columns.
const GRID = "grid grid-cols-[30px_repeat(7,minmax(0,1fr))_38px] items-center gap-x-1";

/** The week: weekday letters once (today is an ink pill, like the week strip), then one row of days per person.
 *  My row is tappable for today and the six days before it; the other's is look-only. */
function Week({ h, week, today, onGoal }: { h: Habit; week: string[]; today: string; onGoal: () => void }) {
  const s = useStore();
  const people = h.owner ? s.members.filter((m) => m.id === h.owner) : s.members;
  return (
    <div className="flex flex-col gap-1">
      <div aria-hidden className={GRID}>
        <span />
        {week.map((d) => (
          <span
            key={d}
            className={cx("mx-auto grid h-6 w-7 place-items-center rounded-full text-[11px]", d === today ? "bg-fg font-bold text-page" : "font-semibold text-muted")}
          >
            {formatDay(d, { weekday: "narrow" })}
          </span>
        ))}
        <span />
      </div>
      {people.map((m) => {
        const mine = m.id === s.me;
        const count = doneIn(h, m.id, week);
        const met = count >= h.perWeek;
        const fill = PERSON_FILL[s.person(m.id) ?? "h"];
        return (
          <div key={m.id} role="group" aria-label={`${mine ? "You" : m.name}: ${count} of ${h.perWeek} this week`} className={GRID}>
            <Face member={m} />
            {week.map((d) => {
              const on = h.checks.some((c) => c.by === m.id && c.day === d);
              const dot = cx(
                "grid size-[30px] place-items-center rounded-full border-2 transition-colors",
                on ? cx("border-edge-on-fill text-on-fill", fill) : d > today ? "border-dashed border-divider" : d === today ? "border-fg bg-surface-sunken" : "border-edge-control",
              );
              const mark = (
                <AnimatePresence initial={false}>
                  {on && (
                    <motion.span key="tick" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 600, damping: 22 }}>
                      <Check aria-hidden className="size-4" strokeWidth={3} />
                    </motion.span>
                  )}
                </AnimatePresence>
              );
              return mine && d <= today ? (
                // The visible dot is 30; the button is the whole 44-tall cell.
                <motion.button
                  key={d}
                  type="button"
                  whileTap={{ scale: 0.85 }}
                  aria-pressed={on}
                  aria-label={`${formatDay(d, { weekday: "long" })}${d === today ? ", today" : ""}`}
                  onClick={() => {
                    if (!on && count + 1 === h.perWeek) onGoal();
                    s.toggleHabit(h.id, d);
                  }}
                  className="grid h-11 place-items-center"
                >
                  <span className={dot}>{mark}</span>
                </motion.button>
              ) : (
                <span key={d} className="grid h-11 place-items-center">
                  <span className={dot}>{mark}</span>
                </span>
              );
            })}
            <span aria-hidden className={cx("justify-self-end rounded-full px-1.5 py-0.5 font-display text-[13px] font-bold", met ? "border-2 border-edge-on-fill bg-habits text-on-fill" : "text-muted")}>
              {count}/{h.perWeek}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** "How automatic does this feel now?" every two weeks: five buttons, words under the two ends. */
function CheckIn({ h }: { h: Habit }) {
  const s = useStore();
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
      <div className="mt-3 flex flex-col gap-2 border-t-[1.5px] border-dashed border-divider pt-3">
        <div>
          <p className="text-sm font-bold">How automatic does this feel now?</p>
          <p className="text-xs font-semibold text-muted">We ask every two weeks. It&apos;s how you&apos;ll know the habit has stuck.</p>
        </div>
        <div role="group" aria-label="How automatic it feels, 1 to 5" className="grid grid-cols-5 gap-1.5">
          {FEELS.map((label, i) => (
            <motion.button
              key={label}
              type="button"
              whileTap={{ scale: 0.9 }}
              aria-label={`${i + 1}: ${label}`}
              onClick={() => s.rateHabit(h.id, i + 1)}
              className="h-11 rounded-control border-2 border-edge-control bg-surface font-display text-base font-bold text-fg active:border-edge-on-fill active:bg-habits active:text-on-fill"
            >
              {i + 1}
            </motion.button>
          ))}
        </div>
        <div aria-hidden className="flex justify-between text-xs font-semibold text-muted">
          <span>{FEELS[0]}</span>
          <span>{FEELS[4]}</span>
        </div>
      </div>
    </motion.div>
  );
}

function HabitCard({ h, week, today, onOpen, onCelebrate }: { h: Habit; week: string[]; today: string; onOpen?: () => void; onCelebrate: () => void }) {
  const s = useStore();
  const owner = s.member(h.owner);
  const good = goodWeeks(h, isFor(h, s.me) ? s.me : h.owner!, weekStart(today));
  const whose = h.owner ? (h.owner === s.me ? "Mine" : `${owner?.name}'s`) : "Together";
  // Cheer the other on once they've done it at least once this week (theirs, or ours).
  const other = s.members.find((m) => m.id !== s.me && isFor(h, m.id));
  const canCheer = !!other && doneIn(h, other.id, week) > 0 && !s.cheered(h.id, other.id);

  const title = (
    <>
      <span className="block font-display text-[17px] font-bold leading-snug">I&apos;ll {h.action}</span>
      <span className="block text-xs font-semibold text-muted">
        {whose}, {timesAWeek(h.perWeek)}
      </span>
    </>
  );
  return (
    <motion.li layout="position" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>
      <ListCard
        title={`After I ${h.cue},`}
        tint="habits"
        aside={
          <AnimatePresence initial={false}>
            {canCheer && (
              <motion.button
                key="cheer"
                type="button"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0, rotate: -20 }}
                whileTap={{ scale: 0.8 }}
                onClick={() => s.cheer(h.id, other!.id)}
                aria-label={`Cheer ${other!.name} on`}
                className={cx("-mr-1.5 flex h-[30px] shrink-0 items-center gap-1 rounded-full border-2 border-edge-on-fill bg-hero px-2.5 text-xs font-bold text-on-fill", HIT_44)}
              >
                <Heart className="size-3.5 fill-habits" aria-hidden strokeWidth={2.4} />
                Cheer
              </motion.button>
            )}
          </AnimatePresence>
        }
      >
        <div className="bg-surface px-3.5 pb-2 pt-3">
          <div className="flex items-start justify-between gap-3">
            {onOpen ? (
              <button type="button" onClick={onOpen} aria-haspopup="dialog" aria-label={`Edit: ${h.action}`} className="min-w-0 text-left">
                {title}
              </button>
            ) : (
              <div className="min-w-0">{title}</div>
            )}
            {good > 0 && (
              <span className="shrink-0 whitespace-nowrap">
                <StatusPill tone="habits">
                  {good} good {good === 1 ? "week" : "weeks"}
                </StatusPill>
              </span>
            )}
          </div>
          <div className="mt-2">
            <Week h={h} week={week} today={today} onGoal={onCelebrate} />
          </div>
          <AnimatePresence initial={false}>{ratingDue(h, s.me, today) && <CheckIn key="rate" h={h} />}</AnimatePresence>
          {readyToGraduate(h, s.me, today) && (
            <div className="mb-1.5 mt-3 flex flex-col gap-3 border-t-[1.5px] border-dashed border-divider pt-3">
              <div className="flex gap-3">
                <span aria-hidden className="flex size-[34px] shrink-0 items-center justify-center rounded-icon border-2 border-edge-on-fill bg-habits text-on-fill">
                  <GraduationCap className="size-[18px]" strokeWidth={2} />
                </span>
                <p className="text-sm font-medium">
                  <span className="font-bold">This one runs on its own now.</span> Graduate it to make room for a new habit.
                </p>
              </div>
              <Button
                size="sm"
                className="self-end"
                onClick={() => {
                  onCelebrate();
                  s.graduateHabit(h.id, true);
                }}
              >
                <GraduationCap aria-hidden className="size-4" strokeWidth={2.2} /> Graduate
              </Button>
            </div>
          )}
        </div>
      </ListCard>
    </motion.li>
  );
}

function HabitSheet({ h, onClose }: { h: Habit; onClose: () => void }) {
  const s = useStore();
  const [confirm, setConfirm] = useState(false);
  const meta: HabitMeta = { cue: h.cue, action: h.action, perWeek: h.perWeek };
  const edit = (patch: Partial<HabitMeta>) => s.editHabit(h.id, { ...meta, ...patch });
  const field = (key: "cue" | "action", label: string) => (
    <label className="flex h-12 items-center gap-2 rounded-control border-2 border-edge-control bg-surface px-3.5 focus-within:shadow-focus">
      <span className="shrink-0 text-sm font-bold text-muted">{label}</span>
      <input
        defaultValue={h[key]}
        maxLength={80}
        aria-label={label}
        onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== h[key] && edit({ [key]: e.target.value })}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className={cx(INPUT, "h-full font-bold")}
      />
    </label>
  );
  return (
    <Sheet label={h.action} onClose={onClose}>
      <div className="flex flex-col gap-2.5">
        {field("cue", "After I")}
        {field("action", "I'll")}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t-[1.5px] border-dashed border-divider pt-4">
        <span className="text-sm font-bold">Days a week</span>
        <Stepper label="days a week" value={h.perWeek} min={1} max={7} onChange={(perWeek) => edit({ perWeek })} />
      </div>
      <p className="mt-2 text-xs font-semibold text-muted">Aim a little under every day. The spare days are there for busy ones, so a missed day isn&apos;t a slip.</p>
      <div className="mt-6 flex items-center justify-between">
        <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>
          <Trash2 aria-hidden className="size-4" strokeWidth={2.2} /> Delete
        </Button>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              onClose();
              s.graduateHabit(h.id, true);
            }}
          >
            <GraduationCap aria-hidden className="size-4" strokeWidth={2.2} /> Graduate
          </Button>
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        title="Delete habit?"
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          onClose();
          s.removeHabit(h.id);
        }}
      >
        Its ticks and check-ins go too, for both of you. Graduating keeps them.
      </ConfirmDialog>
    </Sheet>
  );
}

export default function HabitsPage() {
  const s = useStore();
  const today = klToday();
  const monday = weekStart(today);
  const week = [0, 1, 2, 3, 4, 5, 6].map((n) => addDays(monday, n));
  const [cue, setCue] = useState("");
  const [action, setAction] = useState("");
  const [perWeek, setPerWeek] = useState(5);
  const [together, setTogether] = useState(false);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const sheetHabit = s.habits.find((h) => h.id === sheetId); // closes by itself if deleted on the other phone

  const active = s.habits.filter((h) => !h.graduatedOn);
  // Mine and ours first, then the other's.
  const shown = [...active.filter((h) => isFor(h, s.me)), ...active.filter((h) => !isFor(h, s.me))];
  const graduated = s.habits.filter((h) => h.graduatedOn).sort((a, b) => b.graduatedOn!.localeCompare(a.graduatedOn!));
  const celebrate = () => setBurst((b) => b + 1);

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!cue.trim() || !action.trim()) return;
    s.addHabit({ cue, action, perWeek }, together);
    setCue("");
    setAction("");
    setPerWeek(5);
    setTogether(false);
  }

  return (
    <Page>
      <PageHeader kicker="Small steps, most days" title="Habits" />

      {active.length === 0 && (
        <EmptyState
          icon={<Sprout strokeWidth={2} />}
          title="Pick one tiny thing and tie it to something you already do every day. After I pray Subuh, I'll read one page."
        />
      )}

      {shown.length > 0 && (
        <ul className="flex flex-col gap-3.5">
          <AnimatePresence initial={false}>
            {shown.map((h) => (
              <HabitCard key={h.id} h={h} week={week} today={today} onOpen={isFor(h, s.me) ? () => setSheetId(h.id) : undefined} onCelebrate={celebrate} />
            ))}
          </AnimatePresence>
        </ul>
      )}

      {/* Adding is rare and ticking is daily, so the form sits below the list. */}
      <form onSubmit={add} className="rounded-card border-2 border-dashed border-edge-control text-fg transition-shadow focus-within:border-solid focus-within:bg-surface focus-within:shadow-focus">
        <label className="flex items-center gap-2 pl-3.5 pr-1.5">
          <span className="shrink-0 text-sm font-bold text-muted">After I</span>
          <input value={cue} onChange={(e) => setCue(e.target.value)} maxLength={80} enterKeyHint="next" placeholder="pray Subuh…" aria-label="After I (something you already do every day)" className={cx(INPUT, "h-12")} />
        </label>
        <div className="flex items-center gap-2 border-t-[1.5px] border-dashed border-divider pl-3.5 pr-1.5">
          <span className="shrink-0 text-sm font-bold text-muted">I&apos;ll</span>
          <input value={action} onChange={(e) => setAction(e.target.value)} maxLength={80} enterKeyHint="done" placeholder="read one page…" aria-label="I'll (the new habit, tiny to start)" className={cx(INPUT, "h-12")} />
          <button
            type="submit"
            aria-label="Add habit"
            disabled={!cue.trim() || !action.trim()}
            className={cx("flex size-9 shrink-0 items-center justify-center rounded-icon border-2 border-edge-control bg-primary text-primary-fg transition-opacity disabled:opacity-40", HIT_44)}
          >
            <Plus className="size-5" strokeWidth={2.6} />
          </button>
        </div>
        <AnimatePresence initial={false}>
          {(cue.trim() || action.trim()) && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="flex flex-col gap-3 border-t-[1.5px] border-dashed border-divider px-3.5 pb-3 pt-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold">Days a week</span>
                  <Stepper label="days a week" value={perWeek} min={1} max={7} onChange={setPerWeek} />
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Whose habit">
                  <Chip selected={!together} fill={PERSON_FILL[s.person(s.me) ?? "h"]} onClick={() => setTogether(false)}>
                    Just me
                  </Chip>
                  <Chip selected={together} fill="bg-habits" onClick={() => setTogether(true)}>
                    Together
                  </Chip>
                </div>
                <p className="text-xs font-semibold text-muted">Start smaller than feels useful: one page, one push-up. Once it&apos;s easy, it grows on its own.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {graduated.length > 0 && (
        <ListCard title="Habits we've built" tint="habits" aside={<CountBadge count={graduated.length} tone="habits" />}>
            <ul className="divide-y-[1.5px] divide-dashed divide-divider">
              {graduated.map((h) => (
                <li key={h.id} className="flex min-h-[54px] items-center gap-2 bg-surface pl-3.5 pr-1.5">
                  <span className="min-w-0 flex-1 py-2">
                    <span className="block text-sm font-bold">{sentence(h.action)}</span>
                    <span className="block text-xs font-semibold text-muted">
                      After I {h.cue}. Graduated {formatDay(h.graduatedOn!, { day: "numeric", month: "short", ...(h.graduatedOn!.slice(0, 4) !== today.slice(0, 4) && { year: "numeric" }) })}
                    </span>
                  </span>
                  {h.owner ? <Face member={s.member(h.owner)} /> : null}
                  {isFor(h, s.me) && (
                    <button type="button" onClick={() => s.graduateHabit(h.id, false)} aria-label={`Bring back ${h.action}`} className="flex size-11 shrink-0 items-center justify-center text-muted">
                      <Undo2 aria-hidden className="size-5" strokeWidth={2.2} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
        </ListCard>
      )}

      <AnimatePresence>{sheetHabit && <HabitSheet key={sheetHabit.id} h={sheetHabit} onClose={() => setSheetId(null)} />}</AnimatePresence>
      {burst > 0 && <Confetti key={burst} />}
    </Page>
  );
}
