import { inferStructure } from "./inferStructure";

/**
 * Markdown for one OCR'd page: a page heading plus inferred structure.
 * `contentLength` excludes the heading so minimum-text checks aren't
 * satisfied by page headings alone.
 */
export function formatOcrPage(pageNumber: number, rawText: string): { markdown: string; contentLength: number } | null {
  const body = inferStructure(rawText);
  if (!body) return null;
  return { markdown: `## Page ${pageNumber}\n\n${body}`, contentLength: body.length };
}
