import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import {
  hypotheticalStore,
  hypotheticalsPathFor,
  loadHypotheticals,
  saveHypotheticals,
} from "../eval/hypotheticalCache";

async function withTempFile(fn: (filePath: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-hyde-"));
  try {
    await fn(path.join(dir, "hypotheticals.json"));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test("a saved cache round-trips for the model that wrote it", async () => {
  await withTempFile(async (filePath) => {
    await saveHypotheticals(filePath, "gemma", { q1: "a draft" });
    assert.deepEqual(await loadHypotheticals(filePath, "gemma", false), { q1: "a draft" });
  });
});

test("a cache written by another model is not reused", async () => {
  await withTempFile(async (filePath) => {
    await saveHypotheticals(filePath, "gemma", { q1: "a draft" });
    assert.deepEqual(await loadHypotheticals(filePath, "qwen", false), {});
  });
});

test("regenerating ignores the cache, and a missing or corrupt file is empty", async () => {
  await withTempFile(async (filePath) => {
    await saveHypotheticals(filePath, "gemma", { q1: "a draft" });
    assert.deepEqual(await loadHypotheticals(filePath, "gemma", true), {});

    await fs.writeFile(filePath, "{not json");
    assert.deepEqual(await loadHypotheticals(filePath, "gemma", false), {});

    assert.deepEqual(await loadHypotheticals(path.join(path.dirname(filePath), "absent.json"), "gemma", false), {});
  });
});

test("a cached question is served without calling the generator", async () => {
  let calls = 0;
  const store = hypotheticalStore({ q1: "cached draft" }, async () => {
    calls++;
    return "fresh draft";
  });

  assert.equal(await store.forQuestion("q1", "a question"), "cached draft");
  assert.equal(calls, 0);
  assert.equal(store.hits, 1);
  assert.equal(store.misses, 0);
});

test("an uncached question is generated once and remembered", async () => {
  let calls = 0;
  const store = hypotheticalStore({}, async () => {
    calls++;
    return "fresh draft";
  });

  assert.equal(await store.forQuestion("q2", "a question"), "fresh draft");
  assert.equal(await store.forQuestion("q2", "a question"), "fresh draft");
  assert.equal(calls, 1, "the second ask should come from memory");
  assert.equal(store.hits, 1);
  assert.equal(store.misses, 1);
  assert.deepEqual(store.byQuestion, { q2: "fresh draft" });
});

test("a question the generator cannot draft is not cached, so a later run retries it", async () => {
  let calls = 0;
  const store = hypotheticalStore({}, async () => {
    calls++;
    return null;
  });

  assert.equal(await store.forQuestion("q3", "a question"), null);
  assert.equal(await store.forQuestion("q3", "a question"), null);
  assert.equal(calls, 2);
  assert.deepEqual(store.byQuestion, {});
});

test("each question set gets its own cache, beside it and named after it", () => {
  const sep = path.sep;
  assert.equal(hypotheticalsPathFor(`eval${sep}questions.json`), `eval${sep}hypotheticals.json`);
  assert.equal(hypotheticalsPathFor(`eval${sep}questions-qasper.json`), `eval${sep}hypotheticals-qasper.json`);
  assert.equal(hypotheticalsPathFor(`eval${sep}anything.json`), `eval${sep}hypotheticals-anything.json`);

  // Two question sets must never resolve to one file, whatever they are called.
  const paths = ["questions.json", "questions-qasper.json", "questions-cuad.json", "mine.json"].map((name) =>
    hypotheticalsPathFor(`eval${sep}${name}`),
  );
  assert.equal(new Set(paths).size, paths.length);
});
