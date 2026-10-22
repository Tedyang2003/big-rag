import { test } from "node:test";
import * as assert from "node:assert/strict";
import { DEFAULT_EMBEDDING_MODEL_ID, DEFAULT_PROMPT_TEMPLATE } from "../config";
import { FIXED_DEFAULTS } from "../settings/defaults";
import { ADVANCED_RETRIEVAL_FIELDS, SHOW_ADVANCED_KEY } from "../settings/advancedRetrieval";
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

test("a global value is honoured for retrieval and ignored for the index's shape", () => {
  // retrievalLimit is offered globally and takes effect. chunkSize is not offered, because
  // changing it makes the stored vectors incomparable - so a value left behind under that key,
  // by an older build or by hand, must not quietly re-chunk anything.
  const settings = resolveSettings(
    reader({ documentsDirectory: "/d", vectorStoreDirectory: "/v", [SHOW_ADVANCED_KEY]: true, retrievalLimit: 12, chunkSize: 2048 }),
    reader({}),
  );
  assert.equal(settings.retrievalLimit, 12);
  assert.equal(settings.chunkSize, FIXED_DEFAULTS.chunkSize);
});

test("a per-chat value does not configure an advanced retrieval setting", () => {
  // The advanced fields live on the global page, so only the global config is consulted.
  // Reading both would leave it ambiguous which value is in force.
  const settings = resolveSettings(
    reader({ documentsDirectory: "/d", vectorStoreDirectory: "/v" }),
    reader({ rerankDepth: 25 }),
  );
  assert.equal(settings.rerankDepth, FIXED_DEFAULTS.rerankDepth);
});

test("resolveSettings reads the retrieval depth from the chat config", () => {
  const base = { documentsDirectory: "/d", vectorStoreDirectory: "/v" };
  assert.equal(resolveSettings(reader(base), reader({ retrievalDepth: "low" })).retrievalDepth, "low");
  assert.equal(resolveSettings(reader(base), reader({ retrievalDepth: "medium" })).retrievalDepth, "medium");
  // High is offered in the settings UI and is the only depth that drafts a hypothetical answer.
  assert.equal(resolveSettings(reader(base), reader({ retrievalDepth: "high" })).retrievalDepth, "high");
  assert.equal(resolveSettings(reader(base), reader({})).retrievalDepth, "medium");
  assert.equal(resolveSettings(reader(base), reader({ retrievalDepth: "deep" })).retrievalDepth, "medium");
});

test("resolveSettings exposes the hybrid retrieval defaults", () => {
  const settings = resolveSettings(reader({ documentsDirectory: "/d", vectorStoreDirectory: "/v" }), reader({}));
  assert.equal(settings.laneCandidates, 50);
  assert.equal(settings.rrfConstant, 60);
  assert.equal(settings.neighbourChunks, 1);
  assert.equal(settings.laneWeightVector, 1);
  assert.equal(settings.laneWeightHyde, 1);
  assert.equal(settings.laneWeightKeyword, 1);
  assert.equal(settings.rerankDepth, 10);
  assert.equal(settings.bm25B, 0);
  assert.equal(settings.laneWeightDate, 1);
  assert.equal(settings.catalogVersion, 4);
  assert.equal(settings.hypotheticalTimeoutMs, 10_000);
  assert.equal(settings.ragContextShare, 0.6);
  assert.equal(settings.passageRelevanceCut, 0);
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

const GLOBALS = { documentsDirectory: "/d", vectorStoreDirectory: "/v" };

test("an advanced retrieval setting overrides its fixed default", () => {
  // FIXED_DEFAULTS is spread into the result, so a configured value has to be applied after it
  // or the spread silently wins and the setting does nothing.
  const settings = resolveSettings(
    reader({ ...GLOBALS, [SHOW_ADVANCED_KEY]: true, rerankDepth: 25, passageRelevanceCut: 0.9, bm25B: 0.75, laneWeightKeyword: 2 }),
    reader({}),
  );
  assert.equal(settings.rerankDepth, 25);
  assert.equal(settings.passageRelevanceCut, 0.9);
  assert.equal(settings.bm25B, 0.75);
  assert.equal(settings.laneWeightKeyword, 2);
});

test("an unset advanced setting keeps its fixed default", () => {
  const settings = resolveSettings(reader(GLOBALS), reader({}));
  for (const field of ADVANCED_RETRIEVAL_FIELDS) {
    assert.equal(settings[field.key], FIXED_DEFAULTS[field.key], field.key);
  }
});

test("a value that is unusable falls back to the default instead of throwing", () => {
  // A chat config can carry anything - a value saved by an older build, or one hand-edited.
  // Breaking the chat over it would be worse than ignoring it, so these clamp rather than throw.
  const cases: Array<[string, unknown]> = [
    ["not a number", "banana"],
    ["null", null],
    ["NaN", Number.NaN],
    ["below the minimum", -5],
    ["above the maximum", 10_000],
  ];
  for (const [name, value] of cases) {
    const settings = resolveSettings(reader({ ...GLOBALS, [SHOW_ADVANCED_KEY]: true, rerankDepth: value }), reader({}));
    assert.equal(settings.rerankDepth, FIXED_DEFAULTS.rerankDepth, name);
  }
});

test("the exposed fields are the fourteen retrieval settings, and nothing that reshapes the index", () => {
  // One table drives both the settings UI and resolveSettings, so the two cannot drift apart.
  // Index-shaping settings are deliberately absent: changing chunkSize or structuredIndexing
  // makes existing vectors incomparable, and catalogVersion is a format version, not a knob.
  const keys = ADVANCED_RETRIEVAL_FIELDS.map((field) => field.key);
  assert.equal(keys.length, 15);
  for (const excluded of [
    "chunkSize", "chunkOverlap", "structuredIndexing", "enableOCR",
    "maxConcurrentFiles", "parseDelayMs", "catalogVersion",
  ]) {
    assert.ok(!keys.includes(excluded as never), `${excluded} must not be user-settable`);
  }
});

test("every field's shipped default sits inside the bounds it advertises", () => {
  // A bound that excludes its own default would clamp the value we ship on every read.
  for (const field of ADVANCED_RETRIEVAL_FIELDS) {
    const value = FIXED_DEFAULTS[field.key];
    assert.ok(value >= field.min, `${field.key}: default ${value} below min ${field.min}`);
    assert.ok(value <= field.max, `${field.key}: default ${value} above max ${field.max}`);
    if (field.int) assert.ok(Number.isInteger(value), `${field.key} is declared int`);
  }
});

test("with the toggle off, a stored advanced value is ignored", () => {
  // The toggle is the way back to shipped behaviour. Hiding the fields while still applying them
  // would leave a tidy panel running a value nobody can see - the worst case for a setting whose
  // effect is already hard to attribute.
  const configured = { rerankDepth: 25, passageRelevanceCut: 0.9, laneWeightKeyword: 3 };
  const off = resolveSettings(reader({ ...GLOBALS, ...configured }), reader({}));
  assert.equal(off.rerankDepth, FIXED_DEFAULTS.rerankDepth);
  assert.equal(off.passageRelevanceCut, FIXED_DEFAULTS.passageRelevanceCut);
  assert.equal(off.laneWeightKeyword, FIXED_DEFAULTS.laneWeightKeyword);

  const on = resolveSettings(
    reader({ ...GLOBALS, ...configured, [SHOW_ADVANCED_KEY]: true }),
    reader({}),
  );
  assert.equal(on.rerankDepth, 25);
  assert.equal(on.passageRelevanceCut, 0.9);
  assert.equal(on.laneWeightKeyword, 3);
});
