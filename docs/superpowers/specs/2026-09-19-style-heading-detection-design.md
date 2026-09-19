# Style-Based Heading Detection for PDFs

Date: 2026-09-19
Status: Approved design, not yet implemented

## Problem

Structured indexing splits documents along their headings. For PDFs, headings are inferred from the plain text that pdf-parse (or the LM Studio parser) returns, using one rule: a short line of 12 words or fewer, not ending in `. , ; :`, followed by a blank line.

That rule fails on most PDFs. On the FinanceBench set, 281 of 363 filings produced few or no headings (eBay 2021: 8, General Mills 2023: 2, against 325 for 3M 2016). A document with no headings becomes one giant section, which `splitOversized` cuts into pieces with a 100-token overlap, often ending at a paragraph boundary about half way through the budget. A large section therefore advances about 106 words per chunk against about 300 in legacy mode, and the structured index held 214,643 chunks against 90,226 for legacy (2.4x).

A spike showed the headings are visible in the PDF itself: filings mark them in bold at body size (for example 8pt bold against 8pt regular), and MuPDF's structured text reports per-line font size, weight and name. The PDFs sampled have no outline (bookmarks).

## Goals

- Detect PDF headings from font style rather than from blank lines.
- Work for any kind of PDF (reports, manuals, papers, slides, filings), not only financial documents.
- Remove overlap from structured chunks and fill each piece of a large section to at least 75% where the text allows.
- Measure the result against today's structured and legacy indexes.

## Non-goals

- No text-pattern rules (such as `Item 7`, `Part II` or numbered headings). They misrepresent documents that use the same words for other purposes.
- No change to legacy mode, or to DOCX, HTML, PPTX, Markdown or text parsing.
- No change to retrieval.
- No evening out of the last two pieces of a section. Revisit only if measurement shows many tiny tail pieces.

## Section 1: Heading detection

### Parser order

`src/parsers/pdfParser.ts` changes its chain to:

1. MuPDF styled text (new)
2. pdf-parse, with today's blank-line inference
3. OCR with MuPDF (unchanged)
4. The LM Studio parser, as a last resort

MuPDF styled text fails over to the next stage when the file cannot be opened or yields no text. Fallback logging keeps the one-line format from `summarizeParserError`.

### New module `src/parsers/markdown/pdfStyles.ts`

It takes the lines of MuPDF structured text (`toStructuredText("preserve-whitespace")` per page, read character by character with `walk()` so a line with mixed styles can be recognized; `asJSON()` reports only one font per line) and returns normalized Markdown, following the same contract as the other parsers. It runs five passes.

**Pass 1: collect lines.** For each line, record its text, style and bounding box:
- the style is the font size rounded to the nearest 0.5pt, plus bold and italic flags from the font weight and name
- a line with mixed styles is marked as such

Each MuPDF text block becomes a paragraph.

**Pass 2: remove page furniture.** Drop:
- lines in the top or bottom 8% of the page whose text, with digits normalized, repeats on at least 50% of pages, and only when the document has 3 or more pages
- lines in the same top or bottom 8% band made only of a number, optionally with a `Page` prefix or `of N` suffix (number-only lines elsewhere are table cells and are kept)

**Pass 3: find candidates.** The body style is the style covering the most words. A line is a heading candidate when all of the following hold:
- the whole line is in one style, and that style is not the body style
- it has 12 words or fewer, contains at least one letter, and does not end in `.`, `,`, `;` or `:`
- **Guard 1 (own row):** no other line on the same page overlaps it vertically by more than half its height, counting only lines whose block is at most 2 line-heights tall. A heading occupies a row alone. A table row label, table cell or column header shares its row with other short text. Lines in taller blocks are flowing prose, such as the other column of a two-column page, and are ignored.

**Pass 4: reject over-used styles.**
- **Guard 2:** a style is dropped as a heading style if its candidate lines (all of them, including lines in joins later rejected for length) make up more than 15% of all lines left after pass 2. A style used that often is emphasis, not a heading level.

**Pass 5: rank heading styles.**
- Order the remaining styles by font size, largest first, then by the position of their first candidate line in reading order, ignoring page 1 (the cover page).
- A style whose only candidates are on page 1 ranks after all others.
- The styles map to `#`, `##` and `###`; any further styles map to `###`.
- When exactly one heading style remains, it maps to `##`.

Consecutive candidate lines of the same style on the same page, where the next line starts no more than one line height below the previous one, are joined into one heading, for headings that wrap onto a second line. The join counts as one heading and must still be 12 words or fewer after joining. If it isn't, the lines are body text.

**Fallback.** If no heading style survives pass 4, the MuPDF stage reports that it found no headings and the chain moves on to pdf-parse, which applies `inferStructure`'s blank-line rule exactly as it does today. Running that rule on MuPDF's blocks would instead turn every short single-line block, such as a table cell, into a heading.

### Guard 3: header title cap (chunker, all formats)

In `structuredChunker.ts`, when several small sections are packed into one chunk, the section path lists the first section's full path plus at most two extra section titles, then `+N more` (for example `Risk Factors ; Liquidity ; Debt +3 more`). This applies to every format. False headings that get past guards 1 and 2 can no longer inflate the header and use up the text budget.

### Remaining risk

A bold line that stands alone on its row but is not a heading, such as a pull quote or a caption, passes all three guards. The cost is a misleading section label and an extra section boundary. No text is lost or repeated. Section 3 measures how often it happens.

## Section 2: Splitting large sections

All changes are in `splitOversized` in `src/chunking/structuredChunker.ts`.

**No overlap.** In structured mode each piece starts exactly where the previous piece ended. The chunk overlap setting (`BIG_RAG_CHUNK_OVERLAP`, a fixed default in the plugin) applies to legacy mode only, and the documentation says so. The context header supplies the section context that overlap used to give.

**75% fill rule.** For each piece, `limit` is the furthest word the piece budget allows. The cut point is chosen as follows:
1. The last paragraph end after the previous cut and at or before `limit`. If it fills at least 75% of `pieceBudget`, cut there.
2. Otherwise, take the last sentence end in the same range, if it lies further than the paragraph cut.
3. Otherwise, the paragraph cut, if one exists.
4. Otherwise, cut at `limit`, which is a word boundary.

**Kept from today:**
- no cut lands directly after a heading
- the first piece extends past a leading run of headings
- `pieceBudget` is still reduced by the header's size, with a floor of half the budget

**Sections are never crossed.** The last piece of a large section may be short, and it is not merged into the next section. Whole small sections are still packed together as today.

**Index format.** The structured index format becomes `structured-v2`. An existing `structured-v1` index produces the reindex-required message, with wording that names the change: "Reindex required to apply improved structured indexing." The reindex rebuilds every file. Legacy indexes are unaffected.

## Section 3: Testing and measurement

### Unit tests

**`pdfStyles.ts`**, using hand-made MuPDF JSON fixtures:
- picking the body style
- removing repeated headers, footers and page numbers
- guard 1: a row label with text on the same row is rejected
- guard 2: a style above 15% of lines is rejected
- ranking by size, then by first appearance, ignoring page 1
- a single heading style becomes `##`; a fourth style becomes `###`
- joining a wrapped heading
- no candidates falls back to today's rule

**Chunker:**
- pieces never overlap
- the fill rule chooses paragraph, sentence and word cuts correctly
- no cut lands straight after a heading
- the section path shows `+N more` after two extra titles
- **text preservation:** for every section, the pieces' words joined in order equal the section's words exactly

**Parser order:** with the stages mocked, MuPDF styled text runs first and each failure falls through to the next stage in order.

### Measurement report

A committed dev script, `npm run structure:report`, with `BIG_RAG_DOCS_DIR` pointing at a folder of documents. For each file it prints:
- the parser stage used
- heading counts by level, and headings per page
- structured and legacy chunk counts
- the average fill of structured chunks (header plus text, as a share of the chunk size)

It also prints totals across the folder. It does not need LM Studio: token counts are estimated at 1.3 tokens per word, and the LM Studio parser stage is skipped. Both modes use the same estimate, so the legacy-to-structured ratio stays comparable.

### Pass criteria

| Check | Target |
|---|---|
| The 281 FinanceBench filings that found few or no headings now find headings | at least 90% of them |
| Total structured chunks across FinanceBench | at most 1.1x legacy (about 99,000) |
| Spot check of 20 headings each in eBay 2021, General Mills 2023 and 3M 2016 | at least 85% real headings |
| Spot check of 20 headings each in 3 to 5 non-finance PDFs (for example a manual, a paper and a report) | at least 85% real headings |
| Eval re-run: Legacy Low against Structured Low and Structured Medium | Structured final hit no worse than Legacy Low |

The user supplies the non-finance PDFs. If none are supplied, public documents of those kinds are used instead.

## Files touched

- `src/parsers/markdown/pdfStyles.ts`: new
- `src/parsers/pdfParser.ts`: stage order, and the new MuPDF styled-text stage
- `src/chunking/structuredChunker.ts`: no overlap, the fill rule, the title cap
- `src/ingestion/indexManager.ts`, and the index format helpers and messages: `structured-v2`
- `README.md` and the chunk overlap wording in `documentation/CLI.md` and `documentation/Evaluation.md`
- `package.json`: the `structure:report` script, and the script itself under `src/`
- Tests under `src/tests/`
- `documentation/` guides: parser order, Chunk Overlap wording, the reindex note
