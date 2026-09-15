export interface DateRange {
  start: string;
  end: string;
}

export type DayMonthOrder = "day-first" | "month-first";

export interface DateContext {
  /** Day/month order the document is known to use, for ambiguous numeric dates. */
  order?: DayMonthOrder;
  /** File modified time, used to pick between ambiguous readings. */
  referenceTime?: Date;
  /** Year for day-month forms written without one (e.g. "15 Sep"). */
  defaultYear?: number;
  /** Allow compact dates such as 20260915, which are only reliable in file names. */
  fileName?: boolean;
}

const MONTH_PATTERN =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const AMBIGUITY_WINDOW_DAYS = 45;
const POSTED_DATE_WORD_WINDOW = 300;
const DAY_MS = 86_400_000;

const NUMERIC_DATE = /(?<![\w.\/$-])(\d{1,2})([\/.\-])(\d{1,2})\2(\d{4})(?![\w%]|[.\/-]\d)/g;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function monthIndex(name: string): number {
  return MONTH_KEYS.indexOf(name.slice(0, 3).toLowerCase()) + 1;
}

function singleDay(year: number, month: number, dayOfMonth: number): DateRange | null {
  if (month < 1 || month > 12 || dayOfMonth < 1 || dayOfMonth > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, dayOfMonth));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== dayOfMonth) return null;
  const iso = `${year}-${pad(month)}-${pad(dayOfMonth)}`;
  return { start: iso, end: iso };
}

function monthRange(year: number, month: number): DateRange {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { start: `${year}-${pad(month)}-01`, end: `${year}-${pad(month)}-${pad(lastDay)}` };
}

function quarterRange(year: number, quarter: number): DateRange {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const lastDay = new Date(Date.UTC(year, endMonth, 0)).getUTCDate();
  return { start: `${year}-${pad(startMonth)}-01`, end: `${year}-${pad(endMonth)}-${pad(lastDay)}` };
}

function expandTwoDigitYear(value: string): number {
  const n = Number(value);
  return n < 70 ? 2000 + n : 1900 + n;
}

function daysApart(iso: string, reference: Date): number {
  const [year, month, dayOfMonth] = iso.split("-").map(Number);
  const referenceDay = Date.UTC(reference.getFullYear(), reference.getMonth(), reference.getDate());
  return Math.abs(Date.UTC(year, month - 1, dayOfMonth) - referenceDay) / DAY_MS;
}

function present(ranges: Array<DateRange | null>): DateRange[] {
  return ranges.filter((range): range is DateRange => range !== null);
}

function resolveNumeric(first: number, second: number, year: number, context: DateContext): DateRange[] {
  const dayFirst = singleDay(year, second, first);
  const monthFirst = singleDay(year, first, second);
  if (!dayFirst && !monthFirst) return [];
  if (!dayFirst) return [monthFirst!];
  if (!monthFirst) return [dayFirst];
  if (first === second) return [dayFirst];
  if (context.order) return [context.order === "day-first" ? dayFirst : monthFirst];
  if (context.referenceTime) {
    const dayClose = daysApart(dayFirst.start, context.referenceTime) <= AMBIGUITY_WINDOW_DAYS;
    const monthClose = daysApart(monthFirst.start, context.referenceTime) <= AMBIGUITY_WINDOW_DAYS;
    if (dayClose !== monthClose) return [dayClose ? dayFirst : monthFirst];
  }
  return [dayFirst, monthFirst];
}

interface PatternRule {
  regex: RegExp;
  fileNameOnly?: boolean;
  toRanges: (match: RegExpMatchArray, context: DateContext) => DateRange[];
}

const RULES: PatternRule[] = [
  {
    regex: /(?<![\w.\/-])(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?![\w%]|[.\/-]\d)/g,
    toRanges: (m) => present([singleDay(Number(m[1]), Number(m[2]), Number(m[3]))]),
  },
  {
    regex: /(?<!\d)((?:19|20)\d{2})(\d{2})(\d{2})(?!\d)/g,
    fileNameOnly: true,
    toRanges: (m) => present([singleDay(Number(m[1]), Number(m[2]), Number(m[3]))]),
  },
  {
    regex: NUMERIC_DATE,
    toRanges: (m, context) => resolveNumeric(Number(m[1]), Number(m[3]), Number(m[4]), context),
  },
  {
    regex: /(?<![\w])(?:Q([1-4])[\s-]*(\d{4})|(\d{4})[\s-]*Q([1-4]))(?![\w])/gi,
    toRanges: (m) => [quarterRange(Number(m[2] ?? m[3]), Number(m[1] ?? m[4]))],
  },
  {
    regex: new RegExp(
      `(?<![\\w])(\\d{1,2})(?:st|nd|rd|th)?[\\s-]+(${MONTH_PATTERN})\\.?(?:,?\\s+(\\d{4})|-(\\d{2}))?(?![\\w])`,
      "gi",
    ),
    toRanges: (m, context) => {
      const year = m[3] ? Number(m[3]) : m[4] ? expandTwoDigitYear(m[4]) : context.defaultYear;
      if (year === undefined) return [];
      return present([singleDay(year, monthIndex(m[2]), Number(m[1]))]);
    },
  },
  {
    regex: new RegExp(`(?<![\\w])(${MONTH_PATTERN})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?(?![\\w])`, "gi"),
    toRanges: (m, context) => {
      const year = m[3] ? Number(m[3]) : context.defaultYear;
      if (year === undefined) return [];
      return present([singleDay(year, monthIndex(m[1]), Number(m[2]))]);
    },
  },
  {
    regex: new RegExp(`(?<![\\w])(${MONTH_PATTERN})\\.?,?\\s+(\\d{4})(?![\\w])`, "gi"),
    toRanges: (m) => [monthRange(Number(m[2]), monthIndex(m[1]))],
  },
];

export function dedupeRanges(ranges: DateRange[]): DateRange[] {
  const seen = new Set<string>();
  const unique: DateRange[] = [];
  for (const range of ranges) {
    const key = `${range.start}/${range.end}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(range);
    }
  }
  return unique;
}

export function extractDates(text: string, context: DateContext = {}): DateRange[] {
  const found: Array<{ start: number; end: number; ranges: DateRange[] }> = [];
  const overlaps = (start: number, end: number) => found.some((f) => start < f.end && end > f.start);

  for (const rule of RULES) {
    if (rule.fileNameOnly && !context.fileName) continue;
    for (const match of text.matchAll(rule.regex)) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      if (overlaps(start, end)) continue;
      const ranges = rule.toRanges(match, context);
      if (ranges.length > 0) found.push({ start, end, ranges });
    }
  }

  found.sort((a, b) => a.start - b.start);
  return dedupeRanges(found.flatMap((f) => f.ranges));
}

export function detectDayMonthOrder(text: string): DayMonthOrder | undefined {
  const seen = new Set<DayMonthOrder>();
  for (const match of text.matchAll(NUMERIC_DATE)) {
    const first = Number(match[1]);
    const second = Number(match[3]);
    if (first > 12 && second <= 12) seen.add("day-first");
    else if (second > 12 && first <= 12) seen.add("month-first");
  }
  return seen.size === 1 ? [...seen][0] : undefined;
}

export function dayRangeOf(date: Date): DateRange {
  const iso = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return { start: iso, end: iso };
}

export function documentPostedDate(markdown: string, fileName: string, fileModifiedTime: Date): DateRange {
  const context: DateContext = { order: detectDayMonthOrder(markdown), referenceTime: fileModifiedTime };

  const opening = markdown.split(/\s+/).filter(Boolean).slice(0, POSTED_DATE_WORD_WINDOW).join(" ");
  const fromText = extractDates(opening, context)[0];
  if (fromText) return fromText;

  const baseName = fileName.replace(/\.[^.]+$/, "").replace(/_+/g, " ");
  const fromName = extractDates(baseName, { ...context, fileName: true })[0];
  if (fromName) return fromName;

  return dayRangeOf(fileModifiedTime);
}

export function formatDateRange(range: DateRange): string {
  return range.start === range.end ? range.start : `${range.start}–${range.end}`;
}
