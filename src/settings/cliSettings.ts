import { FIXED_DEFAULTS } from "./defaults";

export interface CliIndexingSettings {
  chunkSize: number;
  chunkOverlap: number;
  maxConcurrent: number;
  enableOCR: boolean;
  parseDelayMs: number;
  structuredIndexing: boolean;
}

function readNumber(env: Record<string, string | undefined>, name: string, fallback: number): number {
  const raw = env[name];
  return raw ? Number(raw) : fallback;
}

function readBoolean(env: Record<string, string | undefined>, name: string, fallback: boolean): boolean {
  return (env[name] ?? String(fallback)).toLowerCase() === "true";
}

/** Indexing settings for the headless CLI: fixed defaults, overridable with BIG_RAG_* env vars. */
export function readCliIndexingSettings(env: Record<string, string | undefined>): CliIndexingSettings {
  return {
    chunkSize: readNumber(env, "BIG_RAG_CHUNK_SIZE", FIXED_DEFAULTS.chunkSize),
    chunkOverlap: readNumber(env, "BIG_RAG_CHUNK_OVERLAP", FIXED_DEFAULTS.chunkOverlap),
    maxConcurrent: readNumber(env, "BIG_RAG_MAX_CONCURRENT", FIXED_DEFAULTS.maxConcurrentFiles),
    enableOCR: readBoolean(env, "BIG_RAG_ENABLE_OCR", FIXED_DEFAULTS.enableOCR),
    parseDelayMs: readNumber(env, "BIG_RAG_PARSE_DELAY_MS", FIXED_DEFAULTS.parseDelayMs),
    structuredIndexing: readBoolean(env, "BIG_RAG_STRUCTURED_INDEXING", FIXED_DEFAULTS.structuredIndexing),
  };
}
