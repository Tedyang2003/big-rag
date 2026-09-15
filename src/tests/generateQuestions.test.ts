import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as path from "path";
import {
  generateQuestions,
  parseGeneratedQA,
  validateCandidate,
  type GenerateDeps,
} from "../eval/generateQuestions";
import { parseQuestionSet } from "../eval/questionSet";
import { type IndexedChunk } from "../vectorstore/vectorStore";

const DOCS = path.resolve("/docs");
const FILLER = Array.from({ length: 40 }, (_, i) => `filler${i}`).join(" ");
const CHUNK_TEXT = `Total members reached 15.8M this quarter. ${FILLER}`;
const GOOD = JSON.stringify({ question: "How much did membership grow?", answerSnippet: "Total members reached 15.8M this quarter." });
const LEAKY = JSON.stringify({ question: "Total members reached what?", answerSnippet: "Total members reached 15.8M this quarter." });

function chunk(file: string, chunkIndex: number): IndexedChunk {
  return { text: CHUNK_TEXT, filePath: path.join(DOCS, file), fileName: file, chunkIndex, metadata: {} };
}

function makeDeps(overrides: Partial<GenerateDeps> = {}) {
  const writes: Array<{ filePath: string; content: string }> = [];
  const askCalls: number[] = [];
  const deps: GenerateDeps = {
    listChunks: async () => [chunk("research/a.md", 0)],
    askForQuestion: async (_text, attempt) => {
      askCalls.push(attempt);
      return GOOD;
    },
    isPathIgnored: async () => true,
    writeNewFile: async (filePath, content) => {
      writes.push({ filePath, content });
    },
    now: () => new Date("2026-09-15T10:00:00.000Z"),
    ...overrides,
  };
  return { deps, writes, askCalls };
}

const OPTIONS = {
  documentsDir: DOCS,
  outputDir: path.resolve("/repo/eval"),
  count: 30,
  seed: 42,
  modelName: "test-model",
  leakLimit: 0.7,
};

test("parseGeneratedQA returns null for malformed output", () => {
  assert.equal(parseGeneratedQA("not json"), null);
  assert.equal(parseGeneratedQA(JSON.stringify({ question: "Q?" })), null);
  assert.deepEqual(parseGeneratedQA(GOOD), {
    question: "How much did membership grow?",
    answerSnippet: "Total members reached 15.8M this quarter.",
  });
});

test("validateCandidate reports why a candidate is rejected", () => {
  assert.equal(validateCandidate({ question: "How much did membership grow?", answerSnippet: "Not in the chunk." }, CHUNK_TEXT), "snippet-not-found");
  assert.equal(validateCandidate(JSON.parse(LEAKY), CHUNK_TEXT), "wording-leak");
  assert.equal(validateCandidate(JSON.parse(GOOD), CHUNK_TEXT), null);
});

test("validateCandidate applies the given leak limit", () => {
  // Meaningful words: total, members, grow, sharply. "total" and "members" are in the chunk: 2 of 4 = 0.5.
  const halfCopied = { question: "Did total members grow sharply?", answerSnippet: "Total members reached 15.8M this quarter." };
  assert.equal(validateCandidate(halfCopied, CHUNK_TEXT, 0.4), "wording-leak");
  assert.equal(validateCandidate(halfCopied, CHUNK_TEXT, 0.5), null);
});

test("generateQuestions writes a timestamped candidates file with relative source paths", async () => {
  const { deps, writes } = makeDeps();
  const summary = await generateQuestions(deps, OPTIONS);

  assert.equal(writes.length, 1);
  assert.equal(writes[0].filePath, path.join(OPTIONS.outputDir, "candidates-2026-09-15T10-00-00-000Z.json"));
  const set = parseQuestionSet(writes[0].content);
  assert.deepEqual(set.generator, { model: "test-model", seed: 42, leakLimit: 0.7 });
  assert.deepEqual(set.questions, [
    {
      id: "q-001",
      question: "How much did membership grow?",
      sourceFile: "research/a.md",
      answerSnippet: "Total members reached 15.8M this quarter.",
    },
  ]);
  assert.equal(summary.generated, 1);
  assert.deepEqual(summary.questionsPerFile, { "research/a.md": 1 });
});

test("generateQuestions retries once and keeps a candidate that passes on retry", async () => {
  const { deps, askCalls } = makeDeps({
    askForQuestion: async (_text, attempt) => {
      askCalls.push(attempt);
      return attempt === 0 ? LEAKY : GOOD;
    },
  });
  const summary = await generateQuestions(deps, OPTIONS);
  assert.deepEqual(askCalls, [0, 1]);
  assert.equal(summary.generated, 1);
});

test("generateQuestions drops a candidate after two failures and counts the reason", async () => {
  const { deps, askCalls } = makeDeps({
    askForQuestion: async (_text, attempt) => {
      askCalls.push(attempt);
      return "garbage";
    },
  });
  const summary = await generateQuestions(deps, OPTIONS);
  assert.deepEqual(askCalls, [0, 1]);
  assert.equal(summary.generated, 0);
  assert.deepEqual(summary.dropped, { "invalid-output": 1, "snippet-not-found": 0, "wording-leak": 0 });
});

test("generateQuestions fails on an empty index", async () => {
  const { deps } = makeDeps({ listChunks: async () => [] });
  await assert.rejects(() => generateQuestions(deps, OPTIONS), /index is empty/);
});

test("generateQuestions refuses to run when the output path is not gitignored", async () => {
  const { deps, writes, askCalls } = makeDeps({ isPathIgnored: async () => false });
  await assert.rejects(() => generateQuestions(deps, OPTIONS), /not gitignored/);
  assert.equal(writes.length, 0);
  assert.equal(askCalls.length, 0, "no LLM calls should be made");
});

test("generateQuestions drops chunks outside the documents dir and counts them", async () => {
  const outside = path.resolve("/elsewhere/b.md");
  const { deps } = makeDeps({
    listChunks: async () => [chunk("research/a.md", 0), { text: CHUNK_TEXT, filePath: outside, fileName: "b.md", chunkIndex: 0, metadata: {} }],
  });
  const summary = await generateQuestions(deps, { ...OPTIONS, count: 30 });
  assert.equal(summary.outsideDocumentsDir, 1);
  assert.equal(summary.generated, 1);
  assert.deepEqual(summary.questionsPerFile, { "research/a.md": 1 });
});

test("generateQuestions fails when every indexed chunk is outside the documents dir", async () => {
  const outside = path.resolve("/elsewhere/b.md");
  const { deps } = makeDeps({
    listChunks: async () => [{ text: CHUNK_TEXT, filePath: outside, fileName: "b.md", chunkIndex: 0, metadata: {} }],
  });
  await assert.rejects(() => generateQuestions(deps, OPTIONS), /BIG_RAG_DOCS_DIR/);
});
