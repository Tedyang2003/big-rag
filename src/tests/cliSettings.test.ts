import { test } from "node:test";
import * as assert from "node:assert/strict";
import { readCliIndexingSettings } from "../settings/cliSettings";
import { FIXED_DEFAULTS } from "../settings/defaults";
import { readRetrievalSettings } from "../eval/settings";

test("FIXED_DEFAULTS holds the spec's fixed values", () => {
  assert.deepEqual({ ...FIXED_DEFAULTS }, {
    retrievalLimit: 5,
    retrievalThreshold: 0.5,
    chunkSize: 512,
    chunkOverlap: 100,
    maxConcurrentFiles: 1,
    parseDelayMs: 500,
    enableOCR: true,
    structuredIndexing: true,
    enableContextCompaction: false,
    laneCandidates: 30,
    rrfConstant: 60,
    laneWeightVector: 1,
    laneWeightKeyword: 1,
    laneWeightDate: 1,
    catalogMaxChunks: 50000,
    bm25K1: 1.2,
    bm25B: 0.75,
    catalogVersion: 1,
  });
});

test("readCliIndexingSettings uses the fixed defaults when env vars are unset", () => {
  assert.deepEqual(readCliIndexingSettings({}), {
    chunkSize: FIXED_DEFAULTS.chunkSize,
    chunkOverlap: FIXED_DEFAULTS.chunkOverlap,
    maxConcurrent: FIXED_DEFAULTS.maxConcurrentFiles,
    enableOCR: FIXED_DEFAULTS.enableOCR,
    parseDelayMs: FIXED_DEFAULTS.parseDelayMs,
    structuredIndexing: FIXED_DEFAULTS.structuredIndexing,
  });
});

test("readCliIndexingSettings reads env overrides", () => {
  assert.deepEqual(
    readCliIndexingSettings({
      BIG_RAG_CHUNK_SIZE: "1024",
      BIG_RAG_CHUNK_OVERLAP: "0",
      BIG_RAG_MAX_CONCURRENT: "4",
      BIG_RAG_ENABLE_OCR: "false",
      BIG_RAG_PARSE_DELAY_MS: "0",
      BIG_RAG_STRUCTURED_INDEXING: "FALSE",
    }),
    { chunkSize: 1024, chunkOverlap: 0, maxConcurrent: 4, enableOCR: false, parseDelayMs: 0, structuredIndexing: false },
  );
});

test("eval retrieval settings use the fixed defaults when env vars are unset", () => {
  assert.deepEqual(readRetrievalSettings({}), {
    retrievalLimit: FIXED_DEFAULTS.retrievalLimit,
    retrievalThreshold: FIXED_DEFAULTS.retrievalThreshold,
    chunkSize: FIXED_DEFAULTS.chunkSize,
    enableContextCompaction: FIXED_DEFAULTS.enableContextCompaction,
    retrievalDepth: "medium",
  });
});
