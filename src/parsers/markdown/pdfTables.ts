import { type PdfLine } from "./pdfStyles";

/** A row of a detected table: its cells left to right, and whether it names the columns. */
export interface TableRow {
  cells: string[];
  isHeader: boolean;
}

/** Columns line up when their left edges agree to within this share of the page width. */
const COLUMN_TOLERANCE_SHARE = 0.03;
/** A table needs at least this many rows, so a single wide line is never one. */
const MIN_RUN_ROWS = 2;

/** True for money, counts, percentages and bracketed negatives - anything that is only digits underneath. */
export function isNumericCell(text: string): boolean {
  const bare = text.replace(/^-/, "").replace(/[$%(),.]/g, "").trim();
  return bare.length > 0 && /^\d+$/.test(bare);
}

function columnsOf(line: PdfLine): number[] {
  return (line.cells ?? []).map((cell) => cell.x0);
}

/** A row continues a run when its cells sit on the established columns; it may use fewer of them. */
function continuesRun(columns: number[], line: PdfLine, tolerance: number): boolean {
  const cells = line.cells ?? [];
  if (cells.length < 2 || cells.length > columns.length) return false;
  return cells.every((cell) => columns.some((column) => Math.abs(cell.x0 - column) <= tolerance));
}

function headerIndex(run: PdfLine[]): number {
  const firstCell = (line: PdfLine) => (line.cells ?? [])[0]?.text ?? "";
  const labelled = run.findIndex((line) => !isNumericCell(firstCell(line)));
  return labelled >= 0 ? labelled : 0;
}

/**
 * Rows of every table run among `lines`, keyed by each line's index. A run is two or more
 * consecutive lines that were merged from several cells and whose cells share columns.
 * Anything looser stays prose: a mangled paragraph is worse than a missed table.
 */
export function findTableRows(lines: PdfLine[], pageWidth: number): Map<number, TableRow> {
  const tolerance = pageWidth * COLUMN_TOLERANCE_SHARE;
  const rows = new Map<number, TableRow>();

  let index = 0;
  while (index < lines.length) {
    const start = lines[index];
    if ((start.cells?.length ?? 0) < 2) {
      index++;
      continue;
    }
    const columns = columnsOf(start);
    let end = index + 1;
    while (end < lines.length && continuesRun(columns, lines[end], tolerance)) end++;

    if (end - index >= MIN_RUN_ROWS) {
      // A ragged row can precede the run too: the line right before `index` may have fewer
      // cells than `columns` and still be the run's actual first row (e.g. a lone year-only
      // line above the labelled header row). Absorb it as long as it isn't already claimed.
      let runStart = index;
      while (runStart > 0 && !rows.has(runStart - 1) && continuesRun(columns, lines[runStart - 1], tolerance)) {
        runStart--;
      }
      const run = lines.slice(runStart, end);
      const header = headerIndex(run);
      run.forEach((line, i) => {
        rows.set(runStart + i, { cells: (line.cells ?? []).map((cell) => cell.text), isHeader: i === header });
      });
      index = end;
    } else {
      index++;
    }
  }
  return rows;
}
