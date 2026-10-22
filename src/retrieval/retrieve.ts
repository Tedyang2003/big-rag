import { chunkKey, type SearchResult, type VectorStore } from "../vectorstore/vectorStore";
import { trimOverlappingChunks } from "../utils/trimOverlappingChunks";
import { rankByBm25, bm25Tokenize } from "./bm25";
import { fuseLanes, type RankedLane } from "./fuse";
import { queryDayRanges, type DayRange } from "./queryDates";

export type StageName =
  | "embedQuery"
  | "hypothetical"
  | "keywordRerank"
  | "vectorSearch"
  | "dateLane"
  | "fuse"
  | "trimOverlap";

export interface StageTiming {
  stage: StageName;
  ms: number;
}

export type RetrievalDepth = "low" | "medium" | "high";

/** The subset of ChunkCatalog the retrieval lanes need. */
export interface CatalogLanes {
  chunksForRanges(ranges: DayRange[]): number[];
  keyOf(chunkNumber: number): string;
  yearsPresent(): number[];
}

/**
 * Four signals contribute to a ranking, and they are not the same kind of thing.
 *
 * NOMINATORS put passages in the pool. Only `vector` and `hyde` do this, and only they become
 * `RankedLane`s passed to `fuseLanes`. Turning one off changes which passages exist at all.
 *
 * BOOSTS only reorder what a nominator already found. `keyword` (BM25) and `date` are applied
 * as score additions AFTER fusion, so neither can introduce a passage and neither can change
 * the pool. That is why the pool figure in Evaluation.md is identical with keyword reranking
 * on or off, and moves only when HyDE comes on.
 *
 * The settings, the environment variables and the eval reports call all four "lanes"
 * (`laneWeights`, `BIG_RAG_LANE_WEIGHT_*`, `returned[].lanes`). Those names are a measurement
 * contract, kept so reports already on disk stay comparable; this comment is the correction.
 */
export interface SignalCounts {
  vector: number;
  hyde: number;
  keyword: number;
  date: number;
}

export interface RetrieveDeps {
  vectorStore: Pick<VectorStore, "searchMany">;
  embedQuery: (text: string) => Promise<number[]>;
  now?: () => number;
  /** Present at Medium and High depth; null when it could not be built. */
  catalog?: CatalogLanes | null;
  /** Clock for relative date phrases in the query. */
  nowDate?: () => Date;
  /**
   * Drafts a passage that would answer the question, for High depth to search alongside it.
   * Returns null when none could be produced, which makes High behave as Medium. Absent at
   * Low and Medium, where it is never called.
   */
  hypothetical?: (question: string) => Promise<string | null>;
}

export interface RetrieveOptions {
  retrievalLimit: number;
  retrievalThreshold: number;
  chunkSize: number;
  /** When set, also return the top-N vector matches with no threshold, for evaluation diagnostics. */
  diagnosticPoolSize?: number;
  /** Checked between stages so a cancelled request stops before doing more work. */
  abortSignal?: AbortSignal;
  depth: RetrievalDepth;
  /** Passages each lane puts up for fusion. */
  laneCandidates: number;
  rrfConstant: number;
  /**
   * Chunks either side of a winner to return with it, when they are already among the
   * candidates. 0 returns winners alone.
   */
  neighbourChunks: number;
  /** How many of BM25's top passages collect a boost; the rest collect nothing. */
  rerankDepth: number;
  bm25K1: number;
  bm25B: number;
  laneWeights: { vector: number; hyde: number; keyword: number; date: number };
}

export interface RetrieveResult {
  passages: SearchResult[];
  diagnosticPool: SearchResult[];
  timings: StageTiming[];
  signalCounts: SignalCounts;
  /** Lanes that ranked each returned passage, aligned with `passages`; empty arrays at Low depth. */
  passageLanes: string[][];
  /** Day ranges parsed from the query; empty when it named no date. */
  dayRanges: DayRange[];
}

/**
 * Adds the chunks either side of each chosen passage, when they are already among the
 * candidates, so a passage that continues into its neighbour is returned whole.
 *
 * Measured on FinanceBench: of the answers found but not returned, four were evidence whose span
 * continued into a chunk left behind and three were chunks whose neighbour had been chosen
 * instead. Nothing is fetched - a neighbour that no lane retrieved stays absent - so this costs
 * no search and only the tokens of the chunks it adds. Each addition keeps its neighbour's score
 * so it sorts beside it, and `trimOverlappingChunks` then removes any words they share.
 */
function withNeighbours(
  chosen: SearchResult[],
  candidates: Map<string, SearchResult>,
  neighbourChunks: number,
): SearchResult[] {
  if (neighbourChunks <= 0 || chosen.length === 0) return chosen;

  const byPosition = new Map<string, SearchResult>();
  for (const candidate of candidates.values()) {
    byPosition.set(`${candidate.filePath}::${candidate.chunkIndex}`, candidate);
  }

  const out: SearchResult[] = [];
  const taken = new Set(chosen.map((result) => `${result.filePath}::${result.chunkIndex}`));
  for (const result of chosen) {
    // Ascending, so a passage and its continuation reach the model the way the document has
    // them. Emitting the winner first put chunk 5 before chunk 4, which reads backwards.
    for (let offset = -neighbourChunks; offset <= neighbourChunks; offset++) {
      if (offset === 0) {
        out.push(result);
        continue;
      }
      const key = `${result.filePath}::${result.chunkIndex + offset}`;
      const neighbour = byPosition.get(key);
      if (!neighbour || taken.has(key)) continue;
      taken.add(key);
      // A neighbour is kept for its adjacency, not its own relevance, so it inherits both.
      out.push({ ...neighbour, score: result.score, similarity: result.similarity ?? result.score });
    }
  }
  return out;
}

/** Runs a ranking stage, returning an empty list if it fails so one stage cannot fail the query. */
async function safeLane(name: string, run: () => Promise<string[]>): Promise<string[]> {
  try {
    return await run();
  } catch (error) {
    console.warn(`[BigRAG] ${name} lane failed; continuing without it:`, error);
    return [];
  }
}

export async function retrieve(
  query: string,
  deps: RetrieveDeps,
  options: RetrieveOptions,
): Promise<RetrieveResult> {
  const now = deps.now ?? (() => performance.now());
  const timings: StageTiming[] = [];

  async function timed<T>(stage: StageName, run: () => Promise<T>): Promise<T> {
    const start = now();
    const value = await run();
    timings.push({ stage, ms: now() - start });
    return value;
  }

  const queryEmbedding = await timed("embedQuery", () => deps.embedQuery(query));
  options.abortSignal?.throwIfAborted();

  // Medium and High both fuse and both need the catalog; only High drafts a hypothetical.
  const fusing = options.depth === "medium" || options.depth === "high";

  // When fusing, expand candidates for wider search, else use retrieve limit
  const searchLimit = fusing ? options.laneCandidates : options.retrievalLimit;

 // If the depth is high, use HyDE for hypothetical answer to query for vector search
  let hypotheticalEmbedding: number[] | null = null;
  if (options.depth === "high" && deps.hypothetical) {
    hypotheticalEmbedding = await timed("hypothetical", async () => {
      const drafted = await deps.hypothetical!(query);
      return drafted === null ? null : await deps.embedQuery(drafted);
    });
    options.abortSignal?.throwIfAborted();
  }

  // Combine the embeddings if HyDE is used
  const queryVectors = hypotheticalEmbedding ? [queryEmbedding, hypotheticalEmbedding] : [queryEmbedding];
  
  
  // One pass for both vectors: a search is mostly the cost of parsing each shard, which two
  // separate searches would pay twice.
  const [searched, hypotheticalResults = []] = await timed("vectorSearch", () =>
    deps.vectorStore.searchMany(queryVectors, searchLimit, options.retrievalThreshold),
  );
  
  options.abortSignal?.throwIfAborted();

  // If low, dont use catalog, normalize to null
  const catalog = fusing ? deps.catalog ?? null : null;

  // How many returned passages each lane contributed to
  const signalCounts: SignalCounts = { vector: 0, hyde: 0, keyword: 0, date: 0 };
  
  // Dates parsed from query
  let dayRanges: DayRange[] = [];

  // Result ranks
  let ranked: SearchResult[] = searched;
  
  // Chunk key -> which lanes ranked it
  let winnerLanesByKey: Map<string, string[]> | null = null;

  // Fused Ranking for large pool. (Drop weak later)
  let fusedKeys: string[] | null = null;


  // Every passage in play, by key: both lanes' results, since either may nominate one.
  const resolvedByKey = new Map<string, SearchResult>();


  // If a catalog is built, use date boost and key boost and hyde for reranking
  // Gated on depth, not on the catalog. Only the date lane reads the catalog, so a catalog
  // that failed to build must not also take fusion, keyword reranking and neighbour expansion
  // with it - on QASPER those are worth 77 of 228 hits and none of them is about dates.
  if (fusing) {
    // Dates are a boost, not a source of candidates. A year says which documents are
    // eligible, not which passage answers the question, so a chunk is never retrieved
    // because of its date - it is only lifted once another lane has found it.
    const datedKeys = !catalog
      ? []
      : await timed("dateLane", () =>
          safeLane("date", async () => {
            dayRanges = queryDayRanges(query, {
              now: deps.nowDate?.() ?? new Date(),
              yearsPresent: catalog.yearsPresent(),
            });
            if (dayRanges.length === 0) return [];
            return catalog.chunksForRanges(dayRanges).map((chunkNumber) => catalog.keyOf(chunkNumber));
          }),
        );
    options.abortSignal?.throwIfAborted();

    // Package vectors into lane objects
    const vectorByKey = new Map(searched.map((result) => [chunkKey(result), result]));
    for (const [key, result] of vectorByKey) resolvedByKey.set(key, result);
    const lanes: RankedLane[] = [
      { name: "vector", weight: options.laneWeights.vector, keys: [...vectorByKey.keys()] },
    ];

    // The hypothetical nominates, where dates only boost. That is deliberate and measured: its
    // value is recall - it reached passages the question alone never did - and a boost can only
    // move what another lane already found.
    if (hypotheticalResults.length > 0) {
      for (const result of hypotheticalResults) resolvedByKey.set(chunkKey(result), result);
      lanes.push({
        name: "hyde",
        weight: options.laneWeights.hyde,
        keys: hypotheticalResults.map(chunkKey),
      });
    }


    

    // Keywords reorder what the other lanes found; they never nominate. Measured on
    // FinanceBench, letting BM25 nominate cost 3 of 12 hits, because it fills the shortlist
    // with a document's boilerplate. Document frequency is counted over the candidates, not
    // the corpus, so a term every candidate shares carries no weight.
    //
    // Must come after both lanes have populated resolvedByKey, or it scores nothing. Skipped
    // entirely at weight 0, so a run made to measure retrieval without it is without it.
    // The idf is built based on the resolvedByKey items not the entire db
    const keywordRanking =
      options.laneWeights.keyword === 0
        ? []
        : await timed("keywordRerank", () =>
            safeLane("keyword", async () =>
              rankByBm25(
                bm25Tokenize(query),
                [...resolvedByKey.values()].map((result) => ({ key: chunkKey(result), text: result.text })),
                { k1: options.bm25K1, b: options.bm25B },
              ),
            ),
          );
    options.abortSignal?.throwIfAborted();

    const dated = new Set(datedKeys);
    const dateBoost = options.laneWeights.date / (options.rrfConstant + 1);
    
    // This is where reranking actually happens. The "keywordRerank" stage above only scores;
    // both boosts are applied here and the single sort at the end is the reorder. The stage
    // names are kept as they are because they are keys in every eval report's latency map.
    const fused = await timed("fuse", async () => {
      const ranking = fuseLanes(lanes, options.rrfConstant);
      let boosted = false;

      // Only BM25's first rerankDepth passages are boosted. Fusion is flat - the whole spread
      // from rank 1 to rank 50 is worth less than having a boost at all - and nearly every
      // candidate holds some query term, so boosting them all reorders nothing.
      const byKey = new Map(ranking.map((entry) => [entry.key, entry]));
      keywordRanking.slice(0, options.rerankDepth).forEach((key, index) => {
        const entry = byKey.get(key);
        if (!entry) return;
        entry.score += options.laneWeights.keyword / (options.rrfConstant + index + 1);
        entry.lanes.push("keyword");
        boosted = true;
      });

      // The boost is worth what topping a lane of its own was worth, so a passage the vector
      // lane ranked low can still win on the strength of its date - which is the point - while
      // a date cannot put a passage in the pool by itself.
      for (const entry of ranking) {
        if (!dated.has(entry.key)) continue;
        entry.score += dateBoost;
        entry.lanes.push("date");
        boosted = true;
      }

      return boosted ? ranking.sort((a, b) => b.score - a.score) : ranking;
    });


    fusedKeys = fused.map((entry) => entry.key);
    
    // Filter the top X items by final boosted socre
    const winners = fused.slice(0, options.retrievalLimit);
    winnerLanesByKey = new Map(winners.map((winner) => [winner.key, winner.lanes]));

    // Get the actual passages
    const chosen = winners
      .map((winner): SearchResult | null => {
        const source = resolvedByKey.get(winner.key);
        // Fusion replaces the score with a reciprocal-rank sum; keep the similarity so later
        // stages can still tell an on-topic passage from a filler one.
        return source ? { ...source, score: winner.score, similarity: source.score } : null;
      })
      // Drop any unfindable passages
      .filter((result): result is SearchResult => result !== null);

    // Returns chosen passage with neighbors
    ranked = withNeighbours(chosen, resolvedByKey, options.neighbourChunks);
    options.abortSignal?.throwIfAborted();
  } else {
    // Low depth: no fusion, no boosts, no expansion - the vector ranking as it came back.
    signalCounts.vector = Math.min(searched.length, options.retrievalLimit);
    ranked = searched.slice(0, options.retrievalLimit);
  }

  let passages = await timed("trimOverlap", async () => trimOverlappingChunks(ranked));

  // When fusing, the pool is the fused ranking, so pool metrics measure every lane. At Low
  // there is no fusion, so it stays an unthresholded vector search.
  let diagnosticPool: SearchResult[] = [];
  if (options.diagnosticPoolSize && fusedKeys) {
    diagnosticPool = fusedKeys
      .slice(0, options.diagnosticPoolSize)
      .map((key) => resolvedByKey.get(key))
      .filter((result): result is SearchResult => result !== undefined);
  } else if (options.diagnosticPoolSize) {
    diagnosticPool = (
      await deps.vectorStore.searchMany([queryEmbedding], options.diagnosticPoolSize, Number.NEGATIVE_INFINITY)
    )[0];
  }

  let passageLanes: string[][] = passages.map(() => []);
  if (winnerLanesByKey) {
    const finalLanesByKey = winnerLanesByKey;
    passageLanes = passages.map((passage) => finalLanesByKey.get(chunkKey(passage)) ?? []);
    signalCounts.vector = 0;
    signalCounts.hyde = 0;
    signalCounts.keyword = 0;
    signalCounts.date = 0;
    for (const lanes of passageLanes) {
      if (lanes.includes("vector")) signalCounts.vector++;
      if (lanes.includes("hyde")) signalCounts.hyde++;
      if (lanes.includes("keyword")) signalCounts.keyword++;
      if (lanes.includes("date")) signalCounts.date++;
    }
  }

  return { passages, diagnosticPool, timings, signalCounts, passageLanes, dayRanges };
}
