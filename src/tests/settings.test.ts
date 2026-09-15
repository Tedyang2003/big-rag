import { test } from "node:test";
import * as assert from "node:assert/strict";
import { readRetrievalSettings } from "../eval/settings";

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
