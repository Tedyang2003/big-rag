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
