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
/** A cell that is only a bullet glyph or an ordinal marker ("1.", "12)", "a.", "iv)"). */
const LIST_MARKER = /^(?:[-*•·▪◦]|\d{1,3}[.)]|[a-zA-Z][.)]|[ivxlcdm]{2,4}[.)])$/i;

/** True for money, counts, percentages and bracketed negatives - anything that is only digits underneath. */
export function isNumericCell(text: string): boolean {
  const bare = text.replace(/^-/, "").replace(/[$%(),.]/g, "").trim();
  return bare.length > 0 && /^\d+$/.test(bare);
}

function isListMarker(text: string): boolean {
  return LIST_MARKER.test(text.trim());
}

function columnsOf(line: PdfLine): number[] {
  return (line.cells ?? []).map((cell) => cell.x0);
}

/**
 * True when a line's merged cells could plausibly be a table row: at least two cells, and
 * none of them is a bare list marker. MuPDF emits a bullet or ordinal as its own piece on
 * the same row as its text, which otherwise looks exactly like a two-column table row.
 */
function isRowLike(line: PdfLine): boolean {
  const cells = line.cells ?? [];
  return cells.length >= 2 && !cells.some((cell) => isListMarker(cell.text));
}

/**
 * A row continues a run when its cells sit on the established columns, each in a distinct
 * column and in increasing order; it may use fewer of them, but never re-use one a previous
 * cell on the same line already claimed.
 */
function continuesRun(columns: number[], line: PdfLine, tolerance: number): boolean {
  if (!isRowLike(line)) return false;
  const cells = line.cells ?? [];
  if (cells.length > columns.length) return false;
  let columnIndex = 0;
  for (const cell of cells) {
    while (columnIndex < columns.length && Math.abs(cell.x0 - columns[columnIndex]) > tolerance) columnIndex++;
    if (columnIndex >= columns.length) return false;
    columnIndex++;
  }
  return true;
}

/** The first row of a run whose first cell is non-numeric (a label), else the run's first row. */
function headerIndex(run: PdfLine[]): number {
  const firstCell = (line: PdfLine) => (line.cells ?? [])[0]?.text ?? "";
  const labelled = run.findIndex((line) => !isNumericCell(firstCell(line)));
  return labelled >= 0 ? labelled : 0;
}

/**
 * Rows of every table run among `lines`, keyed by each line's index. A run is two or more
 * consecutive lines that were merged from several cells and whose cells share columns. A
 * run starts at its header row: any leading lines whose first cell is numeric (a lone year
 * row, say) are not table rows and stay ordinary text. A run with no numeric cell anywhere
 * is not a table either - bullet lists and two-column prose can align by coincidence, but
 * tables of figures have numbers. Anything looser stays prose: a mangled paragraph is worse
 * than a missed table.
 */
export function findTableRows(lines: PdfLine[], pageWidth: number): Map<number, TableRow> {
  const tolerance = pageWidth * COLUMN_TOLERANCE_SHARE;
  const rows = new Map<number, TableRow>();

  let index = 0;
  while (index < lines.length) {
    const start = lines[index];
    if (!isRowLike(start)) {
      index++;
      continue;
    }
    const columns = columnsOf(start);
    let end = index + 1;
    while (end < lines.length && continuesRun(columns, lines[end], tolerance)) end++;

    if (end - index >= MIN_RUN_ROWS) {
      const run = lines.slice(index, end);
      const header = headerIndex(run);
      const tableRun = run.slice(header);
      const hasNumericCell = tableRun.some((line) => (line.cells ?? []).some((cell) => isNumericCell(cell.text)));
      if (hasNumericCell) {
        tableRun.forEach((line, i) => {
          rows.set(index + header + i, { cells: (line.cells ?? []).map((cell) => cell.text), isHeader: i === 0 });
        });
      }
      index = end;
    } else {
      index++;
    }
  }
  return rows;
}
