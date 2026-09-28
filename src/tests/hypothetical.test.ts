import { test } from "node:test";
import * as assert from "node:assert/strict";
import { buildHypotheticalPrompt, hypotheticalFor } from "../retrieval/hypothetical";

const NEVER_TIMES_OUT = 10_000;

test("the prompt asks for a passage rather than an answer, and names no domain", () => {
  const prompt = buildHypotheticalPrompt("What were capital expenditures in FY2023?");
  assert.match(prompt, /What were capital expenditures in FY2023\?/);
  assert.match(prompt, /passage/i);
  assert.doesNotMatch(prompt, /financial|filing|company|10-K/i);
});

test("a normal response comes back trimmed", async () => {
  const result = await hypotheticalFor("what were capital expenditures", {
    generate: async () => "  Capital expenditures were 1,577.  ",
    timeoutMs: NEVER_TIMES_OUT,
  });
  assert.equal(result, "Capital expenditures were 1,577.");
});

test("an empty or whitespace-only response is null, not an empty search", async () => {
  for (const response of ["", "   ", "\n\t"]) {
    const result = await hypotheticalFor("a question", {
      generate: async () => response,
      timeoutMs: NEVER_TIMES_OUT,
    });
    assert.equal(result, null, `expected null for ${JSON.stringify(response)}`);
  }
});

test("an empty question is not sent to the model at all", async () => {
  let called = false;
  const result = await hypotheticalFor("   ", {
    generate: async () => {
      called = true;
      return "something";
    },
    timeoutMs: NEVER_TIMES_OUT,
  });
  assert.equal(result, null);
  assert.equal(called, false);
});

test("a generator that throws gives null rather than failing the query", async () => {
  const result = await hypotheticalFor("a question", {
    generate: async () => {
      throw new Error("no model loaded");
    },
    timeoutMs: NEVER_TIMES_OUT,
  });
  assert.equal(result, null);
});

test("a generator slower than the timeout gives null, and is told to stop", async () => {
  let signalled = false;
  const result = await hypotheticalFor("a question", {
    generate: (_prompt, abortSignal) =>
      new Promise((resolve) => {
        abortSignal?.addEventListener("abort", () => {
          signalled = true;
        });
        setTimeout(() => resolve("far too late"), 1_000).unref?.();
      }),
    timeoutMs: 10,
  });
  assert.equal(result, null);
  assert.equal(signalled, true, "the generator should be asked to stop when the timeout fires");
});

test("the caller's own cancellation gives null and reaches the generator", async () => {
  const caller = new AbortController();
  let signalled = false;
  const pending = hypotheticalFor("a question", {
    generate: (_prompt, abortSignal) =>
      new Promise((resolve) => {
        abortSignal?.addEventListener("abort", () => {
          signalled = true;
        });
        setTimeout(() => resolve("far too late"), 1_000).unref?.();
      }),
    timeoutMs: NEVER_TIMES_OUT,
    abortSignal: caller.signal,
  });

  caller.abort();
  assert.equal(await pending, null);
  assert.equal(signalled, true);
});
