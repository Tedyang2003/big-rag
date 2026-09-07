import { test } from "node:test";
import * as assert from "node:assert/strict";
import { chunkText } from "../utils/textChunker";

const TEN_WORDS = "one two three four five six seven eight nine ten";

test("chunkText sizes chunks in words when tokens-per-word is 1", async () => {
  const chunks = await chunkText(TEN_WORDS, 5, 0, async () => 10);

  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].text, "one two three four five");
  assert.equal(chunks[1].text, "six seven eight nine ten");
  assert.deepEqual(
    chunks.map((c) => [c.startIndex, c.endIndex]),
    [
      [0, 5],
      [5, 10],
    ],
  );
});

test("chunkText shrinks the word window when tokens-per-word is higher", async () => {
  // Same text and token target as above, but the measured text is denser
  // (2 tokens per word) - chunks should come out smaller in word count to
  // still respect the same token budget.
  const chunks = await chunkText(TEN_WORDS, 5, 0, async () => 20);

  assert.equal(chunks.length, 4);
  assert.equal(chunks[0].text, "one two three");
  assert.equal(chunks[1].text, "four five six");
  assert.equal(chunks[2].text, "seven eight nine");
  assert.equal(chunks[3].text, "ten");
});

test("chunkText converts overlap using the same measured ratio", async () => {
  const chunks = await chunkText(TEN_WORDS, 6, 4, async () => 10);

  assert.deepEqual(
    chunks.map((c) => [c.startIndex, c.endIndex]),
    [
      [0, 6],
      [2, 8],
      [4, 10],
    ],
  );
});

test("chunkText returns no chunks for empty or whitespace-only text", async () => {
  assert.deepEqual(await chunkText("", 512, 100, async () => 0), []);
  assert.deepEqual(await chunkText("   \n\t  ", 512, 100, async () => 0), []);
});

test("chunkText never lets overlap reach or exceed the chunk word size", async () => {
  // overlap (in tokens) is deliberately larger than chunkSize here; if the
  // conversion to word-overlap weren't clamped, step size could hit 0 and
  // loop forever.
  const chunks = await chunkText(TEN_WORDS, 3, 100, async () => 10);

  assert.ok(chunks.length > 0);
  assert.ok(chunks.length <= 10, "chunking must terminate rather than loop indefinitely");
});
