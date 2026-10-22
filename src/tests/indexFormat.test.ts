import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import {
  checkEmbeddingModelForRetrieval,
  desiredIndexFormat,
  EMBEDDING_INDEX_MANIFEST_FILENAME,
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
      indexFormat: "legacy",
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
    // The control isolates the prefix axis by keeping the model id the same: a different id
    // rebuilds on its own account, whatever its prefix convention.
    assert.deepEqual(await planIndexFormat(dir, 10, true, "m"), {
      indexFormat: "structured-v3",
      rebuildExistingFiles: false,
    });
    assert.deepEqual(await planIndexFormat(dir, 10, true, "some-other-model"), {
      indexFormat: "structured-v3",
      rebuildExistingFiles: true,
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
    indexFormatMismatchMessage("structured-v3", "legacy"),
    "Reindex required to switch back to standard indexing.",
  );
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

test("changing the embedding model forces a rebuild even when the prefix convention matches", async () => {
  const dir = await tempDir();
  try {
    // Indexed with one Nomic model...
    await writeEmbeddingIndexManifest(dir, {
      embeddingModelId: "nomic-ai/nomic-embed-text-v1.5-GGUF",
      dimensions: 768,
      indexFormat: "structured-v3",
      embeddingPrefixes: "nomic",
    });

    // ...then the user switches to a different Nomic model. The format is unchanged and both
    // models use "nomic" prefixes, so neither of planIndexFormat's checks notices - but every
    // stored vector was produced by the old model and must be rebuilt.
    const plan = await planIndexFormat(dir, 10, true, "nomic-ai/nomic-embed-text-v1-GGUF");
    assert.equal(
      plan.rebuildExistingFiles,
      true,
      "a model change must rebuild: otherwise the run skips every file, the manifest is " +
        "rewritten with the new model id, and the compatibility check then passes while the " +
        "new model's queries score against the old model's vectors",
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("an unrecognised index format reads as legacy and asks for a reindex", async () => {
  const dir = await tempDir();
  try {
    // Written by hand: this is a format no version of the code produces - a retired
    // structured-v1, or one from a future build - and the reader must not trust it.
    await fs.writeFile(
      path.join(dir, EMBEDDING_INDEX_MANIFEST_FILENAME),
      JSON.stringify({
        embeddingModelId: "m",
        dimensions: 3,
        indexFormat: "structured-v9",
        embeddingPrefixes: "none",
      }),
      "utf-8",
    );
    assert.equal((await readEmbeddingIndexManifest(dir))?.indexFormat, "legacy");
    assert.equal(
      await indexFormatStatusMessage(dir, true, async () => 10),
      "Reindex required to apply structured indexing.",
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

test("retrieval refuses a manifest-less index for a nomic model and allows it for another", async () => {
  const dir = await tempDir();
  try {
    const embeddingModel = { embed: async () => ({ embedding: [1, 2, 3] }) } as never;
    const nomic = await checkEmbeddingModelForRetrieval({
      vectorStoreDir: dir,
      resolvedModelId: "nomic-ai/nomic-embed-text-v1.5-GGUF",
      totalChunks: 10,
      embeddingModel,
    });
    assert.equal(nomic.ok, false);
    if (!nomic.ok) assert.match(nomic.userMessage, /[Rr]eindex/);

    const other = await checkEmbeddingModelForRetrieval({
      vectorStoreDir: dir,
      resolvedModelId: "some-other-model",
      totalChunks: 10,
      embeddingModel,
    });
    assert.equal(other.ok, true);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
