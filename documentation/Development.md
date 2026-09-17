# Development

How Big RAG is put together, where the code lives, and how to build and test it.

## Architecture

A message passes through two pipelines. **Indexing** turns the documents folder into a searchable store, and runs automatically on an empty store, when the Reindex setting asks for it, or from the command line. **Retrieval** runs on every chat message and turns the question into cited passages in the prompt.

### Indexing Pipeline

1. **Scan.** `ingestion/fileScanner.ts` walks the documents folder, keeps supported file types and applies exclude patterns before anything is parsed.
2. **Parse.** `parsers/documentParser.ts` routes each file to its parser, and every parser emits the same Markdown structure through the helpers in `parsers/markdown/`.
3. **Chunk.** `chunking/sections.ts` splits the Markdown into sections, and `chunking/structuredChunker.ts` packs or splits them to the token budget and adds each chunk's header. Dates come from `metadata/dates.ts`.
4. **Embed and store.** `ingestion/indexManager.ts` embeds the chunks and writes them to `vectorstore/vectorStore.ts`, skipping unchanged files by hash and previously failed files through the failed-file registry.

`ingestion/runIndexing.ts` is the shared entry point for the plugin and `cliIndex.ts`.

### Retrieval Pipeline

1. **Settings.** `settings/resolveSettings.ts` merges global settings, chat settings and the fixed defaults into one object.
2. **Search.** `retrieval/retrieve.ts` runs the vector search, and at Medium depth also the keyword lane (`retrieval/bm25.ts`) and the date lane (`retrieval/queryDates.ts`) over the catalog (`retrieval/chunkCatalog.ts`, managed by `retrieval/catalogManager.ts`).
3. **Fuse.** `retrieval/fuse.ts` merges the lanes with weighted reciprocal rank fusion, and only the winning chunks are read back from the store.
4. **Prompt.** `promptPreprocessor.ts` trims overlapping passages, renders each one with its header (`retrieval/renderPassage.ts`), fills the prompt template, adds citations and reports status.

### Components

#### Vector Store

`vectorstore/vectorStore.ts` wraps Vectra with shards of 10,000 chunks. Writes and deletes go through one cached instance per shard so a stale copy can never write deleted items back; cached shards are released when an indexing run ends.

#### Chunk Catalog

`retrieval/chunkCatalog.ts` is a derived index of the store, saved as `.big-rag-catalog.json`: a word table for BM25 and a day table for dates, keyed by an internal chunk number, with no chunk text. It is rebuilt when the store's chunk count changes and skips the word table above 50,000 chunks.

#### Index Manifest

`utils/embeddingIndexManifest.ts` records the embedding model, vector length and index format in `.big-rag-embedding.json`, so retrieval can refuse an index built with a different model and prompt a rebuild when the format changes.

#### Settings

`config.ts` defines the global and chat settings shown in LM Studio. `settings/defaults.ts` holds every fixed value, shared by the plugin, `settings/cliSettings.ts` and the evaluation harness.

#### Evaluation Harness

`evalCli.ts` and `eval/` generate question sets from indexed chunks, run them through the same `retrieve()` the plugin uses, and write reports with hit rates, ranks and per-stage timings. See [Evaluation](Evaluation.md).

## Project Structure

```
big-rag/
├── src/
│   ├── index.ts                  Plugin entry point
│   ├── config.ts                 Settings shown in LM Studio
│   ├── promptPreprocessor.ts     Per-message indexing, retrieval, prompt and citations
│   ├── cliIndex.ts               Command-line indexer
│   ├── evalCli.ts                Evaluation commands
│   ├── settings/                 Resolved settings, fixed defaults, CLI settings
│   ├── ingestion/                File scanning, indexing orchestration, shared job runner
│   ├── parsers/                  One parser per format, plus markdown/ normalization helpers
│   ├── chunking/                 Section building and structured chunking
│   ├── metadata/                 Date extraction
│   ├── retrieval/                retrieve(), BM25, fusion, query dates, catalog
│   ├── vectorstore/              Sharded Vectra store
│   ├── eval/                     Question generation, scoring, reports
│   ├── utils/                    Manifest, hashing, locks, exclude patterns, sanity checks
│   └── tests/                    node:test suites
├── documentation/                Guides, evaluation and update notes
├── test-fixtures/                Sample documents used by the tests
├── manifest.json                 LM Studio plugin manifest
└── package.json
```

## Scripts

| Command | What it does |
|---|---|
| `npm run build` | Compiles TypeScript and bundles the plugin |
| `npm run dev` | Runs the plugin in LM Studio's development mode |
| `npm run install-plugin` | Installs the plugin into LM Studio |
| `npm test` | Builds, then runs every test in `dist/tests` |
| `npm run index:cli` | Indexes from the command line (build first) |
| `npm run eval:generate` / `npm run eval:run` | Builds, then generates questions or runs an evaluation |

## Testing

```powershell
npm test
```

The suite uses Node's built-in test runner and needs no running LM Studio: parsers run against the samples in `test-fixtures/`, and retrieval, indexing and evaluation are tested with fake embedding models and stores. For a manual end-to-end check, point the plugin at a small folder of documents, send a question, and confirm the status lines and citations in LM Studio.

## Contributing

Big RAG is built on the LM Studio plugin SDK. See [lmstudio-js](https://github.com/lmstudio-ai/lmstudio-js), the [LM Studio documentation](https://lmstudio.ai/docs) and the LM Studio [Discord](https://discord.gg/6Q7Xn6MRVS).
