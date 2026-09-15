import * as path from "path";
import { type RetrieveResult } from "../retrieval/retrieve";
import { aggregateMetrics, scoreQuestion, type EvalMetrics, type QuestionResult } from "./metrics";
import { type QuestionSet } from "./questionSet";

export interface RunEvalDeps {
  retrieve: (query: string) => Promise<RetrieveResult>;
  listIndexedFiles: () => Promise<Set<string>>;
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
  const questions: QuestionResult[] = [];

  for (const question of options.questionSet.questions) {
    const retrieval = await deps.retrieve(question.question);
    questions.push(scoreQuestion(question, retrieval, options.documentsDir, indexedFiles));
  }

  const generatedAt = deps.now().toISOString();
  const report: EvalReport = {
    generatedAt,
    settings: options.settingsSnapshot,
    metrics: aggregateMetrics(questions),
    questions,
  };

  const reportPath = path.join(options.reportsDir, `run-${generatedAt.replace(/[:.]/g, "-")}.json`);
  await deps.writeNewFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return { report, reportPath };
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatMetricsTable(metrics: EvalMetrics): string {
  const rows: Array<[string, string]> = [
    ["Questions scored", String(metrics.scored)],
    ["Unscorable (file not indexed)", String(metrics.unscorable)],
    ["Final hit rate", percent(metrics.finalHitRate)],
    ["Pool hit rate (top 50)", percent(metrics.poolHitRate)],
    ["Filter loss", percent(metrics.filterLoss)],
    ["Right file, wrong passage", percent(metrics.rightFileWrongPassage)],
    ["Median answer rank in pool", metrics.medianPoolRank === null ? "n/a" : String(metrics.medianPoolRank)],
    ["Mean reciprocal rank", metrics.meanReciprocalRank.toFixed(3)],
  ];
  const width = Math.max(...rows.map(([label]) => label.length)) + 2;
  const lines = rows.map(([label, value]) => `${label.padEnd(width)}${value}`);

  lines.push("", "Latency per stage:");
  for (const [stage, { median, p95 }] of Object.entries(metrics.latency)) {
    lines.push(`  ${stage.padEnd(14)}median ${median.toFixed(0)}ms  p95 ${p95.toFixed(0)}ms`);
  }
  return lines.join("\n");
}
