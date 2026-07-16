import { type LMStudioClient } from "@lmstudio/sdk";
import * as fs from "fs";
import pdfParse from "pdf-parse";
import { createWorker } from "tesseract.js";

// mupdf is an ESM module with top-level await — it cannot be require()'d.
// We load it lazily via dynamic import() so the CJS host doesn't choke on it.
let cachedMupdf: typeof import("mupdf") | null = null;
async function getMupdf() {
  if (!cachedMupdf) {
    cachedMupdf = await import("mupdf");
  }
  return cachedMupdf;
}

const MIN_TEXT_LENGTH = 50;
const OCR_MAX_PAGES = 50;
const OCR_DEFAULT_SCALE = 2; // 144 dpi, good balance of OCR accuracy vs memory
const OCR_MIN_SCALE = 0.75; // floor before we give up on a page instead of risking a native crash
const OCR_MAX_PIXMAP_PIXELS = 50_000_000; // ~7000x7000; prevents leptonica pixdata_malloc crashes

export type PdfFailureReason =
  | "pdf.lmstudio-error"
  | "pdf.lmstudio-empty"
  | "pdf.pdfparse-error"
  | "pdf.pdfparse-empty"
  | "pdf.ocr-disabled"
  | "pdf.ocr-error"
  | "pdf.ocr-render-error"
  | "pdf.ocr-empty";

type PdfParseStage = "lmstudio" | "pdf-parse" | "ocr";

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

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n+/g, "\n")
    .trim();
}

type StageResult = PdfParserSuccess | PdfParserFailure;

async function tryLmStudioParser(filePath: string, client: LMStudioClient): Promise<StageResult> {
  const maxRetries = 2;
  const fileName = filePath.split("/").pop() || filePath;

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

      const cleaned = cleanText(result.content);
      if (cleaned.length >= MIN_TEXT_LENGTH) {
        return { success: true, text: cleaned, stage: "lmstudio" };
      }

      console.log(
        `[PDF Parser] (LM Studio) Parsed but got very little text from ${fileName} (length=${cleaned.length}), will try fallbacks`,
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

      console.error(`[PDF Parser] (LM Studio) Error parsing PDF file ${filePath}:`, error);
      return {
        success: false,
        reason: "pdf.lmstudio-error",
        details: error instanceof Error ? error.message : String(error),
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
  const fileName = filePath.split("/").pop() || filePath;
  try {
    const buffer = await fs.promises.readFile(filePath);
    const result = await pdfParse(buffer);
    const cleaned = cleanText(result.text || "");

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
    console.error(`[PDF Parser] (pdf-parse) Error parsing PDF file ${filePath}:`, error);
    return {
      success: false,
      reason: "pdf.pdfparse-error",
      details: error instanceof Error ? error.message : String(error),
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
          const cleaned = cleanText(text || "");
          if (cleaned.length > 0) {
            textParts.push(cleaned);
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

    const fullText = cleanText(textParts.join("\n\n"));
    if (fullText.length >= MIN_TEXT_LENGTH) {
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

export async function parsePDF(
  filePath: string,
  client: LMStudioClient,
  enableOCR: boolean,
): Promise<PdfParserResult> {
  const fileName = filePath.split("/").pop() || filePath;

  // 1) LM Studio parser
  const lmStudioResult = await tryLmStudioParser(filePath, client);
  if (lmStudioResult.success) {
    return lmStudioResult;
  }
  let lastFailure: PdfParserFailure = lmStudioResult;

  // 2) Local pdf-parse fallback
  const pdfParseResult = await tryPdfParse(filePath);
  if (pdfParseResult.success) {
    return pdfParseResult;
  }
  lastFailure = pdfParseResult;

  // 3) OCR fallback (only if enabled)
  if (!enableOCR) {
    console.log(
      `[PDF Parser] (OCR) Enable OCR is off, skipping OCR fallback for ${fileName} after other methods returned no text`,
    );
    return {
      success: false,
      reason: "pdf.ocr-disabled",
      details: `Previous failure reason: ${lastFailure.reason}`,
    };
  }

  console.log(
    `[PDF Parser] (OCR) No text extracted from ${fileName} with LM Studio or pdf-parse, attempting OCR...`,
  );

  return tryOcrWithMuPdf(filePath);
}