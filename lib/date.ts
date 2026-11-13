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

/** Bill due date this month; day 31 becomes the month's last day in short months. */
export function dueDateInMonth(today: string, dueDay: number): string {
  const [y, m] = today.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(Math.min(dueDay, last)).padStart(2, "0")}`;
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

/** Shift a YYYY-MM month key by n months. */
export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}
