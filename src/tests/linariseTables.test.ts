import { test } from "node:test";
import * as assert from "node:assert/strict";
import { linariseTables, startsNewTable } from "../chunking/linariseTables";

test("each row after the header is named by its columns", () => {
  const text = [
    "Years ended December 31 | 2018 | 2017",
    "Capital expenditures | 1,577 | 1,373",
    "Depreciation | 1,488 | 1,544",
  ].join("\n");

  assert.equal(
    linariseTables(text),
    [
      "Years ended December 31 | 2018 | 2017",
      "Capital expenditures — 2018: 1,577; 2017: 1,373",
      "Depreciation — 2018: 1,488; 2017: 1,544",
    ].join("\n"),
  );
});

test("prose is untouched, and a new table starts after it", () => {
  const text = ["Some prose about cash flows.", "A | B", "one | two", "More prose.", "C | D", "three | four"].join("\n");
  const out = linariseTables(text).split("\n");

  assert.equal(out[0], "Some prose about cash flows.");
  assert.equal(out[2], "one — B: two");
  assert.equal(out[3], "More prose.");
  assert.equal(out[5], "three — D: four");
});

test("a row with more cells than the header keeps the extra values unnamed", () => {
  assert.equal(linariseTables("A | B\none | two | three"), "A | B\none — B: two; three");
});

test("text with no table is returned unchanged", () => {
  assert.equal(linariseTables("just a sentence"), "just a sentence");
});

test("an all-textual row after data rows starts a new table with its own columns", () => {
  const text = ["Years | 2018 | 2017", "Capex | 1 | 2", "Segment | Americas | Europe", "Sales | 9 | 8"].join("\n");
  const out = linariseTables(text).split("\n");

  assert.equal(out[1], "Capex — 2018: 1; 2017: 2");
  assert.equal(out[2], "Segment | Americas | Europe");
  assert.equal(out[3], "Sales — Americas: 9; Europe: 8");
});

test("a page-break continuation stays one table", () => {
  const text = ["Years | 2018 | 2017", "Capex | 1 | 2", "Depreciation | 3 | 4", "Amortisation | 5 | 6"].join("\n");
  const out = linariseTables(text).split("\n");

  assert.equal(out[2], "Depreciation — 2018: 3; 2017: 4");
  assert.equal(out[3], "Amortisation — 2018: 5; 2017: 6");
});

test("startsNewTable needs a textual row after a row that held a number", () => {
  assert.equal(startsNewTable(["Capex", "1", "2"], ["Segment", "Americas", "Europe"]), true);
  assert.equal(startsNewTable(["Capex", "1", "2"], ["Depreciation", "3", "4"]), false);
  assert.equal(startsNewTable(["Years", "Prior", "Current"], ["Segment", "Americas", "Europe"]), false);
});
