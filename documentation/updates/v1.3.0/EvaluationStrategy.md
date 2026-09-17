# Evaluation Strategy

Date: 2026-09-15
Status: Completed Implementation
version: `v1.3.0`

---

## Context
As indicated in the update documentation for version 1.2.0, one of the main risks of improving our pipeline is over tuning to whatever documents we happen to test with. Before this version, the only way to judge a change was to ask a few questions in LM Studio and see if the answers looked better. This is slow, it cannot be repeated exactly, and it tends to favour whoever did the testing.

Before changing any part of the pipeline, we needed a way to measure it objectively, so that every later version could be compared against the same baseline. The evaluation harness was built first for this reason, and the version of the pipeline it first measured is kept as the `eval-baseline` tag.

---

## Evaluation Pipeline

<!-- DIAGRAM PLACEHOLDER: replace the image below with the evaluation harness pipeline -->
![Evaluation Pipeline](../../images/EvaluationPipeline.png)

The diagram should show the following components, in order

- Indexed Documents (Vector Database)
- Chunk Sampler
- Question Generator (LLM)
- Candidate Validation (snippet check and wording leak check)
- Manual Review
- Question Set
- Retrieval (the same pipeline the plugin uses)
- Scoring
- Report

---

## What We Measure
The harness measures retrieval, not answer quality. It checks whether the passage that answers a question actually reaches the model, rather than grading what the model writes. This keeps the results deterministic and separates retrieval problems from model problems.

### Ground Truth
Each question is stored with its source file and an exact answer snippet copied from that file. We deliberately do not store which chunk the answer came from. Chunks change whenever chunking changes, but the file and the answer text do not, so the same question set can be used to compare a legacy index with a structured one.

A passage counts as a hit if it comes from the right file and contains the answer snippet, ignoring differences in spacing, capitalisation and punctuation.

### Metrics
Every run reports the following

- Final hit rate, whether the answer reached the model at all. This is the headline number
- Pool hit rate, whether the answer was anywhere in the top 50 search results
- Filter loss, answers that were found in the top 50 but cut before reaching the model
- Right file, wrong passage, where the correct document was retrieved but not the part containing the answer
- Median rank and mean reciprocal rank, how high the answer ranked
- Latency for each stage of retrieval

Separating the pool hit rate from the final hit rate tells us where a failure happens. If the answer is not in the pool, the problem lies in indexing or embeddings. If it is in the pool but not in the final passages, the problem lies in ranking or filtering.

---

## Question Sets

### Generated Questions
Questions can be generated from any indexed documents. Chunks are sampled evenly across files, so large documents do not dominate, and a language model writes a question and copies an answer snippet for each one. Every candidate is checked before it is kept

- The answer snippet must actually exist in the chunk
- The question must not copy too much of the chunk's wording (by default, no more than 70% of its meaningful words)

The second check matters because a question that repeats the document's phrasing makes any retrieval method look better than it is. Candidates are then reviewed by hand, removing any that are vague, wrong or answerable without the documents.

### FinanceBench
For a shared, public benchmark, we also use FinanceBench, a set of questions about publicly traded companies with answers and evidence taken from their financial filings. Using a public dataset means results can be compared and reproduced without sharing any of our users' documents.

---

## Keeping Runs Comparable
A comparison is only meaningful if a single thing changes between runs. For this reason

- Every change to how documents are processed gets its own index folder
- The same question set is used for every configuration being compared
- Each report records every setting and the index manifest used, so any difference in results can be traced to a difference in configuration
- Evaluation files are kept out of version control when they contain excerpts from private documents

The details of running an evaluation, and the configurations tested so far, are described in the Evaluation document.
