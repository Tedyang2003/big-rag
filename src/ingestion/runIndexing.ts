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
  skipUnchangedFiles: boolean;
  parseDelayMs: number;
  /** Glob patterns relative to documents dir; matching supported files are not parsed or embedded. */
  excludePatterns?: string[];
  forceReindex?: boolean;
  /** Where to write the report of files that could not be parsed. The CLI uses this; the plugin does not. */
  failureReportPath?: string;
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
  deleted_string: string
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
  skipUnchangedFiles,
  parseDelayMs,
  excludePatterns = [],
  forceReindex = false,
  failureReportPath,
  vectorStore: existingVectorStore,
  onProgress,
}: RunIndexingParams): Promise<RunIndexingResult> {

  // Check if there is a need for vector store (CLI vs App Use)
  const vectorStore = existingVectorStore ?? new VectorStore(vectorStoreDir);
  const ownsVectorStore = existingVectorStore === undefined;

  // If it needs a vector store, run init
  if (ownsVectorStore) {
    await vectorStore.initialize();
  }

  // Handle the Embedder ID. Else use the Default one if fail
  const resolvedModelId = resolveEmbeddingModelId(embeddingModelId);

  // Load the model if fail, abort 
  const embeddingModel = await client.embedding.model(resolvedModelId, { signal: abortSignal });

  // Get current vectorStore statistics
  const statsBefore = await vectorStore.getStats();
  
  const { indexFormat, rebuildExistingFiles } = await planIndexFormat(
    vectorStoreDir,
    statsBefore.totalChunks,
    structuredIndexing,
    resolvedModelId,
  );

  const indexManager = new IndexManager({
    documentsDir,
    vectorStore,
    vectorStoreDir,
    embeddingModel,
    embeddingModelId: resolvedModelId,
    client,
    chunkSize,
    chunkOverlap,
    maxConcurrent,
    enableOCR,
    skipUnchangedFiles: forceReindex || rebuildExistingFiles ? false : skipUnchangedFiles,
    structuredIndexing,
    rebuildExistingFiles,
    parseDelayMs,
    excludePatterns,
    failureReportPath,
    abortSignal,
    onProgress,
  });

  let indexingResult: IndexingResult;
  try {
    indexingResult = await indexManager.index();
  } finally {

    // Release Cache after disk writing
    await vectorStore.releaseShardCache();
  }
  const stats = await vectorStore.getStats();

  // Resync Manifest for future use
  await syncEmbeddingManifestAfterIndexing(
    vectorStoreDir,
    stats.totalChunks,
    resolvedModelId,
    embeddingModel,
    indexFormat,
  );

  // Used mainly for CLI with no plugin vectorstore init, close connection
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
  
  let deleted_string = ''
  const string_cap = 5

  const deletedFiles = indexingResult.deletedFiles

  if (deletedFiles.length > 0){
    deleted_string = 'The following files could not be detected from your document directory\n\n' + deletedFiles.join('\n\n') + '\n\nHence we have deleted them from you vector DB as well. You will not be able to query for them.'
    if (deletedFiles.length > string_cap) {
      deleted_string = 'The following files could not be detected from your document directory\n\n' + deletedFiles.slice(0,string_cap).join('\n\n') + `\nand ${deletedFiles.length-string_cap} more...` + '\n\nHence we have deleted them from you vector DB as well. You will not be able to query for them.'
    } 
  } 

  return {
    summary,
    stats,
    indexingResult,
    deleted_string
  };
}

