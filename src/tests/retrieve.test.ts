import { test } from "node:test";
import * as assert from "node:assert/strict";
import { retrieve, type RetrieveDeps } from "../retrieval/retrieve";
import { type SearchResult } from "../vectorstore/vectorStore";
import { type DayRange } from "../retrieval/queryDates";
import { type CatalogLanes } from "../retrieval/retrieve";

function makeResult(overrides: Partial<SearchResult> & { text: string }): SearchResult {
  return {
    id: "chunk-0",
    score: 0.9,
    filePath: "/docs/a.md",
    fileName: "a.md",
    chunkIndex: 0,
    shardName: "shard_000",
    metadata: {},
    ...overrides,
  };
}

function makeDeps(results: SearchResult[]) {
  const searchCalls: Array<{ limit: number; threshold: number }> = [];
  let clock = 0;
  const deps: RetrieveDeps = {
    vectorStore: {
      search: async (_vector: number[], limit: number, threshold: number) => {
        searchCalls.push({ limit, threshold });
        return results.slice(0, limit);
      },
    },
    embedQuery: async () => [1, 0],
    embedSentences: async (sentences: string[]) => sentences.map(() => ({ embedding: [1, 0] })),
    countTokens: async () => 10,
    now: () => {
      clock += 5;
      return clock;
    },
  };
  return { deps, searchCalls };
}

test("retrieve searches with retrievalLimit and threshold when compaction is off", async () => {
  const results = [
    makeResult({ text: "One.", chunkIndex: 0 }),
    makeResult({ text: "Two.", chunkIndex: 5 }),
  ];
  const { deps, searchCalls } = makeDeps(results);

  const output = await retrieve("question", deps, {
    retrievalLimit: 2,
    retrievalThreshold: 0.5,
    chunkSize: 512,
    enableContextCompaction: false,
    depth: "low",
    laneCandidates: 30,
    rrfConstant: 60,
    laneWeights: { vector: 1, keyword: 1, date: 1 },
  });

  assert.deepEqual(searchCalls, [{ limit: 2, threshold: 0.5 }]);
  assert.deepEqual(output.passages.map((p) => p.text), ["One.", "Two."]);
  assert.deepEqual(output.diagnosticPool, []);
  assert.deepEqual(
    output.timings.map((t) => t.stage),
    ["embedQuery", "vectorSearch", "trimOverlap"],
  );
  assert.ok(output.timings.every((t) => t.ms === 5));
});

test("retrieve trims overlapping adjacent chunks", async () => {
  const results = [
    makeResult({ text: "one two three four five", chunkIndex: 0, metadata: { startIndex: 0, endIndex: 5 } }),
    makeResult({ text: "four five six seven", chunkIndex: 1, metadata: { startIndex: 3, endIndex: 7 } }),
  ];
  const { deps } = makeDeps(results);

  const output = await retrieve("question", deps, {
    retrievalLimit: 2,
    retrievalThreshold: 0.5,
    chunkSize: 512,
    enableContextCompaction: false,
    depth: "low",
    laneCandidates: 30,
    rrfConstant: 60,
    laneWeights: { vector: 1, keyword: 1, date: 1 },
  });

  assert.equal(output.passages[1].text, "six seven");
});

test("retrieve widens the pool and fills the token budget when compaction is on", async () => {
  const results = [
    makeResult({ text: "First fact.", chunkIndex: 0 }),
    makeResult({ text: "Second fact.", chunkIndex: 10 }),
    makeResult({ text: "Third fact.", chunkIndex: 20 }),
  ];
  const { deps, searchCalls } = makeDeps(results);

  // Budget = retrievalLimit (1) * chunkSize (15) = 15 tokens; each passage costs 10.
  const output = await retrieve("question", deps, {
    retrievalLimit: 1,
    retrievalThreshold: 0.5,
    chunkSize: 15,
    enableContextCompaction: true,
    depth: "low",
    laneCandidates: 30,
    rrfConstant: 60,
    laneWeights: { vector: 1, keyword: 1, date: 1 },
  });

  assert.deepEqual(searchCalls, [{ limit: 3, threshold: 0.5 }]);
  assert.deepEqual(output.passages.map((p) => p.text), ["First fact."]);
  assert.deepEqual(
    output.timings.map((t) => t.stage),
    ["embedQuery", "vectorSearch", "trimOverlap", "compaction"],
  );
});

test("retrieve collects an unthresholded diagnostic pool when requested", async () => {
  const results = [makeResult({ text: "One.", chunkIndex: 0 })];
  const { deps, searchCalls } = makeDeps(results);

  const output = await retrieve("question", deps, {
    retrievalLimit: 5,
    retrievalThreshold: 0.5,
    chunkSize: 512,
    enableContextCompaction: false,
    diagnosticPoolSize: 50,
    depth: "low",
    laneCandidates: 30,
    rrfConstant: 60,
    laneWeights: { vector: 1, keyword: 1, date: 1 },
  });

  assert.deepEqual(searchCalls[1], { limit: 50, threshold: Number.NEGATIVE_INFINITY });
  assert.deepEqual(output.diagnosticPool.map((p) => p.text), ["One."]);
  assert.equal(output.timings.length, 3, "diagnostic search is not a user-facing stage");
});

test("retrieve stops before searching when aborted after embedding the query", async () => {
  const { deps, searchCalls } = makeDeps([makeResult({ text: "One.", chunkIndex: 0 })]);
  const controller = new AbortController();
  deps.embedQuery = async () => {
    controller.abort();
    return [1, 0];
  };

  await assert.rejects(
    () =>
      retrieve("question", deps, {
        retrievalLimit: 5,
        retrievalThreshold: 0.5,
        chunkSize: 512,
        enableContextCompaction: false,
        abortSignal: controller.signal,
        depth: "low",
        laneCandidates: 30,
        rrfConstant: 60,
        laneWeights: { vector: 1, keyword: 1, date: 1 },
      }),
    (error: unknown) => error instanceof Error && error.name === "AbortError",
  );
  assert.equal(searchCalls.length, 0);
});

const LOW_OPTIONS = {
  retrievalLimit: 2,
  retrievalThreshold: 0.5,
  chunkSize: 100,
  enableContextCompaction: false,
  depth: "low" as const,
  laneCandidates: 30,
  rrfConstant: 60,
  laneWeights: { vector: 1, keyword: 1, date: 1 },
};

function fakeCatalog(overrides: Partial<CatalogLanes> = {}): CatalogLanes {
  return {
    hasWordTable: true,
    scoreTerms: () => new Map<number, number>(),
    chunksForRanges: () => [],
    keyOf: (chunkNumber) => `shard_000/chunk-${chunkNumber}`,
    latestDayOf: () => 0,
    yearsPresent: () => [2026],
    ...overrides,
  };
}

test("medium fuses vector, keyword and date lanes", async () => {
  const vectorHit = makeResult({ text: "vector hit", id: "chunk-1" });
  const { deps } = makeDeps([vectorHit]);
  const fetched: string[][] = [];

  const result = await retrieve(
    "bus collision on 8 Sep 2026",
    {
      ...deps,
      nowDate: () => new Date(2026, 8, 16),
      catalog: fakeCatalog({
        scoreTerms: () => new Map([[2, 5], [3, 1]]),
        chunksForRanges: () => [3, 4],
      }),
      fetchChunks: async (keys) => {
        fetched.push(keys);
        return keys.map((key) => makeResult({ text: `fetched ${key}`, id: key.split("/")[1] }));
      },
    },
    { ...LOW_OPTIONS, depth: "medium", retrievalLimit: 3 },
  );

  // chunk-3 is ranked by both the keyword and date lanes, so it fuses above the
  // single-lane chunks; chunk-1 (vector) and chunk-2 (keyword) tie and keep lane order.
  assert.deepEqual(result.passages.map((passage) => passage.text), [
    "fetched shard_000/chunk-3",
    "vector hit",
    "fetched shard_000/chunk-2",
  ]);
  assert.deepEqual(result.laneCounts, { vector: 1, keyword: 2, date: 1 });
  assert.deepEqual(result.dayRanges, [{ start: 20260908, end: 20260908 }]);
  assert.deepEqual(fetched, [["shard_000/chunk-3", "shard_000/chunk-2"]]);
  assert.ok(result.timings.some((timing) => timing.stage === "keywordLane"));
  assert.ok(result.timings.some((timing) => timing.stage === "dateLane"));
  assert.ok(result.timings.some((timing) => timing.stage === "fuse"));
});

test("low depth ignores the catalog entirely", async () => {
  const { deps, searchCalls } = makeDeps([makeResult({ text: "vector hit", id: "chunk-1" })]);
  let catalogUsed = false;
  const result = await retrieve(
    "bus collision on 8 Sep 2026",
    { ...deps, catalog: fakeCatalog({ scoreTerms: () => { catalogUsed = true; return new Map(); } }) },
    LOW_OPTIONS,
  );
  assert.equal(catalogUsed, false);
  assert.equal(result.passages.length, 1);
  assert.deepEqual(result.laneCounts, { vector: 1, keyword: 0, date: 0 });
  assert.deepEqual(searchCalls, [{ limit: 2, threshold: 0.5 }]);
});

test("medium without a date runs two lanes", async () => {
  const { deps } = makeDeps([makeResult({ text: "vector hit", id: "chunk-1" })]);
  const result = await retrieve(
    "what caused the collision",
    {
      ...deps,
      catalog: fakeCatalog({ scoreTerms: () => new Map([[2, 3]]) }),
      fetchChunks: async (keys) => keys.map((key) => makeResult({ text: `fetched ${key}`, id: key.split("/")[1] })),
    },
    { ...LOW_OPTIONS, depth: "medium" },
  );
  assert.deepEqual(result.dayRanges, []);
  assert.equal(result.laneCounts.date, 0);
  assert.equal(result.laneCounts.keyword, 1);
});

test("medium without a catalog falls back to the vector lane", async () => {
  const { deps } = makeDeps([makeResult({ text: "vector hit", id: "chunk-1" })]);
  const result = await retrieve("collision", { ...deps, catalog: null }, { ...LOW_OPTIONS, depth: "medium" });
  assert.deepEqual(result.passages.map((passage) => passage.text), ["vector hit"]);
  assert.deepEqual(result.laneCounts, { vector: 1, keyword: 0, date: 0 });
});

test("a lane that throws does not fail the query", async () => {
  const { deps } = makeDeps([makeResult({ text: "vector hit", id: "chunk-1" })]);
  const result = await retrieve(
    "collision on 8 Sep 2026",
    {
      ...deps,
      nowDate: () => new Date(2026, 8, 16),
      catalog: fakeCatalog({
        scoreTerms: () => {
          throw new Error("catalog broken");
        },
      }),
      fetchChunks: async (keys) => keys.map((key) => makeResult({ text: `fetched ${key}`, id: key.split("/")[1] })),
    },
    { ...LOW_OPTIONS, depth: "medium" },
  );
  assert.equal(result.passages[0].text, "vector hit");
  assert.equal(result.laneCounts.keyword, 0);
});

test("medium with compaction keeps the vector lane at laneCandidates and widens the fused pool", async () => {
  const results = Array.from({ length: 12 }, (_, i) => makeResult({ text: `vector ${i}`, id: `chunk-${i}` }));
  const { deps, searchCalls } = makeDeps(results);
  const result = await retrieve(
    "collision",
    { ...deps, catalog: fakeCatalog(), fetchChunks: async () => [] },
    { ...LOW_OPTIONS, depth: "medium", retrievalLimit: 2, enableContextCompaction: true },
  );
  assert.deepEqual(searchCalls, [{ limit: 30, threshold: 0.5 }]);
  assert.ok(result.passages.length > 2, `expected a widened pool, got ${result.passages.length}`);
});
