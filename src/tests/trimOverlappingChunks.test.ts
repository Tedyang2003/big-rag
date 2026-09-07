import { test } from "node:test";
import * as assert from "node:assert/strict";
import { trimOverlappingChunks } from "../utils/trimOverlappingChunks";
import { type SearchResult } from "../vectorstore/vectorStore";

function makeResult(overrides: Partial<SearchResult> & { text: string }): SearchResult {
  return {
    score: 0.9,
    filePath: "A.md",
    fileName: "A.md",
    chunkIndex: 0,
    shardName: "shard_000",
    metadata: {},
    ...overrides,
  };
}

test("trimOverlappingChunks strips shared words from the later of two adjacent chunks", () => {
  // chunk0 covers words 0-5 ("one two three four five"), chunk1 covers words
  // 3-8 ("four five six seven eight") - words 3-5 ("four five") are shared.
  const chunk0 = makeResult({
    text: "one two three four five",
    chunkIndex: 0,
    metadata: { startIndex: 0, endIndex: 5 },
  });
  const chunk1 = makeResult({
    text: "four five six seven eight",
    chunkIndex: 1,
    metadata: { startIndex: 3, endIndex: 8 },
  });

  const trimmed = trimOverlappingChunks([chunk0, chunk1]);

  assert.equal(trimmed[0].text, "one two three four five", "earlier chunk is untouched");
  assert.equal(trimmed[1].text, "six seven eight", "later chunk loses only the shared words");
});

test("trimOverlappingChunks leaves non-adjacent chunks from the same file untouched", () => {
  const chunk0 = makeResult({
    text: "one two three four five",
    chunkIndex: 0,
    metadata: { startIndex: 0, endIndex: 5 },
  });
  const chunk2 = makeResult({
    text: "eleven twelve thirteen",
    chunkIndex: 2, // not adjacent to chunk0 - can't share words under sliding-window chunking
    metadata: { startIndex: 10, endIndex: 13 },
  });

  const trimmed = trimOverlappingChunks([chunk0, chunk2]);

  assert.equal(trimmed[0].text, "one two three four five");
  assert.equal(trimmed[1].text, "eleven twelve thirteen");
});

test("trimOverlappingChunks leaves chunks from different files untouched", () => {
  const fromA = makeResult({
    text: "one two three four five",
    filePath: "A.md",
    fileName: "A.md",
    chunkIndex: 0,
    metadata: { startIndex: 0, endIndex: 5 },
  });
  const fromB = makeResult({
    text: "four five six seven eight",
    filePath: "B.md",
    fileName: "B.md",
    chunkIndex: 1, // same chunkIndex-adjacency shape, but a different file
    metadata: { startIndex: 3, endIndex: 8 },
  });

  const trimmed = trimOverlappingChunks([fromA, fromB]);

  assert.equal(trimmed[0].text, "one two three four five");
  assert.equal(trimmed[1].text, "four five six seven eight");
});

test("trimOverlappingChunks is a no-op when metadata is missing startIndex/endIndex", () => {
  const chunk0 = makeResult({ text: "one two three four five", chunkIndex: 0, metadata: {} });
  const chunk1 = makeResult({ text: "four five six seven eight", chunkIndex: 1, metadata: {} });

  const trimmed = trimOverlappingChunks([chunk0, chunk1]);

  assert.equal(trimmed[0].text, "one two three four five");
  assert.equal(trimmed[1].text, "four five six seven eight");
});

test("trimOverlappingChunks does not empty out a chunk when overlap metadata looks inconsistent", () => {
  const chunk0 = makeResult({
    text: "one two",
    chunkIndex: 0,
    metadata: { startIndex: 0, endIndex: 100 }, // claims to cover far more than its own word count
  });
  const chunk1 = makeResult({
    text: "three four",
    chunkIndex: 1,
    metadata: { startIndex: 1, endIndex: 5 },
  });

  const trimmed = trimOverlappingChunks([chunk0, chunk1]);

  assert.equal(trimmed[1].text, "three four", "chunk text is left intact rather than trimmed to empty");
});

test("trimOverlappingChunks preserves result order and only touches text", () => {
  const chunk1 = makeResult({
    text: "four five six seven eight",
    chunkIndex: 1,
    score: 0.95,
    metadata: { startIndex: 3, endIndex: 8 },
  });
  const chunk0 = makeResult({
    text: "one two three four five",
    chunkIndex: 0,
    score: 0.8,
    metadata: { startIndex: 0, endIndex: 5 },
  });

  // Results arrive sorted by score (chunk1 first), not by document position.
  const trimmed = trimOverlappingChunks([chunk1, chunk0]);

  assert.equal(trimmed[0].score, 0.95, "order by score is preserved");
  assert.equal(trimmed[0].text, "six seven eight", "later-positioned chunk (by startIndex) is trimmed regardless of score order");
  assert.equal(trimmed[1].text, "one two three four five");
});
