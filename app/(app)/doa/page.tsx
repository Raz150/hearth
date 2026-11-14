"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Amiri } from "next/font/google";
import { Check, ChevronDown, HandHeart, Pause, Play, Send, Share, Sprout, Trash2 } from "lucide-react";
import { Button, iconButtonClass } from "@/components/kit/button";
import { Card, cardClass } from "@/components/kit/card";
import { Chip, Segmented, Toggle } from "@/components/kit/selection";
import { HIT_44, cx } from "@/components/kit/shared";
import { Face, Page, PageHeader, Section, Who } from "@/components/ui";
import { daysBetween, klHour, klToday } from "@/lib/date";
import { doaForHour, type Doa, type DoaGroup } from "@/lib/doa";
import doaJson from "@/lib/doa.json";
import { useStore, type DoaRequest } from "@/lib/store";

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
      <PageHeader kicker="Doa & zikir" title="Doa" />

      <AskDoa />

      <div className="flex items-center justify-between gap-4">
        <div className="w-36">
          <Segmented
            label="Translation"
            value={lang}
            onChange={setLang}
            options={[
              { value: "en", label: "EN" },
              { value: "ms", label: "BM" },
            ]}
          />
        </div>
        <Toggle label="Rumi" checked={rumi === "on"} onChange={() => setRumi(rumi === "on" ? "off" : "on")} />
      </div>

      {/* Groups: scrolls sideways, edge to edge on the phone. */}
      <div className="-ml-5 -mr-[22px] flex gap-2 overflow-x-auto py-1 pl-5 pr-[22px] [scrollbar-width:none]">
        {GROUPS.map((x) => (
          <Chip key={x.id} selected={x.id === g.id} onClick={() => pick(x.id)}>
            {lang === "ms" ? x.ms : x.en}
          </Chip>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={g.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          <div className={cx(cardClass("info"), "overflow-hidden")}>
            <ul className="divide-y-[1.5px] divide-dashed divide-divider">
              {g.items.map((d) => (
                <li key={d.id}>
                  <DoaRow d={d} lang={lang} rumi={rumi === "on"} player={player} />
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </AnimatePresence>

      <p className="px-0.5 text-xs font-semibold leading-relaxed text-muted">
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
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-16 w-full items-center gap-3 px-3.5 py-3 text-left">
        <span className="min-w-0 flex-1">
          <span lang={lang} className="line-clamp-2 text-sm font-bold leading-snug">
            {opening(d[lang])}
          </span>
          {!open && (
            <span lang="ar" dir="rtl" className={`${amiri.className} mt-1 block truncate text-lg leading-loose text-muted`}>
              {d.ar}
            </span>
          )}
        </span>
        {d.repeat > 1 && (
          <span className={cx("inline-flex h-[26px] shrink-0 items-center rounded-full border-2 px-2.5 text-xs font-bold tabular-nums", done ? "border-edge-on-fill bg-done text-on-fill" : "border-edge-control bg-surface-sunken")}>
            {count > 0 && !done ? `${count}/${d.repeat}` : `${d.repeat}×`}
          </span>
        )}
        {playing && !open && <Pause size={14} aria-label="Playing" className="shrink-0" />}
        <ChevronDown size={18} strokeWidth={2.2} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
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
            <div className="px-3.5 pb-2">
              <p lang="ar" dir="rtl" className={`${amiri.className} text-[1.65rem] leading-[2.15]`}>
                {d.ar}
              </p>
              {rumi && <p className="pt-2 text-sm font-medium italic leading-relaxed text-muted">{d.tr}</p>}
              <p lang={lang} className="mt-3 text-sm font-medium leading-relaxed">
                {d[lang]}
              </p>

              <div className="mt-3 flex items-center gap-2 border-t-[1.5px] border-dashed border-divider pt-2">
                <p className="flex-1 py-1 text-xs font-semibold leading-snug text-muted">{d.src}</p>
                <button onClick={() => player.toggle(d)} aria-label={playing ? "Stop" : "Listen"} className={cx(iconButtonClass, playing && "bg-chores text-on-fill")}>
                  {playing ? <Pause strokeWidth={2.2} /> : <Play strokeWidth={2.2} />}
                </button>
                <button onClick={share} aria-label="Share" className={iconButtonClass}>
                  <Share strokeWidth={2.2} />
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
  const done = n >= repeat;
  const R = 19;
  return (
    <button
      onClick={() => setN(done ? 0 : n + 1)}
      aria-label={done ? `Done ${repeat} times. Tap to start again` : `Count: ${n} of ${repeat}`}
      className="relative grid size-12 shrink-0 place-items-center transition-transform active:scale-90"
    >
      <svg viewBox="0 0 44 44" className="absolute inset-0 size-12 -rotate-90" aria-hidden>
        <circle cx="22" cy="22" r={R} fill="var(--surface)" stroke="var(--edge-control)" strokeWidth="2" />
        <motion.circle
          cx="22" cy="22" r={R - 3} fill="none" stroke="var(--chores)" strokeWidth="4" strokeLinecap="round" strokeDasharray={2 * Math.PI * (R - 3)}
          initial={false}
          animate={{ strokeDashoffset: 2 * Math.PI * (R - 3) * (1 - Math.min(n, repeat) / repeat) }}
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
          className="relative text-xs font-bold tabular-nums"
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
      <form onSubmit={ask} className="flex h-[52px] items-center gap-2.5 rounded-card border-2 border-edge-control bg-surface pl-3.5 pr-1.5 text-fg shadow-hard transition-shadow focus-within:shadow-focus">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
          aria-label="What should we pray for?"
          placeholder="Pray for me… exam on Thursday"
          className="h-full min-w-0 flex-1 bg-transparent text-base font-medium placeholder:text-subtle focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="Ask for doa"
          className={cx("flex size-9 shrink-0 items-center justify-center rounded-icon border-2 border-edge-control bg-primary text-primary-fg transition-opacity disabled:opacity-40", HIT_44)}
        >
          <Send className="size-[18px]" strokeWidth={2.2} />
        </button>
      </form>

      <ul className="flex flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {open.map((d) => (
            <motion.li key={d.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <Request d={d} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {open.length === 0 && <p className="px-0.5 text-sm font-semibold text-muted">Nothing asked yet.</p>}

      {answered.length > 0 && (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 px-0.5 text-sm font-bold">
            <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" strokeWidth={2.4} />
            Alhamdulillah, answered ({answered.length})
          </summary>
          <ul className="flex flex-col gap-2.5 pt-1">
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

  return (
    <Card className="flex items-start gap-3 py-3 pl-3 pr-1.5">
      <Face member={asker} />
      <div className="min-w-0 flex-1">
        <p className={cx("font-note text-[17px] leading-snug", d.answeredAt && "text-subtle")}>{d.text}</p>
        <p className="mt-1 text-xs font-semibold text-muted">
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
        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={() => s.answerDoa(d.id)}
            aria-pressed={!!d.answeredAt}
            aria-label={d.answeredAt ? "Mark as not answered yet" : "Answered, Alhamdulillah"}
            className={cx(iconButtonClass, d.answeredAt && "border-edge-on-fill bg-done text-on-fill")}
          >
            <Sprout strokeWidth={2.2} />
          </button>
          <button onClick={() => s.removeDoa(d.id)} aria-label="Delete" className={iconButtonClass}>
            <Trash2 strokeWidth={2.2} />
          </button>
        </div>
      ) : (
        !d.answeredAt && (
          <Button variant={prayedToday ? "chores" : "secondary"} size="sm" aria-pressed={prayedToday} onClick={() => s.prayFor(d.id)} className="shrink-0">
            <HandHeart aria-hidden className="size-4" strokeWidth={2.2} />
            {prayedToday ? "Prayed" : "Aamiin"}
          </Button>
        )
      )}
    </Card>
  );
}
