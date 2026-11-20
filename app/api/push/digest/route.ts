import { klToday, timeSpan, yearsOn } from "@/lib/date";
import { counted, itemList } from "@/lib/push";
import { authorized, leftToday, sendTo } from "@/lib/push-server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Vercel Cron, daily ~08:00 KL (vercel.json). Each person gets their day, plus what the other did during quiet hours. */
export async function GET(req: Request) {
  if (!authorized(req, process.env.CRON_SECRET)) return new Response(null, { status: 401 });
  const sb = createAdminClient();
  const today = klToday();
  // Quiet hours that just ended: 23:00 yesterday → 07:00 today, KL (+08:00, no DST).
  const from = new Date(Date.parse(`${today}T00:00:00+08:00`) - 3_600_000).toISOString();
  const until = `${today}T07:00:00+08:00`;

  const [{ data: members }, { data: subs }] = await Promise.all([
    sb.from("members").select("user_id, household_id, display_name"),
    sb.from("push_subscriptions").select("user_id"),
  ]);
  const subscribed = new Set(subs?.map((s) => s.user_id));
  let sent = 0;

  for (const me of members ?? []) {
    if (!subscribed.has(me.user_id)) continue;
    const h = me.household_id;
    const partner = members!.find((m) => m.household_id === h && m.user_id !== me.user_id);
    const mineOrShared = `assignee.is.null,assignee.eq.${me.user_id}`;
    const [todos, chores, shift, events, items, given, thanks] = await Promise.all([
      sb.from("todos").select("id", { count: "exact", head: true }).eq("household_id", h).is("done_by", null).lte("due_date", today).or(mineOrShared),
      sb.from("chores").select("owner, last_on").eq("household_id", h).lte("next_due", today),
      sb.from("shifts").select("label, starts, ends").eq("household_id", h).eq("member", me.user_id).eq("day", today).maybeSingle(),
      sb.from("events").select("title, starts_on, ends_on, yearly, member").eq("household_id", h).or(`yearly.is.true,ends_on.gte.${today}`),
      partner ? sb.from("shopping_items").select("name").eq("household_id", h).eq("added_by", partner.user_id).eq("on_list", true).gte("listed_at", from).lt("listed_at", until) : null,
      partner ? sb.from("todos").select("id", { count: "exact", head: true }).eq("household_id", h).eq("created_by", partner.user_id).eq("assignee", me.user_id).gte("created_at", from).lt("created_at", until) : null,
      partner ? sb.from("activity").select("id", { count: "exact", head: true }).eq("household_id", h).eq("done_by", partner.user_id).eq("kind", "thanks").gte("done_at", from).lt("done_at", until) : null,
    ]);

    const plans = (events.data ?? []).filter((e) => (!e.member || e.member === me.user_id) && yearsOn({ start: e.starts_on, end: e.ends_on, yearly: e.yearly }, today) !== null).map((e) => e.title);
    const myChores = (chores.data ?? []).filter((c) => c.last_on !== today && (!c.owner || c.owner === me.user_id)).length;
    const due = [counted(todos.count ?? 0, "to-do"), counted(myChores, "chore")].filter(Boolean).join(", ");
    const overnight = [
      items?.data?.length ? `added ${itemList(items.data.map((i) => i.name))}` : "",
      given?.count ? `gave you ${counted(given.count, "to-do")}` : "",
      thanks?.count ? "sent you thanks 💛" : "",
    ].filter(Boolean);
    const lines = [
      due && `Today: ${due}`,
      shift.data && `${shift.data.label} ${timeSpan(shift.data.starts.slice(0, 5), shift.data.ends.slice(0, 5))}`,
      plans.length ? `📅 ${plans.slice(0, 2).join(", ")}` : "",
      overnight.length && partner ? `Overnight ${partner.display_name} ${overnight.join(", ")}` : "",
    ].filter(Boolean);
    if (!lines.length) continue; // a free day with nothing new: no ping

    await sendTo(sb, [me.user_id], { title: "Good morning ☀️", body: lines.join(" · "), url: "/", tag: "digest", badge: await leftToday(sb, h) });
    sent++;
  }
  return Response.json({ sent });
}
