import { LMStudioClient } from "@lmstudio/sdk";
import { resolveEmbeddingModelId } from "./config";
import { runIndexingJob } from "./ingestion/runIndexing";
import { parseExcludePatternsFromEnv } from "./utils/fileExcludePatterns";
import { readCliIndexingSettings } from "./settings/cliSettings";

async function main() {
  const documentsDir = process.env.BIG_RAG_DOCS_DIR ?? process.argv[2];
  const vectorStoreDir = process.env.BIG_RAG_DB_DIR ?? process.argv[3];

  if (!documentsDir || !vectorStoreDir) {
    console.error(
      "Usage: BIG_RAG_DOCS_DIR=/path/to/docs BIG_RAG_DB_DIR=/path/to/db node dist/cliIndex.js\n" +
        "   or: node dist/cliIndex.js /path/to/docs /path/to/db",
    );
    process.exit(1);
  }

  const { chunkSize, chunkOverlap, maxConcurrent, enableOCR, parseDelayMs, structuredIndexing } =
    readCliIndexingSettings(process.env);
  const forceReindex = (process.env.BIG_RAG_FORCE_REINDEX ?? "false").toLowerCase() === "true";
  const failureReportPath = process.env.BIG_RAG_FAILURE_REPORT_PATH;
  const excludePatterns = parseExcludePatternsFromEnv(process.env.BIG_RAG_EXCLUDE_PATTERNS);

  const resolvedEmbeddingModelId = resolveEmbeddingModelId(process.env.BIG_RAG_EMBEDDING_MODEL);

  console.log("[BigRAG CLI] Starting indexing");
  console.log(`[BigRAG CLI] Documents dir: ${documentsDir}`);
  console.log(`[BigRAG CLI] Vector store dir: ${vectorStoreDir}`);
  console.log(`[BigRAG CLI] Embedding model: ${resolvedEmbeddingModelId}`);
  console.log(`[BigRAG CLI] Structured indexing: ${structuredIndexing}`);
  if (excludePatterns.length > 0) {
    console.log(`[BigRAG CLI] Exclude patterns (${excludePatterns.length}): ${excludePatterns.join(", ")}`);
  }

  const client = new LMStudioClient();

  // runIndexingJob wants a signal so a chat can cancel a run. The CLI has nothing to cancel
  // from, so it passes one that is never aborted.
  const abortSignal = new AbortController().signal;

  try {
    const { summary } = await runIndexingJob({
      client,
      abortSignal,
      documentsDir,
      vectorStoreDir,
      embeddingModelId: resolvedEmbeddingModelId,
      chunkSize,
      chunkOverlap,
      maxConcurrent,
      enableOCR,
      structuredIndexing,
      skipUnchangedFiles: !forceReindex,
      forceReindex,
      parseDelayMs,
      excludePatterns,
      failureReportPath,
      // No vectorStore is passed, so runIndexingJob builds, initialises and closes its own.
      onProgress: (progress) => {
        if (progress.status === "scanning") {
          console.log(`[BigRAG CLI] Scanning: ${progress.currentFile || "discovering files"}`);
        } else if (progress.status === "indexing") {
          const success = progress.successfulFiles ?? 0;
          const failed = progress.failedFiles ?? 0;
          const skipped = progress.skippedFiles ?? 0;
          console.log(
            `[BigRAG CLI] Indexing: ${progress.processedFiles}/${progress.totalFiles} files ` +
              `(success=${success}, failed=${failed}, skipped=${skipped})`,
          );
        } else if (progress.status === "complete") {
          console.log(`[BigRAG CLI] Indexing complete: ${progress.processedFiles} files processed`);
        } else if (progress.status === "error") {
          console.error(`[BigRAG CLI] Indexing error: ${progress.error}`);
        }
      },
    });

    console.log(`[BigRAG CLI] ${summary}`);
  } catch (error) {
    console.error("[BigRAG CLI] Error during indexing:", error);
    process.exitCode = 1;
  }
}

void main();


