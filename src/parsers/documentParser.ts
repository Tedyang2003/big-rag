import * as path from "path";
import { parseHTML } from "./htmlParser";
import { parsePDF, type PdfFailureReason } from "./pdfParser";
import { parseEPUB } from "./epubParser";
import { parseImage } from "./imageParser";
import { parseText } from "./textParser";
import { parsePPTX } from "./pptxParser";
import { parseDOCX } from "./docxParser";
import { type LMStudioClient } from "@lmstudio/sdk";
import {
  IMAGE_EXTENSION_SET,
  isDocxExtension,
  isHtmlExtension,
  isMarkdownExtension,
  isPlainTextExtension,
  isPptxExtension,
  isTextualExtension,
} from "../utils/supportedExtensions";

export interface ParsedDocument {
  text: string;
  metadata: {
    filePath: string;
    fileName: string;
    extension: string;
    parsedAt: Date;
  };
}

export type ParseFailureReason =
  | "unsupported-extension"
  | "pdf.missing-client"
  | PdfFailureReason
  | "epub.empty"
  | "html.empty"
  | "html.error"
  | "text.empty"
  | "text.error"
  | "pptx.empty"
  | "pptx.error"
  | "docx.empty"
  | "docx.error"
  | "image.ocr-disabled"
  | "image.empty"
  | "image.error"
  | "parser.unexpected-error";

export type DocumentParseResult =
  | { success: true; document: ParsedDocument }
  | { success: false; reason: ParseFailureReason; details?: string };

type CleanResult =
  | { success: true; value: string }
  | { success: false; reason: ParseFailureReason; details?: string };

/**
 * Runs a parser that returns raw text, then trims/validates it. Centralizes
 * the try/catch + empty-check shape shared by every format below so each
 * branch in parseDocument reads as a one-liner instead of repeating it.
 */
async function runParser(
  filePath: string,
  label: string,
  detailsContext: string,
  emptyReason: ParseFailureReason,
  errorReason: ParseFailureReason,
  parse: () => Promise<string>,
): Promise<CleanResult> {
  try {
    return cleanAndValidate(await parse(), emptyReason, detailsContext);
  } catch (error) {
    console.error(`[Parser][${label}] Error parsing ${filePath}:`, error);
    return {
      success: false,
      reason: errorReason,
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

function cleanAndValidate(
  text: string,
  emptyReason: ParseFailureReason,
  detailsContext?: string,
): CleanResult {
  const cleaned = text?.trim() ?? "";
  if (cleaned.length === 0) {
    return {
      success: false,
      reason: emptyReason,
      details: detailsContext ? `${detailsContext} trimmed to zero length` : undefined,
    };
  }
  return { success: true, value: cleaned };
}

/**
 * Parse a document file based on its extension
 */
export async function parseDocument(
  filePath: string,
  enableOCR: boolean = false,
  client?: LMStudioClient,
): Promise<DocumentParseResult> {
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);

  const buildSuccess = (text: string): DocumentParseResult => ({
    success: true,
    document: {
      text,
      metadata: {
        filePath,
        fileName,
        extension: ext,
        parsedAt: new Date(),
      },
    },
  });

  const finish = (result: CleanResult): DocumentParseResult =>
    result.success ? buildSuccess(result.value) : result;

  try {
    if (isHtmlExtension(ext)) {
      return finish(
        await runParser(filePath, "HTML", `${fileName} html`, "html.empty", "html.error", () =>
          parseHTML(filePath),
        ),
      );
    }

    if (ext === ".pdf") {
      if (!client) {
        console.warn(`[Parser] No LM Studio client available for PDF parsing: ${fileName}`);
        return { success: false, reason: "pdf.missing-client" };
      }
      const pdfResult = await parsePDF(filePath, client, enableOCR);
      return pdfResult.success ? buildSuccess(pdfResult.text) : pdfResult;
    }

    if (ext === ".epub") {
      // parseEPUB never throws (it resolves "" on internal errors), so
      // "parser.unexpected-error" here is unreachable in practice - kept only
      // to match what the outer catch below would have produced anyway.
      return finish(
        await runParser(filePath, "EPUB", fileName, "epub.empty", "parser.unexpected-error", () =>
          parseEPUB(filePath),
        ),
      );
    }

    if (isDocxExtension(ext)) {
      return finish(
        await runParser(filePath, "DOCX", fileName, "docx.empty", "docx.error", () =>
          parseDOCX(filePath),
        ),
      );
    }

    if (isPptxExtension(ext)) {
      return finish(
        await runParser(filePath, "PPTX", fileName, "pptx.empty", "pptx.error", () =>
          parsePPTX(filePath),
        ),
      );
    }

    if (isTextualExtension(ext)) {
      return finish(
        await runParser(filePath, "Text", fileName, "text.empty", "text.error", () =>
          parseText(filePath, {
            stripMarkdown: isMarkdownExtension(ext),
            preserveLineBreaks: isPlainTextExtension(ext),
          }),
        ),
      );
    }

    if (IMAGE_EXTENSION_SET.has(ext)) {
      if (!enableOCR) {
        console.log(`Skipping image file ${filePath} (OCR disabled)`);
        return { success: false, reason: "image.ocr-disabled" };
      }
      return finish(
        await runParser(filePath, "Image", fileName, "image.empty", "image.error", () =>
          parseImage(filePath),
        ),
      );
    }

    if (ext === ".rar") {
      console.log(`RAR files not yet supported: ${filePath}`);
      return { success: false, reason: "unsupported-extension", details: ".rar" };
    }

    console.log(`Unsupported file type: ${filePath}`);
    return { success: false, reason: "unsupported-extension", details: ext };
  } catch (error) {
    console.error(`Error parsing document ${filePath}:`, error);
    return {
      success: false,
      reason: "parser.unexpected-error",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}
