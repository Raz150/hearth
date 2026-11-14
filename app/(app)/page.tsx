"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, HandHeart, ListChecks, Receipt, Sparkles } from "lucide-react";
import { StatTile, cardClass } from "@/components/kit/card";
import { ExpenseTable, ListCard, ListRow, Timeline } from "@/components/kit/list";
import { WeekStrip } from "@/components/kit/nav";
import { PRESS, cx, type Tone } from "@/components/kit/shared";
import { StickyNote } from "@/components/note";
import { Typewriter } from "@/components/typewriter";
import { Confetti, Faces, Page, PageHeader, Quiet, Section } from "@/components/ui";
import { addDays, daysBetween, dueDateInMonth, formatDay, klHour, klToday, relativeDue } from "@/lib/date";
import { doaForHour } from "@/lib/doa";
import { klTime, ringgit, useStore, type LogEntry } from "@/lib/store";

/** Colour = meaning: each kind of log line wears its category. */
const KIND_TONE: Record<LogEntry["kind"], Tone> = { todo: "shopping", chore: "chores", bill: "money", note: "hero", thanks: "hero", doa: "done" };

export default function Today() {
  const s = useStore();
  const today = klToday();
  const todos = s.todos.filter((t) => t.due && t.due <= today);
  // Chores done today stay visible (ticked), like to-dos.
  const chores = s.chores.filter((c) => c.nextDue <= today || c.lastOn === today);
  const month = today.slice(0, 7);
  const bills = s.bills.filter((b) => !s.paymentFor(b.id, month) && daysBetween(today, dueDateInMonth(today, b.dueDay)) <= 7);
  const todosLeft = todos.filter((t) => !t.doneBy).length;
  const choresDone = chores.filter((c) => c.lastOn === today).length;
  const left = todosLeft + chores.length - choresDone + bills.length;
  const log = s.log.filter((l) => klToday(new Date(l.at)) === today);
  const didToday = log.length > 0;
  const now = doaForHour(klHour());
  const days = [-3, -2, -1, 0, 1, 2, 3].map((n) => addDays(today, n));

  // One dot per day with something due: to-do first, then chore, then bill.
  const dots: Partial<Record<string, Tone>> = {};
  for (const d of days) {
    if (s.todos.some((t) => !t.doneBy && t.due === d)) dots[d] = "shopping";
    else if (s.chores.some((c) => (d === today ? c.nextDue <= d && c.lastOn !== today : c.nextDue === d))) dots[d] = "chores";
    else if (s.bills.some((b) => !s.paymentFor(b.id, d.slice(0, 7)) && dueDateInMonth(d, b.dueDay) === d)) dots[d] = "money";
  }

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

      <div className="grid grid-cols-3 gap-3">
        <StatTile tone="shopping" icon={<ListChecks strokeWidth={2} />} value={todosLeft} label="to do" href="/todo" />
        <StatTile tone="chores" icon={<Sparkles strokeWidth={2} />} value={`${choresDone}/${chores.length}`} label="chores" href="/chores" />
        <StatTile tone="money" icon={<Receipt strokeWidth={2} />} value={`RM ${Math.round(bills.reduce((n, b) => n + b.amountSen, 0) / 100).toLocaleString("en-MY")}`} label="this week" href="/bills" />
      </div>

      <WeekStrip days={days} today={today} dots={dots} />

      {now && (
        <Link href={`/doa#${now.group}`} className={cx(cardClass("interactive"), PRESS, "flex items-center gap-2.5 px-3.5 py-2.5")}>
          <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-icon border-[1.5px] border-dashed border-edge-card">
            <HandHeart className="size-[18px]" strokeWidth={2} />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="text-sm font-bold">Time for a few minutes of zikir</span>
            <span className="text-xs font-semibold text-muted">{now.label}</span>
          </span>
          <ChevronRight aria-hidden className="size-[18px]" strokeWidth={2.2} />
        </Link>
      )}

      <ListCard level="info" title="To do" tint="shopping" more={todos.length > 2 ? { href: "/todo", label: `See all ${todos.length}` } : { href: "/todo", label: "Open" }}>
        {todos.length === 0 ? (
          <Quiet>Nothing due today.</Quiet>
        ) : (
          todos.slice(0, 2).map((t) => {
            const who = s.member(t.doneBy ?? t.assignee);
            return (
              <ListRow
                key={t.id}
                title={t.title}
                meta={t.doneBy ? `done by ${who?.name}` : [t.due && t.due < today ? relativeDue(t.due, today) : undefined, who && `for ${who.name}`].filter(Boolean).join(" · ") || undefined}
                checkLabel={`Done: ${t.title}`}
                checked={!!t.doneBy}
                onChange={() => s.toggleTodo(t.id)}
              />
            );
          })
        )}
      </ListCard>

      <ListCard level="info" title="Chores" tint="chores" more={chores.length > 2 ? { href: "/chores", label: `See all ${chores.length}` } : { href: "/chores", label: "Open" }}>
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

      {bills.length > 0 && (
        <Section title="Bills this week">
          <ExpenseTable
            caption="Bills due this week"
            rows={bills.map((b) => ({ label: `${b.name} · ${relativeDue(dueDateInMonth(today, b.dueDay), today)}`, amount: ringgit(b.amountSen) }))}
            total={ringgit(bills.reduce((n, b) => n + b.amountSen, 0))}
          />
        </Section>
      )}

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
