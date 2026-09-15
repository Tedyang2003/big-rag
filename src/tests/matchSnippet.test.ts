import { test } from "node:test";
import * as assert from "node:assert/strict";
import { containsSnippet, normalizeForMatch } from "../eval/matchSnippet";

test("normalizeForMatch lowercases and collapses punctuation and whitespace", () => {
  assert.equal(normalizeForMatch("  Total members:\n15.8M,  +35% YoY "), "total members 15 8m 35 yoy");
});

test("containsSnippet tolerates case, punctuation, and whitespace differences", () => {
  const chunk = "Ecosystem update. Total members: 15.8M, +35% YoY, with record growth.";
  assert.equal(containsSnippet(chunk, "total members 15.8m +35% yoy"), true);
  assert.equal(containsSnippet(chunk, "Total   members:\n15.8M, +35% YoY"), true);
});

test("containsSnippet does not match partial words", () => {
  assert.equal(containsSnippet("membership grew quickly", "member"), false);
});

test("containsSnippet returns false for unrelated text or an empty snippet", () => {
  assert.equal(containsSnippet("Revenue fell sharply.", "Total members: 15.8M"), false);
  assert.equal(containsSnippet("Anything at all.", "  ...  "), false);
});
