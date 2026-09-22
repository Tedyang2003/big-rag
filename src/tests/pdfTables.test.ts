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
  assert.equal(rows.get(0), undefined, "the numeric-only line above the table is not part of it");
  assert.equal(rows.get(1)?.isHeader, true);
});

test("an all-numeric table falls back to its first row as the header", () => {
  const rows = findTableRows(
    [row(["1", "2", "3"], [60, 300, 400], 100), row(["4", "5", "6"], [60, 300, 400], 120)],
    612,
  );
  assert.equal(rows.get(0)?.isHeader, true);
});

test("a run starts at its header row: leading numeric-first-cell lines are not table rows", () => {
  const columns = [60, 300, 400];
  const rows = findTableRows(
    [
      row(["2018", "1,577", "1,373"], columns, 100),
      row(["Capital expenditures", "1,577", "1,373"], columns, 120),
      row(["Depreciation", "1,488", "1,544"], columns, 140),
    ],
    612,
  );
  assert.equal(rows.get(0), undefined, "the numeric-first-cell lead row is not a table row");
  assert.equal(rows.get(1)?.isHeader, true);
  assert.deepEqual(rows.get(1)?.cells, ["Capital expenditures", "1,577", "1,373"]);
  assert.equal(rows.get(2)?.isHeader, false);
  assert.deepEqual(rows.get(2)?.cells, ["Depreciation", "1,488", "1,544"]);
});

test("three consecutive bullet lines produce no rows", () => {
  const bullet = (text: string, top: number) => row(["•", text], [60, 90], top);
  const rows = findTableRows(
    [
      bullet("worldwide economic, political, and capital markets conditions", 100),
      bullet("new business opportunities and product development", 120),
      bullet("the outcome of contingencies, such as legal proceedings", 140),
    ],
    612,
  );
  assert.equal(rows.size, 0);
});

test("two consecutive aligned prose lines with no numeric cell anywhere produce no rows", () => {
  const columns = [60, 300];
  const rows = findTableRows(
    [row(["Overview", "Results of Operations"], columns, 100), row(["Segments", "Geographic Areas"], columns, 120)],
    612,
  );
  assert.equal(rows.size, 0);
});

test("a two-column prose page produces no rows", () => {
  const columns = [60, 310];
  const rows = findTableRows(
    [
      row(["Left column line one of the flowing text here.", "Right column line one of the flowing text here."], columns, 100),
      row(["Left column line two of the flowing text here.", "Right column line two of the flowing text here."], columns, 120),
      row(["Left column line three of the flowing text here.", "Right column line three of the flowing text here."], columns, 140),
    ],
    612,
  );
  assert.equal(rows.size, 0);
});

test("isNumericCell reads money, percentages and bracketed negatives", () => {
  for (const value of ["1,577", "$1,577", "(221)", "3.20", "12%", "-5"]) assert.equal(isNumericCell(value), true, value);
  for (const value of ["Capital expenditures", "2018 total", "—", ""]) assert.equal(isNumericCell(value), false, value);
});
