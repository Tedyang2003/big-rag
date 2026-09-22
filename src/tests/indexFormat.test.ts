import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import {
  checkEmbeddingModelForRetrieval,
  desiredIndexFormat,
  getEmbeddingManifestPath,
  indexFormatMismatchMessage,
  indexFormatStatusMessage,
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
    assert.deepEqual(await planIndexFormat(dir, 0, true, "m"), { indexFormat: "structured-v3", rebuildExistingFiles: false });
    assert.deepEqual(await planIndexFormat(dir, 10, true, "m"), { indexFormat: "structured-v3", rebuildExistingFiles: true });

    await writeEmbeddingIndexManifest(dir, {
      embeddingModelId: "m",
      dimensions: 3,
      indexFormat: "structured-v1",
      embeddingPrefixes: "none",
    });
    assert.deepEqual(await planIndexFormat(dir, 10, true, "m"), { indexFormat: "structured-v3", rebuildExistingFiles: true });

    await writeEmbeddingIndexManifest(dir, {
      embeddingModelId: "m",
      dimensions: 3,
      indexFormat: "structured-v3",
      embeddingPrefixes: "none",
    });
    assert.deepEqual(await planIndexFormat(dir, 10, true, "m"), { indexFormat: "structured-v3", rebuildExistingFiles: false });
    assert.deepEqual(await planIndexFormat(dir, 10, false, "m"), { indexFormat: "legacy", rebuildExistingFiles: true });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("a prefix-convention change forces every file to be rebuilt", async () => {
  const dir = await tempDir();
  try {
    await writeEmbeddingIndexManifest(dir, {
      embeddingModelId: "m",
      dimensions: 3,
      indexFormat: "structured-v3",
      embeddingPrefixes: "none",
    });
    assert.deepEqual(await planIndexFormat(dir, 10, true, "nomic-ai/nomic-embed-text-v1.5-GGUF"), {
      indexFormat: "structured-v3",
      rebuildExistingFiles: true,
    });
    assert.deepEqual(await planIndexFormat(dir, 10, true, "some-other-model"), {
      indexFormat: "structured-v3",
      rebuildExistingFiles: false,
    });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("indexFormatMismatchMessage describes the needed reindex", () => {
  assert.equal(desiredIndexFormat(true), "structured-v3");
  assert.equal(desiredIndexFormat(false), "legacy");
  assert.equal(indexFormatMismatchMessage("legacy", "legacy"), null);
  assert.equal(indexFormatMismatchMessage("structured-v3", "structured-v3"), null);
  assert.equal(indexFormatMismatchMessage("legacy", "structured-v3"), "Reindex required to apply structured indexing.");
  assert.equal(
    indexFormatMismatchMessage("structured-v1", "structured-v3"),
    "Reindex required to apply improved structured indexing.",
  );
  assert.equal(
    indexFormatMismatchMessage("structured-v1", "legacy"),
    "Reindex required to switch back to standard indexing.",
  );
  assert.equal(
    indexFormatMismatchMessage("structured-v3", "legacy"),
    "Reindex required to switch back to standard indexing.",
  );
});

test("a structured-v2 index asks for the improved reindex", () => {
  assert.equal(desiredIndexFormat(true), "structured-v3");
  assert.equal(
    indexFormatMismatchMessage("structured-v2", "structured-v3"),
    "Reindex required to apply improved structured indexing.",
  );
  assert.equal(indexFormatMismatchMessage("structured-v3", "structured-v3"), null);
});

test("indexFormatStatusMessage treats a store without a manifest as legacy", async () => {
  const dir = await tempDir();
  try {
    let statsCalls = 0;
    const totalChunks = (count: number) => async () => {
      statsCalls++;
      return count;
    };

    assert.equal(
      await indexFormatStatusMessage(dir, true, totalChunks(10)),
      "Reindex required to apply structured indexing.",
    );
    assert.equal(await indexFormatStatusMessage(dir, false, totalChunks(10)), null);
    assert.equal(await indexFormatStatusMessage(dir, true, totalChunks(0)), null);
    assert.equal(statsCalls, 3);

    await writeEmbeddingIndexManifest(dir, {
      embeddingModelId: "m",
      dimensions: 3,
      indexFormat: "structured-v3",
      embeddingPrefixes: "none",
    });
    statsCalls = 0;
    assert.equal(
      await indexFormatStatusMessage(dir, false, totalChunks(10)),
      "Reindex required to switch back to standard indexing.",
    );
    assert.equal(await indexFormatStatusMessage(dir, true, totalChunks(10)), null);
    assert.equal(statsCalls, 0, "stats are only read when the manifest is missing");
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("a structured-v1 manifest is read back as structured-v1", async () => {
  const dir = await tempDir();
  try {
    await writeEmbeddingIndexManifest(dir, {
      embeddingModelId: "m",
      dimensions: 3,
      indexFormat: "structured-v1",
      embeddingPrefixes: "none",
    });
    assert.equal((await readEmbeddingIndexManifest(dir))?.indexFormat, "structured-v1");
    assert.equal(
      await indexFormatStatusMessage(dir, true, async () => 10),
      "Reindex required to apply improved structured indexing.",
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("a manifest round-trips its embeddingPrefixes field", async () => {
  const dir = await tempDir();
  try {
    await writeEmbeddingIndexManifest(dir, {
      embeddingModelId: "m",
      dimensions: 3,
      indexFormat: "structured-v3",
      embeddingPrefixes: "none",
    });
    const manifest = await readEmbeddingIndexManifest(dir);
    assert.equal(manifest?.embeddingPrefixes, "none");
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("retrieval refuses an index built under a different prefix convention", async () => {
  const dir = await tempDir();
  try {
    await writeEmbeddingIndexManifest(dir, {
      embeddingModelId: "nomic-ai/nomic-embed-text-v1.5-GGUF",
      dimensions: 3,
      indexFormat: "structured-v3",
      embeddingPrefixes: "none",
    });
    const check = await checkEmbeddingModelForRetrieval({
      vectorStoreDir: dir,
      resolvedModelId: "nomic-ai/nomic-embed-text-v1.5-GGUF",
      totalChunks: 10,
      embeddingModel: { embed: async () => ({ embedding: [1, 2, 3] }) } as never,
    });
    assert.equal(check.ok, false);
    if (!check.ok) assert.match(check.userMessage, /[Rr]eindex/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
