import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as path from "path";
import { parseDocument } from "../parsers/documentParser";

const FIXTURE_DIR = path.resolve(__dirname, "../../test-fixtures");

// Image OCR is opt-in; with it disabled, image files should be skipped
// without ever touching Tesseract (or even needing the file to exist).
test("parseDocument reports image.ocr-disabled when OCR is turned off", async () => {
  const imagePath = path.join(FIXTURE_DIR, "does-not-need-to-exist.png");
  const result = await parseDocument(imagePath, false);

  assert.equal(result.success, false);
  if (result.success) {
    return;
  }
  assert.equal(result.reason, "image.ocr-disabled");
});
