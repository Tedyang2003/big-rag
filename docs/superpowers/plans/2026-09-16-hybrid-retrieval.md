# Hybrid Retrieval (Low / Medium) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add keyword and date search lanes beside the existing vector search, merged with weighted reciprocal rank fusion, behind a two-level Retrieval Depth setting.

**Architecture:** A derived, rebuildable catalog of the vector store (`.big-rag-catalog.json`) holds a word table and a day table keyed by an internal chunk number, with no chunk text. At Medium depth `retrieve()` runs three lanes — vector (vectra), keyword (BM25 over the catalog), date (day lookup ranked by BM25) — fuses their ranked lists, then fetches only the winning chunks from the store. Low depth is today's single vector search, untouched.

**Tech Stack:** TypeScript (strict, nodenext), `node:test` + `node:assert/strict`, vectra 0.12 (`queryItems`, `getItem`, `listItems`), `@lmstudio/sdk` 1.5 select config fields.

**Spec:** `docs/superpowers/specs/2026-09-16-hybrid-retrieval-design.md`

## Global Constraints

- Branch: `feature/hybrid-retrieval`. Never stage `.lmstudio/dev.js`. Stage explicit paths only.
- Commit messages: plain imperative sentence, blank line, then exactly `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Tests live in `src/tests/*.test.ts`; `npm test` builds and runs `dist/tests/*.test.js`. No test may require LM Studio.
- No reindex, no index format change, no change to chunking, indexing, citations, prompt rendering, or overlap trimming.
- Chunk key: `"<shardName>/<vectra item id>"`, item ids being `<fileHash>-<chunkIndex>`.
- Dates are day numbers: `2026-09-08` → `20260908`.
- Fusion: `score(chunk) = Σ weight(lane) / (rrfConstant + rank)`, ranks 1-based, `rrfConstant` 60, all three lane weights 1.
- Setting: `retrievalDepth`, select, `low` "Low" / `medium` "Medium", default `medium`. `BIG_RAG_RETRIEVAL_DEPTH` is eval-only; the plugin reads no env vars.
- Maintainer defaults (in `src/settings/defaults.ts`): `laneCandidates` 30, `rrfConstant` 60, `laneWeightVector` 1, `laneWeightKeyword` 1, `laneWeightDate` 1, `catalogMaxChunks` 50000, `bm25K1` 1.2, `bm25B` 0.75, `catalogVersion` 1.
- Low depth loads and builds no catalog. A lane that throws is logged and the remaining lanes still fuse.
- Existing behaviour that must not change: the affinity threshold applies to the vector lane only; the final passage count is `retrievalLimit` (5); overlap trimming runs last.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/vectorstore/vectorStore.ts` | Modify | Expose item `id` on results and chunks; fetch chunks by key |
| `src/retrieval/bm25.ts` | Create | Tokenizing and BM25 scoring (pure) |
| `src/retrieval/queryDates.ts` | Create | Question → day ranges |
| `src/retrieval/fuse.ts` | Create | Weighted reciprocal rank fusion (pure) |
| `src/retrieval/chunkCatalog.ts` | Create | Build/save/load/update the catalog; term and day lookups |
| `src/retrieval/retrieve.ts` | Modify | Depth option, three lanes, fusion, winner fetch, timings |
| `src/metadata/dates.ts` | Modify | Export `MONTH_PATTERN` for query date parsing |
| `src/settings/defaults.ts`, `src/settings/resolveSettings.ts`, `src/config.ts` | Modify | Depth setting and maintainer values |
| `src/eval/settings.ts`, `src/eval/settingsSnapshot.ts`, `src/evalCli.ts`, `src/eval/runEval.ts` | Modify | Depth from env, recorded in reports |
| `src/promptPreprocessor.ts` | Modify | Catalog lifecycle, statuses, logging |
| `README.md` | Modify | Retrieval Depth docs |

---

### Task 1: Chunk identity and fetch-by-key in the vector store

**Files:**
- Modify: `src/vectorstore/vectorStore.ts`
- Test: `src/tests/vectorStore.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `SearchResult` gains `id: string` (the vectra item id) — `chunkKey(result)` builds `"<shardName>/<id>"`.
  - `IndexedChunk` gains `id: string` and `shardName: string`.
  - `function chunkKey(parts: { shardName: string; id: string }): string`
  - `VectorStore.getChunksByKeys(keys: string[]): Promise<SearchResult[]>` — returns one result per key that still exists, in the order the keys were given, each with `score: 0`.

- [ ] **Step 1: Write the failing test**

Append to `src/tests/vectorStore.test.ts` (keep the file's existing imports and helpers; add `chunkKey` to the `../vectorstore/vectorStore` import):

```ts
test("chunks expose their item id and can be fetched by key", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-keys-"));
  try {
    const store = new VectorStore(dir);
    await store.initialize();
    await store.addChunks([
      {
        id: "hashA-0",
        text: "first chunk",
        vector: [1, 0, 0],
        filePath: "/docs/a.md",
        fileName: "a.md",
        fileHash: "hashA",
        chunkIndex: 0,
        metadata: {},
      },
      {
        id: "hashA-1",
        text: "second chunk",
        vector: [0, 1, 0],
        filePath: "/docs/a.md",
        fileName: "a.md",
        fileHash: "hashA",
        chunkIndex: 1,
        metadata: {},
      },
    ]);

    const listed = await store.listChunks();
    assert.deepEqual(
      listed.map((chunk) => chunkKey(chunk)).sort(),
      ["shard_000/hashA-0", "shard_000/hashA-1"],
    );

    const searched = await store.search([1, 0, 0], 1, 0);
    assert.equal(searched[0].id, "hashA-0");

    const fetched = await store.getChunksByKeys(["shard_000/hashA-1", "shard_000/missing", "shard_000/hashA-0"]);
    assert.deepEqual(fetched.map((chunk) => chunk.text), ["second chunk", "first chunk"]);
    assert.equal(fetched[0].chunkIndex, 1);
    assert.equal(fetched[0].score, 0);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `chunkKey` is not exported and `getChunksByKeys` does not exist.

- [ ] **Step 3: Write the implementation**

In `src/vectorstore/vectorStore.ts`:

1. Add `id: string;` as the first field of both `SearchResult` and `IndexedChunk`, and add `shardName: string;` to `IndexedChunk`.
2. Add after the `IndexedChunk` interface:

```ts
/** Stable identifier for a chunk across shards, used by the retrieval catalog. */
export function chunkKey(parts: { shardName: string; id: string }): string {
  return `${parts.shardName}/${parts.id}`;
}

function parseChunkKey(key: string): { shardName: string; id: string } | null {
  const separator = key.indexOf("/");
  if (separator <= 0 || separator === key.length - 1) return null;
  return { shardName: key.slice(0, separator), id: key.slice(separator + 1) };
}
```

3. In `search`, include the item id when building each result:

```ts
        merged.push({
          id: r.item.id,
          text: m?.text ?? "",
```

4. In `listChunks`, include the id and shard:

```ts
        chunks.push({
          id: item.id,
          shardName: dir,
          text: m.text,
```

5. Add this method after `listChunks`:

```ts
  /**
   * Fetch chunks by `chunkKey`, in the order given. Keys that no longer exist are skipped.
   * Scores are 0: the caller supplies its own ranking.
   */
  async getChunksByKeys(keys: string[]): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    for (const key of keys) {
      const parsed = parseChunkKey(key);
      if (!parsed || !this.shardDirs.includes(parsed.shardName)) continue;
      const shard = this.openShard(parsed.shardName);
      const item = await shard.getItem(parsed.id);
      const m = item?.metadata as ChunkMetadata | undefined;
      if (!item || !m || typeof m.text !== "string") continue;
      results.push({
        id: item.id,
        text: m.text,
        score: 0,
        filePath: m.filePath ?? "",
        fileName: m.fileName ?? "",
        chunkIndex: m.chunkIndex ?? 0,
        shardName: parsed.shardName,
        metadata: m as Record<string, any>,
      });
    }
    return results;
  }
```

- [ ] **Step 4: Fix the other places that build these objects**

Run `npx tsc --noEmit`. Every error will be a test helper or module constructing a `SearchResult`/`IndexedChunk` without `id` (e.g. `src/tests/retrieve.test.ts`, `src/tests/metrics.test.ts`, `src/tests/runEval.test.ts`, `src/tests/trimOverlappingChunks.test.ts`, `src/eval/sampleChunks.ts` fixtures). Add `id: "chunk-0"` (or a distinct id per fixture object) and `shardName: "shard_000"` where the type requires it. Do not change any assertion.

- [ ] **Step 5: Run tests**

Run: `npx tsc --noEmit` then `npm test`
Expected: clean; PASS.

- [ ] **Step 6: Commit**

```bash
git add src/vectorstore/vectorStore.ts src/tests/vectorStore.test.ts src/tests src/eval
git commit -m "Expose chunk ids and fetch chunks by key in the vector store

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Tokenizing and BM25 scoring

**Files:**
- Create: `src/retrieval/bm25.ts`
- Test: `src/tests/bm25.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `function tokenize(text: string): string[]`
  - `interface TermEntry { df: number; postings: Array<[number, number]> }`
  - `interface Bm25Corpus { totalChunks: number; averageWordCount: number; wordCountOf(chunkNumber: number): number; entryFor(term: string): TermEntry | undefined }`
  - `interface Bm25Options { k1: number; b: number }`
  - `function scoreTerms(terms: string[], corpus: Bm25Corpus, options: Bm25Options): Map<number, number>`

- [ ] **Step 1: Write the failing test**

Create `src/tests/bm25.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { scoreTerms, tokenize, type Bm25Corpus, type TermEntry } from "../retrieval/bm25";

const OPTIONS = { k1: 1.2, b: 0.75 };

test("tokenize lowercases, drops stop words and short tokens, and trims suffixes", () => {
  assert.deepEqual(tokenize("The buses COLLIDED on the PIE!"), ["bus", "collid", "pie"]);
  assert.deepEqual(tokenize("Collision, collisions; collision."), ["collision", "collision", "collision"]);
  assert.deepEqual(tokenize("report 2026-09-08"), ["report", "2026", "09", "08"]);
  assert.deepEqual(tokenize("the and of to"), []);
  assert.deepEqual(tokenize("   "), []);
});

function corpusOf(entries: Record<string, TermEntry>, wordCounts: number[]): Bm25Corpus {
  return {
    totalChunks: wordCounts.length,
    averageWordCount: wordCounts.reduce((sum, n) => sum + n, 0) / wordCounts.length,
    wordCountOf: (chunkNumber) => wordCounts[chunkNumber] ?? 0,
    entryFor: (term) => entries[term],
  };
}

test("scoreTerms matches the BM25 formula on a hand-computed example", () => {
  const corpus = corpusOf({ collision: { df: 1, postings: [[0, 2]] } }, [10, 10, 10]);
  const scores = scoreTerms(["collision"], corpus, OPTIONS);
  // idf = ln(1 + (3 - 1 + 0.5) / (1 + 0.5)) = 0.980829…
  // tf part = 2 * 2.2 / (2 + 1.2 * (1 - 0.75 + 0.75 * 1)) = 1.375
  assert.ok(Math.abs(scores.get(0)! - 0.980829 * 1.375) < 1e-4, `got ${scores.get(0)}`);
});

test("scoreTerms ranks rare terms above common ones", () => {
  const corpus = corpusOf(
    {
      collision: { df: 1, postings: [[0, 1]] },
      report: { df: 3, postings: [[1, 1]] },
    },
    [10, 10, 10],
  );
  const scores = scoreTerms(["collision", "report"], corpus, OPTIONS);
  assert.ok(scores.get(0)! > scores.get(1)!);
});

test("scoreTerms prefers the shorter chunk at equal term frequency", () => {
  const corpus = corpusOf({ collision: { df: 2, postings: [[0, 1], [1, 1]] } }, [5, 50]);
  const scores = scoreTerms(["collision"], corpus, OPTIONS);
  assert.ok(scores.get(0)! > scores.get(1)!);
});

test("scoreTerms sums across terms and ignores unknown ones", () => {
  const corpus = corpusOf(
    {
      collision: { df: 2, postings: [[0, 1], [1, 1]] },
      bus: { df: 2, postings: [[0, 1], [2, 1]] },
    },
    [10, 10, 10],
  );
  const scores = scoreTerms(["collision", "bus", "zebra"], corpus, OPTIONS);
  assert.equal(scores.size, 3);
  assert.ok(scores.get(0)! > scores.get(1)!);
  assert.equal(scores.get(1), scores.get(2));
});

test("scoreTerms returns nothing for no terms", () => {
  const corpus = corpusOf({}, [10]);
  assert.equal(scoreTerms([], corpus, OPTIONS).size, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../retrieval/bm25'`.

- [ ] **Step 3: Write the implementation**

Create `src/retrieval/bm25.ts`:

```ts
/** Words carrying no retrieval signal; dropped from both chunks and queries. */
const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "can", "did", "do", "does", "for", "from",
  "had", "has", "have", "he", "her", "his", "how", "i", "if", "in", "into", "is", "it", "its", "me", "my",
  "of", "on", "or", "our", "she", "so", "some", "than", "that", "the", "their", "them", "then", "there",
  "these", "they", "this", "to", "was", "we", "were", "what", "when", "where", "which", "who", "why",
  "will", "with", "would", "you", "your",
]);

const MIN_TERM_LENGTH = 2;

/** Trims the few English endings that would otherwise split one concept across terms. */
function trimSuffix(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 3 && word.endsWith("ed")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

/** Splits text into scoring terms: lowercase, stop words and 1-character tokens removed, suffixes trimmed. */
export function tokenize(text: string): string[] {
  const terms: string[] = [];
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < MIN_TERM_LENGTH || STOP_WORDS.has(raw)) continue;
    terms.push(trimSuffix(raw));
  }
  return terms;
}

export interface TermEntry {
  /** Number of chunks containing the term. */
  df: number;
  /** [chunkNumber, term frequency] pairs. */
  postings: Array<[number, number]>;
}

export interface Bm25Corpus {
  totalChunks: number;
  averageWordCount: number;
  wordCountOf(chunkNumber: number): number;
  entryFor(term: string): TermEntry | undefined;
}

export interface Bm25Options {
  k1: number;
  b: number;
}

/** Standard BM25: sums each term's idf-weighted, length-normalised term frequency per chunk. */
export function scoreTerms(terms: string[], corpus: Bm25Corpus, options: Bm25Options): Map<number, number> {
  const scores = new Map<number, number>();
  if (corpus.totalChunks === 0 || corpus.averageWordCount === 0) return scores;

  for (const term of terms) {
    const entry = corpus.entryFor(term);
    if (!entry || entry.df === 0) continue;
    const idf = Math.log(1 + (corpus.totalChunks - entry.df + 0.5) / (entry.df + 0.5));

    for (const [chunkNumber, termFrequency] of entry.postings) {
      const lengthRatio = corpus.wordCountOf(chunkNumber) / corpus.averageWordCount;
      const denominator = termFrequency + options.k1 * (1 - options.b + options.b * lengthRatio);
      if (denominator === 0) continue;
      const contribution = idf * ((termFrequency * (options.k1 + 1)) / denominator);
      scores.set(chunkNumber, (scores.get(chunkNumber) ?? 0) + contribution);
    }
  }
  return scores;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS. If a tokenize expectation fails, fix `trimSuffix`/`STOP_WORDS`, not the test — the expected arrays are the contract.

- [ ] **Step 5: Commit**

```bash
git add src/retrieval/bm25.ts src/tests/bm25.test.ts
git commit -m "Add tokenizing and BM25 scoring for keyword retrieval

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Weighted reciprocal rank fusion

**Files:**
- Create: `src/retrieval/fuse.ts`
- Test: `src/tests/fuse.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface RankedLane { name: string; weight: number; keys: string[] }`
  - `interface FusedChunk { key: string; score: number; lanes: string[] }`
  - `function fuseLanes(lanes: RankedLane[], rrfConstant: number): FusedChunk[]`

- [ ] **Step 1: Write the failing test**

Create `src/tests/fuse.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { fuseLanes } from "../retrieval/fuse";

const lane = (name: string, keys: string[], weight = 1) => ({ name, weight, keys });

test("fuseLanes scores by rank and reports contributing lanes", () => {
  const fused = fuseLanes(
    [lane("vector", ["a", "b"]), lane("keyword", ["b"])],
    60,
  );
  assert.deepEqual(fused.map((entry) => entry.key), ["b", "a"]);
  assert.ok(Math.abs(fused[0].score - (1 / 62 + 1 / 61)) < 1e-9);
  assert.ok(Math.abs(fused[1].score - 1 / 61) < 1e-9);
  assert.deepEqual(fused[0].lanes, ["vector", "keyword"]);
  assert.deepEqual(fused[1].lanes, ["vector"]);
});

test("a chunk in every lane beats a chunk ranked first in one", () => {
  const fused = fuseLanes(
    [lane("vector", ["top", "shared"]), lane("keyword", ["shared"]), lane("date", ["shared"])],
    60,
  );
  assert.equal(fused[0].key, "shared");
});

test("lane weight scales that lane's contribution", () => {
  const single = fuseLanes([lane("vector", ["a"])], 60)[0].score;
  const doubled = fuseLanes([lane("vector", ["a"], 2)], 60)[0].score;
  assert.ok(Math.abs(doubled - single * 2) < 1e-9);

  const weighted = fuseLanes([lane("vector", ["a"], 2), lane("keyword", ["b"], 1)], 60);
  assert.equal(weighted[0].key, "a");
});

test("a zero-weight lane contributes nothing but still records the lane", () => {
  const fused = fuseLanes([lane("vector", ["a"]), lane("keyword", ["a"], 0)], 60);
  assert.ok(Math.abs(fused[0].score - 1 / 61) < 1e-9);
  assert.deepEqual(fused[0].lanes, ["vector", "keyword"]);
});

test("ties keep the order the lanes listed them in", () => {
  const fused = fuseLanes([lane("vector", ["a", "b"]), lane("keyword", ["b", "a"])], 60);
  assert.deepEqual(fused.map((entry) => entry.key), ["a", "b"]);
});

test("fuseLanes handles empty input", () => {
  assert.deepEqual(fuseLanes([], 60), []);
  assert.deepEqual(fuseLanes([lane("vector", [])], 60), []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../retrieval/fuse'`.

- [ ] **Step 3: Write the implementation**

Create `src/retrieval/fuse.ts`:

```ts
export interface RankedLane {
  name: string;
  /** Scales this lane's whole curve; 1 is neutral. */
  weight: number;
  /** Chunk keys, best first. */
  keys: string[];
}

export interface FusedChunk {
  key: string;
  score: number;
  /** Lanes that ranked this chunk, in lane order. */
  lanes: string[];
}

/**
 * Weighted reciprocal rank fusion: each lane contributes weight / (rrfConstant + rank)
 * for the chunks it ranked, ranks being 1-based. A chunk missing from a lane simply
 * receives nothing from it, so no lane can exclude a chunk.
 */
export function fuseLanes(lanes: RankedLane[], rrfConstant: number): FusedChunk[] {
  const fused = new Map<string, FusedChunk>();
  const firstSeen = new Map<string, number>();
  let order = 0;

  for (const lane of lanes) {
    lane.keys.forEach((key, index) => {
      const existing = fused.get(key) ?? { key, score: 0, lanes: [] };
      existing.score += lane.weight / (rrfConstant + index + 1);
      existing.lanes.push(lane.name);
      fused.set(key, existing);
      if (!firstSeen.has(key)) firstSeen.set(key, order++);
    });
  }

  return [...fused.values()].sort(
    (a, b) => b.score - a.score || firstSeen.get(a.key)! - firstSeen.get(b.key)!,
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/retrieval/fuse.ts src/tests/fuse.test.ts
git commit -m "Add weighted reciprocal rank fusion

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Reading dates out of a question

**Files:**
- Create: `src/retrieval/queryDates.ts`
- Modify: `src/metadata/dates.ts` (export `MONTH_PATTERN`)
- Test: `src/tests/queryDates.test.ts`

**Interfaces:**
- Consumes: `extractDates`, `DateRange` from `src/metadata/dates.ts`.
- Produces:
  - `interface DayRange { start: number; end: number }` (inclusive day numbers, e.g. `20260908`)
  - `interface QueryDateOptions { now?: Date; yearsPresent?: number[] }`
  - `function queryDayRanges(question: string, options?: QueryDateOptions): DayRange[]`
  - `function toDayNumber(date: Date): number`
  - `src/metadata/dates.ts` exports `MONTH_PATTERN`.

- [ ] **Step 1: Write the failing test**

Create `src/tests/queryDates.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { queryDayRanges, toDayNumber } from "../retrieval/queryDates";

const NOW = new Date(2026, 8, 16); // Wednesday 16 September 2026
const options = (extra: Record<string, unknown> = {}) => ({ now: NOW, ...extra });

test("written dates become day ranges", () => {
  assert.deepEqual(queryDayRanges("What happened on 8 Sep 2026?", options()), [
    { start: 20260908, end: 20260908 },
  ]);
  assert.deepEqual(queryDayRanges("Summarise September 2026", options()), [
    { start: 20260901, end: 20260930 },
  ]);
  assert.deepEqual(queryDayRanges("Q3 2026 incidents", options()), [
    { start: 20260701, end: 20260930 },
  ]);
});

test("everyday phrases resolve against the current date", () => {
  assert.deepEqual(queryDayRanges("what happened today?", options()), [{ start: 20260916, end: 20260916 }]);
  assert.deepEqual(queryDayRanges("anything from yesterday?", options()), [{ start: 20260915, end: 20260915 }]);
  assert.deepEqual(queryDayRanges("summarise last week", options()), [{ start: 20260907, end: 20260913 }]);
  assert.deepEqual(queryDayRanges("summarise this week", options()), [{ start: 20260914, end: 20260920 }]);
  assert.deepEqual(queryDayRanges("reports from this month", options()), [{ start: 20260901, end: 20260930 }]);
  assert.deepEqual(queryDayRanges("reports from last month", options()), [{ start: 20260801, end: 20260831 }]);
  assert.deepEqual(queryDayRanges("last quarter results", options()), [{ start: 20260401, end: 20260630 }]);
  assert.deepEqual(queryDayRanges("anything this year", options()), [{ start: 20260101, end: 20261231 }]);
  assert.deepEqual(queryDayRanges("the past 3 days", options()), [{ start: 20260914, end: 20260916 }]);
  assert.deepEqual(queryDayRanges("in the last 2 weeks", options()), [{ start: 20260903, end: 20260916 }]);
});

test("a year-less date expands to the years present in the index", () => {
  assert.deepEqual(queryDayRanges("what happened on 8 Sep?", options({ yearsPresent: [2024, 2025, 2026] })), [
    { start: 20260908, end: 20260908 },
    { start: 20250908, end: 20250908 },
    { start: 20240908, end: 20240908 },
  ]);
});

test("a year-less date falls back to the current year when no years are known", () => {
  assert.deepEqual(queryDayRanges("what happened on 8 Sep?", options()), [
    { start: 20260908, end: 20260908 },
  ]);
});

test("a written year is respected even when other years exist", () => {
  assert.deepEqual(queryDayRanges("what happened on 8 Sep 2025?", options({ yearsPresent: [2025, 2026] })), [
    { start: 20250908, end: 20250908 },
  ]);
});

test("questions with no date produce no ranges", () => {
  assert.deepEqual(queryDayRanges("what caused the bus collision?", options()), []);
  assert.deepEqual(queryDayRanges("", options()), []);
});

test("toDayNumber uses the local calendar day", () => {
  assert.equal(toDayNumber(new Date(2026, 0, 5)), 20260105);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../retrieval/queryDates'`.

- [ ] **Step 3: Export the month pattern**

In `src/metadata/dates.ts`, change the `MONTH_PATTERN` declaration to be exported:

```ts
export const MONTH_PATTERN =
```

- [ ] **Step 4: Write the implementation**

Create `src/retrieval/queryDates.ts`:

```ts
import { extractDates, MONTH_PATTERN, type DateRange } from "../metadata/dates";

/** Inclusive range of day numbers, e.g. { start: 20260908, end: 20260908 }. */
export interface DayRange {
  start: number;
  end: number;
}

export interface QueryDateOptions {
  /** Anchor for relative phrases; defaults to now. */
  now?: Date;
  /** Years the index actually contains, used to expand a date written without a year. */
  yearsPresent?: number[];
}

const DAY_MS = 86_400_000;

export function toDayNumber(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

function dayRangeOfDates(start: Date, end: Date): DayRange {
  return { start: toDayNumber(start), end: toDayNumber(end) };
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function startOfWeek(date: Date): Date {
  // Weeks run Monday to Sunday.
  const offset = (date.getDay() + 6) % 7;
  return addDays(date, -offset);
}

function monthRange(year: number, month: number): DayRange {
  const lastDay = new Date(year, month, 0).getDate();
  return { start: year * 10000 + month * 100 + 1, end: year * 10000 + month * 100 + lastDay };
}

function quarterRange(year: number, quarter: number): DayRange {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const lastDay = new Date(year, endMonth, 0).getDate();
  return { start: year * 10000 + startMonth * 100 + 1, end: year * 10000 + endMonth * 100 + lastDay };
}

function isoToDayNumber(iso: string): number {
  return Number(iso.replace(/-/g, ""));
}

function rangeFromExtracted(range: DateRange): DayRange {
  return { start: isoToDayNumber(range.start), end: isoToDayNumber(range.end) };
}

/** Phrases resolved against `now`, checked before pattern extraction. */
function relativeRange(question: string, now: Date): DayRange | null {
  const text = question.toLowerCase();

  const countMatch = /\b(?:past|last)\s+(\d{1,3})\s+(day|week|month)s?\b/.exec(text);
  if (countMatch) {
    const count = Number(countMatch[1]);
    if (countMatch[2] === "day") return dayRangeOfDates(addDays(now, -(count - 1)), now);
    if (countMatch[2] === "week") return dayRangeOfDates(addDays(now, -(count * 7 - 1)), now);
    const start = new Date(now.getFullYear(), now.getMonth() - (count - 1), 1);
    return dayRangeOfDates(start, now);
  }

  if (/\btoday\b/.test(text)) return dayRangeOfDates(now, now);
  if (/\byesterday\b/.test(text)) return dayRangeOfDates(addDays(now, -1), now && addDays(now, -1));
  if (/\bthis week\b/.test(text)) {
    const start = startOfWeek(now);
    return dayRangeOfDates(start, addDays(start, 6));
  }
  if (/\blast week\b/.test(text)) {
    const start = addDays(startOfWeek(now), -7);
    return dayRangeOfDates(start, addDays(start, 6));
  }
  if (/\bthis month\b/.test(text)) return monthRange(now.getFullYear(), now.getMonth() + 1);
  if (/\blast month\b/.test(text)) {
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return monthRange(previous.getFullYear(), previous.getMonth() + 1);
  }
  if (/\bthis quarter\b/.test(text)) return quarterRange(now.getFullYear(), Math.floor(now.getMonth() / 3) + 1);
  if (/\blast quarter\b/.test(text)) {
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    return quarter === 1 ? quarterRange(now.getFullYear() - 1, 4) : quarterRange(now.getFullYear(), quarter - 1);
  }
  if (/\bthis year\b/.test(text)) {
    return { start: now.getFullYear() * 10000 + 101, end: now.getFullYear() * 10000 + 1231 };
  }
  if (/\blast year\b/.test(text)) {
    const year = now.getFullYear() - 1;
    return { start: year * 10000 + 101, end: year * 10000 + 1231 };
  }
  return null;
}

const YEARLESS_DAY_MONTH = new RegExp(
  `(?<![\\w])(\\d{1,2})(?:st|nd|rd|th)?[\\s-]+(${MONTH_PATTERN})\\.?(?![\\s-]*\\d{4})(?![\\w])`,
  "i",
);
const YEARLESS_MONTH_DAY = new RegExp(
  `(?<![\\w])(${MONTH_PATTERN})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?![,\\s]*\\d{4})(?![\\w])`,
  "i",
);
const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function yearlessRanges(question: string, now: Date, yearsPresent: number[] | undefined): DayRange[] {
  const match = YEARLESS_DAY_MONTH.exec(question) ?? YEARLESS_MONTH_DAY.exec(question);
  if (!match) return [];
  const dayFirst = YEARLESS_DAY_MONTH.test(question);
  const day = Number(dayFirst ? match[1] : match[2]);
  const monthName = (dayFirst ? match[2] : match[1]).slice(0, 3).toLowerCase();
  const month = MONTH_KEYS.indexOf(monthName) + 1;
  if (month === 0 || day < 1 || day > 31) return [];

  const years = yearsPresent && yearsPresent.length > 0 ? [...yearsPresent] : [now.getFullYear()];
  years.sort((a, b) => b - a);
  return years
    .filter((year) => new Date(year, month - 1, day).getDate() === day)
    .map((year) => {
      const dayNumber = year * 10000 + month * 100 + day;
      return { start: dayNumber, end: dayNumber };
    });
}

/**
 * Day ranges the question refers to, most recent first. Empty when it names no date,
 * in which case the caller skips the date lane.
 */
export function queryDayRanges(question: string, options: QueryDateOptions = {}): DayRange[] {
  if (!question.trim()) return [];
  const now = options.now ?? new Date();

  const relative = relativeRange(question, now);
  if (relative) return [relative];

  const extracted = extractDates(question, { referenceTime: now });
  if (extracted.length > 0) return extracted.map(rangeFromExtracted);

  return yearlessRanges(question, now, options.yearsPresent);
}
```

- [ ] **Step 5: Run tests**

Run: `npx tsc --noEmit` then `npm test`
Expected: clean; PASS. If the "yesterday" branch looks odd (`now && addDays(...)`), simplify it to `const day = addDays(now, -1); return dayRangeOfDates(day, day);` — the expected output is a single-day range for 15 Sep.

- [ ] **Step 6: Commit**

```bash
git add src/retrieval/queryDates.ts src/metadata/dates.ts src/tests/queryDates.test.ts
git commit -m "Read day ranges out of a question for the date lane

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: The chunk catalog

**Files:**
- Create: `src/retrieval/chunkCatalog.ts`
- Test: `src/tests/chunkCatalog.test.ts`

**Interfaces:**
- Consumes: `tokenize`, `scoreTerms`, `Bm25Corpus`, `TermEntry` (Task 2); `DayRange` (Task 4); `IndexedChunk`, `chunkKey` (Task 1).
- Produces:
  - `const CATALOG_FILENAME = ".big-rag-catalog.json"`
  - `interface CatalogOptions { version: number; maxChunks: number; k1: number; b: number }`
  - `class ChunkCatalog` with:
    - `static build(chunks: IndexedChunk[], options: CatalogOptions): ChunkCatalog`
    - `static async load(vectorStoreDir: string, options: CatalogOptions): Promise<ChunkCatalog | null>`
    - `async save(vectorStoreDir: string): Promise<void>`
    - `readonly chunkCount: number`, `readonly hasWordTable: boolean`, `readonly termCount: number`
    - `isStaleFor(storeChunkCount: number): boolean`
    - `scoreTerms(terms: string[]): Map<number, number>`
    - `chunksForRanges(ranges: DayRange[]): number[]`
    - `keyOf(chunkNumber: number): string`
    - `latestDayOf(chunkNumber: number): number`
    - `yearsPresent(): number[]`

- [ ] **Step 1: Write the failing test**

Create `src/tests/chunkCatalog.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { CATALOG_FILENAME, ChunkCatalog } from "../retrieval/chunkCatalog";
import { tokenize } from "../retrieval/bm25";
import { type IndexedChunk } from "../vectorstore/vectorStore";

const OPTIONS = { version: 1, maxChunks: 50000, k1: 1.2, b: 0.75 };

function chunk(id: string, text: string, dates: string[], posted = "2026-09-08"): IndexedChunk {
  return {
    id,
    shardName: "shard_000",
    text,
    filePath: "/docs/incidents.md",
    fileName: "incidents.md",
    chunkIndex: Number(id.split("-")[1]),
    metadata: {
      postedDate: JSON.stringify({ start: posted, end: posted }),
      dates: JSON.stringify(dates.map((d) => ({ start: d, end: d }))),
    },
  };
}

const CHUNKS = [
  chunk("hashA-0", "Bus collision on the PIE. Two injured.", ["2026-09-08"]),
  chunk("hashA-1", "Flooding at Bukit Timah after heavy rain.", ["2026-09-11"]),
  chunk("hashB-0", "Bus timetable changes for the new term.", ["2025-09-08"], "2025-09-08"),
];

async function withTempDir(fn: (dir: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-catalog-"));
  try {
    await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test("build indexes keys, words and days", () => {
  const catalog = ChunkCatalog.build(CHUNKS, OPTIONS);
  assert.equal(catalog.chunkCount, 3);
  assert.equal(catalog.hasWordTable, true);
  assert.equal(catalog.keyOf(0), "shard_000/hashA-0");
  assert.deepEqual(catalog.chunksForRanges([{ start: 20260908, end: 20260908 }]), [0]);
  assert.deepEqual(catalog.chunksForRanges([{ start: 20260908, end: 20260911 }]), [0, 1]);
  assert.deepEqual(catalog.yearsPresent(), [2026, 2025]);
  assert.equal(catalog.latestDayOf(1), 20260911);
});

test("scoreTerms ranks the chunk containing the query terms first", () => {
  const catalog = ChunkCatalog.build(CHUNKS, OPTIONS);
  const scores = catalog.scoreTerms(tokenize("bus collision"));
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([chunkNumber]) => chunkNumber);
  assert.equal(ranked[0], 0);
  assert.ok(ranked.includes(2));
  assert.ok(!ranked.includes(1));
});

test("save and load round trip", async () => {
  await withTempDir(async (dir) => {
    const built = ChunkCatalog.build(CHUNKS, OPTIONS);
    await built.save(dir);
    const loaded = await ChunkCatalog.load(dir, OPTIONS);
    assert.ok(loaded);
    assert.equal(loaded!.chunkCount, 3);
    assert.equal(loaded!.keyOf(2), "shard_000/hashB-0");
    assert.deepEqual(loaded!.chunksForRanges([{ start: 20250908, end: 20250908 }]), [2]);
    assert.deepEqual(
      [...loaded!.scoreTerms(tokenize("collision")).keys()],
      [...built.scoreTerms(tokenize("collision")).keys()],
    );
  });
});

test("load returns null for a missing, corrupt, or wrong-version file", async () => {
  await withTempDir(async (dir) => {
    assert.equal(await ChunkCatalog.load(dir, OPTIONS), null);

    await fs.writeFile(path.join(dir, CATALOG_FILENAME), "{not json");
    assert.equal(await ChunkCatalog.load(dir, OPTIONS), null);

    const built = ChunkCatalog.build(CHUNKS, OPTIONS);
    await built.save(dir);
    assert.equal(await ChunkCatalog.load(dir, { ...OPTIONS, version: 2 }), null);
  });
});

test("isStaleFor compares against the store's chunk count", () => {
  const catalog = ChunkCatalog.build(CHUNKS, OPTIONS);
  assert.equal(catalog.isStaleFor(3), false);
  assert.equal(catalog.isStaleFor(4), true);
});

test("above the ceiling the word table is skipped but days still work", () => {
  const catalog = ChunkCatalog.build(CHUNKS, { ...OPTIONS, maxChunks: 2 });
  assert.equal(catalog.hasWordTable, false);
  assert.equal(catalog.termCount, 0);
  assert.equal(catalog.scoreTerms(tokenize("collision")).size, 0);
  assert.deepEqual(catalog.chunksForRanges([{ start: 20260908, end: 20260908 }]), [0]);
});

test("chunks with no dates are indexed but match no range", () => {
  const undated: IndexedChunk = {
    id: "hashC-0",
    shardName: "shard_000",
    text: "Undated note about buses.",
    filePath: "/docs/note.md",
    fileName: "note.md",
    chunkIndex: 0,
    metadata: {},
  };
  const catalog = ChunkCatalog.build([...CHUNKS, undated], OPTIONS);
  assert.equal(catalog.chunkCount, 4);
  assert.deepEqual(catalog.chunksForRanges([{ start: 19000101, end: 21001231 }]), [0, 1, 2]);
  assert.ok(catalog.scoreTerms(tokenize("undated")).has(3));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../retrieval/chunkCatalog'`.

- [ ] **Step 3: Write the implementation**

Create `src/retrieval/chunkCatalog.ts`:

```ts
import * as fs from "fs/promises";
import * as path from "path";
import { chunkKey, type IndexedChunk } from "../vectorstore/vectorStore";
import { scoreTerms as scoreBm25, tokenize, type Bm25Corpus, type TermEntry } from "./bm25";
import { type DayRange } from "./queryDates";

export const CATALOG_FILENAME = ".big-rag-catalog.json";

export interface CatalogOptions {
  version: number;
  /** Above this many chunks the word table is skipped to bound memory. */
  maxChunks: number;
  k1: number;
  b: number;
}

interface CatalogChunkRow {
  key: string;
  filePath: string;
  wordCount: number;
  days: number[];
}

interface CatalogFile {
  version: number;
  chunkCount: number;
  wordTableSkipped: boolean;
  chunks: CatalogChunkRow[];
  words: Record<string, TermEntry>;
  days: Record<string, number[]>;
}

function isoToDayNumber(iso: string): number {
  return Number(iso.replace(/-/g, ""));
}

/** Day numbers for a chunk: its posted date plus every section date, deduped and sorted. */
function daysOf(metadata: Record<string, any>): number[] {
  const days = new Set<number>();
  const add = (raw: unknown) => {
    if (typeof raw !== "string" || raw.length === 0) return;
    try {
      const parsed = JSON.parse(raw);
      for (const range of Array.isArray(parsed) ? parsed : [parsed]) {
        if (range && typeof range.start === "string") days.add(isoToDayNumber(range.start));
        if (range && typeof range.end === "string") days.add(isoToDayNumber(range.end));
      }
    } catch {
      // Metadata written by an older version; treat as undated.
    }
  };
  add(metadata?.postedDate);
  add(metadata?.dates);
  return [...days].sort((a, b) => a - b);
}

/**
 * A derived index of the vector store: one row per chunk plus word and day lookups.
 * Holds no chunk text and can be rebuilt from the store at any time.
 */
export class ChunkCatalog {
  private constructor(
    private readonly file: CatalogFile,
    private readonly options: CatalogOptions,
    private readonly averageWordCount: number,
  ) {}

  static build(chunks: IndexedChunk[], options: CatalogOptions): ChunkCatalog {
    const skipWords = chunks.length > options.maxChunks;
    const rows: CatalogChunkRow[] = [];
    const words: Record<string, TermEntry> = {};
    const days: Record<string, number[]> = {};

    chunks.forEach((chunk, chunkNumber) => {
      const terms = skipWords ? [] : tokenize(chunk.text);
      const chunkDays = daysOf(chunk.metadata ?? {});
      rows.push({
        key: chunkKey(chunk),
        filePath: chunk.filePath,
        wordCount: terms.length > 0 ? terms.length : chunk.text.split(/\s+/).filter(Boolean).length,
        days: chunkDays,
      });

      const frequencies = new Map<string, number>();
      for (const term of terms) frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
      for (const [term, frequency] of frequencies) {
        const entry = words[term] ?? { df: 0, postings: [] };
        entry.df += 1;
        entry.postings.push([chunkNumber, frequency]);
        words[term] = entry;
      }

      for (const day of chunkDays) {
        const key = String(day);
        (days[key] ??= []).push(chunkNumber);
      }
    });

    const file: CatalogFile = {
      version: options.version,
      chunkCount: chunks.length,
      wordTableSkipped: skipWords,
      chunks: rows,
      words,
      days,
    };
    return new ChunkCatalog(file, options, averageOf(rows));
  }

  static async load(vectorStoreDir: string, options: CatalogOptions): Promise<ChunkCatalog | null> {
    try {
      const raw = await fs.readFile(path.join(vectorStoreDir, CATALOG_FILENAME), "utf-8");
      const file = JSON.parse(raw) as CatalogFile;
      if (
        file?.version !== options.version ||
        !Array.isArray(file.chunks) ||
        typeof file.chunkCount !== "number" ||
        typeof file.words !== "object" ||
        typeof file.days !== "object"
      ) {
        return null;
      }
      return new ChunkCatalog(file, options, averageOf(file.chunks));
    } catch {
      return null;
    }
  }

  async save(vectorStoreDir: string): Promise<void> {
    await fs.writeFile(path.join(vectorStoreDir, CATALOG_FILENAME), JSON.stringify(this.file), "utf-8");
  }

  get chunkCount(): number {
    return this.file.chunkCount;
  }

  get hasWordTable(): boolean {
    return !this.file.wordTableSkipped;
  }

  get termCount(): number {
    return Object.keys(this.file.words).length;
  }

  isStaleFor(storeChunkCount: number): boolean {
    return storeChunkCount !== this.file.chunkCount;
  }

  keyOf(chunkNumber: number): string {
    return this.file.chunks[chunkNumber]?.key ?? "";
  }

  /** Most recent day recorded for a chunk, or 0 when it has none. */
  latestDayOf(chunkNumber: number): number {
    const days = this.file.chunks[chunkNumber]?.days ?? [];
    return days.length > 0 ? days[days.length - 1] : 0;
  }

  /** Years present in the index, most recent first. */
  yearsPresent(): number[] {
    const years = new Set<number>();
    for (const key of Object.keys(this.file.days)) years.add(Math.floor(Number(key) / 10000));
    return [...years].sort((a, b) => b - a);
  }

  scoreTerms(terms: string[]): Map<number, number> {
    if (this.file.wordTableSkipped || terms.length === 0) return new Map();
    const corpus: Bm25Corpus = {
      totalChunks: this.file.chunkCount,
      averageWordCount: this.averageWordCount,
      wordCountOf: (chunkNumber) => this.file.chunks[chunkNumber]?.wordCount ?? 0,
      entryFor: (term) => this.file.words[term],
    };
    return scoreBm25(terms, corpus, { k1: this.options.k1, b: this.options.b });
  }

  /** Chunk numbers whose posted or section dates fall inside any range, in catalog order. */
  chunksForRanges(ranges: DayRange[]): number[] {
    if (ranges.length === 0) return [];
    const matched = new Set<number>();
    for (const [dayKey, chunkNumbers] of Object.entries(this.file.days)) {
      const day = Number(dayKey);
      if (ranges.some((range) => day >= range.start && day <= range.end)) {
        for (const chunkNumber of chunkNumbers) matched.add(chunkNumber);
      }
    }
    return [...matched].sort((a, b) => a - b);
  }
}

function averageOf(rows: CatalogChunkRow[]): number {
  if (rows.length === 0) return 0;
  return rows.reduce((sum, row) => sum + row.wordCount, 0) / rows.length;
}
```

- [ ] **Step 4: Run tests**

Run: `npx tsc --noEmit` then `npm test`
Expected: clean; PASS.

- [ ] **Step 5: Commit**

```bash
git add src/retrieval/chunkCatalog.ts src/tests/chunkCatalog.test.ts
git commit -m "Add the chunk catalog with word and day lookups

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Lanes and fusion inside retrieve()

**Files:**
- Modify: `src/retrieval/retrieve.ts`
- Test: `src/tests/retrieve.test.ts`

**Interfaces:**
- Consumes: `fuseLanes`, `RankedLane` (Task 3); `tokenize` (Task 2); `queryDayRanges`, `DayRange` (Task 4); `ChunkCatalog` shape (Task 5); `chunkKey`, `getChunksByKeys` (Task 1).
- Produces:
  - `type RetrievalDepth = "low" | "medium"`
  - `interface CatalogLanes { hasWordTable: boolean; scoreTerms(terms: string[]): Map<number, number>; chunksForRanges(ranges: DayRange[]): number[]; keyOf(chunkNumber: number): string; latestDayOf(chunkNumber: number): number; yearsPresent(): number[] }`
  - `RetrieveDeps` gains `catalog?: CatalogLanes | null`, `fetchChunks?: (keys: string[]) => Promise<SearchResult[]>`, `nowDate?: () => Date`, and `vectorStore` widens to `Pick<VectorStore, "search">`.
  - `RetrieveOptions` gains `depth: RetrievalDepth; laneCandidates: number; rrfConstant: number; laneWeights: { vector: number; keyword: number; date: number }`.
  - `RetrieveResult` gains `laneCounts: { vector: number; keyword: number; date: number }` (how many of the returned passages each lane ranked) and `dayRanges: DayRange[]`.
  - `StageName` gains `"keywordLane" | "dateLane" | "fuse"`.

- [ ] **Step 1: Write the failing test**

Add to `src/tests/retrieve.test.ts` (keep existing tests; extend the local `makeDeps` helper's option objects with the new required fields via the helper below):

```ts
import { type DayRange } from "../retrieval/queryDates";
import { type CatalogLanes } from "../retrieval/retrieve";

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
```

Also add `depth: "low"`, `laneCandidates: 30`, `rrfConstant: 60`, `laneWeights: { vector: 1, keyword: 1, date: 1 }` to the options object of every pre-existing test in this file, and `id: "chunk-0"` to `makeResult`'s defaults if Task 1 did not already add it.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `depth` is not a known option and `CatalogLanes` is not exported.

- [ ] **Step 3: Write the implementation**

In `src/retrieval/retrieve.ts`:

1. Add imports:

```ts
import { chunkKey, type SearchResult, type VectorStore } from "../vectorstore/vectorStore";
import { tokenize } from "./bm25";
import { fuseLanes, type RankedLane } from "./fuse";
import { queryDayRanges, type DayRange } from "./queryDates";
```

2. Add the new types and widen the existing ones:

```ts
export type RetrievalDepth = "low" | "medium";

/** The subset of ChunkCatalog the retrieval lanes need. */
export interface CatalogLanes {
  hasWordTable: boolean;
  scoreTerms(terms: string[]): Map<number, number>;
  chunksForRanges(ranges: DayRange[]): number[];
  keyOf(chunkNumber: number): string;
  latestDayOf(chunkNumber: number): number;
  yearsPresent(): number[];
}

export interface LaneCounts {
  vector: number;
  keyword: number;
  date: number;
}
```

`StageName` becomes:

```ts
export type StageName =
  | "embedQuery"
  | "vectorSearch"
  | "keywordLane"
  | "dateLane"
  | "fuse"
  | "trimOverlap"
  | "compaction";
```

`RetrieveDeps` gains:

```ts
  /** Present only at Medium depth; null when it could not be built. */
  catalog?: CatalogLanes | null;
  /** Reads chunks the non-vector lanes selected. Required at Medium depth. */
  fetchChunks?: (keys: string[]) => Promise<SearchResult[]>;
  /** Clock for relative date phrases in the query. */
  nowDate?: () => Date;
```

`RetrieveOptions` gains:

```ts
  depth: RetrievalDepth;
  /** Candidates each lane contributes to fusion. */
  laneCandidates: number;
  rrfConstant: number;
  laneWeights: { vector: number; keyword: number; date: number };
```

`RetrieveResult` gains:

```ts
  laneCounts: LaneCounts;
  /** Day ranges parsed from the query; empty when it named no date. */
  dayRanges: DayRange[];
```

3. Add these helpers above `retrieve`:

```ts
function topKeys(scores: Map<number, number>, limit: number, keyOf: (n: number) => string): string[] {
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, limit)
    .map(([chunkNumber]) => keyOf(chunkNumber))
    .filter((key) => key.length > 0);
}

/** Runs a lane, returning an empty list if it fails so one lane cannot fail the query. */
async function safeLane(name: string, run: () => Promise<string[]>): Promise<string[]> {
  try {
    return await run();
  } catch (error) {
    console.warn(`[BigRAG] ${name} lane failed; continuing without it:`, error);
    return [];
  }
}
```

4. Replace the body of `retrieve` from the `searchLimit` line through the `trimOverlap` stage with:

```ts
  const medium = options.depth === "medium";

  // Compaction shrinks passages, so it needs a larger candidate pool to choose from.
  const searchLimit = options.enableContextCompaction
    ? options.retrievalLimit * CONTEXT_COMPACTION_POOL_MULTIPLIER
    : medium
      ? options.laneCandidates
      : options.retrievalLimit;

  const searched = await timed("vectorSearch", () =>
    deps.vectorStore.search(queryEmbedding, searchLimit, options.retrievalThreshold),
  );
  options.abortSignal?.throwIfAborted();

  const catalog = medium ? deps.catalog ?? null : null;
  const laneCounts: LaneCounts = { vector: 0, keyword: 0, date: 0 };
  let dayRanges: DayRange[] = [];
  let ranked: SearchResult[] = searched;

  if (catalog) {
    const terms = tokenize(query);
    const keywordScores = new Map<number, number>();

    const keywordKeys = await timed("keywordLane", () =>
      safeLane("keyword", async () => {
        if (!catalog.hasWordTable || terms.length === 0) return [];
        for (const [chunkNumber, score] of catalog.scoreTerms(terms)) keywordScores.set(chunkNumber, score);
        return topKeys(keywordScores, options.laneCandidates, (n) => catalog.keyOf(n));
      }),
    );
    options.abortSignal?.throwIfAborted();

    const dateKeys = await timed("dateLane", () =>
      safeLane("date", async () => {
        dayRanges = queryDayRanges(query, {
          now: deps.nowDate?.() ?? new Date(),
          yearsPresent: catalog.yearsPresent(),
        });
        if (dayRanges.length === 0) return [];
        const matched = catalog.chunksForRanges(dayRanges);
        return matched
          .sort(
            (a, b) =>
              (keywordScores.get(b) ?? 0) - (keywordScores.get(a) ?? 0) ||
              catalog.latestDayOf(b) - catalog.latestDayOf(a) ||
              a - b,
          )
          .slice(0, options.laneCandidates)
          .map((chunkNumber) => catalog.keyOf(chunkNumber))
          .filter((key) => key.length > 0);
      }),
    );
    options.abortSignal?.throwIfAborted();

    const vectorByKey = new Map(searched.map((result) => [chunkKey(result), result]));
    const lanes: RankedLane[] = [
      { name: "vector", weight: options.laneWeights.vector, keys: [...vectorByKey.keys()] },
      { name: "keyword", weight: options.laneWeights.keyword, keys: keywordKeys },
      { name: "date", weight: options.laneWeights.date, keys: dateKeys },
    ];

    const fused = await timed("fuse", async () => fuseLanes(lanes, options.rrfConstant));
    const winners = fused.slice(0, options.retrievalLimit);
    for (const winner of winners) {
      if (winner.lanes.includes("vector")) laneCounts.vector++;
      if (winner.lanes.includes("keyword")) laneCounts.keyword++;
      if (winner.lanes.includes("date")) laneCounts.date++;
    }

    const missingKeys = winners.filter((winner) => !vectorByKey.has(winner.key)).map((winner) => winner.key);
    const fetchedByKey = new Map<string, SearchResult>();
    if (missingKeys.length > 0 && deps.fetchChunks) {
      for (const fetchedChunk of await deps.fetchChunks(missingKeys)) {
        fetchedByKey.set(chunkKey(fetchedChunk), fetchedChunk);
      }
    }

    ranked = winners
      .map((winner) => {
        const source = vectorByKey.get(winner.key) ?? fetchedByKey.get(winner.key);
        return source ? { ...source, score: winner.score } : null;
      })
      .filter((result): result is SearchResult => result !== null);
    options.abortSignal?.throwIfAborted();
  } else {
    laneCounts.vector = Math.min(searched.length, options.retrievalLimit);
    ranked = searched.slice(0, options.enableContextCompaction ? searched.length : options.retrievalLimit);
  }

  let passages = await timed("trimOverlap", async () => trimOverlappingChunks(ranked));
```

5. Return the new fields:

```ts
  return { passages, diagnosticPool, timings, laneCounts, dayRanges };
```

- [ ] **Step 4: Run tests**

Run: `npx tsc --noEmit` then `npm test`
Expected: clean; PASS, including the pre-existing Low-depth tests unchanged in behaviour.

If the medium worked-example test disagrees on ordering, print `fused` in a scratch run and check the lane key lists — the assertions encode the spec's fusion rules and must not be loosened.

- [ ] **Step 5: Commit**

```bash
git add src/retrieval/retrieve.ts src/tests/retrieve.test.ts
git commit -m "Run keyword and date lanes and fuse them at medium depth

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Depth setting, defaults, and eval plumbing

**Files:**
- Modify: `src/settings/defaults.ts`
- Modify: `src/settings/resolveSettings.ts`
- Modify: `src/config.ts`
- Modify: `src/eval/settings.ts`
- Modify: `src/eval/settingsSnapshot.ts`
- Modify: `src/evalCli.ts`, `src/eval/runEval.ts`
- Test: `src/tests/resolveSettings.test.ts`, `src/tests/settings.test.ts`

**Interfaces:**
- Consumes: `RetrievalDepth` (Task 6).
- Produces:
  - `FIXED_DEFAULTS` gains `laneCandidates: 30`, `rrfConstant: 60`, `laneWeightVector: 1`, `laneWeightKeyword: 1`, `laneWeightDate: 1`, `catalogMaxChunks: 50000`, `bm25K1: 1.2`, `bm25B: 0.75`, `catalogVersion: 1`.
  - `ResolvedSettings` gains `retrievalDepth: RetrievalDepth`.
  - `readRetrievalSettings` returns `retrievalDepth` from `BIG_RAG_RETRIEVAL_DEPTH` (default `medium`).
  - `config.ts` chat schema gains the `retrievalDepth` select.

- [ ] **Step 1: Write the failing tests**

Add to `src/tests/resolveSettings.test.ts`:

```ts
test("resolveSettings reads the retrieval depth from the chat config", () => {
  const base = { documentsDirectory: "/d", vectorStoreDirectory: "/v" };
  assert.equal(resolveSettings(reader(base), reader({ retrievalDepth: "low" })).retrievalDepth, "low");
  assert.equal(resolveSettings(reader(base), reader({ retrievalDepth: "medium" })).retrievalDepth, "medium");
  assert.equal(resolveSettings(reader(base), reader({})).retrievalDepth, "medium");
  assert.equal(resolveSettings(reader(base), reader({ retrievalDepth: "deep" })).retrievalDepth, "medium");
});

test("resolveSettings exposes the hybrid retrieval defaults", () => {
  const settings = resolveSettings(reader({ documentsDirectory: "/d", vectorStoreDirectory: "/v" }), reader({}));
  assert.equal(settings.laneCandidates, 30);
  assert.equal(settings.rrfConstant, 60);
  assert.equal(settings.laneWeightVector, 1);
  assert.equal(settings.laneWeightKeyword, 1);
  assert.equal(settings.laneWeightDate, 1);
  assert.equal(settings.catalogMaxChunks, 50000);
  assert.equal(settings.bm25K1, 1.2);
  assert.equal(settings.bm25B, 0.75);
  assert.equal(settings.catalogVersion, 1);
});
```

Add to `src/tests/settings.test.ts`:

```ts
test("readRetrievalSettings reads the retrieval depth from the environment", () => {
  assert.equal(readRetrievalSettings({}).retrievalDepth, "medium");
  assert.equal(readRetrievalSettings({ BIG_RAG_RETRIEVAL_DEPTH: "low" }).retrievalDepth, "low");
  assert.equal(readRetrievalSettings({ BIG_RAG_RETRIEVAL_DEPTH: "LOW" }).retrievalDepth, "low");
  assert.throws(() => readRetrievalSettings({ BIG_RAG_RETRIEVAL_DEPTH: "deep" }), /BIG_RAG_RETRIEVAL_DEPTH/);
});
```

The existing `readRetrievalSettings` default test must also gain `retrievalDepth: "medium"` in its expected object — update that expectation, since the return type changed.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `retrievalDepth` missing from both results.

- [ ] **Step 3: Add the defaults**

In `src/settings/defaults.ts`, add inside `FIXED_DEFAULTS` (after `enableContextCompaction`):

```ts
  laneCandidates: 30,
  rrfConstant: 60,
  laneWeightVector: 1,
  laneWeightKeyword: 1,
  laneWeightDate: 1,
  catalogMaxChunks: 50000,
  bm25K1: 1.2,
  bm25B: 0.75,
  catalogVersion: 1,
```

- [ ] **Step 4: Resolve the setting**

In `src/settings/resolveSettings.ts`:

```ts
import { type RetrievalDepth } from "../retrieval/retrieve";
```

Add to `ResolvedSettings` (after `reindexMode`):

```ts
  retrievalDepth: RetrievalDepth;
  laneCandidates: number;
  rrfConstant: number;
  laneWeightVector: number;
  laneWeightKeyword: number;
  laneWeightDate: number;
  catalogMaxChunks: number;
  bm25K1: number;
  bm25B: number;
  catalogVersion: number;
```

(The tuning fields arrive through the `...FIXED_DEFAULTS` spread that is already in `resolveSettings`; without these declarations the callers cannot read them.)

In `resolveSettings`, after the `reindexMode` line:

```ts
  const retrievalDepth = readString(chatConfig, "retrievalDepth");
```

and in the returned object, after `reindexMode`:

```ts
    retrievalDepth: retrievalDepth === "low" ? "low" : "medium",
```

- [ ] **Step 5: Add the chat setting**

In `src/config.ts`, add a second field to the chat schematics after `reindexMode` (before `.build()`):

```ts
  .field(
    "retrievalDepth",
    "select",
    {
      displayName: "Retrieval Depth",
      subtitle:
        "Medium searches by meaning, by keyword, and by date, then merges the results — better recall, no extra model calls. "
        + "Low searches by meaning only, like earlier versions.",
      options: [
        { value: "low", displayName: "Low" },
        { value: "medium", displayName: "Medium" },
      ],
    },
    "medium",
  )
```

- [ ] **Step 6: Eval plumbing**

In `src/eval/settings.ts`:

```ts
import { type RetrievalDepth } from "../retrieval/retrieve";
```

Add `retrievalDepth: RetrievalDepth;` to `RetrievalSettings`, and inside `readRetrievalSettings` before the return:

```ts
  const rawDepth = (env.BIG_RAG_RETRIEVAL_DEPTH ?? "medium").trim().toLowerCase();
  if (rawDepth !== "low" && rawDepth !== "medium") {
    throw new Error(`BIG_RAG_RETRIEVAL_DEPTH must be "low" or "medium", got "${env.BIG_RAG_RETRIEVAL_DEPTH}"`);
  }
```

then add `retrievalDepth: rawDepth,` to the returned object.

In `src/eval/settingsSnapshot.ts`, include `retrievalDepth` in the snapshot alongside the other retrieval settings (follow the file's existing shape, e.g. a `retrievalDepth: settings.retrievalDepth` field), and update its test for the new field.

In `src/evalCli.ts` and `src/eval/runEval.ts`, pass the new options through to `retrieve()`: `depth: settings.retrievalDepth`, `laneCandidates: FIXED_DEFAULTS.laneCandidates`, `rrfConstant: FIXED_DEFAULTS.rrfConstant`, `laneWeights: { vector: FIXED_DEFAULTS.laneWeightVector, keyword: FIXED_DEFAULTS.laneWeightKeyword, date: FIXED_DEFAULTS.laneWeightDate }`, and `fetchChunks: (keys) => vectorStore.getChunksByKeys(keys)`. Leave `catalog` unset for now — Task 8 adds the catalog to the eval path once the catalog manager exists, so at this point an eval run at Medium behaves like Low. Log the depth in the CLI's startup lines like the other settings.

- [ ] **Step 7: Run tests**

Run: `npx tsc --noEmit` then `npm test`
Expected: clean; PASS.

- [ ] **Step 8: Commit**

```bash
git add src/settings src/config.ts src/eval src/evalCli.ts src/tests/resolveSettings.test.ts src/tests/settings.test.ts src/tests/settingsSnapshot.test.ts
git commit -m "Add the Retrieval Depth setting and hybrid retrieval defaults

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Catalog lifecycle, statuses, and documentation

**Files:**
- Create: `src/retrieval/catalogManager.ts`
- Modify: `src/promptPreprocessor.ts`
- Modify: `README.md`
- Test: `src/tests/catalogManager.test.ts`

**Interfaces:**
- Consumes: `ChunkCatalog`, `CATALOG_FILENAME` (Task 5); `ResolvedSettings` (Task 7); `VectorStore` (Task 1).
- Produces:
  - `interface CatalogSource { listChunks(): Promise<IndexedChunk[]>; getStats(): Promise<{ totalChunks: number }> }`
  - `interface CatalogOutcome { catalog: ChunkCatalog | null; built: boolean; ms: number; error?: string }`
  - `function getCatalog(vectorStoreDir: string, store: CatalogSource, options: CatalogOptions, cache?: CatalogCache): Promise<CatalogOutcome>`
  - `function resetCatalogCache(): void` (test seam; also called after indexing runs)
  - `class CatalogCache` holding the loaded catalog per vector store directory and a "build failed this session" flag.

- [ ] **Step 1: Write the failing test**

Create `src/tests/catalogManager.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { CatalogCache, getCatalog } from "../retrieval/catalogManager";
import { CATALOG_FILENAME } from "../retrieval/chunkCatalog";
import { type IndexedChunk } from "../vectorstore/vectorStore";

const OPTIONS = { version: 1, maxChunks: 50000, k1: 1.2, b: 0.75 };

function chunkOf(id: string): IndexedChunk {
  return {
    id,
    shardName: "shard_000",
    text: `text of ${id}`,
    filePath: "/docs/a.md",
    fileName: "a.md",
    chunkIndex: 0,
    metadata: {},
  };
}

function sourceOf(chunks: IndexedChunk[]) {
  let listCalls = 0;
  return {
    listCalls: () => listCalls,
    source: {
      listChunks: async () => {
        listCalls++;
        return chunks;
      },
      getStats: async () => ({ totalChunks: chunks.length }),
    },
  };
}

async function withTempDir(fn: (dir: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-catalog-mgr-"));
  try {
    await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test("getCatalog builds once, saves, and reuses the cache", async () => {
  await withTempDir(async (dir) => {
    const { source, listCalls } = sourceOf([chunkOf("hashA-0"), chunkOf("hashA-1")]);
    const cache = new CatalogCache();

    const first = await getCatalog(dir, source, OPTIONS, cache);
    assert.ok(first.catalog);
    assert.equal(first.built, true);
    assert.ok(first.ms >= 0);
    await fs.access(path.join(dir, CATALOG_FILENAME));

    const second = await getCatalog(dir, source, OPTIONS, cache);
    assert.equal(second.built, false);
    assert.equal(listCalls(), 1);
  });
});

test("a saved catalog is loaded instead of rebuilt in a new session", async () => {
  await withTempDir(async (dir) => {
    const { source } = sourceOf([chunkOf("hashA-0")]);
    await getCatalog(dir, source, OPTIONS, new CatalogCache());

    const { source: freshSource, listCalls } = sourceOf([chunkOf("hashA-0")]);
    const loaded = await getCatalog(dir, freshSource, OPTIONS, new CatalogCache());
    assert.ok(loaded.catalog);
    assert.equal(loaded.built, false);
    assert.equal(listCalls(), 0);
  });
});

test("a chunk count change rebuilds the catalog", async () => {
  await withTempDir(async (dir) => {
    await getCatalog(dir, sourceOf([chunkOf("hashA-0")]).source, OPTIONS, new CatalogCache());
    const { source, listCalls } = sourceOf([chunkOf("hashA-0"), chunkOf("hashA-1")]);
    const rebuilt = await getCatalog(dir, source, OPTIONS, new CatalogCache());
    assert.equal(rebuilt.built, true);
    assert.equal(rebuilt.catalog!.chunkCount, 2);
    assert.equal(listCalls(), 1);
  });
});

test("a build failure is reported once and not retried in the session", async () => {
  await withTempDir(async (dir) => {
    const failing = {
      listChunks: async () => {
        throw new Error("store unreadable");
      },
      getStats: async () => ({ totalChunks: 2 }),
    };
    const cache = new CatalogCache();

    const first = await getCatalog(dir, failing, OPTIONS, cache);
    assert.equal(first.catalog, null);
    assert.match(first.error!, /store unreadable/);

    let retried = false;
    const second = await getCatalog(
      dir,
      {
        listChunks: async () => {
          retried = true;
          return [];
        },
        getStats: async () => ({ totalChunks: 2 }),
      },
      OPTIONS,
      cache,
    );
    assert.equal(second.catalog, null);
    assert.equal(retried, false);
  });
});

test("an empty store yields no catalog and no file", async () => {
  await withTempDir(async (dir) => {
    const outcome = await getCatalog(dir, sourceOf([]).source, OPTIONS, new CatalogCache());
    assert.equal(outcome.catalog, null);
    await assert.rejects(fs.access(path.join(dir, CATALOG_FILENAME)));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../retrieval/catalogManager'`.

- [ ] **Step 3: Write the implementation**

Create `src/retrieval/catalogManager.ts`:

```ts
import { type IndexedChunk } from "../vectorstore/vectorStore";
import { ChunkCatalog, type CatalogOptions } from "./chunkCatalog";

export interface CatalogSource {
  listChunks(): Promise<IndexedChunk[]>;
  getStats(): Promise<{ totalChunks: number }>;
}

export interface CatalogOutcome {
  catalog: ChunkCatalog | null;
  /** True when this call built (rather than loaded or reused) the catalog. */
  built: boolean;
  ms: number;
  error?: string;
}

/** Per-session state: the loaded catalog per store directory, and whether building already failed. */
export class CatalogCache {
  private catalogs = new Map<string, ChunkCatalog>();
  private failures = new Set<string>();

  get(dir: string): ChunkCatalog | undefined {
    return this.catalogs.get(dir);
  }
  set(dir: string, catalog: ChunkCatalog): void {
    this.catalogs.set(dir, catalog);
  }
  hasFailed(dir: string): boolean {
    return this.failures.has(dir);
  }
  markFailed(dir: string): void {
    this.failures.add(dir);
  }
  /** Called after an indexing run so the next query refreshes the catalog. */
  invalidate(dir: string): void {
    this.catalogs.delete(dir);
    this.failures.delete(dir);
  }
}

const sharedCache = new CatalogCache();

/** Test seam and post-indexing hook for the module-level cache. */
export function resetCatalogCache(vectorStoreDir?: string): void {
  if (vectorStoreDir) sharedCache.invalidate(vectorStoreDir);
}

/**
 * Returns the catalog for a store, loading it from disk, reusing the session cache, or
 * building and saving it. Never throws: a failure is reported once per session and the
 * caller falls back to the vector lane.
 */
export async function getCatalog(
  vectorStoreDir: string,
  store: CatalogSource,
  options: CatalogOptions,
  cache: CatalogCache = sharedCache,
): Promise<CatalogOutcome> {
  const started = Date.now();
  if (cache.hasFailed(vectorStoreDir)) {
    return { catalog: null, built: false, ms: 0, error: "catalog build failed earlier this session" };
  }

  try {
    const { totalChunks } = await store.getStats();
    if (totalChunks === 0) return { catalog: null, built: false, ms: Date.now() - started };

    const cached = cache.get(vectorStoreDir);
    if (cached && !cached.isStaleFor(totalChunks)) {
      return { catalog: cached, built: false, ms: Date.now() - started };
    }

    const loaded = await ChunkCatalog.load(vectorStoreDir, options);
    if (loaded && !loaded.isStaleFor(totalChunks)) {
      cache.set(vectorStoreDir, loaded);
      return { catalog: loaded, built: false, ms: Date.now() - started };
    }

    const built = ChunkCatalog.build(await store.listChunks(), options);
    await built.save(vectorStoreDir);
    cache.set(vectorStoreDir, built);
    return { catalog: built, built: true, ms: Date.now() - started };
  } catch (error) {
    cache.markFailed(vectorStoreDir);
    return {
      catalog: null,
      built: false,
      ms: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
```

- [ ] **Step 4: Wire it into the preprocessor**

In `src/promptPreprocessor.ts`:

1. Add imports:

```ts
import { getCatalog, resetCatalogCache } from "./retrieval/catalogManager";
```

2. In `preprocess`, add `retrievalDepth` to the destructured settings, and after the index-format status block (before the retrieval status is set to "Searching…"), add:

```ts
    let catalog = null as Awaited<ReturnType<typeof getCatalog>>["catalog"];
    if (retrievalDepth === "medium") {
      const catalogStatus = ctl.createStatus({
        status: "loading",
        text: `Preparing search index… (${retrievalStats.totalChunks.toLocaleString()} chunks)`,
      });
      const outcome = await getCatalog(
        vectorStoreDir,
        store,
        {
          version: settings.catalogVersion,
          maxChunks: settings.catalogMaxChunks,
          k1: settings.bm25K1,
          b: settings.bm25B,
        },
      );
      catalog = outcome.catalog;
      if (outcome.error) {
        catalogStatus.setState({
          status: "error",
          text: `Search index unavailable: ${outcome.error}. Using meaning-based search for now.`,
        });
        console.warn("[BigRAG] Catalog unavailable:", outcome.error);
      } else if (outcome.built) {
        catalogStatus.setState({
          status: "done",
          text: `Search index ready (${catalog?.chunkCount.toLocaleString()} chunks, ${(outcome.ms / 1000).toFixed(1)}s)`,
        });
        console.info(
          `[BigRAG] Catalog built: chunks=${catalog?.chunkCount} terms=${catalog?.termCount} ms=${outcome.ms}`,
        );
      } else {
        catalogStatus.setState({ status: "done", text: "Search index ready" });
      }
      if (catalog && !catalog.hasWordTable) {
        ctl.createStatus({
          status: "done",
          text: `Keyword search off: index is larger than ${settings.catalogMaxChunks.toLocaleString()} chunks. Using meaning and dates.`,
        });
      }
    }
```

3. Change the searching status text:

```ts
    retrievalStatus.setState({
      status: "loading",
      text: retrievalDepth === "medium"
        ? "Searching by meaning, keywords and dates..."
        : "Searching for relevant content...",
    });
```

4. Pass the new options and deps to `retrieve()`:

```ts
    const { passages: results, timings, laneCounts, dayRanges } = await retrieve(
      userPrompt,
      {
        vectorStore,
        embedQuery: async (text) => (await embeddingModel.embed(text)).embedding,
        embedSentences: (sentences) => embeddingModel.embed(sentences),
        countTokens: (text) => embeddingModel.countTokens(text),
        catalog,
        fetchChunks: (keys) => store.getChunksByKeys(keys),
      },
      {
        retrievalLimit,
        retrievalThreshold,
        chunkSize,
        enableContextCompaction,
        depth: retrievalDepth,
        laneCandidates: settings.laneCandidates,
        rrfConstant: settings.rrfConstant,
        laneWeights: {
          vector: settings.laneWeightVector,
          keyword: settings.laneWeightKeyword,
          date: settings.laneWeightDate,
        },
        abortSignal: ctl.abortSignal,
      },
    );
```

5. Change the results status to report lanes and dates:

```ts
    const dateSuffix = dayRanges.length > 0
      ? `, dates: ${dayRanges.map((range) => (range.start === range.end ? String(range.start) : `${range.start}-${range.end}`)).join(", ")}`
      : "";
    retrievalStatus.setState({
      status: "done",
      text: retrievalDepth === "medium"
        ? `Retrieved ${results.length} relevant passages (meaning ${laneCounts.vector}, keywords ${laneCounts.keyword}, dates ${laneCounts.date}${dateSuffix})`
        : `Retrieved ${results.length} relevant passages`,
    });
```

6. After a reindex completes in `runRequestedReindex` (just before it returns), invalidate the catalog so the next query refreshes it:

```ts
    resetCatalogCache(settings.vectorStoreDirectory);
```

- [ ] **Step 5: Log the query's lanes, and give the eval runner the catalog**

In `src/promptPreprocessor.ts`, next to the existing retrieval timings log, add:

```ts
    console.info(
      `[BigRAG] Lanes: meaning=${laneCounts.vector} keywords=${laneCounts.keyword} dates=${laneCounts.date}` +
        (dayRanges.length > 0 ? ` ranges=${dayRanges.map((r) => `${r.start}-${r.end}`).join(",")}` : " ranges=none"),
    );
```

In `src/evalCli.ts` (the `run` path), build the catalog once before the question loop and pass it to every `retrieve()` call, so Medium is actually measured:

```ts
  const catalogOutcome = await getCatalog(vectorStoreDir, vectorStore, {
    version: FIXED_DEFAULTS.catalogVersion,
    maxChunks: FIXED_DEFAULTS.catalogMaxChunks,
    k1: FIXED_DEFAULTS.bm25K1,
    b: FIXED_DEFAULTS.bm25B,
  });
  if (settings.retrievalDepth === "medium" && !catalogOutcome.catalog) {
    console.warn(`[BigRAG Eval] No search index available: ${catalogOutcome.error ?? "store is empty"}`);
  }
```

Pass `catalog: catalogOutcome.catalog` in the retrieve deps that `runEval` uses (thread it through `runEval`'s parameters the same way the other deps are passed).

- [ ] **Step 6: Documentation**

In `README.md`, add after the Reindex bullet list in the "Chat Sidebar" section:

```markdown
- **Retrieval Depth** (default: *Medium*): *Medium* searches three ways at once — by meaning (embeddings), by keyword (exact terms, names, numbers), and by date when your question names one — then merges the results. *Low* searches by meaning only, as versions before 1.5 did. Medium makes no extra model calls; it adds a few milliseconds per question plus a one-off index build.
- The first Medium search builds a small search index next to your vector store (`.big-rag-catalog.json`) and reports progress. It is rebuilt automatically when the number of indexed chunks changes, and it is safe to delete. Above 50,000 chunks the keyword part is skipped to bound memory, and the plugin says so.
```

Add to the Maintainer Defaults table:

```markdown
| Candidates per lane | 30 | — |
| RRF constant | 60 | — |
| Lane weights (meaning / keyword / date) | 1 / 1 / 1 | — |
| Catalog chunk ceiling | 50,000 | — |
| BM25 k1 / b | 1.2 / 0.75 | — |
```

In the evaluation section, after the sentence about fixed defaults, add:

```markdown
Set `BIG_RAG_RETRIEVAL_DEPTH=low` or `medium` (default `medium`) to compare retrieval depths on the same question set; the depth used is recorded in each report.
```

- [ ] **Step 7: Run tests**

Run: `npx tsc --noEmit` then `npm test`
Expected: clean; PASS.

- [ ] **Step 8: Commit**

```bash
git add src/retrieval/catalogManager.ts src/tests/catalogManager.test.ts src/promptPreprocessor.ts src/evalCli.ts src/eval/runEval.ts README.md
git commit -m "Build and cache the chunk catalog with on-screen status

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 9: Live acceptance (user)**

1. The sidebar shows Retrieval Depth with Low and Medium; Medium is selected.
2. The first Medium query shows "Preparing search index…" then "Search index ready"; `.big-rag-catalog.json` appears in the vector store directory; a second session does not rebuild it.
3. Ask something using an exact term the vector search used to miss — it now comes back, and the status shows a keyword count above 0.
4. Ask "what happened on <a date in your documents>" — the status names the parsed date and the passages come from that date.
5. Switch to Low: the answer still works, with no catalog status and no lane counts.
6. Run `npm run eval:run` at both depths and compare with the `eval-baseline` report.
