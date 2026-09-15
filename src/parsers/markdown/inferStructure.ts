const LIST_ITEM = /^(?:(\d{1,3})[.)]|([a-zA-Z])[.)]|[-*•▪◦])\s+/;
const EXISTING_HEADING = /^#{1,6}\s+\S/;
const MAX_HEADING_WORDS = 12;

function normalizeListItem(line: string): string {
  const match = LIST_ITEM.exec(line)!;
  const rest = line.slice(match[0].length);
  if (match[1]) return `${match[1]}. ${rest}`;
  if (match[2]) return `${match[2]}. ${rest}`;
  return `- ${rest}`;
}

function isHeadingCandidate(line: string): boolean {
  if (line.split(" ").length > MAX_HEADING_WORDS) return false;
  if (/[.,;:]$/.test(line)) return false;
  return /\p{L}/u.test(line);
}

/**
 * Adds Markdown structure to text that has none (PDF, plain text, OCR):
 * short standalone lines become headings, bullet/numbered lines become list
 * items, and wrapped lines are joined into paragraphs.
 */
export function inferStructure(raw: string): string {
  const lines = raw
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v]+/g, " ").trim());

  const blocks: string[] = [];
  let current: string[] = [];
  let seenContent = false;
  const flush = () => {
    if (current.length > 0) {
      blocks.push(current.join(" "));
      current = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === "") {
      flush();
      continue;
    }
    if (EXISTING_HEADING.test(line)) {
      flush();
      blocks.push(line);
      seenContent = true;
      continue;
    }
    if (LIST_ITEM.test(line)) {
      flush();
      current = [normalizeListItem(line)];
      seenContent = true;
      continue;
    }
    if (current.length === 0) {
      const next = lines[i + 1];
      const followedByBlank = next === undefined || next === "";
      if (isHeadingCandidate(line) && (followedByBlank || !seenContent)) {
        blocks.push(`## ${line}`);
        seenContent = true;
        continue;
      }
    }
    current.push(line);
    seenContent = true;
  }
  flush();

  return blocks.join("\n\n");
}
