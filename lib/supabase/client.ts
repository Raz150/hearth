import { createBrowserClient } from "@supabase/ssr";

/** Supabase client for the browser (realtime subscriptions). Uses the publishable key; RLS does the guarding. */
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
}
