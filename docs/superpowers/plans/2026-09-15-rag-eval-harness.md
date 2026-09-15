# RAG Evaluation Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CLI that generates reviewable test questions from indexed documents and measures retrieval quality against them, using the exact retrieval code the plugin runs.

**Architecture:** Extract the retrieval steps from `promptPreprocessor.ts` into a pure `retrieve()` function with injected dependencies and per-stage timings. The plugin and a new `evalCli.ts` both call it. Generation and scoring logic live in small, dependency-injected modules under `src/eval/` so they are unit-testable without LM Studio.

**Tech Stack:** TypeScript (strict, nodenext), Node's built-in `node:test` + `node:assert/strict`, `@lmstudio/sdk` 1.5, `vectra` (vector store).

**Spec:** `docs/superpowers/specs/2026-09-15-rag-eval-harness-design.md`

## Global Constraints

- Ground truth is source file + answer snippet, never chunk ID.
- `sourceFile` is stored relative to the documents directory, with `/` separators.
- Question file `version` is `1`.
- Default generated question count: 30 (`BIG_RAG_EVAL_COUNT`). Default seed: 42 (`BIG_RAG_EVAL_SEED`).
- Chunks under 40 words are never sampled.
- Wording-leak limit: a question is rejected if more than 0.5 of its meaningful words appear in the source chunk. Constant in code, not a setting.
- Each failed candidate gets exactly one retry.
- Diagnostic pool size: 50, no threshold.
- Retrieval settings env vars and defaults (must match `src/config.ts`): `BIG_RAG_RETRIEVAL_LIMIT`=5, `BIG_RAG_RETRIEVAL_THRESHOLD`=0.5, `BIG_RAG_CHUNK_SIZE`=512, `BIG_RAG_ENABLE_COMPACTION`=false.
- Generation model: `BIG_RAG_EVAL_LLM` if set, otherwise the LLM currently loaded in LM Studio.
- Evaluation files live in `eval/`, which must be gitignored; `generate` refuses to write if it isn't.
- The plugin's retrieval results must not change.
- Tests live in `src/tests/*.test.ts`; `npm test` builds and runs `dist/tests/*.test.js`.
- Commit message style: plain imperative sentence (e.g. "Add ..."), ending with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/retrieval/retrieve.ts` | Create | Shared retrieval pipeline: embed query, vector search, overlap trim, optional compaction, diagnostic pool, stage timings |
| `src/promptPreprocessor.ts` | Modify | Call `retrieve()` instead of inline retrieval |
| `src/vectorstore/vectorStore.ts` | Modify | Add `listChunks()` |
| `src/eval/matchSnippet.ts` | Create | Normalize text and test snippet containment |
| `src/eval/wordingLeak.ts` | Create | Detect questions that copy the chunk's wording |
| `src/eval/questionSet.ts` | Create | Question set types, parse/validate, load, write-new-file, relative path helper |
| `src/eval/sampleChunks.ts` | Create | Seeded, even-across-files chunk sampling |
| `src/eval/generateQuestions.ts` | Create | Generation orchestration with injected LLM and IO |
| `src/eval/metrics.ts` | Create | Per-question scoring and metric aggregation |
| `src/eval/runEval.ts` | Create | Evaluation run orchestration, report writing, console table |
| `src/eval/settings.ts` | Create | Read retrieval settings from env vars |
| `src/eval/gitIgnore.ts` | Create | Ask git whether a path is ignored |
| `src/evalCli.ts` | Create | CLI entry wiring LM Studio + vector store into the modules above |
| `package.json` | Modify | `eval:generate`, `eval:run` scripts |
| `.gitignore` | Modify | Ignore `eval/` |
| `README.md` | Modify | Short "Evaluating retrieval" section |
| `src/tests/*.test.ts` | Create | One test file per module above |

---

### Task 1: Shared `retrieve()` pipeline

**Files:**
- Create: `src/retrieval/retrieve.ts`
- Test: `src/tests/retrieve.test.ts`

**Interfaces:**
- Consumes: `VectorStore.search(queryVector: number[], limit: number, threshold: number): Promise<SearchResult[]>` and `SearchResult` from `src/vectorstore/vectorStore.ts`; `trimOverlappingChunks(results: SearchResult[]): SearchResult[]` from `src/utils/trimOverlappingChunks.ts`; `compactPassageText(text, queryEmbedding, embed): Promise<string>` and `type EmbedSentences` from `src/utils/compactPassages.ts`; `type CountTokens` from `src/utils/textChunker.ts`.
- Produces:
  - `const CONTEXT_COMPACTION_POOL_MULTIPLIER = 3`
  - `type StageName = "embedQuery" | "vectorSearch" | "trimOverlap" | "compaction"`
  - `interface StageTiming { stage: StageName; ms: number }`
  - `interface RetrieveDeps { vectorStore: Pick<VectorStore, "search">; embedQuery: (text: string) => Promise<number[]>; embedSentences: EmbedSentences; countTokens: CountTokens; now?: () => number }`
  - `interface RetrieveOptions { retrievalLimit: number; retrievalThreshold: number; chunkSize: number; enableContextCompaction: boolean; diagnosticPoolSize?: number }`
  - `interface RetrieveResult { passages: SearchResult[]; diagnosticPool: SearchResult[]; timings: StageTiming[] }`
  - `function retrieve(query: string, deps: RetrieveDeps, options: RetrieveOptions): Promise<RetrieveResult>`

- [ ] **Step 1: Write the failing test**

Create `src/tests/retrieve.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { retrieve, type RetrieveDeps } from "../retrieval/retrieve";
import { type SearchResult } from "../vectorstore/vectorStore";

function makeResult(overrides: Partial<SearchResult> & { text: string }): SearchResult {
  return {
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
  });

  assert.deepEqual(searchCalls[1], { limit: 50, threshold: Number.NEGATIVE_INFINITY });
  assert.deepEqual(output.diagnosticPool.map((p) => p.text), ["One."]);
  assert.equal(output.timings.length, 3, "diagnostic search is not a user-facing stage");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — TypeScript error `Cannot find module '../retrieval/retrieve'`.

- [ ] **Step 3: Write the implementation**

Create `src/retrieval/retrieve.ts`:

```ts
import { type SearchResult, type VectorStore } from "../vectorstore/vectorStore";
import { trimOverlappingChunks } from "../utils/trimOverlappingChunks";
import { compactPassageText, type EmbedSentences } from "../utils/compactPassages";
import { type CountTokens } from "../utils/textChunker";

/** How many candidate passages to pull per one requested by retrievalLimit when compaction is on. */
export const CONTEXT_COMPACTION_POOL_MULTIPLIER = 3;

export type StageName = "embedQuery" | "vectorSearch" | "trimOverlap" | "compaction";

export interface StageTiming {
  stage: StageName;
  ms: number;
}

export interface RetrieveDeps {
  vectorStore: Pick<VectorStore, "search">;
  embedQuery: (text: string) => Promise<number[]>;
  embedSentences: EmbedSentences;
  countTokens: CountTokens;
  now?: () => number;
}

export interface RetrieveOptions {
  retrievalLimit: number;
  retrievalThreshold: number;
  chunkSize: number;
  enableContextCompaction: boolean;
  /** When set, also return the top-N vector matches with no threshold, for evaluation diagnostics. */
  diagnosticPoolSize?: number;
}

export interface RetrieveResult {
  passages: SearchResult[];
  diagnosticPool: SearchResult[];
  timings: StageTiming[];
}

/**
 * Compacts each candidate passage (extractive, sentence-level) and greedily
 * fills the token budget retrievalLimit full-size chunks would have used, in
 * score order. Keeps at least one passage; skips (not breaks) on overflow so a
 * smaller candidate further down can still fit.
 */
async function compactResultsToBudget(
  results: SearchResult[],
  queryEmbedding: number[],
  deps: RetrieveDeps,
  targetTokenBudget: number,
): Promise<SearchResult[]> {
  const compacted: SearchResult[] = [];
  let usedTokens = 0;

  for (const result of results) {
    const compactedText = await compactPassageText(result.text, queryEmbedding, deps.embedSentences);
    const tokenCount = await deps.countTokens(compactedText);

    if (compacted.length > 0 && usedTokens + tokenCount > targetTokenBudget) {
      continue;
    }

    compacted.push({ ...result, text: compactedText });
    usedTokens += tokenCount;
  }

  return compacted;
}

export async function retrieve(
  query: string,
  deps: RetrieveDeps,
  options: RetrieveOptions,
): Promise<RetrieveResult> {
  const now = deps.now ?? (() => performance.now());
  const timings: StageTiming[] = [];

  async function timed<T>(stage: StageName, run: () => Promise<T>): Promise<T> {
    const start = now();
    const value = await run();
    timings.push({ stage, ms: now() - start });
    return value;
  }

  const queryEmbedding = await timed("embedQuery", () => deps.embedQuery(query));

  // Compaction shrinks passages, so it needs a larger candidate pool to choose from.
  const searchLimit = options.enableContextCompaction
    ? options.retrievalLimit * CONTEXT_COMPACTION_POOL_MULTIPLIER
    : options.retrievalLimit;

  const searched = await timed("vectorSearch", () =>
    deps.vectorStore.search(queryEmbedding, searchLimit, options.retrievalThreshold),
  );

  let passages = await timed("trimOverlap", async () => trimOverlappingChunks(searched));

  if (options.enableContextCompaction && passages.length > 0) {
    const targetTokenBudget = options.retrievalLimit * options.chunkSize;
    const candidates = passages;
    passages = await timed("compaction", () =>
      compactResultsToBudget(candidates, queryEmbedding, deps, targetTokenBudget),
    );
  }

  const diagnosticPool = options.diagnosticPoolSize
    ? await deps.vectorStore.search(queryEmbedding, options.diagnosticPoolSize, Number.NEGATIVE_INFINITY)
    : [];

  return { passages, diagnosticPool, timings };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all existing tests plus the 4 new `retrieve` tests.

- [ ] **Step 5: Commit**

```bash
git add src/retrieval/retrieve.ts src/tests/retrieve.test.ts
git commit -m "Extract retrieval pipeline into a shared retrieve() function

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Use `retrieve()` in the plugin

**Files:**
- Modify: `src/promptPreprocessor.ts` (imports at lines 1–21; `CONTEXT_COMPACTION_POOL_MULTIPLIER` and `compactResultsToBudget` at lines 57–95; retrieval block starting at the `// Embed the query` comment, currently lines 470–497)

**Interfaces:**
- Consumes: `retrieve(query, deps, options): Promise<RetrieveResult>` from Task 1.
- Produces: no new exports. Plugin behavior unchanged.

This task is a refactor with no new unit test: `retrieve()` is covered by Task 1, and `preprocess()` has no test harness (it needs a live LM Studio controller). Verification is type-check, the full test suite, and a live check.

- [ ] **Step 1: Replace the inline retrieval block**

In `src/promptPreprocessor.ts`, replace this block (from `// Embed the query` through the `checkAbort(ctl.abortSignal);` that follows the compaction `if`):

```ts
    // Embed the query
    const queryEmbeddingResult = await embeddingModel.embed(userPrompt);
    checkAbort(ctl.abortSignal);
    const queryEmbedding = queryEmbeddingResult.embedding;

    // Search vector store. With compaction on, pull a larger candidate pool
    // than retrievalLimit - compaction shrinks passages, so more candidates
    // than the final count are needed to pick a good compacted set from.
    const searchLimit = enableContextCompaction
      ? retrievalLimit * CONTEXT_COMPACTION_POOL_MULTIPLIER
      : retrievalLimit;
    const queryPreview =
      userPrompt.length > 160 ? `${userPrompt.slice(0, 160)}...` : userPrompt;
    console.info(
      `[BigRAG] Executing vector search for "${queryPreview}" (limit=${searchLimit}, threshold=${retrievalThreshold})`,
    );
    let results = trimOverlappingChunks(
      await vectorStore.search(queryEmbedding, searchLimit, retrievalThreshold),
    );

    if (enableContextCompaction && results.length > 0) {
      const targetTokenBudget = retrievalLimit * chunkSize;
      results = await compactResultsToBudget(results, queryEmbedding, embeddingModel, targetTokenBudget);
      console.info(
        `[BigRAG] Context compaction: ${results.length} passages selected within a ~${targetTokenBudget}-token budget`,
      );
    }
    checkAbort(ctl.abortSignal);
```

with:

```ts
    const queryPreview =
      userPrompt.length > 160 ? `${userPrompt.slice(0, 160)}...` : userPrompt;
    console.info(
      `[BigRAG] Executing retrieval for "${queryPreview}" (limit=${retrievalLimit}, threshold=${retrievalThreshold}, compaction=${enableContextCompaction})`,
    );
    const { passages: results, timings } = await retrieve(
      userPrompt,
      {
        vectorStore,
        embedQuery: async (text) => (await embeddingModel.embed(text)).embedding,
        embedSentences: (sentences) => embeddingModel.embed(sentences),
        countTokens: (text) => embeddingModel.countTokens(text),
      },
      { retrievalLimit, retrievalThreshold, chunkSize, enableContextCompaction },
    );
    checkAbort(ctl.abortSignal);
    console.info(
      `[BigRAG] Retrieval timings: ${timings.map((t) => `${t.stage}=${t.ms.toFixed(0)}ms`).join(" ")}`,
    );
```

- [ ] **Step 2: Remove the now-duplicated helpers**

Delete from `src/promptPreprocessor.ts` the `CONTEXT_COMPACTION_POOL_MULTIPLIER` constant (with its doc comment) and the whole `compactResultsToBudget` function (with its doc comment) — both now live in `src/retrieval/retrieve.ts`.

- [ ] **Step 3: Fix imports**

Add near the other local imports:

```ts
import { retrieve } from "./retrieval/retrieve";
```

Then check which old imports are now unused:

Run: `grep -n "trimOverlappingChunks\|compactPassageText\|EmbeddingDynamicHandle\|SearchResult" src/promptPreprocessor.ts`

Remove each import whose only remaining match is the import line itself. Expected result: the `trimOverlappingChunks` and `compactPassageText` import lines are removed, `type EmbeddingDynamicHandle` is removed from the `@lmstudio/sdk` import, and `type SearchResult` is removed from the `./vectorstore/vectorStore` import (leaving `import { VectorStore } from "./vectorstore/vectorStore";`).

- [ ] **Step 4: Type-check and run tests**

Run: `npx tsc --noEmit`
Expected: no output (clean).

Run: `npm test`
Expected: PASS — all tests.

- [ ] **Step 5: Live check in LM Studio**

Run `npm run dev`, then in LM Studio send the same question you tested before this change (one that retrieves passages). Confirm:
- The status still shows "Retrieved N relevant passages" with the same N.
- Citations appear as before.
- The developer console shows `[BigRAG] Retrieval timings: embedQuery=… vectorSearch=… trimOverlap=…` (plus `compaction=…` if compaction is enabled).

- [ ] **Step 6: Commit**

```bash
git add src/promptPreprocessor.ts
git commit -m "Route plugin retrieval through the shared retrieve() pipeline

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: `VectorStore.listChunks()`

**Files:**
- Modify: `src/vectorstore/vectorStore.ts` (add interface after `SearchResult`; add method after `getFileHashInventory`)
- Test: `src/tests/vectorStore.test.ts`

**Interfaces:**
- Consumes: existing `VectorStore` class.
- Produces:
  - `interface IndexedChunk { text: string; filePath: string; fileName: string; chunkIndex: number; metadata: Record<string, any> }`
  - `VectorStore.listChunks(): Promise<IndexedChunk[]>`

- [ ] **Step 1: Write the failing test**

Create `src/tests/vectorStore.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { VectorStore } from "../vectorstore/vectorStore";

test("listChunks returns every indexed chunk with its text and file", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-vs-"));
  try {
    const store = new VectorStore(dir);
    await store.initialize();
    await store.addChunks([
      {
        id: "h1-0",
        text: "First chunk text",
        vector: [1, 0, 0],
        filePath: "/docs/a.md",
        fileName: "a.md",
        fileHash: "h1",
        chunkIndex: 0,
        metadata: { startIndex: 0, endIndex: 3 },
      },
      {
        id: "h2-1",
        text: "Second chunk text",
        vector: [0, 1, 0],
        filePath: "/docs/b.md",
        fileName: "b.md",
        fileHash: "h2",
        chunkIndex: 1,
        metadata: { startIndex: 3, endIndex: 6 },
      },
    ]);

    const chunks = (await store.listChunks()).sort((a, b) => a.chunkIndex - b.chunkIndex);

    assert.equal(chunks.length, 2);
    assert.equal(chunks[0].text, "First chunk text");
    assert.equal(chunks[0].filePath, "/docs/a.md");
    assert.equal(chunks[0].fileName, "a.md");
    assert.equal(chunks[0].metadata.startIndex, 0);
    assert.equal(chunks[1].text, "Second chunk text");
    assert.equal(chunks[1].chunkIndex, 1);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("listChunks returns an empty array for an empty store", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-vs-"));
  try {
    const store = new VectorStore(dir);
    await store.initialize();
    assert.deepEqual(await store.listChunks(), []);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — TypeScript error `Property 'listChunks' does not exist on type 'VectorStore'`.

- [ ] **Step 3: Write the implementation**

In `src/vectorstore/vectorStore.ts`, add after the `SearchResult` interface:

```ts
export interface IndexedChunk {
  text: string;
  filePath: string;
  fileName: string;
  chunkIndex: number;
  metadata: Record<string, any>;
}
```

Add this method to the `VectorStore` class, directly after `getFileHashInventory()`:

```ts
  /**
   * List every indexed chunk across all shards.
   */
  async listChunks(): Promise<IndexedChunk[]> {
    const chunks: IndexedChunk[] = [];
    for (const dir of this.shardDirs) {
      const shard = this.openShard(dir);
      const items = await shard.listItems();
      for (const item of items) {
        const m = item.metadata as ChunkMetadata;
        if (!m?.filePath || typeof m.text !== "string") continue;
        chunks.push({
          text: m.text,
          filePath: m.filePath,
          fileName: m.fileName,
          chunkIndex: m.chunkIndex,
          metadata: m,
        });
      }
    }
    return chunks;
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — including both `listChunks` tests.

- [ ] **Step 5: Commit**

```bash
git add src/vectorstore/vectorStore.ts src/tests/vectorStore.test.ts
git commit -m "Add VectorStore.listChunks for evaluation sampling

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Snippet matching and wording-leak check

**Files:**
- Create: `src/eval/matchSnippet.ts`
- Create: `src/eval/wordingLeak.ts`
- Test: `src/tests/matchSnippet.test.ts`
- Test: `src/tests/wordingLeak.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `function normalizeForMatch(text: string): string`
  - `function containsSnippet(text: string, snippet: string): boolean`
  - `const WORDING_LEAK_LIMIT = 0.5`
  - `function wordingLeakRatio(question: string, chunkText: string): number`
  - `function isWordingLeak(question: string, chunkText: string): boolean`

- [ ] **Step 1: Write the failing tests**

Create `src/tests/matchSnippet.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { containsSnippet, normalizeForMatch } from "../eval/matchSnippet";

test("normalizeForMatch lowercases and collapses punctuation and whitespace", () => {
  assert.equal(normalizeForMatch("  Total members:\n15.8M,  +35% YoY "), "total members 15 8m 35 yoy");
});

test("containsSnippet tolerates case, punctuation, and whitespace differences", () => {
  const chunk = "Ecosystem update. Total members: 15.8M, +35% YoY, with record growth.";
  assert.equal(containsSnippet(chunk, "total members 15.8m +35% yoy"), true);
  assert.equal(containsSnippet(chunk, "Total   members:\n15.8M, +35% YoY"), true);
});

test("containsSnippet does not match partial words", () => {
  assert.equal(containsSnippet("membership grew quickly", "member"), false);
});

test("containsSnippet returns false for unrelated text or an empty snippet", () => {
  assert.equal(containsSnippet("Revenue fell sharply.", "Total members: 15.8M"), false);
  assert.equal(containsSnippet("Anything at all.", "  ...  "), false);
});
```

Create `src/tests/wordingLeak.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { isWordingLeak, wordingLeakRatio, WORDING_LEAK_LIMIT } from "../eval/wordingLeak";

const CHUNK = "Total members: 15.8M, +35% YoY, with a record quarter for deposits.";

test("wordingLeakRatio is high when the question copies the chunk's wording", () => {
  assert.equal(wordingLeakRatio("What were total members YoY?", CHUNK), 1);
  assert.equal(isWordingLeak("What were total members YoY?", CHUNK), true);
});

test("wordingLeakRatio is low for a genuine paraphrase", () => {
  assert.equal(wordingLeakRatio("How much did membership grow year over year?", CHUNK), 0);
  assert.equal(isWordingLeak("How much did membership grow year over year?", CHUNK), false);
});

test("a question at exactly the limit is not a leak", () => {
  // Meaningful words: deposits, total, signups, improve. "deposits" and "total" are in the chunk: 2 of 4.
  const ratio = wordingLeakRatio("Did deposits and total signups improve?", CHUNK);
  assert.equal(ratio, WORDING_LEAK_LIMIT);
  assert.equal(isWordingLeak("Did deposits and total signups improve?", CHUNK), false);
});

test("a question with no meaningful words counts as a leak", () => {
  assert.equal(wordingLeakRatio("What is it?", CHUNK), 1);
  assert.equal(isWordingLeak("What is it?", CHUNK), true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../eval/matchSnippet'` and `'../eval/wordingLeak'`.

- [ ] **Step 3: Write the implementations**

Create `src/eval/matchSnippet.ts`:

```ts
/** Lowercases and replaces every run of non-letter, non-digit characters with a single space. */
export function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/**
 * True if `snippet` appears in `text` as whole words, ignoring case,
 * punctuation, and whitespace differences.
 */
export function containsSnippet(text: string, snippet: string): boolean {
  const normalizedSnippet = normalizeForMatch(snippet);
  if (normalizedSnippet.length === 0) {
    return false;
  }
  return ` ${normalizeForMatch(text)} `.includes(` ${normalizedSnippet} `);
}
```

Create `src/eval/wordingLeak.ts`:

```ts
import { normalizeForMatch } from "./matchSnippet";

/** Share of a question's meaningful words allowed to appear in its source chunk. */
export const WORDING_LEAK_LIMIT = 0.5;

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "did", "do", "does", "for", "from",
  "had", "has", "have", "how", "in", "is", "it", "its", "of", "on", "or", "over", "that",
  "the", "their", "this", "to", "was", "were", "what", "when", "where", "which", "who",
  "why", "with",
]);

function meaningfulWords(text: string): string[] {
  return normalizeForMatch(text)
    .split(" ")
    .filter((word) => word.length > 1 && !STOPWORDS.has(word));
}

/**
 * Fraction of the question's meaningful words that also appear in the chunk.
 * A question with no meaningful words returns 1 (useless as a test question).
 */
export function wordingLeakRatio(question: string, chunkText: string): number {
  const questionWords = meaningfulWords(question);
  if (questionWords.length === 0) {
    return 1;
  }
  const chunkWords = new Set(normalizeForMatch(chunkText).split(" "));
  const leaked = questionWords.filter((word) => chunkWords.has(word)).length;
  return leaked / questionWords.length;
}

export function isWordingLeak(question: string, chunkText: string): boolean {
  return wordingLeakRatio(question, chunkText) > WORDING_LEAK_LIMIT;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS. Check the "exactly the limit" case: meaningful words of "Did deposits and total signups improve?" are `deposits, total, signups, improve` (4); `deposits` and `total` are in the chunk (2) → ratio 0.5.

- [ ] **Step 5: Commit**

```bash
git add src/eval/matchSnippet.ts src/eval/wordingLeak.ts src/tests/matchSnippet.test.ts src/tests/wordingLeak.test.ts
git commit -m "Add snippet matching and wording-leak check for evaluation questions

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Question set format

**Files:**
- Create: `src/eval/questionSet.ts`
- Test: `src/tests/questionSet.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface EvalQuestion { id: string; question: string; sourceFile: string; answerSnippet: string }`
  - `interface QuestionSet { version: 1; generatedAt: string; generator: { model: string; seed: number }; questions: EvalQuestion[] }`
  - `function parseQuestionSet(raw: string): QuestionSet` (throws `Error` with a readable message)
  - `function loadQuestionSet(filePath: string): Promise<QuestionSet>` (throws a guidance message if the file is missing)
  - `function writeNewFile(filePath: string, content: string): Promise<void>` (creates parent dirs, never overwrites)
  - `function toRelativeSourcePath(documentsDir: string, filePath: string): string`

- [ ] **Step 1: Write the failing test**

Create `src/tests/questionSet.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import {
  loadQuestionSet,
  parseQuestionSet,
  toRelativeSourcePath,
  writeNewFile,
} from "../eval/questionSet";

const VALID = {
  version: 1,
  generatedAt: "2026-09-15T10:00:00Z",
  generator: { model: "test-model", seed: 42 },
  questions: [
    { id: "q-001", question: "How much did membership grow?", sourceFile: "a.md", answerSnippet: "Total members: 15.8M" },
  ],
};

test("parseQuestionSet accepts a valid set", () => {
  const set = parseQuestionSet(JSON.stringify(VALID));
  assert.equal(set.questions.length, 1);
  assert.equal(set.questions[0].id, "q-001");
});

test("parseQuestionSet rejects invalid JSON", () => {
  assert.throws(() => parseQuestionSet("{not json"), /not valid JSON/);
});

test("parseQuestionSet rejects an unsupported version", () => {
  assert.throws(() => parseQuestionSet(JSON.stringify({ ...VALID, version: 2 })), /version/);
});

test("parseQuestionSet names the entry with a missing field", () => {
  const bad = { ...VALID, questions: [{ id: "q-007", question: "Q?", sourceFile: "a.md", answerSnippet: "" }] };
  assert.throws(() => parseQuestionSet(JSON.stringify(bad)), /q-007.*answerSnippet/);
});

test("parseQuestionSet rejects duplicate ids", () => {
  const dup = { ...VALID, questions: [VALID.questions[0], VALID.questions[0]] };
  assert.throws(() => parseQuestionSet(JSON.stringify(dup)), /Duplicate question id "q-001"/);
});

test("loadQuestionSet explains how to create a missing set", async () => {
  const missing = path.join(os.tmpdir(), `big-rag-missing-${Date.now()}.json`);
  await assert.rejects(() => loadQuestionSet(missing), /eval:generate/);
});

test("writeNewFile creates parent directories and refuses to overwrite", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-qs-"));
  try {
    const target = path.join(dir, "nested", "file.json");
    await writeNewFile(target, "first");
    assert.equal(await fs.readFile(target, "utf-8"), "first");
    await assert.rejects(() => writeNewFile(target, "second"));
    assert.equal(await fs.readFile(target, "utf-8"), "first");
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("toRelativeSourcePath uses forward slashes relative to the documents dir", () => {
  const docs = path.resolve("/docs");
  const file = path.join(docs, "research", "SOFI.md");
  assert.equal(toRelativeSourcePath(docs, file), "research/SOFI.md");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../eval/questionSet'`.

- [ ] **Step 3: Write the implementation**

Create `src/eval/questionSet.ts`:

```ts
import * as fs from "fs/promises";
import * as path from "path";

export interface EvalQuestion {
  id: string;
  question: string;
  sourceFile: string;
  answerSnippet: string;
}

export interface QuestionSet {
  version: 1;
  generatedAt: string;
  generator: { model: string; seed: number };
  questions: EvalQuestion[];
}

const REQUIRED_FIELDS = ["question", "sourceFile", "answerSnippet"] as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function parseQuestionSet(raw: string): QuestionSet {
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Question file is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (data?.version !== 1) {
    throw new Error(`Unsupported question file version: ${JSON.stringify(data?.version)} (expected 1)`);
  }
  if (!Array.isArray(data.questions)) {
    throw new Error(`Question file must contain a "questions" array`);
  }

  const seenIds = new Set<string>();
  data.questions.forEach((entry: any, index: number) => {
    if (!isNonEmptyString(entry?.id)) {
      throw new Error(`Question at index ${index} has no "id"`);
    }
    for (const field of REQUIRED_FIELDS) {
      if (!isNonEmptyString(entry[field])) {
        throw new Error(`Question ${entry.id} is missing "${field}"`);
      }
    }
    if (seenIds.has(entry.id)) {
      throw new Error(`Duplicate question id "${entry.id}"`);
    }
    seenIds.add(entry.id);
  });

  return data as QuestionSet;
}

export async function loadQuestionSet(filePath: string): Promise<QuestionSet> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      throw new Error(
        `No question set found at ${filePath}. Run "npm run eval:generate", review the candidates file, ` +
          `and save it as eval/questions.json (or set BIG_RAG_EVAL_FILE).`,
      );
    }
    throw error;
  }
  return parseQuestionSet(raw);
}

/** Writes a file, creating parent directories. Fails instead of overwriting an existing file. */
export async function writeNewFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, { encoding: "utf-8", flag: "wx" });
}

export function toRelativeSourcePath(documentsDir: string, filePath: string): string {
  return path.relative(path.resolve(documentsDir), path.resolve(filePath)).split(path.sep).join("/");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all 8 `questionSet` tests.

- [ ] **Step 5: Commit**

```bash
git add src/eval/questionSet.ts src/tests/questionSet.test.ts
git commit -m "Add evaluation question set format, validation, and file helpers

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Seeded, even-across-files chunk sampling

**Files:**
- Create: `src/eval/sampleChunks.ts`
- Test: `src/tests/sampleChunks.test.ts`

**Interfaces:**
- Consumes: `IndexedChunk` from Task 3.
- Produces:
  - `const MIN_CHUNK_WORDS = 40`
  - `function createRng(seed: number): () => number`
  - `function sampleChunksAcrossFiles(chunks: IndexedChunk[], count: number, seed: number): IndexedChunk[]`

- [ ] **Step 1: Write the failing test**

Create `src/tests/sampleChunks.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { sampleChunksAcrossFiles, MIN_CHUNK_WORDS } from "../eval/sampleChunks";
import { type IndexedChunk } from "../vectorstore/vectorStore";

function words(n: number): string {
  return Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
}

function chunk(filePath: string, chunkIndex: number, wordCount = MIN_CHUNK_WORDS): IndexedChunk {
  return { text: words(wordCount), filePath, fileName: filePath, chunkIndex, metadata: {} };
}

function countByFile(chunks: IndexedChunk[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const c of chunks) counts[c.filePath] = (counts[c.filePath] ?? 0) + 1;
  return counts;
}

test("sampleChunksAcrossFiles spreads evenly across files", () => {
  const chunks = ["a", "b", "c"].flatMap((f) => Array.from({ length: 10 }, (_, i) => chunk(f, i)));
  const sampled = sampleChunksAcrossFiles(chunks, 6, 42);
  assert.equal(sampled.length, 6);
  assert.deepEqual(countByFile(sampled), { a: 2, b: 2, c: 2 });
});

test("sampleChunksAcrossFiles takes the rest from larger files when a file runs out", () => {
  const chunks = [
    ...Array.from({ length: 30 }, (_, i) => chunk("big", i)),
    ...Array.from({ length: 2 }, (_, i) => chunk("small", i)),
  ];
  const sampled = sampleChunksAcrossFiles(chunks, 6, 42);
  assert.deepEqual(countByFile(sampled), { big: 4, small: 2 });
});

test("sampleChunksAcrossFiles skips chunks shorter than MIN_CHUNK_WORDS", () => {
  const chunks = [chunk("a", 0, MIN_CHUNK_WORDS - 1), chunk("a", 1, MIN_CHUNK_WORDS)];
  const sampled = sampleChunksAcrossFiles(chunks, 5, 42);
  assert.deepEqual(sampled.map((c) => c.chunkIndex), [1]);
});

test("sampleChunksAcrossFiles is deterministic for the same seed regardless of input order", () => {
  const chunks = ["a", "b"].flatMap((f) => Array.from({ length: 8 }, (_, i) => chunk(f, i)));
  const first = sampleChunksAcrossFiles(chunks, 5, 7).map((c) => `${c.filePath}:${c.chunkIndex}`);
  const second = sampleChunksAcrossFiles([...chunks].reverse(), 5, 7).map((c) => `${c.filePath}:${c.chunkIndex}`);
  assert.deepEqual(first, second);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../eval/sampleChunks'`.

- [ ] **Step 3: Write the implementation**

Create `src/eval/sampleChunks.ts`:

```ts
import { type IndexedChunk } from "../vectorstore/vectorStore";

/** Chunks shorter than this are too small to hold a meaningful fact. */
export const MIN_CHUNK_WORDS = 40;

/** Small deterministic PRNG (mulberry32). Returns values in [0, 1). */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

/**
 * Picks up to `count` chunks, taking one from each file in turn so no single
 * large file dominates. Deterministic for a given seed and chunk set.
 */
export function sampleChunksAcrossFiles(chunks: IndexedChunk[], count: number, seed: number): IndexedChunk[] {
  const rng = createRng(seed);

  const byFile = new Map<string, IndexedChunk[]>();
  for (const c of chunks) {
    if (wordCount(c.text) < MIN_CHUNK_WORDS) continue;
    const list = byFile.get(c.filePath) ?? [];
    list.push(c);
    byFile.set(c.filePath, list);
  }

  const files = shuffle([...byFile.keys()].sort(), rng);
  const queues = files.map((file) =>
    shuffle([...byFile.get(file)!].sort((a, b) => a.chunkIndex - b.chunkIndex), rng),
  );

  const sampled: IndexedChunk[] = [];
  while (sampled.length < count && queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      if (sampled.length >= count) break;
      const next = queue.shift();
      if (next) sampled.push(next);
    }
  }
  return sampled;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all 4 `sampleChunks` tests.

- [ ] **Step 5: Commit**

```bash
git add src/eval/sampleChunks.ts src/tests/sampleChunks.test.ts
git commit -m "Add seeded chunk sampling spread evenly across files

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Question generation orchestration

**Files:**
- Create: `src/eval/generateQuestions.ts`
- Test: `src/tests/generateQuestions.test.ts`

**Interfaces:**
- Consumes: `IndexedChunk` (Task 3); `containsSnippet` (Task 4); `isWordingLeak` (Task 4); `QuestionSet`, `EvalQuestion`, `toRelativeSourcePath` (Task 5); `sampleChunksAcrossFiles` (Task 6).
- Produces:
  - `interface GeneratedQA { question: string; answerSnippet: string }`
  - `type DropReason = "invalid-output" | "snippet-not-found" | "wording-leak"`
  - `const QUESTION_JSON_SCHEMA` (JSON schema object for structured output)
  - `function buildQuestionPrompt(chunkText: string, attempt: number): string`
  - `function parseGeneratedQA(raw: string): GeneratedQA | null`
  - `function validateCandidate(qa: GeneratedQA, chunkText: string): DropReason | null`
  - `interface GenerateDeps { listChunks: () => Promise<IndexedChunk[]>; askForQuestion: (chunkText: string, attempt: number) => Promise<string>; isPathIgnored: (filePath: string) => Promise<boolean>; writeNewFile: (filePath: string, content: string) => Promise<void>; now: () => Date }`
  - `interface GenerateOptions { documentsDir: string; outputDir: string; count: number; seed: number; modelName: string }`
  - `interface GenerateSummary { outputPath: string; generated: number; dropped: Record<DropReason, number>; questionsPerFile: Record<string, number> }`
  - `function generateQuestions(deps: GenerateDeps, options: GenerateOptions): Promise<GenerateSummary>`

- [ ] **Step 1: Write the failing test**

Create `src/tests/generateQuestions.test.ts`:

```ts
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

const OPTIONS = { documentsDir: DOCS, outputDir: path.resolve("/repo/eval"), count: 30, seed: 42, modelName: "test-model" };

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

test("generateQuestions writes a timestamped candidates file with relative source paths", async () => {
  const { deps, writes } = makeDeps();
  const summary = await generateQuestions(deps, OPTIONS);

  assert.equal(writes.length, 1);
  assert.equal(writes[0].filePath, path.join(OPTIONS.outputDir, "candidates-2026-09-15T10-00-00-000Z.json"));
  const set = parseQuestionSet(writes[0].content);
  assert.deepEqual(set.generator, { model: "test-model", seed: 42 });
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../eval/generateQuestions'`.

- [ ] **Step 3: Write the implementation**

Create `src/eval/generateQuestions.ts`:

```ts
import * as path from "path";
import { type IndexedChunk } from "../vectorstore/vectorStore";
import { containsSnippet } from "./matchSnippet";
import { isWordingLeak } from "./wordingLeak";
import { toRelativeSourcePath, type EvalQuestion, type QuestionSet } from "./questionSet";
import { sampleChunksAcrossFiles } from "./sampleChunks";

export interface GeneratedQA {
  question: string;
  answerSnippet: string;
}

export type DropReason = "invalid-output" | "snippet-not-found" | "wording-leak";

export const QUESTION_JSON_SCHEMA = {
  type: "object",
  properties: {
    question: { type: "string" },
    answerSnippet: { type: "string" },
  },
  required: ["question", "answerSnippet"],
  additionalProperties: false,
};

export function buildQuestionPrompt(chunkText: string, attempt: number): string {
  const retryNote =
    attempt > 0
      ? `\n\nYour previous answer was rejected. Make sure the snippet is copied exactly from the passage, ` +
        `and the question uses different wording from the passage.`
      : "";
  return (
    `You are writing a test question for a document search system.\n\n` +
    `Read the passage below and pick one specific fact from it. Return JSON with:\n` +
    `- "answerSnippet": one or two sentences copied EXACTLY, word for word, from the passage, containing that fact.\n` +
    `- "question": a question that a person who has NOT read this passage would ask to find that fact. ` +
    `Use your own words. Do not reuse distinctive phrases from the passage.\n\n` +
    `Passage:\n"""\n${chunkText}\n"""` +
    retryNote
  );
}

export function parseGeneratedQA(raw: string): GeneratedQA | null {
  try {
    const data = JSON.parse(raw);
    if (typeof data?.question !== "string" || typeof data?.answerSnippet !== "string") return null;
    const question = data.question.trim();
    const answerSnippet = data.answerSnippet.trim();
    if (!question || !answerSnippet) return null;
    return { question, answerSnippet };
  } catch {
    return null;
  }
}

export function validateCandidate(qa: GeneratedQA, chunkText: string): DropReason | null {
  if (!containsSnippet(chunkText, qa.answerSnippet)) return "snippet-not-found";
  if (isWordingLeak(qa.question, chunkText)) return "wording-leak";
  return null;
}

export interface GenerateDeps {
  listChunks: () => Promise<IndexedChunk[]>;
  askForQuestion: (chunkText: string, attempt: number) => Promise<string>;
  isPathIgnored: (filePath: string) => Promise<boolean>;
  writeNewFile: (filePath: string, content: string) => Promise<void>;
  now: () => Date;
}

export interface GenerateOptions {
  documentsDir: string;
  outputDir: string;
  count: number;
  seed: number;
  modelName: string;
}

export interface GenerateSummary {
  outputPath: string;
  generated: number;
  dropped: Record<DropReason, number>;
  questionsPerFile: Record<string, number>;
}

const MAX_ATTEMPTS = 2;

export async function generateQuestions(deps: GenerateDeps, options: GenerateOptions): Promise<GenerateSummary> {
  const chunks = await deps.listChunks();
  if (chunks.length === 0) {
    throw new Error("The index is empty. Run indexing before generating evaluation questions.");
  }

  const generatedAt = deps.now().toISOString();
  const outputPath = path.join(options.outputDir, `candidates-${generatedAt.replace(/[:.]/g, "-")}.json`);

  if (!(await deps.isPathIgnored(outputPath))) {
    throw new Error(
      `Refusing to write ${outputPath}: it is not gitignored. Evaluation files contain excerpts ` +
        `from your documents; add "eval/" to .gitignore first.`,
    );
  }

  const dropped: Record<DropReason, number> = { "invalid-output": 0, "snippet-not-found": 0, "wording-leak": 0 };
  const questions: EvalQuestion[] = [];
  const questionsPerFile: Record<string, number> = {};

  for (const sampled of sampleChunksAcrossFiles(chunks, options.count, options.seed)) {
    let accepted: GeneratedQA | null = null;
    let lastReason: DropReason = "invalid-output";

    for (let attempt = 0; attempt < MAX_ATTEMPTS && !accepted; attempt++) {
      const qa = parseGeneratedQA(await deps.askForQuestion(sampled.text, attempt));
      const reason = qa ? validateCandidate(qa, sampled.text) : "invalid-output";
      if (qa && reason === null) {
        accepted = qa;
      } else {
        lastReason = reason ?? "invalid-output";
      }
    }

    if (!accepted) {
      dropped[lastReason]++;
      continue;
    }

    const sourceFile = toRelativeSourcePath(options.documentsDir, sampled.filePath);
    questions.push({
      id: `q-${String(questions.length + 1).padStart(3, "0")}`,
      question: accepted.question,
      sourceFile,
      answerSnippet: accepted.answerSnippet,
    });
    questionsPerFile[sourceFile] = (questionsPerFile[sourceFile] ?? 0) + 1;
  }

  const set: QuestionSet = {
    version: 1,
    generatedAt,
    generator: { model: options.modelName, seed: options.seed },
    questions,
  };
  await deps.writeNewFile(outputPath, `${JSON.stringify(set, null, 2)}\n`);

  return { outputPath, generated: questions.length, dropped, questionsPerFile };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all 7 `generateQuestions` tests. (The leaky question "Total members reached what?" has meaningful words `total, members, reached` — all in the chunk, ratio 1. The good question "How much did membership grow?" has `much, membership, grow` — none in the chunk.)

- [ ] **Step 5: Commit**

```bash
git add src/eval/generateQuestions.ts src/tests/generateQuestions.test.ts
git commit -m "Add evaluation question generation with validation and retries

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Scoring, metrics, and evaluation runs

**Files:**
- Create: `src/eval/metrics.ts`
- Create: `src/eval/runEval.ts`
- Test: `src/tests/metrics.test.ts`
- Test: `src/tests/runEval.test.ts`

**Interfaces:**
- Consumes: `RetrieveResult`, `StageTiming` (Task 1); `SearchResult` (existing); `containsSnippet` (Task 4); `EvalQuestion`, `QuestionSet`, `toRelativeSourcePath` (Task 5).
- Produces (`metrics.ts`):
  - `interface QuestionResult { id: string; unscorable: boolean; finalHit: boolean; poolRank: number | null; rightFileWrongPassage: boolean; finalFiles: string[]; timings: StageTiming[] }`
  - `function scoreQuestion(question: EvalQuestion, retrieval: RetrieveResult, documentsDir: string, indexedFiles: Set<string>): QuestionResult`
  - `interface EvalMetrics { scored: number; unscorable: number; finalHitRate: number; poolHitRate: number; filterLoss: number; rightFileWrongPassage: number; medianPoolRank: number | null; meanReciprocalRank: number; latency: Record<string, { median: number; p95: number }> }`
  - `function aggregateMetrics(results: QuestionResult[]): EvalMetrics`
- Produces (`runEval.ts`):
  - `interface RunEvalDeps { retrieve: (query: string) => Promise<RetrieveResult>; listIndexedFiles: () => Promise<Set<string>>; writeNewFile: (filePath: string, content: string) => Promise<void>; now: () => Date }`
  - `interface RunEvalOptions { questionSet: QuestionSet; documentsDir: string; reportsDir: string; settingsSnapshot: Record<string, unknown> }`
  - `interface EvalReport { generatedAt: string; settings: Record<string, unknown>; metrics: EvalMetrics; questions: QuestionResult[] }`
  - `function runEval(deps: RunEvalDeps, options: RunEvalOptions): Promise<{ report: EvalReport; reportPath: string }>`
  - `function formatMetricsTable(metrics: EvalMetrics): string`

- [ ] **Step 1: Write the failing tests**

Create `src/tests/metrics.test.ts`:

```ts
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
  return { text, score: 0.8, filePath: path.join(DOCS, file), fileName: file, chunkIndex: 0, shardName: "shard_000", metadata: {} };
}

function retrieval(passages: SearchResult[], diagnosticPool: SearchResult[]): RetrieveResult {
  return { passages, diagnosticPool, timings: [{ stage: "vectorSearch", ms: 10 }] };
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
```

Create `src/tests/runEval.test.ts`:

```ts
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
        return { passages: [answer], diagnosticPool: [answer], timings: [{ stage: "vectorSearch", ms: 12 }] };
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../eval/metrics'` and `'../eval/runEval'`.

- [ ] **Step 3: Write `metrics.ts`**

Create `src/eval/metrics.ts`:

```ts
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
```

- [ ] **Step 4: Write `runEval.ts`**

Create `src/eval/runEval.ts`:

```ts
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all `metrics` and `runEval` tests.

- [ ] **Step 6: Commit**

```bash
git add src/eval/metrics.ts src/eval/runEval.ts src/tests/metrics.test.ts src/tests/runEval.test.ts
git commit -m "Add evaluation scoring, metrics aggregation, and run reports

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: CLI, settings, gitignore guard, scripts, and docs

**Files:**
- Create: `src/eval/settings.ts`
- Create: `src/eval/gitIgnore.ts`
- Create: `src/evalCli.ts`
- Modify: `package.json` (`scripts`)
- Modify: `.gitignore`
- Modify: `README.md` (add a section after the existing "Testing" section)
- Test: `src/tests/settings.test.ts`
- Test: `src/tests/gitIgnore.test.ts`

**Interfaces:**
- Consumes: `retrieve` (Task 1); `VectorStore.listChunks`, `VectorStore.getStats`, `VectorStore.initialize` (Task 3/existing); `generateQuestions`, `buildQuestionPrompt`, `QUESTION_JSON_SCHEMA` (Task 7); `runEval`, `formatMetricsTable` (Task 8); `loadQuestionSet`, `writeNewFile`, `toRelativeSourcePath` (Task 5); `resolveEmbeddingModelId` from `src/config.ts`; `checkEmbeddingModelForRetrieval`, `readEmbeddingIndexManifest` from `src/utils/embeddingIndexManifest.ts`.
- Produces:
  - `interface RetrievalSettings { retrievalLimit: number; retrievalThreshold: number; chunkSize: number; enableContextCompaction: boolean }`
  - `function readRetrievalSettings(env: Record<string, string | undefined>): RetrievalSettings`
  - `function isPathIgnored(filePath: string, cwd?: string): Promise<boolean>`
  - `npm run eval:generate`, `npm run eval:run`

- [ ] **Step 1: Write the failing tests**

Create `src/tests/settings.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { readRetrievalSettings } from "../eval/settings";

test("readRetrievalSettings uses the plugin config defaults when env vars are unset", () => {
  assert.deepEqual(readRetrievalSettings({}), {
    retrievalLimit: 5,
    retrievalThreshold: 0.5,
    chunkSize: 512,
    enableContextCompaction: false,
  });
});

test("readRetrievalSettings reads overrides from env vars", () => {
  assert.deepEqual(
    readRetrievalSettings({
      BIG_RAG_RETRIEVAL_LIMIT: "8",
      BIG_RAG_RETRIEVAL_THRESHOLD: "0.35",
      BIG_RAG_CHUNK_SIZE: "1024",
      BIG_RAG_ENABLE_COMPACTION: "TRUE",
    }),
    { retrievalLimit: 8, retrievalThreshold: 0.35, chunkSize: 1024, enableContextCompaction: true },
  );
});

test("readRetrievalSettings rejects non-numeric values", () => {
  assert.throws(() => readRetrievalSettings({ BIG_RAG_RETRIEVAL_LIMIT: "five" }), /BIG_RAG_RETRIEVAL_LIMIT/);
});
```

Create `src/tests/gitIgnore.test.ts` (runs inside this repo, where `node_modules/` is ignored and `src/` is not):

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as path from "path";
import { isPathIgnored } from "../eval/gitIgnore";

const REPO_ROOT = path.resolve(__dirname, "../..");

test("isPathIgnored is true for a gitignored path", async () => {
  assert.equal(await isPathIgnored(path.join(REPO_ROOT, "node_modules", "anything.json"), REPO_ROOT), true);
});

test("isPathIgnored is false for a tracked source path", async () => {
  assert.equal(await isPathIgnored(path.join(REPO_ROOT, "src", "not-ignored.ts"), REPO_ROOT), false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../eval/settings'` and `'../eval/gitIgnore'`.

- [ ] **Step 3: Write `settings.ts` and `gitIgnore.ts`**

Create `src/eval/settings.ts`:

```ts
export interface RetrievalSettings {
  retrievalLimit: number;
  retrievalThreshold: number;
  chunkSize: number;
  enableContextCompaction: boolean;
}

function readNumber(env: Record<string, string | undefined>, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a number, got "${raw}"`);
  }
  return value;
}

/** Retrieval settings for evaluation runs. Defaults must match src/config.ts. */
export function readRetrievalSettings(env: Record<string, string | undefined>): RetrievalSettings {
  return {
    retrievalLimit: readNumber(env, "BIG_RAG_RETRIEVAL_LIMIT", 5),
    retrievalThreshold: readNumber(env, "BIG_RAG_RETRIEVAL_THRESHOLD", 0.5),
    chunkSize: readNumber(env, "BIG_RAG_CHUNK_SIZE", 512),
    enableContextCompaction: (env.BIG_RAG_ENABLE_COMPACTION ?? "false").trim().toLowerCase() === "true",
  };
}
```

Create `src/eval/gitIgnore.ts`:

```ts
import { execFile } from "child_process";

/**
 * True if git ignores `filePath`. `git check-ignore` exits 0 when ignored and
 * 1 when not. Any other outcome (not a git repo, git missing) means the file
 * can't be committed by accident, so it is treated as safe.
 */
export function isPathIgnored(filePath: string, cwd: string = process.cwd()): Promise<boolean> {
  return new Promise((resolve) => {
    execFile("git", ["check-ignore", "-q", filePath], { cwd }, (error) => {
      if (!error) {
        resolve(true);
        return;
      }
      resolve((error as { code?: unknown }).code !== 1);
    });
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — `settings` and `gitIgnore` tests.

- [ ] **Step 5: Ignore `eval/`**

Append to `.gitignore`:

```
# Retrieval evaluation sets and reports (contain excerpts from indexed documents)
eval/
```

Run: `git check-ignore -v eval/questions.json`
Expected: prints a line ending in `eval/questions.json` referencing `.gitignore` (exit code 0).

- [ ] **Step 6: Write the CLI**

Create `src/evalCli.ts`:

```ts
import { LMStudioClient } from "@lmstudio/sdk";
import * as path from "path";
import { resolveEmbeddingModelId } from "./config";
import { VectorStore } from "./vectorstore/vectorStore";
import { retrieve } from "./retrieval/retrieve";
import {
  checkEmbeddingModelForRetrieval,
  readEmbeddingIndexManifest,
} from "./utils/embeddingIndexManifest";
import { buildQuestionPrompt, generateQuestions, QUESTION_JSON_SCHEMA } from "./eval/generateQuestions";
import { loadQuestionSet, toRelativeSourcePath, writeNewFile } from "./eval/questionSet";
import { formatMetricsTable, runEval } from "./eval/runEval";
import { readRetrievalSettings } from "./eval/settings";
import { isPathIgnored } from "./eval/gitIgnore";

const USAGE =
  "Usage:\n" +
  "  BIG_RAG_DOCS_DIR=/path/to/docs BIG_RAG_DB_DIR=/path/to/db npm run eval:generate\n" +
  "  BIG_RAG_DOCS_DIR=/path/to/docs BIG_RAG_DB_DIR=/path/to/db npm run eval:run\n";

const EVAL_DIR = path.resolve(process.cwd(), "eval");
const DIAGNOSTIC_POOL_SIZE = 50;

async function runGenerate(client: LMStudioClient, vectorStore: VectorStore, documentsDir: string) {
  const modelKey = process.env.BIG_RAG_EVAL_LLM;
  const llm = await (modelKey ? client.llm.model(modelKey) : client.llm.model()).catch((error: unknown) => {
    throw new Error(
      `No LLM available for question generation (${modelKey ? `BIG_RAG_EVAL_LLM=${modelKey}` : "no model loaded in LM Studio"}): ` +
        (error instanceof Error ? error.message : String(error)),
    );
  });
  const modelName = (await llm.getModelInfo()).identifier;
  const count = Number(process.env.BIG_RAG_EVAL_COUNT ?? "30");
  const seed = Number(process.env.BIG_RAG_EVAL_SEED ?? "42");

  console.log(`[BigRAG Eval] Generating up to ${count} questions with ${modelName} (seed ${seed})...`);

  const summary = await generateQuestions(
    {
      listChunks: () => vectorStore.listChunks(),
      askForQuestion: async (chunkText, attempt) => {
        const result = await llm.respond(buildQuestionPrompt(chunkText, attempt), {
          structured: { type: "json", jsonSchema: QUESTION_JSON_SCHEMA },
        });
        return result.content;
      },
      isPathIgnored: (filePath) => isPathIgnored(filePath),
      writeNewFile,
      now: () => new Date(),
    },
    { documentsDir, outputDir: EVAL_DIR, count, seed, modelName },
  );

  console.log(`[BigRAG Eval] Wrote ${summary.generated} candidate questions to ${summary.outputPath}`);
  console.log(`[BigRAG Eval] Dropped: ${JSON.stringify(summary.dropped)}`);
  console.log(`[BigRAG Eval] Questions per file: ${JSON.stringify(summary.questionsPerFile, null, 2)}`);
  console.log(
    "[BigRAG Eval] Next: review the candidates file, delete bad questions, and save it as eval/questions.json.",
  );
}

async function runRun(client: LMStudioClient, vectorStore: VectorStore, documentsDir: string, vectorStoreDir: string) {
  const questionsPath = path.resolve(process.env.BIG_RAG_EVAL_FILE ?? path.join(EVAL_DIR, "questions.json"));
  const questionSet = await loadQuestionSet(questionsPath);

  const embeddingModelId = resolveEmbeddingModelId(process.env.BIG_RAG_EMBEDDING_MODEL);
  const embeddingModel = await client.embedding.model(embeddingModelId);
  const stats = await vectorStore.getStats();

  const compatibility = await checkEmbeddingModelForRetrieval({
    vectorStoreDir,
    resolvedModelId: embeddingModelId,
    totalChunks: stats.totalChunks,
    embeddingModel,
  });
  if (!compatibility.ok) {
    throw new Error(compatibility.userMessage);
  }

  const settings = readRetrievalSettings(process.env);
  const settingsSnapshot = {
    ...settings,
    diagnosticPoolSize: DIAGNOSTIC_POOL_SIZE,
    embeddingModelId,
    indexManifest: await readEmbeddingIndexManifest(vectorStoreDir),
    totalChunks: stats.totalChunks,
    questionsFile: questionsPath,
    questionCount: questionSet.questions.length,
    questionGenerator: questionSet.generator,
  };

  console.log(`[BigRAG Eval] Running ${questionSet.questions.length} questions with ${JSON.stringify(settings)}...`);

  const { report, reportPath } = await runEval(
    {
      retrieve: (query) =>
        retrieve(
          query,
          {
            vectorStore,
            embedQuery: async (text) => (await embeddingModel.embed(text)).embedding,
            embedSentences: (sentences) => embeddingModel.embed(sentences),
            countTokens: (text) => embeddingModel.countTokens(text),
          },
          { ...settings, diagnosticPoolSize: DIAGNOSTIC_POOL_SIZE },
        ),
      listIndexedFiles: async () =>
        new Set((await vectorStore.listChunks()).map((c) => toRelativeSourcePath(documentsDir, c.filePath))),
      writeNewFile,
      now: () => new Date(),
    },
    { questionSet, documentsDir, reportsDir: path.join(EVAL_DIR, "reports"), settingsSnapshot },
  );

  console.log(`\n${formatMetricsTable(report.metrics)}\n`);
  console.log(`[BigRAG Eval] Full report: ${reportPath}`);
}

async function main() {
  const subcommand = process.argv[2];
  const documentsDir = process.env.BIG_RAG_DOCS_DIR;
  const vectorStoreDir = process.env.BIG_RAG_DB_DIR;

  if ((subcommand !== "generate" && subcommand !== "run") || !documentsDir || !vectorStoreDir) {
    console.error(USAGE);
    process.exit(1);
  }

  const client = new LMStudioClient();
  const vectorStore = new VectorStore(vectorStoreDir);
  await vectorStore.initialize();

  try {
    if (subcommand === "generate") {
      await runGenerate(client, vectorStore, documentsDir);
    } else {
      await runRun(client, vectorStore, documentsDir, vectorStoreDir);
    }
  } catch (error) {
    console.error(`[BigRAG Eval] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  } finally {
    await vectorStore.close();
  }
}

void main();
```

- [ ] **Step 7: Add npm scripts**

In `package.json` `scripts`, add after `"index:cli"`:

```json
    "eval:generate": "npm run build && node dist/evalCli.js generate",
    "eval:run": "npm run build && node dist/evalCli.js run",
```

- [ ] **Step 8: Type-check and run tests**

Run: `npx tsc --noEmit`
Expected: no output. If `llm.respond(buildQuestionPrompt(...), ...)` is rejected, note that `respond` accepts `ChatLike`, which includes `string` in SDK 1.5 (`type ChatLike = ChatInput | string | Chat | ChatMessageInput | ChatHistoryData`); check the installed SDK version before changing anything.

Run: `npm test`
Expected: PASS — all tests.

- [ ] **Step 9: Document it**

In `README.md`, add after the existing `### Testing` section:

````markdown
### Evaluating Retrieval

Measure whether retrieval actually finds the passages that answer questions about your documents.

1. Generate candidate questions from your indexed documents (uses the LLM loaded in LM Studio, or `BIG_RAG_EVAL_LLM`):

   ```bash
   BIG_RAG_DOCS_DIR=/path/to/docs BIG_RAG_DB_DIR=/path/to/db npm run eval:generate
   ```

2. Open the `eval/candidates-*.json` file it writes, delete vague or incorrect questions, and save the result as `eval/questions.json`.

3. Run the evaluation:

   ```bash
   BIG_RAG_DOCS_DIR=/path/to/docs BIG_RAG_DB_DIR=/path/to/db npm run eval:run
   ```

If your plugin settings differ from the defaults, set `BIG_RAG_RETRIEVAL_LIMIT`, `BIG_RAG_RETRIEVAL_THRESHOLD`, `BIG_RAG_CHUNK_SIZE`, and `BIG_RAG_ENABLE_COMPACTION` to match. Reports are written to `eval/reports/`. The `eval/` folder is gitignored because it contains excerpts from your documents.
````

- [ ] **Step 10: Live acceptance**

With LM Studio running, the embedding model and an LLM loaded, and an existing index:

1. Run `BIG_RAG_DOCS_DIR=<docs> BIG_RAG_DB_DIR=<db> npm run eval:generate`.
   Expected: a `eval/candidates-*.json` file, a dropped-count summary, and questions spread across files.
2. Review the file and save it as `eval/questions.json`.
3. Run `BIG_RAG_DOCS_DIR=<docs> BIG_RAG_DB_DIR=<db> npm run eval:run`.
   Expected: the metrics table in the console and a report in `eval/reports/`.
4. Run `git status` and confirm nothing under `eval/` appears.

- [ ] **Step 11: Commit**

```bash
git add src/eval/settings.ts src/eval/gitIgnore.ts src/evalCli.ts src/tests/settings.test.ts src/tests/gitIgnore.test.ts package.json .gitignore README.md
git commit -m "Add eval CLI for generating question sets and measuring retrieval

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```
