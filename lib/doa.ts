/** One doa from lib/doa.json (built by scripts/doa.mjs). tr: transliteration (Rumi). src: where it comes from. */
export type Doa = { id: string; ar: string; tr: string; en: string; ms: string; src: string; audio: string[] };
export type DoaGroup = { id: string; ms: string; en: string; items: Doa[] };
export type DoaStatus = "learning" | "memorised";

/** The sources wrap text in (( )), ﴿ ﴾, ( ) and mark ayah breaks with *; none of that is recited. */
const clean = (s: string) => s.replace(/[()﴿﴾*]/g, " ").replace(/\s+/g, " ").trim();

/** Bite-sized parts to read and repeat: split at Arabic commas and stops, long runs cut into even chunks of about 6 words. */
export function phrases(ar: string): string[] {
  return clean(ar)
    .split(/[،؛.:]/)
    .map((p) => p.trim().split(" ").filter(Boolean))
    .filter((w) => w.length)
    .flatMap((w) => {
      const n = Math.ceil(w.length / 7);
      const size = Math.ceil(w.length / n);
      return Array.from({ length: n }, (_, i) => w.slice(i * size, (i + 1) * size).join(" "));
    });
}

const MARKS = /[ً-ٰٟۖ-ۭ]/; // harakat and Quranic marks
const NO_LEFT_JOIN = "اأإآٱدذرزوؤءة"; // letters that never join the next one, so no tatweel after them

/** Each word and its first-letter hint ("بِـ"), for the fade step. Trailing punctuation stays on the hint. */
export function words(ar: string): { word: string; hint: string }[] {
  return clean(ar)
    .split(" ")
    .filter((w) => /[ء-يٱ]/.test(w))
    .map((word) => {
      const chars = [...word];
      let i = 1;
      while (i < chars.length && MARKS.test(chars[i])) i++;
      const tail = word.match(/[،؛.:!]+$/)?.[0] ?? "";
      const joins = i < chars.length - tail.length && !NO_LEFT_JOIN.includes(chars[0]);
      return { word, hint: chars.slice(0, i).join("") + (joins ? "ـ" : "") + tail };
    });
}

/** Row title: the translation's opening words, without an ayah number "( 285 )" or a "(" that wraps the whole text. */
export function opening(t: string) {
  const s = t.trim().replace(/^\(\s*\d+\s*\)\s*/, "");
  const close = s.indexOf(")");
  return s.startsWith("(") && /^\)[.\s]*$/.test(s.slice(close)) ? s.slice(1, close) : s;
}
