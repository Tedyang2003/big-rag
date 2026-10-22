import * as fs from "fs/promises";
import * as path from "path";
import { type EmbeddingDynamicHandle } from "@lmstudio/sdk";
import { coerceEmbeddingVector } from "./coerceEmbedding";
import { prefixConventionFor, type EmbeddingPrefixes } from "./embeddingPrefix";

export const EMBEDDING_INDEX_MANIFEST_FILENAME = ".big-rag-embedding.json";

export type IndexFormat = "legacy" | "structured-v3";

/** The format new structured indexes are built with. v3 gives PDF tables rows and columns. */
export const STRUCTURED_INDEX_FORMAT = "structured-v3";

// Embedding manifest object interface
export interface EmbeddingIndexManifest {
  embeddingModelId: string;
  dimensions: number;
  indexFormat: IndexFormat;
  /** Which embedding prefix convention the stored vectors were built with. */
  embeddingPrefixes: EmbeddingPrefixes;
}

// Resolve Index Manifest Path
export function getEmbeddingManifestPath(vectorStoreDir: string): string {
  return path.join(path.resolve(vectorStoreDir), EMBEDDING_INDEX_MANIFEST_FILENAME);
}


// Check the Index Manifest File
// Tells us the previous embedding model
export async function readEmbeddingIndexManifest(
  vectorStoreDir: string,
): Promise<EmbeddingIndexManifest | null> {
  const filePath = getEmbeddingManifestPath(vectorStoreDir);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as Partial<EmbeddingIndexManifest>;
    if (
      typeof data.embeddingModelId === "string" &&
      data.embeddingModelId.length > 0 &&
      typeof data.dimensions === "number" &&
      Number.isFinite(data.dimensions) &&
      data.dimensions > 0
    ) {
      return {
        embeddingModelId: data.embeddingModelId,
        dimensions: data.dimensions,
        // Anything that is not the current structured format reads as legacy, which forces a
        // rebuild. That covers a store from a future version as well as the retired
        // structured-v1 and v2, neither of which was ever released.
        indexFormat: data.indexFormat === "structured-v3" ? "structured-v3" : "legacy",
        embeddingPrefixes: data.embeddingPrefixes === "nomic" ? "nomic" : "none",
      };
    }
    return null;

  } catch (e: any) {

    if (e?.code === "ENOENT") {
      return null;
    }
    console.warn("[BigRAG] Could not read embedding index manifest:", e);
    return null;

  }
}

export async function writeEmbeddingIndexManifest(
  vectorStoreDir: string,
  manifest: EmbeddingIndexManifest,
): Promise<void> {
  const filePath = getEmbeddingManifestPath(vectorStoreDir);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(manifest, null, 2), "utf-8");
}

export async function deleteEmbeddingIndexManifest(vectorStoreDir: string): Promise<void> {
  const filePath = getEmbeddingManifestPath(vectorStoreDir);
  try {
    await fs.unlink(filePath);
  } catch (e: any) {
    if (e?.code !== "ENOENT") {
      console.warn("[BigRAG] Could not delete embedding index manifest:", e);
    }
  }
}

/**
 * After indexing: persist manifest when the store has chunks; otherwise remove stale manifest.
 */
export async function syncEmbeddingManifestAfterIndexing(
  vectorStoreDir: string,
  totalChunks: number,
  resolvedModelId: string,
  embeddingModel: EmbeddingDynamicHandle,
  indexFormat: IndexFormat,
): Promise<void> {
  if (totalChunks === 0) {
    await deleteEmbeddingIndexManifest(vectorStoreDir);
    return;
  }
  const probe = await embeddingModel.embed(".");
  const dimensions = coerceEmbeddingVector(probe.embedding).length;
  await writeEmbeddingIndexManifest(vectorStoreDir, {
    embeddingModelId: resolvedModelId,
    dimensions,
    indexFormat,
    embeddingPrefixes: prefixConventionFor(resolvedModelId),
  });
}

export type EmbeddingRetrievalCheck =
  | { ok: true }
  | { ok: false; userMessage: string; logMessage: string };

const legacyWarnedDirs = new Set<string>();

/**
 * Validate configured embedding model against on-disk manifest before retrieval.
 * When totalChunks is 0, clears any stale manifest.
 */
export async function checkEmbeddingModelForRetrieval(args: {
  vectorStoreDir: string;
  resolvedModelId: string;
  totalChunks: number;
  embeddingModel: EmbeddingDynamicHandle;
}): Promise<EmbeddingRetrievalCheck> {
  const { vectorStoreDir, resolvedModelId, totalChunks, embeddingModel } = args;

  if (totalChunks === 0) {
    await deleteEmbeddingIndexManifest(vectorStoreDir);
    return { ok: true };
  }

  const manifest = await readEmbeddingIndexManifest(vectorStoreDir);
  if (!manifest) {
    // Those chunks were embedded before manifests existed, so they carry no prefixes. A model
    // that now prefixes its queries would score them against unprefixed vectors, which is the
    // silent degradation the prefix check exists to prevent, so refuse rather than warn.
    if (prefixConventionFor(resolvedModelId) === "nomic") {
      return {
        ok: false,
        logMessage:
          `Embedding prefix mismatch: index has chunks but no manifest, so it was built without prefixes, ` +
          `and "${resolvedModelId}" expects "nomic" prefixes. Reindex required.`,
        userMessage:
          "The document index was built before this version's embedding change, so searches would score badly. " +
          "Reindex your documents to rebuild it.",
      };
    }
    const key = path.resolve(vectorStoreDir);
    if (!legacyWarnedDirs.has(key)) {
      legacyWarnedDirs.add(key);
      console.warn(
        "[BigRAG] Index has chunks but no `.big-rag-embedding.json` manifest (likely built with an older plugin). " +
          "Retrieval proceeds; run a full reindex to record embedding metadata.",
      );
    }
    return { ok: true };
  }

  if (manifest.embeddingModelId !== resolvedModelId) {
    const logMessage =
      `Embedding model mismatch: index was built with "${manifest.embeddingModelId}" but settings use "${resolvedModelId}". Reindex or change the setting.`;
    return {
      ok: false,
      logMessage,
      userMessage:
        `The document index was built with embedding model "${manifest.embeddingModelId}", but the plugin is set to "${resolvedModelId}". ` +
        `Either switch the Embedding Model setting back, or reindex your documents after changing the model.`,
    };
  }

  const expectedPrefixes = prefixConventionFor(resolvedModelId);
  if (manifest.embeddingPrefixes !== expectedPrefixes) {
    const logMessage =
      `Embedding prefix mismatch: index was built with "${manifest.embeddingPrefixes}" prefixes but ` +
      `"${resolvedModelId}" expects "${expectedPrefixes}". Reindex required.`;
    return {
      ok: false,
      logMessage,
      userMessage:
        "The document index was built before this version's embedding change, so searches would score badly. " +
        "Reindex your documents to rebuild it.",
    };
  }

  const probe = await embeddingModel.embed(".");
  const dim = coerceEmbeddingVector(probe.embedding).length;
  if (dim !== manifest.dimensions) {
    const logMessage =
      `Embedding dimension mismatch: manifest has ${manifest.dimensions} but model "${resolvedModelId}" returned ${dim}. Reindex required.`;
    return {
      ok: false,
      logMessage,
      userMessage:
        `The stored index expects embedding vectors of length ${manifest.dimensions}, but the current model produced length ${dim}. ` +
        `Reindex your documents (or fix the model identifier).`,
    };
  }

  return { ok: true };
}

export function desiredIndexFormat(structuredIndexing: boolean): IndexFormat {
  return structuredIndexing ? STRUCTURED_INDEX_FORMAT : "legacy";
}

/**
 * Decides the format to index with, and whether existing files must be
 * rebuilt because the store already holds chunks in the other format.
 */
export async function planIndexFormat(
  vectorStoreDir: string,
  totalChunks: number,
  structuredIndexing: boolean,
  resolvedModelId: string,
): Promise<{ indexFormat: IndexFormat; rebuildExistingFiles: boolean }> {
  const indexFormat = desiredIndexFormat(structuredIndexing);
  
  // If there are no indexed chunks, then there is nothing to rebuild
  if (totalChunks === 0) {
    return { indexFormat, rebuildExistingFiles: false };
  }

  // Read Old already indexed manifest for existing data stored in manifest JSON file
  const manifest = await readEmbeddingIndexManifest(vectorStoreDir);

  // If format changed or embedding prefix changed, then require a rebuild of old files
  const formatChanged = (manifest?.indexFormat ?? "legacy") !== indexFormat;
  const prefixesChanged = (manifest?.embeddingPrefixes ?? "none") !== prefixConventionFor(resolvedModelId);
  // A different model produces different vectors even when the format and the prefix convention
  // are unchanged, and two models can share a convention - every nomic-embed build maps to
  // "nomic". Without this, switching between them skips every file as unchanged, rewrites the
  // manifest with the new id, and leaves the new model's queries scoring against the old
  // model's vectors with nothing left to detect it. A missing manifest is handled as legacy
  // elsewhere, so it must not count as a change here.
  const modelChanged = (manifest?.embeddingModelId ?? resolvedModelId) !== resolvedModelId;
  return { indexFormat, rebuildExistingFiles: formatChanged || prefixesChanged || modelChanged };
}

/**
 * Status message when the stored index format differs from the configured one. A store with
 * chunks but no manifest was built before manifests recorded a format, so it counts as legacy
 * (as in planIndexFormat). The chunk count is only read when the manifest is missing.
 */
export async function indexFormatStatusMessage(
  vectorStoreDir: string,
  structuredIndexing: boolean,
  getTotalChunks: () => Promise<number>,
): Promise<string | null> {
  const manifest = await readEmbeddingIndexManifest(vectorStoreDir);
  let indexed: IndexFormat;
  if (manifest) {
    indexed = manifest.indexFormat;
  } else {
    if ((await getTotalChunks()) === 0) return null;
    indexed = "legacy";
  }
  return indexFormatMismatchMessage(indexed, desiredIndexFormat(structuredIndexing));
}

export function indexFormatMismatchMessage(indexed: IndexFormat, desired: IndexFormat): string | null {
  if (indexed === desired) return null;
  return desired === "legacy"
    ? "Reindex required to switch back to standard indexing."
    : "Reindex required to apply structured indexing.";
}
