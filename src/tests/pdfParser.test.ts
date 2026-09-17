import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as path from "path";
import { parseDocument } from "../parsers/documentParser";
import { summarizeParserError } from "../parsers/pdfParser";

const FIXTURE_DIR = path.resolve(__dirname, "../../test-fixtures");

// PDF parsing requires an LM Studio client; without one it should fail fast
// with a specific reason rather than throwing or attempting to read the file.
test("parseDocument reports pdf.missing-client when no client is supplied", async () => {
  const pdfPath = path.join(FIXTURE_DIR, "does-not-need-to-exist.pdf");
  const result = await parseDocument(pdfPath);

  assert.equal(result.success, false);
  if (result.success) {
    return;
  }
  assert.equal(result.reason, "pdf.missing-client");
});

test("summarizeParserError turns a boxed LM Studio error into one line", () => {
  const boxed = new Error(`

   ┌ Error ──────────────────────────────────────┐
   │                                             │
   │    Failed to load PDF file: [object Object] │
   │                                             │
   │      </> STACK TRACE                        │
   │       at tryLmStudioParser (pdfParser.js:65:47) │
   └─────────────────────────────────────────────┘
`);
  assert.equal(summarizeParserError(boxed), "Failed to load PDF file: [object Object]");
});

test("summarizeParserError handles plain errors, non-errors and long messages", () => {
  assert.equal(summarizeParserError(new Error("Invalid PDF structure")), "Invalid PDF structure");
  assert.equal(summarizeParserError("bad header"), "bad header");
  assert.equal(summarizeParserError(new Error("")), "unknown error");
  const long = summarizeParserError(new Error("x".repeat(500)));
  assert.equal(long.length, 160);
  assert.ok(long.endsWith("…"));
});
