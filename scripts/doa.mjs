// Builds lib/doa.json (the Doa tab). Run: node scripts/doa.mjs
// Edit GROUPS below to change what shows up, then re-run and commit the JSON.
// Only doa to learn and say at their moments (no counted adhkar/zikir).
// Hadith doa: Hisnul Muslim API (Arabic, transliteration, English, audio)
//   cross-checked against JPN Johor's Hisnul Muslim (KPM), which gives the Malay and the source reference.
//   The build fails if the two sources' Arabic don't agree, so a wrong pairing can't slip in.
// Quran doa: api.alquran.cloud (Uthmani Arabic, transliteration, Sahih International, Basmeih, Alafasy audio).
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

// hm: Hisnul Muslim item IDs. quran: ayah refs ("s:a" or "s:a-b").
const GROUPS = [
  { id: "tidur", ms: "Tidur & Bangun", en: "Sleep & Waking", section: /tidur/, hm: [101, 102, 103, 104, 105, 106, 111, 1, 3] },
  { id: "rumah", ms: "Keluar & Masuk Rumah", en: "Leaving & Entering Home", hm: [16, 17, 18] },
  { id: "makan", ms: "Makan & Berbuka", en: "Eating & Breaking Fast", hm: [178, 179, 180, 181, 182, 176] },
  { id: "musafir", ms: "Kenderaan & Musafir", en: "Vehicle & Travel", hm: [206, 207] },
  {
    id: "keluarga", ms: "Suami Isteri & Anak", en: "Spouse & Children",
    hm: [190, 191], quran: [{ ref: "25:74" }, { ref: "14:40" }, { ref: "3:38" }, { ref: "17:24" }],
  },
  { id: "susah", ms: "Susah Hati, Sakit & Hutang", en: "Worry, Illness & Debt", hm: [120, 121, 122, 123, 124, 125, 243] },
  {
    id: "rabbana", ms: "Rabbana", en: "From the Quran",
    quran: [{ ref: "2:201" }, { ref: "3:8" }, { ref: "7:23" }, { ref: "20:25-28" }, { ref: "28:24" }, { ref: "14:41" }, { ref: "59:10" }],
  },
];

// Some source files have raw newlines inside strings; flatten them before parsing.
const clean = (t) => t.replace(/^﻿/, "").replace(/"(?:[^"\\]|\\.)*"/g, (q) => q.replace(/[\u0000-\u001F]+/g, " "));
async function get(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}
const json = async (url) => JSON.parse(clean(await get(url)));
const https = (u) => u.replace(/^http:/, "https:");

// Arabic for comparing: no diacritics, alef/ya/ta-marbuta folded, short "(أمسينا)"-style alternates and [ ] wrappers dropped.
const norm = (s) =>
  s.replace(/\(\(|\)\)/g, " ").replace(/\([^()]{0,25}\)/g, "").replace(/[[\]]/g, "")
    .replace(/[ً-ٰٟـۖ-ۭ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .replace(/[^ء-ي]/g, "");
function dice(a, b) {
  const grams = (s) => {
    const m = new Map();
    for (let i = 0; i < s.length - 1; i++) m.set(s.slice(i, i + 2), (m.get(s.slice(i, i + 2)) ?? 0) + 1);
    return m;
  };
  const A = grams(a), B = grams(b);
  let n = 0;
  for (const [g, c] of A) n += Math.min(c, B.get(g) ?? 0);
  return (2 * n) / Math.max(1, a.length - 1 + b.length - 1);
}
assert.ok(dice(norm("بِسْمِ اللَّهِ"), norm("((بِسْمِ اللَّهِ))")) === 1);
assert.ok(dice(norm("أَصْبَحْنَا (أَمْسَيْنَا) وَأَصْبَحَ"), norm("أَصْبَحْنَا وَأَصْبَحَ")) === 1);
assert.ok(dice(norm("بِسْمِ اللَّهِ"), norm("لا حول ولا قوة إلا بالله")) < 0.5);

// --- Hisnul Muslim (all chapters; a couple of files are malformed at the source and are skipped) ---
const hm = new Map();
const { English: chapters } = await json("https://www.hisnmuslim.com/api/en/husn_en.json");
for (const c of chapters) {
  let d;
  try {
    d = await json(https(c.TEXT));
  } catch {
    console.warn(`skipped chapter ${c.ID} (${c.TITLE}): bad JSON at source`);
    continue;
  }
  for (const x of Object.values(d)[0]) hm.set(x.ID, x);
}

// --- JPN Johor page: under each <h2>, items are an Arabic line, then transliteration, Malay (1+ lines), source ---
const dec = (s) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");
const page = await get("https://sites.google.com/moe-dl.edu.my/fcpi/hadis-hadis-amalan/hisnul-muslim");
const lines = dec(page.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<h2[^>]*>/g, "\n##\n").replace(/<[^>]+>/g, "\n"))
  .split("\n").map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean);
const isArabic = (s) => (s.match(/[؀-ۿ]/g)?.length ?? 0) > s.length * 0.5;
const jpn = [];
for (let i = 0, head, cur; i < lines.length; i++) {
  if (lines[i] === "##") { head = lines[++i]; cur = null; continue; }
  if (!head) continue;
  if (!isArabic(lines[i])) cur?.rest.push(lines[i]);
  else if (cur && !cur.rest.length) cur.n = norm((cur.ar += ` ${lines[i]}`)); // Arabic split over several lines
  else jpn.push((cur = { head, ar: lines[i], n: norm(lines[i]), rest: [] }));
}
assert.ok(jpn.length > 200, `JPN page parsed to only ${jpn.length} items; has its layout changed?`);
const SOURCE = /Bukhari|Muslim|Dawud|Tirmi|Nasa|Majah|Ahmad|Hakim|Hibban|Sunni|Tabar|Albani|Qur|\d/;

const failures = [];
const fail = (msg) => void failures.push(msg);

const used = new Map();

/** section: the JPN heading to prefer when the same doa appears under several (e.g. Ayat al-Kursi). */
function hadithDoa(id, section) {
  const h = hm.get(id);
  assert.ok(h?.ARABIC_TEXT, `Hisnul Muslim #${id} not found`);
  const a = norm(h.ARABIC_TEXT);
  let best, score = 0;
  for (const j of jpn) {
    // Hisnul Muslim sometimes wraps the doa in its narration ("when you marry… say: …") where JPN has just the doa;
    // count that as a match, scaled by how much of the text it covers so a short phrase can't beat a full match.
    let s = Math.max(dice(a, j.n), j.n.length >= 15 && a.includes(j.n) ? 0.75 + (0.25 * j.n.length) / a.length : 0);
    if (section?.test(j.head)) s += 0.01;
    if (s > score) [best, score] = [j, s];
  }
  if (score < 0.75) return fail(`#${id} has no matching Malay entry (best ${score.toFixed(2)}: ${best?.head})`);
  if (used.has(best)) return fail(`#${id} and #${used.get(best)} both matched the same Malay entry (${best.head})`);
  used.set(best, id);
  const [, ...more] = best.rest;
  const src = more.at(-1);
  if (more.length < 2 || !SOURCE.test(src)) return fail(`#${id} (${best.head}): couldn't find Malay + source in ${JSON.stringify(best.rest)}`);
  return {
    id: `hm${id}`,
    ar: h.ARABIC_TEXT.trim(),
    tr: h.LANGUAGE_ARABIC_TRANSLATED_TEXT.trim().replace(/AA/g, "‘"), // the API spells ‘ayn as "AA"
    en: h.TRANSLATED_TEXT.trim(),
    ms: more.slice(0, -1).join(" "),
    src: `${src.replace(/\.$/, "")} · Hisnul Muslim ${id}`,
    audio: [https(h.AUDIO)],
  };
}

async function quranDoa({ ref }) {
  const [s, range] = ref.split(":");
  const [from, to = from] = range.split("-").map(Number);
  const parts = [];
  for (let n = from; n <= to; n++) {
    const { data } = await json(`https://api.alquran.cloud/v1/ayah/${s}:${n}/editions/quran-uthmani,en.transliteration,en.sahih,ms.basmeih,ar.alafasy`);
    parts.push(data);
  }
  const join = (i) => parts.map((p) => p[i].text).join(" ");
  const name = `${parts[0][0].surah.englishName} ${ref}`;
  return {
    id: `q${ref}`, ar: join(0), tr: join(1), en: join(2), ms: join(3),
    src: name, audio: parts.map((p) => https(p[4].audio)),
  };
}

const out = [];
for (const g of GROUPS) {
  const items = [];
  for (const id of g.hm ?? []) items.push(hadithDoa(id, g.section));
  for (const q of g.quran ?? []) items.push(await quranDoa(q));
  out.push({ id: g.id, ms: g.ms, en: g.en, items: items.filter(Boolean) });
}
assert.deepEqual(failures, [], "fix or drop these doa in GROUPS");

const ids = new Set();
for (const g of out) for (const d of g.items) {
  for (const k of ["ar", "tr", "en", "ms", "src"]) assert.ok(d[k]?.trim(), `${d.id} missing ${k}`);
  assert.ok(d.audio.every((u) => u.startsWith("https://")), `${d.id} audio not https`);
  assert.ok(!ids.has(d.id), `${d.id} listed twice`);
  ids.add(d.id);
}
await writeFile(new URL("../lib/doa.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
console.log(`wrote ${ids.size} doa in ${out.length} groups`);
