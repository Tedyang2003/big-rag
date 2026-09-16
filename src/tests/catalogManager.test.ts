import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { CatalogCache, getCatalog, resetCatalogCache } from "../retrieval/catalogManager";
import { CATALOG_FILENAME } from "../retrieval/chunkCatalog";
import { type IndexedChunk } from "../vectorstore/vectorStore";

const OPTIONS = { version: 1, maxChunks: 50000, k1: 1.2, b: 0.75 };

function chunkOf(id: string): IndexedChunk {
  return {
    id,
    shardName: "shard_000",
    text: `text of ${id}`,
    filePath: "/docs/a.md",
    fileName: "a.md",
    chunkIndex: 0,
    metadata: {},
  };
}

function sourceOf(chunks: IndexedChunk[]) {
  let listCalls = 0;
  return {
    listCalls: () => listCalls,
    source: {
      listChunks: async () => {
        listCalls++;
        return chunks;
      },
      getStats: async () => ({ totalChunks: chunks.length }),
    },
  };
}

async function withTempDir(fn: (dir: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-catalog-mgr-"));
  try {
    await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test("getCatalog builds once, saves, and reuses the cache", async () => {
  await withTempDir(async (dir) => {
    const { source, listCalls } = sourceOf([chunkOf("hashA-0"), chunkOf("hashA-1")]);
    const cache = new CatalogCache();

    const first = await getCatalog(dir, source, OPTIONS, cache);
    assert.ok(first.catalog);
    assert.equal(first.built, true);
    assert.ok(first.ms >= 0);
    await fs.access(path.join(dir, CATALOG_FILENAME));

    const second = await getCatalog(dir, source, OPTIONS, cache);
    assert.equal(second.built, false);
    assert.equal(listCalls(), 1);
  });
});

test("a saved catalog is loaded instead of rebuilt in a new session", async () => {
  await withTempDir(async (dir) => {
    const { source } = sourceOf([chunkOf("hashA-0")]);
    await getCatalog(dir, source, OPTIONS, new CatalogCache());

    const { source: freshSource, listCalls } = sourceOf([chunkOf("hashA-0")]);
    const loaded = await getCatalog(dir, freshSource, OPTIONS, new CatalogCache());
    assert.ok(loaded.catalog);
    assert.equal(loaded.built, false);
    assert.equal(listCalls(), 0);
  });
});

test("a chunk count change rebuilds the catalog", async () => {
  await withTempDir(async (dir) => {
    await getCatalog(dir, sourceOf([chunkOf("hashA-0")]).source, OPTIONS, new CatalogCache());
    const { source, listCalls } = sourceOf([chunkOf("hashA-0"), chunkOf("hashA-1")]);
    const rebuilt = await getCatalog(dir, source, OPTIONS, new CatalogCache());
    assert.equal(rebuilt.built, true);
    assert.equal(rebuilt.catalog!.chunkCount, 2);
    assert.equal(listCalls(), 1);
  });
});

test("a build failure is reported once and not retried in the session", async () => {
  await withTempDir(async (dir) => {
    const failing = {
      listChunks: async () => {
        throw new Error("store unreadable");
      },
      getStats: async () => ({ totalChunks: 2 }),
    };
    const cache = new CatalogCache();

    const first = await getCatalog(dir, failing, OPTIONS, cache);
    assert.equal(first.catalog, null);
    assert.match(first.error!, /store unreadable/);

    let retried = false;
    const second = await getCatalog(
      dir,
      {
        listChunks: async () => {
          retried = true;
          return [];
        },
        getStats: async () => ({ totalChunks: 2 }),
      },
      OPTIONS,
      cache,
    );
    assert.equal(second.catalog, null);
    assert.equal(retried, false);
  });
});

test("an empty store yields no catalog and no file", async () => {
  await withTempDir(async (dir) => {
    const outcome = await getCatalog(dir, sourceOf([]).source, OPTIONS, new CatalogCache());
    assert.equal(outcome.catalog, null);
    await assert.rejects(fs.access(path.join(dir, CATALOG_FILENAME)));
  });
});

test("onBuildStart fires exactly once for a build, and not on cache reuse or disk load", async () => {
  await withTempDir(async (dir) => {
    const { source } = sourceOf([chunkOf("hashA-0")]);
    const cache = new CatalogCache();
    let starts = 0;
    const onBuildStart = () => {
      starts++;
    };

    await getCatalog(dir, source, OPTIONS, cache, onBuildStart);
    await getCatalog(dir, source, OPTIONS, cache, onBuildStart);
    assert.equal(starts, 1);

    let freshStarts = 0;
    const { source: freshSource } = sourceOf([chunkOf("hashA-0")]);
    await getCatalog(dir, freshSource, OPTIONS, new CatalogCache(), () => {
      freshStarts++;
    });
    assert.equal(freshStarts, 0);
  });
});

test("a build failure returns reportFailure true only the first time", async () => {
  await withTempDir(async (dir) => {
    const failing = {
      listChunks: async () => {
        throw new Error("store unreadable");
      },
      getStats: async () => ({ totalChunks: 2 }),
    };
    const cache = new CatalogCache();

    const first = await getCatalog(dir, failing, OPTIONS, cache);
    assert.equal(first.reportFailure, true);

    const second = await getCatalog(dir, failing, OPTIONS, cache);
    assert.equal(second.reportFailure, false);
  });
});

test("a catalog built above the ceiling returns reportCeiling true only the first time", async () => {
  await withTempDir(async (dir) => {
    const chunks = [chunkOf("hashA-0"), chunkOf("hashA-1"), chunkOf("hashA-2")];
    const smallOptions = { ...OPTIONS, maxChunks: 2 };
    const cache = new CatalogCache();

    const { source } = sourceOf(chunks);
    const first = await getCatalog(dir, source, smallOptions, cache);
    assert.equal(first.catalog!.hasWordTable, false);
    assert.equal(first.reportCeiling, true);

    const { source: source2 } = sourceOf(chunks);
    const second = await getCatalog(dir, source2, smallOptions, cache);
    assert.equal(second.reportCeiling, false);
  });
});

test("resetCatalogCache lets a later build report a failure again", async () => {
  await withTempDir(async (dir) => {
    const failing = {
      listChunks: async () => {
        throw new Error("store unreadable");
      },
      getStats: async () => ({ totalChunks: 2 }),
    };

    const first = await getCatalog(dir, failing, OPTIONS);
    assert.equal(first.reportFailure, true);

    const second = await getCatalog(dir, failing, OPTIONS);
    assert.equal(second.reportFailure, false);

    resetCatalogCache(dir);

    const third = await getCatalog(dir, failing, OPTIONS);
    assert.equal(third.reportFailure, true);
  });
});
