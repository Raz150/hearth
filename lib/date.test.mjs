import { test } from "node:test";
import assert from "node:assert/strict";
import { klToday, addDays, daysBetween, relativeDue, dueDateInMonth, thisWeekend, weekStart, addMonths } from "./date.ts";

test("klToday uses KL time (UTC+8)", () => {
  assert.equal(klToday(new Date("2026-11-13T16:30:00Z")), "2026-11-14");
  assert.equal(klToday(new Date("2026-11-13T15:59:00Z")), "2026-11-13");
});

test("addDays crosses months and years", () => {
  assert.equal(addDays("2026-12-30", 3), "2027-01-02");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
});

test("relativeDue", () => {
  assert.equal(relativeDue("2026-11-13", "2026-11-13"), "today");
  assert.equal(relativeDue("2026-11-16", "2026-11-13"), "in 3 days");
  assert.equal(relativeDue("2026-11-11", "2026-11-13"), "2 days late");
  assert.equal(daysBetween("2026-11-13", "2026-11-14"), 1);
});

test("dueDateInMonth clamps to last day", () => {
  assert.equal(dueDateInMonth("2027-02-10", 31), "2027-02-28");
  assert.equal(dueDateInMonth("2028-02-10", 31), "2028-02-29");
  assert.equal(dueDateInMonth("2026-11-02", 5), "2026-11-05");
});

test("thisWeekend", () => {
  assert.equal(thisWeekend("2026-11-13"), "2026-11-14"); // Fri -> Sat
  assert.equal(thisWeekend("2026-11-14"), "2026-11-14"); // Sat
  assert.equal(thisWeekend("2026-11-15"), "2026-11-15"); // Sun
  assert.equal(thisWeekend("2026-11-16"), "2026-11-21"); // Mon
});

test("weekStart is Monday", () => {
  assert.equal(weekStart("2026-11-13"), "2026-11-09"); // Fri
  assert.equal(weekStart("2026-11-09"), "2026-11-09"); // Mon
  assert.equal(weekStart("2026-11-15"), "2026-11-09"); // Sun
});

test("addMonths crosses years", () => {
  assert.equal(addMonths("2026-11", 2), "2027-01");
  assert.equal(addMonths("2026-01", -1), "2025-12");
});
