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
| `BIG_RAG_CHUNK_SIZE` / `BIG_RAG_CHUNK_OVERLAP` | `512` / `100` | Chunk size and overlap in tokens. Overlap applies only to the older, unstructured format; structured chunks never overlap |
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
| Chunk size / overlap (`BIG_RAG_CHUNK_SIZE` / `BIG_RAG_CHUNK_OVERLAP`) | 512 / 100 tokens (overlap: older, unstructured format only) |
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
| Keyword index chunk ceiling (`BIG_RAG_CATALOG_MAX_CHUNKS`) | 250,000 |

The keyword index is skipped above that ceiling, to bound memory. The default is 50,000, and the structured FinanceBench index holds 116,741 chunks, so the ceiling must be raised for a hybrid run:

```
$env:BIG_RAG_CATALOG_MAX_CHUNKS="250000"
```

Without it the run prints `Keyword search is off: the index has 116741 chunks, above the 50000 chunk ceiling` and measures hybrid retrieval with its keyword lane missing. Check for that line before trusting a hybrid result.

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

## How a Question Is Scored

A question counts as a **hit** when the whole answer snippet appears in the passages returned for it, ignoring case, punctuation and whitespace. Two rules make that fair:

- **Consecutive chunks are matched together.** Evidence often spans a chunk boundary. When both chunks are retrieved, the model received all of it, so scoring treats them as one passage.
- **Questions whose evidence is not in the index are unscorable, not misses.** Before a run, each file is rebuilt from its chunks as one continuous text and searched for the snippet. If it isn't there, no retrieval could ever find it, so the question is set aside and reported separately.

On FinanceBench, 62 of 150 questions are unscorable for that second reason. Their evidence comes from the dataset's own PDF extraction and starts with page furniture (`Table of Contents`, a page number) that the parser strips, or differs from our text in other small ways. **88 questions remain, and every run is scored over those same 88.**

Rates are therefore over scorable questions only. Because 88 is a small number, one question is worth 1.1% — treat differences of one or two questions as noise.

## Results

FinanceBench, 368 files, 363 unique. Indexes rebuilt 21 September 2026 with the MuPDF-first parser: legacy 89,415 chunks, structured 116,741 (1.31x). Retrieval limit 5, threshold 0.5.

| Metric | Legacy Chunking | Structured | Structured + Hybrid |
|---|---|---|---|
| Questions scored | 88 | 88 | pending |
| Unscorable (evidence not in the index) | 62 | 62 | pending |
| Final hit rate | 8.0% (7) | **10.2% (9)** | pending |
| Pool hit rate (top 50) | 15.9% (14) | **30.7% (27)** | pending |
| Filter loss | 9.1% | 20.5% | pending |
| Right file, wrong passage | 42.0% | 37.5% | pending |
| Median answer rank in pool | 9 | 9 | pending |
| Mean reciprocal rank | 0.046 | **0.099** | pending |

Structured indexing roughly doubles what retrieval finds: the answer reaches the top 50 for 27 questions against legacy's 14, and mean reciprocal rank doubles. Final hits move less, from 7 to 9, because most of those newly found answers rank below the top 5 and never reach the model.

### Latency

Median / 95th percentile per question, in milliseconds.

| Stage | Legacy Chunking | Structured | Structured + Hybrid |
|---|---|---|---|
| Query embedding | 29 / 40 | 30 / 41 | pending |
| Vector search | 3,746 / 4,334 | 5,515 / 5,841 | pending |
| Overlap trimming | 0 / 0 | 0 / 0 | pending |

Search scans every chunk, so its cost grows with the index: about 5.5 seconds per question at 116,741 chunks. 150 questions take roughly 35 minutes per run.

### Where Retrieval Lands (Structured, Low Depth)

The figures in this section and the next describe **vector-only retrieval over the structured index**. Hybrid retrieval merges keyword and date signals on top and is expected to change the wrong-document share in particular; its own breakdown will be added once that run completes.

Every scored question, by how close the returned passages came:

| Outcome | Questions | Share |
|---|---|---|
| Hit: the right passage | 9 | 10% |
| Same company, **wrong document** (usually another year) | 37 | 42% |
| Right document, **wrong passage** | 33 | 38% |
| A different company entirely | 9 | 10% |

Nine times in ten the right company is retrieved. The failures then split almost evenly between two distinct problems:

**Wrong document.** FinanceBench holds around ten filings per company, and their boilerplate barely changes from year to year. Embeddings have no way to prefer the 2023 filing, and the scores are packed tightly together:

```
Q: "Does 3M maintain a stable trend of dividend distribution?"   (3M_2023Q2_10Q.pdf)
  #1  0.750  3M_2019_10K.pdf   "Distribution — 3M products are sold through…"
  #2  0.749  3M_2022_10K.pdf
  #3  0.748  3M_2017_10K.pdf
  →   0.730  3M_2023Q2_10Q.pdf   rank 20   ← holds the evidence
```

Twenty ranks span two hundredths of a similarity point. Keyword and date signals address this directly, which is what the hybrid run tests.

**Wrong passage.** The right filing is retrieved, but a narrative section outranks the statement holding the number. A table row loses its column headers when chunked, so it embeds poorly against a natural-language question. Hybrid retrieval will not fix this; carrying table headers into chunks would.

### Why Found Answers Do Not Reach the Model (Structured, Low Depth)

27 questions had the answer in the top 50 but only 9 reached the model. Where the other 18 sat:

| Cause | Questions |
|---|---|
| Ranked in the top 5, cut by the 0.5 similarity threshold | 2 |
| Ranked 6th to 50th, cut by the retrieval limit of 5 | 16 |

Raising the threshold or the limit would convert a few of these, but neither changes the order, which is where the problem is. The goal is to have the right chunk rank first.

## Run Log

**21 September 2026 — indexes rebuilt.** Both indexes were rebuilt after the parser chain changed to MuPDF first, since PDF text now differs in both modes. All 368 files indexed with no failures, including filings whose damaged fonts previously defeated every parser. Structured chunk count fell from 214,643 to 116,741 (2.4x legacy down to 1.31x) after heading detection and the no-overlap chunker landed. A file-by-file comparison confirmed no text was lost: structured holds 27.5M words to legacy's 34.0M, and the difference is exactly legacy's 20% chunk overlap duplication.

**21 September 2026 — first runs, scored over all 150 questions.** Legacy 4.0% final hit, Structured 6.0%, Structured + Hybrid 3.3%. These numbers are not comparable with anything below: they were produced by the earlier scoring rule, which required the whole snippet inside a single chunk and counted unfindable evidence as a miss.

**22 September 2026 — two scoring defects found and fixed.**

1. *The diagnostic pool ignored fusion.* At Medium depth the pool was always a plain vector search, so pool hit rate and mean reciprocal rank described the vector lane alone. Structured Low and Structured + Hybrid reported identical pool figures because they were measuring the same thing. The pool is now the fused ranking at Medium.
2. *Scoring was stricter than reality.* Requiring the whole snippet inside one chunk meant 56% of questions could not be scored by any system. Adjacent chunks are now matched together, and questions whose evidence is absent from the index are reported as unscorable.

**22 September 2026 — re-runs under the new scoring.** Legacy and Structured as in the table above. Structured + Hybrid pending.

### Open Questions

- **Does hybrid retrieval fix the wrong-document problem?** Keyword and date signals are aimed at exactly that failure, and the fused pool is now measured. This is the next run.
- **Can table rows keep their column headers?** That would address the 38% that reach the right document and pick the wrong passage.
- **Are the embeddings calibrated for the threshold?** Two answers ranked first and were still cut by the 0.5 threshold. The plugin does not add Nomic's `search_query:` and `search_document:` prefixes, which flattens the score distribution. Testing this needs a reindex.
- **Would a second dataset help?** FinanceBench is table-heavy filings with near-duplicate documents — the hardest case for embeddings and unrepresentative of narrative documents.
