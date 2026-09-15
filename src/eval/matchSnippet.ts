/** Lowercases and replaces every run of non-letter, non-digit characters with a single space. */
export function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/**
 * True if `snippet` appears in `text` as whole words, ignoring case,
 * punctuation, and whitespace differences.
 */
export function containsSnippet(text: string, snippet: string): boolean {
  const normalizedSnippet = normalizeForMatch(snippet);
  if (normalizedSnippet.length === 0) {
    return false;
  }
  return ` ${normalizeForMatch(text)} `.includes(` ${normalizedSnippet} `);
}
