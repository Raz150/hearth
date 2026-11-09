// Days are YYYY-MM-DD strings in Kuala Lumpur time, matching Postgres `date`.
const utc = (day: string) => new Date(`${day}T00:00:00Z`);

export function klDate(moment: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(moment);
}

export function addDays(day: string, days: number) {
  const date = utc(day);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Always in the future: on a Saturday this means next Saturday.
export function nextSaturday(today: string) {
  return addDays(today, (6 - utc(today).getUTCDay() + 7) % 7 || 7);
}

export function planLabel(day: string, today: string) {
  const gap = (utc(day).getTime() - utc(today).getTime()) / 86_400_000;
  if (gap === 0) return "Today";
  if (gap === 1) return "Tomorrow";
  const options: Intl.DateTimeFormatOptions =
    Math.abs(gap) <= 6 ? { weekday: "long", timeZone: "UTC" } : { day: "numeric", month: "short", timeZone: "UTC" };
  const label = new Intl.DateTimeFormat("en-MY", options).format(utc(day));
  return gap < 0 ? `from ${label}` : label;
}

export function doneLastWeek(items: { completed_by: string | null; completed_at: string | null }[], today: string) {
  const counts: Record<string, number> = {};
  for (const item of items) {
    if (item.completed_by && item.completed_at && klDate(new Date(item.completed_at)) > addDays(today, -7)) {
      counts[item.completed_by] = (counts[item.completed_by] ?? 0) + 1;
    }
  }
  return counts;
}
