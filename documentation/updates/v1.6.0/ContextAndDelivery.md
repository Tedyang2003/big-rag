# Context and Delivery

Date: 2026-10-07
Status: Completed Implementation, Measured on Two Datasets
version: `v1.6.0`

---

## Context

Version 1.5.0 was about finding the right passage, and it found a lot more of them: FinanceBench went from 8 hits to 19, QASPER from 117 to 219.

This version is about the step after that. A passage that retrieval ranks first is worth nothing if it never reaches the model, arrives buried among passages about something else, or sits in a part of the prompt the model does not attend to. Every change here was prompted by a question that failed in LM Studio while the evaluation harness reported it as a hit — which is its own finding, since it means the harness measures retrieval and not delivery.

It also fixes a defect that made the previous release's headline feature unreachable.

---

## Changes Made

### High depth was never running

`resolveSettings` mapped any depth that was not `low` to `medium`, so selecting **High** in the settings panel gave Medium. The hypothetical-answer drafting that version 1.5.0 was built around therefore never ran for any user of the plugin — only in the evaluation harness, which reads the depth from the environment and does not go through that function.

The depth test covered `low`, `medium`, an empty value and an invalid one, and never `high`, which is why the line read as correct for a fortnight.

### Retrieval gets a share of the window, not the remainder

The context budget used to be measured as the whole conversation plus the new passages against the model's window. In a long chat the conversation alone fills it, so passages were dropped one by one until the status line read *Sent 0 of 8 passages* and retrieval had silently switched itself off while appearing to work.

Passages now get a fixed share of the window — `ragContextShare`, 0.6 — measured on the returned message alone. The host already trims whole earlier turns to make room and never truncates what a preprocessor returns, so history is its cost to manage. The number of passages a question gets no longer depends on how long the conversation has been running.

At least one passage is always sent. Retrieval that quietly sends nothing lets the model answer from whatever earlier turns happen to hold, which reads like success and is not.

### Passages are labelled with the question they belong to

Whatever a prompt preprocessor returns becomes the user's message and stays in the conversation forever, so by the third question the model is looking at three sets of citations, and the oldest is often the largest. Asked *"what does Shao Yang like"*, the model returned a summary of a company discussed two questions earlier.

Each set now opens by naming its own question, and the default prompt template says that passages earlier in the conversation belong to earlier questions.

### Weak passages are dropped instead of padding the result

Retrieval fills its quota of five whether or not five passages are relevant. On a small collection that means one good answer followed by page footers, advertisements and OCR noise, and a model reasonably concludes the answer is not there.

A passage is now kept only if its similarity is at least `passageRelevanceCut` — 0.9 — of the best match's, with the top passage never dropped. The bar is relative rather than absolute because embedding similarities have no fixed meaning: Nomic places entirely unrelated text around 0.5, which is why the long-standing 0.5 threshold has never cut a single passage in any measured run.

The status line reports the cut rather than hiding it: *Kept 2 of 8 passages, the rest well below the best match*.

### The best passage sits next to the question

Passages are now ordered weakest first, so the highest-ranked one lands immediately above the question. Asked for a Sapporo itinerary, the model described the last passage it was given and never mentioned the first, which was the itinerary.

### Neighbours arrive in document order

Neighbour expansion emitted the matched chunk and then stepped outward, so an anchor at chunk 5 arrived as 5, 4, 6 and the model read a passage before the text it continues from. Nothing downstream re-sorted them, so that was the order sent. They are now emitted ascending.

### The log shows the prompt that was sent

Prompt size is reported in tokens against the budget rather than in characters, where 9,720 characters read like an overflow of an 8,192-token window and was really about 2,400 tokens. The debug log now carries the real prompt; the abbreviated preview, which cut every passage to 400 characters, is still printed but labelled as not what was sent.

### LanceDB removed

A script evaluating LanceDB as an alternative vector store was left in the test directory. LanceDB was never adopted — the store is vectra — and the script was not a test, since the test runner globs `*.test.js`, so it compiled on every build and ran never. Deleting it left `@lancedb/lancedb` with no importer anywhere, removing 148MB of dependency. `noUnusedLocals` and `noUnusedParameters` are now on so the next one fails the build.

---

## Measurement

No retrieval default changed in this version, but two settings that shipped in 1.5.0 were measured properly for the first time, and one conclusion reversed.

### Keyword reranking and HyDE belong together

The QASPER column labelled *+ HyDE* had been run before keyword reranking was restored, so the two had never been switched on at once while the results table presented them as one sequence. Run together they give **228 hits, the best figure measured on either corpus** — against 219 for keyword reranking alone and 180 for HyDE alone.

They fit because each repairs the other's one weakness. Document-finding is the only thing HyDE loses, 324 to 281, and the only thing BM25 improves, 324 to 356; with both on it reaches 357. So *HyDE hurts QASPER*, recorded in the last release, was an artefact of measuring it with BM25 switched off.

Every signal in this project had been attributed by setting one lane weight to zero at a time. That measures contributions and says nothing about interactions. This was the first pair measured together and it changed an answer.

### BM25's length penalty, confirmed on the second corpus

`bm25B` is 0, which makes the scorer BM15 rather than BM25, and had only ever been tuned on FinanceBench. On QASPER `b = 0.75` gives 224 hits against 228, with document-finding, passage accuracy, rank 1 and mean reciprocal rank all slightly worse.

The reason is not that chunks are a uniform length — they are not, the shortest 5% running 58 to 64 terms against a median of 230 to 251. It is that the distribution is **bounded above and open below**: the chunker's 512-token cap puts the longest chunk under 1.7 times the mean, so there is no long document for length normalisation to penalise, and all a length penalty can still do is reward the short tail. On these corpora that tail is section headings, page footers, split table fragments and boilerplate.

---

## Outcome

| | FinanceBench (88) | QASPER (892) |
|---|---|---|
| Legacy chunking | 8 hits | 117 hits |
| Structured | 12 | 142 |
| + dates | 14 | 142 |
| + neighbours | 16 | 198 |
| + keywords | 16 | 219 |
| + HyDE, keywords off | **19** | 180 |
| + HyDE, all on | not run | **228** |

Retrieval itself is unchanged from 1.5.0; the 228 is a configuration that existed then and had not been run. FinanceBench's last column still has not been measured with keyword reranking and HyDE together.

---

## Known Gaps

`passageRelevanceCut` ships at 0.9 and **has not been measured**. The evaluation harness calls retrieval directly and never sees it, so no run in this document includes it. On QASPER the median hit sits at rank 5, so a cut that routinely trims past rank 2 could cost more than keyword reranking and neighbour expansion gained together. Measuring it means threading the cut into the harness, which is the next piece of work.

A contextless follow-up still triggers a fresh search. Asked *"why?"*, the plugin embeds the literal word and retrieves ten unrelated passages, because the relevance cut compares each candidate to the best one and never asks whether the best one is any good. The model then answers from whichever earlier turn is largest.

`compactPassages` exists behind `enableContextCompaction`, off by default, and has never been measured.

---

## Next Steps

Recall remains the ceiling. At the best setting 32 of 88 FinanceBench answers and 332 of 892 QASPER answers are in the top 50 at all, and everything built across the last two versions reorders candidates, rewrites the query or changes what is delivered — none of it reaches an answer the vector search never returned.

- Measure the relevance cut, then the context compaction that has waited two versions.
- Skip retrieval for a follow-up with no content words of its own, and reuse the previous turn's passages.
- Rewrite a follow-up against the conversation, which would handle the ones that do have content words but still depend on context.
- Measure the remaining untested lane pairs. Dates and keywords are both document-level signals and have never been run together in isolation.
