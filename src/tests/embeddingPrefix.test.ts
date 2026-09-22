import { test } from "node:test";
import * as assert from "node:assert/strict";
import { documentText, prefixConventionFor, queryText } from "../utils/embeddingPrefix";

test("Nomic models get the prefixes they were trained with", () => {
  const model = "nomic-ai/nomic-embed-text-v1.5-GGUF";
  assert.equal(prefixConventionFor(model), "nomic");
  assert.equal(documentText(model, "Capital expenditures"), "search_document: Capital expenditures");
  assert.equal(queryText(model, "what were capital expenditures"), "search_query: what were capital expenditures");
});

test("other models are embedded unprefixed", () => {
  const model = "sentence-transformers/all-MiniLM-L6-v2";
  assert.equal(prefixConventionFor(model), "none");
  assert.equal(documentText(model, "Capital expenditures"), "Capital expenditures");
  assert.equal(queryText(model, "what were capital expenditures"), "what were capital expenditures");
});

test("the convention is recognised whatever the publisher or quantisation", () => {
  for (const model of ["nomic-embed-text-v1.5", "NOMIC-EMBED-TEXT-V1", "lmstudio/nomic-embed-text-v1.5-Q4_K_M"]) {
    assert.equal(prefixConventionFor(model), "nomic", model);
  }
});
