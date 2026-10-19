# Architecture

A map of the code: what each file is for, and the order things happen in. 67 source files, about 9,200 lines, plus 50 test files.

The shape to hold in your head is **three entry points over two pipelines**. Everything indexes documents or answers a question; the third entry point measures how well the second one did.

---

## Entry Points

### The plugin — `.lmstudio/entry.ts` → `src/index.ts`

`.lmstudio/entry.ts` is LM Studio's own bootstrap, which builds an `LMStudioClient` from environment variables and calls `main`. It is bundled to `.lmstudio/dev.js` by `npm run bundle:dev`, and that bundle is what LM Studio loads.

`src/index.ts` is 20 lines and does three things: registers the global config schema, the per-chat config schema, and `preprocess` as the prompt preprocessor. That is the whole plugin surface — Big RAG has no tools, no generator and no prediction loop handler.

### Indexing without LM Studio — `src/cliIndex.ts`

`npm run index:cli -- <docs> <db>` indexes a folder from the command line, reading settings from the environment through `settings/cliSettings.ts`. It builds a `VectorStore` and an `IndexManager` and runs the same indexing path the plugin uses.

### The evaluation harness — `src/evalCli.ts`

`npm run eval:generate` writes a question set; `npm run eval:run` scores retrieval against one. This entry point calls `retrieve` directly and **never goes through `promptPreprocessor`**, which is why anything implemented there is invisible to the harness — the reason `passageRelevanceCut` is still unmeasured.

There is also `src/structureReport.ts` (`npm run structure:report`), a diagnostic that reports how a collection's heading structure was detected.

---

## Pipeline One: Indexing

A file on disk becomes rows in a vector store. The call order:

```
cliIndex.ts  or  promptPreprocessor.ts
        └── ingestion/runIndexing.ts      runIndexingJob()
              └── ingestion/indexManager.ts   IndexManager.index()
                    ├── ingestion/fileScanner.ts     scanDirectory()
                    └── per file: IndexManager.indexFile()
                          ├── parsers/documentParser.ts  parseDocument()
                          ├── chunking/  or  utils/textChunker.ts
                          ├── metadata/dates.ts          documentPostedDate()
                          ├── utils/embeddingPrefix.ts   documentText()
                          └── vectorstore/vectorStore.ts addChunks()
```

### Finding files — `ingestion/fileScanner.ts`

`scanDirectory` walks the documents directory and returns `ScannedFile[]`, filtering on `utils/supportedExtensions.ts` and the user's exclusion globs from `utils/fileExcludePatterns.ts`.

### Parsing — `parsers/`

`documentParser.ts` is the dispatcher: it looks at the extension and hands off to one of seven parsers, returning a `DocumentParseResult` that is either text or a typed failure reason.

`pdfParser.ts` is by far the largest at 529 lines, because PDFs are the hard case. It runs a chain of stages (`DEFAULT_PDF_STAGES`) and falls back to OCR when a PDF has no extractable text. The markdown conversion underneath it lives in `parsers/markdown/`: `pdfStyles.ts` reads MuPDF's per-line font styles to detect headings, `pdfTables.ts` recovers table rows from aligned text, `inferStructure.ts` is the fallback when no style information exists, and `ocrPages.ts` formats OCR output.

The others are small: `docxParser.ts`, `pptxParser.ts`, `epubParser.ts`, `htmlParser.ts`, `imageParser.ts`, `textParser.ts`. `embeddedImages.ts` pulls images out of Office zip containers.

### Chunking — `chunking/` and `utils/textChunker.ts`

Two strategies, chosen by the `structuredIndexing` setting and baked into the index.

**Structured** (`chunking/structuredChunker.ts`) splits on real document structure. `sections.ts` turns markdown into a `Section` tree, `linariseTables.ts` rewrites `cell | cell` rows into prose a sentence-embedder can handle, and `chunkStructured` emits chunks that do not overlap, each carrying a context header built by `buildContextHeader` — the file name, date and section path that show up as `sectionPath` in a search result.

**Legacy** (`utils/textChunker.ts`) is fixed-size with overlap, kept so old indexes still work and so the evaluation has a baseline.

### Dates — `metadata/dates.ts`

`documentPostedDate` finds the date a document was published, stored per chunk so the date lane can boost it later. `extractDates` and `detectDayMonthOrder` do the parsing, including guessing day-month order from the document's own usage.

### Storage — `vectorstore/vectorStore.ts`

One class wrapping vectra's `LocalIndex`, sharded across directories. The methods worth knowing: `addChunks`, `searchMany` (several query vectors in one pass over each shard), `deleteByFileHash`, `getFileHashInventory` for change detection, and `listChunks`. `chunkKey` builds the identity used everywhere downstream — a file path plus chunk index.

`searchMany` exists because a search is mostly the cost of *parsing* each shard's `index.json`, not scanning vectors. Searching two vectors separately would pay that twice, which is why High depth is barely slower than Medium.

### Bookkeeping

`utils/embeddingIndexManifest.ts` records which embedding model and chunking format built an index, and refuses to search an index built with another — the thing that prevents silently garbage results after a model change. `utils/failedFileRegistry.ts` remembers files that failed to parse so they are not retried forever. `utils/fileHash.ts` detects changes, `utils/indexingLock.ts` keeps two runs from overlapping, and `utils/sanityChecks.ts` validates directories and resources before any of it starts.

---

## Pipeline Two: Retrieval

A question becomes a prompt. This is the path every chat message takes.

```
promptPreprocessor.ts   preprocess()
  ├── settings/resolveSettings.ts    resolveSettings()
  ├── utils/sanityChecks.ts          performSanityChecks()       first use only
  ├── ingestion/runIndexing.ts       runIndexingJob()            if reindexing is on
  ├── retrieval/catalogManager.ts    getCatalog()                Medium and High
  ├── retrieval/hypothetical.ts      hypotheticalFor()           High only
  ├── retrieval/retrieve.ts          retrieve()                  ← the search
  ├── utils/relevanceCut.ts          dropWeakPassages()
  ├── utils/fitToContext.ts          fitToContext()
  ├── retrieval/renderPassage.ts     renderPassageForPrompt()
  └── ctl.addCitations()
```

### The preprocessor — `promptPreprocessor.ts`

870 lines, and the only file that knows about LM Studio's chat APIs. It owns one-time setup, status lines, the retrieval call, the decision about how many passages fit, the prompt text, and citations. It returns a **string**, which *replaces* the user's message — so everything it emits stays in the conversation for the rest of the chat.

Three helpers live here rather than in `utils/` because they are about this turn's prompt: `fitPassagesToContext` (how many passages fit a share of the window), `describeMatch` (the `match #1 via meaning, dates` label), and `buildPrompt`.

### The search — `retrieval/retrieve.ts`

397 lines, and the heart of the system. `retrieve` runs up to four lanes and fuses them:

```
                     ┌── vector    vectorStore.searchMany()        nominates
query ──embed──┐     ├── hyde      a second vector, High only      nominates
               ├─────┤── date      queryDates.ts + chunkCatalog    boost only
draft ──embed──┘     └── keyword   bm25.ts over the candidates     boost only
                              │
                     fuse.ts  fuseLanes()        weighted reciprocal rank
                              │
                     withNeighbours()            ± neighbourChunks, in document order
                              │
                     trimOverlappingChunks()
                              │
                     compactResultsToBudget()    only if compaction is on
```

The distinction that explains most of the evaluation results: **only `vector` and `hyde` can put a passage in the pool.** `date` and `keyword` reorder what those two found and can never add to it, which is why the pool figure is identical with keyword reranking on or off.

Supporting files: `bm25.ts` (`tokenize`, `rankTexts` — local idf, no length penalty), `fuse.ts` (`fuseLanes`), `queryDates.ts` (`queryDayRanges` reads dates out of the question), `chunkCatalog.ts` and `catalogManager.ts` (the `.big-rag-catalog.json` side index of which chunks carry which dates, cached across requests), and `hypothetical.ts` (the HyDE draft, which never throws so High degrades to Medium rather than failing).

### What reaches the model — `utils/`

`relevanceCut.ts` drops passages scoring below `passageRelevanceCut` of the best match, and reorders so the strongest sits nearest the question. `fitToContext.ts` finds the largest number of passages fitting a token budget. `trimOverlappingChunks.ts` removes duplicated text where chunks overlap. `renderPassage.ts` picks the grid form of a table for display over the linearised form used for embedding. `compactPassages.ts` shortens passages by dropping sentences far from the query — wired up, off by default, never measured.

---

## Pipeline Three: Evaluation

```
evalCli.ts
  ├── eval/settings.ts         readRetrievalSettings()   all BIG_RAG_* variables
  ├── eval/questionSet.ts      loadQuestionSet()
  ├── eval/hypotheticalCache.ts loadHypotheticals()      so runs are comparable
  └── eval/runEval.ts          runEval()
        ├── retrieval/retrieve.ts   retrieve()
        └── eval/metrics.ts         scoreQuestion() → aggregateMetrics()
              ├── eval/adjacentRuns.ts      joinAdjacentRuns()
              ├── eval/evidencePresence.ts  locateEvidence()
              └── eval/matchSnippet.ts      containsSnippet()
```

`metrics.ts` is where the scoring rules live. `joinAdjacentRuns` implements "consecutive chunks count as one passage", `locateEvidence` decides whether a question is unscorable because its evidence is not in the index at all, and `aggregateMetrics` produces the hit rate, pool rate, passage accuracy, filter loss, median rank and MRR that `Evaluation.md` reports.

`generateQuestions.ts` writes question sets with a model, guarded by `wordingLeak.ts` (a question that copies its evidence's wording is rejected) and `sampleChunks.ts` (spreading the sample across files). `settingsSnapshot.ts` records what a run actually applied rather than what was configured — added after a defect where those differed.

---

## Settings

Three readers, one source of truth.

`settings/defaults.ts` holds `FIXED_DEFAULTS`: everything not exposed in the UI, including the lane weights, `laneCandidates`, `rerankDepth`, `bm25K1`, `bm25B`, `ragContextShare` and `passageRelevanceCut`.

`settings/resolveSettings.ts` merges those with what the user set in LM Studio's panels, read through `config.ts`'s schematics. `settings/cliSettings.ts` and `eval/settings.ts` do the same job from environment variables for the two CLI entry points.

So a new tuning knob means: add it to `FIXED_DEFAULTS`, surface it in `eval/settings.ts` if it should be sweepable, and add it to `resolveSettings.ts`'s type.

---

## Where to Change What

| To change | Go to |
|---|---|
| How a question is searched | `retrieval/retrieve.ts` |
| A new ranking signal | a new lane in `retrieve.ts`, plus a weight in `defaults.ts` and `eval/settings.ts` |
| What the model is told | `promptPreprocessor.ts` (`buildPrompt`, the prefix) and `config.ts` (`DEFAULT_PROMPT_TEMPLATE`) |
| Which passages are sent | `utils/relevanceCut.ts`, `utils/fitToContext.ts` |
| How documents are split | `chunking/structuredChunker.ts`, `chunking/sections.ts` |
| A new file format | a parser in `parsers/`, registered in `documentParser.ts`, extension in `utils/supportedExtensions.ts` |
| PDF heading or table detection | `parsers/markdown/pdfStyles.ts`, `pdfTables.ts` |
| How results are scored | `eval/metrics.ts` |
| A new user-facing setting | `config.ts` schematics, then `settings/resolveSettings.ts` |
| A new maintainer-only default | `settings/defaults.ts`, then `eval/settings.ts` to sweep it |

---

## Two Things That Surprise People

**The preprocessor's return value replaces the user's message.** It is not an attachment. Every passage it emits becomes part of the conversation permanently, which is why each set has to name the question it belongs to, and why by the third turn the model may be looking at three sets of citations.

**The evaluation harness does not run the preprocessor.** It calls `retrieve` directly. So anything implemented in `promptPreprocessor.ts` — the relevance cut, the context budget, passage ordering, the prompt wording — is invisible to every number in `Evaluation.md`. That boundary is the single most important thing to remember when deciding whether a change is measurable.
