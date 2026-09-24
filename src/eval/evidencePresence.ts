import { type IndexedChunk } from "../vectorstore/vectorStore";
import { normalizeForMatch } from "./matchSnippet";
import { toRelativeSourcePath, type EvalQuestion } from "./questionSet";

/** Where a question's evidence sits in the index, for reading a report without re-running retrieval. */
export interface EvidenceLocation {
  file: string;
  /** Chunk index of the first chunk holding the evidence. */
  firstChunkIndex: number;
  /** How many consecutive chunks the evidence spans; more than 1 means retrieval must return them all. */
  chunkSpan: number;
  sectionPath: string;
}

interface FileWords {
  words: string[];
  /** chunkIndex of the chunk each word came from. */
  owners: number[];
  sections: Map<number, string>;
}

/** Rebuilds a file as one word list, using offsets so overlapping chunks are not repeated. */
function fileWords(chunks: IndexedChunk[]): FileWords {
  const inOrder = [...chunks].sort(
    (a, b) => (a.metadata?.startIndex ?? a.chunkIndex) - (b.metadata?.startIndex ?? b.chunkIndex),
  );
  const words: string[] = [];
  const owners: number[] = [];
  const sections = new Map<number, string>();
  let covered = -Infinity;
  for (const chunk of inOrder) {
    sections.set(chunk.chunkIndex, String(chunk.metadata?.sectionPath ?? ""));
    // The recorded offsets count raw whitespace-separated words, so the overlap must be
    // skipped before normalizing: normalizing first splits "1,234" into two words and the
    // skip lands in the wrong place, dropping or repeating text in the reconstruction.
    const rawWords = chunk.text.split(/\s+/).filter(Boolean);
    const start = chunk.metadata?.startIndex;
    const skip =
      typeof start !== "number" || covered === -Infinity
        ? 0
        : Math.max(0, Math.min(rawWords.length, covered - start));
    for (const word of normalizeForMatch(rawWords.slice(skip).join(" ")).split(" ").filter(Boolean)) {
      words.push(word);
      owners.push(chunk.chunkIndex);
    }
    const end = chunk.metadata?.endIndex;
    covered = typeof end === "number" ? Math.max(covered === -Infinity ? 0 : covered, end) : covered;
  }
  return { words, owners, sections };
}

/**
 * Where each question's evidence sits in this index, or null when it is not there at all.
 * No retrieval can score a null: the words are missing because the file is not indexed, or
 * because the text differs from the question set's (page furniture removed, a different PDF
 * extractor, tables written as rows). Those questions are reported unscorable, not missed.
 */
export function locateEvidence(
  chunks: IndexedChunk[],
  questions: EvalQuestion[],
  documentsDir: string,
): Map<string, EvidenceLocation | null> {
  const byFile = new Map<string, IndexedChunk[]>();
  for (const chunk of chunks) {
    const relative = toRelativeSourcePath(documentsDir, chunk.filePath);
    const list = byFile.get(relative);
    if (list) list.push(chunk);
    else byFile.set(relative, [chunk]);
  }

  const wordsByFile = new Map<string, FileWords>();
  const located = new Map<string, EvidenceLocation | null>();
  for (const question of questions) {
    const fileChunks = byFile.get(question.sourceFile);
    if (!fileChunks) {
      located.set(question.id, null);
      continue;
    }
    let file = wordsByFile.get(question.sourceFile);
    if (!file) {
      file = fileWords(fileChunks);
      wordsByFile.set(question.sourceFile, file);
    }

    const snippet = normalizeForMatch(question.answerSnippet);
    const snippetLength = snippet.split(" ").filter(Boolean).length;
    const haystack = ` ${file.words.join(" ")} `;
    const at = haystack.indexOf(` ${snippet} `);
    if (snippet.length === 0 || at < 0) {
      located.set(question.id, null);
      continue;
    }
    const wordsBefore = haystack.slice(0, at + 1).split(" ").filter(Boolean).length;
    const firstChunkIndex = file.owners[wordsBefore] ?? file.owners[0];
    const lastChunkIndex = file.owners[Math.min(wordsBefore + snippetLength - 1, file.owners.length - 1)];
    located.set(question.id, {
      file: question.sourceFile,
      firstChunkIndex,
      chunkSpan: lastChunkIndex - firstChunkIndex + 1,
      sectionPath: file.sections.get(firstChunkIndex) ?? "",
    });
  }
  return located;
}
