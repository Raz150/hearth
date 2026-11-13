"use client";

// shortcut: in-memory mock data, resets on reload; replaced by Supabase tables in the real-features phase.
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { saveMe } from "@/app/(app)/settings/actions";
import { addDays, addMonths, klToday } from "./date";

export { INKS, inkText } from "./inks";

export type Member = { id: string; name: string; ink: string };
export type Todo = { id: string; title: string; due?: string; assignee?: string; doneBy?: string };
export type Chore = { id: string; title: string; everyDays: number; nextDue: string; lastBy?: string; lastOn?: string };
export type Bill = { id: string; name: string; amountSen: number; dueDay: number };
/** One bill paid for one month (YYYY-MM). */
export type Payment = { billId: string; month: string; by: string; on: string };
export type Note = { text: string; by: string; at: string };
export type LogEntry = { id: string; kind: "todo" | "chore" | "bill" | "note"; text: string; by: string; at: string };

// Fake rows so every screen has something to show; ids are the real member ids.
function makeSeed(members: Member[], me: string) {
  const other = members.find((m) => m.id !== me)?.id ?? me;
  const today = klToday();
  const month = today.slice(0, 7);
  const at = (day: string, time: string) => `${day}T${time}:00+08:00`;

  return {
    members,
    note: { text: "dinner at mak's tonight, bring the kuih!", by: other, at: at(today, "08:15") } as Note | null,
    todos: [
      { id: "t1", title: "Buy eggs & bread", due: today, assignee: me },
      { id: "t2", title: "Book dentist appointment", due: addDays(today, 3), assignee: other },
      { id: "t3", title: "Return Shopee parcel" },
      { id: "t4", title: "Water the plants", doneBy: other },
    ] as Todo[],
    chores: [
      { id: "c1", title: "Laundry", everyDays: 3, nextDue: today, lastBy: other, lastOn: addDays(today, -3) },
      { id: "c2", title: "Vacuum the living room", everyDays: 7, nextDue: addDays(today, -1), lastBy: me, lastOn: addDays(today, -8) },
      { id: "c3", title: "Change bedsheets", everyDays: 14, nextDue: addDays(today, 5), lastBy: other, lastOn: addDays(today, -9) },
      { id: "c4", title: "Take out recycling", everyDays: 7, nextDue: addDays(today, 2), lastBy: me, lastOn: addDays(today, -5) },
    ] as Chore[],
    bills: [
      { id: "b1", name: "TNB electricity", amountSen: 18740, dueDay: 15 },
      { id: "b2", name: "Unifi", amountSen: 12900, dueDay: 7 },
      { id: "b3", name: "Air Selangor", amountSen: 3420, dueDay: 20 },
      { id: "b4", name: "Rent", amountSen: 180000, dueDay: 1 },
    ] as Bill[],
    payments: [
      { billId: "b2", month, by: me, on: addDays(today, -6) },
      { billId: "b4", month, by: other, on: addDays(today, -12) },
      // two fully-paid months of history
      ...[1, 2].flatMap((n) =>
        ["b1", "b2", "b3", "b4"].map((billId, i) => ({
          billId,
          month: addMonths(month, -n),
          by: (i + n) % 2 ? other : me,
          on: `${addMonths(month, -n)}-${String(5 + i * 4).padStart(2, "0")}`,
        })),
      ),
    ] as Payment[],
    log: [
      { id: "l1", kind: "note", text: "left a note", by: other, at: at(today, "08:15") },
      { id: "l2", kind: "todo", text: "watered the plants", by: other, at: at(today, "07:40") },
      { id: "l3", kind: "chore", text: "did Take out recycling", by: me, at: at(addDays(today, -1), "21:10") },
      { id: "l4", kind: "chore", text: "did Laundry", by: other, at: at(addDays(today, -2), "19:30") },
      { id: "l5", kind: "chore", text: "did Change bedsheets", by: other, at: at(addDays(today, -3), "10:05") },
      { id: "l6", kind: "chore", text: "did Wash the car", by: me, at: at(addDays(today, -4), "16:20") },
    ] as LogEntry[],
  };
}
type Data = ReturnType<typeof makeSeed>;

type Store = Data & {
  me: string;
  member: (id?: string) => Member | undefined;
  paymentFor: (billId: string, month: string) => Payment | undefined;
  /** Last undoable action, shown in the toast. */
  undo: { id: number; label: string; prev: Data } | null;
  revert: () => void;
  dismissUndo: () => void;
  addTodo: (title: string, opts?: { assignee?: string; due?: string }) => void;
  renameTodo: (id: string, title: string) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
  doChore: (id: string) => void;
  togglePaid: (billId: string, month: string) => void;
  setNote: (text: string) => void;
  /** Real: saves my own name/ink to the database. Returns an error message or null. */
  updateMe: (patch: Partial<Omit<Member, "id">>) => Promise<string | null>;
};

const Ctx = createContext<Store | null>(null);

export function MockProvider({ children, members, me }: { children: ReactNode; members: Member[]; me: string }) {
  const [s, set] = useState(() => makeSeed(members, me));
  const [undo, setUndo] = useState<Store["undo"]>(null);
  const dismissUndo = useCallback(() => setUndo(null), []); // stable, so the toast timer isn't reset on every render

  // Apply a change and remember the previous state so the toast can undo it.
  const act = (label: string, fn: (p: Data) => Data) => {
    setUndo({ id: Date.now(), label, prev: s });
    set(fn);
  };
  const logged = (p: Data, kind: LogEntry["kind"], text: string): LogEntry[] => [
    { id: crypto.randomUUID(), kind, text, by: me, at: new Date().toISOString() },
    ...p.log,
  ];

  const store: Store = {
    ...s,
    me,
    undo,
    member: (id) => s.members.find((m) => m.id === id),
    paymentFor: (billId, m) => s.payments.find((p) => p.billId === billId && p.month === m),
    revert: () => {
      if (undo) set(undo.prev);
      setUndo(null);
    },
    dismissUndo,
    addTodo: (title, opts) =>
      set((p) => ({ ...p, todos: [{ id: crypto.randomUUID(), title, ...opts }, ...p.todos] })),
    renameTodo: (id, title) =>
      set((p) => ({ ...p, todos: p.todos.map((t) => (t.id === id ? { ...t, title: title.slice(0, 200) } : t)) })),
    toggleTodo: (id) => {
      const t = s.todos.find((x) => x.id === id);
      if (!t) return;
      if (t.doneBy) {
        set((p) => ({ ...p, todos: p.todos.map((x) => (x.id === id ? { ...x, doneBy: undefined } : x)) }));
        return;
      }
      act(`${t.title} · done`, (p) => ({
        ...p,
        todos: p.todos.map((x) => (x.id === id ? { ...x, doneBy: me } : x)),
        log: logged(p, "todo", `ticked off ${t.title}`),
      }));
    },
    removeTodo: (id) => act("Removed", (p) => ({ ...p, todos: p.todos.filter((t) => t.id !== id) })),
    doChore: (id) => {
      const c = s.chores.find((x) => x.id === id);
      if (!c) return;
      act(`${c.title} · done`, (p) => ({
        ...p,
        chores: p.chores.map((x) => (x.id === id ? { ...x, lastBy: me, lastOn: klToday(), nextDue: addDays(klToday(), x.everyDays) } : x)),
        log: logged(p, "chore", `did ${c.title}`),
      }));
    },
    togglePaid: (billId, m) => {
      const b = s.bills.find((x) => x.id === billId);
      if (!b) return;
      if (s.payments.some((p) => p.billId === billId && p.month === m)) {
        set((p) => ({ ...p, payments: p.payments.filter((x) => !(x.billId === billId && x.month === m)) }));
        return;
      }
      act(`${b.name} · paid`, (p) => ({
        ...p,
        payments: [...p.payments, { billId, month: m, by: me, on: klToday() }],
        log: logged(p, "bill", `paid ${b.name}`),
      }));
    },
    setNote: (text) =>
      act("Note changed", (p) => {
        const t = text.trim().slice(0, 140);
        return { ...p, note: t ? { text: t, by: me, at: new Date().toISOString() } : null, log: t ? logged(p, "note", "left a note") : p.log };
      }),
    updateMe: async (patch) => {
      const before = s.members;
      set((p) => ({ ...p, members: p.members.map((m) => (m.id === me ? { ...m, ...patch } : m)) }));
      const error = await saveMe(patch);
      if (error) set((p) => ({ ...p, members: before }));
      return error;
    },
  };
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside MockProvider");
  return s;
}

export const ringgit = (sen: number) =>
  `RM ${(sen / 100).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const klTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-MY", { timeZone: "Asia/Kuala_Lumpur", hour: "numeric", minute: "2-digit" });
