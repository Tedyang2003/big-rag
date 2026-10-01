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

- **Medium** (default): searches by meaning, then lifts passages whose date matches one your question names
A passage that runs on into the next chunk is returned together with it, so an answer split across a boundary arrives whole rather than cut in half.

- **High**: also asks the model you have loaded to draft a likely answer, and searches for that too — about half a second and one model call per message. It finds passages worded unlike your question, which mostly means tables and figures. The draft is used only to search with: it is never shown to you, never cited, and never given to the model as context, because its specifics are invented
- **Low**: searches by meaning only, as versions before 1.5 did

Neither level makes extra model calls. The first Medium search builds a small search index next to your vector store, `.big-rag-catalog.json`, and shows its progress. It is rebuilt automatically when the number of indexed chunks changes and is safe to delete. Keywords and dates reorder the passages the meaning search found rather than adding their own, so they work at any collection size.

## What You'll See in a Chat

#### Status Lines

While it works, the plugin shows short status lines above the answer: *Using Big RAG* on first use, indexing progress with file counts, *Preparing search index…* the first time Medium runs, then the search result, for example *Retrieved 5 relevant passages (meaning 5, dates 2, dates: 20260908)*. A passage counts once for each way it matched. At High the line also reports *likely wording*, and a *Drafting a likely answer…* status appears first.
When a search finds one or two strong matches and nothing else close, the weaker passages are dropped rather than padding the answer out, and the line says so instead: *Kept 2 of 8 passages, the rest well below the best match (meaning 2, dates 0)*.

#### Citations

Only passages comparably relevant to the best match are sent. A question with one good answer in your documents returns one passage, not five padded out with whatever else scored least badly — on a small collection that padding is usually page footers, advertisements or scanning noise, and a small model handed one answer among seven distractions often reports finding nothing. The strongest passage is placed last, immediately above your question, because that is the position a model reads most reliably.

Retrieval is given a share of the model's context window — about three fifths — and sends as many passages as fit it, highest ranked first. The rest of the window is left for the conversation and the reply, which LM Studio trims as needed. That share does not shrink as a chat grows: a long conversation loses its oldest turns rather than its retrieved passages, so the tenth question is answered with as much evidence as the first.

If more passages were found than fit, the status says so — *Sent 6 of 9 passages — the rest would exceed the 4,915 tokens retrieval may use of this model's 8,192* — and raising the model's context length raises the share with it. At least one passage is always sent, so retrieval never quietly does nothing.

Passages stay in the conversation after the turn they were retrieved for, because they are part of the message Big RAG sends. By the third question the model can see three sets of them, so each set names the question it belongs to and the prompt tells the model that earlier ones do not apply. If you customised the Prompt Template before version 1.5.0, yours will not say that — reset it to the default to pick up the wording.

Each retrieved passage appears in LM Studio's citation panel. At Medium and High depth it is labelled with its rank and how it matched, such as `match #1 via meaning, dates` or `match #2 via likely wording`. At Low depth it shows the similarity score instead.

## How Documents Are Indexed

#### Structured Chunks

Documents are split along their headings, sections and list items rather than fixed word counts. Each chunk gets a header like `[File: report.pdf | Posted: 2026-09-20 | Section: Incidents > 2. Bus collision | Dates: 2026-09-08]`. The posted date comes from the first page, then the file name, then the file's modified time.

#### Index Files

Alongside the shards, the vector store folder holds `.big-rag-embedding.json`, which records the embedding model and index format, and `.big-rag-catalog.json`, the date index used at Medium depth. If the embedding model no longer matches the one recorded, retrieval stops until you reindex or change the setting back.

#### Index Format Changes

Indexes built before structured indexing use an older format. The plugin shows *"Reindex required to apply structured indexing."* until you reindex, and that reindex rebuilds every file whichever mode you choose.

Structured indexing now finds PDF headings from font styles (bold, italic and larger text) and no longer overlaps chunks. Structured indexes built before this change show *"Reindex required to apply improved structured indexing."* until you reindex.

From this version, tables in PDFs are indexed as rows of cells rather than a run of text, and each row is matched by the words that name its values. A passage can therefore be found by text that differs slightly from what the citation shows: the citation shows the table, while search matched a form of it that names each value by its column. Structured indexes built before this change show *"Reindex required to apply improved structured indexing."* until you reindex.

PDFs are now read with MuPDF first in both modes, so reindexing a standard (legacy) index can also change the text extracted from PDFs.

Indexes are also embedded the way the Nomic models expect, which improves how closely a question matches the passages that answer it. This too needs a reindex: the plugin refuses an index built the old way rather than searching it badly.

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
