import { type IndexedChunk } from "../vectorstore/vectorStore";
import { containsSnippet } from "./matchSnippet";
import { toRelativeSourcePath, type EvalQuestion } from "./questionSet";

/** Rebuilds a file's text from its chunks, using word offsets so overlapping chunks are not repeated. */
function fileText(chunks: IndexedChunk[]): string {
  const inOrder = [...chunks].sort(
    (a, b) => (a.metadata?.startIndex ?? a.chunkIndex) - (b.metadata?.startIndex ?? b.chunkIndex),
  );
  const words: string[] = [];
  let covered = -Infinity;
  for (const chunk of inOrder) {
    const start = chunk.metadata?.startIndex;
    const chunkWords = chunk.text.split(/\s+/).filter(Boolean);
    if (typeof start !== "number") {
      words.push(...chunkWords);
      continue;
    }
    const skip = covered === -Infinity ? 0 : Math.max(0, Math.min(chunkWords.length, covered - start));
    words.push(...chunkWords.slice(skip));
    covered = Math.max(covered === -Infinity ? start : covered, chunk.metadata?.endIndex ?? start + chunkWords.length);
  }
  return words.join(" ");
}

/**
 * Ids of questions whose answer snippet appears nowhere in the index, even reading each
 * file as one continuous text. No retrieval can score these: the words are simply not
 * there, because the file is missing, or because the text differs from the question set's
 * (page furniture removed, a different PDF extractor, tables written as rows). They are
 * reported as unscorable rather than counted as misses.
 */
export function questionsWithoutEvidence(
  chunks: IndexedChunk[],
  questions: EvalQuestion[],
  documentsDir: string,
): Set<string> {
  const byFile = new Map<string, IndexedChunk[]>();
  for (const chunk of chunks) {
    const relative = toRelativeSourcePath(documentsDir, chunk.filePath);
    const list = byFile.get(relative);
    if (list) list.push(chunk);
    else byFile.set(relative, [chunk]);
  }

  const textByFile = new Map<string, string>();
  const absent = new Set<string>();
  for (const question of questions) {
    const fileChunks = byFile.get(question.sourceFile);
    if (!fileChunks) {
      absent.add(question.id);
      continue;
    }
    let text = textByFile.get(question.sourceFile);
    if (text === undefined) {
      text = fileText(fileChunks);
      textByFile.set(question.sourceFile, text);
    }
    if (!containsSnippet(text, question.answerSnippet)) absent.add(question.id);
  }
  return absent;
}
