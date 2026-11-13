"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HandHeart } from "lucide-react";
import { StickyNote } from "@/components/note";
import { Typewriter } from "@/components/typewriter";
import { InkCheck, Page, PageHeader, Petals, Section, Struck, Who } from "@/components/ui";
import { daysBetween, dueDateInMonth, formatDay, klHour, klToday, relativeDue } from "@/lib/date";
import { doaForHour } from "@/lib/doa";
import { klTime, ringgit, useStore } from "@/lib/store";

function greeting(h: number) {
  if (h < 5) return "still up?";
  if (h < 12) return "good morning";
  if (h < 18) return "good afternoon";
  return "good evening";
}

function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="px-1 py-2 font-hand text-ink-soft">{children}</p>;
}

export default function Today() {
  const s = useStore();
  const today = klToday();
  const todos = s.todos.filter((t) => t.due && t.due <= today);
  // Chores done today stay visible (ticked), like to-dos.
  const chores = s.chores.filter((c) => c.nextDue <= today || c.lastOn === today);
  const bills = s.bills.filter((b) => !s.paymentFor(b.id, today.slice(0, 7)) && daysBetween(today, dueDateInMonth(today, b.dueDay)) <= 7);
  const left = todos.filter((t) => !t.doneBy).length + chores.filter((c) => c.lastOn !== today).length + bills.length;
  const log = s.log.filter((l) => klToday(new Date(l.at)) === today);
  const didToday = log.length > 0;
  const now = doaForHour(klHour());

  // Petals once per day, the moment everything for today is done.
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
        kicker={greeting(klHour())}
        title={formatDay(today, { weekday: "long" })}
      />
      <p className="-mt-5 mb-7 font-serif italic text-ink-soft">{formatDay(today, { day: "numeric", month: "long", year: "numeric" })}</p>

      <Typewriter
        day={today}
        className="mb-8 min-h-[3.5rem] font-hand text-xl leading-snug"
        parts={
          left === 0
            ? [{ text: didToday ? "All done for today. Rest." : "Nothing waiting on us today. Enjoy the quiet." }]
            : [
                { text: `${left} little ${left === 1 ? "thing" : "things"}`, className: "bg-[linear-gradient(transparent_55%,var(--highlight)_55%,var(--highlight)_90%,transparent_90%)] px-1" },
                { text: " for today." },
              ]
        }
      />

      <StickyNote />

      {now && (
        <Link href={`/doa#${now.group}`} className="mb-8 flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-line bg-card px-5 py-3">
          <span>
            <span className="block font-hand text-sm text-accent">{now.label}</span>
            <span className="font-serif text-lg">Time for a few minutes of zikir</span>
          </span>
          <HandHeart className="shrink-0 text-accent" size={22} />
        </Link>
      )}

      <Section title="To do">
        {todos.length === 0 ? (
          <Quiet>nothing due ✿</Quiet>
        ) : (
          <ul>
            {todos.map((t) => {
              const by = s.member(t.doneBy);
              return (
                <li key={t.id} className="flex items-center gap-1">
                  <InkCheck done={!!t.doneBy} ink={by?.ink ?? s.member(s.me)?.ink} onToggle={() => s.toggleTodo(t.id)} label={t.title} />
                  <span className="flex-1 py-2">
                    <Struck done={!!t.doneBy} ink={by?.ink}>{t.title}</Struck>
                  </span>
                  <Who member={s.member(t.doneBy ?? t.assignee)} />
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Chores">
        {chores.length === 0 ? (
          <Quiet>the house is happy ✿</Quiet>
        ) : (
          <ul>
            {chores.map((c) => {
              const done = c.lastOn === today;
              return (
                <li key={c.id} className="flex items-center gap-1">
                  <InkCheck done={done} ink={s.member(done ? c.lastBy : s.me)?.ink} onToggle={() => s.toggleChore(c.id)} label={`Mark ${c.title} done`} />
                  <span className="flex-1 py-2">
                    <Struck done={done} ink={s.member(c.lastBy)?.ink}>{c.title}</Struck>
                    {!done && <span className="block text-sm text-ink-soft">due {relativeDue(c.nextDue, today)}</span>}
                  </span>
                  {done && <Who member={s.member(c.lastBy)} />}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Bills this week">
        {bills.length === 0 ? (
          <Quiet>all settled ✿</Quiet>
        ) : (
          <ul className="space-y-1">
            {bills.map((b) => (
              <li key={b.id}>
                <Link href="/bills" className="flex min-h-11 items-baseline justify-between px-1 py-1.5">
                  <span>
                    {b.name} <span className="text-sm text-ink-soft">· {relativeDue(dueDateInMonth(today, b.dueDay), today)}</span>
                  </span>
                  <span className="font-serif tabular-nums">{ringgit(b.amountSen)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="What we did today">
        {log.length === 0 ? (
          <Quiet>the page is still blank</Quiet>
        ) : (
          <ol className="relative ml-2 space-y-3 border-l border-dashed border-line pl-5">
            {log.map((l) => (
              <li key={l.id} className="relative">
                <span aria-hidden className="absolute -left-[1.6rem] top-1.5 size-2.5 rounded-full border-2 border-card" style={{ backgroundColor: s.member(l.by)?.ink }} />
                <p className="font-hand text-xs text-ink-soft">{klTime(l.at)}</p>
                <p>
                  <Who member={s.member(l.by)} /> {l.text}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Section>

      {burst > 0 && <Petals key={burst} inks={s.members.map((m) => m.ink)} />}
    </Page>
  );
}
