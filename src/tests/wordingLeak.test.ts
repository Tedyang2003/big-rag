import { test } from "node:test";
import * as assert from "node:assert/strict";
import { DEFAULT_WORDING_LEAK_LIMIT, isWordingLeak, wordingLeakRatio } from "../eval/wordingLeak";

const CHUNK = "Total members: 15.8M, +35% YoY, with a record quarter for deposits.";

test("the default wording-leak limit is 0.7", () => {
  assert.equal(DEFAULT_WORDING_LEAK_LIMIT, 0.7);
});

test("wordingLeakRatio is high when the question copies the chunk's wording", () => {
  assert.equal(wordingLeakRatio("What were total members YoY?", CHUNK), 1);
  assert.equal(isWordingLeak("What were total members YoY?", CHUNK), true);
});

test("wordingLeakRatio is low for a genuine paraphrase", () => {
  assert.equal(wordingLeakRatio("How much did membership grow year over year?", CHUNK), 0);
  assert.equal(isWordingLeak("How much did membership grow year over year?", CHUNK), false);
});

test("a question between 0.5 and the default limit passes by default but fails a stricter limit", () => {
  // Meaningful words: total, deposits, members, grow, sharply. Three are in the chunk: 3 of 5.
  const question = "Did total deposits and members grow sharply?";
  assert.equal(wordingLeakRatio(question, CHUNK), 0.6);
  assert.equal(isWordingLeak(question, CHUNK), false);
  assert.equal(isWordingLeak(question, CHUNK, 0.5), true);
});

test("a question at exactly the limit is not a leak", () => {
  // Meaningful words: deposits, total, signups, improve. "deposits" and "total" are in the chunk: 2 of 4.
  const question = "Did deposits and total signups improve?";
  assert.equal(wordingLeakRatio(question, CHUNK), 0.5);
  assert.equal(isWordingLeak(question, CHUNK, 0.5), false);
});

test("a limit of 1 disables the check", () => {
  assert.equal(isWordingLeak("What were total members YoY?", CHUNK, 1), false);
});

test("a question with no meaningful words counts as a leak under any limit below 1", () => {
  assert.equal(wordingLeakRatio("What is it?", CHUNK), 1);
  assert.equal(isWordingLeak("What is it?", CHUNK), true);
});
