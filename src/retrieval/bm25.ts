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

/** A passage another lane already selected, waiting to be reordered. */
export interface Bm25Candidate {
  key: string;
  text: string;
}

/**
 * Reorders passages another lane found, best first, dropping the ones no query term
 * reaches.
 *
 * Both the term frequencies and the document frequencies come from the candidates
 * themselves, which is what makes this a reranker rather than a search. Counted over the
 * whole corpus, a company name is rare and so scores high, yet it appears on every page of
 * the document the shortlist was drawn from and separates nothing; counted over the
 * shortlist it collapses to zero and the terms that actually distinguish one candidate
 * from another take the weight.
 */
export function rankTexts(terms: string[], candidates: Bm25Candidate[], options: Bm25Options): string[] {
  if (terms.length === 0 || candidates.length === 0) return [];

  const wanted = new Set(terms);
  const frequenciesPer: Array<Map<string, number>> = [];
  const lengths: number[] = [];
  const documentFrequency = new Map<string, number>();

  for (const candidate of candidates) {
    const candidateTerms = tokenize(candidate.text);
    lengths.push(candidateTerms.length);
    const frequencies = new Map<string, number>();
    for (const term of candidateTerms) {
      if (!wanted.has(term)) continue;
      frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
    }
    for (const term of frequencies.keys()) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
    frequenciesPer.push(frequencies);
  }

  const totalLength = lengths.reduce((sum, length) => sum + length, 0);
  if (totalLength === 0) return [];
  const averageLength = totalLength / candidates.length;

  const total = candidates.length;
  const idfByTerm = new Map<string, number>();
  for (const [term, df] of documentFrequency) {
    idfByTerm.set(term, Math.log(1 + (total - df + 0.5) / (df + 0.5)));
  }

  const scored: Array<{ key: string; score: number; order: number }> = [];
  candidates.forEach((candidate, order) => {
    const frequencies = frequenciesPer[order];
    if (frequencies.size === 0) return;

    const lengthRatio = lengths[order] / averageLength;
    const normalisation = options.k1 * (1 - options.b + options.b * lengthRatio);
    let score = 0;
    for (const [term, termFrequency] of frequencies) {
      const idf = idfByTerm.get(term) ?? 0;
      score += idf * ((termFrequency * (options.k1 + 1)) / (termFrequency + normalisation));
    }
    if (score > 0) scored.push({ key: candidate.key, score, order });
  });

  return scored.sort((a, b) => b.score - a.score || a.order - b.order).map((entry) => entry.key);
}
