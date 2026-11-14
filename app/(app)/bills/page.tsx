"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "@/components/kit/button";
import { Card } from "@/components/kit/card";
import { ListCard } from "@/components/kit/list";
import { ProgressBar } from "@/components/kit/progress";
import { StatusPill, checkboxClass } from "@/components/kit/selection";
import { cx } from "@/components/kit/shared";
import { Page, PageHeader } from "@/components/ui";
import { addMonths, dueDateInMonth, formatDay, klToday, relativeDue } from "@/lib/date";
import { ringgit, useStore } from "@/lib/store";

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
        kicker={month === thisMonth ? "This month" : formatDay(`${month}-01`, { year: "numeric" })}
        title={formatDay(`${month}-01`, { month: "long" })}
        aside={
          <div className="flex gap-2">
            <IconButton label="Previous month" onClick={() => go(-1)} disabled={month <= oldest} className="disabled:opacity-40">
              <ChevronLeft aria-hidden strokeWidth={2.4} />
            </IconButton>
            <IconButton label="Next month" onClick={() => go(1)} disabled={month >= thisMonth} className="disabled:opacity-40">
              <ChevronRight aria-hidden strokeWidth={2.4} />
            </IconButton>
          </div>
        }
      />

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={month}
          className="flex flex-col gap-[18px]"
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
          <Card className="flex flex-col gap-3">
            <p className="font-display text-2xl font-bold tracking-[-0.5px]">
              {ringgit(paid)} <span className="text-base text-muted">of {ringgit(total)}</span>
            </p>
            <ProgressBar label={paid === total ? "All paid" : "Paid so far"} value={total ? (paid / total) * 100 : 0} tone="money" />
          </Card>

          <ListCard title="Bills" tint="none">
            {bills.map((b) => {
              const due = dueDateInMonth(`${month}-01`, b.dueDay);
              const pay = s.paymentFor(b.id, month);
              const payer = s.member(pay?.by);
              return (
                <label key={b.id} className="group flex min-h-[54px] cursor-pointer items-center gap-3 px-3.5 py-2">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-bold">{b.name}</span>
                    <span className="text-xs font-semibold text-muted">
                      {payer ? `paid by ${payer.name}` : `due ${formatDay(due, { day: "numeric", month: "short" })} · ${relativeDue(due, today)}`}
                    </span>
                  </span>
                  <AnimatePresence initial={false}>
                    {pay && (
                      <motion.span initial={{ scale: 1.6, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: -4 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}>
                        <StatusPill tone="done">Paid {formatDay(pay.on, { day: "numeric", month: "short" })}</StatusPill>
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <span className={cx("shrink-0 text-sm font-bold tabular-nums", pay && "text-subtle")}>{ringgit(b.amountSen)}</span>
                  <input type="checkbox" aria-label={`Paid: ${b.name}`} checked={!!pay} onChange={() => s.togglePaid(b.id, month)} className={checkboxClass()} />
                </label>
              );
            })}
          </ListCard>
        </motion.div>
      </AnimatePresence>
      <p className="text-center text-xs font-semibold text-muted">Tick a bill to mark it paid · swipe for other months</p>
    </Page>
  );
}
