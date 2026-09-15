import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import {
  REINDEX_MARKER_FILENAME,
  decideReindex,
  handleReindexRequest,
  readReindexMarker,
  reindexAlreadyDoneMessage,
  writeReindexMarker,
} from "../settings/reindexMarker";

const marker = (mode: "changed" | "rebuild") => ({ mode, completedAt: "2026-09-16T08:00:00.000Z" });

async function withTempDir(fn: (dir: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-reindex-"));
  try {
    await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test("decideReindex covers every row of the decision table", () => {
  assert.equal(decideReindex("off", null), "none");
  assert.equal(decideReindex("off", marker("changed")), "clear");
  assert.equal(decideReindex("changed", null), "run");
  assert.equal(decideReindex("rebuild", null), "run");
  assert.equal(decideReindex("changed", marker("changed")), "skip");
  assert.equal(decideReindex("rebuild", marker("rebuild")), "skip");
  assert.equal(decideReindex("rebuild", marker("changed")), "run");
  assert.equal(decideReindex("changed", marker("rebuild")), "run");
});

test("marker round-trips and malformed files read as no marker", async () => {
  await withTempDir(async (dir) => {
    assert.equal(await readReindexMarker(dir), null);
    await writeReindexMarker(dir, marker("rebuild"));
    assert.deepEqual(await readReindexMarker(dir), marker("rebuild"));

    await fs.writeFile(path.join(dir, REINDEX_MARKER_FILENAME), "{not json");
    assert.equal(await readReindexMarker(dir), null);

    await fs.writeFile(path.join(dir, REINDEX_MARKER_FILENAME), JSON.stringify({ mode: "sometimes", completedAt: 5 }));
    assert.equal(await readReindexMarker(dir), null);
  });
});

test("handleReindexRequest runs once, writes the marker, then skips", async () => {
  await withTempDir(async (dir) => {
    let runs = 0;
    const run = async () => {
      runs++;
      return true;
    };
    const now = () => new Date("2026-09-16T08:00:00.000Z");

    const first = await handleReindexRequest({ vectorStoreDir: dir, mode: "changed", run, now });
    assert.equal(first.decision, "run");
    assert.deepEqual(await readReindexMarker(dir), marker("changed"));

    const second = await handleReindexRequest({ vectorStoreDir: dir, mode: "changed", run, now });
    assert.equal(second.decision, "skip");
    assert.deepEqual(second.marker, marker("changed"));
    assert.equal(runs, 1);
  });
});

test("handleReindexRequest clears the marker when Reindex is Off, so the next request runs again", async () => {
  await withTempDir(async (dir) => {
    await writeReindexMarker(dir, marker("changed"));
    const cleared = await handleReindexRequest({ vectorStoreDir: dir, mode: "off", run: async () => true });
    assert.equal(cleared.decision, "clear");
    assert.equal(await readReindexMarker(dir), null);

    let runs = 0;
    await handleReindexRequest({ vectorStoreDir: dir, mode: "changed", run: async () => ++runs > 0 });
    assert.equal(runs, 1);
  });
});

test("handleReindexRequest writes no marker when the run does not complete", async () => {
  await withTempDir(async (dir) => {
    const incomplete = await handleReindexRequest({ vectorStoreDir: dir, mode: "rebuild", run: async () => false });
    assert.equal(incomplete.decision, "run");
    assert.equal(await readReindexMarker(dir), null);

    await assert.rejects(
      handleReindexRequest({
        vectorStoreDir: dir,
        mode: "rebuild",
        run: async () => {
          throw new Error("boom");
        },
      }),
      /boom/,
    );
    assert.equal(await readReindexMarker(dir), null);
  });
});

test("reindexAlreadyDoneMessage explains how to run another reindex", () => {
  assert.match(
    reindexAlreadyDoneMessage(marker("changed")),
    /^Reindex already done at .+ — set Reindex to Off, then choose it again to run another\.$/,
  );
});
