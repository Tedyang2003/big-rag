import { test } from "node:test";
import * as assert from "node:assert/strict";
import { readGenerationSettings, readRetrievalSettings } from "../eval/settings";

test("readRetrievalSettings uses the plugin config defaults when env vars are unset", () => {
  assert.deepEqual(readRetrievalSettings({}), {
    retrievalLimit: 5,
    retrievalThreshold: 0.5,
    chunkSize: 512,
    enableContextCompaction: false,
  });
});

test("readRetrievalSettings reads overrides from env vars", () => {
  assert.deepEqual(
    readRetrievalSettings({
      BIG_RAG_RETRIEVAL_LIMIT: "8",
      BIG_RAG_RETRIEVAL_THRESHOLD: "0.35",
      BIG_RAG_CHUNK_SIZE: "1024",
      BIG_RAG_ENABLE_COMPACTION: "TRUE",
    }),
    { retrievalLimit: 8, retrievalThreshold: 0.35, chunkSize: 1024, enableContextCompaction: true },
  );
});

test("readRetrievalSettings rejects non-numeric values", () => {
  assert.throws(() => readRetrievalSettings({ BIG_RAG_RETRIEVAL_LIMIT: "five" }), /BIG_RAG_RETRIEVAL_LIMIT/);
});

test("readRetrievalSettings rejects an out-of-range retrieval limit", () => {
  assert.throws(() => readRetrievalSettings({ BIG_RAG_RETRIEVAL_LIMIT: "0" }), /BIG_RAG_RETRIEVAL_LIMIT/);
  assert.throws(() => readRetrievalSettings({ BIG_RAG_RETRIEVAL_LIMIT: "21" }), /BIG_RAG_RETRIEVAL_LIMIT/);
  assert.throws(() => readRetrievalSettings({ BIG_RAG_RETRIEVAL_LIMIT: "2.5" }), /BIG_RAG_RETRIEVAL_LIMIT/);
});

test("readRetrievalSettings rejects an out-of-range retrieval threshold", () => {
  assert.throws(() => readRetrievalSettings({ BIG_RAG_RETRIEVAL_THRESHOLD: "-0.1" }), /BIG_RAG_RETRIEVAL_THRESHOLD/);
  assert.throws(() => readRetrievalSettings({ BIG_RAG_RETRIEVAL_THRESHOLD: "1.1" }), /BIG_RAG_RETRIEVAL_THRESHOLD/);
});

test("readRetrievalSettings rejects an out-of-range chunk size", () => {
  assert.throws(() => readRetrievalSettings({ BIG_RAG_CHUNK_SIZE: "64" }), /BIG_RAG_CHUNK_SIZE/);
  assert.throws(() => readRetrievalSettings({ BIG_RAG_CHUNK_SIZE: "4096" }), /BIG_RAG_CHUNK_SIZE/);
  assert.throws(() => readRetrievalSettings({ BIG_RAG_CHUNK_SIZE: "128.5" }), /BIG_RAG_CHUNK_SIZE/);
});

test("readGenerationSettings defaults to 30 questions, seed 42, and leak limit 0.7", () => {
  assert.deepEqual(readGenerationSettings({}), { count: 30, seed: 42, leakLimit: 0.7 });
});

test("readGenerationSettings reads a leak limit override", () => {
  assert.equal(readGenerationSettings({ BIG_RAG_EVAL_LEAK_LIMIT: "0.8" }).leakLimit, 0.8);
  assert.equal(readGenerationSettings({ BIG_RAG_EVAL_LEAK_LIMIT: "1" }).leakLimit, 1);
});

test("readGenerationSettings rejects a leak limit outside 0 to 1", () => {
  assert.throws(() => readGenerationSettings({ BIG_RAG_EVAL_LEAK_LIMIT: "abc" }), /BIG_RAG_EVAL_LEAK_LIMIT/);
  assert.throws(() => readGenerationSettings({ BIG_RAG_EVAL_LEAK_LIMIT: "1.5" }), /BIG_RAG_EVAL_LEAK_LIMIT/);
  assert.throws(() => readGenerationSettings({ BIG_RAG_EVAL_LEAK_LIMIT: "-0.1" }), /BIG_RAG_EVAL_LEAK_LIMIT/);
});

test("readGenerationSettings rejects invalid count and seed values", () => {
  assert.throws(() => readGenerationSettings({ BIG_RAG_EVAL_COUNT: "abc" }), /BIG_RAG_EVAL_COUNT/);
  assert.throws(() => readGenerationSettings({ BIG_RAG_EVAL_COUNT: "0" }), /BIG_RAG_EVAL_COUNT/);
  assert.throws(() => readGenerationSettings({ BIG_RAG_EVAL_COUNT: "2.5" }), /BIG_RAG_EVAL_COUNT/);
  assert.throws(() => readGenerationSettings({ BIG_RAG_EVAL_SEED: "x" }), /BIG_RAG_EVAL_SEED/);
});
