// Pure push-notification rules, shared by the API routes and tested in push.test.mjs. No imports, so node --test can load it.

/** What the service worker shows. `badge` = things left today, for the Home Screen icon. */
export type PushMessage = { title: string; body: string; url: string; tag: string; badge?: number };

/** 23:00–07:00 in KL: hold pings (the morning digest sums them up). Notes are the exception. */
export const isQuiet = (klHour: number) => klHour >= 23 || klHour < 7;

/** How long a shopping add waits for another one before pinging. Also the gap that still counts as "one burst". */
export const SHOP_WAIT_MS = 50_000;

/** Newest-first add times → how many belong to the latest burst (each within SHOP_WAIT_MS of the next). */
export function burstSize(timesDesc: readonly number[], gapMs = SHOP_WAIT_MS): number {
  let n = timesDesc.length ? 1 : 0;
  while (n < timesDesc.length && timesDesc[n - 1] - timesDesc[n] < gapMs) n++;
  return n;
}

/** "Milk", "Milk and Eggs", "Milk, Eggs and Rice", "Milk, Eggs and 3 more". */
export function itemList(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length <= 3) return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
}

/** Log lines name the recipient ("thanked Aisha for Laundry"); in their own notification it reads "you". */
export const toYou = (line: string, recipientName: string) => (recipientName ? line.replaceAll(recipientName, "you") : line);

/** "3 to-dos", "1 chore": skips zeros. */
export const counted = (n: number, one: string, many = `${one}s`) => (n ? `${n} ${n === 1 ? one : many}` : "");

/** Validates the database trigger's POST body. Returns null when it isn't one of ours. */
export function parsePing(body: unknown): { table: "activity" | "shopping_items" | "todos"; by: string; record: Record<string, unknown> } | null {
  if (!body || typeof body !== "object") return null;
  const { table, by, record } = body as Record<string, unknown>;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (table !== "activity" && table !== "shopping_items" && table !== "todos") return null;
  if (typeof by !== "string" || !uuid.test(by)) return null;
  if (!record || typeof record !== "object" || typeof (record as Record<string, unknown>).household_id !== "string") return null;
  return { table, by, record: record as Record<string, unknown> };
}
