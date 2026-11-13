"use client";

import { Page } from "@/components/ui";

// Shown if loading the household fails (e.g. Supabase unreachable).
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Page>
      <p className="font-hand text-sm text-accent">a smudge on the page</p>
      <h1 className="mt-1 font-serif text-3xl">Couldn&apos;t open the journal</h1>
      <p className="mt-3 text-ink-soft">The connection to our data hiccuped. It usually sorts itself out in a moment.</p>
      <button onClick={reset} className="mt-6 min-h-12 rounded-full bg-ink px-6 font-semibold text-paper">
        Try again
      </button>
    </Page>
  );
}
