import PQueue from "p-queue";
import * as fs from "fs";
import * as path from "path";
import { scanDirectory, type ScannedFile, type ExcludedFileInfo } from "./fileScanner";
import { parseDocument, type ParseFailureReason } from "../parsers/documentParser";
import { VectorStore, type DocumentChunk } from "../vectorstore/vectorStore";
import { chunkText } from "../utils/textChunker";
import { markdownToPlain } from "../parsers/markdown/normalizeMarkdown";
import { calculateFileHash } from "../utils/fileHash";
import { type EmbeddingDynamicHandle, type LMStudioClient } from "@lmstudio/sdk";
import { FailedFileRegistry } from "../utils/failedFileRegistry";
import { coerceEmbeddingVector } from "../utils/coerceEmbedding";
import { chunkStructured, type StructuredChunk } from "../chunking/structuredChunker";
import { dayRangeOf, detectDayMonthOrder, documentPostedDate, type DateRange } from "../metadata/dates";
import { STRUCTURED_INDEX_FORMAT } from "../utils/embeddingIndexManifest";
import { documentText } from "../utils/embeddingPrefix";

const EXCLUDE_PROGRESS_THROTTLE = 40;

// Progress for Indexing Procedure
/**
 * Whether a thrown error is this run being cancelled rather than a problem with the file.
 *
 * The abort checks sit inside the per-file try, so pausing mid-file threw where a parse error
 * throws, and the file was recorded in the failed-file registry as "parser.unexpected-error".
 * The skip check consults that registry before parsing and keys it on path plus hash, so one
 * pause dropped a perfectly good document from every later incremental run until it was edited.
 *
 * The signal is consulted as well as the error, because anything failing once cancellation has
 * begun is collateral: an in-flight embedding request rejects on its own terms, and none of it
 * says the file is bad.
 */
function isCancellation(error: unknown, abortSignal?: AbortSignal): boolean {
  if (abortSignal?.aborted) return true;
  return error instanceof Error && error.name === "AbortError";
}

export interface IndexingProgress {
  totalFiles: number;
  processedFiles: number;
  currentFile: string;
  status: "scanning" | "indexing" | "complete" | "error";
  successfulFiles?: number;
  failedFiles?: number;
  skippedFiles?: number;
  error?: string;
}

// Results of Indexing Procedure
export interface IndexingResult {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  skippedFiles: number;
  updatedFiles: number;
  newFiles: number;
  deletedFiles: string[]
}

// Fixed Index Outcome
type FileIndexOutcome =
  | { type: "skipped" }
  | { type: "indexed"; changeType: "new" | "updated" }
  | { type: "failed" };

// Indexing Settings
export interface IndexingOptions {
  documentsDir: string;
  vectorStore: VectorStore;
  vectorStoreDir: string;
  embeddingModel: EmbeddingDynamicHandle;
  /** The resolved id of that model, for the prefix convention it expects. */
  embeddingModelId: string;
  client: LMStudioClient;
  chunkSize: number;
  chunkOverlap: number;
  maxConcurrent: number;
  enableOCR: boolean;
  /** Skip a file whose content hash is already in the store. False reprocesses every file. */
  skipUnchangedFiles: boolean;
  parseDelayMs: number;
  /** Build structured chunks (Markdown sections, dates, context headers) instead of legacy chunks. */
  structuredIndexing: boolean;
  /** The store holds chunks in the other format: reprocess every file and replace its old chunks. */
  rebuildExistingFiles: boolean;
  failureReportPath?: string;
  /** Glob patterns (relative to documents dir); matched supported files are skipped before parsing. */
  excludePatterns?: string[];
  abortSignal?: AbortSignal;
  onProgress?: (progress: IndexingProgress) => void;
}

// Types of Failure
type FailureReason = ParseFailureReason | "index.chunk-empty" | "index.vector-add-error";

// Prepared Chunk Object
interface PreparedChunk {
  text: string;
  embedText: string;
  startIndex: number;
  endIndex: number;
  metadata: Record<string, string>;
}

// Index Manager main role is to convert files into chunks in a vector store
export class IndexManager {
  private queue: PQueue;
  private options: IndexingOptions;
  private failureReasonCounts: Record<string, number> = {};
  private failedFileRegistry: FailedFileRegistry;

  constructor(options: IndexingOptions) {
    this.options = options;
    this.queue = new PQueue({ concurrency: options.maxConcurrent });
    this.failedFileRegistry = new FailedFileRegistry(
      path.join(options.vectorStoreDir, ".big-rag-failures.json"),
    );
  }

  // Indexing Process
  async index(): Promise<IndexingResult> {
    const { documentsDir, vectorStore, onProgress } = this.options;

    try {
      // Get File Inventory (object of file path: hashes)
      const fileInventory = await vectorStore.getFileHashInventory();

      // Step 1: Scan directory
      if (onProgress) {
        onProgress({
          totalFiles: 0,
          processedFiles: 0,
          currentFile: "",
          status: "scanning",
        });
      }

      // File Patterns that should be excluded
      const excludePatterns = this.options.excludePatterns ?? [];

      // count
      let excludedByPattern = 0;
      
      // Last excluded item
      let lastExcludeProgressEmittedAt = 0;
      let lastExcludedRelative = "";

      // Call back for status update every x files excluded. To prevent UI Thrashing
      const onExcludedFile: ((info: ExcludedFileInfo) => void) | undefined =
        // If exculde patterns are declared
        excludePatterns.length > 0
          ? (info: ExcludedFileInfo) => {

              excludedByPattern++; // Count this one
              lastExcludedRelative = info.relativePath; // remeber it for the status check

              console.log(
                `Excluded from indexing (exclude pattern): ${info.relativePath} (matched: ${info.pattern})`,
              );

              // No UI listener No need to track this
              if (!onProgress) {
                return;
              }

              // If this is the first one and subsequently every 40th multiple item, return a status updated 
              if (
                excludedByPattern === 1 ||
                excludedByPattern - lastExcludeProgressEmittedAt >= EXCLUDE_PROGRESS_THROTTLE
              ) {

                // Last excluded item
                lastExcludeProgressEmittedAt = excludedByPattern;
                onProgress({
                  totalFiles: 0,
                  processedFiles: 0,
                  currentFile: `Excluded ${excludedByPattern} by pattern (latest: ${lastExcludedRelative})`,
                  status: "scanning",
                });
              }
            }
          : undefined;


      // Scan Directory Function, returns all files that can be indexed. 
      const files = await scanDirectory(
        documentsDir,
        (scanned, found) => {
          if (onProgress) {
            onProgress({
              totalFiles: found,
              processedFiles: 0,
              currentFile: `Scanned ${scanned} files...`,
              status: "scanning",
            });
          }
        },
        {
          excludePatterns,
          onExcludedFile,
        },
      );

      const filePathsSet = new Set(files.map(file => file.path));

      const inventoryItemsMissingFromFiles = Array.from(fileInventory.keys()).filter(
        path => !filePathsSet.has(path)
      );      

      for (const missingFile of inventoryItemsMissingFromFiles) {
        console.log(`${missingFile} is not found, hence deleting from index`)
        const hashes = fileInventory.get(missingFile) ?? []
        for (const hash of hashes) {
          await vectorStore.deleteByFileHash(hash)
        }
      }
      
      

      if (
        onProgress &&
        excludedByPattern > 0 &&
        excludedByPattern !== lastExcludeProgressEmittedAt
      ) {
        onProgress({
          totalFiles: 0,
          processedFiles: 0,
          currentFile: `Excluded ${excludedByPattern} by pattern (latest: ${lastExcludedRelative})`,
          status: "scanning",
        });
      }


      this.options.abortSignal?.throwIfAborted();

      console.log(
        `Found ${files.length} files to process` +
          (excludedByPattern > 0
            ? ` (${excludedByPattern} excluded by exclude patterns)`
            : ""),
      );

      // Step 2: File Indexing process
      let processedCount = 0;
      let successCount = 0;
      let failCount = 0;
      let skippedCount = 0;
      let updatedCount = 0;
      let newCount = 0;

      if (onProgress) {
        onProgress({
          totalFiles: files.length,
          processedFiles: 0,
          currentFile: files[0]?.name ?? "",
          status: "indexing",
        });
      }

      // Abort listener: when signal fires, clear pending tasks from the queue
      const abortSignal = this.options.abortSignal;
      const onAbort = () => this.queue.clear();
      if (abortSignal) {
        abortSignal.addEventListener("abort", onAbort, { once: true });
      }

      // Process files in batches
      const tasks = files.map((file) =>
        this.queue.add(async () => {
          // Check abort before processing each file
          abortSignal?.throwIfAborted();

          let outcome: FileIndexOutcome = { type: "failed" };
          try {
            if (onProgress) {
              onProgress({
                totalFiles: files.length,
                processedFiles: processedCount,
                currentFile: file.name,
                status: "indexing",
                successfulFiles: successCount,
                failedFiles: failCount,
                skippedFiles: skippedCount,
              });
            }

            outcome = await this.indexFile(file, fileInventory);
          } catch (error) {
            if (isCancellation(error, abortSignal)) throw error;
            console.error(`Error indexing file ${file.path}:`, error);
            this.recordFailure(
              "parser.unexpected-error",
              error instanceof Error ? error.message : String(error),
              file,
            );
          }

          // Counter manipulation based on indexFile outcome type to tally values
          processedCount++;
          switch (outcome.type) {
            case "skipped":
              successCount++;
              skippedCount++;
              break;
            case "indexed":
              successCount++;
              if (outcome.changeType === "new") {
                newCount++;
              } else {
                updatedCount++;
              }
              break;
            case "failed":
              failCount++;
              break;
          }

          if (onProgress) {
            onProgress({
              totalFiles: files.length,
              processedFiles: processedCount,
              currentFile: file.name,
              status: "indexing",
              successfulFiles: successCount,
              failedFiles: failCount,
              skippedFiles: skippedCount,
            });
          }
        })
      );

      await Promise.all(tasks);

      // Clean up abort listener
      if (abortSignal) {
        abortSignal.removeEventListener("abort", onAbort);
      }

      if (onProgress) {
        onProgress({
          totalFiles: files.length,
          processedFiles: processedCount,
          currentFile: "",
          status: "complete",
          successfulFiles: successCount,
          failedFiles: failCount,
          skippedFiles: skippedCount,
        });
      }

      this.logFailureSummary();
      await this.writeFailureReport({
        totalFiles: files.length,
        successfulFiles: successCount,
        failedFiles: failCount,
        skippedFiles: skippedCount,
        updatedFiles: updatedCount,
        newFiles: newCount,
        deletedFiles: inventoryItemsMissingFromFiles
      });

      console.log(
        `Indexing complete: ${successCount}/${files.length} files successfully indexed (${failCount} failed, skipped=${skippedCount}, updated=${updatedCount}, new=${newCount})` +
          (excludedByPattern > 0 ? `; excluded by pattern=${excludedByPattern}` : ""),
      );
      
      return {
        totalFiles: files.length,
        successfulFiles: successCount,
        failedFiles: failCount,
        skippedFiles: skippedCount,
        updatedFiles: updatedCount,
        newFiles: newCount,
        deletedFiles: inventoryItemsMissingFromFiles
      };
    } catch (error) {
      console.error("Error during indexing:", error);
      if (onProgress) {
        onProgress({
          totalFiles: 0,
          processedFiles: 0,
          currentFile: "",
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    }

  }

  /**
   * Index a single file
   */
  private async indexFile(
    file: ScannedFile,
    fileInventory: Map<string, Set<string>> = new Map(),
  ): Promise<FileIndexOutcome> {
    const { vectorStore, embeddingModel, client, enableOCR, skipUnchangedFiles } = this.options;

    let fileHash: string | undefined;
    try {
      // Calculate file hash
      fileHash = await calculateFileHash(file.path);

      // Check existence of hash for that file
      const existingHashes = fileInventory.get(file.path);
      const hasSeenBefore = existingHashes !== undefined && existingHashes.size > 0;
      const hasSameHash = existingHashes?.has(fileHash) ?? false;

      // If indicated to skip unchanged files or rebuild existing files
      const skipUnchanged = skipUnchangedFiles && !this.options.rebuildExistingFiles;

      // If requested to skip file that is unchanged and the hash is the same log that and skip. 
      if (skipUnchanged && hasSameHash) {
        console.log(`File already indexed (skipped): ${file.name}`);
        return { type: "skipped" };
      }

      //  If requested to skip file 
      if (skipUnchanged) {
        const previousFailure = await this.failedFileRegistry.getFailureReason(file.path, fileHash);
        
        // Check if the file failed previously and return skipped 
        if (previousFailure) {
          console.log(
            `File previously failed (skipped): ${file.name} (reason=${previousFailure})`,
          );


          return { type: "skipped" };
        }
      }

      // Wait before parsing to reduce WebSocket load
      if (this.options.parseDelayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, this.options.parseDelayMs));
      }

      // If not requested to skip unchanged files. Parse 
      const parsedResult = await parseDocument(file.path, enableOCR, client);
      
      // If parsing is unsuccessful, recprd faolure
      if (!parsedResult.success) {
        this.recordFailure(parsedResult.reason, parsedResult.details, file);
        if (fileHash) {
          await this.failedFileRegistry.recordFailure(file.path, fileHash, parsedResult.reason);
        }

        // Drop Stale chunks
        await this.dropStaleChunksForRebuild(existingHashes);
        return { type: "failed" };
      }

      // Get parsed content
      const parsed = parsedResult.document;

      // Prepare the chunks to be structured or legacy
      const chunks = this.options.structuredIndexing
        ? await this.prepareStructuredChunks(parsed.text, file)
        : await this.prepareLegacyChunks(parsed.text);

      // If the there are no chunks record failure
      if (chunks.length === 0) {
        console.log(`No chunks created from ${file.name}`);
        this.recordFailure("index.chunk-empty", "chunking produced 0 chunks", file);
        if (fileHash) {
          await this.failedFileRegistry.recordFailure(file.path, fileHash, "index.chunk-empty");
        }
        await this.dropStaleChunksForRebuild(existingHashes);
        return { type: "failed" };
      }

      // Generate embeddings and create document chunks
      const documentChunks: DocumentChunk[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Check abort between chunk embeddings
        this.options.abortSignal?.throwIfAborted();

        try {
          // Generate embedding
          const embeddingResult = await embeddingModel.embed(
            documentText(this.options.embeddingModelId, chunk.embedText),
          );
          const embedding = coerceEmbeddingVector(embeddingResult.embedding);

          documentChunks.push({
            id: `${fileHash}-${i}`,
            text: chunk.text,
            vector: embedding,
            filePath: file.path,
            fileName: file.name,
            fileHash,
            chunkIndex: i,
            metadata: {
              extension: file.extension,
              size: file.size,
              mtime: file.mtime.toISOString(),
              startIndex: chunk.startIndex,
              endIndex: chunk.endIndex,
              ...chunk.metadata,
            },
          });
        } catch (error) {
          if (isCancellation(error, this.options.abortSignal)) throw error;
          console.error(`Error embedding chunk ${i} of ${file.name}:`, error);
        }
      }

      // Add chunks to vector store
      if (documentChunks.length === 0) {
        this.recordFailure(
          "index.chunk-empty",
          "All chunk embeddings failed, no document chunks",
          file,
        );
        if (fileHash) {
          await this.failedFileRegistry.recordFailure(file.path, fileHash, "index.chunk-empty");
        }
        await this.dropStaleChunksForRebuild(existingHashes);
        return { type: "failed" };
      }


      // Drop old chunks and add new ones to file inventory hash to file mapping
      try {
        await this.dropStaleChunksForRebuild(existingHashes);
        await vectorStore.addChunks(documentChunks);
        console.log(`Indexed ${documentChunks.length} chunks from ${file.name}`);
        if (!existingHashes) {
          fileInventory.set(file.path, new Set([fileHash]));
        } else {
          existingHashes.add(fileHash);
        }
        await this.failedFileRegistry.clearFailure(file.path);
        return {
          type: "indexed",
          changeType: hasSeenBefore ? "updated" : "new",
        };
      } catch (error) {
        if (isCancellation(error, this.options.abortSignal)) throw error;
        console.error(`Error adding chunks for ${file.name}:`, error);
        this.recordFailure(
          "index.vector-add-error",
          error instanceof Error ? error.message : String(error),
          file,
        );
        if (fileHash) {
          await this.failedFileRegistry.recordFailure(file.path, fileHash, "index.vector-add-error");
        }
        return { type: "failed" };
      }
    } catch (error) {
      if (isCancellation(error, this.options.abortSignal)) throw error;
          console.error(`Error indexing file ${file.path}:`, error);
          this.recordFailure(
            "parser.unexpected-error",
            error instanceof Error ? error.message : String(error),
            file,
          );
      if (fileHash) {
        await this.failedFileRegistry.recordFailure(file.path, fileHash, "parser.unexpected-error");
      }
      return { type: "failed" }; // Failed
    }
  }

  /**
   * When rebuilding because the index format changed, a file's old-format
   * chunks must never survive the rebuild, even if the rebuild itself fails
   * (parse failure, zero chunks, or every embedding failing) - otherwise the
   * store ends up mixing formats and the stale chunks are never revisited.
   */
  private async dropStaleChunksForRebuild(existingHashes: Set<string> | undefined): Promise<void> {
    if (!this.options.rebuildExistingFiles || !existingHashes) {
      return;
    }
    for (const oldHash of existingHashes) {
      await this.options.vectorStore.deleteByFileHash(oldHash);
    }
    existingHashes.clear();
  }

  private async prepareLegacyChunks(text: string): Promise<PreparedChunk[]> {
    const chunks = await chunkText(markdownToPlain(text), this.options.chunkSize, this.options.chunkOverlap, (t) =>
      this.options.embeddingModel.countTokens(t),
    );
    return chunks.map((chunk) => ({
      text: chunk.text,
      embedText: chunk.text,
      startIndex: chunk.startIndex,
      endIndex: chunk.endIndex,
      metadata: { indexFormat: "legacy" },
    }));
  }

  private async prepareStructuredChunks(markdown: string, file: ScannedFile): Promise<PreparedChunk[]> {
    const base = {
      fileName: file.name,
      chunkSize: this.options.chunkSize,
      countTokens: (t: string) => this.options.embeddingModel.countTokens(t),
    };

    let postedDate: DateRange;
    let chunks: StructuredChunk[];
    try {
      postedDate = documentPostedDate(markdown, file.name, file.mtime);
      chunks = await chunkStructured(markdown, {
        ...base,
        postedDate,
        dateContext: {
          order: detectDayMonthOrder(markdown),
          referenceTime: file.mtime,
          defaultYear: Number(postedDate.start.slice(0, 4)),
        },
      });
    } catch (error) {
      console.warn(`[BigRAG] Date extraction failed for ${file.name}; indexing without dates:`, error);
      postedDate = dayRangeOf(file.mtime);
      chunks = await chunkStructured(markdown, { ...base, postedDate, dateContext: {}, extractDates: false });
    }

    return chunks.map((chunk) => ({
      text: chunk.text,
      embedText: `${chunk.contextHeader}\n${chunk.embedText ?? chunk.text}`,
      startIndex: chunk.startIndex,
      endIndex: chunk.endIndex,
      metadata: {
        indexFormat: STRUCTURED_INDEX_FORMAT,
        postedDate: JSON.stringify(postedDate),
        dates: JSON.stringify(chunk.dates),
        sectionPath: chunk.sectionPath,
        contextHeader: chunk.contextHeader,
      },
    }));
  }

  /**
   * Reindex a specific file (delete old chunks and reindex)
   */
  async reindexFile(filePath: string): Promise<void> {
    const { vectorStore } = this.options;

    try {
      const fileHash = await calculateFileHash(filePath);
      
      // Delete old chunks
      await vectorStore.deleteByFileHash(fileHash);
      
      // Reindex
      const file: ScannedFile = {
        path: filePath,
        name: filePath.split("/").pop() || filePath,
        extension: filePath.split(".").pop() || "",
        mimeType: false,
        size: 0,
        mtime: new Date(),
      };
      
      await this.indexFile(file);
    } catch (error) {
      console.error(`Error reindexing file ${filePath}:`, error);
      throw error;
    }
  }

  private recordFailure(reason: FailureReason, details: string | undefined, file: ScannedFile) {
    const current = this.failureReasonCounts[reason] ?? 0;
    this.failureReasonCounts[reason] = current + 1;
    const detailSuffix = details ? ` details=${details}` : "";
    console.warn(
      `[BigRAG] Failed to parse ${file.name} (reason=${reason}, count=${this.failureReasonCounts[reason]})${detailSuffix}`,
    );
  }

  private logFailureSummary() {
    const entries = Object.entries(this.failureReasonCounts);
    if (entries.length === 0) {
      console.log("[BigRAG] No parsing failures recorded.");
      return;
    }
    console.log("[BigRAG] Failure reason summary:");
    for (const [reason, count] of entries) {
      console.log(`  - ${reason}: ${count}`);
    }
  }

  private async writeFailureReport(summary: IndexingResult) {
    const reportPath = this.options.failureReportPath;
    if (!reportPath) {
      return;
    }

    const payload = {
      ...summary,
      documentsDir: this.options.documentsDir,
      failureReasons: this.failureReasonCounts,
      generatedAt: new Date().toISOString(),
    };

    try {
      await fs.promises.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.promises.writeFile(reportPath, JSON.stringify(payload, null, 2), "utf-8");
      console.log(`[BigRAG] Wrote failure report to ${reportPath}`);
    } catch (error) {
      console.error(`[BigRAG] Failed to write failure report to ${reportPath}:`, error);
    }
  }
}

