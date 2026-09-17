# Command-Line Tools

Big RAG's indexing pipeline and its evaluation harness can both run from a terminal, without opening a chat or touching the plugin's settings. This is useful for indexing large collections ahead of time, scripting scheduled reindexes, and building separate indexes to compare.

LM Studio still has to be **running** in the background: the tools connect to it for embeddings and for its PDF parser. The embedding model must already be downloaded.

All commands run from the repository root. Examples use PowerShell; on macOS or Linux, write `VAR=value command` instead of `$env:VAR="value"`.

## Indexing

### Build First

The indexing script runs the compiled code and does not build it for you, so build after any code change:

```powershell
npm run build
```

### Index a Folder

```powershell
$env:BIG_RAG_DOCS_DIR="C:\path\to\documents"
$env:BIG_RAG_DB_DIR="C:\path\to\vector-store"
npm run index:cli
```

The folders can also be passed as arguments:

```powershell
node dist/cliIndex.js "C:\path\to\documents" "C:\path\to\vector-store"
```

Progress is printed per file, followed by a summary of processed, failed and skipped files. Running the same command again only indexes new or changed files.

Avoid indexing into the same folder the plugin is using while a chat is also indexing it.

### Options

| Variable | Default | Purpose |
|---|---|---|
| `BIG_RAG_DOCS_DIR` | none | Documents folder (or first argument) |
| `BIG_RAG_DB_DIR` | none | Vector store folder (or second argument) |
| `BIG_RAG_EMBEDDING_MODEL` | `nomic-ai/nomic-embed-text-v1.5-GGUF` | Must match the plugin's Embedding Model, or the plugin will refuse the index |
| `BIG_RAG_STRUCTURED_INDEXING` | `true` | `false` builds the older, unstructured format; changing it rebuilds every file |
| `BIG_RAG_FORCE_REINDEX` | `false` | `true` rebuilds every file instead of skipping unchanged ones |
| `BIG_RAG_EXCLUDE_PATTERNS` | none | Semicolon-separated globs, e.g. `*.png;archive/**` |
| `BIG_RAG_MAX_CONCURRENT` | `1` | Files processed at once; higher is faster but uses more memory |
| `BIG_RAG_CHUNK_SIZE` / `BIG_RAG_CHUNK_OVERLAP` | `512` / `100` | Chunk size and overlap in tokens |
| `BIG_RAG_ENABLE_OCR` | `true` | `false` skips images and the OCR fallback for scanned PDFs |
| `BIG_RAG_PARSE_DELAY_MS` | `500` | Pause before parsing each file, to avoid overloading LM Studio |
| `BIG_RAG_FAILURE_REPORT_PATH` | none | Absolute path for a JSON report of every failure and its reason |

Environment variables stay set for the rest of a PowerShell session, so set each one explicitly when switching between runs.

### Failure Reports

Set `BIG_RAG_FAILURE_REPORT_PATH` to an absolute path, for example `C:\temp\index-failures.json`, to get a JSON file listing every file that failed and why once indexing finishes. It is useful for tracking down stubborn PDFs such as blueprints or large scanned books.

### Building Indexes for Comparison

Changes to how documents are processed need their own index folder, so each run reflects its own pipeline. For example, a structured index and an older-format index of the same documents:

```powershell
npm run build
$env:BIG_RAG_DOCS_DIR="C:\path\to\documents"

$env:BIG_RAG_DB_DIR="C:\path\to\vdbs\legacy";     $env:BIG_RAG_STRUCTURED_INDEXING="false"; npm run index:cli
$env:BIG_RAG_DB_DIR="C:\path\to\vdbs\structured"; $env:BIG_RAG_STRUCTURED_INDEXING="true";  npm run index:cli
```

## Evaluation

The evaluation harness generates questions from your documents and measures whether retrieval finds their answers. The procedure, dataset and how to compare runs are described in [Evaluation](Evaluation.md). The commands are:

```powershell
npm run eval:generate
npm run eval:run
```

Both build the code first. Reports are written to `eval/reports/`; the `eval/` folder is ignored by git because it contains excerpts from your documents.

### Generating a Question Set

`eval:generate` builds a question set from chunks in an index you have already built. Besides the embedding model, it needs a chat model loaded in LM Studio, or one named with `BIG_RAG_EVAL_LLM`.

```powershell
$env:BIG_RAG_DOCS_DIR="D:\Projects\SAIC\SNIP\plugin_dev\big-rag\eval\documents"
$env:BIG_RAG_DB_DIR="D:\Projects\SAIC\SNIP\plugin_dev\big-rag\eval\vdbs\structured"
npm run eval:generate
```

It samples chunks evenly across your files, asks the model for a question and an exact answer snippet for each, and drops any candidate whose snippet isn't in the chunk or whose question copies too much of the chunk's wording. The survivors are written to `eval\candidates-<timestamp>.json`, and a summary shows how many were kept and why the rest were dropped. An existing file is never overwritten.

Open the candidates file, delete questions that are vague, wrong, or answerable without the documents, and save the rest as your question set.

Generate from the structured index. Questions are tied to the source file and the answer text rather than to chunk IDs, so the same set scores fairly against every index built from the same documents.

If most candidates are dropped, the loaded model is probably too small to follow the format. Setting `BIG_RAG_EVAL_LLM` to a larger model for this one step usually fixes it.

### Using a Different Question Set

`eval:run` reads `eval\questions.json` by default, which holds the FinanceBench questions. Save generated questions under another name and point runs at them, rather than overwriting that file:

```powershell
$env:BIG_RAG_EVAL_FILE="D:\Projects\SAIC\SNIP\plugin_dev\big-rag\eval\generated-questions.json"
npm run eval:run
```

Only compare runs that used the same question set, and for generated sets, the same leak limit. The limit is recorded as `generator.leakLimit` in the question file.

### Evaluation Options

| Variable | Default | Purpose |
|---|---|---|
| `BIG_RAG_DOCS_DIR` / `BIG_RAG_DB_DIR` | none | Must match the documents and index being evaluated |
| `BIG_RAG_RETRIEVAL_DEPTH` | `medium` | `low` or `medium`; recorded in each report |
| `BIG_RAG_EVAL_FILE` | `eval/questions.json` | Question set to run |
| `BIG_RAG_EVAL_COUNT` | `30` | Questions to generate |
| `BIG_RAG_EVAL_SEED` | `42` | Seed for choosing which chunks to generate questions from |
| `BIG_RAG_EVAL_LEAK_LIMIT` | `0.7` | Rejects a generated question when more than this share of its words are copied from the source; `1` disables the check |
| `BIG_RAG_EVAL_LLM` | model loaded in LM Studio | Model used to generate questions |
| `BIG_RAG_EMBEDDING_MODEL` | plugin default | Must match the index's embedding model |
| `BIG_RAG_RETRIEVAL_LIMIT`, `BIG_RAG_RETRIEVAL_THRESHOLD`, `BIG_RAG_CHUNK_SIZE`, `BIG_RAG_ENABLE_COMPACTION` | maintainer defaults | Evaluate values other than the plugin's fixed ones |

`BIG_RAG_DOCS_DIR` must match the Documents Directory the index was built from exactly; otherwise the source paths recorded for each question won't match the index and nothing can be scored.

## Maintainer Defaults

These values are fixed in the plugin (`src/settings/defaults.ts`) and have no setting in LM Studio. The command-line tools accept the listed variables to override them.

| Value | Default | Override |
|---|---|---|
| Retrieval limit | 5 | `BIG_RAG_RETRIEVAL_LIMIT` (evaluation) |
| Affinity threshold | 0.5 | `BIG_RAG_RETRIEVAL_THRESHOLD` (evaluation) |
| Chunk size (tokens) | 512 | `BIG_RAG_CHUNK_SIZE` |
| Chunk overlap (tokens) | 100 | `BIG_RAG_CHUNK_OVERLAP` |
| Max concurrent files | 1 | `BIG_RAG_MAX_CONCURRENT` |
| Parser delay (ms) | 500 | `BIG_RAG_PARSE_DELAY_MS` |
| OCR | on | `BIG_RAG_ENABLE_OCR` |
| Structured indexing | on | `BIG_RAG_STRUCTURED_INDEXING` |
| Context compaction | off | `BIG_RAG_ENABLE_COMPACTION` (evaluation) |
| Candidates per search lane | 30 | none |
| Rank fusion constant | 60 | none |
| Lane weights (meaning / keyword / date) | 1 / 1 / 1 | none |
| Keyword index chunk ceiling | 50,000 | none |
| BM25 k1 / b | 1.2 / 0.75 | none |
