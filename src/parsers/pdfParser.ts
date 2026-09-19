import { type LMStudioClient } from "@lmstudio/sdk";
import * as fs from "fs";
import * as path from "path";
import pdfParse from "pdf-parse";
import { createWorker } from "tesseract.js";
import { inferStructure } from "./markdown/inferStructure";
import { formatOcrPage } from "./markdown/ocrPages";
import { styleKey, styledPagesToMarkdown, type PdfBlock, type PdfLine, type PdfPage } from "./markdown/pdfStyles";

// mupdf is an ESM module with top-level await — it cannot be require()'d.
// We load it lazily via dynamic import() so the CJS host doesn't choke on it.
let cachedMupdf: typeof import("mupdf") | null = null;
async function getMupdf() {
  if (!cachedMupdf) {
    cachedMupdf = await import("mupdf");
  }
  return cachedMupdf;
}

type MupdfDocument = ReturnType<Awaited<ReturnType<typeof getMupdf>>["Document"]["openDocument"]>;

const BOLD_FONT = /bold|black|heavy|semibold|demi/i;
const ITALIC_FONT = /italic|oblique/i;

/** One page's lines with the style most of each line's characters use, for heading detection. */
function readStyledPage(doc: MupdfDocument, pageNumber: number): PdfPage {
  const page = doc.loadPage(pageNumber);
  try {
    const bounds = page.getBounds();
    const stext = page.toStructuredText("preserve-whitespace");
    const blocks: PdfBlock[] = [];
    let lines: PdfLine[] = [];
    let chars = "";
    let box: [number, number, number, number] = [0, 0, 0, 0];
    let styles = new Map<string, { size: number; bold: boolean; italic: boolean; count: number }>();
    // walk() hands over a new Font wrapper per character, but its pointer is stable, so the
    // name and flags are looked up only when the font changes (about 4k lookups instead of 790k
    // on a 236-page filing).
    let lastFontPointer: unknown = null;
    let lastFontFlags = { bold: false, italic: false };
    try {
      stext.walk({
        beginTextBlock() {
          lines = [];
        },
        beginLine(bbox) {
          chars = "";
          box = [bbox[0], bbox[1] - bounds[1], bbox[2], bbox[3] - bounds[1]];
          styles = new Map();
        },
        onChar(c, _origin, font, size) {
          chars += c;
          if (!c.trim()) return;
          if (font.pointer !== lastFontPointer) {
            const name = font.getName();
            lastFontPointer = font.pointer;
            lastFontFlags = {
              bold: font.isBold() || BOLD_FONT.test(name),
              italic: font.isItalic() || ITALIC_FONT.test(name),
            };
          }
          const style = { size: Math.round(size * 2) / 2, ...lastFontFlags };
          const key = styleKey(style);
          const entry = styles.get(key) ?? { ...style, count: 0 };
          entry.count++;
          styles.set(key, entry);
        },
        endLine() {
          const text = chars.replace(/\s+/g, " ").trim();
          if (!text || styles.size === 0) return;
          const dominant = [...styles.values()].sort((a, b) => b.count - a.count)[0];
          lines.push({
            text,
            size: dominant.size,
            bold: dominant.bold,
            italic: dominant.italic,
            mixed: styles.size > 1,
            box,
          });
        },
        endTextBlock() {
          if (lines.length > 0) blocks.push({ lines });
        },
      });
    } finally {
      stext.destroy();
    }
    return { height: bounds[3] - bounds[1], blocks };
  } finally {
    page.destroy();
  }
}

async function tryMupdfStyledText(filePath: string): Promise<StageResult> {
  const fileName = path.basename(filePath);
  let doc: MupdfDocument | null = null;
  try {
    const mupdf = await getMupdf();
    doc = mupdf.Document.openDocument(await fs.promises.readFile(filePath), "application/pdf");
    const pages: PdfPage[] = [];
    for (let pageNumber = 0; pageNumber < doc.countPages(); pageNumber++) {
      pages.push(readStyledPage(doc, pageNumber));
    }
    if (pages.every((page) => page.blocks.length === 0)) {
      return { success: false, reason: "pdf.mupdf-empty", details: "no text layer" };
    }
    const markdown = styledPagesToMarkdown(pages);
    if (markdown === null) {
      console.log(`[PDF Parser] (MuPDF) No heading styles found in ${fileName}; trying pdf-parse`);
      return { success: false, reason: "pdf.mupdf-no-headings" };
    }
    if (markdown.length < MIN_TEXT_LENGTH) {
      return { success: false, reason: "pdf.mupdf-empty", details: `length=${markdown.length}` };
    }
    console.log(`[PDF Parser] (MuPDF) Extracted styled text from ${fileName}`);
    return { success: true, text: markdown, stage: "mupdf" };
  } catch (error) {
    const summary = summarizeParserError(error);
    console.warn(`[PDF Parser] MuPDF couldn't read ${fileName} (${summary}); trying pdf-parse`);
    return { success: false, reason: "pdf.mupdf-error", details: summary };
  } finally {
    doc?.destroy();
  }
}

export async function countPdfPages(filePath: string): Promise<number> {
  const mupdf = await getMupdf();
  const doc = mupdf.Document.openDocument(await fs.promises.readFile(filePath), "application/pdf");
  try {
    return doc.countPages();
  } finally {
    doc.destroy();
  }
}

const MIN_TEXT_LENGTH = 50;
const OCR_MAX_PAGES = 50;
const OCR_DEFAULT_SCALE = 2; // 144 dpi, good balance of OCR accuracy vs memory
const OCR_MIN_SCALE = 0.75; // floor before we give up on a page instead of risking a native crash
const OCR_MAX_PIXMAP_PIXELS = 50_000_000; // ~7000x7000; prevents leptonica pixdata_malloc crashes

export type PdfFailureReason =
  | "pdf.mupdf-error"
  | "pdf.mupdf-empty"
  | "pdf.mupdf-no-headings"
  | "pdf.lmstudio-error"
  | "pdf.lmstudio-empty"
  | "pdf.pdfparse-error"
  | "pdf.pdfparse-empty"
  | "pdf.ocr-disabled"
  | "pdf.ocr-error"
  | "pdf.ocr-render-error"
  | "pdf.ocr-empty";

type PdfParseStage = "mupdf" | "pdf-parse" | "ocr" | "lmstudio";

interface PdfParserSuccess {
  success: true;
  text: string;
  stage: PdfParseStage;
}

export interface PdfParserFailure {
  success: false;
  reason: PdfFailureReason;
  details?: string;
}

export type PdfParserResult = PdfParserSuccess | PdfParserFailure;

type StageResult = PdfParserSuccess | PdfParserFailure;

const MAX_ERROR_SUMMARY_LENGTH = 160;

/**
 * One readable line for a parser error. LM Studio formats its errors as a box with a
 * stack trace inside, which is noise when a later parser is about to recover the file.
 */
export function summarizeParserError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const withoutStack = raw.split(/<\/>\s*STACK TRACE|\n\s*at\s/)[0];
  const text = withoutStack
    .replace(/[\u2500-\u257F]/g, " ")
    .replace(/^\s*Error\b/, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "unknown error";
  return text.length > MAX_ERROR_SUMMARY_LENGTH
    ? `${text.slice(0, MAX_ERROR_SUMMARY_LENGTH - 1)}…`
    : text;
}

async function tryLmStudioParser(filePath: string, client: LMStudioClient): Promise<StageResult> {
  const maxRetries = 2;
  const fileName = path.basename(filePath);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const fileHandle = await client.files.prepareFile(filePath);
      const result = await client.files.parseDocument(fileHandle, {
        onProgress: (progress) => {
          if (progress === 0 || progress === 1) {
            console.log(
              `[PDF Parser] (LM Studio) Processing ${fileName}: ${(progress * 100).toFixed(0)}%`,
            );
          }
        },
      });

      const cleaned = inferStructure(result.content);
      if (cleaned.length >= MIN_TEXT_LENGTH) {
        return { success: true, text: cleaned, stage: "lmstudio" };
      }

      console.log(
        `[PDF Parser] (LM Studio) Parsed but got very little text from ${fileName} (length=${cleaned.length})`,
      );
      return {
        success: false,
        reason: "pdf.lmstudio-empty",
        details: `length=${cleaned.length}`,
      };
    } catch (error) {
      const isWebSocketError =
        error instanceof Error &&
        (error.message.includes("WebSocket") || error.message.includes("connection closed"));

      if (isWebSocketError && attempt < maxRetries) {
        console.warn(
          `[PDF Parser] (LM Studio) WebSocket error on ${fileName}, retrying (${attempt}/${maxRetries})...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        continue;
      }

      const summary = summarizeParserError(error);
      console.warn(`[PDF Parser] LM Studio parser couldn't read ${fileName} (${summary})`);
      return {
        success: false,
        reason: "pdf.lmstudio-error",
        details: summary,
      };
    }
  }

  return {
    success: false,
    reason: "pdf.lmstudio-error",
    details: "Exceeded retry attempts",
  };
}

async function tryPdfParse(filePath: string): Promise<StageResult> {
  const fileName = path.basename(filePath);
  try {
    const buffer = await fs.promises.readFile(filePath);
    const result = await pdfParse(buffer);
    const cleaned = inferStructure(result.text || "");

    if (cleaned.length >= MIN_TEXT_LENGTH) {
      console.log(`[PDF Parser] (pdf-parse) Successfully extracted text from ${fileName}`);
      return { success: true, text: cleaned, stage: "pdf-parse" };
    }

    console.log(
      `[PDF Parser] (pdf-parse) Very little or no text extracted from ${fileName} (length=${cleaned.length})`,
    );
    return {
      success: false,
      reason: "pdf.pdfparse-empty",
      details: `length=${cleaned.length}`,
    };
  } catch (error) {
    const summary = summarizeParserError(error);
    console.warn(`[PDF Parser] pdf-parse couldn't read ${fileName} (${summary}); trying the next fallback`);
    return {
      success: false,
      reason: "pdf.pdfparse-error",
      details: summary,
    };
  }
}

/**
 * Pick the largest scale (<= desiredScale, >= OCR_MIN_SCALE, in steps of 0.25) whose
 * resulting pixmap stays within OCR_MAX_PIXMAP_PIXELS. Returns null if even the minimum
 * scale would exceed the budget (page is too large to render safely).
 */
function computeSafeOcrScale(bounds: number[], desiredScale: number): number | null {
  const width = bounds[2] - bounds[0];
  const height = bounds[3] - bounds[1];
  if (!(width > 0) || !(height > 0)) {
    return null;
  }

  for (let scale = desiredScale; scale >= OCR_MIN_SCALE; scale -= 0.25) {
    const pixels = width * scale * (height * scale);
    if (pixels <= OCR_MAX_PIXMAP_PIXELS) {
      return scale;
    }
  }

  return null;
}

async function tryOcrWithMuPdf(filePath: string): Promise<StageResult> {
  console.log("[PDF Parser] (OCR) Starting OCR fallback for", filePath);
  const fileName = filePath.split("/").pop() || filePath;

  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  let docHandle: { destroy(): void } | null = null;
  try {
    const mupdf = await getMupdf();
    const fileBuffer = await fs.promises.readFile(filePath);

    const doc = mupdf.Document.openDocument(fileBuffer, "application/pdf");
    docHandle = doc;

    const numPages = doc.countPages();
    const maxPages = Math.min(numPages, OCR_MAX_PAGES);

    console.log(
      `[PDF Parser] (OCR) Starting MuPDF OCR for ${fileName} - pages 1 to ${maxPages}`,
    );

    worker = await createWorker("eng");
    const textParts: string[] = [];
    let contentLength = 0;
    let renderErrors = 0;
    type MupdfPage = ReturnType<typeof doc.loadPage>;
    type MupdfPixmap = ReturnType<MupdfPage["toPixmap"]>;

    for (let pageNum = 0; pageNum < maxPages; pageNum++) {
      let page: MupdfPage | null = null;
      let pixmap: MupdfPixmap | null = null;
      try {
        page = doc.loadPage(pageNum);
        const bounds = page.getBounds();
        const scale = computeSafeOcrScale(bounds, OCR_DEFAULT_SCALE);

        if (scale === null) {
          renderErrors++;
          console.warn(
            `[PDF Parser] (OCR) Skipping oversized page ${pageNum + 1} of ${fileName} ` +
              `(bounds=${bounds.join(",")}) to avoid a native allocation failure`,
          );
          continue;
        }

        const matrix = mupdf.Matrix.scale(scale, scale);
        pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true);
        const pngBuffer = pixmap.asPNG();

        try {
          const { data: { text } } = await worker.recognize(Buffer.from(pngBuffer));
          const page = formatOcrPage(pageNum + 1, text || "");
          if (page) {
            textParts.push(page.markdown);
            contentLength += page.contentLength;
          }
        } catch (recognizeError) {
          renderErrors++;
          console.warn(
            `[PDF Parser] (OCR) Failed to recognize page ${pageNum + 1} of ${fileName}, recreating worker:`,
            recognizeError instanceof Error ? recognizeError.message : recognizeError,
          );
          // The worker may have crashed; try to recreate it for remaining pages
          try {
            await worker.terminate();
          } catch {
            // worker already dead, ignore
          }
          try {
            worker = await createWorker("eng");
          } catch (recreateError) {
            console.error(
              `[PDF Parser] (OCR) Failed to recreate OCR worker, aborting OCR for ${fileName}`,
            );
            worker = null;
            return {
              success: false,
              reason: "pdf.ocr-error",
              details: `Worker crashed and could not be recreated: ${
                recreateError instanceof Error ? recreateError.message : String(recreateError)
              }`,
            };
          }
        }

        if (pageNum === 0 || (pageNum + 1) % 10 === 0 || pageNum + 1 === maxPages) {
          console.log(
            `[PDF Parser] (OCR) ${fileName} - processed page ${pageNum + 1}/${maxPages} (chars=${textParts.join("\n\n").length})`,
          );
        }
      } catch (pageError) {
        renderErrors++;
        console.error(
          `[PDF Parser] (OCR) Error rendering page ${pageNum + 1} of ${fileName}:`,
          pageError,
        );
      } finally {
        pixmap?.destroy();
        page?.destroy();
      }
    }

    if (worker) {
      await worker.terminate();
      worker = null;
    }

    if (renderErrors > 0) {
      console.warn(
        `[PDF Parser] (OCR) ${fileName} had ${renderErrors}/${maxPages} page render errors`,
      );
    }

    const fullText = textParts.join("\n\n");
    if (contentLength >= MIN_TEXT_LENGTH) {
      return { success: true, text: fullText, stage: "ocr" };
    }

    if (renderErrors > 0) {
      return {
        success: false,
        reason: "pdf.ocr-render-error",
        details: `${renderErrors}/${maxPages} page render errors`,
      };
    }

    return {
      success: false,
      reason: "pdf.ocr-empty",
      details: "OCR produced insufficient text",
    };
  } catch (error) {
    console.error(`[PDF Parser] (OCR) Error during OCR:`, error);
    return {
      success: false,
      reason: "pdf.ocr-error",
      details: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (worker) {
      await worker.terminate();
    }
    docHandle?.destroy();
  }
}

export interface PdfStages {
  mupdf(filePath: string): Promise<PdfParserResult>;
  pdfParse(filePath: string): Promise<PdfParserResult>;
  ocr(filePath: string): Promise<PdfParserResult>;
  lmStudio(filePath: string, client: LMStudioClient): Promise<PdfParserResult>;
}

export const DEFAULT_PDF_STAGES: PdfStages = {
  mupdf: tryMupdfStyledText,
  pdfParse: tryPdfParse,
  ocr: tryOcrWithMuPdf,
  lmStudio: tryLmStudioParser,
};

/** MuPDF styled text, then pdf-parse, then OCR (when enabled), then the LM Studio parser as a last resort. */
export async function parsePDF(
  filePath: string,
  client: LMStudioClient,
  enableOCR: boolean,
  stages: PdfStages = DEFAULT_PDF_STAGES,
): Promise<PdfParserResult> {
  const fileName = path.basename(filePath);
  const earlierFailures: PdfParserFailure[] = [];
  const reportAllFailed = (final: PdfParserFailure): PdfParserFailure => {
    const stagesTried = [...earlierFailures, final]
      .map((failure) => `${failure.reason}${failure.details ? ` (${failure.details})` : ""}`)
      .join("; ");
    console.error(`[PDF Parser] Could not extract text from ${filePath}: ${stagesTried}`);
    return final;
  };

  const mupdfResult = await stages.mupdf(filePath);
  if (mupdfResult.success) return mupdfResult;
  earlierFailures.push(mupdfResult);

  const pdfParseResult = await stages.pdfParse(filePath);
  if (pdfParseResult.success) return pdfParseResult;
  earlierFailures.push(pdfParseResult);

  if (enableOCR) {
    console.log(`[PDF Parser] (OCR) No text extracted from ${fileName} with MuPDF or pdf-parse, attempting OCR...`);
    const ocrResult = await stages.ocr(filePath);
    if (ocrResult.success) return ocrResult;
    earlierFailures.push(ocrResult);
  } else {
    console.log(`[PDF Parser] (OCR) Enable OCR is off, skipping OCR for ${fileName}`);
    earlierFailures.push({ success: false, reason: "pdf.ocr-disabled" });
  }

  const lmStudioResult = await stages.lmStudio(filePath, client);
  return lmStudioResult.success ? lmStudioResult : reportAllFailed(lmStudioResult);
}