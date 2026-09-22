import { test } from "node:test";
import * as assert from "node:assert/strict";
import { joinAdjacentRuns } from "../eval/adjacentRuns";
import { locateEvidence } from "../eval/evidencePresence";
import { type IndexedChunk, type SearchResult } from "../vectorstore/vectorStore";

function passage(overrides: Partial<SearchResult> & { text: string; chunkIndex: number }): SearchResult {
  return {
    id: `chunk-${overrides.chunkIndex}`,
    score: 0.9,
    filePath: "/docs/a.pdf",
    fileName: "a.pdf",
    shardName: "shard_000",
    metadata: {},
    ...overrides,
  };
}

test("consecutive chunks of one file join into a single run, in document order", () => {
  const runs = joinAdjacentRuns([
    passage({ text: "second half of the evidence.", chunkIndex: 8 }),
    passage({ text: "the evidence starts here and", chunkIndex: 7 }),
  ]);

  assert.deepEqual(runs, [
    { filePath: "/docs/a.pdf", text: "the evidence starts here and second half of the evidence.", firstPosition: 1 },
  ]);
});

test("non-consecutive chunks and different files stay separate", () => {
  const runs = joinAdjacentRuns([
    passage({ text: "one", chunkIndex: 1 }),
    passage({ text: "far away", chunkIndex: 40 }),
    passage({ text: "other file", chunkIndex: 2, filePath: "/docs/b.pdf", fileName: "b.pdf" }),
  ]);

  assert.deepEqual(
    runs.map((run) => run.text),
    ["one", "far away", "other file"],
  );
});

test("a run remembers the best position any of its chunks held", () => {
  const runs = joinAdjacentRuns([
    passage({ text: "unrelated", chunkIndex: 90 }),
    passage({ text: "tail", chunkIndex: 5 }),
    passage({ text: "head", chunkIndex: 4 }),
  ]);

  const joined = runs.find((run) => run.text === "head tail");
  assert.equal(joined?.firstPosition, 2, "the run is ranked by its highest-placed chunk");
});

/** Ids whose evidence is not in the index at all. */
function absentIds(chunks: IndexedChunk[], questions: Parameters<typeof locateEvidence>[1], dir: string): string[] {
  return [...locateEvidence(chunks, questions, dir)].filter(([, where]) => where === null).map(([id]) => id);
}

function chunk(overrides: Partial<IndexedChunk> & { text: string; chunkIndex: number }): IndexedChunk {
  return {
    id: `chunk-${overrides.chunkIndex}`,
    shardName: "shard_000",
    filePath: "/docs/a.pdf",
    fileName: "a.pdf",
    metadata: { startIndex: overrides.chunkIndex * 3, endIndex: overrides.chunkIndex * 3 + 3 },
    ...overrides,
  };
}

test("evidence spanning two chunks counts as present in the index", () => {
  const chunks = [
    chunk({ text: "alpha beta gamma", chunkIndex: 0 }),
    chunk({ text: "delta epsilon zeta", chunkIndex: 1 }),
  ];
  const absent = absentIds(chunks, [
    { id: "spans", question: "q", sourceFile: "a.pdf", answerSnippet: "gamma delta epsilon" },
    { id: "inside", question: "q", sourceFile: "a.pdf", answerSnippet: "alpha beta" },
    { id: "missing", question: "q", sourceFile: "a.pdf", answerSnippet: "nowhere to be found" },
  ], "/docs");

  assert.deepEqual([...absent], ["missing"]);
});

test("overlapping legacy chunks are stitched on their word offsets, not repeated", () => {
  // Legacy chunks overlap: chunk 1 repeats "gamma" from chunk 0.
  const chunks = [
    { ...chunk({ text: "alpha beta gamma", chunkIndex: 0 }), metadata: { startIndex: 0, endIndex: 3 } },
    { ...chunk({ text: "gamma delta epsilon", chunkIndex: 1 }), metadata: { startIndex: 2, endIndex: 5 } },
  ];
  const absent = absentIds(chunks, [
    { id: "across", question: "q", sourceFile: "a.pdf", answerSnippet: "alpha beta gamma delta" },
  ], "/docs");

  assert.deepEqual([...absent], [], "the file reads as one continuous text");
});

test("evidence in a file that is not indexed is reported as absent", () => {
  const absent = absentIds([chunk({ text: "alpha beta", chunkIndex: 0 })], [
    { id: "elsewhere", question: "q", sourceFile: "b.pdf", answerSnippet: "alpha beta" },
  ], "/docs");

  assert.deepEqual([...absent], ["elsewhere"]);
});

test("evidence spanning two chunks records where it starts and how far it runs", () => {
  const chunks = [
    chunk({ text: "alpha beta gamma", chunkIndex: 0 }),
    { ...chunk({ text: "delta epsilon zeta", chunkIndex: 1 }), metadata: { startIndex: 3, endIndex: 6, sectionPath: "Notes > Cash" } },
  ];
  const where = locateEvidence(chunks, [
    { id: "spans", question: "q", sourceFile: "a.pdf", answerSnippet: "gamma delta epsilon" },
  ], "/docs").get("spans");

  assert.equal(where?.firstChunkIndex, 0);
  assert.equal(where?.chunkSpan, 2, "retrieval must return both chunks to score this question");
});
