import { Nav } from "@/components/nav";
import { TopBar } from "@/components/top-bar";
import { UndoToast } from "@/components/undo-toast";
import { Page } from "@/components/ui";
import { loadChores, loadDoa, loadLog, loadMembers, loadNote, loadTodos } from "@/lib/queries";
import { HouseholdProvider } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./settings/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const me = data?.claims.sub;
  // RLS returns only rows of my household.
  const [members, todos, chores, note, log, doa] = await Promise.all([
    loadMembers(supabase), loadTodos(supabase), loadChores(supabase), loadNote(supabase), loadLog(supabase), loadDoa(supabase),
  ]);
  const household = members.find((m) => m.id === me)?.household;

  if (!me || !household) {
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
    <HouseholdProvider initial={{ members, todos, chores, note, log, doa }} me={me} household={household}>
      <TopBar />
      {children}
      <UndoToast />
      <Nav />
    </HouseholdProvider>
  );
}
