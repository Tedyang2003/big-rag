import { type CountTokens } from "../utils/textChunker";
import { dedupeRanges, extractDates, formatDateRange, type DateContext, type DateRange } from "../metadata/dates";
import { buildSections, renderBlock, type Section } from "./sections";

export interface StructuredChunk {
  text: string;
  contextHeader: string;
  sectionPath: string;
  dates: DateRange[];
  startIndex: number;
  endIndex: number;
}

export interface StructuredChunkOptions {
  fileName: string;
  postedDate: DateRange;
  chunkSize: number;
  chunkOverlap: number;
  countTokens: CountTokens;
  dateContext: DateContext;
  /** Set to false to skip all date extraction (fallback when extraction fails). */
  extractDates?: boolean;
}

interface Token {
  word: string;
  /** Whitespace after the word: newline at the end of a block, otherwise a space. */
  separator: string;
}

interface SectionTokens {
  section: Section;
  tokens: Token[];
  offset: number;
  blockEnds: number[];
  headingEnd: number;
  headingEnds: number[];
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function buildContextHeader(
  fileName: string,
  postedDate: DateRange,
  sectionPath: string,
  dates: DateRange[],
): string {
  const parts = [`File: ${fileName}`, `Posted: ${formatDateRange(postedDate)}`];
  if (sectionPath) parts.push(`Section: ${sectionPath}`);
  if (dates.length > 0) parts.push(`Dates: ${dates.map(formatDateRange).join(", ")}`);
  return `[${parts.join(" | ")}]`;
}

/** A heading with nothing under it is carried into the next section so a heading never ends a chunk. */
function mergeHeadingOnlySections(sections: Section[]): Section[] {
  const merged: Section[] = [];
  let pending: Section | null = null;
  for (const section of sections) {
    const headingOnly = section.blocks.length === 1 && section.blocks[0].kind === "heading";
    if (headingOnly) {
      pending = pending ? { ...section, blocks: [...pending.blocks, ...section.blocks] } : section;
      continue;
    }
    merged.push(pending ? { ...section, blocks: [...pending.blocks, ...section.blocks] } : section);
    pending = null;
  }
  if (pending) merged.push(pending);
  return merged;
}

function tokenizeSection(section: Section, offset: number): SectionTokens {
  const tokens: Token[] = [];
  const blockEnds: number[] = [];
  const headingEnds: number[] = [];
  let headingEnd = 0;
  let inLeadingHeadingRun = true;
  section.blocks.forEach((block) => {
    const blockWords = renderBlock(block).split(/\s+/).filter(Boolean);
    blockWords.forEach((word, i) => tokens.push({ word, separator: i === blockWords.length - 1 ? "\n" : " " }));
    if (block.kind === "heading") {
      // Every heading's end is tracked separately so it never becomes a split
      // boundary; the leading run of consecutive headings also advances
      // headingEnd so the first piece is forced past all of them at once.
      headingEnds.push(tokens.length);
      if (inLeadingHeadingRun) headingEnd = tokens.length;
    } else {
      inLeadingHeadingRun = false;
      blockEnds.push(tokens.length);
    }
  });
  return { section, tokens, offset, blockEnds, headingEnd, headingEnds };
}

function tokensToText(tokens: Token[]): string {
  return tokens.map((token, i) => (i === tokens.length - 1 ? token.word : token.word + token.separator)).join("");
}

function sentenceEnds(tokens: Token[]): number[] {
  const ends: number[] = [];
  tokens.forEach((token, i) => {
    if (/[.!?]["')\]]*$/.test(token.word)) ends.push(i + 1);
  });
  return ends;
}

function lastBoundary(bounds: number[], lowerExclusive: number, upperInclusive: number): number | undefined {
  let best: number | undefined;
  for (const bound of bounds) {
    if (bound > lowerExclusive && bound <= upperInclusive) best = bound;
  }
  return best;
}

export async function chunkStructured(markdown: string, options: StructuredChunkOptions): Promise<StructuredChunk[]> {
  const withDates = options.extractDates !== false;
  const sections = mergeHeadingOnlySections(buildSections(markdown, options.dateContext, withDates));
  if (sections.length === 0) return [];

  const totalWords = wordCount(markdown);
  const totalTokens = await options.countTokens(markdown);
  const tokensPerWord = totalTokens > 0 && totalWords > 0 ? totalTokens / totalWords : 1;
  const budgetWords = Math.max(1, Math.round(options.chunkSize / tokensPerWord));
  const overlapWords = Math.max(0, Math.min(budgetWords - 1, Math.round(options.chunkOverlap / tokensPerWord)));

  const textDates = (text: string): DateRange[] => (withDates ? extractDates(text, options.dateContext) : []);

  const describe = (group: Section[], text: string) => {
    const [first, ...rest] = group;
    const firstPath = first.path.join(" > ");
    const extraTitles = rest.map((s) => s.path[s.path.length - 1]).filter((title): title is string => Boolean(title));
    const sectionPath = [firstPath, ...extraTitles].filter(Boolean).join(" ; ");
    const dates = dedupeRanges([...group.flatMap((s) => s.dates), ...textDates(text)]);
    const contextHeader = buildContextHeader(options.fileName, options.postedDate, sectionPath, dates);
    return { sectionPath, dates, contextHeader };
  };

  const chunks: StructuredChunk[] = [];
  const emit = (group: Section[], tokens: Token[], startIndex: number) => {
    const text = tokensToText(tokens);
    const { sectionPath, dates, contextHeader } = describe(group, text);
    chunks.push({ text, contextHeader, sectionPath, dates, startIndex, endIndex: startIndex + tokens.length });
  };

  const fits = (items: SectionTokens[]): boolean => {
    const tokens = items.flatMap((item) => item.tokens);
    const { contextHeader } = describe(
      items.map((item) => item.section),
      tokensToText(tokens),
    );
    return wordCount(contextHeader) + tokens.length <= budgetWords;
  };

  const splitOversized = (item: SectionTokens) => {
    const wholeText = tokensToText(item.tokens);
    const worstHeader = describe([item.section], wholeText).contextHeader;
    // A header can itself approach or exceed the budget; floor the piece budget
    // at half the budget instead of shrinking pieces to nothing. Chunks whose
    // header is unusually large may then exceed the nominal token budget.
    const pieceBudget = Math.max(Math.ceil(budgetWords / 2), budgetWords - wordCount(worstHeader));
    const sentences = sentenceEnds(item.tokens);
    const total = item.tokens.length;
    const headingEndSet = new Set(item.headingEnds);

    const avoidHeadingEnd = (end: number, lower: number): number => {
      if (end >= total || !headingEndSet.has(end)) return end;
      const previous = lastBoundary(item.blockEnds, lower, end - 1) ?? lastBoundary(sentences, lower, end - 1);
      return previous !== undefined && previous > lower ? previous : end + 1;
    };

    let start = 0;
    while (start < total) {
      const limit = Math.min(total, start + pieceBudget);
      const lower = start === 0 ? Math.max(start, item.headingEnd) : start;
      let end = limit;
      if (limit < total) {
        end = lastBoundary(item.blockEnds, lower, limit) ?? lastBoundary(sentences, lower, limit) ?? limit;
      }
      if (start === 0 && end <= item.headingEnd) {
        end = Math.min(total, item.headingEnd + 1);
      }
      end = avoidHeadingEnd(end, lower);
      emit([item.section], item.tokens.slice(start, end), item.offset + start);
      if (end >= total) break;
      start = Math.max(start + 1, end - overlapWords);
    }
  };

  let packed: SectionTokens[] = [];
  const flushPacked = () => {
    if (packed.length === 0) return;
    emit(
      packed.map((item) => item.section),
      packed.flatMap((item) => item.tokens),
      packed[0].offset,
    );
    packed = [];
  };

  let offset = 0;
  for (const section of sections) {
    const item = tokenizeSection(section, offset);
    offset += item.tokens.length;

    if (packed.length > 0) {
      const candidate = [...packed, item];
      if (fits(candidate)) {
        packed = candidate;
        continue;
      }
      flushPacked();
    }

    if (fits([item])) {
      packed = [item];
      continue;
    }
    splitOversized(item);
  }
  flushPacked();

  return chunks;
}
