# RAG Evaluation Harness — Design

Date: 2026-09-15
Status: Approved design, pending spec review

## Context

Users report that answers from Big RAG are missing information, but there are no concrete failing examples and no way to measure retrieval quality. Several improvements are planned (embedding prefixes, structure-preserving recursive chunking, contextual chunk headers, parent/child chunks, BM25, HyDE, RRF, reranking, adaptive cutoffs). Without measurement, each of these would be tuned by eyeballing answers, which tends to overfit to whoever did the tuning and gives end users no way to know information is missing.

This is the first of three projects:

1. **Evaluation harness** (this spec)
2. Index-time improvements (prefixes, recursive chunking, contextual headers, parent/child mapping)
3. Query-time retrieval pipeline (BM25, HyDE, RRF, reranking, adaptive cutoffs)

Per-stage on/off toggles and timings are built into projects 2 and 3. This harness produces the baseline they are measured against.

## Goals

- Generate a reviewable set of test questions from the user's own indexed documents.
- Measure retrieval quality (not answer quality) deterministically and repeatably.
- Distinguish "search can't find the answer" from "search found it but filtering dropped it."
- Make runs comparable over time by recording the exact settings used.
- Evaluate the same retrieval code users actually run.

## Non-Goals

- End-to-end answer grading with an LLM judge (noisy, slow; possible follow-up).
- Questions whose answer requires multiple passages (scoring rules needed; follow-up).
- Any change to retrieval behavior or results in the plugin.
- Exposing tuning parameters to end users.

## Components

### `src/retrieval/retrieve.ts` (new)

The shared retrieval pipeline, extracted from `preprocess()` in `src/promptPreprocessor.ts`.

- **Input:** query text; dependencies (`VectorStore`, embedding model handle); options (retrieval limit, affinity threshold, chunk size, context compaction on/off, optional diagnostic pool size).
- **Output:**
  - `passages`: the final passages handed to the model (after search, overlap trimming, and compaction/budget filling when enabled).
  - `diagnosticPool`: when a diagnostic pool size is given, the top-N vector matches with no threshold applied, in rank order.
  - `timings`: one entry per stage (query embedding, vector search, overlap trimming, compaction), in milliseconds.
- Contains no LM Studio controller usage, status messages, citations, or prompt text.

### `src/promptPreprocessor.ts` (refactored)

Calls `retrieve()` instead of performing retrieval inline. Status messages, citations, prompt building, and the context-overflow warning remain here. **No behavior change:** for the same query and configuration, the same passages are produced and passed to citations and the prompt.

### `src/vectorstore/vectorStore.ts` (small addition)

A method to list indexed chunks (text, file path, chunk index, metadata) across all shards, used for sampling. Existing iteration in `getStats`/`getFileHashInventory` shows the pattern.

### `src/eval/generateQuestions.ts` (new)

Samples chunks, prompts the LLM, validates results, writes a candidates file.

### `src/eval/matchSnippet.ts` (new)

Decides whether a passage contains an expected answer snippet, tolerant of whitespace, case, and punctuation differences. Used both to validate generated snippets and to score retrieval.

### `src/eval/runEval.ts` (new)

Loads a question set, calls `retrieve()` per question, scores hits, aggregates metrics, writes a report.

### `src/evalCli.ts` (new)

CLI entry following the `src/cliIndex.ts` pattern (own `LMStudioClient`, `BIG_RAG_*` env vars). Subcommands `generate` and `run`, exposed as `npm run eval:generate` and `npm run eval:run`.

### `eval/` (new, gitignored)

Candidate files, the reviewed question set, and run reports. Contains verbatim excerpts from the user's documents and must never be committed.

## Question Generation

### Flow

1. Open the vector store. If it is missing or empty, exit with a message to run indexing first.
2. Resolve the generation model: `BIG_RAG_EVAL_LLM` if set, otherwise the LLM currently loaded in LM Studio. If none is available or LM Studio is unreachable, exit with a clear error before sampling.
3. List indexed chunks and skip chunks under 40 words, which are too short to contain a meaningful fact.
4. Sample chunks **evenly across source files** so large documents don't dominate. Count from `BIG_RAG_EVAL_COUNT` (default 30); selection is deterministic for a given `BIG_RAG_EVAL_SEED`.
5. For each sampled chunk, request a question and answer snippet using **LM Studio structured output** constrained to a JSON schema (exact SDK option confirmed during planning). The prompt requires:
   - `answerSnippet`: copied word for word from the chunk, one or two sentences.
   - `question`: phrased as someone who has not read the document would ask it, without reusing the chunk's distinctive wording.
6. Validate:
   - The snippet is found in the chunk text via `matchSnippet`.
   - **Wording-leak check:** the fraction of the question's meaningful (non-stopword, case-insensitive) words that appear in the chunk must be at most the leak limit: `BIG_RAG_EVAL_LEAK_LIMIT`, default 0.7, range 0–1, where 1 disables the check. Questions that copy the chunk's phrasing inflate every retrieval method's score and are rejected. The limit used is recorded in the question file as `generator.leakLimit`. (Revised 2026-09-15: originally a fixed 0.5, which rejected 18 of 30 candidates on the first real run.)
7. A failed candidate (invalid output, snippet not found, wording leak) gets one retry, then is dropped. Drops are counted by reason.
8. Before writing, verify via `git check-ignore` that the output path is ignored. If it is not, refuse to write and explain why.
9. Write `eval/candidates-<timestamp>.json` (never overwrites an existing file) and print a summary: generated count, dropped count by reason, questions per file.

The default model for the target setup is `unsloth/gemma-4-E2B-it-GGUF` (Q4_K_M), a small model. Structured output and the wording-leak check exist specifically because small models are unreliable at strict JSON and at avoiding copied phrasing. A high rejection rate is the signal to set `BIG_RAG_EVAL_LLM` to a larger model for this one-off step.

### Review

The user opens the candidates file, deletes questions that are vague, trivial, incorrect, or answerable without the documents, and saves the result as `eval/questions.json`. Whatever remains in the file is the set; there are no per-entry approval flags. With a small generator, expect to delete a meaningful share of candidates.

### File Format

```json
{
  "version": 1,
  "generatedAt": "2026-09-15T10:00:00Z",
  "generator": { "model": "unsloth/gemma-4-E2B-it-GGUF", "seed": 42 },
  "questions": [
    {
      "id": "q-001",
      "question": "How much did membership grow year over year?",
      "sourceFile": "research/SOFI Technologies Thesis.md",
      "answerSnippet": "Total members: 15.8M, +35% YoY"
    }
  ]
}
```

- `sourceFile` is relative to the documents directory.
- Ground truth is file plus snippet, **not chunk ID**, so the set remains valid after reindexing with different chunking (required for projects 2 and 3).

## Running the Evaluation

### Flow

1. Load `eval/questions.json`, or the path in `BIG_RAG_EVAL_FILE`. Validate structure; report malformed entries by ID. If the file is missing, point to `eval:generate` and the review step.
2. Check the configured embedding model against the index manifest using `checkEmbeddingModelForRetrieval`. On mismatch, exit with a clear error.
3. Read retrieval settings from env vars with the same defaults as `src/config.ts`: `BIG_RAG_RETRIEVAL_LIMIT`, `BIG_RAG_RETRIEVAL_THRESHOLD`, `BIG_RAG_CHUNK_SIZE`, `BIG_RAG_ENABLE_COMPACTION`. The CLI cannot read plugin settings from LM Studio's UI; if the plugin uses non-default values, the user sets these env vars to match.
4. For each question, call `retrieve()` with those settings and a diagnostic pool size of 50.
5. If the question's source file is no longer present in the index, mark it **unscorable**, exclude it from rates, and list it in the report.
6. Score:
   - A passage is a **hit** if it comes from the question's source file and `matchSnippet` finds the answer snippet in it.
   - If trimming or compaction removed the answer sentence from a passage, that is a miss.

### Metrics

- **Final hit rate:** answer present in the passages the model sees. Headline number.
- **Pool hit rate:** answer present anywhere in the diagnostic pool (top 50, no threshold).
- **Filter loss:** found in the pool but absent from final passages. Separates search failures from filtering failures.
- **Right file, wrong passage:** final passages include the source file but not the answer.
- **Rank of the answer** in the diagnostic pool: median rank and mean reciprocal rank.
- **Per-stage latency:** median and 95th percentile per stage from `retrieve()` timings.

### Output

- Console summary table of the metrics.
- `eval/reports/run-<timestamp>.json` containing:
  - Aggregate metrics.
  - Per-question results: hit/miss, pool rank, files of final passages, unscorable flag.
  - A snapshot of every retrieval setting and the index manifest used, so runs can be compared and differences explained.

## Error Handling Summary

| Situation | Behavior |
|---|---|
| `eval/` not gitignored | `generate` refuses to write |
| Empty or missing index | Exit, instruct to run indexing |
| Generation model unavailable | Exit before sampling |
| Invalid candidate | One retry, then drop and count by reason |
| Question file missing | Exit, point to `generate` + review |
| Malformed question entry | Exit, report entry ID |
| Embedding model mismatch | Exit with manifest check message |
| Source file no longer indexed | Mark unscorable, exclude from rates, list in report |

## Testing

Unit tests run without LM Studio, using fakes for the vector store, embedding model, and LLM.

- **`retrieve()`:** stage order, threshold and limit respected, compaction only when enabled, diagnostic pool ignores threshold, a timing recorded per stage.
- **`matchSnippet`:** tolerates whitespace/case/punctuation differences; no match on unrelated text.
- **Wording-leak check:** flags copied phrasing, passes paraphrases.
- **Sampling:** even spread across files; same seed yields the same selection.
- **Metrics:** fixed fake results produce exact expected hit rates, filter loss, and ranks.
- **End to end:** `generate` and `run` against fake dependencies, including the unscorable-question and gitignore-refusal paths.

### Live Acceptance

1. After the `retrieve()` refactor, confirm in LM Studio that retrieval results and citations are unchanged.
2. Run `eval:generate` on the real documents, review, save `eval/questions.json`.
3. Run `eval:run`. The resulting report is the baseline for projects 2 and 3.
