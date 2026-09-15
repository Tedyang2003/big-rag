import { DEFAULT_WORDING_LEAK_LIMIT } from "./wordingLeak";
import { FIXED_DEFAULTS } from "../settings/defaults";

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

/** Retrieval settings for evaluation runs. Defaults come from src/settings/defaults.ts. */
export function readRetrievalSettings(env: Record<string, string | undefined>): RetrievalSettings {
  const retrievalLimit = readNumber(env, "BIG_RAG_RETRIEVAL_LIMIT", FIXED_DEFAULTS.retrievalLimit);
  if (!Number.isInteger(retrievalLimit) || retrievalLimit < 1 || retrievalLimit > 20) {
    throw new Error(`BIG_RAG_RETRIEVAL_LIMIT must be a whole number between 1 and 20, got "${env.BIG_RAG_RETRIEVAL_LIMIT}"`);
  }

  const retrievalThreshold = readNumber(env, "BIG_RAG_RETRIEVAL_THRESHOLD", FIXED_DEFAULTS.retrievalThreshold);
  if (retrievalThreshold < 0 || retrievalThreshold > 1) {
    throw new Error(`BIG_RAG_RETRIEVAL_THRESHOLD must be between 0 and 1, got "${env.BIG_RAG_RETRIEVAL_THRESHOLD}"`);
  }

  const chunkSize = readNumber(env, "BIG_RAG_CHUNK_SIZE", FIXED_DEFAULTS.chunkSize);
  if (!Number.isInteger(chunkSize) || chunkSize < 128 || chunkSize > 2048) {
    throw new Error(`BIG_RAG_CHUNK_SIZE must be a whole number between 128 and 2048, got "${env.BIG_RAG_CHUNK_SIZE}"`);
  }

  return {
    retrievalLimit,
    retrievalThreshold,
    chunkSize,
    enableContextCompaction: (env.BIG_RAG_ENABLE_COMPACTION ?? String(FIXED_DEFAULTS.enableContextCompaction)).trim().toLowerCase() === "true",
  };
}

export interface GenerationSettings {
  count: number;
  seed: number;
  leakLimit: number;
}

/** Question-generation settings for evaluation. Defaults: 30 questions, seed 42, leak limit 0.7. */
export function readGenerationSettings(env: Record<string, string | undefined>): GenerationSettings {
  const count = readNumber(env, "BIG_RAG_EVAL_COUNT", 30);
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`BIG_RAG_EVAL_COUNT must be a positive whole number, got "${env.BIG_RAG_EVAL_COUNT}"`);
  }
  const seed = readNumber(env, "BIG_RAG_EVAL_SEED", 42);
  if (!Number.isInteger(seed)) {
    throw new Error(`BIG_RAG_EVAL_SEED must be a whole number, got "${env.BIG_RAG_EVAL_SEED}"`);
  }
  const leakLimit = readNumber(env, "BIG_RAG_EVAL_LEAK_LIMIT", DEFAULT_WORDING_LEAK_LIMIT);
  if (leakLimit < 0 || leakLimit > 1) {
    throw new Error(`BIG_RAG_EVAL_LEAK_LIMIT must be between 0 and 1, got "${env.BIG_RAG_EVAL_LEAK_LIMIT}"`);
  }
  return { count, seed, leakLimit };
}
