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
