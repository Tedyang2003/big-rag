export type EmbedSentences = (sentences: string[]) => Promise<Array<{ embedding: number[] }>>;

export interface CompactPassageOptions {
  /** Sentences scoring below this cosine similarity to the query are dropped. */
  minSimilarity?: number;
  /** Always keep at least this many sentences (the highest-scoring ones), even if none clear minSimilarity. */
  minSentences?: number;
}

const DEFAULT_MIN_SIMILARITY = 0.5;
const DEFAULT_MIN_SENTENCES = 2;

/**
 * Splits chunk text into sentences on terminal punctuation. Chunk text has
 * already had all whitespace (including newlines) collapsed to single spaces
 * by textChunker.ts, so this is the only structure left to split on. Content
 * with no terminal punctuation at all (e.g. a PPTX/DOCX table row rendered as
 * "Cell1 | Cell2") falls back to a single "sentence" covering the whole
 * text, which compactPassageText then leaves untouched rather than guessing
 * where to cut it.
 */
export function splitIntoSentences(text: string): string[] {
  const matches = text.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g);
  if (!matches || matches.length === 0) {
    const trimmed = text.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }
  return matches.map((s) => s.trim()).filter((s) => s.length > 0);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Extractive compaction: keeps only the sentences of `text` most relevant to
 * `queryEmbedding`, in their original order. Never rewrites or summarizes -
 * only selects a subset of the original sentences - so it can shrink a
 * passage's size without risking a fact being paraphrased away.
 */
export async function compactPassageText(
  text: string,
  queryEmbedding: number[],
  embed: EmbedSentences,
  options: CompactPassageOptions = {},
): Promise<string> {
  const { minSimilarity = DEFAULT_MIN_SIMILARITY, minSentences = DEFAULT_MIN_SENTENCES } = options;

  const sentences = splitIntoSentences(text);
  if (sentences.length <= minSentences) {
    return text;
  }

  const embedded = await embed(sentences);
  const scored = sentences.map((sentence, index) => ({
    sentence,
    index,
    similarity: cosineSimilarity(queryEmbedding, embedded[index].embedding),
  }));

  const aboveThreshold = scored.filter((s) => s.similarity >= minSimilarity);
  const kept =
    aboveThreshold.length >= minSentences
      ? aboveThreshold
      : [...scored].sort((a, b) => b.similarity - a.similarity).slice(0, minSentences);

  kept.sort((a, b) => a.index - b.index); // restore original sentence order
  return kept.map((s) => s.sentence).join(" ");
}
