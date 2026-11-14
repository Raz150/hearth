"use client";

import { useEffect, useState } from "react";
import { BriefcaseBusiness, CalendarDays, Flag, ListChecks, Moon, Plane, Sparkles, Star } from "lucide-react";
import { StatTile, cardClass } from "@/components/kit/card";
import { ListCard, ListRow, Timeline } from "@/components/kit/list";
import { WeekStrip, type DayMarks } from "@/components/kit/nav";
import { FILL, type Tone } from "@/components/kit/shared";
import { StickyNote } from "@/components/note";
import { Typewriter } from "@/components/typewriter";
import { Confetti, Faces, Page, PageHeader, Quiet, Section } from "@/components/ui";
import { addDays, formatDay, formatTime, klToday, nextStart, relativeDue, timeSpan, yearsOn, yearsSince } from "@/lib/date";
import { klTime, useStore, type LogEntry } from "@/lib/store";

/** Colour = meaning: each kind of log line wears its category. */
const KIND_TONE: Record<LogEntry["kind"], Tone> = { todo: "shopping", chore: "chores", note: "hero", thanks: "hero", doa: "done" };

export default function Today() {
  const s = useStore();
  const today = klToday();
  const todos = s.todos.filter((t) => t.due && t.due <= today);
  // Chores done today stay visible (ticked), like to-dos.
  const chores = s.chores.filter((c) => c.nextDue <= today || c.lastOn === today);
  const todosLeft = todos.filter((t) => !t.doneBy).length;
  const choresDone = chores.filter((c) => c.lastOn === today).length;
  const left = todosLeft + chores.length - choresDone;
  const log = s.log.filter((l) => klToday(new Date(l.at)) === today);
  const didToday = log.length > 0;
  // The week strip picks which day the Calendar card shows; swiping pages a week and keeps the weekday.
  const [week, setWeek] = useState(0);
  const [picked, setPicked] = useState(today);
  const days = [-3, -2, -1, 0, 1, 2, 3].map((n) => addDays(today, n + 7 * week));
  const backToToday = () => {
    setWeek(0);
    setPicked(today);
  };

  const shiftFill = (id: string) => (s.person(id) === "h" ? "bg-person-h" : "bg-person-w");
  const todosOn = (d: string) => s.todos.filter((t) => !t.doneBy && t.due === d);
  const choresOn = (d: string) => (d < today ? [] : s.chores.filter((c) => (d === today ? c.nextDue <= d && c.lastOn !== today : c.nextDue === d)));
  const plansOn = (d: string) => s.plans.filter((p) => yearsOn(p, d) !== null);
  // Shifts that touch a day, incl. an overnight one from the night before.
  const shiftsOn = (d: string) => s.shifts.filter((x) => x.day === d || (x.day === addDays(d, -1) && x.ends < x.starts));

  const marks: Record<string, DayMarks> = {};
  for (const d of days) {
    const shifts = s.shifts.filter((x) => x.day === d);
    const [t, c, p] = [todosOn(d).length, choresOn(d).length, plansOn(d)];
    marks[d] = {
      shifts: shifts.map((x) => shiftFill(x.member)),
      dots: [t && "shopping", c && "chores", p.length && "plans"].filter(Boolean) as Tone[],
      label: [...shifts.map((x) => `${s.member(x.member)?.name} ${x.label} shift`), t && `${t} to do`, c && `${c} ${c === 1 ? "chore" : "chores"}`, ...p.map((x) => x.title)].filter(Boolean).join(", "),
    };
  }

  // Another day's agenda: shifts, plans, to-dos and chores due that day.
  const dayItems = [
    ...shiftsOn(picked).map((x) => ({
      id: x.id,
      fill: shiftFill(x.member),
      icon: x.ends < x.starts ? <Moon strokeWidth={2} /> : <BriefcaseBusiness strokeWidth={2} />,
      title: `${s.member(x.member)?.name}: ${x.label}${x.day !== picked ? " (from the night before)" : ""}`,
      meta: x.day === picked ? timeSpan(x.starts, x.ends) : `Until ${formatTime(x.ends)}`,
    })),
    ...plansOn(picked).map((p) => ({
      id: p.id,
      fill: "bg-plans",
      icon: p.important ? <Star strokeWidth={2} /> : p.start !== p.end ? <Plane strokeWidth={2} /> : <CalendarDays strokeWidth={2} />,
      title: p.title,
      meta: [p.at ? formatTime(p.at) : "All day", p.yearly && yearsOn(p, picked) ? yearsSince(yearsOn(p, picked)!, p.start) : ""].filter(Boolean).join(", "),
    })),
    ...todosOn(picked).map((t) => ({
      id: t.id,
      fill: FILL.shopping,
      icon: <Flag strokeWidth={2} />,
      title: t.title,
      meta: [t.dueTime ? `Due by ${formatTime(t.dueTime)}` : "To do", s.member(t.assignee) && `for ${s.member(t.assignee)?.name}`].filter(Boolean).join(", "),
    })),
    ...choresOn(picked).map((c) => ({ id: c.id, fill: FILL.chores, icon: <Sparkles strokeWidth={2} />, title: c.title, meta: "Chore due" })),
  ];

  // Calendar card for today: shifts that touch today (incl. last night's) and today's plans; "Coming up" below.
  const yesterday = addDays(today, -1);
  // Coming up: important dates in the next 30 days, other events in the next 7. Nothing further out.
  const soon = s.plans
    .map((p) => ({ p, next: nextStart(p, addDays(today, 1)) }))
    .filter((x) => x.next !== null && x.next.start <= addDays(today, x.p.important ? 30 : 7))
    .sort((a, b) => a.next!.start.localeCompare(b.next!.start));
  const calendar = [
    ...s.shifts
      .filter((x) => x.day === today || (x.day === yesterday && x.ends < x.starts))
      .map((x) => ({
        id: x.id,
        fill: shiftFill(x.member),
        icon: x.ends < x.starts ? <Moon strokeWidth={2} /> : <BriefcaseBusiness strokeWidth={2} />,
        title: `${s.member(x.member)?.name}: ${x.label}${x.day === yesterday ? " (from last night)" : ""}`,
        meta: x.day === today ? timeSpan(x.starts, x.ends) : `Until ${formatTime(x.ends)}`,
      })),
    ...s.plans
      .filter((p) => yearsOn(p, today) !== null)
      .map((p) => ({ id: p.id, fill: "bg-plans", icon: p.important ? <Star strokeWidth={2} /> : <CalendarDays strokeWidth={2} />, title: p.title, meta: [p.at ? formatTime(p.at) : "Today", p.yearly && yearsOn(p, today) ? yearsSince(yearsOn(p, today)!, p.start) : ""].filter(Boolean).join(", ") })),
  ];
  const comingUp = soon.map(({ p, next }) => ({
    id: `${p.id}-next`,
    fill: "bg-plans",
    icon: p.important ? <Star strokeWidth={2} /> : <Plane strokeWidth={2} />,
    title: p.title,
    meta: [`${formatDay(next!.start, { weekday: "short", day: "numeric", month: "short" })}, ${relativeDue(next!.start, today)}`, p.yearly && next!.years ? yearsSince(next!.years, p.start) : ""].filter(Boolean).join(", "),
  }));

  const isToday = picked === today;
  const items = isToday ? calendar : dayItems;
  const row = (c: (typeof items)[number]) => (
    <div key={c.id} className="flex min-h-[54px] items-center gap-3 px-3.5 py-2">
      <span aria-hidden className={`flex size-[34px] shrink-0 items-center justify-center rounded-icon border-2 border-edge-on-fill text-on-fill [&_svg]:size-[18px] ${c.fill}`}>
        {c.icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-bold">{c.title}</span>
        <span className="text-xs font-semibold text-muted">{c.meta}</span>
      </span>
    </div>
  );

  // Confetti once per day, the moment everything for today is done.
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    if (left !== 0 || !didToday) return;
    try {
      if (localStorage.getItem("celebrated-day") === today) return;
      localStorage.setItem("celebrated-day", today);
    } catch {}
    setBurst((b) => b + 1); // eslint-disable-line react-hooks/set-state-in-effect -- reacting to the count reaching zero
  }, [left, didToday, today]);

  return (
    <Page>
      <PageHeader
        kicker={formatDay(today, { weekday: "long", day: "numeric", month: "long" })}
        title="Our home"
        aside={<Faces />}
      />

      <Typewriter
        day={today}
        className="-mt-2 min-h-6 text-[15px] font-semibold"
        parts={
          left === 0
            ? [{ text: didToday ? "All done for today. Rest." : "Nothing waiting on us today. Enjoy the quiet." }]
            : [{ text: `${left} ${left === 1 ? "thing" : "things"} for today.` }]
        }
      />

      <StickyNote />

      <div className="grid grid-cols-2 gap-3">
        <StatTile tone="shopping" icon={<ListChecks strokeWidth={2} />} value={todosLeft} label="to do" href="/todo" />
        <StatTile tone="chores" icon={<Sparkles strokeWidth={2} />} value={`${choresDone}/${chores.length}`} label="chores" href="/chores" />
      </div>

      <WeekStrip
        days={days}
        today={today}
        value={picked}
        marks={marks}
        onChange={(d) => (d === picked && d !== today ? backToToday() : setPicked(d))}
        onWeek={(dir) => {
          setWeek((w) => w + dir);
          setPicked((p) => addDays(p, 7 * dir));
        }}
      />

      <ListCard
        level="info"
        title={picked === today ? "Calendar" : `${formatDay(picked, { weekday: "short", day: "numeric", month: "short" })}, ${relativeDue(picked, today).replace("days late", "days ago")}`}
        aside={
          picked !== today && (
            <button type="button" onClick={backToToday} className="ml-auto flex h-11 items-center px-2 text-[13px] font-bold text-muted">
              Today
            </button>
          )
        }
        more={{ href: picked === today ? "/calendar" : `/calendar?day=${picked}`, label: "Open" }}
      >
        {items.length === 0 ? <Quiet>{isToday ? "Nothing on the calendar today." : picked < today ? "Nothing was on." : "A free day."}</Quiet> : items.map(row)}
        {isToday && comingUp.length > 0 && (
          <>
            <h3 className="bg-surface-sunken px-3.5 py-1.5 text-xs font-bold text-muted">Coming up</h3>
            {comingUp.map(row)}
          </>
        )}
      </ListCard>

      <ListCard level="info" title="To do" tint="shopping" more={todos.length > 2 ? { href: "/todo", label: `See all ${todos.length}` } : { href: "/todo", label: "See all" }}>
        {todos.length === 0 ? (
          <Quiet>Nothing due today.</Quiet>
        ) : (
          todos.slice(0, 2).map((t) => {
            const who = s.member(t.doneBy ?? t.assignee);
            return (
              <ListRow
                key={t.id}
                title={t.title}
                meta={t.doneBy ? `done by ${who?.name}` : [t.due && t.due < today ? relativeDue(t.due, today) : undefined, who && `for ${who.name}`].filter(Boolean).join(", ") || undefined}
                checkLabel={`Done: ${t.title}`}
                checked={!!t.doneBy}
                onChange={() => s.toggleTodo(t.id)}
              />
            );
          })
        )}
      </ListCard>

      <ListCard level="info" title="Chores" tint="chores" more={chores.length > 2 ? { href: "/chores", label: `See all ${chores.length}` } : { href: "/chores", label: "See all" }}>
        {chores.length === 0 ? (
          <Quiet>The house is happy.</Quiet>
        ) : (
          chores.slice(0, 2).map((c) => {
            const done = c.lastOn === today;
            return (
              <ListRow
                key={c.id}
                title={c.title}
                meta={done ? `done by ${s.member(c.lastBy)?.name}` : `due ${relativeDue(c.nextDue, today)}`}
                checkLabel={`Done: ${c.title}`}
                checked={done}
                onChange={() => s.toggleChore(c.id)}
              />
            );
          })
        )}
      </ListCard>

      <Section title="What we did today">
        {log.length === 0 ? (
          <div className={cardClass("info")}>
            <Quiet>Nothing yet today.</Quiet>
          </div>
        ) : (
          <Timeline items={log.map((l) => ({ id: l.id, title: `${s.member(l.by)?.name ?? "Someone"} ${l.text}`, meta: klTime(l.at), tone: KIND_TONE[l.kind] }))} />
        )}
      </Section>

      {burst > 0 && <Confetti key={burst} />}
    </Page>
  );
}
