import { test } from "node:test";
import assert from "node:assert/strict";
import { guessAisle, parseItem } from "./shopping.ts";

test("guessAisle: English and Malay, specific aisle wins", () => {
  assert.equal(guessAisle("Susu"), "dairy");
  assert.equal(guessAisle("ayam"), "meat");
  assert.equal(guessAisle("chicken nuggets"), "frozen");
  assert.equal(guessAisle("Orange juice"), "drinks");
  assert.equal(guessAisle("coconut milk"), "pantry");
  assert.equal(guessAisle("garlic bread"), "bakery");
  assert.equal(guessAisle("tomatoes"), "produce");
  assert.equal(guessAisle("tisu tandas"), "household");
  assert.equal(guessAisle("air freshener"), "other");
  assert.equal(guessAisle("hadiah"), "other");
});

test("parseItem pulls out a quantity at either end", () => {
  assert.deepEqual(parseItem("2 susu"), { name: "susu", qty: "2" });
  assert.deepEqual(parseItem("susu x2"), { name: "susu", qty: "2" });
  assert.deepEqual(parseItem("beras 5 kg"), { name: "beras", qty: "5kg" });
  assert.deepEqual(parseItem("1.5L milk"), { name: "milk", qty: "1.5L" });
  assert.deepEqual(parseItem("  telur   30 biji "), { name: "telur", qty: "30biji" });
  assert.deepEqual(parseItem("100plus"), { name: "100plus" });
  assert.deepEqual(parseItem("7 up"), { name: "up", qty: "7" }); // shortcut: a number-led brand name gets read as a quantity; editable in the sheet
  assert.deepEqual(parseItem("milk"), { name: "milk" });
});
