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
  // How many of BM25's top passages collect a boost. A boost every candidate receives is a
  // constant added to every row, which changes no ordering: almost any passage of a document
  // contains some query term, so the reranker only separates anything if most candidates come
  // away with nothing. Small values trust BM25 over the vector lane; see documentation/Evaluation.md.
  rerankDepth: 10,
  rrfConstant: 60,
  laneWeightVector: 1,
  // Off by default. BM25 was measured three ways on FinanceBench - nominating its own
  // candidates, reranking with corpus idf, reranking with idf counted over the candidates -
  // and the best of them only tied the date boost on hits while costing three rank-1 answers
  // and a fifth of the mean reciprocal rank. By the time 50 candidates are in hand the
  // question BM25 answers well, which document this is, is already settled. The reranker
  // costs 1ms, so it stays available for collections where words identify a passage rather
  // than a document; see documentation/Evaluation.md.
  laneWeightKeyword: 0,
  laneWeightDate: 1,
  bm25K1: 1.2,
  bm25B: 0.75,
  catalogVersion: 3,
} as const;
