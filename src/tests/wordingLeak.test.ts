import { test } from "node:test";
import * as assert from "node:assert/strict";
import { isWordingLeak, wordingLeakRatio, WORDING_LEAK_LIMIT } from "../eval/wordingLeak";

const CHUNK = "Total members: 15.8M, +35% YoY, with a record quarter for deposits.";

test("wordingLeakRatio is high when the question copies the chunk's wording", () => {
  assert.equal(wordingLeakRatio("What were total members YoY?", CHUNK), 1);
  assert.equal(isWordingLeak("What were total members YoY?", CHUNK), true);
});

test("wordingLeakRatio is low for a genuine paraphrase", () => {
  assert.equal(wordingLeakRatio("How much did membership grow year over year?", CHUNK), 0);
  assert.equal(isWordingLeak("How much did membership grow year over year?", CHUNK), false);
});

test("a question at exactly the limit is not a leak", () => {
  // Meaningful words: deposits, total, signups, improve. "deposits" and "total" are in the chunk: 2 of 4.
  const ratio = wordingLeakRatio("Did deposits and total signups improve?", CHUNK);
  assert.equal(ratio, WORDING_LEAK_LIMIT);
  assert.equal(isWordingLeak("Did deposits and total signups improve?", CHUNK), false);
});

test("a question with no meaningful words counts as a leak", () => {
  assert.equal(wordingLeakRatio("What is it?", CHUNK), 1);
  assert.equal(isWordingLeak("What is it?", CHUNK), true);
});
