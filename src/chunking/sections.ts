import { extractDates, type DateContext, type DateRange } from "../metadata/dates";

export type BlockKind = "heading" | "paragraph" | "listItem" | "tableRow";

export interface Block {
  kind: BlockKind;
  text: string;
  /** Heading: number of `#`. List item: indent depth. Otherwise 0. */
  level: number;
}

export interface Section {
  path: string[];
  dates: DateRange[];
  blocks: Block[];
}

export const MAX_TITLE_CHARS = 80;

const HEADING = /^(#{1,6})\s+(.*\S)\s*$/;
const LIST_ITEM = /^(\s*)(?:[-*]|\d{1,3}\.|[a-zA-Z]\.)\s+\S/;

export function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let lastWasListItem = false;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: "paragraph", text: paragraph.join(" "), level: 0 });
      paragraph = [];
    }
  };

  for (const rawLine of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.replace(/\s+$/, "");
    const trimmed = line.trim();
    if (trimmed === "") {
      flushParagraph();
      lastWasListItem = false;
      continue;
    }
    const heading = HEADING.exec(trimmed);
    if (heading) {
      flushParagraph();
      blocks.push({ kind: "heading", text: heading[2], level: heading[1].length });
      lastWasListItem = false;
      continue;
    }
    const list = LIST_ITEM.exec(line);
    if (list) {
      flushParagraph();
      blocks.push({ kind: "listItem", text: trimmed, level: Math.floor(list[1].length / 2) });
      lastWasListItem = true;
      continue;
    }
    if (trimmed.includes(" | ")) {
      flushParagraph();
      blocks.push({ kind: "tableRow", text: trimmed, level: 0 });
      lastWasListItem = false;
      continue;
    }
    if (lastWasListItem) {
      const last = blocks[blocks.length - 1];
      last.text = `${last.text} ${trimmed}`;
      continue;
    }
    paragraph.push(trimmed);
  }
  flushParagraph();
  return blocks;
}

export function renderBlock(block: Block): string {
  if (block.kind === "heading") return `${"#".repeat(block.level)} ${block.text}`;
  if (block.kind === "listItem") return `${"  ".repeat(block.level)}${block.text}`;
  return block.text;
}

function leadingText(text: string): string {
  return text.length > MAX_TITLE_CHARS ? text.slice(0, MAX_TITLE_CHARS).trimEnd() : text;
}

/**
 * Splits Markdown into sections: a heading and its content until the next
 * heading of the same or higher level, or a top-level list item until the
 * next top-level list item or heading. A section's dates come from its
 * heading (or list item) text, else the first content block of a heading
 * section, else its parent heading; inheritance ends with the section.
 */
export function buildSections(markdown: string, context: DateContext, withDates = true): Section[] {
  const datesOf = (text: string): DateRange[] => (withDates ? extractDates(leadingText(text), context) : []);
  const sections: Section[] = [];
  const headingStack: Array<{ level: number; title: string; dates: DateRange[] }> = [];
  const state: { current: Section | null; isHeading: boolean; hasOwnDates: boolean } = {
    current: null,
    isHeading: false,
    hasOwnDates: false,
  };

  const inheritedDates = (): DateRange[] =>
    headingStack.length > 0 ? headingStack[headingStack.length - 1].dates : [];

  const startSection = (section: Section, isHeading: boolean, hasOwnDates: boolean) => {
    if (state.current && state.current.blocks.length > 0) sections.push(state.current);
    state.current = section;
    state.isHeading = isHeading;
    state.hasOwnDates = hasOwnDates;
  };

  for (const block of parseBlocks(markdown)) {
    if (block.kind === "heading") {
      while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= block.level) {
        headingStack.pop();
      }
      const own = datesOf(block.text);
      const dates = own.length > 0 ? own : inheritedDates();
      headingStack.push({ level: block.level, title: block.text, dates });
      startSection({ path: headingStack.map((h) => h.title), dates, blocks: [block] }, true, own.length > 0);
      continue;
    }

    if (block.kind === "listItem" && block.level === 0) {
      const own = datesOf(block.text);
      startSection(
        {
          path: [...headingStack.map((h) => h.title), leadingText(block.text)],
          dates: own.length > 0 ? own : inheritedDates(),
          blocks: [block],
        },
        false,
        true,
      );
      continue;
    }

    if (!state.current) {
      startSection({ path: [], dates: [], blocks: [] }, false, false);
    }
    const current = state.current!;
    if (state.isHeading && !state.hasOwnDates && current.blocks.length === 1) {
      const own = datesOf(block.text);
      if (own.length > 0) {
        current.dates = own;
        headingStack[headingStack.length - 1].dates = own;
        state.hasOwnDates = true;
      }
    }
    current.blocks.push(block);
  }

  if (state.current && state.current.blocks.length > 0) sections.push(state.current);
  return sections;
}
