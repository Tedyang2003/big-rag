import { type IndexedChunk } from "../vectorstore/vectorStore";

/** Chunks shorter than this are too small to hold a meaningful fact. */
export const MIN_CHUNK_WORDS = 40;

/** Small deterministic PRNG (mulberry32). Returns values in [0, 1). */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

/**
 * Picks up to `count` chunks, taking one from each file in turn so no single
 * large file dominates. Deterministic for a given seed and chunk set.
 */
export function sampleChunksAcrossFiles(chunks: IndexedChunk[], count: number, seed: number): IndexedChunk[] {
  const rng = createRng(seed);

  const byFile = new Map<string, IndexedChunk[]>();
  for (const c of chunks) {
    if (wordCount(c.text) < MIN_CHUNK_WORDS) continue;
    const list = byFile.get(c.filePath) ?? [];
    list.push(c);
    byFile.set(c.filePath, list);
  }

  const files = shuffle([...byFile.keys()].sort(), rng);
  const queues = files.map((file) =>
    shuffle([...byFile.get(file)!].sort((a, b) => a.chunkIndex - b.chunkIndex), rng),
  );

  const sampled: IndexedChunk[] = [];
  while (sampled.length < count && queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      if (sampled.length >= count) break;
      const next = queue.shift();
      if (next) sampled.push(next);
    }
  }
  return sampled;
}
