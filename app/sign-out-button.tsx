"use client";

import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  return (
    <button
      className="h-12 px-4 underline"
      onClick={async () => {
        // Local scope: only this device signs out.
        await createClient().auth.signOut({ scope: "local" });
        window.location.replace("/login");
      }}
    >
      Sign out
    </button>
  );
}
