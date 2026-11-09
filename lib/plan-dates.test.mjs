import assert from "node:assert/strict";
import test from "node:test";
import { addDays, doneLastWeek, klDate, nextSaturday, planLabel } from "./plan-dates.ts";

// 2026-11-09 is a Monday.
const today = "2026-11-09";

test("klDate rolls over at Kuala Lumpur midnight, not UTC", () => {
  assert.equal(klDate(new Date("2026-11-09T15:59:00Z")), "2026-11-09");
  assert.equal(klDate(new Date("2026-11-09T16:00:00Z")), "2026-11-10");
});

test("addDays crosses months", () => assert.equal(addDays("2026-11-30", 1), "2026-12-01"));

test("nextSaturday is always ahead", () => {
  assert.equal(nextSaturday(today), "2026-11-14");
  assert.equal(nextSaturday("2026-11-13"), "2026-11-14");
  assert.equal(nextSaturday("2026-11-14"), "2026-11-21");
  assert.equal(nextSaturday("2026-11-15"), "2026-11-21");
});

test("planLabel", () => {
  assert.equal(planLabel(today, today), "Today");
  assert.equal(planLabel("2026-11-10", today), "Tomorrow");
  assert.equal(planLabel("2026-11-14", today), "Saturday");
  assert.equal(planLabel("2026-11-03", today), "from Tuesday");
  assert.match(planLabel("2026-10-20", today), /^from 20 Oct/);
  assert.match(planLabel("2026-12-25", today), /^25 Dec/);
});

test("doneLastWeek counts a rolling seven days per person", () => {
  assert.deepEqual(
    doneLastWeek(
      [
        { completed_by: "a", completed_at: "2026-11-09T02:00:00Z" },
        { completed_by: "a", completed_at: "2026-11-03T02:00:00Z" },
        { completed_by: "b", completed_at: "2026-11-02T02:00:00Z" },
        { completed_by: null, completed_at: null },
      ],
      today,
    ),
    { a: 2 },
  );
});
