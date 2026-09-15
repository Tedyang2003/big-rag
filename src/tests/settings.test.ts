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

test("readGenerationSettings defaults to 30 questions and seed 42", () => {
  assert.deepEqual(readGenerationSettings({}), { count: 30, seed: 42 });
});

test("readGenerationSettings rejects invalid count and seed values", () => {
  assert.throws(() => readGenerationSettings({ BIG_RAG_EVAL_COUNT: "abc" }), /BIG_RAG_EVAL_COUNT/);
  assert.throws(() => readGenerationSettings({ BIG_RAG_EVAL_COUNT: "0" }), /BIG_RAG_EVAL_COUNT/);
  assert.throws(() => readGenerationSettings({ BIG_RAG_EVAL_COUNT: "2.5" }), /BIG_RAG_EVAL_COUNT/);
  assert.throws(() => readGenerationSettings({ BIG_RAG_EVAL_SEED: "x" }), /BIG_RAG_EVAL_SEED/);
});
