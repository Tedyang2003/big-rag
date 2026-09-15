import { type SearchResult, type VectorStore } from "../vectorstore/vectorStore";
import { trimOverlappingChunks } from "../utils/trimOverlappingChunks";
import { compactPassageText, type EmbedSentences } from "../utils/compactPassages";
import { type CountTokens } from "../utils/textChunker";

/** How many candidate passages to pull per one requested by retrievalLimit when compaction is on. */
export const CONTEXT_COMPACTION_POOL_MULTIPLIER = 3;

export type StageName = "embedQuery" | "vectorSearch" | "trimOverlap" | "compaction";

export interface StageTiming {
  stage: StageName;
  ms: number;
}

export interface RetrieveDeps {
  vectorStore: Pick<VectorStore, "search">;
  embedQuery: (text: string) => Promise<number[]>;
  embedSentences: EmbedSentences;
  countTokens: CountTokens;
  now?: () => number;
}

export interface RetrieveOptions {
  retrievalLimit: number;
  retrievalThreshold: number;
  chunkSize: number;
  enableContextCompaction: boolean;
  /** When set, also return the top-N vector matches with no threshold, for evaluation diagnostics. */
  diagnosticPoolSize?: number;
}

export interface RetrieveResult {
  passages: SearchResult[];
  diagnosticPool: SearchResult[];
  timings: StageTiming[];
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

  // Compaction shrinks passages, so it needs a larger candidate pool to choose from.
  const searchLimit = options.enableContextCompaction
    ? options.retrievalLimit * CONTEXT_COMPACTION_POOL_MULTIPLIER
    : options.retrievalLimit;

  const searched = await timed("vectorSearch", () =>
    deps.vectorStore.search(queryEmbedding, searchLimit, options.retrievalThreshold),
  );

  let passages = await timed("trimOverlap", async () => trimOverlappingChunks(searched));

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

  return { passages, diagnosticPool, timings };
}
