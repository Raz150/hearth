const TZ = "Asia/Kuala_Lumpur";

/** Today's date in KL as YYYY-MM-DD. */
export function klToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}

export function klHour(now = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).format(now));
}

/** Add days to a YYYY-MM-DD string (calendar math in UTC, so no DST/offset drift). */
export function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export function formatDay(ymd: string, opts: Intl.DateTimeFormatOptions): string {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", ...opts });
}

/** "today", "tomorrow", "in 3 days", "yesterday", "2 days late". */
export function relativeDue(ymd: string, today = klToday()): string {
  const n = daysBetween(today, ymd);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  return n > 0 ? `in ${n} days` : `${-n} days late`;
}

/** Saturday of this weekend; today if it's already Saturday or Sunday. */
export function thisWeekend(today: string): string {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
  return dow === 0 ? today : addDays(today, 6 - dow);
}

/** Monday of the week containing `today`. */
export function weekStart(today: string): string {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
  return addDays(today, -((dow + 6) % 7));
}

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Due date for a quick-add word: today/tmr/esok/lusa/weekend/fri…; undefined if it isn't one. */
export function dueWord(word: string, today: string): string | undefined {
  const w = word.toLowerCase().replace(/[.,!]+$/, "");
  if (["today", "tdy", "tonight"].includes(w)) return today;
  if (["tomorrow", "tmr", "tmrw", "esok"].includes(w)) return addDays(today, 1);
  if (w === "lusa") return addDays(today, 2);
  if (w === "weekend") return thisWeekend(today);
  const i = w.length >= 3 ? DAYS.findIndex((d) => d.startsWith(w)) : -1;
  if (i < 0) return undefined;
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
  return addDays(today, (i - dow + 7) % 7); // next such day; today if it's that day
}

/** Same rule as the database: lowercase, starts with a letter, up to 20 chars. */
export const TAG = /^[a-z][a-z0-9-]{0,19}$/;

/**
 * "pay rent fri @aisha ! #money" → { title: "pay rent", due: <Friday>, assignee: <Aisha's id>, priority: 1, tags: ["money"] }.
 * @name, ! (important; !! and !!! too) and #tag work anywhere; a date word only as the last word.
 * Leave out `today` / `members`, or set `priority` / `tags` false, to leave that kind in the text.
 */
export function parseQuickAdd(
  text: string,
  o: { today?: string; me?: string; members?: { id: string; name: string }[]; priority?: boolean; tags?: boolean },
) {
  let assignee: string | undefined;
  let due: string | undefined;
  let priority: number | undefined;
  const tags: string[] = [];
  const words = text.trim().split(/\s+/).filter((w) => {
    const tag = w.startsWith("#") ? w.slice(1).toLowerCase() : "";
    if (o.tags !== false && TAG.test(tag) && tags.length < 5) {
      if (!tags.includes(tag)) tags.push(tag);
      return false;
    }
    if (o.priority !== false && priority === undefined && /^!{1,3}$/.test(w)) {
      priority = 1;
      return false;
    }
    if (!o.members || assignee || !w.startsWith("@") || w.length < 2) return true;
    const q = w.slice(1).toLowerCase();
    const id = q === "me" ? o.me : o.members.find((m) => m.name.toLowerCase().startsWith(q))?.id;
    if (id) assignee = id;
    return !id;
  });
  if (o.today && words.length > 1) {
    due = dueWord(words[words.length - 1], o.today);
    if (due) words.pop();
  }
  return { title: words.join(" "), due, assignee, priority, tags };
}

/** "21:30" (or "21:30:00" from Postgres) → "9:30 PM". */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "07:30" → "7:30a", "21:00" → "9p": fits a calendar cell. */
export function shortTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "a" : "p"}`;
}

/** Monday-first weeks covering the month of `ymd` (each week = 7 YYYY-MM-DD strings). */
export function monthWeeks(ymd: string): string[][] {
  const first = `${ymd.slice(0, 7)}-01`;
  const weeks: string[][] = [];
  for (let d = weekStart(first); d.slice(0, 7) <= first.slice(0, 7); d = addDays(d, 7)) {
    weeks.push([0, 1, 2, 3, 4, 5, 6].map((n) => addDays(d, n)));
  }
  return weeks;
}

/** "9:30 PM – 7:30 AM next day" (ends before it starts = overnight). */
export const timeSpan = (starts: string, ends: string) => `${formatTime(starts)} – ${formatTime(ends)}${ends < starts ? " next day" : ""}`;

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Same day `n` years later; 29 Feb becomes 28 Feb in other years. */
export function addYears(ymd: string, n: number): string {
  const y = Number(ymd.slice(0, 4)) + n;
  const md = ymd.slice(5) === "02-29" && !isLeap(y) ? "02-28" : ymd.slice(5);
  return `${String(y).padStart(4, "0")}-${md}`;
}

type Dated = { start: string; end: string; yearly?: boolean };

/** Is `d` inside this event? Returns how many years since the first time (0 for one-off events), or null if not. */
export function yearsOn(p: Dated, d: string): number | null {
  if (!p.yearly) return p.start <= d && d <= p.end ? 0 : null;
  const first = Number(p.start.slice(0, 4));
  for (const y of [Number(d.slice(0, 4)), Number(d.slice(0, 4)) - 1]) {
    const n = y - first; // the year before covers ranges that run over New Year
    if (n >= 0 && addYears(p.start, n) <= d && d <= addYears(p.end, n)) return n;
  }
  return null;
}

/** The next time this event starts on or after `from`, and which year it is; null if a one-off already started. */
export function nextStart(p: Dated, from: string): { start: string; years: number } | null {
  if (!p.yearly) return p.start >= from ? { start: p.start, years: 0 } : null;
  let n = Math.max(0, Number(from.slice(0, 4)) - Number(p.start.slice(0, 4)));
  if (addYears(p.start, n) < from) n++;
  return { start: addYears(p.start, n), years: n };
}

/** "28 years since 1998" (birthday: her age that day; anniversary: years married). */
export const yearsSince = (n: number, start: string) => `${n} ${n === 1 ? "year" : "years"} since ${start.slice(0, 4)}`;
