# PDF Table Structure and Nomic Embedding Prefixes

Date: 2026-09-22
Status: Approved design, not yet implemented

## Problem

PDF tables reach the index with no structure. MuPDF reports each piece of text with its position; the parser merges pieces that share a row into one line joined by spaces, and everything below sees a run-on line:

```
Net costs for significant litigation 1,414 — 2,291 2,291 476 1,815 3.20 Divestiture costs — — 60 60 13 47 0.08
```

There is no way to tell which number belongs to which column, which year, or even which row. No chunk in the structured FinanceBench index contains a `cell | cell` row, although the DOCX, HTML and PPTX parsers produce them and `parseBlocks` already understands them.

The evaluation shows what this costs. Of 88 scorable questions:

- **31 have their answer inside a financial statement, and 1 is a hit.** Only 4 of those 31 reach the top 50 of 116,741 chunks.
- **42 are direct lookups**, the group retrieval can realistically serve, and 31 of those sit in statements.
- Retrieval reaches the right document for 62 of 88 questions, then returns narrative sections — `FINANCIAL CONDITION AND LIQUIDITY`, `About Ulta Beauty` — instead of the statement holding the number.

A question written in English embeds close to prose about a topic and far from a grid of numbers. Recovering the grid is necessary but not sufficient: a row of figures embeds no better than a run-on line unless the row also carries the words that name its values.

Separately, the plugin embeds without Nomic's `search_query:` and `search_document:` prefixes, which that model family is trained to expect. This flattens similarity scores and changes ranking. Testing it requires re-embedding every chunk, and this work already forces that, so both ship together.

## Goals

- Recover rows and columns from PDF tables using only MuPDF's geometry.
- Make a table row retrievable by the words a question would use.
- Keep citations faithful to the document's own layout.
- Apply the embedding prefixes the configured model expects.
- Stay general-purpose: manuals, papers and reports, not only filings.

## Non-goals

- No new dependency, no network call, no vision model.
- No handling of merged cells, nested tables, or tables spanning pages. Each needs its own design; measurement decides whether they are worth one.
- No change to how legacy chunking splits text.
- No finance-specific vocabulary or rules.

## Section 1: Detecting Tables in `pdfStyles`

### Keep the cells

The same-row merge inside a MuPDF block currently joins a row's pieces with spaces and discards their positions. It will keep them as cells — text plus horizontal extent — while still exposing the joined text to every pass that does not care about cells.

### Find table runs, conservatively

Walking a block's kept lines in reading order:

- A line is **row-like** when it merged from two or more cells.
- A **table run** is two or more consecutive row-like lines whose cells align: the same number of cells, each starting within 3% of page width of the cell above it.
- A row with **fewer** cells joins a run when each of its cells aligns with one of the run's established columns. This covers the subtotal and total rows that financial statements are full of.
- Anything else ends the run. A single row-like line stays as it is today.

A run of two aligned lines that is not really a table — a two-column list, a form of label and value pairs — becomes a table. The words are unchanged, only their separator, so the cost is cosmetic.

### Pick the header

Within a run, the header is the first row where more than half the cells are non-numeric, provided some later row contains a numeric cell. Otherwise it is the run's first row. This chooses `Years ended December 31 | 2018 | 2017 | 2016` over a spanning title row such as `(Millions)`.

A cell counts as numeric when, after stripping `$ % ( ) , .` and a leading `-`, it is non-empty and all digits.

### Emit rows

A run is emitted header-first in the form the other parsers already use:

```
Years ended December 31 | 2018 | 2017 | 2016
Capital expenditures | 1,577 | 1,373 | 1,420
```

`parseBlocks` turns any line containing ` | ` into a `tableRow` block, so the grid needs no new syntax.

The linearised form belongs to chunking, not to this module, so that DOCX, HTML and PPTX tables gain it too.

## Section 2: Chunking Tables, and the Two Representations

### Marking the header

`parseBlocks` flags the first row of each consecutive run of table rows as that table's header. A non-table block between runs starts a new table.

### Keeping a table together

`chunkStructured` treats a run of consecutive table rows as one unit:

- A table that fits the remaining budget goes in whole.
- A table that does not fit splits **only between rows**, never mid-row, and each piece repeats the header row.
- A table larger than a whole chunk budget still splits by rows rather than exceeding the budget.

### Two representations

`StructuredChunk` gains `embedText` beside `text`:

- **`text`** is what the model and the citation see: the grid, with the header repeated on split pieces.
- **`embedText`** is what gets embedded. Non-table text is unchanged; each table row becomes a sentence carrying its headers.

```
text:       Years ended December 31 | 2018 | 2017 | 2016
            Capital expenditures | 1,577 | 1,373 | 1,420

embedText:  Capital expenditures — 2018: 1,577; 2017: 1,373; 2016: 1,420
```

The row's first cell leads, and each remaining value is named by the header cell above it. A row with no header, or with more cells than the header, falls back to listing its values in order.

`indexManager` embeds `contextHeader + text` today; it becomes `contextHeader + (embedText ?? text)`.

Consequences:

- The chunk budget is measured on `text`, so `embedText` may run about 1.5x longer. A 512-token chunk against Nomic's 2,048-token window leaves ample room.
- Word offsets stay on `text`, so overlap trimming and the evaluation's adjacency joining are unaffected.
- Search can match text the reader never sees. The User Guide should say so.

## Section 3: Embedding Prefixes and the Index Format

### Where the prefixes go

One small module owns the decision — `src/utils/embeddingPrefix.ts`, exporting `documentText(modelId, text)` and `queryText(modelId, text)` — so the two sides cannot drift apart:

- Indexing prefixes the embedded string with `search_document: `.
- Retrieval prefixes the query with `search_query: `.
- Context compaction compares a passage's sentences against the query embedding, so those sentences are document-side and take `search_document: `.

Every caller that embeds anything goes through that module: `indexManager`, `promptPreprocessor`, `evalCli` and `compactPassages`.

### Only when the model expects them

Prefixes are applied when the resolved embedding model id contains `nomic-embed`. Any other model embeds unprefixed, as today.

### The manifest records the decision

`.big-rag-embedding.json` gains `embeddingPrefixes: "nomic" | "none"`. Retrieval already refuses an index built with a different model or a different vector length; it will also refuse one built under a different prefix convention, naming the reindex needed. Without that check, changing models silently degrades search instead of failing.

### Index format

The structured format becomes `structured-v3`, since chunk text changes shape. A `structured-v2` index shows the reindex-required message.

Legacy chunk text also changes, because the parser changes, but the format string stays `legacy` and no one is prompted — as with the earlier MuPDF parser change. A legacy index therefore ends up mixing old and new text as files change. This is recorded in the User Guide rather than solved: legacy exists to be compared against, not maintained.

### Attribution

Tables and prefixes ship in one rebuild, so the next evaluation measures their combined effect. Which change produced which part of the movement will not be known. This was accepted deliberately to avoid a second multi-hour rebuild, and the Evaluation document records it.

## Section 4: Testing and Measurement

### Unit tests

**`pdfStyles`**, with hand-built page fixtures:
- two aligned rows become a table
- a single row-like line does not
- a row with fewer cells that align continues the run
- two rows whose cells do not align stay as prose
- a header row is chosen over a spanning title row
- an all-numeric first row falls back to "first row is the header"

**`sections`:**
- the first row of a consecutive run is flagged as the header
- a non-table block between runs starts a new table

**`chunkStructured`:**
- a table that fits stays whole
- a larger table splits only between rows
- every piece repeats the header
- `embedText` linearises rows and leaves prose untouched
- the existing word-preservation check still passes on `text`

**Prefixes:**
- applied for a Nomic model id, not for another
- the document and query sides agree
- a manifest written under a different convention is refused

### Measurement

The structure report gains a table column — tables detected and rows per table — so detection can be checked on any folder without an evaluation run.

| Check | Target |
|---|---|
| Statements appear as rows | tables detected in at least 80% of the 31 statement-evidence files |
| Structured chunk count | no more than 10% above today's 116,741 |
| Non-finance PDFs (two papers, the WHO guideline, the requests manual) | chunk counts within 10% of today's, and no prose turned into rows |
| Text preservation | the joined chunk `text` contains every word of the document, once |
| Evaluation, Structured Low and Medium | final hits above today's 9 of 88, and statement-evidence hits above 1 of 31 |

### What to expect

Of the 88 scorable questions, 31 have their answer in a statement and 24 more require arithmetic that no retrieval can perform. Converting half the statement lookups would take hits from 9 to around 20. The larger effect is likely on ordinary documents, where a table is usually looked up rather than computed from — and there is no question set for those yet.

## Files Touched

- `src/parsers/markdown/pdfStyles.ts`: keep cells through the merge, detect table runs, choose headers, emit rows
- `src/chunking/sections.ts`: flag the header row of each table run
- `src/chunking/structuredChunker.ts`: keep tables whole where possible, split at rows, repeat headers, build `embedText`
- `src/ingestion/indexManager.ts`: embed `embedText`, write `structured-v3` and the prefix convention
- `src/utils/embeddingIndexManifest.ts`: `structured-v3`, `embeddingPrefixes`, the mismatch message
- `src/utils/embeddingPrefix.ts`: new, owns both prefixes and the model check
- `src/promptPreprocessor.ts`, `src/evalCli.ts`, `src/utils/compactPassages.ts`: embed through it
- `src/structureReport.ts`: table counts
- `documentation/UserGuide.md`: tables in citations, what search matches, the legacy note
- Tests under `src/tests/`
