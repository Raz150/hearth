import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";

async function Greeting() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  // proxy.ts has already redirected anyone without a session.
  const { data: me } = await supabase
    .from("household_members")
    .select("display_name")
    .eq("user_id", auth!.claims.sub)
    .single();

  return <h1 className="text-2xl font-semibold">Hi {me?.display_name}</h1>;
}

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4">
      <Suspense fallback={<h1 className="text-2xl font-semibold">Hearth</h1>}>
        <Greeting />
      </Suspense>
      <SignOutButton />
    </main>
  );
}
