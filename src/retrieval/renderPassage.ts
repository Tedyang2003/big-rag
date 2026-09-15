import { type SearchResult } from "../vectorstore/vectorStore";

/** Passage text as shown to the model: the chunk's context header (when it has one) followed by its text. */
export function renderPassageForPrompt(result: SearchResult): string {
  const header = result.metadata?.contextHeader;
  return typeof header === "string" && header.length > 0 ? `${header}\n${result.text}` : result.text;
}
