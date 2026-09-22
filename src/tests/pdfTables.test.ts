import { test } from "node:test";
import * as assert from "node:assert/strict";
import { findTableRows, isNumericCell } from "../parsers/markdown/pdfTables";
import { type PdfLine } from "../parsers/markdown/pdfStyles";

/** A line whose cells start at the given x positions. */
function row(texts: string[], xs: number[], top = 100): PdfLine {
  return {
    text: texts.join(" "),
    size: 10,
    bold: false,
    italic: false,
    mixed: false,
    box: [xs[0], top, 550, top + 12],
    cells: texts.map((text, i) => ({ text, x0: xs[i], x1: xs[i] + 40 })),
  };
}

function plain(text: string, top = 100): PdfLine {
  return { text, size: 10, bold: false, italic: false, mixed: false, box: [60, top, 550, top + 12] };
}

const COLUMNS = [60, 300, 400, 500];

test("two aligned rows are a table", () => {
  const rows = findTableRows(
    [row(["Years ended", "2018", "2017", "2016"], COLUMNS, 100), row(["Capital expenditures", "1,577", "1,373", "1,420"], COLUMNS, 120)],
    612,
  );
  assert.equal(rows.size, 2);
  assert.deepEqual(rows.get(1)?.cells, ["Capital expenditures", "1,577", "1,373", "1,420"]);
});

test("a single row-like line on its own is not a table", () => {
  const rows = findTableRows([plain("intro"), row(["Label", "42"], [60, 300], 120), plain("outro", 140)], 612);
  assert.equal(rows.size, 0);
});

test("a row with fewer cells that align continues the run", () => {
  const rows = findTableRows(
    [
      row(["Years ended", "2018", "2017", "2016"], COLUMNS, 100),
      row(["Capital expenditures", "1,577", "1,373", "1,420"], COLUMNS, 120),
      row(["Total", "9,000"], [60, 300], 140),
    ],
    612,
  );
  assert.equal(rows.size, 3, "the subtotal row belongs to the table");
  assert.deepEqual(rows.get(2)?.cells, ["Total", "9,000"]);
});

test("rows whose cells do not align are not a table", () => {
  const rows = findTableRows(
    [row(["Alpha", "beta"], [60, 300], 100), row(["Gamma", "delta"], [60, 480], 120)],
    612,
  );
  assert.equal(rows.size, 0);
});

test("the header is the first row with a label in its first cell", () => {
  const rows = findTableRows(
    [
      row(["2018", "2017", "2016"], [300, 400, 500], 100),
      row(["Years ended December 31", "2018", "2017", "2016"], COLUMNS, 120),
      row(["Capital expenditures", "1,577", "1,373", "1,420"], COLUMNS, 140),
    ],
    612,
  );
  assert.equal(rows.get(0)?.isHeader, false);
  assert.equal(rows.get(1)?.isHeader, true);
});

test("an all-numeric table falls back to its first row as the header", () => {
  const rows = findTableRows(
    [row(["1", "2", "3"], [60, 300, 400], 100), row(["4", "5", "6"], [60, 300, 400], 120)],
    612,
  );
  assert.equal(rows.get(0)?.isHeader, true);
});

test("isNumericCell reads money, percentages and bracketed negatives", () => {
  for (const value of ["1,577", "$1,577", "(221)", "3.20", "12%", "-5"]) assert.equal(isNumericCell(value), true, value);
  for (const value of ["Capital expenditures", "2018 total", "—", ""]) assert.equal(isNumericCell(value), false, value);
});
