import * as fs from "fs";
import * as path from "path";
import JSZip from "jszip";
import { extractImagesFromZip, loadZip, type EmbeddedImage } from "./embeddedImages";

function cleanText(text: string): string {
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/**
 * Extracts every <a:t> run from a slide XML string, in document order.
 * <a:t> is the DrawingML "text run" element - it holds the literal visible
 * text inside a text box, table cell, or shape. This is how PowerPoint
 * itself stores all typed text, so this is lossless (no OCR needed).
 */
function extractTextRuns(xml: string): string[] {
  const runs: string[] = [];
  const regex = /<a:t>([\s\S]*?)<\/a:t>/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    const decoded = decodeXmlEntities(match[1]);
    if (decoded.length > 0) runs.push(decoded);
  }
  return runs;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * Groups consecutive <a:t> runs that belong to the same paragraph (<a:p>) so
 * words in one sentence aren't silently mashed into the next sentence with
 * no space. PowerPoint often splits a single sentence across multiple runs
 * (e.g. for mixed formatting), so runs within a paragraph are joined directly,
 * with a newline inserted between paragraphs.
 */
function extractParagraphs(xml: string): string[] {
  const paragraphs: string[] = [];
  const paraRegex = /<a:p>([\s\S]*?)<\/a:p>/g;
  let paraMatch: RegExpExecArray | null;
  while ((paraMatch = paraRegex.exec(xml)) !== null) {
    const runs = extractTextRuns(paraMatch[1]);
    const joined = runs.join("").trim();
    if (joined.length > 0) paragraphs.push(joined);
  }
  return paragraphs;
}

/**
 * Extracts each row of an <a:tbl> as one "cell | cell | cell" line, so table
 * row/column structure survives instead of cells flattening into a run of
 * indistinguishable paragraphs.
 */
function extractTableRows(tableXml: string): string[] {
  const rows: string[] = [];
  const rowRegex = /<a:tr\b[^>]*>([\s\S]*?)<\/a:tr>/g;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(tableXml)) !== null) {
    const cells: string[] = [];
    const cellRegex = /<a:tc\b[^>]*>([\s\S]*?)<\/a:tc>/g;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      cells.push(extractParagraphs(cellMatch[1]).join(" ").trim());
    }
    if (cells.some((cell) => cell.length > 0)) {
      rows.push(cells.join(" | "));
    }
  }
  return rows;
}

/**
 * Extracts every text block from a slide/notes XML string, in document
 * order. <a:tbl> tables are handled separately from `extractParagraphs` so
 * each row becomes its own line - without this split, table cell paragraphs
 * would be picked up by the generic <a:p> scan too, losing which cells
 * belonged to the same row.
 */
function extractContentBlocks(xml: string): string[] {
  const blocks: string[] = [];
  const tableRegex = /<a:tbl>([\s\S]*?)<\/a:tbl>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = tableRegex.exec(xml)) !== null) {
    blocks.push(...extractParagraphs(xml.slice(lastIndex, match.index)));
    blocks.push(...extractTableRows(match[1]));
    lastIndex = tableRegex.lastIndex;
  }
  blocks.push(...extractParagraphs(xml.slice(lastIndex)));
  return blocks;
}

interface RelationshipEntry {
  id: string;
  type: string;
  target: string;
}

function parseRelationships(xml: string): RelationshipEntry[] {
  const entries: RelationshipEntry[] = [];
  const relRegex = /<Relationship\b[^>]*\/>/g;
  let match: RegExpExecArray | null;
  while ((match = relRegex.exec(xml)) !== null) {
    const tag = match[0];
    const id = tag.match(/\bId="([^"]+)"/)?.[1];
    const type = tag.match(/\bType="([^"]+)"/)?.[1];
    const target = tag.match(/\bTarget="([^"]+)"/)?.[1];
    if (id && type && target) {
      entries.push({ id, type, target });
    }
  }
  return entries;
}

/** Resolves a relationship Target against the directory that owns the .rels file referencing it. */
function resolveRelativeTarget(baseDir: string, target: string): string {
  if (target.startsWith("/")) {
    return target.slice(1);
  }
  return path.posix.normalize(`${baseDir}/${target}`);
}

function slideRelsPath(slidePath: string): string {
  return `${path.posix.dirname(slidePath)}/_rels/${path.posix.basename(slidePath)}.rels`;
}

function slideNumberFromFilename(slidePath: string): number {
  return parseInt(slidePath.match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10);
}

/**
 * Returns slide part paths (e.g. "ppt/slides/slide3.xml") in actual
 * presentation display order, resolved from ppt/presentation.xml's
 * <p:sldIdLst> via ppt/_rels/presentation.xml.rels.
 *
 * The numeric suffix on a slide's filename reflects creation order, not
 * display order - PowerPoint does not rename slide parts when slides are
 * reordered, added, or deleted - so sorting by filename silently misorders
 * any deck that has been reordered after its slides were first created.
 * Falls back to filename sorting only if presentation.xml/rels can't be
 * read (e.g. a hand-built or unusual package).
 */
async function getOrderedSlidePaths(zip: JSZip): Promise<string[]> {
  const presentationFile = zip.files["ppt/presentation.xml"];
  const relsFile = zip.files["ppt/_rels/presentation.xml.rels"];

  if (presentationFile && relsFile) {
    const [presentationXml, relsXml] = await Promise.all([
      presentationFile.async("text"),
      relsFile.async("text"),
    ]);

    const relTargetById = new Map(parseRelationships(relsXml).map((r) => [r.id, r.target]));
    const sldIdListMatch = presentationXml.match(/<p:sldIdLst>([\s\S]*?)<\/p:sldIdLst>/);

    if (sldIdListMatch) {
      const idRegex = /<p:sldId\b[^>]*\br:id="([^"]+)"/g;
      const orderedPaths: string[] = [];
      let match: RegExpExecArray | null;
      while ((match = idRegex.exec(sldIdListMatch[1])) !== null) {
        const target = relTargetById.get(match[1]);
        if (!target) continue;

        const slidePath = resolveRelativeTarget("ppt", target);
        if (zip.files[slidePath] && !zip.files[slidePath].dir) {
          orderedPaths.push(slidePath);
        }
      }

      if (orderedPaths.length > 0) {
        return orderedPaths;
      }
    }
  }

  return Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort((a, b) => slideNumberFromFilename(a) - slideNumberFromFilename(b));
}

/**
 * Finds the notes-slide part actually linked from this slide's own
 * relationship file (Type ending in ".../relationships/notesSlide"), rather
 * than assuming notesSlideN.xml pairs with slideN.xml by number - that
 * pairing is not guaranteed once slides have been added, removed, or
 * reordered.
 */
async function getNotesPathForSlide(zip: JSZip, slidePath: string): Promise<string | undefined> {
  const relsFile = zip.files[slideRelsPath(slidePath)];
  if (!relsFile) return undefined;

  const relsXml = await relsFile.async("text");
  const notesRel = parseRelationships(relsXml).find((r) => r.type.endsWith("/notesSlide"));
  if (!notesRel) return undefined;

  const notesPath = resolveRelativeTarget(path.posix.dirname(slidePath), notesRel.target);
  return zip.files[notesPath] && !zip.files[notesPath].dir ? notesPath : undefined;
}

export interface ParsePptxOptions {
  includeSpeakerNotes?: boolean;
}

/**
 * Parse PPTX files and extract slide (and optionally speaker notes) text, in
 * actual presentation display order.
 */
export async function parsePPTX(
  filePath: string,
  options: ParsePptxOptions = {},
): Promise<string> {
  const { includeSpeakerNotes = true } = options;

  const fileBuffer = await fs.promises.readFile(filePath);
  const zip = await JSZip.loadAsync(fileBuffer);

  const slidePaths = await getOrderedSlidePaths(zip);
  if (slidePaths.length === 0) {
    return "";
  }

  const parts: string[] = [];

  for (let i = 0; i < slidePaths.length; i++) {
    const slidePath = slidePaths[i];
    const displayNumber = i + 1;
    const xml = await zip.files[slidePath].async("text");
    const contentBlocks = extractContentBlocks(xml);

    if (contentBlocks.length === 0 && !includeSpeakerNotes) continue;

    parts.push(`[Slide ${displayNumber}]`);
    parts.push(...contentBlocks);

    if (includeSpeakerNotes) {
      const notesPath = await getNotesPathForSlide(zip, slidePath);
      if (notesPath) {
        const notesXml = await zip.files[notesPath].async("text");
        const notesParagraphs = extractContentBlocks(notesXml);
        if (notesParagraphs.length > 0) {
          parts.push(`[Slide ${displayNumber} notes]`);
          parts.push(...notesParagraphs);
        }
      }
    }
  }

  return cleanText(parts.join("\n"));
}

/**
 * Extracts every embedded raster image from a PPTX, tagged with the slide it
 * appears on (by display order, matching parsePPTX's numbering). Images are
 * not read or interpreted here - this is holding code for a future VLM
 * captioning step; see `describeEmbeddedImages` in `./embeddedImages`.
 */
export async function extractPptxImages(filePath: string): Promise<EmbeddedImage[]> {
  const zip = await loadZip(filePath);

  const slidePaths = await getOrderedSlidePaths(zip);
  const slideForImage = new Map<string, number>();

  for (let i = 0; i < slidePaths.length; i++) {
    const slidePath = slidePaths[i];
    const displayNumber = i + 1;
    const relsFile = zip.files[slideRelsPath(slidePath)];
    if (!relsFile) continue;

    const relsXml = await relsFile.async("text");
    for (const rel of parseRelationships(relsXml)) {
      if (!rel.type.endsWith("/image")) continue;
      const archivePath = resolveRelativeTarget(path.posix.dirname(slidePath), rel.target);
      slideForImage.set(archivePath, displayNumber);
    }
  }

  return extractImagesFromZip(zip, "ppt/media/", (archivePath) => {
    const slideNum = slideForImage.get(archivePath);
    return slideNum ? `Slide ${slideNum}` : undefined;
  });
}
