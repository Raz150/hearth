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
  return error ? "Couldn't save. Try again." : null;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
