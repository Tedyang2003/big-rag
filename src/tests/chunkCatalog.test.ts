import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { CATALOG_FILENAME, ChunkCatalog } from "../retrieval/chunkCatalog";
import { type IndexedChunk } from "../vectorstore/vectorStore";

const OPTIONS = { version: 1 };

function chunk(id: string, text: string, dates: string[], posted = "2026-09-08"): IndexedChunk {
  return {
    id,
    shardName: "shard_000",
    text,
    filePath: "/docs/incidents.md",
    fileName: "incidents.md",
    chunkIndex: Number(id.split("-")[1]),
    metadata: {
      postedDate: JSON.stringify({ start: posted, end: posted }),
      dates: JSON.stringify(dates.map((d) => ({ start: d, end: d }))),
    },
  };
}

const CHUNKS = [
  chunk("hashA-0", "Bus collision on the PIE. Two injured.", ["2026-09-08"]),
  chunk("hashA-1", "Flooding at Bukit Timah after heavy rain.", ["2026-09-11"], "2026-09-11"),
  chunk("hashB-0", "Bus timetable changes for the new term.", ["2025-09-08"], "2025-09-08"),
];

async function withTempDir(fn: (dir: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-catalog-"));
  try {
    await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test("build indexes keys and days", () => {
  const catalog = ChunkCatalog.build(CHUNKS, OPTIONS);
  assert.equal(catalog.chunkCount, 3);
  assert.equal(catalog.keyOf(0), "shard_000/hashA-0");
  assert.deepEqual(catalog.chunksForRanges([{ start: 20260908, end: 20260908 }]), [0]);
  assert.deepEqual(catalog.chunksForRanges([{ start: 20260908, end: 20260911 }]), [0, 1]);
  assert.deepEqual(catalog.yearsPresent(), [2026, 2025]);
});

test("save and load round trip", async () => {
  await withTempDir(async (dir) => {
    const built = ChunkCatalog.build(CHUNKS, OPTIONS);
    await built.save(dir);
    const loaded = await ChunkCatalog.load(dir, OPTIONS);
    assert.ok(loaded);
    assert.equal(loaded!.chunkCount, 3);
    assert.equal(loaded!.keyOf(2), "shard_000/hashB-0");
    assert.deepEqual(loaded!.chunksForRanges([{ start: 20250908, end: 20250908 }]), [2]);
    assert.deepEqual(loaded!.yearsPresent(), built.yearsPresent());
  });
});

test("load returns null for a missing, corrupt, or wrong-version file", async () => {
  await withTempDir(async (dir) => {
    assert.equal(await ChunkCatalog.load(dir, OPTIONS), null);

    await fs.writeFile(path.join(dir, CATALOG_FILENAME), "{not json");
    assert.equal(await ChunkCatalog.load(dir, OPTIONS), null);

    const built = ChunkCatalog.build(CHUNKS, OPTIONS);
    await built.save(dir);
    assert.equal(await ChunkCatalog.load(dir, { ...OPTIONS, version: 2 }), null);
  });
});

test("isStaleFor compares against the store's chunk count", () => {
  const catalog = ChunkCatalog.build(CHUNKS, OPTIONS);
  assert.equal(catalog.isStaleFor(3), false);
  assert.equal(catalog.isStaleFor(4), true);
});

test("chunks with no dates are indexed but match no range", () => {
  const undated: IndexedChunk = {
    id: "hashC-0",
    shardName: "shard_000",
    text: "Undated note about buses.",
    filePath: "/docs/note.md",
    fileName: "note.md",
    chunkIndex: 0,
    metadata: {},
  };
  const catalog = ChunkCatalog.build([...CHUNKS, undated], OPTIONS);
  assert.equal(catalog.chunkCount, 4);
  assert.deepEqual(catalog.chunksForRanges([{ start: 19000101, end: 21001231 }]), [0, 1, 2]);
  assert.equal(catalog.keyOf(3), "shard_000/hashC-0");
});
