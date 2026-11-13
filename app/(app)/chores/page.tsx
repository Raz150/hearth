"use client";

import { motion } from "motion/react";
import { Card, InkCheck, Page, PageHeader, Stamp, Struck, Who } from "@/components/ui";
import { daysBetween, formatDay, klToday, relativeDue, weekStart } from "@/lib/date";
import { inkText, useStore } from "@/lib/store";

const ago = (ymd: string, today: string) => {
  const n = daysBetween(ymd, today);
  return n === 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`;
};

export default function ChoresPage() {
  const s = useStore();
  const today = klToday();
  const chores = [...s.chores].sort((a, b) => a.nextDue.localeCompare(b.nextDue));
  const since = weekStart(today);
  const week = s.log.filter((l) => l.kind === "chore" && klToday(new Date(l.at)) >= since);

  return (
    <Page>
      <PageHeader kicker="keeping house" title="Chores" />

      <Card tape className="mb-8 px-5 pt-6 pb-4">
        <p className="mb-3 font-hand text-sm text-ink-soft">this week, together: {week.length}</p>
        <div className="space-y-2.5">
          {s.members.map((m) => {
            const n = week.filter((l) => l.by === m.id).length;
            return (
              <div key={m.id} className="flex items-center gap-3">
                <span className="w-16 truncate font-hand text-sm" style={{ color: inkText(m.ink) }}>
                  {m.name}
                </span>
                <div className="flex flex-1 flex-wrap gap-1.5" aria-label={`${n} chores`}>
                  {Array.from({ length: n }, (_, i) => (
                    <motion.span
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20, delay: i * 0.04 }}
                      className="size-3.5 rounded-full"
                      style={{ backgroundColor: m.ink }}
                    />
                  ))}
                  {n === 0 && <span className="text-sm text-ink-soft">—</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <ul className="space-y-3">
        {chores.map((c) => {
          const n = daysBetween(today, c.nextDue);
          const doneToday = c.lastOn === today;
          const status = n < 0 ? "bg-highlight text-ink" : n === 0 ? "bg-accent-soft text-ink" : "text-ink-soft";
          return (
            <motion.li key={c.id} layout transition={{ type: "spring", stiffness: 380, damping: 32 }}>
              <Card className="flex items-center gap-2 py-3 pr-4 pl-2">
                <InkCheck
                  done={doneToday}
                  ink={s.member(doneToday ? c.lastBy : s.me)?.ink}
                  onToggle={() => s.toggleChore(c.id)}
                  label={`Mark ${c.title} done`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-serif text-lg">
                      <Struck done={doneToday} ink={s.member(c.lastBy)?.ink}>{c.title}</Struck>
                    </p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status}`}>{relativeDue(c.nextDue, today)}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    every {c.everyDays} days
                    {c.lastOn && (
                      <>
                        {" · last by "}
                        <Who member={s.member(c.lastBy)} />
                        {`, ${ago(c.lastOn, today)}`}
                      </>
                    )}
                  </p>
                </div>
                <span className="shrink-0">
                  <Stamp show={doneToday} ink={s.member(c.lastBy)?.ink ?? ""}>
                    done {formatDay(today, { day: "numeric", month: "short" })}
                  </Stamp>
                </span>
              </Card>
            </motion.li>
          );
        })}
      </ul>
    </Page>
  );
}
