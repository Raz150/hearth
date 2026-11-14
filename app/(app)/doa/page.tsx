"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Amiri } from "next/font/google";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Eye, Pause, Play, RotateCcw, Share, Sprout, X } from "lucide-react";
import { Button, iconButtonClass } from "@/components/kit/button";
import { cardClass } from "@/components/kit/card";
import { StepTracker } from "@/components/kit/progress";
import { Chip, Segmented } from "@/components/kit/selection";
import { META, PRESS, cx } from "@/components/kit/shared";
import { Confetti, Face, Page, PageHeader, Section } from "@/components/ui";
import { opening, phrases, words, type Doa, type DoaGroup, type DoaStatus } from "@/lib/doa";
import doaJson from "@/lib/doa.json";
import { useStore, type Member } from "@/lib/store";

const amiri = Amiri({ subsets: ["arabic"], weight: "400" });
const GROUPS = doaJson as DoaGroup[];
const ALL = GROUPS.flatMap((g) => g.items.map((d) => ({ d, g })));
const TOTAL = ALL.length;
const STEPS = ["Listen & repeat", "Fade", "From memory"];
type Lang = "en" | "ms";
type Player = ReturnType<typeof usePlayer>;

const ARABIC = `${amiri.className} text-right`;
const short = (t: string) => (t.length > 60 ? `${t.slice(0, 57).trimEnd()}…` : t);

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

/** Me first, then my spouse; and where each of us is with a doa. */
function useMarks() {
  const s = useStore();
  const people = [...s.members].sort((a, b) => Number(b.id === s.me) - Number(a.id === s.me));
  const status = (by: string, id: string) => s.doa.find((p) => p.by === by && p.doa === id)?.status;
  return { people, status, me: s.me };
}

export default function DoaPage() {
  const [lang, setLang] = usePref<Lang>("doa-lang", "en", ["en", "ms"]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const player = usePlayer();
  const group = GROUPS.find((g) => g.id === groupId);
  const open = ALL.find((x) => x.d.id === openId);

  function pick(id: string | null) {
    setGroupId(id);
    window.scrollTo({ top: 0 });
  }

  return (
    <Page>
      {group ? <GroupView g={group} lang={lang} onBack={() => pick(null)} onOpen={setOpenId} /> : <Library lang={lang} setLang={setLang} onGroup={pick} onOpen={setOpenId} />}
      <AnimatePresence>
        {open && <Reader key={open.d.id} d={open.d} g={open.g} lang={lang} setLang={setLang} player={player} onClose={() => setOpenId(null)} />}
      </AnimatePresence>
    </Page>
  );
}

// ── Library: how far each of us is, what to learn next, and the occasions ──

function Library({ lang, setLang, onGroup, onOpen }: { lang: Lang; setLang: (l: Lang) => void; onGroup: (id: string) => void; onOpen: (id: string) => void }) {
  const s = useStore();
  const { people, status, me } = useMarks();
  const learning = s.doa.find((p) => p.by === me && p.status === "learning"); // newest first
  const next = learning
    ? ALL.find((x) => x.d.id === learning.doa)
    : ALL.filter((x) => !status(me, x.d.id)).sort((a, b) => words(a.d.ar).length - words(b.d.ar).length)[0];

  return (
    <>
      <PageHeader
        kicker="Learn together"
        title="Doa"
        aside={
          <div className="w-28">
            <LangSwitch lang={lang} setLang={setLang} />
          </div>
        }
      />

      <div className={cx(cardClass("info"), "flex flex-col gap-3.5 p-3.5")}>
        {people.map((m) => {
          const mine = s.doa.filter((p) => p.by === m.id);
          const done = mine.filter((p) => p.status === "memorised").length;
          return (
            <div key={m.id} className="flex items-center gap-3">
              <Face member={m} />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex justify-between gap-2 text-[13px] font-bold">
                  <span>{m.id === me ? "You" : m.name}</span>
                  <span className="tabular-nums">
                    {done} of {TOTAL} memorised
                  </span>
                </div>
                <Bar done={done} learning={mine.length - done} />
              </div>
            </div>
          );
        })}
      </div>

      {next ? (
        <button onClick={() => onOpen(next.d.id)} className={cx(cardClass("interactive"), PRESS, "flex items-center gap-3 p-3.5 text-left")}>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className={META}>
              {learning ? "Carry on learning" : "A short one to start with"} · {next.g[lang]}
            </span>
            <span lang={lang} className="line-clamp-2 text-sm font-bold leading-snug">
              {opening(next.d[lang])}
            </span>
            <span lang="ar" dir="rtl" className={`${ARABIC} truncate text-lg leading-loose text-muted`}>
              {next.d.ar}
            </span>
          </span>
          <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-edge-control bg-primary text-primary-fg">
            <ArrowRight className="size-5" strokeWidth={2.4} />
          </span>
        </button>
      ) : (
        <p className="px-0.5 text-sm font-semibold text-muted">You&apos;ve memorised every doa here. Alhamdulillah. Keep saying them so they stay.</p>
      )}

      <Section title="Occasions" note={`${TOTAL} doa`}>
        <div className="grid grid-cols-2 gap-3">
          {GROUPS.map((g, i) => {
            const done = g.items.filter((d) => status(me, d.id) === "memorised").length;
            return (
              <button
                key={g.id}
                onClick={() => onGroup(g.id)}
                className={cx(cardClass("interactive"), PRESS, "flex min-h-[108px] flex-col justify-between gap-3 p-3 text-left", i === GROUPS.length - 1 && GROUPS.length % 2 === 1 && "col-span-2")}
              >
                <span className="flex flex-col gap-0.5">
                  <span className="font-display text-[15px] font-bold leading-tight">{g[lang]}</span>
                  <span className="text-xs font-semibold text-muted">{lang === "en" ? g.ms : g.en}</span>
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span aria-hidden className="flex flex-wrap gap-1">
                    {g.items.map((d) => (
                      <Dot key={d.id} status={status(me, d.id)} />
                    ))}
                  </span>
                  <span className="text-xs font-bold tabular-nums" aria-label={`${done} of ${g.items.length} memorised`}>
                    {done}/{g.items.length}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Section>
    </>
  );
}

/** Memorised (green) then learning (lilac), out of every doa. */
function Bar({ done, learning }: { done: number; learning: number }) {
  return (
    <div aria-hidden className="flex h-3 overflow-hidden rounded-full border-2 border-edge-card bg-surface">
      {[
        ["bg-done", done],
        ["bg-chores", learning],
      ].map(([fill, n]) =>
        n ? <div key={fill} className={cx("h-full border-r-2 border-edge-on-fill transition-[width] duration-500", fill as string)} style={{ width: `${((n as number) / TOTAL) * 100}%` }} /> : null,
      )}
    </div>
  );
}

function Dot({ status }: { status?: DoaStatus }) {
  return (
    <span
      className={cx(
        "size-2.5 rounded-full border-[1.5px]",
        status === "memorised" ? "border-edge-on-fill bg-done" : status === "learning" ? "border-edge-on-fill bg-chores" : "border-edge-card bg-surface",
      )}
    />
  );
}

function LangSwitch({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <Segmented
      label="Translation"
      value={lang}
      onChange={setLang}
      options={[
        { value: "en", label: "EN" },
        { value: "ms", label: "BM" },
      ]}
    />
  );
}

/** A face with a small badge: sprout = learning, tick = memorised, faded = not started. */
function Mark({ member, status }: { member: Member; status?: DoaStatus }) {
  return (
    <span className="relative inline-flex">
      <span className={cx("inline-flex", !status && "opacity-35")}>
        <Face member={member} />
      </span>
      {status && (
        <span className={cx("absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full border-[1.5px] border-edge-on-fill text-on-fill", status === "memorised" ? "bg-done" : "bg-chores")}>
          {status === "memorised" ? <Check className="size-2.5" strokeWidth={4} /> : <Sprout className="size-2.5" strokeWidth={3} />}
        </span>
      )}
      <span className="sr-only">
        {member.name}: {status ?? "not started"}
      </span>
    </span>
  );
}

// ── One occasion's doa ──

function GroupView({ g, lang, onBack, onOpen }: { g: DoaGroup; lang: Lang; onBack: () => void; onOpen: (id: string) => void }) {
  const { people, status } = useMarks();
  return (
    <>
      <div className="-mb-2 -ml-3">
        <button onClick={onBack} className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-bold">
          <ChevronLeft aria-hidden className="size-5" strokeWidth={2.4} />
          Occasions
        </button>
      </div>
      <PageHeader kicker={lang === "en" ? g.ms : g.en} title={g[lang]} />

      <section className={cx(cardClass("info"), "overflow-hidden")}>
        <ul className="divide-y-[1.5px] divide-dashed divide-divider">
          {g.items.map((d, i) => (
            <li key={d.id}>
              <button onClick={() => onOpen(d.id)} className="flex min-h-16 w-full items-center gap-3 px-3.5 py-3 text-left transition-colors active:bg-surface-sunken">
                <span className="w-4 shrink-0 font-display text-sm font-bold tabular-nums text-muted">{i + 1}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span lang={lang} className="line-clamp-2 text-sm font-bold leading-snug">
                    {opening(d[lang])}
                  </span>
                  <span lang="ar" dir="rtl" className={`${ARABIC} truncate text-lg leading-loose text-muted`}>
                    {d.ar}
                  </span>
                </span>
                <span className="flex shrink-0 -space-x-1.5">
                  {people.map((m) => (
                    <Mark key={m.id} member={m} status={status(m.id, d.id)} />
                  ))}
                </span>
                <ChevronRight aria-hidden className="size-[18px] shrink-0" strokeWidth={2.2} />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

// ── The doa, full screen: read it, then practise it ──

type Mode = "read" | 0 | 1 | 2 | "done";

function Reader({ d, g, lang, setLang, player, onClose }: { d: Doa; g: DoaGroup; lang: Lang; setLang: (l: Lang) => void; player: Player; onClose: () => void }) {
  const s = useStore();
  const { people, status, me } = useMarks();
  const mine = status(me, d.id);
  const [mode, setMode] = useState<Mode>("read");
  const box = useRef<HTMLDivElement>(null);
  const title = short(opening(d[lang]));

  // Focus moves in (VoiceOver starts here) and back to the row on close; Esc closes; the page behind stays put.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    box.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener?.focus({ preventScroll: true });
      player.stop();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- once per open

  function go(m: Mode) {
    setMode(m);
    box.current?.scrollTo({ top: 0 });
  }
  function practise() {
    if (!mine) s.markDoa(d.id, "learning", title);
    go(0);
  }
  function gotIt() {
    player.stop();
    s.markDoa(d.id, "memorised", title);
    go("done");
  }

  // Portal: the page wrapper is transformed, which would pin "fixed" to it instead of the screen.
  return createPortal(
    <motion.div
      ref={box}
      role="dialog"
      aria-modal
      aria-label={title}
      tabIndex={-1}
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 380, damping: 40 }}
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-page text-fg outline-none"
    >
      <div className="mx-auto flex min-h-full max-w-md flex-col pl-5 pr-[22px] pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <header className="sticky top-0 z-10 -ml-5 -mr-[22px] flex items-center gap-3 border-b-2 border-edge-card bg-page pl-5 pr-[22px] pt-[env(safe-area-inset-top)]">
          <div className="flex h-[60px] w-full items-center gap-3">
            {mode === "read" || mode === "done" ? (
              <button onClick={onClose} aria-label="Close" className={iconButtonClass}>
                <X strokeWidth={2.4} />
              </button>
            ) : (
              <button onClick={() => go("read")} aria-label="Back to the doa" className={iconButtonClass}>
                <ChevronLeft strokeWidth={2.4} />
              </button>
            )}
            <p className="min-w-0 flex-1 truncate text-center font-display text-[15px] font-bold">{typeof mode === "number" ? "Practise" : g[lang]}</p>
            <div className="w-28">
              <LangSwitch lang={lang} setLang={setLang} />
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={String(mode)}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.18 }}
            className="flex flex-1 flex-col gap-[18px] pt-[18px]"
          >
            {mode === "read" && <ReadView d={d} lang={lang} player={player} people={people} status={status} mine={mine} onPractise={practise} onLearning={() => s.markDoa(d.id, "learning", title)} />}
            {typeof mode === "number" && (
              <>
                <StepTracker steps={STEPS} done={mode} />
                {mode === 0 && <ListenRepeat d={d} player={player} onNext={() => go(1)} />}
                {mode === 1 && <Fade d={d} onBack={() => go(0)} onNext={() => go(2)} />}
                {mode === 2 && <FromMemory d={d} lang={lang} onAgain={() => go(1)} onGotIt={gotIt} />}
              </>
            )}
            {mode === "done" && <Done spouse={people.find((m) => m.id !== me)} onClose={onClose} onRead={() => go("read")} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>,
    document.body,
  );
}

function ReadView({
  d,
  lang,
  player,
  people,
  status,
  mine,
  onPractise,
  onLearning,
}: {
  d: Doa;
  lang: Lang;
  player: Player;
  people: Member[];
  status: (by: string, id: string) => DoaStatus | undefined;
  mine?: DoaStatus;
  onPractise: () => void;
  onLearning: () => void;
}) {
  const s = useStore();
  const playing = player.playing === d.id;
  const [copied, setCopied] = useState(false);

  async function share() {
    const text = `${d.ar}\n\n${d.tr}\n\n${d[lang]}\n\n— ${d.src}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true); // no share sheet, so show that something happened
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {} // user closed the share sheet
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {people.map((m) => {
          const st = status(m.id, d.id);
          return (
            <span key={m.id} className="inline-flex h-10 items-center gap-2 rounded-full border-2 border-edge-card bg-surface pl-1 pr-3.5 text-xs font-bold">
              <Mark member={m} status={st} />
              <span aria-hidden>
                {m.id === s.me ? "You" : m.name}: {st ?? "not started"}
              </span>
            </span>
          );
        })}
      </div>

      <div className={cx(cardClass("info"), "flex flex-col gap-3 p-4")}>
        <p lang="ar" dir="rtl" className={`${ARABIC} text-[1.75rem] leading-[2.2]`}>
          {d.ar}
        </p>
        <p className="border-t-[1.5px] border-dashed border-divider pt-3 text-sm font-medium italic leading-relaxed text-muted">{d.tr}</p>
      </div>

      <div className="flex flex-col gap-1.5 px-0.5">
        <h2 className="font-display text-[15px] font-bold">Meaning</h2>
        <p lang={lang} className="text-sm font-medium leading-relaxed">
          {d[lang]}
        </p>
        <p className={cx(META, "pt-1")}>{d.src}</p>
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => player.toggle(d)} aria-pressed={playing} className="flex-1">
          {playing ? <Pause aria-hidden className="size-5" strokeWidth={2.2} /> : <Play aria-hidden className="size-5" strokeWidth={2.2} />}
          {playing ? "Stop" : "Listen"}
        </Button>
        <button onClick={share} aria-label={copied ? "Copied" : "Share"} className={cx(iconButtonClass, "size-12", copied && "border-edge-on-fill bg-done text-on-fill")}>
          {copied ? <Check strokeWidth={2.6} /> : <Share strokeWidth={2.2} />}
        </button>
      </div>

      <div className="mt-auto flex flex-col items-center gap-1 pt-4">
        <Button size="block" onClick={onPractise}>
          {mine === "memorised" ? "Practise again" : mine === "learning" ? "Carry on practising" : "Start practising"}
          <ArrowRight aria-hidden className="size-5" strokeWidth={2.4} />
        </Button>
        {mine === "memorised" && (
          <button onClick={onLearning} className="min-h-11 px-2 text-sm font-bold text-muted underline underline-offset-2">
            Not sure any more? Mark as still learning
          </button>
        )}
      </div>
    </>
  );
}

/** Footer for each practise step: optional back, then the main action. */
function StepFooter({ back, children }: { back?: { label: string; onClick: () => void; disabled?: boolean }; children: ReactNode }) {
  return (
    <div className="mt-auto flex gap-3 pt-4">
      {back && (
        <button onClick={back.onClick} disabled={back.disabled} aria-label={back.label} className={cx(iconButtonClass, "size-12 disabled:opacity-40")}>
          <ChevronLeft strokeWidth={2.4} />
        </button>
      )}
      {children}
    </div>
  );
}

const Hint = ({ children }: { children: ReactNode }) => <p className="px-0.5 text-sm font-semibold leading-relaxed text-muted">{children}</p>;

/** Step 1: hear it whole, then say it part by part. */
function ListenRepeat({ d, player, onNext }: { d: Doa; player: Player; onNext: () => void }) {
  const parts = useMemo(() => phrases(d.ar), [d.ar]);
  const [i, setI] = useState(0);
  const playing = player.playing === d.id;
  const last = i === parts.length - 1;
  const current = useRef<HTMLLIElement>(null);
  useEffect(() => {
    current.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); // newer browsers return a Promise here; an effect must not
  }, [i]);

  return (
    <>
      <Hint>Listen once. Then say the highlighted part out loud, a few times, until it comes easily.</Hint>
      <div className="flex items-center gap-2.5">
        <Button variant="secondary" onClick={() => player.toggle(d)} aria-pressed={playing}>
          {playing ? <Pause aria-hidden className="size-5" strokeWidth={2.2} /> : <Play aria-hidden className="size-5" strokeWidth={2.2} />}
          {playing ? "Stop" : "Listen"}
        </Button>
        <Chip selected={player.slow} onClick={player.toggleSlow} fill="bg-chores">
          Slower
        </Chip>
      </div>

      <ol dir="rtl" lang="ar" className={cx(cardClass("info"), "flex flex-col gap-1 p-2")}>
        {parts.map((p, k) => (
          <li key={k} ref={k === i ? current : undefined}>
            <button
              onClick={() => setI(k)}
              aria-current={k === i ? "step" : undefined}
              className={cx("relative w-full rounded-[10px] px-3 transition-[font-size,color] duration-200", ARABIC, k === i ? "py-1.5 text-[1.75rem] leading-[2.1] text-fg" : "py-0.5 text-xl leading-loose text-subtle")}
            >
              {k === i && <motion.span layoutId="phrase" aria-hidden className="absolute inset-0 rounded-[10px] border-2 border-edge-card bg-chores-tint" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
              <span className="relative">{p}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className={cx(META, "-mt-2 text-center tabular-nums")}>
        Part {i + 1} of {parts.length}
      </p>

      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 px-0.5 text-sm font-bold">
          <ChevronRight aria-hidden className="size-4 transition-transform group-open:rotate-90" strokeWidth={2.4} />
          Rumi
        </summary>
        <p className="px-0.5 text-sm font-medium italic leading-relaxed text-muted">{d.tr}</p>
      </details>

      <StepFooter back={{ label: "Previous part", onClick: () => setI(i - 1), disabled: i === 0 }}>
        <Button className="flex-1" onClick={() => (last ? onNext() : setI(i + 1))}>
          {last ? "Next: fade" : "Next part"}
          <ArrowRight aria-hidden className="size-5" strokeWidth={2.4} />
        </Button>
      </StepFooter>
    </>
  );
}

/** Step 2: only the first letter of each word is left; tap a word to peek. */
function Fade({ d, onBack, onNext }: { d: Doa; onBack: () => void; onNext: () => void }) {
  const ws = useMemo(() => words(d.ar), [d.ar]);
  const [peek, setPeek] = useState<ReadonlySet<number>>(new Set());
  const toggle = (k: number) =>
    setPeek((p) => {
      const n = new Set(p);
      if (!n.delete(k)) n.add(k);
      return n;
    });

  return (
    <>
      <Hint>Say the whole doa with only the first letters to guide you. Stuck? Tap a word to peek.</Hint>
      <div dir="rtl" lang="ar" className={cx(cardClass("info"), ARABIC, "flex flex-wrap gap-x-1.5 gap-y-2 p-3 text-[1.75rem] leading-[1.9]")}>
        {ws.map((w, k) => {
          const shown = peek.has(k);
          return (
            <button
              key={k}
              onClick={() => toggle(k)}
              aria-label={shown ? w.word : `Word ${k + 1}, hidden. Tap to peek`}
              className={cx(
                "min-h-11 min-w-11 rounded-[8px] border-b-2 px-1.5 transition-colors",
                shown ? "border-edge-card bg-chores-tint" : "border-dashed border-divider",
              )}
            >
              {shown ? w.word : w.hint}
            </button>
          );
        })}
      </div>
      {peek.size > 0 && (
        <button onClick={() => setPeek(new Set())} className="-mt-2 inline-flex min-h-11 items-center gap-1.5 self-start px-0.5 text-sm font-bold">
          <RotateCcw aria-hidden className="size-4" strokeWidth={2.4} />
          Hide them again
        </button>
      )}
      <StepFooter back={{ label: "Back to listen and repeat", onClick: onBack }}>
        <Button className="flex-1" onClick={onNext}>
          Next: from memory
          <ArrowRight aria-hidden className="size-5" strokeWidth={2.4} />
        </Button>
      </StepFooter>
    </>
  );
}

/** Step 3: nothing but the meaning; recite, reveal, be honest. */
function FromMemory({ d, lang, onAgain, onGotIt }: { d: Doa; lang: Lang; onAgain: () => void; onGotIt: () => void }) {
  const [shown, setShown] = useState(false);
  return (
    <>
      <Hint>Say it from memory. The meaning is here to remind you what you&apos;re asking for.</Hint>
      <div className="flex flex-col gap-1.5 px-0.5">
        <h2 className="font-display text-[15px] font-bold">Meaning</h2>
        <p lang={lang} className="text-sm font-medium leading-relaxed">
          {d[lang]}
        </p>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {shown ? (
          <motion.div key="shown" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={cx(cardClass("info"), "p-4")}>
            <p lang="ar" dir="rtl" className={`${ARABIC} text-[1.75rem] leading-[2.2]`}>
              {d.ar}
            </p>
          </motion.div>
        ) : (
          <motion.button
            key="hidden"
            exit={{ opacity: 0 }}
            onClick={() => setShown(true)}
            className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-edge-card bg-surface-sunken"
          >
            <Eye aria-hidden className="size-6" strokeWidth={2.2} />
            <span className="font-display text-[15px] font-bold">Done? Tap to check</span>
          </motion.button>
        )}
      </AnimatePresence>

      {shown && (
        <StepFooter>
          <Button variant="secondary" onClick={onAgain}>
            <RotateCcw aria-hidden className="size-5" strokeWidth={2.4} />
            Again
          </Button>
          <Button className="flex-1" onClick={onGotIt}>
            <Check aria-hidden className="size-5" strokeWidth={2.6} />
            I&apos;ve got it
          </Button>
        </StepFooter>
      )}
    </>
  );
}

function Done({ spouse, onClose, onRead }: { spouse?: Member; onClose: () => void; onRead: () => void }) {
  return (
    <>
      <Confetti />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <motion.span
          initial={{ scale: 0.4, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 16 }}
          className="flex size-20 items-center justify-center rounded-full border-2 border-edge-on-fill bg-done text-on-fill shadow-hard"
        >
          <Check aria-hidden className="size-10" strokeWidth={3} />
        </motion.span>
        <h2 className="font-display text-[26px] font-bold tracking-[-0.5px]">Memorised. Alhamdulillah</h2>
        <p className="max-w-72 text-sm font-medium text-muted">
          {spouse ? `${spouse.name} can see it on their phone too. ` : ""}Say it again at its moment, so it stays with you.
        </p>
      </div>
      <div className="flex flex-col items-center gap-1">
        <Button size="block" onClick={onClose}>
          Done
        </Button>
        <button onClick={onRead} className="min-h-11 px-2 text-sm font-bold underline underline-offset-2">
          Back to the doa
        </button>
      </div>
    </>
  );
}

/** One audio element for the page: plays a doa's clips in order; tapping the same doa again stops it. "Slower" plays at 0.75×. */
function usePlayer() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  useEffect(() => () => audio.current?.pause(), []);

  function stop() {
    audio.current?.pause();
    setPlaying(null);
  }
  function toggle(d: Doa) {
    const a = (audio.current ??= new Audio());
    a.pause();
    if (playing === d.id) return setPlaying(null);
    let i = 0;
    const next = () => {
      if (i >= d.audio.length) return setPlaying(null);
      a.src = d.audio[i++];
      a.playbackRate = a.defaultPlaybackRate = slow ? 0.75 : 1; // a new src resets the rate to the default
      a.play().catch(() => setPlaying(null)); // offline or blocked
    };
    a.onended = next;
    a.onerror = () => setPlaying(null);
    setPlaying(d.id);
    next();
  }
  function toggleSlow() {
    const v = !slow;
    setSlow(v);
    if (audio.current) audio.current.playbackRate = audio.current.defaultPlaybackRate = v ? 0.75 : 1;
  }
  return { playing, toggle, stop, slow, toggleSlow };
}
