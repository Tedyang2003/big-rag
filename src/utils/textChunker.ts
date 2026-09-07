export type CountTokens = (text: string) => Promise<number>;

/**
 * Splits text into overlapping chunks sized against real embedding-model
 * tokens rather than whitespace-delimited words.
 *
 * There is no way to slice a raw token array and feed it back to an
 * embedding model (embed() only accepts strings, and the SDK exposes no
 * detokenize call), so chunk boundaries are still placed on word breaks.
 * What changes is how many words that corresponds to: `countTokens` is
 * called once on the full text to measure its real token density, and
 * chunkSize/overlap (token targets) are converted into an equivalent word
 * count using that ratio, instead of being used as word counts directly.
 * That ratio can still drift within a single document (e.g. prose next to
 * dense code), so treat chunk sizing as "close to the target," not exact.
 */
export async function chunkText(
  text: string,
  chunkSize: number,
  overlap: number,
  countTokens: CountTokens,
): Promise<Array<{ text: string; startIndex: number; endIndex: number }>> {
  const chunks: Array<{ text: string; startIndex: number; endIndex: number }> = [];

  const words = text.split(/\s+/).filter((word) => word.length > 0);

  if (words.length === 0) {
    return chunks;
  }

  const totalTokens = await countTokens(text);
  const tokensPerWord = totalTokens > 0 ? totalTokens / words.length : 1;

  const wordChunkSize = Math.max(1, Math.round(chunkSize / tokensPerWord));
  const wordOverlap = Math.max(0, Math.min(wordChunkSize - 1, Math.round(overlap / tokensPerWord)));

  let startIdx = 0;

  while (startIdx < words.length) {
    const endIdx = Math.min(startIdx + wordChunkSize, words.length);
    const chunkWords = words.slice(startIdx, endIdx);
    const chunkContent = chunkWords.join(" ");

    chunks.push({
      text: chunkContent,
      startIndex: startIdx,
      endIndex: endIdx,
    });

    // Move forward by (wordChunkSize - wordOverlap) to create overlapping chunks
    startIdx += Math.max(1, wordChunkSize - wordOverlap);

    // Break if we've reached the end
    if (endIdx >= words.length) {
      break;
    }
  }

  return chunks;
}
