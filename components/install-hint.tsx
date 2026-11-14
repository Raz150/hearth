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
    <div className="flex flex-col gap-1.5 rounded-card border-2 border-dashed border-edge-control p-4 text-fg">
      <p className="font-display text-[15px] font-bold">Keep it on your Home Screen</p>
      <p className="text-sm leading-relaxed text-muted">
        In Safari, tap <Share className="inline size-4 -translate-y-0.5 text-fg" aria-label="Share" /> Share, then{" "}
        <SquarePlus className="inline size-4 -translate-y-0.5 text-fg" aria-hidden /> <span className="font-semibold text-fg">Add to Home Screen</span>. Hearth then opens
        full-screen, like an app.
      </p>
    </div>
  );
}
