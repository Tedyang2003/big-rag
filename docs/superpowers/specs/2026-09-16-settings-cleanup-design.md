# Settings Cleanup — Design

Date: 2026-09-16
Status: Approved design, pending spec review

## Context

Big RAG shows 15 settings in each chat's sidebar: setup paths, indexing internals, retrieval tuning, experimental toggles, and the manual reindex controls. Most are set once or are maintainer tuning that end users should not have to understand, and several silently require a reindex when changed. Upcoming work (hybrid retrieval with depth levels) would add more. This project reduces what users see before that work starts.

It also fixes a bug found during the audit: the Manual Reindex Trigger description says "The plugin resets this after running", but plugins cannot change their own settings, so while the trigger is on, every chat message starts another reindex.

Project order:

1. **Settings cleanup** (this spec)
2. Hybrid retrieval with a Retrieval Depth setting (BM25, date lane, RRF, query rewriting, reranking)
3. Date/period summarization
4. Coverage evaluation

## Goals

- Show end users only what they need: set-once setup in global settings, one per-chat action.
- Keep maintainer tuning available through one defaults module and existing env vars.
- Make a reindex request run once instead of on every message.
- Let existing users upgrade without losing their configured directories.
- No change to retrieval or indexing behaviour.

## Non-Goals

- Retrieval Depth (project 2).
- Removing the context compaction code.
- Changing any retrieval, chunking, or parsing behaviour.

## Settings Layout

### Global settings

Registered with `withGlobalConfigSchematics` and read with `ctl.getGlobalPluginConfig`. Set once for the plugin, not shown per chat.

| Setting | Type | Default | Notes |
|---|---|---|---|
| Documents Directory | string | `""` | Required |
| Vector Store Directory | string | `""` | Required |
| Embedding Model | string | `nomic-ai/nomic-embed-text-v1.5-GGUF` | Description keeps the existing spelling guidance and says to reindex after changing |
| Exclude filename patterns | string (paragraph) | `""` | Description adds: image files are always OCR'd; exclude them with patterns such as `*.png` |
| Prompt Template | string (paragraph) | existing `DEFAULT_PROMPT_TEMPLATE` | Unchanged |

### Chat sidebar

Registered with `withConfigSchematics` (per chat).

| Setting | Type | Values | Default |
|---|---|---|---|
| Reindex | select | `off` "Off", `changed` "New & changed files", `rebuild` "Rebuild everything" | `off` |

### Fixed defaults

Removed from the UI. Defined once in `src/settings/defaults.ts`; the plugin, `src/cliIndex.ts`, and `src/eval/settings.ts` import them. Env var names stay as they are today.

| Value | Fixed at | Override (CLI / eval only) |
|---|---|---|
| Retrieval limit | 5 | `BIG_RAG_RETRIEVAL_LIMIT` (eval) |
| Affinity threshold | 0.5 | `BIG_RAG_RETRIEVAL_THRESHOLD` (eval) |
| Chunk size | 512 | `BIG_RAG_CHUNK_SIZE` |
| Chunk overlap | 100 | `BIG_RAG_CHUNK_OVERLAP` |
| Max concurrent files | 1 | `BIG_RAG_MAX_CONCURRENT` |
| Parser delay | 500 ms | `BIG_RAG_PARSE_DELAY_MS` |
| OCR | on | `BIG_RAG_ENABLE_OCR` |
| Structured indexing | on | `BIG_RAG_STRUCTURED_INDEXING` |
| Context compaction | off (code kept, unused by the plugin) | `BIG_RAG_ENABLE_COMPACTION` (eval) |

The plugin itself does not read env vars for these; only the CLI indexer and eval harness do.

## Resolving Settings

`src/settings/resolveSettings.ts` exports `resolveSettings(globalConfig, chatConfig, legacyConfig)` returning:

```ts
type ReindexMode = "off" | "changed" | "rebuild";

interface ResolvedSettings {
  documentsDirectory: string;      // "" when not configured
  vectorStoreDirectory: string;    // "" when not configured
  embeddingModelId: string;
  excludePatterns: string[];
  promptTemplate: string;
  reindexMode: ReindexMode;
  retrievalLimit: number;
  retrievalThreshold: number;
  chunkSize: number;
  chunkOverlap: number;
  maxConcurrentFiles: number;
  parseDelayMs: number;
  enableOCR: boolean;
  structuredIndexing: boolean;
  enableContextCompaction: boolean;
  /** Moved fields whose value came from the old per-chat settings. */
  legacyFieldsUsed: string[];
}
```

The three config arguments are objects with a `get(key)` method, so tests can pass stubs. `src/promptPreprocessor.ts` calls `resolveSettings` once per message and reads nothing from config directly. Project 2 adds its depth setting here.

### Upgrade fallback (one release)

- For each moved field (Documents Directory, Vector Store Directory, Embedding Model, Exclude filename patterns, Prompt Template): use the global value when it is non-empty.
- Otherwise read the old per-chat key through `legacyConfigSchematics`, a schema holding the old keys (`documentsDirectory`, `vectorStoreDirectory`, `embeddingModel`, `excludeFilenamePatterns`, `promptTemplate`) that is never registered with the plugin context. If it returns a non-empty value, use it and add the field name to `legacyFieldsUsed`.
- If reading legacy values throws or returns nothing, use the global default.
- When `legacyFieldsUsed` is non-empty, the preprocessor shows one status: "Big RAG settings moved: copy <field names> into Big RAG's global settings. Old per-chat values are used for now."
- When the Documents Directory or Vector Store Directory is still empty, the preprocessor shows "Set Documents Directory and Vector Store Directory in Big RAG's global settings." and skips retrieval for that message, matching today's behaviour for empty directories.
- Old per-chat values for removed tuning settings are ignored.
- Whether LM Studio still supplies stored values for keys absent from the registered schema is verified during live acceptance. If it does not, the fallback simply finds nothing and the "set directories" status applies.
- The fallback is removed in the following release; the release notes say so.

## Reindex Once Per Request

### Marker

A file `.big-rag-reindex.json` in the Vector Store Directory: `{ "mode": "changed" | "rebuild", "completedAt": "<ISO timestamp>" }`.

### Decision

A pure function `decideReindex(mode: ReindexMode, marker: ReindexMarker | null): "run" | "skip" | "clear" | "none"`:

| Reindex setting | Marker | Decision |
|---|---|---|
| Off | none | `none` |
| Off | present | `clear` (delete marker) |
| changed / rebuild | none | `run` |
| changed / rebuild | same mode | `skip` |
| changed / rebuild | different mode | `run` |

### Behaviour

- `run`: start the reindex with the existing flow. `changed` skips unchanged files; `rebuild` forces every file. The marker is written only after the run completes successfully; a failed or aborted run writes nothing, so the next message tries again.
- `skip`: status "Reindex already done at <local time> — set Reindex to Off, then choose it again to run another."
- `clear`: delete the marker silently.
- Unchanged: the indexing lock, automatic first-run indexing of an empty store, and rebuild-everything on an index format change.
- The misleading "resets after running" description, reminder status, and system notification text are replaced with text describing the behaviour above.

### Known edge case

The Reindex setting is per chat but the marker belongs to the index. If one chat has Reindex on and another has it Off, a message in the second chat clears the marker, and the next message in the first chat reindexes again. Accepted: rare, and visible through the status line.

## Error Handling

| Situation | Behaviour |
|---|---|
| Directories not configured (global or legacy) | Status asks to set them in global settings; retrieval skipped |
| Legacy values used | One status naming the fields to copy |
| Legacy read throws | Treated as no legacy value |
| Marker file unreadable or malformed | Treated as no marker (reindex runs); marker rewritten after success |
| Marker write fails | Warning logged; reindex result unaffected (next message may run again) |

## Testing

Unit tests, no LM Studio required:

- `resolveSettings`: global wins; legacy used when global empty, and listed in `legacyFieldsUsed`; missing directories resolve to `""`; fixed defaults always match `defaults.ts`; old tuning keys ignored; legacy `get` throwing is tolerated.
- `decideReindex`: every row of the decision table.
- Marker I/O: read/write round trip; malformed file reads as null; the marker is written only after a completed run (the reindex runner is faked).
- Defaults: CLI and eval settings with no env vars resolve to the `defaults.ts` values.
- Existing tests that build config objects or reference removed fields are updated; retrieval, chunker, and parser tests are unchanged.

### Live acceptance

1. On an existing 1.3 install, open a chat: note whether old per-chat directories are picked up with the "settings moved" status.
2. Fill in global settings: the status disappears and retrieval works.
3. Set Reindex to New & changed files: it runs once; the next message shows "already done".
4. Set Reindex to Off, send a message, choose it again: it runs again.
5. The chat sidebar shows only Reindex.

## Documentation and Release

- README configuration section rewritten around global settings and the Reindex choice, plus a "Maintainer defaults" table (value, fixed default, env override) and an "Upgrading from 1.3" note.
- Minor release 1.4.0; release notes explain the move to global settings and that the per-chat fallback will be removed in the next release.
