"use server";

import { redirect } from "next/navigation";
import { INKS } from "@/lib/inks";
import { createClient } from "@/lib/supabase/server";

/** Update my own name and/or ink. RLS + column grants also stop editing anyone else. */
export async function saveMe(patch: { name?: string; ink?: string }): Promise<string | null> {
  const update: { display_name?: string; ink?: string } = {};
  if (patch.name !== undefined) {
    const name = String(patch.name).trim();
    if (name.length < 1 || name.length > 30) return "Name should be 1–30 characters.";
    update.display_name = name;
  }
  if (patch.ink !== undefined) {
    if (!INKS.some((i) => i.hex === patch.ink)) return "Unknown ink colour.";
    update.ink = patch.ink;
  }
  if (!Object.keys(update).length) return null;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return "Not signed in.";
  const { error } = await supabase.from("members").update(update).eq("user_id", data.claims.sub);
  if (error?.code === "23505") return "That ink is already taken. Pick another."; // unique (household_id, ink)
  return error ? "Couldn't save. Try again." : null;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Turn notifications on for this phone: store its Web Push subscription (RLS: only as myself). */
export async function savePush(sub: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }): Promise<string | null> {
  const endpoint = String(sub?.endpoint ?? "");
  const p256dh = String(sub?.keys?.p256dh ?? "");
  const auth = String(sub?.keys?.auth ?? "");
  if (!/^https:\/\/\S+$/.test(endpoint) || endpoint.length > 1000 || !p256dh || p256dh.length > 200 || !auth || auth.length > 100) return "That phone's subscription looks wrong.";
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return "Not signed in.";
  const { error } = await supabase.from("push_subscriptions").upsert({ endpoint, p256dh, auth }, { onConflict: "endpoint" });
  return error ? "Couldn't turn notifications on. Try again." : null;
}

/** Turn notifications off for this phone. */
export async function removePush(endpoint: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", String(endpoint));
}
