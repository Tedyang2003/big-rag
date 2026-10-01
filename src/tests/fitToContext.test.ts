import { test } from "node:test";
import * as assert from "node:assert/strict";
import { fitToContext } from "../utils/fitToContext";

/** A prompt costing a fixed overhead plus a fixed amount per passage. */
function cost(perPassage: number, overhead: number) {
  const asked: number[] = [];
  return {
    asked,
    measure: async (count: number) => {
      asked.push(count);
      return overhead + count * perPassage;
    },
  };
}

test("everything fits, and that costs one measurement", async () => {
  const { asked, measure } = cost(100, 200);
  const fit = await fitToContext(5, 1000, measure);
  assert.deepEqual(fit, { used: 5, tokens: 700 });
  assert.deepEqual(asked, [5], "no need to try smaller sets when the full one fits");
});

test("passages are dropped from the end until the prompt fits", async () => {
  const { asked, measure } = cost(100, 200);
  // 9 passages would cost 1,100 against a 600 budget; 4 cost exactly 600.
  const fit = await fitToContext(9, 600, measure);
  assert.deepEqual(fit, { used: 4, tokens: 600 });
  assert.deepEqual(asked, [9, 8, 7, 6, 5, 4], "walks down from the full set");
});

test("a budget equal to the cost is accepted, not rejected", async () => {
  const { measure } = cost(100, 0);
  assert.deepEqual(await fitToContext(3, 300, measure), { used: 3, tokens: 300 });
});

test("when not even one passage fits, none are sent and the cost is still reported", async () => {
  // The history alone overruns the window, so no number of passages can help.
  const { measure } = cost(100, 5_000);
  const fit = await fitToContext(4, 1_000, measure);
  assert.equal(fit.used, 0);
  assert.equal(fit.tokens, 5_000, "the caller needs the real figure to report");
});

test("a floor sends the best passages even when nothing fits", async () => {
  // A long conversation fills the window on its own. Sending no retrieval at all would answer
  // from whatever the history happens to hold, which looks like success and is not.
  const { measure } = cost(100, 5_000);
  const fit = await fitToContext(8, 1_000, measure, 1);
  assert.equal(fit.used, 1, "the top passage goes regardless");
  assert.equal(fit.tokens, 5_100);
});

test("the floor never invents passages that were not retrieved", async () => {
  const { measure } = cost(100, 5_000);
  assert.equal((await fitToContext(0, 1_000, measure, 1)).used, 0);
});

test("no passages to begin with is measured once and reported as zero", async () => {
  const { asked, measure } = cost(100, 300);
  assert.deepEqual(await fitToContext(0, 1_000, measure), { used: 0, tokens: 300 });
  assert.deepEqual(asked, [0]);
});
