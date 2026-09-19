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
  const page2 = withFurniture(page([bold("Overview"), ...body(5), ...body(5)]), 2);
  page2.blocks.push({ lines: [line("7", 940)] });
  const markdown = styledPagesToMarkdown([withFurniture(page(body(5)), 1), page2, withFurniture(page(body(8)), 3)]);
  assert.deepEqual(headingLines(markdown), ["## Overview"]);
  assert.ok(!markdown!.includes("Acme Corp"), "repeated header removed");
  assert.ok(!markdown!.includes("Page 2 of 3"), "footer removed");
  assert.ok(!/^7$/m.test(markdown!), "page number removed");
  assert.ok(markdown!.includes(BODY_TEXT));
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
      ...body(15),
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

test("a page number is only furniture near the page edge", () => {
  const second = page([bold("Overview"), ...body(3), "2021", ...body(3)]);
  second.blocks.push({ lines: [line("7", 960)] });
  const markdown = styledPagesToMarkdown([page(body(3)), second]);
  assert.ok(markdown!.includes("2021"), "mid-page number kept");
  assert.ok(!/^7$/m.test(markdown!), "footer page number dropped");
});

test("guard 1 ignores overlap from long flowing-text lines (two-column page)", () => {
  const second: PdfPage = {
    height: 1000,
    blocks: [
      { lines: [line("Methods", 300, { bold: true, box: [50, 300, 290, 312] })] },
      {
        lines: [
          line("Right column line one of the flowing text.", 280, { box: [310, 280, 550, 292] }),
          line("Right column line two of the flowing text.", 300, { box: [310, 300, 550, 312] }),
          line("Right column line three of the flowing text.", 320, { box: [310, 320, 550, 332] }),
          line("Right column line four of the flowing text.", 340, { box: [310, 340, 550, 352] }),
          line("Right column line five of the flowing text.", 360, { box: [310, 360, 550, 372] }),
        ],
      },
    ],
  };
  const markdown = styledPagesToMarkdown([page(body(3)), second]);
  assert.deepEqual(headingLines(markdown), ["## Methods"]);
});

test("guard 2 counts every heading-style candidate line, including dropped joins", () => {
  const run: Entry[] = [
    bold("Alpha beta gamma delta epsilon zeta eta theta"),
    bold("iota kappa lambda mu nu xi omicron pi"),
  ];
  const markdown = styledPagesToMarkdown([
    page(body(3)),
    page([bold("Heading"), BODY_TEXT, ...run, BODY_TEXT, ...run, BODY_TEXT, ...run]),
  ]);
  assert.equal(markdown, null);
});

test("candidate lines are only joined into one heading when they are vertically adjacent", () => {
  const second: PdfPage = {
    height: 1000,
    blocks: [
      { lines: [line("Part Two", 100, { bold: true, box: [50, 100, 200, 112] })] },
      { lines: [line("Item 5", 152, { bold: true, box: [50, 152, 200, 164] })] },
      ...body(10).map((text, i) => ({ lines: [line(text as string, 200 + i * 20)] })),
    ],
  };
  const markdown = styledPagesToMarkdown([page(body(10)), second]);
  assert.deepEqual(headingLines(markdown), ["## Part Two", "## Item 5"]);
});

test("F1: a wrapped paragraph in a heading-like style is body text, not a heading", () => {
  const markdown = styledPagesToMarkdown([
    page(body(5)),
    page([
      bold("Results"),
      ...body(8),
      ["(1) Represents the impact of foreign currency", { italic: true }],
      ["translation on the reported balance.", { italic: true }],
      ...body(5),
    ]),
  ]);
  assert.deepEqual(headingLines(markdown), ["## Results"]);
  assert.ok(markdown!.includes("(1) Represents the impact of foreign currency"));
  assert.ok(markdown!.includes("translation on the reported balance."));
});

test("F2a: a label column beside a tall number column is a table, not headings", () => {
  const labels = ["Revenue", "Costs", "Taxes", "Margin", "Assets", "Debt", "Equity", "Cash"];
  const second: PdfPage = {
    height: 1000,
    blocks: [
      { lines: labels.map((text, i) => line(text, 300 + i * 20, { bold: true, box: [50, 300 + i * 20, 200, 312 + i * 20] })) },
      { lines: labels.map((_, i) => line(`${(i + 1) * 111}`, 300 + i * 20, { box: [400, 300 + i * 20, 450, 312 + i * 20] })) },
      ...body(50).map((text, i) => ({ lines: [line(text as string, 480 + i * 10)] })),
    ],
  };
  const markdown = styledPagesToMarkdown([page(body(10)), second]);
  const headings = headingLines(markdown);
  for (const label of labels) assert.ok(!headings.some((h) => h.includes(label)), `${label} is not a heading`);
});

test("F2b: a single-line numeric table row is not a heading", () => {
  const markdown = styledPagesToMarkdown([
    page(body(5)),
    page([bold("Results"), ...body(8), bold("Net sales 1,000 900"), ...body(8)]),
  ]);
  assert.deepEqual(headingLines(markdown), ["## Results"]);
  assert.ok(markdown!.includes("Net sales 1,000 900"));
});

test("F3: a candidate that starts far above the previous one is not joined to it", () => {
  const second: PdfPage = {
    height: 1000,
    blocks: [
      { lines: [line("Left Column Heading", 500, { bold: true, box: [50, 500, 290, 512] })] },
      { lines: [line("Right Column Heading", 200, { bold: true, box: [310, 200, 550, 212] })] },
      ...body(10).map((text, i) => ({ lines: [line(text as string, 600 + i * 20)] })),
    ],
  };
  const markdown = styledPagesToMarkdown([page(body(10)), second]);
  assert.deepEqual(headingLines(markdown), ["## Left Column Heading", "## Right Column Heading"]);
});

test("F4: a body line starting with '# ' is escaped, not turned into a heading", () => {
  const markdown = styledPagesToMarkdown([
    page(body(5)),
    page([bold("Stores"), ...body(4), "# of stores at year end", ...body(4)]),
  ]);
  assert.deepEqual(headingLines(markdown), ["## Stores"]);
  assert.ok(markdown!.includes("\\# of stores at year end"));
});

test("F-style: smaller text is never a heading style, even when bold", () => {
  const smallPlain = styledPagesToMarkdown([
    page(body(5)),
    page([bold("Results"), ...body(8), ["Footnote marker text", { size: 8 }], ...body(8)]),
  ]);
  assert.deepEqual(headingLines(smallPlain), ["## Results"]);
  const smallBold = styledPagesToMarkdown([
    page(body(5)),
    page([bold("Results"), ...body(8), ["Small bold note", { size: 8, bold: true }], ...body(8)]),
  ]);
  assert.deepEqual(headingLines(smallBold), ["## Results"]);
});

test("inferStructure keeps short standalone lines as text when heading inference is off", () => {
  assert.equal(inferStructure("Short line\n\nNext paragraph."), "## Short line\n\nNext paragraph.");
  assert.equal(inferStructure("Short line\n\nNext paragraph.", { inferHeadings: false }), "Short line\n\nNext paragraph.");
  assert.equal(inferStructure("## Kept\n\n- item", { inferHeadings: false }), "## Kept\n\n- item");
});
