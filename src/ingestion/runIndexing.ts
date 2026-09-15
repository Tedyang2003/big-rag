import { type LMStudioClient } from "@lmstudio/sdk";
import { IndexManager, type IndexingProgress, type IndexingResult } from "./indexManager";
import { VectorStore } from "../vectorstore/vectorStore";
import { resolveEmbeddingModelId } from "../config";
import { planIndexFormat, syncEmbeddingManifestAfterIndexing } from "../utils/embeddingIndexManifest";

export interface RunIndexingParams {
  client: LMStudioClient;
  abortSignal: AbortSignal;
  documentsDir: string;
  vectorStoreDir: string;
  embeddingModelId: string;
  chunkSize: number;
  chunkOverlap: number;
  maxConcurrent: number;
  enableOCR: boolean;
  structuredIndexing: boolean;
  autoReindex: boolean;
  parseDelayMs: number;
  /** Glob patterns relative to documents dir; matching supported files are not parsed or embedded. */
  excludePatterns?: string[];
  forceReindex?: boolean;
  vectorStore?: VectorStore;
  onProgress?: (progress: IndexingProgress) => void;
}

export interface RunIndexingResult {
  summary: string;
  stats: {
    totalChunks: number;
    uniqueFiles: number;
  };
  indexingResult: IndexingResult;
}

/**
 * Shared helper that runs the full indexing pipeline.
 * Allows reuse across the manual tool, config-triggered indexing, and automatic bootstrapping.
 */
export async function runIndexingJob({
  client,
  abortSignal,
  documentsDir,
  vectorStoreDir,
  embeddingModelId,
  chunkSize,
  chunkOverlap,
  maxConcurrent,
  enableOCR,
  structuredIndexing,
  autoReindex,
  parseDelayMs,
  excludePatterns = [],
  forceReindex = false,
  vectorStore: existingVectorStore,
  onProgress,
}: RunIndexingParams): Promise<RunIndexingResult> {
  const vectorStore = existingVectorStore ?? new VectorStore(vectorStoreDir);
  const ownsVectorStore = existingVectorStore === undefined;

  if (ownsVectorStore) {
    await vectorStore.initialize();
  }

  const resolvedModelId = resolveEmbeddingModelId(embeddingModelId);
  const embeddingModel = await client.embedding.model(resolvedModelId, { signal: abortSignal });

  const statsBefore = await vectorStore.getStats();
  const { indexFormat, rebuildExistingFiles } = await planIndexFormat(
    vectorStoreDir,
    statsBefore.totalChunks,
    structuredIndexing,
  );

  const indexManager = new IndexManager({
    documentsDir,
    vectorStore,
    vectorStoreDir,
    embeddingModel,
    client,
    chunkSize,
    chunkOverlap,
    maxConcurrent,
    enableOCR,
    autoReindex: forceReindex || rebuildExistingFiles ? false : autoReindex,
    structuredIndexing,
    rebuildExistingFiles,
    parseDelayMs,
    excludePatterns,
    abortSignal,
    onProgress,
  });

  let indexingResult: IndexingResult;
  try {
    indexingResult = await indexManager.index();
  } finally {
    await vectorStore.releaseShardCache();
  }
  const stats = await vectorStore.getStats();

  await syncEmbeddingManifestAfterIndexing(
    vectorStoreDir,
    stats.totalChunks,
    resolvedModelId,
    embeddingModel,
    indexFormat,
  );

  if (ownsVectorStore) {
    await vectorStore.close();
  }

  const summary = `Indexing completed!\n\n` +
    `• Successfully indexed: ${indexingResult.successfulFiles}/${indexingResult.totalFiles}\n` +
    `• Failed: ${indexingResult.failedFiles}\n` +
    `• Skipped (unchanged): ${indexingResult.skippedFiles}\n` +
    `• Updated existing files: ${indexingResult.updatedFiles}\n` +
    `• New files added: ${indexingResult.newFiles}\n` +
    `• Chunks in store: ${stats.totalChunks}\n` +
    `• Unique files in store: ${stats.uniqueFiles}`;

  return {
    summary,
    stats,
    indexingResult,
  };
}

