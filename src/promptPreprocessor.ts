import {
  type ChatMessage,
  type FileHandle,
  type LMStudioClient,
  type PromptPreprocessorController,
  type RetrievalResultEntry,
} from "@lmstudio/sdk";
import { configSchematics, DEFAULT_PROMPT_TEMPLATE, globalConfigSchematics } from "./config";
import {
  asConfigReader,
  notConfiguredMessage,
  resolveSettings,
  type ReindexMode,
  type ResolvedSettings,
} from "./settings/resolveSettings";
import { VectorStore } from "./vectorstore/vectorStore";
import { performSanityChecks } from "./utils/sanityChecks";
import { tryStartIndexing, finishIndexing } from "./utils/indexingLock";
import {
  checkEmbeddingModelForRetrieval,
  deleteEmbeddingIndexManifest,
  indexFormatStatusMessage,
} from "./utils/embeddingIndexManifest";
import * as path from "path";
import { runIndexingJob } from "./ingestion/runIndexing";
import { retrieve } from "./retrieval/retrieve";
import { renderPassageForPrompt } from "./retrieval/renderPassage";
import { getCatalog, resetCatalogCache } from "./retrieval/catalogManager";

/**
 * Check the abort signal and throw if the request has been cancelled.
 * This gives LM Studio the opportunity to stop the preprocessor promptly.
 */
function checkAbort(signal: AbortSignal): void {
  if (signal.aborted) {
    throw signal.reason ?? new DOMException("Aborted", "AbortError");
  }
}

/**
 * Returns true if the error is an abort/cancellation error that should be re-thrown.
 */
function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error && error.name === "AbortError") return true;
  if (error instanceof Error && error.message === "Aborted") return true;
  return false;
}

function summarizeText(text: string, maxLines: number = 3, maxChars: number = 400): string {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
  const clippedLines = lines.slice(0, maxLines);
  let clipped = clippedLines.join("\n");
  if (clipped.length > maxChars) {
    clipped = clipped.slice(0, maxChars);
  }
  const needsEllipsis =
    lines.length > maxLines ||
    text.length > clipped.length ||
    clipped.length === maxChars && text.length > maxChars;
  return needsEllipsis ? `${clipped.trimEnd()}…` : clipped;
}

// Global state for vector store (persists across requests)
let vectorStore: VectorStore | null = null;
let lastIndexedDir = "";
let sanityChecksPassed = false;
let lastSanityCheckedDirs = "";

// Cache of FileHandles prepared for citations, keyed by file path (persists
// across requests like the state above). Keyed by fileHash too so a
// reindexed file gets a fresh handle instead of citing stale content under
// a stale registration.
const citationFileHandleCache = new Map<string, { fileHash: string; fileHandle: FileHandle }>();

async function getCitationFileHandle(
  client: LMStudioClient,
  filePath: string,
  fileHash: string,
): Promise<FileHandle> {
  const cached = citationFileHandleCache.get(filePath);
  if (cached && cached.fileHash === fileHash) {
    return cached.fileHandle;
  }
  const fileHandle = await client.files.prepareFile(filePath);
  citationFileHandleCache.set(filePath, { fileHash, fileHandle });
  return fileHandle;
}

const RAG_CONTEXT_MACRO = "{{rag_context}}";
const USER_QUERY_MACRO = "{{user_query}}";

function normalizePromptTemplate(template: string | null | undefined): string {
  const hasContent = typeof template === "string" && template.trim().length > 0;
  let normalized = hasContent ? template! : DEFAULT_PROMPT_TEMPLATE;

  if (!normalized.includes(RAG_CONTEXT_MACRO)) {
    console.warn(
      `[BigRAG] Prompt template missing ${RAG_CONTEXT_MACRO}. Prepending RAG context block.`,
    );
    normalized = `${RAG_CONTEXT_MACRO}\n\n${normalized}`;
  }

  if (!normalized.includes(USER_QUERY_MACRO)) {
    console.warn(
      `[BigRAG] Prompt template missing ${USER_QUERY_MACRO}. Appending user query block.`,
    );
    normalized = `${normalized}\n\nUser Query:\n\n${USER_QUERY_MACRO}`;
  }

  return normalized;
}

function fillPromptTemplate(template: string, replacements: Record<string, string>): string {
  return Object.entries(replacements).reduce(
    (acc, [token, value]) => acc.split(token).join(value),
    template,
  );
}

async function warnIfContextOverflow(
  ctl: PromptPreprocessorController,
  finalPrompt: string,
): Promise<void> {
  try {
    const tokenSource = await ctl.tokenSource();
    if (
      !tokenSource ||
      !("applyPromptTemplate" in tokenSource) ||
      typeof tokenSource.applyPromptTemplate !== "function" ||
      !("countTokens" in tokenSource) ||
      typeof tokenSource.countTokens !== "function" ||
      !("getContextLength" in tokenSource) ||
      typeof tokenSource.getContextLength !== "function"
    ) {
      console.warn("[BigRAG] Token source does not expose prompt utilities; skipping context check.");
      return;
    }

    const [contextLength, history] = await Promise.all([
      tokenSource.getContextLength(),
      ctl.pullHistory(),
    ]);
    const historyWithLatestMessage = history.withAppended({
      role: "user",
      content: finalPrompt,
    });
    const formattedPrompt = await tokenSource.applyPromptTemplate(historyWithLatestMessage);
    const promptTokens = await tokenSource.countTokens(formattedPrompt);

    if (promptTokens > contextLength) {
      const warningSummary =
        `⚠️ Prompt needs ${promptTokens.toLocaleString()} tokens but model max is ${contextLength.toLocaleString()}.`;
      console.warn("[BigRAG]", warningSummary);
      ctl.createStatus({
        status: "error",
        text: `${warningSummary} Reduce retrieved passages or increase the model's context length.`,
      });
      try {
        await ctl.client.system.notify({
          title: "Context window exceeded",
          description: `${warningSummary} Prompt may be truncated or rejected.`,
          noAutoDismiss: true,
        });
      } catch (notifyError) {
        console.warn("[BigRAG] Unable to send context overflow notification:", notifyError);
      }
    }
  } catch (error) {
    console.warn("[BigRAG] Failed to evaluate context usage:", error);
  }
}

/**
 * Main prompt preprocessor function
 */
export async function preprocess(
  ctl: PromptPreprocessorController,
  userMessage: ChatMessage,
): Promise<ChatMessage | string> {
  const userPrompt = userMessage.getText();
  const settings = resolveSettings(
    asConfigReader(ctl.getGlobalPluginConfig(globalConfigSchematics)),
    asConfigReader(ctl.getPluginConfig(configSchematics)),
  );

  if (settings.missingRequired.length > 0) {
    const text = notConfiguredMessage(settings.missingRequired);
    console.warn(`[BigRAG] ${text}`);
    ctl.createStatus({ status: "canceled", text });
    return userMessage;
  }

  const {
    documentsDirectory: documentsDir,
    vectorStoreDirectory: vectorStoreDir,
    embeddingModelId: resolvedEmbeddingModelId,
    excludePatterns,
    retrievalLimit,
    retrievalThreshold,
    chunkSize,
    chunkOverlap,
    maxConcurrentFiles: maxConcurrent,
    parseDelayMs,
    enableOCR,
    structuredIndexing,
    enableContextCompaction,
    reindexMode,
    retrievalDepth,
  } = settings;

  try {
    // Sanity checks and vector store init are one-time setup (guarded below)
    // - merged into a single status so a fresh session shows one "Using Big
    // RAG" line instead of two separate ones, and steady-state turns (once
    // both are already done) show nothing extra at all.
    const currentDirsKey = `${documentsDir}\n${vectorStoreDir}`;
    const needsSanityCheck = !sanityChecksPassed || lastSanityCheckedDirs !== currentDirsKey;
    const needsVectorStoreInit = !vectorStore || lastIndexedDir !== vectorStoreDir;

    if (needsSanityCheck || needsVectorStoreInit) {
      const usingBigRagStatus = ctl.createStatus({
        status: "loading",
        text: "Using Big RAG...",
      });

      if (needsSanityCheck) {
        // Check if the documents and vector store directories exist and are accessible, and check disk space and memory
        const sanityResult = await performSanityChecks(documentsDir, vectorStoreDir);

        // Log warnings
        for (const warning of sanityResult.warnings) {
          console.warn("[BigRAG]", warning);
        }

        // Log errors and abort if critical
        if (!sanityResult.passed) {
          for (const error of sanityResult.errors) {
            console.error("[BigRAG]", error);
          }
          const failureReason =
            sanityResult.errors[0] ??
            sanityResult.warnings[0] ??
            "Unknown reason. Please review plugin settings.";
          usingBigRagStatus.setState({
            status: "canceled",
            text: `Big RAG unavailable: ${failureReason}`,
          });
          return userMessage;
        }

        sanityChecksPassed = true;
        lastSanityCheckedDirs = currentDirsKey;
      }

      checkAbort(ctl.abortSignal);

      if (needsVectorStoreInit) {
        // Create Vector Store if it does not exist yet, or open existing one
        vectorStore = new VectorStore(vectorStoreDir);
        await vectorStore.initialize();
        const statsAfterInit = await vectorStore.getStats();
        if (statsAfterInit.totalChunks === 0) {
          await deleteEmbeddingIndexManifest(vectorStoreDir);
        }
        console.info(
          `[BigRAG] Vector store ready (path=${vectorStoreDir}). Waiting for queries...`,
        );
        lastIndexedDir = vectorStoreDir;
      }

      usingBigRagStatus.setState({
        status: "done",
        text: "Using Big RAG",
      });
    }

    if (!vectorStore) {
      // Unreachable given the setup block above always initializes it before
      // this point is reached; guards TypeScript's narrowing and acts as a
      // safety net against a future refactor breaking that invariant.
      throw new Error("Vector store was not initialized");
    }

    checkAbort(ctl.abortSignal);

    await runRequestedReindex(ctl, settings, vectorStore);

    checkAbort(ctl.abortSignal);

    // Check if we need to index
    const stats = await vectorStore.getStats();
    console.debug(`[BigRAG] Vector store stats before auto-index check: totalChunks=${stats.totalChunks}, uniqueFiles=${stats.uniqueFiles}`);

    if (stats.totalChunks === 0) {
      if (!tryStartIndexing("auto-trigger")) {
        console.warn("[BigRAG] Indexing already running, skipping automatic indexing.");
      } else {
        const indexStatus = ctl.createStatus({
          status: "loading",
          text: `Starting initial indexing… (embedding model: ${resolvedEmbeddingModelId})`,
        });

        try {
          const { indexingResult } = await runIndexingJob({
            client: ctl.client,
            abortSignal: ctl.abortSignal,
            documentsDir,
            vectorStoreDir,
            embeddingModelId: resolvedEmbeddingModelId,
            chunkSize,
            chunkOverlap,
            maxConcurrent,
            enableOCR,
            structuredIndexing,
            autoReindex: false,
            parseDelayMs,
            excludePatterns,
            vectorStore,
            forceReindex: true,
            onProgress: (progress) => {
              if (progress.status === "scanning") {
                indexStatus.setState({
                  status: "loading",
                  text: `Scanning: ${progress.currentFile} (embedding model: ${resolvedEmbeddingModelId})`,
                });

              } else if (progress.status === "indexing") {
                
                const success = progress.successfulFiles ?? 0;
                const failed = progress.failedFiles ?? 0;
                const skipped = progress.skippedFiles ?? 0;
                
                indexStatus.setState({
                  status: "loading",
                  text: `Indexing: ${progress.processedFiles}/${progress.totalFiles} files ` +
                    `(success=${success}, failed=${failed}, skipped=${skipped}) ` +
                    `(embedding model: ${resolvedEmbeddingModelId}) ` +
                    `(${progress.currentFile})`,
                });
              
              } else if (progress.status === "complete") {
                indexStatus.setState({
                  status: "done",
                  text: `Indexing complete: ${progress.processedFiles} files processed (embedding model: ${resolvedEmbeddingModelId})`,
                });
              
              } else if (progress.status === "error") {
                indexStatus.setState({
                  status: "canceled",
                  text: `Indexing error: ${progress.error}`,
                });
              }
            },
          });

          console.log(`[BigRAG] Indexing complete: ${indexingResult.successfulFiles}/${indexingResult.totalFiles} files successfully indexed (${indexingResult.failedFiles} failed)`);
        } catch (error) {
          indexStatus.setState({
            status: "canceled",
            text: `Indexing failed: ${error instanceof Error ? error.message : String(error)}`,
          });
          console.error("[BigRAG] Indexing failed:", error);
        } finally {
          finishIndexing();
        }
      }
    }

    checkAbort(ctl.abortSignal);

    console.info(`[BigRAG] Reindex: ${reindexMode} | Embedding model: ${resolvedEmbeddingModelId}`);

    const retrievalStats = await vectorStore.getStats();
    if (retrievalStats.totalChunks === 0) {
      await deleteEmbeddingIndexManifest(vectorStoreDir);
      ctl.createStatus({
        status: "canceled",
        text: "No documents indexed yet",
      });
      const noteAboutEmptyIndex =
        `Important: The document index is empty (no chunks stored yet). ` +
        `In one short sentence, tell the user that nothing has been indexed. ` +
        `Then answer their question to the best of your ability without claiming document retrieval.`;
      return noteAboutEmptyIndex + `\n\nUser Query:\n\n${userPrompt}`;
    }

    // Perform retrieval
    const retrievalStatus = ctl.createStatus({
      status: "loading",
      text: `Loading embedding model for retrieval: ${resolvedEmbeddingModelId}`,
    });

    const embeddingModel = await ctl.client.embedding.model(resolvedEmbeddingModelId, {
      signal: ctl.abortSignal,
    });

    checkAbort(ctl.abortSignal);

    const compatibility = await checkEmbeddingModelForRetrieval({
      vectorStoreDir,
      resolvedModelId: resolvedEmbeddingModelId,
      totalChunks: retrievalStats.totalChunks,
      embeddingModel,
    });
    if (!compatibility.ok) {
      retrievalStatus.setState({
        status: "error",
        text: compatibility.userMessage,
      });
      console.error("[BigRAG]", compatibility.logMessage);
      return compatibility.userMessage + `\n\nUser Query:\n\n${userPrompt}`;
    }

    const store = vectorStore;
    const formatMessage = await indexFormatStatusMessage(
      vectorStoreDir,
      structuredIndexing,
      async () => (await store.getStats()).totalChunks,
    );
    if (formatMessage) {
      console.warn("[BigRAG]", formatMessage);
      ctl.createStatus({ status: "error", text: formatMessage });
    }

    let catalog = null as Awaited<ReturnType<typeof getCatalog>>["catalog"];
    if (retrievalDepth === "medium") {
      // No status is shown at all on a cache hit or a successful disk load — only an
      // actual build, a failure, or the keyword-ceiling notice get a status line, and
      // each of those is reported at most once per session (see reportFailure/reportCeiling).
      let catalogStatus: ReturnType<typeof ctl.createStatus> | null = null;
      const outcome = await getCatalog(
        vectorStoreDir,
        store,
        {
          version: settings.catalogVersion,
          maxChunks: settings.catalogMaxChunks,
          k1: settings.bm25K1,
          b: settings.bm25B,
        },
        undefined,
        () => {
          catalogStatus = ctl.createStatus({
            status: "loading",
            text: `Preparing search index… (${retrievalStats.totalChunks.toLocaleString()} chunks)`,
          });
        },
      );
      catalog = outcome.catalog;
      if (outcome.error) {
        if (outcome.reportFailure) {
          const status = catalogStatus ?? ctl.createStatus({ status: "loading", text: "Preparing search index…" });
          status.setState({
            status: "error",
            text: `Search index unavailable: ${outcome.error}. Using meaning-based search for now.`,
          });
          console.warn("[BigRAG] Catalog unavailable:", outcome.error);
        }
      } else if (outcome.built) {
        const status = catalogStatus ?? ctl.createStatus({ status: "loading", text: "Preparing search index…" });
        status.setState({
          status: "done",
          text: `Search index ready (${catalog?.chunkCount.toLocaleString()} chunks, ${(outcome.ms / 1000).toFixed(1)}s)`,
        });
        console.info(
          `[BigRAG] Catalog built: chunks=${catalog?.chunkCount} terms=${catalog?.termCount} ms=${outcome.ms}`,
        );
      }
      if (outcome.reportCeiling) {
        ctl.createStatus({
          status: "done",
          text: `Keyword search off: index is larger than ${settings.catalogMaxChunks.toLocaleString()} chunks. Using meaning and dates.`,
        });
      }
    }

    retrievalStatus.setState({
      status: "loading",
      text: retrievalDepth === "medium"
        ? "Searching by meaning, keywords and dates..."
        : "Searching for relevant content...",
    });

    const queryPreview =
      userPrompt.length > 160 ? `${userPrompt.slice(0, 160)}...` : userPrompt;
    console.info(
      `[BigRAG] Executing retrieval for "${queryPreview}" (limit=${retrievalLimit}, threshold=${retrievalThreshold}, compaction=${enableContextCompaction})`,
    );
    const { passages: results, timings, laneCounts, dayRanges } = await retrieve(
      userPrompt,
      {
        vectorStore,
        embedQuery: async (text) => (await embeddingModel.embed(text)).embedding,
        embedSentences: (sentences) => embeddingModel.embed(sentences),
        countTokens: (text) => embeddingModel.countTokens(text),
        catalog,
        fetchChunks: (keys) => store.getChunksByKeys(keys),
      },
      {
        retrievalLimit,
        retrievalThreshold,
        chunkSize,
        enableContextCompaction,
        depth: retrievalDepth,
        laneCandidates: settings.laneCandidates,
        rrfConstant: settings.rrfConstant,
        laneWeights: {
          vector: settings.laneWeightVector,
          keyword: settings.laneWeightKeyword,
          date: settings.laneWeightDate,
        },
        abortSignal: ctl.abortSignal,
      },
    );
    checkAbort(ctl.abortSignal);
    console.info(
      `[BigRAG] Retrieval timings: ${timings.map((t) => `${t.stage}=${t.ms.toFixed(0)}ms`).join(" ")}`,
    );
    console.info(
      `[BigRAG] Lanes: meaning=${laneCounts.vector} keywords=${laneCounts.keyword} dates=${laneCounts.date}` +
        (dayRanges.length > 0 ? ` ranges=${dayRanges.map((r) => `${r.start}-${r.end}`).join(",")}` : " ranges=none"),
    );
    if (results.length > 0) {
      const topHit = results[0];
      console.info(
        `[BigRAG] Vector search returned ${results.length} results. Top hit: file=${topHit.fileName} score=${topHit.score.toFixed(3)}`,
      );

      const docSummaries = results
        .map(
          (result, idx) =>
            `#${idx + 1} file=${path.basename(result.filePath)} shard=${result.shardName} score=${result.score.toFixed(3)}`,
        )
        .join("\n");
      console.info(`[BigRAG] Relevant documents:\n${docSummaries}`);
    } else {
      console.warn("[BigRAG] Vector search returned 0 results.");
    }

    if (results.length === 0) {
      retrievalStatus.setState({
        status: "canceled",
        text: "No relevant content found in indexed documents",
      });

      const noteAboutNoResults =
        `Important: No relevant content was found in the indexed documents for the user query. ` +
        `In less than one sentence, inform the user of this. ` +
        `Then respond to the query to the best of your ability.`;

      return noteAboutNoResults + `\n\nUser Query:\n\n${userPrompt}`;
    }

    // Format results
    const dateSuffix = dayRanges.length > 0
      ? `, dates: ${dayRanges.map((range) => (range.start === range.end ? String(range.start) : `${range.start}-${range.end}`)).join(", ")}`
      : "";
    retrievalStatus.setState({
      status: "done",
      text: retrievalDepth === "medium"
        ? `Retrieved ${results.length} relevant passages (meaning ${laneCounts.vector}, keywords ${laneCounts.keyword}, dates ${laneCounts.date}${dateSuffix})`
        : `Retrieved ${results.length} relevant passages`,
    });

    ctl.debug("Retrieval results:", results);

    let ragContextFull = "";
    let ragContextPreview = "";
    const prefix = "The following passages were found in your indexed documents:\n\n";
    ragContextFull += prefix;
    ragContextPreview += prefix;

    let citationNumber = 1;
    for (const result of results) {
      const fileName = path.basename(result.filePath);
      const citationLabel = `Citation ${citationNumber} (from ${fileName}, score: ${result.score.toFixed(3)}): `;
      const passage = renderPassageForPrompt(result);
      ragContextFull += `\n${citationLabel}"${passage}"\n\n`;
      ragContextPreview += `\n${citationLabel}"${summarizeText(passage)}"\n\n`;
      citationNumber++;
    }

    const promptTemplate = normalizePromptTemplate(settings.promptTemplate);
    const finalPrompt = fillPromptTemplate(promptTemplate, {
      [RAG_CONTEXT_MACRO]: ragContextFull.trimEnd(),
      [USER_QUERY_MACRO]: userPrompt,
    });
    const finalPromptPreview = fillPromptTemplate(promptTemplate, {
      [RAG_CONTEXT_MACRO]: ragContextPreview.trimEnd(),
      [USER_QUERY_MACRO]: userPrompt,
    });

    ctl.debug("Processed content (preview):", finalPromptPreview);

    const passagesLogEntries = results.map((result, idx) => {
      const fileName = path.basename(result.filePath);
      return `#${idx + 1} file=${fileName} shard=${result.shardName} score=${result.score.toFixed(3)}\n${summarizeText(result.text)}`;
    });
    const passagesLog = passagesLogEntries.join("\n\n");

    console.info(`[BigRAG] RAG passages (${results.length}) preview:\n${passagesLog}`);
    console.info(`[BigRAG] Final prompt sent to model (preview):\n${finalPromptPreview}`);

    // Native citation UI: ctl.createCitationBlock() has no effect from a
    // promptPreprocessor (it needs a content block to attach to, which only a
    // predictionLoopHandler/generator can create). ctl.addCitations() works
    // here instead, but each entry needs a real FileHandle rather than a bare
    // path - client.files.prepareFile() gets one for an arbitrary file on
    // disk (same call pdfParser.ts already uses, not limited to chat-attached
    // files). getCitationFileHandle() caches these across requests so the
    // same frequently-cited file doesn't get re-registered on every message.
    // Guard each call individually so one missing/moved file doesn't drop
    // citations for the rest of the results.
    const citationEntries: RetrievalResultEntry[] = [];
    for (const result of results) {
      try {
        const fileHash = typeof result.metadata.fileHash === "string" ? result.metadata.fileHash : "";
        const fileHandle = await getCitationFileHandle(ctl.client, result.filePath, fileHash);
        citationEntries.push({ content: `${result.text} \n\n Score: [${result.score.toFixed(3)}]`, score: result.score, source: fileHandle });
      } catch (error) {
        console.warn(`[BigRAG] Could not prepare citation for ${result.filePath}:`, error);
      }
    }
    if (citationEntries.length > 0) {
      await ctl.addCitations({ entries: citationEntries });
    }

    await warnIfContextOverflow(ctl, finalPrompt);

    return finalPrompt;
  } catch (error) {
    // IMPORTANT: Re-throw abort errors so LM Studio can stop the preprocessor promptly.
    // Swallowing AbortError causes the "did not abort in time" warning.
    if (isAbortError(error)) {
      throw error;
    }
    console.error("[PromptPreprocessor] Preprocessing failed.", error);
    return userMessage;
  }
}

const REINDEX_MODE_LABELS: Record<Exclude<ReindexMode, "off">, string> = {
  changed: "Always index new & changed files",
  rebuild: "Always rebuild everything",
};

/**
 * True when a reindex run actually changed the store (updated or added at least
 * one file), i.e. when the in-memory catalog cache needs to be dropped so the
 * next query rebuilds it. A run where every file was skipped as unchanged
 * should not evict the cache — getCatalog's own chunk-count staleness check
 * still covers anything this misses.
 */
export function reindexChangedStore(result: { updatedFiles: number; newFiles: number }): boolean {
  return result.updatedFiles + result.newFiles > 0;
}

/** Runs the reindex the chat's Reindex setting asks for, on every message while a mode is selected. */
async function runRequestedReindex(
  ctl: PromptPreprocessorController,
  settings: ResolvedSettings,
  store: VectorStore,
): Promise<void> {
  const mode = settings.reindexMode;
  if (mode === "off") {
    return;
  }
  const embeddingModelId = settings.embeddingModelId;
  const label = REINDEX_MODE_LABELS[mode];

  if (!tryStartIndexing("config-trigger")) {
    ctl.createStatus({
      status: "canceled",
      text: "A reindex is already running. Please wait for it to finish.",
    });
    return;
  }

  const status = ctl.createStatus({
    status: "loading",
    text: `Reindex requested (${label})… (embedding model: ${embeddingModelId})`,
  });

  try {
    const { indexingResult } = await runIndexingJob({
      client: ctl.client,
      abortSignal: ctl.abortSignal,
      documentsDir: settings.documentsDirectory,
      vectorStoreDir: settings.vectorStoreDirectory,
      embeddingModelId,
      chunkSize: settings.chunkSize,
      chunkOverlap: settings.chunkOverlap,
      maxConcurrent: settings.maxConcurrentFiles,
      enableOCR: settings.enableOCR,
      structuredIndexing: settings.structuredIndexing,
      autoReindex: mode === "changed",
      parseDelayMs: settings.parseDelayMs,
      excludePatterns: settings.excludePatterns,
      forceReindex: mode === "rebuild",
      vectorStore: store,
      onProgress: (progress) => {
        if (progress.status === "scanning") {
          status.setState({
            status: "loading",
            text: `Scanning: ${progress.currentFile} (embedding model: ${embeddingModelId})`,
          });
        } else if (progress.status === "indexing") {
          const success = progress.successfulFiles ?? 0;
          const failed = progress.failedFiles ?? 0;
          const skipped = progress.skippedFiles ?? 0;
          status.setState({
            status: "loading",
            text: `Indexing: ${progress.processedFiles}/${progress.totalFiles} files ` +
              `(success=${success}, failed=${failed}, skipped=${skipped}) ` +
              `(embedding model: ${embeddingModelId}) ` +
              `(${progress.currentFile})`,
          });
        } else if (progress.status === "complete") {
          status.setState({
            status: "done",
            text: `Indexing complete: ${progress.processedFiles} files processed (embedding model: ${embeddingModelId})`,
          });
        } else if (progress.status === "error") {
          status.setState({
            status: "canceled",
            text: `Indexing error: ${progress.error}`,
          });
        }
      },
    });

    if (ctl.abortSignal.aborted) {
      status.setState({
        status: "canceled",
        text: "Reindex cancelled.",
      });
      return;
    }

    status.setState({
      status: "done",
      text: `Reindex complete (${label}). Select No reindex to stop reindexing on every message.`,
    });

    const summaryLines = [
      `Embedding model: ${embeddingModelId}`,
      `Processed: ${indexingResult.successfulFiles}/${indexingResult.totalFiles}`,
      `Failed: ${indexingResult.failedFiles}`,
      `Skipped (unchanged): ${indexingResult.skippedFiles}`,
      `Updated existing files: ${indexingResult.updatedFiles}`,
      `New files added: ${indexingResult.newFiles}`,
    ];
    if (indexingResult.totalFiles > 0 && indexingResult.skippedFiles === indexingResult.totalFiles) {
      summaryLines.push("All files were already up to date (skipped).");
    }
    ctl.createStatus({
      status: "done",
      text: summaryLines.join("\n"),
    });
    console.log(`[BigRAG] Reindex summary:\n  ${summaryLines.join("\n  ")}`);

    try {
      await ctl.client.system.notify({
        title: "Big RAG reindex completed",
        description: `Reindex (${label}) finished. Select No reindex to stop reindexing on every message.`,
      });
    } catch (error) {
      console.warn("[BigRAG] Unable to send reindex notification:", error);
    }

    if (reindexChangedStore(indexingResult)) {
      resetCatalogCache(settings.vectorStoreDirectory);
    }
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    status.setState({
      status: "error",
      text: `Reindex failed: ${error instanceof Error ? error.message : String(error)}`,
    });
    console.error("[BigRAG] Reindex failed:", error);
  } finally {
    finishIndexing();
  }
}

