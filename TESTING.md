# Testing Guide

Three kinds of testing, in increasing cost: the automated suite, a manual pass
in LM Studio, and a measured evaluation run.

## Automated suite

```powershell
npm test
```

Builds, then runs every test in `dist/tests` with Node's built-in runner —
394 tests, no LM Studio required. Parsers run against the samples in
`test-fixtures/`; retrieval, indexing and evaluation run against fake
embedding models and stores.

Per-format parser tests are one file each: `htmlParser.test.ts`,
`textParser.test.ts`, `pdfParser.test.ts`, `docxParser.test.ts`,
`pptxParser.test.ts`, `epubParser.test.ts`, `imageParser.test.ts`, plus
`documentParser.test.ts` for format-agnostic dispatch.

```powershell
npx tsc --noEmit    # types only, no build
```

### What the suite does not cover

- The assembled retrieval pipeline. Units are tested; the composition is not.
- `cliIndex.ts`, which has no test at all.
- Anything in `promptPreprocessor.ts` that needs a real `ProcessingController` —
  status lines, citations, history.
- The installed plugin. Tests run against `src/`, never against the bundled
  `.lmstudio/production.js` that a user actually runs.

Those four gaps are why the manual pass below exists.

## Manual pass in LM Studio

### Mode matters

`npm run dev` runs from `src/` and logs to your terminal. `npm run install-plugin`
runs the bundled `production.js` from the installed folder. **Test both before
releasing.** The install path copies the project folder minus git-ignored
paths, so a runtime file that no module imports — the OCR language pack is the
one that exists today — can be missing from the install while dev mode works
perfectly.

### A test bed

Use a small, deliberately varied document set with a scratch vector store you
are willing to delete. Most interesting behaviour only happens against an empty
or stale index, so being able to clear it and start again is the single most
useful thing to have.

One is committed at [eval/user_testing/](eval/user_testing/):
`USER_TEST.md` holds eighteen steps in the order they have to run, with the
questions and their expected answers inline, beside the `document_folder/` they
query and a `to_be_added/` folder of contradicting documents for the
supersession step. Point the vector store at `eval/user_testing_vdbs`, which
`.gitignore` already excludes.

That set is built on a shape worth copying:

- five or six documents on **unrelated** subjects, so a question about one
  retrieves four obviously-wrong passages and distraction becomes visible
- one document long enough to split across chunks (roughly 900 words at the
  512-token default), with a fact and its explanation in different chunks
- rare tokens somewhere — part numbers, fault codes — for keyword reranking
- explicit dates, for the date signal
- a subfolder, and at least three file formats
- two documents held back that **contradict** the indexed ones, for testing
  what happens when a newer document supersedes an older one

### What to exercise

| Area | Do this | Look for |
|---|---|---|
| Not configured | Clear both directories, ask anything | `Big RAG is not in use: set ...`, no crash, model answers unaided |
| First run | Empty vector store, ask a question | Indexing runs before the answer; citations appear |
| Depths | Same question at Low, Medium, High | Status wording changes; High adds `likely wording` and a second model call |
| Date signal | Ask about a month or year in the corpus | Non-zero `dates` count and a range in the status |
| Keyword reranking | Ask using a rare token | `keywordRerank` non-zero in the timings line |
| Chunk boundaries | Ask something whose answer spans two chunks | Contiguous text, not a fragment |
| Nothing to find | Ask about something absent | `No relevant content found in indexed documents`, no invented citation |
| Follow-ups | Ask a question, then `why?` | Degrades gracefully. There is no query rewriting, so a follow-up carrying no searchable words retrieves poorly by design |
| Supersession | Add a document contradicting an indexed one, reindex with `Always index new & changed files` | The new document is found at all, and ideally both are returned — retrieval has no notion of which supersedes which |
| Embedding model change | Change the model, ask a question | Demands a reindex rather than searching silently |
| OCR | Index a scanned PDF | Text extracted, and no network stall on first use |
| Cancellation | Stop generation mid-answer | No stuck indexing lock; the next question still works |
| Long chat | Six or more turns | When passages start pushing earlier turns out of the context window |

### Reading the output

| Signal | Where |
|---|---|
| `[BigRAG] Retrieval timings: ...` | terminal (dev mode) |
| `[BigRAG] Lanes: meaning=... likely-wording=... dates=...` | terminal |
| `Retrieved N relevant passages (meaning X, dates Y)` | LM Studio status row |
| Citations | the chat response |

The timings line is the most informative single thing: it says which signals
ran, so it confirms or refutes what the depth setting claims to be doing.

## Measured evaluation

The only way to know retrieval has not regressed. See
[Evaluation](documentation/Evaluation.md) for recorded results and
[CLI](documentation/CLI.md) for every option.

```powershell
$env:BIG_RAG_DOCS_DIR="...\eval\documents\qasper"
$env:BIG_RAG_DB_DIR="...\eval\qasper_vdbs\structured"
$env:BIG_RAG_EVAL_FILE="...\eval\questions-qasper.json"
$env:BIG_RAG_RETRIEVAL_DEPTH="high"
npm run eval:run
```

Compare against the recorded columns in `documentation/Evaluation.md`. Only
compare runs that used the same question set.

Note what the harness **cannot** see: it calls `retrieve` directly and never
reaches `promptPreprocessor`, so anything implemented there — the relevance
cut, context fitting, citation rendering — is invisible to it. Those must be
checked by hand.

## Known limitations, so you do not report them as bugs

- **No query rewriting.** A follow-up like `why?` is searched literally.
- **`passageRelevanceCut` ships at `0`**, so results are padded to the quota
  rather than trimmed to what is comparably relevant.
- **No supersession logic.** A revised document does not displace the original.
- **The eval harness cannot measure the preprocessor**, as above.
