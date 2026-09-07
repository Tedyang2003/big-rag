import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as path from "path";
import { parseDocument } from "../parsers/documentParser";

const FIXTURE_DIR = path.resolve(__dirname, "../../test-fixtures");

// Test to see if DOCX Parsing can extract text
test("parseDocument extracts paragraph text from DOCX files", async () => {
  const docxPath = path.join(FIXTURE_DIR, "sample.docx");
  const result = await parseDocument(docxPath);

  assert.equal(result.success, true, `Expected success but got ${result.success ? "success" : result.reason}`);
  if (!result.success) {
    return;
  }

  const text = result.document.text;
  assert.ok(text.includes("Sample DOCX Heading"));
  assert.ok(text.includes("This is a paragraph of body text split across runs."));
});


// Test to see if DOCX Parsing can extract text from tables
test("parseDocument preserves row/column structure for DOCX tables", async () => {
  const docxPath = path.join(FIXTURE_DIR, "sample-table.docx");
  const result = await parseDocument(docxPath);

  assert.equal(result.success, true, `Expected success but got ${result.success ? "success" : result.reason}`);
  if (!result.success) {
    return;
  }

  const text = result.document.text;
  assert.ok(text.includes("Intro paragraph before the table."));
  // Cells from the same row must stay on one line together, and be
  // distinguishable from cells in a different row - not flattened into an
  // indistinguishable run of same-looking paragraphs.
  assert.ok(text.includes("Row1Col1 | Row1Col2"), `Expected row 1 on one line, got: ${text}`);
  assert.ok(text.includes("Row2Col1 | Row2Col2"), `Expected row 2 on one line, got: ${text}`);
  assert.ok(!text.includes("Row1Col2 | Row2Col1"), "Cells from different rows must not be joined together");
});

// Test to see if DOCX error handling works for corrupt files
test("parseDocument reports docx.error for a corrupt DOCX file", async () => {
  const docxPath = path.join(FIXTURE_DIR, "corrupt.docx");
  const result = await parseDocument(docxPath);

  assert.equal(result.success, false);
  if (result.success) {
    return;
  }
  assert.equal(result.reason, "docx.error");
});

// Test to see if DOCX error handling works for empty files
test("parseDocument reports docx.empty for a DOCX file with no text", async () => {
  const docxPath = path.join(FIXTURE_DIR, "empty.docx");
  const result = await parseDocument(docxPath);

  assert.equal(result.success, false);
  if (result.success) {
    return;
  }
  assert.equal(result.reason, "docx.empty");
});


// Test to see if DOCX parsing is case-insensitive for file extensions
test("parseDocument dispatches uppercase .DOCX extension correctly", async () => {
  const result = await parseDocument(path.join(FIXTURE_DIR, "case-insensitive.DOCX"));
  assert.equal(result.success, true, `Expected success but got ${result.success ? "success" : result.reason}`);
});
