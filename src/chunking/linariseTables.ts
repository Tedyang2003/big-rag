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

  for (const line of text.split("\n")) {
    if (!line.includes(" | ")) {
      header = null;
      out.push(line);
      continue;
    }
    const cells = line.split(" | ").map((cell) => cell.trim());
    if (!header) {
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
