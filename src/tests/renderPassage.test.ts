import { test } from "node:test";
import * as assert from "node:assert/strict";
import { renderPassageForPrompt } from "../retrieval/renderPassage";
import { type SearchResult } from "../vectorstore/vectorStore";

function result(metadata: Record<string, unknown>): SearchResult {
  return {
    text: "Water levels rose overnight.",
    score: 0.9,
    filePath: "/docs/a.md",
    fileName: "a.md",
    chunkIndex: 0,
    shardName: "shard_000",
    metadata,
  };
}

test("renderPassageForPrompt puts the context header before the passage", () => {
  assert.equal(
    renderPassageForPrompt(result({ contextHeader: "[File: a.md | Posted: 2026-09-11]" })),
    "[File: a.md | Posted: 2026-09-11]\nWater levels rose overnight.",
  );
});

test("renderPassageForPrompt leaves legacy passages unchanged", () => {
  assert.equal(renderPassageForPrompt(result({ indexFormat: "legacy" })), "Water levels rose overnight.");
  assert.equal(renderPassageForPrompt(result({ contextHeader: "" })), "Water levels rose overnight.");
});
