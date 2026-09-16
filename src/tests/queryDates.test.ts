import { test } from "node:test";
import * as assert from "node:assert/strict";
import { queryDayRanges, toDayNumber } from "../retrieval/queryDates";

const NOW = new Date(2026, 8, 16); // Wednesday 16 September 2026
const options = (extra: Record<string, unknown> = {}) => ({ now: NOW, ...extra });

test("written dates become day ranges", () => {
  assert.deepEqual(queryDayRanges("What happened on 8 Sep 2026?", options()), [
    { start: 20260908, end: 20260908 },
  ]);
  assert.deepEqual(queryDayRanges("Summarise September 2026", options()), [
    { start: 20260901, end: 20260930 },
  ]);
  assert.deepEqual(queryDayRanges("Q3 2026 incidents", options()), [
    { start: 20260701, end: 20260930 },
  ]);
});

test("everyday phrases resolve against the current date", () => {
  assert.deepEqual(queryDayRanges("what happened today?", options()), [{ start: 20260916, end: 20260916 }]);
  assert.deepEqual(queryDayRanges("anything from yesterday?", options()), [{ start: 20260915, end: 20260915 }]);
  assert.deepEqual(queryDayRanges("summarise last week", options()), [{ start: 20260907, end: 20260913 }]);
  assert.deepEqual(queryDayRanges("summarise this week", options()), [{ start: 20260914, end: 20260920 }]);
  assert.deepEqual(queryDayRanges("reports from this month", options()), [{ start: 20260901, end: 20260930 }]);
  assert.deepEqual(queryDayRanges("reports from last month", options()), [{ start: 20260801, end: 20260831 }]);
  assert.deepEqual(queryDayRanges("last quarter results", options()), [{ start: 20260401, end: 20260630 }]);
  assert.deepEqual(queryDayRanges("anything this year", options()), [{ start: 20260101, end: 20261231 }]);
  assert.deepEqual(queryDayRanges("the past 3 days", options()), [{ start: 20260914, end: 20260916 }]);
  assert.deepEqual(queryDayRanges("in the last 2 weeks", options()), [{ start: 20260903, end: 20260916 }]);
});

test("a year-less date expands to the years present in the index", () => {
  assert.deepEqual(queryDayRanges("what happened on 8 Sep?", options({ yearsPresent: [2024, 2025, 2026] })), [
    { start: 20260908, end: 20260908 },
    { start: 20250908, end: 20250908 },
    { start: 20240908, end: 20240908 },
  ]);
});

test("a year-less date falls back to the current year when no years are known", () => {
  assert.deepEqual(queryDayRanges("what happened on 8 Sep?", options()), [
    { start: 20260908, end: 20260908 },
  ]);
});

test("a written year is respected even when other years exist", () => {
  assert.deepEqual(queryDayRanges("what happened on 8 Sep 2025?", options({ yearsPresent: [2025, 2026] })), [
    { start: 20250908, end: 20250908 },
  ]);
});

test("questions with no date produce no ranges", () => {
  assert.deepEqual(queryDayRanges("what caused the bus collision?", options()), []);
  assert.deepEqual(queryDayRanges("", options()), []);
});

test("toDayNumber uses the local calendar day", () => {
  assert.equal(toDayNumber(new Date(2026, 0, 5)), 20260105);
});
