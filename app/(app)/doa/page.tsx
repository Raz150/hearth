"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Amiri } from "next/font/google";
import { Check, ChevronDown, Eye, EyeOff, HandHeart, Pause, Play, Send, Share, Sprout, Trash2 } from "lucide-react";
import { Card, Page, PageHeader, Section, Who, chipClass, chipStyle } from "@/components/ui";
import { daysBetween, klHour, klToday } from "@/lib/date";
import { doaForHour, type Doa, type DoaGroup } from "@/lib/doa";
import doaJson from "@/lib/doa.json";
import { inkText, useStore, type DoaRequest } from "@/lib/store";

const amiri = Amiri({ subsets: ["arabic"], weight: "400" });
const GROUPS = doaJson as DoaGroup[];
type Lang = "en" | "ms";

const ago = (ymd: string, today: string) => {
  const n = daysBetween(ymd, today);
  return n === 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`;
};

/** A per-phone setting kept in localStorage; read after mount so the server render matches. */
function usePref<T extends string>(key: string, initial: T, allowed: readonly T[]) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key) as T | null;
      if (saved && allowed.includes(saved)) setValue(saved); // eslint-disable-line react-hooks/set-state-in-effect -- restoring a saved preference
    } catch {}
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps -- `allowed` is a constant
  const set = (v: T) => {
    setValue(v);
    try {
      localStorage.setItem(key, v);
    } catch {}
  };
  return [value, set] as const;
}

export default function DoaPage() {
  const [lang, setLang] = usePref<Lang>("doa-lang", "en", ["en", "ms"]);
  const [rumi, setRumi] = usePref("doa-rumi", "on", ["on", "off"]);
  const [group, setGroup] = useState(() => doaForHour(klHour())?.group ?? GROUPS[0].id);
  const g = GROUPS.find((x) => x.id === group) ?? GROUPS[0];
  const player = usePlayer();

  // /doa#tidur (from the Today card) opens that group.
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (GROUPS.some((x) => x.id === id)) setGroup(id); // eslint-disable-line react-hooks/set-state-in-effect -- reading the URL once
  }, []);

  function pick(id: string) {
    setGroup(id);
    history.replaceState(null, "", `#${id}`);
  }

  return (
    <Page>
      <PageHeader kicker="doa & zikir" title="Doa" />

      <AskDoa />

      <div className="mb-4 flex items-center justify-between gap-2">
        <div role="radiogroup" aria-label="Translation" className="flex rounded-full bg-paper-deep p-0.5 text-sm">
          {(["en", "ms"] as const).map((l) => (
            <button
              key={l}
              role="radio"
              aria-checked={lang === l}
              onClick={() => setLang(l)}
              className={`min-h-11 min-w-12 rounded-full px-3 transition-colors ${lang === l ? "bg-card text-ink shadow-sm" : "text-ink-soft"}`}
            >
              {l === "en" ? "EN" : "BM"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setRumi(rumi === "on" ? "off" : "on")}
          aria-pressed={rumi === "on"}
          className={`flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm transition-colors ${rumi === "on" ? "border-transparent bg-accent-soft text-ink" : "border-line text-ink-soft"}`}
        >
          {rumi === "on" ? <Eye size={16} /> : <EyeOff size={16} />}
          Rumi
        </button>
      </div>

      {/* Groups: scrolls sideways, edge to edge on the phone. */}
      <div className="-mx-5 mb-6 flex gap-2 overflow-x-auto px-5 py-2 [scrollbar-width:none]">
        {GROUPS.map((x) => (
          <button key={x.id} onClick={() => pick(x.id)} aria-pressed={x.id === g.id} className={`${chipClass(x.id === g.id)} shrink-0`} style={chipStyle(x.id === g.id)}>
            {lang === "ms" ? x.ms : x.en}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={g.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          <Card>
            <ul className="divide-y divide-dashed divide-line">
              {g.items.map((d) => (
                <li key={d.id}>
                  <DoaRow d={d} lang={lang} rumi={rumi === "on"} player={player} />
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>
      </AnimatePresence>

      <p className="mt-8 px-1 font-hand text-xs leading-relaxed text-ink-soft">
        Text, Rumi, English and audio: Hisnul Muslim (hisnmuslim.com) and the Quran (alquran.cloud). Bahasa Melayu and hadith sources: Hisnul Muslim, JPN Johor (e-JAUHAR).
      </p>
    </Page>
  );
}

/** One audio element for the page: plays a doa's clips in order; tapping the same doa again stops it. */
function usePlayer() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => () => audio.current?.pause(), []);

  function toggle(d: Doa) {
    const a = (audio.current ??= new Audio());
    a.pause();
    if (playing === d.id) return setPlaying(null);
    let i = 0;
    const next = () => {
      if (i >= d.audio.length) return setPlaying(null);
      a.src = d.audio[i++];
      a.play().catch(() => setPlaying(null)); // offline or blocked
    };
    a.onended = next;
    a.onerror = () => setPlaying(null);
    setPlaying(d.id);
    next();
  }
  return { playing, toggle };
}

/** Row title: the translation's opening words, without an ayah number "( 285 )" or a "(" that wraps the whole text. */
const opening = (t: string) => {
  const s = t.trim().replace(/^\(\s*\d+\s*\)\s*/, "");
  const close = s.indexOf(")");
  return s.startsWith("(") && /^\)[.\s]*$/.test(s.slice(close)) ? s.slice(1, close) : s;
};

/** Collapsed: opening words + first line of the Arabic. Tap to read the whole doa. */
function DoaRow({ d, lang, rumi, player }: { d: Doa; lang: Lang; rumi: boolean; player: ReturnType<typeof usePlayer> }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0); // lives here so closing the row keeps the count
  const playing = player.playing === d.id;
  const done = count >= d.repeat;

  async function share() {
    const text = `${d.ar}\n\n${d.tr}\n\n${d[lang]}\n\n— ${d.src}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch {} // user closed the share sheet
  }

  return (
    <div>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left">
        <span className="min-w-0 flex-1">
          <span lang={lang} className="line-clamp-2 font-serif leading-snug">
            {opening(d[lang])}
          </span>
          {!open && (
            <span lang="ar" dir="rtl" className={`${amiri.className} mt-1 block truncate text-lg leading-loose text-ink-soft`}>
              {d.ar}
            </span>
          )}
        </span>
        {d.repeat > 1 && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 font-hand text-xs tabular-nums ${done ? "bg-accent-soft text-ink" : "bg-paper-deep text-ink-soft"}`}>
            {count > 0 && !done ? `${count}/${d.repeat}` : `${d.repeat}×`}
          </span>
        )}
        {playing && !open && <Pause size={14} aria-label="Playing" className="shrink-0 text-accent" />}
        <ChevronDown size={18} className={`shrink-0 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-1">
              <p lang="ar" dir="rtl" className={`${amiri.className} text-[1.65rem] leading-[2.15]`}>
                {d.ar}
              </p>
              {rumi && <p className="pt-2 font-serif italic leading-relaxed text-accent">{d.tr}</p>}
              <p lang={lang} className="mt-3 leading-relaxed">
                {d[lang]}
              </p>

              <div className="mt-3 flex items-center gap-1 border-t border-dashed border-line pt-1">
                <p className="flex-1 py-2 font-hand text-xs leading-snug text-ink-soft">{d.src}</p>
                <button onClick={() => player.toggle(d)} aria-label={playing ? "Stop" : "Listen"} className="grid size-11 shrink-0 place-items-center text-ink-soft">
                  {playing ? <Pause size={18} className="text-accent" /> : <Play size={18} />}
                </button>
                <button onClick={share} aria-label="Share" className="grid size-11 shrink-0 place-items-center text-ink-soft">
                  <Share size={18} />
                </button>
                {d.repeat > 1 && <Counter n={count} setN={setCount} repeat={d.repeat} />}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Tap to count recitations; the ring fills, then a tick. Tap once more to start again. */
function Counter({ n, setN, repeat }: { n: number; setN: (n: number) => void; repeat: number }) {
  const s = useStore();
  const done = n >= repeat;
  const ink = s.member(s.me)?.ink ?? "var(--accent)";
  const R = 19;
  const C = 2 * Math.PI * R;
  return (
    <button
      onClick={() => setN(done ? 0 : n + 1)}
      aria-label={done ? `Done ${repeat} times. Tap to start again` : `Count: ${n} of ${repeat}`}
      className="relative grid size-12 shrink-0 place-items-center transition-transform active:scale-90"
    >
      <svg viewBox="0 0 44 44" className="absolute inset-0 size-12 -rotate-90" aria-hidden>
        <circle cx="22" cy="22" r={R} fill="none" stroke="var(--line)" strokeWidth="3" />
        <motion.circle
          cx="22" cy="22" r={R} fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" strokeDasharray={C}
          initial={false}
          animate={{ strokeDashoffset: C * (1 - Math.min(n, repeat) / repeat) }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      </svg>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={done ? "done" : n}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="font-hand text-xs tabular-nums"
          style={done ? { color: inkText(ink) } : undefined}
        >
          {done ? <Check size={18} strokeWidth={3} /> : `${n}/${repeat}`}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

/** "Doakan saya": ask the other for doa; they tap when they've prayed. */
function AskDoa() {
  const s = useStore();
  const [text, setText] = useState("");
  const open = s.doa.filter((d) => !d.answeredAt);
  const answered = s.doa.filter((d) => d.answeredAt);

  function ask(e: React.FormEvent) {
    e.preventDefault();
    s.askDoa(text);
    setText("");
  }

  return (
    <Section title="Doakan saya" note={open.length ? `${open.length} open` : undefined}>
      <form onSubmit={ask} className="mb-3 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
          aria-label="What should we pray for?"
          placeholder="pray for me… exam on Thursday"
          className="min-h-11 flex-1 rounded-full bg-paper-deep px-4 font-hand text-base outline-none placeholder:text-ink-soft"
        />
        <button type="submit" disabled={!text.trim()} aria-label="Ask for doa" className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-paper transition-opacity disabled:opacity-40">
          <Send size={18} />
        </button>
      </form>

      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {open.map((d) => (
            <motion.li key={d.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <Request d={d} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {open.length === 0 && <p className="px-1 py-2 font-hand text-ink-soft">nothing asked yet ✿</p>}

      {answered.length > 0 && (
        <details className="mt-3 px-1">
          <summary className="flex min-h-11 cursor-pointer items-center font-hand text-sm text-accent">Alhamdulillah, answered ({answered.length})</summary>
          <ul className="space-y-2 pb-2">
            {answered.map((d) => (
              <li key={d.id}>
                <Request d={d} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </Section>
  );
}

function Request({ d }: { d: DoaRequest }) {
  const s = useStore();
  const today = klToday();
  const asker = s.member(d.by);
  const mine = d.by === s.me;
  const prayedToday = d.prayers.some((p) => p.by === s.me && p.day === today);
  const last = d.prayers.reduce<string | undefined>((m, p) => (!m || p.day > m ? p.day : m), undefined);
  const spouse = s.members.find((m) => m.id !== s.me);
  const myInk = s.member(s.me)?.ink;

  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-card py-2 pr-1 pl-3" style={{ borderLeft: `4px solid ${asker?.ink}` }}>
      <div className="min-w-0 flex-1">
        <p className={`font-hand text-lg leading-snug ${d.answeredAt ? "text-ink-soft" : ""}`}>{d.text}</p>
        <p className="text-xs text-ink-soft">
          <Who member={asker} /> · {ago(klToday(new Date(d.at)), today)}
          {d.prayers.length > 0 && (
            <>
              {" "}· prayed for {d.prayers.length}× · last {ago(last!, today)}
            </>
          )}
          {mine && !d.prayers.length && !d.answeredAt && spouse && <> · waiting for {spouse.name}</>}
        </p>
      </div>

      {mine ? (
        <>
          <button
            onClick={() => s.answerDoa(d.id)}
            aria-pressed={!!d.answeredAt}
            aria-label={d.answeredAt ? "Mark as not answered yet" : "Answered, Alhamdulillah"}
            className="grid size-11 shrink-0 place-items-center rounded-full"
            style={{ color: d.answeredAt ? inkText(myInk ?? "#6f8c5c") : "var(--ink-soft)" }}
          >
            <Sprout size={20} />
          </button>
          <button onClick={() => s.removeDoa(d.id)} aria-label="Remove" className="grid size-11 shrink-0 place-items-center text-ink-soft">
            <Trash2 size={18} />
          </button>
        </>
      ) : (
        !d.answeredAt && (
          <motion.button
            onClick={() => s.prayFor(d.id)}
            aria-pressed={prayedToday}
            whileTap={{ scale: 0.92 }}
            className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm transition-colors ${prayedToday ? "text-paper" : "border border-line text-ink-soft"}`}
            style={prayedToday ? { backgroundColor: inkText(myInk ?? "#6f8c5c") } : undefined}
          >
            <HandHeart size={16} />
            {prayedToday ? "Prayed" : "Aamiin"}
          </motion.button>
        )
      )}
    </div>
  );
}
