import { test } from "node:test";
import * as assert from "node:assert/strict";
import { rankTexts, tokenize, type Bm25Stats } from "../retrieval/bm25";

const OPTIONS = { k1: 1.2, b: 0.75 };

test("tokenize lowercases, drops stop words and short tokens, and trims suffixes", () => {
  assert.deepEqual(tokenize("The buses COLLIDED on the PIE!"), ["bus", "collid", "pie"]);
  assert.deepEqual(tokenize("Collision, collisions; collision."), ["collision", "collision", "collision"]);
  assert.deepEqual(tokenize("report 2026-09-08"), ["report", "2026", "09", "08"]);
  assert.deepEqual(tokenize("the and of to"), []);
  assert.deepEqual(tokenize("   "), []);
});

function statsOf(df: Record<string, number>, totalChunks: number, averageWordCount: number): Bm25Stats {
  return { totalChunks, averageWordCount, documentFrequency: (term) => df[term] ?? 0 };
}

test("rankTexts matches the BM25 formula on a hand-computed example", () => {
  // The candidate tokenizes to 10 terms, 2 of them "collision".
  const text = `collision collision ${"filler ".repeat(8).trim()}`;
  const ranked = rankTexts(["collision"], [{ key: "a", text }], statsOf({ collision: 1 }, 3, 10), OPTIONS);
  assert.deepEqual(ranked, ["a"]);
});

test("rankTexts puts the passage carrying the rarer term first", () => {
  const stats = statsOf({ collision: 1, report: 3 }, 3, 10);
  const ranked = rankTexts(
    ["collision", "report"],
    [
      { key: "common", text: `report ${"filler ".repeat(9).trim()}` },
      { key: "rare", text: `collision ${"filler ".repeat(9).trim()}` },
    ],
    stats,
    OPTIONS,
  );
  assert.deepEqual(ranked, ["rare", "common"]);
});

test("rankTexts prefers the shorter passage at equal term frequency", () => {
  const ranked = rankTexts(
    ["collision"],
    [
      { key: "long", text: `collision ${"filler ".repeat(49).trim()}` },
      { key: "short", text: `collision ${"filler ".repeat(4).trim()}` },
    ],
    statsOf({ collision: 2 }, 3, 10),
    OPTIONS,
  );
  assert.deepEqual(ranked, ["short", "long"]);
});

test("rankTexts drops passages no query term reaches", () => {
  const ranked = rankTexts(
    ["collision", "bus"],
    [
      { key: "none", text: "timetable changes for the new term" },
      { key: "one", text: "bus route update" },
      { key: "both", text: "bus collision on the expressway" },
    ],
    statsOf({ collision: 1, bus: 2 }, 3, 6),
    OPTIONS,
  );
  assert.deepEqual(ranked, ["both", "one"]);
});

test("rankTexts ignores terms the corpus has never seen", () => {
  const withUnknown = rankTexts(
    ["collision", "zebra"],
    [{ key: "a", text: "bus collision on the expressway" }],
    statsOf({ collision: 1 }, 3, 6),
    OPTIONS,
  );
  assert.deepEqual(withUnknown, ["a"]);
});

test("rankTexts returns nothing without terms, candidates, or a corpus", () => {
  const candidates = [{ key: "a", text: "bus collision" }];
  assert.deepEqual(rankTexts([], candidates, statsOf({}, 3, 10), OPTIONS), []);
  assert.deepEqual(rankTexts(["collision"], [], statsOf({ collision: 1 }, 3, 10), OPTIONS), []);
  assert.deepEqual(rankTexts(["collision"], candidates, statsOf({ collision: 1 }, 0, 0), OPTIONS), []);
});
