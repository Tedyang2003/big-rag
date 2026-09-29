import * as path from "path";
import { type RetrieveResult } from "../retrieval/retrieve";
import { aggregateMetrics, scoreQuestion, type EvalMetrics, type QuestionResult } from "./metrics";
import { type QuestionSet } from "./questionSet";

export interface RunEvalDeps {
  /** `questionId` lets a caller key per-question state, since question texts repeat across sets. */
  retrieve: (query: string, questionId: string) => Promise<RetrieveResult>;
  listIndexedFiles: () => Promise<Set<string>>;
  /** Where each question's evidence sits in this index; a null entry is reported unscorable. */
  locateEvidence?: () => Promise<Map<string, import("./evidencePresence").EvidenceLocation | null>>;
  writeNewFile: (filePath: string, content: string) => Promise<void>;
  now: () => Date;
}

export interface RunEvalOptions {
  questionSet: QuestionSet;
  documentsDir: string;
  reportsDir: string;
  settingsSnapshot: Record<string, unknown>;
}

export interface EvalReport {
  generatedAt: string;
  settings: Record<string, unknown>;
  metrics: EvalMetrics;
  questions: QuestionResult[];
}

export async function runEval(
  deps: RunEvalDeps,
  options: RunEvalOptions,
): Promise<{ report: EvalReport; reportPath: string }> {
  const indexedFiles = await deps.listIndexedFiles();
  const evidenceByQuestion = await deps.locateEvidence?.();
  const questions: QuestionResult[] = [];

  for (const question of options.questionSet.questions) {
    const retrieval = await deps.retrieve(question.question, question.id);
    questions.push(scoreQuestion(question, retrieval, options.documentsDir, indexedFiles, evidenceByQuestion));
  }

  const metrics = aggregateMetrics(questions);
  if (questions.length > 0 && metrics.scored === 0) {
    throw new Error(
      "No questions could be scored because none of their source files are in the index. Check that " +
        "BIG_RAG_DOCS_DIR matches the plugin's Documents Directory.",
    );
  }

  const generatedAt = deps.now().toISOString();
  const report: EvalReport = {
    generatedAt,
    settings: options.settingsSnapshot,
    metrics,
    questions,
  };

  const reportPath = path.join(options.reportsDir, `run-${generatedAt.replace(/[:.]/g, "-")}.json`);
  await deps.writeNewFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return { report, reportPath };
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatMetricsTable(metrics: EvalMetrics, diagnosticPoolSize = 50): string {
  const rows: Array<[string, string]> = [
    ["Questions scored", String(metrics.scored)],
    ["Unscorable: file not indexed", String(metrics.unscorableFileNotIndexed)],
    ["Unscorable: evidence not in the index", String(metrics.unscorableEvidenceNotInIndex)],
    ["Final hit rate", percent(metrics.finalHitRate)],
    [`Pool hit rate (top ${diagnosticPoolSize})`, percent(metrics.poolHitRate)],
    ["Filter loss", percent(metrics.filterLoss)],
    ["Right file, wrong passage", percent(metrics.rightFileWrongPassage)],
    ["Median answer rank in pool", metrics.medianPoolRank === null ? "n/a" : String(metrics.medianPoolRank)],
    ["Mean reciprocal rank", metrics.meanReciprocalRank.toFixed(3)],
    ["Mean passages returned", metrics.meanPassagesReturned.toFixed(1)],
    [
      `Passage accuracy (of ${metrics.rightFileReturned} that found the document)`,
      metrics.passageAccuracy === null ? "—" : `${(metrics.passageAccuracy * 100).toFixed(1)}%`,
    ],
  ];
  const width = Math.max(...rows.map(([label]) => label.length)) + 2;
  const lines = rows.map(([label, value]) => `${label.padEnd(width)}${value}`);

  lines.push("", "Latency per stage:");
  for (const [stage, { median, p95 }] of Object.entries(metrics.latency)) {
    lines.push(`  ${stage.padEnd(14)}median ${median.toFixed(0)}ms  p95 ${p95.toFixed(0)}ms`);
  }
  return lines.join("\n");
}
