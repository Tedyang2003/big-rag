import mammoth from "mammoth";
import * as cheerio from "cheerio";
import { extractImagesFromZip, loadZip, type EmbeddedImage } from "./embeddedImages";

function cleanBlockText(text: string): string {
  return text.replace(/[ \t]+/g, " ").trim();
}

/**
 * Renders one HTML <table> as plain text with its row/column structure
 * intact: one line per row, cells joined with " | ". Without this, table
 * cells would just flatten into a run of same-looking paragraphs with no way
 * to tell which cells belonged to the same row.
 */
function renderTable($: cheerio.CheerioAPI, table: ReturnType<typeof $>): string {
  const rows: string[] = [];
  table.find("tr").each((_, rowEl) => {
    const cells = $(rowEl)
      .find("td, th")
      .map((_, cellEl) => cleanBlockText($(cellEl).text()))
      .get();
    if (cells.some((cell) => cell.length > 0)) {
      rows.push(cells.join(" | "));
    }
  });
  return rows.join("\n");
}

/**
 * Parse DOCX files and extract text, preserving paragraph breaks and table
 * row/column structure. Uses mammoth's HTML conversion (not extractRawText)
 * specifically because extractRawText flattens table cells into a run of
 * indistinguishable paragraphs with no row boundaries.
 */
export async function parseDOCX(filePath: string): Promise<string> {
  const { value: html } = await mammoth.convertToHtml({ path: filePath });
  const $ = cheerio.load(html);

  const blocks: string[] = [];
  $("body")
    .children()
    .each((_, el) => {
      const node = $(el);
      const block =
        el.type === "tag" && el.name === "table" ? renderTable($, node) : cleanBlockText(node.text());
      if (block.length > 0) {
        blocks.push(block);
      }
    });

  return blocks.join("\n\n");
}

/**
 * Extracts every embedded raster image from a DOCX's `word/media/` folder.
 * Images are not read or interpreted here - this is holding code for a
 * future VLM captioning step; see `describeEmbeddedImages` in
 * `./embeddedImages`. Unlike PPTX slides, mapping an image back to the
 * paragraph it appears in requires parsing `<w:drawing>` anchors in
 * document.xml, which is left for whenever that mapping is actually needed.
 */
export async function extractDocxImages(filePath: string): Promise<EmbeddedImage[]> {
  const zip = await loadZip(filePath);
  return extractImagesFromZip(zip, "word/media/");
}
