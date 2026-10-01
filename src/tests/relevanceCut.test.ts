import { test } from "node:test";
import * as assert from "node:assert/strict";
import { dropWeakPassages, passagesForPrompt } from "../utils/relevanceCut";
import { type SearchResult } from "../vectorstore/vectorStore";

function passage(id: string, similarity: number, score = 0.016): SearchResult {
  return {
    id, text: id, score, similarity, filePath: `/docs/${id}.md`,
    fileName: `${id}.md`, chunkIndex: 0, shardName: "shard_000", metadata: {},
  };
}

test("passages far below the best one are dropped", () => {
  // The shape of the real failure: one good match, then whatever else the corpus had.
  const kept = dropWeakPassages(
    [passage("answer", 0.82), passage("advert", 0.55), passage("ocr-noise", 0.51)],
    0.9,
  );
  assert.deepEqual(kept.map((p) => p.id), ["answer"]);
});

test("comparably good passages are all kept", () => {
  const kept = dropWeakPassages(
    [passage("a", 0.80), passage("b", 0.78), passage("c", 0.76)],
    0.9,
  );
  assert.equal(kept.length, 3);
});

test("the best passage is never dropped, however weak the whole set is", () => {
  const kept = dropWeakPassages([passage("weak", 0.20), passage("weaker", 0.05)], 0.9);
  assert.deepEqual(kept.map((p) => p.id), ["weak"]);
});

test("the fused score is not used when a similarity is present", () => {
  // Fused scores are reciprocal-rank sums, nearly equal for every passage, so cutting on them
  // would never drop anything. The similarity is what says whether a passage is on topic.
  const kept = dropWeakPassages(
    [passage("answer", 0.82, 0.0164), passage("noise", 0.40, 0.0161)],
    0.9,
  );
  assert.deepEqual(kept.map((p) => p.id), ["answer"]);
});

test("without a similarity it falls back to the score, which at Low depth is the similarity", () => {
  // Low depth does not fuse, so SearchResult.score is still the cosine and cutting on it is right.
  const unfused = [passage("answer", 0, 0.80), passage("noise", 0, 0.40)].map(
    ({ similarity, ...rest }) => rest as SearchResult,
  );
  assert.deepEqual(dropWeakPassages(unfused, 0.9).map((p) => p.id), ["answer"]);
});

test("a cut of zero is off", () => {
  const all = [passage("a", 0.9), passage("b", 0.1)];
  assert.equal(dropWeakPassages(all, 0).length, 2);
});

test("the prompt gets the top passages with the best one last", () => {
  const ranked = [passage("best", 0.9), passage("second", 0.8), passage("third", 0.7), passage("fourth", 0.6)];

  assert.deepEqual(
    passagesForPrompt(ranked, 3).map((p) => p.id),
    ["third", "second", "best"],
    "the three best, nearest-last",
  );
  assert.deepEqual(passagesForPrompt(ranked, 1).map((p) => p.id), ["best"]);
  assert.deepEqual(passagesForPrompt(ranked, 0).map((p) => p.id), []);
  assert.deepEqual(
    passagesForPrompt(ranked, 99).map((p) => p.id),
    ["fourth", "third", "second", "best"],
    "asking for more than exist is not an error",
  );
});
