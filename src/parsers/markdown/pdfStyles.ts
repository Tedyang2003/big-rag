import { inferStructure } from "./inferStructure";
import { findTableRows } from "./pdfTables";

/** One piece of a merged row: its text and horizontal extent. */
export interface PdfCell {
  text: string;
  x0: number;
  x1: number;
}

/** One line of PDF text with the style most of its characters use. */
export interface PdfLine {
  text: string;
  /** Font size rounded to the nearest 0.5pt. */
  size: number;
  bold: boolean;
  italic: boolean;
  /** True when the line's characters use more than one style. */
  mixed: boolean;
  /** Left, top, right, bottom in page units, y growing downwards. */
  box: [number, number, number, number];
  /** Set when this line was merged from several pieces on one row, ordered left to right. */
  cells?: PdfCell[];
}

export interface PdfBlock {
  lines: PdfLine[];
}

export interface PdfPage {
  width: number;
  height: number;
  blocks: PdfBlock[];
}

const MAX_HEADING_WORDS = 12;
const FURNITURE_BAND = 0.08;
const FURNITURE_PAGE_SHARE = 0.5;
const FURNITURE_MIN_PAGES = 3;
const MAX_HEADING_STYLE_SHARE = 0.15;
const SAME_ROW_OVERLAP = 0.5;
const MAX_ROW_CELL_WORDS = 5;
const MAX_HEADING_LEVEL = 3;
const PAGE_NUMBER = /^(?:page\s+)?\d+(?:\s+of\s+\d+)?$/i;

interface PlacedLine {
  line: PdfLine;
  page: number;
  block: number;
  /** Position in reading order across the whole document. */
  order: number;
}

interface HeadingGroup {
  style: string;
  size: number;
  lines: PlacedLine[];
  text: string;
}

export function styleKey(style: { size: number; bold: boolean; italic: boolean }): string {
  return `${style.size}${style.bold ? "b" : ""}${style.italic ? "i" : ""}`;
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function furnitureKey(text: string): string {
  return text.replace(/\d+/g, "#").replace(/\s+/g, " ").trim().toLowerCase();
}

function inBand(line: PdfLine, height: number): boolean {
  return line.box[1] < height * FURNITURE_BAND || line.box[3] > height * (1 - FURNITURE_BAND);
}

/**
 * Merges lines that sit on the same row within one block: MuPDF can emit a heading like
 * "1 Introduction", or a table row, as separate lines at the same y inside one block. Two
 * lines are on the same row when their vertical overlap is more than half the shorter
 * line's height. A merged line orders its parts by left edge, joins their texts with a
 * single space, and takes the union of their boxes; its style is the part with the most
 * non-space characters, and it is `mixed` when the parts disagree on style or any part
 * was already mixed. A merged line takes the position of its first part in the block.
 */
function mergeSameRowLines(lines: PdfLine[]): PdfLine[] {
  const n = lines.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = lines[i];
      const b = lines[j];
      const heightA = a.box[3] - a.box[1];
      const heightB = b.box[3] - b.box[1];
      const shorter = Math.min(heightA, heightB);
      const overlap = Math.min(a.box[3], b.box[3]) - Math.max(a.box[1], b.box[1]);
      if (shorter > 0 && overlap > shorter * SAME_ROW_OVERLAP) {
        const ra = find(i);
        const rb = find(j);
        if (ra !== rb) parent[ra] = rb;
      }
    }
  }
  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const members = groups.get(root) ?? [];
    members.push(i);
    groups.set(root, members);
  }
  const nonSpaceLength = (text: string) => text.replace(/\s/g, "").length;
  const merged: { firstIndex: number; line: PdfLine }[] = [];
  for (const members of groups.values()) {
    if (members.length === 1) {
      merged.push({ firstIndex: members[0], line: lines[members[0]] });
      continue;
    }
    const parts = members.map((i) => lines[i]);
    const byLeft = [...parts].sort((a, b) => a.box[0] - b.box[0]);
    const text = byLeft.map((part) => part.text).join(" ");
    const box: [number, number, number, number] = [
      Math.min(...parts.map((p) => p.box[0])),
      Math.min(...parts.map((p) => p.box[1])),
      Math.max(...parts.map((p) => p.box[2])),
      Math.max(...parts.map((p) => p.box[3])),
    ];
    let dominant = parts[0];
    for (const part of parts) {
      if (nonSpaceLength(part.text) > nonSpaceLength(dominant.text)) dominant = part;
    }
    const stylesDiffer = new Set(parts.map((part) => styleKey(part))).size > 1;
    const mixed = stylesDiffer || parts.some((part) => part.mixed);
    const cells = byLeft.map((part) => ({ text: part.text, x0: part.box[0], x1: part.box[2] }));
    merged.push({
      firstIndex: Math.min(...members),
      line: { text, size: dominant.size, bold: dominant.bold, italic: dominant.italic, mixed, box, cells },
    });
  }
  merged.sort((a, b) => a.firstIndex - b.firstIndex);
  return merged.map((entry) => entry.line);
}

/** Pass 1.5: merge same-row lines within each block, per page. */
function mergeRowsAcrossPages(pages: PdfPage[]): PdfPage[] {
  return pages.map((page) => ({
    ...page,
    blocks: page.blocks.map((block) => ({ lines: mergeSameRowLines(block.lines) })),
  }));
}

/** Pass 2: drop page numbers, and headers and footers repeated on at least half the pages. */
function removeFurniture(rawPages: PdfPage[]): PlacedLine[] {
  const pages = mergeRowsAcrossPages(rawPages);

  const pagesByKey = new Map<string, Set<number>>();
  if (pages.length >= FURNITURE_MIN_PAGES) {
    pages.forEach((page, pageNumber) => {
      for (const block of page.blocks) {
        for (const line of block.lines) {
          if (!inBand(line, page.height)) continue;
          const key = furnitureKey(line.text);
          const seen = pagesByKey.get(key) ?? new Set<number>();
          seen.add(pageNumber);
          pagesByKey.set(key, seen);
        }
      }
    });
  }
  const isRepeated = (line: PdfLine, height: number) =>
    inBand(line, height) &&
    (pagesByKey.get(furnitureKey(line.text))?.size ?? 0) >= pages.length * FURNITURE_PAGE_SHARE;

  const kept: PlacedLine[] = [];
  pages.forEach((page, pageNumber) => {
    page.blocks.forEach((block, blockNumber) => {
      for (const line of block.lines) {
        const text = line.text.replace(/\s+/g, " ").trim();
        if (!text || (inBand(line, page.height) && PAGE_NUMBER.test(text))) continue;
        if (pagesByKey.size > 0 && isRepeated(line, page.height)) continue;
        kept.push({ line: { ...line, text }, page: pageNumber, block: blockNumber, order: kept.length });
      }
    });
  });
  return kept;
}

interface BodyStyle {
  key: string;
  size: number;
  bold: boolean;
  italic: boolean;
}

/** The style covering the most words. */
function bodyStyleOf(lines: PlacedLine[]): BodyStyle {
  const words = new Map<string, number>();
  for (const { line } of lines) {
    const key = styleKey(line);
    words.set(key, (words.get(key) ?? 0) + wordCount(line.text));
  }
  let best = "";
  let bestWords = -1;
  for (const [key, count] of words) {
    if (count > bestWords) {
      best = key;
      bestWords = count;
    }
  }
  const { size, bold, italic } = lines.find(({ line }) => styleKey(line) === best)!.line;
  return { key: best, size, bold, italic };
}

/** Only body-size-or-larger emphasis can mark a heading: larger, or newly bold or italic. */
function isHeadingStyle(line: PdfLine, body: BodyStyle): boolean {
  if (line.size < body.size) return false;
  return line.size > body.size || (line.bold && !body.bold) || (line.italic && !body.italic);
}

/** A word that is a number once currency, percent, parentheses and separators are stripped. */
function isNumericWord(word: string): boolean {
  const stripped = word.replace(/[$%(),.]/g, "").replace(/^-/, "");
  return stripped.length > 0 && /^\d+$/.test(stripped);
}

/** A row of figures that MuPDF emitted as one line: at least 2 numbers making up half the words. */
function isNumericRow(text: string): boolean {
  const words = text.split(/\s+/).filter(Boolean);
  const numeric = words.filter(isNumericWord).length;
  return numeric >= 2 && numeric * 2 >= words.length;
}

/** One page's lines sorted by top, with the tallest line's height, for windowed row lookups. */
interface PageRows {
  lines: PlacedLine[];
  maxHeight: number;
}

function pageRowsOf(pageLines: PlacedLine[]): PageRows {
  const lines = [...pageLines].sort((a, b) => a.line.box[1] - b.line.box[1]);
  const maxHeight = lines.reduce((max, { line }) => Math.max(max, line.box[3] - line.box[1]), 0);
  return { lines, maxHeight };
}

/** Index of the first line whose top is at least `top`. */
function firstAtOrBelow(lines: PlacedLine[], top: number): number {
  let low = 0;
  let high = lines.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (lines[mid].line.box[1] < top) low = mid + 1;
    else high = mid;
  }
  return low;
}

/**
 * Guard 1: a heading has its row to itself; table cells and row labels share theirs.
 * Only a short line (at most 5 words) counts as sharing the row, so flowing prose in the
 * other column of a two-column page is ignored.
 */
function sharesRow(target: PlacedLine, rows: PageRows): boolean {
  const [, top, , bottom] = target.line.box;
  const height = Math.max(bottom - top, 1);
  // A line that overlaps has its top above `bottom`, and its bottom below `top`, so its
  // top is no more than the tallest line's height above `top`.
  for (let i = firstAtOrBelow(rows.lines, top - rows.maxHeight); i < rows.lines.length; i++) {
    const other = rows.lines[i];
    if (other.line.box[1] >= bottom) break;
    if (other === target || wordCount(other.line.text) > MAX_ROW_CELL_WORDS) continue;
    const overlap = Math.min(bottom, other.line.box[3]) - Math.max(top, other.line.box[1]);
    if (overlap > height * SAME_ROW_OVERLAP) return true;
  }
  return false;
}

/** Pass 3: whole-line, heading-style, short lines that stand alone on their row. */
function isCandidate(placed: PlacedLine, body: BodyStyle, rows: PageRows): boolean {
  const { line } = placed;
  if (line.mixed || styleKey(line) === body.key || !isHeadingStyle(line, body)) return false;
  if (wordCount(line.text) > MAX_HEADING_WORDS) return false;
  if (!/\p{L}/u.test(line.text) || /[.,;:]$/.test(line.text)) return false;
  if (isNumericRow(line.text)) return false;
  return !sharesRow(placed, rows);
}

/**
 * True when `next` continues directly from `previous`: same page, starting no more than
 * one line height below it and no more than half a line height above it.
 */
function followsDirectly(previous: PlacedLine, next: PlacedLine): boolean {
  if (previous.page !== next.page) return false;
  const previousHeight = previous.line.box[3] - previous.line.box[1];
  const gap = next.line.box[1] - previous.line.box[3];
  return gap <= previousHeight && gap >= -previousHeight / 2;
}

/**
 * Joins consecutive candidate lines of one style on one page into a run, but only
 * when each line follows directly from the previous one; drops joins over 12 words.
 */
function groupCandidates(lines: PlacedLine[], candidate: boolean[]): HeadingGroup[] {
  const groups: HeadingGroup[] = [];
  let current: PlacedLine[] = [];
  const close = () => {
    if (current.length === 0) return;
    const text = current.map((placed) => placed.line.text).join(" ");
    if (wordCount(text) <= MAX_HEADING_WORDS) {
      groups.push({ style: styleKey(current[0].line), size: current[0].line.size, lines: current, text });
    }
    current = [];
  };
  lines.forEach((placed, i) => {
    if (!candidate[i]) {
      close();
      return;
    }
    const previous = current[current.length - 1];
    if (previous) {
      const adjacent = styleKey(previous.line) === styleKey(placed.line) && followsDirectly(previous, placed);
      if (!adjacent) close();
    }
    current.push(placed);
  });
  close();
  return groups;
}

/**
 * A run is part of a wrapped paragraph when the kept line directly before or after it has
 * the same style, follows on directly, and is not itself a candidate.
 */
function isWrappedParagraph(group: HeadingGroup, lines: PlacedLine[], candidate: boolean[]): boolean {
  const first = group.lines[0];
  const last = group.lines[group.lines.length - 1];
  const continues = (neighbour: PlacedLine | undefined, before: boolean) =>
    neighbour !== undefined &&
    !candidate[neighbour.order] &&
    styleKey(neighbour.line) === group.style &&
    (before ? followsDirectly(neighbour, first) : followsDirectly(last, neighbour));
  return continues(lines[first.order - 1], true) || continues(lines[last.order + 1], false);
}

/** Pass 5: heading level for each surviving style. */
function rankStyles(groups: HeadingGroup[], multiPage: boolean): Map<string, number> {
  const styles = [...new Set(groups.map((group) => group.style))].map((style) => {
    const own = groups.filter((group) => group.style === style);
    const afterCover = own.find((group) => group.lines[0].page > 0);
    return {
      style,
      size: own[0].size,
      coverOnly: multiPage && afterCover === undefined,
      first: (afterCover ?? own[0]).lines[0].order,
    };
  });
  styles.sort((a, b) => Number(a.coverOnly) - Number(b.coverOnly) || b.size - a.size || a.first - b.first);
  const levels = new Map<string, number>();
  styles.forEach(({ style }, i) => {
    levels.set(style, styles.length === 1 ? 2 : Math.min(i + 1, MAX_HEADING_LEVEL));
  });
  return levels;
}

/**
 * Normalized Markdown for a PDF whose headings are marked by font style, or null when
 * no heading style is found (the caller then falls back to plain-text inference).
 */
export function styledPagesToMarkdown(pages: PdfPage[]): string | null {
  const lines = removeFurniture(pages);
  if (lines.length === 0) return null;

  const bodyStyle = bodyStyleOf(lines);
  const linesByPage = new Map<number, PlacedLine[]>();
  for (const placed of lines) {
    const pageLines = linesByPage.get(placed.page) ?? [];
    pageLines.push(placed);
    linesByPage.set(placed.page, pageLines);
  }
  const rowsByPage = new Map<number, PageRows>();
  for (const [pageNumber, pageLines] of linesByPage) rowsByPage.set(pageNumber, pageRowsOf(pageLines));
  const candidate = lines.map((placed) => isCandidate(placed, bodyStyle, rowsByPage.get(placed.page)!));

  // Pass 4 (guard 2): a style on too many candidate lines (including joins later
  // dropped for exceeding 12 words) is emphasis, not a heading level. A run that is
  // part of a wrapped paragraph is not a heading either.
  const allGroups = groupCandidates(lines, candidate);
  const linesPerStyle = new Map<string, number>();
  lines.forEach((placed, i) => {
    if (!candidate[i]) return;
    const key = styleKey(placed.line);
    linesPerStyle.set(key, (linesPerStyle.get(key) ?? 0) + 1);
  });
  const groups = allGroups.filter(
    (group) =>
      (linesPerStyle.get(group.style) ?? 0) <= lines.length * MAX_HEADING_STYLE_SHARE &&
      !isWrappedParagraph(group, lines, candidate),
  );
  if (groups.length === 0) return null;

  const levels = rankStyles(groups, pages.length > 1);
  const headingAt = new Map<number, string>();
  const headingLineOrders = new Set<number>();
  for (const group of groups) {
    headingAt.set(group.lines[0].order, `${"#".repeat(levels.get(group.style)!)} ${group.text}`);
    for (const placed of group.lines) headingLineOrders.add(placed.order);
  }

  // Table rows are grouped by page, not by block: MuPDF emits a table's rows as separate
  // blocks, so per-block detection could never form a run of two. The key is the page only;
  // findTableRows still bounds a run to consecutive, column-aligned lines within it.
  const rowByOrder = new Map<number, string>();
  const pageLinesForTables = new Map<number, PlacedLine[]>();
  for (const placed of lines) {
    const list = pageLinesForTables.get(placed.page) ?? [];
    list.push(placed);
    pageLinesForTables.set(placed.page, list);
  }
  for (const [pageNumber, placedLines] of pageLinesForTables) {
    const pageWidth = pages[pageNumber]?.width ?? 612;
    for (const [index, row] of findTableRows(placedLines.map((p) => p.line), pageWidth)) {
      rowByOrder.set(placedLines[index].order, row.cells.join(" | "));
    }
  }

  const parts: string[] = [];
  let paragraph: string[] = [];
  let currentBlock = "";
  const flush = () => {
    if (paragraph.length > 0) parts.push(paragraph.join("\n"));
    paragraph = [];
  };
  for (const placed of lines) {
    const blockId = `${placed.page}:${placed.block}`;
    if (blockId !== currentBlock) flush();
    currentBlock = blockId;
    const heading = headingAt.get(placed.order);
    if (heading) {
      flush();
      parts.push(heading);
      continue;
    }
    if (headingLineOrders.has(placed.order)) continue;
    const row = rowByOrder.get(placed.order);
    if (row) {
      paragraph.push(row);
      continue;
    }
    // A body line that would read as a Markdown heading is escaped.
    paragraph.push(/^#{1,6}\s/.test(placed.line.text) ? `\\${placed.line.text}` : placed.line.text);
  }
  flush();

  return inferStructure(parts.join("\n\n"), { inferHeadings: false });
}

/** The page text as MuPDF read it: blocks separated by blank lines, a block's lines by newlines. */
export function pagesToPlainText(pages: PdfPage[]): string {
  return pages
    .flatMap((page) => page.blocks)
    .map((block) => block.lines.map((line) => line.text).join("\n"))
    .join("\n\n");
}
