import { test } from "node:test";
import * as assert from "node:assert/strict";
import { formatOcrPage } from "../parsers/markdown/ocrPages";

test("formatOcrPage adds a page heading and keeps inferred structure", () => {
  const page = formatOcrPage(3, "Summary\n\n1. First finding\n2. Second finding");
  assert.deepEqual(page, {
    markdown: "## Page 3\n\n## Summary\n\n1. First finding\n\n2. Second finding",
    contentLength: "## Summary\n\n1. First finding\n\n2. Second finding".length,
  });
});

test("formatOcrPage returns null for a page with no text", () => {
  assert.equal(formatOcrPage(1, " \n\n "), null);
});
