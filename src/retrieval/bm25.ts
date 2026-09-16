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

export interface TermEntry {
  /** Number of chunks containing the term. */
  df: number;
  /** [chunkNumber, term frequency] pairs. */
  postings: Array<[number, number]>;
}

export interface Bm25Corpus {
  totalChunks: number;
  averageWordCount: number;
  wordCountOf(chunkNumber: number): number;
  entryFor(term: string): TermEntry | undefined;
}

export interface Bm25Options {
  k1: number;
  b: number;
}

/** Standard BM25: sums each term's idf-weighted, length-normalised term frequency per chunk. */
export function scoreTerms(terms: string[], corpus: Bm25Corpus, options: Bm25Options): Map<number, number> {
  const scores = new Map<number, number>();
  if (corpus.totalChunks === 0 || corpus.averageWordCount === 0) return scores;

  for (const term of terms) {
    const entry = corpus.entryFor(term);
    if (!entry || entry.df === 0) continue;
    const idf = Math.log(1 + (corpus.totalChunks - entry.df + 0.5) / (entry.df + 0.5));

    for (const [chunkNumber, termFrequency] of entry.postings) {
      const lengthRatio = corpus.wordCountOf(chunkNumber) / corpus.averageWordCount;
      const denominator = termFrequency + options.k1 * (1 - options.b + options.b * lengthRatio);
      if (denominator === 0) continue;
      const contribution = idf * ((termFrequency * (options.k1 + 1)) / denominator);
      scores.set(chunkNumber, (scores.get(chunkNumber) ?? 0) + contribution);
    }
  }
  return scores;
}
