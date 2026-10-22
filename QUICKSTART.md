# Quick Start Guide

From a clone to an answer with citations. For what each setting does in depth,
see [the User Guide](documentation/UserGuide.md).

## Prerequisites

- LM Studio, with its `lms` command-line tool available
- Node.js and npm
- An embedding model downloaded in LM Studio — the default is
  `nomic-ai/nomic-embed-text-v1.5-GGUF`
- A chat model loaded

## Install

```powershell
npm install
npm run build
```

Then pick one of two ways to run it:

```powershell
npm run dev              # development mode: logs go to this terminal
npm run install-plugin   # installs it as a real plugin and prunes the install
```

Use `npm run dev` while working on the plugin — the `[BigRAG]` log lines appear
in your terminal, which is where the retrieval timings and signal counts show
up. Use `npm run install-plugin` to test what a user actually gets: that path
runs the bundled `.lmstudio/production.js` rather than your `src/`, and it is
the only way to catch problems specific to the installed copy.

## Configure

Open Big RAG's plugin settings in LM Studio. There are seven settings and no
hidden ones — chunk size, retrieval limit, concurrency and the similarity
threshold are fixed defaults, not knobs.

### Global settings — set once

| Setting | Required | Notes |
|---|---|---|
| **Documents Directory** | yes | Root folder to index. Every subdirectory is scanned. |
| **Vector Store Directory** | yes | Where the index is written. |
| **Embedding Model** | no | Defaults to `nomic-ai/nomic-embed-text-v1.5-GGUF`. Changing it forces a full reindex, because the old vectors are not comparable with the new model's. |
| **Exclude filename patterns** | no | One glob per line. |
| **Prompt Template** | no | How passages and your question are presented to the model. |

The plugin does nothing until both directories are set. Until then it says so
and passes your message through untouched:

```
Big RAG is not in use: set Documents Directory and Vector Store Directory in
Big RAG's global settings.
```

### Per-chat settings

| Setting | Default | Notes |
|---|---|---|
| **Retrieval Depth** | Medium | `Low` searches by meaning only. `Medium` adds date matching and keyword reranking, with no extra model calls. `High` also asks the model to draft a likely answer and searches for that too — one extra model call per message. |
| **Reindex** | No reindex | `Always index new & changed files` re-scans every message and processes only what changed. `Always rebuild everything` rebuilds from scratch every message — leave it off unless you mean it. |

## First query

Send any message. On a fresh vector store the plugin indexes before answering,
so the first message takes as long as indexing takes.

You should see, in order:

1. `Using Big RAG` while it checks the directories and opens the vector store
2. Indexing progress, file by file
3. `Searching by meaning and dates...` (at Medium)
4. `Retrieved 5 relevant passages (meaning 4, dates 1)`
5. An answer with citations you can click

In the terminal, the useful lines are:

```
[BigRAG] Lanes: meaning=50 likely-wording=0 dates=3 ranges=none
[BigRAG] Retrieval timings: embedQuery=7ms vectorSearch=412ms dateLane=2ms keywordRerank=6ms fuse=1ms
```

The timings line tells you which signals actually ran, which is the quickest
way to confirm the plugin is doing what the depth setting claims.

## Troubleshooting

**`No relevant content found in indexed documents`** — retrieval ran and found
nothing above the floor. Check that indexing finished (the terminal reports a
file count), and that the question shares vocabulary with the documents. Try
`High` depth, which searches for a drafted answer as well and finds passages
worded unlike the question.

**`Reindex required`** — the index was built with a different embedding model or
chunk format. Set **Reindex** to `Always rebuild everything`, send one message,
then set it back to `No reindex`.

**Indexing is slow** — the parsers are the cost, not the embedding. Scanned PDFs
are the worst case, since they fall through to OCR. Exclude what you do not
need with **Exclude filename patterns** rather than waiting.

**Answers cite the wrong thing** — check how many passages came back. If one
question has exactly one good answer and you still receive five passages, four
of them are padding, and a small model may follow the wrong one. That is the
`passageRelevanceCut` default, which currently ships at `0`; see
[Development](documentation/Development.md).

## Next

- [User Guide](documentation/UserGuide.md) — every setting, reindexing, troubleshooting
- [Command-Line Tools](documentation/CLI.md) — indexing without the LM Studio interface
- [Testing Guide](TESTING.md) — how to exercise the plugin by hand
- [Evaluation](documentation/Evaluation.md) — what has actually been measured
