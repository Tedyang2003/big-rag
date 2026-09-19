import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as path from "path";
import { type LMStudioClient } from "@lmstudio/sdk";
import { parseDocument } from "../parsers/documentParser";
import {
  parsePDF,
  summarizeParserError,
  type PdfFailureReason,
  type PdfParserResult,
  type PdfStages,
} from "../parsers/pdfParser";

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

function recordingStages(results: Partial<Record<keyof PdfStages, PdfParserResult>>) {
  const calls: string[] = [];
  const fail = (reason: PdfFailureReason): PdfParserResult => ({ success: false, reason });
  const stage = (name: keyof PdfStages) => async () => {
    calls.push(name);
    return results[name] ?? fail("pdf.pdfparse-empty");
  };
  const stages: PdfStages = {
    mupdf: stage("mupdf"),
    pdfParse: stage("pdfParse"),
    ocr: stage("ocr"),
    lmStudio: stage("lmStudio"),
  };
  return { calls, stages };
}

const noClient = {} as LMStudioClient;

test("parsePDF tries MuPDF styled text first and stops at the first success", async () => {
  const { calls, stages } = recordingStages({ mupdf: { success: true, text: "## Heading\n\nBody.", stage: "mupdf" } });
  const result = await parsePDF("x.pdf", noClient, true, stages);
  assert.equal(result.success, true);
  assert.deepEqual(calls, ["mupdf"]);
});

test("parsePDF falls back from MuPDF to pdf-parse, then OCR, then LM Studio", async () => {
  const { calls, stages } = recordingStages({});
  const result = await parsePDF("x.pdf", noClient, true, stages);
  assert.equal(result.success, false);
  assert.deepEqual(calls, ["mupdf", "pdfParse", "ocr", "lmStudio"]);
});

test("parsePDF skips OCR when it is disabled and still tries LM Studio last", async () => {
  const { calls, stages } = recordingStages({ lmStudio: { success: true, text: "Body text.", stage: "lmstudio" } });
  const result = await parsePDF("x.pdf", noClient, false, stages);
  assert.equal(result.success, true);
  assert.deepEqual(calls, ["mupdf", "pdfParse", "lmStudio"]);
});
