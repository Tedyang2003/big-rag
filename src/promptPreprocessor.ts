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
import { documentText, queryText } from "./utils/embeddingPrefix";
import * as path from "path";
import { runIndexingJob } from "./ingestion/runIndexing";
import { retrieve, type LaneCounts } from "./retrieval/retrieve";
import { renderPassageForPrompt } from "./retrieval/renderPassage";
import { getCatalog, resetCatalogCache } from "./retrieval/catalogManager";
import { fitToContext } from "./utils/fitToContext";
import { dropWeakPassages, passagesForPrompt } from "./utils/relevanceCut";
import { hypotheticalFor } from "./retrieval/hypothetical";

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

/** Human-readable lane names for a passage, e.g. "meaning, dates". */
const LANE_LABELS: Record<string, string> = { vector: "meaning", hyde: "likely wording", keyword: "keywords", date: "dates" };

/**
 * How a passage earned its place. At Medium depth the fused score is a reciprocal-rank
 * sum (roughly 0.01-0.05) that means nothing on its own, so the position and the lanes
 * that ranked it are shown instead; at Low depth the similarity score still is the answer.
 */
function describeMatch(position: number, lanes: string[] | undefined, score: number): string {
  if (!lanes || lanes.length === 0) {
    return `score: ${score.toFixed(3)}`;
  }
  return `match #${position} via ${lanes.map((lane) => LANE_LABELS[lane] ?? lane).join(", ")}`;
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

/**
 * How many of the retrieved passages can be sent, measured with the model's own tokenizer.
 *
 * The budget is a share of the context window, and deliberately ignores the conversation so
 * far. The host trims whole earlier turns to make room and never truncates the message we
 * return, so history is its cost to manage, not ours - and charging passages for space it will
 * reclaim means a long chat starves retrieval until only one passage fits. A share keeps the
 * number of passages steady however long the conversation runs, and spends old turns to do it.
 *
 * Null when the token source cannot tell us, in which case the caller sends everything.
 */
async function fitPassagesToContext(
  ctl: PromptPreprocessorController,
  passageCount: number,
  buildPrompt: (passageCount: number) => string,
  contextShare: number,
): Promise<{
  used: number;
  tokens: number;
  contextLength: number;
  budget: number;
} | null> {
  try {
    const tokenSource = await ctl.tokenSource();
    if (
      !tokenSource ||
      !("countTokens" in tokenSource) ||
      typeof tokenSource.countTokens !== "function" ||
      !("getContextLength" in tokenSource) ||
      typeof tokenSource.getContextLength !== "function"
    ) {
      console.warn("[BigRAG] Token source does not expose prompt utilities; skipping context check.");
      return null;
    }

    const contextLength = await tokenSource.getContextLength();
    // The message alone, not the conversation around it. A few tokens of chat template are
    // uncounted, which the share's headroom covers many times over.
    const measure = (passageCount: number) => tokenSource.countTokens(buildPrompt(passageCount));

    const budget = Math.max(0, Math.floor(contextLength * contextShare));
    // At least one passage always goes: retrieval that quietly sends nothing lets the model
    // answer from whatever earlier turns happen to hold, which reads like success and is not.
    const fit = await fitToContext(passageCount, budget, measure, passageCount > 0 ? 1 : 0);
    return { ...fit, contextLength, budget };
  } catch (error) {
    console.warn("[BigRAG] Failed to evaluate context usage:", error);
    return null;
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
    if (retrievalDepth === "medium" || retrievalDepth === "high") {
      // No status is shown at all on a cache hit or a successful disk load — only an
      // actual build or a failure gets a status line, and a failure is reported at most
      // once per session (see reportFailure).
      let catalogStatus: ReturnType<typeof ctl.createStatus> | null = null;
      const outcome = await getCatalog(
        vectorStoreDir,
        store,
        { version: settings.catalogVersion },
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
        console.info(`[BigRAG] Catalog built: chunks=${catalog?.chunkCount} ms=${outcome.ms}`);
      }
    }

    retrievalStatus.setState({
      status: "loading",
      text:
        retrievalDepth === "high"
          ? "Drafting a likely answer, then searching by meaning and dates..."
          : retrievalDepth === "medium"
            ? "Searching by meaning and dates..."
            : "Searching for relevant content...",
    });

    const queryPreview =
      userPrompt.length > 160 ? `${userPrompt.slice(0, 160)}...` : userPrompt;
    console.info(
      `[BigRAG] Executing retrieval for "${queryPreview}" (limit=${retrievalLimit}, threshold=${retrievalThreshold}, compaction=${enableContextCompaction})`,
    );
    const { passages: results, timings, laneCounts, passageLanes, dayRanges } = await retrieve(
      userPrompt,
      {
        vectorStore,
        embedQuery: async (text) =>
          (await embeddingModel.embed(queryText(resolvedEmbeddingModelId, text))).embedding,
        embedSentences: (sentences) =>
          embeddingModel.embed(sentences.map((sentence) => documentText(resolvedEmbeddingModelId, sentence))),
        countTokens: (text) => embeddingModel.countTokens(text),
        // Only reached at High. The draft is embedded and thrown away: its specifics are
        // invented, so it must never reach the prompt, a citation or a status line.
        hypothetical: async (question) =>
          hypotheticalFor(question, {
            generate: async (prompt, abortSignal) => {
              const llm = await ctl.client.llm.model();
              return (await llm.respond(prompt, { signal: abortSignal })).content;
            },
            timeoutMs: settings.hypotheticalTimeoutMs,
            abortSignal: ctl.abortSignal,
          }),
        catalog,
      },
      {
        retrievalLimit,
        retrievalThreshold,
        chunkSize,
        enableContextCompaction,
        depth: retrievalDepth,
        laneCandidates: settings.laneCandidates,
        neighbourChunks: settings.neighbourChunks,
        rerankDepth: settings.rerankDepth,
        bm25K1: settings.bm25K1,
        bm25B: settings.bm25B,
        rrfConstant: settings.rrfConstant,
        laneWeights: {
          vector: settings.laneWeightVector,
          hyde: settings.laneWeightHyde,
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
      `[BigRAG] Lanes: meaning=${laneCounts.vector} likely-wording=${laneCounts.hyde} dates=${laneCounts.date}` +
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
            `#${idx + 1} file=${path.basename(result.filePath)} shard=${result.shardName} ${describeMatch(idx + 1, passageLanes[idx], result.score)}`,
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

    // Retrieval fills its quota whether or not that many passages are relevant. On a small
    // collection that means one good answer followed by page footers and OCR noise, and a model
    // reasonably concludes the answer is not there.
    const relevant = dropWeakPassages(results, settings.passageRelevanceCut);
    const relevantLanes = relevant.map((passage) => passageLanes[results.indexOf(passage)] ?? []);
    // Counted over the passages that survived the cut, so the status describes what was kept
    // rather than what was nominated.
    const keptCounts: LaneCounts = { vector: 0, hyde: 0, keyword: 0, date: 0 };
    for (const lanes of relevantLanes) {
      if (lanes.includes("vector")) keptCounts.vector++;
      if (lanes.includes("hyde")) keptCounts.hyde++;
      if (lanes.includes("keyword")) keptCounts.keyword++;
      if (lanes.includes("date")) keptCounts.date++;
    }

    // Format results
    const dateSuffix = dayRanges.length > 0
      ? `, dates: ${dayRanges.map((range) => (range.start === range.end ? String(range.start) : `${range.start}-${range.end}`)).join(", ")}`
      : "";
    // Says the cut happened and why, so a question that returns one passage out of eight reads
    // as a decision rather than a failure to find anything else.
    const dropped = results.length - relevant.length;
    const kept =
      dropped > 0
        ? `Kept ${relevant.length} of ${results.length} passages, the rest well below the best match`
        : `Retrieved ${relevant.length} relevant passages`;
    retrievalStatus.setState({
      status: "done",
      text:
        retrievalDepth === "high"
          ? `${kept} (meaning ${keptCounts.vector}, likely wording ${keptCounts.hyde}, dates ${keptCounts.date}${dateSuffix})`
          : retrievalDepth === "medium"
            ? `${kept} (meaning ${keptCounts.vector}, dates ${keptCounts.date}${dateSuffix})`
            : kept,
    });

    ctl.debug("Retrieval results:", results);

    // Says which question these belong to. Every turn's passages stay in the conversation
    // forever - what a preprocessor returns becomes the user message - so by the third question
    // the model is looking at three sets, the oldest of them the longest. Without this it
    // answers from whichever set is largest, which is how "what does shao yang like" came back
    // as a summary of a company discussed two questions earlier.
    const prefix =
      `The passages below were retrieved for this question, and only this one: "${userPrompt}"\n\n`;
    const promptTemplate = normalizePromptTemplate(settings.promptTemplate);

    /** The prompt carrying the highest-ranked `count` passages, in full or abbreviated form. */
    const buildPrompt = (count: number, abbreviated = false): string => {
      let ragContext = prefix;
      // Weakest first, so the best passage lands immediately above the question.
      passagesForPrompt(relevant, count).forEach((result) => {
        const rank = relevant.indexOf(result);
        const fileName = path.basename(result.filePath);
        const matchLabel = describeMatch(rank + 1, relevantLanes[rank], result.score);
        const citationLabel = `Citation ${rank + 1} (from ${fileName}, ${matchLabel}): `;
        const passage = renderPassageForPrompt(result);
        ragContext += `\n${citationLabel}"${abbreviated ? summarizeText(passage) : passage}"\n\n`;
      });
      return fillPromptTemplate(promptTemplate, {
        [RAG_CONTEXT_MACRO]: ragContext.trimEnd(),
        [USER_QUERY_MACRO]: userPrompt,
      });
    };

    // An oversized prompt is truncated from the front, which is where the passages are, so the
    // model would be told to use citations it never received. Send what fits instead.
    const fit = await fitPassagesToContext(ctl, relevant.length, buildPrompt, settings.ragContextShare);
    const sent = fit ? relevant.slice(0, fit.used) : relevant;
    if (dropped > 0) {
      console.info(
        `[BigRAG] Dropped ${dropped} of ${results.length} passages as far less relevant than the ` +
          `best match.`,
      );
    }
    if (fit && fit.used < relevant.length) {
      const summary =
        `Sent ${fit.used} of ${relevant.length} passages — the rest would exceed the ` +
        `${fit.budget.toLocaleString()} tokens retrieval may use of this model's ` +
        `${fit.contextLength.toLocaleString()}. Raise the context length to send more.`;
      console.warn(`[BigRAG] ${summary}`);
      ctl.createStatus({ status: "done", text: summary });
    }

    const finalPrompt = buildPrompt(sent.length);
    const finalPromptPreview = buildPrompt(sent.length, true);

    // The real thing, not the preview: this is the only way to see what the model was given,
    // and a preview that abbreviates every passage to 400 characters looks exactly like a bug.
    ctl.debug("Prompt sent to model (full):", finalPrompt);

    const passagesLogEntries = sent.map((result, idx) => {
      const fileName = path.basename(result.filePath);
      return `#${idx + 1} file=${fileName} shard=${result.shardName} score=${result.score.toFixed(3)}\n${summarizeText(result.text)}`;
    });
    const passagesLog = passagesLogEntries.join("\n\n");

    console.info(`[BigRAG] RAG passages sent (${sent.length} of ${results.length}) preview:\n${passagesLog}`);
    const tokensNote = fit ? `${fit.tokens.toLocaleString()} of ${fit.budget.toLocaleString()} tokens` : "size unknown";
    console.info(
      `[BigRAG] Prompt sent to model: ${tokensNote}, ${sent.length} passages from ` +
        `${new Set(sent.map((r) => path.basename(r.filePath))).size} files. ` +
        `Enable plugin debug logging to see it in full.`,
    );
    console.info(`[BigRAG] Prompt preview (passages abbreviated, NOT what was sent):
${finalPromptPreview}`);

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
    // Only what the model received: a citation for a passage dropped to fit the context would
    // show a user the answer while the model never saw it.
    const citationEntries: RetrievalResultEntry[] = [];
    for (const result of sent) {
      try {
        const fileHash = typeof result.metadata.fileHash === "string" ? result.metadata.fileHash : "";
        const fileHandle = await getCitationFileHandle(ctl.client, result.filePath, fileHash);
        const matchLabel = describeMatch(citationEntries.length + 1, relevantLanes[citationEntries.length], result.score);
        citationEntries.push({ content: `${result.text} \n\n [${matchLabel}]`, score: result.score, source: fileHandle });
      } catch (error) {
        console.warn(`[BigRAG] Could not prepare citation for ${result.filePath}:`, error);
      }
    }
    if (citationEntries.length > 0) {
      await ctl.addCitations({ entries: citationEntries });
    }

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

