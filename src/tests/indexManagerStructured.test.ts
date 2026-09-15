import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { type EmbeddingDynamicHandle, type LMStudioClient } from "@lmstudio/sdk";
import { IndexManager } from "../ingestion/indexManager";
import { VectorStore } from "../vectorstore/vectorStore";

const ROUNDUP_TEXT = [
  "Incident Roundup",
  "",
  "Published on 20 September 2026.",
  "",
  "1. 3 Sep 2026: Warehouse fire in Tuas. Two injured.",
  "2. 8 Sep 2026: Bus collision on the PIE.",
].join("\n");

test("IndexManager stores structured chunks with headers and rebuilds legacy chunks on format change", async () => {
  const docsDir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-docs-"));
  const dbDir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-db-"));
  try {
    await fs.writeFile(path.join(docsDir, "incident_roundup.txt"), ROUNDUP_TEXT);
    const store = new VectorStore(dbDir);
    await store.initialize();

    const embedded: string[] = [];
    const embeddingModel = {
      embed: async (text: string) => {
        embedded.push(text);
        return { embedding: [1, 0, 0] };
      },
      countTokens: async (text: string) => text.split(/\s+/).filter(Boolean).length,
    } as unknown as EmbeddingDynamicHandle;

    const base = {
      documentsDir: docsDir,
      vectorStore: store,
      vectorStoreDir: dbDir,
      embeddingModel,
      client: {} as LMStudioClient,
      chunkSize: 200,
      chunkOverlap: 0,
      maxConcurrent: 1,
      enableOCR: false,
      autoReindex: true,
      parseDelayMs: 0,
    };

    await new IndexManager({ ...base, structuredIndexing: false, rebuildExistingFiles: false }).index();
    const legacy = await store.listChunks();
    assert.ok(legacy.length > 0);
    assert.ok(legacy.every((chunk) => chunk.metadata.indexFormat === "legacy"));

    embedded.length = 0;
    await new IndexManager({ ...base, structuredIndexing: true, rebuildExistingFiles: true }).index();
    const structured = await store.listChunks();

    assert.ok(structured.length > 0);
    assert.ok(structured.every((chunk) => chunk.metadata.indexFormat === "structured-v1"), "no legacy chunks remain");

    const first = structured.find((chunk) => chunk.chunkIndex === 0)!;
    assert.match(String(first.metadata.contextHeader), /^\[File: incident_roundup\.txt \| Posted: 2026-09-20/);
    assert.equal(JSON.parse(String(first.metadata.postedDate)).start, "2026-09-20");
    assert.ok(Array.isArray(JSON.parse(String(first.metadata.dates))));
    assert.ok(!first.text.startsWith("[File:"), "stored text excludes the header");
    assert.ok(embedded.some((text) => text.startsWith("[File: incident_roundup.txt")), "embedding input includes the header");
  } finally {
    await fs.rm(docsDir, { recursive: true, force: true });
    await fs.rm(dbDir, { recursive: true, force: true });
  }
});

test("a failed format rebuild does not strand the file's old-format chunks", async () => {
  const docsDir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-docs-"));
  const dbDir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-db-"));
  try {
    await fs.writeFile(path.join(docsDir, "incident_roundup.txt"), ROUNDUP_TEXT);
    const store = new VectorStore(dbDir);
    await store.initialize();

    const workingEmbeddingModel = {
      embed: async (_text: string) => ({ embedding: [1, 0, 0] }),
      countTokens: async (text: string) => text.split(/\s+/).filter(Boolean).length,
    } as unknown as EmbeddingDynamicHandle;

    const base = {
      documentsDir: docsDir,
      vectorStore: store,
      vectorStoreDir: dbDir,
      client: {} as LMStudioClient,
      chunkSize: 200,
      chunkOverlap: 0,
      maxConcurrent: 1,
      enableOCR: false,
      autoReindex: true,
      parseDelayMs: 0,
    };

    await new IndexManager({
      ...base,
      embeddingModel: workingEmbeddingModel,
      structuredIndexing: false,
      rebuildExistingFiles: false,
    }).index();
    const legacy = await store.listChunks();
    assert.ok(legacy.length > 0);
    assert.ok(legacy.every((chunk) => chunk.metadata.indexFormat === "legacy"));

    const failingEmbeddingModel = {
      embed: async (text: string) => {
        if (text.startsWith("[File:")) {
          throw new Error("embedding failed");
        }
        return { embedding: [1, 0, 0] };
      },
      countTokens: async (text: string) => text.split(/\s+/).filter(Boolean).length,
    } as unknown as EmbeddingDynamicHandle;

    await new IndexManager({
      ...base,
      embeddingModel: failingEmbeddingModel,
      structuredIndexing: true,
      rebuildExistingFiles: true,
    }).index();

    const afterFailedRebuild = await store.listChunks();
    assert.ok(
      afterFailedRebuild.every((chunk) => chunk.metadata.indexFormat !== "legacy"),
      "no legacy chunks should survive a failed format rebuild",
    );
    assert.equal(afterFailedRebuild.length, 0, "store should be empty for the file after the failed rebuild");
  } finally {
    await fs.rm(docsDir, { recursive: true, force: true });
    await fs.rm(dbDir, { recursive: true, force: true });
  }
});

test("a failed format rebuild's dropped legacy chunks are not resurrected by a later file", async () => {
  const docsDir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-docs-"));
  const dbDir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-db-"));
  try {
    await fs.writeFile(path.join(docsDir, "a_failing.txt"), ROUNDUP_TEXT);
    await fs.writeFile(path.join(docsDir, "b_working.txt"), ROUNDUP_TEXT.replace("Incident", "Accident"));
    const store = new VectorStore(dbDir);
    await store.initialize();

    const base = {
      documentsDir: docsDir,
      vectorStore: store,
      vectorStoreDir: dbDir,
      client: {} as LMStudioClient,
      chunkSize: 200,
      chunkOverlap: 0,
      maxConcurrent: 1,
      enableOCR: false,
      autoReindex: true,
      parseDelayMs: 0,
    };
    const countTokens = async (text: string) => text.split(/\s+/).filter(Boolean).length;

    await new IndexManager({
      ...base,
      embeddingModel: {
        embed: async (_text: string) => ({ embedding: [1, 0, 0] }),
        countTokens,
      } as unknown as EmbeddingDynamicHandle,
      structuredIndexing: false,
      rebuildExistingFiles: false,
    }).index();
    const legacy = await store.listChunks();
    assert.ok(legacy.some((chunk) => chunk.fileName === "a_failing.txt"));
    assert.ok(legacy.some((chunk) => chunk.fileName === "b_working.txt"));

    const indexedOrder: string[] = [];
    await new IndexManager({
      ...base,
      embeddingModel: {
        embed: async (text: string) => {
          if (text.startsWith("[File: a_failing.txt")) {
            indexedOrder.push("a");
            throw new Error("embedding failed");
          }
          if (text.startsWith("[File: b_working.txt")) {
            indexedOrder.push("b");
          }
          return { embedding: [1, 0, 0] };
        },
        countTokens,
      } as unknown as EmbeddingDynamicHandle,
      structuredIndexing: true,
      rebuildExistingFiles: true,
    }).index();
    assert.equal(indexedOrder[0], "a", "the failing file is processed before the working file");
    assert.ok(indexedOrder.includes("b"));

    const reopened = new VectorStore(dbDir);
    await reopened.initialize();
    const after = await reopened.listChunks();
    assert.ok(after.length > 0);
    assert.ok(
      after.every((chunk) => chunk.metadata.indexFormat === "structured-v1"),
      "no legacy chunks may be resurrected",
    );
    assert.ok(after.every((chunk) => chunk.fileName === "b_working.txt"));
  } finally {
    await fs.rm(docsDir, { recursive: true, force: true });
    await fs.rm(dbDir, { recursive: true, force: true });
  }
});
