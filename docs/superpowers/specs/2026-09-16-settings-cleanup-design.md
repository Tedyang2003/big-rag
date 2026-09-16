# Settings Cleanup — Design

Date: 2026-09-16
Status: Approved design, pending spec review

## Context

Big RAG shows 15 settings in each chat's sidebar: setup paths, indexing internals, retrieval tuning, experimental toggles, and the manual reindex controls. Most are set once or are maintainer tuning that end users should not have to understand, and several silently require a reindex when changed. Upcoming work (hybrid retrieval with depth levels) would add more. This project reduces what users see before that work starts.

It also fixes a bug found during the audit: the Manual Reindex Trigger description says "The plugin resets this after running", but plugins cannot change their own settings, so while the trigger is on, every chat message starts another reindex.

Project order:

1. **Settings cleanup** (this spec)
2. Hybrid retrieval with a Retrieval Depth setting (BM25, date lane, RRF, query rewriting, reranking)
3. Re-query tool: automatic retrieval stays the default on every message, and the plugin also offers a `search_documents(query, file?, dates?)` tool so the model can search again when the injected passages aren't enough (skips passages already shown, capped calls per message)
4. Date/period summarization (revisit scope after project 3)
5. Coverage evaluation

## Goals

- Show end users only what they need: set-once setup in global settings, one per-chat action.
- Keep maintainer tuning available through one defaults module and existing env vars.
- Make each Reindex mode mean exactly what it says, with no hidden state.
- Tell users plainly when Big RAG is not configured, and exactly what to set.
- No change to retrieval or indexing behaviour.

## Non-Goals

- Retrieval Depth (project 2).
- Removing the context compaction code.
- Changing any retrieval, chunking, or parsing behaviour.
- Migrating old per-chat setting values. After upgrading, users enter their settings once in global settings.

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
| Reindex | select | `off` "No reindex", `changed` "Always index new & changed files", `rebuild` "Always rebuild everything" | `off` |

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

`src/settings/resolveSettings.ts` exports `resolveSettings(globalConfig, chatConfig)` returning:

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
  /** Required global settings that are empty, by display name (e.g. "Documents Directory"). */
  missingRequired: string[];
}
```

The two config arguments are objects with a `get(key)` method, so tests can pass stubs. Empty or whitespace-only strings count as not set; optional fields that are empty fall back to their defaults. `src/promptPreprocessor.ts` calls `resolveSettings` once per message and reads nothing from config directly. Project 2 adds its depth setting here.

### Not configured

- No values are migrated from the old per-chat settings; after upgrading, global settings start at their defaults and old per-chat values are ignored.
- When `missingRequired` is non-empty, the preprocessor shows one status naming exactly what to set, for example: "Big RAG is not in use: set Documents Directory and Vector Store Directory in Big RAG's global settings." It then returns the user's message unchanged (no retrieval, no indexing, no reindex handling), as today when directories are empty.

## Reindex Modes

The Reindex setting is standing behaviour, not a one-shot request: the plugin acts on whatever mode is selected, on every message.

- `off`: nothing is indexed.
- `changed`: index new and changed files (unchanged files and previously failed files are skipped).
- `rebuild`: re-parse and re-embed every file. This runs on every message while selected, which can be slow on large collections; the setting's description and the README say to switch back to `No reindex` when it has finished.

Unchanged: the indexing lock (a request while a run is active is reported and skipped), automatic first-run indexing of an empty store, and rebuild-everything on an index format change. An aborted run is reported as cancelled. The misleading "resets after running" description, reminder status, and system notification text are replaced with text describing the behaviour above.

## Error Handling

| Situation | Behaviour |
|---|---|
| Required global settings empty | Status "Big RAG is not in use: set <names> in Big RAG's global settings."; message passed through unchanged |
| Reindex aborted mid-run | Status "Reindex cancelled."; the indexing lock is released and the next message reindexes again |

## Testing

Unit tests, no LM Studio required:

- `resolveSettings`: global values used; empty or whitespace-only directories resolve to `""` and are listed in `missingRequired` by display name; empty optional fields fall back to defaults; fixed defaults always match `defaults.ts`; reindex mode read from the chat config.
- Preprocessor not-configured path: with a directory missing, the status names the missing settings and the message is returned unchanged (controller faked).
- Defaults: CLI and eval settings with no env vars resolve to the `defaults.ts` values.
- Existing tests that build config objects or reference removed fields are updated; retrieval, chunker, and parser tests are unchanged.

### Live acceptance

1. On an existing 1.3 install, open a chat: the "Big RAG is not in use" status names the settings to fill in.
2. Fill in global settings: the status disappears and retrieval works against the existing index.
3. Select Always index new & changed files: each message indexes new or changed files (a run with nothing to do reports all files skipped).
4. Select No reindex: messages no longer index anything.
5. The chat sidebar shows only Reindex.

## Documentation and Release

- README configuration section rewritten around global settings and the Reindex choice, plus a "Maintainer defaults" table (value, fixed default, env override) and an "Upgrading from 1.3" note.
- Minor release 1.4.0; release notes explain the move to global settings and that users must enter their directories (and any custom embedding model, exclude patterns, or prompt template) once in global settings after upgrading. Pointing Vector Store Directory at the existing folder keeps the existing index.
