import { type SearchResult } from "../vectorstore/vectorStore";

export interface PassageRun {
  filePath: string;
  /** The joined text of consecutive chunks, in document order. */
  text: string;
  /** 1-based position of the highest-ranked chunk in this run, in the list it came from. */
  firstPosition: number;
}

/**
 * Groups retrieved passages into runs of consecutive chunks from one file, joining their
 * text. Evidence often spans a chunk boundary: when both chunks are retrieved the model
 * does receive the whole of it, so scoring should see it as one passage too. Overlap has
 * already been trimmed from adjacent chunks by the time passages reach here.
 */
export function joinAdjacentRuns(passages: SearchResult[]): PassageRun[] {
  const positionOf = new Map<SearchResult, number>(passages.map((passage, i) => [passage, i + 1]));
  const byFile = new Map<string, SearchResult[]>();
  for (const passage of passages) {
    const list = byFile.get(passage.filePath);
    if (list) list.push(passage);
    else byFile.set(passage.filePath, [passage]);
  }

  const runs: PassageRun[] = [];
  for (const [filePath, filePassages] of byFile) {
    const inOrder = [...filePassages].sort((a, b) => a.chunkIndex - b.chunkIndex);
    let current: SearchResult[] = [];
    const close = () => {
      if (current.length === 0) return;
      runs.push({
        filePath,
        text: current.map((passage) => passage.text).join(" "),
        firstPosition: Math.min(...current.map((passage) => positionOf.get(passage) ?? Number.MAX_SAFE_INTEGER)),
      });
      current = [];
    };
    for (const passage of inOrder) {
      const previous = current[current.length - 1];
      if (previous && passage.chunkIndex - previous.chunkIndex !== 1) close();
      current.push(passage);
    }
    close();
  }
  return runs.sort((a, b) => a.firstPosition - b.firstPosition);
}
