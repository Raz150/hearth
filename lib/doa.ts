/** One doa from lib/doa.json (built by scripts/doa.mjs). tr: transliteration (Rumi). src: where it comes from. */
export type Doa = { id: string; ar: string; tr: string; en: string; ms: string; src: string; repeat: number; audio: string[] };
export type DoaGroup = { id: string; ms: string; en: string; items: Doa[] };

/** The adhkar that suit this KL hour (morning, evening, bedtime); undefined in between. */
export function doaForHour(h: number): { group: string; label: string } | undefined {
  if (h >= 4 && h < 11) return { group: "pagi-petang", label: "Zikir pagi" };
  if (h >= 16 && h < 19) return { group: "pagi-petang", label: "Zikir petang" };
  if (h >= 21 || h < 3) return { group: "tidur", label: "Sebelum tidur" };
}
