# HyDE at a High Retrieval Depth

Date: 2026-09-28
Status: Implemented and measured 28 September 2026 — 16 hits against Medium's 14, pool 32 against 26

## Problem

A question written in English sits far from a grid of numbers. Of the 88 scorable FinanceBench
questions, 41 have their evidence in a financial statement, and only 9 of those 41 have it
anywhere in the top 50 candidates. For the other 32, no amount of re-ranking can help: the
answer is never a candidate at all.

Two attempts to close that gap by examining the candidates more carefully have been measured and
rejected. Keyword scoring was tried four ways and never beat the date boost, and has been
removed. Sentence-level scoring — ranking a candidate by its best sentence or table row instead
of its whole-chunk embedding — is actively harmful, taking top-5 from 15 to 10 overall and, on
the statement questions it was meant to serve, from 3 to 0. The unit is too small, not too
large: `Capital expenditures — 2018: 1,577` is short and mostly numeric and embeds badly against
a sentence of English.

What did work, measured without touching the retrieval path, is changing the question instead.

| Configuration | In pool | Top 5 | Median | MRR | Better / worse |
|---|---|---|---|---|---|
| Question alone | 31 | 15 | 7 | 0.119 | — |
| Hypothetical, `search_query:` | 31 | 13 | 8 | 0.123 | 17 / 13 |
| Hypothetical, `search_document:` | 26 | 11 | 9 | 0.088 | 14 / 22 |
| **Question + hypothetical, fused** | **34** | **16** | 8 | **0.129** | **20 / 9** |

Concentrated where the problem is:

| | Statements (41) | | Other (47) | |
|---|---|---|---|---|
| | Question | + HyDE | Question | + HyDE |
| In pool | 9 | **11** | 22 | 23 |
| Top 5 | 3 | **5** | **12** | 11 |
| Median rank | 24 | **8** | **5** | 8 |

Generation costs a median 542ms with `gemma-4-e2b-it`.

## Goals

- Raise recall on questions whose wording shares little with their evidence.
- Keep the cost opt-in, and keep Medium exactly as it is today.
- Never let generated text reach the user, the citation, or the model's context.
- Fail back to Medium rather than failing the query.

## Non-goals

- No new dependency, no network call, no second model to configure.
- No change to indexing, chunking, or the catalog.
- No question decomposition. That is a separate technique for a separate depth.
- No attempt to make the hypothetical factually right. It is embedded and discarded.

## Section 1: What High Is

High is Medium plus a hypothetical. Same 50 candidates from the vector lane, same date boost,
same fusion constant. The only addition: before searching, ask the loaded chat model for a
passage that would answer the question; search on that as well; fuse the two rankings.

`retrievalDepth` gains `"high"` in `src/config.ts` beside Low and Medium, and
`BIG_RAG_RETRIEVAL_DEPTH` accepts it. `RetrievalDepth` becomes `"low" | "medium" | "high"`.

Low remains meaning only. Medium remains meaning plus dates, with no model call. Only High
calls a model, and only when the user selects it.

## Section 2: Generating the Hypothetical

The generator is `ctl.client.llm.model()` — whatever the user already has loaded. No setting, no
load, no second model resident on an edge device. In the evaluation harness it is the same model
`eval:generate` uses, honouring `BIG_RAG_EVAL_LLM`.

The prompt is the one the spike measured, deliberately domain-neutral so it does not assume
filings:

> Write a short passage, two or three sentences, that would plausibly appear in a document
> containing the answer to the question below. Write it as the document itself would be written,
> using the terms, labels and figures such a passage would contain. Do not address the reader, do
> not explain, and do not say whether you know the answer. Invented specifics are fine.
>
> Question: {question}
>
> Passage:

A new module, `src/retrieval/hypothetical.ts`, owns the prompt and the call, so the eval harness
and the plugin cannot drift apart:

```ts
export interface HypotheticalDeps {
  generate: (prompt: string) => Promise<string>;
  timeoutMs: number;
  abortSignal?: AbortSignal;
}

/** The hypothetical answer for a question, or null when one could not be produced. */
export function hypotheticalFor(question: string, deps: HypotheticalDeps): Promise<string | null>;
```

`retrieve` does not call the model itself. `RetrieveDeps` gains an optional
`hypothetical?: (question: string) => Promise<string | null>`, which the plugin and the eval
harness each supply — the plugin wiring it to `hypotheticalFor`, the harness wiring it to the
cache. At High, `retrieve` awaits it inside a new `"hypothetical"` timing stage so its cost shows
in the same latency table as every other stage; at Low and Medium it is never called. When the
dep is absent, High behaves as Medium.

`hypotheticalFor` returns `null` — never throws — when generation fails, is aborted, exceeds `timeoutMs`, or
comes back empty or whitespace. High then behaves exactly as Medium for that query. The timeout
defaults to 10s against a measured 542ms, so it bounds a pathological model rather than trimming
a normal one.

**The generated text is embedded and discarded.** It is hallucinated by construction — the spike
produced `Synapse Dynamics | FY2023 | 450` for a question about real acquisitions — so it must
never appear in a passage, a citation, the prompt, or a status line. Only its vector leaves the
module.

## Section 3: One Search, Two Vectors

`openShard` deliberately does not cache for reads: vectra holds a shard's whole parsed
`index.json`, vectors included, for the life of a `LocalIndex`, so caching every shard would make
the entire index permanently resident. The 5-second search is the price of keeping it off-heap,
which is the right trade on an edge device.

The consequence is that most of those 5 seconds is parse, not scan — so two searches would pay
the parse twice. Instead, `VectorStore` gains:

```ts
/**
 * Search several query vectors in one pass. Each shard is parsed once and queried once per
 * vector, so N vectors cost one parse rather than N. Returns one result list per query vector,
 * in the order given.
 */
async searchMany(
  queryVectors: number[][],
  limit: number = 5,
  threshold: number = 0.5,
): Promise<SearchResult[][]>
```

Per shard: construct the `LocalIndex` once, call `queryItems` once per vector against that same
instance, accumulate per vector, then drop the instance as today. `search()` becomes a one-line
call into `searchMany` so there is a single scan path that cannot drift.

Memory behaviour is unchanged: nothing is retained past the call.

## Section 4: Fusing

The hypothetical is a **nominating lane**, not a boost — the opposite of the ruling made for
keywords and dates, and for a measured reason. Its value is recall: it brought three questions
into the pool that the question alone never reached, two of them statements. A boost cannot do
that, because a boost only moves what another lane already found.

```
lanes = [
  { name: "vector", weight: laneWeightVector, keys: questionResults },
  { name: "hyde",   weight: laneWeightHyde,   keys: hypotheticalResults },
]
```

Fused with the existing weighted RRF at constant 60, after which the date boost applies to the
fused ranking exactly as it does today. `laneCounts` and `passageLanes` gain `hyde`, so reports
and citations attribute it like any other signal.

When the hypothetical is null, the lane is absent and the result is identical to Medium.

## Section 5: Settings

| Setting | Default | Where |
|---|---|---|
| `retrievalDepth` | `medium` | plugin select, `BIG_RAG_RETRIEVAL_DEPTH` |
| `laneWeightHyde` | 1 | `FIXED_DEFAULTS`, `BIG_RAG_LANE_WEIGHT_HYDE` |
| `hypotheticalTimeoutMs` | 10000 | `FIXED_DEFAULTS`, `BIG_RAG_HYPOTHETICAL_TIMEOUT_MS` |

`laneWeightHyde` exists so a run can zero it and reproduce Medium exactly, which is how the
signal will be attributed.

The plugin's `retrievalDepth` subtitle gains a sentence for High, naming the cost plainly: it
asks the loaded model to draft a likely answer before searching, which adds roughly half a second
and one model call per message.

## Section 6: The Evaluation Harness

Hypotheticals are cached to `eval/hypotheticals.json`, keyed by question id and recording the
generating model:

```json
{ "model": "gemma-4-e2b-it", "generated": "2026-09-28T…", "byQuestion": { "financebench_id_01198": "…" } }
```

A run at High reuses the cache when its `model` matches the generator in use, generating and
appending only for questions missing from `byQuestion`. When the model differs the cache is
rewritten from scratch, since hypotheticals from two models are not a comparable set.
`BIG_RAG_REGENERATE_HYPOTHETICALS=true` forces a rewrite regardless.

Without this, every High run re-rolls a non-deterministic generator and two runs of the same
configuration are not comparable — the harness would be measuring the model's variance rather
than the retrieval change. It also saves 88 × 542ms per run.

The run report records the generator model and how many hypotheticals were cache hits.

## Section 7: Testing and Measurement

**`hypotheticalFor`:**
- returns the generated text for a normal response
- returns null when the generator throws, when it returns empty or whitespace, and when it
  exceeds the timeout
- passes the abort signal through, and returns null rather than throwing when aborted

**`searchMany`:**
- returns one result list per query vector, in order
- each list is thresholded and limited independently
- one query vector gives exactly what `search` gave before
- opens each shard once for N vectors (asserted with a counting fake)

**`retrieve` at High:**
- fuses the question's and the hypothetical's results, and reports `hyde` in `passageLanes`
- a null hypothetical produces a result identical to Medium's
- `laneWeightHyde: 0` produces a result identical to Medium's
- the hypothetical's text never appears in a returned passage
- the date boost still applies to the fused ranking

**Measurement.** A High run against `eval/vdbs/structured`, compared with Medium's 14 hits, MRR
0.140, 9 answers at rank 1. Expect +1 to +3 hits, and watch the statement subset in particular,
where the spike moved median rank from 24 to 8. `BIG_RAG_LANE_WEIGHT_HYDE=0` at High must
reproduce Medium exactly; that is the harness check.

The spike measured HyDE without the date boost. How much of its gain survives beside a signal
that already fixes wrong-document failures is the open question this run answers.

## Risks

- **The gain may not survive the date boost.** Both fix document selection to some degree. The
  measurement will say; if the gain disappears, High ships off or not at all.
- **Some of the gain was bought by the table work.** Asked for a passage, a 2B model writes a
  markdown table, which matches chunks that now contain `cell | cell` rows. On a corpus without
  tables the effect may be smaller.
- **Quality depends on a model the plugin does not choose.** A very small or very literal model
  may produce a paraphrase of the question, which adds nothing. This fails safe — the fused
  ranking is then close to the question's own — but it means High's value varies by setup.

## Files Touched

- `src/retrieval/hypothetical.ts`: new; the prompt, the call, the timeout, the null contract
- `src/vectorstore/vectorStore.ts`: `searchMany`, with `search` delegating to it
- `src/retrieval/retrieve.ts`: the High branch, the hyde lane, lane counts
- `src/config.ts`: the High option and its subtitle
- `src/settings/defaults.ts`, `src/settings/resolveSettings.ts`, `src/eval/settings.ts`: the two
  new settings and their environment overrides
- `src/promptPreprocessor.ts`: generate at High, status text, citation labels
- `src/evalCli.ts`, `src/eval/hypotheticalCache.ts` (new): caching and the report fields
- `documentation/UserGuide.md`, `documentation/CLI.md`, `documentation/Development.md`,
  `documentation/Evaluation.md`, `README.md`
- Tests under `src/tests/`
