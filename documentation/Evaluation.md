# Evaluation

How we measure retrieval objectively when the pipeline changes: same questions, same documents, one variable at a time.

Two datasets, deliberately unalike. FinanceBench is the harder and the less representative; QASPER is the check that nothing here is an artefact of it.

## First Dataset: FinanceBench

[368 PDFs of public company filings](https://github.com/patronus-ai/financebench/tree/main/pdfs), 363 unique. Download the PDFs into `eval\documents\financebench`; the question set is already in `eval\questions-financebench.json`, 150 questions with the dataset's own evidence strings.

A hard and unrepresentative corpus: table-heavy filings, around ten near-identical documents per company, and half the questions needing arithmetic rather than lookup. **62 of the 150 are unscorable** because the dataset's evidence strings come from a different PDF extractor than ours, leaving 88. Read every FinanceBench number with that in mind.

## Second Dataset: QASPER

1,585 NLP papers with questions written by researchers who had read only the abstract, answered by others who marked the paragraphs holding the answer. Papers are one of the document types this plugin is actually for, and every conclusion drawn from FinanceBench alone — including that keyword scoring is worthless — may be a fact about ten-filings-per-company rather than about retrieval.

It is also the better measuring instrument. The documents are written from the same paragraphs the evidence is taken from, so evidence matches the index verbatim: **281 papers yield 892 questions with none lost** to extraction differences, against FinanceBench's 62 of 150 lost.

```powershell
# Download qasper-dev-v0.3.json from allenai.org/data/qasper, then:
node scripts/qasper-to-eval.mjs path\to\qasper-dev-v0.3.json --papers 300
```

The converter writes one plain-text paper per file with section names as headings, and skips questions that are unanswerable, whose evidence is a figure or table, or whose evidence does not appear verbatim in the rendered paper.

Numbers are not comparable between the two datasets — different documents, different questions, a different share answerable by lookup at all. What transfers is the **ordering** of configurations: whether Legacy, Structured, Dates and HyDE rank the same way on both.

## Running It

Build one index per chunking strategy ([Command-Line Tools](CLI.md#indexing)), then run each configuration in the same PowerShell window, from the repository root. Every path below is relative to it and can be pasted as written; variables persist between runs, so set every one explicitly.

```powershell
# --- indexes, once per dataset and chunking strategy ---
$env:BIG_RAG_STRUCTURED_INDEXING = "false"
npm run index:cli -- ".\eval\documents\financebench" ".\eval\financebench_vdbs\legacy"
npm run index:cli -- ".\eval\documents\qasper"       ".\eval\qasper_vdbs\legacy"
$env:BIG_RAG_STRUCTURED_INDEXING = "true"
npm run index:cli -- ".\eval\documents\financebench" ".\eval\financebench_vdbs\structured"
npm run index:cli -- ".\eval\documents\qasper"       ".\eval\qasper_vdbs\structured"
```

```powershell
# --- FinanceBench ---
$env:BIG_RAG_DOCS_DIR  = "eval\documents\financebench"
$env:BIG_RAG_EVAL_FILE = "eval\questions-financebench.json"

$env:BIG_RAG_DB_DIR = "eval\financebench_vdbs\legacy"
$env:BIG_RAG_RETRIEVAL_DEPTH = "low"
npm run eval:run                                    # Legacy

$env:BIG_RAG_DB_DIR = "eval\financebench_vdbs\structured"
npm run eval:run                                    # Structured
$env:BIG_RAG_RETRIEVAL_DEPTH = "medium"; npm run eval:run   # + dates and keywords
$env:BIG_RAG_RETRIEVAL_DEPTH = "high";   npm run eval:run   # + HyDE
```

```powershell
# --- QASPER: same four, different corpus and question set ---
$env:BIG_RAG_DOCS_DIR  = "eval\documents\qasper"
$env:BIG_RAG_EVAL_FILE = "eval\questions-qasper.json"

$env:BIG_RAG_DB_DIR = "eval\qasper_vdbs\legacy"
$env:BIG_RAG_RETRIEVAL_DEPTH = "low"
npm run eval:run                                    # Legacy

$env:BIG_RAG_DB_DIR = "eval\qasper_vdbs\structured"
npm run eval:run                                    # Structured
$env:BIG_RAG_RETRIEVAL_DEPTH = "medium"; npm run eval:run   # + dates and keywords
$env:BIG_RAG_RETRIEVAL_DEPTH = "high";   npm run eval:run   # + HyDE
```

`BIG_RAG_DOCS_DIR` must be the exact folder the index was built from, or nothing can be matched to its source file. `BIG_RAG_EVAL_FILE` must match the corpus — pointing FinanceBench questions at the QASPER index reports every question unscorable.

Each run prints a summary and writes a full report to `eval\reports\run-<timestamp>.json`, including every setting, each returned passage's section, and where the evidence sits.

### Configurations

| Configuration | Chunking | Depth | What it isolates |
|---|---|---|---|
| Legacy | `false` | `low` | Fixed-size chunks, vector search only |
| Structured | `true` | `low` | Section-aware chunks with file, date and section headers |
| + dates | `true` | `medium` | A date the question names lifting passages already found. Keyword reranking also rides on `medium` now, so reproducing the FinanceBench column below needs `BIG_RAG_LANE_WEIGHT_KEYWORD=0` |
| + HyDE | `true` | `high` | A drafted answer searched alongside the question |

### Tuning a Run

Any of these can be set per run, so a configuration differs from its neighbour by one variable:

| Variable | Default | Purpose |
|---|---|---|
| `BIG_RAG_RETRIEVAL_LIMIT` | 5 | Passages returned to the model |
| `BIG_RAG_RETRIEVAL_THRESHOLD` | 0.5 | Minimum similarity for a passage to be returned |
| `BIG_RAG_LANE_WEIGHT_VECTOR` / `_HYDE` / `_KEYWORD` / `_DATE` | 1 / 1 / 1 / 1 | **Set a signal to 0 to run without it**, which is how its contribution is attributed |
| `BIG_RAG_LANE_CANDIDATES` | 50 | Passages the vector lane puts up, and so the pool the others reorder |
| `BIG_RAG_NEIGHBOUR_CHUNKS` | 1 | Chunks either side of a returned passage to return with it; 0 disables |
| `BIG_RAG_REGENERATE_HYPOTHETICALS` | `false` | Redraft rather than reuse the cached drafts |
| `BIG_RAG_HYPOTHETICALS_FILE` | beside the question set | Where the drafts are cached; derived from `BIG_RAG_EVAL_FILE` unless set |

Attributing a signal takes two runs against one index: at Medium, `_DATE=0` should reproduce Low exactly and proves the harness; at High, `_HYDE=0` must reproduce Medium exactly. Both checks have caught real defects.

**High runs reuse their drafts.** The first writes one passage per question id, tagged with the model that wrote it; later runs with that model reuse it. Drafting is not deterministic, so without this two runs of one configuration differ by the generator's variance rather than by the change being measured.

The cache is named after its question set and sits beside it — `eval\questions-qasper.json` gives `eval\hypotheticals-qasper.json` — so two datasets can never share one, and a draft written for one question set can never be served to another.

Held constant: `nomic-embed-text-v1.5` embeddings, 512-token chunks (100 overlap, legacy only), 5 passages returned, 0.5 threshold, compaction off, a 50-passage diagnostic pool, RRF constant
60. Full list in [CLI.md](CLI.md).

## How a Question Is Scored

A question is a **hit** when the evidence string appears in the passages returned for it, ignoring case, punctuation and whitespace. Two rules keep that fair:

- **Consecutive chunks count as one passage.** If evidence spans a boundary and both chunks are returned, the model received all of it.
- **Rank is how deep you must read**, not where the best-placed neighbour sits. The median rank and mean reciprocal rank record the smallest number of passages that between them hold the whole evidence. Before 29 September 2026 they recorded the rank of the best chunk in the run holding the evidence, which let a passage at rank 40 be reported as rank 3 because something beside it ranked well. **Four of the six FinanceBench columns were measured that way and are optimistic**, as marked in that table; hit rates and pool rates are unaffected, since those only ask whether the evidence was there at all. Every QASPER figure uses the corrected measure.
- **Passage accuracy is reported separately from hit rate.** A hit requires finding the right document *and* the right passage in it. Where a question set does not say which document is meant, the first of those is not a retrieval failure, so the summary also reports hits as a share of the questions that returned their source document at all. On FinanceBench the two are close; on QASPER they are not.
- **Questions whose evidence is not in the index are unscorable, not misses.** Each file is rebuilt from its chunks and searched for the evidence. If it isn't there, no retrieval could find it.

How many survive that rule is the clearest difference between the two datasets. On FinanceBench, **62 of 150 are unscorable**, leaving **88 scored in every run**: 28 of the evidence strings begin with page furniture (`Table of Contents`, a page number) our parser strips, and the rest differ in spacing or table layout. The information is usually in the index; the verbatim string is not. The split is even across question types, so the 88 keep the same mix as the 150. On QASPER the documents are written from the evidence's own paragraphs, so **892 of 892 are scorable**.

At 88 questions one question is 1.1%, so treat FinanceBench differences of one or two as noise. QASPER's 892 are far less noisy, which is the other reason to have it.

Two measurement caveats: a split table repeats its header row in each piece, so those words appear twice when a file is reconstructed and evidence straddling that boundary can read as unscorable; and the diagnostic pool is the fused ranking at Medium depth, the vector ranking at Low — the same 50 chunks either way, since nothing but the vector lane nominates.

## Results: FinanceBench

Indexes rebuilt 24 September 2026 with PDF table rows and the Nomic prefixes: legacy 91,541 chunks, structured 119,403.

Each column adds one signal to the one on its left, and both tables run the same seven columns in the same order so they can be read against each other. Two of them need naming precisely, because the difference is a lane being off:

- **`+ keywords`** is everything to its left plus BM25 reranking. This is what Medium does today.
- **`+ HyDE, keywords off`** is `+ neighbours` plus HyDE, with `laneWeightKeyword` at 0 — a **branch from `+ neighbours`, not a step from `+ keywords`**. It is where HyDE was first measured on both corpora, at a time when the keyword lane had been deleted from the code entirely, and it is what the conclusions below argue against.
- **`+ HyDE, all on`** is every lane on, which is what High does today.

| Metric | Legacy | Structured | + dates | + neighbours | + keywords | + HyDE, keywords off | + HyDE, all on |
|---|---|---|---|---|---|---|---|
| Final hit rate | 9.1% (8) | 13.6% (12) | 15.9% (14) | 18.2% (16) | 18.2% (16) | **21.6% (19)** | not run |
| Found the right document | — | — | — | 71 | 65 | — | not run |
| Passage accuracy | — | — | — | 22.5% | 24.6% | — | not run |
| Pool hit rate (top 50) | 19.3% (17) | 29.5% (26) | 29.5% (26) | 29.5% (26) | 29.5% (26) | **36.4% (32)** | not run |
| Answers at rank 1 | 4 | 6 | 9 | 6 | 6 | 8 | not run |
| Median answer rank in pool | 6 | 5 | 3 | 5 | 5 | 3.5 | not run |
| Mean passages returned | 5.0 | 5.0 | 5.0 | 6.6 | 6.6 | 6.9 | not run |

88 questions and 119,403 structured chunks in every column but Legacy, which has 91,541. A search takes 4.0s on the legacy index and 5.0–5.1s on the structured one, and drafting adds 1.1s per question at High.

**The last column has never been run here**, so FinanceBench has no measurement of keywords and HyDE together — the combination QASPER shows to be its best. Filling it is one run of about 35 minutes. The blank rows in the first three columns and the sixth are unrecoverable: those reports are no longer on disk, and the metrics were added to the harness after they were made.

**The two rank rows are not comparable across this table.** `+ neighbours` and `+ keywords` were run on 29 September with the corrected rank measure; the other columns predate it and are optimistic, because a passage at rank 40 could be reported as rank 3 when something beside it ranked well. The apparent regression from `+ dates`' median 3 to `+ neighbours`' 5 is that measurement change, not the neighbours. Mean reciprocal rank, filter loss and right-file-wrong-passage are no longer tabulated; they are quoted below where they carry an argument, and every run report in `eval\reports` holds all of them.

Every column draws its pool from the same place, an unthresholded top-50 search, so the pool row is comparable across them. Three of the changes cannot move it: dates and keywords only reorder the same 50, and neighbour expansion only adds chunks beside one already returned. HyDE is the one that searches a second vector, which is why the pool moves only in the two HyDE columns — the same pattern as QASPER, where it moves the pool downwards.

### Which Signal Does the Work

Isolated with the weights, all against the same structured index and the same 50 candidates. Every row is recomputed from its report with one definition, so the columns agree with each other rather than with earlier revisions of this document.

| Configuration | Hits | Wrong document | Wrong company | Pool | Median | MRR | Rank 1 |
|---|---|---|---|---|---|---|---|
| Vector only | 12 | 31 | 4 | 26 | 5 | 0.107 | 6 |
| Vector + date* | **14** | **14** | **2** | 28 | 4 | 0.141 | **9** |
| Vector + keyword lane + date* | 11 | 12 | 4 | 27 | 5 | 0.108 | 5 |
| Vector + keyword lane* | 9 | 34 | 7 | 22 | 5.5 | 0.080 | 3 |
| Keyword rerank, corpus idf, + date | 11 | 13 | 7 | 26 | 5 | 0.106 | 5 |
| Keyword rerank, local idf, + date | **14** | 17 | 6 | 26 | 4 | 0.117 | 6 |
| Keyword rerank, local idf, `b=0`, + date | **14** | 17 | 6 | 26 | **3** | 0.134 | 8 |
| **Vector + date, current architecture** | **14** | **14** | **3** | 26 | **3** | **0.140** | **9** |

\* Measured under the old lane architecture, where a weight of 0 silenced a lane's vote but not its nominations: those candidates still entered the pool and could still collect the date boost. That is where vector + date's pool of 28 comes from against every other row's 26. It cost no hits — the clean row gives 0.140 where the contaminated one gave 0.141 — but the row is not strictly the configuration its name describes.

**Dates do the work.** The boost took hits 12 to 14 and more than halved wrong-document failures, 31 to 14, because a year says which of a company's ten near-identical filings is wanted. It only lifts a passage another signal already found, so it costs nothing.

**Keywords never did on this corpus, in four forms.** Nominating its own candidates, BM25 cost three hits by filling the shortlist with the boilerplate carrying a company's name. Reranking with corpus-wide idf reproduced that exactly — 11 hits, gaining 3 and losing 6, three of them answers the vector lane had at rank 1 — because a company name is rare across 119,403 chunks and so heavily weighted, while appearing on every page of the document the shortlist came from. Counting document frequency over the 50 candidates instead recovered 14, since a term every candidate shares collapses to nothing. Dropping the length penalty (`b = 0`) recovered most of the rest, MRR 0.117 to 0.134. But the outcome never moved: **the same four questions gained and four lost in every variant.** Tuning changes ranks, not which answers cross into the five returned.

Why a rerank can displace a good answer is fusion's flatness: a boost is worth up to `1/61`, while the whole spread from vector rank 1 to rank 50 is `1/61` to `1/110`. Any boost large enough to rescue rank 28 is large enough to push one off rank 1.

The pattern across all four: on this corpus a question's distinctive words identify *which filing*, not *which page*, and the date boost settles that better and for free. Keyword scoring was deleted on this evidence alone, then restored on 29 September when QASPER supplied the heterogeneous corpus this section asked for — 281 unlike papers, where choosing the document is the hard part, and 21 more questions answered with it on. It is on by default and neutral here; the QASPER results and the 29 September entry carry the detail.

**Structured indexing is ahead of legacy on every measure:** half again as many hits and answers surfaced, more than double the MRR. A run takes roughly 35 minutes. The build before tables and prefixes gave Legacy 7 hits and Structured 9 at median rank 9, so **tables and prefixes moved ordering rather than recall** — structured found the same 26-odd answers and ranked them higher, so three more crossed into the five returned. They shipped together and cannot be separated.

### What the Numbers Say

**Where retrieval lands:**

| Outcome | Legacy | Structured | + dates | + HyDE, 5 passages |
|---|---|---|---|---|
| Hit | 8 | 12 | 14 | **16** |
| Same company, wrong document — usually another year | 32 | 31 | 14 | **11** |
| Right document, wrong passage | 41 | 41 | 57 | 54 |
| Different company | 7 | 4 | **3** | 7 |

Nine times in ten the right company is found. The date boost is what converts wrong-document failures into right-document ones, 31 down to 14.

**Statements are the stubborn case, and it is recall, not dilution.** 31 of the 88 have their answer inside a statement and 2 are hits, up from 1 before tables; the gains landed elsewhere — 7 of 39 for press releases and short sections, 2 of 2 for notes, 1 of 16 for MD&A narrative. (A looser match on section path counts 41, which the tables below use.)

The assumed explanation — one row averaged away among hundreds of words of figures — is wrong. Scoring a candidate by its best sentence or table row instead of its whole-chunk embedding makes statements *worse*, 3 of 41 in the top five down to 0, MRR 0.050 to 0.015. The unit is too small, not too large: `Capital expenditures — 2018: 1,577` is short and mostly numeric and embeds badly against a sentence of English, where the whole chunk at least carries its context header.

The barrier is upstream of ranking: only 9 of those 41 have evidence anywhere in the top 50, so for 32 no re-scoring can help.

**What the questions actually ask.** Classifying all 88, and measuring how much of each question's wording appears in its evidence chunk:

| Type | Questions | Hits | | Question words in the evidence | Questions | In top 50 | Hits |
|---|---|---|---|---|---|---|---|
| Direct lookup | 42 | 9 | | Under 20% | 15 | 1 | 1 |
| Derived metric — must be computed | 24 | **0** | | 20–40% | 44 | 10 | 5 |
| Judgement call | 11 | 2 | | 40–60% | 19 | 6 | 2 |
| Multi-year comparison | 11 | 1 | | Over 60% | 10 | **9** | **4** |

Hits average 45% word overlap against 33% for misses. Derived metrics sit at the bottom by construction — "quick ratio" appears nowhere in a balance sheet, being calculated from line items. **Roughly 46 of 88 questions are financial reasoning rather than retrieval**, so the realistic target is the 42 lookups, 31 of them in a statement; 20% would be a strong result.

**Why the right document yields the wrong passage.** Of 41 such misses, 36 returned passages from elsewhere in the document entirely; 3 landed in the evidence's own section, 5 within two chunks. The evidence fits one chunk in 21 of the 41 and 56 of all 88, so boundaries are not the barrier. What comes back is narrative: an English question embeds close to prose about a topic and far from a grid of figures, even after the grid has rows.

**Why found answers do not reach the model, and what filter loss is really measuring.** High surfaces 32 answers and returns 16. The gap looks like a filter problem and mostly is not.

Scoring joins adjacent chunks into one passage, and that join runs over the 50-deep pool as well as the 5 returned. Neighbours are nearly always both in 50, so a pool rank of 1 often belongs to a *run* of which only one chunk reaches the top five. All four found-but-unreturned answers inside the top five show it — the evidence chunk was never returned, its neighbour was.

| Pool rank | Evidence at | Returned from that file |
|---|---|---|
| 2 | chunk 115 | 116, 103 |
| 2 | chunk 182 | 188, **183**, 185, 100, 296 |
| 3 | chunks 133–135 | 115, **136**, 114 |
| 1 | chunks 2–4 | **3**, **2**, 145, 8 |

The last is clearest: chunks 2 and 3 were both returned and it is still not a hit, because the evidence runs into chunk 4. **32 of the 88 questions have evidence spanning more than one chunk**, so this is structural.

**The threshold is not the constraint.** Measured directly, dropping it from 0.5 to 0.35 changed nothing — every metric identical. **The passage limit is**, and its ceiling is now known:

| | Hits | Filter loss |
|---|---|---|
| High, 5 passages | 16 | 18.2% |
| High, 10 passages | **23** | 10.2% |

Seven answers sit at ranks 6 to 10. Ten 512-token passages is most of an 8,192-token window, so this measures headroom rather than offering a setting. Sorting the 72 misses at 5 passages shows where that headroom is, and where it runs out:

| | |
|---|---|
| Evidence partly returned, rest of its span missing | 4 |
| Evidence not returned but a neighbour was | 3 |
| **Nothing from the evidence's span or beside it** | **65** |

Returning the neighbours of what is already returned was measured and is kept:

| | Hits | Mean passages returned | Hits per extra passage |
|---|---|---|---|
| High, 5 passages | 16 | 5.0 | — |
| **High, 5 passages plus neighbours** | **19** | **6.9** | **1.58** |
| High, 10 passages | 23 | 10.0 | 1.40 |

Three questions gained, none lost, at a better rate per token than simply returning more — and the model receives contiguous text rather than fragments. Filter loss falls from 18.2% to 14.8%, right-document-wrong-passage from 61.4% to 58.0%. Result sizes run from 5 to 13 passages.

Its ceiling was 4, not the 7 first estimated: three of those seven had evidence that was never a candidate at all, so no expansion could reach it — the estimate had counted adjacency without checking pool membership. Of the 4 genuinely reachable, 3 converted; the fourth needs three chunks back from the passage that matched, beyond `neighbourChunks: 1`.

**The ceiling either way is what is in the pool.** 32 answers are reachable and 56 are not, and two thirds of misses have nothing from the evidence's neighbourhood returned. No filter, limit or expansion touches those. Recall is the whole remaining problem.

### Rewriting the Question: HyDE

Drafting a passage that would answer the question, and searching for that too, was measured offline first — embedding each draft and checking where the known evidence chunk lands, with no change to the retrieval path. Vector-only over the 50-candidate pool, so not comparable with the Medium runs above:

| Configuration | In pool | Top 5 | Median | MRR | Better / worse |
|---|---|---|---|---|---|
| Question alone | 31 | **15** | 7 | 0.119 | — |
| Hypothetical, `search_query:` | 31 | 13 | 8 | 0.123 | 17 / 13 |
| Hypothetical, `search_document:` | 26 | 11 | 9 | 0.088 | 14 / 22 |
| **Question + hypothetical, fused** | **34** | **16** | 8 | **0.129** | **20 / 9** |

**Fusing works; replacing does not** — searching the draft instead of the question loses ground. Two cautions came out of the spike. The drafted specifics are entirely invented, so the text may only ever be embedded, never shown or cited. And **similarity is not a proxy for rank**: the `search_document:` variant won on cosine against the evidence, 73 of 88, and came last on rank.

### What High Costs and Buys

The implemented depth, measured against Medium on the same index. Only the drafted answer differs.

| | Medium | High | | Statement questions (41) | Medium | High |
|---|---|---|---|---|---|---|
| Hits | 14 | **16** | | In pool | 6 | **11** |
| In pool | 26 | **32** | | Hits | 3 | **4** |
| Rank 1 | **9** | 8 | | MRR | 0.059 | **0.078** |
| Median | **3** | 3.5 | | | | |
| MRR | 0.140 | **0.155** | | Drafting | — | 1.1s / question |

**It adds rather than trades** — three questions gained, one lost, where every other signal measured here broke even or worse. Statement pool coverage nearly doubles; that group had resisted table extraction, keyword scoring in four forms, and sentence-level scoring.

Read the median carefully: it worsens, 3 to 3.5 overall and 2.5 to 5 on statements, because the new finds arrive *deep*. Adding five statement answers below the existing ones drags the median while strictly improving coverage. Wrong-company failures also rise, 3 to 7 — an invented passage sometimes resembles the wrong filing.

**Two hits on 88 questions is near the 1.1% noise floor.** What carries the finding is the pool: +6 is larger and steadier than +2, and it was seen three times independently — the offline spike at +3, a leaking control run at +4, and this at +6.

## Results: QASPER

281 papers, 892 questions, **all scorable**. Ranks here use the corrected measure, so they cannot be compared with the FinanceBench table above; hit rate, pool rate and passage accuracy can.

Columns as above, in the same order. Every cell is recomputed from the run reports in `eval\reports`.

| Metric | Legacy | Structured | + dates | + neighbours | + keywords | + HyDE, keywords off | + HyDE, all on |
|---|---|---|---|---|---|---|---|
| Final hit rate | 13.1% (117) | 15.9% (142) | 15.9% (142) | 22.2% (198) | 24.6% (219) | 20.2% (180) | **25.6% (228)** |
| Found the right document | 306 | 324 | 324 | 324 | 356 | 281 | **357** |
| Passage accuracy | 38.2% | 43.8% | 43.8% | 61.1% | 61.5% | **64.1%** | 63.9% |
| Pool hit rate (top 50) | 28.0% (250) | 37.2% (332) | 37.2% (332) | 37.2% (332) | 37.2% (332) | 35.1% (313) | 36.1% (322) |
| Answers at rank 1 | 42 | 51 | 51 | 51 | **67** | 46 | 56 |
| Median answer rank in pool | 7 | 7 | 7 | 7 | **5** | 8 | **5** |
| Mean passages returned | 5.0 | 5.0 | 5.0 | 7.8 | 7.4 | 8.3 | 8.0 |

892 questions and 4,699 structured chunks in every column but Legacy, which has 3,676. A search takes 4–12ms, and drafting costs 582ms where the cache is written against 17ms where it is reused.

**BM25 says which document, not which passage in it** — which is why it was deleted and why it came back. It adds 21 questions here, gaining 52 and losing 31, with the pool untouched since it reranks and never nominates. The gain is *all* document-finding: the right paper returns 32 times more often while passage accuracy barely moves. On FinanceBench the document was never in doubt — ten near-identical filings of one company, its distinctive words on every page — so the same signal is neutral there, 16 hits either way.

**What "neutral" on FinanceBench actually means.** Not that nothing happens: comparing the two runs question by question, four hits are gained and four lost, and document-finding falls 71 to 65 — 5 documents found, 11 lost. **All 11 lost documents were questions that were failing anyway**, returning the right filing and the wrong passage, so losing the filing costs no hit. The four-for-four churn is the same signature the four September variants showed, which suggests it is structural to reranking a flat fusion on this corpus rather than an artefact of one tuning. The same churn on a corpus where choosing the document is the hard problem resolves 21 questions one way instead of cancelling. Neutral on one corpus and clearly positive on the other, so `laneWeightKeyword` defaults to 1.

**The date boost does nothing here.** Not "little" — nothing: every figure in the `+ dates` column is identical to `Structured`, and **not one returned passage carries the date lane**, because no QASPER question names a date the parser recognises. On FinanceBench it was worth two hits and halved wrong-document failures by telling ten near-identical filings apart. Papers have no such ambiguity, so the date boost is a FinanceBench feature rather than a general one.

**Neighbour expansion is worth far more here than there: 56 hits against 3.** It contributed 2,530 of 6,990 returned passages, cut filter loss 21.3% to 15.0% and right-document-wrong-passage 20.4% to 14.1%. Structured chunks do not overlap, 333 of 892 questions have evidence spanning two or more, and expansion completes them — the one change that matters more on the representative corpus than the awkward one.

**Passage accuracy improves at every step**: 38.2%, 43.8%, 43.8%, 61.1%, 61.5%, 63.9%. On the measure that excludes questions naming no document, every change made this month helps. Document-finding, by contrast, is flat at 324 across Structured, dates and neighbours, because expansion only ever adds chunks from a document already returned — only the nominating changes move it.

**HyDE and BM25 each repair the other's one weakness.** Alone, HyDE finds the right document 43 times less often, 281 against 324, while locating the passage better when it does, 64.1% against 61.1%: its lane nominates, and a draft answering a question that names no paper is generic prose that nominates generic paragraphs from the wrong papers. On FinanceBench the draft *added* 6 to the pool, because there a question names its company and year and the draft inherits them, while "what were the baselines?" gives it nothing. But document-finding is also the only thing BM25 improves, 324 to 356 — so with both on it reaches 357, HyDE's loss more than repaired, passage accuracy nearly intact at 63.9%, and 228 hits, the best figure on this corpus.

**The earlier reading that HyDE hurts QASPER was an artefact of measuring it with BM25 switched off** — a signal judged alone against a baseline that no longer ships. High is now ahead on both corpora, and is opt-in because it costs a model call per question, not because it loses hits.

**Read passage accuracy, not hit rate, on this dataset.** A hit needs the right document *and* the right passage; where the question does not say which document is meant, the first is not a retrieval failure. 87 QASPER questions have text appearing verbatim for two or more papers, and 88% of the questions that never reach the pool fail on the paper, not the paragraph.

Two cautions. Expansion runs only on the fused path, so Low cannot have it; the `+ dates` column exists to separate the two and was measured with `BIG_RAG_NEIGHBOUR_CHUNKS=0` at Medium. And rank-1 answers fall from 115 to 51 while all else improves, because legacy chunks overlap and often hold short evidence whole, where structured chunks need two and the depth measure counts the second.

**Structured chunking generalises.** It is the first FinanceBench conclusion confirmed on a corpus sharing none of that one's properties: 25 more answers returned, 82 more reachable, MRR up a quarter. Section-aware chunks help where sections are real, and a paper's headings are as real as a filing's.

**A run takes about a minute.** 3,676 chunks against FinanceBench's 91,541 means a 4ms search rather than 5 seconds, so sweeping a parameter here costs what reading the result costs. It also reopens options rejected on cost alone: ten times the vectors would still be a 40ms search.

Hit rates across the two datasets are not comparable either — different questions, a different share of them answerable by lookup. What is comparable is the **shape of the failure**: right-document-wrong-passage is 21.2% here against 46.6% for FinanceBench's legacy run. Picking the right document out of 281 unlike papers is far easier than picking one of ten near-identical filings, and that was FinanceBench's dominant failure.

What these runs are for, in order of how much they would change:

- **Does the date boost survive?** It earned its place by choosing between ten near-identical filings of one company. Papers have no such ambiguity, so Hybrid may collapse back to Structured — which would mean Medium is a FinanceBench artefact rather than a feature.
- **Does HyDE survive?** Its gain landed on financial statements, and part of it came from a 2B model answering in markdown tables that matched chunks holding table rows. Papers are prose, so the mechanism may not carry.
- **Was keyword scoring wrongly removed?** It failed because a filing's distinctive words sit on every page of it. Papers use genuinely distinct vocabulary, so a rare term may name a passage here. `git show` restores the reranker and the design is recorded above.
- **Does structured chunking still beat legacy?** The one result expected to hold, since section structure is real in a paper and its headings are genuine.

## Run Log

Newest first. Each entry gives the finding and the numbers that appear nowhere else; the results sections above carry the full tables.

**7 Oct — keywords and HyDE measured together, and HyDE's QASPER verdict reversed.** The `+ HyDE` column predated the keyword restoration, so the two had never been on at once. Together: 228 hits against 219 for keywords alone and 180 for HyDE with keywords off, because document-finding is HyDE's only loss and BM25's only gain. **Every signal in this document had been attributed by zeroing one weight at a time, which measures contributions and not interactions.** This is the first pair measured together and it changed a conclusion. The run reused 843 drafts and generated 49, so it is not draft-for-draft; that cannot account for a swing of this size or direction.

**29 Sep — keyword reranking restored and on by default.** Deleted on FinanceBench evidence alone, with an explanation never tested: that it failed because a filing's distinctive words sit on every page of it. QASPER tested it and it holds — the gain there is all document-finding, with passage accuracy flat. Neutral on FinanceBench re-measured. `laneWeightKeyword` defaults to 1.

**29 Sep — QASPER measured across four configurations.** Structured chunking generalises, 117 hits to 142. The date boost does nothing at all, not one passage tagged. Neighbour expansion is worth 56 here against 3 on FinanceBench, because structured chunks do not overlap and 333 of 892 questions have evidence spanning two.

**29 Sep — two measurement defects fixed.** Pool rank was the best-placed chunk of the run holding the evidence, so a chunk could inherit its neighbour's rank; it is now how deep the reader must go. And the hypothetical cache was keyed by a map from question text to id, so question sets reusing a text — QASPER has 87 — collapsed into one entry.

**28 Sep — returning a passage with its neighbours: 19 hits for 6.9 passages.** Three gained, none lost, at a better rate per token than the 23 hits for 10.0 passages that raising the limit gives, and the model gets contiguous text. Its ceiling was 4 rather than the 7 predicted: the estimate counted evidence adjacent to a returned passage without checking the evidence was a candidate at all, and three of the seven were never in the pool.

**28 Sep — ten passages instead of five gives 23 hits**, so seven answers sat at ranks 6 to 10. A measurement, not a setting: ten 512-token passages is most of an 8,192-token window. Neighbour expansion reaches the same 23 for one or two extra chunks. Both stop there, because 65 of the 72 misses have nothing from the evidence's neighbourhood returned at all.

**28 Sep — the threshold is settled, and filter loss means less than it looks.** Dropping `BIG_RAG_RETRIEVAL_THRESHOLD` from 0.5 to 0.35 at High changed every metric not at all. The four found-but-unreturned answers inside the top five were not threshold casualties: in each the evidence chunk was never returned and its neighbour was, and the pool rank came from the 50-deep pool holding enough adjacent chunks to reconstruct the evidence.

**28 Sep — High measured: 16 hits, and the statement group finally moves.** Statement-evidence pool coverage goes 6 to 11. One model call and 1.1s per question; ships opt-in.

**28 Sep — a zero-weight lane was still nominating.** High's control run with `BIG_RAG_LANE_WEIGHT_HYDE=0` was meant to reproduce Medium and returned 12 passages the hypothetical alone had found: `fuseLanes` scaled each lane's contribution by weight but added its chunks regardless, where the date boost lifted them. The same defect the keyword lane had, rebuilt with a new lane; now fixed inside `fuseLanes`. **Attribution by zeroing a weight means nothing unless a zeroed lane is genuinely absent.**

**24 Sep — sentence-level scoring measured and rejected.** Re-ranking the 50 candidates by their best sentence or table row rather than their whole-chunk embedding takes top-5 from 15 to 10 and MRR from 0.119 to 0.075. Blending is neutral at best — "max of both" moves 8 questions, +1 into the top five — and costs 741 unit embeddings and 3 seconds per question against a 5-second search. Worst where it was aimed: statements go 3 in the top five to 0. **The long-standing dilution explanation is wrong.**

**24 Sep — HyDE measured offline: fusing helps, replacing hurts.** On statement evidence the median rank goes 24 to 8. Generation is 542ms with `gemma-4-e2b-it`.

**24 Sep — keyword scoring removed after four measurements** (restored 29 September; the four forms and their numbers are in the FinanceBench section). What the rebuild changed beyond scores: reranking the vector lane's own 50 dropped the posting lists, the 50,000-chunk ceiling, `BIG_RAG_CATALOG_MAX_CHUNKS` and the per-file cap; 355 of 440 returned passages carried its boost, so it was working hard and wrongly; and counting document frequency over the candidates rather than the corpus cut right-document-wrong-passage from 57 to 51 and left the catalog needing no word table at all. It shipped at weight 0 and was then deleted rather than left to rot.

**24 Sep — hybrid re-measured on the rebuilt indexes, and the lanes isolated.** Hybrid gave 11 hits against structured's 12 and wrong-document failures down from 29 to 12; three answers came from pool ranks 28, 22 and 16 into the top three while two at rank 1 fell to 3 and 5. Making lane weights settable per run allowed every isolation above.

**24 Sep — PDF tables and embedding prefixes measured.** Both indexes rebuilt, each about 2.4% larger because a row's separators count as words. Structured went 9 hits to 12 and median rank 9 to 5; legacy 7 to 8; statement hits 1 of 31 to 2. The improvement is in ordering, not recall. An evidence-check defect surfaced with it: overlapping legacy chunks were de-duplicated by counting normalised words while the recorded offsets count raw words, so legacy reported 107 unscorable against structured's 62. Fixed; both now report 88.

**22–24 Sep — PDF tables and embedding prefixes shipped.** Tables are recovered from MuPDF geometry as `cell | cell` rows, kept whole where possible, split only between rows with the header repeated, and embedded as `Capital expenditures — 2018: 1,577` while citations still show the grid. Documents and queries carry Nomic's prefixes, recorded in the index manifest. Both force a reindex (`structured-v3`) and shipped together, so their effects cannot be separated.

**22 Sep — three fixes to hybrid, measured one at a time.**

| Configuration | Hits | Wrong document | Wrong company | MRR |
|---|---|---|---|---|
| Structured, Low | 9 | 37 | 9 | 0.099 |
| Hybrid, equal lanes | 6 | 36 | 11 | 0.088 |
| + years read from questions, 3 candidates per document | 8 | **18** | 21 | 0.091 |
| + dates as a boost rather than a source of candidates | **9** | **16** | **10** | **0.122** |

Reading years halved wrong-document failures but doubled wrong-company ones, because "FY2023" matches every company's 2023 filing. Making dates a boost kept the gain and removed the cost.

**22 Sep — hybrid was worse than vector search alone at equal weights**, 6 hits against 9. Both extra lanes rank by *document* while the vector lane ranks by *passage*: every chunk of a filing carries the company name and shares its posted date, so each contributed 30 near-interchangeable candidates that outvoted the one lane distinguishing passages. Four answers at vector ranks 1, 2, 5 and 5 were pushed to 7, 9, 11 and 11. The date lane never fired at all — questions say "FY2022" and the parser ignored bare years — while the keyword lane promoted boilerplate like `About Ulta Beauty` that matches the company name and contains nothing.

**22 Sep — two scoring defects fixed.** The diagnostic pool ignored fusion, so pool metrics at Medium described the vector lane alone. And scoring was stricter than reality, making 56% of questions unwinnable for any system. Adjacent chunks now count as one passage, and absent evidence is reported unscorable.

**21 Sep — indexes rebuilt** after the parser chain changed to MuPDF first. All 368 files indexed, no failures, including filings whose damaged fonts previously defeated every parser. Structured chunks fell from 214,643 to 116,741 after heading detection and the no-overlap chunker, with no text lost: the 27.5M against 34.0M word gap is exactly legacy's overlap duplication.

**21 Sep — first runs.** Legacy 4.0%, Structured 6.0%, Hybrid 3.3%. **Not comparable with anything above**, having been produced by the older scoring rule.

## Open Questions

- **Why is so little reachable?** At best 32 of 88 on FinanceBench and 332 of 892 on QASPER have their evidence in the top 50. Everything measured so far reorders candidates or rewrites the query; none of it reaches an answer the vector search never returned. Recall is where the headroom is.
- **Can a boost rescue without displacing?** Fusion is flat: a boost big enough to lift rank 28 is big enough to push one off rank 1. Weighting the vector lane by its similarity score rather than its rank would let a confident top answer defend itself.
- **Why is the evidence chunk outranked by its own neighbour?** In every FinanceBench found-but-unreturned answer inside the top five, the chunk beside the evidence came back and the evidence did not. Chunk boundaries are not the cause — the evidence fits one chunk in 56 of 88.
- **Should a compound question be decomposed?** "Compare X and Y across FY21 and FY22" is four lookups in one, and retrieval serves it only by luck. It would belong above HyDE, at an Extra High depth.
- **Can retrieval cover several documents at once?** A cross-document comparison needs the best passage *per document*, which fusion cannot express.
- **Would a third dataset help?** QASPER is a single-document QA set used over a corpus, so 560 of its 892 questions name no document and are unanswerable by design. A retrieval-native set — real queries against a corpus, with answer spans — would give an absolute number that neither of these two can.

## Out of Scope

**Whether retrieval improves the model's answers.** Everything here measures whether the evidence reached the model, never whether it was used. That is deliberate: the answer is bounded by a 2B model on an edge device, so retrieval is the part worth improving and the part these numbers describe. Noted so it is not repeatedly re-raised as a gap.
