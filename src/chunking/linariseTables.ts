import { isNumericCell } from "../parsers/markdown/pdfTables";

/**
 * True when `cells` opens a new table rather than continuing the one `previousRowCells`
 * belongs to: a row whose cells are all non-numeric, arriving after a row that held a
 * number, is what a second table's column names look like. A page-break continuation is
 * data following data, so it keeps the header it already has.
 */
export function startsNewTable(previousRowCells: string[], cells: string[]): boolean {
  return previousRowCells.some(isNumericCell) && !cells.some(isNumericCell);
}

/**
 * Rewrites table rows so each one carries the words that name its values. A grid of numbers
 * barely embeds at all: "Capital expenditures | 1,577" shares nothing with a question asking
 * what capital expenditure was in 2018. Naming each value with its column repairs that, while
 * the grid itself stays as the text a reader is shown.
 *
 * The first row of a run of table rows names the columns; the chunker repeats it at the top of
 * every piece of a split table, so a piece's own first row is always its header.
 */
export function linariseTables(text: string): string {
  const out: string[] = [];
  let header: string[] | null = null;
  let previousRowCells: string[] | null = null;

  for (const line of text.split("\n")) {
    if (!line.includes(" | ")) {
      header = null;
      previousRowCells = null;
      out.push(line);
      continue;
    }
    const cells = line.split(" | ").map((cell) => cell.trim());
    const newTable = previousRowCells !== null && startsNewTable(previousRowCells, cells);
    previousRowCells = cells;
    if (!header || newTable) {
      header = cells;
      out.push(line);
      continue;
    }
    const named = cells
      .slice(1)
      .map((value, i) => {
        const column = header?.[i + 1] ?? "";
        return column ? `${column}: ${value}` : value;
      })
      .join("; ");
    out.push(named ? `${cells[0]} — ${named}` : cells[0]);
  }
  return out.join("\n");
}
