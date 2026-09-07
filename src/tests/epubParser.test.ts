import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as path from "path";
import { parseDocument } from "../parsers/documentParser";

const FIXTURE_DIR = path.resolve(__dirname, "../../test-fixtures");


// Test to see if EPUB Parsing can extract chapter text
test("parseDocument extracts chapter text from EPUB files", async () => {
  const epubPath = path.join(FIXTURE_DIR, "sample.epub");
  const result = await parseDocument(epubPath);

  assert.equal(result.success, true, `Expected success but got ${result.success ? "success" : result.reason}`);
  if (!result.success) {
    return;
  }

  assert.ok(result.document.text.includes("Sample EPUB Chapter Text"));
});
