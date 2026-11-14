"use client";

import { useEffect, useState } from "react";

type Part = { text: string; className?: string };

/** Types the parts out once per day (keyed by `day`); afterwards shows them instantly. */
export function Typewriter({ parts, day, className }: { parts: Part[]; day: string; className?: string }) {
  const total = parts.reduce((n, p) => n + p.text.length, 0);
  // null = not decided yet (pre-hydration): render invisibly so layout doesn't jump.
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem("typed-day") === day;
      localStorage.setItem("typed-day", day);
    } catch {}
    if (seen || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(total); // eslint-disable-line react-hooks/set-state-in-effect -- decided once after hydration
      return;
    }
    setShown(0);
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      setShown(n);
      if (n >= total) clearInterval(t);
    }, 45);
    return () => clearInterval(t);
  }, [day, total]);

  const n = shown ?? total;
  const starts = parts.map((_, i) => parts.slice(0, i).reduce((a, p) => a + p.text.length, 0));
  const typing = shown !== null && shown < total;
  return (
    <p className={className} aria-label={parts.map((p) => p.text).join("")} style={{ visibility: shown === null ? "hidden" : undefined }}>
      {parts.map((p, i) => {
        const text = p.text.slice(0, Math.max(0, n - starts[i]));
        return text ? (
          <span key={i} aria-hidden className={p.className}>
            {text}
          </span>
        ) : null;
      })}
      {typing && <span aria-hidden className="ml-0.5 inline-block h-[1em] w-[0.5ch] translate-y-[0.15em] animate-pulse bg-fg" />}
    </p>
  );
}
