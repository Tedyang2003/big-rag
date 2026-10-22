import { test } from "node:test";
import * as assert from "node:assert/strict";
import { rankByBm25, bm25Tokenize } from "../retrieval/bm25";

const OPTIONS = { k1: 1.2, b: 0.75 };

test("bm25Tokenize lowercases, drops stop words and short tokens, and trims suffixes", () => {
  assert.deepEqual(bm25Tokenize("The buses COLLIDED on the PIE!"), ["bus", "collid", "pie"]);
  assert.deepEqual(bm25Tokenize("Collision, collisions; collision."), ["collision", "collision", "collision"]);
  assert.deepEqual(bm25Tokenize("report 2026-09-08"), ["report", "2026", "09", "08"]);
  assert.deepEqual(bm25Tokenize("the and of to"), []);
  assert.deepEqual(bm25Tokenize("   "), []);
});

test("rankByBm25 puts the candidate matching more of the query first", () => {
  const ranked = rankByBm25(
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
  const ranked = rankByBm25(
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

test("rankByBm25 prefers the shorter candidate at equal term frequency", () => {
  const ranked = rankByBm25(
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

test("rankByBm25 drops candidates no query term reaches", () => {
  const ranked = rankByBm25(
    ["collision"],
    [
      { key: "none", text: "timetable changes for the new term" },
      { key: "hit", text: "bus collision on the expressway" },
    ],
    OPTIONS,
  );
  assert.deepEqual(ranked, ["hit"]);
});

test("rankByBm25 returns nothing when nothing can be ranked", () => {
  const candidates = [{ key: "a", text: "bus collision" }];
  assert.deepEqual(rankByBm25([], candidates, OPTIONS), []);
  assert.deepEqual(rankByBm25(["collision"], [], OPTIONS), []);
  assert.deepEqual(rankByBm25(["zebra"], candidates, OPTIONS), []);
});
