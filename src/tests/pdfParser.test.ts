import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as path from "path";
import { parseDocument } from "../parsers/documentParser";

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
