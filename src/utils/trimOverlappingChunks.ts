import { type SearchResult } from "../vectorstore/vectorStore";

/**
 * When two selected search results are adjacent chunks (consecutive
 * chunkIndex) from the same file, they share `overlap` words by
 * construction (see textChunker.ts's sliding window) - both can score highly
 * for the same query because they both contain the shared span. This does
 * NOT drop either chunk (overlap already did its job by ensuring the
 * relevant content wasn't lost at a chunk boundary); it only trims the
 * shared words off the later chunk's text so the same words aren't shown to
 * the model/user twice, while keeping each chunk's unique content intact.
 *
 * Uses each chunk's own recorded startIndex/endIndex (word offsets, stamped
 * during indexing) rather than a fixed overlap constant, since chunk sizing
 * is calibrated per document and can differ from one indexing run to another.
 */
export function trimOverlappingChunks(results: SearchResult[]): SearchResult[] {
  const byFile = new Map<string, SearchResult[]>();
  for (const result of results) {
    const list = byFile.get(result.filePath);
    if (list) {
      list.push(result);
    } else {
      byFile.set(result.filePath, [result]);
    }
  }

  const trimmedTextByKey = new Map<string, string>();
  const keyFor = (result: SearchResult) => `${result.filePath}::${result.chunkIndex}`;

  for (const fileResults of byFile.values()) {
    if (fileResults.length < 2) continue;

    const byPosition = [...fileResults].sort((a, b) => a.chunkIndex - b.chunkIndex);

    for (let i = 1; i < byPosition.length; i++) {
      const prev = byPosition[i - 1];
      const curr = byPosition[i];
      if (curr.chunkIndex - prev.chunkIndex !== 1) continue; // not adjacent, can't overlap

      const prevEnd = prev.metadata?.endIndex;
      const currStart = curr.metadata?.startIndex;
      if (typeof prevEnd !== "number" || typeof currStart !== "number") continue;

      const overlapWordCount = prevEnd - currStart;
      if (overlapWordCount <= 0) continue;

      const words = curr.text.split(/\s+/);
      if (overlapWordCount >= words.length) continue; // inconsistent metadata - leave as-is rather than emptying it

      trimmedTextByKey.set(keyFor(curr), words.slice(overlapWordCount).join(" "));
    }
  }

  if (trimmedTextByKey.size === 0) {
    return results;
  }

  return results.map((result) => {
    const trimmedText = trimmedTextByKey.get(keyFor(result));
    return trimmedText !== undefined ? { ...result, text: trimmedText } : result;
  });
}
