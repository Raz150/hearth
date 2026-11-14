"use client";

import { useEffect, useState } from "react";
import { BriefcaseBusiness, CalendarDays, ListChecks, Moon, Plane, Sparkles, Star } from "lucide-react";
import { StatTile, cardClass } from "@/components/kit/card";
import { ListCard, ListRow, Timeline } from "@/components/kit/list";
import { WeekStrip } from "@/components/kit/nav";
import { type Tone } from "@/components/kit/shared";
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
  const days = [-3, -2, -1, 0, 1, 2, 3].map((n) => addDays(today, n));

  // One dot per day with something due: to-do first, then chore.
  const dots: Partial<Record<string, Tone>> = {};
  for (const d of days) {
    if (s.todos.some((t) => !t.doneBy && t.due === d)) dots[d] = "shopping";
    else if (s.plans.some((p) => yearsOn(p, d) !== null)) dots[d] = "plans";
    else if (s.chores.some((c) => (d === today ? c.nextDue <= d && c.lastOn !== today : c.nextDue === d))) dots[d] = "chores";
  }

  // Calendar card: shifts that touch today (incl. last night's), today's plans, and the next plan coming up.
  const shiftFill = (id: string) => (s.person(id) === "h" ? "bg-person-h" : "bg-person-w");
  const yesterday = addDays(today, -1);
  // Coming up: the next event, plus every important date in the next 30 days.
  const upcoming = s.plans
    .map((p) => ({ p, next: nextStart(p, addDays(today, 1)) }))
    .filter((x) => x.next !== null)
    .sort((a, b) => a.next!.start.localeCompare(b.next!.start));
  const soon = upcoming.filter((x, i) => i === 0 || (x.p.important && x.next!.start <= addDays(today, 30)));
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
    ...soon.map(({ p, next }) => ({
      id: `${p.id}-next`,
      fill: "bg-plans",
      icon: p.important ? <Star strokeWidth={2} /> : <Plane strokeWidth={2} />,
      title: p.title,
      meta: [`${formatDay(next!.start, { weekday: "short", day: "numeric", month: "short" })}, ${relativeDue(next!.start, today)}`, p.yearly && next!.years ? yearsSince(next!.years, p.start) : ""].filter(Boolean).join(", "),
    })),
  ];

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

      <WeekStrip days={days} today={today} dots={dots} />

      <ListCard level="info" title="Calendar" more={{ href: "/calendar", label: "Open" }}>
        {calendar.length === 0 ? (
          <Quiet>Nothing on the calendar today.</Quiet>
        ) : (
          calendar.map((c) => (
            <div key={c.id} className="flex min-h-[54px] items-center gap-3 px-3.5 py-2">
              <span aria-hidden className={`flex size-[34px] shrink-0 items-center justify-center rounded-icon border-2 border-edge-on-fill text-on-fill [&_svg]:size-[18px] ${c.fill}`}>
                {c.icon}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-bold">{c.title}</span>
                <span className="text-xs font-semibold text-muted">{c.meta}</span>
              </span>
            </div>
          ))
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
