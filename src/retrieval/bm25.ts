/** Words carrying no retrieval signal; dropped from both chunks and queries. */
const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "can", "did", "do", "does", "for", "from",
  "had", "has", "have", "he", "her", "his", "how", "i", "if", "in", "into", "is", "it", "its", "me", "my",
  "of", "on", "or", "our", "she", "so", "some", "than", "that", "the", "their", "them", "then", "there",
  "these", "they", "this", "to", "was", "we", "were", "what", "when", "where", "which", "who", "why",
  "will", "with", "would", "you", "your",
]);

const MIN_TERM_LENGTH = 2;

/** Trims the few English endings that would otherwise split one concept across terms. */
function trimSuffix(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 3 && word.endsWith("ed")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

/** Splits text into scoring terms: lowercase, stop words and 1-character tokens removed, suffixes trimmed. */
export function tokenize(text: string): string[] {
  const terms: string[] = [];
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < MIN_TERM_LENGTH || STOP_WORDS.has(raw)) continue;
    terms.push(trimSuffix(raw));
  }
  return terms;
}

export interface Bm25Options {
  k1: number;
  b: number;
}

/** Corpus-wide statistics a reranker needs; term frequencies come from the candidates themselves. */
export interface Bm25Stats {
  totalChunks: number;
  averageWordCount: number;
  /** Number of chunks in the whole corpus containing the term, 0 when it appears in none. */
  documentFrequency(term: string): number;
}

/** A passage another lane already selected, waiting to be reordered. */
export interface Bm25Candidate {
  key: string;
  text: string;
}

/**
 * Reorders passages another lane found, best first, dropping the ones no query term
 * reaches. Term frequencies are read from each candidate's own text, but idf still comes
 * from the whole corpus: on a shortlist of a few dozen passages a document frequency
 * counted locally would flatten exactly the rare terms that make one of them the answer.
 */
export function rankTexts(
  terms: string[],
  candidates: Bm25Candidate[],
  stats: Bm25Stats,
  options: Bm25Options,
): string[] {
  if (terms.length === 0 || stats.totalChunks === 0 || stats.averageWordCount === 0) return [];

  const idfByTerm = new Map<string, number>();
  for (const term of terms) {
    if (idfByTerm.has(term)) continue;
    const df = stats.documentFrequency(term);
    if (df <= 0) continue;
    idfByTerm.set(term, Math.log(1 + (stats.totalChunks - df + 0.5) / (df + 0.5)));
  }
  if (idfByTerm.size === 0) return [];

  const scored: Array<{ key: string; score: number; order: number }> = [];
  candidates.forEach((candidate, order) => {
    const candidateTerms = tokenize(candidate.text);
    if (candidateTerms.length === 0) return;
    const frequencies = new Map<string, number>();
    for (const term of candidateTerms) frequencies.set(term, (frequencies.get(term) ?? 0) + 1);

    const lengthRatio = candidateTerms.length / stats.averageWordCount;
    const normalisation = options.k1 * (1 - options.b + options.b * lengthRatio);
    let score = 0;
    for (const [term, idf] of idfByTerm) {
      const termFrequency = frequencies.get(term) ?? 0;
      if (termFrequency === 0) continue;
      score += idf * ((termFrequency * (options.k1 + 1)) / (termFrequency + normalisation));
    }
    if (score > 0) scored.push({ key: candidate.key, score, order });
  });

  return scored.sort((a, b) => b.score - a.score || a.order - b.order).map((entry) => entry.key);
}
