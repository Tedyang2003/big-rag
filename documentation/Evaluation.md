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
$env:BIG_RAG_CATALOG_MAX_CHUNKS="250000"
npm run eval:run

```
`BIG_RAG_DOCS_DIR` must be exactly the folder the indexes were built from, otherwise no question can be matched to its source file and the run reports nothing scored.

Each run prints a summary table and saves a full report to `eval\reports\run-<timestamp>.json`, including the settings used. The first Structured + Hybrid run also builds its search index, so its first query is slower than the rest.

## How a Question Is Scored

A question counts as a **hit** when the whole answer snippet appears in the passages returned for it, ignoring case, punctuation and whitespace. Two rules make that fair:

- **Consecutive chunks are matched together.** Evidence often spans a chunk boundary. When both chunks are retrieved, the model received all of it, so scoring treats them as one passage.
- **Questions whose evidence is not in the index are unscorable, not misses.** Before a run, each file is rebuilt from its chunks as one continuous text and searched for the snippet. If it isn't there, no retrieval could ever find it, so the question is set aside and reported separately.

On FinanceBench, 62 of 150 questions are unscorable for that second reason. Their evidence comes from the dataset's own PDF extraction and starts with page furniture (`Table of Contents`, a page number) that the parser strips, or differs from our text in other small ways. **88 questions remain, and every run is scored over those same 88.**

Chunks of a split table repeat the table's header row. The evidence check reconstructs each file by joining its chunks, so those repeated words appear twice in the reconstruction, and evidence straddling a split-table boundary can read as unscorable. Treat a change in the unscorable count after a table-affecting change as a property of the measurement, not only of the index.

Rates are therefore over scorable questions only. Because 88 is a small number, one question is worth 1.1% — treat differences of one or two questions as noise.

## Results

FinanceBench, 368 files, 363 unique. Indexes rebuilt 21 September 2026 with the MuPDF-first parser: legacy 89,415 chunks, structured 116,741 (1.31x). Retrieval limit 5, threshold 0.5.

| Metric | Legacy Chunking | Structured | Structured + Hybrid |
|---|---|---|---|
| Questions scored | 88 | 88 | 88 |
| Unscorable (evidence not in the index) | 62 | 62 | 62 |
| Final hit rate | 8.0% (7) | 10.2% (9) | **10.2% (9)** |
| Pool hit rate (top 50) | 15.9% (14) | **30.7% (27)** | 28.4% (25) |
| Filter loss | 9.1% | 20.5% | 18.2% |
| Right file, wrong passage | 42.0% | 37.5% | 60.2% |
| Median answer rank in pool | 9 | 9 | **6** |
| Mean reciprocal rank | 0.046 | 0.099 | **0.122** |

Structured indexing roughly doubles what retrieval finds: the answer reaches the top 50 for 27 questions against legacy's 14, and mean reciprocal rank doubles. Final hits move less, from 7 to 9, because most of those newly found answers rank below the top 5 and never reach the model.

Hybrid retrieval matches vector search on hits and beats it on ranking: mean reciprocal rank rises 23%, the median rank of the answer halves from 9 to 6, and the right document is retrieved for 62 of 88 questions against 42. It reached that state only after three rounds of fixes — the first version was worse than vector search alone. See the run log.

The figures above are for the Structured + Hybrid configuration as it stands after those fixes.

### Latency

Median / 95th percentile per question, in milliseconds.

| Stage | Legacy Chunking | Structured | Structured + Hybrid |
|---|---|---|---|
| Query embedding | 29 / 40 | 30 / 41 | 26 / 36 |
| Vector search | 3,746 / 4,334 | 5,515 / 5,841 | 6,545 / 7,235 |
| Keyword lane | n/a | n/a | 56 / 100 |
| Date lane | n/a | n/a | 6 / 8 |
| Fusion | n/a | n/a | 0 / 0 |
| Overlap trimming | 0 / 0 | 0 / 0 | 0 / 0 |

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

### What the Questions Actually Ask

Not every FinanceBench question is a retrieval question. Classifying all 88 scorable ones by what answering them requires:

| Question type | Questions | Hits | Answer in top 50 |
|---|---|---|---|
| Direct lookup — the answer is written in a passage | 42 | 6 | 17 |
| **Derived metric** — the answer must be computed from figures | **24** | **1** | 2 |
| Judgement call — "is this healthy", "is this consistent" | 11 | 1 | 4 |
| Multi-year comparison — needs several passages at once | 11 | 1 | 2 |

Whether retrieval finds a question's evidence tracks almost exactly how many of the question's words appear in that evidence:

| Question words present in the evidence | Questions | Hits |
|---|---|---|
| Under 20% | 13 | 0 |
| 20–40% | 47 | 2 |
| 40–60% | 19 | 2 |
| Over 60% | 9 | 5 |

Hits average 58% overlap, misses 33%.

The derived-metric questions sit at the bottom of that range by construction:

```
"Does AMD have a reasonably healthy liquidity profile based on its quick ratio for FY22?"
   evidence: Consolidated Balance Sheets          overlap 0.07

"What is Kraft Heinz's FY2019 inventory turnover ratio?"
   evidence: Indefinite-Lived Intangible Assets   overlap 0.12
```

"Quick ratio" appears nowhere in a balance sheet. The answer is calculated from line items, so no amount of retrieval quality makes the question's words match its evidence. Bridging that gap needs the question rewritten or decomposed before search — see the open questions.

**So roughly 46 of 88 questions are financial reasoning rather than retrieval**, and the realistic target for this work is the 42 direct lookups, 31 of which have their answer inside a financial statement. Read every rate in this document against that: a hit rate of 20% on this dataset would be a strong result, not a poor one.

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

**22 September 2026 — re-runs under the new scoring.** Legacy and Structured as in the table above. Structured indexing roughly doubles what retrieval finds (27 answers in the top 50 against 14) and doubles mean reciprocal rank.

**22 September 2026 — hybrid retrieval is worse than vector search alone, at equal lane weights.** Final hits fell from 9 to 6 against Structured at Low depth. Four answers the vector lane had ranked near the top were demoted out of the returned five:

```
pool rank, vector-only → fused
   5 → 11
   5 →  9
   2 → 11
   1 →  7     ← was the single best match in the index
```

Fusion gained one question and lost four. The cause is visible in the two extra lanes: **they rank by document, while the vector lane ranks by passage.** Every chunk of a 3M filing contains "3M", and every chunk inherits its document's posted date, so a question naming a company and a year matches thousands of chunks equally. Each lane then contributes 30 near-interchangeable candidates from the right documents, and with equal weights those outvote the one lane that distinguishes passages.

The lanes are cheap — keyword 60ms, date 2ms, fusion under 1ms, against a 6.7 second vector search — so this is a question of signal quality, not cost.

One caveat on the pool figure. Each lane contributes 30 candidates, so a fused pool of 50 can only draw from the vector lane's top 30. Four answers at vector ranks 35, 35, 38 and 50 were structurally excluded, which accounts for most of the drop from 27 to 23. The final-hit drop is unaffected: all nine of Low's hits ranked within the top 5 and were available to fusion.

**22 September 2026 — attributing the damage.** Retrieving the four demoted questions again and printing which lane ranked each returned passage showed two things at once:

- **The date lane never fired.** Every question reported no date ranges. They ask about "FY2022", "as of 2022", "FY 2023", and the query parser ignored bare years and fiscal-year phrasing. The lane built to separate one year's filing from another sat out every question it was designed for.
- **The keyword lane promoted boilerplate.** For "Did Ulta Beauty's wages expense as a percent of net sales increase in FY2023?", four of the five returned passages were `About Ulta Beauty` and `Forward-Looking Statements` sections from three different quarters. They score well on the company name and "fiscal 2023" and contain nothing.

**22 September 2026 — three fixes, measured one round at a time.**

1. *Years are read from questions.* `FY2023`, `fiscal year 2021`, `as of 2022` and a plain `in 2019` each become that calendar year, with guards so `$2023`, `version 2019` and `2023 dollars` do not count.
2. *A lane may take at most three candidates from one document* (`laneCandidatesPerFile`), so one filing's boilerplate cannot fill a lane.
3. *Dates became a boost rather than a source of candidates.* A date says which documents are eligible, not which passage answers a question, so a chunk is never retrieved because of its date — it is only lifted once another lane has found it. The boost is worth what topping the date lane used to be worth.

| Configuration | Hits | Right doc, wrong passage | Wrong document | Wrong company | MRR | Median rank |
|---|---|---|---|---|---|---|
| Structured, Low | 9 | 33 | 37 | 9 | 0.099 | 9 |
| Hybrid, equal lanes | 6 | 35 | 36 | 11 | 0.088 | 9 |
| Hybrid + years + per-document cap | 8 | 41 | **18** | 21 | 0.091 | 14 |
| Hybrid + date boost | **9** | 53 | **16** | **10** | **0.122** | **6** |

Reading years halved the wrong-document failures (37 to 18) but doubled wrong-company ones (9 to 21), because "FY2023" matches every company's 2023 filing. Making dates a boost kept the first effect and removed the second. The lanes cost 56ms and 6ms against a 6.5 second vector search.

**22 September 2026 — why the right document still yields the wrong passage.** Reports now record each returned passage's section and chunk index, and where the evidence sits, so this was read from one run rather than re-retrieved.

Of the 53 questions that retrieve the right document and miss:

| Where the returned passages sat | Questions |
|---|---|
| Elsewhere in the document entirely | 45 |
| Within 2 chunks of the evidence | 6 |
| Same section, wrong piece of it | 2 |

Chunk boundaries are not the barrier: the evidence fits in a single chunk for 36 of the 53, and for 66 of all 88 scorable questions.

The sections tell the story. The evidence sits in financial statements — `Consolidated Statements of Operations`, `ITEM 8. FINANCIAL STATEMENTS AND SUPPLEMENTARY DATA`, `Consolidated Statements of Comprehensive Income`, `(Dollars in millions, except per share data)`. What comes back instead is narrative: `FINANCIAL CONDITION AND LIQUIDITY` (7 times), `About Ulta Beauty` (3), `Non-GAAP Measures`, `Digital Media > Strategy`, `Business Environment and Trends`.

A question written in English embeds close to prose discussing a topic and far from a grid of numbers, even when the grid holds the answer. Two things compound this:

1. **PDF tables reach the index with no structure at all.** No chunk in the structured index contains a `cell | cell` row, though the DOCX, HTML and PPTX parsers produce them. A statement arrives as `Net costs for significant litigation 1,414 — 2,291 2,291 476 1,815 3.20 Divestiture costs — — 60 60 13 47 0.08`: labels and numbers on one line, with no way to tell which number belongs to which column or year.
2. **The keyword lane should rescue these** — a row label such as "capital expenditures" appears verbatim — but it spends its candidates on boilerplate that matches the company name.

Also visible in the new fields: nearly every returned passage carries the date boost (97 of 265 as vector+date, 95 as keyword+date). Dates apply uniformly across a document, so they help choose documents and cannot discriminate within one, exactly as designed.

**Hybrid retrieval is worth keeping, on this evidence.** It picks the right document for 62 of 88 questions against 42 for vector search alone, ranks the answer higher, and costs nothing measurable. Final hits do not improve, because the remaining barrier is choosing the right passage *within* the right document — see the open question below.

### Open Questions

- **Can PDF tables be given structure?** See the 22 September finding below: the answer is usually in a financial statement, and statements reach the index as a run-on line of labels and numbers with no rows or columns. This is the largest remaining bucket.
- **Can table rows keep their column headers?** That would address the 38% that reach the right document and pick the wrong passage.
- **Are the embeddings calibrated for the threshold?** Two answers ranked first and were still cut by the 0.5 threshold. The plugin does not add Nomic's `search_query:` and `search_document:` prefixes, which flattens the score distribution. Testing this needs a reindex.
- **Would a second dataset help?** FinanceBench is table-heavy filings with near-duplicate documents — the hardest case for embeddings, unrepresentative of narrative documents, and half its questions are financial reasoning rather than lookups. A lookup-style question set over ordinary documents would measure the plugin as a general tool.
- **Should the question be rewritten before it is searched?** Two techniques would address the derived-metric and multi-year questions, both using the chat model already loaded in LM Studio: writing a hypothetical answer and embedding that instead of the question (so "quick ratio" reaches the balance sheet through the line items it implies), and decomposing a compound question into the sub-questions it needs. Neither is built; the tiers they would belong to are High and Extra High.
