// Builds lib/reminders.json (the daily ayah/hadith on Today). Run: node scripts/reminders.mjs
// Edit the two lists below to change what shows up, then re-run and commit the JSON.
// Quran: api.alquran.cloud (Uthmani Arabic, Sahih International, Basmeih Malay).
// Hadith: hadeethenc.com (Arabic, English, Malay, reviewed translations with grade).
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

// Lessons only: no doa (ayat or hadith that are themselves a supplication). Doa gets its own feature.
const AYAT = [
  "2:152", "2:153", "2:186", "2:216", "2:255", "2:263", "3:134", "3:139", "3:159", "3:173",
  "9:51", "13:28", "14:7", "16:97", "17:23", "29:69", "30:21", "31:18", "33:41-42", "39:53",
  "40:60", "41:34", "49:10", "50:16", "65:3", "93:3-5", "94:5-6", "103:1-3", "112:1-4", "2:45",
];
const HADITH = [
  66511, 66520, 66521, 66538, 3017, 3567, 3581, 3591, 3706, 3716, 4709, 5437, 4308, 4716, 65255, 4307,
  4723, 65055, 65054, 4216, 65020, 3702, 5953, 66512, 66519, 3854, 66516, 3553, 65017, 66531,
];

async function json(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function ayah(ref) {
  const [s, range] = ref.split(":");
  const [from, to = from] = range.split("-").map(Number);
  const parts = [];
  for (let n = from; n <= to; n++) {
    const { data } = await json(`https://api.alquran.cloud/v1/ayah/${s}:${n}/editions/quran-uthmani,en.sahih,ms.basmeih`);
    parts.push(data);
  }
  const join = (i) => parts.map((p) => p[i].text).join(" ");
  return { kind: "quran", ar: join(0), en: join(1), ms: join(2), ref: `${parts[0][0].surah.englishName} ${ref}` };
}

async function hadith(id) {
  const one = (lang) => json(`https://hadeethenc.com/api/v1/hadeeths/one/?language=${lang}&id=${id}`);
  const [ar, en, ms] = await Promise.all([one("ar"), one("en"), one("ms")]);
  const by = id === 66511 ? "Narrated by Al-Bukhāri and Muslim" : en.attribution; // the source spells out both imams' full lineage
  // The first few "benefits" HadeethEnc lists under each hadith, in each language.
  const lessons = (h) => (h.hints ?? []).map((x) => x.trim()).filter(Boolean).slice(0, 3);
  return {
    kind: "hadith", ar: ar.hadeeth, en: en.hadeeth, ms: ms.hadeeth, ref: `${by} · ${en.grade}`,
    lessons: { ar: lessons(ar), en: lessons(en), ms: lessons(ms) },
  };
}

const quran = [];
for (const r of AYAT) quran.push(await ayah(r));
const hadiths = [];
for (const id of HADITH) hadiths.push(await hadith(id));

// Alternate ayah, hadith, ayah… so consecutive days mix.
const out = [];
for (let i = 0; i < Math.max(quran.length, hadiths.length); i++) out.push(...[quran[i], hadiths[i]].filter(Boolean));

for (const e of out) for (const k of ["ar", "en", "ms", "ref"]) assert.ok(e[k]?.trim(), `${e.ref ?? "?"} missing ${k}`);
for (const e of out) if (e.lessons) for (const k of ["ar", "en", "ms"]) assert.ok(e.lessons[k].length, `${e.ref} has no ${k} lessons`);
await writeFile(new URL("../lib/reminders.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
console.log(`wrote ${out.length} reminders`);
