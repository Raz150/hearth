import { after } from "next/server";
import { klHour } from "@/lib/date";
import { SHOP_WAIT_MS, burstSize, isQuiet, itemList, parsePing, toYou, type PushMessage } from "@/lib/push";
import { authorized, leftToday, sendTo } from "@/lib/push-server";
import { createAdminClient } from "@/lib/supabase/admin";

// Shopping pings wait SHOP_WAIT_MS for more adds; 60s is the most every Vercel plan setup allows.
export const maxDuration = 60;

/** Called by the database (private.push_ping trigger) after something worth a ping. */
export async function POST(req: Request) {
  if (!authorized(req, process.env.PUSH_WEBHOOK_SECRET)) return new Response(null, { status: 401 });
  const ping = parsePing(await req.json().catch(() => null));
  if (!ping) return new Response(null, { status: 400 });
  // Answer the database right away; the work (and the shopping wait) happens after.
  after(() => handle(ping).catch((e) => console.error("push handler failed", e)));
  return new Response(null, { status: 202 });
}

async function handle({ table, by, record }: NonNullable<ReturnType<typeof parsePing>>) {
  const sb = createAdminClient();
  const household = String(record.household_id);
  const { data: members } = await sb.from("members").select("user_id, display_name").eq("household_id", household);
  const sender = members?.find((m) => m.user_id === by);
  if (!sender) return; // not one of this household's people
  const others = members!.filter((m) => m.user_id !== by);
  const name = sender.display_name;
  let to = others.map((m) => m.user_id);
  let msg: Omit<PushMessage, "badge"> | null = null;
  let loud = false; // ignores quiet hours

  if (table === "activity") {
    const body = String(record.body ?? "");
    if (record.kind === "note") {
      const { data: note } = await sb.from("notes").select("body").eq("household_id", household).maybeSingle();
      msg = { title: `💌 ${name} left you a note`, body: note?.body?.slice(0, 140) ?? "", url: "/", tag: "note" };
      loud = true;
    } else if (record.kind === "thanks") {
      // One recipient in a two-person home; "thanked Aisha" reads "thanked you" on Aisha's phone.
      msg = { title: "Hearth", body: `${name} ${toYou(body, others[0]?.display_name ?? "")}`, url: "/", tag: "thanks" };
    } else if (record.kind === "shop") {
      msg = { title: "🛒 Shopping", body: `${name} ${body}`, url: "/shopping", tag: "shopping" };
    }
  } else if (table === "todos") {
    const assignee = String(record.assignee);
    if (assignee === by || !others.some((m) => m.user_id === assignee)) return; // gave it to themselves
    to = [assignee];
    msg = { title: "New to-do for you", body: `${name} gave you: ${String(record.title ?? "").slice(0, 120)}`, url: "/todo", tag: `todo-${record.id}` };
  } else if (table === "shopping_items") {
    if (record.added_by !== by) return;
    await new Promise((r) => setTimeout(r, SHOP_WAIT_MS));
    // Still the newest add by this person? Otherwise a later ping will cover this item too.
    const { data: items } = await sb
      .from("shopping_items")
      .select("id, name, listed_at")
      .eq("household_id", household)
      .eq("on_list", true)
      .is("got_by", null)
      .eq("added_by", by)
      .order("listed_at", { ascending: false })
      .limit(30);
    if (!items?.length || items[0].id !== record.id) return;
    const n = burstSize(items.map((i) => Date.parse(i.listed_at)));
    msg = { title: "🛒 Shopping", body: `${name} added ${itemList(items.slice(0, n).map((i) => i.name))}`, url: "/shopping", tag: "shopping" };
  }

  if (!msg || (!loud && isQuiet(klHour()))) return; // quiet hours: the morning digest mentions it
  await sendTo(sb, to, { ...msg, badge: await leftToday(sb, household) });
}
