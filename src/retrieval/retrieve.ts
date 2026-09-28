import { chunkKey, type SearchResult, type VectorStore } from "../vectorstore/vectorStore";
import { trimOverlappingChunks } from "../utils/trimOverlappingChunks";
import { compactPassageText, type EmbedSentences } from "../utils/compactPassages";
import { type CountTokens } from "../utils/textChunker";
import { fuseLanes, type RankedLane } from "./fuse";
import { queryDayRanges, type DayRange } from "./queryDates";

/** How many candidate passages to pull per one requested by retrievalLimit when compaction is on. */
export const CONTEXT_COMPACTION_POOL_MULTIPLIER = 3;

export type StageName =
  | "embedQuery"
  | "vectorSearch"
  | "dateLane"
  | "fuse"
  | "trimOverlap"
  | "compaction";

export interface StageTiming {
  stage: StageName;
  ms: number;
}

export type RetrievalDepth = "low" | "medium";

/** The subset of ChunkCatalog the retrieval lanes need. */
export interface CatalogLanes {
  chunksForRanges(ranges: DayRange[]): number[];
  keyOf(chunkNumber: number): string;
  latestDayOf(chunkNumber: number): number;
  yearsPresent(): number[];
}

export interface LaneCounts {
  vector: number;
  date: number;
}

export interface RetrieveDeps {
  vectorStore: Pick<VectorStore, "search">;
  embedQuery: (text: string) => Promise<number[]>;
  embedSentences: EmbedSentences;
  countTokens: CountTokens;
  now?: () => number;
  /** Present only at Medium depth; null when it could not be built. */
  catalog?: CatalogLanes | null;
  /** Clock for relative date phrases in the query. */
  nowDate?: () => Date;
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
  /** Passages the vector lane puts up for fusion, and so the pool BM25 reranks. */
  laneCandidates: number;
  rrfConstant: number;
  laneWeights: { vector: number; date: number };
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

  const medium = options.depth === "medium";

  // Compaction shrinks passages, so it needs a larger candidate pool to choose from.
  // At Medium depth the vector lane always asks for laneCandidates, whichever way
  // compaction is set: that pool is the whole shortlist the later stages work over.
  const searchLimit = medium
    ? options.laneCandidates
    : options.enableContextCompaction
      ? options.retrievalLimit * CONTEXT_COMPACTION_POOL_MULTIPLIER
      : options.retrievalLimit;

  const searched = await timed("vectorSearch", () =>
    deps.vectorStore.search(queryEmbedding, searchLimit, options.retrievalThreshold),
  );
  options.abortSignal?.throwIfAborted();

  const catalog = medium ? deps.catalog ?? null : null;
  const laneCounts: LaneCounts = { vector: 0, date: 0 };
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
  // Every passage in play, by key. Dates only reorder what the vector lane found, so the
  // ranking can never name a chunk that is not already here.
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

    const dated = new Set(datedKeys);
    const dateBoost = options.laneWeights.date / (options.rrfConstant + 1);
    const fused = await timed("fuse", async () => {
      const ranking = fuseLanes(lanes, options.rrfConstant);
      let boosted = false;

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
    // With compaction on, the compaction stage still needs its wider candidate pool.
    const winnerCount = options.enableContextCompaction
      ? options.retrievalLimit * CONTEXT_COMPACTION_POOL_MULTIPLIER
      : options.retrievalLimit;
    const winners = fused.slice(0, winnerCount);
    winnerLanesByKey = new Map(winners.map((winner) => [winner.key, winner.lanes]));

    ranked = winners
      .map((winner) => {
        const source = resolvedByKey.get(winner.key);
        return source ? { ...source, score: winner.score } : null;
      })
      .filter((result): result is SearchResult => result !== null);
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

  // At Medium the pool is the fused ranking, so pool metrics measure every lane. At Low
  // there is no fusion, so it stays an unthresholded vector search.
  let diagnosticPool: SearchResult[] = [];
  if (options.diagnosticPoolSize && fusedKeys) {
    diagnosticPool = fusedKeys
      .slice(0, options.diagnosticPoolSize)
      .map((key) => resolvedByKey.get(key))
      .filter((result): result is SearchResult => result !== undefined);
  } else if (options.diagnosticPoolSize) {
    diagnosticPool = await deps.vectorStore.search(
      queryEmbedding,
      options.diagnosticPoolSize,
      Number.NEGATIVE_INFINITY,
    );
  }

  let passageLanes: string[][] = passages.map(() => []);
  if (winnerLanesByKey) {
    const finalLanesByKey = winnerLanesByKey;
    passageLanes = passages.map((passage) => finalLanesByKey.get(chunkKey(passage)) ?? []);
    laneCounts.vector = 0;
    laneCounts.date = 0;
    for (const lanes of passageLanes) {
      if (lanes.includes("vector")) laneCounts.vector++;
      if (lanes.includes("date")) laneCounts.date++;
    }
  }

  return { passages, diagnosticPool, timings, laneCounts, passageLanes, dayRanges };
}
