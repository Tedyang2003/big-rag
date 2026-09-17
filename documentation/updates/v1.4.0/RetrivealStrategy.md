# Retrieval Strategy Improvement

Date: 2026-09-16
Status: Completed Implementation, Pending Evaluation
version: `v1.4.0`

---

## Context
As indicated in the update documentation for version 1.2.0, the second milestone is the retrieval strategy. Up to this version, retrieval used a single lane: the question was embedded and compared against every chunk using cosine similarity, and the five closest chunks were given to the model.

Vector search is good at matching meaning, but it is weak in exactly the places our users are most precise

- Names, identifiers and report numbers
- Rare or technical terms
- Dates

A passage that literally contains the term a user asked about can lose to one that is only vaguely similar. Version 1.3.0 gave every chunk its dates and section, but nothing at query time made use of them. This version adds that.

---

## New Pipeline

<!-- DIAGRAM PLACEHOLDER: replace the image below with the v1.5.0 retrieval pipeline -->
![Hybrid Retrieval Pipeline](../../images/HybridRetrievalPipeline.png)

The diagram should show the following components, in order

- User Query
- Query Embedding and Query Date Reading
- Vector Lane (Vector Database)
- Keyword Lane (BM25 over the Chunk Catalog)
- Date Lane (Chunk Catalog day table)
- Weight Adjusted Reciprocal Rank Fusion
- Winning Chunks fetched from the Vector Database
- Overlap Trimming
- Prompt Formatting and Citations

---

## Changes Made

### Retrieval Depth
Users now choose a single setting, Retrieval Depth, rather than tuning retrieval parameters themselves.

- Low, searches by meaning only, the same as earlier versions
- Medium (default), searches by meaning, by keyword and by date, then merges the results

Neither level makes any extra model calls, so Medium adds only a few milliseconds per question. Higher levels that do use the model, such as query rewriting and reranking, are planned for later versions.

### Chunk Catalog
Keyword and date search need their own lookup tables, which the vector database does not provide. Rather than changing how documents are indexed, which would require every user to reindex again, we build a catalog from the chunks already stored. It holds

- A word table, recording which chunks contain each word and how often
- A day table, recording which chunks carry each date, from both their posted date and their section dates

The catalog never stores the text of a chunk, only numbers, and it is rebuilt automatically when the number of chunks in the index changes. On very large indexes, above 50,000 chunks, the word table is skipped to keep memory use bounded, and the plugin tells the user.

### Keyword Lane (BM25)
The question is broken into words, common words such as "the" and "of" are removed, and simple word endings are trimmed so that "collisions" matches "collision". Chunks are then scored with Okapi BM25, which favours rare words over common ones and does not reward a chunk simply for being long.

### Date Lane
If the question names a date or a period, the chunks carrying those dates are ranked by their keyword score. The lane understands

- Written dates, such as `8 Sep 2026` or `Q3 2026`
- Relative phrases, such as today, yesterday, last week, this month or the past 3 days
- Dates without a year, such as `8 Sep`, which match that day in every year present in the index, most recent first

If no date is found, the lane is skipped.

### Weight Adjusted Reciprocal Rank Fusion
Each lane produces its own ranked list of up to 30 chunks, and the lists are merged by position rather than by score. A chunk's fused score is

```
score = Σ weight(lane) / (60 + rank in that lane)
```

A chunk that ranks well in several lanes rises to the top, while a chunk that only one lane found can still get through. A date never excludes a chunk, it only adds a vote. All three lanes currently carry an equal weight of 1. The weights are kept adjustable for maintainers, so that any future change to them is decided by evaluation rather than intuition.

Only the winning chunks are read back from the vector database, and overlapping passages are trimmed as before.

### Status and Citations
Users can now see how each passage was found. The status line reports how many passages each lane contributed, for example "Retrieved 5 relevant passages (meaning 3, keywords 4, dates 2)", and each citation is labelled with its position and the lanes that found it, such as `match #1 via meaning, keywords`. This replaces the fused score, which is only meaningful relative to the other passages in the same answer.

---

## Settings Simplification (v1.4.0)
In preparation for this version, version 1.4.0 addressed the unrecorded setting changes described in version 1.2.0. Settings that are set once, such as the documents and vector database folders, were moved into the plugin's global settings, and all tuning parameters were fixed as maintainer defaults. The chat sidebar was reduced to two choices, Reindex and Retrieval Depth, so users choose a behaviour instead of tuning numbers.

---

## Outcome and Next Steps
This version gives retrieval three independent ways to find a passage, without asking users to tune anything and without extra model calls. Its effect is measured by comparing a structured index searched at Low depth against the same index searched at Medium depth, using the same question set.

It does not solve questions that need every relevant passage rather than the best five, such as summarising a full day of reports. That limit is set by the model's context window rather than by retrieval, and is addressed by the summarisation work planned next. The remaining planned retrieval improvements are

- Query rewriting and document reranking using the LLM (High depth)
- A search tool the model can call to look for more information when the retrieved passages are not enough
- Sub agent and whole document retrieval (Extra High depth)
