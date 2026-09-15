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
