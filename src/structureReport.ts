import * as path from "path";
import { type LMStudioClient } from "@lmstudio/sdk";
import { scanDirectory, type ScannedFile } from "./ingestion/fileScanner";
import { parseDocument } from "./parsers/documentParser";
import { countPdfPages, DEFAULT_PDF_STAGES, parsePDF } from "./parsers/pdfParser";
import { markdownToPlain } from "./parsers/markdown/normalizeMarkdown";
import { parseBlocks } from "./chunking/sections";
import { chunkStructured, type StructuredChunk } from "./chunking/structuredChunker";
import { chunkText } from "./utils/textChunker";
import { dayRangeOf, detectDayMonthOrder, documentPostedDate } from "./metadata/dates";
import { readCliIndexingSettings } from "./settings/cliSettings";
import { parseExcludePatternsFromEnv } from "./utils/fileExcludePatterns";

/** English text averages about 1.3 embedding tokens per word; both modes use the same estimate. */
const TOKENS_PER_WORD = 1.3;
const HEADINGS_TO_LIST = 20;

const estimateTokens = async (text: string) =>
  Math.ceil(text.split(/\s+/).filter(Boolean).length * TOKENS_PER_WORD);

// The report never uses LM Studio: its parser stage is replaced by one that always fails.
const reportStages = {
  ...DEFAULT_PDF_STAGES,
  lmStudio: async () => ({ success: false as const, reason: "pdf.lmstudio-error" as const, details: "not used by the report" }),
};

interface FileReport {
  file: string;
  parser: string;
  pages: number | null;
  headingsByLevel: [number, number, number];
  headings: string[];
  tables: number;
  tableRows: number;
  legacyChunks: number;
  structuredChunks: number;
  fillTotal: number;
}

async function parseForReport(file: ScannedFile, enableOCR: boolean): Promise<{ text: string; parser: string } | null> {
  if (file.extension === ".pdf") {
    const result = await parsePDF(file.path, {} as LMStudioClient, enableOCR, reportStages);
    return result.success ? { text: result.text, parser: result.stage } : null;
  }
  const result = await parseDocument(file.path, enableOCR);
  return result.success ? { text: result.document.text, parser: file.extension.slice(1) } : null;
}

async function reportFile(file: ScannedFile, root: string, settings: ReturnType<typeof readCliIndexingSettings>): Promise<FileReport | null> {
  const parsed = await parseForReport(file, settings.enableOCR);
  if (!parsed) return null;
  const markdown = parsed.text;

  const blocks = parseBlocks(markdown);
  const headingBlocks = blocks.filter((block) => block.kind === "heading");
  const headingsByLevel: [number, number, number] = [0, 0, 0];
  for (const block of headingBlocks) headingsByLevel[Math.min(block.level, 3) - 1]++;

  // A table is a run of consecutive rows; counting runs rather than rows says how many
  // tables a document has, which is what tells you whether detection is working.
  let tables = 0;
  let tableRows = 0;
  let inTable = false;
  for (const block of blocks) {
    if (block.kind === "tableRow") {
      tableRows++;
      if (!inTable) tables++;
      inTable = true;
    } else {
      inTable = false;
    }
  }

  const legacy = await chunkText(markdownToPlain(markdown), settings.chunkSize, settings.chunkOverlap, estimateTokens);
  // Mirrors indexManager.prepareStructuredChunks: chunk without dates if date extraction fails.
  const base = { fileName: file.name, chunkSize: settings.chunkSize, countTokens: estimateTokens };
  let structured: StructuredChunk[];
  try {
    const postedDate = documentPostedDate(markdown, file.name, file.mtime);
    structured = await chunkStructured(markdown, {
      ...base,
      postedDate,
      dateContext: {
        order: detectDayMonthOrder(markdown),
        referenceTime: file.mtime,
        defaultYear: Number(postedDate.start.slice(0, 4)),
      },
    });
  } catch (error) {
    console.warn(`[Structure Report] Date extraction failed for ${file.name}; chunking without dates:`, error);
    structured = await chunkStructured(markdown, {
      ...base,
      postedDate: dayRangeOf(file.mtime),
      dateContext: {},
      extractDates: false,
    });
  }
  let fillTotal = 0;
  for (const chunk of structured) {
    fillTotal += ((await estimateTokens(chunk.contextHeader)) + (await estimateTokens(chunk.text))) / settings.chunkSize;
  }

  return {
    file: path.relative(root, file.path),
    parser: parsed.parser,
    pages: file.extension === ".pdf" ? await countPdfPages(file.path) : null,
    headingsByLevel,
    headings: headingBlocks.map((block) => `${"#".repeat(block.level)} ${block.text}`),
    tables,
    tableRows,
    legacyChunks: legacy.length,
    structuredChunks: structured.length,
    fillTotal,
  };
}

async function main() {
  const documentsDir = process.env.BIG_RAG_DOCS_DIR ?? process.argv[2];
  if (!documentsDir) {
    console.error("Usage: BIG_RAG_DOCS_DIR=/path/to/docs npm run structure:report");
    process.exit(1);
  }
  const listHeadings = (process.env.BIG_RAG_REPORT_HEADINGS ?? "false").toLowerCase() === "true";
  const settings = readCliIndexingSettings(process.env);
  const root = path.resolve(documentsDir);
  const files = await scanDirectory(root, undefined, {
    excludePatterns: parseExcludePatternsFromEnv(process.env.BIG_RAG_EXCLUDE_PATTERNS),
  });

  const reports: FileReport[] = [];
  let failed = 0;
  for (const file of files) {
    let report: FileReport | null = null;
    try {
      report = await reportFile(file, root, settings);
    } catch (error) {
      console.warn(`[Structure Report] ${file.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!report) {
      failed++;
      console.log(`${path.relative(root, file.path)}  FAILED`);
      continue;
    }
    reports.push(report);
    const total = report.headingsByLevel.reduce((a, b) => a + b, 0);
    const perPage = report.pages ? (total / report.pages).toFixed(2) : "-";
    const fill = report.structuredChunks > 0 ? Math.round((100 * report.fillTotal) / report.structuredChunks) : 0;
    console.log(
      `${report.file}  parser=${report.parser}  pages=${report.pages ?? "-"}  ` +
        `headings=${report.headingsByLevel.join("/")}  perPage=${perPage}  tables=${report.tables}/${report.tableRows}r  ` +
        `legacy=${report.legacyChunks}  structured=${report.structuredChunks}  fill=${fill}%`,
    );
    if (listHeadings) {
      for (const heading of report.headings.slice(0, HEADINGS_TO_LIST)) console.log(`    ${heading}`);
    }
  }

  const pdfs = reports.filter((report) => report.pages !== null);
  const pdfsWithHeadings = pdfs.filter((report) => report.headingsByLevel.some((count) => count > 0));
  const legacy = reports.reduce((sum, report) => sum + report.legacyChunks, 0);
  const structured = reports.reduce((sum, report) => sum + report.structuredChunks, 0);
  const fillTotal = reports.reduce((sum, report) => sum + report.fillTotal, 0);
  console.log("");
  console.log(`Files: ${files.length} (failed ${failed})`);
  console.log(`PDFs with headings: ${pdfsWithHeadings.length}/${pdfs.length}`);
  console.log(`Parsers: ${JSON.stringify(countBy(reports.map((report) => report.parser)))}`);
  console.log(
    `Tables: ${reports.reduce((sum, report) => sum + report.tables, 0)} ` +
      `(${reports.reduce((sum, report) => sum + report.tableRows, 0)} rows), ` +
      `in ${reports.filter((report) => report.tables > 0).length}/${reports.length} files`,
  );
  console.log(
    `Chunks: legacy ${legacy}, structured ${structured}, ratio ${legacy > 0 ? (structured / legacy).toFixed(2) : "-"}`,
  );
  console.log(`Average structured fill: ${structured > 0 ? Math.round((100 * fillTotal) / structured) : 0}%`);
}

function countBy(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}

void main();
