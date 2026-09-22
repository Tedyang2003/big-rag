import { extractDates, MONTH_PATTERN, type DateRange } from "../metadata/dates";

/** Inclusive range of day numbers, e.g. { start: 20260908, end: 20260908 }. */
export interface DayRange {
  start: number;
  end: number;
}

export interface QueryDateOptions {
  /** Anchor for relative phrases; defaults to now. */
  now?: Date;
  /** Years the index actually contains, used to expand a date written without a year. */
  yearsPresent?: number[];
}

const DAY_MS = 86_400_000;

export function toDayNumber(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

function dayRangeOfDates(start: Date, end: Date): DayRange {
  return { start: toDayNumber(start), end: toDayNumber(end) };
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function startOfWeek(date: Date): Date {
  // Weeks run Monday to Sunday.
  const offset = (date.getDay() + 6) % 7;
  return addDays(date, -offset);
}

function monthRange(year: number, month: number): DayRange {
  const lastDay = new Date(year, month, 0).getDate();
  return { start: year * 10000 + month * 100 + 1, end: year * 10000 + month * 100 + lastDay };
}

function quarterRange(year: number, quarter: number): DayRange {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const lastDay = new Date(year, endMonth, 0).getDate();
  return { start: year * 10000 + startMonth * 100 + 1, end: year * 10000 + endMonth * 100 + lastDay };
}

function isoToDayNumber(iso: string): number {
  return Number(iso.replace(/-/g, ""));
}

function rangeFromExtracted(range: DateRange): DayRange {
  return { start: isoToDayNumber(range.start), end: isoToDayNumber(range.end) };
}

/** Phrases resolved against `now`, checked before pattern extraction. */
function relativeRange(question: string, now: Date): DayRange | null {
  const text = question.toLowerCase();

  const countMatch = /\b(?:past|last)\s+(\d{1,3})\s+(day|week|month)s?\b/.exec(text);
  if (countMatch) {
    const count = Number(countMatch[1]);
    if (countMatch[2] === "day") return dayRangeOfDates(addDays(now, -(count - 1)), now);
    if (countMatch[2] === "week") return dayRangeOfDates(addDays(now, -(count * 7 - 1)), now);
    const start = new Date(now.getFullYear(), now.getMonth() - (count - 1), 1);
    return dayRangeOfDates(start, now);
  }

  if (/\btoday\b/.test(text)) return dayRangeOfDates(now, now);
  if (/\byesterday\b/.test(text)) {
    const day = addDays(now, -1);
    return dayRangeOfDates(day, day);
  }
  if (/\bthis week\b/.test(text)) {
    const start = startOfWeek(now);
    return dayRangeOfDates(start, addDays(start, 6));
  }
  if (/\blast week\b/.test(text)) {
    const start = addDays(startOfWeek(now), -7);
    return dayRangeOfDates(start, addDays(start, 6));
  }
  if (/\bthis month\b/.test(text)) return monthRange(now.getFullYear(), now.getMonth() + 1);
  if (/\blast month\b/.test(text)) {
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return monthRange(previous.getFullYear(), previous.getMonth() + 1);
  }
  if (/\bthis quarter\b/.test(text)) return quarterRange(now.getFullYear(), Math.floor(now.getMonth() / 3) + 1);
  if (/\blast quarter\b/.test(text)) {
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    return quarter === 1 ? quarterRange(now.getFullYear() - 1, 4) : quarterRange(now.getFullYear(), quarter - 1);
  }
  if (/\bthis year\b/.test(text)) {
    return { start: now.getFullYear() * 10000 + 101, end: now.getFullYear() * 10000 + 1231 };
  }
  if (/\blast year\b/.test(text)) {
    const year = now.getFullYear() - 1;
    return { start: year * 10000 + 101, end: year * 10000 + 1231 };
  }
  return null;
}

const YEARLESS_DAY_MONTH = new RegExp(
  `(?<![\\w])(\\d{1,2})(?:st|nd|rd|th)?[\\s-]+(${MONTH_PATTERN})\\.?(?![\\s-]*\\d{4})(?![\\w])`,
  "i",
);
const YEARLESS_MONTH_DAY = new RegExp(
  `(?<![\\w])(${MONTH_PATTERN})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?![,\\s]*\\d{4})(?![\\w])`,
  "i",
);
const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function yearlessRanges(question: string, now: Date, yearsPresent: number[] | undefined): DayRange[] {
  const match = YEARLESS_DAY_MONTH.exec(question) ?? YEARLESS_MONTH_DAY.exec(question);
  if (!match) return [];
  const dayFirst = YEARLESS_DAY_MONTH.test(question);
  const day = Number(dayFirst ? match[1] : match[2]);
  const monthName = (dayFirst ? match[2] : match[1]).slice(0, 3).toLowerCase();
  const month = MONTH_KEYS.indexOf(monthName) + 1;
  if (month === 0 || day < 1 || day > 31) return [];

  const years = yearsPresent && yearsPresent.length > 0 ? [...yearsPresent] : [now.getFullYear()];
  years.sort((a, b) => b - a);
  return years
    .filter((year) => new Date(year, month - 1, day).getDate() === day)
    .map((year) => {
      const dayNumber = year * 10000 + month * 100 + day;
      return { start: dayNumber, end: dayNumber };
    });
}

const YEAR_ONLY = /(?<![\w.$-])(?:fy\s*|fiscal\s+(?:year\s+)?)?((?:19|20)\d{2})(?![\w.%-])/gi;
const NOT_A_YEAR_BEFORE = /(?:\$|usd|eur|gbp|versions?)\s*$/i;
const NOT_A_YEAR_AFTER = /^\s*(?:dollars|usd|eur|euros|gbp|pounds)\b/i;

/**
 * Years a question names on their own, as "2022", "FY2023" or "fiscal year 2021". Questions
 * about filings usually date them this way rather than with a full date, and a document's
 * year is what separates one annual report from the nine others that read almost the same.
 */
function bareYearRanges(question: string): DayRange[] {
  const years = new Set<number>();
  for (const match of question.matchAll(YEAR_ONLY)) {
    const before = question.slice(0, match.index ?? 0).trimEnd();
    const after = question.slice((match.index ?? 0) + match[0].length);
    if (NOT_A_YEAR_BEFORE.test(before) || NOT_A_YEAR_AFTER.test(after)) continue;
    years.add(Number(match[1]));
  }
  return [...years]
    .sort((a, b) => b - a)
    .map((year) => ({ start: year * 10000 + 101, end: year * 10000 + 1231 }));
}

/**
 * Day ranges the question refers to, most recent first. Empty when it names no date,
 * in which case the caller skips the date lane.
 */
export function queryDayRanges(question: string, options: QueryDateOptions = {}): DayRange[] {
  if (!question.trim()) return [];
  const now = options.now ?? new Date();

  const relative = relativeRange(question, now);
  if (relative) return [relative];

  const extracted = extractDates(question, { referenceTime: now });
  if (extracted.length > 0) return extracted.map(rangeFromExtracted);

  const yearless = yearlessRanges(question, now, options.yearsPresent);
  if (yearless.length > 0) return yearless;

  return bareYearRanges(question);
}
