import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { addDays, klToday, weekStart } from "./date";
import type { Aisle } from "./shopping";

export type Member = { id: string; name: string; ink: string };
export type Step = { id: string; title: string; done: boolean };
/** priority: 0 normal, anything above 0 = important (the app only sets 1). */
export type Todo = { id: string; title: string; due?: string; dueTime?: string; assignee?: string; doneBy?: string; priority: number; tags: string[]; steps: Step[] };
/** A work shift on `day` (KL), "HH:MM" times; ends < starts means it ends the next morning. */
export type Shift = { id: string; member: string; day: string; label: string; starts: string; ends: string };
/** An event or trip from `start` to `end` (YYYY-MM-DD, inclusive). `at` = start time, none = all day. `member` none = both.
 *  yearly: repeats every year from `start` (birthdays, anniversary). */
export type Plan = { id: string; title: string; start: string; end: string; at?: string; member?: string; note?: string; yearly: boolean; important: boolean };
export type Note = { text: string; by: string; at: string };
/** One of us is learning, or has memorised, one doa (id from lib/doa.json). No row = not started. */
export type DoaProgress = { by: string; doa: string; status: "learning" | "memorised"; at: string };
export type LogEntry = { id: string; kind: "todo" | "chore" | "note" | "thanks" | "doa" | "shop"; text: string; by: string; at: string };
/** onList false = history, kept for "buy again". gotBy = in the trolley. times = how often bought; gotAt = last ticked. */
export type Item = { id: string; name: string; qty?: string; aisle: Aisle; onList: boolean; addedBy?: string; gotBy?: string; gotAt?: string; times: number };
type ChoreState = { nextDue: string; lastBy?: string; lastOn?: string };
/** owner: who looks after it (undefined = either of us). prev: state before the last tick, for un-ticking. */
export type Chore = ChoreState & { id: string; title: string; everyDays: number; owner?: string; prev?: ChoreState };

/** Supabase errors are plain objects; wrap them so error pages and logs show which table failed and why. */
function fail(table: string, error: PostgrestError): never {
  throw new Error(`Loading ${table} failed: ${error.message} (${error.code})`);
}

// Each loader reads one table (RLS limits it to our household) and maps it to the app's shape.
// They're used by the server layout for the first paint and by the browser store when realtime says a table changed.

export async function loadMembers(sb: SupabaseClient) {
  const { data, error } = await sb.from("members").select("user_id, household_id, display_name, ink").order("created_at");
  if (error) fail("members", error);
  return data.map((r) => ({ id: r.user_id, name: r.display_name, ink: r.ink, household: r.household_id })) as (Member & { household: string })[];
}

export async function loadTodos(sb: SupabaseClient): Promise<Todo[]> {
  // shortcut: ticked-off items disappear from the app after 7 days (they stay in the database); add an archive view if wanted.
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data, error } = await sb
    .from("todos")
    .select("id, title, due_date, due_time, assignee, done_by, priority, tags, todo_steps(id, title, done)")
    .or(`done_at.is.null,done_at.gt."${since}"`)
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "todo_steps" });
  if (error) fail("todos", error);
  return data.map((r) => ({
    id: r.id,
    title: r.title,
    due: r.due_date ?? undefined,
    dueTime: r.due_time?.slice(0, 5) ?? undefined,
    assignee: r.assignee ?? undefined,
    doneBy: r.done_by ?? undefined,
    priority: r.priority,
    tags: r.tags,
    steps: r.todo_steps as Step[],
  }));
}

export async function loadChores(sb: SupabaseClient): Promise<Chore[]> {
  const { data, error } = await sb
    .from("chores")
    .select("id, title, every_days, next_due, owner, last_by, last_on, prev_next_due, prev_last_by, prev_last_on")
    .order("created_at");
  if (error) fail("chores", error);
  return data.map((r) => ({
    id: r.id,
    title: r.title,
    everyDays: r.every_days,
    nextDue: r.next_due,
    owner: r.owner ?? undefined,
    lastBy: r.last_by ?? undefined,
    lastOn: r.last_on ?? undefined,
    prev: r.prev_next_due ? { nextDue: r.prev_next_due, lastBy: r.prev_last_by ?? undefined, lastOn: r.prev_last_on ?? undefined } : undefined,
  }));
}

export async function loadNote(sb: SupabaseClient): Promise<Note | null> {
  const { data, error } = await sb.from("notes").select("body, written_by, written_at").maybeSingle();
  if (error) fail("notes", error);
  return data && { text: data.body, by: data.written_by, at: data.written_at };
}

/** This week's log (Monday onwards, KL time): enough for "today" and the weekly chore tally. */
export async function loadLog(sb: SupabaseClient): Promise<LogEntry[]> {
  const { data, error } = await sb
    .from("activity")
    .select("id, kind, body, done_by, done_at")
    .gte("done_at", `${weekStart(klToday())}T00:00:00+08:00`)
    .order("done_at", { ascending: false })
    .limit(300);
  if (error) fail("activity", error);
  return data.map((r) => ({ id: r.id, kind: r.kind, text: r.body, by: r.done_by, at: r.done_at }));
}

/** Both of us, every doa we've started. */
export async function loadDoa(sb: SupabaseClient): Promise<DoaProgress[]> {
  const { data, error } = await sb.from("doa_progress").select("user_id, doa_id, status, updated_at").order("updated_at", { ascending: false });
  if (error) fail("doa_progress", error);
  return data.map((r) => ({ by: r.user_id, doa: r.doa_id, status: r.status, at: r.updated_at }));
}

// shortcut: the calendar only loads from ~6 weeks back; older months show empty. Add a range fetch if we want history.
const calendarFrom = () => addDays(klToday(), -45);

export async function loadShifts(sb: SupabaseClient): Promise<Shift[]> {
  const { data, error } = await sb.from("shifts").select("id, member, day, label, starts, ends").gte("day", calendarFrom()).order("day");
  if (error) fail("shifts", error);
  return data.map((r) => ({ ...r, starts: r.starts.slice(0, 5), ends: r.ends.slice(0, 5) }));
}

export async function loadPlans(sb: SupabaseClient): Promise<Plan[]> {
  const { data, error } = await sb.from("events").select("id, title, starts_on, ends_on, at, member, note, yearly, important").or(`ends_on.gte.${calendarFrom()},yearly.is.true`).order("starts_on").order("at");
  if (error) fail("events", error);
  return data.map((r) => ({
    id: r.id,
    title: r.title,
    start: r.starts_on,
    end: r.ends_on,
    at: r.at?.slice(0, 5) ?? undefined,
    member: r.member ?? undefined,
    note: r.note ?? undefined,
    yearly: r.yearly,
    important: r.important,
  }));
}

export async function loadShopping(sb: SupabaseClient): Promise<Item[]> {
  // shortcut: the 500 most recent rows; history past that drops out of "buy again". Fine for one household for years.
  const { data, error } = await sb.from("shopping_items").select("id, name, qty, aisle, on_list, added_by, got_by, got_at, times").order("created_at", { ascending: false }).limit(500);
  if (error) fail("shopping_items", error);
  return data.map((r) => ({
    id: r.id,
    name: r.name,
    qty: r.qty ?? undefined,
    aisle: r.aisle,
    onList: r.on_list,
    addedBy: r.added_by ?? undefined,
    gotBy: r.got_by ?? undefined,
    gotAt: r.got_at ?? undefined,
    times: r.times,
  }));
}
