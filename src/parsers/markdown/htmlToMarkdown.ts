import * as cheerio from "cheerio";
import type { AnyNode, Element, Text } from "domhandler";

const CONTAINER_TAGS = new Set([
  "html", "body", "div", "section", "article", "main", "header", "footer", "aside", "blockquote", "figure",
]);
const BLOCK_SELECTOR = "p,div,section,article,main,header,footer,aside,blockquote,figure,ul,ol,table,h1,h2,h3,h4,h5,h6";

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Converts HTML to the normalized Markdown contract (headings, paragraphs, lists, table rows). */
export function htmlToMarkdown(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, nav").remove();
  const blocks: string[] = [];

  const renderList = (list: Element, depth: number): string[] => {
    const ordered = list.tagName.toLowerCase() === "ol";
    const lines: string[] = [];
    $(list)
      .children("li")
      .each((index, item) => {
        const own = $(item).clone();
        own.find("ul, ol").remove();
        const text = collapse(own.text());
        if (text) lines.push(`${"  ".repeat(depth)}${ordered ? `${index + 1}.` : "-"} ${text}`);
        $(item)
          .children("ul, ol")
          .each((_, nested) => {
            lines.push(...renderList(nested, depth + 1));
          });
      });
    return lines;
  };

  const renderTable = (table: Element): string[] => {
    const rows: string[] = [];
    $(table)
      .find("tr")
      .each((_, row) => {
        const cells = $(row)
          .children("td, th")
          .map((_, cell) => collapse($(cell).text()))
          .get();
        if (cells.some((cell) => cell.length > 0)) rows.push(cells.join(" | "));
      });
    return rows;
  };

  const visit = (node: AnyNode): void => {
    if (node.nodeType === 3) {
      const text = collapse((node as Text).data);
      if (text) blocks.push(text);
      return;
    }
    if (node.nodeType !== 1) return;
    const element = node as Element;
    const tag = element.tagName.toLowerCase();

    const heading = /^h([1-6])$/.exec(tag);
    if (heading) {
      const text = collapse($(element).text());
      if (text) blocks.push(`${"#".repeat(Math.min(Number(heading[1]), 3))} ${text}`);
      return;
    }
    if (tag === "ul" || tag === "ol") {
      const lines = renderList(element, 0);
      if (lines.length > 0) blocks.push(lines.join("\n"));
      return;
    }
    if (tag === "table") {
      const rows = renderTable(element);
      if (rows.length > 0) blocks.push(rows.join("\n"));
      return;
    }
    if (CONTAINER_TAGS.has(tag) && $(element).find(BLOCK_SELECTOR).length > 0) {
      element.children.forEach(visit);
      return;
    }
    const text = collapse($(element).text());
    if (text) blocks.push(text);
  };

  $("body")
    .contents()
    .each((_, node) => visit(node));

  return blocks.join("\n\n");
}
