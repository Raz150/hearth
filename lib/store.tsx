"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { saveMe } from "@/app/(app)/settings/actions";
import { addDays, addMonths, klToday } from "./date";
import { loadLog, loadMembers, loadNote, loadTodos, type LogEntry, type Member, type Note, type Todo } from "./queries";
import { createClient } from "./supabase/client";

export { INKS, inkText } from "./inks";
export type { LogEntry, Member, Note, Todo } from "./queries";

export type Chore = { id: string; title: string; everyDays: number; nextDue: string; lastBy?: string; lastOn?: string; prev?: Pick<Chore, "nextDue" | "lastBy" | "lastOn"> };
export type Bill = { id: string; name: string; amountSen: number; dueDay: number };
/** One bill paid for one month (YYYY-MM). */
export type Payment = { billId: string; month: string; by: string; on: string };

export type Shared = { members: Member[]; todos: Todo[]; note: Note | null; log: LogEntry[] };

// shortcut: chores and bills are still in-memory sample data; they become real in the next two steps.
function makeMock(members: Member[], me: string) {
  const other = members.find((m) => m.id !== me)?.id ?? me;
  const today = klToday();
  const month = today.slice(0, 7);
  return {
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
      ...[1, 2].flatMap((n) =>
        ["b1", "b2", "b3", "b4"].map((billId, i) => ({
          billId,
          month: addMonths(month, -n),
          by: (i + n) % 2 ? other : me,
          on: `${addMonths(month, -n)}-${String(5 + i * 4).padStart(2, "0")}`,
        })),
      ),
    ] as Payment[],
  };
}
type Mock = ReturnType<typeof makeMock>;

/** The toast: an undoable action, or an error (no undo). */
type Flash = { id: number; label: string; undo?: () => void; error?: boolean };

type Store = Shared &
  Mock & {
    me: string;
    member: (id?: string) => Member | undefined;
    paymentFor: (billId: string, month: string) => Payment | undefined;
    undo: Flash | null;
    revert: () => void;
    dismissUndo: () => void;
    addTodo: (title: string, opts?: { assignee?: string; due?: string }) => void;
    renameTodo: (id: string, title: string) => void;
    toggleTodo: (id: string) => void;
    removeTodo: (id: string) => void;
    /** Mark done, or (if done today) put it back how it was. */
    toggleChore: (id: string) => void;
    togglePaid: (billId: string, month: string) => void;
    setNote: (text: string) => void;
    /** Saves my own name/ink. Returns an error message or null. */
    updateMe: (patch: Partial<Omit<Member, "id">>) => Promise<string | null>;
  };

const Ctx = createContext<Store | null>(null);
const LOADERS = { members: loadMembers, todos: loadTodos, note: loadNote, log: loadLog } as const;
const TABLES: Record<string, keyof typeof LOADERS> = { members: "members", todos: "todos", notes: "note", activity: "log" };

export function HouseholdProvider({ children, initial, me, household }: { children: ReactNode; initial: Shared; me: string; household: string }) {
  const [sb] = useState(createClient);
  const [data, setData] = useState(initial);
  const [mock, setMock] = useState(() => makeMock(initial.members, me));
  const [undo, setUndo] = useState<Flash | null>(null);
  const dismissUndo = useCallback(() => setUndo(null), []); // stable, so the toast timer isn't reset on every render

  // Live sync: when either phone changes a table, reload that table. Also reload everything when the app comes
  // back to the foreground, because iOS drops the realtime connection while a PWA is in the background.
  useEffect(() => {
    const timers: Partial<Record<keyof typeof LOADERS, number>> = {};
    const reload = (key: keyof typeof LOADERS) => {
      clearTimeout(timers[key]);
      timers[key] = window.setTimeout(async () => {
        try {
          const value = await LOADERS[key](sb);
          setData((p) => ({ ...p, [key]: value }));
        } catch {
          // Keep showing what we have; the next change or foregrounding retries.
        }
      }, 150);
    };
    const channel = sb.channel("household");
    for (const [table, key] of Object.entries(TABLES)) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => reload(key));
    }
    let cancelled = false;
    // Realtime must carry the user's token, or RLS hides every change from us.
    sb.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) sb.realtime.setAuth(session.access_token);
      channel.subscribe();
    });
    const onVisible = () => {
      if (document.visibilityState === "visible") (Object.keys(LOADERS) as (keyof typeof LOADERS)[]).forEach(reload);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      Object.values(timers).forEach(clearTimeout);
      sb.removeChannel(channel);
    };
  }, [sb]);

  const setTodos = (fn: (t: Todo[]) => Todo[]) => setData((p) => ({ ...p, todos: fn(p.todos) }));
  const setLog = (fn: (l: LogEntry[]) => LogEntry[]) => setData((p) => ({ ...p, log: fn(p.log) }));
  const flashError = () => setUndo({ id: Date.now(), label: "Couldn't save. Check your connection.", error: true });

  /** Run DB writes; if any fails, put the screen back and say so. */
  const write = (rollback: () => void, ...queries: PromiseLike<{ error: unknown }>[]) => {
    Promise.all(queries).then(
      (results) => {
        if (results.some((r) => r.error)) {
          rollback();
          flashError();
        }
      },
      () => {
        rollback();
        flashError();
      },
    );
  };

  /** Add a log line (shown at once, saved in the background). Returns its id so undo can remove it. */
  const logLine = (kind: LogEntry["kind"], text: string) => {
    const entry: LogEntry = { id: crypto.randomUUID(), kind, text, by: me, at: new Date().toISOString() };
    setLog((l) => [entry, ...l]);
    return { entry, query: sb.from("activity").insert({ id: entry.id, kind, body: text.slice(0, 240) }) };
  };
  const unlog = (id: string) => {
    setLog((l) => l.filter((x) => x.id !== id));
    return sb.from("activity").delete().eq("id", id);
  };

  const store: Store = {
    ...data,
    ...mock,
    me,
    undo,
    dismissUndo,
    member: (id) => data.members.find((m) => m.id === id),
    paymentFor: (billId, m) => mock.payments.find((p) => p.billId === billId && p.month === m),
    revert: () => {
      undo?.undo?.();
      setUndo(null);
    },

    addTodo: (raw, opts) => {
      const title = raw.trim().slice(0, 200);
      if (!title) return;
      const t: Todo = { id: crypto.randomUUID(), title, ...opts };
      setTodos((p) => [t, ...p]);
      write(
        () => setTodos((p) => p.filter((x) => x.id !== t.id)),
        sb.from("todos").insert({ id: t.id, title, assignee: opts?.assignee ?? null, due_date: opts?.due ?? null }),
      );
    },

    renameTodo: (id, raw) => {
      const title = raw.trim().slice(0, 200);
      const old = data.todos.find((t) => t.id === id);
      if (!old || !title || title === old.title) return;
      setTodos((p) => p.map((t) => (t.id === id ? { ...t, title } : t)));
      write(() => setTodos((p) => p.map((t) => (t.id === id ? { ...t, title: old.title } : t))), sb.from("todos").update({ title }).eq("id", id));
    },

    toggleTodo: (id) => {
      const t = data.todos.find((x) => x.id === id);
      if (!t) return;
      const mark = (doneBy?: string) => setTodos((p) => p.map((x) => (x.id === id ? { ...x, doneBy } : x)));
      const clear = () => sb.from("todos").update({ done_by: null, done_at: null }).eq("id", id);

      if (t.doneBy) {
        mark(undefined);
        write(() => mark(t.doneBy), clear());
        return;
      }
      mark(me);
      const log = logLine("todo", `ticked off ${t.title}`);
      write(
        () => {
          mark(undefined);
          setLog((l) => l.filter((x) => x.id !== log.entry.id));
        },
        sb.from("todos").update({ done_by: me, done_at: new Date().toISOString() }).eq("id", id),
        log.query,
      );
      setUndo({
        id: Date.now(),
        label: `${t.title} · done`,
        undo: () => {
          mark(undefined);
          write(() => mark(me), clear(), unlog(log.entry.id));
        },
      });
    },

    removeTodo: (id) => {
      const t = data.todos.find((x) => x.id === id);
      if (!t) return;
      const index = data.todos.indexOf(t);
      const putBack = () => setTodos((p) => [...p.slice(0, index), t, ...p.slice(index)]);
      setTodos((p) => p.filter((x) => x.id !== id));
      write(putBack, sb.from("todos").delete().eq("id", id));
      setUndo({
        id: Date.now(),
        label: "Removed",
        undo: () => {
          putBack();
          write(
            () => setTodos((p) => p.filter((x) => x.id !== id)),
            sb.from("todos").insert({
              id: t.id,
              title: t.title,
              due_date: t.due ?? null,
              assignee: t.assignee ?? null,
              done_by: t.doneBy ?? null,
              done_at: t.doneBy ? new Date().toISOString() : null,
            }),
          );
        },
      });
    },

    setNote: (raw) => {
      const text = raw.trim().slice(0, 140);
      const prev = data.note;
      if (text === (prev?.text ?? "")) return;
      const show = (note: Note | null) => setData((p) => ({ ...p, note }));
      const save = (note: Note | null) =>
        note
          ? sb.from("notes").upsert({ body: note.text, written_by: note.by, written_at: note.at }, { onConflict: "household_id" })
          : sb.from("notes").delete().eq("household_id", household);

      const next = text ? { text, by: me, at: new Date().toISOString() } : null;
      show(next);
      const log = next && logLine("note", "left a note");
      write(
        () => {
          show(prev);
          if (log) setLog((l) => l.filter((x) => x.id !== log.entry.id));
        },
        save(next),
        ...(log ? [log.query] : []),
      );
      setUndo({
        id: Date.now(),
        label: text ? "Note pinned" : "Note removed",
        undo: () => {
          show(prev);
          write(() => show(next), save(prev), ...(log ? [unlog(log.entry.id)] : []));
        },
      });
    },

    // ── still sample data ──
    toggleChore: (id) => {
      const c = mock.chores.find((x) => x.id === id);
      if (!c) return;
      const setChore = (next: Chore) => setMock((p) => ({ ...p, chores: p.chores.map((x) => (x.id === id ? next : x)) }));
      if (c.lastOn === klToday() && c.prev) {
        setChore({ ...c, ...c.prev, prev: undefined });
        return;
      }
      setChore({ ...c, lastBy: me, lastOn: klToday(), nextDue: addDays(klToday(), c.everyDays), prev: { nextDue: c.nextDue, lastBy: c.lastBy, lastOn: c.lastOn } });
      setUndo({ id: Date.now(), label: `${c.title} · done`, undo: () => setChore(c) });
    },
    togglePaid: (billId, m) => {
      const b = mock.bills.find((x) => x.id === billId);
      if (!b) return;
      if (mock.payments.some((p) => p.billId === billId && p.month === m)) {
        setMock((p) => ({ ...p, payments: p.payments.filter((x) => !(x.billId === billId && x.month === m)) }));
        return;
      }
      const before = mock;
      setMock((p) => ({ ...p, payments: [...p.payments, { billId, month: m, by: me, on: klToday() }] }));
      setUndo({ id: Date.now(), label: `${b.name} · paid`, undo: () => setMock(before) });
    },

    updateMe: async (patch) => {
      const before = data.members;
      setData((p) => ({ ...p, members: p.members.map((m) => (m.id === me ? { ...m, ...patch } : m)) }));
      const error = await saveMe(patch);
      if (error) setData((p) => ({ ...p, members: before }));
      return error;
    },
  };
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside HouseholdProvider");
  return s;
}

export const ringgit = (sen: number) =>
  `RM ${(sen / 100).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const klTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-MY", { timeZone: "Asia/Kuala_Lumpur", hour: "numeric", minute: "2-digit" });
