"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { saveMe } from "@/app/(app)/settings/actions";
import { addDays, addMonths, klToday } from "./date";
import { loadChores, loadDoa, loadLog, loadMembers, loadNote, loadTodos, type Chore, type DoaRequest, type LogEntry, type Member, type Note, type Step, type Todo } from "./queries";
import { createClient } from "./supabase/client";

export { INKS, inkText } from "./inks";
export type { Chore, DoaRequest, LogEntry, Member, Note, Step, Todo } from "./queries";
/** The editable details of a to-do besides its title. */
export type TodoMeta = Pick<Todo, "assignee" | "due" | "priority" | "tags">;
/** The editable parts of a chore. */
export type ChoreMeta = Pick<Chore, "title" | "everyDays" | "owner" | "nextDue">;

export type Bill = { id: string; name: string; amountSen: number; dueDay: number };
/** One bill paid for one month (YYYY-MM). */
export type Payment = { billId: string; month: string; by: string; on: string };

export type Shared = { members: Member[]; todos: Todo[]; chores: Chore[]; note: Note | null; log: LogEntry[]; doa: DoaRequest[] };

// shortcut: bills are still in-memory sample data; they become real in the next step.
function makeMock(members: Member[], me: string) {
  const other = members.find((m) => m.id !== me)?.id ?? me;
  const today = klToday();
  const month = today.slice(0, 7);
  return {
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
    addTodo: (title: string, meta: TodoMeta) => void;
    /** Change title and details together. */
    editTodo: (id: string, next: TodoMeta & { title: string }) => void;
    addStep: (todoId: string, title: string) => void;
    toggleStep: (todoId: string, stepId: string) => void;
    removeStep: (todoId: string, stepId: string) => void;
    toggleTodo: (id: string) => void;
    removeTodo: (id: string) => void;
    addChore: (meta: ChoreMeta) => void;
    editChore: (id: string, meta: ChoreMeta) => void;
    removeChore: (id: string) => void;
    /** Mark done, or (if done today) put it back how it was. */
    toggleChore: (id: string) => void;
    /** Thank whoever last did this chore (adds a line to the shared log). */
    thank: (choreId: string) => void;
    /** The log line `thank` writes; also how the page tells it's already been sent. */
    thanksText: (c: Chore) => string;
    togglePaid: (billId: string, month: string) => void;
    setNote: (text: string) => void;
    askDoa: (text: string) => void;
    /** I prayed for my spouse's request today, or (if already today) take it back. */
    prayFor: (id: string) => void;
    /** Mark my own request answered (Alhamdulillah), or un-mark it. */
    answerDoa: (id: string) => void;
    removeDoa: (id: string) => void;
    /** Saves my own name/ink. Returns an error message or null. */
    updateMe: (patch: Partial<Omit<Member, "id">>) => Promise<string | null>;
  };

const Ctx = createContext<Store | null>(null);
const LOADERS = { members: loadMembers, todos: loadTodos, chores: loadChores, note: loadNote, log: loadLog, doa: loadDoa } as const;
const TABLES: Record<string, keyof typeof LOADERS> = {
  members: "members", todos: "todos", todo_steps: "todos", chores: "chores", notes: "note", activity: "log", doa_requests: "doa", doa_prayers: "doa",
};

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
  const setSteps = (todoId: string, fn: (s: Step[]) => Step[]) => setTodos((p) => p.map((t) => (t.id === todoId ? { ...t, steps: fn(t.steps) } : t)));
  const row = (m: TodoMeta) => ({ assignee: m.assignee ?? null, due_date: m.due ?? null, priority: m.priority, tags: m.tags });
  const setLog = (fn: (l: LogEntry[]) => LogEntry[]) => setData((p) => ({ ...p, log: fn(p.log) }));
  const setChores = (fn: (c: Chore[]) => Chore[]) => setData((p) => ({ ...p, chores: fn(p.chores) }));
  const putChore = (id: string, v: Partial<Chore>) => setChores((p) => p.map((c) => (c.id === id ? { ...c, ...v } : c)));
  const choreMeta = (m: ChoreMeta) => ({ title: m.title.trim().slice(0, 100), every_days: Math.min(365, Math.max(1, Math.round(m.everyDays) || 1)), owner: m.owner ?? null, next_due: m.nextDue });
  /** Tick state of a chore, as the app holds it and as the row stores it. */
  const tickOf = (c: Pick<Chore, "nextDue" | "lastBy" | "lastOn" | "prev">) => ({ nextDue: c.nextDue, lastBy: c.lastBy, lastOn: c.lastOn, prev: c.prev });
  const tickRow = (t: ReturnType<typeof tickOf>) => ({
    next_due: t.nextDue,
    last_by: t.lastBy ?? null,
    last_on: t.lastOn ?? null,
    prev_next_due: t.prev?.nextDue ?? null,
    prev_last_by: t.prev?.lastBy ?? null,
    prev_last_on: t.prev?.lastOn ?? null,
  });
  const setDoa = (fn: (d: DoaRequest[]) => DoaRequest[]) => setData((p) => ({ ...p, doa: fn(p.doa) }));
  const putDoa = (id: string, v: Partial<DoaRequest>) => setDoa((p) => p.map((d) => (d.id === id ? { ...d, ...v } : d)));
  const prayedText = (d: DoaRequest) => `prayed for ${data.members.find((m) => m.id === d.by)?.name ?? "you"} 🤲`;
  const choreLine = (c: Chore) => `did ${c.title}`;
  const thanksText = (c: Chore) => `thanked ${data.members.find((m) => m.id === c.lastBy)?.name ?? "you"} for ${c.title}`;
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

    addTodo: (raw, meta) => {
      const title = raw.trim().slice(0, 200);
      if (!title) return;
      const t: Todo = { id: crypto.randomUUID(), title, ...meta, steps: [] };
      setTodos((p) => [t, ...p]);
      write(() => setTodos((p) => p.filter((x) => x.id !== t.id)), sb.from("todos").insert({ id: t.id, title, ...row(meta) }));
    },

    editTodo: (id, next) => {
      const title = next.title.trim().slice(0, 200);
      const old = data.todos.find((t) => t.id === id);
      if (!old || !title) return;
      const put = (v: TodoMeta & { title: string }) => setTodos((p) => p.map((t) => (t.id === id ? { ...t, ...v } : t)));
      const was = { title: old.title, due: old.due, assignee: old.assignee, priority: old.priority, tags: old.tags };
      put({ ...next, title });
      write(() => put(was), sb.from("todos").update({ title, ...row(next) }).eq("id", id));
    },

    addStep: (todoId, raw) => {
      const title = raw.trim().slice(0, 120);
      if (!title) return;
      const step: Step = { id: crypto.randomUUID(), title, done: false };
      setSteps(todoId, (s) => [...s, step]);
      write(() => setSteps(todoId, (s) => s.filter((x) => x.id !== step.id)), sb.from("todo_steps").insert({ id: step.id, todo_id: todoId, title }));
    },

    toggleStep: (todoId, stepId) => {
      const step = data.todos.find((t) => t.id === todoId)?.steps.find((x) => x.id === stepId);
      if (!step) return;
      const set = (done: boolean) => setSteps(todoId, (s) => s.map((x) => (x.id === stepId ? { ...x, done } : x)));
      set(!step.done);
      write(() => set(step.done), sb.from("todo_steps").update({ done: !step.done }).eq("id", stepId));
    },

    removeStep: (todoId, stepId) => {
      const steps = data.todos.find((t) => t.id === todoId)?.steps;
      const step = steps?.find((x) => x.id === stepId);
      if (!steps || !step) return;
      setSteps(todoId, (s) => s.filter((x) => x.id !== stepId));
      write(() => setSteps(todoId, () => steps), sb.from("todo_steps").delete().eq("id", stepId));
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
            // Deleting the to-do deleted its steps too; put them back after it (they need it to exist).
            sb
              .from("todos")
              .insert({ id: t.id, title: t.title, ...row(t), done_by: t.doneBy ?? null, done_at: t.doneBy ? new Date().toISOString() : null })
              .then((r) => (r.error || !t.steps.length ? r : sb.from("todo_steps").insert(t.steps.map((x) => ({ ...x, todo_id: t.id }))))),
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

    addChore: (meta) => {
      const row = choreMeta(meta);
      if (!row.title) return;
      const c: Chore = { id: crypto.randomUUID(), title: row.title, everyDays: row.every_days, owner: meta.owner, nextDue: meta.nextDue };
      setChores((p) => [...p, c]);
      write(() => setChores((p) => p.filter((x) => x.id !== c.id)), sb.from("chores").insert({ id: c.id, ...row }));
    },

    editChore: (id, meta) => {
      const old = data.chores.find((c) => c.id === id);
      const row = choreMeta(meta);
      if (!old || !row.title) return;
      putChore(id, { title: row.title, everyDays: row.every_days, owner: meta.owner, nextDue: meta.nextDue });
      write(() => putChore(id, old), sb.from("chores").update(row).eq("id", id));
    },

    removeChore: (id) => {
      const c = data.chores.find((x) => x.id === id);
      if (!c) return;
      setChores((p) => p.filter((x) => x.id !== id));
      write(() => setChores((p) => [...p, c]), sb.from("chores").delete().eq("id", id));
      setUndo({
        id: Date.now(),
        label: "Removed",
        undo: () => {
          setChores((p) => [...p, c]);
          write(() => setChores((p) => p.filter((x) => x.id !== id)), sb.from("chores").insert({ id, ...choreMeta(c), ...tickRow(tickOf(c)) }));
        },
      });
    },

    toggleChore: (id) => {
      const c = data.chores.find((x) => x.id === id);
      if (!c) return;
      const today = klToday();
      const before = tickOf(c);
      const save = (t: typeof before) => sb.from("chores").update(tickRow(t)).eq("id", id);

      if (c.lastOn === today) {
        // Un-tick (from either phone): back to how it was before today's tick, and drop my log line for it.
        const back = { nextDue: c.prev?.nextDue ?? today, lastBy: c.prev?.lastBy, lastOn: c.prev?.lastOn, prev: undefined };
        const mine = c.lastBy === me ? data.log.find((l) => l.kind === "chore" && l.by === me && l.text === choreLine(c)) : undefined;
        putChore(id, back);
        write(() => putChore(id, before), save(back), ...(mine ? [unlog(mine.id)] : []));
        return;
      }
      const done = { nextDue: addDays(today, c.everyDays), lastBy: me, lastOn: today, prev: { nextDue: c.nextDue, lastBy: c.lastBy, lastOn: c.lastOn } };
      putChore(id, done);
      const log = logLine("chore", choreLine(c));
      write(
        () => {
          putChore(id, before);
          setLog((l) => l.filter((x) => x.id !== log.entry.id));
        },
        save(done),
        log.query,
      );
      setUndo({
        id: Date.now(),
        label: `${c.title} · done`,
        undo: () => {
          putChore(id, before);
          write(() => putChore(id, done), save(before), unlog(log.entry.id));
        },
      });
    },

    thanksText,
    thank: (choreId) => {
      const c = data.chores.find((x) => x.id === choreId);
      if (!c?.lastBy || c.lastBy === me) return;
      const log = logLine("thanks", thanksText(c));
      write(() => setLog((l) => l.filter((x) => x.id !== log.entry.id)), log.query);
      setUndo({
        id: Date.now(),
        label: `Thanks sent to ${data.members.find((m) => m.id === c.lastBy)?.name ?? "them"}`,
        undo: () => write(() => {}, unlog(log.entry.id)),
      });
    },

    askDoa: (raw) => {
      const text = raw.trim().slice(0, 200);
      if (!text) return;
      const d: DoaRequest = { id: crypto.randomUUID(), by: me, text, at: new Date().toISOString(), prayers: [] };
      setDoa((p) => [d, ...p]);
      const log = logLine("doa", "asked for doa 🤲");
      write(
        () => {
          setDoa((p) => p.filter((x) => x.id !== d.id));
          setLog((l) => l.filter((x) => x.id !== log.entry.id));
        },
        // The log line only after the request is saved, so a failed request leaves no orphan line.
        sb.from("doa_requests").insert({ id: d.id, body: text }).then((r) => (r.error ? r : log.query)),
      );
    },

    prayFor: (id) => {
      const d = data.doa.find((x) => x.id === id);
      if (!d || d.by === me) return;
      const day = klToday();
      const put = (prayers: DoaRequest["prayers"]) => putDoa(id, { prayers });
      if (d.prayers.some((p) => p.by === me && p.day === day)) {
        // Take back today's prayer and its log line.
        const mine = data.log.find((l) => l.kind === "doa" && l.by === me && l.text === prayedText(d) && klToday(new Date(l.at)) === day);
        put(d.prayers.filter((p) => !(p.by === me && p.day === day)));
        write(() => put(d.prayers), sb.from("doa_prayers").delete().match({ request_id: id, prayed_by: me, day }), ...(mine ? [unlog(mine.id)] : []));
        return;
      }
      put([...d.prayers, { by: me, day }]);
      const log = logLine("doa", prayedText(d));
      write(
        () => {
          put(d.prayers);
          setLog((l) => l.filter((x) => x.id !== log.entry.id));
        },
        sb.from("doa_prayers").insert({ request_id: id }).then((r) => (r.error ? r : log.query)),
      );
    },

    answerDoa: (id) => {
      const d = data.doa.find((x) => x.id === id);
      if (!d || d.by !== me) return;
      const answeredAt = d.answeredAt ? undefined : new Date().toISOString();
      const save = (at?: string) => sb.from("doa_requests").update({ answered_at: at ?? null }).eq("id", id);
      putDoa(id, { answeredAt });
      const log = answeredAt && logLine("doa", "had a doa answered. Alhamdulillah 🌿");
      write(
        () => {
          putDoa(id, { answeredAt: d.answeredAt });
          if (log) setLog((l) => l.filter((x) => x.id !== log.entry.id));
        },
        save(answeredAt),
        ...(log ? [log.query] : []),
      );
      setUndo({
        id: Date.now(),
        label: answeredAt ? "Alhamdulillah 🌿" : "Moved back to open",
        undo: () => {
          putDoa(id, { answeredAt: d.answeredAt });
          write(() => putDoa(id, { answeredAt }), save(d.answeredAt), ...(log ? [unlog(log.entry.id)] : []));
        },
      });
    },

    removeDoa: (id) => {
      const d = data.doa.find((x) => x.id === id);
      if (!d || d.by !== me) return;
      const index = data.doa.indexOf(d);
      const putBack = () => setDoa((p) => [...p.slice(0, index), d, ...p.slice(index)]);
      setDoa((p) => p.filter((x) => x.id !== id));
      write(putBack, sb.from("doa_requests").delete().eq("id", id));
      setUndo({
        id: Date.now(),
        label: "Removed",
        undo: () => {
          putBack();
          // Prayers were deleted with it and can't be re-added for past days, so they don't come back.
          write(
            () => setDoa((p) => p.filter((x) => x.id !== id)),
            sb.from("doa_requests").insert({ id, body: d.text, created_at: d.at, answered_at: d.answeredAt ?? null }),
          );
        },
      });
    },

    // ── still sample data ──
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
