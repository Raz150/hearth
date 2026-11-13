"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Amiri } from "next/font/google";
import { ChevronDown, Share } from "lucide-react";
import { daysBetween } from "@/lib/date";
import { inkText, useStore } from "@/lib/store";
import reminders from "@/lib/reminders.json";

const amiri = Amiri({ subsets: ["arabic"], weight: "400" });

const LANGS = [
  { id: "en", label: "EN", lessons: "Lessons" },
  { id: "ms", label: "BM", lessons: "Pengajaran" },
  { id: "ar", label: "عربي", lessons: "الفوائد" },
] as const;
type Lang = (typeof LANGS)[number]["id"];
type Entry = { kind: string; ar: string; en: string; ms: string; ref: string; lessons?: Record<Lang, string[]> };

/** Today's ayah or hadith: the same one for both of us, changing at KL midnight. */
export function Reminder({ day }: { day: string }) {
  const list = reminders as Entry[];
  const r = list[((daysBetween("2026-01-01", day) % list.length) + list.length) % list.length];
  const friday = new Date(`${day}T12:00:00Z`).getUTCDay() === 5;
  const [lang, setLang] = useState<Lang>("en");
  const [showLessons, setShowLessons] = useState(false);
  const ar = lang === "ar";
  const textClass = ar ? `${amiri.className} text-2xl leading-[2.1]` : "font-serif text-lg leading-relaxed italic";

  // Per-phone preference; read after mount so the server render matches.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("reminder-lang");
      if (saved === "ms" || saved === "ar") setLang(saved); // eslint-disable-line react-hooks/set-state-in-effect -- restoring a saved preference
    } catch {}
  }, []);

  function pick(l: Lang) {
    setLang(l);
    try {
      localStorage.setItem("reminder-lang", l);
    } catch {}
  }

  async function share() {
    const text = `${r[lang]}\n\n— ${r.ref}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch {} // user closed the share sheet
  }

  return (
    <section className="mb-8 rounded-2xl border border-line bg-card px-5 pt-4 pb-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-hand text-sm text-accent">{r.kind === "quran" ? "today’s ayah" : "today’s hadith"}</p>
        <div role="radiogroup" aria-label="Language" className="flex rounded-full bg-paper-deep p-0.5 text-sm">
          {LANGS.map((l) => (
            <button
              key={l.id}
              role="radio"
              aria-checked={lang === l.id}
              onClick={() => pick(l.id)}
              className={`min-h-9 min-w-11 rounded-full px-2.5 transition-colors ${lang === l.id ? "bg-card text-ink shadow-sm" : "text-ink-soft"}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={lang}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          lang={lang}
          dir={ar ? "rtl" : "ltr"}
        >
          <p className={`mt-3 ${textClass}`}>{r[lang]}</p>

          {r.lessons && (
            <>
              <button
                onClick={() => setShowLessons((v) => !v)}
                aria-expanded={showLessons}
                className="mt-2 flex min-h-11 items-center gap-1 font-hand text-sm text-accent"
              >
                {LANGS.find((l) => l.id === lang)!.lessons}
                <ChevronDown size={16} className={`transition-transform ${showLessons ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence initial={false}>
                {showLessons && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className={`overflow-hidden ${ar ? `${amiri.className} text-lg leading-loose` : "text-base leading-snug"}`}
                  >
                    {r.lessons[lang].map((x) => (
                      <li key={x} className="mb-2 flex gap-2">
                        <span aria-hidden className="text-accent">✿</span>
                        {x}
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-dashed border-line pt-1">
        <p className="font-hand text-xs text-ink-soft">{r.ref}</p>
        <button onClick={share} aria-label="Share" className="grid size-11 shrink-0 place-items-center text-ink-soft">
          <Share size={18} />
        </button>
      </div>

      {friday && <p className="pb-1 font-hand text-sm text-accent">It’s Friday: a good day for Surah Al-Kahf ✿</p>}

      <Reflections />
    </section>
  );
}

/** Each of us writes one line: what we'll take from today's reminder. */
function Reflections() {
  const s = useStore();
  const [draft, setDraft] = useState<string | null>(null);
  const mine = s.reflections.find((r) => r.by === s.me);
  const theirs = s.members.filter((m) => m.id !== s.me).map((m) => ({ m, r: s.reflections.find((r) => r.by === m.id) }));
  const me = s.member(s.me);

  function save(e: React.FormEvent) {
    e.preventDefault();
    s.setReflection(draft ?? "");
    setDraft(null);
  }

  return (
    <div className="mt-2 space-y-2 border-t border-dashed border-line pt-3">
      {draft !== null ? (
        <form onSubmit={save}>
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={200}
            rows={2}
            aria-label="My reflection"
            placeholder="what will I take from this today…"
            className="w-full resize-none rounded-lg bg-paper-deep px-3 py-2 font-hand text-base leading-relaxed outline-none placeholder:text-ink-soft"
          />
          <div className="flex items-center justify-between">
            <span className="font-hand text-xs text-ink-soft">{200 - draft.length} left</span>
            <div className="flex gap-1">
              <button type="button" onClick={() => setDraft(null)} className="min-h-11 px-3 text-sm text-ink-soft">
                Cancel
              </button>
              <button type="submit" className="min-h-11 px-3 text-sm font-semibold text-accent">
                Save
              </button>
            </div>
          </div>
        </form>
      ) : (
        <button onClick={() => setDraft(mine?.text ?? "")} className="block min-h-11 w-full text-left">
          {mine ? (
            <Line name={me?.name} ink={me?.ink} text={mine.text} />
          ) : (
            <span className="font-hand text-ink-soft">tap to write what you’ll take from this…</span>
          )}
        </button>
      )}
      {theirs.map(({ m, r }) =>
        r ? (
          <Line key={m.id} name={m.name} ink={m.ink} text={r.text} />
        ) : (
          <p key={m.id} className="font-hand text-sm text-ink-soft">
            {m.name} hasn’t written yet
          </p>
        ),
      )}
    </div>
  );
}

function Line({ name, ink, text }: { name?: string; ink?: string; text: string }) {
  return (
    <p className="font-hand text-base leading-relaxed">
      <span className="text-sm" style={{ color: ink && inkText(ink) }}>
        {name}:{" "}
      </span>
      {text}
    </p>
  );
}
