import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as path from "path";
import { parseDocument } from "../parsers/documentParser";

const FIXTURE_DIR = path.resolve(__dirname, "../../test-fixtures");

// Test to see if HTML Parsing can extract clean text
test("parseDocument extracts clean text from HTML files", async () => {
  const htmlPath = path.join(FIXTURE_DIR, "sample.html");
  const result = await parseDocument(htmlPath);

  assert.equal(result.success, true, `Expected success but got ${result.success ? "success" : result.reason}`);
  if (!result.success) {
    return;
  }

  assert.ok(result.document.text.includes("Hello There"));
  assert.ok(!result.document.text.includes("console.log"));
});
