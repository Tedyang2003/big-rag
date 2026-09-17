# Evaluation

## Context
In light of testing and running multiple variations of RAG Strategies, as well as implementing new functionalities in processing data, it is important that we are able to evaluate the results objectively


## Set up
### Dataset (Finance Bench)
The dataset comprises of questions about publicly traded companies, with corresponding answers and evidence strings. The questions in FinanceBench are ecologically valid and cover a diverse set of scenarios. They are intended to be clear-cut and straightforward to answer to serve as a minimum performance standard.



### Environment Variables
#### Required Environmntal Variables
Two main environment variables are required for this evaluation. 

```
$env:BIG_RAG_DOCS_DIR="C:\path\to\docs"
$env:BIG_RAG_DB_DIR="C:\path\to\db"; 
```

For the path to docs, direct it to the documents folder. 

For the path to db, it depends on what test you are running. It is required that a test that has changes to how data is processed, i.e. (chunking, formatting etc) has its own database folder. This is to ensure that the data reflects waht the pipeline does. 

Example
```
D:\Projects\SAIC\SNIP\plugin_dev\big-rag\eval\vdbs\legacy
D:\Projects\SAIC\SNIP\plugin_dev\big-rag\eval\vdbs\structured
```

#### Options

| Variable | Default | Purpose |
|---|---|---|
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

These parameter changes are crucial in adjusting what we are evaluating.

---

#### Current Tests

For this test, the configurations that have been tested are 

| Configuration | Index folder | `BIG_RAG_STRUCTURED_INDEXING` | `BIG_RAG_RETRIEVAL_DEPTH` | What it isolates |
|---|---|---|---|---|
| Legacy Chunking | `eval\vdbs\legacy` | `false` | `low` | Current parsers with the old fixed-size chunks and vector-only search |
| Structured | `eval\vdbs\structured` | `true` | `low` | Structured indexing: section-aware chunks with file, date and section headers |
| Structured + Hybrid | `eval\vdbs\structured` | `true` | `medium` | Hybrid retrieval: keyword and date search merged with vector search |

The following values were held constant across every configuration, so that each result differs from the one above it by a single change.

| Setting | Value |
|---|---|
| Embedding model (`BIG_RAG_EMBEDDING_MODEL`) | `nomic-ai/nomic-embed-text-v1.5-GGUF` |
| Chunk size / overlap (`BIG_RAG_CHUNK_SIZE` / `BIG_RAG_CHUNK_OVERLAP`) | 512 / 100 tokens |
| Retrieval limit (`BIG_RAG_RETRIEVAL_LIMIT`) | 5 passages |
| Affinity threshold (`BIG_RAG_RETRIEVAL_THRESHOLD`) | 0.5 |
| Context compaction (`BIG_RAG_ENABLE_COMPACTION`) | off |
| Question set (`BIG_RAG_EVAL_FILE`) | `eval\questions.json` |
| Diagnostic pool | top 50 passages, no threshold |

The Structured + Hybrid configuration additionally uses the following fusion values, which have no effect at `low` depth.

| Setting | Value |
|---|---|
| Candidates per search lane | 30 |
| Rank fusion constant | 60 |
| Lane weights (meaning / keyword / date) | 1 / 1 / 1 |
| BM25 k1 / b | 1.2 / 0.75 |
| Keyword index chunk ceiling | 50,000 |

---

### Files and Folder 
The questions needed for this evaluation have already been provided in the eval folder labeled as "questions.json". As for the documnents, you are requrired to download from [here](https://github.com/patronus-ai/financebench/tree/main/pdfs)

Preferably rename the folder as documents and place it into the eval folder.

You are also required to pre run the indexing either on the UI of LMStudio, or [through the commands](CLI.md#indexing). Before reindexing, you should preset all env variables.

---

## Running the Evaluation

Make sure LM Studio is open with the embedding model downloaded, and that the indexes for each configuration have already been built (see [Command-Line Tools](CLI.md#indexing)). The question set is already provided, so there is no need to generate one.

Each configuration is run in the same PowerShell window. Set every variable explicitly for each run, as values carry over from the previous one.

```
$env:BIG_RAG_DOCS_DIR="D:\Projects\SAIC\SNIP\plugin_dev\big-rag\eval\documents

"
# Legacy Chunking
$env:BIG_RAG_DB_DIR="D:\Projects\SAIC\SNIP\plugin_dev\big-rag\eval\vdbs\legacy"
$env:BIG_RAG_RETRIEVAL_DEPTH="low"
npm run eval:run

# Structured
$env:BIG_RAG_DB_DIR="D:\Projects\SAIC\SNIP\plugin_dev\big-rag\eval\vdbs\structured"
$env:BIG_RAG_RETRIEVAL_DEPTH="low"
npm run eval:run

# Structured + Hybrid
$env:BIG_RAG_DB_DIR="D:\Projects\SAIC\SNIP\plugin_dev\big-rag\eval\vdbs\structured"
$env:BIG_RAG_RETRIEVAL_DEPTH="medium"
npm run eval:run

```
`BIG_RAG_DOCS_DIR` must be exactly the folder the indexes were built from, otherwise no question can be matched to its source file and the run reports nothing scored.

Each run prints a summary table and saves a full report to `eval\reports\run-<timestamp>.json`, including the settings used. The first Structured + Hybrid run also builds its search index, so its first query is slower than the rest.

## Results

| Metric | Legacy Chunking | Structured | Structured + Hybrid |
|---|---|---|---|
| Questions scored | | | |
| Unscorable (file not indexed) | | | |
| Final hit rate | | | |
| Pool hit rate (top 50) | | | |
| Filter loss | | | |
| Right file, wrong passage | | | |
| Median answer rank in pool | | | |
| Mean reciprocal rank | | | |

### Latency

Median / 95th percentile per question, in milliseconds.

| Stage | Legacy Chunking | Structured | Structured + Hybrid |
|---|---|---|---|
| Query embedding | | | |
| Vector search | | | |
| Keyword lane | n/a | n/a | |
| Date lane | n/a | n/a | |
| Fusion | n/a | n/a | |
| Overlap trimming | | | |
