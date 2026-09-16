import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as path from "path";
import { formatMetricsTable, runEval, type EvalReport } from "../eval/runEval";
import { type QuestionSet } from "../eval/questionSet";
import { type SearchResult } from "../vectorstore/vectorStore";

const DOCS = path.resolve("/docs");

const SET: QuestionSet = {
  version: 1,
  generatedAt: "2026-09-15T09:00:00Z",
  generator: { model: "test-model", seed: 42 },
  questions: [
    { id: "q-001", question: "How much did membership grow?", sourceFile: "a.md", answerSnippet: "Total members: 15.8M" },
    { id: "q-002", question: "Something from a deleted file?", sourceFile: "gone.md", answerSnippet: "Anything" },
  ],
};

test("runEval scores each question, writes a report with settings, and skips unscorable questions", async () => {
  const answer: SearchResult = {
    id: "a.md-0",
    text: "Total members: 15.8M this quarter.",
    score: 0.9,
    filePath: path.join(DOCS, "a.md"),
    fileName: "a.md",
    chunkIndex: 0,
    shardName: "shard_000",
    metadata: {},
  };
  const writes: Array<{ filePath: string; content: string }> = [];
  const queries: string[] = [];

  const { report, reportPath } = await runEval(
    {
      retrieve: async (query) => {
        queries.push(query);
        return {
          passages: [answer],
          diagnosticPool: [answer],
          timings: [{ stage: "vectorSearch", ms: 12 }],
          laneCounts: { vector: 1, keyword: 0, date: 0 },
          dayRanges: [],
        };
      },
      listIndexedFiles: async () => new Set(["a.md"]),
      writeNewFile: async (filePath, content) => {
        writes.push({ filePath, content });
      },
      now: () => new Date("2026-09-15T10:00:00.000Z"),
    },
    {
      questionSet: SET,
      documentsDir: DOCS,
      reportsDir: path.resolve("/repo/eval/reports"),
      settingsSnapshot: { retrievalLimit: 5 },
    },
  );

  assert.deepEqual(queries, ["How much did membership grow?", "Something from a deleted file?"]);
  assert.equal(reportPath, path.join(path.resolve("/repo/eval/reports"), "run-2026-09-15T10-00-00-000Z.json"));
  assert.equal(report.metrics.scored, 1);
  assert.equal(report.metrics.unscorable, 1);
  assert.equal(report.metrics.finalHitRate, 1);
  assert.deepEqual(report.settings, { retrievalLimit: 5 });

  const written = JSON.parse(writes[0].content) as EvalReport;
  assert.equal(written.questions.find((q) => q.id === "q-002")?.unscorable, true);
});

test("runEval throws and writes nothing when no questions can be scored", async () => {
  const writes: Array<{ filePath: string; content: string }> = [];
  await assert.rejects(
    () =>
      runEval(
        {
          retrieve: async () => ({
            passages: [],
            diagnosticPool: [],
            timings: [],
            laneCounts: { vector: 0, keyword: 0, date: 0 },
            dayRanges: [],
          }),
          listIndexedFiles: async () => new Set<string>(),
          writeNewFile: async (filePath, content) => {
            writes.push({ filePath, content });
          },
          now: () => new Date("2026-09-15T10:00:00.000Z"),
        },
        {
          questionSet: SET,
          documentsDir: DOCS,
          reportsDir: path.resolve("/repo/eval/reports"),
          settingsSnapshot: { retrievalLimit: 5 },
        },
      ),
    /BIG_RAG_DOCS_DIR/,
  );
  assert.equal(writes.length, 0);
});

test("formatMetricsTable includes the headline metrics", () => {
  const table = formatMetricsTable({
    scored: 4,
    unscorable: 1,
    finalHitRate: 0.25,
    poolHitRate: 0.5,
    filterLoss: 0.25,
    rightFileWrongPassage: 0.25,
    medianPoolRank: 2.5,
    meanReciprocalRank: 0.3125,
    latency: { vectorSearch: { median: 25, p95: 40 } },
  });
  assert.match(table, /Final hit rate\s+25\.0%/);
  assert.match(table, /Pool hit rate \(top 50\)\s+50\.0%/);
  assert.match(table, /Filter loss\s+25\.0%/);
  assert.match(table, /vectorSearch\s+median 25ms\s+p95 40ms/);
});

test("formatMetricsTable labels the pool with a custom diagnostic pool size", () => {
  const table = formatMetricsTable(
    {
      scored: 4,
      unscorable: 1,
      finalHitRate: 0.25,
      poolHitRate: 0.5,
      filterLoss: 0.25,
      rightFileWrongPassage: 0.25,
      medianPoolRank: 2.5,
      meanReciprocalRank: 0.3125,
      latency: { vectorSearch: { median: 25, p95: 40 } },
    },
    75,
  );
  assert.match(table, /Pool hit rate \(top 75\)\s+50\.0%/);
});
