import mammoth from "mammoth";
import { extractImagesFromZip, loadZip, type EmbeddedImage } from "./embeddedImages";
import { htmlToMarkdown } from "./markdown/htmlToMarkdown";

/**
 * Parse DOCX files into normalized Markdown. Uses mammoth's HTML conversion
 * (not extractRawText), which keeps heading styles, lists, and table rows.
 */
export async function parseDOCX(filePath: string): Promise<string> {
  const { value: html } = await mammoth.convertToHtml({ path: filePath });
  return htmlToMarkdown(html);
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
