# Big RAG — Manual Test Script

A hand pass over the plugin in LM Studio, in the order the steps have to run.
It covers what the automated suite cannot: status lines, citations, the
installed copy, and whether a small model is actually helped by what retrieval
returns.

## The corpus

The documents sit beside this file, so the test bed travels with the repository
and anyone can run this pass without assembling one:

- `document_folder\` — five documents on deliberately unrelated subjects: a
  library handbook (headings, a table, dates), a wildlife survey (dates,
  counts), a sourdough log (measurements), a kelp report (~930 words, so it
  splits across chunks), and a pump manual in a subfolder as HTML (part
  numbers, fault codes)
- `to_be_added\` — two documents that **contradict** the indexed ones, held
  back for the supersession step

The lack of subject overlap is the point: no question can be answered by more
than one document, so a question with one correct answer returns that answer
plus four passages of padding, which is what makes the relevance cut visible.

## Settings

- Documents Directory: `<repo>\eval\user_testing\document_folder`
- Vector Store Directory: `<repo>\eval\user_testing_vdbs`

The vector store goes **outside** this folder, under a name `.gitignore`
already excludes (`/eval/*_vdbs`). An index is build output, and committing one
would commit the documents' text a second time as vectors.

## Ordering constraints

Three steps change state the others depend on:

- **Not configured must come first**, before the paths are set
- **Supersession must come after the baseline**, since it changes the answers
  to earlier questions
- **The embedding-model switch must come last**, since it invalidates the index

## Setup

Run `npm run dev`. The terminal is required — retrieval timings and signal
counts appear only there. Have a chat model and `nomic-embed-text-v1.5` loaded.

---

### 1. Not configured

Clear both directory settings, ask anything.

**Expect:** `Big RAG is not in use: set Documents Directory and Vector Store
Directory in Big RAG's global settings.` The model answers from its own
knowledge. No crash.

### 2. First run — indexing

Set both directories. Depth **Medium**, Reindex **No reindex**. Send `hello`.

**Expect:** `Using Big RAG` → indexing progress → 5 files processed, including
`maintenance\pump-service-manual.html`, which proves subdirectories are
scanned. No parse failures.

### 3. Index artifacts on disk

Look in the vector store directory.

**Expect:** `.big-rag-embedding.json` naming the embedding model,
`.big-rag-catalog.json`, and an index folder. The catalog should hold the dates
from the handbook, the survey and the report.

### 4. The relevance cut — the most important step

- `When did the Rosewood branch open?` → 14 March 1998
- `What is Bramble?` → a sourdough starter, begun 9 January 2024
- `How many confirmed banded civet sightings were there?` → 47

**Expect:** correct answers, and `Retrieved 5 relevant passages`. Each question
has exactly one relevant passage, so **four of the five are padding from
unrelated documents**. Watch whether the answer stays on topic or drifts toward
kelp and pumps. This step decides whether `passageRelevanceCut: 0` ships.

### 5. Dates

- `What happened in June 2025?` → camera 7's battery seal leaked on 11 June
- `What was recorded on 4 August 2025?` → a clouded leopard, the first since 2009
- `What closed for eleven weeks in September 2015?` → Rosewood, roof repairs

**Expect:** a non-zero `dates` count in the status, with a range.

### 6. Keyword reranking

- `What is the casing bolt torque for the TPX-4420?` → 42 Nm
- `What does fault code E19 mean?` → bearing above 95 °C, stop immediately
- `What is part TPX-4420-SEAL-2?` → the cartridge mechanical seal

**Expect:** `keywordRerank` non-zero in the timings line. These are rare tokens,
which is what BM25 is for; semantic search alone tends to be vague about part
numbers.

### 7. Chunk boundaries

- `Why was kelp survival only 62 percent?` → urchin reinvasion at the deep
  sites, explicitly **not** temperature
- `Why should deep sites not be replanted first?` → the untreated 90-hectare
  barren sits upcurrent and restocks them with grazers
- `Which sites had the highest survival, and why?` → Kestrel Point 81%, Minnow
  Bay 78%, separated from the barren by a sand channel

**Expect:** the first is the real test. The number and its explanation sit in
different chunks, so a correct answer means neighbour expansion delivered
contiguous text rather than a fragment.

### 8. Tables and headings

- `What time does the library close on Sunday?` → 16:00
- `Why does the library open late on Wednesday?` → the outreach van is loaded
  between 09:00 and 11:00
- `What are the library's Friday hours?` → 09:00 to 18:00

**Expect:** table rows survive chunking with their values correctly paired, and
the prose explanation that follows the table comes along with it.

### 9. Nothing to find

- `What were Acme Corporation's quarterly revenues?`
- `How do I replace the brake pads on a 2019 Volvo XC60?`

**Expect:** `No relevant content found in indexed documents`, then an unaided
answer. **No invented citation** — that would be the serious failure.

### 10. Ambiguity across documents

- `What temperature should I use?` → three documents offer one: 250 °C bake,
  19 °C water, 95 °C bearing limit
- `What is the service interval?` → 1,800 hours or 18 months

**Expect:** either a request for clarification or one answer with a clear
citation. Silently merging the three is the failure.

### 11. Follow-ups — expected to look bad

Ask a question from step 4, then `why?`. Then one from step 6, followed by
`what about the impeller`. Then one from step 4, followed by `what else was
recorded`.

**Expect:** poor retrieval. There is no query rewriting, so `why?` is embedded
literally. Judge whether it **degrades gracefully**, the model falling back on
the conversation, or **confidently answers a different question**. The second is
a release blocker; the first is a documented limitation.

### 12. Depth comparison

Ask `What drove the difference in cost per surviving plant?` and `What are the
limitations of the kelp study?` at **Low**, then **Medium**, then **High**.

**Expect:** the status wording changes at each depth, and High shows
`Drafting a likely answer...` first, then adds `likely wording N`. **Time it.**
High is two generation calls per message. If the wait is unacceptable on the
loaded model, that settles High regardless of what the evaluation numbers say.

### 13. Context pressure

Keep one chat going for six or more turns, mixing questions from above.

**Expect:** with the relevance cut off, passages dominate each turn, so earlier
turns are evicted quickly. Confirm the plugin does not break when it happens.

---

### 14. Supersession — changes state, do it here

Copy **both** files from `to_be_added\` into `document_folder\`. Set Reindex to
`Always index new & changed files`, send a message, then set it back to
`No reindex`. Confirm the terminal reports 7 files with none failed.

| Ask | Expect |
|---|---|
| `When does the Juniper Lane branch open?` | 2 November 2026 — **proves incremental indexing worked**, since it appears in no other file |
| `What is the casing bolt torque for the TPX-4420?` | the manual says 42 Nm, bulletin SB-2026-07 revises it to 48 Nm — and these are two different file formats |
| `Are there overdue fines?` | 0.15 per day capped at 12.00, against abolished from 1 February 2026 |
| `What time does the library open on Wednesday?` | 11:00, against 09:00 from 5 January 2026 |
| `How much does an interlibrary loan request cost?` | 3.50, rising to 4.25 on 1 March 2026 |

**Returning both documents is the correct outcome.** Retrieval has no notion of
which document supersedes which, so presenting both and letting the model
attribute them is the honest result. Returning only the stale one is the
failure — and if it happens, suspect the index before suspecting retrieval.

### 15. Cancelling an indexing run

Cancelling while an **answer** streams does not exercise this: the indexing
lock is only held while indexing runs. To test it, set Reindex to
`Always rebuild everything`, send a message, and stop generation **while it is
still indexing**. Then set Reindex back to `No reindex` and ask a question.

**Expect, in order:**

1. `Indexing error: This operation was aborted`, and that turn produces no answer
2. The next question is **refused** with a reindex demand. An aborted run never
   reaches the manifest sync, so the store holds chunks with no
   `.big-rag-embedding.json`, and retrieval refuses rather than scoring
   prefixed queries against vectors of unknown provenance
3. A full rebuild fixes it, and re-embeds everything — **cancelling discards
   the run's progress rather than pausing it**

**Must not happen:** the interrupted file being recorded as a parse failure.
That used to blacklist it in the failed-file registry, which is consulted
before parsing and keyed on path plus hash, so a later incremental run skipped a
perfectly good document until it was edited. Check the terminal for
`File previously failed (skipped)` on the next run; there should be none.

### 16. Error handling

Point Documents Directory at a path that does not exist and ask a question.
Then restore it, drop a deliberately corrupt `.pdf` into `document_folder`, and
reindex.

**Expect:** a clear warning and no crash; the corrupt file skipped and named in
the failure summary, while the rest index normally.

### 17. Embedding model change — last, it invalidates the index

Change Embedding Model to any other embedder and send a message.

**Expect:** a reindex demand, **not** a silent search. Two models can share a
prefix convention, so without this check the new model's queries would score
against the old model's vectors with nothing left to detect it.

### 18. Repeat in installed mode

Run `npm run install-plugin`, then repeat steps **2, 4, 7 and 14** against the
installed plugin.

**Expect:** identical behaviour. This catches what dev mode structurally cannot.
The install runs the bundled `.lmstudio/production.js` rather than `src/`, and
it copies the project folder minus git-ignored paths — so a runtime file that no
module imports, such as the OCR language pack, can be missing from the install
while dev mode works perfectly.

---

## Not covered

**OCR**, since every document here is text. To exercise it, drop a scanned PDF
or a PNG of text into `to_be_added\` and watch for the OCR fallback in the
terminal — and confirm it does not stall on a network fetch, which is what
`eng.traineddata` sitting beside the plugin prevents.

## What decides a release

Steps **4** (padding passages), **11** (follow-ups), **14** (supersession) and
**18** (installed mode). The rest is regression-checking code the automated
suite already covers.
