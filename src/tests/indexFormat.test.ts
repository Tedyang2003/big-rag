import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import {
  desiredIndexFormat,
  getEmbeddingManifestPath,
  indexFormatMismatchMessage,
  planIndexFormat,
  readEmbeddingIndexManifest,
  writeEmbeddingIndexManifest,
} from "../utils/embeddingIndexManifest";

async function tempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), "big-rag-format-"));
}

test("a manifest without indexFormat reads as legacy", async () => {
  const dir = await tempDir();
  try {
    await fs.writeFile(getEmbeddingManifestPath(dir), JSON.stringify({ embeddingModelId: "m", dimensions: 3 }));
    const manifest = await readEmbeddingIndexManifest(dir);
    assert.equal(manifest?.indexFormat, "legacy");
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("planIndexFormat asks for a rebuild only when an existing index uses the other format", async () => {
  const dir = await tempDir();
  try {
    assert.deepEqual(await planIndexFormat(dir, 0, true), { indexFormat: "structured-v1", rebuildExistingFiles: false });
    assert.deepEqual(await planIndexFormat(dir, 10, true), { indexFormat: "structured-v1", rebuildExistingFiles: true });

    await writeEmbeddingIndexManifest(dir, { embeddingModelId: "m", dimensions: 3, indexFormat: "structured-v1" });
    assert.deepEqual(await planIndexFormat(dir, 10, true), { indexFormat: "structured-v1", rebuildExistingFiles: false });
    assert.deepEqual(await planIndexFormat(dir, 10, false), { indexFormat: "legacy", rebuildExistingFiles: true });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("indexFormatMismatchMessage describes the needed reindex", () => {
  assert.equal(desiredIndexFormat(true), "structured-v1");
  assert.equal(desiredIndexFormat(false), "legacy");
  assert.equal(indexFormatMismatchMessage("legacy", "legacy"), null);
  assert.equal(indexFormatMismatchMessage("legacy", "structured-v1"), "Reindex required to apply structured indexing.");
  assert.equal(
    indexFormatMismatchMessage("structured-v1", "legacy"),
    "Reindex required to switch back to standard indexing.",
  );
});
