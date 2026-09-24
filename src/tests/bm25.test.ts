import { test } from "node:test";
import * as assert from "node:assert/strict";
import { rankTexts, tokenize } from "../retrieval/bm25";

const OPTIONS = { k1: 1.2, b: 0.75 };

test("tokenize lowercases, drops stop words and short tokens, and trims suffixes", () => {
  assert.deepEqual(tokenize("The buses COLLIDED on the PIE!"), ["bus", "collid", "pie"]);
  assert.deepEqual(tokenize("Collision, collisions; collision."), ["collision", "collision", "collision"]);
  assert.deepEqual(tokenize("report 2026-09-08"), ["report", "2026", "09", "08"]);
  assert.deepEqual(tokenize("the and of to"), []);
  assert.deepEqual(tokenize("   "), []);
});

test("rankTexts puts the candidate matching more of the query first", () => {
  const ranked = rankTexts(
    ["bus", "collision"],
    [
      { key: "neither", text: "timetable notice for the new term" },
      { key: "one", text: "bus route update for commuters" },
      { key: "both", text: "bus collision on the expressway" },
    ],
    OPTIONS,
  );
  assert.deepEqual(ranked, ["both", "one"]);
});

test("a term every candidate shares carries no weight, however rare it is elsewhere", () => {
  // "ulta" is rare across a real corpus but sits on every page of one filing, so among
  // these candidates it separates nothing; "expenditure" appears once and decides the order.
  const ranked = rankTexts(
    ["ulta", "expenditure"],
    [
      { key: "boilerplate", text: "about ulta ulta ulta beauty stores and locations" },
      { key: "narrative", text: "ulta discussion of liquidity and capital resources" },
      { key: "statement", text: "ulta capital expenditure of 250 million" },
    ],
    OPTIONS,
  );
  assert.equal(ranked[0], "statement");
});

test("rankTexts prefers the shorter candidate at equal term frequency", () => {
  const ranked = rankTexts(
    ["collision"],
    [
      { key: "long", text: `collision ${"filler ".repeat(49).trim()}` },
      { key: "short", text: `collision ${"filler ".repeat(4).trim()}` },
      { key: "other", text: "unrelated timetable notice" },
    ],
    OPTIONS,
  );
  assert.deepEqual(ranked, ["short", "long"]);
});

test("rankTexts drops candidates no query term reaches", () => {
  const ranked = rankTexts(
    ["collision"],
    [
      { key: "none", text: "timetable changes for the new term" },
      { key: "hit", text: "bus collision on the expressway" },
    ],
    OPTIONS,
  );
  assert.deepEqual(ranked, ["hit"]);
});

test("rankTexts returns nothing when nothing can be ranked", () => {
  const candidates = [{ key: "a", text: "bus collision" }];
  assert.deepEqual(rankTexts([], candidates, OPTIONS), []);
  assert.deepEqual(rankTexts(["collision"], [], OPTIONS), []);
  assert.deepEqual(rankTexts(["zebra"], candidates, OPTIONS), []);
});
