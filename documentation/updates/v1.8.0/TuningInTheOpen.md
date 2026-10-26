# Tuning in the Open

Date: 2026-10-22
Status: Completed Implementation
version: `v1.8.0`

---

## Context

Retrieval has twenty-two values that decide how it behaves, and until now every one of them was a
constant in `src/settings/defaults.ts`. Fifteen of those change nothing about the stored index:
they decide how many passages come back, how the searches are weighted against each other, how
deep keyword reranking goes. Trying a different value against a real conversation meant editing
the source and rebuilding.

The evaluation harness reads them from `BIG_RAG_*` environment variables, which is why they were
measurable but not usable. 1.7.0 made that gap awkward: it shipped `passageRelevanceCut` at 0
*because* it was unmeasured, which leaves a value nobody can try without a checkout.

---

## Changes Made

### Fifteen retrieval settings are configurable again

They sit at the bottom of the global settings page behind one checkbox, **Show advanced retrieval
settings**: passages returned, similarity floor, relevance cut, context share, candidates per
search, neighbouring chunks, keyword rerank depth, rank fusion constant, BM25 `k1` and `b`, the
four search weights, and the drafted-answer timeout.

Each declares bounds the panel enforces, and a value outside them falls back to its default
rather than throwing — a stored config can hold anything, and refusing to answer over a bad
number would be worse than ignoring it. The evaluation harness still throws on an invalid
environment variable, because there a silently substituted value would corrupt a measurement.

### The checkbox decides whether they apply, not just whether they show

Turning it off restores every default. Hiding the fields while still applying them would leave a
tidy panel running a value nobody can see, which is the worst case for settings whose effect is
already hard to attribute.

### What is deliberately not configurable

`chunkSize`, `chunkOverlap`, `structuredIndexing` and `enableOCR` decide the shape of the stored
index: changing one makes existing vectors incomparable and forces a full rebuild.
`maxConcurrentFiles` and `parseDelayMs` only affect indexing throughput. `catalogVersion` is a
data format version, not a knob. None of those belongs in a panel a user can nudge.

Settings moved out of the chat sidebar in 1.4 because most of them are set once and forgotten.
That reasoning still holds for those seven.

---

## Implementation

One table in `src/settings/advancedRetrieval.ts` holds each field's key, label, description and
bounds. `config.ts` builds the settings panel from it and `resolveSettings` reads the values from
it, so a field cannot exist in the panel without being read, and a renamed key fails to compile
rather than silently reverting to its default. The key type is a union of literal strings that
must also be keys of `FIXED_DEFAULTS`, which is what ties a panel field to the constant it
defaults to.

That matters because the alternative fails quietly. `ConfigReader.get` takes any string, so a
field read from the wrong config — the chat's rather than the global one — would compile, render
and sit at its default forever. That is the shape of the defect that kept High depth unreachable
for a fortnight in 1.5.0, so two tests assert the panel and the reader agree.

`FIXED_DEFAULTS` is unchanged and remains the single source of fallback truth: every field
defaults to its constant, and an unticked checkbox resolves to all of them.

---

## Outcome

`passageRelevanceCut` can now be tried without a checkout, which is the measurement 1.7.0 said
it wanted. So can `rerankDepth`, a first guess at 10 that has never been swept.

Comparison is sequential rather than side by side: these are global, so trying two values means
changing one, asking, and changing it back. Per-chat placement would have allowed two
conversations at different settings, at the cost of there being two places to look when an answer
surprises you.

---

## Known Gaps

**Nothing here is measured.** Exposing a value is not the same as knowing what it should be. The
harness still cannot see the prompt preprocessor, so `passageRelevanceCut` and `ragContextShare`
remain unmeasurable by it however convenient they now are to change.

**A value set in the panel does not reach the harness**, and one set in the environment does not
reach a chat. The bounds agree, but the two paths are separate.

---

## Next Steps

1. Sweep `rerankDepth` and `passageRelevanceCut` now that both are reachable.
2. Thread the relevance cut into the harness, which is the only way to measure it properly.
