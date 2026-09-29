/**
 * Values that are not exposed as plugin settings. The plugin always uses
 * these; the CLI indexer and eval harness use them unless a BIG_RAG_* env var
 * overrides them.
 */
export const FIXED_DEFAULTS = {
  retrievalLimit: 5,
  retrievalThreshold: 0.5,
  chunkSize: 512,
  chunkOverlap: 100,
  maxConcurrentFiles: 1,
  parseDelayMs: 500,
  enableOCR: true,
  structuredIndexing: true,
  enableContextCompaction: false,
  laneCandidates: 50,
  rrfConstant: 60,
  // A passage that continues into the next chunk is returned with it, when that chunk is already
  // a candidate. Worth 7 of 88 questions on FinanceBench, where four answers ran past the end of
  // the chunk chosen and three sat beside it. See documentation/Evaluation.md.
  neighbourChunks: 1,
  laneWeightVector: 1,
  laneWeightHyde: 1,
  // Off by default: measured four ways on FinanceBench and never better than the date boost.
  // Restored to test the one explanation never checked - that it failed there because a
  // filing's distinctive words sit on every page of it. See documentation/Evaluation.md.
  laneWeightKeyword: 0,
  rerankDepth: 10,
  bm25K1: 1.2,
  bm25B: 0,
  laneWeightDate: 1,
  catalogVersion: 4,
  // Bounds a pathological generator at High depth; drafting measured a median 542ms.
  hypotheticalTimeoutMs: 10_000,
} as const;
