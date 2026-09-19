import { inferStructure } from "./inferStructure";

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
}

export interface PdfBlock {
  lines: PdfLine[];
}

export interface PdfPage {
  height: number;
  blocks: PdfBlock[];
}

const MAX_HEADING_WORDS = 12;
const FURNITURE_BAND = 0.08;
const FURNITURE_PAGE_SHARE = 0.5;
const FURNITURE_MIN_PAGES = 3;
const MAX_HEADING_STYLE_SHARE = 0.15;
const SAME_ROW_OVERLAP = 0.5;
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

/** Pass 2: drop page numbers, and headers and footers repeated on at least half the pages. */
function removeFurniture(pages: PdfPage[]): PlacedLine[] {

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

/** The style covering the most words. */
function bodyStyleOf(lines: PlacedLine[]): string {
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
  return best;
}

/** Max bottom minus min top over each block's kept lines, keyed by "page:block". */
function blockHeightsOf(lines: PlacedLine[]): Map<string, number> {
  const bounds = new Map<string, { top: number; bottom: number }>();
  for (const { line, page, block } of lines) {
    const key = `${page}:${block}`;
    const existing = bounds.get(key);
    if (!existing) {
      bounds.set(key, { top: line.box[1], bottom: line.box[3] });
    } else {
      existing.top = Math.min(existing.top, line.box[1]);
      existing.bottom = Math.max(existing.bottom, line.box[3]);
    }
  }
  const heights = new Map<string, number>();
  for (const [key, { top, bottom }] of bounds) heights.set(key, bottom - top);
  return heights;
}

/**
 * Guard 1: a heading has its row to itself; table cells and row labels share theirs.
 * Overlap from another block is only counted when that block is at most 2 line-heights
 * tall, so flowing prose in the other column of a two-column page is ignored.
 */
function sharesRow(target: PlacedLine, pageLines: PlacedLine[], blockHeights: Map<string, number>): boolean {
  const [, top, , bottom] = target.line.box;
  const height = Math.max(bottom - top, 1);
  return pageLines.some((other) => {
    if (other === target) return false;
    const otherBlockHeight = blockHeights.get(`${other.page}:${other.block}`) ?? 0;
    if (otherBlockHeight > height * 2) return false;
    const overlap = Math.min(bottom, other.line.box[3]) - Math.max(top, other.line.box[1]);
    return overlap > height * SAME_ROW_OVERLAP;
  });
}

/** Pass 3: whole-line, non-body, short lines that stand alone on their row. */
function isCandidate(
  placed: PlacedLine,
  bodyStyle: string,
  pageLines: PlacedLine[],
  blockHeights: Map<string, number>,
): boolean {
  const { line } = placed;
  if (line.mixed || styleKey(line) === bodyStyle) return false;
  if (wordCount(line.text) > MAX_HEADING_WORDS) return false;
  if (!/\p{L}/u.test(line.text) || /[.,;:]$/.test(line.text)) return false;
  return !sharesRow(placed, pageLines, blockHeights);
}

/**
 * Joins consecutive candidate lines of one style on one page into a run, but only
 * when the next line starts no more than one line height below the previous one;
 * drops joins over 12 words.
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
      const previousHeight = previous.line.box[3] - previous.line.box[1];
      const gap = placed.line.box[1] - previous.line.box[3];
      const adjacent =
        previous.page === placed.page && styleKey(previous.line) === styleKey(placed.line) && gap <= previousHeight;
      if (!adjacent) close();
    }
    current.push(placed);
  });
  close();
  return groups;
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
  const blockHeights = blockHeightsOf(lines);
  const candidate = lines.map((placed) => isCandidate(placed, bodyStyle, linesByPage.get(placed.page)!, blockHeights));

  // Pass 4 (guard 2): a style on too many candidate lines (including joins later
  // dropped for exceeding 12 words) is emphasis, not a heading level.
  const allGroups = groupCandidates(lines, candidate);
  const linesPerStyle = new Map<string, number>();
  lines.forEach((placed, i) => {
    if (!candidate[i]) return;
    const key = styleKey(placed.line);
    linesPerStyle.set(key, (linesPerStyle.get(key) ?? 0) + 1);
  });
  const groups = allGroups.filter(
    (group) => (linesPerStyle.get(group.style) ?? 0) <= lines.length * MAX_HEADING_STYLE_SHARE,
  );
  if (groups.length === 0) return null;

  const levels = rankStyles(groups, pages.length > 1);
  const headingAt = new Map<number, string>();
  const headingLineOrders = new Set<number>();
  for (const group of groups) {
    headingAt.set(group.lines[0].order, `${"#".repeat(levels.get(group.style)!)} ${group.text}`);
    for (const placed of group.lines) headingLineOrders.add(placed.order);
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
    paragraph.push(placed.line.text);
  }
  flush();

  return inferStructure(parts.join("\n\n"), { inferHeadings: false });
}
