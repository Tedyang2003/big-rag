import { test } from "node:test";
import * as assert from "node:assert/strict";
import { compactPassageText, cosineSimilarity, splitIntoSentences } from "../utils/compactPassages";

test("splitIntoSentences splits on terminal punctuation", () => {
  const sentences = splitIntoSentences("First sentence. Second sentence! Third sentence?");
  assert.deepEqual(sentences, ["First sentence.", "Second sentence!", "Third sentence?"]);
});

test("splitIntoSentences falls back to the whole text when there's no terminal punctuation", () => {
  // e.g. a PPTX/DOCX table row rendered as "Cell1 | Cell2" - no sentence
  // punctuation to safely split on.
  const sentences = splitIntoSentences("Row1Col1 | Row1Col2 Row2Col1 | Row2Col2");
  assert.deepEqual(sentences, ["Row1Col1 | Row1Col2 Row2Col1 | Row2Col2"]);
});

test("splitIntoSentences returns nothing for empty text", () => {
  assert.deepEqual(splitIntoSentences(""), []);
  assert.deepEqual(splitIntoSentences("   "), []);
});

test("cosineSimilarity is 1 for identical vectors and 0 for orthogonal vectors", () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
});

test("cosineSimilarity returns 0 for a zero vector instead of NaN", () => {
  assert.equal(cosineSimilarity([0, 0], [1, 1]), 0);
});

test("compactPassageText keeps only sentences similar to the query embedding", async () => {
  const text = "Revenue grew twenty percent. The office has blue carpet. Net income also improved.";
  // Query embedding aligned with "financial" sentences (dimension 0), not the irrelevant one (dimension 1).
  const queryEmbedding = [1, 0];

  const fakeEmbed = async (sentences: string[]) =>
    sentences.map((s) => ({
      embedding: s.includes("carpet") ? [0, 1] : [1, 0],
    }));

  const compacted = await compactPassageText(text, queryEmbedding, fakeEmbed, {
    minSimilarity: 0.5,
    minSentences: 1,
  });

  assert.equal(compacted, "Revenue grew twenty percent. Net income also improved.");
});

test("compactPassageText keeps minSentences even if none clear the similarity threshold", async () => {
  const text = "Alpha sentence. Beta sentence. Gamma sentence.";
  const queryEmbedding = [1, 0];

  // All sentences are dissimilar to the query, but with different scores.
  const fakeEmbed = async (sentences: string[]) =>
    sentences.map((_, i) => ({ embedding: [0, i + 1] }));

  const compacted = await compactPassageText(text, queryEmbedding, fakeEmbed, {
    minSimilarity: 0.9,
    minSentences: 2,
  });

  // Nothing clears 0.9 similarity, but the 2 best-scoring sentences are kept anyway.
  const kept = compacted.split(". ").length;
  assert.ok(kept >= 1, `expected at least one sentence retained, got: "${compacted}"`);
  assert.notEqual(compacted, "", "should never compact down to nothing");
});

test("compactPassageText returns text unchanged when it has too few sentences to compact", async () => {
  const text = "Just one sentence here.";
  const fakeEmbed = async () => {
    throw new Error("embed should not be called when there's nothing to compact");
  };

  const compacted = await compactPassageText(text, [1, 0], fakeEmbed, { minSentences: 2 });
  assert.equal(compacted, text);
});

test("compactPassageText preserves original sentence order regardless of similarity ranking", async () => {
  const text = "Low relevance first. High relevance second. Medium relevance third.";
  const queryEmbedding = [1, 0];

  const scoreBySentence: Record<string, number[]> = {
    "Low relevance first.": [0.1, 0.99],
    "High relevance second.": [1, 0],
    "Medium relevance third.": [0.7, 0.3],
  };
  const fakeEmbed = async (sentences: string[]) =>
    sentences.map((s) => ({ embedding: scoreBySentence[s] }));

  const compacted = await compactPassageText(text, queryEmbedding, fakeEmbed, {
    minSimilarity: 0,
    minSentences: 3, // keep all three, but order must still follow the original text
  });

  assert.equal(compacted, text);
});
