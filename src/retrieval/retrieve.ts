import { chunkKey, type SearchResult, type VectorStore } from "../vectorstore/vectorStore";
import { trimOverlappingChunks } from "../utils/trimOverlappingChunks";
import { compactPassageText, type EmbedSentences } from "../utils/compactPassages";
import { type CountTokens } from "../utils/textChunker";
import { rankTexts, tokenize, type Bm25Candidate } from "./bm25";
import { fuseLanes, type RankedLane } from "./fuse";
import { queryDayRanges, type DayRange } from "./queryDates";

/** How many candidate passages to pull per one requested by retrievalLimit when compaction is on. */
export const CONTEXT_COMPACTION_POOL_MULTIPLIER = 3;

export type StageName =
  | "embedQuery"
  | "hypothetical"
  | "keywordRerank"
  | "vectorSearch"
  | "dateLane"
  | "fuse"
  | "trimOverlap"
  | "compaction";

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

export interface LaneCounts {
  vector: number;
  hyde: number;
  keyword: number;
  date: number;
}

export interface RetrieveDeps {
  vectorStore: Pick<VectorStore, "searchMany">;
  embedQuery: (text: string) => Promise<number[]>;
  embedSentences: EmbedSentences;
  countTokens: CountTokens;
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
  enableContextCompaction: boolean;
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
  laneCounts: LaneCounts;
  /** Lanes that ranked each returned passage, aligned with `passages`; empty arrays at Low depth. */
  passageLanes: string[][];
  /** Day ranges parsed from the query; empty when it named no date. */
  dayRanges: DayRange[];
}

/**
 * Compacts each candidate passage (extractive, sentence-level) and greedily
 * fills the token budget retrievalLimit full-size chunks would have used, in
 * score order. Keeps at least one passage; skips (not breaks) on overflow so a
 * smaller candidate further down can still fit.
 */
async function compactResultsToBudget(
  results: SearchResult[],
  queryEmbedding: number[],
  deps: RetrieveDeps,
  targetTokenBudget: number,
): Promise<SearchResult[]> {
  const compacted: SearchResult[] = [];
  let usedTokens = 0;

  for (const result of results) {
    const compactedText = await compactPassageText(result.text, queryEmbedding, deps.embedSentences);
    const tokenCount = await deps.countTokens(compactedText);

    if (compacted.length > 0 && usedTokens + tokenCount > targetTokenBudget) {
      continue;
    }

    compacted.push({ ...result, text: compactedText });
    usedTokens += tokenCount;
  }

  return compacted;
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
    out.push(result);
    for (let step = 1; step <= neighbourChunks; step++) {
      for (const index of [result.chunkIndex - step, result.chunkIndex + step]) {
        const key = `${result.filePath}::${index}`;
        const neighbour = byPosition.get(key);
        if (!neighbour || taken.has(key)) continue;
        taken.add(key);
        // A neighbour is kept for its adjacency, not its own relevance, so it inherits both.
        out.push({ ...neighbour, score: result.score, similarity: result.similarity ?? result.score });
      }
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

  // Compaction shrinks passages, so it needs a larger candidate pool to choose from.
  // When fusing, the vector lane always asks for laneCandidates, whichever way compaction
  // is set: that pool is the whole shortlist the later stages work over.
  const searchLimit = fusing
    ? options.laneCandidates
    : options.enableContextCompaction
      ? options.retrievalLimit * CONTEXT_COMPACTION_POOL_MULTIPLIER
      : options.retrievalLimit;

  // A question in English sits far from a grid of numbers; a passage written as the document
  // would write it does not. The draft is embedded and discarded - its specifics are invented -
  // and it is searched beside the question rather than instead of it, because measured alone it
  // loses ground. See documentation/Evaluation.md.
  let hypotheticalEmbedding: number[] | null = null;
  if (options.depth === "high" && deps.hypothetical) {
    hypotheticalEmbedding = await timed("hypothetical", async () => {
      const drafted = await deps.hypothetical!(query);
      return drafted === null ? null : await deps.embedQuery(drafted);
    });
    options.abortSignal?.throwIfAborted();
  }

  const queryVectors = hypotheticalEmbedding ? [queryEmbedding, hypotheticalEmbedding] : [queryEmbedding];
  // One pass for both vectors: a search is mostly the cost of parsing each shard, which two
  // separate searches would pay twice.
  const [searched, hypotheticalResults = []] = await timed("vectorSearch", () =>
    deps.vectorStore.searchMany(queryVectors, searchLimit, options.retrievalThreshold),
  );
  options.abortSignal?.throwIfAborted();

  const catalog = fusing ? deps.catalog ?? null : null;
  const laneCounts: LaneCounts = { vector: 0, hyde: 0, keyword: 0, date: 0 };
  let dayRanges: DayRange[] = [];
  let ranked: SearchResult[] = searched;
  // Set only on the catalog path: chunk key -> the lanes that ranked it while
  // fusing. laneCounts is finalized from this against the passages actually
  // returned (below), not against every fused winner, since compaction can still
  // skip a winner for budget.
  let winnerLanesByKey: Map<string, string[]> | null = null;
  // Set only on the catalog path: the fused ranking, so the diagnostic pool measures
  // fusion rather than the vector lane alone.
  let fusedKeys: string[] | null = null;
  // Every passage in play, by key: both lanes' results, since either may nominate one.
  const resolvedByKey = new Map<string, SearchResult>();

  if (catalog) {
    // Dates are a boost, not a source of candidates. A year says which documents are
    // eligible, not which passage answers the question, so a chunk is never retrieved
    // because of its date - it is only lifted once another lane has found it.
    const datedKeys = await timed("dateLane", () =>
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
    const keywordRanking =
      options.laneWeights.keyword === 0
        ? []
        : await timed("keywordRerank", () =>
            safeLane("keyword", async () =>
              rankTexts(
                tokenize(query),
                [...resolvedByKey.values()].map((result) => ({ key: chunkKey(result), text: result.text })),
                { k1: options.bm25K1, b: options.bm25B },
              ),
            ),
          );
    options.abortSignal?.throwIfAborted();

    const dated = new Set(datedKeys);
    const dateBoost = options.laneWeights.date / (options.rrfConstant + 1);
    const fused = await timed("fuse", async () => {
      const ranking = fuseLanes(lanes, options.rrfConstant);
      let boosted = false;

      // The boost is worth what topping a lane of its own was worth, so a passage the vector
      // lane ranked low can still win on the strength of its date - which is the point - while
      // a date cannot put a passage in the pool by itself.
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

      for (const entry of ranking) {
        if (!dated.has(entry.key)) continue;
        entry.score += dateBoost;
        entry.lanes.push("date");
        boosted = true;
      }

      return boosted ? ranking.sort((a, b) => b.score - a.score) : ranking;
    });
    fusedKeys = fused.map((entry) => entry.key);
    // With compaction on, the compaction stage still needs its wider candidate pool.
    const winnerCount = options.enableContextCompaction
      ? options.retrievalLimit * CONTEXT_COMPACTION_POOL_MULTIPLIER
      : options.retrievalLimit;
    const winners = fused.slice(0, winnerCount);
    winnerLanesByKey = new Map(winners.map((winner) => [winner.key, winner.lanes]));

    const chosen = winners
      .map((winner): SearchResult | null => {
        const source = resolvedByKey.get(winner.key);
        // Fusion replaces the score with a reciprocal-rank sum; keep the similarity so later
        // stages can still tell an on-topic passage from a filler one.
        return source ? { ...source, score: winner.score, similarity: source.score } : null;
      })
      .filter((result): result is SearchResult => result !== null);

    ranked = withNeighbours(chosen, resolvedByKey, options.neighbourChunks);
    options.abortSignal?.throwIfAborted();
  } else {
    laneCounts.vector = Math.min(searched.length, options.retrievalLimit);
    ranked = searched.slice(0, options.enableContextCompaction ? searched.length : options.retrievalLimit);
  }

  let passages = await timed("trimOverlap", async () => trimOverlappingChunks(ranked));

  if (options.enableContextCompaction && passages.length > 0) {
    const targetTokenBudget = options.retrievalLimit * options.chunkSize;
    const candidates = passages;
    passages = await timed("compaction", () =>
      compactResultsToBudget(candidates, queryEmbedding, deps, targetTokenBudget),
    );
  }

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
    laneCounts.vector = 0;
    laneCounts.hyde = 0;
    laneCounts.keyword = 0;
    laneCounts.date = 0;
    for (const lanes of passageLanes) {
      if (lanes.includes("vector")) laneCounts.vector++;
      if (lanes.includes("hyde")) laneCounts.hyde++;
      if (lanes.includes("keyword")) laneCounts.keyword++;
      if (lanes.includes("date")) laneCounts.date++;
    }
  }

  return { passages, diagnosticPool, timings, laneCounts, passageLanes, dayRanges };
}
