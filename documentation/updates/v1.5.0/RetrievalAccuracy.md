# Retrieval Accuracy

Date: 2026-09-29
Status: Completed Implementation, Measured on Two Datasets
version: `v1.5.0`

---

## Context

Version 1.4.0 simplified the settings. Everything since has gone into one question: when a user asks something, does the passage holding the answer reach the model?

The honest answer at the start of this version was: rarely. On FinanceBench, 8 of 88 scorable questions. Three things were wrong, and they turned out to be independent — how documents are cut up, how candidates are chosen, and how any of it is measured. This version changes all three, and about half the changes made were measured and then reverted.

Note on version numbering: the hybrid retrieval described in [v1.4.0's document](../v1.4.0/RetrivealStrategy.md) was written up against that version but landed after its tag, so it ships here. That document remains the record of the design; this one covers what happened to it.

---

## Changes Made

### Document Representation

A chunk can only be found if it reads like something a person would ask about.

**Headings come from font styles, not from patterns.** The parser reads MuPDF's per-line styles, excludes the dominant body style, and treats short single-style lines as headings, ranked by size then by first appearance. No rules about `Part`, `Item` or numbering, which misrepresent documents that use those words ordinarily. Filings that previously produced two headings now produce hundreds, so sections are real rather than one giant block.

**Structured chunks no longer overlap.** A section is split into full pieces at paragraph boundaries, each piece filling at least three quarters of the budget. Structured chunk counts fell from 214,643 to 116,741 with no text lost — the difference was legacy's duplicated overlap.

**PDF tables are recovered as rows.** Runs of aligned lines on a page become `cell | cell` rows, headers chosen by first non-numeric cell, kept whole in a chunk where they fit and split only between rows with the header repeated. Each chunk then carries two forms: the grid, which is what a citation shows, and a linearised form, which is what gets embedded, so `Capital expenditures | 1,577` embeds as `Capital expenditures — 2018: 1,577`.

**Embeddings use the prefixes the model expects.** Nomic is trained asymmetrically, so documents embed as `search_document:` and questions as `search_query:`. The index manifest records which convention was used and refuses an index built under another.

These force a reindex: the structured format is now `structured-v3`.

### Retrieval

Depth is now `low`, `medium` or `high`.

**Medium** searches by meaning for 50 candidates, then applies three things that reorder them but never add to them, followed by one that does:

- **Dates.** A year or date the question names lifts any candidate carrying it. Worth 2 hits on FinanceBench, where it tells ten near-identical filings of one company apart, and *nothing at all* on papers.
- **Keywords.** BM25 over the candidates, document frequency counted across them rather than the corpus, no length penalty, only its top ten boosted. Worth 21 questions on QASPER and neutral on FinanceBench.
- **Neighbour expansion.** A returned passage brings the chunks either side of it when those are already candidates, so an answer running past a chunk boundary arrives whole. Worth 3 hits on FinanceBench and 56 on QASPER.

**High** additionally asks the loaded chat model to draft a passage that would answer the question, embeds that too, and fuses its results with the question's. The draft is embedded and discarded — its specifics are invented, so it never reaches a citation, the prompt or the user. It costs one model call and about half a second. Unlike the other signals it nominates candidates of its own, which is what lets it reach passages the question alone never did.

Both vectors go through a single pass over the index: a search is mostly the cost of parsing each shard, so searching two vectors separately would pay that twice.

The chunk catalog holds no word table any more, only dates, which removed its memory ceiling.

### Measurement

Two datasets, because everything learned from one turned out to be partly about that one.

**FinanceBench** is 150 questions over 368 filings, 88 of them scorable — the rest lose to the dataset's own PDF extraction differing from ours. Ten near-identical documents per company, half the questions needing arithmetic.

**QASPER** is 892 questions over 281 NLP papers, all scorable, because the documents are built from the same paragraphs the evidence is taken from. It is a single-document QA set used over a corpus, so 560 of its questions name no document and are unanswerable by design — which is why the harness now reports **passage accuracy**, hits as a share of the questions that returned their source document, alongside the overall rate.

Four measurement defects were found and fixed, all of which had been quietly flattering the results:

- Pool rank was the best-placed chunk of the run holding the evidence, so a chunk inherited its neighbour's rank. It is now how deep the reader must go before the evidence is all there.
- A lane at weight 0 still nominated candidates, so every run meant to measure retrieval *without* a signal had it half on.
- The drafted-answer cache was keyed by a map from question text to id, so question sets reusing a text collapsed into one entry.
- The settings recorded in a report were those configured rather than those applied, so a Medium run could read `hyde: 1` when no draft was ever made.

Two of these were caught only because a control run was supposed to reproduce an earlier number exactly and did not.

---

## Outcome

| | FinanceBench (88) | QASPER (892) |
|---|---|---|
| Legacy chunking | 8 hits | 117 hits |
| Structured | 12 | 142 |
| + dates | 14 | 142 |
| + neighbours | — | 198 |
| + keywords | — | **219** |
| + HyDE (High) | **19** | 180 |

The two corpora disagree, and the disagreements are legible. Dates matter only where near-identical documents must be told apart. Keywords identify the *document*, not the passage, so they are worthless where the document was never in doubt and valuable where choosing it is the hard part. HyDE helps only when the question is specific enough for the draft to inherit something from it, which is why it gains on filings and loses on papers.

Measured and rejected along the way: BM25 as a nominating lane, sentence-level scoring, corpus-wide idf for reranking, and the retrieval threshold, which has never cut a single passage in any run.

## Next Steps

Recall is the ceiling. Even at the best setting, 32 of 88 FinanceBench answers and 332 of 892 QASPER answers are in the top 50 at all; everything built here reorders candidates or rewrites the query, and none of it can reach an answer the vector search never returned.

- FinanceBench's 19 was measured before keyword reranking was restored, so the two are not on the same build.
- Question decomposition at an Extra High depth, for compound questions that are several lookups in one.
- Retrieval covering several documents at once, which fusion cannot currently express.
- Summarisation, still unbuilt, for questions needing every relevant passage rather than the best five.
