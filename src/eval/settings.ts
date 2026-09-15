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

export interface GenerationSettings {
  count: number;
  seed: number;
}

/** Question-generation settings for evaluation. Defaults: 30 questions, seed 42. */
export function readGenerationSettings(env: Record<string, string | undefined>): GenerationSettings {
  const count = readNumber(env, "BIG_RAG_EVAL_COUNT", 30);
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`BIG_RAG_EVAL_COUNT must be a positive whole number, got "${env.BIG_RAG_EVAL_COUNT}"`);
  }
  const seed = readNumber(env, "BIG_RAG_EVAL_SEED", 42);
  if (!Number.isInteger(seed)) {
    throw new Error(`BIG_RAG_EVAL_SEED must be a whole number, got "${env.BIG_RAG_EVAL_SEED}"`);
  }
  return { count, seed };
}
