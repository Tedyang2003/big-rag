import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import {
  isInsideDocumentsDir,
  loadQuestionSet,
  parseQuestionSet,
  toRelativeSourcePath,
  writeNewFile,
} from "../eval/questionSet";

const VALID = {
  version: 1,
  generatedAt: "2026-09-15T10:00:00Z",
  generator: { model: "test-model", seed: 42 },
  questions: [
    { id: "q-001", question: "How much did membership grow?", sourceFile: "a.md", answerSnippet: "Total members: 15.8M" },
  ],
};

test("parseQuestionSet accepts a valid set", () => {
  const set = parseQuestionSet(JSON.stringify(VALID));
  assert.equal(set.questions.length, 1);
  assert.equal(set.questions[0].id, "q-001");
});

test("parseQuestionSet rejects invalid JSON", () => {
  assert.throws(() => parseQuestionSet("{not json"), /not valid JSON/);
});

test("parseQuestionSet rejects an unsupported version", () => {
  assert.throws(() => parseQuestionSet(JSON.stringify({ ...VALID, version: 2 })), /version/);
});

test("parseQuestionSet names the entry with a missing field", () => {
  const bad = { ...VALID, questions: [{ id: "q-007", question: "Q?", sourceFile: "a.md", answerSnippet: "" }] };
  assert.throws(() => parseQuestionSet(JSON.stringify(bad)), /q-007.*answerSnippet/);
});

test("parseQuestionSet rejects duplicate ids", () => {
  const dup = { ...VALID, questions: [VALID.questions[0], VALID.questions[0]] };
  assert.throws(() => parseQuestionSet(JSON.stringify(dup)), /Duplicate question id "q-001"/);
});

test("loadQuestionSet explains how to create a missing set", async () => {
  const missing = path.join(os.tmpdir(), `big-rag-missing-${Date.now()}.json`);
  await assert.rejects(() => loadQuestionSet(missing), /eval:generate/);
});

test("writeNewFile creates parent directories and refuses to overwrite", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-qs-"));
  try {
    const target = path.join(dir, "nested", "file.json");
    await writeNewFile(target, "first");
    assert.equal(await fs.readFile(target, "utf-8"), "first");
    await assert.rejects(() => writeNewFile(target, "second"));
    assert.equal(await fs.readFile(target, "utf-8"), "first");
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("toRelativeSourcePath uses forward slashes relative to the documents dir", () => {
  const docs = path.resolve("/docs");
  const file = path.join(docs, "research", "SOFI.md");
  assert.equal(toRelativeSourcePath(docs, file), "research/SOFI.md");
});

test("isInsideDocumentsDir accepts ordinary relative paths", () => {
  assert.equal(isInsideDocumentsDir("research/SOFI.md"), true);
  assert.equal(isInsideDocumentsDir("a.md"), true);
});

test("isInsideDocumentsDir rejects paths that escape the documents dir", () => {
  assert.equal(isInsideDocumentsDir(".."), false);
  assert.equal(isInsideDocumentsDir("../a.md"), false);
  assert.equal(isInsideDocumentsDir("../../other/a.md"), false);
});

test("isInsideDocumentsDir rejects absolute paths", () => {
  assert.equal(isInsideDocumentsDir("/etc/passwd"), false);
  assert.equal(isInsideDocumentsDir("D:/other/a.md"), false);
  assert.equal(isInsideDocumentsDir("C:/docs/a.md"), false);
});
