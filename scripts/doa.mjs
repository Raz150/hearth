// Builds lib/doa.json (the Doa tab) and the four books in lib/books/ (the Doa tab's bookshelf). Run: node scripts/doa.mjs
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
const { العربية: arTitles } = await json("https://www.hisnmuslim.com/api/ar/husn_ar.json");
const hmChapters = []; // for the Hisnul Muslim book, in the book's order
for (const c of chapters) {
  let d;
  try {
    d = await json(https(c.TEXT));
  } catch {
    console.warn(`skipped chapter ${c.ID} (${c.TITLE}): bad JSON at source`);
    continue;
  }
  const items = Object.values(d)[0];
  for (const x of items) hm.set(x.ID, x);
  hmChapters.push({ id: c.ID, en: c.TITLE.trim(), ar: arTitles.find((a) => a.ID === c.ID)?.TITLE.trim(), items });
}
hmChapters.sort((a, b) => a.id - b.id);

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

/** The JPN entry for a Hisnul Muslim item. section: the JPN heading to prefer when the same doa appears under several (e.g. Ayat al-Kursi). */
function jpnFor(h, section) {
  const a = norm(h.ARABIC_TEXT);
  let best, score = 0;
  for (const j of jpn) {
    // Hisnul Muslim sometimes wraps the doa in its narration ("when you marry… say: …") where JPN has just the doa;
    // count that as a match, scaled by how much of the text it covers so a short phrase can't beat a full match.
    let s = Math.max(dice(a, j.n), j.n.length >= 15 && a.includes(j.n) ? 0.75 + (0.25 * j.n.length) / a.length : 0);
    if (section?.test(j.head)) s += 0.01;
    if (s > score) [best, score] = [j, s];
  }
  return { best, score };
}

function hadithDoa(id, section) {
  const h = hm.get(id);
  assert.ok(h?.ARABIC_TEXT, `Hisnul Muslim #${id} not found`);
  const { best, score } = jpnFor(h, section);
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

// ─── The bookshelf: four books, each { toc, pages } (shape: lib/books.ts) ───
// Pages are cut to fit a phone: a heading starts a new page, then blocks fill it up to `budget` Arabic characters.
function paginate(blocks, budget) {
  const pages = [], toc = [];
  let page = [], used = 0;
  const flush = () => page.length && (pages.push(page), (page = []), (used = 0));
  for (const b of blocks) {
    if (b.h) {
      if (!(page.length === 1 && page[0].ar?.length < 60)) flush(); // a lone opening line (a basmalah) stays with the chapter after it
      toc.push({ t: b.h, sub: b.sub, p: pages.length });
    } else if (used && used + b.ar.length > budget) flush();
    page.push(b);
    used += b.ar?.length ?? 0;
  }
  flush();
  return { toc, pages };
}
async function writeBook(id, book) {
  assert.ok(book.pages.length > 10 && book.toc.length > 3, `${id}: only ${book.pages.length} pages / ${book.toc.length} chapters`);
  for (const p of book.pages) for (const b of p) assert.ok(b.h || b.ar?.trim(), `${id}: empty block`);
  await writeFile(new URL(`../lib/books/${id}.json`, import.meta.url), JSON.stringify(book) + "\n");
  pageCounts[id] = book.pages.length;
  console.log(`wrote ${id}: ${book.pages.length} pages, ${book.toc.length} chapters`);
}
/** Page counts, so the shelf can show progress without loading a book. Written once all four are done. */
const pageCounts = {};

/** The API's transliteration, with its "AA" for ‘ayn fixed (as in hadithDoa). */
const rumi = (h) => h.LANGUAGE_ARABIC_TRANSLATED_TEXT?.trim().replace(/AA/g, "‘") || undefined;

// Hisnul Muslim: the API's Arabic, transliteration + English; Malay and the hadith reference where JPN Johor has the same doa.
{
  const blocks = [];
  for (const c of hmChapters) {
    blocks.push({ h: c.ar ?? c.en, sub: c.en });
    for (const h of c.items.filter((x) => x.ARABIC_TEXT?.trim())) {
      const { best, score } = jpnFor(h);
      const ms = score >= 0.75 && best.rest.length >= 3 ? best.rest.slice(1, -1).join(" ") : undefined;
      const src = score >= 0.75 && SOURCE.test(best.rest.at(-1)) ? best.rest.at(-1).replace(/\.$/, "") : undefined;
      blocks.push({ n: String(h.ID), ar: h.ARABIC_TEXT.trim(), tr: rumi(h), en: h.TRANSLATED_TEXT?.trim() || undefined, ms, src, x: Number(h.REPEAT) > 1 ? Number(h.REPEAT) : undefined });
    }
  }
  await writeBook("hisn", paginate(blocks, 420));
}

// OpenITI text files (pinned commits): "# " starts a paragraph, "~~" continues it, "### | " is a heading or a hadith number.
// Dropped: page/milestone markers, footnote calls "(1)" (the footnotes aren't in the file) and the printed-page refs "[60]".
async function openiti(url) {
  const body = (await get(url)).split("#META#Header#End#")[1];
  const paras = [];
  for (const line of body.split("\n")) {
    if (line.startsWith("~~")) paras[paras.length - 1] += ` ${line.slice(2)}`;
    else if (line.startsWith("### | ")) paras.push(line);
    else if (line.startsWith("# ")) {
      // A printed page that ends mid-sentence ("… PageV01P003") carries on in the next "# " line.
      if (/\S.*PageV\d+P\d+\s*$/.test(paras.at(-1) ?? "") && !paras.at(-1).startsWith("###")) paras[paras.length - 1] += ` ${line.slice(2)}`;
      else paras.push(line.slice(2));
    }
  }
  return paras
    .map((p) => p.replace(/PageV\d+P\d+|\bms\d+\b|\s*\(\d+\)|\[\d+\]/g, " ").replace(/\s+/g, " ").trim())
    .filter((p) => p && p !== "-" && p !== "### |");
}
const GRADE = /^\((صحيح|حسن|ضعيف|موضوع|إسناده|صحيح الإسناد|ضعيف الإسناد|حسن صحيح|ضعيف جدا|حسن الإسناد|صحيح لغيره|حسن لغيره|منكر)[^)]{0,20}\)\s*/;

// al-Kalim al-Tayyib with al-Albani's grade on each hadith (Shamela 327). Chapters are paragraphs that start "فصل".
{
  const blocks = [];
  let n;
  for (const p of await openiti("https://raw.githubusercontent.com/OpenITI/0750AH/3a235a291ba442ce3795048254675dc0a2361f52/data/0728IbnTaymiyya/0728IbnTaymiyya.KalimTayyib/0728IbnTaymiyya.KalimTayyib.Shamela0000327-ara1")) {
    const num = p.match(/^### \| (\d+) -$/);
    if (num) n = num[1];
    else if (/^-? ?فصل/.test(p)) blocks.push({ h: p.replace(/^- /, "") });
    else if (!p.startsWith("###")) {
      const g = p.match(GRADE);
      blocks.push({ n, tag: g?.[0].trim().slice(1, -1), ar: g ? p.slice(g[0].length) : p });
      n = undefined;
    }
  }
  assert.ok(blocks.filter((b) => b.tag).length > 200, "Kalim: grades not found; has the file's layout changed?");
  await writeBook("kalim", paginate(blocks, 700));
}

// al-Adhkar, al-Arna'ut's edition (Shamela 1956). Headings are "### | (باب …)"; "### | 12 -" numbers the next hadith.
{
  const blocks = [];
  let n;
  for (const p of await openiti("https://raw.githubusercontent.com/OpenITI/0700AH/be0d457b3830bdef87b286d7e619726a36ac5fc9/data/0676Nawawi/0676Nawawi.Adhkar/0676Nawawi.Adhkar.Shamela0001956-ara1")) {
    const num = p.match(/^### \| (\d+) ?-?$/);
    if (num) n = num[1];
    else if (p.startsWith("### | ")) blocks.push({ h: p.slice(6).replace(/^\((.*)\)$/, "$1").replace(/\s*:$/, "") });
    else {
      blocks.push({ n, ar: p });
      n = undefined;
    }
  }
  await writeBook("adhkar", paginate(blocks, 900));
}

// al-Ma'thurat (Wazifah Sughra): a community text with Malay (adiman-dev/Mathurat, pinned). Each of its pages becomes one page here,
// pagi and petang wordings side by side. Quran passages are swapped for api.alquran.cloud's; the rest is tagged when Hisnul Muslim has it too.
{
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(":memory:");
  const base = "https://raw.githubusercontent.com/adiman-dev/Mathurat/e11cbbc37c9f95fd0615ef01f34d612c1ad9014c/";
  db.exec(await get(`${base}mathurat_sughra.sql`));
  db.exec(await get(`${base}translation_ms.sql`));
  const rows = db.prepare("SELECT m.page, m.repeat_count x, m.recitation_time t, m.name, m.text ar, tr.text ms FROM mathurat_sughra m LEFT JOIN translation tr ON tr.mathurat_sughra_id = m.id ORDER BY m.id").all();
  assert.ok(rows.length >= 39, `Ma'thurat: only ${rows.length} rows`);
  const SURAH = { "Al Fatihah": 1, "Al Baqarah": 2, "Al Imran": 3, "Al Ikhlas": 112, "Al Falaq": 113, "An Nas": 114 };
  const hmAll = [...hm.values()].filter((h) => h.ARABIC_TEXT).map((h) => ({ h, n: norm(h.ARABIC_TEXT) }));
  /** The Hisnul Muslim item with the same wording: the best match, close in length too, so a shared opening line isn't enough. */
  const sameAs = (ar) => {
    const n = norm(ar);
    let best, score = 0;
    for (const x of hmAll) {
      const s = dice(n, x.n);
      if (s > score && Math.min(n.length, x.n.length) / Math.max(n.length, x.n.length) > 0.7) [best, score] = [x.h, s];
    }
    return score >= 0.85 ? { h: best, exact: score >= 0.95 } : undefined;
  };
  const blocks = [{ h: "الوظيفة الصغرى", sub: "Pagi & petang" }];
  let last;
  for (const r of rows) {
    const q = r.name.match(/^(.+) \((\d+)(?:-(\d+))?\)$/);
    const tag = r.t === 1 ? "Pagi" : r.t === 2 ? "Petang" : undefined;
    let b;
    if (q) {
      assert.ok(SURAH[q[1]], `Ma'thurat: unknown surah ${q[1]}`);
      const d = await quranDoa({ ref: `${SURAH[q[1]]}:${q[2]}${q[3] ? `-${q[3]}` : ""}` });
      b = { ar: d.ar.replace(/^﻿/, ""), tr: d.tr, ms: d.ms, en: d.en, src: d.src, x: r.x > 1 ? r.x : undefined, name: d.src };
    } else {
      const m = sameAs(r.ar);
      // Hisnul Muslim's transliteration only where the wording is the same (its morning/evening ones are written for the morning).
      const tr = m?.exact && tag !== "Petang" ? rumi(m.h) : undefined;
      if (m) console.log(`  Ma'thurat p${r.page} ${tag ?? ""} ≈ Hisnul Muslim ${m.h.ID}${tr ? " (+ rumi)" : ""}`);
      b = { ar: r.ar.trim(), tr, ms: r.ms?.replace(/^\((Pagi|Petang)\)\s*/, "").replace(/^"|"$/g, "").trim(), src: m ? `Also in Hisnul Muslim ${m.h.ID}` : undefined, tag, x: r.x > 1 ? r.x : undefined };
    }
    if (last !== undefined && r.page !== last) blocks.push({ br: true }); // the source's page break
    blocks.push(b);
    last = r.page;
  }
  // One source page per page: split at the breaks instead of by length. Contents: the passage's name, or its opening words.
  const pages = [[]];
  for (const b of blocks) b.br ? pages.push([]) : pages.at(-1).push(b);
  // Contents: each page's opening words in Arabic, with the surah and ayah underneath for Quran passages.
  const toc = pages.map((p, i) => {
    const b = p.find((x) => x.ar);
    let words = b.ar.split(/\s+/);
    if (norm(words.slice(0, 4).join(" ")) === norm("بسم الله الرحمن الرحيم")) words = words.slice(4); // every surah opens the same way
    return { t: `${words.slice(0, 4).join(" ")}${words.length > 4 ? "…" : ""}`, sub: b.name, p: i };
  });
  for (const p of pages) for (const b of p) delete b.name;
  await writeBook("mathurat", { toc, pages });
}
await writeFile(new URL("../lib/books/pages.json", import.meta.url), JSON.stringify(pageCounts) + "\n");
