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

test("chunkStructured never ends a chunk with stacked leading headings", async () => {
  const body = Array.from({ length: 200 }, (_, i) => `word${i}`).join(" ");
  const markdown = `# Title Heading\n\n## Sub Heading Immediately After\n\n${body}`;
  const chunks = await chunkStructured(markdown, options({ chunkSize: 40 }));
  for (const chunk of chunks) {
    const lastLine = chunk.text.trim().split("\n").pop()!;
    assert.ok(!lastLine.startsWith("#"), `chunk ends with a heading: ${JSON.stringify(chunk.text)}`);
  }
});

test("chunkStructured does not shred a section when the header exceeds the budget", async () => {
  const heading = Array.from({ length: 15 }, (_, i) => `Heading${i}`).join(" ");
  const body = Array.from({ length: 50 }, (_, i) => `word${i}`).join(" ");
  const chunks = await chunkStructured(`# ${heading}\n\n${body}`, options({ chunkSize: 20 }));
  assert.ok(chunks.length <= 8, `expected a handful of chunks, got ${chunks.length}`);
  assert.equal(chunks.map((c) => c.text).join(" ").includes("word49"), true);
});

const sentence = (i: number) => `s${i} alpha beta gamma delta epsilon zeta eta theta iota.`;
const paragraph = (from: number, count: number) =>
  Array.from({ length: count }, (_, i) => sentence(from + i)).join(" ");
// Heading (3 words), then a 30-word paragraph, then a 400-word paragraph of 10-word sentences.
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
  // The header takes 9 words, so pieces get 101; the paragraph end at word 83 (3 heading words + 80) is over 75% of that.
  const markdown = `## Long section\n\n${paragraph(0, 8)}\n\n${paragraph(8, 40)}`;
  const chunks = await chunkStructured(markdown, options());
  assert.equal(chunks[0].endIndex - chunks[0].startIndex, 83);
});

test("chunkStructured cuts at the word limit when a piece has no paragraph or sentence end", async () => {
  const body = Array.from({ length: 300 }, (_, i) => `w${i}`).join(" ");
  const chunks = await chunkStructured(`## Long section\n\n${body}`, options());
  assert.equal(chunks[0].endIndex - chunks[0].startIndex, 101);
  assert.equal(chunks[1].endIndex - chunks[1].startIndex, 101);
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

test("chunkStructured does not repeat packed list-item titles in the header", async () => {
  const bullets = Array.from(
    { length: 12 },
    (_, i) => `- Item ${i + 1} revenue grew strongly across the northern region`,
  );
  const markdown = ["## Slide 3: Regional Results", "", ...bullets].join("\n");
  const chunks = await chunkStructured(markdown, options({ chunkSize: 400 }));
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].sectionPath, "Slide 3: Regional Results");
  assert.ok(
    words(chunks[0].contextHeader) < words(chunks[0].text),
    `header larger than text: ${chunks[0].contextHeader}`,
  );
});

test("chunkStructured budgets headers at their own token density", async () => {
  const denseCount = async (text: string) =>
    text
      .split(/\s+/)
      .filter(Boolean)
      .reduce((sum, word) => sum + (/[\d|]/.test(word) ? 3 : 1), 0);
  const prose = "the crews worked through the night to restore power and water to affected homes nearby";
  const operations = [
    "# Weekly Operations Report",
    "",
    ...Array.from({ length: 6 }, (_, i) => [`## Update ${i + 3} Sep 2026`, "", `${prose} ${prose}`, ""]).flat(),
  ].join("\n");
  const cases: Array<[string, number]> = [
    [ROUNDUP, 110],
    [operations, 52],
  ];
  for (const [markdown, chunkSize] of cases) {
    const chunks = await chunkStructured(markdown, options({ chunkSize, countTokens: denseCount }));
    assert.ok(chunks.length > 0);
    for (const chunk of chunks) {
      const total = (await denseCount(chunk.contextHeader)) + (await denseCount(chunk.text));
      assert.ok(total <= chunkSize * 1.2, `over budget (${total} > ${chunkSize * 1.2}): ${chunk.contextHeader}`);
    }
  }
});

test("chunkStructured never crawls forward when a split piece ends early", async () => {
  // A short paragraph followed by one long paragraph with no sentence ends: the first
  // piece ends at the short paragraph's boundary, well short of a full piece.
  const shortParagraph = Array.from({ length: 20 }, (_, i) => `intro${i}`).join(" ");
  const longParagraph = Array.from({ length: 600 }, (_, i) => `body${i}`).join(" ");
  const markdown = `## Long section\n\n${shortParagraph}\n\n${longParagraph}`;

  const chunks = await chunkStructured(markdown, options({ chunkSize: 110 }));

  for (let i = 1; i < chunks.length; i++) {
    assert.ok(
      chunks[i].endIndex > chunks[i - 1].endIndex,
      `chunk ${i} ends at ${chunks[i].endIndex}, not past chunk ${i - 1} (${chunks[i - 1].endIndex})`,
    );
    const previousLength = chunks[i - 1].endIndex - chunks[i - 1].startIndex;
    assert.ok(
      chunks[i].startIndex >= chunks[i - 1].startIndex + Math.ceil(previousLength / 2),
      `chunk ${i} starts at ${chunks[i].startIndex}, overlapping more than half of chunk ${i - 1}`,
    );
  }
  assert.ok(chunks.length <= 16, `expected a handful of chunks, got ${chunks.length}`);
});

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
