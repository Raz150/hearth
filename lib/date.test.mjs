import { test } from "node:test";
import assert from "node:assert/strict";
import { klToday, addDays, daysBetween, relativeDue, thisWeekend, weekStart } from "./date.ts";

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

test("parseQuickAdd", async () => {
  const { parseQuickAdd, dueWord } = await import("./date.ts");
  const members = [{ id: "a", name: "Aisha" }, { id: "r", name: "Raz" }];
  const today = "2026-11-14"; // Saturday
  assert.deepEqual(parseQuickAdd("pay rent fri @ai", { today, me: "r", members }), { title: "pay rent", due: "2026-11-20", assignee: "a", priority: undefined, tags: [] });
  assert.deepEqual(parseQuickAdd("@me call mum tmr", { today, me: "r", members }), { title: "call mum", due: "2026-11-15", assignee: "r", priority: undefined, tags: [] });
  assert.equal(parseQuickAdd("tomorrow", { today }).title, "tomorrow"); // never empties the title
  assert.equal(parseQuickAdd("watch friday night lights", { today }).due, undefined); // only the last word
  assert.deepEqual(parseQuickAdd("buy milk today @bob", { members }), { title: "buy milk today @bob", due: undefined, assignee: undefined, priority: undefined, tags: [] });
  assert.deepEqual(parseQuickAdd("fix #House sink !! #house tmr", { today }), { title: "fix sink", due: "2026-11-15", assignee: undefined, priority: 1, tags: ["house"] });
  assert.deepEqual(parseQuickAdd("flat #3 wow!", { priority: false, tags: false }).title, "flat #3 wow!");
  assert.equal(parseQuickAdd("call !!", { priority: false }).title, "call !!");
  assert.equal(parseQuickAdd("#a #b", {}).title, "");
  assert.equal(dueWord("Sat", today), today);
  assert.equal(dueWord("esok", today), "2026-11-15");
  assert.equal(dueWord("mo", today), undefined);
});

test("formatTime / shortTime", async () => {
  const { formatTime, shortTime } = await import("./date.ts");
  assert.equal(formatTime("21:30:00"), "9:30 PM");
  assert.equal(formatTime("00:05"), "12:05 AM");
  assert.equal(formatTime("12:00"), "12:00 PM");
  assert.equal(shortTime("07:30"), "7:30a");
  assert.equal(shortTime("21:00"), "9p");
});

test("monthWeeks: Monday-first, whole weeks, covers the month", async () => {
  const { monthWeeks } = await import("./date.ts");
  const w = monthWeeks("2026-11-15"); // 1 Nov 2026 is a Sunday
  assert.equal(w[0][0], "2026-10-26");
  assert.equal(w[0][6], "2026-11-01");
  assert.equal(w.at(-1)[6], "2026-12-06");
  assert.equal(monthWeeks("2027-02-10").length, 4); // Feb 2027 starts on a Monday, 28 days
});
