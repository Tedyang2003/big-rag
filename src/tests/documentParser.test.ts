import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as path from "path";
import { parseDocument } from "../parsers/documentParser";

const FIXTURE_DIR = path.resolve(__dirname, "../../test-fixtures");

// Tests here cover parseDocument's own routing/error-handling logic, as
// opposed to any one format's extraction correctness (see the per-format
// *Parser.test.ts files for those).

// Any extension not covered by a parser should be reported explicitly,
// not silently dropped or thrown as an unexpected error.
test("parseDocument reports unsupported-extension for unknown file types", async () => {
  const unknownPath = path.join(FIXTURE_DIR, "does-not-need-to-exist.xyz");
  const result = await parseDocument(unknownPath);

  assert.equal(result.success, false);
  if (result.success) {
    return;
  }
  assert.equal(result.reason, "unsupported-extension");
  assert.equal(result.details, ".xyz");
});

// RAR is explicitly called out as "not yet supported" rather than falling
// through to the generic unsupported-extension message.
test("parseDocument reports unsupported-extension with .rar details for RAR files", async () => {
  const rarPath = path.join(FIXTURE_DIR, "does-not-need-to-exist.rar");
  const result = await parseDocument(rarPath);

  assert.equal(result.success, false);
  if (result.success) {
    return;
  }
  assert.equal(result.reason, "unsupported-extension");
  assert.equal(result.details, ".rar");
});
