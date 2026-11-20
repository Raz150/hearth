"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Production only: a service worker in dev fights with hot reload.
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    // Opening the app clears the Home Screen badge that pings set.
    const clear = () => document.visibilityState === "visible" && navigator.clearAppBadge?.().catch(() => {});
    clear();
    document.addEventListener("visibilitychange", clear);
    return () => document.removeEventListener("visibilitychange", clear);
  }, []);
  return null;
}
