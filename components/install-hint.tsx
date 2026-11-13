"use client";

import { useSyncExternalStore } from "react";
import { Share, SquarePlus } from "lucide-react";

const isInstalled = () =>
  matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** iOS has no install prompt, so explain the Share-sheet steps. Hidden once running from the Home Screen. */
export function InstallHint() {
  // Server render and installed app both say "installed", so nothing flashes.
  const installed = useSyncExternalStore(() => () => {}, isInstalled, () => true);
  if (installed) return null;
  return (
    <div className="mb-8 rounded-[1.1rem_0.85rem_1.2rem_0.95rem] border border-dashed border-accent p-4">
      <p className="font-hand text-sm text-accent">keep it on your Home Screen</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        In Safari, tap <Share className="inline size-4 -translate-y-0.5 text-ink" aria-label="Share" /> Share, then{" "}
        <SquarePlus className="inline size-4 -translate-y-0.5 text-ink" aria-hidden /> <span className="text-ink">Add to Home Screen</span>. Hearth then opens full-screen, like an app.
      </p>
    </div>
  );
}
