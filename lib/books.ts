/** The Doa tab's bookshelf. Text in lib/books/*.json, built by scripts/doa.mjs; each book is loaded only when opened. */
import pageCounts from "./books/pages.json";

/** A chapter heading, or one passage: Arabic, its number in the book (n), a grade or pagi/petang (tag), Rumi (tr), how many times to say it (x). */
export type Block = { h: string; sub?: string } | { ar: string; n?: string; tag?: string; tr?: string; en?: string; ms?: string; src?: string; x?: number };
export type Book = { toc: { t: string; sub?: string; p: number }[]; pages: Block[][] };

export type ShelfBook = { id: string; ar: string; en: string; by: string; about: string; pages: number; load: () => Promise<Book> };

const json = (m: { default: unknown }) => m.default as Book;
const pages = (id: keyof typeof pageCounts) => pageCounts[id];

export const SHELF: ShelfBook[] = [
  {
    id: "mathurat",
    ar: "المأثورات",
    en: "Al-Ma'thurat",
    by: "Hasan al-Banna",
    about:
      "Al-Wazifah al-Sughra, for morning and evening. Quran passages from the Tanzil text (api.alquran.cloud) with Basmeih's Malay. The other adhkar and their Malay come from a community text (github.com/adiman-dev/Mathurat). The ones with the same wording in Hisnul Muslim say so, and use its Rumi. The closing wirid rabitah and its doa are al-Banna's own.",
    pages: pages("mathurat"),
    load: () => import("./books/mathurat.json").then(json),
  },
  {
    id: "hisn",
    ar: "حصن المسلم",
    en: "Hisn al-Muslim",
    by: "Sa'id al-Qahtani",
    about:
      "From hisnmuslim.com: Arabic, Rumi and English. Malay and the hadith reference come from JPN Johor's Hisnul Muslim where the same doa is there. One chapter (what to say when frightened) is broken at the source and left out.",
    pages: pages("hisn"),
    load: () => import("./books/hisn.json").then(json),
  },
  {
    id: "kalim",
    ar: "الكلم الطيب",
    en: "Al-Kalim al-Tayyib",
    by: "Ibn Taymiyyah, graded by al-Albani",
    about: "Al-Albani's edition (al-Maktab al-Islami, 3rd ed.), with his grade on each hadith. Arabic only. Text from OpenITI, Shamela book 327.",
    pages: pages("kalim"),
    load: () => import("./books/kalim.json").then(json),
  },
  {
    id: "adhkar",
    ar: "الأذكار",
    en: "Al-Adhkar",
    by: "al-Nawawi",
    about: "Al-Arna'ut's edition, without his footnotes. Arabic only. Text from OpenITI, Shamela book 1956.",
    pages: pages("adhkar"),
    load: () => import("./books/adhkar.json").then(json),
  },
];
