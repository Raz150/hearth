import "server-only";
import { timingSafeEqual } from "node:crypto";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { klToday } from "@/lib/date";
import type { PushMessage } from "@/lib/push";

/** Constant-time check of `Authorization: Bearer <secret>`. */
export function authorized(req: Request, secret: string | undefined): boolean {
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return !!secret && got.length === want.length && timingSafeEqual(got, want);
}

/** Things left today, same count as the Home screen: open to-dos due by today + chores due and not done today. */
export async function leftToday(sb: SupabaseClient, household: string): Promise<number> {
  const today = klToday();
  const [todos, chores] = await Promise.all([
    sb.from("todos").select("id", { count: "exact", head: true }).eq("household_id", household).is("done_by", null).lte("due_date", today),
    sb.from("chores").select("id", { count: "exact", head: true }).eq("household_id", household).lte("next_due", today).or(`last_on.is.null,last_on.neq.${today}`),
  ]);
  return (todos.count ?? 0) + (chores.count ?? 0);
}

/** Sends to every phone of these people. Drops subscriptions Apple says are gone (404/410). */
export async function sendTo(sb: SupabaseClient, userIds: readonly string[], msg: PushMessage): Promise<void> {
  if (!userIds.length) return;
  const { data: subs, error } = await sb.from("push_subscriptions").select("id, endpoint, p256dh, auth").in("user_id", userIds);
  if (error) throw error;
  // Apple wants a real https URL or mailto; the production domain is the honest one.
  const subject = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "localhost"}`;
  webpush.setVapidDetails(subject, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  await Promise.all(
    (subs ?? []).map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 60 * 60 * 12, urgency: "normal" }).catch(async (e: { statusCode?: number }) => {
        if (e.statusCode === 404 || e.statusCode === 410) await sb.from("push_subscriptions").delete().eq("id", s.id);
        else console.error("push failed", e.statusCode, e);
      }),
    ),
  );
}
