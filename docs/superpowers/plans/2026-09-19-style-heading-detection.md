# Style-Based Heading Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect PDF headings from font styles so structured indexing splits PDFs along real sections, and stop structured chunks from overlapping or ending half full.

**Architecture:**
- A new pure module, `pdfStyles.ts`, turns per-line style data into normalized Markdown.
- `pdfParser.ts` reads that data from MuPDF and runs MuPDF first in its parser chain.
- `structuredChunker.ts` drops overlap, adds a 75% fill rule and caps the titles shown in the header.
- The structured index format moves to `structured-v2`, so existing indexes are rebuilt.
- A dev report script measures the effect.

**Tech Stack:** TypeScript (CommonJS output, `module: nodenext`), Node's built-in `node:test` runner, `mupdf` 1.27 (an ESM package loaded with dynamic `import()`), `pdf-parse`.

**Spec:** `docs/superpowers/specs/2026-09-19-style-heading-detection-design.md`

## Global Constraints

- **Heading candidates:**
  - 12 words or fewer
  - contain a letter
  - do not end in `.`, `,`, `;` or `:`
  - the whole line is in one style, and it isn't the body style
  - share no row with other text: no other line on the page overlaps the candidate vertically by more than half its height
- **Page furniture:**
  - a line is dropped when it is in the top or bottom 8% of the page and its text (with digits normalized) repeats on at least 50% of pages, for documents of 3 or more pages
  - a line is also dropped when it is only a number, optionally with a `Page` prefix or `of N` suffix
- **Guard 2:** a style whose candidate lines exceed 15% of all remaining lines is not a heading style.
- **Ranking:**
  - font size, largest first, then first appearance ignoring page 1
  - a style found only on page 1 ranks last
  - levels are `#`, `##`, `###`, and extra styles also get `###`
  - a single heading style gets `##`
- **Wrapped headings:** consecutive candidate lines of the same style on the same page are joined into one heading, which must still be 12 words or fewer.
- **No heading style found:** the MuPDF stage fails over to pdf-parse, which runs today's `inferStructure` rule.
- **PDF parser order:** MuPDF styled text, then pdf-parse, then OCR (only when enabled), then the LM Studio parser.
- **Header:** at most 2 extra packed section titles, then ` +N more`.
- **Structured chunks:**
  - pieces never overlap
  - the fill threshold is 75% of `pieceBudget`
  - sections are never crossed
- **Index format:**
  - new structured indexes are `structured-v2`
  - moving from v1 to v2 shows "Reindex required to apply improved structured indexing."
  - moving from legacy to structured still shows "Reindex required to apply structured indexing."
- **Scope:** legacy mode and non-PDF parsers do not change.
- **Git:**
  - commit messages are plain imperative sentences (no `feat:` prefixes)
  - every commit ends with the line `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
  - never push
- **Tests:** run a single file with `npm run build; node --test dist/tests/<name>.test.js` and the whole suite with `npm test`. The shell is PowerShell 5.1, so chain with `;` and not `&&`.

---

### Task 1: Cap packed section titles in the context header

**Files:**
- Modify: `src/chunking/structuredChunker.ts` (the `describe` function, around lines 138-151)
- Test: `src/tests/structuredChunker.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `StructuredChunk.sectionPath` may now end in ` +N more`.

- [ ] **Step 1: Write the failing test.** Append to `src/tests/structuredChunker.test.ts`:

```ts
test("chunkStructured lists at most two packed section titles, then a count", async () => {
  const parts = Array.from({ length: 6 }, (_, i) => [
    `## Part ${i + 1}`,
    "",
    `Short note number ${i + 1} about the part.`,
    "",
  ]).flat();
  const markdown = ["# Report", "", ...parts].join("\n");
  const chunks = await chunkStructured(markdown, options({ chunkSize: 400 }));
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].sectionPath, "Report > Part 1 ; Part 2 ; Part 3 +3 more");
});
```

- [ ] **Step 2: Run it and confirm it fails.**

Run: `npm run build; node --test dist/tests/structuredChunker.test.js`
Expected: the new test FAILS, because the actual path lists all six parts.

- [ ] **Step 3: Implement.** In `src/chunking/structuredChunker.ts`, add below the imports:

```ts
/** Packed sections beyond this many show only as a count, so false headings cannot bloat the header. */
const MAX_EXTRA_TITLES = 2;
```

In `describe`, replace

```ts
    const sectionPath = [firstPath, ...extraTitles].filter(Boolean).join(" ; ");
```

with

```ts
    const shownTitles = extraTitles.slice(0, MAX_EXTRA_TITLES);
    const hiddenCount = extraTitles.length - shownTitles.length;
    const sectionPath =
      [firstPath, ...shownTitles].filter(Boolean).join(" ; ") + (hiddenCount > 0 ? ` +${hiddenCount} more` : "");
```

- [ ] **Step 4: Run the tests and confirm they pass.**

Run: `npm run build; node --test dist/tests/structuredChunker.test.js`
Expected: all tests PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/chunking/structuredChunker.ts src/tests/structuredChunker.test.ts
git commit -m "Show at most two packed section titles in a chunk header" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Split large sections without overlap and fill each piece to 75%

**Files:**
- Modify: `src/chunking/structuredChunker.ts`:
  - the `StructuredChunkOptions` interface
  - the `overlapWords` line, around 134
  - `splitOversized`, around lines 179-218
- Modify: `src/ingestion/indexManager.ts` (the `base` object in `prepareStructuredChunks`, around line 509)
- Modify: `documentation/CLI.md` (the env table row for `BIG_RAG_CHUNK_OVERLAP`, around line 48)
- Modify: `documentation/Evaluation.md` (the same row, around line 41)
- Test: `src/tests/structuredChunker.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `StructuredChunkOptions` no longer has `chunkOverlap`. Task 6 calls `chunkStructured` without it.

- [ ] **Step 1: Update the existing tests and write the new ones** in `src/tests/structuredChunker.test.ts`.

1. In `options()`, delete the line `    chunkOverlap: 0,`.

2. Replace the whole test `"chunkStructured overlaps only pieces of an oversized section"` with the following. This also adds the helpers the new tests use:

```ts
const sentence = (i: number) => `s${i} alpha beta gamma delta epsilon zeta eta theta iota.`;
const paragraph = (from: number, count: number) =>
  Array.from({ length: count }, (_, i) => sentence(from + i)).join(" ");
// Heading (2 words), then a 30-word paragraph, then a 400-word paragraph of 10-word sentences.
const LONG_SECTION = `## Long section\n\n${paragraph(0, 3)}\n\n${paragraph(3, 40)}`;

test("chunkStructured never overlaps pieces of an oversized section", async () => {
  const chunks = await chunkStructured(LONG_SECTION, options());
  assert.ok(chunks.length > 2, `expected several pieces, got ${chunks.length}`);
  for (let i = 1; i < chunks.length; i++) {
    assert.equal(chunks[i].startIndex, chunks[i - 1].endIndex, `chunk ${i} overlaps or skips text`);
  }
});

test("chunkStructured keeps every word exactly once and in order", async () => {
  for (const markdown of [ROUNDUP, LONG_SECTION]) {
    const chunks = await chunkStructured(markdown, options());
    assert.deepEqual(
      chunks.flatMap((chunk) => chunk.text.split(/\s+/).filter(Boolean)),
      markdown.split(/\s+/).filter(Boolean),
    );
  }
});

test("chunkStructured cuts at a sentence end when the paragraph end would leave the piece under 75% full", async () => {
  const chunks = await chunkStructured(LONG_SECTION, options());
  const first = chunks[0];
  assert.ok(first.endIndex - first.startIndex > 32, "first piece stopped at the short paragraph");
  assert.ok(first.text.endsWith("."), "first piece ends at a sentence end");
  assert.ok(words(first.contextHeader) + words(first.text) >= 0.75 * 110, "first piece is at least 75% full");
});

test("chunkStructured prefers a paragraph end that fills at least 75% of the piece", async () => {
  // The header takes 9 words, so pieces get 101; the paragraph end at word 82 is over 75% of that.
  const markdown = `## Long section\n\n${paragraph(0, 8)}\n\n${paragraph(8, 40)}`;
  const chunks = await chunkStructured(markdown, options());
  assert.equal(chunks[0].endIndex - chunks[0].startIndex, 82);
});

test("chunkStructured cuts at the word limit when a piece has no paragraph or sentence end", async () => {
  const body = Array.from({ length: 300 }, (_, i) => `w${i}`).join(" ");
  const chunks = await chunkStructured(`## Long section\n\n${body}`, options());
  assert.equal(chunks[0].endIndex - chunks[0].startIndex, 101);
  assert.equal(chunks[1].endIndex - chunks[1].startIndex, 101);
});
```

3. In the test `"chunkStructured never crawls forward when a split piece ends early"`:
   - change `options({ chunkSize: 110, chunkOverlap: 50 })` to `options({ chunkSize: 110 })`
   - change the comment's second line to `// piece ends at the short paragraph's boundary, well short of a full piece.`

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `npm run build`
Expected: the TypeScript build still succeeds, because the tests no longer pass `chunkOverlap`. Then run `node --test dist/tests/structuredChunker.test.js`.
Expected: `"never overlaps"`, `"sentence end"` and `"prefers a paragraph end"` FAIL.

- [ ] **Step 3: Implement.** In `src/chunking/structuredChunker.ts`:

1. Delete `chunkOverlap: number;` from `StructuredChunkOptions`.
2. Delete the line that starts `const overlapWords =`.
3. Below `MAX_EXTRA_TITLES`, add:

```ts
/** A split piece cut at a paragraph end must fill at least this share of its budget, or a sentence end is used. */
const MIN_PIECE_FILL = 0.75;
```

4. Below `lastBoundary`, add:

```ts
/**
 * Where a piece of an oversized section ends: the last paragraph end if it fills the piece
 * enough, otherwise the furthest of the last sentence end and that paragraph end, otherwise
 * the word limit.
 */
function chooseCut(
  blockEnds: number[],
  sentences: number[],
  lowerExclusive: number,
  limit: number,
  fullEnough: number,
): number {
  const paragraphEnd = lastBoundary(blockEnds, lowerExclusive, limit);
  if (paragraphEnd !== undefined && paragraphEnd >= fullEnough) return paragraphEnd;
  const sentenceEnd = lastBoundary(sentences, lowerExclusive, limit);
  if (sentenceEnd !== undefined && (paragraphEnd === undefined || sentenceEnd > paragraphEnd)) return sentenceEnd;
  return paragraphEnd ?? limit;
}
```

5. In `splitOversized`, replace everything from `let start = 0;` to the end of the `while` loop with:

```ts
    // Pieces never overlap: each one starts where the previous one ended.
    let start = 0;
    while (start < total) {
      const limit = Math.min(total, start + pieceBudget);
      const lower = start === 0 ? Math.max(start, item.headingEnd) : start;
      let end = limit;
      if (limit < total) {
        end = chooseCut(item.blockEnds, sentences, lower, limit, start + Math.ceil(pieceBudget * MIN_PIECE_FILL));
      }
      if (start === 0 && end <= item.headingEnd) {
        end = Math.min(total, item.headingEnd + 1);
      }
      end = avoidHeadingEnd(end, lower);
      emit([item.section], item.tokens.slice(start, end), item.offset + start);
      start = end;
    }
```

6. In `src/ingestion/indexManager.ts`, delete the line `      chunkOverlap: this.options.chunkOverlap,` from the `base` object in `prepareStructuredChunks`. Leave `prepareLegacyChunks` alone.

- [ ] **Step 4: Run the tests and confirm they pass.**

Run: `npm test`
Expected: all tests PASS. `"chunkStructured produces the worked example from the spec"` must still give 4 chunks.

- [ ] **Step 5: Update the docs.** In both `documentation/CLI.md` and `documentation/Evaluation.md`, change the description cell of the `BIG_RAG_CHUNK_SIZE` / `BIG_RAG_CHUNK_OVERLAP` row from `Chunk size and overlap in tokens` to:

`Chunk size and overlap in tokens. Overlap applies only to the older, unstructured format; structured chunks never overlap`

- [ ] **Step 6: Commit.**

```bash
git add src/chunking/structuredChunker.ts src/ingestion/indexManager.ts src/tests/structuredChunker.test.ts documentation/CLI.md documentation/Evaluation.md
git commit -m "Split large sections into full pieces without overlap in structured mode" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Move structured indexes to format structured-v2

**Files:**
- Modify: `src/utils/embeddingIndexManifest.ts`:
  - `IndexFormat`
  - `readEmbeddingIndexManifest`
  - `desiredIndexFormat`
  - `indexFormatMismatchMessage`
- Modify: `src/ingestion/indexManager.ts` (the chunk metadata in `prepareStructuredChunks`, around line 541)
- Modify: `documentation/UserGuide.md` (the "Index Format Changes" section)
- Test: `src/tests/indexFormat.test.ts`, `src/tests/indexManagerStructured.test.ts`

**Interfaces:**
- Produces: `export const STRUCTURED_INDEX_FORMAT = "structured-v2"` from `src/utils/embeddingIndexManifest.ts`. `IndexFormat` becomes `"legacy" | "structured-v1" | "structured-v2"`.

- [ ] **Step 1: Update the tests.**

In `src/tests/indexFormat.test.ts`:
1. In the test `"planIndexFormat asks for a rebuild only when an existing index uses the other format"`, replace its body's `try` block with:

```ts
    assert.deepEqual(await planIndexFormat(dir, 0, true), { indexFormat: "structured-v2", rebuildExistingFiles: false });
    assert.deepEqual(await planIndexFormat(dir, 10, true), { indexFormat: "structured-v2", rebuildExistingFiles: true });

    await writeEmbeddingIndexManifest(dir, { embeddingModelId: "m", dimensions: 3, indexFormat: "structured-v1" });
    assert.deepEqual(await planIndexFormat(dir, 10, true), { indexFormat: "structured-v2", rebuildExistingFiles: true });

    await writeEmbeddingIndexManifest(dir, { embeddingModelId: "m", dimensions: 3, indexFormat: "structured-v2" });
    assert.deepEqual(await planIndexFormat(dir, 10, true), { indexFormat: "structured-v2", rebuildExistingFiles: false });
    assert.deepEqual(await planIndexFormat(dir, 10, false), { indexFormat: "legacy", rebuildExistingFiles: true });
```

2. Replace the whole test `"indexFormatMismatchMessage describes the needed reindex"` with:

```ts
test("indexFormatMismatchMessage describes the needed reindex", () => {
  assert.equal(desiredIndexFormat(true), "structured-v2");
  assert.equal(desiredIndexFormat(false), "legacy");
  assert.equal(indexFormatMismatchMessage("legacy", "legacy"), null);
  assert.equal(indexFormatMismatchMessage("structured-v2", "structured-v2"), null);
  assert.equal(indexFormatMismatchMessage("legacy", "structured-v2"), "Reindex required to apply structured indexing.");
  assert.equal(
    indexFormatMismatchMessage("structured-v1", "structured-v2"),
    "Reindex required to apply improved structured indexing.",
  );
  assert.equal(
    indexFormatMismatchMessage("structured-v1", "legacy"),
    "Reindex required to switch back to standard indexing.",
  );
  assert.equal(
    indexFormatMismatchMessage("structured-v2", "legacy"),
    "Reindex required to switch back to standard indexing.",
  );
});
```

3. In the test `"indexFormatStatusMessage treats a store without a manifest as legacy"`, change `indexFormat: "structured-v1"` to `indexFormat: "structured-v2"`.

4. Append:

```ts
test("a structured-v1 manifest is read back as structured-v1", async () => {
  const dir = await tempDir();
  try {
    await writeEmbeddingIndexManifest(dir, { embeddingModelId: "m", dimensions: 3, indexFormat: "structured-v1" });
    assert.equal((await readEmbeddingIndexManifest(dir))?.indexFormat, "structured-v1");
    assert.equal(
      await indexFormatStatusMessage(dir, true, async () => 10),
      "Reindex required to apply improved structured indexing.",
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
```

In `src/tests/indexManagerStructured.test.ts`, change both occurrences of `chunk.metadata.indexFormat === "structured-v1"` to `chunk.metadata.indexFormat === "structured-v2"`.

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `npm run build; node --test dist/tests/indexFormat.test.js dist/tests/indexManagerStructured.test.js`
Expected: FAIL. The build itself fails with a type error, because `"structured-v2"` is not yet an `IndexFormat`. Either way counts as failing.

- [ ] **Step 3: Implement.** In `src/utils/embeddingIndexManifest.ts`:

Replace `export type IndexFormat = "legacy" | "structured-v1";` with:

```ts
export type IndexFormat = "legacy" | "structured-v1" | "structured-v2";

/** The format new structured indexes are built with. v2 detects PDF headings from font styles and never overlaps chunks. */
export const STRUCTURED_INDEX_FORMAT = "structured-v2";
```

In `readEmbeddingIndexManifest`, replace

```ts
        indexFormat: data.indexFormat === "structured-v1" ? "structured-v1" : "legacy",
```

with

```ts
        indexFormat:
          data.indexFormat === "structured-v1" || data.indexFormat === "structured-v2" ? data.indexFormat : "legacy",
```

Replace the body of `desiredIndexFormat` with `return structuredIndexing ? STRUCTURED_INDEX_FORMAT : "legacy";`.

Replace `indexFormatMismatchMessage` with:

```ts
export function indexFormatMismatchMessage(indexed: IndexFormat, desired: IndexFormat): string | null {
  if (indexed === desired) return null;
  if (desired === "legacy") return "Reindex required to switch back to standard indexing.";
  return indexed === "legacy"
    ? "Reindex required to apply structured indexing."
    : "Reindex required to apply improved structured indexing.";
}
```

In `src/ingestion/indexManager.ts`:
- add `STRUCTURED_INDEX_FORMAT` to the existing import from `"../utils/embeddingIndexManifest"`. If there is no such import, add `import { STRUCTURED_INDEX_FORMAT } from "../utils/embeddingIndexManifest";`
- replace `indexFormat: "structured-v1",` with `indexFormat: STRUCTURED_INDEX_FORMAT,`

- [ ] **Step 4: Run the tests and confirm they pass.**

Run: `npm test`
Expected: all tests PASS. `settingsSnapshot.test.ts` still writes a `structured-v1` manifest and expects it back, and that stays valid.

- [ ] **Step 5: Update the docs.** In `documentation/UserGuide.md`, section "Index Format Changes", append this paragraph:

```markdown
Structured indexing now finds PDF headings from font styles (bold, italic and larger text) and no longer overlaps chunks. Structured indexes built before this change show *"Reindex required to apply improved structured indexing."* until you reindex.
```

- [ ] **Step 6: Commit.**

```bash
git add src/utils/embeddingIndexManifest.ts src/ingestion/indexManager.ts src/tests/indexFormat.test.ts src/tests/indexManagerStructured.test.ts documentation/UserGuide.md
git commit -m "Build structured indexes as structured-v2 and ask for a reindex of v1 indexes" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Turn styled PDF lines into Markdown with headings

**Files:**
- Create: `src/parsers/markdown/pdfStyles.ts`
- Modify: `src/parsers/markdown/inferStructure.ts` (add an options parameter)
- Test: create `src/tests/pdfStyles.test.ts`

**Interfaces:**
- Produces, from `src/parsers/markdown/pdfStyles.ts`:
  ```ts
  export interface PdfLine { text: string; size: number; bold: boolean; italic: boolean; mixed: boolean; box: [number, number, number, number]; }
  export interface PdfBlock { lines: PdfLine[]; }
  export interface PdfPage { height: number; blocks: PdfBlock[]; }
  export function styleKey(style: { size: number; bold: boolean; italic: boolean }): string;
  export function styledPagesToMarkdown(pages: PdfPage[]): string | null;
  ```
  - `box` is left, top, right, bottom, with y growing downwards from the page top.
  - `size` is already rounded to 0.5pt.
  - `styledPagesToMarkdown` returns `null` when no heading style survives.
- Produces, from `inferStructure.ts`: `inferStructure(raw: string, options?: { inferHeadings?: boolean }): string`. With `inferHeadings: false` it keeps existing `#` headings and list and paragraph handling, but never invents headings.

- [ ] **Step 1: Write the failing tests.** Create `src/tests/pdfStyles.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { styledPagesToMarkdown, type PdfLine, type PdfPage } from "../parsers/markdown/pdfStyles";
import { inferStructure } from "../parsers/markdown/inferStructure";

const BODY_TEXT = "The company reported steady results across every region this year.";

function line(text: string, top: number, style: Partial<PdfLine> = {}): PdfLine {
  return { text, size: 10, bold: false, italic: false, mixed: false, box: [50, top, 550, top + 12], ...style };
}

type Entry = string | [string, Partial<PdfLine>];

/** One 1000-unit-tall page; each entry is its own block, stacked 20 units apart from y=100. */
function page(entries: Entry[]): PdfPage {
  return {
    height: 1000,
    blocks: entries.map((entry, i) => {
      const [text, style] = typeof entry === "string" ? [entry, {}] : entry;
      return { lines: [line(text, 100 + i * 20, style)] };
    }),
  };
}

const body = (count: number): Entry[] => Array.from({ length: count }, () => BODY_TEXT);
const bold = (text: string): Entry => [text, { bold: true }];
const headingLines = (markdown: string | null) => (markdown ?? "").split("\n").filter((l) => /^#{1,6} /.test(l));

test("bold body-size lines become level-2 headings when they are the only heading style", () => {
  const markdown = styledPagesToMarkdown([
    page(body(5)),
    page([bold("Risk Factors"), ...body(10), bold("Liquidity"), ...body(10)]),
  ]);
  assert.deepEqual(headingLines(markdown), ["## Risk Factors", "## Liquidity"]);
  assert.ok(markdown!.includes(`## Risk Factors\n\n${BODY_TEXT}`));
});

test("heading styles rank by size, then first appearance after page 1, with cover-only styles last", () => {
  const markdown = styledPagesToMarkdown([
    page([["Cover Title", { size: 24, bold: true }], ...body(3)]),
    page([
      ["Part One", { size: 14, bold: true }],
      ...body(8),
      bold("Section A"),
      ...body(8),
      ["Detail x", { italic: true }],
      ...body(8),
    ]),
    page([bold("Section B"), ...body(8)]),
  ]);
  assert.deepEqual(headingLines(markdown), [
    "### Cover Title",
    "# Part One",
    "## Section A",
    "### Detail x",
    "## Section B",
  ]);
});

test("repeated page headers, footers and page numbers are removed", () => {
  const withFurniture = (p: PdfPage, n: number): PdfPage => ({
    ...p,
    blocks: [
      { lines: [line("Acme Corp 2021 Annual Report", 20, { bold: true })] },
      ...p.blocks,
      { lines: [line(`Page ${n} of 3`, 960)] },
    ],
  });
  const markdown = styledPagesToMarkdown([
    withFurniture(page(body(5)), 1),
    withFurniture(page([bold("Overview"), ...body(5), "7", ...body(5)]), 2),
    withFurniture(page(body(8)), 3),
  ]);
  assert.deepEqual(headingLines(markdown), ["## Overview"]);
  assert.ok(!markdown!.includes("Acme Corp"), "repeated header removed");
  assert.ok(!markdown!.includes("Page 2 of 3"), "footer removed");
  assert.ok(!/^7$/m.test(markdown!), "page number removed");
});

test("a styled line sharing its row with other text, or with mixed styles, is not a heading", () => {
  const second = page([
    bold("Results"),
    ...body(5),
    bold("Net sales"),
    ["Mixed emphasis line", { bold: true, mixed: true }],
    ...body(5),
  ]);
  const row = second.blocks[6].lines[0];
  const rowTop = row.box[1];
  row.box = [50, rowTop, 150, rowTop + 12];
  second.blocks[6].lines.push(line("1,234", rowTop, { box: [400, rowTop, 450, rowTop + 12] }));

  const markdown = styledPagesToMarkdown([page(body(3)), second]);
  assert.deepEqual(headingLines(markdown), ["## Results"]);
  assert.ok(markdown!.includes("Net sales"), "row label kept as text");
});

test("a style used on more than 15% of lines is emphasis, so no headings are found", () => {
  const markdown = styledPagesToMarkdown([
    page(body(3)),
    page(Array.from({ length: 10 }, (_, i) => i).flatMap((i): Entry[] => [bold(`Key point ${i + 1}`), BODY_TEXT, BODY_TEXT])),
  ]);
  assert.equal(markdown, null);
});

test("a document in a single style has no heading styles", () => {
  assert.equal(styledPagesToMarkdown([page(body(10)), page(body(10))]), null);
  assert.equal(styledPagesToMarkdown([]), null);
});

test("wrapped headings are joined, and a joined run over 12 words stays body text", () => {
  const markdown = styledPagesToMarkdown([
    page(body(3)),
    page([
      bold("Management's Discussion and Analysis"),
      bold("of Financial Condition"),
      ...body(6),
      bold("Overview"),
      ...body(6),
      bold("Alpha beta gamma delta epsilon zeta eta"),
      bold("theta iota kappa lambda mu nu"),
      ...body(6),
    ]),
  ]);
  assert.deepEqual(headingLines(markdown), [
    "## Management's Discussion and Analysis of Financial Condition",
    "## Overview",
  ]);
  assert.ok(markdown!.includes("Alpha beta gamma delta epsilon zeta eta"));
});

test("lines of one block are joined into a paragraph", () => {
  const second = page([bold("Scope"), "First half of a sentence", ...body(5)]);
  second.blocks[1].lines.push(line("continues here.", 132));
  const markdown = styledPagesToMarkdown([page(body(3)), second]);
  assert.ok(markdown!.includes("## Scope\n\nFirst half of a sentence continues here."));
});

test("inferStructure keeps short standalone lines as text when heading inference is off", () => {
  assert.equal(inferStructure("Short line\n\nNext paragraph."), "## Short line\n\nNext paragraph.");
  assert.equal(inferStructure("Short line\n\nNext paragraph.", { inferHeadings: false }), "Short line\n\nNext paragraph.");
  assert.equal(inferStructure("## Kept\n\n- item", { inferHeadings: false }), "## Kept\n\n- item");
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `npm run build`
Expected: FAIL with `Cannot find module '../parsers/markdown/pdfStyles'`.

- [ ] **Step 3: Add the `inferStructure` option.** In `src/parsers/markdown/inferStructure.ts`, change the signature to:

```ts
export function inferStructure(raw: string, options: { inferHeadings?: boolean } = {}): string {
```

Change `    if (current.length === 0) {` (the heading-candidate branch) to:

```ts
    if (options.inferHeadings !== false && current.length === 0) {
```

Add this sentence to the end of its doc comment: `Pass inferHeadings: false when headings are already marked (for example from PDF font styles).`

- [ ] **Step 4: Implement `pdfStyles.ts`.** Create `src/parsers/markdown/pdfStyles.ts`:

```ts
import { inferStructure } from "./inferStructure";

/** One line of PDF text with the style most of its characters use. */
export interface PdfLine {
  text: string;
  /** Font size rounded to the nearest 0.5pt. */
  size: number;
  bold: boolean;
  italic: boolean;
  /** True when the line's characters use more than one style. */
  mixed: boolean;
  /** Left, top, right, bottom in page units, y growing downwards. */
  box: [number, number, number, number];
}

export interface PdfBlock {
  lines: PdfLine[];
}

export interface PdfPage {
  height: number;
  blocks: PdfBlock[];
}

const MAX_HEADING_WORDS = 12;
const FURNITURE_BAND = 0.08;
const FURNITURE_PAGE_SHARE = 0.5;
const FURNITURE_MIN_PAGES = 3;
const MAX_HEADING_STYLE_SHARE = 0.15;
const SAME_ROW_OVERLAP = 0.5;
const MAX_HEADING_LEVEL = 3;
const PAGE_NUMBER = /^(?:page\s+)?\d+(?:\s+of\s+\d+)?$/i;

interface PlacedLine {
  line: PdfLine;
  page: number;
  block: number;
  /** Position in reading order across the whole document. */
  order: number;
}

interface HeadingGroup {
  style: string;
  size: number;
  lines: PlacedLine[];
  text: string;
}

export function styleKey(style: { size: number; bold: boolean; italic: boolean }): string {
  return `${style.size}${style.bold ? "b" : ""}${style.italic ? "i" : ""}`;
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function furnitureKey(text: string): string {
  return text.replace(/\d+/g, "#").replace(/\s+/g, " ").trim().toLowerCase();
}

/** Pass 2: drop page numbers, and headers and footers repeated on at least half the pages. */
function removeFurniture(pages: PdfPage[]): PlacedLine[] {
  const inBand = (line: PdfLine, height: number) =>
    line.box[1] < height * FURNITURE_BAND || line.box[3] > height * (1 - FURNITURE_BAND);

  const pagesByKey = new Map<string, Set<number>>();
  if (pages.length >= FURNITURE_MIN_PAGES) {
    pages.forEach((page, pageNumber) => {
      for (const block of page.blocks) {
        for (const line of block.lines) {
          if (!inBand(line, page.height)) continue;
          const key = furnitureKey(line.text);
          const seen = pagesByKey.get(key) ?? new Set<number>();
          seen.add(pageNumber);
          pagesByKey.set(key, seen);
        }
      }
    });
  }
  const isRepeated = (line: PdfLine, height: number) =>
    inBand(line, height) &&
    (pagesByKey.get(furnitureKey(line.text))?.size ?? 0) >= pages.length * FURNITURE_PAGE_SHARE;

  const kept: PlacedLine[] = [];
  pages.forEach((page, pageNumber) => {
    page.blocks.forEach((block, blockNumber) => {
      for (const line of block.lines) {
        const text = line.text.replace(/\s+/g, " ").trim();
        if (!text || PAGE_NUMBER.test(text)) continue;
        if (pagesByKey.size > 0 && isRepeated(line, page.height)) continue;
        kept.push({ line: { ...line, text }, page: pageNumber, block: blockNumber, order: kept.length });
      }
    });
  });
  return kept;
}

/** The style covering the most words. */
function bodyStyleOf(lines: PlacedLine[]): string {
  const words = new Map<string, number>();
  for (const { line } of lines) {
    const key = styleKey(line);
    words.set(key, (words.get(key) ?? 0) + wordCount(line.text));
  }
  let best = "";
  let bestWords = -1;
  for (const [key, count] of words) {
    if (count > bestWords) {
      best = key;
      bestWords = count;
    }
  }
  return best;
}

/** Guard 1: a heading has its row to itself; table cells and row labels share theirs. */
function sharesRow(target: PlacedLine, pageLines: PlacedLine[]): boolean {
  const [, top, , bottom] = target.line.box;
  const height = Math.max(bottom - top, 1);
  return pageLines.some((other) => {
    if (other === target) return false;
    const overlap = Math.min(bottom, other.line.box[3]) - Math.max(top, other.line.box[1]);
    return overlap > height * SAME_ROW_OVERLAP;
  });
}

/** Pass 3: whole-line, non-body, short lines that stand alone on their row. */
function isCandidate(placed: PlacedLine, bodyStyle: string, pageLines: PlacedLine[]): boolean {
  const { line } = placed;
  if (line.mixed || styleKey(line) === bodyStyle) return false;
  if (wordCount(line.text) > MAX_HEADING_WORDS) return false;
  if (!/\p{L}/u.test(line.text) || /[.,;:]$/.test(line.text)) return false;
  return !sharesRow(placed, pageLines);
}

/** Joins consecutive candidate lines of one style on one page; drops joins over 12 words. */
function groupCandidates(lines: PlacedLine[], candidate: boolean[]): HeadingGroup[] {
  const groups: HeadingGroup[] = [];
  let current: PlacedLine[] = [];
  const close = () => {
    if (current.length === 0) return;
    const text = current.map((placed) => placed.line.text).join(" ");
    if (wordCount(text) <= MAX_HEADING_WORDS) {
      groups.push({ style: styleKey(current[0].line), size: current[0].line.size, lines: current, text });
    }
    current = [];
  };
  lines.forEach((placed, i) => {
    if (!candidate[i]) {
      close();
      return;
    }
    const previous = current[current.length - 1];
    if (previous && (previous.page !== placed.page || styleKey(previous.line) !== styleKey(placed.line))) close();
    current.push(placed);
  });
  close();
  return groups;
}

/** Pass 5: heading level for each surviving style. */
function rankStyles(groups: HeadingGroup[], multiPage: boolean): Map<string, number> {
  const styles = [...new Set(groups.map((group) => group.style))].map((style) => {
    const own = groups.filter((group) => group.style === style);
    const afterCover = own.find((group) => group.lines[0].page > 0);
    return {
      style,
      size: own[0].size,
      coverOnly: multiPage && afterCover === undefined,
      first: (afterCover ?? own[0]).lines[0].order,
    };
  });
  styles.sort((a, b) => Number(a.coverOnly) - Number(b.coverOnly) || b.size - a.size || a.first - b.first);
  const levels = new Map<string, number>();
  styles.forEach(({ style }, i) => {
    levels.set(style, styles.length === 1 ? 2 : Math.min(i + 1, MAX_HEADING_LEVEL));
  });
  return levels;
}

/**
 * Normalized Markdown for a PDF whose headings are marked by font style, or null when
 * no heading style is found (the caller then falls back to plain-text inference).
 */
export function styledPagesToMarkdown(pages: PdfPage[]): string | null {
  const lines = removeFurniture(pages);
  if (lines.length === 0) return null;

  const bodyStyle = bodyStyleOf(lines);
  const linesByPage = new Map<number, PlacedLine[]>();
  for (const placed of lines) {
    const pageLines = linesByPage.get(placed.page) ?? [];
    pageLines.push(placed);
    linesByPage.set(placed.page, pageLines);
  }
  const candidate = lines.map((placed) => isCandidate(placed, bodyStyle, linesByPage.get(placed.page)!));

  // Pass 4 (guard 2): a style on too many lines is emphasis, not a heading level.
  const allGroups = groupCandidates(lines, candidate);
  const linesPerStyle = new Map<string, number>();
  for (const group of allGroups) {
    linesPerStyle.set(group.style, (linesPerStyle.get(group.style) ?? 0) + group.lines.length);
  }
  const groups = allGroups.filter(
    (group) => (linesPerStyle.get(group.style) ?? 0) <= lines.length * MAX_HEADING_STYLE_SHARE,
  );
  if (groups.length === 0) return null;

  const levels = rankStyles(groups, pages.length > 1);
  const headingAt = new Map<number, string>();
  const headingLineOrders = new Set<number>();
  for (const group of groups) {
    headingAt.set(group.lines[0].order, `${"#".repeat(levels.get(group.style)!)} ${group.text}`);
    for (const placed of group.lines) headingLineOrders.add(placed.order);
  }

  const parts: string[] = [];
  let paragraph: string[] = [];
  let currentBlock = "";
  const flush = () => {
    if (paragraph.length > 0) parts.push(paragraph.join("\n"));
    paragraph = [];
  };
  for (const placed of lines) {
    const blockId = `${placed.page}:${placed.block}`;
    if (blockId !== currentBlock) flush();
    currentBlock = blockId;
    const heading = headingAt.get(placed.order);
    if (heading) {
      flush();
      parts.push(heading);
      continue;
    }
    if (headingLineOrders.has(placed.order)) continue;
    paragraph.push(placed.line.text);
  }
  flush();

  return inferStructure(parts.join("\n\n"), { inferHeadings: false });
}
```

- [ ] **Step 5: Run the tests and confirm they pass.**

Run: `npm run build; node --test dist/tests/pdfStyles.test.js`
Expected: all 9 tests PASS. Then run `npm test`. Expected: all tests PASS, since `inferStructure`'s default is unchanged.

- [ ] **Step 6: Commit.**

```bash
git add src/parsers/markdown/pdfStyles.ts src/parsers/markdown/inferStructure.ts src/tests/pdfStyles.test.ts
git commit -m "Find PDF headings from font styles in a new pdfStyles module" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Read styled text with MuPDF first in the PDF parser chain

**Files:**
- Modify: `src/parsers/pdfParser.ts`
- Modify: `README.md` (line 25, the parser description)
- Test: `src/tests/pdfParser.test.ts`

**Interfaces:**
- Consumes: `styledPagesToMarkdown`, `styleKey` and the `PdfPage`, `PdfBlock` and `PdfLine` types from Task 4.
- Produces, from `src/parsers/pdfParser.ts`:
  ```ts
  export interface PdfStages {
    mupdf(filePath: string): Promise<PdfParserResult>;
    pdfParse(filePath: string): Promise<PdfParserResult>;
    ocr(filePath: string): Promise<PdfParserResult>;
    lmStudio(filePath: string, client: LMStudioClient): Promise<PdfParserResult>;
  }
  export const DEFAULT_PDF_STAGES: PdfStages;
  export async function parsePDF(filePath: string, client: LMStudioClient, enableOCR: boolean, stages?: PdfStages): Promise<PdfParserResult>;
  export async function countPdfPages(filePath: string): Promise<number>;
  ```
  The success `stage` values are now `"mupdf" | "pdf-parse" | "ocr" | "lmstudio"`.

- [ ] **Step 1: Write the failing tests.** Append to `src/tests/pdfParser.test.ts`, and add `parsePDF`, `type PdfStages`, `type PdfParserResult` and `type PdfFailureReason` to its import from `"../parsers/pdfParser"`. Also add `import { type LMStudioClient } from "@lmstudio/sdk";`.

```ts
function recordingStages(results: Partial<Record<keyof PdfStages, PdfParserResult>>) {
  const calls: string[] = [];
  const fail = (reason: PdfFailureReason): PdfParserResult => ({ success: false, reason });
  const stage = (name: keyof PdfStages) => async () => {
    calls.push(name);
    return results[name] ?? fail("pdf.pdfparse-empty");
  };
  const stages: PdfStages = {
    mupdf: stage("mupdf"),
    pdfParse: stage("pdfParse"),
    ocr: stage("ocr"),
    lmStudio: stage("lmStudio"),
  };
  return { calls, stages };
}

const noClient = {} as LMStudioClient;

test("parsePDF tries MuPDF styled text first and stops at the first success", async () => {
  const { calls, stages } = recordingStages({ mupdf: { success: true, text: "## Heading\n\nBody.", stage: "mupdf" } });
  const result = await parsePDF("x.pdf", noClient, true, stages);
  assert.equal(result.success, true);
  assert.deepEqual(calls, ["mupdf"]);
});

test("parsePDF falls back from MuPDF to pdf-parse, then OCR, then LM Studio", async () => {
  const { calls, stages } = recordingStages({});
  const result = await parsePDF("x.pdf", noClient, true, stages);
  assert.equal(result.success, false);
  assert.deepEqual(calls, ["mupdf", "pdfParse", "ocr", "lmStudio"]);
});

test("parsePDF skips OCR when it is disabled and still tries LM Studio last", async () => {
  const { calls, stages } = recordingStages({ lmStudio: { success: true, text: "Body text.", stage: "lmstudio" } });
  const result = await parsePDF("x.pdf", noClient, false, stages);
  assert.equal(result.success, true);
  assert.deepEqual(calls, ["mupdf", "pdfParse", "lmStudio"]);
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `npm run build`
Expected: FAIL with type errors, since `PdfStages` is not exported and `parsePDF` takes 3 arguments.

- [ ] **Step 3: Implement.** In `src/parsers/pdfParser.ts`:

1. Add this import:

```ts
import { styleKey, styledPagesToMarkdown, type PdfBlock, type PdfLine, type PdfPage } from "./markdown/pdfStyles";
```

2. Add `"pdf.mupdf-error" | "pdf.mupdf-empty" | "pdf.mupdf-no-headings"` to the `PdfFailureReason` union, at the start. Change `type PdfParseStage` to `"mupdf" | "pdf-parse" | "ocr" | "lmstudio"`.

3. Below `getMupdf`, add:

```ts
type MupdfDocument = ReturnType<Awaited<ReturnType<typeof getMupdf>>["Document"]["openDocument"]>;

const BOLD_FONT = /bold|black|heavy|semibold|demi/i;
const ITALIC_FONT = /italic|oblique/i;

/** One page's lines with the style most of each line's characters use, for heading detection. */
function readStyledPage(doc: MupdfDocument, pageNumber: number): PdfPage {
  const page = doc.loadPage(pageNumber);
  try {
    const bounds = page.getBounds();
    const stext = page.toStructuredText("preserve-whitespace");
    const blocks: PdfBlock[] = [];
    let lines: PdfLine[] = [];
    let chars = "";
    let box: [number, number, number, number] = [0, 0, 0, 0];
    let styles = new Map<string, { size: number; bold: boolean; italic: boolean; count: number }>();
    try {
      stext.walk({
        beginTextBlock() {
          lines = [];
        },
        beginLine(bbox) {
          chars = "";
          box = [bbox[0], bbox[1] - bounds[1], bbox[2], bbox[3] - bounds[1]];
          styles = new Map();
        },
        onChar(c, _origin, font, size) {
          chars += c;
          if (!c.trim()) return;
          const name = font.getName();
          const style = {
            size: Math.round(size * 2) / 2,
            bold: font.isBold() || BOLD_FONT.test(name),
            italic: font.isItalic() || ITALIC_FONT.test(name),
          };
          const key = styleKey(style);
          const entry = styles.get(key) ?? { ...style, count: 0 };
          entry.count++;
          styles.set(key, entry);
        },
        endLine() {
          const text = chars.replace(/\s+/g, " ").trim();
          if (!text || styles.size === 0) return;
          const dominant = [...styles.values()].sort((a, b) => b.count - a.count)[0];
          lines.push({
            text,
            size: dominant.size,
            bold: dominant.bold,
            italic: dominant.italic,
            mixed: styles.size > 1,
            box,
          });
        },
        endTextBlock() {
          if (lines.length > 0) blocks.push({ lines });
        },
      });
    } finally {
      stext.destroy();
    }
    return { height: bounds[3] - bounds[1], blocks };
  } finally {
    page.destroy();
  }
}

async function tryMupdfStyledText(filePath: string): Promise<StageResult> {
  const fileName = path.basename(filePath);
  let doc: MupdfDocument | null = null;
  try {
    const mupdf = await getMupdf();
    doc = mupdf.Document.openDocument(await fs.promises.readFile(filePath), "application/pdf");
    const pages: PdfPage[] = [];
    for (let pageNumber = 0; pageNumber < doc.countPages(); pageNumber++) {
      pages.push(readStyledPage(doc, pageNumber));
    }
    if (pages.every((page) => page.blocks.length === 0)) {
      return { success: false, reason: "pdf.mupdf-empty", details: "no text layer" };
    }
    const markdown = styledPagesToMarkdown(pages);
    if (markdown === null) {
      console.log(`[PDF Parser] (MuPDF) No heading styles found in ${fileName}; trying pdf-parse`);
      return { success: false, reason: "pdf.mupdf-no-headings" };
    }
    if (markdown.length < MIN_TEXT_LENGTH) {
      return { success: false, reason: "pdf.mupdf-empty", details: `length=${markdown.length}` };
    }
    console.log(`[PDF Parser] (MuPDF) Extracted styled text from ${fileName}`);
    return { success: true, text: markdown, stage: "mupdf" };
  } catch (error) {
    const summary = summarizeParserError(error);
    console.warn(`[PDF Parser] MuPDF couldn't read ${fileName} (${summary}); trying pdf-parse`);
    return { success: false, reason: "pdf.mupdf-error", details: summary };
  } finally {
    doc?.destroy();
  }
}

export async function countPdfPages(filePath: string): Promise<number> {
  const mupdf = await getMupdf();
  const doc = mupdf.Document.openDocument(await fs.promises.readFile(filePath), "application/pdf");
  try {
    return doc.countPages();
  } finally {
    doc.destroy();
  }
}
```

4. In `tryLmStudioParser`, change the warning

```ts
      console.warn(`[PDF Parser] LM Studio parser couldn't read ${fileName} (${summary}); trying pdf-parse`);
```

to

```ts
      console.warn(`[PDF Parser] LM Studio parser couldn't read ${fileName} (${summary})`);
```

and change its `"will try fallbacks"` log to `"[PDF Parser] (LM Studio) Parsed but got very little text from ${fileName} (length=${cleaned.length})"`.

5. Replace the whole `parsePDF` function with:

```ts
export interface PdfStages {
  mupdf(filePath: string): Promise<PdfParserResult>;
  pdfParse(filePath: string): Promise<PdfParserResult>;
  ocr(filePath: string): Promise<PdfParserResult>;
  lmStudio(filePath: string, client: LMStudioClient): Promise<PdfParserResult>;
}

export const DEFAULT_PDF_STAGES: PdfStages = {
  mupdf: tryMupdfStyledText,
  pdfParse: tryPdfParse,
  ocr: tryOcrWithMuPdf,
  lmStudio: tryLmStudioParser,
};

/** MuPDF styled text, then pdf-parse, then OCR (when enabled), then the LM Studio parser as a last resort. */
export async function parsePDF(
  filePath: string,
  client: LMStudioClient,
  enableOCR: boolean,
  stages: PdfStages = DEFAULT_PDF_STAGES,
): Promise<PdfParserResult> {
  const fileName = path.basename(filePath);
  const earlierFailures: PdfParserFailure[] = [];
  const reportAllFailed = (final: PdfParserFailure): PdfParserFailure => {
    const stagesTried = [...earlierFailures, final]
      .map((failure) => `${failure.reason}${failure.details ? ` (${failure.details})` : ""}`)
      .join("; ");
    console.error(`[PDF Parser] Could not extract text from ${filePath}: ${stagesTried}`);
    return final;
  };

  const mupdfResult = await stages.mupdf(filePath);
  if (mupdfResult.success) return mupdfResult;
  earlierFailures.push(mupdfResult);

  const pdfParseResult = await stages.pdfParse(filePath);
  if (pdfParseResult.success) return pdfParseResult;
  earlierFailures.push(pdfParseResult);

  if (enableOCR) {
    console.log(`[PDF Parser] (OCR) No text extracted from ${fileName} with MuPDF or pdf-parse, attempting OCR...`);
    const ocrResult = await stages.ocr(filePath);
    if (ocrResult.success) return ocrResult;
    earlierFailures.push(ocrResult);
  } else {
    console.log(`[PDF Parser] (OCR) Enable OCR is off, skipping OCR for ${fileName}`);
    earlierFailures.push({ success: false, reason: "pdf.ocr-disabled" });
  }

  const lmStudioResult = await stages.lmStudio(filePath, client);
  return lmStudioResult.success ? lmStudioResult : reportAllFailed(lmStudioResult);
}
```

`PdfParserResult` and `StageResult` are the same union, so the stage functions fit `PdfStages` as they are. If TypeScript rejects a mupdf walker parameter type (for example `bbox` typed as `Rect`), index it as shown, since `Rect` is a 4-number array. Don't add casts beyond that.

- [ ] **Step 4: Run the tests and confirm they pass.**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 5: Smoke-test on one real PDF.** This step is optional and runs only if `eval/documents/financebench/EBAY_2021_10K.pdf` exists. Save the following as `scratch-mupdf.js` in the repo root, run it with `node scratch-mupdf.js`, then delete it:

```js
const { DEFAULT_PDF_STAGES } = require("./dist/parsers/pdfParser");
DEFAULT_PDF_STAGES.mupdf("eval/documents/financebench/EBAY_2021_10K.pdf").then((r) => {
  console.log(r.success, r.success ? r.text.split("\n").filter((l) => /^#/.test(l)).length : r.reason);
  if (r.success) console.log(r.text.split("\n").filter((l) => /^#/.test(l)).slice(0, 15).join("\n"));
});
```

Expected: `true` and a heading count well above 8, followed by readable headings. Report the output in your task report. Don't commit the file.

- [ ] **Step 6: Update the README.** In `README.md`, replace the sentence on line 25 that starts `Each PDF goes through up to three parsers` with:

```markdown
Each PDF is read with MuPDF first, which keeps font styles so headings can be found from bold and larger text. If that finds no headings, `pdf-parse` is used; scanned PDFs go through page images read with OCR, and LM Studio's built-in document parser is the last resort. Scanned and blueprint-style PDFs still get indexed.
```

- [ ] **Step 7: Commit.**

```bash
git add src/parsers/pdfParser.ts src/tests/pdfParser.test.ts README.md
git commit -m "Parse PDFs with MuPDF styled text first and LM Studio last" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Structure report script

**Files:**
- Create: `src/structureReport.ts`
- Modify: `package.json` (scripts)
- Modify: `documentation/CLI.md` (new section)

**Interfaces:**
- Consumes:
  - `parsePDF`, `DEFAULT_PDF_STAGES` and `countPdfPages` from Task 5
  - `chunkStructured` without `chunkOverlap`, from Task 2
  - `parseDocument(filePath, enableOCR, client?)` from `src/parsers/documentParser.ts`
  - `scanDirectory(rootDir, onProgress?, options?)` from `src/ingestion/fileScanner.ts`, which returns `ScannedFile[]` with `path`, `name`, `extension` and `mtime`
  - `chunkText(text, chunkSize, overlap, countTokens)` from `src/utils/textChunker.ts`
  - `markdownToPlain` from `src/parsers/markdown/normalizeMarkdown.ts`
  - `parseBlocks` from `src/chunking/sections.ts`
  - `readCliIndexingSettings` from `src/settings/cliSettings.ts`
  - `parseExcludePatternsFromEnv` from `src/utils/fileExcludePatterns.ts`
  - `documentPostedDate` and `detectDayMonthOrder` from `src/metadata/dates.ts`
- Produces: `npm run structure:report`.

This is a dev tool with no unit test. It is verified by running it on a small folder in Step 3.

- [ ] **Step 1: Create `src/structureReport.ts`:**

```ts
import * as path from "path";
import { type LMStudioClient } from "@lmstudio/sdk";
import { scanDirectory, type ScannedFile } from "./ingestion/fileScanner";
import { parseDocument } from "./parsers/documentParser";
import { countPdfPages, DEFAULT_PDF_STAGES, parsePDF } from "./parsers/pdfParser";
import { markdownToPlain } from "./parsers/markdown/normalizeMarkdown";
import { parseBlocks } from "./chunking/sections";
import { chunkStructured } from "./chunking/structuredChunker";
import { chunkText } from "./utils/textChunker";
import { detectDayMonthOrder, documentPostedDate } from "./metadata/dates";
import { readCliIndexingSettings } from "./settings/cliSettings";
import { parseExcludePatternsFromEnv } from "./utils/fileExcludePatterns";

/** English text averages about 1.3 embedding tokens per word; both modes use the same estimate. */
const TOKENS_PER_WORD = 1.3;
const HEADINGS_TO_LIST = 20;

const estimateTokens = async (text: string) =>
  Math.ceil(text.split(/\s+/).filter(Boolean).length * TOKENS_PER_WORD);

// The report never uses LM Studio: its parser stage is replaced by one that always fails.
const reportStages = {
  ...DEFAULT_PDF_STAGES,
  lmStudio: async () => ({ success: false as const, reason: "pdf.lmstudio-error" as const, details: "not used by the report" }),
};

interface FileReport {
  file: string;
  parser: string;
  pages: number | null;
  headingsByLevel: [number, number, number];
  headings: string[];
  legacyChunks: number;
  structuredChunks: number;
  fillTotal: number;
}

async function parseForReport(file: ScannedFile, enableOCR: boolean): Promise<{ text: string; parser: string } | null> {
  if (file.extension === ".pdf") {
    const result = await parsePDF(file.path, {} as LMStudioClient, enableOCR, reportStages);
    return result.success ? { text: result.text, parser: result.stage } : null;
  }
  const result = await parseDocument(file.path, enableOCR);
  return result.success ? { text: result.document.text, parser: file.extension.slice(1) } : null;
}

async function reportFile(file: ScannedFile, root: string, settings: ReturnType<typeof readCliIndexingSettings>): Promise<FileReport | null> {
  const parsed = await parseForReport(file, settings.enableOCR);
  if (!parsed) return null;
  const markdown = parsed.text;

  const headingBlocks = parseBlocks(markdown).filter((block) => block.kind === "heading");
  const headingsByLevel: [number, number, number] = [0, 0, 0];
  for (const block of headingBlocks) headingsByLevel[Math.min(block.level, 3) - 1]++;

  const legacy = await chunkText(markdownToPlain(markdown), settings.chunkSize, settings.chunkOverlap, estimateTokens);
  const postedDate = documentPostedDate(markdown, file.name, file.mtime);
  const structured = await chunkStructured(markdown, {
    fileName: file.name,
    postedDate,
    chunkSize: settings.chunkSize,
    countTokens: estimateTokens,
    dateContext: {
      order: detectDayMonthOrder(markdown),
      referenceTime: file.mtime,
      defaultYear: Number(postedDate.start.slice(0, 4)),
    },
  });
  let fillTotal = 0;
  for (const chunk of structured) {
    fillTotal += ((await estimateTokens(chunk.contextHeader)) + (await estimateTokens(chunk.text))) / settings.chunkSize;
  }

  return {
    file: path.relative(root, file.path),
    parser: parsed.parser,
    pages: file.extension === ".pdf" ? await countPdfPages(file.path) : null,
    headingsByLevel,
    headings: headingBlocks.map((block) => `${"#".repeat(block.level)} ${block.text}`),
    legacyChunks: legacy.length,
    structuredChunks: structured.length,
    fillTotal,
  };
}

async function main() {
  const documentsDir = process.env.BIG_RAG_DOCS_DIR ?? process.argv[2];
  if (!documentsDir) {
    console.error("Usage: BIG_RAG_DOCS_DIR=/path/to/docs npm run structure:report");
    process.exit(1);
  }
  const listHeadings = (process.env.BIG_RAG_REPORT_HEADINGS ?? "false").toLowerCase() === "true";
  const settings = readCliIndexingSettings(process.env);
  const root = path.resolve(documentsDir);
  const files = await scanDirectory(root, undefined, {
    excludePatterns: parseExcludePatternsFromEnv(process.env.BIG_RAG_EXCLUDE_PATTERNS),
  });

  const reports: FileReport[] = [];
  let failed = 0;
  for (const file of files) {
    let report: FileReport | null = null;
    try {
      report = await reportFile(file, root, settings);
    } catch (error) {
      console.warn(`[Structure Report] ${file.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!report) {
      failed++;
      console.log(`${path.relative(root, file.path)}  FAILED`);
      continue;
    }
    reports.push(report);
    const total = report.headingsByLevel.reduce((a, b) => a + b, 0);
    const perPage = report.pages ? (total / report.pages).toFixed(2) : "-";
    const fill = report.structuredChunks > 0 ? Math.round((100 * report.fillTotal) / report.structuredChunks) : 0;
    console.log(
      `${report.file}  parser=${report.parser}  pages=${report.pages ?? "-"}  ` +
        `headings=${report.headingsByLevel.join("/")}  perPage=${perPage}  ` +
        `legacy=${report.legacyChunks}  structured=${report.structuredChunks}  fill=${fill}%`,
    );
    if (listHeadings) {
      for (const heading of report.headings.slice(0, HEADINGS_TO_LIST)) console.log(`    ${heading}`);
    }
  }

  const pdfs = reports.filter((report) => report.pages !== null);
  const pdfsWithHeadings = pdfs.filter((report) => report.headingsByLevel.some((count) => count > 0));
  const legacy = reports.reduce((sum, report) => sum + report.legacyChunks, 0);
  const structured = reports.reduce((sum, report) => sum + report.structuredChunks, 0);
  const fillTotal = reports.reduce((sum, report) => sum + report.fillTotal, 0);
  console.log("");
  console.log(`Files: ${files.length} (failed ${failed})`);
  console.log(`PDFs with headings: ${pdfsWithHeadings.length}/${pdfs.length}`);
  console.log(`Parsers: ${JSON.stringify(countBy(reports.map((report) => report.parser)))}`);
  console.log(
    `Chunks: legacy ${legacy}, structured ${structured}, ratio ${legacy > 0 ? (structured / legacy).toFixed(2) : "-"}`,
  );
  console.log(`Average structured fill: ${structured > 0 ? Math.round((100 * fillTotal) / structured) : 0}%`);
}

function countBy(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}

void main();
```

- [ ] **Step 2: Add the npm script.** In `package.json` `scripts`, after `"eval:run"`, add:

```json
    "structure:report": "npm run build && node dist/structureReport.js",
```

- [ ] **Step 3: Verify it runs.** Make a temporary folder under the scratch directory holding 2 or 3 PDFs. If `eval/documents/financebench/` exists, copy `EBAY_2021_10K.pdf` and `3M_2016_10K.pdf` from it; otherwise use any PDFs. Then run, in PowerShell:

```powershell
$env:BIG_RAG_DOCS_DIR = "<that folder>"; $env:BIG_RAG_REPORT_HEADINGS = "true"; npm run structure:report
```

Expected: one line per file with `parser=mupdf` (or `pdf-parse`), the heading list, and a totals block. Remove both env vars afterwards (`Remove-Item Env:BIG_RAG_DOCS_DIR, Env:BIG_RAG_REPORT_HEADINGS`). Include the output in your task report.

- [ ] **Step 4: Document it.** In `documentation/CLI.md`, add this section after the "Failure Reports" section:

````markdown
### Structure Report

`npm run structure:report` shows how documents will be split, without building an index or starting LM Studio.

```powershell
$env:BIG_RAG_DOCS_DIR = "D:\docs"; npm run structure:report
```

For each file it prints the parser used, headings found at each level and per page, legacy and structured chunk counts, and how full structured chunks are on average; totals follow at the end. Set `BIG_RAG_REPORT_HEADINGS=true` to also list each file's first 20 headings. Token counts are estimated at 1.3 per word, so chunk counts are close to, not exactly, what indexing produces. `BIG_RAG_CHUNK_SIZE`, `BIG_RAG_CHUNK_OVERLAP`, `BIG_RAG_ENABLE_OCR` and `BIG_RAG_EXCLUDE_PATTERNS` apply as they do for indexing.
````

- [ ] **Step 5: Run the full suite and commit.**

Run: `npm test`
Expected: all tests PASS.

```bash
git add src/structureReport.ts package.json documentation/CLI.md
git commit -m "Add a structure report that shows headings and chunk counts per document" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Measure against the pass criteria

This task is run by the controller with the user, not by an implementation subagent. It needs the FinanceBench documents and the user's non-finance PDFs.

- [ ] **Step 1: Run the report on FinanceBench.**

```powershell
$env:BIG_RAG_DOCS_DIR = "D:\Projects\SAIC\SNIP\plugin_dev\big-rag\eval\documents\financebench"; npm run structure:report *> "$env:TEMP\structure-financebench.txt"
```

Check these against the spec:
- "PDFs with headings" covers at least 90% of the filings that previously found few or no headings
- the chunk ratio is at most 1.1

- [ ] **Step 2: Spot-check headings.** Run the report with `BIG_RAG_REPORT_HEADINGS=true` on a folder holding eBay 2021, General Mills 2023 and 3M 2016. For each, mark which of the first 20 headings are real. The target is at least 85% real.
- [ ] **Step 3: Repeat Step 2 for 3 to 5 non-finance PDFs** supplied by the user.
- [ ] **Step 4: Rebuild and re-run the eval.** Rebuild the structured FinanceBench index with `npm run index:cli`, then run Legacy Low, Structured Low and Structured Medium with `npm run eval:run`. Structured final hit must be no worse than Legacy Low.
- [ ] **Step 5: Report the numbers to the user.** If a criterion fails, bring the failing files back into brainstorming before changing any thresholds.
