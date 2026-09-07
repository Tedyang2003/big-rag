# Big RAG Plugin for LM Studio

A powerful RAG (Retrieval-Augmented Generation) plugin for LM Studio that can index and search through gigabytes or even terabytes (not tested) of document data. This is a custom update of [ari99/lm_studio_big_rag_plugin](https://github.com/ari99/lm_studio_big_rag_plugin). Hosted here: [Tedyang2003/big-rag](https://github.com/Tedyang2003/big-rag) on GitHub.

## Features

- **Massive Scale**: Designed to handle large document collections (GB to TB scale)
- **Deep Directory Scanning**: Recursively scans all subdirectories
- **Multiple File Formats**: Supports HTM, HTML, XHTML, PDF, EPUB, DOCX, PPTX, TXT, TEXT, Markdown variants (MD/MDX/MKDN), BMP, JPEG, PNG
- **Table-Aware DOCX/PPTX Parsing**: Table row/column structure is preserved (one line per row, cells joined with `|`) instead of flattening cells into indistinguishable paragraphs; PPTX slide order and speaker notes follow the presentation's actual relationship graph, not filename numbering
- **Resilient PDF Parsing**: Three-stage fallback pipeline per PDF — LM Studio's built-in document parser, then `pdf-parse`, then MuPDF-rendered page images run through Tesseract OCR — so scanned/blueprint-style PDFs still get indexed
- **OCR Support**: Optional OCR for image files and image-based PDFs using Tesseract
- **Configurable File Exclusion**: Skip files by glob pattern (e.g. `*.png`, `archive/**`) without touching your document tree
- **Customizable Prompt Template**: Control how retrieved passages and the user query are assembled into the final prompt via `{{rag_context}}` / `{{user_query}}` macros
- **Pre-Indexing Sanity Checks**: Verifies directory access, disk space, and free memory before a large indexing run and estimates its size/time
- **Resilient Indexing**: An indexing lock prevents overlapping runs, and a per-file failure registry skips files that previously failed so incremental reindexes don't keep retrying broken documents
- **Headless CLI Indexing**: Index a document set from the command line (`npm run index:cli`) without needing an LM Studio chat session
- **Vector Search**: Uses Vectra with sharded indexes for efficient vector storage and retrieval (avoids single-file size limits)
- **Incremental Indexing**: Automatically detects and skips already-indexed files
- **Concurrent Processing**: Configurable concurrency for optimal performance
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

The plugin provides the following configuration options in LM Studio:

### Required Settings

- **Documents Directory**: Root directory containing your documents (read access required)
- **Vector Store Directory**: Where the vector database will be stored (read/write access required)

### Embedding model

- **Embedding Model** (plugin setting): String passed to LM Studio’s embedding load API. **Both** common forms can work for the same weights—for example **`mixedbread-ai/mxbai-embed-large-v1`** (Hub / `lms get`) and **`text-embedding-mxbai-embed-large-v1`** (as shown in `lms ls`). Use **one** spelling consistently for indexing and retrieval so it matches **`.big-rag-embedding.json`**; switching spelling without reindexing can trigger a mismatch warning. Default: `nomic-ai/nomic-embed-text-v1.5-GGUF`.
- **After changing the embedding model**, run a **full reindex** (toggle *Manual Reindex Trigger* with *Skip Previously Indexed Files* off, or clear the vector store and let first-run indexing rebuild). Vectors from different models are not comparable in the same index.
- **`.big-rag-embedding.json`**: Written under the vector store directory when the index has at least one chunk; records the model id and vector length used to build the index. If the configured model no longer matches this file, retrieval is blocked until you reindex or revert the setting. If the index has **zero** chunks, this file is removed so metadata cannot drift (including after manual shard deletion).
- **Indexes built with older plugin versions** may have chunks but no manifest; retrieval still works, and a full reindex will create the manifest.

### Retrieval Settings

- **Retrieval Limit** (1-20, default: 5): Maximum number of chunks to return
- **Retrieval Affinity Threshold** (0.0-1.0, default: 0.5): Minimum similarity score for relevance
- **Chunk Size** (128-2048 tokens, default: 512): Size of text chunks for embedding
- **Chunk Overlap** (0-512 tokens, default: 100): Overlap between consecutive chunks

### Performance Settings

- **Max Concurrent Files** (1-10, default: 1): Number of files to process simultaneously
- **Parser Delay (ms)** (0-5000, default: 500): Wait time before parsing each document, inserted to help avoid WebSocket throttling against LM Studio
- **Enable OCR** (default: true): Enable OCR for image files and image-based PDFs using LM Studio's built-in document parser

### File Filtering

- **Exclude filename patterns** (optional): One glob pattern per line, matched against each file's path relative to the Documents Directory (forward slashes). Lines starting with `#` are comments. Example: `*.png` excludes PNGs anywhere; `archive/**` excludes that subtree. This only prevents new files from being parsed/embedded — it does not remove chunks already in the vector store, so reindex or clear the store to drop previously indexed matches.

### Reindexing Controls

- **Manual Reindex Trigger** (toggle): Turn this ON and submit any chat message to force indexing to run on every chat session where the plugin is enabled. Flip it OFF once you’re done to stop the automatic reindex loop.
- **Skip Previously Indexed Files** (default: true): If enabled while "Manual Reindex Trigger" is enabled, each manual run touches just the documents that are new or have changed since the last index (files that previously failed to parse are also skipped); if disabled, every chat rebuilds the entire index from scratch. Combine "Skip Previously Indexed Files" and "Manual Reindex Trigger" to choose between incremental updates or repeated full refreshes.
- **Automatic First-Run**: If the vector store is empty, the plugin automatically indexes the configured documents the first time any chat message is processed—no manual input is required.
- **Indexing Lock**: Only one indexing run (automatic or manual) can be active at a time; if you trigger a manual reindex while one is already running, the plugin reports it and skips the new request instead of running two jobs concurrently.

### Prompt Template

- **Prompt Template** (plugin setting): Customize how the retrieved passages and user query are assembled into the final prompt sent to the model. Must contain the `{{rag_context}}` and `{{user_query}}` macros — if either is missing, the plugin logs a warning and inserts it automatically so retrieval still works. Default is a simple "use these citations if relevant" instruction followed by the user's query.

## Usage

1. **Configure the Plugin**:
   - Open LM Studio settings
   - Navigate to the Big RAG plugin configuration
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
- **Memory Usage**: Scales with concurrent processing (reduce `maxConcurrentFiles` if needed)

### Optimization Tips

1. **Start Small**: Test with a subset of documents first
2. **Disable OCR**: Unless you have many image-based documents, keep OCR disabled
3. **Adjust Concurrency**: Lower `maxConcurrentFiles` on systems with limited resources
4. **Chunk Size**: Larger chunks (1024-2048) work better for technical documents
5. **Threshold Tuning**: Adjust `retrievalAffinityThreshold` based on result quality

## Troubleshooting

### No Results Found

- Check that documents directory is correctly configured
- Verify that indexing completed successfully
- Try lowering the retrieval affinity threshold
- Check LM Studio logs for errors

### Embedding model mismatch

- If you see a message that the index was built with a **different embedding model** than the one in settings, either change **Embedding Model** back to the value recorded in `.big-rag-embedding.json` or run a **full reindex** after changing the model.
- **Dimension mismatch** means the model’s output size changed; reindex after switching models or quantizations.

### Slow Indexing

- Reduce `maxConcurrentFiles`
- Disable OCR if not needed
- Ensure vector store directory is on a fast drive (SSD recommended)

### Out of Memory

- Reduce `maxConcurrentFiles` to 1 or 2
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

