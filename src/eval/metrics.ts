import { type RetrieveResult, type StageTiming } from "../retrieval/retrieve";
import { type SearchResult } from "../vectorstore/vectorStore";
import { containsSnippet } from "./matchSnippet";
import { toRelativeSourcePath, type EvalQuestion } from "./questionSet";

export interface QuestionResult {
  id: string;
  unscorable: boolean;
  finalHit: boolean;
  /** 1-based rank of the first matching passage in the diagnostic pool, or null if absent. */
  poolRank: number | null;
  rightFileWrongPassage: boolean;
  finalFiles: string[];
  timings: StageTiming[];
}

export interface EvalMetrics {
  scored: number;
  unscorable: number;
  finalHitRate: number;
  poolHitRate: number;
  filterLoss: number;
  rightFileWrongPassage: number;
  medianPoolRank: number | null;
  meanReciprocalRank: number;
  latency: Record<string, { median: number; p95: number }>;
}

function isMatch(passage: SearchResult, question: EvalQuestion, documentsDir: string): boolean {
  return (
    toRelativeSourcePath(documentsDir, passage.filePath) === question.sourceFile &&
    containsSnippet(passage.text, question.answerSnippet)
  );
}

export function scoreQuestion(
  question: EvalQuestion,
  retrieval: RetrieveResult,
  documentsDir: string,
  indexedFiles: Set<string>,
): QuestionResult {
  if (!indexedFiles.has(question.sourceFile)) {
    return {
      id: question.id,
      unscorable: true,
      finalHit: false,
      poolRank: null,
      rightFileWrongPassage: false,
      finalFiles: [],
      timings: retrieval.timings,
    };
  }

  const finalFiles = [...new Set(retrieval.passages.map((p) => toRelativeSourcePath(documentsDir, p.filePath)))];
  const finalHit = retrieval.passages.some((p) => isMatch(p, question, documentsDir));
  const poolIndex = retrieval.diagnosticPool.findIndex((p) => isMatch(p, question, documentsDir));

  return {
    id: question.id,
    unscorable: false,
    finalHit,
    poolRank: poolIndex >= 0 ? poolIndex + 1 : null,
    rightFileWrongPassage: !finalHit && finalFiles.includes(question.sourceFile),
    finalFiles,
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
    finalHitRate: rate(scored.filter((r) => r.finalHit).length),
    poolHitRate: rate(ranks.length),
    filterLoss: rate(scored.filter((r) => r.poolRank !== null && !r.finalHit).length),
    rightFileWrongPassage: rate(scored.filter((r) => r.rightFileWrongPassage).length),
    medianPoolRank: ranks.length === 0 ? null : median(ranks),
    meanReciprocalRank: rate(ranks.reduce((sum, rank) => sum + 1 / rank, 0)),
    latency,
  };
}
