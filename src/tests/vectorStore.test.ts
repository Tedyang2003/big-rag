import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { VectorStore } from "../vectorstore/vectorStore";

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
