import { DEFAULT_PROMPT_TEMPLATE, resolveEmbeddingModelId } from "../config";
import { parseExcludePatternsBlock } from "../utils/fileExcludePatterns";
import { type RetrievalDepth } from "../retrieval/retrieve";
import { FIXED_DEFAULTS } from "./defaults";

export type ReindexMode = "off" | "changed" | "rebuild";

/** Minimal view of LM Studio's parsed config, so tests can pass plain stubs. */
export interface ConfigReader {
  get(key: string): unknown;
}

export interface ResolvedSettings {
  documentsDirectory: string;
  vectorStoreDirectory: string;
  embeddingModelId: string;
  excludePatterns: string[];
  promptTemplate: string;
  reindexMode: ReindexMode;
  retrievalDepth: RetrievalDepth;
  laneCandidates: number;
  rrfConstant: number;
  laneWeightVector: number;
  laneWeightKeyword: number;
  laneWeightDate: number;
  catalogMaxChunks: number;
  bm25K1: number;
  bm25B: number;
  catalogVersion: number;
  retrievalLimit: number;
  retrievalThreshold: number;
  chunkSize: number;
  chunkOverlap: number;
  maxConcurrentFiles: number;
  parseDelayMs: number;
  enableOCR: boolean;
  structuredIndexing: boolean;
  enableContextCompaction: boolean;
  /** Required global settings that are empty, by display name. */
  missingRequired: string[];
}

/** Wraps an LM Studio ParsedConfig (whose typed get() only accepts its own keys) as a ConfigReader. */
export function asConfigReader(config: { get: unknown }): ConfigReader {
  const get = config.get as (key: string) => unknown;
  return { get: (key) => get.call(config, key) };
}

function readString(config: ConfigReader, key: string): string {
  const value = config.get(key);
  return typeof value === "string" ? value : "";
}

export function resolveSettings(globalConfig: ConfigReader, chatConfig: ConfigReader): ResolvedSettings {
  const documentsDirectory = readString(globalConfig, "documentsDirectory").trim();
  const vectorStoreDirectory = readString(globalConfig, "vectorStoreDirectory").trim();
  const missingRequired: string[] = [];
  if (!documentsDirectory) missingRequired.push("Documents Directory");
  if (!vectorStoreDirectory) missingRequired.push("Vector Store Directory");

  const promptTemplate = readString(globalConfig, "promptTemplate");
  const reindexMode = readString(chatConfig, "reindexMode");
  const retrievalDepth = readString(chatConfig, "retrievalDepth");

  return {
    documentsDirectory,
    vectorStoreDirectory,
    embeddingModelId: resolveEmbeddingModelId(readString(globalConfig, "embeddingModel")),
    excludePatterns: parseExcludePatternsBlock(readString(globalConfig, "excludeFilenamePatterns")),
    promptTemplate: promptTemplate.trim() ? promptTemplate : DEFAULT_PROMPT_TEMPLATE,
    reindexMode: reindexMode === "changed" || reindexMode === "rebuild" ? reindexMode : "off",
    retrievalDepth: retrievalDepth === "low" ? "low" : "medium",
    ...FIXED_DEFAULTS,
    missingRequired,
  };
}

export function notConfiguredMessage(missingRequired: string[]): string {
  return `Big RAG is not in use: set ${missingRequired.join(" and ")} in Big RAG's global settings.`;
}
