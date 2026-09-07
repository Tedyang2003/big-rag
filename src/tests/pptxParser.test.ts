import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as path from "path";
import { parseDocument } from "../parsers/documentParser";

const FIXTURE_DIR = path.resolve(__dirname, "../../test-fixtures");

// Test to see if PPTX Parsing can extract slide text
test("parseDocument extracts slide text from PPTX files", async () => {
  const pptxPath = path.join(FIXTURE_DIR, "sample.pptx");
  const result = await parseDocument(pptxPath);

  assert.equal(result.success, true, `Expected success but got ${result.success ? "success" : result.reason}`);
  if (!result.success) {
    return;
  }

  const text = result.document.text;
  assert.ok(text.includes("[Slide 1]"));
  assert.ok(text.includes("Sample PPTX Title"));
  assert.ok(text.includes("Second line of slide text"));
});

// Test to see if PPTX Parsing can extract slide text from a PPTX with no notes
test("parseDocument preserves row/column structure for PPTX tables", async () => {
  const pptxPath = path.join(FIXTURE_DIR, "sample-table.pptx");
  const result = await parseDocument(pptxPath);

  assert.equal(result.success, true, `Expected success but got ${result.success ? "success" : result.reason}`);
  if (!result.success) {
    return;
  }

  const text = result.document.text;
  assert.ok(text.includes("Slide Title Above Table"));
  assert.ok(text.includes("Row1Col1 | Row1Col2"), `Expected row 1 on one line, got: ${text}`);
  assert.ok(text.includes("Row2Col1 | Row2Col2"), `Expected row 2 on one line, got: ${text}`);
  assert.ok(!text.includes("Row1Col2 | Row2Col1"), "Cells from different rows must not be joined together");
});


// Test to see if PPTX Parsing can extract slide text from a PPTX with no notes
test("parseDocument follows sldIdLst display order and per-slide notes rels, not filename numbers", async () => {
  const pptxPath = path.join(FIXTURE_DIR, "reordered.pptx");
  const result = await parseDocument(pptxPath);

  assert.equal(result.success, true, `Expected success but got ${result.success ? "success" : result.reason}`);
  if (!result.success) {
    return;
  }

  const text = result.document.text;

  // presentation.xml's sldIdLst lists slide2.xml before slide1.xml, so slide2's
  // content must be labeled "[Slide 1]" even though its filename says otherwise.
  const slideOneIndex = text.indexOf("[Slide 1]");
  const slideTwoContentIndex = text.indexOf("Slide Two Content");
  const slideOneContentIndex = text.indexOf("Slide One Content");
  const slideTwoIndex = text.indexOf("[Slide 2]");

  assert.ok(slideOneIndex >= 0 && slideTwoIndex >= 0, "Both slide markers should be present");
  assert.ok(
    slideOneIndex < slideTwoContentIndex && slideTwoContentIndex < slideTwoIndex,
    "Slide 2.xml's content should appear under the [Slide 1] marker",
  );
  assert.ok(
    slideTwoIndex < slideOneContentIndex,
    "Slide 1.xml's content should appear under the [Slide 2] marker",
  );

  // Notes numbering is deliberately mismatched with slide numbering in the fixture;
  // only following each slide's own relationship file resolves these correctly.
  assert.ok(
    text.includes("[Slide 1 notes]") && text.indexOf("Notes For Slide Two") > text.indexOf("[Slide 1 notes]"),
    "Slide 1 (= slide2.xml) notes should resolve to notesSlide1.xml's content via slide2's own rels",
  );
  assert.ok(
    text.includes("[Slide 2 notes]") && text.indexOf("Notes For Slide One") > text.indexOf("[Slide 2 notes]"),
    "Slide 2 (= slide1.xml) notes should resolve to notesSlide2.xml's content via slide1's own rels",
  );
});

test("parseDocument still emits slide marker and notes for a visually blank slide", async () => {
  const pptxPath = path.join(FIXTURE_DIR, "notes-only.pptx");
  const result = await parseDocument(pptxPath);

  assert.equal(result.success, true, `Expected success but got ${result.success ? "success" : result.reason}`);
  if (!result.success) {
    return;
  }

  const text = result.document.text;
  assert.ok(text.includes("[Slide 1]"));
  assert.ok(text.includes("[Slide 1 notes]"));
  assert.ok(text.includes("Speaker note for blank slide"));
});

test("parseDocument reports pptx.error for a corrupt PPTX file", async () => {
  const pptxPath = path.join(FIXTURE_DIR, "corrupt.pptx");
  const result = await parseDocument(pptxPath);

  assert.equal(result.success, false);
  if (result.success) {
    return;
  }
  assert.equal(result.reason, "pptx.error");
});

// Test to see if PPTX error handling works for empty files
test("parseDocument reports pptx.empty for a PPTX file with no slides", async () => {
  const pptxPath = path.join(FIXTURE_DIR, "empty.pptx");
  const result = await parseDocument(pptxPath);

  assert.equal(result.success, false);
  if (result.success) {
    return;
  }
  assert.equal(result.reason, "pptx.empty");
});

// Test to see if handling of uppercase file extensions works for PPTX files
test("parseDocument dispatches uppercase .PPTX extension correctly", async () => {
  const result = await parseDocument(path.join(FIXTURE_DIR, "case-insensitive.PPTX"));
  assert.equal(result.success, true, `Expected success but got ${result.success ? "success" : result.reason}`);
});
