"use client";

import { use, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BriefcaseBusiness, CalendarDays, ChevronLeft, ChevronRight, Clock, Eraser, Flag, Moon, Paintbrush, Plane, Plus, Repeat, Star, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/components/kit/button";
import { cardClass } from "@/components/kit/card";
import { Field } from "@/components/kit/field";
import { IconBox } from "@/components/kit/list";
import { Chip, Tick, chipClass } from "@/components/kit/selection";
import { cx, openPicker } from "@/components/kit/shared";
import { Sheet } from "@/components/sheet";
import { Face, Page, PageHeader, Quiet, Section } from "@/components/ui";
import { addDays, addYears, daysBetween, formatDay, formatTime, klToday, monthWeeks, nextStart, relativeDue, shortTime, timeSpan, yearsOn, yearsSince } from "@/lib/date";
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
const range = (p: Plan) =>
  p.yearly
    ? `Every year, ${formatDay(p.start, { day: "numeric", month: "short" })}`
    : p.start === p.end ? formatDay(p.start, { day: "numeric", month: "short" }) : `${formatDay(p.start, { day: "numeric", month: "short" })} – ${formatDay(p.end, { day: "numeric", month: "short" })}`;

function moveMonth(month: string, n: number) {
  const d = new Date(`${month}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
}

/** A chip that opens the iPhone date or time wheel: the native input is laid over it, as in To-do. */
function PickerChip({ type, label, value, min, selected, onChange, children }: { type: "date" | "time"; label: string; value: string; min?: string; selected: boolean; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className={chipClass(selected)}>
      {children}
      <input type={type} aria-label={label} value={value} min={min} onChange={(e) => onChange(e.target.value)} onClick={(e) => openPicker(e.currentTarget)} className="absolute inset-0 cursor-pointer opacity-0" />
    </label>
  );
}

/** Type the year (1998) instead of scrolling the wheel back decades. Only a full, sensible year is applied. */
function YearChip({ value, onChange }: { value: string; onChange: (ymd: string) => void }) {
  const [text, setText] = useState(value.slice(0, 4));
  const thisYear = Number(klToday().slice(0, 4));
  return (
    <label className={cx(chipClass(true), "pr-2")}>
      Year
      <input
        inputMode="numeric"
        maxLength={4}
        aria-label="Year it first happened"
        value={text}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const t = e.target.value.replace(/\D/g, "");
          setText(t);
          const y = Number(t);
          if (t.length === 4 && y >= 1900 && y <= thisYear) onChange(addYears(value, y - Number(value.slice(0, 4))));
        }}
        onBlur={() => setText(value.slice(0, 4))} // half-typed: snap back to the saved year
        className="w-[3.25rem] bg-transparent text-base font-bold focus:outline-none"
      />
    </label>
  );
}

/** "Sun 30 Aug", or "30 Aug 2025" when it isn't this year. */
const chipDate = (d: string) => formatDay(d, d.slice(0, 4) === klToday().slice(0, 4) ? { weekday: "short", day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
const ROWS = "mt-4 flex flex-col gap-3 border-t-[1.5px] border-dashed border-divider pt-4";

function PlanSheet({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const s = useStore();
  const [p, setP] = useState(plan);
  const isNew = !s.plans.some((x) => x.id === plan.id);
  const set = (patch: Partial<Plan>) => setP((v) => ({ ...v, ...patch }));
  const days = daysBetween(p.start, p.end) + 1;
  const tooLong = days > 91;
  const valid = !!p.title.trim() && !tooLong;
  const next = p.yearly ? nextStart(p, klToday()) : null;
  // One sentence, only when the chips alone don't say it all.
  const line = tooLong
    ? "An event can last up to 90 days. Pick an earlier end date."
    : next
      ? next.years
        ? `Next: ${formatDay(next.start, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}, ${yearsSince(next.years, p.start)}.`
        : "Type the year it first happened (her birth year, your wedding year) and the app counts the years for you."
      : days > 1
        ? `${days} days.`
        : null;

  return (
    <Sheet label={isNew ? "New event" : p.title} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          s.savePlan(p);
          onClose();
        }}
      >
        <input value={p.title} onChange={(e) => set({ title: e.target.value })} maxLength={100} aria-label="What" placeholder="Trip, birthday, appointment…" className={BIG_INPUT} />

        <div className={ROWS}>
          <div className="flex flex-wrap items-center gap-2">
            {/* Moving the start keeps the length, so a 4-day trip stays 4 days. */}
            {p.yearly ? (
              <>
                {/* Yearly: the wheel picks the day; the year chip next to it says which year it started. */}
                <PickerChip type="date" label="Date" value={p.start} selected onChange={(v) => {
                    if (!v) return;
                    const start = addYears(v, Number(p.start.slice(0, 4)) - Number(v.slice(0, 4))); // keep the typed year
                    set({ start, end: start });
                  }}
                >
                  <CalendarDays aria-hidden />
                  {formatDay(p.start, { day: "numeric", month: "short" })}
                </PickerChip>
                <YearChip value={p.start} onChange={(v) => set({ start: v, end: v })} />
              </>
            ) : (
              <PickerChip type="date" label="Date" value={p.start} selected onChange={(v) => v && set({ start: v, end: addDays(v, days - 1) })}>
                <CalendarDays aria-hidden />
                {chipDate(p.start)}
              </PickerChip>
            )}
            {!p.yearly && (
              <PickerChip type="date" label="End date" value={p.end} min={p.start} selected={days > 1} onChange={(v) => set({ end: v && v > p.start ? v : p.start })}>
                {days > 1 ? (
                  `Until ${chipDate(p.end)}`
                ) : (
                  <>
                    <Plus aria-hidden /> End date
                  </>
                )}
              </PickerChip>
            )}
            <PickerChip type="time" label="Time" value={p.at ?? ""} selected={!!p.at} onChange={(v) => set({ at: v || undefined })}>
              <Clock aria-hidden />
              {p.at ? formatTime(p.at) : "All day"}
            </PickerChip>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Chip selected={!p.member} onClick={() => set({ member: undefined })}>
              Both of us
            </Chip>
            {s.members.map((m) => (
              <Chip key={m.id} selected={p.member === m.id} fill={PERSON_FILL[s.person(m.id) ?? "h"]} onClick={() => set({ member: m.id })}>
                {m.name}
              </Chip>
            ))}
            <span aria-hidden className="mx-0.5 h-6 border-l-[1.5px] border-dashed border-divider" />
            <Chip selected={p.important} onClick={() => set({ important: !p.important })}>
              <Star aria-hidden /> Important
            </Chip>
            {/* Yearly dates are one day (a birthday, an anniversary). */}
            <Chip selected={p.yearly} onClick={() => set({ yearly: !p.yearly, end: p.start })}>
              <Repeat aria-hidden /> Every year
            </Chip>
          </div>

          {line && (
            <p role={tooLong ? "alert" : undefined} className={cx("text-xs font-semibold", tooLong ? "text-error-text" : "text-muted")}>
              {line}
            </p>
          )}

          <input
            value={p.note ?? ""}
            onChange={(e) => set({ note: e.target.value })}
            maxLength={500}
            aria-label="Note"
            placeholder="Add a note"
            className="h-12 w-full rounded-control border-2 border-edge-control bg-surface px-3.5 text-base font-medium text-fg placeholder:text-subtle focus:shadow-focus"
          />
        </div>

        <div className="mt-6 flex items-center justify-between">
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
            {isNew ? "Add event" : "Save"}
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
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          s.addTodo(title, { assignee: s.me, due, dueTime: time || undefined, priority: 1, tags: [] });
          onClose();
        }}
      >
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} aria-label="What's due" placeholder="Assignment 2 report" className={BIG_INPUT} />
        <div className={ROWS}>
          <div className="flex flex-wrap items-center gap-2">
            <PickerChip type="date" label="Due date" value={due} selected onChange={(v) => v && setDue(v)}>
              <CalendarDays aria-hidden />
              {chipDate(due)}
            </PickerChip>
            <PickerChip type="time" label="Due by" value={time} selected={!!time} onChange={setTime}>
              <Clock aria-hidden />
              {time ? `by ${formatTime(time)}` : "Any time"}
            </PickerChip>
          </div>
          <p className="text-xs font-semibold text-muted">Goes on the to-do list too, marked important, for you.</p>
        </div>
        <div className="mt-6 flex justify-end">
          <Button type="submit" size="sm" disabled={!title.trim()}>
            Add deadline
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

export default function CalendarPage({ searchParams }: { searchParams: Promise<{ day?: string | string[] }> }) {
  const s = useStore();
  const today = klToday();
  // ?day=YYYY-MM-DD (from the Today week strip) opens on that day.
  const asked = use(searchParams).day;
  const start = typeof asked === "string" && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : today;
  const [month, setMonth] = useState(start.slice(0, 7));
  const [day, setDay] = useState(start);
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
  const plansToday = s.plans.filter((p) => yearsOn(p, day) !== null);

  // Free together: days we know her roster for (up to her last painted day), with no shift and no events (birthdays and other yearly dates don't count as busy).
  const lastShift = s.shifts.filter((x) => x.member === who).at(-1)?.day;
  const freeDays: string[] = [];
  for (let d = today; lastShift && d <= lastShift && freeDays.length < 6 && d <= addDays(today, 30); d = addDays(d, 1)) {
    if (!s.shifts.some((x) => x.day === d) && !s.plans.some((p) => !p.yearly && yearsOn(p, d) !== null)) freeDays.push(d);
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
            const plans = s.plans.filter((p) => yearsOn(p, d) !== null);
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
                  {plans.some((p) => p.important) ? (
                    <Star aria-hidden className="-mt-[3px] size-[11px] fill-plans" strokeWidth={2.2} />
                  ) : (
                    plans.length > 0 && <span className="size-[5px] rounded-full border border-edge-on-fill bg-plans" />
                  )}
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
                    {p.important ? <Star strokeWidth={2} /> : p.start !== p.end ? <Plane strokeWidth={2} /> : <CalendarDays strokeWidth={2} />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-bold">{p.title}</span>
                    <span className="text-xs font-semibold text-muted">
                      {[(p.yearly || p.start !== p.end) && range(p), p.yearly && !!yearsOn(p, day) && yearsSince(yearsOn(p, day)!, p.start), p.at && formatTime(p.at), p.member ? `for ${s.member(p.member)?.name}` : "both of us", p.note].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => setOpen({ plan: { id: crypto.randomUUID(), title: "", start: day, end: day, yearly: false, important: false } })}>
                <Plus aria-hidden className="size-4" strokeWidth={2.6} /> Event
              </Button>
              <Button variant="secondary" onClick={() => setOpen({ deadline: true })}>
                <Flag aria-hidden className="size-4" strokeWidth={2.2} /> Deadline
              </Button>
            </div>
          </Section>

          {freeDays.length > 0 && (
            <Section title="Free together" note="no shift, no events">
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
