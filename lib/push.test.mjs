import { test } from "node:test";
import assert from "node:assert/strict";
import { burstSize, counted, isQuiet, itemList, parsePing, toYou } from "./push.ts";

test("isQuiet: 23:00 to 06:59 KL", () => {
  assert.deepEqual([22, 23, 0, 6, 7].map(isQuiet), [false, true, true, true, false]);
});

test("burstSize: counts the newest run of adds, each within the gap of the next", () => {
  assert.equal(burstSize([]), 0);
  assert.equal(burstSize([1000]), 1);
  // 10s apart, then a 5-minute gap back to an older add
  assert.equal(burstSize([100_000, 90_000, 80_000, 80_000 - 300_000]), 3);
  assert.equal(burstSize([100_000, 100_000 - 50_000]), 1); // exactly the gap: the older one already pinged
});

test("itemList", () => {
  assert.equal(itemList(["Milk"]), "Milk");
  assert.equal(itemList(["Milk", "Eggs"]), "Milk and Eggs");
  assert.equal(itemList(["Milk", "Eggs", "Rice"]), "Milk, Eggs and Rice");
  assert.equal(itemList(["Milk", "Eggs", "Rice", "Tea", "Salt"]), "Milk, Eggs and 3 more");
});

test("toYou and counted", () => {
  assert.equal(toYou("thanked Aisha for Laundry", "Aisha"), "thanked you for Laundry");
  assert.equal(toYou("did Laundry", ""), "did Laundry");
  assert.equal(counted(0, "chore"), "");
  assert.equal(counted(1, "to-do"), "1 to-do");
  assert.equal(counted(3, "item"), "3 items");
});

test("parsePing rejects anything that isn't our trigger's shape", () => {
  const by = "0b5a3a8e-1c2d-4e5f-8a9b-0c1d2e3f4a5b";
  assert.ok(parsePing({ table: "todos", by, record: { household_id: "x" } }));
  assert.equal(parsePing({ table: "members", by, record: { household_id: "x" } }), null);
  assert.equal(parsePing({ table: "todos", by: "nope", record: { household_id: "x" } }), null);
  assert.equal(parsePing({ table: "todos", by, record: {} }), null);
  assert.equal(parsePing(null), null);
});
