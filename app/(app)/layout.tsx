import { Nav } from "@/components/nav";
import { UndoToast } from "@/components/undo-toast";
import { Page } from "@/components/ui";
import { MockProvider } from "@/lib/mock";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./settings/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const me = data?.claims.sub;
  // RLS returns only members of my household.
  const { data: rows } = await supabase.from("members").select("user_id, display_name, ink").order("created_at");
  const members = (rows ?? []).map((r) => ({ id: r.user_id as string, name: r.display_name as string, ink: r.ink as string }));

  if (!me || !members.some((m) => m.id === me)) {
    return (
      <Page>
        <h1 className="font-serif text-3xl">Almost there</h1>
        <p className="mt-3 text-ink-soft">This account isn&apos;t linked to a household yet. Run the seed script in Supabase, then sign in again.</p>
        <form action={signOut}>
          <button className="mt-6 min-h-11 rounded-full border border-line px-5">Sign out</button>
        </form>
      </Page>
    );
  }

  return (
    <MockProvider members={members} me={me}>
      {children}
      <UndoToast />
      <Nav />
    </MockProvider>
  );
}
