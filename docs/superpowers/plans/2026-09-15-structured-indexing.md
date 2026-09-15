# Structured Indexing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every chunk know its file, section, and dates by normalizing all parser output to Markdown, chunking on document structure, extracting dates, and embedding a context header, behind a `structuredIndexing` toggle.

**Architecture:** Parsers return one Markdown convention. A date module extracts date ranges with layered disambiguation. A section builder turns Markdown into sections with inherited dates, and a structured chunker packs or splits those sections within a token budget and builds context headers. `IndexManager` chooses the legacy or structured path per the toggle, records the index format in the manifest, and rebuilds files when the format changes. The prompt shows headers; citations do not.

**Tech Stack:** TypeScript (strict, nodenext), `node:test` + `node:assert/strict`, `cheerio` 1.2 (types from `domhandler`), `mammoth`, `jszip`, `tesseract.js`, `vectra`, `@lmstudio/sdk` 1.5.

**Spec:** `docs/superpowers/specs/2026-09-15-structured-indexing-design.md`

## Global Constraints

- Branch: `feature/metadata-summarization`. Never stage `.lmstudio/dev.js` (pre-existing local change, rewritten by every build). Stage explicit paths only.
- Commit messages: plain imperative sentence, ending with exactly `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Tests live in `src/tests/*.test.ts`; `npm test` builds and runs `dist/tests/*.test.js`. No test may require LM Studio.
- Normalized Markdown contract: headings `#`/`##`/`###` (deeper collapse to `###`); paragraphs separated by one blank line; list items `- ` or `1. ` at line start, nested items indented two spaces per level; table rows `cell | cell | cell`; page/slide boundaries as headings (`## Page N`, `## Slide N: <title>`).
- Dates are ISO ranges `{ start: "YYYY-MM-DD", end: "YYYY-MM-DD" }`; a single day has `start === end`.
- Heading inference: at most 12 words, not ending in `.` `,` `;` `:`, followed by a blank line or first content of the text.
- Posted date: first date in the first 300 words of parsed Markdown, then first date in the file name, then the file modified time (local calendar day).
- Ambiguous numeric dates: part > 12 fixes the order; then the document's convention; then the reading within 45 days of the file modified time; otherwise keep both readings.
- List-item section titles and "first line" dates use the first 80 characters of the item or block.
- Chunk budget counts `contextHeader + text`. Overlap applies only to splits of an oversized section.
- Context header: `[File: <fileName> | Posted: <range> | Section: <sectionPath> | Dates: <ranges comma-separated>]`, with `Section:` omitted when empty and `Dates:` omitted when empty. A multi-day range renders as `start–end` (en dash).
- Chunk metadata fields (all primitives): `indexFormat` (`legacy` | `structured-v1`), `postedDate` (JSON string), `dates` (JSON string array), `sectionPath` (string; extra packed section titles joined with ` ; `), `contextHeader` (string), `startIndex`, `endIndex` (numbers).
- Config toggle `structuredIndexing` (default `false`); CLI env `BIG_RAG_STRUCTURED_INDEXING` (default `false`).
- Manifest `indexFormat`; absent means `legacy`.
- Plan clarifications (rulings, documented in Task 8): Markdown files are normalized to the contract (links → text, emphasis and inline-code markers removed, fenced code removed, block quotes flattened), not passed through byte-for-byte; switching the toggle back off shows "Reindex required to switch back to standard indexing."

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/metadata/dates.ts` | Create | Date patterns, ambiguity rules, posted date, range formatting |
| `src/parsers/markdown/inferStructure.ts` | Create | Headings, list items, paragraphs for unmarked text |
| `src/parsers/markdown/htmlToMarkdown.ts` | Create | HTML → Markdown contract |
| `src/parsers/markdown/normalizeMarkdown.ts` | Create | `.md` normalization and `markdownToPlain` for the legacy path |
| `src/parsers/markdown/ocrPages.ts` | Create | OCR page Markdown with page headings |
| `src/parsers/htmlParser.ts`, `docxParser.ts`, `epubParser.ts`, `textParser.ts`, `pptxParser.ts`, `documentParser.ts` | Modify | Emit the Markdown contract |
| `src/parsers/pdfParser.ts`, `imageParser.ts` | Modify | Keep line breaks, infer structure, page headings for OCR |
| `src/chunking/sections.ts` | Create | Markdown → blocks → sections with paths and inherited dates |
| `src/chunking/structuredChunker.ts` | Create | Packing, oversized splits, headers, chunk metadata |
| `src/utils/embeddingIndexManifest.ts` | Modify | `indexFormat`, format planning, mismatch message |
| `src/ingestion/indexManager.ts` | Modify | Legacy vs structured preparation, rebuild on format change |
| `src/ingestion/runIndexing.ts`, `src/cliIndex.ts`, `src/config.ts` | Modify | Toggle plumbing and manifest format |
| `src/retrieval/renderPassage.ts` | Create | Prompt rendering with header |
| `src/promptPreprocessor.ts` | Modify | Prompt rendering, mismatch status, toggle plumbing |
| `README.md`, spec | Modify | Documentation |

---

### Task 1: Date extraction

**Files:**
- Create: `src/metadata/dates.ts`
- Test: `src/tests/dates.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface DateRange { start: string; end: string }`
  - `type DayMonthOrder = "day-first" | "month-first"`
  - `interface DateContext { order?: DayMonthOrder; referenceTime?: Date; defaultYear?: number; fileName?: boolean }`
  - `function extractDates(text: string, context?: DateContext): DateRange[]`
  - `function detectDayMonthOrder(text: string): DayMonthOrder | undefined`
  - `function documentPostedDate(markdown: string, fileName: string, fileModifiedTime: Date): DateRange`
  - `function dayRangeOf(date: Date): DateRange`
  - `function dedupeRanges(ranges: DateRange[]): DateRange[]`
  - `function formatDateRange(range: DateRange): string`

- [ ] **Step 1: Write the failing test**

Create `src/tests/dates.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import {
  dayRangeOf,
  detectDayMonthOrder,
  documentPostedDate,
  extractDates,
  formatDateRange,
} from "../metadata/dates";

const day = (iso: string) => ({ start: iso, end: iso });

test("extractDates reads ISO dates", () => {
  assert.deepEqual(extractDates("Report 2026-09-15 final"), [day("2026-09-15")]);
  assert.deepEqual(extractDates("Filed 2026/9/5."), [day("2026-09-05")]);
});

test("extractDates reads compact dates only in file names", () => {
  assert.deepEqual(extractDates("ref 20260915"), []);
  assert.deepEqual(extractDates("report 20260915", { fileName: true }), [day("2026-09-15")]);
});

test("extractDates reads month-name forms", () => {
  assert.deepEqual(extractDates("On 15 September 2026 we met"), [day("2026-09-15")]);
  assert.deepEqual(extractDates("Sept 15, 2026"), [day("2026-09-15")]);
  assert.deepEqual(extractDates("15-Sep-26"), [day("2026-09-15")]);
  assert.deepEqual(extractDates("1st Sep 2026"), [day("2026-09-01")]);
});

test("extractDates needs a default year for day-month forms without a year", () => {
  assert.deepEqual(extractDates("due 15 Sep"), []);
  assert.deepEqual(extractDates("due 15 Sep", { defaultYear: 2026 }), [day("2026-09-15")]);
});

test("extractDates reads quarters and months as ranges", () => {
  const q3 = { start: "2026-07-01", end: "2026-09-30" };
  assert.deepEqual(extractDates("Q3 2026 results"), [q3]);
  assert.deepEqual(extractDates("2026 Q3 results"), [q3]);
  assert.deepEqual(extractDates("September 2026 update"), [{ start: "2026-09-01", end: "2026-09-30" }]);
  assert.deepEqual(extractDates("February 2028"), [{ start: "2028-02-01", end: "2028-02-29" }]);
});

test("extractDates does not double count a full date as a month range", () => {
  assert.deepEqual(extractDates("15 September 2026"), [day("2026-09-15")]);
});

test("extractDates ignores versions, times, money, percentages, and bare years", () => {
  assert.deepEqual(extractDates("v2.3.1 at 14:30 costs $15.09 (15.09%) for 2026 units"), []);
});

test("extractDates resolves numeric dates that have a part above 12", () => {
  assert.deepEqual(extractDates("15/04/2026"), [day("2026-04-15")]);
  assert.deepEqual(extractDates("04/15/2026"), [day("2026-04-15")]);
});

test("extractDates uses the document convention for ambiguous numeric dates", () => {
  assert.deepEqual(extractDates("03/04/2026", { order: "day-first" }), [day("2026-04-03")]);
  assert.deepEqual(extractDates("03/04/2026", { order: "month-first" }), [day("2026-03-04")]);
});

test("detectDayMonthOrder finds a single consistent convention", () => {
  assert.equal(detectDayMonthOrder("25/03/2026 and 03/04/2026"), "day-first");
  assert.equal(detectDayMonthOrder("03/25/2026"), "month-first");
  assert.equal(detectDayMonthOrder("25/03/2026 and 03/25/2026"), undefined);
  assert.equal(detectDayMonthOrder("03/04/2026"), undefined);
});

test("extractDates picks the reading within 45 days of the file time", () => {
  const referenceTime = new Date(2026, 3, 20); // 20 April 2026
  assert.deepEqual(extractDates("03/04/2026", { referenceTime }), [day("2026-04-03")]);
});

test("extractDates keeps both readings when nothing decides", () => {
  assert.deepEqual(extractDates("03/04/2026"), [day("2026-04-03"), day("2026-03-04")]);
});

test("extractDates returns dates in order of appearance without duplicates", () => {
  assert.deepEqual(extractDates("8 Sep 2026 then 3 Sep 2026"), [day("2026-09-08"), day("2026-09-03")]);
  assert.deepEqual(extractDates("2026-09-15 and 15 Sep 2026"), [day("2026-09-15")]);
});

test("documentPostedDate prefers the first page over the file name", () => {
  const markdown = "# Report\n\nPublished 20 September 2026\n\nBody.";
  assert.deepEqual(
    documentPostedDate(markdown, "2026-09-15_report.pdf", new Date(2026, 8, 22)),
    day("2026-09-20"),
  );
});

test("documentPostedDate falls back to the file name, then the modified time", () => {
  assert.deepEqual(
    documentPostedDate("# Report\n\nNo dates here.", "2026-09-15_report.pdf", new Date(2026, 8, 22)),
    day("2026-09-15"),
  );
  assert.deepEqual(
    documentPostedDate("# Report\n\nNo dates here.", "report.pdf", new Date(2026, 8, 22)),
    day("2026-09-22"),
  );
});

test("documentPostedDate only looks at the first 300 words", () => {
  const filler = Array.from({ length: 300 }, (_, i) => `word${i}`).join(" ");
  const markdown = `${filler} 20 September 2026`;
  assert.deepEqual(documentPostedDate(markdown, "report.pdf", new Date(2026, 0, 5)), day("2026-01-05"));
});

test("documentPostedDate accepts a range", () => {
  assert.deepEqual(
    documentPostedDate("Q3 2026 update", "report.pdf", new Date(2026, 8, 22)),
    { start: "2026-07-01", end: "2026-09-30" },
  );
});

test("dayRangeOf and formatDateRange", () => {
  assert.deepEqual(dayRangeOf(new Date(2026, 8, 5)), day("2026-09-05"));
  assert.equal(formatDateRange(day("2026-09-05")), "2026-09-05");
  assert.equal(formatDateRange({ start: "2026-07-01", end: "2026-09-30" }), "2026-07-01–2026-09-30");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../metadata/dates'`.

- [ ] **Step 3: Write the implementation**

Create `src/metadata/dates.ts`:

```ts
export interface DateRange {
  start: string;
  end: string;
}

export type DayMonthOrder = "day-first" | "month-first";

export interface DateContext {
  /** Day/month order the document is known to use, for ambiguous numeric dates. */
  order?: DayMonthOrder;
  /** File modified time, used to pick between ambiguous readings. */
  referenceTime?: Date;
  /** Year for day-month forms written without one (e.g. "15 Sep"). */
  defaultYear?: number;
  /** Allow compact dates such as 20260915, which are only reliable in file names. */
  fileName?: boolean;
}

const MONTH_PATTERN =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const AMBIGUITY_WINDOW_DAYS = 45;
const POSTED_DATE_WORD_WINDOW = 300;
const DAY_MS = 86_400_000;

const NUMERIC_DATE = /(?<![\w.\/$-])(\d{1,2})([\/.\-])(\d{1,2})\2(\d{4})(?![\w%]|[.\/-]\d)/g;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function monthIndex(name: string): number {
  return MONTH_KEYS.indexOf(name.slice(0, 3).toLowerCase()) + 1;
}

function singleDay(year: number, month: number, dayOfMonth: number): DateRange | null {
  if (month < 1 || month > 12 || dayOfMonth < 1 || dayOfMonth > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, dayOfMonth));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== dayOfMonth) return null;
  const iso = `${year}-${pad(month)}-${pad(dayOfMonth)}`;
  return { start: iso, end: iso };
}

function monthRange(year: number, month: number): DateRange {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { start: `${year}-${pad(month)}-01`, end: `${year}-${pad(month)}-${pad(lastDay)}` };
}

function quarterRange(year: number, quarter: number): DateRange {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const lastDay = new Date(Date.UTC(year, endMonth, 0)).getUTCDate();
  return { start: `${year}-${pad(startMonth)}-01`, end: `${year}-${pad(endMonth)}-${pad(lastDay)}` };
}

function expandTwoDigitYear(value: string): number {
  const n = Number(value);
  return n < 70 ? 2000 + n : 1900 + n;
}

function daysApart(iso: string, reference: Date): number {
  const [year, month, dayOfMonth] = iso.split("-").map(Number);
  const referenceDay = Date.UTC(reference.getFullYear(), reference.getMonth(), reference.getDate());
  return Math.abs(Date.UTC(year, month - 1, dayOfMonth) - referenceDay) / DAY_MS;
}

function present(ranges: Array<DateRange | null>): DateRange[] {
  return ranges.filter((range): range is DateRange => range !== null);
}

function resolveNumeric(first: number, second: number, year: number, context: DateContext): DateRange[] {
  const dayFirst = singleDay(year, second, first);
  const monthFirst = singleDay(year, first, second);
  if (!dayFirst && !monthFirst) return [];
  if (!dayFirst) return [monthFirst!];
  if (!monthFirst) return [dayFirst];
  if (first === second) return [dayFirst];
  if (context.order) return [context.order === "day-first" ? dayFirst : monthFirst];
  if (context.referenceTime) {
    const dayClose = daysApart(dayFirst.start, context.referenceTime) <= AMBIGUITY_WINDOW_DAYS;
    const monthClose = daysApart(monthFirst.start, context.referenceTime) <= AMBIGUITY_WINDOW_DAYS;
    if (dayClose !== monthClose) return [dayClose ? dayFirst : monthFirst];
  }
  return [dayFirst, monthFirst];
}

interface PatternRule {
  regex: RegExp;
  fileNameOnly?: boolean;
  toRanges: (match: RegExpMatchArray, context: DateContext) => DateRange[];
}

const RULES: PatternRule[] = [
  {
    regex: /(?<![\w.\/-])(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?![\w%]|[.\/-]\d)/g,
    toRanges: (m) => present([singleDay(Number(m[1]), Number(m[2]), Number(m[3]))]),
  },
  {
    regex: /(?<!\d)((?:19|20)\d{2})(\d{2})(\d{2})(?!\d)/g,
    fileNameOnly: true,
    toRanges: (m) => present([singleDay(Number(m[1]), Number(m[2]), Number(m[3]))]),
  },
  {
    regex: NUMERIC_DATE,
    toRanges: (m, context) => resolveNumeric(Number(m[1]), Number(m[3]), Number(m[4]), context),
  },
  {
    regex: /(?<![\w])(?:Q([1-4])[\s-]*(\d{4})|(\d{4})[\s-]*Q([1-4]))(?![\w])/gi,
    toRanges: (m) => [quarterRange(Number(m[2] ?? m[3]), Number(m[1] ?? m[4]))],
  },
  {
    regex: new RegExp(
      `(?<![\\w])(\\d{1,2})(?:st|nd|rd|th)?[\\s-]+(${MONTH_PATTERN})\\.?(?:,?\\s+(\\d{4})|-(\\d{2}))?(?![\\w])`,
      "gi",
    ),
    toRanges: (m, context) => {
      const year = m[3] ? Number(m[3]) : m[4] ? expandTwoDigitYear(m[4]) : context.defaultYear;
      if (year === undefined) return [];
      return present([singleDay(year, monthIndex(m[2]), Number(m[1]))]);
    },
  },
  {
    regex: new RegExp(`(?<![\\w])(${MONTH_PATTERN})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?(?![\\w])`, "gi"),
    toRanges: (m, context) => {
      const year = m[3] ? Number(m[3]) : context.defaultYear;
      if (year === undefined) return [];
      return present([singleDay(year, monthIndex(m[1]), Number(m[2]))]);
    },
  },
  {
    regex: new RegExp(`(?<![\\w])(${MONTH_PATTERN})\\.?,?\\s+(\\d{4})(?![\\w])`, "gi"),
    toRanges: (m) => [monthRange(Number(m[2]), monthIndex(m[1]))],
  },
];

export function dedupeRanges(ranges: DateRange[]): DateRange[] {
  const seen = new Set<string>();
  const unique: DateRange[] = [];
  for (const range of ranges) {
    const key = `${range.start}/${range.end}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(range);
    }
  }
  return unique;
}

export function extractDates(text: string, context: DateContext = {}): DateRange[] {
  const found: Array<{ start: number; end: number; ranges: DateRange[] }> = [];
  const overlaps = (start: number, end: number) => found.some((f) => start < f.end && end > f.start);

  for (const rule of RULES) {
    if (rule.fileNameOnly && !context.fileName) continue;
    for (const match of text.matchAll(rule.regex)) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      if (overlaps(start, end)) continue;
      const ranges = rule.toRanges(match, context);
      if (ranges.length > 0) found.push({ start, end, ranges });
    }
  }

  found.sort((a, b) => a.start - b.start);
  return dedupeRanges(found.flatMap((f) => f.ranges));
}

export function detectDayMonthOrder(text: string): DayMonthOrder | undefined {
  const seen = new Set<DayMonthOrder>();
  for (const match of text.matchAll(NUMERIC_DATE)) {
    const first = Number(match[1]);
    const second = Number(match[3]);
    if (first > 12 && second <= 12) seen.add("day-first");
    else if (second > 12 && first <= 12) seen.add("month-first");
  }
  return seen.size === 1 ? [...seen][0] : undefined;
}

export function dayRangeOf(date: Date): DateRange {
  const iso = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return { start: iso, end: iso };
}

export function documentPostedDate(markdown: string, fileName: string, fileModifiedTime: Date): DateRange {
  const context: DateContext = { order: detectDayMonthOrder(markdown), referenceTime: fileModifiedTime };

  const opening = markdown.split(/\s+/).filter(Boolean).slice(0, POSTED_DATE_WORD_WINDOW).join(" ");
  const fromText = extractDates(opening, context)[0];
  if (fromText) return fromText;

  const baseName = fileName.replace(/\.[^.]+$/, "").replace(/_+/g, " ");
  const fromName = extractDates(baseName, { ...context, fileName: true })[0];
  if (fromName) return fromName;

  return dayRangeOf(fileModifiedTime);
}

export function formatDateRange(range: DateRange): string {
  return range.start === range.end ? range.start : `${range.start}–${range.end}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all existing tests plus the new `dates` tests.

- [ ] **Step 5: Commit**

```bash
git add src/metadata/dates.ts src/tests/dates.test.ts
git commit -m "Add date extraction with layered handling of ambiguous dates

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Markdown helpers

**Files:**
- Create: `src/parsers/markdown/inferStructure.ts`
- Create: `src/parsers/markdown/htmlToMarkdown.ts`
- Create: `src/parsers/markdown/normalizeMarkdown.ts`
- Test: `src/tests/markdownHelpers.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `function inferStructure(raw: string): string`
  - `function htmlToMarkdown(html: string): string`
  - `function normalizeMarkdown(markdown: string): string`
  - `function markdownToPlain(markdown: string): string`

- [ ] **Step 1: Write the failing test**

Create `src/tests/markdownHelpers.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { inferStructure } from "../parsers/markdown/inferStructure";
import { htmlToMarkdown } from "../parsers/markdown/htmlToMarkdown";
import { markdownToPlain, normalizeMarkdown } from "../parsers/markdown/normalizeMarkdown";

test("inferStructure marks headings, list items, and joined paragraphs", () => {
  const raw = [
    "Incident Roundup",
    "",
    "Published on 20 September 2026.",
    "",
    "1. 3 Sep 2026: Warehouse fire in",
    "Tuas. Two injured.",
    "• Bus collision reported",
    "",
    "It contains a paragraph that wraps",
    "across two lines.",
  ].join("\n");

  assert.equal(
    inferStructure(raw),
    [
      "## Incident Roundup",
      "Published on 20 September 2026.",
      "1. 3 Sep 2026: Warehouse fire in Tuas. Two injured.",
      "- Bus collision reported",
      "It contains a paragraph that wraps across two lines.",
    ].join("\n\n"),
  );
});

test("inferStructure treats the first line as a heading even without a blank line after it", () => {
  assert.equal(inferStructure("Summary\nThis line follows directly."), "## Summary\n\nThis line follows directly.");
});

test("inferStructure does not treat long lines or lines ending in punctuation as headings", () => {
  const long = "This line has far too many words to ever count as a heading line here";
  assert.equal(inferStructure(`Intro sentence.\n\n${long}\n\nNotes:\n\nEnd.`), `Intro sentence.\n\n${long}\n\nNotes:\n\nEnd.`);
});

test("inferStructure keeps existing Markdown headings", () => {
  assert.equal(inferStructure("## Page 2\n\nBody text."), "## Page 2\n\nBody text.");
});

test("inferStructure returns an empty string for blank input", () => {
  assert.equal(inferStructure("  \n\n \t"), "");
});

test("htmlToMarkdown converts headings, paragraphs, lists, and tables", () => {
  const html = `
    <html><head><style>body{}</style><script>alert(1)</script></head><body>
      <h2>Report <b>Title</b></h2>
      <p>This is a <strong>sample</strong> paragraph.</p>
      <ul><li>First<ul><li>Nested</li></ul></li><li>Second</li></ul>
      <ol><li>Step one</li><li>Step two</li></ol>
      <table><tr><th>Area</th><th>Damage</th></tr><tr><td>Tuas</td><td>High</td></tr></table>
      <div>Inline <em>only</em> div</div>
      <h5>Deep heading</h5>
    </body></html>`;

  assert.equal(
    htmlToMarkdown(html),
    [
      "## Report Title",
      "This is a sample paragraph.",
      "- First\n  - Nested\n- Second",
      "1. Step one\n2. Step two",
      "Area | Damage\nTuas | High",
      "Inline only div",
      "### Deep heading",
    ].join("\n\n"),
  );
});

test("normalizeMarkdown keeps structure and removes formatting noise", () => {
  const md = [
    "# Sample Title",
    "",
    "> Quoted line.",
    "",
    "* Item **one**",
    "+ Item _two_",
    "",
    "See [the link](https://example.com) and `code`.",
    "",
    "```",
    "const block = 1;",
    "```",
    "",
    "| Area | Damage |",
    "| --- | --- |",
    "| Tuas | High |",
  ].join("\n");

  assert.equal(
    normalizeMarkdown(md),
    [
      "# Sample Title",
      "",
      "Quoted line.",
      "",
      "- Item one",
      "- Item two",
      "",
      "See the link and code.",
      "",
      "Area | Damage",
      "Tuas | High",
    ].join("\n"),
  );
});

test("markdownToPlain strips heading and bullet markers but keeps numbers", () => {
  assert.equal(markdownToPlain("## Slide 1: Title\n- point\n  - nested\n1. step"), "Slide 1: Title\npoint\nnested\n1. step");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../parsers/markdown/inferStructure'` (and the other two).

- [ ] **Step 3: Write `inferStructure.ts`**

```ts
const LIST_ITEM = /^(?:(\d{1,3})[.)]|([a-zA-Z])[.)]|[-*•▪◦])\s+/;
const EXISTING_HEADING = /^#{1,6}\s+\S/;
const MAX_HEADING_WORDS = 12;

function normalizeListItem(line: string): string {
  const match = LIST_ITEM.exec(line)!;
  const rest = line.slice(match[0].length);
  if (match[1]) return `${match[1]}. ${rest}`;
  if (match[2]) return `${match[2]}. ${rest}`;
  return `- ${rest}`;
}

function isHeadingCandidate(line: string): boolean {
  if (line.split(" ").length > MAX_HEADING_WORDS) return false;
  if (/[.,;:]$/.test(line)) return false;
  return /\p{L}/u.test(line);
}

/**
 * Adds Markdown structure to text that has none (PDF, plain text, OCR):
 * short standalone lines become headings, bullet/numbered lines become list
 * items, and wrapped lines are joined into paragraphs.
 */
export function inferStructure(raw: string): string {
  const lines = raw
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v]+/g, " ").trim());

  const blocks: string[] = [];
  let current: string[] = [];
  let seenContent = false;
  const flush = () => {
    if (current.length > 0) {
      blocks.push(current.join(" "));
      current = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === "") {
      flush();
      continue;
    }
    if (EXISTING_HEADING.test(line)) {
      flush();
      blocks.push(line);
      seenContent = true;
      continue;
    }
    if (LIST_ITEM.test(line)) {
      flush();
      current = [normalizeListItem(line)];
      seenContent = true;
      continue;
    }
    if (current.length === 0) {
      const next = lines[i + 1];
      const followedByBlank = next === undefined || next === "";
      if (isHeadingCandidate(line) && (followedByBlank || !seenContent)) {
        blocks.push(`## ${line}`);
        seenContent = true;
        continue;
      }
    }
    current.push(line);
    seenContent = true;
  }
  flush();

  return blocks.join("\n\n");
}
```

- [ ] **Step 4: Write `htmlToMarkdown.ts`**

```ts
import * as cheerio from "cheerio";
import type { AnyNode, Element, Text } from "domhandler";

const CONTAINER_TAGS = new Set([
  "html", "body", "div", "section", "article", "main", "header", "footer", "aside", "blockquote", "figure",
]);
const BLOCK_SELECTOR = "p,div,section,article,main,header,footer,aside,blockquote,figure,ul,ol,table,h1,h2,h3,h4,h5,h6";

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Converts HTML to the normalized Markdown contract (headings, paragraphs, lists, table rows). */
export function htmlToMarkdown(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, nav").remove();
  const blocks: string[] = [];

  const renderList = (list: Element, depth: number): string[] => {
    const ordered = list.tagName.toLowerCase() === "ol";
    const lines: string[] = [];
    $(list)
      .children("li")
      .each((index, item) => {
        const own = $(item).clone();
        own.find("ul, ol").remove();
        const text = collapse(own.text());
        if (text) lines.push(`${"  ".repeat(depth)}${ordered ? `${index + 1}.` : "-"} ${text}`);
        $(item)
          .children("ul, ol")
          .each((_, nested) => {
            lines.push(...renderList(nested, depth + 1));
          });
      });
    return lines;
  };

  const renderTable = (table: Element): string[] => {
    const rows: string[] = [];
    $(table)
      .find("tr")
      .each((_, row) => {
        const cells = $(row)
          .children("td, th")
          .map((_, cell) => collapse($(cell).text()))
          .get();
        if (cells.some((cell) => cell.length > 0)) rows.push(cells.join(" | "));
      });
    return rows;
  };

  const visit = (node: AnyNode): void => {
    if (node.nodeType === 3) {
      const text = collapse((node as Text).data);
      if (text) blocks.push(text);
      return;
    }
    if (node.nodeType !== 1) return;
    const element = node as Element;
    const tag = element.tagName.toLowerCase();

    const heading = /^h([1-6])$/.exec(tag);
    if (heading) {
      const text = collapse($(element).text());
      if (text) blocks.push(`${"#".repeat(Math.min(Number(heading[1]), 3))} ${text}`);
      return;
    }
    if (tag === "ul" || tag === "ol") {
      const lines = renderList(element, 0);
      if (lines.length > 0) blocks.push(lines.join("\n"));
      return;
    }
    if (tag === "table") {
      const rows = renderTable(element);
      if (rows.length > 0) blocks.push(rows.join("\n"));
      return;
    }
    if (CONTAINER_TAGS.has(tag) && $(element).find(BLOCK_SELECTOR).length > 0) {
      element.children.forEach(visit);
      return;
    }
    const text = collapse($(element).text());
    if (text) blocks.push(text);
  };

  $("body")
    .contents()
    .each((_, node) => visit(node));

  return blocks.join("\n\n");
}
```

- [ ] **Step 5: Write `normalizeMarkdown.ts`**

```ts
/**
 * Normalizes an authored Markdown file to the shared contract: keeps
 * headings, lists, paragraphs, and table rows; drops links' URLs, emphasis
 * and inline-code markers, fenced code blocks, block-quote markers, and
 * horizontal rules.
 */
export function normalizeMarkdown(markdown: string): string {
  let output = markdown.replace(/\r\n?/g, "\n");
  output = output.replace(/```[\s\S]*?```/g, "");
  output = output.replace(/`([^`]+)`/g, "$1");
  output = output.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  output = output.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  output = output.replace(/^\s{0,3}>\s?/gm, "");
  output = output.replace(/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/gm, "");
  output = output.replace(/^(\s*)[*+](\s+)/gm, "$1-$2");
  output = output.replace(/(\*\*|__)(.+?)\1/g, "$2");
  output = output.replace(/(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])/g, "$1");
  output = output.replace(/(?<![\w_])_(?!\s)(.+?)(?<!\s)_(?![\w_])/g, "$1");
  output = output.replace(/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/gm, "");
  output = output.replace(/^\s*\|(.*)\|\s*$/gm, (_match, inner: string) =>
    inner
      .split("|")
      .map((cell) => cell.trim())
      .join(" | "),
  );
  output = output.replace(/<[^>]+>/g, " ");
  output = output
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n");
  return output.replace(/\n{3,}/g, "\n\n").trim();
}

/** Strips heading and bullet markers so legacy chunking sees plain text. */
export function markdownToPlain(markdown: string): string {
  return markdown.replace(/^#{1,6}\s+/gm, "").replace(/^\s*-\s+/gm, "");
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx tsc --noEmit` then `npm test`
Expected: clean type-check; PASS including all `markdownHelpers` tests. If a Markdown output assertion differs only in blank lines, fix the implementation rather than the expected string — the expected strings are the contract.

- [ ] **Step 7: Commit**

```bash
git add src/parsers/markdown/inferStructure.ts src/parsers/markdown/htmlToMarkdown.ts src/parsers/markdown/normalizeMarkdown.ts src/tests/markdownHelpers.test.ts
git commit -m "Add Markdown helpers for structure inference, HTML, and Markdown normalization

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Parsers emit the Markdown contract (HTML, DOCX, EPUB, text, PPTX) and legacy chunking strips it

**Files:**
- Modify: `src/parsers/htmlParser.ts`
- Modify: `src/parsers/docxParser.ts`
- Modify: `src/parsers/epubParser.ts`
- Modify: `src/parsers/textParser.ts`
- Modify: `src/parsers/pptxParser.ts`
- Modify: `src/parsers/documentParser.ts` (textual branch, imports)
- Modify: `src/ingestion/indexManager.ts` (legacy chunk call)
- Modify tests: `src/tests/htmlParser.test.ts`, `src/tests/textParser.test.ts`, `src/tests/pptxParser.test.ts`

**Interfaces:**
- Consumes: `htmlToMarkdown`, `inferStructure`, `normalizeMarkdown`, `markdownToPlain` (Task 2).
- Produces:
  - `type TextKind = "markdown" | "plain"`; `function parseText(filePath: string, kind: TextKind): Promise<string>`
  - PPTX output: `## Slide N: <title>` (or `## Slide N`), remaining paragraphs as `- ` items, table rows as `a | b`, notes under `### Notes`, slides separated by a blank line.
  - Legacy indexing calls `chunkText(markdownToPlain(parsed.text), ...)`.

- [ ] **Step 1: Update tests to the new contract (failing)**

In `src/tests/htmlParser.test.ts`, replace the two content assertions with:

```ts
  const text = result.document.text;
  assert.ok(text.includes("# Hello There"));
  assert.ok(text.includes("This is a sample HTML file created for tests."));
  assert.ok(!text.includes("console.log"));
  assert.ok(!text.includes("font-size"));
```

In `src/tests/textParser.test.ts`, replace the three Markdown assertions with:

```ts
  const text = result.document.text;
  assert.ok(text.includes("# Sample Markdown Title"));
  assert.ok(text.includes("- Item one"));
  assert.ok(text.includes("Block quotes should be flattened."));
  assert.ok(!text.includes("const block"));
  assert.ok(!text.includes("https://example.com"), "Markdown links should drop raw URLs");
  assert.ok(!text.includes("**"));
```

(The plain-text test stays as is.)

In `src/tests/pptxParser.test.ts`:
- In "parseDocument extracts slide text from PPTX files", replace `assert.ok(text.includes("[Slide 1]"));` with `assert.ok(text.includes("## Slide 1: Sample PPTX Title"));` and keep the "Second line of slide text" assertion.
- In the sldIdLst ordering test, replace the marker lookups and notes assertions with:

```ts
  const slideOneIndex = text.indexOf("## Slide 1");
  const slideTwoContentIndex = text.indexOf("Slide Two Content");
  const slideOneContentIndex = text.indexOf("Slide One Content");
  const slideTwoIndex = text.indexOf("## Slide 2");

  assert.ok(slideOneIndex >= 0 && slideTwoIndex >= 0, "Both slide headings should be present");
  assert.ok(
    slideOneIndex < slideTwoContentIndex && slideTwoContentIndex < slideTwoIndex,
    "Slide 2.xml's content should appear under the Slide 1 heading",
  );
  assert.ok(slideTwoIndex < slideOneContentIndex, "Slide 1.xml's content should appear under the Slide 2 heading");

  const notesForSlideTwo = text.indexOf("Notes For Slide Two");
  const notesForSlideOne = text.indexOf("Notes For Slide One");
  assert.ok(slideOneIndex < notesForSlideTwo && notesForSlideTwo < slideTwoIndex, "slide2.xml notes belong to Slide 1");
  assert.ok(slideTwoIndex < notesForSlideOne, "slide1.xml notes belong to Slide 2");
  assert.ok(text.includes("### Notes"));
```

- In "still emits slide marker and notes for a visually blank slide", replace the two marker assertions with `assert.ok(text.includes("## Slide 1"));` and `assert.ok(text.includes("### Notes"));`.

Run: `npm test`
Expected: FAIL in the HTML, Markdown, and PPTX tests (old output format).

- [ ] **Step 2: HTML parser**

Replace `src/parsers/htmlParser.ts` with:

```ts
import * as fs from "fs";
import { htmlToMarkdown } from "./markdown/htmlToMarkdown";

/**
 * Parse HTML/HTM files into normalized Markdown.
 */
export async function parseHTML(filePath: string): Promise<string> {
  try {
    const content = await fs.promises.readFile(filePath, "utf-8");
    return htmlToMarkdown(content);
  } catch (error) {
    console.error(`Error parsing HTML file ${filePath}:`, error);
    return "";
  }
}
```

- [ ] **Step 3: DOCX parser**

In `src/parsers/docxParser.ts`, delete `cleanBlockText`, `renderTable`, and the `cheerio` import, add `import { htmlToMarkdown } from "./markdown/htmlToMarkdown";`, and replace `parseDOCX` with:

```ts
/**
 * Parse DOCX files into normalized Markdown. Uses mammoth's HTML conversion
 * (not extractRawText), which keeps heading styles, lists, and table rows.
 */
export async function parseDOCX(filePath: string): Promise<string> {
  const { value: html } = await mammoth.convertToHtml({ path: filePath });
  return htmlToMarkdown(html);
}
```

- [ ] **Step 4: EPUB parser**

In `src/parsers/epubParser.ts`:
- Add `import { htmlToMarkdown } from "./markdown/htmlToMarkdown";`.
- Replace the `stripHtml` definition with `const stripHtml = (input: string) => htmlToMarkdown(input);`.
- Replace the final `resolve(fullText.replace(/\s+/g, " ").replace(/\n+/g, "\n").trim());` with:

```ts
          resolve(fullText.replace(/\n{3,}/g, "\n\n").trim());
```

- [ ] **Step 5: Text parser and dispatch**

Replace `src/parsers/textParser.ts` with:

```ts
import * as fs from "fs";
import { inferStructure } from "./markdown/inferStructure";
import { normalizeMarkdown } from "./markdown/normalizeMarkdown";

export type TextKind = "markdown" | "plain";

/**
 * Parse Markdown and plain text files into normalized Markdown.
 */
export async function parseText(filePath: string, kind: TextKind): Promise<string> {
  try {
    const content = await fs.promises.readFile(filePath, "utf-8");
    return kind === "markdown" ? normalizeMarkdown(content) : inferStructure(content);
  } catch (error) {
    console.error(`Error parsing text file ${filePath}:`, error);
    return "";
  }
}
```

In `src/parsers/documentParser.ts`, replace the `parseText(filePath, { stripMarkdown: ..., preserveLineBreaks: ... })` call with:

```ts
          parseText(filePath, isMarkdownExtension(ext) ? "markdown" : "plain"),
```

Then run `grep -n "isPlainTextExtension" src/parsers/documentParser.ts`; if the import line is the only match, remove `isPlainTextExtension` from the import list.

- [ ] **Step 6: PPTX parser**

In `src/parsers/pptxParser.ts`:
- Delete the `cleanText` function.
- Replace `extractContentBlocks` with a typed version:

```ts
interface SlideBlock {
  kind: "paragraph" | "tableRow";
  text: string;
}

/**
 * Extracts text blocks from a slide/notes XML string in document order.
 * <a:tbl> tables are handled separately from `extractParagraphs` so each row
 * becomes its own block - otherwise table cell paragraphs would also be
 * picked up by the generic <a:p> scan and lose their row grouping.
 */
function extractContentBlocks(xml: string): SlideBlock[] {
  const blocks: SlideBlock[] = [];
  const paragraphs = (fragment: string) =>
    extractParagraphs(fragment).map((text): SlideBlock => ({ kind: "paragraph", text }));
  const tableRegex = /<a:tbl>([\s\S]*?)<\/a:tbl>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = tableRegex.exec(xml)) !== null) {
    blocks.push(...paragraphs(xml.slice(lastIndex, match.index)));
    blocks.push(...extractTableRows(match[1]).map((text): SlideBlock => ({ kind: "tableRow", text })));
    lastIndex = tableRegex.lastIndex;
  }
  blocks.push(...paragraphs(xml.slice(lastIndex)));
  return blocks;
}
```

- Replace the body of `parsePPTX` after `if (slidePaths.length === 0) { return ""; }` with:

```ts
  const slides: string[] = [];

  for (let i = 0; i < slidePaths.length; i++) {
    const slidePath = slidePaths[i];
    const displayNumber = i + 1;
    const xml = await zip.files[slidePath].async("text");
    const blocks = extractContentBlocks(xml);

    if (blocks.length === 0 && !includeSpeakerNotes) continue;

    const titleIndex = blocks.findIndex((block) => block.kind === "paragraph");
    const title = titleIndex >= 0 ? blocks[titleIndex].text : "";
    const lines = [`## Slide ${displayNumber}${title ? `: ${title}` : ""}`];
    blocks.forEach((block, index) => {
      if (index === titleIndex) return;
      lines.push(block.kind === "tableRow" ? block.text : `- ${block.text}`);
    });

    if (includeSpeakerNotes) {
      const notesPath = await getNotesPathForSlide(zip, slidePath);
      if (notesPath) {
        const notesXml = await zip.files[notesPath].async("text");
        const notesBlocks = extractContentBlocks(notesXml);
        if (notesBlocks.length > 0) {
          lines.push("", "### Notes", ...notesBlocks.map((block) => block.text));
        }
      }
    }

    slides.push(lines.join("\n"));
  }

  return slides.join("\n\n");
```

- [ ] **Step 7: Legacy chunking strips Markdown markers**

In `src/ingestion/indexManager.ts`, add `import { markdownToPlain } from "../parsers/markdown/normalizeMarkdown";` and change the chunk call to:

```ts
      const chunks = await chunkText(markdownToPlain(parsed.text), chunkSize, chunkOverlap, (t) =>
        embeddingModel.countTokens(t),
      );
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx tsc --noEmit` then `npm test`
Expected: clean; PASS for all tests including the updated HTML, Markdown, PPTX tests and unchanged DOCX/EPUB/plain-text tests.

- [ ] **Step 9: Commit**

```bash
git add src/parsers/htmlParser.ts src/parsers/docxParser.ts src/parsers/epubParser.ts src/parsers/textParser.ts src/parsers/pptxParser.ts src/parsers/documentParser.ts src/ingestion/indexManager.ts src/tests/htmlParser.test.ts src/tests/textParser.test.ts src/tests/pptxParser.test.ts
git commit -m "Emit normalized Markdown from HTML, DOCX, EPUB, text, and PPTX parsers

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: PDF and OCR keep structure

**Files:**
- Create: `src/parsers/markdown/ocrPages.ts`
- Modify: `src/parsers/pdfParser.ts`
- Modify: `src/parsers/imageParser.ts`
- Test: `src/tests/ocrPages.test.ts`

**Interfaces:**
- Consumes: `inferStructure` (Task 2).
- Produces: `function formatOcrPage(pageNumber: number, rawText: string): { markdown: string; contentLength: number } | null`

- [ ] **Step 1: Write the failing test**

Create `src/tests/ocrPages.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { formatOcrPage } from "../parsers/markdown/ocrPages";

test("formatOcrPage adds a page heading and keeps inferred structure", () => {
  const page = formatOcrPage(3, "Summary\n\n1. First finding\n2. Second finding");
  assert.deepEqual(page, {
    markdown: "## Page 3\n\n## Summary\n\n1. First finding\n\n2. Second finding",
    contentLength: "## Summary\n\n1. First finding\n\n2. Second finding".length,
  });
});

test("formatOcrPage returns null for a page with no text", () => {
  assert.equal(formatOcrPage(1, " \n\n "), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../parsers/markdown/ocrPages'`.

- [ ] **Step 3: Write `ocrPages.ts`**

```ts
import { inferStructure } from "./inferStructure";

/**
 * Markdown for one OCR'd page: a page heading plus inferred structure.
 * `contentLength` excludes the heading so minimum-text checks aren't
 * satisfied by page headings alone.
 */
export function formatOcrPage(pageNumber: number, rawText: string): { markdown: string; contentLength: number } | null {
  const body = inferStructure(rawText);
  if (!body) return null;
  return { markdown: `## Page ${pageNumber}\n\n${body}`, contentLength: body.length };
}
```

- [ ] **Step 4: Update `pdfParser.ts`**

- Add imports: `import { inferStructure } from "./markdown/inferStructure";` and `import { formatOcrPage } from "./markdown/ocrPages";`.
- Delete the `cleanText` function.
- In `tryLmStudioParser`, replace `const cleaned = cleanText(result.content);` with `const cleaned = inferStructure(result.content);`.
- In `tryPdfParse`, replace `const cleaned = cleanText(result.text || "");` with `const cleaned = inferStructure(result.text || "");`.
- In `tryOcrWithMuPdf`, after `const textParts: string[] = [];` add `let contentLength = 0;`, and replace:

```ts
          const cleaned = cleanText(text || "");
          if (cleaned.length > 0) {
            textParts.push(cleaned);
          }
```

with:

```ts
          const page = formatOcrPage(pageNum + 1, text || "");
          if (page) {
            textParts.push(page.markdown);
            contentLength += page.contentLength;
          }
```

- Replace:

```ts
    const fullText = cleanText(textParts.join("\n\n"));
    if (fullText.length >= MIN_TEXT_LENGTH) {
```

with:

```ts
    const fullText = textParts.join("\n\n");
    if (contentLength >= MIN_TEXT_LENGTH) {
```

- [ ] **Step 5: Update `imageParser.ts`**

Add `import { inferStructure } from "./markdown/inferStructure";` and replace the `return text.replace(/\s+/g, " ").replace(/\n+/g, "\n").trim();` statement with `return inferStructure(text);`.

- [ ] **Step 6: Run tests and type-check**

Run: `npx tsc --noEmit` then `npm test`
Expected: clean; PASS. Run `grep -n "cleanText" src/parsers/pdfParser.ts` — expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/parsers/markdown/ocrPages.ts src/parsers/pdfParser.ts src/parsers/imageParser.ts src/tests/ocrPages.test.ts
git commit -m "Keep line breaks and infer structure for PDF and OCR text

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Sections with paths and inherited dates

**Files:**
- Create: `src/chunking/sections.ts`
- Test: `src/tests/sections.test.ts`

**Interfaces:**
- Consumes: `extractDates`, `DateContext`, `DateRange` (Task 1).
- Produces:
  - `type BlockKind = "heading" | "paragraph" | "listItem" | "tableRow"`
  - `interface Block { kind: BlockKind; text: string; level: number }` (heading: `#` count; list item: indent depth; otherwise 0). Heading `text` excludes `#`; list item `text` includes its marker.
  - `interface Section { path: string[]; dates: DateRange[]; blocks: Block[] }`
  - `function parseBlocks(markdown: string): Block[]`
  - `function renderBlock(block: Block): string`
  - `function buildSections(markdown: string, context: DateContext, withDates?: boolean): Section[]`
  - `const MAX_TITLE_CHARS = 80`

- [ ] **Step 1: Write the failing test**

Create `src/tests/sections.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { buildSections, parseBlocks, renderBlock } from "../chunking/sections";

const day = (iso: string) => ({ start: iso, end: iso });

test("parseBlocks recognizes headings, paragraphs, list items, continuations, and table rows", () => {
  const blocks = parseBlocks(
    ["## Title", "", "First line", "second line", "", "1. Item one", "continues here", "  - Nested", "", "Area | Damage"].join("\n"),
  );
  assert.deepEqual(blocks, [
    { kind: "heading", text: "Title", level: 2 },
    { kind: "paragraph", text: "First line second line", level: 0 },
    { kind: "listItem", text: "1. Item one continues here", level: 0 },
    { kind: "listItem", text: "- Nested", level: 1 },
    { kind: "tableRow", text: "Area | Damage", level: 0 },
  ]);
  assert.equal(renderBlock(blocks[0]), "## Title");
  assert.equal(renderBlock(blocks[3]), "  - Nested");
});

test("buildSections gives list items their own sections and dates", () => {
  const markdown = [
    "# Incident Roundup",
    "",
    "Published 20 September 2026",
    "",
    "1. 3 Sep 2026: Warehouse fire in Tuas.",
    "2. 8 Sep 2026: Bus collision on the PIE.",
    "3. Minor follow-up without its own date.",
  ].join("\n");

  const sections = buildSections(markdown, {});
  assert.deepEqual(
    sections.map((s) => ({ path: s.path, dates: s.dates })),
    [
      { path: ["Incident Roundup"], dates: [day("2026-09-20")] },
      { path: ["Incident Roundup", "1. 3 Sep 2026: Warehouse fire in Tuas."], dates: [day("2026-09-03")] },
      { path: ["Incident Roundup", "2. 8 Sep 2026: Bus collision on the PIE."], dates: [day("2026-09-08")] },
      { path: ["Incident Roundup", "3. Minor follow-up without its own date."], dates: [day("2026-09-20")] },
    ],
  );
});

test("buildSections inherits dates into subsections and resets at the next section", () => {
  const markdown = [
    "## Flooding 3 Sep 2026",
    "",
    "Water rose.",
    "",
    "### Response",
    "",
    "Crews arrived.",
    "",
    "## Recommendations",
    "",
    "Improve drainage.",
  ].join("\n");

  const sections = buildSections(markdown, {});
  assert.deepEqual(
    sections.map((s) => ({ path: s.path, dates: s.dates })),
    [
      { path: ["Flooding 3 Sep 2026"], dates: [day("2026-09-03")] },
      { path: ["Flooding 3 Sep 2026", "Response"], dates: [day("2026-09-03")] },
      { path: ["Recommendations"], dates: [] },
    ],
  );
});

test("buildSections only reads the first content block for a heading's date", () => {
  const markdown = ["## Notes", "", "No date in this first paragraph.", "", "Mentions 5 Sep 2026 later."].join("\n");
  assert.deepEqual(buildSections(markdown, {})[0].dates, []);
});

test("buildSections truncates list item titles to 80 characters", () => {
  const longItem = `1. ${"word ".repeat(40).trim()}`;
  const [section] = buildSections(longItem, {});
  assert.equal(section.path[0], longItem.slice(0, 80).trimEnd());
});

test("buildSections skips dates entirely when disabled", () => {
  const sections = buildSections("## Flooding 3 Sep 2026\n\nWater rose.", {}, false);
  assert.deepEqual(sections[0].dates, []);
});

test("buildSections keeps leading content without a heading as an unnamed section", () => {
  const sections = buildSections("Intro paragraph.\n\n## Next\n\nBody.", {});
  assert.deepEqual(sections.map((s) => s.path), [[], ["Next"]]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../chunking/sections'`.

- [ ] **Step 3: Write the implementation**

Create `src/chunking/sections.ts`:

```ts
import { extractDates, type DateContext, type DateRange } from "../metadata/dates";

export type BlockKind = "heading" | "paragraph" | "listItem" | "tableRow";

export interface Block {
  kind: BlockKind;
  text: string;
  /** Heading: number of `#`. List item: indent depth. Otherwise 0. */
  level: number;
}

export interface Section {
  path: string[];
  dates: DateRange[];
  blocks: Block[];
}

export const MAX_TITLE_CHARS = 80;

const HEADING = /^(#{1,6})\s+(.*\S)\s*$/;
const LIST_ITEM = /^(\s*)(?:[-*]|\d{1,3}\.|[a-zA-Z]\.)\s+\S/;

export function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let lastWasListItem = false;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: "paragraph", text: paragraph.join(" "), level: 0 });
      paragraph = [];
    }
  };

  for (const rawLine of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.replace(/\s+$/, "");
    const trimmed = line.trim();
    if (trimmed === "") {
      flushParagraph();
      lastWasListItem = false;
      continue;
    }
    const heading = HEADING.exec(trimmed);
    if (heading) {
      flushParagraph();
      blocks.push({ kind: "heading", text: heading[2], level: heading[1].length });
      lastWasListItem = false;
      continue;
    }
    const list = LIST_ITEM.exec(line);
    if (list) {
      flushParagraph();
      blocks.push({ kind: "listItem", text: trimmed, level: Math.floor(list[1].length / 2) });
      lastWasListItem = true;
      continue;
    }
    if (trimmed.includes(" | ")) {
      flushParagraph();
      blocks.push({ kind: "tableRow", text: trimmed, level: 0 });
      lastWasListItem = false;
      continue;
    }
    if (lastWasListItem) {
      const last = blocks[blocks.length - 1];
      last.text = `${last.text} ${trimmed}`;
      continue;
    }
    paragraph.push(trimmed);
  }
  flushParagraph();
  return blocks;
}

export function renderBlock(block: Block): string {
  if (block.kind === "heading") return `${"#".repeat(block.level)} ${block.text}`;
  if (block.kind === "listItem") return `${"  ".repeat(block.level)}${block.text}`;
  return block.text;
}

function leadingText(text: string): string {
  return text.length > MAX_TITLE_CHARS ? text.slice(0, MAX_TITLE_CHARS).trimEnd() : text;
}

/**
 * Splits Markdown into sections: a heading and its content until the next
 * heading of the same or higher level, or a top-level list item until the
 * next top-level list item or heading. A section's dates come from its
 * heading (or list item) text, else the first content block of a heading
 * section, else its parent heading; inheritance ends with the section.
 */
export function buildSections(markdown: string, context: DateContext, withDates = true): Section[] {
  const datesOf = (text: string): DateRange[] => (withDates ? extractDates(leadingText(text), context) : []);
  const sections: Section[] = [];
  const headingStack: Array<{ level: number; title: string; dates: DateRange[] }> = [];
  const state: { current: Section | null; isHeading: boolean; hasOwnDates: boolean } = {
    current: null,
    isHeading: false,
    hasOwnDates: false,
  };

  const inheritedDates = (): DateRange[] =>
    headingStack.length > 0 ? headingStack[headingStack.length - 1].dates : [];

  const startSection = (section: Section, isHeading: boolean, hasOwnDates: boolean) => {
    if (state.current && state.current.blocks.length > 0) sections.push(state.current);
    state.current = section;
    state.isHeading = isHeading;
    state.hasOwnDates = hasOwnDates;
  };

  for (const block of parseBlocks(markdown)) {
    if (block.kind === "heading") {
      while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= block.level) {
        headingStack.pop();
      }
      const own = datesOf(block.text);
      const dates = own.length > 0 ? own : inheritedDates();
      headingStack.push({ level: block.level, title: block.text, dates });
      startSection({ path: headingStack.map((h) => h.title), dates, blocks: [block] }, true, own.length > 0);
      continue;
    }

    if (block.kind === "listItem" && block.level === 0) {
      const own = datesOf(block.text);
      startSection(
        {
          path: [...headingStack.map((h) => h.title), leadingText(block.text)],
          dates: own.length > 0 ? own : inheritedDates(),
          blocks: [block],
        },
        false,
        true,
      );
      continue;
    }

    if (!state.current) {
      startSection({ path: [], dates: [], blocks: [] }, false, false);
    }
    const current = state.current!;
    if (state.isHeading && !state.hasOwnDates && current.blocks.length === 1) {
      const own = datesOf(block.text);
      if (own.length > 0) {
        current.dates = own;
        headingStack[headingStack.length - 1].dates = own;
        state.hasOwnDates = true;
      }
    }
    current.blocks.push(block);
  }

  if (state.current && state.current.blocks.length > 0) sections.push(state.current);
  return sections;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsc --noEmit` then `npm test`
Expected: clean; PASS including all `sections` tests.

- [ ] **Step 5: Commit**

```bash
git add src/chunking/sections.ts src/tests/sections.test.ts
git commit -m "Build Markdown sections with paths and inherited dates

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Structured chunker and context headers

**Files:**
- Create: `src/chunking/structuredChunker.ts`
- Test: `src/tests/structuredChunker.test.ts`

**Interfaces:**
- Consumes: `buildSections`, `renderBlock`, `Section` (Task 5); `extractDates`, `dedupeRanges`, `formatDateRange`, `DateContext`, `DateRange` (Task 1); `CountTokens` from `src/utils/textChunker.ts`.
- Produces:
  - `interface StructuredChunk { text: string; contextHeader: string; sectionPath: string; dates: DateRange[]; startIndex: number; endIndex: number }`
  - `interface StructuredChunkOptions { fileName: string; postedDate: DateRange; chunkSize: number; chunkOverlap: number; countTokens: CountTokens; dateContext: DateContext; extractDates?: boolean }`
  - `function chunkStructured(markdown: string, options: StructuredChunkOptions): Promise<StructuredChunk[]>`
  - `function buildContextHeader(fileName: string, postedDate: DateRange, sectionPath: string, dates: DateRange[]): string`

- [ ] **Step 1: Write the failing test**

Create `src/tests/structuredChunker.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { buildContextHeader, chunkStructured, type StructuredChunkOptions } from "../chunking/structuredChunker";

const day = (iso: string) => ({ start: iso, end: iso });
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

const INCIDENT_TWO =
  "2. 8 Sep 2026: Bus collision on the PIE. " +
  Array.from({ length: 14 }, (_, i) => `Responders cleared lane ${i + 1} after assessing the damage carefully.`).join(" ");

const ROUNDUP = [
  "# Incident Roundup",
  "",
  "Published 20 September 2026",
  "",
  "1. 3 Sep 2026: Warehouse fire in Tuas. Two injured.",
  INCIDENT_TWO,
  "3. 11 Sep 2026: Flooding at Bukit Timah.",
  "4. 14 Sep 2026: Scaffolding collapse in Bishan.",
  "5. 17 Sep 2026: Chemical leak at Jurong.",
].join("\n");

function options(overrides: Partial<StructuredChunkOptions> = {}): StructuredChunkOptions {
  return {
    fileName: "incident_roundup.txt",
    postedDate: day("2026-09-20"),
    chunkSize: 110,
    chunkOverlap: 0,
    countTokens: async (text) => words(text),
    dateContext: {},
    ...overrides,
  };
}

test("chunkStructured produces the worked example from the spec", async () => {
  const chunks = await chunkStructured(ROUNDUP, options());

  assert.equal(chunks.length, 4);

  assert.ok(chunks[0].text.includes("Published 20 September 2026"));
  assert.ok(chunks[0].dates.some((d) => d.start === "2026-09-03"));
  assert.ok(chunks[0].dates.some((d) => d.start === "2026-09-20"));

  assert.deepEqual(chunks[1].dates, [day("2026-09-08")]);
  assert.deepEqual(chunks[2].dates, [day("2026-09-08")]);
  assert.ok(!chunks[2].text.includes("8 Sep 2026"), "second part of incident 2 has no date of its own");
  assert.ok(chunks[2].contextHeader.includes("Section: Incident Roundup > 2. 8 Sep 2026: Bus collision on the PIE"));

  assert.deepEqual(chunks[3].dates, [day("2026-09-11"), day("2026-09-14"), day("2026-09-17")]);

  for (const chunk of chunks) {
    assert.ok(chunk.contextHeader.startsWith("[File: incident_roundup.txt | Posted: 2026-09-20 |"));
  }
});

test("chunkStructured keeps header plus text within the token budget", async () => {
  const chunks = await chunkStructured(ROUNDUP, options());
  for (const chunk of chunks) {
    assert.ok(words(chunk.contextHeader) + words(chunk.text) <= 110, `over budget: ${chunk.contextHeader}`);
  }
});

test("chunkStructured never ends a chunk with a heading", async () => {
  const markdown = ["# Report", "", "## Section A", "", "Alpha text here.", "", "## Section B", "", "Beta text here."].join("\n");
  const chunks = await chunkStructured(markdown, options({ chunkSize: 30 }));
  for (const chunk of chunks) {
    const lastLine = chunk.text.trim().split("\n").pop()!;
    assert.ok(!lastLine.startsWith("#"), `chunk ends with a heading: ${JSON.stringify(chunk.text)}`);
  }
});

test("chunkStructured overlaps only pieces of an oversized section", async () => {
  const chunks = await chunkStructured(ROUNDUP, options({ chunkOverlap: 10 }));
  assert.equal(chunks[1].startIndex, chunks[0].endIndex, "packed chunk and first piece do not overlap");
  assert.ok(chunks[2].startIndex < chunks[1].endIndex, "pieces of incident 2 overlap");
  assert.equal(chunks[3].startIndex, chunks[2].endIndex, "last piece and next packed chunk do not overlap");
});

test("chunk word offsets match chunk text length", async () => {
  const chunks = await chunkStructured(ROUNDUP, options());
  for (const chunk of chunks) {
    assert.equal(chunk.endIndex - chunk.startIndex, words(chunk.text));
  }
});

test("chunkStructured omits dates when date extraction is disabled", async () => {
  const chunks = await chunkStructured(ROUNDUP, options({ extractDates: false }));
  for (const chunk of chunks) {
    assert.deepEqual(chunk.dates, []);
    assert.ok(!chunk.contextHeader.includes("Dates:"));
  }
});

test("chunkStructured returns no chunks for empty Markdown", async () => {
  assert.deepEqual(await chunkStructured("   ", options()), []);
});

test("buildContextHeader omits empty section and dates", () => {
  assert.equal(buildContextHeader("a.pdf", day("2026-09-20"), "", []), "[File: a.pdf | Posted: 2026-09-20]");
  assert.equal(
    buildContextHeader("a.pdf", { start: "2026-07-01", end: "2026-09-30" }, "Intro", [day("2026-09-08")]),
    "[File: a.pdf | Posted: 2026-07-01–2026-09-30 | Section: Intro | Dates: 2026-09-08]",
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../chunking/structuredChunker'`.

- [ ] **Step 3: Write the implementation**

Create `src/chunking/structuredChunker.ts`:

```ts
import { type CountTokens } from "../utils/textChunker";
import { dedupeRanges, extractDates, formatDateRange, type DateContext, type DateRange } from "../metadata/dates";
import { buildSections, renderBlock, type Section } from "./sections";

export interface StructuredChunk {
  text: string;
  contextHeader: string;
  sectionPath: string;
  dates: DateRange[];
  startIndex: number;
  endIndex: number;
}

export interface StructuredChunkOptions {
  fileName: string;
  postedDate: DateRange;
  chunkSize: number;
  chunkOverlap: number;
  countTokens: CountTokens;
  dateContext: DateContext;
  /** Set to false to skip all date extraction (fallback when extraction fails). */
  extractDates?: boolean;
}

interface Token {
  word: string;
  /** Whitespace after the word: newline at the end of a block, otherwise a space. */
  separator: string;
}

interface SectionTokens {
  section: Section;
  tokens: Token[];
  offset: number;
  blockEnds: number[];
  headingEnd: number;
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function buildContextHeader(
  fileName: string,
  postedDate: DateRange,
  sectionPath: string,
  dates: DateRange[],
): string {
  const parts = [`File: ${fileName}`, `Posted: ${formatDateRange(postedDate)}`];
  if (sectionPath) parts.push(`Section: ${sectionPath}`);
  if (dates.length > 0) parts.push(`Dates: ${dates.map(formatDateRange).join(", ")}`);
  return `[${parts.join(" | ")}]`;
}

/** A heading with nothing under it is carried into the next section so a heading never ends a chunk. */
function mergeHeadingOnlySections(sections: Section[]): Section[] {
  const merged: Section[] = [];
  let pending: Section | null = null;
  for (const section of sections) {
    const headingOnly = section.blocks.length === 1 && section.blocks[0].kind === "heading";
    if (headingOnly) {
      pending = pending ? { ...section, blocks: [...pending.blocks, ...section.blocks] } : section;
      continue;
    }
    merged.push(pending ? { ...section, blocks: [...pending.blocks, ...section.blocks] } : section);
    pending = null;
  }
  if (pending) merged.push(pending);
  return merged;
}

function tokenizeSection(section: Section, offset: number): SectionTokens {
  const tokens: Token[] = [];
  const blockEnds: number[] = [];
  let headingEnd = 0;
  section.blocks.forEach((block, index) => {
    const blockWords = renderBlock(block).split(/\s+/).filter(Boolean);
    blockWords.forEach((word, i) => tokens.push({ word, separator: i === blockWords.length - 1 ? "\n" : " " }));
    if (index === 0 && block.kind === "heading") {
      headingEnd = tokens.length;
    } else {
      blockEnds.push(tokens.length);
    }
  });
  return { section, tokens, offset, blockEnds, headingEnd };
}

function tokensToText(tokens: Token[]): string {
  return tokens.map((token, i) => (i === tokens.length - 1 ? token.word : token.word + token.separator)).join("");
}

function sentenceEnds(tokens: Token[]): number[] {
  const ends: number[] = [];
  tokens.forEach((token, i) => {
    if (/[.!?]["')\]]*$/.test(token.word)) ends.push(i + 1);
  });
  return ends;
}

function lastBoundary(bounds: number[], lowerExclusive: number, upperInclusive: number): number | undefined {
  let best: number | undefined;
  for (const bound of bounds) {
    if (bound > lowerExclusive && bound <= upperInclusive) best = bound;
  }
  return best;
}

export async function chunkStructured(markdown: string, options: StructuredChunkOptions): Promise<StructuredChunk[]> {
  const withDates = options.extractDates !== false;
  const sections = mergeHeadingOnlySections(buildSections(markdown, options.dateContext, withDates));
  if (sections.length === 0) return [];

  const totalWords = wordCount(markdown);
  const totalTokens = await options.countTokens(markdown);
  const tokensPerWord = totalTokens > 0 && totalWords > 0 ? totalTokens / totalWords : 1;
  const budgetWords = Math.max(1, Math.round(options.chunkSize / tokensPerWord));
  const overlapWords = Math.max(0, Math.min(budgetWords - 1, Math.round(options.chunkOverlap / tokensPerWord)));

  const textDates = (text: string): DateRange[] => (withDates ? extractDates(text, options.dateContext) : []);

  const describe = (group: Section[], text: string) => {
    const [first, ...rest] = group;
    const firstPath = first.path.join(" > ");
    const extraTitles = rest.map((s) => s.path[s.path.length - 1]).filter((title): title is string => Boolean(title));
    const sectionPath = [firstPath, ...extraTitles].filter(Boolean).join(" ; ");
    const dates = dedupeRanges([...group.flatMap((s) => s.dates), ...textDates(text)]);
    const contextHeader = buildContextHeader(options.fileName, options.postedDate, sectionPath, dates);
    return { sectionPath, dates, contextHeader };
  };

  const chunks: StructuredChunk[] = [];
  const emit = (group: Section[], tokens: Token[], startIndex: number) => {
    const text = tokensToText(tokens);
    const { sectionPath, dates, contextHeader } = describe(group, text);
    chunks.push({ text, contextHeader, sectionPath, dates, startIndex, endIndex: startIndex + tokens.length });
  };

  const fits = (items: SectionTokens[]): boolean => {
    const tokens = items.flatMap((item) => item.tokens);
    const { contextHeader } = describe(
      items.map((item) => item.section),
      tokensToText(tokens),
    );
    return wordCount(contextHeader) + tokens.length <= budgetWords;
  };

  const splitOversized = (item: SectionTokens) => {
    const wholeText = tokensToText(item.tokens);
    const worstHeader = describe([item.section], wholeText).contextHeader;
    const pieceBudget = Math.max(1, budgetWords - wordCount(worstHeader));
    const sentences = sentenceEnds(item.tokens);
    const total = item.tokens.length;

    let start = 0;
    while (start < total) {
      const limit = Math.min(total, start + pieceBudget);
      const lower = start === 0 ? Math.max(start, item.headingEnd) : start;
      let end = limit;
      if (limit < total) {
        end = lastBoundary(item.blockEnds, lower, limit) ?? lastBoundary(sentences, lower, limit) ?? limit;
      }
      if (start === 0 && end <= item.headingEnd) {
        end = Math.min(total, item.headingEnd + 1);
      }
      emit([item.section], item.tokens.slice(start, end), item.offset + start);
      if (end >= total) break;
      start = Math.max(start + 1, end - overlapWords);
    }
  };

  let packed: SectionTokens[] = [];
  const flushPacked = () => {
    if (packed.length === 0) return;
    emit(
      packed.map((item) => item.section),
      packed.flatMap((item) => item.tokens),
      packed[0].offset,
    );
    packed = [];
  };

  let offset = 0;
  for (const section of sections) {
    const item = tokenizeSection(section, offset);
    offset += item.tokens.length;

    if (packed.length > 0) {
      const candidate = [...packed, item];
      if (fits(candidate)) {
        packed = candidate;
        continue;
      }
      flushPacked();
    }

    if (fits([item])) {
      packed = [item];
      continue;
    }
    splitOversized(item);
  }
  flushPacked();

  return chunks;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsc --noEmit` then `npm test`
Expected: clean; PASS including all `structuredChunker` tests.

If "produces the worked example" fails on the chunk count, print `chunks.map(c => [words(c.contextHeader), words(c.text), c.sectionPath])` in a scratch run to see where packing or splitting diverged, and fix the implementation — the fixture and assertions encode the spec's worked example and must not be loosened.

- [ ] **Step 5: Commit**

```bash
git add src/chunking/structuredChunker.ts src/tests/structuredChunker.test.ts
git commit -m "Add structured chunker with section packing, splits, and context headers

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Index format in the manifest, toggle plumbing, and structured indexing

**Files:**
- Modify: `src/utils/embeddingIndexManifest.ts`
- Modify: `src/ingestion/indexManager.ts`
- Modify: `src/ingestion/runIndexing.ts`
- Modify: `src/cliIndex.ts`
- Modify: `src/config.ts`
- Modify: `src/promptPreprocessor.ts` (pass the toggle to both `runIndexingJob` calls only)
- Test: `src/tests/indexFormat.test.ts`
- Test: `src/tests/indexManagerStructured.test.ts`

**Interfaces:**
- Consumes: `chunkStructured`, `StructuredChunk` (Task 6); `documentPostedDate`, `detectDayMonthOrder`, `dayRangeOf`, `DateRange` (Task 1); `markdownToPlain` (Task 2); `VectorStore.listChunks`, `VectorStore.deleteByFileHash`.
- Produces:
  - `type IndexFormat = "legacy" | "structured-v1"`
  - `EmbeddingIndexManifest` gains `indexFormat: IndexFormat`
  - `function desiredIndexFormat(structuredIndexing: boolean): IndexFormat`
  - `function planIndexFormat(vectorStoreDir: string, totalChunks: number, structuredIndexing: boolean): Promise<{ indexFormat: IndexFormat; rebuildExistingFiles: boolean }>`
  - `function indexFormatMismatchMessage(indexed: IndexFormat, desired: IndexFormat): string | null`
  - `syncEmbeddingManifestAfterIndexing(vectorStoreDir, totalChunks, resolvedModelId, embeddingModel, indexFormat: IndexFormat)`
  - `IndexingOptions` gains `structuredIndexing: boolean; rebuildExistingFiles: boolean`
  - `RunIndexingParams` gains `structuredIndexing: boolean`
  - Config field `structuredIndexing`

- [ ] **Step 1: Write the failing tests**

Create `src/tests/indexFormat.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import {
  desiredIndexFormat,
  getEmbeddingManifestPath,
  indexFormatMismatchMessage,
  planIndexFormat,
  readEmbeddingIndexManifest,
  writeEmbeddingIndexManifest,
} from "../utils/embeddingIndexManifest";

async function tempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), "big-rag-format-"));
}

test("a manifest without indexFormat reads as legacy", async () => {
  const dir = await tempDir();
  try {
    await fs.writeFile(getEmbeddingManifestPath(dir), JSON.stringify({ embeddingModelId: "m", dimensions: 3 }));
    const manifest = await readEmbeddingIndexManifest(dir);
    assert.equal(manifest?.indexFormat, "legacy");
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("planIndexFormat asks for a rebuild only when an existing index uses the other format", async () => {
  const dir = await tempDir();
  try {
    assert.deepEqual(await planIndexFormat(dir, 0, true), { indexFormat: "structured-v1", rebuildExistingFiles: false });
    assert.deepEqual(await planIndexFormat(dir, 10, true), { indexFormat: "structured-v1", rebuildExistingFiles: true });

    await writeEmbeddingIndexManifest(dir, { embeddingModelId: "m", dimensions: 3, indexFormat: "structured-v1" });
    assert.deepEqual(await planIndexFormat(dir, 10, true), { indexFormat: "structured-v1", rebuildExistingFiles: false });
    assert.deepEqual(await planIndexFormat(dir, 10, false), { indexFormat: "legacy", rebuildExistingFiles: true });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("indexFormatMismatchMessage describes the needed reindex", () => {
  assert.equal(desiredIndexFormat(true), "structured-v1");
  assert.equal(desiredIndexFormat(false), "legacy");
  assert.equal(indexFormatMismatchMessage("legacy", "legacy"), null);
  assert.equal(indexFormatMismatchMessage("legacy", "structured-v1"), "Reindex required to apply structured indexing.");
  assert.equal(
    indexFormatMismatchMessage("structured-v1", "legacy"),
    "Reindex required to switch back to standard indexing.",
  );
});
```

Create `src/tests/indexManagerStructured.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { type EmbeddingDynamicHandle, type LMStudioClient } from "@lmstudio/sdk";
import { IndexManager } from "../ingestion/indexManager";
import { VectorStore } from "../vectorstore/vectorStore";

const ROUNDUP_TEXT = [
  "Incident Roundup",
  "",
  "Published on 20 September 2026.",
  "",
  "1. 3 Sep 2026: Warehouse fire in Tuas. Two injured.",
  "2. 8 Sep 2026: Bus collision on the PIE.",
].join("\n");

test("IndexManager stores structured chunks with headers and rebuilds legacy chunks on format change", async () => {
  const docsDir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-docs-"));
  const dbDir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-db-"));
  try {
    await fs.writeFile(path.join(docsDir, "incident_roundup.txt"), ROUNDUP_TEXT);
    const store = new VectorStore(dbDir);
    await store.initialize();

    const embedded: string[] = [];
    const embeddingModel = {
      embed: async (text: string) => {
        embedded.push(text);
        return { embedding: [1, 0, 0] };
      },
      countTokens: async (text: string) => text.split(/\s+/).filter(Boolean).length,
    } as unknown as EmbeddingDynamicHandle;

    const base = {
      documentsDir: docsDir,
      vectorStore: store,
      vectorStoreDir: dbDir,
      embeddingModel,
      client: {} as LMStudioClient,
      chunkSize: 200,
      chunkOverlap: 0,
      maxConcurrent: 1,
      enableOCR: false,
      autoReindex: true,
      parseDelayMs: 0,
    };

    await new IndexManager({ ...base, structuredIndexing: false, rebuildExistingFiles: false }).index();
    const legacy = await store.listChunks();
    assert.ok(legacy.length > 0);
    assert.ok(legacy.every((chunk) => chunk.metadata.indexFormat === "legacy"));

    embedded.length = 0;
    await new IndexManager({ ...base, structuredIndexing: true, rebuildExistingFiles: true }).index();
    const structured = await store.listChunks();

    assert.ok(structured.length > 0);
    assert.ok(structured.every((chunk) => chunk.metadata.indexFormat === "structured-v1"), "no legacy chunks remain");

    const first = structured.find((chunk) => chunk.chunkIndex === 0)!;
    assert.match(String(first.metadata.contextHeader), /^\[File: incident_roundup\.txt \| Posted: 2026-09-20/);
    assert.equal(JSON.parse(String(first.metadata.postedDate)).start, "2026-09-20");
    assert.ok(Array.isArray(JSON.parse(String(first.metadata.dates))));
    assert.ok(!first.text.startsWith("[File:"), "stored text excludes the header");
    assert.ok(embedded.some((text) => text.startsWith("[File: incident_roundup.txt")), "embedding input includes the header");
  } finally {
    await fs.rm(docsDir, { recursive: true, force: true });
    await fs.rm(dbDir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — missing exports (`planIndexFormat`, `desiredIndexFormat`, `indexFormatMismatchMessage`) and TypeScript errors for the unknown `structuredIndexing` / `rebuildExistingFiles` options.

- [ ] **Step 3: Manifest format**

In `src/utils/embeddingIndexManifest.ts`:
- Add after `EMBEDDING_INDEX_MANIFEST_FILENAME`:

```ts
export type IndexFormat = "legacy" | "structured-v1";
```

- Add `indexFormat: IndexFormat;` to `EmbeddingIndexManifest`.
- In `readEmbeddingIndexManifest`, change the successful return to:

```ts
      return {
        embeddingModelId: data.embeddingModelId,
        dimensions: data.dimensions,
        indexFormat: data.indexFormat === "structured-v1" ? "structured-v1" : "legacy",
      };
```

- Change `syncEmbeddingManifestAfterIndexing` to take `indexFormat: IndexFormat` as a fifth parameter and write it:

```ts
export async function syncEmbeddingManifestAfterIndexing(
  vectorStoreDir: string,
  totalChunks: number,
  resolvedModelId: string,
  embeddingModel: EmbeddingDynamicHandle,
  indexFormat: IndexFormat,
): Promise<void> {
  if (totalChunks === 0) {
    await deleteEmbeddingIndexManifest(vectorStoreDir);
    return;
  }
  const probe = await embeddingModel.embed(".");
  const dimensions = coerceEmbeddingVector(probe.embedding).length;
  await writeEmbeddingIndexManifest(vectorStoreDir, {
    embeddingModelId: resolvedModelId,
    dimensions,
    indexFormat,
  });
}
```

- Add at the end of the file:

```ts
export function desiredIndexFormat(structuredIndexing: boolean): IndexFormat {
  return structuredIndexing ? "structured-v1" : "legacy";
}

/**
 * Decides the format to index with, and whether existing files must be
 * rebuilt because the store already holds chunks in the other format.
 */
export async function planIndexFormat(
  vectorStoreDir: string,
  totalChunks: number,
  structuredIndexing: boolean,
): Promise<{ indexFormat: IndexFormat; rebuildExistingFiles: boolean }> {
  const indexFormat = desiredIndexFormat(structuredIndexing);
  if (totalChunks === 0) {
    return { indexFormat, rebuildExistingFiles: false };
  }
  const manifest = await readEmbeddingIndexManifest(vectorStoreDir);
  return { indexFormat, rebuildExistingFiles: (manifest?.indexFormat ?? "legacy") !== indexFormat };
}

export function indexFormatMismatchMessage(indexed: IndexFormat, desired: IndexFormat): string | null {
  if (indexed === desired) return null;
  return desired === "structured-v1"
    ? "Reindex required to apply structured indexing."
    : "Reindex required to switch back to standard indexing.";
}
```

- [ ] **Step 4: IndexManager structured path and rebuild**

In `src/ingestion/indexManager.ts`:
- Add imports:

```ts
import { chunkStructured, type StructuredChunk } from "../chunking/structuredChunker";
import { dayRangeOf, detectDayMonthOrder, documentPostedDate, type DateRange } from "../metadata/dates";
```

- Add to `IndexingOptions`:

```ts
  /** Build structured chunks (Markdown sections, dates, context headers) instead of legacy chunks. */
  structuredIndexing: boolean;
  /** The store holds chunks in the other format: reprocess every file and replace its old chunks. */
  rebuildExistingFiles: boolean;
```

- Add above `export class IndexManager`:

```ts
interface PreparedChunk {
  text: string;
  embedText: string;
  startIndex: number;
  endIndex: number;
  metadata: Record<string, string>;
}
```

- In `indexFile`, replace the two skip checks' condition `autoReindex` with `skipUnchanged`, declared right after `const hasSameHash = ...`:

```ts
      const skipUnchanged = autoReindex && !this.options.rebuildExistingFiles;
```

- Replace the chunking block (from `// Chunk text` through the `if (chunks.length === 0) { ... }` block) with:

```ts
      const chunks = this.options.structuredIndexing
        ? await this.prepareStructuredChunks(parsed.text, file)
        : await this.prepareLegacyChunks(parsed.text);
      if (chunks.length === 0) {
        console.log(`No chunks created from ${file.name}`);
        this.recordFailure("index.chunk-empty", "chunking produced 0 chunks", file);
        if (fileHash) {
          await this.failedFileRegistry.recordFailure(file.path, fileHash, "index.chunk-empty");
        }
        return { type: "failed" };
      }
```

- In the embedding loop, change `embeddingModel.embed(chunk.text)` to `embeddingModel.embed(chunk.embedText)`, and change the pushed chunk's `metadata` to:

```ts
            metadata: {
              extension: file.extension,
              size: file.size,
              mtime: file.mtime.toISOString(),
              startIndex: chunk.startIndex,
              endIndex: chunk.endIndex,
              ...chunk.metadata,
            },
```

- Immediately before `await vectorStore.addChunks(documentChunks);`, add:

```ts
        if (this.options.rebuildExistingFiles && existingHashes) {
          for (const oldHash of existingHashes) {
            await vectorStore.deleteByFileHash(oldHash);
          }
          existingHashes.clear();
        }
```

- Add these private methods to the class (after `indexFile`):

```ts
  private async prepareLegacyChunks(text: string): Promise<PreparedChunk[]> {
    const chunks = await chunkText(markdownToPlain(text), this.options.chunkSize, this.options.chunkOverlap, (t) =>
      this.options.embeddingModel.countTokens(t),
    );
    return chunks.map((chunk) => ({
      text: chunk.text,
      embedText: chunk.text,
      startIndex: chunk.startIndex,
      endIndex: chunk.endIndex,
      metadata: { indexFormat: "legacy" },
    }));
  }

  private async prepareStructuredChunks(markdown: string, file: ScannedFile): Promise<PreparedChunk[]> {
    const base = {
      fileName: file.name,
      chunkSize: this.options.chunkSize,
      chunkOverlap: this.options.chunkOverlap,
      countTokens: (t: string) => this.options.embeddingModel.countTokens(t),
    };

    let postedDate: DateRange;
    let chunks: StructuredChunk[];
    try {
      postedDate = documentPostedDate(markdown, file.name, file.mtime);
      chunks = await chunkStructured(markdown, {
        ...base,
        postedDate,
        dateContext: {
          order: detectDayMonthOrder(markdown),
          referenceTime: file.mtime,
          defaultYear: Number(postedDate.start.slice(0, 4)),
        },
      });
    } catch (error) {
      console.warn(`[BigRAG] Date extraction failed for ${file.name}; indexing without dates:`, error);
      postedDate = dayRangeOf(file.mtime);
      chunks = await chunkStructured(markdown, { ...base, postedDate, dateContext: {}, extractDates: false });
    }

    return chunks.map((chunk) => ({
      text: chunk.text,
      embedText: `${chunk.contextHeader}\n${chunk.text}`,
      startIndex: chunk.startIndex,
      endIndex: chunk.endIndex,
      metadata: {
        indexFormat: "structured-v1",
        postedDate: JSON.stringify(postedDate),
        dates: JSON.stringify(chunk.dates),
        sectionPath: chunk.sectionPath,
        contextHeader: chunk.contextHeader,
      },
    }));
  }
```

- In `reindexFile`, the `this.indexFile(file)` call is unchanged.

- [ ] **Step 5: runIndexing**

In `src/ingestion/runIndexing.ts`:
- Import `planIndexFormat` alongside `syncEmbeddingManifestAfterIndexing`.
- Add `structuredIndexing: boolean;` to `RunIndexingParams` (after `enableOCR`) and destructure it in `runIndexingJob`.
- Before `const indexManager = new IndexManager({`, add:

```ts
  const statsBefore = await vectorStore.getStats();
  const { indexFormat, rebuildExistingFiles } = await planIndexFormat(
    vectorStoreDir,
    statsBefore.totalChunks,
    structuredIndexing,
  );
```

- In the `IndexManager` options, replace `autoReindex: forceReindex ? false : autoReindex,` with:

```ts
    autoReindex: forceReindex || rebuildExistingFiles ? false : autoReindex,
    structuredIndexing,
    rebuildExistingFiles,
```

- Pass `indexFormat` as the fifth argument to `syncEmbeddingManifestAfterIndexing`.

- [ ] **Step 6: CLI indexer**

In `src/cliIndex.ts`:
- Import `planIndexFormat` alongside `syncEmbeddingManifestAfterIndexing`.
- After `const excludePatterns = ...`, add:

```ts
  const structuredIndexing =
    (process.env.BIG_RAG_STRUCTURED_INDEXING ?? "false").toLowerCase() === "true";
```

- After `console.log(\`[BigRAG CLI] Embedding model: ${resolvedEmbeddingModelId}\`);`, add `console.log(\`[BigRAG CLI] Structured indexing: ${structuredIndexing}\`);`.
- After `const embeddingModel = await client.embedding.model(resolvedEmbeddingModelId);`, add:

```ts
  const statsBefore = await vectorStore.getStats();
  const { indexFormat, rebuildExistingFiles } = await planIndexFormat(
    vectorStoreDir,
    statsBefore.totalChunks,
    structuredIndexing,
  );
  if (rebuildExistingFiles) {
    console.log(`[BigRAG CLI] Index format changes to ${indexFormat}; rebuilding every file.`);
  }
```

- In the `IndexManager` options, replace `autoReindex,` with:

```ts
    autoReindex: rebuildExistingFiles ? false : autoReindex,
    structuredIndexing,
    rebuildExistingFiles,
```

- Pass `indexFormat` as the fifth argument to `syncEmbeddingManifestAfterIndexing`.

- [ ] **Step 7: Config toggle and plugin plumbing**

In `src/config.ts`, add after the `enableContextCompaction` field:

```ts
  .field(
    "structuredIndexing",
    "boolean",
    {
      displayName: "Structured Indexing",
      subtitle:
        "Chunk documents by their headings, sections, and list items, record each chunk's dates, and give every chunk a header with its file, section, and dates. Turning this on or off requires a manual reindex with 'Skip Previously Indexed Files' off.",
    },
    false,
  )
```

In `src/promptPreprocessor.ts`:
- Next to `const enableContextCompaction = pluginConfig.get("enableContextCompaction");`, add `const structuredIndexing = pluginConfig.get("structuredIndexing");`.
- In the automatic first-run `runIndexingJob({...})` call, add `structuredIndexing,` after `enableOCR,`.
- Add `structuredIndexing: boolean;` to `ConfigReindexOpts`, add `structuredIndexing` to the destructured parameters of `maybeHandleConfigTriggeredReindex`, add `structuredIndexing,` after `enableOCR,` in its `runIndexingJob({...})` call, and add `structuredIndexing,` after `enableOCR,` in the `maybeHandleConfigTriggeredReindex({...})` call inside `preprocess`.

- [ ] **Step 8: Run tests and type-check**

Run: `npx tsc --noEmit` then `npm test`
Expected: clean; PASS including `indexFormat` and `indexManagerStructured` tests. Run `grep -rn "syncEmbeddingManifestAfterIndexing(" src --include=*.ts` and confirm every call passes five arguments.

- [ ] **Step 9: Commit**

```bash
git add src/utils/embeddingIndexManifest.ts src/ingestion/indexManager.ts src/ingestion/runIndexing.ts src/cliIndex.ts src/config.ts src/promptPreprocessor.ts src/tests/indexFormat.test.ts src/tests/indexManagerStructured.test.ts
git commit -m "Index structured chunks behind a toggle and rebuild on format change

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Prompt rendering, mismatch status, and documentation

**Files:**
- Create: `src/retrieval/renderPassage.ts`
- Modify: `src/promptPreprocessor.ts`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-09-15-structured-indexing-design.md`
- Test: `src/tests/renderPassage.test.ts`

**Interfaces:**
- Consumes: `SearchResult`; `readEmbeddingIndexManifest`, `desiredIndexFormat`, `indexFormatMismatchMessage` (Task 7).
- Produces: `function renderPassageForPrompt(result: SearchResult): string`

- [ ] **Step 1: Write the failing test**

Create `src/tests/renderPassage.test.ts`:

```ts
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { renderPassageForPrompt } from "../retrieval/renderPassage";
import { type SearchResult } from "../vectorstore/vectorStore";

function result(metadata: Record<string, unknown>): SearchResult {
  return {
    text: "Water levels rose overnight.",
    score: 0.9,
    filePath: "/docs/a.md",
    fileName: "a.md",
    chunkIndex: 0,
    shardName: "shard_000",
    metadata,
  };
}

test("renderPassageForPrompt puts the context header before the passage", () => {
  assert.equal(
    renderPassageForPrompt(result({ contextHeader: "[File: a.md | Posted: 2026-09-11]" })),
    "[File: a.md | Posted: 2026-09-11]\nWater levels rose overnight.",
  );
});

test("renderPassageForPrompt leaves legacy passages unchanged", () => {
  assert.equal(renderPassageForPrompt(result({ indexFormat: "legacy" })), "Water levels rose overnight.");
  assert.equal(renderPassageForPrompt(result({ contextHeader: "" })), "Water levels rose overnight.");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../retrieval/renderPassage'`.

- [ ] **Step 3: Write `renderPassage.ts`**

```ts
import { type SearchResult } from "../vectorstore/vectorStore";

/** Passage text as shown to the model: the chunk's context header (when it has one) followed by its text. */
export function renderPassageForPrompt(result: SearchResult): string {
  const header = result.metadata?.contextHeader;
  return typeof header === "string" && header.length > 0 ? `${header}\n${result.text}` : result.text;
}
```

- [ ] **Step 4: Use it in the prompt and show the mismatch status**

In `src/promptPreprocessor.ts`:
- Add `import { renderPassageForPrompt } from "./retrieval/renderPassage";`, and add `readEmbeddingIndexManifest`, `desiredIndexFormat`, `indexFormatMismatchMessage` to the existing `./utils/embeddingIndexManifest` import.
- In the citation-building loop, replace:

```ts
      ragContextFull += `\n${citationLabel}"${result.text}"\n\n`;
      ragContextPreview += `\n${citationLabel}"${summarizeText(result.text)}"\n\n`;
```

with:

```ts
      const passage = renderPassageForPrompt(result);
      ragContextFull += `\n${citationLabel}"${passage}"\n\n`;
      ragContextPreview += `\n${citationLabel}"${summarizeText(passage)}"\n\n`;
```

(The `citationEntries.push({ content: \`${result.text} ...` line stays on `result.text`.)

- Immediately after the `if (!compatibility.ok) { ... }` block, add:

```ts
    const indexManifest = await readEmbeddingIndexManifest(vectorStoreDir);
    const formatMessage = indexManifest
      ? indexFormatMismatchMessage(indexManifest.indexFormat, desiredIndexFormat(structuredIndexing))
      : null;
    if (formatMessage) {
      console.warn("[BigRAG]", formatMessage);
      ctl.createStatus({ status: "error", text: formatMessage });
    }
```

- [ ] **Step 5: Run tests and type-check**

Run: `npx tsc --noEmit` then `npm test`
Expected: clean; PASS.

- [ ] **Step 6: Documentation**

In `README.md`, insert before the `### Prompt Template` heading:

```markdown
### Structured Indexing

- **Structured Indexing** (default: off): Chunks documents by headings, sections, and list items instead of fixed word counts, records each chunk's posted date (from the first page, then the file name, then the file's modified time) and the dates of its sections, and adds a header such as `[File: report.pdf | Posted: 2026-09-20 | Section: Incidents > 2. Bus collision | Dates: 2026-09-08]`. The header is used for search and shown to the model; citations show only the original passage.
- Turning it on or off requires a manual reindex with *Skip Previously Indexed Files* off. Until then, retrieval keeps using the existing index and a status line says a reindex is required.
- For the CLI indexer, set `BIG_RAG_STRUCTURED_INDEXING=true`.

```

In `README.md`, after the line starting ``- `BIG_RAG_FAILURE_REPORT_PATH`:``, add:

```markdown
- `BIG_RAG_STRUCTURED_INDEXING`: `true` to build a structured index (default `false`); changing it rebuilds every file on the next run
```

In `docs/superpowers/specs/2026-09-15-structured-indexing-design.md`:
- Replace the `textParser.ts` row's change text with: `Markdown files are normalized to the contract (headings and lists kept; link URLs, emphasis and inline-code markers, fenced code, and block-quote markers removed). Plain text goes through \`inferStructure\`.`
- In the Sections bullet list, after "For a list-item section, its title is the item's first line, truncated to 80 characters.", add: `A section's "first line" for date purposes is the first 80 characters of its heading, list item, or first content block.`
- In "Config and manifest", after the mismatch bullet, add: `Switching the toggle back off shows "Reindex required to switch back to standard indexing."`

- [ ] **Step 7: Commit**

```bash
git add src/retrieval/renderPassage.ts src/tests/renderPassage.test.ts src/promptPreprocessor.ts README.md docs/superpowers/specs/2026-09-15-structured-indexing-design.md
git commit -m "Show context headers in prompts and warn when the index format needs a reindex

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 8: Live acceptance (user)**

With LM Studio running:
1. Enable **Structured Indexing**, turn on **Manual Reindex Trigger** with **Skip Previously Indexed Files** off, and send a message to reindex.
2. Ask a dated question (e.g. "What happened on <a date in your documents>?"). Confirm the developer console's final prompt shows `[File: … | Posted: …]` headers, citations show plain passages, and the retrieved passages match the date.
3. Run `npm run eval:run` against the reindexed store and compare with a report from the `eval-baseline` tag on the same documents.
