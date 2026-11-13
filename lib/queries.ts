import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { klToday, weekStart } from "./date";

export type Member = { id: string; name: string; ink: string };
export type Todo = { id: string; title: string; due?: string; assignee?: string; doneBy?: string };
export type Note = { text: string; by: string; at: string };
export type LogEntry = { id: string; kind: "todo" | "chore" | "bill" | "note"; text: string; by: string; at: string };

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
    .select("id, title, due_date, assignee, done_by")
    .or(`done_at.is.null,done_at.gt."${since}"`)
    .order("created_at", { ascending: false });
  if (error) fail("todos", error);
  return data.map((r) => ({ id: r.id, title: r.title, due: r.due_date ?? undefined, assignee: r.assignee ?? undefined, doneBy: r.done_by ?? undefined }));
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
