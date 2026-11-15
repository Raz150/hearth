"use client";

import { useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal, flushSync } from "react-dom";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { Amiri } from "next/font/google";
import { BookOpen, ChevronLeft, ChevronRight, List, Type, X } from "lucide-react";
import { Button, iconButtonClass, linkClass } from "@/components/kit/button";
import { Segmented, Toggle } from "@/components/kit/selection";
import { META, PRESS, cx } from "@/components/kit/shared";
import { Sheet } from "@/components/sheet";
import { Section } from "@/components/ui";
import { SHELF, type Block, type Book, type ShelfBook } from "@/lib/books";

const amiri = Amiri({ subsets: ["arabic"], weight: ["400", "700"] });
export const ARABIC = `${amiri.className} text-right`;
export type Lang = "en" | "ms";

export function LangSwitch({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
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

const arNum = (n: number) => n.toLocaleString("ar-EG");

// ── Per-phone reading state: where each of us is in each book, and how we like the page ──

function load(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}
function readMark(id: string) {
  const n = Number(load(`book-${id}`));
  return Number.isInteger(n) && n > 0 ? n : 0;
}

type Size = "s" | "m" | "l";
const SIZES: Record<Size, string> = { s: "text-[1.25rem] leading-[2]", m: "text-[1.45rem] leading-[2.1]", l: "text-[1.8rem] leading-[2.15]" };
/** null lang: translation off. */
type Prefs = { size: Size; rumi: boolean; lang: Lang | null; hinted: boolean };

// ── The shelf on the Doa tab ──

export function Shelf({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const [open, setOpen] = useState<ShelfBook | null>(null);
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [prefs, setPrefs] = useState({ size: "m" as Size, rumi: false, meaning: true, hinted: false });
  useEffect(() => {
    const size = load("book-size");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring saved preferences
    setPrefs({ size: size === "s" || size === "l" ? size : "m", rumi: load("book-rumi") === "1", meaning: load("book-meaning") !== "0", hinted: load("book-hinted") === "1" });
  }, []);
  useEffect(() => {
    if (!open) setMarks(Object.fromEntries(SHELF.map((b) => [b.id, readMark(b.id)]))); // eslint-disable-line react-hooks/set-state-in-effect -- bookmarks live in localStorage
  }, [open]);

  function change(p: Partial<Prefs>) {
    if (p.size) store("book-size", p.size);
    if (p.rumi !== undefined) store("book-rumi", p.rumi ? "1" : "0");
    if (p.hinted) store("book-hinted", "1");
    if (p.lang !== undefined) {
      store("book-meaning", p.lang ? "1" : "0");
      if (p.lang) setLang(p.lang);
    }
    setPrefs((x) => ({ size: p.size ?? x.size, rumi: p.rumi ?? x.rumi, meaning: p.lang === undefined ? x.meaning : !!p.lang, hinted: p.hinted ?? x.hinted }));
  }

  return (
    <Section title="Bookshelf" note="Read any time">
      <div className="grid grid-cols-2 gap-3">
        {SHELF.map((b) => (
          <Cover key={b.id} b={b} at={marks[b.id] ?? 0} onOpen={() => setOpen(b)} />
        ))}
      </div>
      <AnimatePresence>
        {open && (
          <Reader key={open.id} shelf={open} prefs={{ size: prefs.size, rumi: prefs.rumi, lang: prefs.meaning ? lang : null, hinted: prefs.hinted }} change={change} onClose={() => setOpen(null)} />
        )}
      </AnimatePresence>
    </Section>
  );
}

/** A book standing on the shelf: title in a ruled frame, spine on the right (these open from the right),
 *  and a ribbon bookmark hanging from the top once you've started it. */
function Cover({ b, at, onOpen }: { b: ShelfBook; at: number; onOpen: () => void }) {
  const started = at > 0;
  return (
    <button
      onClick={onOpen}
      aria-label={`${b.en}, ${b.by}. ${started ? `Carry on from page ${at + 1} of ${b.pages}` : `${b.pages} pages`}`}
      className={cx(PRESS, "relative flex min-h-[188px] flex-col gap-2.5 rounded-l-[6px] rounded-r-card border-2 border-edge-card bg-surface-note pb-3 pl-3 pr-[22px] pt-3.5 text-left shadow-hard")}
    >
      <span aria-hidden className="absolute inset-y-0 right-0 w-3 rounded-r-[12px] border-l-2 border-edge-card bg-chores" />
      {started && (
        <svg aria-hidden viewBox="0 0 14 34" className="absolute -top-0.5 left-3 h-[34px] w-3.5 fill-chores stroke-edge-card" strokeWidth={2} strokeLinejoin="round">
          <path d="M1 0H13V32L7 26L1 32Z" />
        </svg>
      )}
      <span aria-hidden className="mx-1 mt-2 flex min-h-[70px] items-center justify-center rounded-[4px] border-[1.5px] border-edge-card px-1.5 outline-[1.5px] outline-offset-[3px] outline-edge-card">
        <span lang="ar" dir="rtl" className={`${amiri.className} text-center text-[1.55rem] font-bold leading-[1.5]`}>
          {b.ar}
        </span>
      </span>
      <span aria-hidden className="mt-auto flex flex-col gap-0.5">
        <span className="font-display text-[15px] font-bold leading-tight">{b.en}</span>
        <span className="text-xs font-semibold leading-snug text-muted">{b.by}</span>
      </span>
      <span aria-hidden className="flex flex-col gap-1">
        {started && (
          <span className="h-2 overflow-hidden rounded-full border-[1.5px] border-edge-card bg-surface">
            <span className="block h-full border-r-[1.5px] border-edge-card bg-chores" style={{ width: `${((at + 1) / b.pages) * 100}%` }} />
          </span>
        )}
        <span className="text-xs font-bold tabular-nums">{started ? `Page ${at + 1} of ${b.pages}` : `${b.pages} pages`}</span>
      </span>
    </button>
  );
}

// ── One book, full screen ──

type Turn = { next: () => void; prev: () => void };

function Reader({ shelf, prefs, change, onClose }: { shelf: ShelfBook; prefs: Prefs; change: (p: Partial<Prefs>) => void; onClose: () => void }) {
  const [book, setBook] = useState<Book | null>(null);
  const [failed, setFailed] = useState(false);
  const [i, setI] = useState(() => readMark(shelf.id));
  const [sheet, setSheet] = useState<"contents" | "options" | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const turner = useRef<Turn>(null);
  const sheetOpen = useRef(false);
  const opened = useRef(i);
  useEffect(() => {
    sheetOpen.current = !!sheet;
  }, [sheet]);

  useEffect(() => {
    shelf.load().then(setBook, () => setFailed(true)); // offline before it was ever opened
  }, [shelf]);
  useEffect(() => {
    store(`book-${shelf.id}`, String(i));
    if (i !== opened.current && !prefs.hinted) change({ hinted: true }); // they've turned a page: the hint has done its job
  }, [shelf.id, i]); // eslint-disable-line react-hooks/exhaustive-deps -- only when the page changes

  // Focus moves in and back on close; Esc closes (unless a sheet has it); the page behind stays put.
  // Arrow keys turn pages the way an Arabic book turns: left is the next page.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    box.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (sheetOpen.current) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") turner.current?.next();
      if (e.key === "ArrowRight") turner.current?.prev();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener?.focus({ preventScroll: true });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- once per open

  const last = book ? book.pages.length - 1 : 0;
  const page = Math.min(i, last);
  // What this book has besides the Arabic decides which options it offers.
  const has = useMemo(() => {
    const all = book?.pages.flat() ?? [];
    return { tr: all.some((b) => "tr" in b && b.tr), meaning: all.some((b) => "ar" in b && (b.en || b.ms)) };
  }, [book]);
  const chapter = (p: number) => book?.toc.findLast((t) => t.p <= p);
  const view = { size: prefs.size, rumi: prefs.rumi && has.tr, lang: prefs.lang };

  // Portal: the page wrapper is transformed, which would pin "fixed" to it instead of the screen.
  return createPortal(
    <motion.div
      ref={box}
      role="dialog"
      aria-modal
      aria-label={shelf.en}
      tabIndex={-1}
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 380, damping: 40 }}
      className="fixed inset-0 z-35 flex flex-col bg-page text-fg outline-none"
    >
      <header className="border-b-2 border-edge-card bg-page pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-[60px] max-w-md items-center gap-2 pl-5 pr-[22px]">
          <button onClick={onClose} aria-label="Close" className={iconButtonClass}>
            <X strokeWidth={2.4} />
          </button>
          <div className="flex min-w-0 flex-1 flex-col items-center leading-tight">
            <p className="max-w-full truncate font-display text-[15px] font-bold">{shelf.en}</p>
            <p className="text-xs font-semibold tabular-nums text-muted">{book ? `Page ${page + 1} of ${last + 1}` : shelf.by}</p>
          </div>
          <button onClick={() => setSheet("options")} disabled={!book} aria-label="Reading options" className={cx(iconButtonClass, "disabled:opacity-40")}>
            <Type strokeWidth={2.4} />
          </button>
          <button onClick={() => setSheet("contents")} disabled={!book} aria-label="Contents" className={cx(iconButtonClass, "disabled:opacity-40")}>
            <List strokeWidth={2.4} />
          </button>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col gap-3.5 pb-[calc(env(safe-area-inset-bottom)+14px)] pl-5 pr-[22px] pt-4">
        {book ? (
          <Turner book={book} i={page} setI={setI} view={view} head={(p) => chapter(p)?.t} api={turner} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-edge-card bg-surface-sunken p-6 text-center">
            <BookOpen aria-hidden className="size-7" strokeWidth={2.2} />
            <p className="text-sm font-semibold text-muted">{failed ? "Couldn't open this book. Check your connection and try again." : "Opening the book…"}</p>
          </div>
        )}

        {/* Next is on the left: an Arabic book's pages turn from left to right. */}
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => turner.current?.next()} disabled={!book || page >= last} className="pl-2.5">
            <ChevronLeft aria-hidden className="size-5" strokeWidth={2.4} />
            Next
          </Button>
          <div className="flex min-w-0 flex-1 justify-center">
            {book && !prefs.hinted ? (
              <p className="text-center text-xs font-semibold leading-snug text-muted">Swipe right to turn</p>
            ) : (
              book && (
                <div
                  role="progressbar"
                  aria-label="How far through the book"
                  aria-valuemin={1}
                  aria-valuemax={last + 1}
                  aria-valuenow={page + 1}
                  className="h-2 w-full max-w-28 overflow-hidden rounded-full border-[1.5px] border-edge-card bg-surface"
                >
                  {/* Fills from the right, the way this book is read. */}
                  <div className="ml-auto h-full border-l-[1.5px] border-edge-card bg-chores transition-[width] duration-300" style={{ width: `${((page + 1) / (last + 1)) * 100}%` }} />
                </div>
              )
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={() => turner.current?.prev()} disabled={!book || page === 0} className="pr-2.5">
            Previous
            <ChevronRight aria-hidden className="size-5" strokeWidth={2.4} />
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {sheet === "options" && book && (
          <Sheet label="Reading options" onClose={() => setSheet(null)}>
            <h2 className="font-display text-[15px] font-bold">Reading options</h2>
            <div className="flex flex-col gap-4 pt-3">
              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-semibold">Arabic size</p>
                <Segmented
                  label="Arabic size"
                  value={prefs.size}
                  onChange={(size) => change({ size })}
                  options={[
                    { value: "s", label: "Small" },
                    { value: "m", label: "Medium" },
                    { value: "l", label: "Large" },
                  ]}
                />
              </div>
              {has.meaning && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-sm font-semibold">Translation</p>
                  <Segmented
                    label="Translation"
                    value={prefs.lang ?? "off"}
                    onChange={(v) => change({ lang: v === "off" ? null : v })}
                    options={[
                      { value: "off", label: "Off" },
                      { value: "en", label: "English" },
                      { value: "ms", label: "Melayu" },
                    ]}
                  />
                </div>
              )}
              {has.tr && <Toggle label="Rumi (how to say the Arabic)" checked={prefs.rumi} onChange={(e) => change({ rumi: e.target.checked })} />}
              {!has.meaning && !has.tr && <p className="text-sm font-medium leading-relaxed text-muted">This book is in Arabic only, so there&apos;s no translation or Rumi to show.</p>}
            </div>
          </Sheet>
        )}
        {sheet === "contents" && book && (
          <Sheet label="Contents" onClose={() => setSheet(null)}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-[15px] font-bold">Contents</h2>
              {page > 0 && (
                <button
                  onClick={() => {
                    setI(() => 0);
                    setSheet(null);
                  }}
                  className={linkClass}
                >
                  Start from the beginning
                </button>
              )}
            </div>
            <details className="group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-bold">
                <ChevronRight aria-hidden className="size-4 transition-transform group-open:rotate-90" strokeWidth={2.4} />
                Where this text comes from
              </summary>
              <p className="pb-2 text-xs font-medium leading-relaxed text-muted">{shelf.about}</p>
            </details>
            <ul className="divide-y-[1.5px] divide-dashed divide-divider border-t-[1.5px] border-dashed border-divider">
              {book.toc.map((t, k) => {
                const here = chapter(page) === t;
                return (
                  <li key={k} ref={here ? (el) => el?.scrollIntoView({ block: "center" }) : undefined}>
                    <button
                      onClick={() => {
                        setI(() => t.p);
                        setSheet(null);
                      }}
                      aria-current={here ? "page" : undefined}
                      className={cx("flex min-h-12 w-full items-center gap-3 rounded-[8px] px-2 py-2 text-left transition-colors active:bg-surface-sunken", here && "bg-chores-tint")}
                    >
                      <span className="w-9 shrink-0 text-xs font-bold tabular-nums text-muted">{t.p + 1}</span>
                      <span className="flex min-w-0 flex-1 flex-col items-end gap-0.5">
                        <span lang="ar" dir="rtl" className={`${ARABIC} text-lg leading-loose`}>
                          {t.t}
                        </span>
                        {t.sub && <span className="text-xs font-semibold text-muted">{t.sub}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Sheet>
        )}
      </AnimatePresence>
    </motion.div>,
    document.body,
  );
}

// ── Turning pages ──
// Arabic books open from the right, so the spine is the stage's right edge and pages turn from left to right.
// A turning page folds along a vertical crease. With the crease at f (0 = left edge, 1 = spine, as a fraction of the width):
//   [0, f]   the page underneath shows through
//   [f, 1]   the part of the page still lying flat
//   [f, 2f]  the folded flap (the page's back), its free edge at 2f — that edge follows the finger.
// Everything moves with translate/scale only, so the phone can composite it without repainting the text.

type Dir = "next" | "prev";
type View = { size: Size; rumi: boolean; lang: Lang | null };

function Turner({
  book,
  i,
  setI,
  view,
  head,
  api,
}: {
  book: Book;
  i: number;
  setI: (fn: (i: number) => number) => void;
  view: View;
  head: (p: number) => string | undefined;
  api: RefObject<Turn | null>;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const cur = useMotionValue(0); // this page: 0 flat → 1 turned over
  const prev = useMotionValue(1); // the page before: 1 turned over → 0 flat
  const dir = useRef<Dir | null>(null);
  const busy = useRef(false);
  const reduce = useReducedMotion();
  const last = book.pages.length - 1;

  /** v: the finger's speed in crease units per second, so a flick carries on at the speed it was thrown. */
  function settle(d: Dir, turn: boolean, v?: number) {
    const crease = d === "next" ? cur : prev;
    const to = (d === "next") === turn ? 1 : 0;
    busy.current = true;
    const how = reduce
      ? { duration: 0 }
      : v === undefined
        ? { duration: 0.62, ease: [0.42, 0, 0.18, 1] as const }
        : { type: "spring" as const, stiffness: 190, damping: 28, velocity: v, restDelta: 0.002 };
    animate(crease, to, how).then(() => {
      if (turn) flushSync(() => setI((n) => n + (d === "next" ? 1 : -1))); // swap pages before the creases reset, so nothing flickers
      cur.jump(0);
      prev.jump(1);
      busy.current = false;
    });
  }
  const can = (d: Dir) => !busy.current && (d === "next" ? i < last : i > 0);
  useImperativeHandle(api, () => ({ next: () => can("next") && settle("next", true), prev: () => can("prev") && settle("prev", true) }));

  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  const width = () => stage.current?.offsetWidth || 1;
  const paper = (p: number) => ({ blocks: book.pages[p], n: p + 1, head: head(p), view });

  return (
    <motion.div
      ref={stage}
      className="relative min-h-0 flex-1 touch-pan-y overflow-hidden rounded-l-[6px] rounded-r-[3px]"
      onPanStart={(_, info) => {
        const sideways = Math.abs(info.offset.x) > Math.abs(info.offset.y) * 1.2;
        const d: Dir = info.offset.x > 0 ? "next" : "prev";
        dir.current = sideways && can(d) ? d : null;
        if (dir.current) stage.current?.classList.add("select-none"); // a drag isn't a text selection
      }}
      onPan={(_, info) => {
        // The flap's edge sits at 2f, so the crease moves at half the finger's distance.
        const f = info.offset.x / (2 * width());
        if (dir.current === "next") cur.set(clamp(f));
        if (dir.current === "prev") prev.set(clamp(1 + f));
      }}
      onPanEnd={(_, info) => {
        const d = dir.current;
        dir.current = null;
        stage.current?.classList.remove("select-none");
        const v = info.velocity.x / (2 * width());
        if (d === "next") settle("next", cur.get() > 0.2 || v > 0.35, v);
        if (d === "prev") settle("prev", prev.get() < 0.8 || v < -0.35, v);
      }}
    >
      {i < last && <Paper key={i + 1} {...paper(i + 1)} hidden />}
      {/* Keyed by role too, so a leaf never switches to the other crease: each turn mounts fresh ones. */}
      <Leaf key={`cur${i}`} crease={cur}>
        <Paper {...paper(i)} />
      </Leaf>
      {i > 0 && (
        <Leaf key={`prev${i - 1}`} crease={prev} hidden>
          <Paper {...paper(i - 1)} hidden />
        </Leaf>
      )}
    </motion.div>
  );
}

const pct = (x: number) => `${x * 100}%`;
const ink = (n: number) => `color-mix(in srgb, var(--shadow) ${n}%, transparent)`;
const shine = (n: number) => `color-mix(in srgb, var(--paper-shine) ${n}%, transparent)`;

/** A page that folds at `crease`; see the notes on Turner. `hidden` while it waits folded away (the previous page). */
function Leaf({ crease, hidden, children }: { crease: MotionValue<number>; hidden?: boolean; children: ReactNode }) {
  const at = useTransform(crease, pct); // the flat part and the flap both start at the crease
  const undo = useTransform(crease, (f) => pct(-f)); // keeps the text still while its window slides
  const edge = useTransform(crease, (f) => pct(2 * f)); // the flap's free edge
  const below = useTransform(crease, (f) => pct(f - 1)); // a full-width layer whose right edge is the crease
  // Shadows only while a page is mid-turn: they grow as it lifts and fade as it settles.
  const depth = useTransform(crease, (f) => Math.min(1, f * 10, (1 - f) * 10));
  const away = useTransform(crease, (f) => (f > 0.999 ? "hidden" : "visible")); // folded out of sight: out of VoiceOver and taps too

  return (
    <motion.div aria-hidden={hidden || undefined} className="absolute inset-0" style={{ visibility: away }}>
      {/* On the page underneath: the shadow pooled under the lifted fold. */}
      <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ x: below, opacity: depth, background: `linear-gradient(to left, ${ink(38)}, ${ink(12)} 22px, transparent 56px)` }} />
      {/* The part still lying flat, darkening where it starts to curve up into the fold. */}
      <motion.div className="absolute inset-0 overflow-hidden" style={{ x: at }}>
        <motion.div className="absolute inset-0" style={{ x: undo }}>
          {children}
        </motion.div>
        <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ opacity: depth, background: `linear-gradient(to right, ${ink(30)}, ${ink(8)} 14px, transparent 44px)` }} />
      </motion.div>
      {/* The flap: the paper's back. Dark in the crease, a line of light where it bends, shading out to its edge. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-full origin-left rounded-r-[6px] border-y-2 border-r-2 border-edge-card bg-surface-note"
        style={{
          x: at,
          scaleX: crease,
          backgroundImage: `linear-gradient(to right, ${ink(42)} 0%, ${ink(10)} 5%, ${shine(55)} 16%, ${shine(10)} 34%, transparent 55%, ${ink(8)} 82%, ${ink(22)} 100%)`,
        }}
      />
      {/* The flap's shadow falling on the flat page beside it. */}
      <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ x: edge, opacity: depth, background: `linear-gradient(to right, ${ink(34)}, ${ink(10)} 16px, transparent 40px)` }} />
    </motion.div>
  );
}

/** One page of the book: running head (the chapter, left off a chapter's first page as in print), the text, the page number. */
function Paper({ blocks, n, head, view, hidden }: { blocks: Block[]; n: number; head?: string; view: View; hidden?: boolean }) {
  const opensChapter = blocks.slice(0, 2).some((b) => "h" in b);
  return (
    <div aria-hidden={hidden || undefined} className="absolute inset-0 flex flex-col overflow-hidden rounded-l-[6px] rounded-r-[3px] border-2 border-edge-card bg-surface-note">
      {/* The gutter: paper curving into the spine. */}
      <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-linear-to-l from-[color-mix(in_srgb,var(--shadow)_9%,transparent)] to-transparent" />
      {!opensChapter && head && (
        <p dir="rtl" lang="ar" className={`${amiri.className} mx-6 truncate border-b-[1.5px] border-dashed border-divider pb-1 pt-2 text-center text-sm text-muted`}>
          {head}
        </p>
      )}
      <div dir="rtl" className="flex flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-6 pb-6 pt-5 [mask-image:linear-gradient(to_bottom,black_calc(100%-32px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {blocks.map((b, k) => (
          <Passage key={k} b={b} view={view} />
        ))}
      </div>
      <p aria-hidden className={`${amiri.className} pb-2 text-center text-base text-muted`}>
        {arNum(n)}
      </p>
    </div>
  );
}

const PILL = "inline-flex h-6 items-center rounded-full border-[1.5px] border-edge-card bg-surface px-2.5 text-[11px] font-bold";

function Passage({ b, view }: { b: Block; view: View }) {
  if ("h" in b)
    return (
      <header className="flex flex-col items-center gap-1.5 pt-2 text-center">
        <h2 lang="ar" className={`${amiri.className} text-[1.6rem] font-bold leading-[1.7]`}>
          {b.h}
        </h2>
        {b.sub && (
          <p dir="ltr" className={META}>
            {b.sub}
          </p>
        )}
        {/* A chapter's mark: a small diamond between two rules. */}
        <span aria-hidden className="mt-1.5 flex items-center gap-2 text-divider">
          <span className="h-[1.5px] w-10 bg-divider" />
          <span className="size-2 rotate-45 border-[1.5px] border-divider" />
          <span className="h-[1.5px] w-10 bg-divider" />
        </span>
      </header>
    );
  const { lang } = view;
  const meaning = !lang ? undefined : lang === "ms" ? (b.ms ?? b.en) : (b.en ?? b.ms);
  return (
    <div className="flex flex-col gap-2.5">
      {(b.n || b.tag || b.x) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {b.n && <span className={`${amiri.className} text-base font-bold text-muted`}>{arNum(Number(b.n))}</span>}
          {b.tag && <span className={PILL}>{b.tag}</span>}
          {b.x && (
            <span dir="ltr" className={PILL}>
              {b.x}×
            </span>
          )}
        </div>
      )}
      <p lang="ar" className={cx(amiri.className, "whitespace-pre-line", SIZES[view.size], !b.n && b.ar.length < 30 && "text-center")}>
        {b.ar}
      </p>
      {view.rumi && b.tr && (
        <p dir="ltr" className="border-l-2 border-chores pl-2.5 text-left text-sm font-medium italic leading-relaxed text-muted">
          {b.tr}
        </p>
      )}
      {meaning && (
        <p dir="ltr" lang={meaning === b.ms ? "ms" : "en"} className="text-left text-[14px] leading-relaxed text-fg">
          {meaning}
        </p>
      )}
      {b.src && (
        <p dir="ltr" className={cx(META, "text-left")}>
          {b.src}
        </p>
      )}
    </div>
  );
}
