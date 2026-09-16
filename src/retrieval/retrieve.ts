import { chunkKey, type SearchResult, type VectorStore } from "../vectorstore/vectorStore";
import { trimOverlappingChunks } from "../utils/trimOverlappingChunks";
import { compactPassageText, type EmbedSentences } from "../utils/compactPassages";
import { type CountTokens } from "../utils/textChunker";
import { tokenize } from "./bm25";
import { fuseLanes, type RankedLane } from "./fuse";
import { queryDayRanges, type DayRange } from "./queryDates";

/** How many candidate passages to pull per one requested by retrievalLimit when compaction is on. */
export const CONTEXT_COMPACTION_POOL_MULTIPLIER = 3;

export type StageName =
  | "embedQuery"
  | "vectorSearch"
  | "keywordLane"
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
  hasWordTable: boolean;
  scoreTerms(terms: string[]): Map<number, number>;
  chunksForRanges(ranges: DayRange[]): number[];
  keyOf(chunkNumber: number): string;
  latestDayOf(chunkNumber: number): number;
  yearsPresent(): number[];
}

export interface LaneCounts {
  vector: number;
  keyword: number;
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
  /** Reads chunks the non-vector lanes selected. Required at Medium depth. */
  fetchChunks?: (keys: string[]) => Promise<SearchResult[]>;
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
  /** Candidates each lane contributes to fusion. */
  laneCandidates: number;
  rrfConstant: number;
  laneWeights: { vector: number; keyword: number; date: number };
}

export interface RetrieveResult {
  passages: SearchResult[];
  diagnosticPool: SearchResult[];
  timings: StageTiming[];
  laneCounts: LaneCounts;
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

function topKeys(scores: Map<number, number>, limit: number, keyOf: (n: number) => string): string[] {
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, limit)
    .map(([chunkNumber]) => keyOf(chunkNumber))
    .filter((key) => key.length > 0);
}

/** Runs a lane, returning an empty list if it fails so one lane cannot fail the query. */
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
  // compaction is set, so it cannot outrun the other lanes' candidate caps.
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
  const laneCounts: LaneCounts = { vector: 0, keyword: 0, date: 0 };
  let dayRanges: DayRange[] = [];
  let ranked: SearchResult[] = searched;
  // Set only on the catalog path: chunk key -> the lanes that ranked it while
  // fusing. laneCounts is finalized from this against the passages actually
  // returned (below), not against every fused winner, since a winner can be
  // dropped later (its fetchChunks lookup came back empty, trimOverlap merged
  // it into a neighbor, or compaction skipped it for budget).
  let winnerLanesByKey: Map<string, string[]> | null = null;

  if (catalog) {
    const terms = tokenize(query);
    const keywordScores = new Map<number, number>();

    const keywordKeys = await timed("keywordLane", () =>
      safeLane("keyword", async () => {
        if (!catalog.hasWordTable || terms.length === 0) return [];
        for (const [chunkNumber, score] of catalog.scoreTerms(terms)) keywordScores.set(chunkNumber, score);
        return topKeys(keywordScores, options.laneCandidates, (n) => catalog.keyOf(n));
      }),
    );
    options.abortSignal?.throwIfAborted();

    const dateKeys = await timed("dateLane", () =>
      safeLane("date", async () => {
        dayRanges = queryDayRanges(query, {
          now: deps.nowDate?.() ?? new Date(),
          yearsPresent: catalog.yearsPresent(),
        });
        if (dayRanges.length === 0) return [];
        const matched = catalog.chunksForRanges(dayRanges);
        return matched
          .sort(
            (a, b) =>
              (keywordScores.get(b) ?? 0) - (keywordScores.get(a) ?? 0) ||
              catalog.latestDayOf(b) - catalog.latestDayOf(a) ||
              a - b,
          )
          .slice(0, options.laneCandidates)
          .map((chunkNumber) => catalog.keyOf(chunkNumber))
          .filter((key) => key.length > 0);
      }),
    );
    options.abortSignal?.throwIfAborted();

    const vectorByKey = new Map(searched.map((result) => [chunkKey(result), result]));
    const lanes: RankedLane[] = [
      { name: "vector", weight: options.laneWeights.vector, keys: [...vectorByKey.keys()] },
      { name: "keyword", weight: options.laneWeights.keyword, keys: keywordKeys },
      { name: "date", weight: options.laneWeights.date, keys: dateKeys },
    ];

    const fused = await timed("fuse", async () => fuseLanes(lanes, options.rrfConstant));
    // With compaction on, the compaction stage still needs its wider candidate pool.
    const winnerCount = options.enableContextCompaction
      ? options.retrievalLimit * CONTEXT_COMPACTION_POOL_MULTIPLIER
      : options.retrievalLimit;
    const winners = fused.slice(0, winnerCount);
    winnerLanesByKey = new Map(winners.map((winner) => [winner.key, winner.lanes]));

    const missingKeys = winners.filter((winner) => !vectorByKey.has(winner.key)).map((winner) => winner.key);
    const fetchedByKey = new Map<string, SearchResult>();
    if (missingKeys.length > 0 && deps.fetchChunks) {
      for (const fetchedChunk of await deps.fetchChunks(missingKeys)) {
        fetchedByKey.set(chunkKey(fetchedChunk), fetchedChunk);
      }
    }

    ranked = winners
      .map((winner) => {
        const source = vectorByKey.get(winner.key) ?? fetchedByKey.get(winner.key);
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

  const diagnosticPool = options.diagnosticPoolSize
    ? await deps.vectorStore.search(queryEmbedding, options.diagnosticPoolSize, Number.NEGATIVE_INFINITY)
    : [];

  if (winnerLanesByKey) {
    const finalLanesByKey = winnerLanesByKey;
    laneCounts.vector = 0;
    laneCounts.keyword = 0;
    laneCounts.date = 0;
    for (const passage of passages) {
      const lanes = finalLanesByKey.get(chunkKey(passage)) ?? [];
      if (lanes.includes("vector")) laneCounts.vector++;
      if (lanes.includes("keyword")) laneCounts.keyword++;
      if (lanes.includes("date")) laneCounts.date++;
    }
  }

  return { passages, diagnosticPool, timings, laneCounts, dayRanges };
}
