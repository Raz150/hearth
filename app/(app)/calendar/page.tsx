"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BriefcaseBusiness, CalendarDays, ChevronLeft, ChevronRight, Eraser, Flag, Moon, Paintbrush, Plane, Plus, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/components/kit/button";
import { cardClass } from "@/components/kit/card";
import { Field } from "@/components/kit/field";
import { IconBox } from "@/components/kit/list";
import { Chip, Tick } from "@/components/kit/selection";
import { cx } from "@/components/kit/shared";
import { Sheet } from "@/components/sheet";
import { Face, Page, PageHeader, Quiet, Section } from "@/components/ui";
import { addDays, daysBetween, formatDay, formatTime, klToday, monthWeeks, relativeDue, shortTime, timeSpan } from "@/lib/date";
import { useStore, type Plan, type Shift } from "@/lib/store";

type ShiftTimes = Pick<Shift, "label" | "starts" | "ends">;

/** Her usual shifts; anything else is Custom. */
const PRESETS: readonly ShiftTimes[] = [
  { label: "Morning", starts: "07:30", ends: "14:30" },
  { label: "Office", starts: "08:00", ends: "17:00" },
  { label: "Long", starts: "10:00", ends: "21:30" },
  { label: "Afternoon", starts: "14:30", ends: "21:30" },
  { label: "Night", starts: "21:30", ends: "07:30" },
];

const PERSON_FILL = { h: "bg-person-h", w: "bg-person-w" } as const;
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const BIG_INPUT =
  "h-12 w-full rounded-control border-2 border-edge-control bg-surface px-3.5 font-display text-xl font-bold text-fg placeholder:text-subtle focus:shadow-focus";

const longDay = (d: string) => formatDay(d, { weekday: "long", day: "numeric", month: "long" });
const covers = (p: Plan, d: string) => p.start <= d && d <= p.end;
const range = (p: Plan) =>
  p.start === p.end ? formatDay(p.start, { day: "numeric", month: "short" }) : `${formatDay(p.start, { day: "numeric", month: "short" })} – ${formatDay(p.end, { day: "numeric", month: "short" })}`;

function moveMonth(month: string, n: number) {
  const d = new Date(`${month}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
}

function PlanSheet({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const s = useStore();
  const [p, setP] = useState(plan);
  const isNew = !s.plans.some((x) => x.id === plan.id);
  const set = (patch: Partial<Plan>) => setP((v) => ({ ...v, ...patch }));
  const valid = !!p.title.trim() && !!p.start && !!p.end && p.end >= p.start && daysBetween(p.start, p.end) <= 90;
  return (
    <Sheet label={isNew ? "New plan" : p.title} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          s.savePlan(p);
          onClose();
        }}
      >
        <input value={p.title} onChange={(e) => set({ title: e.target.value })} maxLength={100} aria-label="What" placeholder="Trip to Langkawi" className={BIG_INPUT} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="From" type="date" required value={p.start} onChange={(e) => set({ start: e.target.value, end: p.end < e.target.value ? e.target.value : p.end })} />
          <Field label="To" type="date" required min={p.start} value={p.end} onChange={(e) => set({ end: e.target.value })} />
        </div>
        <Field label="Time (empty = all day)" type="time" value={p.at ?? ""} onChange={(e) => set({ at: e.target.value || undefined })} />
        <div role="group" aria-label="Who" className="flex flex-wrap gap-2">
          <Chip selected={!p.member} onClick={() => set({ member: undefined })}>
            Both of us
          </Chip>
          {s.members.map((m) => (
            <Chip key={m.id} selected={p.member === m.id} fill={PERSON_FILL[s.person(m.id) ?? "h"]} onClick={() => set({ member: m.id })}>
              {m.name}
            </Chip>
          ))}
        </div>
        <Field label="Note" maxLength={500} value={p.note ?? ""} onChange={(e) => set({ note: e.target.value })} />
        <div className="flex items-center justify-between">
          {isNew ? (
            <span />
          ) : (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                onClose();
                s.removePlan(p.id);
              }}
            >
              <Trash2 aria-hidden className="size-4" strokeWidth={2.2} /> Delete
            </Button>
          )}
          <Button type="submit" size="sm" disabled={!valid}>
            {isNew ? "Add" : "Save"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

/** A deadline is a to-do for me with a date and time, so it also shows (and gets ticked) in To-do. */
function DeadlineSheet({ day, onClose }: { day: string; onClose: () => void }) {
  const s = useStore();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(day);
  const [time, setTime] = useState("23:59");
  return (
    <Sheet label="New deadline" onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim() || !due) return;
          s.addTodo(title, { assignee: s.me, due, dueTime: time || undefined, priority: 1, tags: [] });
          onClose();
        }}
      >
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} aria-label="What's due" placeholder="Assignment 2 report" className={BIG_INPUT} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Due" type="date" required value={due} onChange={(e) => setDue(e.target.value)} />
          <Field label="By" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <p className="text-xs font-semibold text-muted">It goes on the to-do list too, marked important and for you.</p>
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={!title.trim() || !due}>
            Add
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

export default function CalendarPage() {
  const s = useStore();
  const today = klToday();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [day, setDay] = useState(today);
  // Painting: which shift a tap puts down (index into PRESETS, custom times, or clear). null = just looking.
  const [brush, setBrush] = useState<number | "custom" | "clear" | null>(null);
  const [custom, setCustom] = useState({ starts: "14:30", ends: "23:00" });
  // Whose roster: whoever already has shifts, else the other person.
  const [who, setWho] = useState(() => s.members.find((m) => s.shifts.some((x) => x.member === m.id))?.id ?? s.members.find((m) => m.id !== s.me)?.id ?? s.me);
  const [open, setOpen] = useState<{ plan: Plan } | { deadline: true } | null>(null);

  const painting = brush !== null;
  const paint: ShiftTimes | null = typeof brush === "number" ? PRESETS[brush] : brush === "custom" ? { label: "Shift", ...custom } : null;
  const whoFill = PERSON_FILL[s.person(who) ?? "w"];

  function tap(d: string) {
    if (!painting) {
      setDay(d);
      if (d.slice(0, 7) !== month) setMonth(d.slice(0, 7));
      return;
    }
    const cur = s.shifts.find((x) => x.member === who && x.day === d);
    const same = cur && paint && cur.label === paint.label && cur.starts === paint.starts && cur.ends === paint.ends;
    s.setShift(who, d, same ? null : paint); // tapping the same shift again takes it off
  }

  // The agenda for the picked day. An overnight shift from the night before still counts this morning.
  const shiftsToday = s.shifts.filter((x) => x.day === day || (x.day === addDays(day, -1) && x.ends < x.starts));
  const dueToday = s.todos.filter((t) => t.due === day).sort((a, b) => (a.dueTime ?? "~").localeCompare(b.dueTime ?? "~"));
  const plansToday = s.plans.filter((p) => covers(p, day));

  // Free together: days we know her roster for (up to her last painted day), with no shift and no plans.
  const lastShift = s.shifts.filter((x) => x.member === who).at(-1)?.day;
  const freeDays: string[] = [];
  for (let d = today; lastShift && d <= lastShift && freeDays.length < 6 && d <= addDays(today, 30); d = addDays(d, 1)) {
    if (!s.shifts.some((x) => x.day === d) && !s.plans.some((p) => covers(p, d))) freeDays.push(d);
  }

  const title = formatDay(`${month}-01`, month.slice(0, 4) === today.slice(0, 4) ? { month: "long" } : { month: "long", year: "numeric" });

  return (
    <Page>
      <PageHeader
        kicker="Our calendar"
        title={title}
        aside={
          <div className="flex gap-2">
            <IconButton label="Previous month" onClick={() => setMonth(moveMonth(month, -1))}>
              <ChevronLeft strokeWidth={2.4} />
            </IconButton>
            <IconButton label="Next month" onClick={() => setMonth(moveMonth(month, 1))}>
              <ChevronRight strokeWidth={2.4} />
            </IconButton>
          </div>
        }
      />

      <div className="flex items-center justify-between gap-2">
        {month !== today.slice(0, 7) || day !== today ? (
          <Chip
            selected={false}
            onClick={() => {
              setMonth(today.slice(0, 7));
              setDay(today);
            }}
          >
            Today
          </Chip>
        ) : (
          <span />
        )}
        <Button size="sm" variant={painting ? "primary" : "secondary"} aria-pressed={painting} onClick={() => setBrush(painting ? null : 0)}>
          {painting ? "Done" : (
            <>
              <Paintbrush aria-hidden className="size-4" strokeWidth={2.2} /> Shifts
            </>
          )}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {painting && (
          <motion.section
            aria-label="Paint shifts"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className={cx(cardClass("info"), "flex flex-col gap-3 p-3.5")}>
              <p className="text-[13px] font-semibold text-muted">Pick a shift, then tap the days. Tap a day again to take it off.</p>
              {s.members.length > 1 && (
                <div role="group" aria-label="Whose shifts" className="flex flex-wrap gap-2">
                  {s.members.map((m) => (
                    <Chip key={m.id} selected={who === m.id} fill={PERSON_FILL[s.person(m.id) ?? "h"]} onClick={() => setWho(m.id)}>
                      {m.name}
                    </Chip>
                  ))}
                </div>
              )}
              <div role="group" aria-label="Shift" className="flex flex-wrap gap-2">
                {PRESETS.map((p, i) => (
                  <Chip key={p.label} selected={brush === i} fill={whoFill} onClick={() => setBrush(i)}>
                    {p.label} <span className="font-medium">{shortTime(p.starts)}–{shortTime(p.ends)}</span>
                  </Chip>
                ))}
                <Chip selected={brush === "custom"} fill={whoFill} onClick={() => setBrush("custom")}>
                  Custom
                </Chip>
                <Chip selected={brush === "clear"} fill="bg-danger" onClick={() => setBrush("clear")}>
                  <Eraser aria-hidden /> Clear
                </Chip>
              </div>
              {brush === "custom" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Starts" type="time" value={custom.starts} onChange={(e) => e.target.value && setCustom((c) => ({ ...c, starts: e.target.value }))} />
                  <Field label="Ends" type="time" value={custom.ends} onChange={(e) => e.target.value && e.target.value !== custom.starts && setCustom((c) => ({ ...c, ends: e.target.value }))} />
                </div>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <div className={cx(cardClass("info"), "p-2")}>
        <div aria-hidden className="grid grid-cols-7 pb-1 text-center text-[11px] font-semibold text-muted">
          {WEEKDAYS.map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {monthWeeks(`${month}-01`).flat().map((d) => {
            const shift = s.shifts.find((x) => x.day === d);
            const due = s.todos.filter((t) => t.due === d && !t.doneBy).length;
            const plans = s.plans.filter((p) => covers(p, d));
            const picked = !painting && d === day;
            const label = [longDay(d), d === today && "today", shift && `${s.member(shift.member)?.name ?? ""} ${shift.label} shift`, due && `${due} due`, ...plans.map((p) => p.title)].filter(Boolean).join(", ");
            return (
              <button
                key={d}
                type="button"
                onClick={() => tap(d)}
                aria-label={label}
                aria-pressed={painting ? undefined : picked}
                className={cx(
                  "flex h-[62px] flex-col items-center gap-1 rounded-[10px] border-2 pt-1 transition-colors",
                  picked ? "border-edge-control bg-surface-sunken" : "border-transparent",
                  d.slice(0, 7) !== month && "opacity-40",
                )}
              >
                <span className={cx("grid size-6 place-items-center rounded-full font-display text-[15px] font-bold leading-none", d === today && "bg-fg text-page", d < today && d !== today && "text-muted")}>
                  {Number(d.slice(8))}
                </span>
                {shift ? (
                  <motion.span
                    key={shift.label + shift.starts}
                    initial={{ scale: 0.6 }}
                    animate={{ scale: 1 }}
                    className={cx("flex h-4 w-full max-w-11 items-center justify-center gap-px rounded-[5px] border-[1.5px] border-edge-on-fill text-[10px] font-bold leading-none text-on-fill", PERSON_FILL[s.person(shift.member) ?? "w"])}
                  >
                    {shift.ends < shift.starts && <Moon aria-hidden className="size-2.5" strokeWidth={2.6} />}
                    {shortTime(shift.starts)}
                  </motion.span>
                ) : (
                  <span className="h-4" />
                )}
                <span className="flex h-[5px] gap-0.5">
                  {due > 0 && <span className="size-[5px] rounded-full border border-edge-on-fill bg-shopping" />}
                  {plans.length > 0 && <span className="size-[5px] rounded-full border border-edge-on-fill bg-plans" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {!painting && (
        <>
          <Section title={longDay(day)} note={day >= today ? relativeDue(day, today) : undefined}>
            <div className={cx(cardClass("info"), "divide-y-[1.5px] divide-dashed divide-divider")}>
              {shiftsToday.length + dueToday.length + plansToday.length === 0 && <Quiet>Nothing on this day.</Quiet>}
              {shiftsToday.map((x) => (
                <div key={x.id} className="flex min-h-[54px] items-center gap-3 px-3.5 py-2">
                  <span aria-hidden className={cx("flex size-[34px] shrink-0 items-center justify-center rounded-icon border-2 border-edge-on-fill text-on-fill [&_svg]:size-[18px]", PERSON_FILL[s.person(x.member) ?? "w"])}>
                    {x.ends < x.starts ? <Moon strokeWidth={2} /> : <BriefcaseBusiness strokeWidth={2} />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-bold">
                      {s.member(x.member)?.name}: {x.label}
                      {x.day !== day && " (from last night)"}
                    </span>
                    <span className="text-xs font-semibold text-muted">{x.day === day ? timeSpan(x.starts, x.ends) : `Until ${formatTime(x.ends)}`}</span>
                  </span>
                </div>
              ))}
              {dueToday.map((t) => (
                <div key={t.id} className="flex min-h-[54px] items-center gap-3 pl-3.5 pr-1.5">
                  <IconBox tone="shopping">
                    <Flag strokeWidth={2} />
                  </IconBox>
                  <span className="flex min-w-0 flex-1 flex-col py-2">
                    <span className={cx("text-sm font-bold", t.doneBy && "text-subtle line-through")}>{t.title}</span>
                    <span className="text-xs font-semibold text-muted">
                      {t.doneBy ? `done by ${s.member(t.doneBy)?.name}` : t.dueTime ? `Due by ${formatTime(t.dueTime)}` : "Due today"}
                    </span>
                  </span>
                  <Face member={s.member(t.assignee)} />
                  <Tick label={`Done: ${t.title}`} checked={!!t.doneBy} onChange={() => s.toggleTodo(t.id)} />
                </div>
              ))}
              {plansToday.map((p) => (
                <button key={p.id} type="button" aria-haspopup="dialog" onClick={() => setOpen({ plan: p })} className="flex min-h-[54px] w-full items-center gap-3 px-3.5 py-2 text-left">
                  <span aria-hidden className="flex size-[34px] shrink-0 items-center justify-center rounded-icon border-2 border-edge-on-fill bg-plans text-on-fill [&_svg]:size-[18px]">
                    {p.start !== p.end ? <Plane strokeWidth={2} /> : <CalendarDays strokeWidth={2} />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-bold">{p.title}</span>
                    <span className="text-xs font-semibold text-muted">
                      {[p.start !== p.end && range(p), p.at && formatTime(p.at), p.member ? `for ${s.member(p.member)?.name}` : "both of us", p.note].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => setOpen({ plan: { id: crypto.randomUUID(), title: "", start: day, end: day } })}>
                <Plus aria-hidden className="size-4" strokeWidth={2.6} /> Plan
              </Button>
              <Button variant="secondary" onClick={() => setOpen({ deadline: true })}>
                <Flag aria-hidden className="size-4" strokeWidth={2.2} /> Deadline
              </Button>
            </div>
          </Section>

          {freeDays.length > 0 && (
            <Section title="Free together" note="no shift, no plans">
              <div className="flex flex-wrap gap-2">
                {freeDays.map((d) => (
                  <Chip key={d} selected={d === day} fill="bg-plans" onClick={() => tap(d)}>
                    {formatDay(d, { weekday: "short", day: "numeric", month: "short" })}
                  </Chip>
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      <AnimatePresence>
        {open && "plan" in open && <PlanSheet key={open.plan.id} plan={open.plan} onClose={() => setOpen(null)} />}
        {open && "deadline" in open && <DeadlineSheet key="deadline" day={day} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </Page>
  );
}
