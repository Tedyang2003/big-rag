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
  medianPoolRank: number | null;
  meanReciprocalRank: number;
  latency: Record<string, { median: number; p95: number }>;
}

/**
 * Consecutive chunks are matched as one passage: when evidence spans a chunk boundary and
 * both chunks are retrieved, the model received all of it, so scoring counts it as found.
 */
function matchingRunPosition(
  passages: SearchResult[],
  question: EvalQuestion,
  documentsDir: string,
): number | null {
  for (const run of joinAdjacentRuns(passages)) {
    if (toRelativeSourcePath(documentsDir, run.filePath) !== question.sourceFile) continue;
    if (containsSnippet(run.text, question.answerSnippet)) return run.firstPosition;
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
  const finalHit = matchingRunPosition(retrieval.passages, question, documentsDir) !== null;
  const poolPosition = matchingRunPosition(retrieval.diagnosticPool, question, documentsDir);

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
    medianPoolRank: ranks.length === 0 ? null : median(ranks),
    meanReciprocalRank: rate(ranks.reduce((sum, rank) => sum + 1 / rank, 0)),
    latency,
  };
}
