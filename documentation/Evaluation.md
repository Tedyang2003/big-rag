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
npm run eval:run
```

`BIG_RAG_DOCS_DIR` must be the exact folder the indexes were built from, or nothing can be matched to its source file.

Each run prints a summary and writes a full report to `eval\reports\run-<timestamp>.json`, including every setting, each returned passage's section, and where the evidence sits.

### Configurations

| Configuration | Index | `BIG_RAG_STRUCTURED_INDEXING` | Depth | What it isolates |
|---|---|---|---|---|
| Legacy Chunking | `eval\vdbs\legacy` | `false` | `low` | Fixed-size chunks, vector search only |
| Structured | `eval\vdbs\structured` | `true` | `low` | Section-aware chunks with file, date and section headers |
| Structured + Hybrid | `eval\vdbs\structured` | `true` | `medium` | Keyword and date signals reordering the vector search's passages |
| Structured + HyDE | `eval\vdbs\structured` | `true` | `high` | A drafted answer searched alongside the question |

### Tuning a Run

Any of these can be set per run, so a configuration differs from its neighbour by one variable:

| Variable | Default | Purpose |
|---|---|---|
| `BIG_RAG_RETRIEVAL_LIMIT` | 5 | Passages returned to the model |
| `BIG_RAG_RETRIEVAL_THRESHOLD` | 0.5 | Minimum similarity for a passage to be returned |
| `BIG_RAG_LANE_WEIGHT_VECTOR` / `_HYDE` / `_DATE` | 1 / 1 / 1 | **Set a signal to 0 to run without it**, which is how its contribution is attributed |
| `BIG_RAG_REGENERATE_HYPOTHETICALS` | `false` | Redraft rather than reuse `eval/hypotheticals.json` |
| `BIG_RAG_LANE_CANDIDATES` | 50 | Passages the vector lane puts up, and so the pool the others reorder |

Attributing hybrid retrieval takes two runs against the same index: weight `1/0` should reproduce Low exactly and proves the harness, `1/1` is today's Medium. At High, `_HYDE=0` must reproduce Medium exactly, which is the same harness check one level up.

**High runs reuse their drafts.** The first writes `eval/hypotheticals.json`, one passage per question id, tagged with the model that wrote it; later runs with that model reuse it. Drafting is not deterministic, so without this two runs of one configuration differ by the generator's variance rather than by the change being measured.

Held constant: `nomic-embed-text-v1.5` embeddings, 512-token chunks (100 overlap, legacy only), 5 passages returned, 0.5 threshold, compaction off, a 50-passage diagnostic pool. The vector lane puts up 50 candidates, RRF constant 60. Full list in [CLI.md](CLI.md).

**Where document frequency is counted.** Over the 50 candidates, not the corpus. Corpus-wide, a company name is rare and scores high, yet it sits on every page of the filing the shortlist came from and separates nothing — which is how boilerplate came to outrank statements. Counted over the shortlist it collapses to near zero, and the terms that distinguish one candidate from another take the weight.

**Why the rerank has a depth.** Fusion is flat: the whole spread from rank 1 to rank 50 is worth less than the difference between receiving a boost and receiving none. Nearly every candidate contains some query term — a filing's every page says `fiscal` and its year — so boosting all of them adds roughly the same number to every row and reorders nothing. The boost draws its power from the candidates that do *not* get it, and `BIG_RAG_RERANK_DEPTH` is how much of BM25's opinion is allowed to count: small values trust it over the vector lane, large values dissolve it. There is no principled value, so it is swept.

## How a Question Is Scored

A question is a **hit** when the evidence string appears in the passages returned for it, ignoring case, punctuation and whitespace. Two rules keep that fair:

- **Consecutive chunks count as one passage.** If evidence spans a boundary and both chunks are returned, the model received all of it.
- **Questions whose evidence is not in the index are unscorable, not misses.** Each file is rebuilt from its chunks and searched for the evidence. If it isn't there, no retrieval could find it.

**62 of 150 are unscorable**, leaving **88 scored in every run**. Their evidence comes from the dataset's own PDF extraction: 28 begin with page furniture (`Table of Contents`, a page number) that our parser strips, and the rest differ in spacing or table layout. The information is usually in the index; the verbatim string is not. The split is even across question types, so the 88 keep the same mix as the 150.

At 88 questions, one question is 1.1% — treat differences of one or two as noise.

Two measurement caveats: a split table repeats its header row in each piece, so those words appear twice when a file is reconstructed and evidence straddling that boundary can read as unscorable; and the diagnostic pool is the fused ranking at Medium depth, the vector ranking at Low — the same 50 chunks either way, since nothing but the vector lane nominates.

## Results

Indexes rebuilt 24 September 2026 with PDF table rows and the Nomic prefixes: legacy 91,541 chunks, structured 119,403.

| Metric | Legacy | Structured | Structured + Hybrid |
|---|---|---|---|
| Questions scored | 88 | 88 | 88 |
| Final hit rate | 9.1% (8) | 13.6% (12) | **15.9% (14)** |
| Pool hit rate (top 50) | 19.3% (17) | **29.5% (26)** | **29.5% (26)** |
| Answers at rank 1 | 4 | 6 | **9** |
| Median answer rank in pool | 6 | 5 | **3** |
| Mean reciprocal rank | 0.048 | 0.107 | **0.140** |
| Right file, wrong passage | 46.6% | 46.6% | 64.8% |
| Vector search, median | 4.0s | 5.0s | 5.0s |

All three columns now draw their pool from the same place — an unthresholded top-50 vector search — so the pool row is comparable across them. Medium reorders those 50; it cannot add to them, which is why its pool figure is identical to Structured's.

### Which Signal Does the Work

Isolated with the weights, all against the same structured index and the same 50 vector candidates:

| Configuration | Hits | Wrong document | Wrong company | Pool | Median rank | MRR | Answers at rank 1 |
|---|---|---|---|---|---|---|---|
| Vector only | 12 | 31 | 4 | 26 | 5 | 0.107 | 6 |
| Vector + date* | **14** | **14** | **2** | 28 | 4 | **0.141** | **9** |
| Vector + keyword lane + date* | 11 | 12 | 4 | 27 | 5 | 0.108 | 5 |
| Vector + keyword lane* | 9 | 34 | 7 | 22 | 5.5 | 0.080 | 3 |
| Keyword rerank, corpus idf, + date | 11 | 13 | 7 | 26 | 5 | 0.106 | 5 |
| Keyword rerank, local idf, + date | **14** | 17 | 6 | 26 | 4 | 0.117 | 6 |
| Keyword rerank, local idf, no length penalty, + date | **14** | 17 | 6 | 26 | **3** | 0.134 | 8 |
| **Vector + date, current architecture** | **14** | **14** | **3** | 26 | **3** | **0.140** | **9** |

Every row is recomputed from its report with one definition, so the columns agree with each other
rather than with earlier versions of this document.

\* Measured under the old lane architecture, where setting a weight to 0 zeroed a lane's fusion
contribution but not its nominations: those candidates still entered the pool and could still
collect the date boost. That is where vector + date's pool of 28 comes from against every other
row's 26. It contributed no hits, so the 14 stands, but the row is not strictly the configuration
its name describes.

**Dates do the work; keywords do not.** The date boost took hits from 12 to 14 and more than halved
wrong-document failures, 31 to 14, because a year says which of a company's ten near-identical
filings is wanted. It can only lift a passage another signal already found, so it costs nothing.

**BM25 was tried three ways and beat none of them.** As a lane nominating its own candidates it cost
three hits, filling the shortlist with the boilerplate that carries a company's name. Reranking the
vector lane's candidates with corpus-wide idf reproduced that failure exactly — 11 hits again,
gaining 3 questions and losing 6, three of them answers the vector lane had at rank 1 — because a
company name is rare across 119,403 chunks and therefore heavily weighted, while sitting on every
page of the document the shortlist came from.

Counting document frequency over the 50 candidates instead fixed the regression, 11 back to 14: a
term every candidate shares now collapses to nothing and the terms that separate them take the
weight. But it only ties the date boost rather than beating it, and it ties by exchange — four
questions gained, four lost, only ten of the fourteen shared — while carrying three fewer answers
at rank 1 and a lower MRR, 0.117 against 0.141.

The reason it can still displace a good answer is fusion's flatness. A boost is worth up to
`1/61`, while the entire spread from vector rank 1 to rank 50 is `1/61` to `1/110`. Any boost large
enough to rescue a passage from rank 28 is large enough to push one off rank 1, whichever ranking
produced it.

**The deciding run settles it: `laneWeightKeyword` is 0.** Measured under the current architecture,
where nothing but the vector lane nominates, vector + date gives the same 14 hits with 9 answers at
rank 1 against the reranker's 6, a median rank of 3 against 4, and MRR 0.140 against 0.117. The
reranker loses on every column except the one it ties, and it ties by exchanging four questions for
four others. It also confirms the old measurement was sound: the contaminated row gave 0.141 where
the clean one gives 0.140.

Removing the length penalty (`b = 0`) recovers most of what local idf left on the table — MRR 0.117 to 0.134, rank-1 answers 6 to 8 — and is now the default, since these are chunks the chunker already caps rather than documents of wildly differing length. It does not change the outcome: the same four questions are gained and the same four lost. **Across corpus idf, local idf and both length settings, BM25 reranking is a fixed four-for-four exchange.** Tuning moves ranks; it does not move which answers cross into the five returned.

Four forms of BM25 have now been measured and none has beaten the date boost. The pattern holds
across all three: on this corpus the words a question shares with a document identify *which
filing*, not *which page*, and the date boost settles that question better and for free, because it
can only lift a passage another signal already found. The reranker costs 1ms and stays in the code
at weight 0 — FinanceBench is a poor witness for collections where a rare word really does name a
passage, and one environment variable turns it back on.

**Structured indexing is ahead on every measure:** half again as many hits, half again as many answers surfaced, and more than double the mean reciprocal rank. A run takes roughly 35 minutes.

**Hybrid is now ahead of vector search on hits as well as ordering**, 14 against 12, with wrong-document failures down from 31 to 14 and the best median rank recorded, 3. All of that is the date boost; see the table above.

The previous build, before tables and prefixes, gave Legacy 7 hits and Structured 9, with median ranks of 9. **Tables and prefixes moved ordering rather than recall** — structured found the same 26-odd answers but ranked them higher, so three more crossed into the five returned. They shipped together and cannot be attributed separately.

## What the Numbers Say

**Where retrieval lands:**

| Outcome | Legacy | Structured | + Hybrid |
|---|---|---|---|
| Hit | 8 | 12 | **14** |
| Same company, wrong document — usually another year | 32 | 31 | **14** |
| Right document, wrong passage | 41 | 41 | 57 |
| Different company | 7 | 4 | **3** |

Nine times in ten the right company is found. The date boost is what converts wrong-document failures into right-document ones, 31 down to 14 — isolated in the table above, where it accounts for all of Hybrid's gain.

**Statements remain the stubborn case.** Of the 31 questions whose evidence sits in a financial statement, 2 are hits — up from 1 before tables. The gains landed elsewhere: 7 of 39 for press releases and short sections, 2 of 2 for notes to the accounts, 1 of 16 for MD&A narrative.

**It is a recall problem, not a dilution one.** The explanation assumed until now — a relevant row averaged away among hundreds of words of figures — has been measured and is wrong. Scoring each candidate by its best sentence or table row instead of its whole-chunk embedding makes statements *worse*, taking them from 3 of 41 in the top five to 0 and MRR from 0.050 to 0.015. The unit is too small, not too large: `Capital expenditures — 2018: 1,577` is short and mostly numeric, and embeds badly against a sentence of English, while the whole chunk at least carries its context header and its collective subject.

The real barrier is upstream of ranking. Only 9 of those 41 questions have their evidence anywhere in the top 50, so for 32 of them no re-scoring of candidates can help — the answer is never a candidate. What moves them is changing the *question* rather than examining the passage: see the HyDE spike below.

**Why found answers do not reach the model.** Both Structured and Hybrid surface the same 26 answers in the top 50; Structured returns 12 and Hybrid 14. Hybrid's remaining 12 sit at ranks 1, 4, 7, 8, 9, 11, 15, 17, 21, 22, 24 and 32 — one inside the top five, so cut by the 0.5 threshold, and eleven below the five-passage limit. Returning 10 passages instead of 5 would convert a few, but it treats the symptom: the goal is the answer at rank 1, not a longer list.

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

### Rewriting the Question: the HyDE Spike

Measured without touching the retrieval path: for each of the 88 questions, generate one
hypothetical answer with the chat model, embed it, and see where the known evidence chunk
lands. Generation is `gemma-4-e2b-it` at a median 542ms; retrieval is vector-only over the
50-candidate pool, so these numbers are not comparable with the Medium runs above.

| Configuration | In pool | Top 5 | Median | MRR | Better / worse |
|---|---|---|---|---|---|
| Question alone | 31 | **15** | 7 | 0.119 | — |
| Hypothetical, `search_query:` | 31 | 13 | 8 | 0.123 | 17 / 13 |
| Hypothetical, `search_document:` | 26 | 11 | 9 | 0.088 | 14 / 22 |
| **Question + hypothetical, fused** | **34** | **16** | 8 | **0.129** | **20 / 9** |

**Fusing works; replacing does not.** Searching on the hypothetical instead of the question
loses ground. Adding its results to the question's gains three questions of pool coverage and
one of the top five, at a ratio of 20 improved to 9 worsened — the first signal measured here
that adds rather than trades.

**The gain is almost all on statements**, which the aggregate hides:

| | Statements (41) | | Other sections (47) | |
|---|---|---|---|---|
| | Question | + HyDE | Question | + HyDE |
| In pool | 9 | **11** | 22 | 23 |
| Top 5 | 3 | **5** | **12** | 11 |
| Median rank | 24 | **8** | **5** | 8 |
| MRR | 0.050 | **0.078** | **0.180** | 0.174 |

A question written in English is far from a grid of numbers, and the way to close that is to
make the question look like the document rather than to inspect the document more closely.
Asked for "a passage as the document would write it", a 2B model answers in markdown tables —
which is what our chunks now contain, so some of this gain was bought by the table work rather
than by HyDE itself, and may not transfer to a corpus without tables.

Two cautions. The generated specifics are entirely invented, so the text may only ever be
embedded and discarded, never shown or cited. And similarity proved a poor guide to ranking
twice over: the `search_document:` variant won on cosine against the evidence, 73 of 88, and
came last on rank.

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

**24 Sep — the length penalty was costing rank, not hits.** With `b = 0` the reranker's MRR goes 0.117 to 0.134 and its rank-1 answers 6 to 8, so `bm25B` now defaults to 0: the classic 0.75 assumes documents of wildly differing length, while these are chunks the chunker already caps. The outcome is unchanged — the same four questions gained, the same four lost. Across corpus idf, local idf and both length settings, BM25 reranking is a fixed four-for-four exchange, still behind vector + date's 14 hits at MRR 0.140 with 9 at rank 1. `k1` and `b` are now settable per run.

**24 Sep — keyword scoring removed.** Four configurations measured, none beat the date boost, and the last of them shipped switched off. Code that never runs is not measured and rots, so `bm25.ts`, the rerank in `retrieve.ts`, `laneWeightKeyword`, `rerankDepth`, `bm25K1` and `bm25B` are gone. The design is recorded above and in git if a corpus ever turns up where a rare word names a passage rather than a document.

**24 Sep — sentence-level scoring measured and rejected.** Re-ranking the vector lane's 50 candidates by their best sentence or table row, rather than their whole-chunk embedding, takes top-5 from 15 to 10 and MRR from 0.119 to 0.075. Blending it with the chunk score is neutral at best — "max of both" moves 8 questions, +1 into the top five, MRR 0.113 — and costs 741 unit embeddings and 3 seconds per question against a 5-second search. Worst of all on the group it was meant to help: statements go from 3 in the top five to 0. The long-standing dilution explanation is wrong.

**24 Sep — HyDE measured: fusing helps, replacing hurts, and it lands on statements.** Question plus hypothetical gives 34 of 88 in pool against 31 and 16 in the top five against 15, improving 20 questions and worsening 9. On statement evidence the median rank goes from 24 to 8. Generation is 542ms with `gemma-4-e2b-it`. Not yet built; it belongs in an opt-in High depth.

**24 Sep — the keyword rerank is off by default.** Vector + date, measured under the current architecture, gives the same 14 hits as the reranker with 9 answers at rank 1 against 6, median rank 3 against 4, and MRR 0.140 against 0.117. Three forms of BM25 have now been tried and none beat the date boost, so `laneWeightKeyword` defaults to 0. The run also cleared the nomination defect: the contaminated baseline gave 0.141 where the clean one gives 0.140, so nothing measured earlier was wrong because of it.

**24 Sep — document frequency moved to the candidates: 11 hits back to 14.** Weighting terms by how rare they are across 119,403 chunks was making the reranker chase company names, which are rare in the library and ubiquitous in the document the shortlist came from. Counted over the 50 candidates instead, hits recovered to 14 and right-document-wrong-passage fell from 57 to 51. It ties the date boost rather than beating it, and by exchange: four questions gained, four lost, 6 answers at rank 1 against date-only's 9, MRR 0.117 against 0.141. BM25 now needs no corpus statistics at all, so the catalog holds no word table of any kind and exists purely for dates (version 3).

**24 Sep — BM25 reranking measured for the first time: 11 hits, unchanged from the lane.** Gained 3 questions and lost 6 — three of them answers the vector lane had at rank 1 — the same profile as the lane it replaced. 355 of 440 returned passages carried a keyword boost, so the reranker was doing plenty of work; the work was wrong.

**24 Sep — the rerank got a depth, and the candidate pool went to 50.** Boosting all of BM25's ranking turned out to change almost nothing: nearly every candidate contains some query term, so nearly every candidate collected a near-identical boost. Only BM25's top `rerankDepth` (default 10) are boosted now. `laneCandidates` is 50, which also makes Medium's pool comparable to Low's. To sweep: `BIG_RAG_RERANK_DEPTH` at 3, 10 and 30 against the same index.

**24 Sep — BM25 became a reranker; the keyword lane was removed.** It now scores only the passages the vector lane put up and adds `weight / (60 + its rank)` to each, the same shape as the date boost, so nothing enters the shortlist on keywords alone. `laneWeightKeyword` is back to 1. The catalog dropped its posting lists, which removed the 50,000-chunk ceiling, `BIG_RAG_CATALOG_MAX_CHUNKS` and the per-file candidate cap.

A measurement defect surfaced with it: under the old architecture a weight of 0 silenced a lane's vote but not its nominations, so every "lane off" run still had that lane's candidates in the pool. It changed no hit counts, but it is why the earlier vector + date row shows a pool of 28 where everything since shows 26.

**24 Sep — lanes isolated; the keyword lane turned off by default.** Vector + date gives 14 hits and MRR 0.141, against 12 for vector alone and 11 with all three lanes. Vector + keyword alone gives 9. `laneWeightKeyword` now defaults to 0.

**24 Sep — hybrid re-measured on the new indexes.** 11 hits against structured's 12, pool 23 against 26, median rank 3 — the best recorded — and wrong-document failures down from 29 to 12. Fusion moves answers a long way in both directions: three came from pool ranks 28, 22 and 16 into the top three, while two at rank 1 fell to 3 and 5. Lane weights are now settable per run, so BM25 and the date boost can finally be attributed separately.

**24 Sep — PDF tables and embedding prefixes measured.** Both indexes were rebuilt (legacy 91,541 chunks, structured 119,403, each about 2.4% larger because a row's separators count as words). Structured went from 9 hits to 12 and its median rank from 9 to 5; legacy from 7 to 8. Statement-evidence hits moved from 1 of 31 to 2. The improvement is in ordering, not recall.

An evidence-check defect surfaced during the rebuild: overlapping legacy chunks were de-duplicated by counting normalised words, while the recorded offsets count raw words, so the reconstruction was corrupted and legacy reported 107 unscorable against structured's 62. Fixed; both now report the same 88.

**22–24 Sep — PDF tables and embedding prefixes shipped.** Tables are now recovered from MuPDF geometry as `cell | cell` rows, kept whole in a chunk where possible, split only between rows with the header repeated, and embedded as `Capital expenditures — 2018: 1,577` while citations still show the grid. Documents and queries now carry Nomic's `search_document:` / `search_query:` prefixes, recorded in the index manifest. Both force a reindex (`structured-v3`).

They shipped in one rebuild, so their effects cannot be attributed separately.

## Open Questions

- **Can a boost rescue without displacing?** Fusion is flat enough that any boost large enough to lift a passage from rank 28 can push another off rank 1 — which is why every keyword configuration traded hits rather than adding them. Weighting by the vector lane's own similarity score, rather than by its rank, would let a confident rank 1 defend itself, and is the one change that might make reranking pay.
- **Would BM25 help on a corpus it suits?** It failed here because a filing's distinctive words are on every page of it. Where documents are heterogeneous — a manual, a paper, a report — a rare word plausibly names a passage. The code has been removed rather than left switched off; the design above records what to rebuild if a general question set says it is worth it.
- **Is the 0.5 threshold still right?** The prefixes shift the score distribution, and the threshold was not re-tuned. If hits fall while pool hits rise, suspect this first.
- **Should HyDE ship?** Measured and it works, concentrated on the statement group; not yet built. The remaining unknowns are how much of its gain survives beside the date boost, which already converts wrong-document failures, and whether a generation call per question is worth one to three hits. It belongs in an opt-in High depth.
- **Should a compound question be decomposed?** Untested. "Compare X and Y across FY21 and FY22" is four lookups wearing one question, and retrieval can only serve it by luck. It would belong in an Extra High depth, above HyDE.
- **Why is so little reachable at all?** Only 31 of 88 questions have their evidence in the top 50, and 9 of 41 for statements. Every technique measured so far — keyword reranking, sentence scoring, HyDE — reorders candidates or changes the query, and none can reach an answer the vector search never returns. Raising recall, rather than improving ranking, is where the remaining headroom is.
- **Can retrieval cover several documents at once?** A cross-document comparison needs the best passage *per document*, not the five best overall, which fusion cannot currently express.
- **Would a second dataset help?** FinanceBench measures financial reasoning as much as retrieval. A lookup-style question set over ordinary documents — manuals, papers, reports — would measure the plugin as a general tool.
