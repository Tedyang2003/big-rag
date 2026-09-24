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
  laneCandidatesPerFile: 3,
  rrfConstant: 60,
  laneWeightVector: 1,
  // Measured on FinanceBench: nominating keyword candidates cost 3 of 12 hits and half the
  // rank-1 answers, because BM25 fills the shortlist with a document's boilerplate. Dates,
  // which only lift passages another lane already found, gained 2. See documentation/Evaluation.md.
  laneWeightKeyword: 0,
  laneWeightDate: 1,
  catalogMaxChunks: 50000,
  bm25K1: 1.2,
  bm25B: 0.75,
  catalogVersion: 1,
} as const;
