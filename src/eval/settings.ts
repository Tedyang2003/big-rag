export interface RetrievalSettings {
  retrievalLimit: number;
  retrievalThreshold: number;
  chunkSize: number;
  enableContextCompaction: boolean;
}

function readNumber(env: Record<string, string | undefined>, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a number, got "${raw}"`);
  }
  return value;
}

/** Retrieval settings for evaluation runs. Defaults must match src/config.ts. */
export function readRetrievalSettings(env: Record<string, string | undefined>): RetrievalSettings {
  return {
    retrievalLimit: readNumber(env, "BIG_RAG_RETRIEVAL_LIMIT", 5),
    retrievalThreshold: readNumber(env, "BIG_RAG_RETRIEVAL_THRESHOLD", 0.5),
    chunkSize: readNumber(env, "BIG_RAG_CHUNK_SIZE", 512),
    enableContextCompaction: (env.BIG_RAG_ENABLE_COMPACTION ?? "false").trim().toLowerCase() === "true",
  };
}
