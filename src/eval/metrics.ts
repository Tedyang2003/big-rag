import { type RetrieveResult, type StageTiming } from "../retrieval/retrieve";
import { type SearchResult } from "../vectorstore/vectorStore";
import { joinAdjacentRuns } from "./adjacentRuns";
import { type EvidenceLocation } from "./evidencePresence";
import { containsSnippet } from "./matchSnippet";
import { toRelativeSourcePath, type EvalQuestion } from "./questionSet";

export interface QuestionResult {
  id: string;
  unscorable: boolean;
  /** Why it could not be scored: the file is missing, or its evidence is not in the index at all. */
  unscorableReason?: "file-not-indexed" | "evidence-not-in-index";
  finalHit: boolean;
  /** 1-based rank of the first matching passage in the diagnostic pool, or null if absent. */
  poolRank: number | null;
  rightFileWrongPassage: boolean;
  finalFiles: string[];
  /** Each returned passage, so a report can be read without re-running retrieval. */
  returned: ReturnedPassage[];
  /** Where the evidence sits in this index, or null when it is not there. */
  evidence: EvidenceLocation | null;
  timings: StageTiming[];
}

export interface ReturnedPassage {
  file: string;
  chunkIndex: number;
  sectionPath: string;
  /** Lanes that ranked it; empty at Low depth. */
  lanes: string[];
}

export interface EvalMetrics {
  scored: number;
  unscorable: number;
  /** Of the unscorable, how many had no source file in the index and how many had no evidence in it. */
  unscorableFileNotIndexed: number;
  unscorableEvidenceNotInIndex: number;
  finalHitRate: number;
  poolHitRate: number;
  filterLoss: number;
  rightFileWrongPassage: number;
  /**
   * Of the questions whose source document was returned at all, the share that were hits.
   *
   * Separates finding the document from finding the passage in it. On a question set where the
   * wording does not say which document is meant - QASPER asks "what were the baselines?" of 281
   * papers - the overall hit rate is capped by an ambiguity no retrieval can resolve, and this
   * is the part that measures the pipeline rather than the dataset. Null when no question
   * returned its document.
   */
  passageAccuracy: number | null;
  /** How many questions that is a share of, since it is a different denominator from the rest. */
  rightFileReturned: number;
  /** How deep the pool must be read before the evidence is all there; see `evidenceDepth`. */
  medianPoolRank: number | null;
  meanReciprocalRank: number;
  /** Mean passages handed to the model. Neighbour expansion buys hits by spending these. */
  meanPassagesReturned: number;
  latency: Record<string, { median: number; p95: number }>;
}

/**
 * Consecutive chunks are matched as one passage: when evidence spans a chunk boundary and
 * both chunks are retrieved, the model received all of it, so scoring counts it as found.
 */
function containsEvidence(
  passages: SearchResult[],
  question: EvalQuestion,
  documentsDir: string,
): boolean {
  for (const run of joinAdjacentRuns(passages)) {
    if (toRelativeSourcePath(documentsDir, run.filePath) !== question.sourceFile) continue;
    if (containsSnippet(run.text, question.answerSnippet)) return true;
  }
  return false;
}

/**
 * How far down the list the reader must go before the evidence is all there: the smallest `k`
 * for which the first `k` passages hold it. Null when the whole list does not.
 *
 * Not the rank of the best-placed chunk of the run that holds the evidence, which is what this
 * measured before. Grouping consecutive chunks is right for deciding whether the model received
 * the text, but it let a chunk inherit its neighbour's rank: evidence at position 40, sitting
 * next to something at position 3, was recorded as rank 3. That flattered the median rank and
 * the mean reciprocal rank on every run made before 29 September 2026.
 */
function evidenceDepth(
  passages: SearchResult[],
  question: EvalQuestion,
  documentsDir: string,
): number | null {
  if (!containsEvidence(passages, question, documentsDir)) return null;
  for (let k = 1; k <= passages.length; k++) {
    if (containsEvidence(passages.slice(0, k), question, documentsDir)) return k;
  }
  return null;
}

export function scoreQuestion(
  question: EvalQuestion,
  retrieval: RetrieveResult,
  documentsDir: string,
  indexedFiles: Set<string>,
  evidenceByQuestion?: Map<string, EvidenceLocation | null>,
): QuestionResult {
  const evidence = evidenceByQuestion?.get(question.id) ?? null;
  const unscorableReason = !indexedFiles.has(question.sourceFile)
    ? ("file-not-indexed" as const)
    : evidenceByQuestion?.has(question.id) && evidence === null
      ? ("evidence-not-in-index" as const)
      : null;
  const returned: ReturnedPassage[] = retrieval.passages.map((passage, i) => ({
    file: toRelativeSourcePath(documentsDir, passage.filePath),
    chunkIndex: passage.chunkIndex,
    sectionPath: String(passage.metadata?.sectionPath ?? ""),
    lanes: retrieval.passageLanes[i] ?? [],
  }));
  if (unscorableReason) {
    return {
      id: question.id,
      unscorable: true,
      unscorableReason,
      finalHit: false,
      poolRank: null,
      rightFileWrongPassage: false,
      finalFiles: [],
      returned,
      evidence,
      timings: retrieval.timings,
    };
  }

  const finalFiles = [...new Set(retrieval.passages.map((p) => toRelativeSourcePath(documentsDir, p.filePath)))];
  const finalHit = containsEvidence(retrieval.passages, question, documentsDir);
  const poolPosition = evidenceDepth(retrieval.diagnosticPool, question, documentsDir);

  return {
    id: question.id,
    unscorable: false,
    finalHit,
    poolRank: poolPosition,
    rightFileWrongPassage: !finalHit && finalFiles.includes(question.sourceFile),
    finalFiles,
    returned,
    evidence,
    timings: retrieval.timings,
  };
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function p95(sorted: number[]): number {
  return sorted[Math.max(0, Math.ceil(0.95 * sorted.length) - 1)];
}

export function aggregateMetrics(results: QuestionResult[]): EvalMetrics {
  const scored = results.filter((r) => !r.unscorable);
  const n = scored.length;
  const rate = (count: number) => (n === 0 ? 0 : count / n);

  const ranks = scored.map((r) => r.poolRank).filter((r): r is number => r !== null).sort((a, b) => a - b);
  const hits = scored.filter((r) => r.finalHit).length;
  const rightFileReturned = hits + scored.filter((r) => r.rightFileWrongPassage).length;

  const msByStage = new Map<string, number[]>();
  for (const result of scored) {
    for (const timing of result.timings) {
      const list = msByStage.get(timing.stage) ?? [];
      list.push(timing.ms);
      msByStage.set(timing.stage, list);
    }
  }
  const latency: Record<string, { median: number; p95: number }> = {};
  for (const [stage, values] of msByStage) {
    const sorted = [...values].sort((a, b) => a - b);
    latency[stage] = { median: median(sorted), p95: p95(sorted) };
  }

  return {
    scored: n,
    unscorable: results.length - n,
    unscorableFileNotIndexed: results.filter((r) => r.unscorableReason === "file-not-indexed").length,
    unscorableEvidenceNotInIndex: results.filter((r) => r.unscorableReason === "evidence-not-in-index").length,
    finalHitRate: rate(scored.filter((r) => r.finalHit).length),
    poolHitRate: rate(ranks.length),
    filterLoss: rate(scored.filter((r) => r.poolRank !== null && !r.finalHit).length),
    rightFileWrongPassage: rate(scored.filter((r) => r.rightFileWrongPassage).length),
    // A hit means the evidence was returned, which means its document was; so the questions
    // that found the document are the hits plus those that found it and missed the passage.
    passageAccuracy: rightFileReturned === 0 ? null : hits / rightFileReturned,
    rightFileReturned,
    medianPoolRank: ranks.length === 0 ? null : median(ranks),
    meanReciprocalRank: rate(ranks.reduce((sum, rank) => sum + 1 / rank, 0)),
    meanPassagesReturned: rate(scored.reduce((sum, result) => sum + result.returned.length, 0)),
    latency,
  };
}
