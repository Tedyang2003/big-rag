# User Guide

How to set up and use Big RAG from inside LM Studio: where its settings live, what each one does, what the plugin shows while it works, and what to do when something goes wrong. For indexing from a terminal instead, see [Command-Line Tools](CLI.md).

## Where Settings Live

Big RAG splits its settings between two places. **Global settings** are set once in Big RAG's plugin settings and apply to every chat. **Chat settings** appear in each chat's sidebar and control what happens in that conversation.

Everything else (chunk size, retrieval limit, OCR and so on) is fixed by the plugin. Maintainers can change those values for the command-line tools; see [Maintainer Defaults](CLI.md#maintainer-defaults).

## Global Settings

#### Documents Directory

Required. The folder containing your documents. Every subfolder is scanned.

#### Vector Store Directory

Required. Where the index is stored. Needs read and write access. Pointing this at an existing index folder reuses that index.

#### Embedding Model

The model used to embed documents and questions. Defaults to `nomic-ai/nomic-embed-text-v1.5-GGUF`. LM Studio lists some models under two names, for example `mixedbread-ai/mxbai-embed-large-v1` and `text-embedding-mxbai-embed-large-v1`. Either works, but always use the same one. After changing this, select **Always rebuild everything** under Reindex, because vectors from different models can't be mixed in one index.

#### Exclude Filename Patterns

Optional. One glob pattern per line to skip files, matched against each file's path relative to the Documents Directory, for example `*.png` or `archive/**`. Lines starting with `#` are comments. Images are always read with OCR, so exclude them here if they don't contain useful text. Files that are already indexed stay in the index until you rebuild it.

#### Prompt Template

How the retrieved passages and your question are combined into the prompt sent to the model. It must contain `{{rag_context}}` and `{{user_query}}`; if either is missing, the plugin adds it and logs a warning.

If Documents Directory or Vector Store Directory is empty, each message shows *"Big RAG is not in use: set … in Big RAG's global settings."* and is sent to the model unchanged.

## Chat Settings

#### Reindex

Controls whether the plugin indexes documents before answering. The choice is standing behaviour: it applies to every message until you change it.

- **No reindex** (default): nothing is indexed
- **Always index new & changed files**: each message indexes new or edited documents and skips the rest
- **Always rebuild everything**: each message re-parses and re-embeds every file

*Always rebuild everything* can take a long time on a large collection and repeats on every message, so switch back to **No reindex** once it has finished.

An empty index is always filled automatically on the first message, whatever Reindex is set to. Only one indexing run happens at a time; a message sent while one is running reports it and carries on.

#### Retrieval Depth

Controls how the plugin searches.

- **Medium** (default): searches by meaning, by exact keywords, and by date when your question names one, then merges the results
- **Low**: searches by meaning only, as versions before 1.5 did

Neither level makes extra model calls. The first Medium search builds a small search index next to your vector store, `.big-rag-catalog.json`, and shows its progress. It is rebuilt automatically when the number of indexed chunks changes and is safe to delete. Above 50,000 chunks the keyword search is switched off to limit memory use, and the plugin tells you so once.

## What You'll See in a Chat

#### Status Lines

While it works, the plugin shows short status lines above the answer: *Using Big RAG* on first use, indexing progress with file counts, *Preparing search index…* the first time Medium runs, then the search result, for example *Retrieved 5 relevant passages (meaning 3, keywords 4, dates 2, dates: 20260908)*. A passage counts once for each way it matched.

#### Citations

Each retrieved passage appears in LM Studio's citation panel. At Medium depth it is labelled with its rank and how it matched, such as `match #1 via meaning, keywords`. At Low depth it shows the similarity score instead.

## How Documents Are Indexed

#### Structured Chunks

Documents are split along their headings, sections and list items rather than fixed word counts. Each chunk gets a header like `[File: report.pdf | Posted: 2026-09-20 | Section: Incidents > 2. Bus collision | Dates: 2026-09-08]`. The posted date comes from the first page, then the file name, then the file's modified time.

#### Index Files

Alongside the shards, the vector store folder holds `.big-rag-embedding.json`, which records the embedding model and index format, and `.big-rag-catalog.json`, the keyword and date index used at Medium depth. If the embedding model no longer matches the one recorded, retrieval stops until you reindex or change the setting back.

#### Index Format Changes

Indexes built before structured indexing use an older format. The plugin shows *"Reindex required to apply structured indexing."* until you reindex, and that reindex rebuilds every file whichever mode you choose.

## Upgrading from 1.3

Settings moved out of the chat sidebar in 1.4. After upgrading, enter **Documents Directory** and **Vector Store Directory**, plus any custom embedding model, exclude patterns or prompt template, once in Big RAG's global settings. Pointing Vector Store Directory at your existing folder keeps your existing index. Old per-chat values for retrieval limit, threshold, chunk size, overlap, concurrency, parser delay, OCR, structured indexing and compaction are no longer used.

## Performance Tips

- Try a small subset of documents first
- Exclude image files that don't contain useful text
- Keep the vector store on a fast drive
- The index takes roughly 10–20% of the documents' size on disk
- For very large collections, index from the terminal with [Command-Line Tools](CLI.md), which can process several files at once

## Troubleshooting

#### No Results Found

- Check that Documents Directory points at the right folder
- Confirm indexing finished, in the status lines or LM Studio's logs
- Check that the files you expect aren't matched by an exclude pattern

#### Embedding Model Mismatch

The index was built with a different embedding model from the one in settings. Either change **Embedding Model** back to the model recorded in `.big-rag-embedding.json`, or select **Always rebuild everything** once. A *dimension mismatch* means the model's output size changed, which also needs a rebuild.

#### Slow Indexing

- Exclude image files you don't need
- Use a fast drive for the vector store
- Index large collections from the terminal, with several files at a time

#### Out of Memory

- Split documents into smaller folders and index them in batches
- When indexing from the terminal, process one or two files at a time
- Increase system swap space

#### OCR Not Working

Tesseract downloads its language data the first time it runs, so the first OCR run needs an internet connection. Check that the image files open normally.
