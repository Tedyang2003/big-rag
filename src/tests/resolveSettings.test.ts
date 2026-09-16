import { test } from "node:test";
import * as assert from "node:assert/strict";
import { DEFAULT_EMBEDDING_MODEL_ID, DEFAULT_PROMPT_TEMPLATE } from "../config";
import { FIXED_DEFAULTS } from "../settings/defaults";
import { notConfiguredMessage, resolveSettings, type ConfigReader } from "../settings/resolveSettings";

const reader = (values: Record<string, unknown>): ConfigReader => ({ get: (key) => values[key] });

test("resolveSettings uses global values and the chat reindex mode", () => {
  const settings = resolveSettings(
    reader({
      documentsDirectory: " /docs ",
      vectorStoreDirectory: "/db",
      embeddingModel: "my-embedder",
      excludeFilenamePatterns: "*.png\n# comment\narchive/**",
      promptTemplate: "{{rag_context}}\n{{user_query}}",
    }),
    reader({ reindexMode: "changed" }),
  );

  assert.deepEqual(settings, {
    documentsDirectory: "/docs",
    vectorStoreDirectory: "/db",
    embeddingModelId: "my-embedder",
    excludePatterns: ["*.png", "archive/**"],
    promptTemplate: "{{rag_context}}\n{{user_query}}",
    reindexMode: "changed",
    retrievalDepth: "medium",
    ...FIXED_DEFAULTS,
    missingRequired: [],
  });
});

test("resolveSettings reports missing directories and falls back for optional fields", () => {
  const settings = resolveSettings(
    reader({ documentsDirectory: "   ", embeddingModel: "", promptTemplate: "  " }),
    reader({}),
  );

  assert.equal(settings.documentsDirectory, "");
  assert.equal(settings.vectorStoreDirectory, "");
  assert.deepEqual(settings.missingRequired, ["Documents Directory", "Vector Store Directory"]);
  assert.equal(settings.embeddingModelId, DEFAULT_EMBEDDING_MODEL_ID);
  assert.equal(settings.promptTemplate, DEFAULT_PROMPT_TEMPLATE);
  assert.deepEqual(settings.excludePatterns, []);
  assert.equal(settings.reindexMode, "off");
});

test("resolveSettings treats unknown reindex values as off", () => {
  const settings = resolveSettings(reader({ documentsDirectory: "/d", vectorStoreDirectory: "/v" }), reader({ reindexMode: "sometimes" }));
  assert.equal(settings.reindexMode, "off");
});

test("resolveSettings ignores old per-chat tuning values", () => {
  const settings = resolveSettings(
    reader({ documentsDirectory: "/d", vectorStoreDirectory: "/v", retrievalLimit: 12, chunkSize: 2048 }),
    reader({ retrievalLimit: 12, enableContextCompaction: true }),
  );
  assert.equal(settings.retrievalLimit, FIXED_DEFAULTS.retrievalLimit);
  assert.equal(settings.chunkSize, FIXED_DEFAULTS.chunkSize);
  assert.equal(settings.enableContextCompaction, false);
});

test("resolveSettings reads the retrieval depth from the chat config", () => {
  const base = { documentsDirectory: "/d", vectorStoreDirectory: "/v" };
  assert.equal(resolveSettings(reader(base), reader({ retrievalDepth: "low" })).retrievalDepth, "low");
  assert.equal(resolveSettings(reader(base), reader({ retrievalDepth: "medium" })).retrievalDepth, "medium");
  assert.equal(resolveSettings(reader(base), reader({})).retrievalDepth, "medium");
  assert.equal(resolveSettings(reader(base), reader({ retrievalDepth: "deep" })).retrievalDepth, "medium");
});

test("resolveSettings exposes the hybrid retrieval defaults", () => {
  const settings = resolveSettings(reader({ documentsDirectory: "/d", vectorStoreDirectory: "/v" }), reader({}));
  assert.equal(settings.laneCandidates, 30);
  assert.equal(settings.rrfConstant, 60);
  assert.equal(settings.laneWeightVector, 1);
  assert.equal(settings.laneWeightKeyword, 1);
  assert.equal(settings.laneWeightDate, 1);
  assert.equal(settings.catalogMaxChunks, 50000);
  assert.equal(settings.bm25K1, 1.2);
  assert.equal(settings.bm25B, 0.75);
  assert.equal(settings.catalogVersion, 1);
});

test("notConfiguredMessage names exactly the missing settings", () => {
  assert.equal(
    notConfiguredMessage(["Documents Directory"]),
    "Big RAG is not in use: set Documents Directory in Big RAG's global settings.",
  );
  assert.equal(
    notConfiguredMessage(["Documents Directory", "Vector Store Directory"]),
    "Big RAG is not in use: set Documents Directory and Vector Store Directory in Big RAG's global settings.",
  );
});
