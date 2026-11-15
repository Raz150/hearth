import { test } from "node:test";
import assert from "node:assert/strict";
import { doneIn, goodWeeks, ratingDue, readyToGraduate } from "./habits.ts";

const me = "me";
const base = { id: "h", cue: "pray Subuh", action: "read one page", perWeek: 3, since: "2026-09-01", checks: [], ratings: [] };

test("doneIn counts only my ticks in the week", () => {
  const h = { ...base, checks: [{ by: me, day: "2026-11-16" }, { by: me, day: "2026-11-09" }, { by: "you", day: "2026-11-16" }] };
  assert.equal(doneIn(h, me, ["2026-11-16", "2026-11-17"]), 1);
});

test("ratingDue: not in the first two weeks, then every two weeks", () => {
  assert.equal(ratingDue({ ...base, since: "2026-11-10" }, me, "2026-11-16"), false);
  assert.equal(ratingDue(base, me, "2026-11-16"), true);
  assert.equal(ratingDue({ ...base, ratings: [{ by: me, day: "2026-11-10", score: 3 }] }, me, "2026-11-16"), false);
  assert.equal(ratingDue({ ...base, ratings: [{ by: me, day: "2026-11-02", score: 3 }] }, me, "2026-11-16"), true);
  assert.equal(ratingDue({ ...base, owner: "you" }, me, "2026-11-16"), false); // not my habit
});

test("readyToGraduate: eight weeks and my last two answers 4+", () => {
  const high = [{ by: me, day: "2026-11-01", score: 4 }, { by: me, day: "2026-11-15", score: 5 }];
  assert.equal(readyToGraduate({ ...base, ratings: high }, me, "2026-11-16"), true);
  assert.equal(readyToGraduate({ ...base, since: "2026-10-01", ratings: high }, me, "2026-11-16"), false);
  assert.equal(readyToGraduate({ ...base, ratings: [...high, { by: me, day: "2026-11-16", score: 2 }] }, me, "2026-11-16"), false);
});

test("goodWeeks counts full past weeks that hit the target", () => {
  const days = ["2026-11-09", "2026-11-11", "2026-11-15", "2026-11-02", "2026-11-16"]; // last week: 3, week before: 1, this week: 1
  const h = { ...base, checks: days.map((day) => ({ by: me, day })) };
  assert.equal(goodWeeks(h, me, "2026-11-16"), 1);
});
