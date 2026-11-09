"use client";

import { Button, Card, Chip } from "@heroui/react";
import { useState, type ReactNode } from "react";

// Mock features: sample data only, nothing here is saved or shared between phones.
const meals = ["Nasi lemak", "Ayam masak merah", "Mee goreng mamak", "Laksa", "Char kuey teow", "Sup tulang"];
const week = [
  { day: "Monday", meal: "Ayam masak merah" },
  { day: "Tuesday", meal: "Mee goreng mamak" },
  { day: "Wednesday", meal: "Sup tulang" },
  { day: "Thursday", meal: "Eat out" },
];
const bills = [
  { name: "TNB", amount: "RM 142.60", due: "in 6 days" },
  { name: "Unifi", amount: "RM 129.00", due: "in 11 days" },
  { name: "Water", amount: "RM 18.40", due: "in 14 days" },
];
const chores = ["Dishes", "Laundry", "Take out the rubbish", "Vacuum"];
const rowLine = "border-b border-separator last:border-b-0";

export function Sample({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="gap-1">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-muted">{title}</h2>
        <Chip size="sm">Sample</Chip>
      </div>
      {children}
    </Card>
  );
}

function MockPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-2">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mb-5 mt-1 text-muted">Nothing here is saved yet.</p>
      <div className="flex flex-col gap-4">{children}</div>
    </main>
  );
}

export function DinnerSample() {
  const [meal, setMeal] = useState(0);
  return (
    <MockPage title="Dinner">
      <Sample title="Tonight">
        <p aria-live="polite" className="text-2xl font-semibold tracking-tight">
          {meals[meal]}
        </p>
        <Button
          fullWidth
          className="mt-3 h-12 text-base"
          onPress={() => setMeal((meal + 1 + Math.floor(Math.random() * (meals.length - 1))) % meals.length)}
        >
          Pick something else
        </Button>
      </Sample>
      <Sample title="This week">
        <ul>
          {week.map((entry) => (
            <li key={entry.day} className={`flex min-h-12 items-center justify-between gap-3 ${rowLine}`}>
              <span className="text-muted">{entry.day}</span>
              <span className="text-right font-semibold">{entry.meal}</span>
            </li>
          ))}
        </ul>
      </Sample>
    </MockPage>
  );
}

export function ChoresSample() {
  const [mine, setMine] = useState<string[]>(["Dishes", "Vacuum"]);
  return (
    <MockPage title="Chores">
      <Sample title="Whose turn">
        <ul>
          {chores.map((chore) => {
            const isMine = mine.includes(chore);
            return (
              <li key={chore} className={`flex min-h-16 items-center justify-between gap-3 ${rowLine}`}>
                <span>
                  <span className="block text-lg font-semibold">{chore}</span>
                  <span aria-live="polite" className="block text-sm text-muted">
                    {isMine ? "Your turn" : "Your partner's turn"}
                  </span>
                </span>
                <Button
                  variant="tertiary"
                  className="h-11 text-base"
                  aria-label={`Swap ${chore}`}
                  onPress={() => setMine(isMine ? mine.filter((name) => name !== chore) : [...mine, chore])}
                >
                  Swap
                </Button>
              </li>
            );
          })}
        </ul>
      </Sample>
    </MockPage>
  );
}

export function BillsSample() {
  const [paid, setPaid] = useState<string[]>([]);
  return (
    <MockPage title="Bills">
      <Sample title="This month">
        <ul>
          {bills.map((bill) => {
            const isPaid = paid.includes(bill.name);
            return (
              <li key={bill.name} className={rowLine}>
                <button
                  aria-pressed={isPaid}
                  className="flex min-h-14 w-full items-center justify-between gap-3 text-left"
                  onClick={() => setPaid(isPaid ? paid.filter((name) => name !== bill.name) : [...paid, bill.name])}
                >
                  <span className={isPaid ? "text-muted line-through" : ""}>
                    <span className="block text-lg font-semibold">{bill.name}</span>
                    <span className="block text-sm text-muted">{isPaid ? "Paid" : `Due ${bill.due}`}</span>
                  </span>
                  <span className={`text-lg font-semibold ${isPaid ? "text-muted line-through" : ""}`}>{bill.amount}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Sample>
    </MockPage>
  );
}
