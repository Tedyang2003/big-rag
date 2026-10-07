import { test } from "node:test";
import * as assert from "node:assert/strict";
import { retrieve, type RetrieveDeps } from "../retrieval/retrieve";
import { type SearchResult } from "../vectorstore/vectorStore";
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

/**
 * `results` answers the question's vector. `byVector`, when given, answers the Nth query vector
 * instead - which is how the hypothetical's own results are driven, since High searches both in
 * one call.
 */
function makeDeps(results: SearchResult[], byVector?: SearchResult[][]) {
  const searchCalls: Array<{ limit: number; threshold: number; vectors: number }> = [];
  let clock = 0;
  const deps: RetrieveDeps = {
    vectorStore: {
      searchMany: async (queryVectors: number[][], limit: number, threshold: number) => {
        searchCalls.push({ limit, threshold, vectors: queryVectors.length });
        return queryVectors.map((_vector, i) => (byVector?.[i] ?? results).slice(0, limit));
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
    neighbourChunks: 1,
    rerankDepth: 10,
    bm25K1: 1.2,
    bm25B: 0,
    rrfConstant: 60,
    laneWeights: { vector: 1, hyde: 1, keyword: 0, date: 1 },
  });

  assert.deepEqual(searchCalls, [{ limit: 2, threshold: 0.5, vectors: 1 }]);
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
    neighbourChunks: 1,
    rerankDepth: 10,
    bm25K1: 1.2,
    bm25B: 0,
    rrfConstant: 60,
    laneWeights: { vector: 1, hyde: 1, keyword: 0, date: 1 },
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
    neighbourChunks: 1,
    rerankDepth: 10,
    bm25K1: 1.2,
    bm25B: 0,
    rrfConstant: 60,
    laneWeights: { vector: 1, hyde: 1, keyword: 0, date: 1 },
  });

  assert.deepEqual(searchCalls, [{ limit: 3, threshold: 0.5, vectors: 1 }]);
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
    neighbourChunks: 1,
    rerankDepth: 10,
    bm25K1: 1.2,
    bm25B: 0,
    rrfConstant: 60,
    laneWeights: { vector: 1, hyde: 1, keyword: 0, date: 1 },
  });

  assert.deepEqual(searchCalls[1], { limit: 50, threshold: Number.NEGATIVE_INFINITY, vectors: 1 });
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
        neighbourChunks: 1,
        rerankDepth: 10,
        bm25K1: 1.2,
        bm25B: 0,
        rrfConstant: 60,
        laneWeights: { vector: 1, hyde: 1, keyword: 0, date: 1 },
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
  neighbourChunks: 1,
  rerankDepth: 10,
  bm25K1: 1.2,
  bm25B: 0,
  rrfConstant: 60,
  laneWeights: { vector: 1, hyde: 1, keyword: 0, date: 1 },
};

function fakeCatalog(overrides: Partial<CatalogLanes> = {}): CatalogLanes {
  return {
    chunksForRanges: () => [],
    keyOf: (chunkNumber) => `shard_000/chunk-${chunkNumber}`,
    yearsPresent: () => [2026],
    ...overrides,
  };
}

/** The three passages the vector lane finds in most of the Medium tests, in its own order. */
function vectorResults(): SearchResult[] {
  return [
    makeResult({ text: "timetable notice for the new term", id: "chunk-1", chunkIndex: 0 }),
    makeResult({ text: "bus route update for commuters", id: "chunk-2", chunkIndex: 10 }),
    makeResult({ text: "bus collision on the expressway", id: "chunk-3", chunkIndex: 20 }),
  ];
}

const VECTOR_1 = "timetable notice for the new term";
const VECTOR_2 = "bus route update for commuters";
const VECTOR_3 = "bus collision on the expressway";

test("medium lifts a dated passage above the vector lane's own order", async () => {
  const { deps } = makeDeps(vectorResults());

  const result = await retrieve(
    "bus collision on 8 Sep 2026",
    {
      ...deps,
      nowDate: () => new Date(2026, 8, 16),
      // chunk-3, which the vector lane ranked last, is the one the question's date matches.
      catalog: fakeCatalog({ chunksForRanges: () => [3] }),
    },
    { ...LOW_OPTIONS, depth: "medium", retrievalLimit: 3 },
  );

  assert.deepEqual(result.passages.map((passage) => passage.text), [VECTOR_3, VECTOR_1, VECTOR_2]);
  assert.deepEqual(result.passageLanes, [["vector", "date"], ["vector"], ["vector"]]);
  assert.deepEqual(result.laneCounts, { vector: 3, hyde: 0, keyword: 0, date: 1 });
  assert.deepEqual(result.dayRanges, [{ start: 20260908, end: 20260908 }]);
  assert.ok(result.timings.some((timing) => timing.stage === "dateLane"));
  assert.ok(result.timings.some((timing) => timing.stage === "fuse"));
});

test("a date cannot introduce a passage the vector lane did not find", async () => {
  const { deps } = makeDeps(vectorResults());

  const result = await retrieve(
    "bus collision on 8 Sep 2026",
    {
      ...deps,
      nowDate: () => new Date(2026, 8, 16),
      // chunk-9 is in the question's date range but the vector lane never returned it.
      catalog: fakeCatalog({ chunksForRanges: () => [9] }),
    },
    { ...LOW_OPTIONS, depth: "medium", retrievalLimit: 5 },
  );

  assert.equal(result.passages.length, 3);
  assert.ok(!result.passages.some((passage) => passage.id === "chunk-9"));
  assert.equal(result.laneCounts.date, 0);
});

test("low depth ignores the catalog entirely", async () => {
  const { deps, searchCalls } = makeDeps([makeResult({ text: "vector hit", id: "chunk-1" })]);
  let catalogUsed = false;
  const result = await retrieve(
    "bus collision on 8 Sep 2026",
    { ...deps, catalog: fakeCatalog({ chunksForRanges: () => { catalogUsed = true; return []; } }) },
    LOW_OPTIONS,
  );
  assert.equal(catalogUsed, false);
  assert.equal(result.passages.length, 1);
  assert.deepEqual(result.laneCounts, { vector: 1, hyde: 0, keyword: 0, date: 0 });
  assert.deepEqual(searchCalls, [{ limit: 2, threshold: 0.5, vectors: 1 }]);
});

test("medium without a catalog falls back to the vector lane", async () => {
  const { deps } = makeDeps([makeResult({ text: "vector hit", id: "chunk-1" })]);
  const result = await retrieve("collision", { ...deps, catalog: null }, { ...LOW_OPTIONS, depth: "medium" });
  assert.deepEqual(result.passages.map((passage) => passage.text), ["vector hit"]);
  assert.deepEqual(result.laneCounts, { vector: 1, hyde: 0, keyword: 0, date: 0 });
});

test("a lane that throws does not fail the query", async () => {
  const { deps } = makeDeps(vectorResults());
  const result = await retrieve(
    "collision on 8 Sep 2026",
    {
      ...deps,
      nowDate: () => new Date(2026, 8, 16),
      catalog: fakeCatalog({
        chunksForRanges: () => {
          throw new Error("catalog broken");
        },
      }),
    },
    { ...LOW_OPTIONS, depth: "medium", retrievalLimit: 3 },
  );
  assert.deepEqual(result.passages.map((passage) => passage.text), [VECTOR_1, VECTOR_2, VECTOR_3]);
  assert.equal(result.laneCounts.date, 0);
});

test("medium with compaction keeps the vector lane at laneCandidates and widens the fused pool", async () => {
  const results = Array.from({ length: 12 }, (_, i) => makeResult({ text: `vector ${i}`, id: `chunk-${i}` }));
  const { deps, searchCalls } = makeDeps(results);
  const result = await retrieve(
    "collision",
    { ...deps, catalog: fakeCatalog() },
    { ...LOW_OPTIONS, depth: "medium", retrievalLimit: 2, enableContextCompaction: true },
  );
  assert.deepEqual(searchCalls, [{ limit: 30, threshold: 0.5, vectors: 1 }]);
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
      catalog: fakeCatalog({ chunksForRanges: () => [2] }),
    },
    { ...LOW_OPTIONS, depth: "medium", retrievalLimit: 2 },
  );

  assert.deepEqual(result.passageLanes, [["vector", "date"], ["vector"]]);
  assert.deepEqual(result.passages.map((passage) => passage.text), [VECTOR_2, VECTOR_1]);
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
      catalog: fakeCatalog({ chunksForRanges: () => [3] }),
    },
    { ...LOW_OPTIONS, depth: "medium", retrievalLimit: 1, diagnosticPoolSize: 10 },
  );

  assert.deepEqual(result.passages.map((passage) => passage.text), [VECTOR_3]);
  // The pool is the fused ranking, so pool metrics measure the date boost rather than the
  // vector lane's own order.
  assert.deepEqual(result.diagnosticPool.map((passage) => passage.text), [VECTOR_3, VECTOR_1, VECTOR_2]);
  assert.equal(searchCalls.length, 1, "the pool reuses the vector search instead of running another");
});

test("at low depth the diagnostic pool is still an unthresholded vector search", async () => {
  const results = [makeResult({ text: "One." }), makeResult({ text: "Two.", chunkIndex: 5 })];
  const { deps, searchCalls } = makeDeps(results);

  const output = await retrieve("question", deps, { ...LOW_OPTIONS, retrievalLimit: 1, diagnosticPoolSize: 2 });

  assert.deepEqual(output.diagnosticPool.map((passage) => passage.text), ["One.", "Two."]);
  assert.deepEqual(searchCalls, [
    { limit: 1, threshold: 0.5, vectors: 1 },
    { limit: 2, threshold: Number.NEGATIVE_INFINITY, vectors: 1 },
  ]);
});

test("a date match lifts a chunk the other lanes found, and never introduces one they did not", async () => {
  // The vector lane ranks chunk-1 then chunk-2; only chunk-2 is dated in the question's year.
  const { deps } = makeDeps([
    makeResult({ text: "wrong year", id: "chunk-1", chunkIndex: 0 }),
    makeResult({ text: "right year", id: "chunk-2", chunkIndex: 10 }),
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
    makeResult({ text: "first", id: "chunk-1", chunkIndex: 0 }),
    makeResult({ text: "second", id: "chunk-2", chunkIndex: 10 }),
  ]);

  const result = await retrieve(
    "what were the results",
    { ...deps, catalog: fakeCatalog({ chunksForRanges: () => [2] }) },
    { ...LOW_OPTIONS, depth: "medium", retrievalLimit: 5 },
  );

  assert.deepEqual(result.passages.map((passage) => passage.text), ["first", "second"]);
  assert.equal(result.laneCounts.date, 0);
});


/** A passage only the hypothetical's search finds, so the hyde lane has something of its own. */
function hydeOnlyResult(): SearchResult {
  return makeResult({ text: "only the draft found this", id: "chunk-9", chunkIndex: 90 });
}

test("high searches the question and its hypothetical in one call, and fuses both", async () => {
  const { deps, searchCalls } = makeDeps(vectorResults(), [vectorResults(), [hydeOnlyResult()]]);

  const result = await retrieve(
    "what were capital expenditures",
    { ...deps, catalog: fakeCatalog(), hypothetical: async () => "Capital expenditures were 1,577." },
    { ...LOW_OPTIONS, depth: "high", retrievalLimit: 4 },
  );

  assert.deepEqual(searchCalls, [{ limit: 30, threshold: 0.5, vectors: 2 }], "one call, two vectors");
  // Top of its own lane, so it fuses level with the question's first result and ahead of the rest.
  assert.ok(
    result.passages.some((passage) => passage.text === "only the draft found this"),
    "a passage only the hypothetical found should reach the results",
  );
  assert.equal(result.laneCounts.hyde, 1);
  assert.deepEqual(result.passageLanes[result.passages.findIndex((p) => p.id === "chunk-9")], ["hyde"]);
  assert.ok(result.timings.some((timing) => timing.stage === "hypothetical"));
});

test("high with no hypothetical produces exactly what medium produces", async () => {
  const options = { ...LOW_OPTIONS, retrievalLimit: 3 };
  const catalog = () => fakeCatalog({ chunksForRanges: () => [3] });
  const nowDate = () => new Date(2026, 8, 16);

  const medium = await retrieve(
    "bus collision on 8 Sep 2026",
    { ...makeDeps(vectorResults()).deps, catalog: catalog(), nowDate },
    { ...options, depth: "medium" },
  );
  const high = await retrieve(
    "bus collision on 8 Sep 2026",
    { ...makeDeps(vectorResults()).deps, catalog: catalog(), nowDate, hypothetical: async () => null },
    { ...options, depth: "high" },
  );

  assert.deepEqual(high.passages.map((p) => p.text), medium.passages.map((p) => p.text));
  assert.deepEqual(high.passageLanes, medium.passageLanes);
  assert.deepEqual(high.laneCounts, medium.laneCounts);
});

test("a hyde weight of zero reproduces medium even when a hypothetical was drafted", async () => {
  // The failure this guards: a zeroed lane that still nominates puts its chunks in the
  // ranking at no score, where the date boost lifts them into the results anyway.
  const byVector = [vectorResults(), [hydeOnlyResult()]];
  const options = { ...LOW_OPTIONS, retrievalLimit: 3 };
  const nowDate = () => new Date(2026, 8, 16);
  // chunk-9 is the hyde-only passage, and it is the one the question's date matches.
  const catalog = () => fakeCatalog({ chunksForRanges: () => [9] });

  const zeroed = await retrieve(
    "bus collision on 8 Sep 2026",
    {
      ...makeDeps(vectorResults(), byVector).deps,
      catalog: catalog(),
      nowDate,
      hypothetical: async () => "a draft",
    },
    { ...options, depth: "high", diagnosticPoolSize: 10, laneWeights: { vector: 1, hyde: 0, keyword: 0, date: 1 } },
  );
  const medium = await retrieve(
    "bus collision on 8 Sep 2026",
    { ...makeDeps(vectorResults()).deps, catalog: catalog(), nowDate },
    { ...options, depth: "medium", diagnosticPoolSize: 10 },
  );

  assert.deepEqual(zeroed.passages.map((p) => p.text), medium.passages.map((p) => p.text));
  assert.deepEqual(zeroed.passageLanes, medium.passageLanes);
  assert.deepEqual(zeroed.laneCounts, medium.laneCounts);
  // The pool too: a nomination that only shows up there still moves the pool metrics.
  assert.deepEqual(
    zeroed.diagnosticPool.map((p) => p.id),
    medium.diagnosticPool.map((p) => p.id),
  );
  assert.ok(
    !zeroed.passages.some((p) => p.id === "chunk-9") && !zeroed.diagnosticPool.some((p) => p.id === "chunk-9"),
    "a chunk only the zeroed lane found must not appear anywhere",
  );
});

test("the hypothetical's own text never reaches a returned passage", async () => {
  const draft = "Capital expenditures were 1,577 in fiscal 2023.";
  const { deps } = makeDeps(vectorResults(), [vectorResults(), [hydeOnlyResult()]]);

  const result = await retrieve(
    "what were capital expenditures",
    { ...deps, catalog: fakeCatalog(), hypothetical: async () => draft },
    { ...LOW_OPTIONS, depth: "high", retrievalLimit: 5 },
  );

  assert.ok(result.passages.length > 0);
  for (const passage of [...result.passages, ...result.diagnosticPool]) {
    assert.ok(!passage.text.includes(draft), "the draft is embedded and discarded, never returned");
  }
});

test("low and medium never draft a hypothetical", async () => {
  for (const depth of ["low", "medium"] as const) {
    let drafted = false;
    await retrieve(
      "a question",
      {
        ...makeDeps(vectorResults()).deps,
        catalog: fakeCatalog(),
        hypothetical: async () => {
          drafted = true;
          return "a draft";
        },
      },
      { ...LOW_OPTIONS, depth },
    );
    assert.equal(drafted, false, `${depth} should not call the model`);
  }
});

/** Four consecutive chunks of one file, so adjacency is real and the vector order is known. */
function consecutiveResults(): SearchResult[] {
  return [
    makeResult({ text: "chunk three", id: "c3", chunkIndex: 3, filePath: "/docs/f.pdf" }),
    makeResult({ text: "chunk one", id: "c1", chunkIndex: 1, filePath: "/docs/f.pdf" }),
    makeResult({ text: "chunk two", id: "c2", chunkIndex: 2, filePath: "/docs/f.pdf" }),
    makeResult({ text: "chunk four", id: "c4", chunkIndex: 4, filePath: "/docs/f.pdf" }),
  ];
}

test("a winner is returned with the neighbours that are already candidates", async () => {
  const { deps } = makeDeps(consecutiveResults());
  const result = await retrieve(
    "a question",
    { ...deps, catalog: fakeCatalog() },
    { ...LOW_OPTIONS, depth: "medium", retrievalLimit: 1 },
  );

  // chunk three wins; chunks two and four are candidates beside it, so all three come back.
  assert.deepEqual(result.passages.map((passage) => passage.chunkIndex).sort((a, b) => a - b), [2, 3, 4]);
});

test("a winner and its neighbours are returned in document order", async () => {
  const { deps } = makeDeps(consecutiveResults());
  const result = await retrieve(
    "a question",
    { ...deps, catalog: fakeCatalog() },
    { ...LOW_OPTIONS, depth: "medium", retrievalLimit: 1 },
  );

  // Chunk three wins and drags two and four. A model reading them in the order given should see
  // the passage and its continuation the way the document has them, not winner-first.
  assert.deepEqual(result.passages.map((passage) => passage.chunkIndex), [2, 3, 4]);
});

test("expansion never reaches outside the candidates or into another file", async () => {
  const { deps } = makeDeps([
    makeResult({ text: "winner", id: "w", chunkIndex: 7, filePath: "/docs/f.pdf" }),
    makeResult({ text: "same index, other file", id: "o", chunkIndex: 8, filePath: "/docs/other.pdf" }),
  ]);
  const result = await retrieve(
    "a question",
    { ...deps, catalog: fakeCatalog() },
    { ...LOW_OPTIONS, depth: "medium", retrievalLimit: 1 },
  );

  // chunk 8 of another file is adjacent by number only, and chunk 6 of this file was never a
  // candidate, so the winner comes back alone rather than dragging either in.
  assert.deepEqual(result.passages.map((passage) => passage.text), ["winner"]);
});

test("a passage already chosen is not added twice by its neighbour", async () => {
  const { deps } = makeDeps(consecutiveResults());
  const result = await retrieve(
    "a question",
    { ...deps, catalog: fakeCatalog() },
    { ...LOW_OPTIONS, depth: "medium", retrievalLimit: 4 },
  );

  const indices = result.passages.map((passage) => passage.chunkIndex).sort((a, b) => a - b);
  assert.deepEqual(indices, [1, 2, 3, 4], "each chunk appears once");
});

test("neighbourChunks 0 returns exactly the winners", async () => {
  const { deps } = makeDeps(consecutiveResults());
  const result = await retrieve(
    "a question",
    { ...deps, catalog: fakeCatalog() },
    { ...LOW_OPTIONS, depth: "medium", retrievalLimit: 1, neighbourChunks: 0 },
  );

  assert.deepEqual(result.passages.map((passage) => passage.text), ["chunk three"]);
});

test("an evidence span left incomplete by the limit is completed by expansion", async () => {
  // The case from the report: evidence runs across chunks 2, 3 and 4 while only two passages
  // are returned, so chunk 4 was missing and the answer did not count.
  const { deps } = makeDeps([
    makeResult({ text: "two", id: "c2", chunkIndex: 2, filePath: "/docs/f.pdf" }),
    makeResult({ text: "three", id: "c3", chunkIndex: 3, filePath: "/docs/f.pdf" }),
    makeResult({ text: "four", id: "c4", chunkIndex: 4, filePath: "/docs/f.pdf" }),
    makeResult({ text: "unrelated", id: "z", chunkIndex: 145, filePath: "/docs/f.pdf" }),
  ]);
  const result = await retrieve(
    "a question",
    { ...deps, catalog: fakeCatalog() },
    { ...LOW_OPTIONS, depth: "medium", retrievalLimit: 2 },
  );

  assert.ok(
    [2, 3, 4].every((index) => result.passages.some((passage) => passage.chunkIndex === index)),
    "the whole span reaches the model",
  );
});

test("the keyword rerank actually reorders the candidates it is given", async () => {
  // Against "bus collision", only chunk-3 holds both terms; the vector lane ranks it last.
  // This fails if the reranker is handed an empty candidate list, which is how it was first
  // wired back in - it ran, cost nothing, and changed nothing.
  const { deps } = makeDeps(vectorResults());

  const result = await retrieve(
    "bus collision",
    { ...deps, catalog: fakeCatalog() },
    {
      ...LOW_OPTIONS,
      depth: "medium",
      retrievalLimit: 3,
      rerankDepth: 1,
      neighbourChunks: 0,
      laneWeights: { vector: 1, hyde: 1, keyword: 1, date: 1 },
    },
  );

  assert.equal(result.passages[0].text, VECTOR_3, "the keyword match is lifted to the front");
  assert.ok(result.passages[0] && result.laneCounts.keyword >= 1, "and is attributed to the keyword signal");
});

test("a keyword weight of zero leaves no trace at all", async () => {
  const { deps } = makeDeps(vectorResults());
  const options = { ...LOW_OPTIONS, depth: "medium" as const, retrievalLimit: 3, neighbourChunks: 0 };

  const off = await retrieve(
    "bus collision",
    { ...deps, catalog: fakeCatalog() },
    { ...options, laneWeights: { vector: 1, hyde: 1, keyword: 0, date: 1 } },
  );

  assert.deepEqual(off.passages.map((p) => p.text), [VECTOR_1, VECTOR_2, VECTOR_3], "the vector order stands");
  assert.equal(off.laneCounts.keyword, 0, "and nothing is attributed to a signal that was off");
  assert.ok(!off.timings.some((t) => t.stage === "keywordRerank"), "the stage does not even run");
});
