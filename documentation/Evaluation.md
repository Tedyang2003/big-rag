# Evaluation

How we measure retrieval objectively when the pipeline changes: same questions, same documents, one variable at a time.

## Dataset

[FinanceBench](https://github.com/patronus-ai/financebench/tree/main/pdfs): 368 PDFs of public company filings, 363 unique. Download the PDFs into `eval\documents\financebench`. The question set is already in `eval\questions.json` — 150 questions with the dataset's own evidence strings.

It is a hard and unrepresentative corpus: table-heavy filings, around ten near-identical documents per company, and half the questions need arithmetic rather than lookup. Read every number below with that in mind.

## Running It

Build the indexes first ([Command-Line Tools](CLI.md#indexing)), one folder per configuration, then run each configuration in the same PowerShell window. Variables persist, so set every one explicitly.

```powershell
$env:BIG_RAG_DOCS_DIR = "D:\...\eval\documents\financebench"

# Legacy chunking
$env:BIG_RAG_DB_DIR = "D:\...\eval\vdbs\legacy"
$env:BIG_RAG_RETRIEVAL_DEPTH = "low"
npm run eval:run

# Structured
$env:BIG_RAG_DB_DIR = "D:\...\eval\vdbs\structured"
npm run eval:run

# Structured + Hybrid
$env:BIG_RAG_RETRIEVAL_DEPTH = "medium"
$env:BIG_RAG_CATALOG_MAX_CHUNKS = "250000"
npm run eval:run
```

`BIG_RAG_DOCS_DIR` must be the exact folder the indexes were built from, or nothing can be matched to its source file.

**The keyword index ceiling matters.** It is skipped above 50,000 chunks to bound memory, and the structured index holds far more, so a hybrid run without `BIG_RAG_CATALOG_MAX_CHUNKS` prints `Keyword search is off…` and measures hybrid retrieval with its main lane missing. Check for that line.

Each run prints a summary and writes a full report to `eval\reports\run-<timestamp>.json`, including every setting, each returned passage's section, and where the evidence sits.

### Configurations

| Configuration | Index | `BIG_RAG_STRUCTURED_INDEXING` | Depth | What it isolates |
|---|---|---|---|---|
| Legacy Chunking | `eval\vdbs\legacy` | `false` | `low` | Fixed-size chunks, vector search only |
| Structured | `eval\vdbs\structured` | `true` | `low` | Section-aware chunks with file, date and section headers |
| Structured + Hybrid | `eval\vdbs\structured` | `true` | `medium` | Keyword and date signals merged with vector search |

Held constant: `nomic-embed-text-v1.5` embeddings, 512-token chunks (100 overlap, legacy only), 5 passages returned, 0.5 threshold, compaction off, a 50-passage diagnostic pool. Fusion uses 30 candidates per lane, at most 3 per document, RRF constant 60, equal lane weights, BM25 k1 1.2 / b 0.75. Full list in [CLI.md](CLI.md).

## How a Question Is Scored

A question is a **hit** when the evidence string appears in the passages returned for it, ignoring case, punctuation and whitespace. Two rules keep that fair:

- **Consecutive chunks count as one passage.** If evidence spans a boundary and both chunks are returned, the model received all of it.
- **Questions whose evidence is not in the index are unscorable, not misses.** Each file is rebuilt from its chunks and searched for the evidence. If it isn't there, no retrieval could find it.

**62 of 150 are unscorable**, leaving **88 scored in every run**. Their evidence comes from the dataset's own PDF extraction: 28 begin with page furniture (`Table of Contents`, a page number) that our parser strips, and the rest differ in spacing or table layout. The information is usually in the index; the verbatim string is not. The split is even across question types, so the 88 keep the same mix as the 150.

At 88 questions, one question is 1.1% — treat differences of one or two as noise.

Two measurement caveats: a split table repeats its header row in each piece, so those words appear twice when a file is reconstructed and evidence straddling that boundary can read as unscorable; and the diagnostic pool is the fused ranking at Medium depth, the vector ranking at Low.

## Results

Indexes rebuilt 24 September 2026 with PDF table rows and the Nomic prefixes: legacy 91,541 chunks, structured 119,403.

| Metric | Legacy | Structured | Structured + Hybrid |
|---|---|---|---|
| Questions scored | 88 | 88 | pending |
| Final hit rate | 9.1% (8) | **13.6% (12)** | pending |
| Pool hit rate (top 50) | 19.3% (17) | **29.5% (26)** | pending |
| Answers at rank 1 | 4 | **6** | pending |
| Median answer rank in pool | 6 | **5** | pending |
| Mean reciprocal rank | 0.048 | **0.107** | pending |
| Right file, wrong passage | 46.6% | 46.6% | pending |
| Vector search, median | 4.0s | 5.0s | pending |

**Structured indexing is ahead on every measure:** half again as many hits, half again as many answers surfaced, and more than double the mean reciprocal rank. A run takes roughly 35 minutes.

The previous build, before tables and prefixes, gave Legacy 7 hits and Structured 9, with median ranks of 9. **Tables and prefixes moved ordering rather than recall** — structured found the same 26-odd answers but ranked them higher, so three more crossed into the five returned. They shipped together and cannot be attributed separately.

## What the Numbers Say

**Where retrieval lands** (structured, vector-only):

| Outcome | Legacy | Structured |
|---|---|---|
| Hit | 8 | 12 |
| Same company, wrong document — usually another year | 32 | 29 |
| Right document, wrong passage | 41 | 41 |
| Different company | 7 | 6 |

Nine times in ten the right company is found. On the previous build, hybrid's date and keyword signals cut the wrong-document share from 37 to 16, converting most of it into right-document-wrong-passage; that has not yet been re-measured on this one.

**Statements remain the stubborn case.** Of the 31 questions whose evidence sits in a financial statement, 2 are hits — up from 1 before tables. The gains landed elsewhere: 7 of 39 for press releases and short sections, 2 of 2 for notes to the accounts, 1 of 16 for MD&A narrative. Recovering the grid was necessary but has not been sufficient; a statement chunk is still hundreds of words of figures in which one linearised row is easily diluted.

**Why found answers do not reach the model.** Structured surfaces 26 answers in the top 50 and returns 12. The other 14 sit at ranks 1, 4, 6, 8, 8, 12, 16, 17, 22, 23, 27, 28, 29 and 34 — two inside the top five, so cut by the 0.5 threshold, and twelve below the five-passage limit. Returning 10 passages instead of 5 would convert a few, but it treats the symptom: the goal is the answer at rank 1, not a longer list.

**What the questions actually ask.** Classifying all 88:

| Type | Questions | Hits |
|---|---|---|
| Direct lookup | 42 | 9 |
| Derived metric — must be computed | 24 | **0** |
| Judgement call | 11 | 2 |
| Multi-year comparison | 11 | 1 |

Retrieval success tracks how many of the question's words appear in the evidence chunk, measured against our own index text:

| Question words present in the evidence | Questions | In top 50 | Hits |
|---|---|---|---|
| Under 20% | 15 | 1 | 1 |
| 20–40% | 44 | 10 | 5 |
| 40–60% | 19 | 6 | 2 |
| Over 60% | 10 | **9** | **4** |

Hits average 45% overlap against 33% for misses, and the effect is starkest at the top: 9 of the 10 questions sharing more than 60% of their words with the evidence surface it in the top 50, against 1 of 15 at the bottom. Derived metrics sit at the bottom by construction — "quick ratio" appears nowhere in a balance sheet, because the answer is calculated from line items. **Roughly 46 of 88 questions are financial reasoning rather than retrieval**, so the realistic target is the 42 lookups, 31 of which have their answer in a financial statement. A hit rate of 20% here would be a strong result.

**Why the right document yields the wrong passage.** Of the 41 such misses, 36 returned passages from elsewhere in the document entirely — only 3 landed in the evidence's own section and 5 within two chunks of it. The evidence fits a single chunk in 21 of the 41, and in 56 of all 88, so chunk boundaries are not the barrier. What comes back instead is narrative: an English question embeds close to prose discussing a topic and far from a grid of figures, even after the grid has rows.

## Run Log

**21 Sep — indexes rebuilt** after the parser chain changed to MuPDF first. All 368 files indexed, no failures, including filings whose damaged fonts previously defeated every parser. Structured chunks fell from 214,643 to 116,741 (2.4x legacy to 1.31x) after heading detection and the no-overlap chunker. No text lost: the 27.5M vs 34.0M word gap is exactly legacy's overlap duplication.

**21 Sep — first runs.** Legacy 4.0%, Structured 6.0%, Hybrid 3.3%. **Not comparable with anything below** — produced by the older scoring rule, which required the whole snippet inside one chunk and counted unfindable evidence as a miss.

**22 Sep — two scoring defects fixed.** The diagnostic pool ignored fusion, so pool metrics at Medium described the vector lane alone. And scoring was stricter than reality, making 56% of questions unwinnable for any system. Adjacent chunks now count as one passage, and absent evidence is reported as unscorable.

**22 Sep — hybrid was worse than vector search alone at equal lane weights**, 6 hits against 9. Both extra lanes rank by *document* while the vector lane ranks by *passage*: every chunk of a filing contains the company name and shares its posted date, so each lane contributed 30 near-interchangeable candidates that outvoted the one lane distinguishing passages. Four answers the vector lane had at ranks 1, 2, 5 and 5 were pushed to 7, 9, 11 and 11.

**22 Sep — attributing it.** The date lane never fired at all: questions say "FY2022" and the parser ignored bare years. The keyword lane promoted boilerplate — `About Ulta Beauty`, `Forward-Looking Statements` — which matches the company name and contains nothing.

**22 Sep — three fixes, measured one at a time.**

| Configuration | Hits | Wrong document | Wrong company | MRR |
|---|---|---|---|---|
| Structured, Low | 9 | 37 | 9 | 0.099 |
| Hybrid, equal lanes | 6 | 36 | 11 | 0.088 |
| + years read from questions, 3 candidates per document | 8 | **18** | 21 | 0.091 |
| + dates as a boost rather than a source of candidates | **9** | **16** | **10** | **0.122** |

Reading years halved wrong-document failures but doubled wrong-company ones, because "FY2023" matches every company's 2023 filing. Making dates a boost — lifting passages the other lanes already found, never introducing one — kept the gain and removed the cost.

**24 Sep — PDF tables and embedding prefixes measured.** Both indexes were rebuilt (legacy 91,541 chunks, structured 119,403, each about 2.4% larger because a row's separators count as words). Structured went from 9 hits to 12 and its median rank from 9 to 5; legacy from 7 to 8. Statement-evidence hits moved from 1 of 31 to 2. The improvement is in ordering, not recall.

An evidence-check defect surfaced during the rebuild: overlapping legacy chunks were de-duplicated by counting normalised words, while the recorded offsets count raw words, so the reconstruction was corrupted and legacy reported 107 unscorable against structured's 62. Fixed; both now report the same 88.

**22–24 Sep — PDF tables and embedding prefixes shipped.** Tables are now recovered from MuPDF geometry as `cell | cell` rows, kept whole in a chunk where possible, split only between rows with the header repeated, and embedded as `Capital expenditures — 2018: 1,577` while citations still show the grid. Documents and queries now carry Nomic's `search_document:` / `search_query:` prefixes, recorded in the index manifest. Both force a reindex (`structured-v3`).

They shipped in one rebuild, so their effects cannot be attributed separately.

## Open Questions

- **Why are statements still missed?** Tables raised statement hits only from 1 of 31 to 2. Either the statement chunk is not retrieved at all, or it is retrieved and diluted — 240 words of figures around one relevant row. Scoring a chunk by its best sentence rather than its average, using the embedding model already loaded, would test the second.
- **Which hybrid lane is actually working?** Medium bundles BM25 candidates with the date boost and has never been isolated. Lane weights are not yet settable from the environment; adding that allows the vector-only, keyword-only and date-only runs that would attribute the gain.
- **Should BM25 rerank rather than nominate?** As a reranker over the top 50 it cannot flood the results with boilerplate, and it needs no posting lists — only a term-frequency table for IDF, which would remove the keyword index's memory cost and its 50,000-chunk ceiling. The cost is losing the rescue case, where keywords surface a chunk the vector search missed.
- **Is the 0.5 threshold still right?** The prefixes shift the score distribution, and the threshold was not re-tuned. If hits fall while pool hits rise, suspect this first.
- **Should the question be rewritten before searching?** Two untested techniques, both using the chat model LM Studio already has loaded: embedding a hypothetical answer instead of the question, so "quick ratio" reaches the balance sheet through the line items it implies; and decomposing a compound question into sub-questions. They would belong to a High and an Extra High depth.
- **Can retrieval cover several documents at once?** A cross-document comparison needs the best passage *per document*, not the five best overall, which fusion cannot currently express.
- **Would a second dataset help?** FinanceBench measures financial reasoning as much as retrieval. A lookup-style question set over ordinary documents — manuals, papers, reports — would measure the plugin as a general tool.
