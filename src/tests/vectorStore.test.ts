import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { VectorStore, chunkKey } from "../vectorstore/vectorStore";

test("listChunks returns every indexed chunk with its text and file", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-vs-"));
  try {
    const store = new VectorStore(dir);
    await store.initialize();
    await store.addChunks([
      {
        id: "h1-0",
        text: "First chunk text",
        vector: [1, 0, 0],
        filePath: "/docs/a.md",
        fileName: "a.md",
        fileHash: "h1",
        chunkIndex: 0,
        metadata: { startIndex: 0, endIndex: 3 },
      },
      {
        id: "h2-1",
        text: "Second chunk text",
        vector: [0, 1, 0],
        filePath: "/docs/b.md",
        fileName: "b.md",
        fileHash: "h2",
        chunkIndex: 1,
        metadata: { startIndex: 3, endIndex: 6 },
      },
    ]);

    const chunks = (await store.listChunks()).sort((a, b) => a.chunkIndex - b.chunkIndex);

    assert.equal(chunks.length, 2);
    assert.equal(chunks[0].text, "First chunk text");
    assert.equal(chunks[0].filePath, "/docs/a.md");
    assert.equal(chunks[0].fileName, "a.md");
    assert.equal(chunks[0].metadata.startIndex, 0);
    assert.equal(chunks[1].text, "Second chunk text");
    assert.equal(chunks[1].chunkIndex, 1);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("listChunks returns an empty array for an empty store", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-vs-"));
  try {
    const store = new VectorStore(dir);
    await store.initialize();
    assert.deepEqual(await store.listChunks(), []);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

function chunkFor(fileHash: string, index: number) {
  return {
    id: `${fileHash}-${index}`,
    text: `Chunk ${index} of ${fileHash}`,
    vector: [1, 0, 0],
    filePath: `/docs/${fileHash}.md`,
    fileName: `${fileHash}.md`,
    fileHash,
    chunkIndex: index,
    metadata: {},
  };
}

test("deleted chunks stay deleted after another file is added", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-vs-"));
  try {
    const store = new VectorStore(dir);
    await store.initialize();
    await store.addChunks([chunkFor("A", 0), chunkFor("A", 1), chunkFor("A", 2)]);
    await store.deleteByFileHash("A");
    await store.addChunks([chunkFor("C", 0)]);

    const reopened = new VectorStore(dir);
    await reopened.initialize();
    const ids = (await reopened.listChunks()).map((chunk) => `${chunk.metadata.fileHash}-${chunk.chunkIndex}`);
    assert.deepEqual(ids, ["C-0"]);
    assert.deepEqual(await reopened.getStats(), { totalChunks: 1, uniqueFiles: 1 });
    assert.deepEqual(await store.getStats(), { totalChunks: 1, uniqueFiles: 1 });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("releaseShardCache drops every shard but the active one", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-vs-"));
  try {
    // Tiny shard limit forces rotation across several shards without inserting thousands of chunks.
    const store = new VectorStore(dir, 1);
    await store.initialize();
    await store.addChunks([chunkFor("A", 0)]);
    await store.addChunks([chunkFor("B", 0)]);
    await store.addChunks([chunkFor("C", 0)]);

    // deleteByFileHash scans every shard, caching each one it touches.
    await store.deleteByFileHash("A");
    assert.ok(store.cachedShardCount > 1, "expected deletion to cache multiple shards");

    await store.releaseShardCache();
    assert.equal(store.cachedShardCount, 1, "only the active shard should remain cached");

    // Releasing must not lose or corrupt data: further deletes/adds and a fresh reopen still
    // agree, and no previously-deleted item resurfaces.
    await store.deleteByFileHash("B");
    await store.addChunks([chunkFor("D", 0)]);

    const reopened = new VectorStore(dir, 1);
    await reopened.initialize();
    const ids = (await reopened.listChunks())
      .map((chunk) => `${chunk.metadata.fileHash}-${chunk.chunkIndex}`)
      .sort();
    assert.deepEqual(ids, ["C-0", "D-0"]);

    const results = await store.search([1, 0, 0], 10, 0);
    const resultHashes = results.map((r) => r.metadata.fileHash).sort();
    assert.deepEqual(resultHashes, ["C", "D"]);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("repeated deletions reuse parsed shards instead of re-reading index.json", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-vs-"));
  const fsModule = require("fs/promises") as { readFile: (...args: any[]) => Promise<any> };
  const realReadFile = fsModule.readFile;
  try {
    const seed = new VectorStore(dir);
    await seed.initialize();
    await seed.addChunks([chunkFor("A", 0), chunkFor("B", 0), chunkFor("C", 0), chunkFor("D", 0)]);

    const store = new VectorStore(dir);
    await store.initialize();
    await store.listChunks();

    let indexReads = 0;
    fsModule.readFile = (async (...args: any[]) => {
      if (String(args[0]).endsWith("index.json")) indexReads++;
      return realReadFile(...args);
    }) as typeof fsModule.readFile;

    await store.deleteByFileHash("A");
    await store.deleteByFileHash("B");
    await store.deleteByFileHash("C");
    assert.equal(indexReads, 0, "deletions should not re-parse shards from disk");
  } finally {
    fsModule.readFile = realReadFile;
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("chunks expose their item id and can be fetched by key", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-keys-"));
  try {
    const store = new VectorStore(dir);
    await store.initialize();
    await store.addChunks([
      {
        id: "hashA-0",
        text: "first chunk",
        vector: [1, 0, 0],
        filePath: "/docs/a.md",
        fileName: "a.md",
        fileHash: "hashA",
        chunkIndex: 0,
        metadata: {},
      },
      {
        id: "hashA-1",
        text: "second chunk",
        vector: [0, 1, 0],
        filePath: "/docs/a.md",
        fileName: "a.md",
        fileHash: "hashA",
        chunkIndex: 1,
        metadata: {},
      },
    ]);

    const listed = await store.listChunks();
    assert.deepEqual(
      listed.map((chunk) => chunkKey(chunk)).sort(),
      ["shard_000/hashA-0", "shard_000/hashA-1"],
    );

    const searched = await store.search([1, 0, 0], 1, 0);
    assert.equal(searched[0].id, "hashA-0");

    const fetched = await store.getChunksByKeys(["shard_000/hashA-1", "shard_000/missing", "shard_000/hashA-0"]);
    assert.deepEqual(fetched.map((chunk) => chunk.text), ["second chunk", "first chunk"]);
    assert.equal(fetched[0].chunkIndex, 1);
    assert.equal(fetched[0].score, 0);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("searchMany returns one result list per query vector, ranked independently", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-many-"));
  try {
    const store = new VectorStore(dir);
    await store.initialize();
    await store.addChunks([
      { id: "x-0", text: "points at x", vector: [1, 0, 0], filePath: "/docs/x.md", fileName: "x.md", fileHash: "x", chunkIndex: 0, metadata: {} },
      { id: "y-0", text: "points at y", vector: [0, 1, 0], filePath: "/docs/y.md", fileName: "y.md", fileHash: "y", chunkIndex: 0, metadata: {} },
    ]);

    const [towardsX, towardsY] = await store.searchMany([[1, 0, 0], [0, 1, 0]], 10, 0);

    assert.equal(towardsX[0].text, "points at x");
    assert.equal(towardsY[0].text, "points at y");
    // One vector matches what search() gave before, since search now delegates here.
    assert.deepEqual(
      (await store.searchMany([[1, 0, 0]], 10, 0))[0].map((r) => r.id),
      (await store.search([1, 0, 0], 10, 0)).map((r) => r.id),
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("searchMany applies the limit and threshold to each vector's own results", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-many-"));
  try {
    const store = new VectorStore(dir);
    await store.initialize();
    await store.addChunks([
      { id: "x-0", text: "x", vector: [1, 0, 0], filePath: "/docs/x.md", fileName: "x.md", fileHash: "x", chunkIndex: 0, metadata: {} },
      { id: "y-0", text: "y", vector: [0, 1, 0], filePath: "/docs/y.md", fileName: "y.md", fileHash: "y", chunkIndex: 0, metadata: {} },
    ]);

    // Only the vector pointing at x clears a high threshold; the other list comes back empty
    // rather than borrowing x's results.
    const [towardsX, towardsY] = await store.searchMany([[1, 0, 0], [0, 0, 1]], 10, 0.9);
    assert.equal(towardsX.length, 1);
    assert.equal(towardsY.length, 0);

    const [limited] = await store.searchMany([[1, 0, 0]], 1, 0);
    assert.equal(limited.length, 1);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("searchMany parses each shard once however many vectors it is given", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-many-"));
  const fsModule = require("fs/promises") as { readFile: (...args: any[]) => Promise<any> };
  const realReadFile = fsModule.readFile;
  try {
    const seed = new VectorStore(dir, 1);
    await seed.initialize();
    await seed.addChunks([chunkFor("A", 0)]);
    await seed.addChunks([chunkFor("B", 0)]);

    // A fresh store so nothing is cached from indexing; reads are counted per search.
    const store = new VectorStore(dir, 1);
    await store.initialize();

    let reads = 0;
    fsModule.readFile = (async (...args: any[]) => {
      if (String(args[0]).endsWith("index.json")) reads++;
      return realReadFile(...args);
    }) as typeof fsModule.readFile;

    await store.searchMany([[1, 0, 0]], 5, 0);
    const forOneVector = reads;

    reads = 0;
    await store.searchMany([[1, 0, 0], [0, 1, 0], [0, 0, 1]], 5, 0);
    assert.equal(reads, forOneVector, "three vectors should cost the same parsing as one");
  } finally {
    fsModule.readFile = realReadFile;
    await fs.rm(dir, { recursive: true, force: true });
  }
});
