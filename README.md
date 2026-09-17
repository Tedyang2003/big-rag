# Big RAG Plugin for LM Studio

Big RAG is a Retrieval-Augmented Generation plugin for [LM Studio](https://lmstudio.ai) that indexes large local document collections and brings the relevant passages into your chats automatically, with citations back to the source files. It is built for collections too large to attach to a conversation by hand: gigabytes of reports, manuals, slides and scanned PDFs.

## Introduction

This project is a custom update of [ari99/lm_studio_big_rag_plugin](https://github.com/ari99/lm_studio_big_rag_plugin), hosted at [Tedyang2003/big-rag](https://github.com/Tedyang2003/big-rag). It has since been reworked around retrieval accuracy on small local models: documents are split by their structure rather than fixed word counts, every chunk carries its dates and section, and search combines meaning, keywords and dates instead of relying on embeddings alone. The reasoning behind each change is recorded in [documentation/updates](documentation/updates).

## What It Does

1. Scans your documents folder, including every subfolder, and parses each supported file into a common Markdown structure.
2. Splits each document into chunks along its headings, sections and list items, recording the dates each chunk mentions.
3. Embeds the chunks and stores them in a local, sharded vector store that persists between sessions.
4. On every chat message, searches the store by meaning, by keyword and by date, then merges the results.
5. Adds the best passages to the prompt, and links each one back to its source file through LM Studio's citations.

## Features

#### Multi-Format Document Parsing

Reads PDF, DOCX, PPTX, EPUB, HTML, plain text, Markdown and image files, and normalizes all of them into the same Markdown structure so chunking and search treat every format alike.

#### Resilient PDF Parsing

Each PDF goes through up to three parsers: LM Studio's built-in document parser, then `pdf-parse`, then page images rendered with MuPDF and read with OCR. Scanned and blueprint-style PDFs still get indexed.

#### Table-Aware Office Parsing

DOCX and PPTX tables keep their rows and columns instead of collapsing into loose paragraphs. PPTX slides and speaker notes follow the presentation's real slide order rather than file numbering.

#### OCR for Images and Scanned Pages

Image files and scanned PDF pages are read with Tesseract. OCR is always on; exclude image files you don't need with a filename pattern.

#### Structured Indexing

Chunks follow the document's own sections, and each one carries a header naming its file, posted date, section path and the dates it mentions. The header is used for search and shown to the model; citations show only the original passage.

#### Hybrid Retrieval

At the default *Medium* retrieval depth, each question is searched by meaning, by exact keywords (BM25) and by any date it names, and the three result lists are merged with reciprocal rank fusion. *Low* depth searches by meaning only. Neither adds model calls.

#### Citations

Retrieved passages appear in LM Studio's citation panel, each labelled with how it matched, for example `match #1 via meaning, keywords`.

#### Incremental Indexing

Unchanged files are detected by content hash and skipped, files that failed to parse are not retried on every run, and only one indexing run can happen at a time. The first message in an empty store indexes everything automatically.

#### Large-Scale Storage

Embeddings are stored with Vectra in shards of 10,000 chunks, which avoids single-file size limits and keeps memory bounded on large collections.

#### Command-Line Tools

Documents can be indexed without opening a chat, and retrieval quality can be measured with a built-in evaluation harness.

## Supported File Types

- Documents: PDF, EPUB, DOCX, PPTX, TXT, TEXT
- Markdown: MD, MDX, Markdown, MDown, MKD, MKDN
- Web pages: HTM, HTML, XHTML
- Images (OCR): BMP, JPEG, JPG, PNG

## Limitations

- RAR archives are not supported yet
- Password-protected files are not supported
- Images embedded inside DOCX/PPTX files are extracted but not yet read
- OCR is configured for English only
- Individual files over roughly 100 MB may cause memory problems

## Set Up

### Prerequisites

- LM Studio with its `lms` command-line tool
- Node.js and npm
- An embedding model downloaded in LM Studio (default: `nomic-ai/nomic-embed-text-v1.5-GGUF`)

### Steps

1. Install dependencies: `npm install`
2. Build the plugin: `npm run build`
3. Run it in LM Studio's development mode: `npm run dev`
4. Open Big RAG's plugin settings in LM Studio and set **Documents Directory** and **Vector Store Directory**, then send a message to start the first indexing run.

## Documentation

- [User Guide](documentation/UserGuide.md): settings, retrieval depth, reindexing and troubleshooting inside LM Studio
- [Command-Line Tools](documentation/CLI.md): indexing without LM Studio's interface, environment variables and maintainer defaults
- [Evaluation](documentation/Evaluation.md): measuring retrieval quality
- [Development](documentation/Development.md): architecture, project structure and tests
- [Update notes](documentation/updates): the problems each release addresses and the options considered

## License

ISC

## Acknowledgments

- Built with the LM Studio SDK
- Vector storage by Vectra
- OCR by Tesseract.js, with MuPDF rendering pages for the PDF fallback
- Parsing by pdf-parse, mammoth, cheerio, epub2 and jszip
