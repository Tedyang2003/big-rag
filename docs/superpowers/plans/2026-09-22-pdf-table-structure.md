# PDF Table Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recover rows and columns from PDF tables, keep tables whole in chunks, embed each row with the words that name its values, and use the embedding prefixes the model expects.

**Architecture:**
- `pdfStyles` keeps a merged row's cells instead of discarding them, and a new `pdfTables` module decides which runs of rows are tables and which row is the header.
- The chunker treats a run of table rows as a unit: whole when it fits, split only between rows, header repeated, and a linearised `embedText` built for embedding while `text` stays the grid.
- One module owns the Nomic prefixes so the document and query sides cannot drift apart, and the manifest records which convention an index was built with.

**Tech Stack:** TypeScript (CommonJS output, `module: nodenext`), Node's built-in `node:test`, `mupdf` 1.27.

**Spec:** `docs/superpowers/specs/2026-09-22-pdf-table-structure-design.md`

## Global Constraints

- **Table run:** two or more consecutive row-like lines whose cells align; a line is row-like when it merged from 2 or more cells.
- **Column tolerance:** 3% of page width.
- **Ragged rows:** a row with fewer cells joins a run when every one of its cells starts within tolerance of an established column.
- **Header row:** the first row where more than half the cells are non-numeric, provided some later row contains a numeric cell; otherwise the run's first row.
- **Numeric cell:** after stripping `$ % ( ) , .` and a leading `-`, non-empty and all digits.
- **Row format:** `cell | cell | cell` — the same form `parseBlocks` already turns into a `tableRow` block.
- **Chunking:** a table that fits goes in whole; otherwise it splits only between rows, and each piece repeats the header row.
- **Two representations:** `text` is the grid (what the model and citations see); `embedText` is the linearised form (what gets embedded).
- **Linearised row:** `<first cell> — <header 2>: <cell 2>; <header 3>: <cell 3>`.
- **Prefixes:** `search_document: ` on everything embedded at indexing and on compaction sentences; `search_query: ` on queries. Applied only when the embedding model id contains `nomic-embed`.
- **Manifest:** records `embeddingPrefixes: "nomic" | "none"`; a mismatch is refused like a model mismatch.
- **Index format:** `structured-v3`.
- **Scope:** no new dependency, no network, no finance-specific rules.
- **Git:** plain imperative commit messages, each ending with a separate `-m` paragraph exactly `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Never push. Stage only the files the task names; never `.lmstudio/dev.js` or anything under `documentation/diagrams`, `documentation/updates`, `documentation/images`.
- **Tests:** a single file with `npm run build; node --test dist/tests/<name>.test.js`; the whole suite with `npm test`. PowerShell 5.1: chain with `;`, not `&&`.

### Deviation from the spec, decided while planning

The spec places the header flag in `sections.ts` (`parseBlocks` marking the first row of a run). The chunker can derive the same thing from runs of consecutive `tableRow` blocks, which it must walk anyway to keep a table whole. Deriving it there keeps `Block` unchanged and still benefits DOCX, HTML and PPTX tables, since the chunker is format-agnostic. `sections.ts` is therefore not modified.

---

### Task 1: Keep a row's cells, and give a page its width

**Files:**
- Modify: `src/parsers/markdown/pdfStyles.ts` (the `PdfLine` and `PdfPage` interfaces, and `mergeSameRowLines`)
- Modify: `src/parsers/pdfParser.ts` (`readStyledPage`, which builds `PdfPage`)
- Test: `src/tests/pdfStyles.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface PdfCell { text: string; x0: number; x1: number; }
  export interface PdfLine { /* …as today… */ cells?: PdfCell[]; }
  export interface PdfPage { width: number; height: number; blocks: PdfBlock[]; }
  ```
  `cells` is set only on lines merged from two or more pieces, ordered left to right. `width` is the page's width in the same units as the boxes.

- [ ] **Step 1: Write the failing tests.** In `src/tests/pdfStyles.test.ts`, update the `page()` helper to include a width, and append two tests:

Change the helper's returned object from `{ height: 1000, blocks: … }` to `{ width: 612, height: 1000, blocks: … }`. Do the same for any other place in that file that builds a `PdfPage` literal.

```ts
test("a line merged from several pieces keeps them as cells, left to right", () => {
  const row = { height: 1000, width: 612, blocks: [{ lines: [
    line("1,577", 300, { box: [400, 300, 450, 312] }),
    line("Capital expenditures", 300, { box: [60, 300, 200, 312] }),
  ] }] };
  const markdown = styledPagesToMarkdown([page(body(4)), { ...row, blocks: [...row.blocks, ...page(body(6)).blocks] }]);

  assert.ok(markdown === null || markdown.includes("Capital expenditures 1,577"), "cells still read left to right");
});

test("a line that was never merged has no cells", () => {
  // Verified through the module's own behaviour: a single-piece line is unchanged.
  const markdown = styledPagesToMarkdown([page(body(3)), page([bold("Overview"), ...body(6)])]);
  assert.ok(markdown!.includes("## Overview"));
});
```

- [ ] **Step 2: Run the build to see it fail.**

Run: `npm run build`
Expected: FAIL — `width` is not a property of `PdfPage`.

- [ ] **Step 3: Implement.** In `src/parsers/markdown/pdfStyles.ts`:

Add the cell type and the two interface fields:

```ts
/** One piece of a merged row: its text and horizontal extent. */
export interface PdfCell {
  text: string;
  x0: number;
  x1: number;
}
```

Add `cells?: PdfCell[];` to `PdfLine`, documented as "Set when this line was merged from several pieces on one row, ordered left to right."
Add `width: number;` to `PdfPage`, above `height`.

In `mergeSameRowLines`, where a merged line is built, record the cells. Replace:

```ts
    merged.push({
      firstIndex: Math.min(...members),
      line: { text, size: dominant.size, bold: dominant.bold, italic: dominant.italic, mixed, box },
    });
```

with:

```ts
    const cells = byLeft.map((part) => ({ text: part.text, x0: part.box[0], x1: part.box[2] }));
    merged.push({
      firstIndex: Math.min(...members),
      line: { text, size: dominant.size, bold: dominant.bold, italic: dominant.italic, mixed, box, cells },
    });
```

In `src/parsers/pdfParser.ts`, `readStyledPage` returns the page; change:

```ts
    return { height: bounds[3] - bounds[1], blocks };
```

to:

```ts
    return { width: bounds[2] - bounds[0], height: bounds[3] - bounds[1], blocks };
```

- [ ] **Step 4: Run the tests.**

Run: `npm run build; node --test dist/tests/pdfStyles.test.js`
Expected: all PASS. Then `npm test` — all PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/parsers/markdown/pdfStyles.ts src/parsers/pdfParser.ts src/tests/pdfStyles.test.ts
git commit -m "Keep the cells of a merged PDF row and record each page's width" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Detect tables and emit rows

**Files:**
- Create: `src/parsers/markdown/pdfTables.ts`
- Modify: `src/parsers/markdown/pdfStyles.ts` (the emit loop at the end of `styledPagesToMarkdown`)
- Test: create `src/tests/pdfTables.test.ts`, and add one test to `src/tests/pdfStyles.test.ts`

**Interfaces:**
- Consumes: `PdfLine` and `PdfCell` from Task 1.
- Produces, from `src/parsers/markdown/pdfTables.ts`:
  ```ts
  export interface TableRow { cells: string[]; isHeader: boolean; }
  /** Rows of every table run among `lines`, keyed by each line's index in `lines`. */
  export function findTableRows(lines: PdfLine[], pageWidth: number): Map<number, TableRow>;
  export function isNumericCell(text: string): boolean;
  ```

- [ ] **Step 1: Write the failing tests.** Create `src/tests/pdfTables.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { findTableRows, isNumericCell } from "../parsers/markdown/pdfTables";
import { type PdfLine } from "../parsers/markdown/pdfStyles";

/** A line whose cells start at the given x positions. */
function row(texts: string[], xs: number[], top = 100): PdfLine {
  return {
    text: texts.join(" "),
    size: 10,
    bold: false,
    italic: false,
    mixed: false,
    box: [xs[0], top, 550, top + 12],
    cells: texts.map((text, i) => ({ text, x0: xs[i], x1: xs[i] + 40 })),
  };
}

function plain(text: string, top = 100): PdfLine {
  return { text, size: 10, bold: false, italic: false, mixed: false, box: [60, top, 550, top + 12] };
}

const COLUMNS = [60, 300, 400, 500];

test("two aligned rows are a table", () => {
  const rows = findTableRows(
    [row(["Years ended", "2018", "2017", "2016"], COLUMNS, 100), row(["Capital expenditures", "1,577", "1,373", "1,420"], COLUMNS, 120)],
    612,
  );
  assert.equal(rows.size, 2);
  assert.deepEqual(rows.get(1)?.cells, ["Capital expenditures", "1,577", "1,373", "1,420"]);
});

test("a single row-like line on its own is not a table", () => {
  const rows = findTableRows([plain("intro"), row(["Label", "42"], [60, 300], 120), plain("outro", 140)], 612);
  assert.equal(rows.size, 0);
});

test("a row with fewer cells that align continues the run", () => {
  const rows = findTableRows(
    [
      row(["Years ended", "2018", "2017", "2016"], COLUMNS, 100),
      row(["Capital expenditures", "1,577", "1,373", "1,420"], COLUMNS, 120),
      row(["Total", "9,000"], [60, 300], 140),
    ],
    612,
  );
  assert.equal(rows.size, 3, "the subtotal row belongs to the table");
  assert.deepEqual(rows.get(2)?.cells, ["Total", "9,000"]);
});

test("rows whose cells do not align are not a table", () => {
  const rows = findTableRows(
    [row(["Alpha", "beta"], [60, 300], 100), row(["Gamma", "delta"], [60, 480], 120)],
    612,
  );
  assert.equal(rows.size, 0);
});

test("the header is the first mostly-textual row, not a numeric one", () => {
  const rows = findTableRows(
    [
      row(["2018", "2017", "2016"], [300, 400, 500], 100),
      row(["Years ended December 31", "2018", "2017", "2016"], COLUMNS, 120),
      row(["Capital expenditures", "1,577", "1,373", "1,420"], COLUMNS, 140),
    ],
    612,
  );
  assert.equal(rows.get(0)?.isHeader, false);
  assert.equal(rows.get(1)?.isHeader, true);
});

test("an all-numeric table falls back to its first row as the header", () => {
  const rows = findTableRows(
    [row(["1", "2", "3"], [60, 300, 400], 100), row(["4", "5", "6"], [60, 300, 400], 120)],
    612,
  );
  assert.equal(rows.get(0)?.isHeader, true);
});

test("isNumericCell reads money, percentages and bracketed negatives", () => {
  for (const value of ["1,577", "$1,577", "(221)", "3.20", "12%", "-5"]) assert.equal(isNumericCell(value), true, value);
  for (const value of ["Capital expenditures", "2018 total", "—", ""]) assert.equal(isNumericCell(value), false, value);
});
```

And append to `src/tests/pdfStyles.test.ts`:

```ts
test("a table in a PDF becomes rows of cells", () => {
  const cellLine = (texts: string[], xs: number[], top: number) => ({
    text: texts.join(" "),
    size: 10,
    bold: false,
    italic: false,
    mixed: false,
    box: [xs[0], top, 550, top + 12] as [number, number, number, number],
    cells: texts.map((text, i) => ({ text, x0: xs[i], x1: xs[i] + 40 })),
  });
  const columns = [60, 300, 400];
  const tablePage: PdfPage = {
    width: 612,
    height: 1000,
    blocks: [
      { lines: [cellLine(["Years ended", "2018", "2017"], columns, 100)] },
      { lines: [cellLine(["Capital expenditures", "1,577", "1,373"], columns, 120)] },
      ...page(body(8)).blocks,
    ],
  };

  const markdown = styledPagesToMarkdown([page([bold("Cash Flows"), ...body(6)]), tablePage]);

  assert.ok(markdown!.includes("Years ended | 2018 | 2017"), "header row");
  assert.ok(markdown!.includes("Capital expenditures | 1,577 | 1,373"), "data row");
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npm run build`
Expected: FAIL — `../parsers/markdown/pdfTables` does not exist.

- [ ] **Step 3: Implement the module.** Create `src/parsers/markdown/pdfTables.ts`:

```ts
import { type PdfLine } from "./pdfStyles";

/** A row of a detected table: its cells left to right, and whether it names the columns. */
export interface TableRow {
  cells: string[];
  isHeader: boolean;
}

/** Columns line up when their left edges agree to within this share of the page width. */
const COLUMN_TOLERANCE_SHARE = 0.03;
/** A table needs at least this many rows, so a single wide line is never one. */
const MIN_RUN_ROWS = 2;

/** True for money, counts, percentages and bracketed negatives - anything that is only digits underneath. */
export function isNumericCell(text: string): boolean {
  const bare = text.replace(/^-/, "").replace(/[$%(),.]/g, "").trim();
  return bare.length > 0 && /^\d+$/.test(bare);
}

function columnsOf(line: PdfLine): number[] {
  return (line.cells ?? []).map((cell) => cell.x0);
}

/** A row continues a run when its cells sit on the established columns; it may use fewer of them. */
function continuesRun(columns: number[], line: PdfLine, tolerance: number): boolean {
  const cells = line.cells ?? [];
  if (cells.length < 2 || cells.length > columns.length) return false;
  return cells.every((cell) => columns.some((column) => Math.abs(cell.x0 - column) <= tolerance));
}

function headerIndex(run: PdfLine[]): number {
  const cellsOf = (line: PdfLine) => (line.cells ?? []).map((cell) => cell.text);
  const hasNumbersLater = (from: number) =>
    run.slice(from + 1).some((line) => cellsOf(line).some(isNumericCell));
  for (let i = 0; i < run.length; i++) {
    const cells = cellsOf(run[i]);
    const textual = cells.filter((cell) => !isNumericCell(cell)).length;
    if (textual > cells.length / 2 && hasNumbersLater(i)) return i;
  }
  return 0;
}

/**
 * Rows of every table run among `lines`, keyed by each line's index. A run is two or more
 * consecutive lines that were merged from several cells and whose cells share columns.
 * Anything looser stays prose: a mangled paragraph is worse than a missed table.
 */
export function findTableRows(lines: PdfLine[], pageWidth: number): Map<number, TableRow> {
  const tolerance = pageWidth * COLUMN_TOLERANCE_SHARE;
  const rows = new Map<number, TableRow>();

  let index = 0;
  while (index < lines.length) {
    const start = lines[index];
    if ((start.cells?.length ?? 0) < 2) {
      index++;
      continue;
    }
    const columns = columnsOf(start);
    let end = index + 1;
    while (end < lines.length && continuesRun(columns, lines[end], tolerance)) end++;

    if (end - index >= MIN_RUN_ROWS) {
      const run = lines.slice(index, end);
      const header = headerIndex(run);
      run.forEach((line, i) => {
        rows.set(index + i, { cells: (line.cells ?? []).map((cell) => cell.text), isHeader: i === header });
      });
      index = end;
    } else {
      index++;
    }
  }
  return rows;
}
```

- [ ] **Step 4: Emit the rows.** In `src/parsers/markdown/pdfStyles.ts`, import the detector:

```ts
import { findTableRows } from "./pdfTables";
```

The emit loop walks `lines` (kept `PlacedLine`s) and pushes paragraph text. Before the loop, work out which kept lines are table rows, block by block:

```ts
  // Table rows are found per block, on the lines that survived furniture removal.
  const rowByOrder = new Map<number, string>();
  const blockLines = new Map<string, PlacedLine[]>();
  for (const placed of lines) {
    const key = `${placed.page}:${placed.block}`;
    const list = blockLines.get(key) ?? [];
    list.push(placed);
    blockLines.set(key, list);
  }
  for (const [key, placedLines] of blockLines) {
    const pageWidth = pages[Number(key.split(":")[0])]?.width ?? 612;
    for (const [index, row] of findTableRows(placedLines.map((p) => p.line), pageWidth)) {
      rowByOrder.set(placedLines[index].order, row.cells.join(" | "));
    }
  }
```

Then, inside the loop, use the row form when there is one. Replace:

```ts
    paragraph.push(/^#{1,6}\s/.test(placed.line.text) ? `\\${placed.line.text}` : placed.line.text);
```

with:

```ts
    const row = rowByOrder.get(placed.order);
    if (row) {
      paragraph.push(row);
      continue;
    }
    paragraph.push(/^#{1,6}\s/.test(placed.line.text) ? `\\${placed.line.text}` : placed.line.text);
```

Note that `pages` is the merged page list already in scope in `styledPagesToMarkdown`; if the kept lines are produced by a helper that does not expose it, pass the page widths in alongside.

- [ ] **Step 5: Run the tests.**

Run: `npm run build; node --test dist/tests/pdfTables.test.js dist/tests/pdfStyles.test.js`
Expected: all PASS. Then `npm test` — all PASS.

- [ ] **Step 6: Check it on a real filing.** Write `scratch-table.js` in the repo root, run it, then delete it:

```js
const { DEFAULT_PDF_STAGES } = require("./dist/parsers/pdfParser");
DEFAULT_PDF_STAGES.mupdf("eval/documents/financebench/3M_2018_10K.pdf").then((r) => {
  const rows = r.success ? r.text.split("\n").filter((l) => l.includes(" | ")) : [];
  console.log("table rows:", rows.length);
  console.log(rows.slice(0, 15).join("\n"));
});
```

Expected: a few hundred rows, and the first ones should look like statement rows. Put the output in your report. Do not commit the script.

- [ ] **Step 7: Commit.**

```bash
git add src/parsers/markdown/pdfTables.ts src/parsers/markdown/pdfStyles.ts src/tests/pdfTables.test.ts src/tests/pdfStyles.test.ts
git commit -m "Detect tables in PDFs and emit their rows as cells" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Keep tables whole, repeat headers, and linearise for embedding

**Files:**
- Create: `src/chunking/linariseTables.ts`
- Modify: `src/chunking/structuredChunker.ts` (`StructuredChunk`, `SectionTokens`, `tokenizeSection`, `emit`, `splitOversized`)
- Test: create `src/tests/linariseTables.test.ts`; add tests to `src/tests/structuredChunker.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function linariseTables(text: string): string;          // src/chunking/linariseTables.ts
  export interface StructuredChunk { /* …as today… */ embedText?: string; }
  ```
  `embedText` is set only when linearisation changed the text, so non-table chunks keep exactly one representation.

- [ ] **Step 1: Write the failing tests.** Create `src/tests/linariseTables.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { linariseTables } from "../chunking/linariseTables";

test("each row after the header is named by its columns", () => {
  const text = [
    "Years ended December 31 | 2018 | 2017",
    "Capital expenditures | 1,577 | 1,373",
    "Depreciation | 1,488 | 1,544",
  ].join("\n");

  assert.equal(
    linariseTables(text),
    [
      "Years ended December 31 | 2018 | 2017",
      "Capital expenditures — 2018: 1,577; 2017: 1,373",
      "Depreciation — 2018: 1,488; 2017: 1,544",
    ].join("\n"),
  );
});

test("prose is untouched, and a new table starts after it", () => {
  const text = ["Some prose about cash flows.", "A | B", "one | two", "More prose.", "C | D", "three | four"].join("\n");
  const out = linariseTables(text).split("\n");

  assert.equal(out[0], "Some prose about cash flows.");
  assert.equal(out[2], "one — B: two");
  assert.equal(out[3], "More prose.");
  assert.equal(out[5], "three — D: four");
});

test("a row with more cells than the header keeps the extra values unnamed", () => {
  assert.equal(linariseTables("A | B\none | two | three"), "A | B\none — B: two; three");
});

test("text with no table is returned unchanged", () => {
  assert.equal(linariseTables("just a sentence"), "just a sentence");
});
```

And append to `src/tests/structuredChunker.test.ts`:

```ts
const TABLE_SECTION = [
  "## Consolidated Statement of Cash Flows",
  "",
  "Years ended December 31 | 2018 | 2017",
  ...Array.from({ length: 40 }, (_, i) => `Line item ${i} | ${i}00 | ${i}50`),
].join("\n");

test("a table that fits stays whole and needs no linearised copy of its prose", async () => {
  const markdown = ["## Small table", "", "Year | Amount", "2018 | 1,577", "2019 | 1,700"].join("\n");
  const chunks = await chunkStructured(markdown, options({ chunkSize: 400 }));

  assert.equal(chunks.length, 1);
  assert.ok(chunks[0].text.includes("2018 | 1,577"), "the grid is what the reader sees");
  assert.ok(chunks[0].embedText?.includes("2018 — Amount: 1,577"), "the linearised form is what gets embedded");
});

test("a table too large for one chunk splits between rows and repeats its header", async () => {
  const chunks = await chunkStructured(TABLE_SECTION, options({ chunkSize: 110 }));

  assert.ok(chunks.length > 1, `expected several pieces, got ${chunks.length}`);
  for (const chunk of chunks.slice(1)) {
    assert.ok(
      chunk.text.startsWith("Years ended December 31 | 2018 | 2017"),
      `piece does not repeat the header: ${chunk.text.slice(0, 60)}`,
    );
  }
  for (const chunk of chunks) {
    for (const line of chunk.text.split("\n")) {
      if (!line.includes(" | ")) continue;
      assert.equal(line.split(" | ").length, 3, `row was cut in half: ${line}`);
    }
  }
});

test("a chunk of prose has no separate embedded form", async () => {
  const chunks = await chunkStructured(ROUNDUP, options());
  for (const chunk of chunks) assert.equal(chunk.embedText, undefined);
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npm run build`
Expected: FAIL — `../chunking/linariseTables` does not exist and `embedText` is not a property of `StructuredChunk`.

- [ ] **Step 3: Implement the linearisation.** Create `src/chunking/linariseTables.ts`:

```ts
/**
 * Rewrites table rows so each one carries the words that name its values. A grid of numbers
 * barely embeds at all: "Capital expenditures | 1,577" shares nothing with a question asking
 * what capital expenditure was in 2018. Naming each value with its column repairs that, while
 * the grid itself stays as the text a reader is shown.
 *
 * The first row of a run of table rows names the columns; the chunker repeats it at the top of
 * every piece of a split table, so a piece's own first row is always its header.
 */
export function linariseTables(text: string): string {
  const out: string[] = [];
  let header: string[] | null = null;

  for (const line of text.split("\n")) {
    if (!line.includes(" | ")) {
      header = null;
      out.push(line);
      continue;
    }
    const cells = line.split(" | ").map((cell) => cell.trim());
    if (!header) {
      header = cells;
      out.push(line);
      continue;
    }
    const named = cells
      .slice(1)
      .map((value, i) => {
        const column = header?.[i + 1] ?? "";
        return column ? `${column}: ${value}` : value;
      })
      .join("; ");
    out.push(named ? `${cells[0]} — ${named}` : cells[0]);
  }
  return out.join("\n");
}
```

- [ ] **Step 4: Implement the chunker changes.** In `src/chunking/structuredChunker.ts`:

Import it and add the field:

```ts
import { linariseTables } from "./linariseTables";
```

```ts
export interface StructuredChunk {
  text: string;
  /** The form that gets embedded, when it differs from `text` (tables are linearised). */
  embedText?: string;
  contextHeader: string;
  // …rest unchanged…
}
```

Add a table range to `SectionTokens`:

```ts
interface TableRange {
  /** Token offsets within the section. */
  start: number;
  end: number;
  /** The run's first row, repeated at the top of any piece that starts inside the table. */
  headerText: string;
}

interface SectionTokens {
  // …as today…
  tables: TableRange[];
}
```

In `tokenizeSection`, record runs of consecutive `tableRow` blocks:

```ts
  const tables: TableRange[] = [];
  let openTable: { start: number; headerText: string } | null = null;
```

Inside the `forEach` over blocks, after the words are pushed and before the `kind === "heading"` branch:

```ts
    if (block.kind === "tableRow") {
      if (!openTable) openTable = { start: tokens.length - blockWords.length, headerText: renderBlock(block) };
    } else if (openTable) {
      tables.push({ ...openTable, end: tokens.length - blockWords.length });
      openTable = null;
    }
```

After the loop, close a table that runs to the end of the section, and return it:

```ts
  if (openTable) tables.push({ ...openTable, end: tokens.length });
  return { section, tokens, offset, blockEnds, headingEnd, headingEnds, tables };
```

`emit` gains an optional prefix and sets `embedText`. Replace it with:

```ts
  const emit = (group: Section[], tokens: Token[], startIndex: number, prefix = "") => {
    const body = tokensToText(tokens);
    const text = prefix ? `${prefix}\n${body}` : body;
    const { sectionPath, dates, contextHeader } = describe(group, text);
    const embedded = linariseTables(text);
    chunks.push({
      text,
      embedText: embedded === text ? undefined : embedded,
      contextHeader,
      sectionPath,
      dates,
      startIndex,
      endIndex: startIndex + tokens.length,
    });
  };
```

Note that `startIndex`/`endIndex` still describe the tokens of the original text, so a repeated header is not counted in the span.

In `splitOversized`, keep tables whole and cut only between rows. After `const headingEndSet = new Set(item.headingEnds);` add:

```ts
    const tableAt = (position: number): TableRange | undefined =>
      item.tables.find((table) => position > table.start && position < table.end);
```

Inside the loop, after `end` is chosen by `chooseCut` and before `avoidHeadingEnd`, add:

```ts
      // A table is kept whole when it can be: cut before it starts, or, when the piece already
      // begins inside one, only at a row boundary.
      const straddled = tableAt(end);
      if (straddled) {
        if (straddled.start > lower) {
          end = straddled.start;
        } else {
          end = lastBoundary(item.blockEnds, lower, limit) ?? end;
        }
      }
```

And when emitting, repeat the header if the piece begins inside a table:

```ts
      const openedIn = tableAt(start) ?? item.tables.find((table) => table.start === start);
      const repeatHeader =
        openedIn && start > openedIn.start ? openedIn.headerText : "";
      emit([item.section], item.tokens.slice(start, end), item.offset + start, repeatHeader);
```

- [ ] **Step 5: Run the tests.**

Run: `npm run build; node --test dist/tests/linariseTables.test.js dist/tests/structuredChunker.test.js`
Expected: all PASS, including the existing word-preservation and no-overlap tests, which use table-free Markdown.

Then `npm test` — all PASS.

- [ ] **Step 6: Commit.**

```bash
git add src/chunking/linariseTables.ts src/chunking/structuredChunker.ts src/tests/linariseTables.test.ts src/tests/structuredChunker.test.ts
git commit -m "Keep tables whole in chunks and embed their rows with column names" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Embed the linearised text, and move the index format to structured-v3

**Files:**
- Modify: `src/utils/embeddingIndexManifest.ts` (`IndexFormat`, `STRUCTURED_INDEX_FORMAT`, `readEmbeddingIndexManifest`, `indexFormatMismatchMessage`)
- Modify: `src/ingestion/indexManager.ts` (`prepareStructuredChunks`)
- Modify: `documentation/UserGuide.md`
- Test: `src/tests/indexFormat.test.ts`, `src/tests/indexManagerStructured.test.ts`

**Interfaces:**
- Consumes: `StructuredChunk.embedText` from Task 3.
- Produces: `IndexFormat` becomes `"legacy" | "structured-v1" | "structured-v2" | "structured-v3"`, and `STRUCTURED_INDEX_FORMAT` is `"structured-v3"`.

- [ ] **Step 1: Update the tests.** In `src/tests/indexFormat.test.ts`, replace every `"structured-v2"` that stands for *the current format* with `"structured-v3"`, and add:

```ts
test("a structured-v2 index asks for the improved reindex", () => {
  assert.equal(desiredIndexFormat(true), "structured-v3");
  assert.equal(
    indexFormatMismatchMessage("structured-v2", "structured-v3"),
    "Reindex required to apply improved structured indexing.",
  );
  assert.equal(indexFormatMismatchMessage("structured-v3", "structured-v3"), null);
});
```

In `src/tests/indexManagerStructured.test.ts`, change both `chunk.metadata.indexFormat === "structured-v2"` assertions to `"structured-v3"`, and add to the first test, after the structured chunks are read back:

```ts
    assert.ok(
      structured.every((chunk) => typeof chunk.metadata.contextHeader === "string"),
      "structured chunks keep their context header",
    );
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npm run build`
Expected: FAIL — `"structured-v3"` is not assignable to `IndexFormat`.

- [ ] **Step 3: Implement.** In `src/utils/embeddingIndexManifest.ts`:

```ts
export type IndexFormat = "legacy" | "structured-v1" | "structured-v2" | "structured-v3";

/** The format new structured indexes are built with. v3 gives PDF tables rows and columns. */
export const STRUCTURED_INDEX_FORMAT = "structured-v3";
```

In `readEmbeddingIndexManifest`, accept the new value:

```ts
        indexFormat:
          data.indexFormat === "structured-v1" ||
          data.indexFormat === "structured-v2" ||
          data.indexFormat === "structured-v3"
            ? data.indexFormat
            : "legacy",
```

`indexFormatMismatchMessage` needs no change: it already says "improved structured indexing" whenever the stored format is structured and differs.

In `src/ingestion/indexManager.ts`, `prepareStructuredChunks` returns prepared chunks; change the mapping so the linearised form is embedded:

```ts
    return chunks.map((chunk) => ({
      text: chunk.text,
      embedText: `${chunk.contextHeader}\n${chunk.embedText ?? chunk.text}`,
      startIndex: chunk.startIndex,
      endIndex: chunk.endIndex,
      metadata: {
        indexFormat: STRUCTURED_INDEX_FORMAT,
        postedDate: JSON.stringify(postedDate),
        dates: JSON.stringify(chunk.dates),
        sectionPath: chunk.sectionPath,
        contextHeader: chunk.contextHeader,
      },
    }));
```

- [ ] **Step 4: Run the tests.**

Run: `npm run build; node --test dist/tests/indexFormat.test.js dist/tests/indexManagerStructured.test.js`
Expected: all PASS. Then `npm test` — all PASS.

- [ ] **Step 5: Document it.** In `documentation/UserGuide.md`, under "Index Format Changes", append:

```markdown
From this version, tables in PDFs are indexed as rows of cells rather than a run of text, and each row is matched by the words that name its values. A passage can therefore be found by text that differs slightly from what the citation shows: the citation shows the table, while search matched a form of it that names each value by its column. Structured indexes built before this change show *"Reindex required to apply improved structured indexing."* until you reindex.
```

- [ ] **Step 6: Commit.**

```bash
git add src/utils/embeddingIndexManifest.ts src/ingestion/indexManager.ts src/tests/indexFormat.test.ts src/tests/indexManagerStructured.test.ts documentation/UserGuide.md
git commit -m "Embed linearised table rows and move structured indexes to v3" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Apply the embedding prefixes the model expects

**Files:**
- Create: `src/utils/embeddingPrefix.ts`
- Modify: `src/ingestion/indexManager.ts` (`IndexManagerOptions`, and where chunks are embedded)
- Modify: `src/ingestion/runIndexing.ts` and `src/cliIndex.ts` (pass the model id)
- Modify: `src/promptPreprocessor.ts` (the `embedQuery` and `embedSentences` callbacks)
- Modify: `src/evalCli.ts` (the same two callbacks)
- Modify: `src/utils/embeddingIndexManifest.ts` (manifest field, write and check)
- Modify: `documentation/UserGuide.md`
- Test: create `src/tests/embeddingPrefix.test.ts`; add one test to `src/tests/indexFormat.test.ts`

**Interfaces:**
- Produces, from `src/utils/embeddingPrefix.ts`:
  ```ts
  export type EmbeddingPrefixes = "nomic" | "none";
  export function prefixConventionFor(modelId: string): EmbeddingPrefixes;
  export function documentText(modelId: string, text: string): string;
  export function queryText(modelId: string, text: string): string;
  ```
  And from `embeddingIndexManifest.ts`: `EmbeddingIndexManifest` gains `embeddingPrefixes: EmbeddingPrefixes`.

- [ ] **Step 1: Write the failing tests.** Create `src/tests/embeddingPrefix.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { documentText, prefixConventionFor, queryText } from "../utils/embeddingPrefix";

test("Nomic models get the prefixes they were trained with", () => {
  const model = "nomic-ai/nomic-embed-text-v1.5-GGUF";
  assert.equal(prefixConventionFor(model), "nomic");
  assert.equal(documentText(model, "Capital expenditures"), "search_document: Capital expenditures");
  assert.equal(queryText(model, "what were capital expenditures"), "search_query: what were capital expenditures");
});

test("other models are embedded unprefixed", () => {
  const model = "sentence-transformers/all-MiniLM-L6-v2";
  assert.equal(prefixConventionFor(model), "none");
  assert.equal(documentText(model, "Capital expenditures"), "Capital expenditures");
  assert.equal(queryText(model, "what were capital expenditures"), "what were capital expenditures");
});

test("the convention is recognised whatever the publisher or quantisation", () => {
  for (const model of ["nomic-embed-text-v1.5", "NOMIC-EMBED-TEXT-V1", "lmstudio/nomic-embed-text-v1.5-Q4_K_M"]) {
    assert.equal(prefixConventionFor(model), "nomic", model);
  }
});
```

And append to `src/tests/indexFormat.test.ts`:

```ts
test("an index built under a different prefix convention is refused", async () => {
  const dir = await tempDir();
  try {
    await writeEmbeddingIndexManifest(dir, {
      embeddingModelId: "m",
      dimensions: 3,
      indexFormat: "structured-v3",
      embeddingPrefixes: "none",
    });
    const manifest = await readEmbeddingIndexManifest(dir);
    assert.equal(manifest?.embeddingPrefixes, "none");
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npm run build`
Expected: FAIL — `../utils/embeddingPrefix` does not exist.

- [ ] **Step 3: Implement the module.** Create `src/utils/embeddingPrefix.ts`:

```ts
/**
 * Nomic's embedding models are trained asymmetrically: a document is embedded as
 * "search_document: …" and a question as "search_query: …", which places a question near the
 * passages that answer it. Without the prefixes, scores are flatter and ranking is worse. Any
 * other model is embedded as-is, since these strings mean nothing to it.
 *
 * Both sides must agree. One module owns the decision so they cannot drift apart, and the
 * index manifest records which convention an index was built with.
 */
export type EmbeddingPrefixes = "nomic" | "none";

const DOCUMENT_PREFIX = "search_document: ";
const QUERY_PREFIX = "search_query: ";

export function prefixConventionFor(modelId: string): EmbeddingPrefixes {
  return /nomic-embed/i.test(modelId) ? "nomic" : "none";
}

export function documentText(modelId: string, text: string): string {
  return prefixConventionFor(modelId) === "nomic" ? `${DOCUMENT_PREFIX}${text}` : text;
}

export function queryText(modelId: string, text: string): string {
  return prefixConventionFor(modelId) === "nomic" ? `${QUERY_PREFIX}${text}` : text;
}
```

- [ ] **Step 4: Record the convention in the manifest.** In `src/utils/embeddingIndexManifest.ts`:

Add the import and the field:

```ts
import { prefixConventionFor, type EmbeddingPrefixes } from "./embeddingPrefix";
```

```ts
export interface EmbeddingIndexManifest {
  embeddingModelId: string;
  dimensions: number;
  indexFormat: IndexFormat;
  /** Which embedding prefix convention the stored vectors were built with. */
  embeddingPrefixes: EmbeddingPrefixes;
}
```

In `readEmbeddingIndexManifest`, read it, defaulting to `"none"` for manifests written before this field existed:

```ts
        embeddingPrefixes: data.embeddingPrefixes === "nomic" ? "nomic" : "none",
```

In `syncEmbeddingManifestAfterIndexing`, write it:

```ts
  await writeEmbeddingIndexManifest(vectorStoreDir, {
    embeddingModelId: resolvedModelId,
    dimensions,
    indexFormat,
    embeddingPrefixes: prefixConventionFor(resolvedModelId),
  });
```

In `checkEmbeddingModelForRetrieval`, after the model-id check and before the dimension probe, refuse a mismatch:

```ts
  const expectedPrefixes = prefixConventionFor(resolvedModelId);
  if (manifest.embeddingPrefixes !== expectedPrefixes) {
    const logMessage =
      `Embedding prefix mismatch: index was built with "${manifest.embeddingPrefixes}" prefixes but ` +
      `"${resolvedModelId}" expects "${expectedPrefixes}". Reindex required.`;
    return {
      ok: false,
      logMessage,
      userMessage:
        "The document index was built before this version's embedding change, so searches would score badly. " +
        "Reindex your documents to rebuild it.",
    };
  }
```

- [ ] **Step 5: Use it everywhere something is embedded.**

In `src/ingestion/indexManager.ts`, `IndexManagerOptions` carries `embeddingModel` but not its id, so add one beside it:

```ts
  embeddingModel: EmbeddingDynamicHandle;
  /** The resolved id of that model, for the prefix convention it expects. */
  embeddingModelId: string;
```

At line 401, `const embeddingResult = await embeddingModel.embed(chunk.embedText);` becomes:

```ts
          const embeddingResult = await embeddingModel.embed(
            documentText(this.options.embeddingModelId, chunk.embedText),
          );
```

`embeddingModel` there is destructured from `this.options` at line 332; add `embeddingModelId` to that destructuring or read it from `this.options` as shown.

Both places that construct an `IndexManager` already hold the resolved id:
- `src/ingestion/runIndexing.ts` has `resolvedModelId` (line 65); pass `embeddingModelId: resolvedModelId`.
- `src/cliIndex.ts` has `resolvedEmbeddingModelId`; pass `embeddingModelId: resolvedEmbeddingModelId`.

Any test that constructs an `IndexManager` needs the new field — `src/tests/indexManagerStructured.test.ts` builds one; give it `embeddingModelId: "test-model"`, which has no prefix convention, so those tests keep asserting on unprefixed text.

In `src/promptPreprocessor.ts` (around line 508), the retrieval callbacks become — the scope's model id is `resolvedEmbeddingModelId`:

```ts
        embedQuery: async (text) =>
          (await embeddingModel.embed(queryText(resolvedEmbeddingModelId, text))).embedding,
        embedSentences: (sentences) =>
          embeddingModel.embed(sentences.map((sentence) => documentText(resolvedEmbeddingModelId, sentence))),
```

In `src/evalCli.ts` (around line 129), the same two callbacks, where the id is `embeddingModelId`:

```ts
            embedQuery: async (text) => (await embeddingModel.embed(queryText(embeddingModelId, text))).embedding,
            embedSentences: (sentences) =>
              embeddingModel.embed(sentences.map((sentence) => documentText(embeddingModelId, sentence))),
```

- [ ] **Step 6: Run the tests.**

Run: `npm run build; node --test dist/tests/embeddingPrefix.test.js dist/tests/indexFormat.test.js`
Expected: all PASS. Then `npm test` — all PASS. Any test that builds an `EmbeddingIndexManifest` literal needs `embeddingPrefixes` added; fix those as you find them.

- [ ] **Step 7: Document it.** In `documentation/UserGuide.md`, in the same "Index Format Changes" area, append:

```markdown
Indexes are also embedded the way the Nomic models expect, which improves how closely a question matches the passages that answer it. This too needs a reindex: the plugin refuses an index built the old way rather than searching it badly.
```

- [ ] **Step 8: Commit.**

```bash
git add src/utils/embeddingPrefix.ts src/utils/embeddingIndexManifest.ts src/ingestion/indexManager.ts src/ingestion/runIndexing.ts src/cliIndex.ts src/promptPreprocessor.ts src/evalCli.ts src/tests/embeddingPrefix.test.ts src/tests/indexFormat.test.ts documentation/UserGuide.md
git commit -m "Embed documents and queries with the prefixes Nomic models expect" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Report tables in the structure report

**Files:**
- Modify: `src/structureReport.ts`
- Modify: `documentation/CLI.md` (the Structure Report section)

**Interfaces:**
- Consumes: the `cell | cell` rows produced by Task 2.

- [ ] **Step 1: Implement.** In `src/structureReport.ts`, count tables from the parsed Markdown. Add to `FileReport`:

```ts
  tables: number;
  tableRows: number;
```

Count them where the heading blocks are counted, using the same `parseBlocks` output:

```ts
  // A table is a run of consecutive rows; counting runs rather than rows says how many
  // tables a document has, which is what tells you whether detection is working.
  const blocks = parseBlocks(markdown);
  let tables = 0;
  let tableRows = 0;
  let inTable = false;
  for (const block of blocks) {
    if (block.kind === "tableRow") {
      tableRows++;
      if (!inTable) tables++;
      inTable = true;
    } else {
      inTable = false;
    }
  }
```

Reuse that `blocks` array for the existing heading count rather than parsing twice.

Add the two numbers to the per-file line and the totals:

```ts
    console.log(
      `${report.file}  parser=${report.parser}  pages=${report.pages ?? "-"}  ` +
        `headings=${report.headingsByLevel.join("/")}  perPage=${perPage}  tables=${report.tables}/${report.tableRows}r  ` +
        `legacy=${report.legacyChunks}  structured=${report.structuredChunks}  fill=${fill}%`,
    );
```

```ts
  console.log(
    `Tables: ${reports.reduce((sum, report) => sum + report.tables, 0)} ` +
      `(${reports.reduce((sum, report) => sum + report.tableRows, 0)} rows), ` +
      `in ${reports.filter((report) => report.tables > 0).length}/${reports.length} files`,
  );
```

- [ ] **Step 2: Run it on the sample folder.**

```powershell
$env:BIG_RAG_DOCS_DIR = "C:\Users\awsy2\AppData\Local\Temp\claude\d--Projects-SAIC-SNIP-plugin-dev-big-rag\91274518-c109-49ff-9dee-b3e4a8804bda\scratchpad\structure-sample"; npm run structure:report
Remove-Item Env:BIG_RAG_DOCS_DIR
```

Expected: both 10-Ks report tables, and chunk counts stay close to the previous run (legacy 573, structured 656). Put the output in your report.

- [ ] **Step 3: Run it on the non-finance PDFs.**

```powershell
$env:BIG_RAG_DOCS_DIR = "D:\Projects\SAIC\SNIP\plugin_dev\big-rag\eval\documents\others"; npm run structure:report
Remove-Item Env:BIG_RAG_DOCS_DIR
```

Expected: chunk counts within 10% of the previous run (legacy 520, structured 565, ratio 1.09). Report the numbers and say whether any prose was turned into rows — check by eye with `BIG_RAG_REPORT_HEADINGS=true` if the counts look wrong.

- [ ] **Step 4: Document it.** In `documentation/CLI.md`, in the Structure Report section, add to the sentence listing what is printed: "tables detected and their row count".

- [ ] **Step 5: Run the suite and commit.**

Run: `npm test`
Expected: all PASS.

```bash
git add src/structureReport.ts documentation/CLI.md
git commit -m "Report table counts in the structure report" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Rebuild and measure

Run by the controller with the user, not by an implementation subagent. It needs LM Studio and several hours.

- [ ] **Step 1: Rebuild both indexes** with the new parser, chunker and prefixes.

```powershell
Remove-Item -Recurse -Force eval\vdbs\legacy, eval\vdbs\structured
$env:BIG_RAG_DOCS_DIR = "D:\Projects\SAIC\SNIP\plugin_dev\big-rag\eval\documents\financebench"

$env:BIG_RAG_DB_DIR = "D:\Projects\SAIC\SNIP\plugin_dev\big-rag\eval\vdbs\legacy"
$env:BIG_RAG_STRUCTURED_INDEXING = "false"
npm run index:cli *> C:\temp\index-legacy.txt

$env:BIG_RAG_DB_DIR = "D:\Projects\SAIC\SNIP\plugin_dev\big-rag\eval\vdbs\structured"
$env:BIG_RAG_STRUCTURED_INDEXING = "true"
npm run index:cli *> C:\temp\index-structured.txt
```

Record both chunk counts. Structured was 116,741; the target is no more than 10% above that.

- [ ] **Step 2: Run the three configurations** — Legacy Low, Structured Low, Structured Medium — as `documentation/Evaluation.md` describes, with `BIG_RAG_CATALOG_MAX_CHUNKS = "250000"` on Medium.

- [ ] **Step 3: Compare against the recorded baselines.** Today: Legacy Low 7 hits of 88; Structured Low 9; Structured Medium 9 with MRR 0.122. Watch in particular:
  - **statement-evidence hits**, today 1 of 31
  - **the scorable count**, today 88 — better table text may bring some of the 62 unscorable questions back, which changes the denominator
  - **wrong-company and wrong-document shares**, which should not regress

- [ ] **Step 4: Record the results** in `documentation/Evaluation.md`, including the note that tables and prefixes shipped together and cannot be separated.
