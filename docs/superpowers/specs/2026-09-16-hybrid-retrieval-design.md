# Hybrid Retrieval (Low / Medium) — Design

Date: 2026-09-16
Status: Approved design, pending spec review

## Context

Retrieval today is a single vector search returning the top 5 chunks. Vector search is weak exactly where users are precise — names, identifiers, report numbers, rare terms, and dates — so a passage that literally contains the searched term can lose to a vaguely similar one. Structured indexing (v1.3.0) already records each chunk's posted date and section dates, but nothing at query time uses them.

This project adds keyword search and a date lane beside the vector search and merges the three with reciprocal rank fusion. It adds no model calls, so it can ship and be measured quickly against the `eval-baseline` tag.

Project order:

1. Settings cleanup (v1.4.0, shipped)
2. **Hybrid retrieval, Low and Medium** (this spec)
3. High depth: query rewriting and LLM reranking
4. Date/period summarization
5. Extra-high depth: subagents and document-level retrieval
6. Coverage evaluation

## Goals

- Find chunks that contain the user's exact terms, not only semantically similar ones.
- Use the dates already stored on chunks when a question names a date or period.
- Keep end-user choice to one setting with two plain options; maintainers tune in `src/settings/defaults.ts`.
- No model calls, no reindex, and no change to chunking, indexing, citations, or prompt rendering.
- Make every level measurable: per-lane timings and depth recorded in eval reports.

## Non-Goals

- Query rewriting, HyDE, and LLM reranking (project 3).
- Summarization of a date, period, or whole document (project 4).
- Subagent retrieval and document-level retrieval (project 5).
- An on-disk keyword index that does not load fully into memory (revisit if the ceiling is hit).
- Retrieval over anything other than the existing vectra store.

## Retrieval Depth

A second chat sidebar setting beside Reindex.

| Setting | Type | Values | Default |
|---|---|---|---|
| Retrieval Depth | select | `low` "Low", `medium` "Medium" | `medium` |

Description: "Medium searches by meaning, by keyword, and by date, then merges the results — better recall, no extra model calls. Low searches by meaning only, like earlier versions."

`resolveSettings` gains `retrievalDepth: RetrievalDepth` (`"low" | "medium"`), defaulting to `medium` when the stored value is anything else. `BIG_RAG_RETRIEVAL_DEPTH` (`low`/`medium`, default `medium`) applies to the eval harness only; the plugin reads no env vars.

**Low** is today's behaviour exactly: embed the query, vector search with the retrieval limit and affinity threshold, trim overlaps. No catalog is loaded or built.

**Medium** runs three lanes and fuses them (below).

## Chunk Catalog

A derived index of the store, saved as `.big-rag-catalog.json` in the Vector Store Directory. It never holds chunk text and is rebuildable at any time, so no reindex is required and indexes built by 1.3 or 1.4 work unchanged.

### Identity

Each chunk is keyed by `"<shardName>/<vectra item id>"` (item ids are `<fileHash>-<chunkIndex>`, assigned at indexing). Inside the file each chunk also gets a sequential number used by the other tables, so large tables store integers rather than repeated strings. `VectorStore.listChunks()` is extended to return the item `id` and `shardName` alongside the existing fields.

### Tables

1. **Chunks** — one row each: number, key, `filePath`, `chunkIndex`, word count, posted date, section dates. Dates are stored as numbers (`2026-09-08` → `20260908`).
2. **Words** — term → `{ df, postings: [[chunkNumber, termFrequency], …] }`.
3. **Days** — day number → chunk numbers (from posted date and section dates).

The file also records the format version, the store's chunk count at build time, and whether the word table was skipped (ceiling).

### Lifecycle

- Built on the first Medium query that needs it, then saved; a status line reports building and completion.
- Rebuilt when the file is missing, unreadable, malformed, its format version differs, or its chunk count differs from the store's.
- After an indexing run, rows for re-indexed files are replaced in place; a format change or count mismatch still forces a full rebuild.
- Above the chunk ceiling (default 50,000) the word table is skipped and the file records that; the days table is still built.

## Lanes and Fusion

Per Medium query, each lane returns at most `laneCandidates` (default 30) ranked chunk numbers.

- **Vector lane** — the existing `vectorStore.search` with the affinity threshold, asking for `laneCandidates`. The threshold applies to this lane only, as today.
- **Keyword lane** — the question is tokenized (lowercase, stop words removed, simple suffix trimming). Chunks containing those terms are scored with BM25 (`k1` 1.2, `b` 0.75) using the word table's `df`, postings and chunk word counts. Skipped when no terms survive tokenizing or the word table is absent.
- **Date lane** — `queryDates` reads a range from the question (see below). Chunks whose posted date or any section date falls inside the range are ranked by their BM25 score for the question, with more recent dates breaking ties, then catalog order. Skipped when the question names no date.

**Fusion** is weighted reciprocal rank fusion: a chunk's score is the sum of `weight(lane) / (rrfConstant + rank)` over the lanes it appears in, ranks being 1-based, with `rrfConstant` 60 and all three lane weights 1 (equal) by default. Chunks missing from a lane simply receive nothing from it — a date never excludes a chunk.

Weights scale a lane's whole curve, leaving the rank decay shape untouched; `rrfConstant` is the global flatness knob (smaller favours each lane's top hits, larger rewards appearing in several lanes). Both are maintainer values with no UI, shipped equal and neutral so any future weighting is chosen from eval evidence rather than intuition. `fuse.ts` therefore takes a weight per input list from the start, even though all three are 1 in this release. The fused top `retrievalLimit` (5) chunks are then read from the store by key to get their text and metadata, and overlap trimming runs as today.

### Reading dates from a question

`queryDates` reuses the part 1 extractor for written dates (`8 Sep 2026`, `September 2026`, `Q3 2026`, `15/04/2026`) and adds phrases resolved against the current date: today, yesterday, this week, last week, this month, last month, this quarter, last quarter, this year, last year, "past/last N days|weeks|months".

A year-less date (`8 Sep`) expands to every year present in the catalog's days table that has that month and day; when several match, all are included and recency breaks ties. A written year is always respected. When nothing is found, the lane is skipped.

## Maintainer Defaults

Added to `src/settings/defaults.ts`:

| Value | Default |
|---|---|
| `laneCandidates` | 30 |
| `rrfConstant` | 60 |
| `laneWeightVector` | 1 |
| `laneWeightKeyword` | 1 |
| `laneWeightDate` | 1 |
| `catalogMaxChunks` | 50000 |
| `bm25K1` | 1.2 |
| `bm25B` | 0.75 |
| `catalogVersion` | 1 |

## Components

| File | Responsibility |
|---|---|
| `src/retrieval/chunkCatalog.ts` | Build, save, load, update, staleness; `lookupWords`, `lookupDays` |
| `src/retrieval/bm25.ts` | Tokenizing and BM25 scoring (pure) |
| `src/retrieval/queryDates.ts` | Question → date range(s) |
| `src/retrieval/fuse.ts` | Reciprocal rank fusion over ranked lists (pure) |
| `src/retrieval/retrieve.ts` | Depth option; runs lanes, fuses, fetches winners |
| `src/vectorstore/vectorStore.ts` | `listChunks` returns `id` and `shardName`; fetch chunks by key |
| `src/settings/resolveSettings.ts`, `src/config.ts`, `src/settings/defaults.ts` | Setting and values |
| `src/promptPreprocessor.ts` | Statuses; passes depth through |
| `src/eval/*` | Depth from env, recorded in the report snapshot |

## Status and Logging

Chat statuses (one line each, never repeated every message):

| When | Status |
|---|---|
| Catalog building | *loading* "Preparing search index… (12,480 chunks)" → *done* "Search index ready (12,480 chunks, 2.1s)" |
| Searching, Medium | *loading* "Searching by meaning, keywords and dates…" |
| Searching, Low | *loading* "Searching for relevant content…" (unchanged) |
| Results, Medium | *done* "Retrieved 5 relevant passages (meaning 3, keywords 4, dates 2)", with ", dates: 2026-09-08" appended when a range was parsed |
| Results, Low | *done* "Retrieved 5 relevant passages" (unchanged) |
| Above ceiling | *done* "Keyword search off: index is larger than 50,000 chunks. Using meaning and dates." (once per session) |
| Catalog build failed | *error* "Search index unavailable: <reason>. Using meaning-based search for now." |

The lane counts are how many of the final five each lane contributed (a chunk can count for several lanes).

Console logs: catalog build/load with chunk count, term count, file size and duration, and the reason for a rebuild; per query the parsed date range, the surviving query terms, each lane's candidate count, the fused top five with their per-lane ranks, and stage timings. Fallbacks log once with their reason.

New stage timings join the existing ones: `catalog`, `keywordLane`, `dateLane`, `fuse`.

## Error Handling

| Situation | Behaviour |
|---|---|
| Catalog missing, stale, corrupt, or wrong version | Rebuilt on this message, with status |
| Catalog build fails | Logged, status shown, this message falls back to vector-only; not retried again this session |
| Store above the chunk ceiling | Word table skipped, keyword lane off, logged once |
| Question has no surviving terms | Keyword lane skipped |
| Question names no date | Date lane skipped |
| A lane throws | Logged; the remaining lanes are fused; a query never fails because of one lane |
| Depth Low | No catalog work at all |
| Request cancelled | Abort checked between lanes, as today |

## Testing

Unit tests, no LM Studio:

- **BM25:** rare terms outrank common ones; shorter chunks win at equal term frequency; exact scores on a hand-computed 3-chunk fixture; unknown terms contribute nothing.
- **Tokenizing:** lowercasing, stop-word removal, suffix trimming, punctuation and digits, empty output for an all-stop-word question.
- **queryDates:** written forms; each supported phrase against a fixed clock; year-less expansion over the years present; nothing found when no date.
- **Fusion:** a chunk present in three lanes beats a rank-1 chunk in one; exact scores on a fixed example; a missing lane costs only its vote; deterministic ties; a lane weight of 2 doubles that lane's contribution at every rank, and equal weights reproduce plain RRF.
- **Catalog:** tables built correctly from a fake store; save/load round trip; rebuild on count mismatch, bad version, corrupt file; ceiling skips the word table but keeps days; updating after re-indexing replaces that file's rows.
- **retrieve():** Low matches today's output exactly; Medium fuses three lanes; two lanes when no date; a timing per stage; abort between lanes; one lane throwing doesn't fail the query.

### Evaluation

Run `eval:run` at Low and Medium on the same index and question set and compare with the `eval-baseline` report. The depth is recorded in the report's settings snapshot, and per-stage timings show the added cost. Success: Medium's final hit rate is higher, with per-query latency up by milliseconds plus a one-off catalog build.

### Live Acceptance

1. The sidebar shows Retrieval Depth with Low and Medium; Medium is selected by default.
2. A first Medium query shows the catalog building, then "Search index ready"; the file appears in the vector store directory; a later session does not rebuild it.
3. A question with an exact term the vector search used to miss returns it at Medium.
4. A dated question ("what happened on <date>") returns passages from that date, and the status names the parsed date.
5. Low still answers as before, with no catalog status.

## Documentation and Release

- README: a Retrieval Depth section explaining both levels in plain terms, a note that `.big-rag-catalog.json` appears in the vector store directory and is rebuilt automatically, the new maintainer defaults, and comparing levels in the evaluation section.
- Minor release 1.5.0 once measured.
