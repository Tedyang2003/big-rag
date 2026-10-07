import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { buildSettingsSnapshot } from "../eval/settingsSnapshot";
import { writeEmbeddingIndexManifest } from "../utils/embeddingIndexManifest";

const questionSet = {
  version: 1 as const,
  generatedAt: "2026-09-15T00:00:00.000Z",
  generator: { model: "llm", seed: 42, leakLimit: 0.7 },
  questions: [{ id: "q1", question: "q?", sourceFile: "a.md", answerSnippet: "a" }],
};

function args(vectorStoreDir: string) {
  return {
    settings: { retrievalLimit: 5, retrievalThreshold: 0.5, chunkSize: 512, enableContextCompaction: false, retrievalDepth: "medium" as const, laneWeights: { vector: 1, hyde: 1, keyword: 0, date: 1 }, laneCandidates: 50, neighbourChunks: 1, rerankDepth: 10, bm25K1: 1.2, bm25B: 0 },
    diagnosticPoolSize: 50,
    embeddingModelId: "embed-model",
    vectorStoreDir,
    totalChunks: 7,
    questionsFile: "/eval/questions.json",
    questionSet,
  };
}

test("the eval settings snapshot records the manifest's index format", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-snapshot-"));
  try {
    await writeEmbeddingIndexManifest(dir, {
      embeddingModelId: "embed-model",
      dimensions: 3,
      indexFormat: "structured-v1",
      embeddingPrefixes: "none",
    });
    const snapshot = await buildSettingsSnapshot(args(dir));
    assert.equal(snapshot.indexFormat, "structured-v1");
    assert.equal(snapshot.retrievalLimit, 5);
    assert.equal(snapshot.retrievalDepth, "medium");
    assert.equal(snapshot.diagnosticPoolSize, 50);
    assert.equal(snapshot.embeddingModelId, "embed-model");
    assert.deepEqual(snapshot.indexManifest, {
      embeddingModelId: "embed-model",
      dimensions: 3,
      indexFormat: "structured-v1",
      embeddingPrefixes: "none",
    });
    assert.equal(snapshot.totalChunks, 7);
    assert.equal(snapshot.questionsFile, "/eval/questions.json");
    assert.equal(snapshot.questionCount, 1);
    assert.deepEqual(snapshot.questionGenerator, questionSet.generator);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("the eval settings snapshot reports legacy when there is no manifest", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-snapshot-"));
  try {
    const snapshot = await buildSettingsSnapshot(args(dir));
    assert.equal(snapshot.indexFormat, "legacy");
    assert.equal(snapshot.indexManifest, null);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("the snapshot records the weights a depth actually applies, not those configured", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "big-rag-snapshot-"));
  try {
    const configured = { vector: 1, hyde: 1, keyword: 1, date: 1 };
    const of = async (retrievalDepth: "low" | "medium" | "high") => {
      const base = args(dir);
      return buildSettingsSnapshot({
        ...base,
        settings: { ...base.settings, retrievalDepth, laneWeights: configured, neighbourChunks: 1 },
      });
    };

    // Low fuses nothing, so every signal below the vector search is inert, expansion included.
    const low = await of("low");
    assert.deepEqual(low.laneWeights, { vector: 1, hyde: 0, keyword: 0, date: 0 });
    assert.equal(low.neighbourChunks, 0);

    // Medium never drafts, whatever the hyde weight says.
    const medium = await of("medium");
    assert.deepEqual(medium.laneWeights, { vector: 1, hyde: 0, keyword: 1, date: 1 });
    assert.equal(medium.neighbourChunks, 1);

    const high = await of("high");
    assert.deepEqual(high.laneWeights, configured);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
