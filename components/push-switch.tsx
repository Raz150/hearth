"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/kit/button";
import { Card } from "@/components/kit/card";
import { removePush, savePush } from "@/app/(app)/settings/actions";

type State = "loading" | "unsupported" | "denied" | "on" | "off";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

// PushManager wants the VAPID key as bytes.
const keyBytes = (b64url: string) => Uint8Array.from(atob(b64url.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function detect(): Promise<State> {
  // iOS only offers push to the Home Screen app (16.4+), and our service worker only runs in production.
  if (!KEY || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
    return sub ? "on" : "off";
  } catch {
    return "unsupported";
  }
}

/** The master switch: notifications on or off for this phone. */
export function PushSwitch() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    detect().then(setState);
  }, []);

  const turnOn = async () => {
    setBusy(true);
    setError(null);
    try {
      // Must come straight from the tap, or iOS won't ask.
      if ((await Notification.requestPermission()) !== "granted") return setState("denied");
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY) }));
      const err = await savePush(sub.toJSON());
      if (err) {
        await sub.unsubscribe();
        setError(err);
      } else setState("on");
    } catch {
      setError("Couldn't turn notifications on. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    setError(null);
    try {
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
      if (sub) {
        await removePush(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setError("Couldn't turn notifications off. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const text: Record<State, string> = {
    loading: "Checking…",
    unsupported: "Open Hearth from your Home Screen icon to turn these on (needs iOS 16.4 or later).",
    denied: "Notifications are blocked. Turn them on in iPhone Settings → Notifications → Hearth, then come back.",
    on: "On for this phone: notes, thanks, shopping, to-dos for you, and a morning summary. Quiet 11pm–7am, except notes.",
    off: "Get a ping when the other one leaves a note, adds shopping or gives you a to-do.",
  };

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        {state === "on" ? <Bell className="mt-0.5 size-5 shrink-0" aria-hidden /> : <BellOff className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />}
        <p className="text-sm leading-relaxed text-muted" aria-live="polite">
          {text[state]}
        </p>
      </div>
      {(state === "on" || state === "off") && (
        <Button variant={state === "on" ? "secondary" : "primary"} disabled={busy} onClick={state === "on" ? turnOff : turnOn} className="w-full">
          {busy ? "One moment…" : state === "on" ? "Turn off on this phone" : "Turn on notifications"}
        </Button>
      )}
      {error && <p className="text-xs font-semibold text-error-text" role="alert">{error}</p>}
    </Card>
  );
}
