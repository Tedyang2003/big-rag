import { test } from "node:test";
import * as assert from "node:assert/strict";
import {
  dayRangeOf,
  detectDayMonthOrder,
  documentPostedDate,
  extractDates,
  formatDateRange,
} from "../metadata/dates";

const day = (iso: string) => ({ start: iso, end: iso });

test("extractDates reads ISO dates", () => {
  assert.deepEqual(extractDates("Report 2026-09-15 final"), [day("2026-09-15")]);
  assert.deepEqual(extractDates("Filed 2026/9/5."), [day("2026-09-05")]);
});

test("extractDates reads compact dates only in file names", () => {
  assert.deepEqual(extractDates("ref 20260915"), []);
  assert.deepEqual(extractDates("report 20260915", { fileName: true }), [day("2026-09-15")]);
});

test("extractDates reads month-name forms", () => {
  assert.deepEqual(extractDates("On 15 September 2026 we met"), [day("2026-09-15")]);
  assert.deepEqual(extractDates("Sept 15, 2026"), [day("2026-09-15")]);
  assert.deepEqual(extractDates("15-Sep-26"), [day("2026-09-15")]);
  assert.deepEqual(extractDates("1st Sep 2026"), [day("2026-09-01")]);
});

test("extractDates needs a default year for day-month forms without a year", () => {
  assert.deepEqual(extractDates("due 15 Sep"), []);
  assert.deepEqual(extractDates("due 15 Sep", { defaultYear: 2026 }), [day("2026-09-15")]);
});

test("extractDates reads quarters and months as ranges", () => {
  const q3 = { start: "2026-07-01", end: "2026-09-30" };
  assert.deepEqual(extractDates("Q3 2026 results"), [q3]);
  assert.deepEqual(extractDates("2026 Q3 results"), [q3]);
  assert.deepEqual(extractDates("September 2026 update"), [{ start: "2026-09-01", end: "2026-09-30" }]);
  assert.deepEqual(extractDates("February 2028"), [{ start: "2028-02-01", end: "2028-02-29" }]);
});

test("extractDates does not double count a full date as a month range", () => {
  assert.deepEqual(extractDates("15 September 2026"), [day("2026-09-15")]);
});

test("extractDates ignores versions, times, money, percentages, and bare years", () => {
  assert.deepEqual(extractDates("v2.3.1 at 14:30 costs $15.09 (15.09%) for 2026 units"), []);
});

test("extractDates resolves numeric dates that have a part above 12", () => {
  assert.deepEqual(extractDates("15/04/2026"), [day("2026-04-15")]);
  assert.deepEqual(extractDates("04/15/2026"), [day("2026-04-15")]);
});

test("extractDates uses the document convention for ambiguous numeric dates", () => {
  assert.deepEqual(extractDates("03/04/2026", { order: "day-first" }), [day("2026-04-03")]);
  assert.deepEqual(extractDates("03/04/2026", { order: "month-first" }), [day("2026-03-04")]);
});

test("detectDayMonthOrder finds a single consistent convention", () => {
  assert.equal(detectDayMonthOrder("25/03/2026 and 03/04/2026"), "day-first");
  assert.equal(detectDayMonthOrder("03/25/2026"), "month-first");
  assert.equal(detectDayMonthOrder("25/03/2026 and 03/25/2026"), undefined);
  assert.equal(detectDayMonthOrder("03/04/2026"), undefined);
});

test("extractDates picks the reading within 45 days of the file time", () => {
  const referenceTime = new Date(2026, 3, 20); // 20 April 2026
  assert.deepEqual(extractDates("03/04/2026", { referenceTime }), [day("2026-04-03")]);
});

test("extractDates keeps both readings when nothing decides", () => {
  assert.deepEqual(extractDates("03/04/2026"), [day("2026-04-03"), day("2026-03-04")]);
});

test("extractDates returns dates in order of appearance without duplicates", () => {
  assert.deepEqual(extractDates("8 Sep 2026 then 3 Sep 2026"), [day("2026-09-08"), day("2026-09-03")]);
  assert.deepEqual(extractDates("2026-09-15 and 15 Sep 2026"), [day("2026-09-15")]);
});

test("documentPostedDate prefers the first page over the file name", () => {
  const markdown = "# Report\n\nPublished 20 September 2026\n\nBody.";
  assert.deepEqual(
    documentPostedDate(markdown, "2026-09-15_report.pdf", new Date(2026, 8, 22)),
    day("2026-09-20"),
  );
});

test("documentPostedDate falls back to the file name, then the modified time", () => {
  assert.deepEqual(
    documentPostedDate("# Report\n\nNo dates here.", "2026-09-15_report.pdf", new Date(2026, 8, 22)),
    day("2026-09-15"),
  );
  assert.deepEqual(
    documentPostedDate("# Report\n\nNo dates here.", "report.pdf", new Date(2026, 8, 22)),
    day("2026-09-22"),
  );
});

test("documentPostedDate only looks at the first 300 words", () => {
  const filler = Array.from({ length: 300 }, (_, i) => `word${i}`).join(" ");
  const markdown = `${filler} 20 September 2026`;
  assert.deepEqual(documentPostedDate(markdown, "report.pdf", new Date(2026, 0, 5)), day("2026-01-05"));
});

test("documentPostedDate accepts a range", () => {
  assert.deepEqual(
    documentPostedDate("Q3 2026 update", "report.pdf", new Date(2026, 8, 22)),
    { start: "2026-07-01", end: "2026-09-30" },
  );
});

test("dayRangeOf and formatDateRange", () => {
  assert.deepEqual(dayRangeOf(new Date(2026, 8, 5)), day("2026-09-05"));
  assert.equal(formatDateRange(day("2026-09-05")), "2026-09-05");
  assert.equal(formatDateRange({ start: "2026-07-01", end: "2026-09-30" }), "2026-07-01–2026-09-30");
});

test("year-less month forms need a capitalised month name", () => {
  assert.deepEqual(extractDates("costs 5 may rise", { defaultYear: 2026 }), []);
  assert.deepEqual(extractDates("prices may 5 times", { defaultYear: 2026 }), []);
  assert.deepEqual(extractDates("due 5 May", { defaultYear: 2026 }), [day("2026-05-05")]);
  assert.deepEqual(extractDates("due May 5", { defaultYear: 2026 }), [day("2026-05-05")]);
  assert.deepEqual(extractDates("due 15 sep 2026"), [day("2026-09-15")]);
  assert.deepEqual(extractDates("due sep 15, 2026"), [day("2026-09-15")]);
});
