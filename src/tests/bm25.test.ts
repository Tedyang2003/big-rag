import { test } from "node:test";
import * as assert from "node:assert/strict";
import { scoreTerms, tokenize, type Bm25Corpus, type TermEntry } from "../retrieval/bm25";

const OPTIONS = { k1: 1.2, b: 0.75 };

test("tokenize lowercases, drops stop words and short tokens, and trims suffixes", () => {
  assert.deepEqual(tokenize("The buses COLLIDED on the PIE!"), ["bus", "collid", "pie"]);
  assert.deepEqual(tokenize("Collision, collisions; collision."), ["collision", "collision", "collision"]);
  assert.deepEqual(tokenize("report 2026-09-08"), ["report", "2026", "09", "08"]);
  assert.deepEqual(tokenize("the and of to"), []);
  assert.deepEqual(tokenize("   "), []);
});

function corpusOf(entries: Record<string, TermEntry>, wordCounts: number[]): Bm25Corpus {
  return {
    totalChunks: wordCounts.length,
    averageWordCount: wordCounts.reduce((sum, n) => sum + n, 0) / wordCounts.length,
    wordCountOf: (chunkNumber) => wordCounts[chunkNumber] ?? 0,
    entryFor: (term) => entries[term],
  };
}

test("scoreTerms matches the BM25 formula on a hand-computed example", () => {
  const corpus = corpusOf({ collision: { df: 1, postings: [[0, 2]] } }, [10, 10, 10]);
  const scores = scoreTerms(["collision"], corpus, OPTIONS);
  // idf = ln(1 + (3 - 1 + 0.5) / (1 + 0.5)) = 0.980829…
  // tf part = 2 * 2.2 / (2 + 1.2 * (1 - 0.75 + 0.75 * 1)) = 1.375
  assert.ok(Math.abs(scores.get(0)! - 0.980829 * 1.375) < 1e-4, `got ${scores.get(0)}`);
});

test("scoreTerms ranks rare terms above common ones", () => {
  const corpus = corpusOf(
    {
      collision: { df: 1, postings: [[0, 1]] },
      report: { df: 3, postings: [[1, 1]] },
    },
    [10, 10, 10],
  );
  const scores = scoreTerms(["collision", "report"], corpus, OPTIONS);
  assert.ok(scores.get(0)! > scores.get(1)!);
});

test("scoreTerms prefers the shorter chunk at equal term frequency", () => {
  const corpus = corpusOf({ collision: { df: 2, postings: [[0, 1], [1, 1]] } }, [5, 50]);
  const scores = scoreTerms(["collision"], corpus, OPTIONS);
  assert.ok(scores.get(0)! > scores.get(1)!);
});

test("scoreTerms sums across terms and ignores unknown ones", () => {
  const corpus = corpusOf(
    {
      collision: { df: 2, postings: [[0, 1], [1, 1]] },
      bus: { df: 2, postings: [[0, 1], [2, 1]] },
    },
    [10, 10, 10],
  );
  const scores = scoreTerms(["collision", "bus", "zebra"], corpus, OPTIONS);
  assert.equal(scores.size, 3);
  assert.ok(scores.get(0)! > scores.get(1)!);
  assert.equal(scores.get(1), scores.get(2));
});

test("scoreTerms returns nothing for no terms", () => {
  const corpus = corpusOf({}, [10]);
  assert.equal(scoreTerms([], corpus, OPTIONS).size, 0);
});
