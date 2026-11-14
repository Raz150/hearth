"use client";

import { Button } from "@/components/kit/button";
import { Page, PageHeader } from "@/components/ui";

// Shown if loading the household fails (e.g. Supabase unreachable).
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Page>
      <PageHeader kicker="Something went wrong" title="Couldn't load our home" />
      <p className="text-sm font-medium text-muted">The connection to our data hiccuped. It usually sorts itself out in a moment.</p>
      <Button onClick={reset} className="self-start">
        Try again
      </Button>
    </Page>
  );
}
