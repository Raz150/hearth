import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { opening, phrases, words } from "./doa.ts";

const all = JSON.parse(readFileSync(new URL("./doa.json", import.meta.url), "utf8")).flatMap((g) => g.items);
const get = (id) => all.find((d) => d.id === id);

test("phrases split at commas and drop the source's brackets", () => {
  assert.deepEqual(phrases("((بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي، وَبِكَ أَرْفَعُهُ)). "), ["بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي", "وَبِكَ أَرْفَعُهُ"]);
});

test("long phrases are cut into even chunks of at most 7 words", () => {
  const p = phrases(get("hm101").ar);
  assert.ok(p.length > 5);
  assert.ok(p.every((x) => x.split(" ").length <= 7 && !/[()﴿﴾*]/.test(x)));
  assert.equal(p.join(" ").split(" ").length, words(get("hm101").ar).length, "no word lost");
});

test("every doa has phrases and words", () => {
  for (const d of all) {
    assert.ok(phrases(d.ar).length > 0, d.id);
    assert.ok(words(d.ar).length > 0, d.id);
  }
});

test("hints keep the first letter with its harakat, and join only when the letter joins", () => {
  const [a, b, c] = words("بِاسْمِكَ وَبِكَ جَنْبِي،");
  assert.equal(a.hint, "بِـ");
  assert.equal(b.hint, "وَ");
  assert.equal(c.hint, "جَـ،");
});

test("opening drops ayah numbers and wrapping brackets", () => {
  assert.equal(opening("( 285 )   The Messenger has believed"), "The Messenger has believed");
  assert.equal(opening("(All praise is for Allah.)"), "All praise is for Allah.");
});
