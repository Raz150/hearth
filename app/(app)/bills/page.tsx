"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, Page, PageHeader, Stamp, Who } from "@/components/ui";
import { addMonths, dueDateInMonth, formatDay, klToday, relativeDue } from "@/lib/date";
import { ringgit, useStore } from "@/lib/mock";

export default function BillsPage() {
  const s = useStore();
  const today = klToday();
  const thisMonth = today.slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const [dir, setDir] = useState(0);
  const go = (n: number) => {
    setDir(n);
    setMonth((m) => addMonths(m, n));
  };

  const bills = [...s.bills].sort((a, b) => a.dueDay - b.dueDay);
  const total = bills.reduce((n, b) => n + b.amountSen, 0);
  const paid = bills.filter((b) => s.paymentFor(b.id, month)).reduce((n, b) => n + b.amountSen, 0);
  const oldest = s.payments.reduce((m, p) => (p.month < m ? p.month : m), thisMonth);

  return (
    <Page>
      <PageHeader
        kicker={month === thisMonth ? "this month" : formatDay(`${month}-01`, { year: "numeric" })}
        title={formatDay(`${month}-01`, { month: "long" })}
        aside={
          <div className="flex gap-1">
            <button onClick={() => go(-1)} disabled={month <= oldest} aria-label="Previous month" className="grid size-11 place-items-center rounded-full border border-line bg-card text-ink-soft disabled:opacity-30">
              <ChevronLeft className="size-5" />
            </button>
            <button onClick={() => go(1)} disabled={month >= thisMonth} aria-label="Next month" className="grid size-11 place-items-center rounded-full border border-line bg-card text-ink-soft disabled:opacity-30">
              <ChevronRight className="size-5" />
            </button>
          </div>
        }
      />

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={month}
          initial={{ opacity: 0, x: dir * 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -40 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, i) => {
            if (i.offset.x < -70 && month < thisMonth) go(1);
            else if (i.offset.x > 70 && month > oldest) go(-1);
          }}
        >
          <Card tape className="mb-8 p-5 pt-6">
            <div className="flex items-baseline justify-between">
              <span className="font-hand text-sm text-ink-soft">{paid === total ? "all paid ✿" : "paid so far"}</span>
              <span className="font-serif text-2xl tabular-nums">
                {ringgit(paid)} <span className="text-base text-ink-soft">/ {ringgit(total)}</span>
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-deep">
              <motion.div className="h-full rounded-full bg-accent" initial={false} animate={{ width: `${total ? (paid / total) * 100 : 0}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
            </div>
          </Card>

          <ul className="space-y-3">
            {bills.map((b) => {
              const due = dueDateInMonth(`${month}-01`, b.dueDay);
              const pay = s.paymentFor(b.id, month);
              const payer = s.member(pay?.by);
              return (
                <li key={b.id}>
                  <button onClick={() => s.togglePaid(b.id, month)} className="block w-full text-left active:scale-[0.98] transition-transform" aria-pressed={!!pay}>
                    <Card className="flex items-center justify-between gap-3 overflow-hidden p-4">
                      <div>
                        <p className="font-serif text-lg">{b.name}</p>
                        <p className="text-sm text-ink-soft">
                          {payer ? (
                            <>
                              paid by <Who member={payer} />
                            </>
                          ) : (
                            `due ${formatDay(due, { day: "numeric", month: "short" })} · ${relativeDue(due, today)}`
                          )}
                        </p>
                      </div>
                      <span className={`font-serif text-lg tabular-nums ${payer ? "text-ink-soft" : ""}`}>{ringgit(b.amountSen)}</span>
                      <span className="pointer-events-none absolute inset-y-0 right-28 flex items-center">
                        <Stamp show={!!payer} ink={payer?.ink ?? ""}>
                          paid {pay && formatDay(pay.on, { day: "numeric", month: "short" })}
                        </Stamp>
                      </span>
                    </Card>
                  </button>
                </li>
              );
            })}
          </ul>
        </motion.div>
      </AnimatePresence>
      <p className="mt-4 text-center font-hand text-sm text-ink-soft">tap a bill to mark it paid · swipe for other months</p>
    </Page>
  );
}
