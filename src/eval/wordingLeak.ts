import { normalizeForMatch } from "./matchSnippet";

/** Share of a question's meaningful words allowed to appear in its source chunk. */
export const WORDING_LEAK_LIMIT = 0.5;

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "did", "do", "does", "for", "from",
  "had", "has", "have", "how", "in", "is", "it", "its", "of", "on", "or", "over", "that",
  "the", "their", "this", "to", "was", "were", "what", "when", "where", "which", "who",
  "why", "with",
]);

function meaningfulWords(text: string): string[] {
  return normalizeForMatch(text)
    .split(" ")
    .filter((word) => word.length > 1 && !STOPWORDS.has(word));
}

/**
 * Fraction of the question's meaningful words that also appear in the chunk.
 * A question with no meaningful words returns 1 (useless as a test question).
 */
export function wordingLeakRatio(question: string, chunkText: string): number {
  const questionWords = meaningfulWords(question);
  if (questionWords.length === 0) {
    return 1;
  }
  const chunkWords = new Set(normalizeForMatch(chunkText).split(" "));
  const leaked = questionWords.filter((word) => chunkWords.has(word)).length;
  return leaked / questionWords.length;
}

export function isWordingLeak(question: string, chunkText: string): boolean {
  return wordingLeakRatio(question, chunkText) > WORDING_LEAK_LIMIT;
}
