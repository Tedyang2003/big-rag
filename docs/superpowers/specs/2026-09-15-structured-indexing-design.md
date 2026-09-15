# Structured Indexing — Design

Date: 2026-09-15
Status: Approved design, pending spec review
Branch: `feature/metadata-summarization`
Baseline: tag `eval-baseline` (retrieval before this work)

## Context

Users report that answers are missing information when summarizing long documents for a date. One user summarizes long reports received several times a day and, as a workaround, renamed files with dates and typed dates into important sections so chunks would carry them.

The root cause is how documents become chunks today:

- The chunker (`src/utils/textChunker.ts`) cuts every N words and discards all line breaks, so boundaries land mid-sentence and mid-section.
- Several parsers also discard structure before chunking. The PDF parser collapses all whitespace, and the Markdown parser strips headings.
- A chunk cut from the middle of a document carries no document name, section, or date, so a query naming a date or report cannot match it.

This is **piece 1 of project A** (date-aware summarization):

1. **Structured indexing (this spec):** structure-preserving parsing, structure-aware chunking, date extraction, and contextual chunk headers.
2. Date-scoped retrieval and whole-document summarization: reading a date range from the question, filtering by date, summarizing all matching chunks in batches.
3. Coverage evaluation in the evaluation harness.

Pieces 2 and 3 get their own specs.

## Goals

- Automate the manual workaround: every chunk knows its file, its section, and its dates.
- Chunk at natural boundaries so sections are not cut apart.
- Handle all supported formats consistently.
- Stay general-purpose: no assumptions about a specific user's documents.
- Be switchable in config, with no silent mixing of index formats.

## Non-Goals

- Filtering or ranking by date at query time (piece 2).
- Whole-document summarization (piece 2).
- Coverage metrics (piece 3).
- Using page layout (text size or position) to detect headings in OCR output.
- VLM-based document parsing. Future work; see "Future Work".
- Changing retrieval ranking or `retrievalLimit` behavior.

## Decisions

| Decision | Choice |
|---|---|
| Common parser output | Normalized Markdown |
| Posted-date priority | First page, then file name, then file modified time |
| Ambiguous numeric dates | Layered inference; keep both readings if unresolved |
| Date extraction method | Hand-written patterns (no LLM, no date-parsing dependency) |
| Chunk dates | `postedDate` (whole document) plus `dates` (the chunk's sections and its own text) |
| Section date inheritance | From the containing section; resets at each new section |
| Header visibility | Embedded with the chunk and shown to the model; citations show original text only |
| Toggle | New config field `structuredIndexing`, default off; requires reindex |

## Components

### Normalized Markdown contract

Every parser returns a string that follows this convention:

- Headings: `#`, `##`, `###` (deeper levels collapse to `###`).
- Paragraphs: separated by one blank line.
- List items: `- ` or `1. ` at line start; nested items indented two spaces per level.
- Table rows: `cell | cell | cell`, one row per line (the existing DOCX/PPTX table convention).
- Page or slide boundaries: a heading (`## Page N`, `## Slide N: <title>`).

Anything after the parser (chunking, dates, headers) depends only on this contract, not on the source format.

### Shared helpers (`src/parsers/markdown/`)

- **`htmlToMarkdown(html)`** converts HTML to the contract: `h1`–`h6` become headings, `p` becomes a paragraph, `ul`/`ol`/`li` become list items, `table`/`tr`/`td`/`th` become table rows. Script, style, and navigation elements are dropped. Used by the HTML, DOCX, and EPUB parsers.
- **`inferStructure(plainText)`** adds structure to text without markup:
  - A line is a heading when it is short (at most 12 words), does not end in `.`, `,`, `;` or `:`, and is followed by a blank line or begins the text.
  - A line starting with `1.`, `1)`, `a.`, `-`, `*`, or `•` is a list item.
  - Blank lines separate paragraphs.
  - Single line breaks inside a paragraph are joined with a space.

  Used by the PDF, plain-text, and OCR paths.

### Parser changes

| Parser | Change |
|---|---|
| `htmlParser.ts` | Use `htmlToMarkdown` instead of extracting flat body text. |
| `docxParser.ts` | Map mammoth HTML through `htmlToMarkdown`; keep the existing table row format. |
| `epubParser.ts` | Pass each chapter's XHTML through `htmlToMarkdown` instead of stripping tags; chapters separated by a blank line. |
| `pptxParser.ts` | Each slide becomes `## Slide N: <title>` (title = first text paragraph of the slide); remaining paragraphs become list items; table rows keep `a \| b`; notes go under `### Notes`. |
| `textParser.ts` | Markdown files are normalized to the contract (headings and lists kept; link URLs, emphasis and inline-code markers, fenced code, and block-quote markers removed). Plain text goes through `inferStructure`. |
| `pdfParser.ts` | All three stages stop collapsing whitespace into single spaces; they keep line and paragraph breaks and then run `inferStructure`. |
| OCR (`pdfParser.ts` OCR stage, `imageParser.ts`) | Keep Tesseract's line and paragraph breaks; prefix each OCR'd page with `## Page N`; run `inferStructure`. |

Every parser's success/failure contract is unchanged (reasons, empty-document detection).

### Legacy path

When `structuredIndexing` is off, `markdownToPlain(markdown)` strips heading markers (`#`), list markers, and blank-line structure before the existing `chunkText`. Legacy chunks contain the same words as today's output. Formatting labels can differ where a parser's output changed shape (for example, PPTX slide labels read `Slide 1: Title` instead of `[Slide 1]`). Whitespace differences don't matter, because the legacy chunker already collapses them. Existing legacy indexes keep working without a reindex.

### Date extraction (`src/metadata/dates.ts`)

Dates are represented as ISO date ranges: `{ start: "YYYY-MM-DD", end: "YYYY-MM-DD" }`. A single day has `start === end`.

**`extractDates(text, context)`** returns every date found, where `context` carries the document's resolved day/month order (if known) and the file modified time.

Recognized forms:

| Form | Examples | Result |
|---|---|---|
| ISO | `2026-09-15`, `2026/09/15`, `20260915` (file names only) | 15 Sep 2026 |
| Month name | `15 September 2026`, `Sept 15, 2026`, `15-Sep-26`, `15 Sep` (year from context) | 15 Sep 2026 |
| Numeric | `15/09/2026`, `09/15/2026`, `15.09.2026`, `15-09-2026` | Per ambiguity rules below |
| Quarter | `Q3 2026`, `2026 Q3` | 1 Jul 2026 – 30 Sep 2026 |
| Month and year | `September 2026`, `Sep 2026` | 1 Sep 2026 – 30 Sep 2026 |

A day-and-month form with no year (`15 Sep`) takes its year from the document's posted date. It is skipped if no posted date is known yet, including while the posted date itself is being determined.

Ignored: version numbers (`v2.3.1`, `2.3.1`), times (`14:30`, `2:30pm`), money and percentages (`$15.09`, `15.09%`), and a bare 4-digit number on its own (`2026 units`).

**Ambiguous numeric dates** (both parts ≤ 12). Each rule applies only if the previous ones could not decide:

1. A part greater than 12 fixes the order for that date (`15/04/2026` is day-first).
2. The document's convention: if the document contains any numeric date whose order is fixed by rule 1, apply that order to its ambiguous dates. If the document has both orders, skip this rule.
3. Closeness to the file modified time: if exactly one reading falls within 45 days of the file's modified time, use it.
4. Otherwise keep both readings as separate date entries.

**`documentPostedDate(markdown, fileName, fileModifiedTime)`**:

1. The first date found in the first 300 words of the parsed Markdown.
2. Otherwise the first date found in the file name.
3. Otherwise the file modified time as a single day.

A range (e.g. `Q3 2026`) is a valid posted date.

### Structured chunker (`src/chunking/structuredChunker.ts`)

**Sections.** The Markdown is read into a tree of sections:

- A heading section runs from a heading to the next heading of the same or higher level.
- A top-level list item (not indented) is also a section, running until the next top-level list item or heading.
- Each section records its `sectionPath` (titles from the root, joined with ` > `) and its **section dates**: dates found in its heading line or first line. A section without its own date inherits its parent section's dates. The inheritance ends where the section ends.
- For a list-item section, its title is the item's first line, truncated to 80 characters.
- A section's "first line" for date purposes is the first 80 characters of its heading, list item, or first content block.

**Chunks.** Chunks are built in document order within a token budget:

- **Budget:** `chunkSize` tokens for `contextHeader + text`, measured with the embedding model's `countTokens` using the same per-document calibration approach as today's `chunkText`.
- **Heading placement:** a heading is never the last line of a chunk; it always stays with at least the first paragraph below it.
- **Packing:** consecutive sections are packed into one chunk while they fit the budget.
- **Oversized sections:** a section larger than the budget is split, trying paragraph boundaries, then list items, then sentences, then words. Only these splits use `chunkOverlap`. Every piece keeps the section's `sectionPath` and section dates.

**Chunk metadata.** Stored as primitive fields (vectra metadata values must be strings, numbers, or booleans):

| Field | Type | Content |
|---|---|---|
| `indexFormat` | string | `structured-v1` |
| `postedDate` | string | JSON `{start,end}` from `documentPostedDate` |
| `dates` | string | JSON array of `{start,end}`: union of the section dates of every section in the chunk and every date found in the chunk text; duplicates removed |
| `sectionPath` | string | Section path of the first section in the chunk; additional packed section titles appended with ` ; ` |
| `contextHeader` | string | See below |
| `startIndex`, `endIndex` | number | Word offsets within the normalized Markdown, so `trimOverlappingChunks` keeps working |

**Context header:**

```
[File: <fileName> | Posted: <YYYY-MM-DD or start–end> | Section: <sectionPath> | Dates: <comma-separated days or ranges>]
```

`Section:` is omitted when the chunk has no section path, and `Dates:` when `dates` is empty.

### Indexing (`src/ingestion/indexManager.ts`)

When `structuredIndexing` is on:

1. Parse to Markdown.
2. Compute the posted date.
3. Run the structured chunker.
4. For each chunk, embed `contextHeader + "\n" + text` and store `text` (without header) plus the metadata above.

When off, use `markdownToPlain` and the existing `chunkText` path, storing `indexFormat: legacy`.

If date extraction throws for a document, log a warning and store the document's chunks with `postedDate` from the file modified time and empty `dates`. Indexing of the file does not fail.

### Retrieval and prompt (`src/promptPreprocessor.ts`)

- Passages in the prompt are rendered as `contextHeader + "\n" + text` when a `contextHeader` is present, and as `text` otherwise.
- Citations (`ctl.addCitations`) keep `text` only.
- `retrieve()` and its scoring are unchanged.

### Config and manifest

- **New config field `structuredIndexing`** (boolean, default `false`). Subtitle: turning it on requires a manual reindex with "Skip Previously Indexed Files" off.
- **Index manifest** (`.big-rag-embedding.json`) gains `indexFormat: "legacy" | "structured-v1"`. Manifests without the field are treated as `legacy`.
- **Mismatch between config and manifest:** retrieval keeps working on the existing index. The plugin shows a status line: "Reindex required to apply structured indexing." Prompt rendering follows each chunk's stored metadata, not the config.
- Switching the toggle back off shows "Reindex required to switch back to standard indexing."
- **A manual reindex** where the configured format differs from the manifest rebuilds every file regardless of "Skip Previously Indexed Files", so an index never holds both formats.
- The CLI indexer (`src/cliIndex.ts`) reads `BIG_RAG_STRUCTURED_INDEXING` (`true`/`false`, default `false`) with the same behavior.

### Evaluation harness

- No scoring changes. Snippet matching already ignores punctuation, so Markdown markers do not affect matches, and existing question sets remain valid after a structured reindex.
- `eval:run` adds the manifest's `indexFormat` to the report settings snapshot.

## Worked Example

Document `incident_roundup.pdf`, first page "Incident Roundup — published 20 September 2026", followed by five numbered incidents dated 3, 8, 11, 14 and 17 Sep 2026, where incident 2 is longer than one chunk:

| Chunk | Contents | postedDate | dates |
|---|---|---|---|
| 1 | Title, published line, incident 1 | 2026-09-20 | 2026-09-03, 2026-09-20 |
| 2 | Incident 2, first part | 2026-09-20 | 2026-09-08 |
| 3 | Incident 2, second part | 2026-09-20 | 2026-09-08 (inherited from section) |
| 4 | Incidents 3–5, packed | 2026-09-20 | 2026-09-11, 2026-09-14, 2026-09-17 |

Chunk 3 header:

```
[File: incident_roundup.pdf | Posted: 2026-09-20 | Section: Incident Roundup > 2. 8 Sep 2026: Bus collision on the PIE | Dates: 2026-09-08]
```

## Error Handling Summary

| Situation | Behavior |
|---|---|
| No date anywhere in a document | `postedDate` = file modified time; `dates` empty |
| Structure cannot be inferred | Chunker falls back to paragraph and sentence splits |
| Date extraction throws | Warn; index file with modified-time `postedDate`, empty `dates` |
| Config format differs from index | Retrieval continues on existing index; status says reindex required |
| Manual reindex after format change | All files rebuilt regardless of skip setting |
| Manifest lacks `indexFormat` | Treated as `legacy` |

## Testing

Unit tests, no LM Studio required (token counting injected as in `chunkText`):

- **`extractDates`:** every recognized form; each ignored form; each ambiguity rule in isolation; quarter and month ranges; year-less day-month with and without a posted date.
- **`documentPostedDate`:** each step of the priority order, including a range.
- **`inferStructure`:** headings, list items, paragraph joining, and non-headings (long lines, lines ending in punctuation).
- **`htmlToMarkdown`:** headings, paragraphs, nested lists, tables, dropped script/style.
- **Parsers:** Markdown output for the existing fixtures (HTML, Markdown, TXT, DOCX including tables, PPTX including notes and tables, EPUB) and a new roundup text fixture. PDF and OCR structure handling tested via `inferStructure` and page-marker assembly.
- **`markdownToPlain` / legacy path:** with the toggle off, chunks for existing fixtures contain the same words as before (asserted per fixture, allowing only the documented label changes such as PPTX slide labels).
- **Structured chunker:** heading never last in a chunk; packing; oversized split order; overlap only on oversized splits; section date inheritance and reset at the next section; list items as sections; budget includes the header; the roundup fixture produces the worked-example table.
- **Header:** format, including omitted `Section:` and `Dates:`.
- **Manifest:** missing `indexFormat` reads as `legacy`; mismatch produces the status message; reindex after mismatch ignores the skip setting.
- **Prompt rendering:** header shown in the prompt, not in citations; legacy chunks render unchanged.
- **Existing suites** continue to pass. Parser tests whose assertions depend on the old flat output are updated to the Markdown contract.

### Live Acceptance

1. Reindex a realistic document set with `structuredIndexing` on (manual reindex, skip off).
2. Check in LM Studio that prompts show headers, citations show plain passages, and dated questions retrieve the right sections.
3. Run `eval:run` and compare with a report from the `eval-baseline` tag on the same documents.

## Future Work

- **VLM document parsing:** a parser that sends page images to a vision model and returns Markdown under the same contract. It would replace OCR plus `inferStructure` for scanned documents without changes to chunking, dates, or headers.
- **Layout-aware OCR headings** using Tesseract block and font-size data, if VLM parsing is not pursued.
- Pieces 2 and 3 of project A.
