import { test } from "node:test";
import * as assert from "node:assert/strict";
import { fuseLanes } from "../retrieval/fuse";

const lane = (name: string, keys: string[], weight = 1) => ({ name, weight, keys });

test("fuseLanes scores by rank and reports contributing lanes", () => {
  const fused = fuseLanes(
    [lane("vector", ["a", "b"]), lane("keyword", ["b"])],
    60,
  );
  assert.deepEqual(fused.map((entry) => entry.key), ["b", "a"]);
  assert.ok(Math.abs(fused[0].score - (1 / 62 + 1 / 61)) < 1e-9);
  assert.ok(Math.abs(fused[1].score - 1 / 61) < 1e-9);
  assert.deepEqual(fused[0].lanes, ["vector", "keyword"]);
  assert.deepEqual(fused[1].lanes, ["vector"]);
});

test("a chunk in every lane beats a chunk ranked first in one", () => {
  const fused = fuseLanes(
    [lane("vector", ["top", "shared"]), lane("keyword", ["shared"]), lane("date", ["shared"])],
    60,
  );
  assert.equal(fused[0].key, "shared");
});

test("lane weight scales that lane's contribution", () => {
  const single = fuseLanes([lane("vector", ["a"])], 60)[0].score;
  const doubled = fuseLanes([lane("vector", ["a"], 2)], 60)[0].score;
  assert.ok(Math.abs(doubled - single * 2) < 1e-9);

  const weighted = fuseLanes([lane("vector", ["a"], 2), lane("keyword", ["b"], 1)], 60);
  assert.equal(weighted[0].key, "a");
});

test("a zero-weight lane contributes nothing but still records the lane", () => {
  const fused = fuseLanes([lane("vector", ["a"]), lane("keyword", ["a"], 0)], 60);
  assert.ok(Math.abs(fused[0].score - 1 / 61) < 1e-9);
  assert.deepEqual(fused[0].lanes, ["vector", "keyword"]);
});

test("ties keep the order the lanes listed them in", () => {
  const fused = fuseLanes([lane("vector", ["a", "b"]), lane("keyword", ["b", "a"])], 60);
  assert.deepEqual(fused.map((entry) => entry.key), ["a", "b"]);
});

test("fuseLanes handles empty input", () => {
  assert.deepEqual(fuseLanes([], 60), []);
  assert.deepEqual(fuseLanes([lane("vector", [])], 60), []);
});
