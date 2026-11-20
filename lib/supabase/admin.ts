import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Bypasses RLS. Only for the push routes, which are called by the database / Vercel Cron, never by a browser. */
export const createAdminClient = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
