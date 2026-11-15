// Habit rules, kept free of imports so node --test can load this file directly.
// Why these numbers: habits take ~66 days (median) to feel automatic (Lally 2010; Singh 2024), so we ask
// "how automatic?" every two weeks and only suggest graduating after eight weeks.

export type HabitCheck = { by: string; day: string };
export type HabitRating = { by: string; day: string; score: number };
/** owner undefined = a habit we do together. since = the KL day it was added. */
export type Habit = { id: string; owner?: string; cue: string; action: string; perWeek: number; graduatedOn?: string; since: string; checks: HabitCheck[]; ratings: HabitRating[] };

export const RATE_EVERY = 14;
export const GRADUATE_AFTER = 56;
/** 1–5 answers to "How automatic does this feel now?" (one item from the SRBAI, Gardner 2012). */
export const FEELS = ["I have to push myself", "Takes effort", "Getting easier", "Mostly automatic", "I just do it"] as const;

const age = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** "read one page" → "Read one page", for places where the action stands alone. */
export const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Is this habit one `by` does (theirs, or ours)? */
export const isFor = (h: Habit, by: string) => !h.owner || h.owner === by;

/** How many of `week`'s days `by` ticked. */
export const doneIn = (h: Habit, by: string, week: readonly string[]) => h.checks.filter((c) => c.by === by && week.includes(c.day)).length;

const mine = (h: Habit, by: string) => h.ratings.filter((r) => r.by === by).sort((a, b) => b.day.localeCompare(a.day));

/** Time to ask "how automatic?": two weeks in, and two weeks since `by` last answered. */
export function ratingDue(h: Habit, by: string, today: string) {
  if (h.graduatedOn || !isFor(h, by) || age(h.since, today) < RATE_EVERY) return false;
  const last = mine(h, by)[0];
  return !last || age(last.day, today) >= RATE_EVERY;
}

/** Suggest graduating: eight weeks in, and `by`'s last two answers were 4 or 5. */
export function readyToGraduate(h: Habit, by: string, today: string) {
  if (h.graduatedOn || !isFor(h, by) || age(h.since, today) < GRADUATE_AFTER) return false;
  const [a, b] = mine(h, by);
  return !!a && !!b && a.score >= 4 && b.score >= 4;
}

/** Of the `n` full weeks before the week starting `monday`, how many `by` hit the target in. */
export function goodWeeks(h: Habit, by: string, monday: string, n = 8) {
  const perWeek = new Map<number, number>();
  for (const c of h.checks) {
    if (c.by !== by) continue;
    const k = Math.ceil(age(c.day, monday) / 7); // 1 = last week, 2 = the week before…
    if (k >= 1 && k <= n) perWeek.set(k, (perWeek.get(k) ?? 0) + 1);
  }
  return [...perWeek.values()].filter((v) => v >= h.perWeek).length;
}
