import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as path from "path";
import { aggregateMetrics, scoreQuestion, type QuestionResult } from "../eval/metrics";
import { type RetrieveResult } from "../retrieval/retrieve";
import { type SearchResult } from "../vectorstore/vectorStore";
import { type EvalQuestion } from "../eval/questionSet";

const DOCS = path.resolve("/docs");
const QUESTION: EvalQuestion = {
  id: "q-001",
  question: "How much did membership grow?",
  sourceFile: "a.md",
  answerSnippet: "Total members: 15.8M",
};
const INDEXED = new Set(["a.md", "b.md"]);

function passage(file: string, text: string): SearchResult {
  return { id: `${file}-0`, text, score: 0.8, filePath: path.join(DOCS, file), fileName: file, chunkIndex: 0, shardName: "shard_000", metadata: {} };
}

function retrieval(passages: SearchResult[], diagnosticPool: SearchResult[]): RetrieveResult {
  return {
    passages,
    diagnosticPool,
    timings: [{ stage: "vectorSearch", ms: 10 }],
    laneCounts: { vector: passages.length, keyword: 0, date: 0 },
    dayRanges: [],
  };
}

test("scoreQuestion counts a final hit and its pool rank", () => {
  const answer = passage("a.md", "Update: total members: 15.8M this quarter.");
  const result = scoreQuestion(QUESTION, retrieval([answer], [passage("b.md", "x"), answer]), DOCS, INDEXED);
  assert.equal(result.finalHit, true);
  assert.equal(result.poolRank, 2);
  assert.equal(result.rightFileWrongPassage, false);
  assert.deepEqual(result.finalFiles, ["a.md"]);
});

test("scoreQuestion does not count the snippet from the wrong file", () => {
  const wrongFile = passage("b.md", "Total members: 15.8M");
  const result = scoreQuestion(QUESTION, retrieval([wrongFile], [wrongFile]), DOCS, INDEXED);
  assert.equal(result.finalHit, false);
  assert.equal(result.poolRank, null);
});

test("scoreQuestion flags right file but wrong passage", () => {
  const result = scoreQuestion(QUESTION, retrieval([passage("a.md", "Unrelated section.")], []), DOCS, INDEXED);
  assert.equal(result.finalHit, false);
  assert.equal(result.rightFileWrongPassage, true);
});

test("scoreQuestion marks a question unscorable when its file is not indexed", () => {
  const result = scoreQuestion({ ...QUESTION, sourceFile: "gone.md" }, retrieval([], []), DOCS, INDEXED);
  assert.equal(result.unscorable, true);
});

function qr(overrides: Partial<QuestionResult>): QuestionResult {
  return {
    id: "q",
    unscorable: false,
    finalHit: false,
    poolRank: null,
    rightFileWrongPassage: false,
    finalFiles: [],
    timings: [],
    ...overrides,
  };
}

test("aggregateMetrics computes rates over scorable questions only", () => {
  const metrics = aggregateMetrics([
    qr({ finalHit: true, poolRank: 1, timings: [{ stage: "vectorSearch", ms: 10 }] }),
    qr({ finalHit: false, poolRank: 4, timings: [{ stage: "vectorSearch", ms: 20 }] }),
    qr({ finalHit: false, poolRank: null, rightFileWrongPassage: true, timings: [{ stage: "vectorSearch", ms: 30 }] }),
    qr({ finalHit: false, poolRank: null, timings: [{ stage: "vectorSearch", ms: 40 }] }),
    qr({ unscorable: true }),
  ]);

  assert.equal(metrics.scored, 4);
  assert.equal(metrics.unscorable, 1);
  assert.equal(metrics.finalHitRate, 0.25);
  assert.equal(metrics.poolHitRate, 0.5);
  assert.equal(metrics.filterLoss, 0.25);
  assert.equal(metrics.rightFileWrongPassage, 0.25);
  assert.equal(metrics.medianPoolRank, 2.5);
  assert.equal(metrics.meanReciprocalRank, (1 + 0.25) / 4);
  assert.deepEqual(metrics.latency.vectorSearch, { median: 25, p95: 40 });
});

test("aggregateMetrics handles no scorable questions", () => {
  const metrics = aggregateMetrics([qr({ unscorable: true })]);
  assert.equal(metrics.scored, 0);
  assert.equal(metrics.finalHitRate, 0);
  assert.equal(metrics.medianPoolRank, null);
  assert.deepEqual(metrics.latency, {});
});
