"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { saveMe } from "@/app/(app)/settings/actions";
import { addDays, klToday } from "./date";
import { loadChores, loadDoa, loadLog, loadMembers, loadNote, loadPlans, loadShifts, loadShopping, loadTodos, type Chore, type DoaProgress, type Item, type LogEntry, type Member, type Note, type Plan, type Shift, type Step, type Todo } from "./queries";
import { guessAisle, parseItem } from "./shopping";
import { createClient } from "./supabase/client";

export { INKS, inkText } from "./inks";
export type { Chore, DoaProgress, Item, LogEntry, Member, Note, Plan, Shift, Step, Todo } from "./queries";
/** The editable parts of a shopping item. */
export type ItemMeta = Pick<Item, "name" | "qty" | "aisle">;
/** The editable details of a to-do besides its title. */
export type TodoMeta = Pick<Todo, "assignee" | "due" | "dueTime" | "priority" | "tags">;
/** The editable parts of a chore. */
export type ChoreMeta = Pick<Chore, "title" | "everyDays" | "owner" | "nextDue">;

export type Shared = { members: Member[]; todos: Todo[]; chores: Chore[]; note: Note | null; log: LogEntry[]; doa: DoaProgress[]; shifts: Shift[]; plans: Plan[]; shopping: Item[] };

/** The toast: an undoable action, or an error (no undo). */
type Flash = { id: number; label: string; undo?: () => void; error?: boolean };

type Store = Shared & {
    me: string;
    member: (id?: string) => Member | undefined;
    /** Which colour a member wears in the design: the first account is "h", the second "w". */
    person: (id?: string) => "h" | "w" | undefined;
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
    setNote: (text: string) => void;
    /** Send a heart back for the other's note (a line in the shared log). */
    heartNote: () => void;
    /** I've already sent a heart for the current note. */
    noteHearted: boolean;
    /** Set my mark on a doa (null = not started). Memorising adds a line to the shared log, named by `title`. */
    markDoa: (doa: string, status: DoaProgress["status"] | null, title: string) => void;
    /** Put a shift on someone's day (replacing theirs), or clear the day with null. */
    setShift: (member: string, day: string, shift: Pick<Shift, "label" | "starts" | "ends"> | null) => void;
    savePlan: (plan: Plan) => void;
    removePlan: (id: string) => void;
    /** "2 susu" → on the list (an item bought before comes back with its aisle and last quantity). */
    addItem: (text: string) => void;
    editItem: (id: string, meta: ItemMeta) => void;
    /** Into the trolley, or back out. */
    toggleItem: (id: string) => void;
    /** Off the list; forgotten if never bought, else kept for "buy again". */
    removeItem: (id: string) => void;
    /** Everything in the trolley goes back to history. */
    finishShopping: () => void;
    /** Saves my own name/ink. Returns an error message or null. */
    updateMe: (patch: Partial<Omit<Member, "id">>) => Promise<string | null>;
  };

const Ctx = createContext<Store | null>(null);
const LOADERS = { members: loadMembers, todos: loadTodos, chores: loadChores, note: loadNote, log: loadLog, doa: loadDoa, shifts: loadShifts, plans: loadPlans, shopping: loadShopping } as const;
const TABLES: Record<string, keyof typeof LOADERS> = {
  members: "members", todos: "todos", todo_steps: "todos", chores: "chores", notes: "note", activity: "log", doa_progress: "doa", shifts: "shifts", events: "plans", shopping_items: "shopping",
};

export function HouseholdProvider({ children, initial, me, household }: { children: ReactNode; initial: Shared; me: string; household: string }) {
  const [sb] = useState(createClient);
  const [data, setData] = useState(initial);
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
  const row = (m: TodoMeta) => ({ assignee: m.assignee ?? null, due_date: m.due ?? null, due_time: (m.due && m.dueTime) || null, priority: m.priority, tags: m.tags });
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
  const planRow = (p: Plan) => ({ id: p.id, title: p.title, starts_on: p.start, ends_on: p.end, at: p.at ?? null, member: p.member ?? null, note: p.note ?? null, yearly: p.yearly, important: p.important });
  const setItems = (fn: (i: Item[]) => Item[]) => setData((p) => ({ ...p, shopping: fn(p.shopping) }));
  /** Put these items back exactly as given (by id), on screen. */
  const putItems = (items: Item[]) => setItems((p) => [...items.filter((x) => !p.some((y) => y.id === x.id)), ...p.map((x) => items.find((y) => y.id === x.id) ?? x)]);
  const itemRow = (i: Item) => ({ id: i.id, name: i.name, qty: i.qty ?? null, aisle: i.aisle, on_list: i.onList, added_by: i.addedBy ?? null, got_by: i.gotBy ?? null, got_at: i.gotAt ?? null, times: i.times });
  const setDoa = (fn: (d: DoaProgress[]) => DoaProgress[]) => setData((p) => ({ ...p, doa: fn(p.doa) }));
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
  const heartText = () => `sent ${data.members.find((m) => m.id === data.note?.by)?.name ?? "you"} a heart for their note`;
  const noteHearted = !!data.note && data.log.some((l) => l.kind === "thanks" && l.by === me && l.text === heartText() && Date.parse(l.at) >= Date.parse(data.note!.at));
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
    me,
    undo,
    dismissUndo,
    member: (id) => data.members.find((m) => m.id === id),
    person: (id) => {
      const i = data.members.findIndex((m) => m.id === id);
      return i < 0 ? undefined : i === 0 ? "h" : "w";
    },
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
      const was = { title: old.title, due: old.due, dueTime: old.dueTime, assignee: old.assignee, priority: old.priority, tags: old.tags };
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
        label: `Done: ${t.title}`,
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
        label: "Deleted",
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
        label: text ? "Note sent" : "Note deleted",
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
        label: "Deleted",
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
        label: `Done: ${c.title}`,
        undo: () => {
          putChore(id, before);
          write(() => putChore(id, done), save(before), unlog(log.entry.id));
        },
      });
    },

    thanksText,
    noteHearted,
    heartNote: () => {
      if (!data.note || data.note.by === me || noteHearted) return;
      const log = logLine("thanks", heartText());
      write(() => setLog((l) => l.filter((x) => x.id !== log.entry.id)), log.query);
    },

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

    markDoa: (doa, status, title) => {
      const before = data.doa.find((p) => p.by === me && p.doa === doa);
      if ((before?.status ?? null) === status) return;
      const next = status ? { by: me, doa, status, at: new Date().toISOString() } : undefined;
      const show = (p?: DoaProgress) => setDoa((l) => [...(p ? [p] : []), ...l.filter((x) => !(x.by === me && x.doa === doa))]);
      const save = (p?: DoaProgress) =>
        p
          ? sb.from("doa_progress").upsert({ user_id: me, doa_id: doa, status: p.status, updated_at: p.at }, { onConflict: "user_id,doa_id" })
          : sb.from("doa_progress").delete().match({ user_id: me, doa_id: doa });
      show(next);
      const log = status === "memorised" ? logLine("doa", `memorised ${title} 🌿`) : undefined;
      write(
        () => {
          show(before);
          if (log) setLog((l) => l.filter((x) => x.id !== log.entry.id));
        },
        save(next),
        ...(log ? [log.query] : []),
      );
      if (log)
        setUndo({
          id: Date.now(),
          label: "Memorised. Alhamdulillah",
          undo: () => {
            show(before);
            write(() => show(next), save(before), unlog(log.entry.id));
          },
        });
    },

    setShift: (member, day, next) => {
      const old = data.shifts.find((x) => x.member === member && x.day === day);
      if (!old && !next) return;
      const show = (sh?: Shift) => setData((p) => ({ ...p, shifts: [...p.shifts.filter((x) => !(x.member === member && x.day === day)), ...(sh ? [sh] : [])] }));
      show(next ? { id: old?.id ?? crypto.randomUUID(), member, day, ...next } : undefined);
      write(
        () => show(old),
        next
          ? sb.from("shifts").upsert({ member, day, label: next.label.trim().slice(0, 20), starts: next.starts, ends: next.ends }, { onConflict: "household_id,member,day" })
          : sb.from("shifts").delete().match({ member, day }),
      );
    },

    savePlan: (plan) => {
      const title = plan.title.trim().slice(0, 100);
      if (!title || plan.end < plan.start) return;
      const p: Plan = { ...plan, title, note: plan.note?.trim().slice(0, 500) || undefined };
      const old = data.plans.find((x) => x.id === p.id);
      const show = (v?: Plan) => setData((d) => ({ ...d, plans: [...d.plans.filter((x) => x.id !== p.id), ...(v ? [v] : [])].sort((a, b) => a.start.localeCompare(b.start)) }));
      show(p);
      write(
        () => show(old),
        sb.from("events").upsert(planRow(p)),
      );
    },

    removePlan: (id) => {
      const p = data.plans.find((x) => x.id === id);
      if (!p) return;
      const without = () => setData((d) => ({ ...d, plans: d.plans.filter((x) => x.id !== id) }));
      const putBack = () => setData((d) => ({ ...d, plans: [...d.plans, p].sort((a, b) => a.start.localeCompare(b.start)) }));
      without();
      write(putBack, sb.from("events").delete().eq("id", id));
      setUndo({
        id: Date.now(),
        label: "Deleted",
        undo: () => {
          putBack();
          write(without, sb.from("events").insert(planRow(p)));
        },
      });
    },

    addItem: (text) => {
      const parsed = parseItem(text);
      const name = parsed.name.slice(0, 60).trim();
      const qty = parsed.qty?.slice(0, 20);
      if (!name) return;
      const old = data.shopping.find((x) => x.name.trim().toLowerCase() === name.toLowerCase());
      if (old?.onList && !old.gotBy && (!qty || qty === old.qty)) {
        setUndo({ id: Date.now(), label: `${old.name} is already on the list` });
        return;
      }
      const next: Item = old
        ? { ...old, onList: true, gotBy: undefined, qty: qty ?? old.qty, addedBy: old.onList ? old.addedBy : me }
        : { id: crypto.randomUUID(), name, qty, aisle: guessAisle(name), onList: true, addedBy: me, times: 0 };
      putItems([next]);
      write(() => (old ? putItems([old]) : setItems((p) => p.filter((x) => x.id !== next.id))), old ? sb.from("shopping_items").update(itemRow(next)).eq("id", old.id) : sb.from("shopping_items").insert(itemRow(next)));
    },

    editItem: (id, meta) => {
      const old = data.shopping.find((x) => x.id === id);
      const name = meta.name.trim().slice(0, 60);
      if (!old || !name) return;
      const next = { ...old, name, qty: meta.qty?.trim().slice(0, 20) || undefined, aisle: meta.aisle };
      putItems([next]);
      write(() => putItems([old]), sb.from("shopping_items").update({ name, qty: next.qty ?? null, aisle: next.aisle }).eq("id", id));
    },

    toggleItem: (id) => {
      const old = data.shopping.find((x) => x.id === id);
      if (!old?.onList) return;
      const next = old.gotBy ? { ...old, gotBy: undefined } : { ...old, gotBy: me, gotAt: new Date().toISOString() };
      putItems([next]);
      write(() => putItems([old]), sb.from("shopping_items").update({ got_by: next.gotBy ?? null, got_at: next.gotAt ?? null }).eq("id", id));
    },

    removeItem: (id) => {
      const old = data.shopping.find((x) => x.id === id);
      if (!old) return;
      const forget = old.times === 0;
      const gone = () => (forget ? setItems((p) => p.filter((x) => x.id !== id)) : putItems([{ ...old, onList: false, gotBy: undefined }]));
      gone();
      write(() => putItems([old]), forget ? sb.from("shopping_items").delete().eq("id", id) : sb.from("shopping_items").update({ on_list: false, got_by: null }).eq("id", id));
      setUndo({
        id: Date.now(),
        label: `Removed ${old.name}`,
        undo: () => {
          putItems([old]);
          write(gone, sb.from("shopping_items").upsert(itemRow(old)));
        },
      });
    },

    finishShopping: () => {
      const got = data.shopping.filter((x) => x.onList && x.gotBy);
      if (!got.length) return;
      const done = got.map((x) => ({ ...x, onList: false, gotBy: undefined, times: x.times + 1 }));
      putItems(done);
      const log = logLine("shop", `finished shopping (${got.length} ${got.length === 1 ? "item" : "items"})`);
      write(
        () => {
          putItems(got);
          setLog((l) => l.filter((x) => x.id !== log.entry.id));
        },
        sb.rpc("finish_shopping"),
        log.query,
      );
      setUndo({
        id: Date.now(),
        label: "Shopping done",
        undo: () => {
          putItems(got);
          write(() => putItems(done), sb.from("shopping_items").upsert(got.map(itemRow)), unlog(log.entry.id));
        },
      });
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

export const klTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-MY", { timeZone: "Asia/Kuala_Lumpur", hour: "numeric", minute: "2-digit" });
