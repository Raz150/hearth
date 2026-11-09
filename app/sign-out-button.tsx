"use client";

import { Button } from "@heroui/react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  return (
    <Button
      variant="tertiary"
      className="h-11 text-base"
      onPress={async () => {
        // Local scope: only this device signs out.
        await createClient().auth.signOut({ scope: "local" });
        window.location.replace("/login");
      }}
    >
      Sign out
    </Button>
  );
}
