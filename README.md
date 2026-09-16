# Big RAG Plugin for LM Studio

A powerful RAG (Retrieval-Augmented Generation) plugin for LM Studio that can index and search through gigabytes or even terabytes (not tested) of document data. This is a custom update of [ari99/lm_studio_big_rag_plugin](https://github.com/ari99/lm_studio_big_rag_plugin). Hosted here: [Tedyang2003/big-rag](https://github.com/Tedyang2003/big-rag) on GitHub.

## Features

- **Massive Scale**: Designed to handle large document collections (GB to TB scale)
- **Deep Directory Scanning**: Recursively scans all subdirectories
- **Multiple File Formats**: Supports HTM, HTML, XHTML, PDF, EPUB, DOCX, PPTX, TXT, TEXT, Markdown variants (MD/MDX/MKDN), BMP, JPEG, PNG
- **Table-Aware DOCX/PPTX Parsing**: Table row/column structure is preserved (one line per row, cells joined with `|`) instead of flattening cells into indistinguishable paragraphs; PPTX slide order and speaker notes follow the presentation's actual relationship graph, not filename numbering
- **Resilient PDF Parsing**: Three-stage fallback pipeline per PDF — LM Studio's built-in document parser, then `pdf-parse`, then MuPDF-rendered page images run through Tesseract OCR — so scanned/blueprint-style PDFs still get indexed
- **OCR Support**: OCR for image files, and as a fallback for scanned PDFs, using Tesseract (always on; exclude image files you don't need)
- **Configurable File Exclusion**: Skip files by glob pattern (e.g. `*.png`, `archive/**`) without touching your document tree
- **Customizable Prompt Template**: Control how retrieved passages and the user query are assembled into the final prompt via `{{rag_context}}` / `{{user_query}}` macros
- **Pre-Indexing Sanity Checks**: Verifies directory access, disk space, and free memory before a large indexing run and estimates its size/time
- **Resilient Indexing**: An indexing lock prevents overlapping runs, and a per-file failure registry skips files that previously failed so incremental reindexes don't keep retrying broken documents
- **Headless CLI Indexing**: Index a document set from the command line (`npm run index:cli`) without needing an LM Studio chat session
- **Vector Search**: Uses Vectra with sharded indexes for efficient vector storage and retrieval (avoids single-file size limits)
- **Incremental Indexing**: Automatically detects and skips already-indexed files
- **Concurrent Processing**: Configurable concurrency for the headless CLI indexer (`BIG_RAG_MAX_CONCURRENT`); the plugin processes one file at a time
- **Persistent Storage**: Vector embeddings are stored locally and persist across sessions

## Supported File Types

- **Documents**: PDF, EPUB, DOCX, PPTX, TXT, TEXT
- **Markdown**: MD, MDX, Markdown, MDown, MKD, MKDN
- **Web Content**: HTM, HTML, XHTML
- **Images** (with OCR): BMP, JPEG, JPG, PNG
- **Archives**: RAR (planned - currently not implemented)

Note: embedded images inside DOCX/PPTX files are extracted (bytes only) but not yet captioned or OCR'd — that pipeline is scaffolded (`src/parsers/embeddedImages.ts`) but not wired up to a vision model yet.

## Installation

1. Navigate to the plugin directory:
```bash
cd big-rag-plugin
```

2. Install dependencies:
```bash
npm install
```

3. Build the plugin:
```bash
npm run build
```

4. Run in development mode:
```bash
npm run dev
```

## Configuration

Big RAG has two places for settings.

### Global Settings

Set these once in Big RAG’s plugin settings in LM Studio. They apply to every chat.

- **Documents Directory** (required): Root directory containing your documents (read access required). All subdirectories are scanned.
- **Vector Store Directory** (required): Where the vector database is stored (read/write access required).
- **Embedding Model** (default: `nomic-ai/nomic-embed-text-v1.5-GGUF`): String passed to LM Studio’s embedding load API. **Both** common forms can work for the same weights—for example **`mixedbread-ai/mxbai-embed-large-v1`** (Hub / `lms get`) and **`text-embedding-mxbai-embed-large-v1`** (as shown in `lms ls`). Use **one** spelling consistently so it matches **`.big-rag-embedding.json`**. After changing the model, set **Reindex** to *Rebuild everything*; vectors from different models are not comparable in the same index.
- **Exclude filename patterns** (optional): One glob pattern per line to skip files, matched against each path relative to the Documents Directory (forward slashes), e.g. `*.png` or `archive/**`; lines starting with `#` are comments. Images are always OCR'd, so exclude them here if you don't need them. Files already indexed stay until you rebuild the index.
- **Prompt Template**: How retrieved passages and the user query are assembled into the final prompt. Must contain the `{{rag_context}}` and `{{user_query}}` macros — if either is missing, the plugin logs a warning and inserts it automatically. Default is a simple "use these citations if relevant" instruction followed by the user’s query.

If Documents Directory or Vector Store Directory is empty, chats show "Big RAG is not in use: set … in Big RAG’s global settings." and messages are sent to the model unchanged.

### Chat Sidebar: Reindex

- **Reindex** (default: *No reindex*): To prevent reindexing, select *No reindex*. To index only new or updated files, select *New & changed files* (unchanged files, and files that previously failed to parse, are skipped). To rebuild the whole index from scratch, select *Rebuild everything*. The chosen mode runs once on your next message; later messages show "Reindex already done at …". To run another — including switching from one mode to the other — select *No reindex*, send a message, then choose a mode again.
- **Automatic first run**: If the vector store is empty, the plugin indexes your documents the first time a message is processed.
- **Indexing lock**: Only one indexing run can be active at a time; a request made while one is running is reported and skipped.
- The "done" record is the file `.big-rag-reindex.json` in the Vector Store Directory. Because Reindex is set per chat, a message in another chat set to *No reindex* clears it.

### How Documents Are Indexed

- **Structured indexing**: Documents are chunked by headings, sections, and list items. Each chunk records its posted date (from the first page, then the file name, then the file’s modified time) and the dates of its sections, and gets a header such as `[File: report.pdf | Posted: 2026-09-20 | Section: Incidents > 2. Bus collision | Dates: 2026-09-08]`. The header is used for search and shown to the model; citations show only the original passage.
- **OCR**: Always on. Scanned PDFs fall back to OCR when no text can be extracted, and image files (BMP/JPEG/PNG) are OCR’d.
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

Settings moved out of the chat sidebar. After upgrading, enter **Documents Directory** and **Vector Store Directory** (and any custom Embedding Model, exclude patterns, or prompt template) once in Big RAG’s global settings. Pointing Vector Store Directory at your existing folder keeps your existing index. Old per-chat values for retrieval limit, threshold, chunk size, overlap, concurrency, parser delay, OCR, structured indexing, and context compaction are no longer used.

## Usage

1. **Configure the Plugin**:
   - Open Big RAG's plugin settings in LM Studio (global settings)
   - Set your documents directory (e.g., `/Users/user/Documents/MyLibrary`)
   - Set your vector store directory (e.g., `/Users/user/.lmstudio/big-rag-db`)

2. **Initial Indexing**:
   - The first time you send a message, the plugin will automatically scan and index your documents
   - This process may take a while depending on the size of your document collection
   - Progress will be shown in the LM Studio interface

3. **Query Your Documents**:
   - Simply chat with your LM Studio model as usual
   - The plugin will automatically search your indexed documents for relevant content
   - Retrieved passages will be injected into the context for the model to use

## Architecture

### Components

1. **File Scanner** (`src/ingestion/fileScanner.ts`):
   - Recursively scans directories
   - Filters for supported file types
   - Applies exclude filename patterns before a file is ever parsed
   - Collects file metadata

2. **Document Parsers** (`src/parsers/`):
   - `htmlParser.ts`: Extracts text from HTML/HTM files
   - `pdfParser.ts`: Extracts text from PDF files via a three-stage fallback: LM Studio's built-in `parseDocument` API, then `pdf-parse`, then MuPDF-rendered page images OCR'd with Tesseract (capped at 50 pages); each stage records a specific failure reason if it produces too little text
   - `epubParser.ts`: Extracts text from EPUB files
   - `docxParser.ts`: Extracts text from DOCX files via `mammoth`'s HTML conversion (not raw-text extraction), so `<table>` structure survives and renders as one row per line
   - `pptxParser.ts`: Extracts slide/table/speaker-notes text by reading the OOXML directly; slide display order and slide-to-notes mapping come from the presentation's relationship graph (`presentation.xml`'s `sldIdLst` + each slide's own `.rels`), not filename numbering
   - `embeddedImages.ts`: Extracts embedded images from DOCX/PPTX (bytes + slide/location tagging) - holding code for a future VLM captioning step; captioning itself is not implemented yet
   - `textParser.ts`: Reads plain text & Markdown files with optional Markdown stripping
   - `imageParser.ts`: OCR for image files
   - `documentParser.ts`: Routes to appropriate parser

3. **Vector Store** (`src/vectorstore/vectorStore.ts`):
   - Uses Vectra with sharded indexes (one shard in memory at a time; avoids V8 string size limits)
   - Supports incremental updates
   - Efficient similarity search

4. **Index Manager** (`src/ingestion/indexManager.ts`):
   - Orchestrates the indexing pipeline
   - Manages concurrent processing
   - Skips files that previously failed to parse (via the failed-file registry) during incremental runs
   - Handles progress reporting and per-run failure reason summaries/reports

5. **Indexing Job Runner** (`src/ingestion/runIndexing.ts`) & **CLI** (`src/cliIndex.ts`):
   - Shared indexing pipeline reused by the plugin's automatic/manual triggers and by the standalone CLI
   - The CLI (`npm run index:cli`) indexes a documents directory into a vector store outside of LM Studio chat, configured entirely via `BIG_RAG_*` environment variables

6. **Supporting Utilities** (`src/utils/`):
   - `sanityChecks.ts`: Validates directory access, disk space, and free memory before the first indexing run and estimates dataset size/time
   - `indexingLock.ts`: Ensures only one indexing job runs at a time
   - `failedFileRegistry.ts`: Persists per-file failure reasons so unchanged, previously-failed files are skipped on incremental reindexes
   - `fileExcludePatterns.ts`: Parses and matches glob-based exclude patterns (from plugin config or `BIG_RAG_EXCLUDE_PATTERNS`)

7. **Prompt Preprocessor** (`src/promptPreprocessor.ts`):
   - Intercepts user queries
   - Performs vector search
   - Injects relevant context using the configurable prompt template

## Performance Considerations

### Large Datasets

- **Disk Space**: The vector store requires additional disk space (typically 10-20% of original document size)
- **Initial Indexing**: Can take several hours for TB-scale collections
- **Memory Usage**: Scales with concurrent processing (the plugin processes one file at a time; the CLI accepts `BIG_RAG_MAX_CONCURRENT`)

### Optimization Tips

1. **Start Small**: Test with a subset of documents first
2. **Skip Images**: Exclude image files (e.g. `*.png`, `*.jpg`) if they don't contain useful text, since they are always OCR'd
3. **Use the CLI for Large Collections**: `npm run index:cli` can tune concurrency and chunk size through environment variables

## Troubleshooting

### No Results Found

- Check that documents directory is correctly configured
- Verify that indexing completed successfully
- Check that the files you expect aren't matched by an exclude pattern
- Check LM Studio logs for errors

### Embedding model mismatch

- If you see a message that the index was built with a **different embedding model** than the one in settings, either change **Embedding Model** back to the value recorded in `.big-rag-embedding.json` or run a **full reindex** after changing the model.
- **Dimension mismatch** means the model’s output size changed; reindex after switching models or quantizations.

### Slow Indexing

- Exclude image files you don't need (they are always OCR'd)
- Ensure vector store directory is on a fast drive (SSD recommended)
- For very large collections, index with the CLI and `BIG_RAG_MAX_CONCURRENT`

### Out of Memory

- When using the CLI, set `BIG_RAG_MAX_CONCURRENT` to 1 or 2
- Process documents in batches by organizing them into subdirectories
- Increase system swap space

### OCR Not Working

- Tesseract.js downloads language data on first use
- Ensure internet connectivity during first OCR operation
- Check that image files are valid and readable

### Headless CLI Indexing

The plugin's indexing pipeline can also run outside of LM Studio chat via `src/cliIndex.ts`, useful for scripted or scheduled indexing of large collections:

```bash
npm run build
node dist/cliIndex.js /path/to/documents /path/to/vector/store
# or
BIG_RAG_DOCS_DIR=/path/to/documents BIG_RAG_DB_DIR=/path/to/vector/store node dist/cliIndex.js
```

Configured entirely via environment variables:

- `BIG_RAG_DOCS_DIR` / `BIG_RAG_DB_DIR`: documents and vector store directories (or pass as positional args)
- `BIG_RAG_EMBEDDING_MODEL`: overrides the default embedding model id (same default as the plugin's **Embedding Model** setting)
- `BIG_RAG_CHUNK_SIZE` / `BIG_RAG_CHUNK_OVERLAP` (defaults: 512 / 100)
- `BIG_RAG_MAX_CONCURRENT` (default: 1)
- `BIG_RAG_ENABLE_OCR` (default: `true`)
- `BIG_RAG_FORCE_REINDEX` (default: `false`): when `true`, rebuilds every file instead of skipping unchanged ones
- `BIG_RAG_PARSE_DELAY_MS` (default: 500)
- `BIG_RAG_EXCLUDE_PATTERNS`: semicolon-separated glob patterns (same syntax as the plugin's exclude filename patterns field)
- `BIG_RAG_FAILURE_REPORT_PATH`: absolute path to write a JSON failure report to after indexing
- `BIG_RAG_STRUCTURED_INDEXING`: `false` to build a standard (legacy) index instead of a structured one (default `true`); changing it rebuilds every file on the next run

### Failure Reason Reporting

- The CLI logs cumulative `success` / `failed` counts after each processed document.
- Set `BIG_RAG_FAILURE_REPORT_PATH=/absolute/path/report.json` when running `npm run index` (or via LM Studio env settings) to emit a JSON report containing all failure reasons and counts after indexing completes. This is useful when triaging stubborn PDFs such as blueprints or large scanned books.
- **`BIG_RAG_EMBEDDING_MODEL`**: Optional. When set for headless indexing (`npm run index:cli` / `dist/cliIndex.js`), overrides the default embedding model id (same default as the plugin’s **Embedding Model** setting). Empty/unset uses the built-in default from `config.ts`.

## Limitations

- **RAR Archives**: Not yet implemented (files are skipped)
- **Password-Protected Files**: Not supported
- **Very Large Files**: Individual files >100MB may cause memory issues
- **Non-English OCR**: Currently only English OCR is configured

## Development

### Project Structure

```
big-rag-plugin/
├── src/
│   ├── config.ts               # Plugin configuration schema
│   ├── index.ts                # Main entry point
│   ├── promptPreprocessor.ts   # RAG integration
│   ├── cliIndex.ts             # Headless CLI indexing entry point
│   ├── ingestion/
│   │   ├── fileScanner.ts      # Directory scanning + exclude pattern filtering
│   │   ├── indexManager.ts     # Indexing orchestration
│   │   └── runIndexing.ts      # Shared indexing job runner (plugin + CLI)
│   ├── parsers/
│   │   ├── documentParser.ts   # Parser router
│   │   ├── htmlParser.ts       # HTML parsing
│   │   ├── pdfParser.ts        # PDF parsing (LM Studio -> pdf-parse -> MuPDF/OCR fallback)
│   │   ├── epubParser.ts       # EPUB parsing
│   │   ├── docxParser.ts       # DOCX parsing (mammoth -> HTML -> cheerio, table-aware)
│   │   ├── pptxParser.ts       # PPTX parsing (relationship-graph slide order + notes)
│   │   ├── embeddedImages.ts   # DOCX/PPTX embedded image extraction (holding code, no captioning yet)
│   │   ├── textParser.ts       # Text parsing
│   │   └── imageParser.ts      # OCR parsing
│   ├── vectorstore/
│   │   └── vectorStore.ts      # Vectra sharded index integration
│   └── utils/
│       ├── coerceEmbedding.ts        # Normalize embedding API vectors
│       ├── embeddingIndexManifest.ts # Index embedding metadata on disk
│       ├── failedFileRegistry.ts     # Tracks per-file parse failures
│       ├── fileExcludePatterns.ts    # Glob-based file exclusion
│       ├── fileHash.ts               # File hashing
│       ├── indexingLock.ts           # Prevents concurrent indexing runs
│       ├── sanityChecks.ts           # Pre-indexing disk/memory/size checks
│       └── textChunker.ts            # Text chunking
├── manifest.json               # Plugin manifest
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
└── README.md                   # This file
```

### Testing

Automated tests cover per-format document parsing and exclude-pattern matching (`src/tests/*Parser.test.ts` per format, plus `src/tests/documentParser.test.ts`, `src/tests/embeddedImages.test.ts`, and `src/tests/fileExcludePatterns.test.ts`):

```bash
npm run test
```

For end-to-end validation:

1. Create a test directory with sample documents
2. Configure the plugin to use this directory
3. Send a test query to verify retrieval works
4. Check LM Studio logs for any errors

### Evaluating Retrieval

Measure whether retrieval actually finds the passages that answer questions about your documents.

Run all commands below from the repo root. `BIG_RAG_DOCS_DIR` must match the plugin's **Documents Directory** setting exactly — if it points somewhere else, the source paths recorded for each question won't match what's in the index, and generation/scoring will silently fail (or, for `run`, throw explaining the mismatch).

1. Generate candidate questions from your indexed documents (uses the LLM loaded in LM Studio, or `BIG_RAG_EVAL_LLM`):

   ```bash
   BIG_RAG_DOCS_DIR=/path/to/docs BIG_RAG_DB_DIR=/path/to/db npm run eval:generate
   ```

   ```powershell
   $env:BIG_RAG_DOCS_DIR="C:\path\to\docs"; $env:BIG_RAG_DB_DIR="C:\path\to\db"; npm run eval:generate
   ```

2. Open the `eval/candidates-*.json` file it writes, delete vague or incorrect questions, and save the result as `eval/questions.json`.

3. Run the evaluation:

   ```bash
   BIG_RAG_DOCS_DIR=/path/to/docs BIG_RAG_DB_DIR=/path/to/db npm run eval:run
   ```

   ```powershell
   $env:BIG_RAG_DOCS_DIR="C:\path\to\docs"; $env:BIG_RAG_DB_DIR="C:\path\to\db"; npm run eval:run
   ```

The plugin uses fixed defaults for retrieval limit, affinity threshold, chunk size, and context compaction (see [Maintainer Defaults](#maintainer-defaults)); `eval:run` uses the same defaults unless you set `BIG_RAG_RETRIEVAL_LIMIT`, `BIG_RAG_RETRIEVAL_THRESHOLD`, `BIG_RAG_CHUNK_SIZE`, or `BIG_RAG_ENABLE_COMPACTION` to evaluate different values. If the plugin uses a non-default **Embedding Model**, also set `BIG_RAG_EMBEDDING_MODEL` to match it — otherwise `eval:run` fails the manifest compatibility check. Reports are written to `eval/reports/`. The `eval/` folder is gitignored because it contains excerpts from your documents.

Other environment variables:

- `BIG_RAG_EVAL_COUNT` — number of questions to generate (default `30`).
- `BIG_RAG_EVAL_SEED` — seed for deterministic sampling of chunks (default `42`).
- `BIG_RAG_EVAL_LEAK_LIMIT` — reject a generated question when more than this share (0–1) of its meaningful words are copied from its source chunk (default `0.7`; `1` disables the check). Lower is stricter. Copied wording makes retrieval look better than it is, so only compare runs whose question sets were built with the same limit — it is recorded as `generator.leakLimit` in the question file.
- `BIG_RAG_EVAL_FILE` — path to the question set to run (default `eval/questions.json`).
- `BIG_RAG_EVAL_LLM` — model key to use for question generation (default: the model already loaded in LM Studio).
- `BIG_RAG_EMBEDDING_MODEL` — embedding model id to use for `eval:run`; required if the plugin's Embedding Model setting isn't the default.

### Contributing

This plugin is based on the LM Studio plugin SDK. For more information:

- [lmstudio-js GitHub](https://github.com/lmstudio-ai/lmstudio-js)
- [Documentation](https://lmstudio.ai/docs)
- [Discord](https://discord.gg/6Q7Xn6MRVS)

## License

ISC

## Acknowledgments

- Built using the LM Studio SDK
- Uses Vectra for vector storage (sharded indexes)
- OCR powered by Tesseract.js
- PDF parsing via pdf-parse, with MuPDF used to rasterize pages for the OCR fallback
- EPUB parsing via epub2
- HTML parsing via cheerio
- DOCX parsing via mammoth
- PPTX/DOCX archive handling via jszip

