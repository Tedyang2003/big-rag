import { test } from "node:test";
import * as assert from "node:assert/strict";
import { sampleChunksAcrossFiles, MIN_CHUNK_WORDS } from "../eval/sampleChunks";
import { type IndexedChunk } from "../vectorstore/vectorStore";

function words(n: number): string {
  return Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
}

function chunk(filePath: string, chunkIndex: number, wordCount = MIN_CHUNK_WORDS): IndexedChunk {
  return { id: `${filePath}-${chunkIndex}`, shardName: "shard_000", text: words(wordCount), filePath, fileName: filePath, chunkIndex, metadata: {} };
}

function countByFile(chunks: IndexedChunk[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const c of chunks) counts[c.filePath] = (counts[c.filePath] ?? 0) + 1;
  return counts;
}

test("sampleChunksAcrossFiles spreads evenly across files", () => {
  const chunks = ["a", "b", "c"].flatMap((f) => Array.from({ length: 10 }, (_, i) => chunk(f, i)));
  const sampled = sampleChunksAcrossFiles(chunks, 6, 42);
  assert.equal(sampled.length, 6);
  assert.deepEqual(countByFile(sampled), { a: 2, b: 2, c: 2 });
});

test("sampleChunksAcrossFiles takes the rest from larger files when a file runs out", () => {
  const chunks = [
    ...Array.from({ length: 30 }, (_, i) => chunk("big", i)),
    ...Array.from({ length: 2 }, (_, i) => chunk("small", i)),
  ];
  const sampled = sampleChunksAcrossFiles(chunks, 6, 42);
  assert.deepEqual(countByFile(sampled), { big: 4, small: 2 });
});

test("sampleChunksAcrossFiles skips chunks shorter than MIN_CHUNK_WORDS", () => {
  const chunks = [chunk("a", 0, MIN_CHUNK_WORDS - 1), chunk("a", 1, MIN_CHUNK_WORDS)];
  const sampled = sampleChunksAcrossFiles(chunks, 5, 42);
  assert.deepEqual(sampled.map((c) => c.chunkIndex), [1]);
});

test("sampleChunksAcrossFiles is deterministic for the same seed regardless of input order", () => {
  const chunks = ["a", "b"].flatMap((f) => Array.from({ length: 8 }, (_, i) => chunk(f, i)));
  const first = sampleChunksAcrossFiles(chunks, 5, 7).map((c) => `${c.filePath}:${c.chunkIndex}`);
  const second = sampleChunksAcrossFiles([...chunks].reverse(), 5, 7).map((c) => `${c.filePath}:${c.chunkIndex}`);
  assert.deepEqual(first, second);
});
