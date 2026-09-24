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
    rerankDepth: 10,
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
    rerankDepth: 10,
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
    rerankDepth: 10,
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
    rerankDepth: 10,
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
        rerankDepth: 10,
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
  rerankDepth: 10,
  rrfConstant: 60,
  laneWeights: { vector: 1, keyword: 1, date: 1 },
};

function fakeCatalog(overrides: Partial<CatalogLanes> = {}): CatalogLanes {
  return {
    rankByTerms: () => [],
    chunksForRanges: () => [],
    keyOf: (chunkNumber) => `shard_000/chunk-${chunkNumber}`,
    latestDayOf: () => 0,
    yearsPresent: () => [2026],
    ...overrides,
  };
}

/** The three passages the vector lane finds in most of the Medium tests, in its own order. */
function vectorResults(): SearchResult[] {
  return [
    makeResult({ text: "vector 1", id: "chunk-1", chunkIndex: 0 }),
    makeResult({ text: "vector 2", id: "chunk-2", chunkIndex: 10 }),
    makeResult({ text: "vector 3", id: "chunk-3", chunkIndex: 20 }),
  ];
}

test("medium reranks the vector lane's candidates with keywords and dates", async () => {
  const { deps } = makeDeps(vectorResults());

  const result = await retrieve(
    "bus collision on 8 Sep 2026",
    {
      ...deps,
      nowDate: () => new Date(2026, 8, 16),
      catalog: fakeCatalog({
        // BM25 likes chunk-3 most, then chunk-2; the query's date matches chunk-2.
        rankByTerms: () => ["shard_000/chunk-3", "shard_000/chunk-2"],
        chunksForRanges: () => [2],
      }),
    },
    { ...LOW_OPTIONS, depth: "medium", retrievalLimit: 3 },
  );

  // chunk-2 carries both boosts and wins from third place in the vector lane; chunk-3
  // carries one and passes chunk-1, which the vector lane had ranked first.
  assert.deepEqual(result.passages.map((passage) => passage.text), ["vector 2", "vector 3", "vector 1"]);
  assert.deepEqual(result.passageLanes, [["vector", "keyword", "date"], ["vector", "keyword"], ["vector"]]);
  assert.deepEqual(result.laneCounts, { vector: 3, keyword: 2, date: 1 });
  assert.deepEqual(result.dayRanges, [{ start: 20260908, end: 20260908 }]);
  assert.ok(result.timings.some((timing) => timing.stage === "keywordRerank"));
  assert.ok(result.timings.some((timing) => timing.stage === "dateLane"));
  assert.ok(result.timings.some((timing) => timing.stage === "fuse"));
});

test("only BM25's top rerankDepth passages collect a boost", async () => {
  const { deps } = makeDeps(vectorResults());

  const result = await retrieve(
    "bus collision",
    {
      ...deps,
      catalog: fakeCatalog({
        // BM25 rates the vector lane's last passage best and its first passage second.
        rankByTerms: () => ["shard_000/chunk-3", "shard_000/chunk-1", "shard_000/chunk-2"],
      }),
    },
    { ...LOW_OPTIONS, depth: "medium", retrievalLimit: 3, rerankDepth: 1 },
  );

  // Only chunk-3 is boosted, so it passes chunk-1 despite the vector lane ranking it last.
  // chunk-1, BM25's second choice, collects nothing and keeps its own position.
  assert.deepEqual(result.passages.map((passage) => passage.text), ["vector 3", "vector 1", "vector 2"]);
  assert.deepEqual(result.passageLanes, [["vector", "keyword"], ["vector"], ["vector"]]);
  assert.equal(result.laneCounts.keyword, 1);
});

test("keywords and dates cannot introduce a passage the vector lane did not find", async () => {
  const { deps } = makeDeps(vectorResults());

  const result = await retrieve(
    "bus collision on 8 Sep 2026",
    {
      ...deps,
      nowDate: () => new Date(2026, 8, 16),
      catalog: fakeCatalog({
        // Both name chunk-9, which the vector lane never returned.
        rankByTerms: (_terms, candidates) => [...candidates.map((candidate) => candidate.key), "shard_000/chunk-9"],
        chunksForRanges: () => [9],
      }),
    },
    { ...LOW_OPTIONS, depth: "medium", retrievalLimit: 5 },
  );

  assert.deepEqual(result.passages.map((passage) => passage.text), ["vector 1", "vector 2", "vector 3"]);
  assert.equal(result.laneCounts.date, 0);
});

test("the reranker is only offered the passages the vector lane found", async () => {
  const { deps } = makeDeps(vectorResults());
  let offered: string[] = [];

  await retrieve(
    "bus collision",
    {
      ...deps,
      catalog: fakeCatalog({
        rankByTerms: (_terms, candidates) => {
          offered = candidates.map((candidate) => candidate.text);
          return [];
        },
      }),
    },
    { ...LOW_OPTIONS, depth: "medium", retrievalLimit: 3 },
  );

  assert.deepEqual(offered, ["vector 1", "vector 2", "vector 3"]);
});

test("low depth ignores the catalog entirely", async () => {
  const { deps, searchCalls } = makeDeps([makeResult({ text: "vector hit", id: "chunk-1" })]);
  let catalogUsed = false;
  const result = await retrieve(
    "bus collision on 8 Sep 2026",
    { ...deps, catalog: fakeCatalog({ rankByTerms: () => { catalogUsed = true; return []; } }) },
    LOW_OPTIONS,
  );
  assert.equal(catalogUsed, false);
  assert.equal(result.passages.length, 1);
  assert.deepEqual(result.laneCounts, { vector: 1, keyword: 0, date: 0 });
  assert.deepEqual(searchCalls, [{ limit: 2, threshold: 0.5 }]);
});

test("medium without a date reranks on keywords alone", async () => {
  const { deps } = makeDeps(vectorResults());
  const result = await retrieve(
    "what caused the collision",
    { ...deps, catalog: fakeCatalog({ rankByTerms: () => ["shard_000/chunk-2"] }) },
    { ...LOW_OPTIONS, depth: "medium", retrievalLimit: 3 },
  );
  assert.deepEqual(result.dayRanges, []);
  assert.equal(result.laneCounts.date, 0);
  assert.equal(result.laneCounts.keyword, 1);
  assert.equal(result.passages[0].text, "vector 2");
});

test("medium without a catalog falls back to the vector lane", async () => {
  const { deps } = makeDeps([makeResult({ text: "vector hit", id: "chunk-1" })]);
  const result = await retrieve("collision", { ...deps, catalog: null }, { ...LOW_OPTIONS, depth: "medium" });
  assert.deepEqual(result.passages.map((passage) => passage.text), ["vector hit"]);
  assert.deepEqual(result.laneCounts, { vector: 1, keyword: 0, date: 0 });
});

test("a reranker that throws does not fail the query", async () => {
  const { deps } = makeDeps(vectorResults());
  const result = await retrieve(
    "collision on 8 Sep 2026",
    {
      ...deps,
      nowDate: () => new Date(2026, 8, 16),
      catalog: fakeCatalog({
        rankByTerms: () => {
          throw new Error("catalog broken");
        },
      }),
    },
    { ...LOW_OPTIONS, depth: "medium", retrievalLimit: 3 },
  );
  assert.deepEqual(result.passages.map((passage) => passage.text), ["vector 1", "vector 2", "vector 3"]);
  assert.equal(result.laneCounts.keyword, 0);
});

test("medium with compaction keeps the vector lane at laneCandidates and widens the fused pool", async () => {
  const results = Array.from({ length: 12 }, (_, i) => makeResult({ text: `vector ${i}`, id: `chunk-${i}` }));
  const { deps, searchCalls } = makeDeps(results);
  const result = await retrieve(
    "collision",
    { ...deps, catalog: fakeCatalog() },
    { ...LOW_OPTIONS, depth: "medium", retrievalLimit: 2, enableContextCompaction: true },
  );
  assert.deepEqual(searchCalls, [{ limit: 30, threshold: 0.5 }]);
  assert.ok(result.passages.length > 2, `expected a widened pool, got ${result.passages.length}`);
  // laneCounts is counted over the passages that survived compaction, not every fused winner.
  assert.equal(result.laneCounts.vector, result.passages.length);
});

test("medium reports the lanes that ranked each returned passage", async () => {
  const { deps } = makeDeps(vectorResults());

  const result = await retrieve(
    "bus collision on 8 Sep 2026",
    {
      ...deps,
      nowDate: () => new Date(2026, 8, 16),
      catalog: fakeCatalog({
        rankByTerms: () => ["shard_000/chunk-2"],
        chunksForRanges: () => [2],
      }),
    },
    { ...LOW_OPTIONS, depth: "medium", retrievalLimit: 2 },
  );

  assert.deepEqual(result.passageLanes, [["vector", "keyword", "date"], ["vector"]]);
  assert.deepEqual(result.passages.map((passage) => passage.text), ["vector 2", "vector 1"]);
});

test("low depth reports no lanes per passage", async () => {
  const { deps } = makeDeps([makeResult({ text: "vector hit", id: "chunk-1" })]);
  const result = await retrieve("collision", deps, LOW_OPTIONS);
  assert.deepEqual(result.passageLanes, [[]]);
});

test("at medium depth the diagnostic pool is the fused ranking, not a vector-only search", async () => {
  const { deps, searchCalls } = makeDeps(vectorResults());

  const result = await retrieve(
    "bus collision on 8 Sep 2026",
    {
      ...deps,
      nowDate: () => new Date(2026, 8, 16),
      catalog: fakeCatalog({
        rankByTerms: () => ["shard_000/chunk-3", "shard_000/chunk-2"],
        chunksForRanges: () => [2],
      }),
    },
    { ...LOW_OPTIONS, depth: "medium", retrievalLimit: 1, diagnosticPoolSize: 10 },
  );

  assert.deepEqual(result.passages.map((passage) => passage.text), ["vector 2"]);
  // The pool is the fused ranking, so pool metrics measure the rerank rather than the
  // vector lane's own order.
  assert.deepEqual(result.diagnosticPool.map((passage) => passage.text), ["vector 2", "vector 3", "vector 1"]);
  assert.equal(searchCalls.length, 1, "the pool reuses the vector search instead of running another");
});

test("at low depth the diagnostic pool is still an unthresholded vector search", async () => {
  const results = [makeResult({ text: "One." }), makeResult({ text: "Two.", chunkIndex: 5 })];
  const { deps, searchCalls } = makeDeps(results);

  const output = await retrieve("question", deps, { ...LOW_OPTIONS, retrievalLimit: 1, diagnosticPoolSize: 2 });

  assert.deepEqual(output.diagnosticPool.map((passage) => passage.text), ["One.", "Two."]);
  assert.deepEqual(searchCalls, [
    { limit: 1, threshold: 0.5 },
    { limit: 2, threshold: Number.NEGATIVE_INFINITY },
  ]);
});

test("a date match lifts a chunk the other lanes found, and never introduces one they did not", async () => {
  // The vector lane ranks chunk-1 then chunk-2; only chunk-2 is dated in the question's year.
  const { deps } = makeDeps([
    makeResult({ text: "wrong year", id: "chunk-1" }),
    makeResult({ text: "right year", id: "chunk-2" }),
  ]);

  const result = await retrieve(
    "what were the results in FY2026",
    {
      ...deps,
      nowDate: () => new Date(2026, 8, 16),
      catalog: fakeCatalog({
        // chunk-2 was retrieved; chunk-7 is in the right year but nobody found it.
        chunksForRanges: () => [2, 7],
      }),
    },
    { ...LOW_OPTIONS, depth: "medium", retrievalLimit: 5 },
  );

  assert.deepEqual(result.passages.map((passage) => passage.text), ["right year", "wrong year"]);
  assert.ok(
    !result.passages.some((passage) => passage.text.includes("chunk-7")),
    "a chunk no lane retrieved is not pulled in by its date alone",
  );
  assert.deepEqual(result.passageLanes[0], ["vector", "date"]);
  assert.equal(result.laneCounts.date, 1);
});

test("a question with no date leaves the ranking untouched", async () => {
  const { deps } = makeDeps([
    makeResult({ text: "first", id: "chunk-1" }),
    makeResult({ text: "second", id: "chunk-2" }),
  ]);

  const result = await retrieve(
    "what were the results",
    { ...deps, catalog: fakeCatalog({ chunksForRanges: () => [2] }) },
    { ...LOW_OPTIONS, depth: "medium", retrievalLimit: 5 },
  );

  assert.deepEqual(result.passages.map((passage) => passage.text), ["first", "second"]);
  assert.equal(result.laneCounts.date, 0);
});
