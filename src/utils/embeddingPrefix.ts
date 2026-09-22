/**
 * Nomic's embedding models are trained asymmetrically: a document is embedded as
 * "search_document: …" and a question as "search_query: …", which places a question near the
 * passages that answer it. Without the prefixes, scores are flatter and ranking is worse. Any
 * other model is embedded as-is, since these strings mean nothing to it.
 *
 * Both sides must agree. One module owns the decision so they cannot drift apart, and the
 * index manifest records which convention an index was built with.
 */
export type EmbeddingPrefixes = "nomic" | "none";

const DOCUMENT_PREFIX = "search_document: ";
const QUERY_PREFIX = "search_query: ";

export function prefixConventionFor(modelId: string): EmbeddingPrefixes {
  return /nomic-embed/i.test(modelId) ? "nomic" : "none";
}

export function documentText(modelId: string, text: string): string {
  return prefixConventionFor(modelId) === "nomic" ? `${DOCUMENT_PREFIX}${text}` : text;
}

export function queryText(modelId: string, text: string): string {
  return prefixConventionFor(modelId) === "nomic" ? `${QUERY_PREFIX}${text}` : text;
}
