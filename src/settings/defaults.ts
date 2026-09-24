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
  laneCandidates: 30,
  rrfConstant: 60,
  laneWeightVector: 1,
  // Keywords and dates are both boosts over the vector lane's candidates, so neither can
  // flood the shortlist and both are worth what topping a lane of their own was worth.
  laneWeightKeyword: 1,
  laneWeightDate: 1,
  bm25K1: 1.2,
  bm25B: 0.75,
  catalogVersion: 2,
} as const;
