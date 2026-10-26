# Signals and Defaults

Date: 2026-10-22
Status: Completed Implementation
version: `v1.7.0`

---

## Context

Version 1.6.0 was about delivery: a passage retrieval ranks first is worth
nothing if it never reaches the model or lands where the model does not read.

This version is mostly about things that were not running. Three signals were
disabled on any collection without dates, a change of embedding model silently
invalidated the index while reporting success, and pausing an indexing run
quietly dropped a document from every later incremental run. None of these was
visible in the evaluation numbers, because the harness happens to exercise the
paths where they do not bite.

It also takes a default off rather than shipping it unmeasured.

---

## Changes Made

### The catalog gate disabled three signals

Fusion, keyword reranking and neighbour expansion all sat behind
`if (catalog)`. A catalog is built from dates extracted during indexing, so a
collection with no extractable dates built no catalog — and Medium and High
then silently collapsed to a single vector lane, which is what Low does.

On QASPER those three signals are worth 77 of 228 hits, and none of them is
about dates. The gate now reads `if (fusing)`, which is what it was always
meant to ask; only the date lane reads the catalog.

This never appeared in any measurement because both evaluation corpora carry
plenty of dates, so both build catalogs. It was found by reading the code.

### Changing the embedding model no longer corrupts the index silently

`planIndexFormat` compared the chunk format and the embedding prefix
convention, but not the model. Two models can share a convention — every
`nomic-embed` build maps to `nomic` — so switching between them skipped every
file as unchanged, rewrote the manifest with the new model's id, and left the
new model's queries scoring against the old model's vectors with nothing left
to detect it.

An existing test encoded the defect, asserting `rebuildExistingFiles: false`
for a model change. It now asserts the opposite.

### The relevance cut ships off

`passageRelevanceCut` was introduced at 0.9 and has never been measured. The
evaluation harness calls `retrieve` directly and never reaches the prompt
preprocessor, so no recorded run in `Evaluation.md` includes the cut. On QASPER
the median hit sits at rank 5, which means a cut trimming past rank 2 could cost
more than keyword reranking and neighbour expansion gained together.

It now ships at `0`, which keeps every passage retrieval returns. The trade is
deliberate and it is not free: a question with one good answer returns that
answer plus four weaker passages, and a small model can follow the wrong one.
The alternative was an unmeasured filter silently dropping correct passages,
which is worse. `dropWeakPassages` already treated a non-positive value as off,
so `0` was always a supported setting, and the code path takes effect the
moment the value is raised.

### Cancelling an indexing run no longer blacklists a document

The abort checks sit inside the per-file `try`, so stopping mid-file threw where
a parse error throws. The file was recorded in the failed-file registry as
`parser.unexpected-error` — and that registry is consulted before parsing and
keyed on path plus hash, so a later incremental run skipped a perfectly good
document, and kept skipping it until the file was edited.

Three separate `catch` blocks recorded it: the per-chunk embedding handler, the
per-file handler, and the task-level handler in `index()`. Fixing one made no
difference, because the next one caught the rethrow.

This was found in manual testing, not by reading code. A paused run produced an
index missing one document, which then answered a question confidently from the
superseded version of a file — the kind of failure nobody traces back to a
cancellation three days later.

Cancelling still **discards** the run rather than pausing it; see Known Gaps.

### Context compaction removed

`compactPassages` sentence-split each passage and dropped the sentences scoring
furthest from the query. It cost an embedding call per passage, cannot know
which sentence the model needs, and nothing measured showed it helping. The
module, its test, the setting and the two capabilities it required
(`embedSentences`, `countTokens`) are gone.

### Lanes renamed to signals

`LaneCounts` is now `SignalCounts`. Only the vector and hypothetical lanes
reach `fuseLanes` and can register a new key; keyword and date add to the scores
of keys already there. Calling all four "lanes" hid that distinction, which is
the single thing most worth understanding about this pipeline. `autoReindex`
also becomes `skipUnchangedFiles`, which is what the flag does.

### Retired index formats

`structured-v1` and `structured-v2` are removed from `IndexFormat`. Neither was
released, so nothing in the wild carries them, and the reader now treats
anything that is not the current format as legacy — which also covers a store
written by a future build.

### The installed plugin is 185 MB rather than 245 MB

`lms dev --install` copies the project folder minus git-ignored paths, so the
evaluation sets, the architecture docs, the test fixtures and the build
toolchain all landed in a folder that only ever runs one bundled file.
`scripts/prepare-install.js` now removes them and prunes dev dependencies by
lockfile, reclaiming 36 MB. It still copies the OCR language pack, which no
module imports and the bundler therefore never sees — and it copies it first,
so a failed prune cannot leave the install without it.

### Removals

`getFileMetadata`, `isIndexing` and `getResourceRecommendations` had no callers
and never had one. `vectorStore.lancedb.ts.bak` is deleted — version 1.6.0
removed the LanceDB evaluation script and its 148 MB dependency, but the backup
copy survived and shipped in every install since.

---

## Measurement

**No new measurements, and no regression.** None of the changes above should
move the recorded numbers, which is worth stating rather than implying:

- the catalog gate only altered behaviour when no catalog exists, and both
  corpora build one
- context compaction was already off in `FIXED_DEFAULTS`, so removing it
  changes nothing
- the signal rename is semantic
- the relevance cut is invisible to the harness, which is why it is off

The one change that could have moved them is the rewrite of `retrieve.ts` that
the rename and the compaction removal required. An evaluation run is the only
way to confirm that refactor was behaviour-preserving.

---

## Outcome

A user on a collection without dates gets fusion, keyword reranking and
neighbour expansion for the first time. A user who changes embedding model is
told to reindex instead of receiving quietly worse answers. A user who stops an
indexing run no longer loses a document from the index without being told.

Results are longer than in 1.6.0 — five passages where the cut would have
returned one or two — and follow-up questions are no better than they were.

---

## Known Gaps

**`passageRelevanceCut` is still unmeasured**, which is why it is off rather
than tuned. Measuring it means threading it into `eval/settings.ts` so the
harness can see it, then sweeping 0 / 0.75 / 0.9.

**Cancelling an indexing run discards its progress.** The manifest sync in
`runIndexing.ts` sits outside the `try/finally`, so an aborted run writes no
manifest. The chunks already written survive, but a store with chunks and no
manifest is refused by the retrieval check and rebuilt from scratch by the next
run. Nothing is corrupted; the work is simply repeated. Writing a manifest for a
partial run has its own risk — it would claim a complete index — so this is left
as it stands.

**No query rewriting.** A follow-up carrying no searchable words of its own,
such as *why?*, is embedded literally and retrieves badly. An implementation was
built and removed during this cycle: a drafted rewrite was unstable enough on
`gemma-4-e2b` to answer a different question from the one asked, which is worse
than retrieving poorly. Users should ask self-contained questions.

**No supersession.** A revised document does not displace the original, and both
may be returned. Presenting both and letting the model attribute them is the
honest outcome, and is what it does.

**`cliIndex.ts` has no test**, and the evaluation harness cannot see anything
implemented in the prompt preprocessor.

---

## Next Steps

1. Thread `passageRelevanceCut` into the harness and sweep it.
2. Sweep `rerankDepth`, which is a first guess at 10 and has never been varied.
3. Decide whether an aborted run should record a partial manifest.
4. Cover `cliIndex.ts`.
