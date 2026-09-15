# Settings Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move set-once settings to Big RAG's global settings, replace the chat sidebar with a single Reindex choice that runs once per request, and fix all tuning values in one defaults module.

**Architecture:** A `src/settings/` folder holds the fixed defaults, CLI env parsing, a `resolveSettings` function that turns global and chat config into one `ResolvedSettings` object, and a reindex marker module that decides whether a reindex request runs. `src/config.ts` defines a global schema (5 fields) and a chat schema (Reindex select); `src/promptPreprocessor.ts` reads only `ResolvedSettings`.

**Tech Stack:** TypeScript (strict), `@lmstudio/sdk` 1.5 (`createConfigSchematics`, `withGlobalConfigSchematics`, `getGlobalPluginConfig`, `select` fields), `node:test` + `node:assert/strict`.

**Spec:** `docs/superpowers/specs/2026-09-16-settings-cleanup-design.md`

## Global Constraints

- Branch: `feature/settings-cleanup`. Never stage `.lmstudio/dev.js`. Stage explicit paths only.
- Commit messages: plain imperative sentence, blank line, then exactly `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Tests live in `src/tests/*.test.ts`; `npm test` builds and runs `dist/tests/*.test.js`. No test may require LM Studio.
- Global settings (keys unchanged from today): `documentsDirectory` "Documents Directory" (required), `vectorStoreDirectory` "Vector Store Directory" (required), `embeddingModel` "Embedding Model" (default `nomic-ai/nomic-embed-text-v1.5-GGUF`), `excludeFilenamePatterns` "Exclude filename patterns", `promptTemplate` "Prompt Template" (default `DEFAULT_PROMPT_TEMPLATE`).
- Chat setting: `reindexMode` "Reindex", select with values `off` "Off", `changed` "New & changed files", `rebuild` "Rebuild everything"; default `off`.
- Fixed defaults: retrieval limit 5, affinity threshold 0.5, chunk size 512, chunk overlap 100, max concurrent files 1, parser delay 500 ms, OCR on, structured indexing on, context compaction off.
- Env override names are unchanged: `BIG_RAG_RETRIEVAL_LIMIT`, `BIG_RAG_RETRIEVAL_THRESHOLD`, `BIG_RAG_CHUNK_SIZE`, `BIG_RAG_CHUNK_OVERLAP`, `BIG_RAG_MAX_CONCURRENT`, `BIG_RAG_PARSE_DELAY_MS`, `BIG_RAG_ENABLE_OCR`, `BIG_RAG_STRUCTURED_INDEXING`, `BIG_RAG_ENABLE_COMPACTION`. The plugin itself reads no env vars for these.
- No migration of old per-chat values. Not-configured status text: `Big RAG is not in use: set <names> in Big RAG's global settings.` where `<names>` is `Documents Directory`, `Vector Store Directory`, or `Documents Directory and Vector Store Directory`; the user message is returned unchanged.
- Marker file: `.big-rag-reindex.json` in the Vector Store Directory, `{ "mode": "changed" | "rebuild", "completedAt": "<ISO timestamp>" }`, written only after a completed run.
- Skip status text: `Reindex already done at <local time> — set Reindex to Off, then choose it again to run another.`
- No change to retrieval, chunking, parsing, or indexing behaviour.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/settings/defaults.ts` | Create | Fixed default values |
| `src/settings/cliSettings.ts` | Create | CLI indexer env parsing with defaults |
| `src/settings/resolveSettings.ts` | Create | `ResolvedSettings`, `resolveSettings`, not-configured message |
| `src/settings/reindexMarker.ts` | Create | Marker read/write/clear, `decideReindex`, `handleReindexRequest` |
| `src/config.ts` | Modify | Global schema + chat Reindex schema |
| `src/index.ts` | Modify | Register both schemas |
| `src/promptPreprocessor.ts` | Modify | Use `ResolvedSettings`, not-configured status, reindex once |
| `src/cliIndex.ts`, `src/eval/settings.ts` | Modify | Read defaults from `defaults.ts` |
| `README.md` | Modify | Configuration docs |

---

### Task 1: Fixed defaults shared by the CLI and eval

**Files:**
- Create: `src/settings/defaults.ts`
- Create: `src/settings/cliSettings.ts`
- Modify: `src/cliIndex.ts:20-39`
- Modify: `src/eval/settings.ts`
- Test: `src/tests/cliSettings.test.ts`

**Interfaces:**
- Produces:
  - `const FIXED_DEFAULTS: { readonly retrievalLimit: 5; readonly retrievalThreshold: 0.5; readonly chunkSize: 512; readonly chunkOverlap: 100; readonly maxConcurrentFiles: 1; readonly parseDelayMs: 500; readonly enableOCR: true; readonly structuredIndexing: true; readonly enableContextCompaction: false }`
  - `interface CliIndexingSettings { chunkSize: number; chunkOverlap: number; maxConcurrent: number; enableOCR: boolean; parseDelayMs: number; structuredIndexing: boolean }`
  - `function readCliIndexingSettings(env: Record<string, string | undefined>): CliIndexingSettings`

- [ ] **Step 1: Write the failing test**

Create `src/tests/cliSettings.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { readCliIndexingSettings } from "../settings/cliSettings";
import { FIXED_DEFAULTS } from "../settings/defaults";
import { readRetrievalSettings } from "../eval/settings";

test("FIXED_DEFAULTS holds the spec's fixed values", () => {
  assert.deepEqual({ ...FIXED_DEFAULTS }, {
    retrievalLimit: 5,
    retrievalThreshold: 0.5,
    chunkSize: 512,
    chunkOverlap: 100,
    maxConcurrentFiles: 1,
    parseDelayMs: 500,
    enableOCR: true,
    structuredIndexing: true,
    enableContextCompaction: false,
  });
});

test("readCliIndexingSettings uses the fixed defaults when env vars are unset", () => {
  assert.deepEqual(readCliIndexingSettings({}), {
    chunkSize: FIXED_DEFAULTS.chunkSize,
    chunkOverlap: FIXED_DEFAULTS.chunkOverlap,
    maxConcurrent: FIXED_DEFAULTS.maxConcurrentFiles,
    enableOCR: FIXED_DEFAULTS.enableOCR,
    parseDelayMs: FIXED_DEFAULTS.parseDelayMs,
    structuredIndexing: FIXED_DEFAULTS.structuredIndexing,
  });
});

test("readCliIndexingSettings reads env overrides", () => {
  assert.deepEqual(
    readCliIndexingSettings({
      BIG_RAG_CHUNK_SIZE: "1024",
      BIG_RAG_CHUNK_OVERLAP: "0",
      BIG_RAG_MAX_CONCURRENT: "4",
      BIG_RAG_ENABLE_OCR: "false",
      BIG_RAG_PARSE_DELAY_MS: "0",
      BIG_RAG_STRUCTURED_INDEXING: "FALSE",
    }),
    { chunkSize: 1024, chunkOverlap: 0, maxConcurrent: 4, enableOCR: false, parseDelayMs: 0, structuredIndexing: false },
  );
});

test("eval retrieval settings use the fixed defaults when env vars are unset", () => {
  assert.deepEqual(readRetrievalSettings({}), {
    retrievalLimit: FIXED_DEFAULTS.retrievalLimit,
    retrievalThreshold: FIXED_DEFAULTS.retrievalThreshold,
    chunkSize: FIXED_DEFAULTS.chunkSize,
    enableContextCompaction: FIXED_DEFAULTS.enableContextCompaction,
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../settings/cliSettings'`.

- [ ] **Step 3: Create `src/settings/defaults.ts`**

```ts
/**
 * Values that are not exposed as plugin settings. The plugin always uses
 * these; the CLI indexer and eval harness use them unless a BIG_RAG_* env var
 * overrides them.
 */
export const FIXED_DEFAULTS = {
  retrievalLimit: 5,
  retrievalThreshold: 0.5,
  chunkSize: 512,
  chunkOverlap: 100,
  maxConcurrentFiles: 1,
  parseDelayMs: 500,
  enableOCR: true,
  structuredIndexing: true,
  enableContextCompaction: false,
} as const;
```

- [ ] **Step 4: Create `src/settings/cliSettings.ts`**

```ts
import { FIXED_DEFAULTS } from "./defaults";

export interface CliIndexingSettings {
  chunkSize: number;
  chunkOverlap: number;
  maxConcurrent: number;
  enableOCR: boolean;
  parseDelayMs: number;
  structuredIndexing: boolean;
}

function readNumber(env: Record<string, string | undefined>, name: string, fallback: number): number {
  const raw = env[name];
  return raw ? Number(raw) : fallback;
}

function readBoolean(env: Record<string, string | undefined>, name: string, fallback: boolean): boolean {
  return (env[name] ?? String(fallback)).toLowerCase() === "true";
}

/** Indexing settings for the headless CLI: fixed defaults, overridable with BIG_RAG_* env vars. */
export function readCliIndexingSettings(env: Record<string, string | undefined>): CliIndexingSettings {
  return {
    chunkSize: readNumber(env, "BIG_RAG_CHUNK_SIZE", FIXED_DEFAULTS.chunkSize),
    chunkOverlap: readNumber(env, "BIG_RAG_CHUNK_OVERLAP", FIXED_DEFAULTS.chunkOverlap),
    maxConcurrent: readNumber(env, "BIG_RAG_MAX_CONCURRENT", FIXED_DEFAULTS.maxConcurrentFiles),
    enableOCR: readBoolean(env, "BIG_RAG_ENABLE_OCR", FIXED_DEFAULTS.enableOCR),
    parseDelayMs: readNumber(env, "BIG_RAG_PARSE_DELAY_MS", FIXED_DEFAULTS.parseDelayMs),
    structuredIndexing: readBoolean(env, "BIG_RAG_STRUCTURED_INDEXING", FIXED_DEFAULTS.structuredIndexing),
  };
}
```

- [ ] **Step 5: Use it in `src/cliIndex.ts`**

Add `import { readCliIndexingSettings } from "./settings/cliSettings";` and replace lines 20–39 (from `const chunkSize = process.env.BIG_RAG_CHUNK_SIZE` through the `structuredIndexing` declaration) with:

```ts
  const { chunkSize, chunkOverlap, maxConcurrent, enableOCR, parseDelayMs, structuredIndexing } =
    readCliIndexingSettings(process.env);
  const autoReindex =
    (process.env.BIG_RAG_FORCE_REINDEX ?? "false").toLowerCase() !== "true";
  const failureReportPath = process.env.BIG_RAG_FAILURE_REPORT_PATH;
  const excludePatterns = parseExcludePatternsFromEnv(process.env.BIG_RAG_EXCLUDE_PATTERNS);
```

- [ ] **Step 6: Use it in `src/eval/settings.ts`**

Add `import { FIXED_DEFAULTS } from "../settings/defaults";`. Change the doc comment above `readRetrievalSettings` to `/** Retrieval settings for evaluation runs. Defaults come from src/settings/defaults.ts. */` and replace the three fallbacks and the compaction default:

```ts
  const retrievalLimit = readNumber(env, "BIG_RAG_RETRIEVAL_LIMIT", FIXED_DEFAULTS.retrievalLimit);
```
```ts
  const retrievalThreshold = readNumber(env, "BIG_RAG_RETRIEVAL_THRESHOLD", FIXED_DEFAULTS.retrievalThreshold);
```
```ts
  const chunkSize = readNumber(env, "BIG_RAG_CHUNK_SIZE", FIXED_DEFAULTS.chunkSize);
```
```ts
    enableContextCompaction:
      (env.BIG_RAG_ENABLE_COMPACTION ?? String(FIXED_DEFAULTS.enableContextCompaction)).trim().toLowerCase() === "true",
```

- [ ] **Step 7: Run tests**

Run: `npx tsc --noEmit` then `npm test`
Expected: clean; PASS (all existing tests including `settings.test.ts`, plus the new file).

- [ ] **Step 8: Commit**

```bash
git add src/settings/defaults.ts src/settings/cliSettings.ts src/cliIndex.ts src/eval/settings.ts src/tests/cliSettings.test.ts
git commit -m "Share fixed setting defaults between the CLI indexer and eval harness

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Global settings, Reindex choice, and resolved settings in the preprocessor

**Files:**
- Create: `src/settings/resolveSettings.ts`
- Modify: `src/config.ts` (schemas; keep `DEFAULT_EMBEDDING_MODEL_ID`, `resolveEmbeddingModelId`, `DEFAULT_PROMPT_TEMPLATE`)
- Modify: `src/index.ts`
- Modify: `src/promptPreprocessor.ts`
- Test: `src/tests/resolveSettings.test.ts`
- Test: `src/tests/promptPreprocessorSettings.test.ts`

**Interfaces:**
- Consumes: `FIXED_DEFAULTS` (Task 1).
- Produces:
  - `type ReindexMode = "off" | "changed" | "rebuild"`
  - `interface ConfigReader { get(key: string): unknown }`
  - `interface ResolvedSettings { documentsDirectory: string; vectorStoreDirectory: string; embeddingModelId: string; excludePatterns: string[]; promptTemplate: string; reindexMode: ReindexMode; retrievalLimit: number; retrievalThreshold: number; chunkSize: number; chunkOverlap: number; maxConcurrentFiles: number; parseDelayMs: number; enableOCR: boolean; structuredIndexing: boolean; enableContextCompaction: boolean; missingRequired: string[] }`
  - `function resolveSettings(globalConfig: ConfigReader, chatConfig: ConfigReader): ResolvedSettings`
  - `function asConfigReader(config: { get: unknown }): ConfigReader`
  - `function notConfiguredMessage(missingRequired: string[]): string`
  - `src/config.ts`: `globalConfigSchematics`, `configSchematics` (chat, only `reindexMode`)

- [ ] **Step 1: Write the failing tests**

Create `src/tests/resolveSettings.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { DEFAULT_EMBEDDING_MODEL_ID, DEFAULT_PROMPT_TEMPLATE } from "../config";
import { FIXED_DEFAULTS } from "../settings/defaults";
import { notConfiguredMessage, resolveSettings, type ConfigReader } from "../settings/resolveSettings";

const reader = (values: Record<string, unknown>): ConfigReader => ({ get: (key) => values[key] });

test("resolveSettings uses global values and the chat reindex mode", () => {
  const settings = resolveSettings(
    reader({
      documentsDirectory: " /docs ",
      vectorStoreDirectory: "/db",
      embeddingModel: "my-embedder",
      excludeFilenamePatterns: "*.png\n# comment\narchive/**",
      promptTemplate: "{{rag_context}}\n{{user_query}}",
    }),
    reader({ reindexMode: "changed" }),
  );

  assert.deepEqual(settings, {
    documentsDirectory: "/docs",
    vectorStoreDirectory: "/db",
    embeddingModelId: "my-embedder",
    excludePatterns: ["*.png", "archive/**"],
    promptTemplate: "{{rag_context}}\n{{user_query}}",
    reindexMode: "changed",
    ...FIXED_DEFAULTS,
    missingRequired: [],
  });
});

test("resolveSettings reports missing directories and falls back for optional fields", () => {
  const settings = resolveSettings(
    reader({ documentsDirectory: "   ", embeddingModel: "", promptTemplate: "  " }),
    reader({}),
  );

  assert.equal(settings.documentsDirectory, "");
  assert.equal(settings.vectorStoreDirectory, "");
  assert.deepEqual(settings.missingRequired, ["Documents Directory", "Vector Store Directory"]);
  assert.equal(settings.embeddingModelId, DEFAULT_EMBEDDING_MODEL_ID);
  assert.equal(settings.promptTemplate, DEFAULT_PROMPT_TEMPLATE);
  assert.deepEqual(settings.excludePatterns, []);
  assert.equal(settings.reindexMode, "off");
});

test("resolveSettings treats unknown reindex values as off", () => {
  const settings = resolveSettings(reader({ documentsDirectory: "/d", vectorStoreDirectory: "/v" }), reader({ reindexMode: "sometimes" }));
  assert.equal(settings.reindexMode, "off");
});

test("resolveSettings ignores old per-chat tuning values", () => {
  const settings = resolveSettings(
    reader({ documentsDirectory: "/d", vectorStoreDirectory: "/v", retrievalLimit: 12, chunkSize: 2048 }),
    reader({ retrievalLimit: 12, enableContextCompaction: true }),
  );
  assert.equal(settings.retrievalLimit, FIXED_DEFAULTS.retrievalLimit);
  assert.equal(settings.chunkSize, FIXED_DEFAULTS.chunkSize);
  assert.equal(settings.enableContextCompaction, false);
});

test("notConfiguredMessage names exactly the missing settings", () => {
  assert.equal(
    notConfiguredMessage(["Documents Directory"]),
    "Big RAG is not in use: set Documents Directory in Big RAG's global settings.",
  );
  assert.equal(
    notConfiguredMessage(["Documents Directory", "Vector Store Directory"]),
    "Big RAG is not in use: set Documents Directory and Vector Store Directory in Big RAG's global settings.",
  );
});
```

Create `src/tests/promptPreprocessorSettings.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { type ChatMessage, type PromptPreprocessorController } from "@lmstudio/sdk";
import { preprocess } from "../promptPreprocessor";

test("preprocess returns the message unchanged and says what to set when directories are missing", async () => {
  const statuses: string[] = [];
  const emptyConfig = { get: (_key: string) => "" };
  const ctl = {
    getGlobalPluginConfig: () => emptyConfig,
    getPluginConfig: () => ({ get: (key: string) => (key === "reindexMode" ? "off" : undefined) }),
    createStatus: (state: { text: string }) => {
      statuses.push(state.text);
      return { setState: () => undefined };
    },
    abortSignal: new AbortController().signal,
  } as unknown as PromptPreprocessorController;
  const userMessage = { getText: () => "What happened on 8 Sep?" } as unknown as ChatMessage;

  const result = await preprocess(ctl, userMessage);

  assert.equal(result, userMessage);
  assert.deepEqual(statuses, [
    "Big RAG is not in use: set Documents Directory and Vector Store Directory in Big RAG's global settings.",
  ]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../settings/resolveSettings'`.

- [ ] **Step 3: Create `src/settings/resolveSettings.ts`**

```ts
import { DEFAULT_PROMPT_TEMPLATE, resolveEmbeddingModelId } from "../config";
import { parseExcludePatternsBlock } from "../utils/fileExcludePatterns";
import { FIXED_DEFAULTS } from "./defaults";

export type ReindexMode = "off" | "changed" | "rebuild";

/** Minimal view of LM Studio's parsed config, so tests can pass plain stubs. */
export interface ConfigReader {
  get(key: string): unknown;
}

export interface ResolvedSettings {
  documentsDirectory: string;
  vectorStoreDirectory: string;
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
  /** Required global settings that are empty, by display name. */
  missingRequired: string[];
}

/** Wraps an LM Studio ParsedConfig (whose typed get() only accepts its own keys) as a ConfigReader. */
export function asConfigReader(config: { get: unknown }): ConfigReader {
  const get = config.get as (key: string) => unknown;
  return { get: (key) => get.call(config, key) };
}

function readString(config: ConfigReader, key: string): string {
  const value = config.get(key);
  return typeof value === "string" ? value : "";
}

export function resolveSettings(globalConfig: ConfigReader, chatConfig: ConfigReader): ResolvedSettings {
  const documentsDirectory = readString(globalConfig, "documentsDirectory").trim();
  const vectorStoreDirectory = readString(globalConfig, "vectorStoreDirectory").trim();
  const missingRequired: string[] = [];
  if (!documentsDirectory) missingRequired.push("Documents Directory");
  if (!vectorStoreDirectory) missingRequired.push("Vector Store Directory");

  const promptTemplate = readString(globalConfig, "promptTemplate");
  const reindexMode = readString(chatConfig, "reindexMode");

  return {
    documentsDirectory,
    vectorStoreDirectory,
    embeddingModelId: resolveEmbeddingModelId(readString(globalConfig, "embeddingModel")),
    excludePatterns: parseExcludePatternsBlock(readString(globalConfig, "excludeFilenamePatterns")),
    promptTemplate: promptTemplate.trim() ? promptTemplate : DEFAULT_PROMPT_TEMPLATE,
    reindexMode: reindexMode === "changed" || reindexMode === "rebuild" ? reindexMode : "off",
    ...FIXED_DEFAULTS,
    missingRequired,
  };
}

export function notConfiguredMessage(missingRequired: string[]): string {
  return `Big RAG is not in use: set ${missingRequired.join(" and ")} in Big RAG's global settings.`;
}
```

- [ ] **Step 4: Replace the schemas in `src/config.ts`**

Keep lines 1–17 (`createConfigSchematics` import, `DEFAULT_EMBEDDING_MODEL_ID`, `resolveEmbeddingModelId`, `DEFAULT_PROMPT_TEMPLATE`). Replace everything from `export const configSchematics = createConfigSchematics()` to the end of the file with:

```ts
/** Set once for the plugin in LM Studio's plugin settings; not shown per chat. */
export const globalConfigSchematics = createConfigSchematics()
  .field(
    "documentsDirectory",
    "string",
    {
      displayName: "Documents Directory",
      subtitle: "Root directory containing documents to index. All subdirectories will be scanned.",
      placeholder: "/path/to/documents",
    },
    "",
  )
  .field(
    "vectorStoreDirectory",
    "string",
    {
      displayName: "Vector Store Directory",
      subtitle: "Directory where the vector database will be stored.",
      placeholder: "/path/to/vector/store",
    },
    "",
  )
  .field(
    "embeddingModel",
    "string",
    {
      displayName: "Embedding Model",
      subtitle:
        "LM Studio accepts more than one spelling for the same model—for example mixedbread-ai/mxbai-embed-large-v1 (Hub / download) or text-embedding-mxbai-embed-large-v1 (as in lms ls). Both are valid; use one value consistently for indexing and chat so it matches .big-rag-embedding.json. Reindex after changing.",
      placeholder: DEFAULT_EMBEDDING_MODEL_ID,
    },
    DEFAULT_EMBEDDING_MODEL_ID,
  )
  .field(
    "excludeFilenamePatterns",
    "string",
    {
      displayName: "Exclude filename patterns",
      subtitle:
        "Optional. One glob per line, matched against each file path relative to Documents Directory (use /). Lines starting with # are comments. Example: *.png excludes PNGs in any folder; archive/** excludes that subtree. Image files are always read with OCR, so exclude them here (e.g. *.png, *.jpg) to skip them. Does not remove chunks already in the vector store—reindex to drop old data.",
      placeholder: "*.png\n# *.jpg",
      isParagraph: true,
    },
    "",
  )
  .field(
    "promptTemplate",
    "string",
    {
      displayName: "Prompt Template",
      subtitle:
        "Supports {{rag_context}} (required) and {{user_query}} macros for customizing the final prompt.",
      placeholder: DEFAULT_PROMPT_TEMPLATE,
      isParagraph: true,
    },
    DEFAULT_PROMPT_TEMPLATE,
  )
  .build();

/** Shown in each chat's sidebar. */
export const configSchematics = createConfigSchematics()
  .field(
    "reindexMode",
    "select",
    {
      displayName: "Reindex",
      subtitle:
        "Choose a mode and send a message to reindex once. 'New & changed files' skips unchanged files; 'Rebuild everything' re-processes every file. To run another reindex, set this to Off, send a message, then choose a mode again.",
      options: [
        { value: "off", displayName: "Off" },
        { value: "changed", displayName: "New & changed files" },
        { value: "rebuild", displayName: "Rebuild everything" },
      ],
    },
    "off",
  )
  .build();
```

- [ ] **Step 5: Register both schemas in `src/index.ts`**

Change the import to `import { configSchematics, globalConfigSchematics } from "./config";` and replace the registration lines with:

```ts
  // Register the configuration schematics: global (set once) and per chat
  context.withGlobalConfigSchematics(globalConfigSchematics);
  context.withConfigSchematics(configSchematics);
```

- [ ] **Step 6: Use resolved settings in `src/promptPreprocessor.ts`**

1. Replace the import line `import { configSchematics, DEFAULT_PROMPT_TEMPLATE, resolveEmbeddingModelId } from "./config";` with:

```ts
import { configSchematics, DEFAULT_PROMPT_TEMPLATE, globalConfigSchematics } from "./config";
import { asConfigReader, notConfiguredMessage, resolveSettings } from "./settings/resolveSettings";
```

and delete the now-unused import `import { parseExcludePatternsBlock } from "./utils/fileExcludePatterns";`.

2. In `preprocess`, replace everything from `const pluginConfig = ctl.getPluginConfig(configSchematics);` through the end of the second validation block (the `if (!vectorStoreDir || vectorStoreDir === "") { ... }`) with:

```ts
  const settings = resolveSettings(
    asConfigReader(ctl.getGlobalPluginConfig(globalConfigSchematics)),
    asConfigReader(ctl.getPluginConfig(configSchematics)),
  );

  if (settings.missingRequired.length > 0) {
    const text = notConfiguredMessage(settings.missingRequired);
    console.warn(`[BigRAG] ${text}`);
    ctl.createStatus({ status: "canceled", text });
    return userMessage;
  }

  const {
    documentsDirectory: documentsDir,
    vectorStoreDirectory: vectorStoreDir,
    embeddingModelId: resolvedEmbeddingModelId,
    excludePatterns,
    retrievalLimit,
    retrievalThreshold,
    chunkSize,
    chunkOverlap,
    maxConcurrentFiles: maxConcurrent,
    parseDelayMs,
    enableOCR,
    structuredIndexing,
    enableContextCompaction,
    reindexMode,
  } = settings;
```

3. In the `maybeHandleConfigTriggeredReindex({ ... })` call, replace the two lines `reindexRequested,` and `skipPreviouslyIndexed: pluginConfig.get("manualReindex.skipPreviouslyIndexed"),` with:

```ts
      reindexRequested: reindexMode !== "off",
      skipPreviouslyIndexed: reindexMode === "changed",
```

(Task 3 replaces this call entirely; this keeps behaviour compiling in between.)

4. Replace the per-message toggle status block (from `// Log manual reindex toggle states for visibility on each chat` through its `ctl.createStatus({ status: "done", text: toggleStatusText, });`) with a log line only:

```ts
    console.info(`[BigRAG] Reindex: ${reindexMode} | Embedding model: ${resolvedEmbeddingModelId}`);
```

5. Replace `const promptTemplate = normalizePromptTemplate(pluginConfig.get("promptTemplate"));` with:

```ts
    const promptTemplate = normalizePromptTemplate(settings.promptTemplate);
```

6. Run `grep -n "pluginConfig" src/promptPreprocessor.ts` — expected: no output.

- [ ] **Step 7: Run tests**

Run: `npx tsc --noEmit` then `npm test`
Expected: clean; PASS including `resolveSettings.test.ts` and `promptPreprocessorSettings.test.ts`.

- [ ] **Step 8: Commit**

```bash
git add src/settings/resolveSettings.ts src/config.ts src/index.ts src/promptPreprocessor.ts src/tests/resolveSettings.test.ts src/tests/promptPreprocessorSettings.test.ts
git commit -m "Move set-once settings to global settings and replace the sidebar with a Reindex choice

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Run each reindex request once

**Files:**
- Create: `src/settings/reindexMarker.ts`
- Modify: `src/promptPreprocessor.ts` (reindex call and `maybeHandleConfigTriggeredReindex` / `notifyManualResetNeeded`)
- Test: `src/tests/reindexMarker.test.ts`

**Interfaces:**
- Consumes: `ReindexMode`, `ResolvedSettings` (Task 2).
- Produces:
  - `const REINDEX_MARKER_FILENAME = ".big-rag-reindex.json"`
  - `interface ReindexMarker { mode: "changed" | "rebuild"; completedAt: string }`
  - `type ReindexDecision = "run" | "skip" | "clear" | "none"`
  - `function decideReindex(mode: ReindexMode, marker: ReindexMarker | null): ReindexDecision`
  - `function readReindexMarker(vectorStoreDir: string): Promise<ReindexMarker | null>`
  - `function writeReindexMarker(vectorStoreDir: string, marker: ReindexMarker): Promise<void>`
  - `function clearReindexMarker(vectorStoreDir: string): Promise<void>`
  - `function handleReindexRequest(opts: { vectorStoreDir: string; mode: ReindexMode; run: () => Promise<boolean>; now?: () => Date }): Promise<{ decision: ReindexDecision; marker: ReindexMarker | null }>`
  - `function reindexAlreadyDoneMessage(marker: ReindexMarker): string`

- [ ] **Step 1: Write the failing test**

Create `src/tests/reindexMarker.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import {
  REINDEX_MARKER_FILENAME,
  decideReindex,
  handleReindexRequest,
  readReindexMarker,
  reindexAlreadyDoneMessage,
  writeReindexMarker,
} from "../settings/reindexMarker";

const marker = (mode: "changed" | "rebuild") => ({ mode, completedAt: "2026-09-16T08:00:00.000Z" });

async function withTempDir(fn: (dir: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-reindex-"));
  try {
    await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test("decideReindex covers every row of the decision table", () => {
  assert.equal(decideReindex("off", null), "none");
  assert.equal(decideReindex("off", marker("changed")), "clear");
  assert.equal(decideReindex("changed", null), "run");
  assert.equal(decideReindex("rebuild", null), "run");
  assert.equal(decideReindex("changed", marker("changed")), "skip");
  assert.equal(decideReindex("rebuild", marker("rebuild")), "skip");
  assert.equal(decideReindex("rebuild", marker("changed")), "run");
  assert.equal(decideReindex("changed", marker("rebuild")), "run");
});

test("marker round-trips and malformed files read as no marker", async () => {
  await withTempDir(async (dir) => {
    assert.equal(await readReindexMarker(dir), null);
    await writeReindexMarker(dir, marker("rebuild"));
    assert.deepEqual(await readReindexMarker(dir), marker("rebuild"));

    await fs.writeFile(path.join(dir, REINDEX_MARKER_FILENAME), "{not json");
    assert.equal(await readReindexMarker(dir), null);

    await fs.writeFile(path.join(dir, REINDEX_MARKER_FILENAME), JSON.stringify({ mode: "sometimes", completedAt: 5 }));
    assert.equal(await readReindexMarker(dir), null);
  });
});

test("handleReindexRequest runs once, writes the marker, then skips", async () => {
  await withTempDir(async (dir) => {
    let runs = 0;
    const run = async () => {
      runs++;
      return true;
    };
    const now = () => new Date("2026-09-16T08:00:00.000Z");

    const first = await handleReindexRequest({ vectorStoreDir: dir, mode: "changed", run, now });
    assert.equal(first.decision, "run");
    assert.deepEqual(await readReindexMarker(dir), marker("changed"));

    const second = await handleReindexRequest({ vectorStoreDir: dir, mode: "changed", run, now });
    assert.equal(second.decision, "skip");
    assert.deepEqual(second.marker, marker("changed"));
    assert.equal(runs, 1);
  });
});

test("handleReindexRequest clears the marker when Reindex is Off, so the next request runs again", async () => {
  await withTempDir(async (dir) => {
    await writeReindexMarker(dir, marker("changed"));
    const cleared = await handleReindexRequest({ vectorStoreDir: dir, mode: "off", run: async () => true });
    assert.equal(cleared.decision, "clear");
    assert.equal(await readReindexMarker(dir), null);

    let runs = 0;
    await handleReindexRequest({ vectorStoreDir: dir, mode: "changed", run: async () => ++runs > 0 });
    assert.equal(runs, 1);
  });
});

test("handleReindexRequest writes no marker when the run does not complete", async () => {
  await withTempDir(async (dir) => {
    const incomplete = await handleReindexRequest({ vectorStoreDir: dir, mode: "rebuild", run: async () => false });
    assert.equal(incomplete.decision, "run");
    assert.equal(await readReindexMarker(dir), null);

    await assert.rejects(
      handleReindexRequest({
        vectorStoreDir: dir,
        mode: "rebuild",
        run: async () => {
          throw new Error("boom");
        },
      }),
      /boom/,
    );
    assert.equal(await readReindexMarker(dir), null);
  });
});

test("reindexAlreadyDoneMessage explains how to run another reindex", () => {
  assert.match(
    reindexAlreadyDoneMessage(marker("changed")),
    /^Reindex already done at .+ — set Reindex to Off, then choose it again to run another\.$/,
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../settings/reindexMarker'`.

- [ ] **Step 3: Create `src/settings/reindexMarker.ts`**

```ts
import * as fs from "fs/promises";
import * as path from "path";
import { type ReindexMode } from "./resolveSettings";

export const REINDEX_MARKER_FILENAME = ".big-rag-reindex.json";

/** Records that a reindex request completed, so it is not repeated on every message. */
export interface ReindexMarker {
  mode: "changed" | "rebuild";
  completedAt: string;
}

export type ReindexDecision = "run" | "skip" | "clear" | "none";

function markerPath(vectorStoreDir: string): string {
  return path.join(vectorStoreDir, REINDEX_MARKER_FILENAME);
}

export function decideReindex(mode: ReindexMode, marker: ReindexMarker | null): ReindexDecision {
  if (mode === "off") return marker ? "clear" : "none";
  if (marker && marker.mode === mode) return "skip";
  return "run";
}

export async function readReindexMarker(vectorStoreDir: string): Promise<ReindexMarker | null> {
  try {
    const data = JSON.parse(await fs.readFile(markerPath(vectorStoreDir), "utf-8"));
    if ((data?.mode === "changed" || data?.mode === "rebuild") && typeof data.completedAt === "string") {
      return { mode: data.mode, completedAt: data.completedAt };
    }
    return null;
  } catch {
    return null;
  }
}

export async function writeReindexMarker(vectorStoreDir: string, marker: ReindexMarker): Promise<void> {
  await fs.writeFile(markerPath(vectorStoreDir), JSON.stringify(marker, null, 2), "utf-8");
}

export async function clearReindexMarker(vectorStoreDir: string): Promise<void> {
  try {
    await fs.rm(markerPath(vectorStoreDir), { force: true });
  } catch (error) {
    console.warn("[BigRAG] Could not clear reindex marker:", error);
  }
}

/**
 * Applies the reindex decision: runs `run` when a new request is pending and
 * records completion only when `run` resolves true.
 */
export async function handleReindexRequest(opts: {
  vectorStoreDir: string;
  mode: ReindexMode;
  run: () => Promise<boolean>;
  now?: () => Date;
}): Promise<{ decision: ReindexDecision; marker: ReindexMarker | null }> {
  const existing = await readReindexMarker(opts.vectorStoreDir);
  const decision = decideReindex(opts.mode, existing);

  if (decision === "clear") {
    await clearReindexMarker(opts.vectorStoreDir);
    return { decision, marker: null };
  }
  if (decision !== "run" || opts.mode === "off") {
    return { decision, marker: existing };
  }

  const completed = await opts.run();
  if (!completed) {
    return { decision, marker: existing };
  }

  const marker: ReindexMarker = { mode: opts.mode, completedAt: (opts.now?.() ?? new Date()).toISOString() };
  try {
    await writeReindexMarker(opts.vectorStoreDir, marker);
  } catch (error) {
    console.warn("[BigRAG] Could not write reindex marker; the next message may reindex again:", error);
  }
  return { decision, marker };
}

export function reindexAlreadyDoneMessage(marker: ReindexMarker): string {
  return `Reindex already done at ${new Date(marker.completedAt).toLocaleString()} — set Reindex to Off, then choose it again to run another.`;
}
```

- [ ] **Step 4: Run the new test**

Run: `npm test`
Expected: PASS for `reindexMarker.test.ts` (the preprocessor still compiles unchanged).

- [ ] **Step 5: Use it in `src/promptPreprocessor.ts`**

1. Add imports:

```ts
import { type ReindexMode, type ResolvedSettings } from "./settings/resolveSettings";
import { handleReindexRequest, reindexAlreadyDoneMessage } from "./settings/reindexMarker";
```

(merge `type ReindexMode, type ResolvedSettings` into the existing `./settings/resolveSettings` import line instead of adding a second one).

2. Replace the whole `await maybeHandleConfigTriggeredReindex({ ... });` call in `preprocess` with:

```ts
    await maybeHandleReindexRequest(ctl, settings, vectorStore);
```

3. Delete `interface ConfigReindexOpts`, `maybeHandleConfigTriggeredReindex`, and `notifyManualResetNeeded` (everything from `interface ConfigReindexOpts {` to the end of the file) and add in their place:

```ts
const REINDEX_MODE_LABELS: Record<Exclude<ReindexMode, "off">, string> = {
  changed: "New & changed files",
  rebuild: "Rebuild everything",
};

async function maybeHandleReindexRequest(
  ctl: PromptPreprocessorController,
  settings: ResolvedSettings,
  store: VectorStore,
): Promise<void> {
  const outcome = await handleReindexRequest({
    vectorStoreDir: settings.vectorStoreDirectory,
    mode: settings.reindexMode,
    run: () => runRequestedReindex(ctl, settings, store),
  });
  if (outcome.decision === "skip" && outcome.marker) {
    ctl.createStatus({ status: "done", text: reindexAlreadyDoneMessage(outcome.marker) });
  }
}

/** Runs the reindex the user chose. Resolves true only when the run completed. */
async function runRequestedReindex(
  ctl: PromptPreprocessorController,
  settings: ResolvedSettings,
  store: VectorStore,
): Promise<boolean> {
  const mode = settings.reindexMode;
  if (mode === "off") {
    return false;
  }
  const embeddingModelId = settings.embeddingModelId;
  const label = REINDEX_MODE_LABELS[mode];

  if (!tryStartIndexing("config-trigger")) {
    ctl.createStatus({
      status: "canceled",
      text: "A reindex is already running. Please wait for it to finish.",
    });
    return false;
  }

  const status = ctl.createStatus({
    status: "loading",
    text: `Reindex requested (${label})… (embedding model: ${embeddingModelId})`,
  });

  try {
    const { indexingResult } = await runIndexingJob({
      client: ctl.client,
      abortSignal: ctl.abortSignal,
      documentsDir: settings.documentsDirectory,
      vectorStoreDir: settings.vectorStoreDirectory,
      embeddingModelId,
      chunkSize: settings.chunkSize,
      chunkOverlap: settings.chunkOverlap,
      maxConcurrent: settings.maxConcurrentFiles,
      enableOCR: settings.enableOCR,
      structuredIndexing: settings.structuredIndexing,
      autoReindex: mode === "changed",
      parseDelayMs: settings.parseDelayMs,
      excludePatterns: settings.excludePatterns,
      forceReindex: mode === "rebuild",
      vectorStore: store,
      onProgress: (progress) => {
        if (progress.status === "scanning") {
          status.setState({
            status: "loading",
            text: `Scanning: ${progress.currentFile} (embedding model: ${embeddingModelId})`,
          });
        } else if (progress.status === "indexing") {
          const success = progress.successfulFiles ?? 0;
          const failed = progress.failedFiles ?? 0;
          const skipped = progress.skippedFiles ?? 0;
          status.setState({
            status: "loading",
            text: `Indexing: ${progress.processedFiles}/${progress.totalFiles} files ` +
              `(success=${success}, failed=${failed}, skipped=${skipped}) ` +
              `(embedding model: ${embeddingModelId}) ` +
              `(${progress.currentFile})`,
          });
        } else if (progress.status === "complete") {
          status.setState({
            status: "done",
            text: `Indexing complete: ${progress.processedFiles} files processed (embedding model: ${embeddingModelId})`,
          });
        } else if (progress.status === "error") {
          status.setState({
            status: "canceled",
            text: `Indexing error: ${progress.error}`,
          });
        }
      },
    });

    status.setState({
      status: "done",
      text: `Reindex complete (${label}). Set Reindex to Off, then choose it again to run another.`,
    });

    const summaryLines = [
      `Embedding model: ${embeddingModelId}`,
      `Processed: ${indexingResult.successfulFiles}/${indexingResult.totalFiles}`,
      `Failed: ${indexingResult.failedFiles}`,
      `Skipped (unchanged): ${indexingResult.skippedFiles}`,
      `Updated existing files: ${indexingResult.updatedFiles}`,
      `New files added: ${indexingResult.newFiles}`,
    ];
    if (indexingResult.totalFiles > 0 && indexingResult.skippedFiles === indexingResult.totalFiles) {
      summaryLines.push("All files were already up to date (skipped).");
    }
    ctl.createStatus({
      status: "done",
      text: summaryLines.join("\n"),
    });
    console.log(`[BigRAG] Reindex summary:\n  ${summaryLines.join("\n  ")}`);

    try {
      await ctl.client.system.notify({
        title: "Big RAG reindex completed",
        description: `Reindex (${label}) finished. Set Reindex to Off, then choose it again to run another.`,
      });
    } catch (error) {
      console.warn("[BigRAG] Unable to send reindex notification:", error);
    }
    return true;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    status.setState({
      status: "error",
      text: `Reindex failed: ${error instanceof Error ? error.message : String(error)}`,
    });
    console.error("[BigRAG] Reindex failed:", error);
    return false;
  } finally {
    finishIndexing();
  }
}
```

4. Run `grep -n "manualReindex\|Manual Reindex\|skipPreviouslyIndexed\|reindexRequested" src/promptPreprocessor.ts` — expected: no output.

- [ ] **Step 6: Run tests**

Run: `npx tsc --noEmit` then `npm test`
Expected: clean; PASS.

- [ ] **Step 7: Commit**

```bash
git add src/settings/reindexMarker.ts src/promptPreprocessor.ts src/tests/reindexMarker.test.ts
git commit -m "Run each reindex request once instead of on every message

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Documentation

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: setting names and behaviour from Tasks 1–3.
- Produces: nothing.

- [ ] **Step 1: Rewrite the Configuration section**

Replace everything from `## Configuration` up to (not including) `## Usage` with:

```markdown
## Configuration

Big RAG has two places for settings.

### Global Settings

Set these once in Big RAG's plugin settings in LM Studio. They apply to every chat.

- **Documents Directory** (required): Root directory containing your documents (read access required). All subdirectories are scanned.
- **Vector Store Directory** (required): Where the vector database is stored (read/write access required).
- **Embedding Model** (default: `nomic-ai/nomic-embed-text-v1.5-GGUF`): String passed to LM Studio’s embedding load API. **Both** common forms can work for the same weights—for example **`mixedbread-ai/mxbai-embed-large-v1`** (Hub / `lms get`) and **`text-embedding-mxbai-embed-large-v1`** (as shown in `lms ls`). Use **one** spelling consistently so it matches **`.big-rag-embedding.json`**. After changing the model, set **Reindex** to *Rebuild everything*; vectors from different models are not comparable in the same index.
- **Exclude filename patterns** (optional): One glob pattern per line, matched against each file's path relative to the Documents Directory (forward slashes). Lines starting with `#` are comments. Example: `*.png` excludes PNGs anywhere; `archive/**` excludes that subtree. Image files are always read with OCR, so exclude them here to skip them. Excluding a file does not remove chunks already in the vector store — reindex to drop them.
- **Prompt Template**: How retrieved passages and the user query are assembled into the final prompt. Must contain the `{{rag_context}}` and `{{user_query}}` macros — if either is missing, the plugin logs a warning and inserts it automatically. Default is a simple "use these citations if relevant" instruction followed by the user's query.

If Documents Directory or Vector Store Directory is empty, chats show "Big RAG is not in use: set … in Big RAG's global settings." and messages are sent to the model unchanged.

### Chat Sidebar: Reindex

- **Reindex** (default: *Off*): Choose *New & changed files* (skips unchanged files and files that previously failed to parse) or *Rebuild everything* (re-processes every file), then send a message. The reindex runs once; later messages show "Reindex already done at …". To run another, set Reindex to *Off*, send a message, then choose a mode again.
- **Automatic first run**: If the vector store is empty, the plugin indexes your documents the first time a message is processed.
- **Indexing lock**: Only one indexing run can be active at a time; a request made while one is running is reported and skipped.
- The "done" record is the file `.big-rag-reindex.json` in the Vector Store Directory. Because Reindex is set per chat, a message in another chat where Reindex is *Off* clears it.

### How Documents Are Indexed

- **Structured indexing**: Documents are chunked by headings, sections, and list items. Each chunk records its posted date (from the first page, then the file name, then the file's modified time) and the dates of its sections, and gets a header such as `[File: report.pdf | Posted: 2026-09-20 | Section: Incidents > 2. Bus collision | Dates: 2026-09-08]`. The header is used for search and shown to the model; citations show only the original passage.
- **OCR**: Always on. Scanned PDFs fall back to OCR when no text can be extracted, and image files (BMP/JPEG/PNG) are OCR'd.
- **`.big-rag-embedding.json`**: Written in the vector store directory when the index has at least one chunk; records the embedding model, vector length, and index format. If the configured model no longer matches, retrieval is blocked until you reindex or revert the setting. Indexes built with older plugin versions may have chunks but no manifest; retrieval still works, and a reindex creates it.
- **Index format changes**: Indexes built before structured indexing use the standard format; the plugin shows "Reindex required to apply structured indexing." until you reindex, and that reindex rebuilds every file whichever mode you choose.

### Maintainer Defaults

These values are fixed in the plugin (`src/settings/defaults.ts`). The headless CLI indexer and the evaluation harness accept the listed environment variables to override them.

| Value | Fixed default | Override |
|---|---|---|
| Retrieval limit | 5 | `BIG_RAG_RETRIEVAL_LIMIT` (eval) |
| Affinity threshold | 0.5 | `BIG_RAG_RETRIEVAL_THRESHOLD` (eval) |
| Chunk size (tokens) | 512 | `BIG_RAG_CHUNK_SIZE` |
| Chunk overlap (tokens) | 100 | `BIG_RAG_CHUNK_OVERLAP` |
| Max concurrent files | 1 | `BIG_RAG_MAX_CONCURRENT` |
| Parser delay (ms) | 500 | `BIG_RAG_PARSE_DELAY_MS` |
| OCR | on | `BIG_RAG_ENABLE_OCR` |
| Structured indexing | on | `BIG_RAG_STRUCTURED_INDEXING` |
| Context compaction | off | `BIG_RAG_ENABLE_COMPACTION` (eval) |

### Upgrading from 1.3

Settings moved out of the chat sidebar. After upgrading, enter **Documents Directory** and **Vector Store Directory** (and any custom Embedding Model, exclude patterns, or prompt template) once in Big RAG's global settings. Pointing Vector Store Directory at your existing folder keeps your existing index. Old per-chat values for retrieval limit, threshold, chunk size, overlap, concurrency, parser delay, OCR, structured indexing, and context compaction are no longer used.

```

- [ ] **Step 2: Update Usage, tips, and troubleshooting**

1. In `## Usage`, replace the four bullets under **Configure the Plugin** with:

```markdown
   - Open Big RAG's plugin settings in LM Studio (global settings)
   - Set your documents directory (e.g., `/Users/user/Documents/MyLibrary`)
   - Set your vector store directory (e.g., `/Users/user/.lmstudio/big-rag-db`)
```

2. Replace the line `- **Memory Usage**: Scales with concurrent processing (reduce `maxConcurrentFiles` if needed)` with `- **Memory Usage**: Scales with concurrent processing (the plugin processes one file at a time; the CLI accepts `BIG_RAG_MAX_CONCURRENT`)`.

3. Replace the whole numbered list under `### Optimization Tips` with:

```markdown
1. **Start Small**: Test with a subset of documents first
2. **Skip Images**: Exclude image files (e.g. `*.png`, `*.jpg`) if they don't contain useful text, since they are always OCR'd
3. **Use the CLI for Large Collections**: `npm run index:cli` can tune concurrency and chunk size through environment variables
```

4. Under `### No Results Found`, replace `- Try lowering the retrieval affinity threshold` with `- Check that the files you expect aren't matched by an exclude pattern`.

5. Replace the three bullets under `### Slow Indexing` with:

```markdown
- Exclude image files you don't need (they are always OCR'd)
- Ensure vector store directory is on a fast drive (SSD recommended)
- For very large collections, index with the CLI and `BIG_RAG_MAX_CONCURRENT`
```

6. Replace `- Reduce `maxConcurrentFiles` to 1 or 2` under `### Out of Memory` with `- When using the CLI, set `BIG_RAG_MAX_CONCURRENT` to 1 or 2`.

7. Run `grep -n "Manual Reindex Trigger\|Skip Previously Indexed\|maxConcurrentFiles\|retrievalAffinityThreshold\|Retrieval Limit\|Enable OCR\|Disable OCR" README.md` — expected: no output.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Document global settings, the Reindex choice, and maintainer defaults

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Live acceptance (user)**

1. On an existing 1.3 install, open a chat: the "Big RAG is not in use" status names the settings to fill in.
2. Fill in global settings: the status disappears and retrieval works against the existing index.
3. Set Reindex to *New & changed files*: it runs once; the next message shows "Reindex already done at …".
4. Set Reindex to *Off*, send a message, choose *New & changed files* again: it runs again.
5. The chat sidebar shows only Reindex.
