"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/config.ts
function resolveEmbeddingModelId(raw) {
  const t = typeof raw === "string" ? raw.trim() : "";
  return t.length > 0 ? t : DEFAULT_EMBEDDING_MODEL_ID;
}
var import_sdk, DEFAULT_EMBEDDING_MODEL_ID, DEFAULT_PROMPT_TEMPLATE, configSchematics;
var init_config = __esm({
  "src/config.ts"() {
    "use strict";
    import_sdk = require("@lmstudio/sdk");
    DEFAULT_EMBEDDING_MODEL_ID = "nomic-ai/nomic-embed-text-v1.5-GGUF";
    DEFAULT_PROMPT_TEMPLATE = `{{rag_context}}

Use the citations above to respond to the user query, only if they are relevant. Otherwise, respond to the best of your ability without them.

User Query:

{{user_query}}`;
    configSchematics = (0, import_sdk.createConfigSchematics)().field(
      "documentsDirectory",
      "string",
      {
        displayName: "Documents Directory",
        subtitle: "Root directory containing documents to index. All subdirectories will be scanned.",
        placeholder: "/path/to/documents"
      },
      ""
    ).field(
      "vectorStoreDirectory",
      "string",
      {
        displayName: "Vector Store Directory",
        subtitle: "Directory where the vector database will be stored.",
        placeholder: "/path/to/vector/store"
      },
      ""
    ).field(
      "embeddingModel",
      "string",
      {
        displayName: "Embedding Model",
        subtitle: "LM Studio accepts more than one spelling for the same model\u2014for example mixedbread-ai/mxbai-embed-large-v1 (Hub / download) or text-embedding-mxbai-embed-large-v1 (as in lms ls). Both are valid; use one value consistently for indexing and chat so it matches .big-rag-embedding.json. Reindex after changing.",
        placeholder: DEFAULT_EMBEDDING_MODEL_ID
      },
      DEFAULT_EMBEDDING_MODEL_ID
    ).field(
      "retrievalLimit",
      "numeric",
      {
        int: true,
        min: 1,
        max: 20,
        displayName: "Retrieval Limit",
        subtitle: "Maximum number of chunks to return during retrieval.",
        slider: { min: 1, max: 20, step: 1 }
      },
      5
    ).field(
      "retrievalAffinityThreshold",
      "numeric",
      {
        min: 0,
        max: 1,
        displayName: "Retrieval Affinity Threshold",
        subtitle: "Minimum similarity score for a chunk to be considered relevant.",
        slider: { min: 0, max: 1, step: 0.01 }
      },
      0.5
    ).field(
      "chunkSize",
      "numeric",
      {
        int: true,
        min: 128,
        max: 2048,
        displayName: "Chunk Size",
        subtitle: "Size of text chunks for embedding (in tokens).",
        slider: { min: 128, max: 2048, step: 128 }
      },
      512
    ).field(
      "chunkOverlap",
      "numeric",
      {
        int: true,
        min: 0,
        max: 512,
        displayName: "Chunk Overlap",
        subtitle: "Overlap between consecutive chunks (in tokens).",
        slider: { min: 0, max: 512, step: 32 }
      },
      100
    ).field(
      "maxConcurrentFiles",
      "numeric",
      {
        int: true,
        min: 1,
        max: 10,
        displayName: "Max Concurrent Files",
        subtitle: "Maximum number of files to process concurrently during indexing. Recommend 1 for large PDF datasets.",
        slider: { min: 1, max: 10, step: 1 }
      },
      1
    ).field(
      "parseDelayMs",
      "numeric",
      {
        int: true,
        min: 0,
        max: 5e3,
        displayName: "Parser Delay (ms)",
        subtitle: "Wait time before parsing each document (helps avoid WebSocket throttling).",
        slider: { min: 0, max: 5e3, step: 100 }
      },
      500
    ).field(
      "enableOCR",
      "boolean",
      {
        displayName: "Enable OCR",
        subtitle: "Enable OCR for image files and image-based PDFs using LM Studio's built-in document parser."
      },
      true
    ).field(
      "excludeFilenamePatterns",
      "string",
      {
        displayName: "Exclude filename patterns",
        subtitle: "Optional. One glob per line, matched against each file path relative to Documents Directory (use /). Lines starting with # are comments. Example: *.png excludes PNGs in any folder; archive/** excludes that subtree. Does not remove chunks already in the vector store\u2014clear or reindex to drop old data.",
        placeholder: "*.png\n# *.jpg",
        isParagraph: true
      },
      ""
    ).field(
      "manualReindex.trigger",
      "boolean",
      {
        displayName: "Manual Reindex Trigger",
        subtitle: "Toggle ON to request an immediate reindex. The plugin resets this after running. Use the \u201CSkip Previously Indexed Files\u201D option below to control whether unchanged files are skipped."
      },
      false
    ).field(
      "manualReindex.skipPreviouslyIndexed",
      "boolean",
      {
        displayName: "Skip Previously Indexed Files",
        subtitle: "Skip unchanged files for faster manual runs. Only indexes new files or changed files.",
        dependencies: [
          {
            key: "manualReindex.trigger",
            condition: { type: "equals", value: true }
          }
        ]
      },
      true
    ).field(
      "promptTemplate",
      "string",
      {
        displayName: "Prompt Template",
        subtitle: "Supports {{rag_context}} (required) and {{user_query}} macros for customizing the final prompt.",
        placeholder: DEFAULT_PROMPT_TEMPLATE,
        isParagraph: true
      },
      DEFAULT_PROMPT_TEMPLATE
    ).build();
  }
});

// src/vectorstore/vectorStore.ts
var fs, path, import_vectra, MAX_ITEMS_PER_SHARD, SHARD_DIR_PREFIX, SHARD_DIR_REGEX, VectorStore;
var init_vectorStore = __esm({
  "src/vectorstore/vectorStore.ts"() {
    "use strict";
    fs = __toESM(require("fs/promises"));
    path = __toESM(require("path"));
    import_vectra = require("vectra");
    MAX_ITEMS_PER_SHARD = 1e4;
    SHARD_DIR_PREFIX = "shard_";
    SHARD_DIR_REGEX = /^shard_(\d+)$/;
    VectorStore = class {
      constructor(dbPath) {
        this.shardDirs = [];
        this.activeShard = null;
        this.activeShardCount = 0;
        this.updateMutex = Promise.resolve();
        this.dbPath = path.resolve(dbPath);
      }
      /**
       * Open a shard by directory name (e.g. "shard_000"). Caller must not hold the reference
       * after use so GC can free the parsed index data.
       */
      openShard(dir) {
        const fullPath = path.join(this.dbPath, dir);
        return new import_vectra.LocalIndex(fullPath);
      }
      /**
       * Scan dbPath for shard_NNN directories and return sorted list.
       */
      async discoverShardDirs() {
        const entries = await fs.readdir(this.dbPath, { withFileTypes: true });
        const dirs = [];
        for (const e of entries) {
          if (e.isDirectory() && SHARD_DIR_REGEX.test(e.name)) {
            dirs.push(e.name);
          }
        }
        dirs.sort((a, b) => {
          const n = (m) => parseInt(m.match(SHARD_DIR_REGEX)[1], 10);
          return n(a) - n(b);
        });
        return dirs;
      }
      /**
       * Initialize the vector store: discover or create shards, open the last as active.
       */
      async initialize() {
        await fs.mkdir(this.dbPath, { recursive: true });
        this.shardDirs = await this.discoverShardDirs();
        if (this.shardDirs.length === 0) {
          const firstDir = `${SHARD_DIR_PREFIX}000`;
          const fullPath = path.join(this.dbPath, firstDir);
          const index = new import_vectra.LocalIndex(fullPath);
          await index.createIndex({ version: 1 });
          this.shardDirs = [firstDir];
          this.activeShard = index;
          this.activeShardCount = 0;
        } else {
          const lastDir = this.shardDirs[this.shardDirs.length - 1];
          this.activeShard = this.openShard(lastDir);
          const items = await this.activeShard.listItems();
          this.activeShardCount = items.length;
        }
        console.log("Vector store initialized successfully");
      }
      /**
       * Add document chunks to the active shard. Rotates to a new shard when full.
       */
      async addChunks(chunks) {
        if (!this.activeShard) {
          throw new Error("Vector store not initialized");
        }
        if (chunks.length === 0) return;
        this.updateMutex = this.updateMutex.then(async () => {
          await this.activeShard.beginUpdate();
          try {
            for (const chunk of chunks) {
              const metadata = {
                text: chunk.text,
                filePath: chunk.filePath,
                fileName: chunk.fileName,
                fileHash: chunk.fileHash,
                chunkIndex: chunk.chunkIndex,
                ...chunk.metadata
              };
              await this.activeShard.upsertItem({
                id: chunk.id,
                vector: chunk.vector,
                metadata
              });
            }
            await this.activeShard.endUpdate();
          } catch (e) {
            this.activeShard.cancelUpdate();
            throw e;
          }
          this.activeShardCount += chunks.length;
          console.log(`Added ${chunks.length} chunks to vector store`);
          if (this.activeShardCount >= MAX_ITEMS_PER_SHARD) {
            const nextNum = this.shardDirs.length;
            const nextDir = `${SHARD_DIR_PREFIX}${String(nextNum).padStart(3, "0")}`;
            const fullPath = path.join(this.dbPath, nextDir);
            const newIndex = new import_vectra.LocalIndex(fullPath);
            await newIndex.createIndex({ version: 1 });
            this.shardDirs.push(nextDir);
            this.activeShard = newIndex;
            this.activeShardCount = 0;
          }
        });
        return this.updateMutex;
      }
      /**
       * Search: query each shard in turn, merge results, sort by score, filter by threshold, return top limit.
       */
      async search(queryVector, limit = 5, threshold = 0.5) {
        const merged = [];
        for (const dir of this.shardDirs) {
          const shard = this.openShard(dir);
          const results = await shard.queryItems(
            queryVector,
            "",
            limit,
            void 0,
            false
          );
          for (const r of results) {
            const m = r.item.metadata;
            merged.push({
              text: m?.text ?? "",
              score: r.score,
              filePath: m?.filePath ?? "",
              fileName: m?.fileName ?? "",
              chunkIndex: m?.chunkIndex ?? 0,
              shardName: dir,
              metadata: r.item.metadata ?? {}
            });
          }
        }
        return merged.filter((r) => r.score >= threshold).sort((a, b) => b.score - a.score).slice(0, limit);
      }
      /**
       * Delete all chunks for a file (by hash) across all shards.
       */
      async deleteByFileHash(fileHash) {
        const lastDir = this.shardDirs[this.shardDirs.length - 1];
        this.updateMutex = this.updateMutex.then(async () => {
          for (const dir of this.shardDirs) {
            const shard = this.openShard(dir);
            const items = await shard.listItems();
            const toDelete = items.filter(
              (i) => i.metadata?.fileHash === fileHash
            );
            if (toDelete.length > 0) {
              await shard.beginUpdate();
              for (const item of toDelete) {
                await shard.deleteItem(item.id);
              }
              await shard.endUpdate();
              if (dir === lastDir && this.activeShard) {
                this.activeShardCount = (await this.activeShard.listItems()).length;
              }
            }
          }
          console.log(`Deleted chunks for file hash: ${fileHash}`);
        });
        return this.updateMutex;
      }
      /**
       * Get file path -> set of file hashes currently in the store.
       */
      async getFileHashInventory() {
        const inventory = /* @__PURE__ */ new Map();
        for (const dir of this.shardDirs) {
          const shard = this.openShard(dir);
          const items = await shard.listItems();
          for (const item of items) {
            const m = item.metadata;
            const filePath = m?.filePath;
            const fileHash = m?.fileHash;
            if (!filePath || !fileHash) continue;
            let set = inventory.get(filePath);
            if (!set) {
              set = /* @__PURE__ */ new Set();
              inventory.set(filePath, set);
            }
            set.add(fileHash);
          }
        }
        return inventory;
      }
      /**
       * Get total chunk count and unique file count.
       */
      async getStats() {
        let totalChunks = 0;
        const uniqueHashes = /* @__PURE__ */ new Set();
        for (const dir of this.shardDirs) {
          const shard = this.openShard(dir);
          const items = await shard.listItems();
          totalChunks += items.length;
          for (const item of items) {
            const h = item.metadata?.fileHash;
            if (h) uniqueHashes.add(h);
          }
        }
        return { totalChunks, uniqueFiles: uniqueHashes.size };
      }
      /**
       * Check if any chunk exists for the given file hash (short-circuits on first match).
       */
      async hasFile(fileHash) {
        for (const dir of this.shardDirs) {
          const shard = this.openShard(dir);
          const items = await shard.listItems();
          if (items.some((i) => i.metadata?.fileHash === fileHash)) {
            return true;
          }
        }
        return false;
      }
      /**
       * Release the active shard reference.
       */
      async close() {
        this.activeShard = null;
      }
    };
  }
});

// src/utils/sanityChecks.ts
async function performSanityChecks(documentsDir, vectorStoreDir) {
  const warnings = [];
  const errors = [];
  try {
    await fs2.promises.access(documentsDir, fs2.constants.R_OK);
  } catch {
    errors.push(`Documents directory does not exist or is not readable: ${documentsDir}`);
  }
  try {
    await fs2.promises.access(vectorStoreDir, fs2.constants.W_OK);
  } catch {
    try {
      await fs2.promises.mkdir(vectorStoreDir, { recursive: true });
    } catch {
      errors.push(
        `Vector store directory does not exist and cannot be created: ${vectorStoreDir}`
      );
    }
  }
  try {
    const stats = await fs2.promises.statfs(vectorStoreDir);
    const availableGB = stats.bavail * stats.bsize / (1024 * 1024 * 1024);
    if (availableGB < 1) {
      errors.push(`Very low disk space available: ${availableGB.toFixed(2)} GB`);
    } else if (availableGB < 10) {
      warnings.push(`Low disk space available: ${availableGB.toFixed(2)} GB`);
    }
  } catch (error) {
    warnings.push("Could not check available disk space");
  }
  const freeMemoryGB = os.freemem() / (1024 * 1024 * 1024);
  const totalMemoryGB = os.totalmem() / (1024 * 1024 * 1024);
  const runningOnMac = process.platform === "darwin";
  const lowMemoryMessage = `Low free memory: ${freeMemoryGB.toFixed(2)} GB of ${totalMemoryGB.toFixed(2)} GB total. Consider reducing concurrent file processing.`;
  const veryLowMemoryMessage = `Very low free memory: ${freeMemoryGB.toFixed(2)} GB. ` + (runningOnMac ? "macOS may be reporting cached pages as used; cached memory can usually be reclaimed automatically." : "Indexing may fail due to insufficient RAM.");
  if (freeMemoryGB < 0.5) {
    if (runningOnMac) {
      warnings.push(veryLowMemoryMessage);
    } else {
      errors.push(`Very low free memory: ${freeMemoryGB.toFixed(2)} GB`);
    }
  } else if (freeMemoryGB < 2) {
    warnings.push(lowMemoryMessage);
  }
  try {
    const sampleSize = await estimateDirectorySize(documentsDir);
    const estimatedGB = sampleSize / (1024 * 1024 * 1024);
    if (estimatedGB > 100) {
      warnings.push(
        `Large directory detected (~${estimatedGB.toFixed(1)} GB). Initial indexing may take several hours.`
      );
    } else if (estimatedGB > 10) {
      warnings.push(
        `Medium-sized directory detected (~${estimatedGB.toFixed(1)} GB). Initial indexing may take 30-60 minutes.`
      );
    }
  } catch (error) {
    warnings.push("Could not estimate directory size");
  }
  try {
    const files = await fs2.promises.readdir(vectorStoreDir);
    if (files.length > 0) {
      warnings.push(
        "Vector store directory is not empty. Existing data will be used for incremental indexing."
      );
    }
  } catch {
  }
  return {
    passed: errors.length === 0,
    warnings,
    errors
  };
}
async function estimateDirectorySize(dir, maxSamples = 100) {
  let totalSize = 0;
  let fileCount = 0;
  let sampledSize = 0;
  let sampledCount = 0;
  async function walk(currentDir) {
    if (sampledCount >= maxSamples) {
      return;
    }
    try {
      const entries = await fs2.promises.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (sampledCount >= maxSamples) {
          break;
        }
        const fullPath = `${currentDir}/${entry.name}`;
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          fileCount++;
          if (sampledCount < maxSamples) {
            try {
              const stats = await fs2.promises.stat(fullPath);
              sampledSize += stats.size;
              sampledCount++;
            } catch {
            }
          }
        }
      }
    } catch {
    }
  }
  await walk(dir);
  if (sampledCount > 0 && fileCount > 0) {
    const avgFileSize = sampledSize / sampledCount;
    totalSize = avgFileSize * fileCount;
  }
  return totalSize;
}
var fs2, os;
var init_sanityChecks = __esm({
  "src/utils/sanityChecks.ts"() {
    "use strict";
    fs2 = __toESM(require("fs"));
    os = __toESM(require("os"));
  }
});

// src/utils/indexingLock.ts
function tryStartIndexing(context = "unknown") {
  if (indexingInProgress) {
    console.debug(`[BigRAG] tryStartIndexing (${context}) failed: lock already held`);
    return false;
  }
  indexingInProgress = true;
  console.debug(`[BigRAG] tryStartIndexing (${context}) succeeded`);
  return true;
}
function finishIndexing() {
  indexingInProgress = false;
  console.debug("[BigRAG] finishIndexing: lock released");
}
var indexingInProgress;
var init_indexingLock = __esm({
  "src/utils/indexingLock.ts"() {
    "use strict";
    indexingInProgress = false;
  }
});

// src/utils/coerceEmbedding.ts
function coerceEmbeddingVector(raw) {
  if (Array.isArray(raw)) {
    return raw.map(assertFiniteNumber);
  }
  if (typeof raw === "number") {
    return [assertFiniteNumber(raw)];
  }
  if (raw && typeof raw === "object") {
    if (ArrayBuffer.isView(raw)) {
      return Array.from(raw).map(assertFiniteNumber);
    }
    const candidate = raw.embedding ?? raw.vector ?? raw.data ?? (typeof raw.toArray === "function" ? raw.toArray() : void 0) ?? (typeof raw.toJSON === "function" ? raw.toJSON() : void 0);
    if (candidate !== void 0) {
      return coerceEmbeddingVector(candidate);
    }
  }
  throw new Error("Embedding provider returned a non-numeric vector");
}
function assertFiniteNumber(value) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) {
    throw new Error("Embedding vector contains a non-finite value");
  }
  return num;
}
var init_coerceEmbedding = __esm({
  "src/utils/coerceEmbedding.ts"() {
    "use strict";
  }
});

// src/utils/embeddingIndexManifest.ts
function getEmbeddingManifestPath(vectorStoreDir) {
  return path2.join(path2.resolve(vectorStoreDir), EMBEDDING_INDEX_MANIFEST_FILENAME);
}
async function readEmbeddingIndexManifest(vectorStoreDir) {
  const filePath = getEmbeddingManifestPath(vectorStoreDir);
  try {
    const raw = await fs3.readFile(filePath, "utf-8");
    const data = JSON.parse(raw);
    if (typeof data.embeddingModelId === "string" && data.embeddingModelId.length > 0 && typeof data.dimensions === "number" && Number.isFinite(data.dimensions) && data.dimensions > 0) {
      return { embeddingModelId: data.embeddingModelId, dimensions: data.dimensions };
    }
    return null;
  } catch (e) {
    if (e?.code === "ENOENT") {
      return null;
    }
    console.warn("[BigRAG] Could not read embedding index manifest:", e);
    return null;
  }
}
async function writeEmbeddingIndexManifest(vectorStoreDir, manifest) {
  const filePath = getEmbeddingManifestPath(vectorStoreDir);
  await fs3.mkdir(path2.dirname(filePath), { recursive: true });
  await fs3.writeFile(filePath, JSON.stringify(manifest, null, 2), "utf-8");
}
async function deleteEmbeddingIndexManifest(vectorStoreDir) {
  const filePath = getEmbeddingManifestPath(vectorStoreDir);
  try {
    await fs3.unlink(filePath);
  } catch (e) {
    if (e?.code !== "ENOENT") {
      console.warn("[BigRAG] Could not delete embedding index manifest:", e);
    }
  }
}
async function syncEmbeddingManifestAfterIndexing(vectorStoreDir, totalChunks, resolvedModelId, embeddingModel) {
  if (totalChunks === 0) {
    await deleteEmbeddingIndexManifest(vectorStoreDir);
    return;
  }
  const probe = await embeddingModel.embed(".");
  const dimensions = coerceEmbeddingVector(probe.embedding).length;
  await writeEmbeddingIndexManifest(vectorStoreDir, {
    embeddingModelId: resolvedModelId,
    dimensions
  });
}
async function checkEmbeddingModelForRetrieval(args) {
  const { vectorStoreDir, resolvedModelId, totalChunks, embeddingModel } = args;
  if (totalChunks === 0) {
    await deleteEmbeddingIndexManifest(vectorStoreDir);
    return { ok: true };
  }
  const manifest = await readEmbeddingIndexManifest(vectorStoreDir);
  if (!manifest) {
    const key = path2.resolve(vectorStoreDir);
    if (!legacyWarnedDirs.has(key)) {
      legacyWarnedDirs.add(key);
      console.warn(
        "[BigRAG] Index has chunks but no `.big-rag-embedding.json` manifest (likely built with an older plugin). Retrieval proceeds; run a full reindex to record embedding metadata."
      );
    }
    return { ok: true };
  }
  if (manifest.embeddingModelId !== resolvedModelId) {
    const logMessage = `Embedding model mismatch: index was built with "${manifest.embeddingModelId}" but settings use "${resolvedModelId}". Reindex or change the setting.`;
    return {
      ok: false,
      logMessage,
      userMessage: `The document index was built with embedding model "${manifest.embeddingModelId}", but the plugin is set to "${resolvedModelId}". Either switch the Embedding Model setting back, or reindex your documents after changing the model.`
    };
  }
  const probe = await embeddingModel.embed(".");
  const dim = coerceEmbeddingVector(probe.embedding).length;
  if (dim !== manifest.dimensions) {
    const logMessage = `Embedding dimension mismatch: manifest has ${manifest.dimensions} but model "${resolvedModelId}" returned ${dim}. Reindex required.`;
    return {
      ok: false,
      logMessage,
      userMessage: `The stored index expects embedding vectors of length ${manifest.dimensions}, but the current model produced length ${dim}. Reindex your documents (or fix the model identifier).`
    };
  }
  return { ok: true };
}
var fs3, path2, EMBEDDING_INDEX_MANIFEST_FILENAME, legacyWarnedDirs;
var init_embeddingIndexManifest = __esm({
  "src/utils/embeddingIndexManifest.ts"() {
    "use strict";
    fs3 = __toESM(require("fs/promises"));
    path2 = __toESM(require("path"));
    init_coerceEmbedding();
    EMBEDDING_INDEX_MANIFEST_FILENAME = ".big-rag-embedding.json";
    legacyWarnedDirs = /* @__PURE__ */ new Set();
  }
});

// src/utils/supportedExtensions.ts
function isHtmlExtension(ext) {
  return HTML_EXTENSION_SET.has(ext.toLowerCase());
}
function isMarkdownExtension(ext) {
  return MARKDOWN_EXTENSION_SET.has(ext.toLowerCase());
}
function isPlainTextExtension(ext) {
  return TEXT_EXTENSION_SET.has(ext.toLowerCase());
}
function isTextualExtension(ext) {
  return isMarkdownExtension(ext) || isPlainTextExtension(ext);
}
function listSupportedExtensions() {
  return Array.from(SUPPORTED_EXTENSIONS.values()).sort();
}
var HTML_EXTENSIONS, MARKDOWN_EXTENSIONS, TEXT_EXTENSIONS, PDF_EXTENSIONS, EPUB_EXTENSIONS, IMAGE_EXTENSIONS, ARCHIVE_EXTENSIONS, ALL_EXTENSION_GROUPS, SUPPORTED_EXTENSIONS, HTML_EXTENSION_SET, MARKDOWN_EXTENSION_SET, TEXT_EXTENSION_SET, IMAGE_EXTENSION_SET;
var init_supportedExtensions = __esm({
  "src/utils/supportedExtensions.ts"() {
    "use strict";
    HTML_EXTENSIONS = [".htm", ".html", ".xhtml"];
    MARKDOWN_EXTENSIONS = [".md", ".markdown", ".mdown", ".mdx", ".mkd", ".mkdn"];
    TEXT_EXTENSIONS = [".txt", ".text"];
    PDF_EXTENSIONS = [".pdf"];
    EPUB_EXTENSIONS = [".epub"];
    IMAGE_EXTENSIONS = [".bmp", ".jpg", ".jpeg", ".png"];
    ARCHIVE_EXTENSIONS = [".rar"];
    ALL_EXTENSION_GROUPS = [
      HTML_EXTENSIONS,
      MARKDOWN_EXTENSIONS,
      TEXT_EXTENSIONS,
      PDF_EXTENSIONS,
      EPUB_EXTENSIONS,
      IMAGE_EXTENSIONS,
      ARCHIVE_EXTENSIONS
    ];
    SUPPORTED_EXTENSIONS = new Set(
      ALL_EXTENSION_GROUPS.flatMap((group) => group.map((ext) => ext.toLowerCase()))
    );
    HTML_EXTENSION_SET = new Set(HTML_EXTENSIONS);
    MARKDOWN_EXTENSION_SET = new Set(MARKDOWN_EXTENSIONS);
    TEXT_EXTENSION_SET = new Set(TEXT_EXTENSIONS);
    IMAGE_EXTENSION_SET = new Set(IMAGE_EXTENSIONS);
  }
});

// src/utils/fileExcludePatterns.ts
function parseExcludePatternsBlock(text) {
  const out = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) {
      continue;
    }
    out.push(line);
  }
  return out;
}
function matchExcludePattern(relativePosixPath, patterns) {
  for (const p of patterns) {
    if ((0, import_minimatch.minimatch)(relativePosixPath, p, MINIMATCH_OPTS)) {
      return p;
    }
  }
  return null;
}
var import_minimatch, MINIMATCH_OPTS;
var init_fileExcludePatterns = __esm({
  "src/utils/fileExcludePatterns.ts"() {
    "use strict";
    import_minimatch = require("minimatch");
    MINIMATCH_OPTS = {
      dot: true,
      matchBase: true,
      windowsPathsNoEscape: true
    };
  }
});

// src/ingestion/fileScanner.ts
function normalizeRootDir(rootDir) {
  return path3.resolve(rootDir.trim()).replace(/[/\\]+$/, "");
}
function toPosixRelativePath(root, fullPath) {
  return path3.relative(root, fullPath).split(path3.sep).join("/");
}
async function scanDirectory(rootDir, onProgress, options) {
  const root = normalizeRootDir(rootDir);
  const excludePatterns = options?.excludePatterns ?? [];
  const onExcludedFile = options?.onExcludedFile;
  try {
    await fs4.promises.access(root, fs4.constants.R_OK);
  } catch (err) {
    if (err?.code === "ENOENT") {
      throw new Error(
        `Documents directory does not exist: ${root}. Check the path (e.g. spelling and that the folder exists).`
      );
    }
    throw err;
  }
  const files = [];
  let scannedCount = 0;
  const supportedExtensionsDescription = listSupportedExtensions().join(", ");
  console.log(`[Scanner] Supported extensions: ${supportedExtensionsDescription}`);
  async function walk(dir) {
    try {
      const entries = await fs4.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path3.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          scannedCount++;
          const ext = path3.extname(entry.name).toLowerCase();
          if (SUPPORTED_EXTENSIONS.has(ext)) {
            const relativePosix = toPosixRelativePath(root, fullPath);
            const matchedPattern = excludePatterns.length > 0 ? matchExcludePattern(relativePosix, excludePatterns) : null;
            if (matchedPattern !== null) {
              onExcludedFile?.({ relativePath: relativePosix, pattern: matchedPattern });
            } else {
              const stats = await fs4.promises.stat(fullPath);
              const mimeType = mime.lookup(fullPath);
              files.push({
                path: fullPath,
                name: entry.name,
                extension: ext,
                mimeType,
                size: stats.size,
                mtime: stats.mtime
              });
            }
          }
          if (onProgress && scannedCount % 100 === 0) {
            onProgress(scannedCount, files.length);
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error);
    }
  }
  await walk(root);
  if (onProgress) {
    onProgress(scannedCount, files.length);
  }
  return files;
}
var fs4, path3, mime;
var init_fileScanner = __esm({
  "src/ingestion/fileScanner.ts"() {
    "use strict";
    fs4 = __toESM(require("fs"));
    path3 = __toESM(require("path"));
    mime = __toESM(require("mime-types"));
    init_supportedExtensions();
    init_fileExcludePatterns();
  }
});

// src/parsers/htmlParser.ts
async function parseHTML(filePath) {
  try {
    const content = await fs5.promises.readFile(filePath, "utf-8");
    const $ = cheerio.load(content);
    $("script, style, noscript").remove();
    const text = $("body").text() || $.text();
    return text.replace(/\s+/g, " ").replace(/\n+/g, "\n").trim();
  } catch (error) {
    console.error(`Error parsing HTML file ${filePath}:`, error);
    return "";
  }
}
var cheerio, fs5;
var init_htmlParser = __esm({
  "src/parsers/htmlParser.ts"() {
    "use strict";
    cheerio = __toESM(require("cheerio"));
    fs5 = __toESM(require("fs"));
  }
});

// src/parsers/pdfParser.ts
async function getMupdf() {
  if (!cachedMupdf) {
    cachedMupdf = await import("mupdf");
  }
  return cachedMupdf;
}
function cleanText(text) {
  return text.replace(/\s+/g, " ").replace(/\n+/g, "\n").trim();
}
async function tryLmStudioParser(filePath, client2) {
  const maxRetries = 2;
  const fileName = filePath.split("/").pop() || filePath;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const fileHandle = await client2.files.prepareFile(filePath);
      const result = await client2.files.parseDocument(fileHandle, {
        onProgress: (progress) => {
          if (progress === 0 || progress === 1) {
            console.log(
              `[PDF Parser] (LM Studio) Processing ${fileName}: ${(progress * 100).toFixed(0)}%`
            );
          }
        }
      });
      const cleaned = cleanText(result.content);
      if (cleaned.length >= MIN_TEXT_LENGTH) {
        return { success: true, text: cleaned, stage: "lmstudio" };
      }
      console.log(
        `[PDF Parser] (LM Studio) Parsed but got very little text from ${fileName} (length=${cleaned.length}), will try fallbacks`
      );
      return {
        success: false,
        reason: "pdf.lmstudio-empty",
        details: `length=${cleaned.length}`
      };
    } catch (error) {
      const isWebSocketError = error instanceof Error && (error.message.includes("WebSocket") || error.message.includes("connection closed"));
      if (isWebSocketError && attempt < maxRetries) {
        console.warn(
          `[PDF Parser] (LM Studio) WebSocket error on ${fileName}, retrying (${attempt}/${maxRetries})...`
        );
        await new Promise((resolve4) => setTimeout(resolve4, 1e3 * attempt));
        continue;
      }
      console.error(`[PDF Parser] (LM Studio) Error parsing PDF file ${filePath}:`, error);
      return {
        success: false,
        reason: "pdf.lmstudio-error",
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
  return {
    success: false,
    reason: "pdf.lmstudio-error",
    details: "Exceeded retry attempts"
  };
}
async function tryPdfParse(filePath) {
  const fileName = filePath.split("/").pop() || filePath;
  try {
    const buffer = await fs6.promises.readFile(filePath);
    const result = await (0, import_pdf_parse.default)(buffer);
    const cleaned = cleanText(result.text || "");
    if (cleaned.length >= MIN_TEXT_LENGTH) {
      console.log(`[PDF Parser] (pdf-parse) Successfully extracted text from ${fileName}`);
      return { success: true, text: cleaned, stage: "pdf-parse" };
    }
    console.log(
      `[PDF Parser] (pdf-parse) Very little or no text extracted from ${fileName} (length=${cleaned.length})`
    );
    return {
      success: false,
      reason: "pdf.pdfparse-empty",
      details: `length=${cleaned.length}`
    };
  } catch (error) {
    console.error(`[PDF Parser] (pdf-parse) Error parsing PDF file ${filePath}:`, error);
    return {
      success: false,
      reason: "pdf.pdfparse-error",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}
function computeSafeOcrScale(bounds, desiredScale) {
  const width = bounds[2] - bounds[0];
  const height = bounds[3] - bounds[1];
  if (!(width > 0) || !(height > 0)) {
    return null;
  }
  for (let scale = desiredScale; scale >= OCR_MIN_SCALE; scale -= 0.25) {
    const pixels = width * scale * (height * scale);
    if (pixels <= OCR_MAX_PIXMAP_PIXELS) {
      return scale;
    }
  }
  return null;
}
async function tryOcrWithMuPdf(filePath) {
  console.log("[PDF Parser] (OCR) Starting OCR fallback for", filePath);
  const fileName = filePath.split("/").pop() || filePath;
  let worker = null;
  let docHandle = null;
  try {
    const mupdf = await getMupdf();
    const fileBuffer = await fs6.promises.readFile(filePath);
    const doc = mupdf.Document.openDocument(fileBuffer, "application/pdf");
    docHandle = doc;
    const numPages = doc.countPages();
    const maxPages = Math.min(numPages, OCR_MAX_PAGES);
    console.log(
      `[PDF Parser] (OCR) Starting MuPDF OCR for ${fileName} - pages 1 to ${maxPages}`
    );
    worker = await (0, import_tesseract.createWorker)("eng");
    const textParts = [];
    let renderErrors = 0;
    for (let pageNum = 0; pageNum < maxPages; pageNum++) {
      let page = null;
      let pixmap = null;
      try {
        page = doc.loadPage(pageNum);
        const bounds = page.getBounds();
        const scale = computeSafeOcrScale(bounds, OCR_DEFAULT_SCALE);
        if (scale === null) {
          renderErrors++;
          console.warn(
            `[PDF Parser] (OCR) Skipping oversized page ${pageNum + 1} of ${fileName} (bounds=${bounds.join(",")}) to avoid a native allocation failure`
          );
          continue;
        }
        const matrix = mupdf.Matrix.scale(scale, scale);
        pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true);
        const pngBuffer = pixmap.asPNG();
        try {
          const { data: { text } } = await worker.recognize(Buffer.from(pngBuffer));
          const cleaned = cleanText(text || "");
          if (cleaned.length > 0) {
            textParts.push(cleaned);
          }
        } catch (recognizeError) {
          renderErrors++;
          console.warn(
            `[PDF Parser] (OCR) Failed to recognize page ${pageNum + 1} of ${fileName}, recreating worker:`,
            recognizeError instanceof Error ? recognizeError.message : recognizeError
          );
          try {
            await worker.terminate();
          } catch {
          }
          try {
            worker = await (0, import_tesseract.createWorker)("eng");
          } catch (recreateError) {
            console.error(
              `[PDF Parser] (OCR) Failed to recreate OCR worker, aborting OCR for ${fileName}`
            );
            worker = null;
            return {
              success: false,
              reason: "pdf.ocr-error",
              details: `Worker crashed and could not be recreated: ${recreateError instanceof Error ? recreateError.message : String(recreateError)}`
            };
          }
        }
        if (pageNum === 0 || (pageNum + 1) % 10 === 0 || pageNum + 1 === maxPages) {
          console.log(
            `[PDF Parser] (OCR) ${fileName} - processed page ${pageNum + 1}/${maxPages} (chars=${textParts.join("\n\n").length})`
          );
        }
      } catch (pageError) {
        renderErrors++;
        console.error(
          `[PDF Parser] (OCR) Error rendering page ${pageNum + 1} of ${fileName}:`,
          pageError
        );
      } finally {
        pixmap?.destroy();
        page?.destroy();
      }
    }
    if (worker) {
      await worker.terminate();
      worker = null;
    }
    if (renderErrors > 0) {
      console.warn(
        `[PDF Parser] (OCR) ${fileName} had ${renderErrors}/${maxPages} page render errors`
      );
    }
    const fullText = cleanText(textParts.join("\n\n"));
    if (fullText.length >= MIN_TEXT_LENGTH) {
      return { success: true, text: fullText, stage: "ocr" };
    }
    if (renderErrors > 0) {
      return {
        success: false,
        reason: "pdf.ocr-render-error",
        details: `${renderErrors}/${maxPages} page render errors`
      };
    }
    return {
      success: false,
      reason: "pdf.ocr-empty",
      details: "OCR produced insufficient text"
    };
  } catch (error) {
    console.error(`[PDF Parser] (OCR) Error during OCR:`, error);
    return {
      success: false,
      reason: "pdf.ocr-error",
      details: error instanceof Error ? error.message : String(error)
    };
  } finally {
    if (worker) {
      await worker.terminate();
    }
    docHandle?.destroy();
  }
}
async function parsePDF(filePath, client2, enableOCR) {
  const fileName = filePath.split("/").pop() || filePath;
  const lmStudioResult = await tryLmStudioParser(filePath, client2);
  if (lmStudioResult.success) {
    return lmStudioResult;
  }
  let lastFailure = lmStudioResult;
  const pdfParseResult = await tryPdfParse(filePath);
  if (pdfParseResult.success) {
    return pdfParseResult;
  }
  lastFailure = pdfParseResult;
  if (!enableOCR) {
    console.log(
      `[PDF Parser] (OCR) Enable OCR is off, skipping OCR fallback for ${fileName} after other methods returned no text`
    );
    return {
      success: false,
      reason: "pdf.ocr-disabled",
      details: `Previous failure reason: ${lastFailure.reason}`
    };
  }
  console.log(
    `[PDF Parser] (OCR) No text extracted from ${fileName} with LM Studio or pdf-parse, attempting OCR...`
  );
  return tryOcrWithMuPdf(filePath);
}
var fs6, import_pdf_parse, import_tesseract, cachedMupdf, MIN_TEXT_LENGTH, OCR_MAX_PAGES, OCR_DEFAULT_SCALE, OCR_MIN_SCALE, OCR_MAX_PIXMAP_PIXELS;
var init_pdfParser = __esm({
  "src/parsers/pdfParser.ts"() {
    "use strict";
    fs6 = __toESM(require("fs"));
    import_pdf_parse = __toESM(require("pdf-parse"));
    import_tesseract = require("tesseract.js");
    cachedMupdf = null;
    MIN_TEXT_LENGTH = 50;
    OCR_MAX_PAGES = 50;
    OCR_DEFAULT_SCALE = 2;
    OCR_MIN_SCALE = 0.75;
    OCR_MAX_PIXMAP_PIXELS = 5e7;
  }
});

// src/parsers/epubParser.ts
async function parseEPUB(filePath) {
  return new Promise((resolve4, reject) => {
    try {
      const epub = new import_epub2.EPub(filePath);
      epub.on("error", (error) => {
        console.error(`Error parsing EPUB file ${filePath}:`, error);
        resolve4("");
      });
      const stripHtml = (input) => input.replace(/<[^>]*>/g, " ");
      const getManifestEntry = (chapterId) => {
        return epub.manifest?.[chapterId];
      };
      const decodeMediaType = (entry) => entry?.["media-type"] || entry?.mediaType || "";
      const shouldReadRaw = (mediaType) => {
        const normalized = mediaType.toLowerCase();
        if (!normalized) {
          return true;
        }
        if (normalized === "application/xhtml+xml" || normalized === "image/svg+xml") {
          return false;
        }
        if (normalized.startsWith("text/")) {
          return true;
        }
        if (normalized.includes("html")) {
          return true;
        }
        return true;
      };
      const readChapter = async (chapterId) => {
        const manifestEntry = getManifestEntry(chapterId);
        if (!manifestEntry) {
          console.warn(`EPUB chapter ${chapterId} missing manifest entry in ${filePath}, skipping`);
          return "";
        }
        const mediaType = decodeMediaType(manifestEntry);
        if (shouldReadRaw(mediaType)) {
          return new Promise((res, rej) => {
            epub.getFile(
              chapterId,
              (error, data) => {
                if (error) {
                  rej(error);
                } else if (!data) {
                  res("");
                } else {
                  res(stripHtml(data.toString("utf-8")));
                }
              }
            );
          });
        }
        return new Promise((res, rej) => {
          epub.getChapter(
            chapterId,
            (error, text) => {
              if (error) {
                rej(error);
              } else if (typeof text === "string") {
                res(stripHtml(text));
              } else {
                res("");
              }
            }
          );
        });
      };
      epub.on("end", async () => {
        try {
          const chapters = epub.flow;
          const textParts = [];
          for (const chapter of chapters) {
            try {
              const chapterId = chapter.id;
              if (!chapterId) {
                console.warn(`EPUB chapter missing id in ${filePath}, skipping`);
                textParts.push("");
                continue;
              }
              const text = await readChapter(chapterId);
              textParts.push(text);
            } catch (chapterError) {
              console.error(`Error reading chapter ${chapter.id}:`, chapterError);
            }
          }
          const fullText = textParts.join("\n\n");
          resolve4(
            fullText.replace(/\s+/g, " ").replace(/\n+/g, "\n").trim()
          );
        } catch (error) {
          console.error(`Error processing EPUB chapters:`, error);
          resolve4("");
        }
      });
      epub.parse();
    } catch (error) {
      console.error(`Error initializing EPUB parser for ${filePath}:`, error);
      resolve4("");
    }
  });
}
var import_epub2;
var init_epubParser = __esm({
  "src/parsers/epubParser.ts"() {
    "use strict";
    import_epub2 = require("epub2");
  }
});

// src/parsers/imageParser.ts
async function parseImage(filePath) {
  try {
    const worker = await (0, import_tesseract2.createWorker)("eng");
    const { data: { text } } = await worker.recognize(filePath);
    await worker.terminate();
    return text.replace(/\s+/g, " ").replace(/\n+/g, "\n").trim();
  } catch (error) {
    console.error(`Error parsing image file ${filePath}:`, error);
    return "";
  }
}
var import_tesseract2;
var init_imageParser = __esm({
  "src/parsers/imageParser.ts"() {
    "use strict";
    import_tesseract2 = require("tesseract.js");
  }
});

// src/parsers/textParser.ts
async function parseText(filePath, options = {}) {
  const { stripMarkdown = false, preserveLineBreaks = false } = options;
  try {
    const content = await fs7.promises.readFile(filePath, "utf-8");
    const normalized = normalizeLineEndings(content);
    const stripped = stripMarkdown ? stripMarkdownSyntax(normalized) : normalized;
    return (preserveLineBreaks ? collapseWhitespaceButKeepLines(stripped) : collapseWhitespace(stripped)).trim();
  } catch (error) {
    console.error(`Error parsing text file ${filePath}:`, error);
    return "";
  }
}
function normalizeLineEndings(input) {
  return input.replace(/\r\n?/g, "\n");
}
function collapseWhitespace(input) {
  return input.replace(/\s+/g, " ");
}
function collapseWhitespaceButKeepLines(input) {
  return input.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ");
}
function stripMarkdownSyntax(input) {
  let output = input;
  output = output.replace(/```[\s\S]*?```/g, " ");
  output = output.replace(/`([^`]+)`/g, "$1");
  output = output.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1 ");
  output = output.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  output = output.replace(/(\*\*|__)(.*?)\1/g, "$2");
  output = output.replace(/(\*|_)(.*?)\1/g, "$2");
  output = output.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  output = output.replace(/^\s{0,3}>\s?/gm, "");
  output = output.replace(/^\s{0,3}[-*+]\s+/gm, "");
  output = output.replace(/^\s{0,3}\d+[\.\)]\s+/gm, "");
  output = output.replace(/^\s{0,3}([-*_]\s?){3,}$/gm, "");
  output = output.replace(/<[^>]+>/g, " ");
  return output;
}
var fs7;
var init_textParser = __esm({
  "src/parsers/textParser.ts"() {
    "use strict";
    fs7 = __toESM(require("fs"));
  }
});

// src/parsers/documentParser.ts
async function parseDocument(filePath, enableOCR = false, client2) {
  const ext = path4.extname(filePath).toLowerCase();
  const fileName = path4.basename(filePath);
  const buildSuccess = (text) => ({
    success: true,
    document: {
      text,
      metadata: {
        filePath,
        fileName,
        extension: ext,
        parsedAt: /* @__PURE__ */ new Date()
      }
    }
  });
  try {
    if (isHtmlExtension(ext)) {
      try {
        const text = cleanAndValidate(
          await parseHTML(filePath),
          "html.empty",
          `${fileName} html`
        );
        return text.success ? buildSuccess(text.value) : text;
      } catch (error) {
        console.error(`[Parser][HTML] Error parsing ${filePath}:`, error);
        return {
          success: false,
          reason: "html.error",
          details: error instanceof Error ? error.message : String(error)
        };
      }
    }
    if (ext === ".pdf") {
      if (!client2) {
        console.warn(`[Parser] No LM Studio client available for PDF parsing: ${fileName}`);
        return { success: false, reason: "pdf.missing-client" };
      }
      const pdfResult = await parsePDF(filePath, client2, enableOCR);
      if (pdfResult.success) {
        return buildSuccess(pdfResult.text);
      }
      return pdfResult;
    }
    if (ext === ".epub") {
      const text = await parseEPUB(filePath);
      const cleaned = cleanAndValidate(text, "epub.empty", fileName);
      return cleaned.success ? buildSuccess(cleaned.value) : cleaned;
    }
    if (isTextualExtension(ext)) {
      try {
        const text = await parseText(filePath, {
          stripMarkdown: isMarkdownExtension(ext),
          preserveLineBreaks: isPlainTextExtension(ext)
        });
        const cleaned = cleanAndValidate(text, "text.empty", fileName);
        return cleaned.success ? buildSuccess(cleaned.value) : cleaned;
      } catch (error) {
        console.error(`[Parser][Text] Error parsing ${filePath}:`, error);
        return {
          success: false,
          reason: "text.error",
          details: error instanceof Error ? error.message : String(error)
        };
      }
    }
    if (IMAGE_EXTENSION_SET.has(ext)) {
      if (!enableOCR) {
        console.log(`Skipping image file ${filePath} (OCR disabled)`);
        return { success: false, reason: "image.ocr-disabled" };
      }
      try {
        const text = await parseImage(filePath);
        const cleaned = cleanAndValidate(text, "image.empty", fileName);
        return cleaned.success ? buildSuccess(cleaned.value) : cleaned;
      } catch (error) {
        console.error(`[Parser][Image] Error parsing ${filePath}:`, error);
        return {
          success: false,
          reason: "image.error",
          details: error instanceof Error ? error.message : String(error)
        };
      }
    }
    if (ext === ".rar") {
      console.log(`RAR files not yet supported: ${filePath}`);
      return { success: false, reason: "unsupported-extension", details: ".rar" };
    }
    console.log(`Unsupported file type: ${filePath}`);
    return { success: false, reason: "unsupported-extension", details: ext };
  } catch (error) {
    console.error(`Error parsing document ${filePath}:`, error);
    return {
      success: false,
      reason: "parser.unexpected-error",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}
function cleanAndValidate(text, emptyReason, detailsContext) {
  const cleaned = text?.trim() ?? "";
  if (cleaned.length === 0) {
    return {
      success: false,
      reason: emptyReason,
      details: detailsContext ? `${detailsContext} trimmed to zero length` : void 0
    };
  }
  return { success: true, value: cleaned };
}
var path4;
var init_documentParser = __esm({
  "src/parsers/documentParser.ts"() {
    "use strict";
    path4 = __toESM(require("path"));
    init_htmlParser();
    init_pdfParser();
    init_epubParser();
    init_imageParser();
    init_textParser();
    init_supportedExtensions();
  }
});

// src/utils/textChunker.ts
function chunkText(text, chunkSize, overlap) {
  const chunks = [];
  const words = text.split(/\s+/);
  if (words.length === 0) {
    return chunks;
  }
  let startIdx = 0;
  while (startIdx < words.length) {
    const endIdx = Math.min(startIdx + chunkSize, words.length);
    const chunkWords = words.slice(startIdx, endIdx);
    const chunkText2 = chunkWords.join(" ");
    chunks.push({
      text: chunkText2,
      startIndex: startIdx,
      endIndex: endIdx
    });
    startIdx += Math.max(1, chunkSize - overlap);
    if (endIdx >= words.length) {
      break;
    }
  }
  return chunks;
}
var init_textChunker = __esm({
  "src/utils/textChunker.ts"() {
    "use strict";
  }
});

// src/utils/fileHash.ts
async function calculateFileHash(filePath) {
  return new Promise((resolve4, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs8.createReadStream(filePath);
    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => resolve4(hash.digest("hex")));
    stream.on("error", reject);
  });
}
var crypto, fs8;
var init_fileHash = __esm({
  "src/utils/fileHash.ts"() {
    "use strict";
    crypto = __toESM(require("crypto"));
    fs8 = __toESM(require("fs"));
  }
});

// src/utils/failedFileRegistry.ts
var fs9, path5, FailedFileRegistry;
var init_failedFileRegistry = __esm({
  "src/utils/failedFileRegistry.ts"() {
    "use strict";
    fs9 = __toESM(require("fs/promises"));
    path5 = __toESM(require("path"));
    FailedFileRegistry = class {
      constructor(registryPath) {
        this.registryPath = registryPath;
        this.loaded = false;
        this.entries = {};
        this.queue = Promise.resolve();
      }
      async load() {
        if (this.loaded) {
          return;
        }
        try {
          const data = await fs9.readFile(this.registryPath, "utf-8");
          this.entries = JSON.parse(data) ?? {};
        } catch {
          this.entries = {};
        }
        this.loaded = true;
      }
      async persist() {
        await fs9.mkdir(path5.dirname(this.registryPath), { recursive: true });
        await fs9.writeFile(this.registryPath, JSON.stringify(this.entries, null, 2), "utf-8");
      }
      runExclusive(operation) {
        const result = this.queue.then(operation);
        this.queue = result.then(
          () => {
          },
          () => {
          }
        );
        return result;
      }
      async recordFailure(filePath, fileHash, reason) {
        return this.runExclusive(async () => {
          await this.load();
          this.entries[filePath] = {
            fileHash,
            reason,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
          await this.persist();
        });
      }
      async clearFailure(filePath) {
        return this.runExclusive(async () => {
          await this.load();
          if (this.entries[filePath]) {
            delete this.entries[filePath];
            await this.persist();
          }
        });
      }
      async getFailureReason(filePath, fileHash) {
        await this.load();
        const entry = this.entries[filePath];
        if (!entry) {
          return void 0;
        }
        return entry.fileHash === fileHash ? entry.reason : void 0;
      }
    };
  }
});

// src/ingestion/indexManager.ts
var import_p_queue, fs10, path6, EXCLUDE_PROGRESS_THROTTLE, IndexManager;
var init_indexManager = __esm({
  "src/ingestion/indexManager.ts"() {
    "use strict";
    import_p_queue = __toESM(require("p-queue"));
    fs10 = __toESM(require("fs"));
    path6 = __toESM(require("path"));
    init_fileScanner();
    init_documentParser();
    init_textChunker();
    init_fileHash();
    init_failedFileRegistry();
    init_coerceEmbedding();
    EXCLUDE_PROGRESS_THROTTLE = 40;
    IndexManager = class {
      constructor(options) {
        this.failureReasonCounts = {};
        this.options = options;
        this.queue = new import_p_queue.default({ concurrency: options.maxConcurrent });
        this.failedFileRegistry = new FailedFileRegistry(
          path6.join(options.vectorStoreDir, ".big-rag-failures.json")
        );
      }
      /**
       * Start the indexing process
       */
      async index() {
        const { documentsDir, vectorStore: vectorStore2, onProgress } = this.options;
        try {
          const fileInventory = await vectorStore2.getFileHashInventory();
          if (onProgress) {
            onProgress({
              totalFiles: 0,
              processedFiles: 0,
              currentFile: "",
              status: "scanning"
            });
          }
          const excludePatterns = this.options.excludePatterns ?? [];
          let excludedByPattern = 0;
          let lastExcludeProgressEmittedAt = 0;
          let lastExcludedRelative = "";
          const onExcludedFile = excludePatterns.length > 0 ? (info) => {
            excludedByPattern++;
            lastExcludedRelative = info.relativePath;
            console.log(
              `Excluded from indexing (exclude pattern): ${info.relativePath} (matched: ${info.pattern})`
            );
            if (!onProgress) {
              return;
            }
            if (excludedByPattern === 1 || excludedByPattern - lastExcludeProgressEmittedAt >= EXCLUDE_PROGRESS_THROTTLE) {
              lastExcludeProgressEmittedAt = excludedByPattern;
              onProgress({
                totalFiles: 0,
                processedFiles: 0,
                currentFile: `Excluded ${excludedByPattern} by pattern (latest: ${lastExcludedRelative})`,
                status: "scanning"
              });
            }
          } : void 0;
          const files = await scanDirectory(
            documentsDir,
            (scanned, found) => {
              if (onProgress) {
                onProgress({
                  totalFiles: found,
                  processedFiles: 0,
                  currentFile: `Scanned ${scanned} files...`,
                  status: "scanning"
                });
              }
            },
            {
              excludePatterns,
              onExcludedFile
            }
          );
          if (onProgress && excludedByPattern > 0 && excludedByPattern !== lastExcludeProgressEmittedAt) {
            onProgress({
              totalFiles: 0,
              processedFiles: 0,
              currentFile: `Excluded ${excludedByPattern} by pattern (latest: ${lastExcludedRelative})`,
              status: "scanning"
            });
          }
          this.options.abortSignal?.throwIfAborted();
          console.log(
            `Found ${files.length} files to process` + (excludedByPattern > 0 ? ` (${excludedByPattern} excluded by exclude patterns)` : "")
          );
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
              status: "indexing"
            });
          }
          const abortSignal = this.options.abortSignal;
          const onAbort = () => this.queue.clear();
          if (abortSignal) {
            abortSignal.addEventListener("abort", onAbort, { once: true });
          }
          const tasks = files.map(
            (file) => this.queue.add(async () => {
              abortSignal?.throwIfAborted();
              let outcome = { type: "failed" };
              try {
                if (onProgress) {
                  onProgress({
                    totalFiles: files.length,
                    processedFiles: processedCount,
                    currentFile: file.name,
                    status: "indexing",
                    successfulFiles: successCount,
                    failedFiles: failCount,
                    skippedFiles: skippedCount
                  });
                }
                outcome = await this.indexFile(file, fileInventory);
              } catch (error) {
                console.error(`Error indexing file ${file.path}:`, error);
                this.recordFailure(
                  "parser.unexpected-error",
                  error instanceof Error ? error.message : String(error),
                  file
                );
              }
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
                  skippedFiles: skippedCount
                });
              }
            })
          );
          await Promise.all(tasks);
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
              skippedFiles: skippedCount
            });
          }
          this.logFailureSummary();
          await this.writeFailureReport({
            totalFiles: files.length,
            successfulFiles: successCount,
            failedFiles: failCount,
            skippedFiles: skippedCount,
            updatedFiles: updatedCount,
            newFiles: newCount
          });
          console.log(
            `Indexing complete: ${successCount}/${files.length} files successfully indexed (${failCount} failed, skipped=${skippedCount}, updated=${updatedCount}, new=${newCount})` + (excludedByPattern > 0 ? `; excluded by pattern=${excludedByPattern}` : "")
          );
          return {
            totalFiles: files.length,
            successfulFiles: successCount,
            failedFiles: failCount,
            skippedFiles: skippedCount,
            updatedFiles: updatedCount,
            newFiles: newCount
          };
        } catch (error) {
          console.error("Error during indexing:", error);
          if (onProgress) {
            onProgress({
              totalFiles: 0,
              processedFiles: 0,
              currentFile: "",
              status: "error",
              error: error instanceof Error ? error.message : String(error)
            });
          }
          throw error;
        }
      }
      /**
       * Index a single file
       */
      async indexFile(file, fileInventory = /* @__PURE__ */ new Map()) {
        const { vectorStore: vectorStore2, embeddingModel, client: client2, chunkSize, chunkOverlap, enableOCR, autoReindex } = this.options;
        let fileHash;
        try {
          fileHash = await calculateFileHash(file.path);
          const existingHashes = fileInventory.get(file.path);
          const hasSeenBefore = existingHashes !== void 0 && existingHashes.size > 0;
          const hasSameHash = existingHashes?.has(fileHash) ?? false;
          if (autoReindex && hasSameHash) {
            console.log(`File already indexed (skipped): ${file.name}`);
            return { type: "skipped" };
          }
          if (autoReindex) {
            const previousFailure = await this.failedFileRegistry.getFailureReason(file.path, fileHash);
            if (previousFailure) {
              console.log(
                `File previously failed (skipped): ${file.name} (reason=${previousFailure})`
              );
              return { type: "skipped" };
            }
          }
          if (this.options.parseDelayMs > 0) {
            await new Promise((resolve4) => setTimeout(resolve4, this.options.parseDelayMs));
          }
          const parsedResult = await parseDocument(file.path, enableOCR, client2);
          if (!parsedResult.success) {
            this.recordFailure(parsedResult.reason, parsedResult.details, file);
            if (fileHash) {
              await this.failedFileRegistry.recordFailure(file.path, fileHash, parsedResult.reason);
            }
            return { type: "failed" };
          }
          const parsed = parsedResult.document;
          const chunks = chunkText(parsed.text, chunkSize, chunkOverlap);
          if (chunks.length === 0) {
            console.log(`No chunks created from ${file.name}`);
            this.recordFailure("index.chunk-empty", "chunkText produced 0 chunks", file);
            if (fileHash) {
              await this.failedFileRegistry.recordFailure(file.path, fileHash, "index.chunk-empty");
            }
            return { type: "failed" };
          }
          const documentChunks = [];
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            this.options.abortSignal?.throwIfAborted();
            try {
              const embeddingResult = await embeddingModel.embed(chunk.text);
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
                  endIndex: chunk.endIndex
                }
              });
            } catch (error) {
              console.error(`Error embedding chunk ${i} of ${file.name}:`, error);
            }
          }
          if (documentChunks.length === 0) {
            this.recordFailure(
              "index.chunk-empty",
              "All chunk embeddings failed, no document chunks",
              file
            );
            if (fileHash) {
              await this.failedFileRegistry.recordFailure(file.path, fileHash, "index.chunk-empty");
            }
            return { type: "failed" };
          }
          try {
            await vectorStore2.addChunks(documentChunks);
            console.log(`Indexed ${documentChunks.length} chunks from ${file.name}`);
            if (!existingHashes) {
              fileInventory.set(file.path, /* @__PURE__ */ new Set([fileHash]));
            } else {
              existingHashes.add(fileHash);
            }
            await this.failedFileRegistry.clearFailure(file.path);
            return {
              type: "indexed",
              changeType: hasSeenBefore ? "updated" : "new"
            };
          } catch (error) {
            console.error(`Error adding chunks for ${file.name}:`, error);
            this.recordFailure(
              "index.vector-add-error",
              error instanceof Error ? error.message : String(error),
              file
            );
            if (fileHash) {
              await this.failedFileRegistry.recordFailure(file.path, fileHash, "index.vector-add-error");
            }
            return { type: "failed" };
          }
        } catch (error) {
          console.error(`Error indexing file ${file.path}:`, error);
          this.recordFailure(
            "parser.unexpected-error",
            error instanceof Error ? error.message : String(error),
            file
          );
          if (fileHash) {
            await this.failedFileRegistry.recordFailure(file.path, fileHash, "parser.unexpected-error");
          }
          return { type: "failed" };
        }
      }
      /**
       * Reindex a specific file (delete old chunks and reindex)
       */
      async reindexFile(filePath) {
        const { vectorStore: vectorStore2 } = this.options;
        try {
          const fileHash = await calculateFileHash(filePath);
          await vectorStore2.deleteByFileHash(fileHash);
          const file = {
            path: filePath,
            name: filePath.split("/").pop() || filePath,
            extension: filePath.split(".").pop() || "",
            mimeType: false,
            size: 0,
            mtime: /* @__PURE__ */ new Date()
          };
          await this.indexFile(file);
        } catch (error) {
          console.error(`Error reindexing file ${filePath}:`, error);
          throw error;
        }
      }
      recordFailure(reason, details, file) {
        const current = this.failureReasonCounts[reason] ?? 0;
        this.failureReasonCounts[reason] = current + 1;
        const detailSuffix = details ? ` details=${details}` : "";
        console.warn(
          `[BigRAG] Failed to parse ${file.name} (reason=${reason}, count=${this.failureReasonCounts[reason]})${detailSuffix}`
        );
      }
      logFailureSummary() {
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
      async writeFailureReport(summary) {
        const reportPath = this.options.failureReportPath;
        if (!reportPath) {
          return;
        }
        const payload = {
          ...summary,
          documentsDir: this.options.documentsDir,
          failureReasons: this.failureReasonCounts,
          generatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        try {
          await fs10.promises.mkdir(path6.dirname(reportPath), { recursive: true });
          await fs10.promises.writeFile(reportPath, JSON.stringify(payload, null, 2), "utf-8");
          console.log(`[BigRAG] Wrote failure report to ${reportPath}`);
        } catch (error) {
          console.error(`[BigRAG] Failed to write failure report to ${reportPath}:`, error);
        }
      }
    };
  }
});

// src/ingestion/runIndexing.ts
async function runIndexingJob({
  client: client2,
  abortSignal,
  documentsDir,
  vectorStoreDir,
  embeddingModelId,
  chunkSize,
  chunkOverlap,
  maxConcurrent,
  enableOCR,
  autoReindex,
  parseDelayMs,
  excludePatterns = [],
  forceReindex = false,
  vectorStore: existingVectorStore,
  onProgress
}) {
  const vectorStore2 = existingVectorStore ?? new VectorStore(vectorStoreDir);
  const ownsVectorStore = existingVectorStore === void 0;
  if (ownsVectorStore) {
    await vectorStore2.initialize();
  }
  const resolvedModelId = resolveEmbeddingModelId(embeddingModelId);
  const embeddingModel = await client2.embedding.model(resolvedModelId, { signal: abortSignal });
  const indexManager = new IndexManager({
    documentsDir,
    vectorStore: vectorStore2,
    vectorStoreDir,
    embeddingModel,
    client: client2,
    chunkSize,
    chunkOverlap,
    maxConcurrent,
    enableOCR,
    autoReindex: forceReindex ? false : autoReindex,
    parseDelayMs,
    excludePatterns,
    abortSignal,
    onProgress
  });
  const indexingResult = await indexManager.index();
  const stats = await vectorStore2.getStats();
  await syncEmbeddingManifestAfterIndexing(
    vectorStoreDir,
    stats.totalChunks,
    resolvedModelId,
    embeddingModel
  );
  if (ownsVectorStore) {
    await vectorStore2.close();
  }
  const summary = `Indexing completed!

\u2022 Successfully indexed: ${indexingResult.successfulFiles}/${indexingResult.totalFiles}
\u2022 Failed: ${indexingResult.failedFiles}
\u2022 Skipped (unchanged): ${indexingResult.skippedFiles}
\u2022 Updated existing files: ${indexingResult.updatedFiles}
\u2022 New files added: ${indexingResult.newFiles}
\u2022 Chunks in store: ${stats.totalChunks}
\u2022 Unique files in store: ${stats.uniqueFiles}`;
  return {
    summary,
    stats,
    indexingResult
  };
}
var init_runIndexing = __esm({
  "src/ingestion/runIndexing.ts"() {
    "use strict";
    init_indexManager();
    init_vectorStore();
    init_config();
    init_embeddingIndexManifest();
  }
});

// src/promptPreprocessor.ts
function checkAbort(signal) {
  if (signal.aborted) {
    throw signal.reason ?? new DOMException("Aborted", "AbortError");
  }
}
function isAbortError(error) {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error && error.name === "AbortError") return true;
  if (error instanceof Error && error.message === "Aborted") return true;
  return false;
}
function summarizeText(text, maxLines = 3, maxChars = 400) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  const clippedLines = lines.slice(0, maxLines);
  let clipped = clippedLines.join("\n");
  if (clipped.length > maxChars) {
    clipped = clipped.slice(0, maxChars);
  }
  const needsEllipsis = lines.length > maxLines || text.length > clipped.length || clipped.length === maxChars && text.length > maxChars;
  return needsEllipsis ? `${clipped.trimEnd()}\u2026` : clipped;
}
function normalizePromptTemplate(template) {
  const hasContent = typeof template === "string" && template.trim().length > 0;
  let normalized = hasContent ? template : DEFAULT_PROMPT_TEMPLATE;
  if (!normalized.includes(RAG_CONTEXT_MACRO)) {
    console.warn(
      `[BigRAG] Prompt template missing ${RAG_CONTEXT_MACRO}. Prepending RAG context block.`
    );
    normalized = `${RAG_CONTEXT_MACRO}

${normalized}`;
  }
  if (!normalized.includes(USER_QUERY_MACRO)) {
    console.warn(
      `[BigRAG] Prompt template missing ${USER_QUERY_MACRO}. Appending user query block.`
    );
    normalized = `${normalized}

User Query:

${USER_QUERY_MACRO}`;
  }
  return normalized;
}
function fillPromptTemplate(template, replacements) {
  return Object.entries(replacements).reduce(
    (acc, [token, value]) => acc.split(token).join(value),
    template
  );
}
async function warnIfContextOverflow(ctl, finalPrompt) {
  try {
    const tokenSource = await ctl.tokenSource();
    if (!tokenSource || !("applyPromptTemplate" in tokenSource) || typeof tokenSource.applyPromptTemplate !== "function" || !("countTokens" in tokenSource) || typeof tokenSource.countTokens !== "function" || !("getContextLength" in tokenSource) || typeof tokenSource.getContextLength !== "function") {
      console.warn("[BigRAG] Token source does not expose prompt utilities; skipping context check.");
      return;
    }
    const [contextLength, history] = await Promise.all([
      tokenSource.getContextLength(),
      ctl.pullHistory()
    ]);
    const historyWithLatestMessage = history.withAppended({
      role: "user",
      content: finalPrompt
    });
    const formattedPrompt = await tokenSource.applyPromptTemplate(historyWithLatestMessage);
    const promptTokens = await tokenSource.countTokens(formattedPrompt);
    if (promptTokens > contextLength) {
      const warningSummary = `\u26A0\uFE0F Prompt needs ${promptTokens.toLocaleString()} tokens but model max is ${contextLength.toLocaleString()}.`;
      console.warn("[BigRAG]", warningSummary);
      ctl.createStatus({
        status: "error",
        text: `${warningSummary} Reduce retrieved passages or increase the model's context length.`
      });
      try {
        await ctl.client.system.notify({
          title: "Context window exceeded",
          description: `${warningSummary} Prompt may be truncated or rejected.`,
          noAutoDismiss: true
        });
      } catch (notifyError) {
        console.warn("[BigRAG] Unable to send context overflow notification:", notifyError);
      }
    }
  } catch (error) {
    console.warn("[BigRAG] Failed to evaluate context usage:", error);
  }
}
async function preprocess(ctl, userMessage) {
  const userPrompt = userMessage.getText();
  const pluginConfig = ctl.getPluginConfig(configSchematics);
  const documentsDir = pluginConfig.get("documentsDirectory");
  const vectorStoreDir = pluginConfig.get("vectorStoreDirectory");
  const retrievalLimit = pluginConfig.get("retrievalLimit");
  const retrievalThreshold = pluginConfig.get("retrievalAffinityThreshold");
  const chunkSize = pluginConfig.get("chunkSize");
  const chunkOverlap = pluginConfig.get("chunkOverlap");
  const maxConcurrent = pluginConfig.get("maxConcurrentFiles");
  const enableOCR = pluginConfig.get("enableOCR");
  const skipPreviouslyIndexed = pluginConfig.get("manualReindex.skipPreviouslyIndexed");
  const parseDelayMs = pluginConfig.get("parseDelayMs") ?? 0;
  const reindexRequested = pluginConfig.get("manualReindex.trigger");
  const resolvedEmbeddingModelId = resolveEmbeddingModelId(pluginConfig.get("embeddingModel"));
  const excludePatterns = parseExcludePatternsBlock(pluginConfig.get("excludeFilenamePatterns") ?? "");
  if (!documentsDir || documentsDir === "") {
    console.warn("[BigRAG] Documents directory not configured. Please set it in plugin settings.");
    return userMessage;
  }
  if (!vectorStoreDir || vectorStoreDir === "") {
    console.warn("[BigRAG] Vector store directory not configured. Please set it in plugin settings.");
    return userMessage;
  }
  try {
    if (!sanityChecksPassed) {
      const checkStatus = ctl.createStatus({
        status: "loading",
        text: "Performing sanity checks..."
      });
      const sanityResult = await performSanityChecks(documentsDir, vectorStoreDir);
      for (const warning of sanityResult.warnings) {
        console.warn("[BigRAG]", warning);
      }
      if (!sanityResult.passed) {
        for (const error of sanityResult.errors) {
          console.error("[BigRAG]", error);
        }
        const failureReason = sanityResult.errors[0] ?? sanityResult.warnings[0] ?? "Unknown reason. Please review plugin settings.";
        checkStatus.setState({
          status: "canceled",
          text: `Sanity checks failed: ${failureReason}`
        });
        return userMessage;
      }
      checkStatus.setState({
        status: "done",
        text: "Sanity checks passed"
      });
      sanityChecksPassed = true;
    }
    checkAbort(ctl.abortSignal);
    if (!vectorStore || lastIndexedDir !== vectorStoreDir) {
      const status = ctl.createStatus({
        status: "loading",
        text: "Initializing vector store..."
      });
      vectorStore = new VectorStore(vectorStoreDir);
      await vectorStore.initialize();
      const statsAfterInit = await vectorStore.getStats();
      if (statsAfterInit.totalChunks === 0) {
        await deleteEmbeddingIndexManifest(vectorStoreDir);
      }
      console.info(
        `[BigRAG] Vector store ready (path=${vectorStoreDir}). Waiting for queries...`
      );
      lastIndexedDir = vectorStoreDir;
      status.setState({
        status: "done",
        text: "Vector store initialized"
      });
    }
    checkAbort(ctl.abortSignal);
    await maybeHandleConfigTriggeredReindex({
      ctl,
      documentsDir,
      vectorStoreDir,
      embeddingModelId: resolvedEmbeddingModelId,
      chunkSize,
      chunkOverlap,
      maxConcurrent,
      enableOCR,
      parseDelayMs,
      reindexRequested,
      excludePatterns,
      skipPreviouslyIndexed: pluginConfig.get("manualReindex.skipPreviouslyIndexed")
    });
    checkAbort(ctl.abortSignal);
    const stats = await vectorStore.getStats();
    console.debug(`[BigRAG] Vector store stats before auto-index check: totalChunks=${stats.totalChunks}, uniqueFiles=${stats.uniqueFiles}`);
    if (stats.totalChunks === 0) {
      if (!tryStartIndexing("auto-trigger")) {
        console.warn("[BigRAG] Indexing already running, skipping automatic indexing.");
      } else {
        const indexStatus = ctl.createStatus({
          status: "loading",
          text: `Starting initial indexing\u2026 (embedding model: ${resolvedEmbeddingModelId})`
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
            autoReindex: false,
            parseDelayMs,
            excludePatterns,
            vectorStore,
            forceReindex: true,
            onProgress: (progress) => {
              if (progress.status === "scanning") {
                indexStatus.setState({
                  status: "loading",
                  text: `Scanning: ${progress.currentFile} (embedding model: ${resolvedEmbeddingModelId})`
                });
              } else if (progress.status === "indexing") {
                const success = progress.successfulFiles ?? 0;
                const failed = progress.failedFiles ?? 0;
                const skipped = progress.skippedFiles ?? 0;
                indexStatus.setState({
                  status: "loading",
                  text: `Indexing: ${progress.processedFiles}/${progress.totalFiles} files (success=${success}, failed=${failed}, skipped=${skipped}) (embedding model: ${resolvedEmbeddingModelId}) (${progress.currentFile})`
                });
              } else if (progress.status === "complete") {
                indexStatus.setState({
                  status: "done",
                  text: `Indexing complete: ${progress.processedFiles} files processed (embedding model: ${resolvedEmbeddingModelId})`
                });
              } else if (progress.status === "error") {
                indexStatus.setState({
                  status: "canceled",
                  text: `Indexing error: ${progress.error}`
                });
              }
            }
          });
          console.log(`[BigRAG] Indexing complete: ${indexingResult.successfulFiles}/${indexingResult.totalFiles} files successfully indexed (${indexingResult.failedFiles} failed)`);
        } catch (error) {
          indexStatus.setState({
            status: "canceled",
            text: `Indexing failed: ${error instanceof Error ? error.message : String(error)}`
          });
          console.error("[BigRAG] Indexing failed:", error);
        } finally {
          finishIndexing();
        }
      }
    }
    checkAbort(ctl.abortSignal);
    const toggleStatusText = `Manual Reindex Trigger: ${reindexRequested ? "ON" : "OFF"} | Skip Previously Indexed: ${skipPreviouslyIndexed ? "ON" : "OFF"} | Embedding model: ${resolvedEmbeddingModelId}`;
    console.info(`[BigRAG] ${toggleStatusText}`);
    ctl.createStatus({
      status: "done",
      text: toggleStatusText
    });
    const retrievalStats = await vectorStore.getStats();
    if (retrievalStats.totalChunks === 0) {
      await deleteEmbeddingIndexManifest(vectorStoreDir);
      ctl.createStatus({
        status: "canceled",
        text: "No documents indexed yet"
      });
      const noteAboutEmptyIndex = `Important: The document index is empty (no chunks stored yet). In one short sentence, tell the user that nothing has been indexed. Then answer their question to the best of your ability without claiming document retrieval.`;
      return noteAboutEmptyIndex + `

User Query:

${userPrompt}`;
    }
    const retrievalStatus = ctl.createStatus({
      status: "loading",
      text: `Loading embedding model for retrieval: ${resolvedEmbeddingModelId}`
    });
    const embeddingModel = await ctl.client.embedding.model(resolvedEmbeddingModelId, {
      signal: ctl.abortSignal
    });
    checkAbort(ctl.abortSignal);
    const compatibility = await checkEmbeddingModelForRetrieval({
      vectorStoreDir,
      resolvedModelId: resolvedEmbeddingModelId,
      totalChunks: retrievalStats.totalChunks,
      embeddingModel
    });
    if (!compatibility.ok) {
      retrievalStatus.setState({
        status: "error",
        text: compatibility.userMessage
      });
      console.error("[BigRAG]", compatibility.logMessage);
      return compatibility.userMessage + `

User Query:

${userPrompt}`;
    }
    retrievalStatus.setState({
      status: "loading",
      text: "Searching for relevant content..."
    });
    const queryEmbeddingResult = await embeddingModel.embed(userPrompt);
    checkAbort(ctl.abortSignal);
    const queryEmbedding = queryEmbeddingResult.embedding;
    const queryPreview = userPrompt.length > 160 ? `${userPrompt.slice(0, 160)}...` : userPrompt;
    console.info(
      `[BigRAG] Executing vector search for "${queryPreview}" (limit=${retrievalLimit}, threshold=${retrievalThreshold})`
    );
    const results = await vectorStore.search(
      queryEmbedding,
      retrievalLimit,
      retrievalThreshold
    );
    checkAbort(ctl.abortSignal);
    if (results.length > 0) {
      const topHit = results[0];
      console.info(
        `[BigRAG] Vector search returned ${results.length} results. Top hit: file=${topHit.fileName} score=${topHit.score.toFixed(3)}`
      );
      const docSummaries = results.map(
        (result, idx) => `#${idx + 1} file=${path7.basename(result.filePath)} shard=${result.shardName} score=${result.score.toFixed(3)}`
      ).join("\n");
      console.info(`[BigRAG] Relevant documents:
${docSummaries}`);
    } else {
      console.warn("[BigRAG] Vector search returned 0 results.");
    }
    if (results.length === 0) {
      retrievalStatus.setState({
        status: "canceled",
        text: "No relevant content found in indexed documents"
      });
      const noteAboutNoResults = `Important: No relevant content was found in the indexed documents for the user query. In less than one sentence, inform the user of this. Then respond to the query to the best of your ability.`;
      return noteAboutNoResults + `

User Query:

${userPrompt}`;
    }
    retrievalStatus.setState({
      status: "done",
      text: `Retrieved ${results.length} relevant passages`
    });
    ctl.debug("Retrieval results:", results);
    let ragContextFull = "";
    let ragContextPreview = "";
    const prefix = "The following passages were found in your indexed documents:\n\n";
    ragContextFull += prefix;
    ragContextPreview += prefix;
    let citationNumber = 1;
    for (const result of results) {
      const fileName = path7.basename(result.filePath);
      const citationLabel = `Citation ${citationNumber} (from ${fileName}, score: ${result.score.toFixed(3)}): `;
      ragContextFull += `
${citationLabel}"${result.text}"

`;
      ragContextPreview += `
${citationLabel}"${summarizeText(result.text)}"

`;
      citationNumber++;
    }
    const promptTemplate = normalizePromptTemplate(pluginConfig.get("promptTemplate"));
    const finalPrompt = fillPromptTemplate(promptTemplate, {
      [RAG_CONTEXT_MACRO]: ragContextFull.trimEnd(),
      [USER_QUERY_MACRO]: userPrompt
    });
    const finalPromptPreview = fillPromptTemplate(promptTemplate, {
      [RAG_CONTEXT_MACRO]: ragContextPreview.trimEnd(),
      [USER_QUERY_MACRO]: userPrompt
    });
    ctl.debug("Processed content (preview):", finalPromptPreview);
    const passagesLogEntries = results.map((result, idx) => {
      const fileName = path7.basename(result.filePath);
      return `#${idx + 1} file=${fileName} shard=${result.shardName} score=${result.score.toFixed(3)}
${summarizeText(result.text)}`;
    });
    const passagesLog = passagesLogEntries.join("\n\n");
    console.info(`[BigRAG] RAG passages (${results.length}) preview:
${passagesLog}`);
    ctl.createStatus({
      status: "done",
      text: `RAG passages (${results.length}):`
    });
    for (const entry of passagesLogEntries) {
      ctl.createStatus({
        status: "done",
        text: entry
      });
    }
    console.info(`[BigRAG] Final prompt sent to model (preview):
${finalPromptPreview}`);
    ctl.createStatus({
      status: "done",
      text: `Final prompt sent to model (preview):
${finalPromptPreview}`
    });
    await warnIfContextOverflow(ctl, finalPrompt);
    return finalPrompt;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    console.error("[PromptPreprocessor] Preprocessing failed.", error);
    return userMessage;
  }
}
async function maybeHandleConfigTriggeredReindex({
  ctl,
  documentsDir,
  vectorStoreDir,
  embeddingModelId,
  chunkSize,
  chunkOverlap,
  maxConcurrent,
  enableOCR,
  parseDelayMs,
  reindexRequested,
  excludePatterns,
  skipPreviouslyIndexed
}) {
  if (!reindexRequested) {
    return;
  }
  const reminderText = `Manual Reindex Trigger is ON. Skip Previously Indexed Files is currently ${skipPreviouslyIndexed ? "ON" : "OFF"}. The index will be rebuilt each chat when 'Skip Previously Indexed Files' is OFF. If 'Skip Previously Indexed Files' is ON, the index will only be rebuilt for new or changed files. Embedding model for this run: ${embeddingModelId}.`;
  console.info(`[BigRAG] ${reminderText}`);
  ctl.createStatus({
    status: "done",
    text: reminderText
  });
  if (!tryStartIndexing("config-trigger")) {
    ctl.createStatus({
      status: "canceled",
      text: "Manual reindex already running. Please wait for it to finish."
    });
    return;
  }
  const status = ctl.createStatus({
    status: "loading",
    text: `Manual reindex requested from config\u2026 (embedding model: ${embeddingModelId})`
  });
  try {
    const { indexingResult } = await runIndexingJob({
      client: ctl.client,
      abortSignal: ctl.abortSignal,
      documentsDir,
      vectorStoreDir,
      embeddingModelId,
      chunkSize,
      chunkOverlap,
      maxConcurrent,
      enableOCR,
      autoReindex: skipPreviouslyIndexed,
      parseDelayMs,
      excludePatterns,
      forceReindex: !skipPreviouslyIndexed,
      vectorStore: vectorStore ?? void 0,
      onProgress: (progress) => {
        if (progress.status === "scanning") {
          status.setState({
            status: "loading",
            text: `Scanning: ${progress.currentFile} (embedding model: ${embeddingModelId})`
          });
        } else if (progress.status === "indexing") {
          const success = progress.successfulFiles ?? 0;
          const failed = progress.failedFiles ?? 0;
          const skipped = progress.skippedFiles ?? 0;
          status.setState({
            status: "loading",
            text: `Indexing: ${progress.processedFiles}/${progress.totalFiles} files (success=${success}, failed=${failed}, skipped=${skipped}) (embedding model: ${embeddingModelId}) (${progress.currentFile})`
          });
        } else if (progress.status === "complete") {
          status.setState({
            status: "done",
            text: `Indexing complete: ${progress.processedFiles} files processed (embedding model: ${embeddingModelId})`
          });
        } else if (progress.status === "error") {
          status.setState({
            status: "canceled",
            text: `Indexing error: ${progress.error}`
          });
        }
      }
    });
    status.setState({
      status: "done",
      text: `Manual reindex complete! (embedding model: ${embeddingModelId})`
    });
    const summaryLines = [
      `Embedding model: ${embeddingModelId}`,
      `Processed: ${indexingResult.successfulFiles}/${indexingResult.totalFiles}`,
      `Failed: ${indexingResult.failedFiles}`,
      `Skipped (unchanged): ${indexingResult.skippedFiles}`,
      `Updated existing files: ${indexingResult.updatedFiles}`,
      `New files added: ${indexingResult.newFiles}`
    ];
    for (const line of summaryLines) {
      ctl.createStatus({
        status: "done",
        text: line
      });
    }
    if (indexingResult.totalFiles > 0 && indexingResult.skippedFiles === indexingResult.totalFiles) {
      ctl.createStatus({
        status: "done",
        text: "All files were already up to date (skipped)."
      });
    }
    console.log(
      `[BigRAG] Manual reindex summary:
  ${summaryLines.join("\n  ")}`
    );
    await notifyManualResetNeeded(ctl, embeddingModelId);
  } catch (error) {
    status.setState({
      status: "error",
      text: `Manual reindex failed: ${error instanceof Error ? error.message : String(error)}`
    });
    console.error("[BigRAG] Manual reindex failed:", error);
  } finally {
    finishIndexing();
  }
}
async function notifyManualResetNeeded(ctl, embeddingModelId) {
  try {
    await ctl.client.system.notify({
      title: "Manual reindex completed",
      description: `Manual Reindex Trigger is ON. The index will be rebuilt each chat when 'Skip Previously Indexed Files' is OFF. If 'Skip Previously Indexed Files' is ON, the index will only be rebuilt for new or changed files. Last run used embedding model: ${embeddingModelId}.`
    });
  } catch (error) {
    console.warn("[BigRAG] Unable to send notification about manual reindex reset:", error);
  }
}
var path7, vectorStore, lastIndexedDir, sanityChecksPassed, RAG_CONTEXT_MACRO, USER_QUERY_MACRO;
var init_promptPreprocessor = __esm({
  "src/promptPreprocessor.ts"() {
    "use strict";
    init_config();
    init_vectorStore();
    init_sanityChecks();
    init_indexingLock();
    init_embeddingIndexManifest();
    path7 = __toESM(require("path"));
    init_runIndexing();
    init_fileExcludePatterns();
    vectorStore = null;
    lastIndexedDir = "";
    sanityChecksPassed = false;
    RAG_CONTEXT_MACRO = "{{rag_context}}";
    USER_QUERY_MACRO = "{{user_query}}";
  }
});

// src/index.ts
var src_exports = {};
__export(src_exports, {
  main: () => main
});
async function main(context) {
  context.withConfigSchematics(configSchematics);
  context.withPromptPreprocessor(preprocess);
  console.log("[BigRAG] Plugin initialized successfully");
}
var init_src = __esm({
  "src/index.ts"() {
    "use strict";
    init_config();
    init_promptPreprocessor();
  }
});

// .lmstudio/entry.ts
var import_sdk2 = require("@lmstudio/sdk");
var clientIdentifier = process.env.LMS_PLUGIN_CLIENT_IDENTIFIER;
var clientPasskey = process.env.LMS_PLUGIN_CLIENT_PASSKEY;
var baseUrl = process.env.LMS_PLUGIN_BASE_URL;
var client = new import_sdk2.LMStudioClient({
  clientIdentifier,
  clientPasskey,
  baseUrl
});
globalThis.__LMS_PLUGIN_CONTEXT = true;
var predictionLoopHandlerSet = false;
var promptPreprocessorSet = false;
var configSchematicsSet = false;
var globalConfigSchematicsSet = false;
var toolsProviderSet = false;
var generatorSet = false;
var selfRegistrationHost = client.plugins.getSelfRegistrationHost();
var pluginContext = {
  withPredictionLoopHandler: (generate) => {
    if (predictionLoopHandlerSet) {
      throw new Error("PredictionLoopHandler already registered");
    }
    if (toolsProviderSet) {
      throw new Error("PredictionLoopHandler cannot be used with a tools provider");
    }
    predictionLoopHandlerSet = true;
    selfRegistrationHost.setPredictionLoopHandler(generate);
    return pluginContext;
  },
  withPromptPreprocessor: (preprocess2) => {
    if (promptPreprocessorSet) {
      throw new Error("PromptPreprocessor already registered");
    }
    promptPreprocessorSet = true;
    selfRegistrationHost.setPromptPreprocessor(preprocess2);
    return pluginContext;
  },
  withConfigSchematics: (configSchematics2) => {
    if (configSchematicsSet) {
      throw new Error("Config schematics already registered");
    }
    configSchematicsSet = true;
    selfRegistrationHost.setConfigSchematics(configSchematics2);
    return pluginContext;
  },
  withGlobalConfigSchematics: (globalConfigSchematics) => {
    if (globalConfigSchematicsSet) {
      throw new Error("Global config schematics already registered");
    }
    globalConfigSchematicsSet = true;
    selfRegistrationHost.setGlobalConfigSchematics(globalConfigSchematics);
    return pluginContext;
  },
  withToolsProvider: (toolsProvider) => {
    if (toolsProviderSet) {
      throw new Error("Tools provider already registered");
    }
    if (predictionLoopHandlerSet) {
      throw new Error("Tools provider cannot be used with a predictionLoopHandler");
    }
    toolsProviderSet = true;
    selfRegistrationHost.setToolsProvider(toolsProvider);
    return pluginContext;
  },
  withGenerator: (generator) => {
    if (generatorSet) {
      throw new Error("Generator already registered");
    }
    generatorSet = true;
    selfRegistrationHost.setGenerator(generator);
    return pluginContext;
  }
};
Promise.resolve().then(() => (init_src(), src_exports)).then(async (module2) => {
  return await module2.main(pluginContext);
}).then(() => {
  selfRegistrationHost.initCompleted();
}).catch((error) => {
  console.error("Failed to execute the main function of the plugin.");
  console.error(error);
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2NvbmZpZy50cyIsICIuLi9zcmMvdmVjdG9yc3RvcmUvdmVjdG9yU3RvcmUudHMiLCAiLi4vc3JjL3V0aWxzL3Nhbml0eUNoZWNrcy50cyIsICIuLi9zcmMvdXRpbHMvaW5kZXhpbmdMb2NrLnRzIiwgIi4uL3NyYy91dGlscy9jb2VyY2VFbWJlZGRpbmcudHMiLCAiLi4vc3JjL3V0aWxzL2VtYmVkZGluZ0luZGV4TWFuaWZlc3QudHMiLCAiLi4vc3JjL3V0aWxzL3N1cHBvcnRlZEV4dGVuc2lvbnMudHMiLCAiLi4vc3JjL3V0aWxzL2ZpbGVFeGNsdWRlUGF0dGVybnMudHMiLCAiLi4vc3JjL2luZ2VzdGlvbi9maWxlU2Nhbm5lci50cyIsICIuLi9zcmMvcGFyc2Vycy9odG1sUGFyc2VyLnRzIiwgIi4uL3NyYy9wYXJzZXJzL3BkZlBhcnNlci50cyIsICIuLi9zcmMvcGFyc2Vycy9lcHViUGFyc2VyLnRzIiwgIi4uL3NyYy9wYXJzZXJzL2ltYWdlUGFyc2VyLnRzIiwgIi4uL3NyYy9wYXJzZXJzL3RleHRQYXJzZXIudHMiLCAiLi4vc3JjL3BhcnNlcnMvZG9jdW1lbnRQYXJzZXIudHMiLCAiLi4vc3JjL3V0aWxzL3RleHRDaHVua2VyLnRzIiwgIi4uL3NyYy91dGlscy9maWxlSGFzaC50cyIsICIuLi9zcmMvdXRpbHMvZmFpbGVkRmlsZVJlZ2lzdHJ5LnRzIiwgIi4uL3NyYy9pbmdlc3Rpb24vaW5kZXhNYW5hZ2VyLnRzIiwgIi4uL3NyYy9pbmdlc3Rpb24vcnVuSW5kZXhpbmcudHMiLCAiLi4vc3JjL3Byb21wdFByZXByb2Nlc3Nvci50cyIsICIuLi9zcmMvaW5kZXgudHMiLCAiZW50cnkudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IGNyZWF0ZUNvbmZpZ1NjaGVtYXRpY3MgfSBmcm9tIFwiQGxtc3R1ZGlvL3Nka1wiO1xyXG5cclxuLyoqIERlZmF1bHQgZW1iZWRkaW5nIG1vZGVsIGlkIChtdXN0IG1hdGNoIENMSSBkZWZhdWx0IHdoZW4gZW52IGlzIHVuc2V0KS4gKi9cclxuZXhwb3J0IGNvbnN0IERFRkFVTFRfRU1CRURESU5HX01PREVMX0lEID0gXCJub21pYy1haS9ub21pYy1lbWJlZC10ZXh0LXYxLjUtR0dVRlwiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVFbWJlZGRpbmdNb2RlbElkKHJhdzogc3RyaW5nIHwgdW5kZWZpbmVkIHwgbnVsbCk6IHN0cmluZyB7XHJcbiAgY29uc3QgdCA9IHR5cGVvZiByYXcgPT09IFwic3RyaW5nXCIgPyByYXcudHJpbSgpIDogXCJcIjtcclxuICByZXR1cm4gdC5sZW5ndGggPiAwID8gdCA6IERFRkFVTFRfRU1CRURESU5HX01PREVMX0lEO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgREVGQVVMVF9QUk9NUFRfVEVNUExBVEUgPSBge3tyYWdfY29udGV4dH19XHJcblxyXG5Vc2UgdGhlIGNpdGF0aW9ucyBhYm92ZSB0byByZXNwb25kIHRvIHRoZSB1c2VyIHF1ZXJ5LCBvbmx5IGlmIHRoZXkgYXJlIHJlbGV2YW50LiBPdGhlcndpc2UsIHJlc3BvbmQgdG8gdGhlIGJlc3Qgb2YgeW91ciBhYmlsaXR5IHdpdGhvdXQgdGhlbS5cclxuXHJcblVzZXIgUXVlcnk6XHJcblxyXG57e3VzZXJfcXVlcnl9fWA7XHJcblxyXG5leHBvcnQgY29uc3QgY29uZmlnU2NoZW1hdGljcyA9IGNyZWF0ZUNvbmZpZ1NjaGVtYXRpY3MoKVxyXG4gIC5maWVsZChcclxuICAgIFwiZG9jdW1lbnRzRGlyZWN0b3J5XCIsXHJcbiAgICBcInN0cmluZ1wiLFxyXG4gICAge1xyXG4gICAgICBkaXNwbGF5TmFtZTogXCJEb2N1bWVudHMgRGlyZWN0b3J5XCIsXHJcbiAgICAgIHN1YnRpdGxlOiBcIlJvb3QgZGlyZWN0b3J5IGNvbnRhaW5pbmcgZG9jdW1lbnRzIHRvIGluZGV4LiBBbGwgc3ViZGlyZWN0b3JpZXMgd2lsbCBiZSBzY2FubmVkLlwiLFxyXG4gICAgICBwbGFjZWhvbGRlcjogXCIvcGF0aC90by9kb2N1bWVudHNcIixcclxuICAgIH0sXHJcbiAgICBcIlwiLFxyXG4gIClcclxuICAuZmllbGQoXHJcbiAgICBcInZlY3RvclN0b3JlRGlyZWN0b3J5XCIsXHJcbiAgICBcInN0cmluZ1wiLFxyXG4gICAge1xyXG4gICAgICBkaXNwbGF5TmFtZTogXCJWZWN0b3IgU3RvcmUgRGlyZWN0b3J5XCIsXHJcbiAgICAgIHN1YnRpdGxlOiBcIkRpcmVjdG9yeSB3aGVyZSB0aGUgdmVjdG9yIGRhdGFiYXNlIHdpbGwgYmUgc3RvcmVkLlwiLFxyXG4gICAgICBwbGFjZWhvbGRlcjogXCIvcGF0aC90by92ZWN0b3Ivc3RvcmVcIixcclxuICAgIH0sXHJcbiAgICBcIlwiLFxyXG4gIClcclxuICAuZmllbGQoXHJcbiAgICBcImVtYmVkZGluZ01vZGVsXCIsXHJcbiAgICBcInN0cmluZ1wiLFxyXG4gICAge1xyXG4gICAgICBkaXNwbGF5TmFtZTogXCJFbWJlZGRpbmcgTW9kZWxcIixcclxuICAgICAgc3VidGl0bGU6XHJcbiAgICAgICAgXCJMTSBTdHVkaW8gYWNjZXB0cyBtb3JlIHRoYW4gb25lIHNwZWxsaW5nIGZvciB0aGUgc2FtZSBtb2RlbFx1MjAxNGZvciBleGFtcGxlIG1peGVkYnJlYWQtYWkvbXhiYWktZW1iZWQtbGFyZ2UtdjEgKEh1YiAvIGRvd25sb2FkKSBvciB0ZXh0LWVtYmVkZGluZy1teGJhaS1lbWJlZC1sYXJnZS12MSAoYXMgaW4gbG1zIGxzKS4gQm90aCBhcmUgdmFsaWQ7IHVzZSBvbmUgdmFsdWUgY29uc2lzdGVudGx5IGZvciBpbmRleGluZyBhbmQgY2hhdCBzbyBpdCBtYXRjaGVzIC5iaWctcmFnLWVtYmVkZGluZy5qc29uLiBSZWluZGV4IGFmdGVyIGNoYW5naW5nLlwiLFxyXG4gICAgICBwbGFjZWhvbGRlcjogREVGQVVMVF9FTUJFRERJTkdfTU9ERUxfSUQsXHJcbiAgICB9LFxyXG4gICAgREVGQVVMVF9FTUJFRERJTkdfTU9ERUxfSUQsXHJcbiAgKVxyXG4gIC5maWVsZChcclxuICAgIFwicmV0cmlldmFsTGltaXRcIixcclxuICAgIFwibnVtZXJpY1wiLFxyXG4gICAge1xyXG4gICAgICBpbnQ6IHRydWUsXHJcbiAgICAgIG1pbjogMSxcclxuICAgICAgbWF4OiAyMCxcclxuICAgICAgZGlzcGxheU5hbWU6IFwiUmV0cmlldmFsIExpbWl0XCIsXHJcbiAgICAgIHN1YnRpdGxlOiBcIk1heGltdW0gbnVtYmVyIG9mIGNodW5rcyB0byByZXR1cm4gZHVyaW5nIHJldHJpZXZhbC5cIixcclxuICAgICAgc2xpZGVyOiB7IG1pbjogMSwgbWF4OiAyMCwgc3RlcDogMSB9LFxyXG4gICAgfSxcclxuICAgIDUsXHJcbiAgKVxyXG4gIC5maWVsZChcclxuICAgIFwicmV0cmlldmFsQWZmaW5pdHlUaHJlc2hvbGRcIixcclxuICAgIFwibnVtZXJpY1wiLFxyXG4gICAge1xyXG4gICAgICBtaW46IDAuMCxcclxuICAgICAgbWF4OiAxLjAsXHJcbiAgICAgIGRpc3BsYXlOYW1lOiBcIlJldHJpZXZhbCBBZmZpbml0eSBUaHJlc2hvbGRcIixcclxuICAgICAgc3VidGl0bGU6IFwiTWluaW11bSBzaW1pbGFyaXR5IHNjb3JlIGZvciBhIGNodW5rIHRvIGJlIGNvbnNpZGVyZWQgcmVsZXZhbnQuXCIsXHJcbiAgICAgIHNsaWRlcjogeyBtaW46IDAuMCwgbWF4OiAxLjAsIHN0ZXA6IDAuMDEgfSxcclxuICAgIH0sXHJcbiAgICAwLjUsXHJcbiAgKVxyXG4gIC5maWVsZChcclxuICAgIFwiY2h1bmtTaXplXCIsXHJcbiAgICBcIm51bWVyaWNcIixcclxuICAgIHtcclxuICAgICAgaW50OiB0cnVlLFxyXG4gICAgICBtaW46IDEyOCxcclxuICAgICAgbWF4OiAyMDQ4LFxyXG4gICAgICBkaXNwbGF5TmFtZTogXCJDaHVuayBTaXplXCIsXHJcbiAgICAgIHN1YnRpdGxlOiBcIlNpemUgb2YgdGV4dCBjaHVua3MgZm9yIGVtYmVkZGluZyAoaW4gdG9rZW5zKS5cIixcclxuICAgICAgc2xpZGVyOiB7IG1pbjogMTI4LCBtYXg6IDIwNDgsIHN0ZXA6IDEyOCB9LFxyXG4gICAgfSxcclxuICAgIDUxMixcclxuICApXHJcbiAgLmZpZWxkKFxyXG4gICAgXCJjaHVua092ZXJsYXBcIixcclxuICAgIFwibnVtZXJpY1wiLFxyXG4gICAge1xyXG4gICAgICBpbnQ6IHRydWUsXHJcbiAgICAgIG1pbjogMCxcclxuICAgICAgbWF4OiA1MTIsXHJcbiAgICAgIGRpc3BsYXlOYW1lOiBcIkNodW5rIE92ZXJsYXBcIixcclxuICAgICAgc3VidGl0bGU6IFwiT3ZlcmxhcCBiZXR3ZWVuIGNvbnNlY3V0aXZlIGNodW5rcyAoaW4gdG9rZW5zKS5cIixcclxuICAgICAgc2xpZGVyOiB7IG1pbjogMCwgbWF4OiA1MTIsIHN0ZXA6IDMyIH0sXHJcbiAgICB9LFxyXG4gICAgMTAwLFxyXG4gIClcclxuICAuZmllbGQoXHJcbiAgICBcIm1heENvbmN1cnJlbnRGaWxlc1wiLFxyXG4gICAgXCJudW1lcmljXCIsXHJcbiAgICB7XHJcbiAgICAgIGludDogdHJ1ZSxcclxuICAgICAgbWluOiAxLFxyXG4gICAgICBtYXg6IDEwLFxyXG4gICAgICBkaXNwbGF5TmFtZTogXCJNYXggQ29uY3VycmVudCBGaWxlc1wiLFxyXG4gICAgICBzdWJ0aXRsZTogXCJNYXhpbXVtIG51bWJlciBvZiBmaWxlcyB0byBwcm9jZXNzIGNvbmN1cnJlbnRseSBkdXJpbmcgaW5kZXhpbmcuIFJlY29tbWVuZCAxIGZvciBsYXJnZSBQREYgZGF0YXNldHMuXCIsXHJcbiAgICAgIHNsaWRlcjogeyBtaW46IDEsIG1heDogMTAsIHN0ZXA6IDEgfSxcclxuICAgIH0sXHJcbiAgICAxLFxyXG4gIClcclxuICAuZmllbGQoXHJcbiAgICBcInBhcnNlRGVsYXlNc1wiLFxyXG4gICAgXCJudW1lcmljXCIsXHJcbiAgICB7XHJcbiAgICAgIGludDogdHJ1ZSxcclxuICAgICAgbWluOiAwLFxyXG4gICAgICBtYXg6IDUwMDAsXHJcbiAgICAgIGRpc3BsYXlOYW1lOiBcIlBhcnNlciBEZWxheSAobXMpXCIsXHJcbiAgICAgIHN1YnRpdGxlOiBcIldhaXQgdGltZSBiZWZvcmUgcGFyc2luZyBlYWNoIGRvY3VtZW50IChoZWxwcyBhdm9pZCBXZWJTb2NrZXQgdGhyb3R0bGluZykuXCIsXHJcbiAgICAgIHNsaWRlcjogeyBtaW46IDAsIG1heDogNTAwMCwgc3RlcDogMTAwIH0sXHJcbiAgICB9LFxyXG4gICAgNTAwLFxyXG4gIClcclxuICAuZmllbGQoXHJcbiAgICBcImVuYWJsZU9DUlwiLFxyXG4gICAgXCJib29sZWFuXCIsXHJcbiAgICB7XHJcbiAgICAgIGRpc3BsYXlOYW1lOiBcIkVuYWJsZSBPQ1JcIixcclxuICAgICAgc3VidGl0bGU6IFwiRW5hYmxlIE9DUiBmb3IgaW1hZ2UgZmlsZXMgYW5kIGltYWdlLWJhc2VkIFBERnMgdXNpbmcgTE0gU3R1ZGlvJ3MgYnVpbHQtaW4gZG9jdW1lbnQgcGFyc2VyLlwiLFxyXG4gICAgfSxcclxuICAgIHRydWUsXHJcbiAgKVxyXG4gIC5maWVsZChcclxuICAgIFwiZXhjbHVkZUZpbGVuYW1lUGF0dGVybnNcIixcclxuICAgIFwic3RyaW5nXCIsXHJcbiAgICB7XHJcbiAgICAgIGRpc3BsYXlOYW1lOiBcIkV4Y2x1ZGUgZmlsZW5hbWUgcGF0dGVybnNcIixcclxuICAgICAgc3VidGl0bGU6XHJcbiAgICAgICAgXCJPcHRpb25hbC4gT25lIGdsb2IgcGVyIGxpbmUsIG1hdGNoZWQgYWdhaW5zdCBlYWNoIGZpbGUgcGF0aCByZWxhdGl2ZSB0byBEb2N1bWVudHMgRGlyZWN0b3J5ICh1c2UgLykuIExpbmVzIHN0YXJ0aW5nIHdpdGggIyBhcmUgY29tbWVudHMuIEV4YW1wbGU6ICoucG5nIGV4Y2x1ZGVzIFBOR3MgaW4gYW55IGZvbGRlcjsgYXJjaGl2ZS8qKiBleGNsdWRlcyB0aGF0IHN1YnRyZWUuIERvZXMgbm90IHJlbW92ZSBjaHVua3MgYWxyZWFkeSBpbiB0aGUgdmVjdG9yIHN0b3JlXHUyMDE0Y2xlYXIgb3IgcmVpbmRleCB0byBkcm9wIG9sZCBkYXRhLlwiLFxyXG4gICAgICBwbGFjZWhvbGRlcjogXCIqLnBuZ1xcbiMgKi5qcGdcIixcclxuICAgICAgaXNQYXJhZ3JhcGg6IHRydWUsXHJcbiAgICB9LFxyXG4gICAgXCJcIixcclxuICApXHJcbiAgLmZpZWxkKFxyXG4gICAgXCJtYW51YWxSZWluZGV4LnRyaWdnZXJcIixcclxuICAgIFwiYm9vbGVhblwiLFxyXG4gICAge1xyXG4gICAgICBkaXNwbGF5TmFtZTogXCJNYW51YWwgUmVpbmRleCBUcmlnZ2VyXCIsXHJcbiAgICAgIHN1YnRpdGxlOlxyXG4gICAgICAgIFwiVG9nZ2xlIE9OIHRvIHJlcXVlc3QgYW4gaW1tZWRpYXRlIHJlaW5kZXguIFRoZSBwbHVnaW4gcmVzZXRzIHRoaXMgYWZ0ZXIgcnVubmluZy4gVXNlIHRoZSBcdTIwMUNTa2lwIFByZXZpb3VzbHkgSW5kZXhlZCBGaWxlc1x1MjAxRCBvcHRpb24gYmVsb3cgdG8gY29udHJvbCB3aGV0aGVyIHVuY2hhbmdlZCBmaWxlcyBhcmUgc2tpcHBlZC5cIixcclxuICAgIH0sXHJcbiAgICBmYWxzZSxcclxuICApXHJcbiAgLmZpZWxkKFxyXG4gICAgXCJtYW51YWxSZWluZGV4LnNraXBQcmV2aW91c2x5SW5kZXhlZFwiLFxyXG4gICAgXCJib29sZWFuXCIsXHJcbiAgICB7XHJcbiAgICAgIGRpc3BsYXlOYW1lOiBcIlNraXAgUHJldmlvdXNseSBJbmRleGVkIEZpbGVzXCIsXHJcbiAgICAgIHN1YnRpdGxlOiBcIlNraXAgdW5jaGFuZ2VkIGZpbGVzIGZvciBmYXN0ZXIgbWFudWFsIHJ1bnMuIE9ubHkgaW5kZXhlcyBuZXcgZmlsZXMgb3IgY2hhbmdlZCBmaWxlcy5cIixcclxuICAgICAgZGVwZW5kZW5jaWVzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAga2V5OiBcIm1hbnVhbFJlaW5kZXgudHJpZ2dlclwiLFxyXG4gICAgICAgICAgY29uZGl0aW9uOiB7IHR5cGU6IFwiZXF1YWxzXCIsIHZhbHVlOiB0cnVlIH0sXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgIH0sXHJcbiAgICB0cnVlLFxyXG4gIClcclxuICAuZmllbGQoXHJcbiAgICBcInByb21wdFRlbXBsYXRlXCIsXHJcbiAgICBcInN0cmluZ1wiLFxyXG4gICAge1xyXG4gICAgICBkaXNwbGF5TmFtZTogXCJQcm9tcHQgVGVtcGxhdGVcIixcclxuICAgICAgc3VidGl0bGU6XHJcbiAgICAgICAgXCJTdXBwb3J0cyB7e3JhZ19jb250ZXh0fX0gKHJlcXVpcmVkKSBhbmQge3t1c2VyX3F1ZXJ5fX0gbWFjcm9zIGZvciBjdXN0b21pemluZyB0aGUgZmluYWwgcHJvbXB0LlwiLFxyXG4gICAgICBwbGFjZWhvbGRlcjogREVGQVVMVF9QUk9NUFRfVEVNUExBVEUsXHJcbiAgICAgIGlzUGFyYWdyYXBoOiB0cnVlLFxyXG4gICAgfSxcclxuICAgIERFRkFVTFRfUFJPTVBUX1RFTVBMQVRFLFxyXG4gIClcclxuICAuYnVpbGQoKTtcclxuXHJcbiIsICJpbXBvcnQgKiBhcyBmcyBmcm9tIFwiZnMvcHJvbWlzZXNcIjtcclxuaW1wb3J0ICogYXMgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5pbXBvcnQgeyBMb2NhbEluZGV4IH0gZnJvbSBcInZlY3RyYVwiO1xyXG5cclxuY29uc3QgTUFYX0lURU1TX1BFUl9TSEFSRCA9IDEwMDAwO1xyXG5jb25zdCBTSEFSRF9ESVJfUFJFRklYID0gXCJzaGFyZF9cIjtcclxuY29uc3QgU0hBUkRfRElSX1JFR0VYID0gL15zaGFyZF8oXFxkKykkLztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRG9jdW1lbnRDaHVuayB7XHJcbiAgaWQ6IHN0cmluZztcclxuICB0ZXh0OiBzdHJpbmc7XHJcbiAgdmVjdG9yOiBudW1iZXJbXTtcclxuICBmaWxlUGF0aDogc3RyaW5nO1xyXG4gIGZpbGVOYW1lOiBzdHJpbmc7XHJcbiAgZmlsZUhhc2g6IHN0cmluZztcclxuICBjaHVua0luZGV4OiBudW1iZXI7XHJcbiAgbWV0YWRhdGE6IFJlY29yZDxzdHJpbmcsIGFueT47XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgU2VhcmNoUmVzdWx0IHtcclxuICB0ZXh0OiBzdHJpbmc7XHJcbiAgc2NvcmU6IG51bWJlcjtcclxuICBmaWxlUGF0aDogc3RyaW5nO1xyXG4gIGZpbGVOYW1lOiBzdHJpbmc7XHJcbiAgY2h1bmtJbmRleDogbnVtYmVyO1xyXG4gIHNoYXJkTmFtZTogc3RyaW5nO1xyXG4gIG1ldGFkYXRhOiBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xyXG59XHJcblxyXG50eXBlIENodW5rTWV0YWRhdGEgPSB7XHJcbiAgdGV4dDogc3RyaW5nO1xyXG4gIGZpbGVQYXRoOiBzdHJpbmc7XHJcbiAgZmlsZU5hbWU6IHN0cmluZztcclxuICBmaWxlSGFzaDogc3RyaW5nO1xyXG4gIGNodW5rSW5kZXg6IG51bWJlcjtcclxuICBba2V5OiBzdHJpbmddOiBhbnk7XHJcbn07XHJcblxyXG5leHBvcnQgY2xhc3MgVmVjdG9yU3RvcmUge1xyXG4gIHByaXZhdGUgZGJQYXRoOiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSBzaGFyZERpcnM6IHN0cmluZ1tdID0gW107XHJcbiAgcHJpdmF0ZSBhY3RpdmVTaGFyZDogTG9jYWxJbmRleCB8IG51bGwgPSBudWxsO1xyXG4gIHByaXZhdGUgYWN0aXZlU2hhcmRDb3VudDogbnVtYmVyID0gMDtcclxuICBwcml2YXRlIHVwZGF0ZU11dGV4OiBQcm9taXNlPHZvaWQ+ID0gUHJvbWlzZS5yZXNvbHZlKCk7XHJcblxyXG4gIGNvbnN0cnVjdG9yKGRiUGF0aDogc3RyaW5nKSB7XHJcbiAgICB0aGlzLmRiUGF0aCA9IHBhdGgucmVzb2x2ZShkYlBhdGgpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogT3BlbiBhIHNoYXJkIGJ5IGRpcmVjdG9yeSBuYW1lIChlLmcuIFwic2hhcmRfMDAwXCIpLiBDYWxsZXIgbXVzdCBub3QgaG9sZCB0aGUgcmVmZXJlbmNlXHJcbiAgICogYWZ0ZXIgdXNlIHNvIEdDIGNhbiBmcmVlIHRoZSBwYXJzZWQgaW5kZXggZGF0YS5cclxuICAgKi9cclxuICBwcml2YXRlIG9wZW5TaGFyZChkaXI6IHN0cmluZyk6IExvY2FsSW5kZXgge1xyXG4gICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLmpvaW4odGhpcy5kYlBhdGgsIGRpcik7XHJcbiAgICByZXR1cm4gbmV3IExvY2FsSW5kZXgoZnVsbFBhdGgpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2NhbiBkYlBhdGggZm9yIHNoYXJkX05OTiBkaXJlY3RvcmllcyBhbmQgcmV0dXJuIHNvcnRlZCBsaXN0LlxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgZGlzY292ZXJTaGFyZERpcnMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xyXG4gICAgY29uc3QgZW50cmllcyA9IGF3YWl0IGZzLnJlYWRkaXIodGhpcy5kYlBhdGgsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KTtcclxuICAgIGNvbnN0IGRpcnM6IHN0cmluZ1tdID0gW107XHJcbiAgICBmb3IgKGNvbnN0IGUgb2YgZW50cmllcykge1xyXG4gICAgICBpZiAoZS5pc0RpcmVjdG9yeSgpICYmIFNIQVJEX0RJUl9SRUdFWC50ZXN0KGUubmFtZSkpIHtcclxuICAgICAgICBkaXJzLnB1c2goZS5uYW1lKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgZGlycy5zb3J0KChhLCBiKSA9PiB7XHJcbiAgICAgIGNvbnN0IG4gPSAobTogc3RyaW5nKSA9PiBwYXJzZUludChtLm1hdGNoKFNIQVJEX0RJUl9SRUdFWCkhWzFdLCAxMCk7XHJcbiAgICAgIHJldHVybiBuKGEpIC0gbihiKTtcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIGRpcnM7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplIHRoZSB2ZWN0b3Igc3RvcmU6IGRpc2NvdmVyIG9yIGNyZWF0ZSBzaGFyZHMsIG9wZW4gdGhlIGxhc3QgYXMgYWN0aXZlLlxyXG4gICAqL1xyXG4gIGFzeW5jIGluaXRpYWxpemUoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCBmcy5ta2Rpcih0aGlzLmRiUGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XHJcbiAgICB0aGlzLnNoYXJkRGlycyA9IGF3YWl0IHRoaXMuZGlzY292ZXJTaGFyZERpcnMoKTtcclxuXHJcbiAgICBpZiAodGhpcy5zaGFyZERpcnMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIGNvbnN0IGZpcnN0RGlyID0gYCR7U0hBUkRfRElSX1BSRUZJWH0wMDBgO1xyXG4gICAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGguam9pbih0aGlzLmRiUGF0aCwgZmlyc3REaXIpO1xyXG4gICAgICBjb25zdCBpbmRleCA9IG5ldyBMb2NhbEluZGV4KGZ1bGxQYXRoKTtcclxuICAgICAgYXdhaXQgaW5kZXguY3JlYXRlSW5kZXgoeyB2ZXJzaW9uOiAxIH0pO1xyXG4gICAgICB0aGlzLnNoYXJkRGlycyA9IFtmaXJzdERpcl07XHJcbiAgICAgIHRoaXMuYWN0aXZlU2hhcmQgPSBpbmRleDtcclxuICAgICAgdGhpcy5hY3RpdmVTaGFyZENvdW50ID0gMDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNvbnN0IGxhc3REaXIgPSB0aGlzLnNoYXJkRGlyc1t0aGlzLnNoYXJkRGlycy5sZW5ndGggLSAxXTtcclxuICAgICAgdGhpcy5hY3RpdmVTaGFyZCA9IHRoaXMub3BlblNoYXJkKGxhc3REaXIpO1xyXG4gICAgICBjb25zdCBpdGVtcyA9IGF3YWl0IHRoaXMuYWN0aXZlU2hhcmQubGlzdEl0ZW1zKCk7XHJcbiAgICAgIHRoaXMuYWN0aXZlU2hhcmRDb3VudCA9IGl0ZW1zLmxlbmd0aDtcclxuICAgIH1cclxuICAgIGNvbnNvbGUubG9nKFwiVmVjdG9yIHN0b3JlIGluaXRpYWxpemVkIHN1Y2Nlc3NmdWxseVwiKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEFkZCBkb2N1bWVudCBjaHVua3MgdG8gdGhlIGFjdGl2ZSBzaGFyZC4gUm90YXRlcyB0byBhIG5ldyBzaGFyZCB3aGVuIGZ1bGwuXHJcbiAgICovXHJcbiAgYXN5bmMgYWRkQ2h1bmtzKGNodW5rczogRG9jdW1lbnRDaHVua1tdKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZiAoIXRoaXMuYWN0aXZlU2hhcmQpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVmVjdG9yIHN0b3JlIG5vdCBpbml0aWFsaXplZFwiKTtcclxuICAgIH1cclxuICAgIGlmIChjaHVua3MubGVuZ3RoID09PSAwKSByZXR1cm47XHJcblxyXG4gICAgdGhpcy51cGRhdGVNdXRleCA9IHRoaXMudXBkYXRlTXV0ZXgudGhlbihhc3luYyAoKSA9PiB7XHJcbiAgICAgIGF3YWl0IHRoaXMuYWN0aXZlU2hhcmQhLmJlZ2luVXBkYXRlKCk7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgZm9yIChjb25zdCBjaHVuayBvZiBjaHVua3MpIHtcclxuICAgICAgICAgIGNvbnN0IG1ldGFkYXRhOiBDaHVua01ldGFkYXRhID0ge1xyXG4gICAgICAgICAgICB0ZXh0OiBjaHVuay50ZXh0LFxyXG4gICAgICAgICAgICBmaWxlUGF0aDogY2h1bmsuZmlsZVBhdGgsXHJcbiAgICAgICAgICAgIGZpbGVOYW1lOiBjaHVuay5maWxlTmFtZSxcclxuICAgICAgICAgICAgZmlsZUhhc2g6IGNodW5rLmZpbGVIYXNoLFxyXG4gICAgICAgICAgICBjaHVua0luZGV4OiBjaHVuay5jaHVua0luZGV4LFxyXG4gICAgICAgICAgICAuLi5jaHVuay5tZXRhZGF0YSxcclxuICAgICAgICAgIH07XHJcbiAgICAgICAgICBhd2FpdCB0aGlzLmFjdGl2ZVNoYXJkIS51cHNlcnRJdGVtKHtcclxuICAgICAgICAgICAgaWQ6IGNodW5rLmlkLFxyXG4gICAgICAgICAgICB2ZWN0b3I6IGNodW5rLnZlY3RvcixcclxuICAgICAgICAgICAgbWV0YWRhdGEsXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYXdhaXQgdGhpcy5hY3RpdmVTaGFyZCEuZW5kVXBkYXRlKCk7XHJcbiAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICB0aGlzLmFjdGl2ZVNoYXJkIS5jYW5jZWxVcGRhdGUoKTtcclxuICAgICAgICB0aHJvdyBlO1xyXG4gICAgICB9XHJcbiAgICAgIHRoaXMuYWN0aXZlU2hhcmRDb3VudCArPSBjaHVua3MubGVuZ3RoO1xyXG4gICAgICBjb25zb2xlLmxvZyhgQWRkZWQgJHtjaHVua3MubGVuZ3RofSBjaHVua3MgdG8gdmVjdG9yIHN0b3JlYCk7XHJcblxyXG4gICAgICBpZiAodGhpcy5hY3RpdmVTaGFyZENvdW50ID49IE1BWF9JVEVNU19QRVJfU0hBUkQpIHtcclxuICAgICAgICBjb25zdCBuZXh0TnVtID0gdGhpcy5zaGFyZERpcnMubGVuZ3RoO1xyXG4gICAgICAgIGNvbnN0IG5leHREaXIgPSBgJHtTSEFSRF9ESVJfUFJFRklYfSR7U3RyaW5nKG5leHROdW0pLnBhZFN0YXJ0KDMsIFwiMFwiKX1gO1xyXG4gICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5qb2luKHRoaXMuZGJQYXRoLCBuZXh0RGlyKTtcclxuICAgICAgICBjb25zdCBuZXdJbmRleCA9IG5ldyBMb2NhbEluZGV4KGZ1bGxQYXRoKTtcclxuICAgICAgICBhd2FpdCBuZXdJbmRleC5jcmVhdGVJbmRleCh7IHZlcnNpb246IDEgfSk7XHJcbiAgICAgICAgdGhpcy5zaGFyZERpcnMucHVzaChuZXh0RGlyKTtcclxuICAgICAgICB0aGlzLmFjdGl2ZVNoYXJkID0gbmV3SW5kZXg7XHJcbiAgICAgICAgdGhpcy5hY3RpdmVTaGFyZENvdW50ID0gMDtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHRoaXMudXBkYXRlTXV0ZXg7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTZWFyY2g6IHF1ZXJ5IGVhY2ggc2hhcmQgaW4gdHVybiwgbWVyZ2UgcmVzdWx0cywgc29ydCBieSBzY29yZSwgZmlsdGVyIGJ5IHRocmVzaG9sZCwgcmV0dXJuIHRvcCBsaW1pdC5cclxuICAgKi9cclxuICBhc3luYyBzZWFyY2goXHJcbiAgICBxdWVyeVZlY3RvcjogbnVtYmVyW10sXHJcbiAgICBsaW1pdDogbnVtYmVyID0gNSxcclxuICAgIHRocmVzaG9sZDogbnVtYmVyID0gMC41LFxyXG4gICk6IFByb21pc2U8U2VhcmNoUmVzdWx0W10+IHtcclxuICAgIGNvbnN0IG1lcmdlZDogU2VhcmNoUmVzdWx0W10gPSBbXTtcclxuICAgIGZvciAoY29uc3QgZGlyIG9mIHRoaXMuc2hhcmREaXJzKSB7XHJcbiAgICAgIGNvbnN0IHNoYXJkID0gdGhpcy5vcGVuU2hhcmQoZGlyKTtcclxuICAgICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IHNoYXJkLnF1ZXJ5SXRlbXMoXHJcbiAgICAgICAgcXVlcnlWZWN0b3IsXHJcbiAgICAgICAgXCJcIixcclxuICAgICAgICBsaW1pdCxcclxuICAgICAgICB1bmRlZmluZWQsXHJcbiAgICAgICAgZmFsc2UsXHJcbiAgICAgICk7XHJcbiAgICAgIGZvciAoY29uc3QgciBvZiByZXN1bHRzKSB7XHJcbiAgICAgICAgY29uc3QgbSA9IHIuaXRlbS5tZXRhZGF0YSBhcyBDaHVua01ldGFkYXRhO1xyXG4gICAgICAgIG1lcmdlZC5wdXNoKHtcclxuICAgICAgICAgIHRleHQ6IG0/LnRleHQgPz8gXCJcIixcclxuICAgICAgICAgIHNjb3JlOiByLnNjb3JlLFxyXG4gICAgICAgICAgZmlsZVBhdGg6IG0/LmZpbGVQYXRoID8/IFwiXCIsXHJcbiAgICAgICAgICBmaWxlTmFtZTogbT8uZmlsZU5hbWUgPz8gXCJcIixcclxuICAgICAgICAgIGNodW5rSW5kZXg6IG0/LmNodW5rSW5kZXggPz8gMCxcclxuICAgICAgICAgIHNoYXJkTmFtZTogZGlyLFxyXG4gICAgICAgICAgbWV0YWRhdGE6IChyLml0ZW0ubWV0YWRhdGEgYXMgUmVjb3JkPHN0cmluZywgYW55PikgPz8ge30sXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBtZXJnZWRcclxuICAgICAgLmZpbHRlcigocikgPT4gci5zY29yZSA+PSB0aHJlc2hvbGQpXHJcbiAgICAgIC5zb3J0KChhLCBiKSA9PiBiLnNjb3JlIC0gYS5zY29yZSlcclxuICAgICAgLnNsaWNlKDAsIGxpbWl0KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIERlbGV0ZSBhbGwgY2h1bmtzIGZvciBhIGZpbGUgKGJ5IGhhc2gpIGFjcm9zcyBhbGwgc2hhcmRzLlxyXG4gICAqL1xyXG4gIGFzeW5jIGRlbGV0ZUJ5RmlsZUhhc2goZmlsZUhhc2g6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3QgbGFzdERpciA9IHRoaXMuc2hhcmREaXJzW3RoaXMuc2hhcmREaXJzLmxlbmd0aCAtIDFdO1xyXG4gICAgdGhpcy51cGRhdGVNdXRleCA9IHRoaXMudXBkYXRlTXV0ZXgudGhlbihhc3luYyAoKSA9PiB7XHJcbiAgICAgIGZvciAoY29uc3QgZGlyIG9mIHRoaXMuc2hhcmREaXJzKSB7XHJcbiAgICAgICAgY29uc3Qgc2hhcmQgPSB0aGlzLm9wZW5TaGFyZChkaXIpO1xyXG4gICAgICAgIGNvbnN0IGl0ZW1zID0gYXdhaXQgc2hhcmQubGlzdEl0ZW1zKCk7XHJcbiAgICAgICAgY29uc3QgdG9EZWxldGUgPSBpdGVtcy5maWx0ZXIoXHJcbiAgICAgICAgICAoaSkgPT4gKGkubWV0YWRhdGEgYXMgQ2h1bmtNZXRhZGF0YSk/LmZpbGVIYXNoID09PSBmaWxlSGFzaCxcclxuICAgICAgICApO1xyXG4gICAgICAgIGlmICh0b0RlbGV0ZS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICBhd2FpdCBzaGFyZC5iZWdpblVwZGF0ZSgpO1xyXG4gICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRvRGVsZXRlKSB7XHJcbiAgICAgICAgICAgIGF3YWl0IHNoYXJkLmRlbGV0ZUl0ZW0oaXRlbS5pZCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBhd2FpdCBzaGFyZC5lbmRVcGRhdGUoKTtcclxuICAgICAgICAgIGlmIChkaXIgPT09IGxhc3REaXIgJiYgdGhpcy5hY3RpdmVTaGFyZCkge1xyXG4gICAgICAgICAgICB0aGlzLmFjdGl2ZVNoYXJkQ291bnQgPSAoYXdhaXQgdGhpcy5hY3RpdmVTaGFyZC5saXN0SXRlbXMoKSkubGVuZ3RoO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBjb25zb2xlLmxvZyhgRGVsZXRlZCBjaHVua3MgZm9yIGZpbGUgaGFzaDogJHtmaWxlSGFzaH1gKTtcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHRoaXMudXBkYXRlTXV0ZXg7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgZmlsZSBwYXRoIC0+IHNldCBvZiBmaWxlIGhhc2hlcyBjdXJyZW50bHkgaW4gdGhlIHN0b3JlLlxyXG4gICAqL1xyXG4gIGFzeW5jIGdldEZpbGVIYXNoSW52ZW50b3J5KCk6IFByb21pc2U8TWFwPHN0cmluZywgU2V0PHN0cmluZz4+PiB7XHJcbiAgICBjb25zdCBpbnZlbnRvcnkgPSBuZXcgTWFwPHN0cmluZywgU2V0PHN0cmluZz4+KCk7XHJcbiAgICBmb3IgKGNvbnN0IGRpciBvZiB0aGlzLnNoYXJkRGlycykge1xyXG4gICAgICBjb25zdCBzaGFyZCA9IHRoaXMub3BlblNoYXJkKGRpcik7XHJcbiAgICAgIGNvbnN0IGl0ZW1zID0gYXdhaXQgc2hhcmQubGlzdEl0ZW1zKCk7XHJcbiAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xyXG4gICAgICAgIGNvbnN0IG0gPSBpdGVtLm1ldGFkYXRhIGFzIENodW5rTWV0YWRhdGE7XHJcbiAgICAgICAgY29uc3QgZmlsZVBhdGggPSBtPy5maWxlUGF0aDtcclxuICAgICAgICBjb25zdCBmaWxlSGFzaCA9IG0/LmZpbGVIYXNoO1xyXG4gICAgICAgIGlmICghZmlsZVBhdGggfHwgIWZpbGVIYXNoKSBjb250aW51ZTtcclxuICAgICAgICBsZXQgc2V0ID0gaW52ZW50b3J5LmdldChmaWxlUGF0aCk7XHJcbiAgICAgICAgaWYgKCFzZXQpIHtcclxuICAgICAgICAgIHNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG4gICAgICAgICAgaW52ZW50b3J5LnNldChmaWxlUGF0aCwgc2V0KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgc2V0LmFkZChmaWxlSGFzaCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBpbnZlbnRvcnk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgdG90YWwgY2h1bmsgY291bnQgYW5kIHVuaXF1ZSBmaWxlIGNvdW50LlxyXG4gICAqL1xyXG4gIGFzeW5jIGdldFN0YXRzKCk6IFByb21pc2U8e1xyXG4gICAgdG90YWxDaHVua3M6IG51bWJlcjtcclxuICAgIHVuaXF1ZUZpbGVzOiBudW1iZXI7XHJcbiAgfT4ge1xyXG4gICAgbGV0IHRvdGFsQ2h1bmtzID0gMDtcclxuICAgIGNvbnN0IHVuaXF1ZUhhc2hlcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG4gICAgZm9yIChjb25zdCBkaXIgb2YgdGhpcy5zaGFyZERpcnMpIHtcclxuICAgICAgY29uc3Qgc2hhcmQgPSB0aGlzLm9wZW5TaGFyZChkaXIpO1xyXG4gICAgICBjb25zdCBpdGVtcyA9IGF3YWl0IHNoYXJkLmxpc3RJdGVtcygpO1xyXG4gICAgICB0b3RhbENodW5rcyArPSBpdGVtcy5sZW5ndGg7XHJcbiAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xyXG4gICAgICAgIGNvbnN0IGggPSAoaXRlbS5tZXRhZGF0YSBhcyBDaHVua01ldGFkYXRhKT8uZmlsZUhhc2g7XHJcbiAgICAgICAgaWYgKGgpIHVuaXF1ZUhhc2hlcy5hZGQoaCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiB7IHRvdGFsQ2h1bmtzLCB1bmlxdWVGaWxlczogdW5pcXVlSGFzaGVzLnNpemUgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGlmIGFueSBjaHVuayBleGlzdHMgZm9yIHRoZSBnaXZlbiBmaWxlIGhhc2ggKHNob3J0LWNpcmN1aXRzIG9uIGZpcnN0IG1hdGNoKS5cclxuICAgKi9cclxuICBhc3luYyBoYXNGaWxlKGZpbGVIYXNoOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgIGZvciAoY29uc3QgZGlyIG9mIHRoaXMuc2hhcmREaXJzKSB7XHJcbiAgICAgIGNvbnN0IHNoYXJkID0gdGhpcy5vcGVuU2hhcmQoZGlyKTtcclxuICAgICAgY29uc3QgaXRlbXMgPSBhd2FpdCBzaGFyZC5saXN0SXRlbXMoKTtcclxuICAgICAgaWYgKGl0ZW1zLnNvbWUoKGkpID0+IChpLm1ldGFkYXRhIGFzIENodW5rTWV0YWRhdGEpPy5maWxlSGFzaCA9PT0gZmlsZUhhc2gpKSB7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlbGVhc2UgdGhlIGFjdGl2ZSBzaGFyZCByZWZlcmVuY2UuXHJcbiAgICovXHJcbiAgYXN5bmMgY2xvc2UoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0aGlzLmFjdGl2ZVNoYXJkID0gbnVsbDtcclxuICB9XHJcbn1cclxuIiwgImltcG9ydCAqIGFzIGZzIGZyb20gXCJmc1wiO1xyXG5pbXBvcnQgKiBhcyBvcyBmcm9tIFwib3NcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgU2FuaXR5Q2hlY2tSZXN1bHQge1xyXG4gIHBhc3NlZDogYm9vbGVhbjtcclxuICB3YXJuaW5nczogc3RyaW5nW107XHJcbiAgZXJyb3JzOiBzdHJpbmdbXTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFBlcmZvcm0gc2FuaXR5IGNoZWNrcyBiZWZvcmUgaW5kZXhpbmcgbGFyZ2UgZGlyZWN0b3JpZXNcclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwZXJmb3JtU2FuaXR5Q2hlY2tzKFxyXG4gIGRvY3VtZW50c0Rpcjogc3RyaW5nLFxyXG4gIHZlY3RvclN0b3JlRGlyOiBzdHJpbmcsXHJcbik6IFByb21pc2U8U2FuaXR5Q2hlY2tSZXN1bHQ+IHtcclxuICBjb25zdCB3YXJuaW5nczogc3RyaW5nW10gPSBbXTtcclxuICBjb25zdCBlcnJvcnM6IHN0cmluZ1tdID0gW107XHJcblxyXG4gIC8vIENoZWNrIGlmIGRpcmVjdG9yaWVzIGV4aXN0XHJcbiAgdHJ5IHtcclxuICAgIGF3YWl0IGZzLnByb21pc2VzLmFjY2Vzcyhkb2N1bWVudHNEaXIsIGZzLmNvbnN0YW50cy5SX09LKTtcclxuICB9IGNhdGNoIHtcclxuICAgIGVycm9ycy5wdXNoKGBEb2N1bWVudHMgZGlyZWN0b3J5IGRvZXMgbm90IGV4aXN0IG9yIGlzIG5vdCByZWFkYWJsZTogJHtkb2N1bWVudHNEaXJ9YCk7XHJcbiAgfVxyXG5cclxuICB0cnkge1xyXG4gICAgYXdhaXQgZnMucHJvbWlzZXMuYWNjZXNzKHZlY3RvclN0b3JlRGlyLCBmcy5jb25zdGFudHMuV19PSyk7XHJcbiAgfSBjYXRjaCB7XHJcbiAgICAvLyBUcnkgdG8gY3JlYXRlIGl0XHJcbiAgICB0cnkge1xyXG4gICAgICBhd2FpdCBmcy5wcm9taXNlcy5ta2Rpcih2ZWN0b3JTdG9yZURpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XHJcbiAgICB9IGNhdGNoIHtcclxuICAgICAgZXJyb3JzLnB1c2goXHJcbiAgICAgICAgYFZlY3RvciBzdG9yZSBkaXJlY3RvcnkgZG9lcyBub3QgZXhpc3QgYW5kIGNhbm5vdCBiZSBjcmVhdGVkOiAke3ZlY3RvclN0b3JlRGlyfWBcclxuICAgICAgKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIENoZWNrIGF2YWlsYWJsZSBkaXNrIHNwYWNlXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHN0YXRzID0gYXdhaXQgZnMucHJvbWlzZXMuc3RhdGZzKHZlY3RvclN0b3JlRGlyKTtcclxuICAgIGNvbnN0IGF2YWlsYWJsZUdCID0gKHN0YXRzLmJhdmFpbCAqIHN0YXRzLmJzaXplKSAvICgxMDI0ICogMTAyNCAqIDEwMjQpO1xyXG4gICAgXHJcbiAgICBpZiAoYXZhaWxhYmxlR0IgPCAxKSB7XHJcbiAgICAgIGVycm9ycy5wdXNoKGBWZXJ5IGxvdyBkaXNrIHNwYWNlIGF2YWlsYWJsZTogJHthdmFpbGFibGVHQi50b0ZpeGVkKDIpfSBHQmApO1xyXG4gICAgfSBlbHNlIGlmIChhdmFpbGFibGVHQiA8IDEwKSB7XHJcbiAgICAgIHdhcm5pbmdzLnB1c2goYExvdyBkaXNrIHNwYWNlIGF2YWlsYWJsZTogJHthdmFpbGFibGVHQi50b0ZpeGVkKDIpfSBHQmApO1xyXG4gICAgfVxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICB3YXJuaW5ncy5wdXNoKFwiQ291bGQgbm90IGNoZWNrIGF2YWlsYWJsZSBkaXNrIHNwYWNlXCIpO1xyXG4gIH1cclxuXHJcbiAgLy8gQ2hlY2sgYXZhaWxhYmxlIG1lbW9yeVxyXG4gIGNvbnN0IGZyZWVNZW1vcnlHQiA9IG9zLmZyZWVtZW0oKSAvICgxMDI0ICogMTAyNCAqIDEwMjQpO1xyXG4gIGNvbnN0IHRvdGFsTWVtb3J5R0IgPSBvcy50b3RhbG1lbSgpIC8gKDEwMjQgKiAxMDI0ICogMTAyNCk7XHJcbiAgY29uc3QgcnVubmluZ09uTWFjID0gcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gXCJkYXJ3aW5cIjtcclxuICBjb25zdCBsb3dNZW1vcnlNZXNzYWdlID1cclxuICAgIGBMb3cgZnJlZSBtZW1vcnk6ICR7ZnJlZU1lbW9yeUdCLnRvRml4ZWQoMil9IEdCIG9mICR7dG90YWxNZW1vcnlHQi50b0ZpeGVkKDIpfSBHQiB0b3RhbC4gYCArXHJcbiAgICBcIkNvbnNpZGVyIHJlZHVjaW5nIGNvbmN1cnJlbnQgZmlsZSBwcm9jZXNzaW5nLlwiO1xyXG4gIGNvbnN0IHZlcnlMb3dNZW1vcnlNZXNzYWdlID1cclxuICAgIGBWZXJ5IGxvdyBmcmVlIG1lbW9yeTogJHtmcmVlTWVtb3J5R0IudG9GaXhlZCgyKX0gR0IuIGAgK1xyXG4gICAgKHJ1bm5pbmdPbk1hY1xyXG4gICAgICA/IFwibWFjT1MgbWF5IGJlIHJlcG9ydGluZyBjYWNoZWQgcGFnZXMgYXMgdXNlZDsgY2FjaGVkIG1lbW9yeSBjYW4gdXN1YWxseSBiZSByZWNsYWltZWQgYXV0b21hdGljYWxseS5cIlxyXG4gICAgICA6IFwiSW5kZXhpbmcgbWF5IGZhaWwgZHVlIHRvIGluc3VmZmljaWVudCBSQU0uXCIpO1xyXG5cclxuICBpZiAoZnJlZU1lbW9yeUdCIDwgMC41KSB7XHJcbiAgICBpZiAocnVubmluZ09uTWFjKSB7XHJcbiAgICAgIHdhcm5pbmdzLnB1c2godmVyeUxvd01lbW9yeU1lc3NhZ2UpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgZXJyb3JzLnB1c2goYFZlcnkgbG93IGZyZWUgbWVtb3J5OiAke2ZyZWVNZW1vcnlHQi50b0ZpeGVkKDIpfSBHQmApO1xyXG4gICAgfVxyXG4gIH0gZWxzZSBpZiAoZnJlZU1lbW9yeUdCIDwgMikge1xyXG4gICAgd2FybmluZ3MucHVzaChsb3dNZW1vcnlNZXNzYWdlKTtcclxuICB9XHJcblxyXG4gIC8vIEVzdGltYXRlIGRpcmVjdG9yeSBzaXplIChzYW1wbGUtYmFzZWQgZm9yIHBlcmZvcm1hbmNlKVxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBzYW1wbGVTaXplID0gYXdhaXQgZXN0aW1hdGVEaXJlY3RvcnlTaXplKGRvY3VtZW50c0Rpcik7XHJcbiAgICBjb25zdCBlc3RpbWF0ZWRHQiA9IHNhbXBsZVNpemUgLyAoMTAyNCAqIDEwMjQgKiAxMDI0KTtcclxuICAgIFxyXG4gICAgaWYgKGVzdGltYXRlZEdCID4gMTAwKSB7XHJcbiAgICAgIHdhcm5pbmdzLnB1c2goXHJcbiAgICAgICAgYExhcmdlIGRpcmVjdG9yeSBkZXRlY3RlZCAofiR7ZXN0aW1hdGVkR0IudG9GaXhlZCgxKX0gR0IpLiBJbml0aWFsIGluZGV4aW5nIG1heSB0YWtlIHNldmVyYWwgaG91cnMuYFxyXG4gICAgICApO1xyXG4gICAgfSBlbHNlIGlmIChlc3RpbWF0ZWRHQiA+IDEwKSB7XHJcbiAgICAgIHdhcm5pbmdzLnB1c2goXHJcbiAgICAgICAgYE1lZGl1bS1zaXplZCBkaXJlY3RvcnkgZGV0ZWN0ZWQgKH4ke2VzdGltYXRlZEdCLnRvRml4ZWQoMSl9IEdCKS4gSW5pdGlhbCBpbmRleGluZyBtYXkgdGFrZSAzMC02MCBtaW51dGVzLmBcclxuICAgICAgKTtcclxuICAgIH1cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgd2FybmluZ3MucHVzaChcIkNvdWxkIG5vdCBlc3RpbWF0ZSBkaXJlY3Rvcnkgc2l6ZVwiKTtcclxuICB9XHJcblxyXG4gIC8vIENoZWNrIGlmIHZlY3RvciBzdG9yZSBhbHJlYWR5IGhhcyBkYXRhXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGZpbGVzID0gYXdhaXQgZnMucHJvbWlzZXMucmVhZGRpcih2ZWN0b3JTdG9yZURpcik7XHJcbiAgICBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICB3YXJuaW5ncy5wdXNoKFxyXG4gICAgICAgIFwiVmVjdG9yIHN0b3JlIGRpcmVjdG9yeSBpcyBub3QgZW1wdHkuIEV4aXN0aW5nIGRhdGEgd2lsbCBiZSB1c2VkIGZvciBpbmNyZW1lbnRhbCBpbmRleGluZy5cIlxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIH0gY2F0Y2gge1xyXG4gICAgLy8gRGlyZWN0b3J5IGRvZXNuJ3QgZXhpc3QgeWV0LCB0aGF0J3MgZmluZVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHBhc3NlZDogZXJyb3JzLmxlbmd0aCA9PT0gMCxcclxuICAgIHdhcm5pbmdzLFxyXG4gICAgZXJyb3JzLFxyXG4gIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBFc3RpbWF0ZSBkaXJlY3Rvcnkgc2l6ZSBieSBzYW1wbGluZ1xyXG4gKiAoUXVpY2sgZXN0aW1hdGUsIG5vdCBleGFjdClcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGVzdGltYXRlRGlyZWN0b3J5U2l6ZShkaXI6IHN0cmluZywgbWF4U2FtcGxlczogbnVtYmVyID0gMTAwKTogUHJvbWlzZTxudW1iZXI+IHtcclxuICBsZXQgdG90YWxTaXplID0gMDtcclxuICBsZXQgZmlsZUNvdW50ID0gMDtcclxuICBsZXQgc2FtcGxlZFNpemUgPSAwO1xyXG4gIGxldCBzYW1wbGVkQ291bnQgPSAwO1xyXG5cclxuICBhc3luYyBmdW5jdGlvbiB3YWxrKGN1cnJlbnREaXI6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYgKHNhbXBsZWRDb3VudCA+PSBtYXhTYW1wbGVzKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBlbnRyaWVzID0gYXdhaXQgZnMucHJvbWlzZXMucmVhZGRpcihjdXJyZW50RGlyLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSk7XHJcblxyXG4gICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgICAgICBpZiAoc2FtcGxlZENvdW50ID49IG1heFNhbXBsZXMpIHtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZnVsbFBhdGggPSBgJHtjdXJyZW50RGlyfS8ke2VudHJ5Lm5hbWV9YDtcclxuXHJcbiAgICAgICAgaWYgKGVudHJ5LmlzRGlyZWN0b3J5KCkpIHtcclxuICAgICAgICAgIGF3YWl0IHdhbGsoZnVsbFBhdGgpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoZW50cnkuaXNGaWxlKCkpIHtcclxuICAgICAgICAgIGZpbGVDb3VudCsrO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZiAoc2FtcGxlZENvdW50IDwgbWF4U2FtcGxlcykge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgIGNvbnN0IHN0YXRzID0gYXdhaXQgZnMucHJvbWlzZXMuc3RhdChmdWxsUGF0aCk7XHJcbiAgICAgICAgICAgICAgc2FtcGxlZFNpemUgKz0gc3RhdHMuc2l6ZTtcclxuICAgICAgICAgICAgICBzYW1wbGVkQ291bnQrKztcclxuICAgICAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgICAgLy8gU2tpcCBmaWxlcyB3ZSBjYW4ndCBzdGF0XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2gge1xyXG4gICAgICAvLyBTa2lwIGRpcmVjdG9yaWVzIHdlIGNhbid0IHJlYWRcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGF3YWl0IHdhbGsoZGlyKTtcclxuXHJcbiAgLy8gRXh0cmFwb2xhdGUgZnJvbSBzYW1wbGVcclxuICBpZiAoc2FtcGxlZENvdW50ID4gMCAmJiBmaWxlQ291bnQgPiAwKSB7XHJcbiAgICBjb25zdCBhdmdGaWxlU2l6ZSA9IHNhbXBsZWRTaXplIC8gc2FtcGxlZENvdW50O1xyXG4gICAgdG90YWxTaXplID0gYXZnRmlsZVNpemUgKiBmaWxlQ291bnQ7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gdG90YWxTaXplO1xyXG59XHJcblxyXG4vKipcclxuICogQ2hlY2sgc3lzdGVtIHJlc291cmNlcyBhbmQgcHJvdmlkZSByZWNvbW1lbmRhdGlvbnNcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRSZXNvdXJjZVJlY29tbWVuZGF0aW9ucyhcclxuICBlc3RpbWF0ZWRTaXplR0I6IG51bWJlcixcclxuICBmcmVlTWVtb3J5R0I6IG51bWJlcixcclxuKToge1xyXG4gIHJlY29tbWVuZGVkQ29uY3VycmVuY3k6IG51bWJlcjtcclxuICByZWNvbW1lbmRlZENodW5rU2l6ZTogbnVtYmVyO1xyXG4gIGVzdGltYXRlZFRpbWU6IHN0cmluZztcclxufSB7XHJcbiAgbGV0IHJlY29tbWVuZGVkQ29uY3VycmVuY3kgPSAzO1xyXG4gIGxldCByZWNvbW1lbmRlZENodW5rU2l6ZSA9IDUxMjtcclxuICBsZXQgZXN0aW1hdGVkVGltZSA9IFwidW5rbm93blwiO1xyXG5cclxuICAvLyBBZGp1c3QgYmFzZWQgb24gYXZhaWxhYmxlIG1lbW9yeVxyXG4gIGlmIChmcmVlTWVtb3J5R0IgPCAyKSB7XHJcbiAgICByZWNvbW1lbmRlZENvbmN1cnJlbmN5ID0gMTtcclxuICB9IGVsc2UgaWYgKGZyZWVNZW1vcnlHQiA8IDQpIHtcclxuICAgIHJlY29tbWVuZGVkQ29uY3VycmVuY3kgPSAyO1xyXG4gIH0gZWxzZSBpZiAoZnJlZU1lbW9yeUdCID49IDgpIHtcclxuICAgIHJlY29tbWVuZGVkQ29uY3VycmVuY3kgPSA1O1xyXG4gIH1cclxuXHJcbiAgLy8gQWRqdXN0IGJhc2VkIG9uIGRhdGFzZXQgc2l6ZVxyXG4gIGlmIChlc3RpbWF0ZWRTaXplR0IgPCAxKSB7XHJcbiAgICBlc3RpbWF0ZWRUaW1lID0gXCI1LTE1IG1pbnV0ZXNcIjtcclxuICB9IGVsc2UgaWYgKGVzdGltYXRlZFNpemVHQiA8IDEwKSB7XHJcbiAgICBlc3RpbWF0ZWRUaW1lID0gXCIzMC02MCBtaW51dGVzXCI7XHJcbiAgICByZWNvbW1lbmRlZENodW5rU2l6ZSA9IDc2ODtcclxuICB9IGVsc2UgaWYgKGVzdGltYXRlZFNpemVHQiA8IDEwMCkge1xyXG4gICAgZXN0aW1hdGVkVGltZSA9IFwiMi00IGhvdXJzXCI7XHJcbiAgICByZWNvbW1lbmRlZENodW5rU2l6ZSA9IDEwMjQ7XHJcbiAgfSBlbHNlIHtcclxuICAgIGVzdGltYXRlZFRpbWUgPSBcIjQtMTIgaG91cnNcIjtcclxuICAgIHJlY29tbWVuZGVkQ2h1bmtTaXplID0gMTAyNDtcclxuICAgIHJlY29tbWVuZGVkQ29uY3VycmVuY3kgPSBNYXRoLm1pbihyZWNvbW1lbmRlZENvbmN1cnJlbmN5LCAzKTtcclxuICB9XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICByZWNvbW1lbmRlZENvbmN1cnJlbmN5LFxyXG4gICAgcmVjb21tZW5kZWRDaHVua1NpemUsXHJcbiAgICBlc3RpbWF0ZWRUaW1lLFxyXG4gIH07XHJcbn1cclxuXHJcbiIsICJsZXQgaW5kZXhpbmdJblByb2dyZXNzID0gZmFsc2U7XHJcblxyXG4vKipcclxuICogQXR0ZW1wdCB0byBhY3F1aXJlIHRoZSBzaGFyZWQgaW5kZXhpbmcgbG9jay5cclxuICogUmV0dXJucyB0cnVlIGlmIG5vIG90aGVyIGluZGV4aW5nIGpvYiBpcyBydW5uaW5nLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHRyeVN0YXJ0SW5kZXhpbmcoY29udGV4dDogc3RyaW5nID0gXCJ1bmtub3duXCIpOiBib29sZWFuIHtcclxuICBpZiAoaW5kZXhpbmdJblByb2dyZXNzKSB7XHJcbiAgICBjb25zb2xlLmRlYnVnKGBbQmlnUkFHXSB0cnlTdGFydEluZGV4aW5nICgke2NvbnRleHR9KSBmYWlsZWQ6IGxvY2sgYWxyZWFkeSBoZWxkYCk7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICBpbmRleGluZ0luUHJvZ3Jlc3MgPSB0cnVlO1xyXG4gIGNvbnNvbGUuZGVidWcoYFtCaWdSQUddIHRyeVN0YXJ0SW5kZXhpbmcgKCR7Y29udGV4dH0pIHN1Y2NlZWRlZGApO1xyXG4gIHJldHVybiB0cnVlO1xyXG59XHJcblxyXG4vKipcclxuICogUmVsZWFzZSB0aGUgc2hhcmVkIGluZGV4aW5nIGxvY2suXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZmluaXNoSW5kZXhpbmcoKTogdm9pZCB7XHJcbiAgaW5kZXhpbmdJblByb2dyZXNzID0gZmFsc2U7XHJcbiAgY29uc29sZS5kZWJ1ZyhcIltCaWdSQUddIGZpbmlzaEluZGV4aW5nOiBsb2NrIHJlbGVhc2VkXCIpO1xyXG59XHJcblxyXG4vKipcclxuICogSW5kaWNhdGVzIHdoZXRoZXIgYW4gaW5kZXhpbmcgam9iIGlzIGN1cnJlbnRseSBydW5uaW5nLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGlzSW5kZXhpbmcoKTogYm9vbGVhbiB7XHJcbiAgcmV0dXJuIGluZGV4aW5nSW5Qcm9ncmVzcztcclxufVxyXG5cclxuIiwgIi8qKlxyXG4gKiBOb3JtYWxpemUgZW1iZWRkaW5nIEFQSSBvdXRwdXQgdG8gYSBmaW5pdGUgbnVtYmVyW10uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY29lcmNlRW1iZWRkaW5nVmVjdG9yKHJhdzogdW5rbm93bik6IG51bWJlcltdIHtcclxuICBpZiAoQXJyYXkuaXNBcnJheShyYXcpKSB7XHJcbiAgICByZXR1cm4gcmF3Lm1hcChhc3NlcnRGaW5pdGVOdW1iZXIpO1xyXG4gIH1cclxuXHJcbiAgaWYgKHR5cGVvZiByYXcgPT09IFwibnVtYmVyXCIpIHtcclxuICAgIHJldHVybiBbYXNzZXJ0RmluaXRlTnVtYmVyKHJhdyldO1xyXG4gIH1cclxuXHJcbiAgaWYgKHJhdyAmJiB0eXBlb2YgcmF3ID09PSBcIm9iamVjdFwiKSB7XHJcbiAgICBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KHJhdykpIHtcclxuICAgICAgcmV0dXJuIEFycmF5LmZyb20ocmF3IGFzIHVua25vd24gYXMgQXJyYXlMaWtlPG51bWJlcj4pLm1hcChhc3NlcnRGaW5pdGVOdW1iZXIpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGNhbmRpZGF0ZSA9XHJcbiAgICAgIChyYXcgYXMgYW55KS5lbWJlZGRpbmcgPz9cclxuICAgICAgKHJhdyBhcyBhbnkpLnZlY3RvciA/P1xyXG4gICAgICAocmF3IGFzIGFueSkuZGF0YSA/P1xyXG4gICAgICAodHlwZW9mIChyYXcgYXMgYW55KS50b0FycmF5ID09PSBcImZ1bmN0aW9uXCIgPyAocmF3IGFzIGFueSkudG9BcnJheSgpIDogdW5kZWZpbmVkKSA/P1xyXG4gICAgICAodHlwZW9mIChyYXcgYXMgYW55KS50b0pTT04gPT09IFwiZnVuY3Rpb25cIiA/IChyYXcgYXMgYW55KS50b0pTT04oKSA6IHVuZGVmaW5lZCk7XHJcblxyXG4gICAgaWYgKGNhbmRpZGF0ZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHJldHVybiBjb2VyY2VFbWJlZGRpbmdWZWN0b3IoY2FuZGlkYXRlKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHRocm93IG5ldyBFcnJvcihcIkVtYmVkZGluZyBwcm92aWRlciByZXR1cm5lZCBhIG5vbi1udW1lcmljIHZlY3RvclwiKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYXNzZXJ0RmluaXRlTnVtYmVyKHZhbHVlOiB1bmtub3duKTogbnVtYmVyIHtcclxuICBjb25zdCBudW0gPSB0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIgPyB2YWx1ZSA6IE51bWJlcih2YWx1ZSk7XHJcbiAgaWYgKCFOdW1iZXIuaXNGaW5pdGUobnVtKSkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiRW1iZWRkaW5nIHZlY3RvciBjb250YWlucyBhIG5vbi1maW5pdGUgdmFsdWVcIik7XHJcbiAgfVxyXG4gIHJldHVybiBudW07XHJcbn1cclxuIiwgImltcG9ydCAqIGFzIGZzIGZyb20gXCJmcy9wcm9taXNlc1wiO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCB7IHR5cGUgRW1iZWRkaW5nRHluYW1pY0hhbmRsZSB9IGZyb20gXCJAbG1zdHVkaW8vc2RrXCI7XHJcbmltcG9ydCB7IGNvZXJjZUVtYmVkZGluZ1ZlY3RvciB9IGZyb20gXCIuL2NvZXJjZUVtYmVkZGluZ1wiO1xyXG5cclxuZXhwb3J0IGNvbnN0IEVNQkVERElOR19JTkRFWF9NQU5JRkVTVF9GSUxFTkFNRSA9IFwiLmJpZy1yYWctZW1iZWRkaW5nLmpzb25cIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRW1iZWRkaW5nSW5kZXhNYW5pZmVzdCB7XHJcbiAgZW1iZWRkaW5nTW9kZWxJZDogc3RyaW5nO1xyXG4gIGRpbWVuc2lvbnM6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEVtYmVkZGluZ01hbmlmZXN0UGF0aCh2ZWN0b3JTdG9yZURpcjogc3RyaW5nKTogc3RyaW5nIHtcclxuICByZXR1cm4gcGF0aC5qb2luKHBhdGgucmVzb2x2ZSh2ZWN0b3JTdG9yZURpciksIEVNQkVERElOR19JTkRFWF9NQU5JRkVTVF9GSUxFTkFNRSk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWFkRW1iZWRkaW5nSW5kZXhNYW5pZmVzdChcclxuICB2ZWN0b3JTdG9yZURpcjogc3RyaW5nLFxyXG4pOiBQcm9taXNlPEVtYmVkZGluZ0luZGV4TWFuaWZlc3QgfCBudWxsPiB7XHJcbiAgY29uc3QgZmlsZVBhdGggPSBnZXRFbWJlZGRpbmdNYW5pZmVzdFBhdGgodmVjdG9yU3RvcmVEaXIpO1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCByYXcgPSBhd2FpdCBmcy5yZWFkRmlsZShmaWxlUGF0aCwgXCJ1dGYtOFwiKTtcclxuICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKHJhdykgYXMgUGFydGlhbDxFbWJlZGRpbmdJbmRleE1hbmlmZXN0PjtcclxuICAgIGlmIChcclxuICAgICAgdHlwZW9mIGRhdGEuZW1iZWRkaW5nTW9kZWxJZCA9PT0gXCJzdHJpbmdcIiAmJlxyXG4gICAgICBkYXRhLmVtYmVkZGluZ01vZGVsSWQubGVuZ3RoID4gMCAmJlxyXG4gICAgICB0eXBlb2YgZGF0YS5kaW1lbnNpb25zID09PSBcIm51bWJlclwiICYmXHJcbiAgICAgIE51bWJlci5pc0Zpbml0ZShkYXRhLmRpbWVuc2lvbnMpICYmXHJcbiAgICAgIGRhdGEuZGltZW5zaW9ucyA+IDBcclxuICAgICkge1xyXG4gICAgICByZXR1cm4geyBlbWJlZGRpbmdNb2RlbElkOiBkYXRhLmVtYmVkZGluZ01vZGVsSWQsIGRpbWVuc2lvbnM6IGRhdGEuZGltZW5zaW9ucyB9O1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG51bGw7XHJcbiAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICBpZiAoZT8uY29kZSA9PT0gXCJFTk9FTlRcIikge1xyXG4gICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICAgIGNvbnNvbGUud2FybihcIltCaWdSQUddIENvdWxkIG5vdCByZWFkIGVtYmVkZGluZyBpbmRleCBtYW5pZmVzdDpcIiwgZSk7XHJcbiAgICByZXR1cm4gbnVsbDtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZUVtYmVkZGluZ0luZGV4TWFuaWZlc3QoXHJcbiAgdmVjdG9yU3RvcmVEaXI6IHN0cmluZyxcclxuICBtYW5pZmVzdDogRW1iZWRkaW5nSW5kZXhNYW5pZmVzdCxcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc3QgZmlsZVBhdGggPSBnZXRFbWJlZGRpbmdNYW5pZmVzdFBhdGgodmVjdG9yU3RvcmVEaXIpO1xyXG4gIGF3YWl0IGZzLm1rZGlyKHBhdGguZGlybmFtZShmaWxlUGF0aCksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xyXG4gIGF3YWl0IGZzLndyaXRlRmlsZShmaWxlUGF0aCwgSlNPTi5zdHJpbmdpZnkobWFuaWZlc3QsIG51bGwsIDIpLCBcInV0Zi04XCIpO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZGVsZXRlRW1iZWRkaW5nSW5kZXhNYW5pZmVzdCh2ZWN0b3JTdG9yZURpcjogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc3QgZmlsZVBhdGggPSBnZXRFbWJlZGRpbmdNYW5pZmVzdFBhdGgodmVjdG9yU3RvcmVEaXIpO1xyXG4gIHRyeSB7XHJcbiAgICBhd2FpdCBmcy51bmxpbmsoZmlsZVBhdGgpO1xyXG4gIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgaWYgKGU/LmNvZGUgIT09IFwiRU5PRU5UXCIpIHtcclxuICAgICAgY29uc29sZS53YXJuKFwiW0JpZ1JBR10gQ291bGQgbm90IGRlbGV0ZSBlbWJlZGRpbmcgaW5kZXggbWFuaWZlc3Q6XCIsIGUpO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEFmdGVyIGluZGV4aW5nOiBwZXJzaXN0IG1hbmlmZXN0IHdoZW4gdGhlIHN0b3JlIGhhcyBjaHVua3M7IG90aGVyd2lzZSByZW1vdmUgc3RhbGUgbWFuaWZlc3QuXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3luY0VtYmVkZGluZ01hbmlmZXN0QWZ0ZXJJbmRleGluZyhcclxuICB2ZWN0b3JTdG9yZURpcjogc3RyaW5nLFxyXG4gIHRvdGFsQ2h1bmtzOiBudW1iZXIsXHJcbiAgcmVzb2x2ZWRNb2RlbElkOiBzdHJpbmcsXHJcbiAgZW1iZWRkaW5nTW9kZWw6IEVtYmVkZGluZ0R5bmFtaWNIYW5kbGUsXHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIGlmICh0b3RhbENodW5rcyA9PT0gMCkge1xyXG4gICAgYXdhaXQgZGVsZXRlRW1iZWRkaW5nSW5kZXhNYW5pZmVzdCh2ZWN0b3JTdG9yZURpcik7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIGNvbnN0IHByb2JlID0gYXdhaXQgZW1iZWRkaW5nTW9kZWwuZW1iZWQoXCIuXCIpO1xyXG4gIGNvbnN0IGRpbWVuc2lvbnMgPSBjb2VyY2VFbWJlZGRpbmdWZWN0b3IocHJvYmUuZW1iZWRkaW5nKS5sZW5ndGg7XHJcbiAgYXdhaXQgd3JpdGVFbWJlZGRpbmdJbmRleE1hbmlmZXN0KHZlY3RvclN0b3JlRGlyLCB7XHJcbiAgICBlbWJlZGRpbmdNb2RlbElkOiByZXNvbHZlZE1vZGVsSWQsXHJcbiAgICBkaW1lbnNpb25zLFxyXG4gIH0pO1xyXG59XHJcblxyXG5leHBvcnQgdHlwZSBFbWJlZGRpbmdSZXRyaWV2YWxDaGVjayA9XHJcbiAgfCB7IG9rOiB0cnVlIH1cclxuICB8IHsgb2s6IGZhbHNlOyB1c2VyTWVzc2FnZTogc3RyaW5nOyBsb2dNZXNzYWdlOiBzdHJpbmcgfTtcclxuXHJcbmNvbnN0IGxlZ2FjeVdhcm5lZERpcnMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHJcbi8qKlxyXG4gKiBWYWxpZGF0ZSBjb25maWd1cmVkIGVtYmVkZGluZyBtb2RlbCBhZ2FpbnN0IG9uLWRpc2sgbWFuaWZlc3QgYmVmb3JlIHJldHJpZXZhbC5cclxuICogV2hlbiB0b3RhbENodW5rcyBpcyAwLCBjbGVhcnMgYW55IHN0YWxlIG1hbmlmZXN0LlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoZWNrRW1iZWRkaW5nTW9kZWxGb3JSZXRyaWV2YWwoYXJnczoge1xyXG4gIHZlY3RvclN0b3JlRGlyOiBzdHJpbmc7XHJcbiAgcmVzb2x2ZWRNb2RlbElkOiBzdHJpbmc7XHJcbiAgdG90YWxDaHVua3M6IG51bWJlcjtcclxuICBlbWJlZGRpbmdNb2RlbDogRW1iZWRkaW5nRHluYW1pY0hhbmRsZTtcclxufSk6IFByb21pc2U8RW1iZWRkaW5nUmV0cmlldmFsQ2hlY2s+IHtcclxuICBjb25zdCB7IHZlY3RvclN0b3JlRGlyLCByZXNvbHZlZE1vZGVsSWQsIHRvdGFsQ2h1bmtzLCBlbWJlZGRpbmdNb2RlbCB9ID0gYXJncztcclxuXHJcbiAgaWYgKHRvdGFsQ2h1bmtzID09PSAwKSB7XHJcbiAgICBhd2FpdCBkZWxldGVFbWJlZGRpbmdJbmRleE1hbmlmZXN0KHZlY3RvclN0b3JlRGlyKTtcclxuICAgIHJldHVybiB7IG9rOiB0cnVlIH07XHJcbiAgfVxyXG5cclxuICBjb25zdCBtYW5pZmVzdCA9IGF3YWl0IHJlYWRFbWJlZGRpbmdJbmRleE1hbmlmZXN0KHZlY3RvclN0b3JlRGlyKTtcclxuICBpZiAoIW1hbmlmZXN0KSB7XHJcbiAgICBjb25zdCBrZXkgPSBwYXRoLnJlc29sdmUodmVjdG9yU3RvcmVEaXIpO1xyXG4gICAgaWYgKCFsZWdhY3lXYXJuZWREaXJzLmhhcyhrZXkpKSB7XHJcbiAgICAgIGxlZ2FjeVdhcm5lZERpcnMuYWRkKGtleSk7XHJcbiAgICAgIGNvbnNvbGUud2FybihcclxuICAgICAgICBcIltCaWdSQUddIEluZGV4IGhhcyBjaHVua3MgYnV0IG5vIGAuYmlnLXJhZy1lbWJlZGRpbmcuanNvbmAgbWFuaWZlc3QgKGxpa2VseSBidWlsdCB3aXRoIGFuIG9sZGVyIHBsdWdpbikuIFwiICtcclxuICAgICAgICAgIFwiUmV0cmlldmFsIHByb2NlZWRzOyBydW4gYSBmdWxsIHJlaW5kZXggdG8gcmVjb3JkIGVtYmVkZGluZyBtZXRhZGF0YS5cIixcclxuICAgICAgKTtcclxuICAgIH1cclxuICAgIHJldHVybiB7IG9rOiB0cnVlIH07XHJcbiAgfVxyXG5cclxuICBpZiAobWFuaWZlc3QuZW1iZWRkaW5nTW9kZWxJZCAhPT0gcmVzb2x2ZWRNb2RlbElkKSB7XHJcbiAgICBjb25zdCBsb2dNZXNzYWdlID1cclxuICAgICAgYEVtYmVkZGluZyBtb2RlbCBtaXNtYXRjaDogaW5kZXggd2FzIGJ1aWx0IHdpdGggXCIke21hbmlmZXN0LmVtYmVkZGluZ01vZGVsSWR9XCIgYnV0IHNldHRpbmdzIHVzZSBcIiR7cmVzb2x2ZWRNb2RlbElkfVwiLiBSZWluZGV4IG9yIGNoYW5nZSB0aGUgc2V0dGluZy5gO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgb2s6IGZhbHNlLFxyXG4gICAgICBsb2dNZXNzYWdlLFxyXG4gICAgICB1c2VyTWVzc2FnZTpcclxuICAgICAgICBgVGhlIGRvY3VtZW50IGluZGV4IHdhcyBidWlsdCB3aXRoIGVtYmVkZGluZyBtb2RlbCBcIiR7bWFuaWZlc3QuZW1iZWRkaW5nTW9kZWxJZH1cIiwgYnV0IHRoZSBwbHVnaW4gaXMgc2V0IHRvIFwiJHtyZXNvbHZlZE1vZGVsSWR9XCIuIGAgK1xyXG4gICAgICAgIGBFaXRoZXIgc3dpdGNoIHRoZSBFbWJlZGRpbmcgTW9kZWwgc2V0dGluZyBiYWNrLCBvciByZWluZGV4IHlvdXIgZG9jdW1lbnRzIGFmdGVyIGNoYW5naW5nIHRoZSBtb2RlbC5gLFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGNvbnN0IHByb2JlID0gYXdhaXQgZW1iZWRkaW5nTW9kZWwuZW1iZWQoXCIuXCIpO1xyXG4gIGNvbnN0IGRpbSA9IGNvZXJjZUVtYmVkZGluZ1ZlY3Rvcihwcm9iZS5lbWJlZGRpbmcpLmxlbmd0aDtcclxuICBpZiAoZGltICE9PSBtYW5pZmVzdC5kaW1lbnNpb25zKSB7XHJcbiAgICBjb25zdCBsb2dNZXNzYWdlID1cclxuICAgICAgYEVtYmVkZGluZyBkaW1lbnNpb24gbWlzbWF0Y2g6IG1hbmlmZXN0IGhhcyAke21hbmlmZXN0LmRpbWVuc2lvbnN9IGJ1dCBtb2RlbCBcIiR7cmVzb2x2ZWRNb2RlbElkfVwiIHJldHVybmVkICR7ZGltfS4gUmVpbmRleCByZXF1aXJlZC5gO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgb2s6IGZhbHNlLFxyXG4gICAgICBsb2dNZXNzYWdlLFxyXG4gICAgICB1c2VyTWVzc2FnZTpcclxuICAgICAgICBgVGhlIHN0b3JlZCBpbmRleCBleHBlY3RzIGVtYmVkZGluZyB2ZWN0b3JzIG9mIGxlbmd0aCAke21hbmlmZXN0LmRpbWVuc2lvbnN9LCBidXQgdGhlIGN1cnJlbnQgbW9kZWwgcHJvZHVjZWQgbGVuZ3RoICR7ZGltfS4gYCArXHJcbiAgICAgICAgYFJlaW5kZXggeW91ciBkb2N1bWVudHMgKG9yIGZpeCB0aGUgbW9kZWwgaWRlbnRpZmllcikuYCxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICByZXR1cm4geyBvazogdHJ1ZSB9O1xyXG59XHJcbiIsICJjb25zdCBIVE1MX0VYVEVOU0lPTlMgPSBbXCIuaHRtXCIsIFwiLmh0bWxcIiwgXCIueGh0bWxcIl07XHJcbmNvbnN0IE1BUktET1dOX0VYVEVOU0lPTlMgPSBbXCIubWRcIiwgXCIubWFya2Rvd25cIiwgXCIubWRvd25cIiwgXCIubWR4XCIsIFwiLm1rZFwiLCBcIi5ta2RuXCJdO1xyXG5jb25zdCBURVhUX0VYVEVOU0lPTlMgPSBbXCIudHh0XCIsIFwiLnRleHRcIl07XHJcbmNvbnN0IFBERl9FWFRFTlNJT05TID0gW1wiLnBkZlwiXTtcclxuY29uc3QgRVBVQl9FWFRFTlNJT05TID0gW1wiLmVwdWJcIl07XHJcbmNvbnN0IElNQUdFX0VYVEVOU0lPTlMgPSBbXCIuYm1wXCIsIFwiLmpwZ1wiLCBcIi5qcGVnXCIsIFwiLnBuZ1wiXTtcclxuY29uc3QgQVJDSElWRV9FWFRFTlNJT05TID0gW1wiLnJhclwiXTtcclxuXHJcbmNvbnN0IEFMTF9FWFRFTlNJT05fR1JPVVBTID0gW1xyXG4gIEhUTUxfRVhURU5TSU9OUyxcclxuICBNQVJLRE9XTl9FWFRFTlNJT05TLFxyXG4gIFRFWFRfRVhURU5TSU9OUyxcclxuICBQREZfRVhURU5TSU9OUyxcclxuICBFUFVCX0VYVEVOU0lPTlMsXHJcbiAgSU1BR0VfRVhURU5TSU9OUyxcclxuICBBUkNISVZFX0VYVEVOU0lPTlMsXHJcbl07XHJcblxyXG5leHBvcnQgY29uc3QgU1VQUE9SVEVEX0VYVEVOU0lPTlMgPSBuZXcgU2V0KFxyXG4gIEFMTF9FWFRFTlNJT05fR1JPVVBTLmZsYXRNYXAoKGdyb3VwKSA9PiBncm91cC5tYXAoKGV4dCkgPT4gZXh0LnRvTG93ZXJDYXNlKCkpKSxcclxuKTtcclxuXHJcbmV4cG9ydCBjb25zdCBIVE1MX0VYVEVOU0lPTl9TRVQgPSBuZXcgU2V0KEhUTUxfRVhURU5TSU9OUyk7XHJcbmV4cG9ydCBjb25zdCBNQVJLRE9XTl9FWFRFTlNJT05fU0VUID0gbmV3IFNldChNQVJLRE9XTl9FWFRFTlNJT05TKTtcclxuZXhwb3J0IGNvbnN0IFRFWFRfRVhURU5TSU9OX1NFVCA9IG5ldyBTZXQoVEVYVF9FWFRFTlNJT05TKTtcclxuZXhwb3J0IGNvbnN0IElNQUdFX0VYVEVOU0lPTl9TRVQgPSBuZXcgU2V0KElNQUdFX0VYVEVOU0lPTlMpO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGlzSHRtbEV4dGVuc2lvbihleHQ6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gIHJldHVybiBIVE1MX0VYVEVOU0lPTl9TRVQuaGFzKGV4dC50b0xvd2VyQ2FzZSgpKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGlzTWFya2Rvd25FeHRlbnNpb24oZXh0OiBzdHJpbmcpOiBib29sZWFuIHtcclxuICByZXR1cm4gTUFSS0RPV05fRVhURU5TSU9OX1NFVC5oYXMoZXh0LnRvTG93ZXJDYXNlKCkpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gaXNQbGFpblRleHRFeHRlbnNpb24oZXh0OiBzdHJpbmcpOiBib29sZWFuIHtcclxuICByZXR1cm4gVEVYVF9FWFRFTlNJT05fU0VULmhhcyhleHQudG9Mb3dlckNhc2UoKSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBpc1RleHR1YWxFeHRlbnNpb24oZXh0OiBzdHJpbmcpOiBib29sZWFuIHtcclxuICByZXR1cm4gaXNNYXJrZG93bkV4dGVuc2lvbihleHQpIHx8IGlzUGxhaW5UZXh0RXh0ZW5zaW9uKGV4dCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBsaXN0U3VwcG9ydGVkRXh0ZW5zaW9ucygpOiBzdHJpbmdbXSB7XHJcbiAgcmV0dXJuIEFycmF5LmZyb20oU1VQUE9SVEVEX0VYVEVOU0lPTlMudmFsdWVzKCkpLnNvcnQoKTtcclxufVxyXG5cclxuXHJcbiIsICJpbXBvcnQgeyBtaW5pbWF0Y2ggfSBmcm9tIFwibWluaW1hdGNoXCI7XHJcblxyXG5jb25zdCBNSU5JTUFUQ0hfT1BUUyA9IHtcclxuICBkb3Q6IHRydWUsXHJcbiAgbWF0Y2hCYXNlOiB0cnVlLFxyXG4gIHdpbmRvd3NQYXRoc05vRXNjYXBlOiB0cnVlLFxyXG59IGFzIGNvbnN0O1xyXG5cclxuLyoqXHJcbiAqIE9uZSBnbG9iIHBhdHRlcm4gcGVyIGxpbmU7IHRyaW07IHNraXAgZW1wdHkgYW5kICMgY29tbWVudHMuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VFeGNsdWRlUGF0dGVybnNCbG9jayh0ZXh0OiBzdHJpbmcpOiBzdHJpbmdbXSB7XHJcbiAgY29uc3Qgb3V0OiBzdHJpbmdbXSA9IFtdO1xyXG4gIGZvciAoY29uc3QgcmF3TGluZSBvZiB0ZXh0LnNwbGl0KC9cXHI/XFxuLykpIHtcclxuICAgIGNvbnN0IGxpbmUgPSByYXdMaW5lLnRyaW0oKTtcclxuICAgIGlmIChsaW5lID09PSBcIlwiIHx8IGxpbmUuc3RhcnRzV2l0aChcIiNcIikpIHtcclxuICAgICAgY29udGludWU7XHJcbiAgICB9XHJcbiAgICBvdXQucHVzaChsaW5lKTtcclxuICB9XHJcbiAgcmV0dXJuIG91dDtcclxufVxyXG5cclxuLyoqIFNlbWljb2xvbi1zZXBhcmF0ZWQgcGF0dGVybnMgZm9yIGVudiB2YXJzIChzaGVsbC1mcmllbmRseSkuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUV4Y2x1ZGVQYXR0ZXJuc0Zyb21FbnYocmF3OiBzdHJpbmcgfCB1bmRlZmluZWQpOiBzdHJpbmdbXSB7XHJcbiAgaWYgKHJhdyA9PT0gdW5kZWZpbmVkIHx8IHJhdy50cmltKCkgPT09IFwiXCIpIHtcclxuICAgIHJldHVybiBbXTtcclxuICB9XHJcbiAgcmV0dXJuIHBhcnNlRXhjbHVkZVBhdHRlcm5zQmxvY2socmF3LnJlcGxhY2UoLzsvZywgXCJcXG5cIikpO1xyXG59XHJcblxyXG4vKiogRmlyc3QgbWF0Y2hpbmcgcGF0dGVybiwgb3IgbnVsbCBpZiBub25lIG1hdGNoLiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hFeGNsdWRlUGF0dGVybihyZWxhdGl2ZVBvc2l4UGF0aDogc3RyaW5nLCBwYXR0ZXJuczogc3RyaW5nW10pOiBzdHJpbmcgfCBudWxsIHtcclxuICBmb3IgKGNvbnN0IHAgb2YgcGF0dGVybnMpIHtcclxuICAgIGlmIChtaW5pbWF0Y2gocmVsYXRpdmVQb3NpeFBhdGgsIHAsIE1JTklNQVRDSF9PUFRTKSkge1xyXG4gICAgICByZXR1cm4gcDtcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIG51bGw7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBpc1JlbGF0aXZlUGF0aEV4Y2x1ZGVkKHJlbGF0aXZlUG9zaXhQYXRoOiBzdHJpbmcsIHBhdHRlcm5zOiBzdHJpbmdbXSk6IGJvb2xlYW4ge1xyXG4gIHJldHVybiBtYXRjaEV4Y2x1ZGVQYXR0ZXJuKHJlbGF0aXZlUG9zaXhQYXRoLCBwYXR0ZXJucykgIT09IG51bGw7XHJcbn1cclxuIiwgImltcG9ydCAqIGFzIGZzIGZyb20gXCJmc1wiO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCAqIGFzIG1pbWUgZnJvbSBcIm1pbWUtdHlwZXNcIjtcclxuaW1wb3J0IHtcclxuICBTVVBQT1JURURfRVhURU5TSU9OUyxcclxuICBsaXN0U3VwcG9ydGVkRXh0ZW5zaW9ucyxcclxufSBmcm9tIFwiLi4vdXRpbHMvc3VwcG9ydGVkRXh0ZW5zaW9uc1wiO1xyXG5pbXBvcnQgeyBtYXRjaEV4Y2x1ZGVQYXR0ZXJuIH0gZnJvbSBcIi4uL3V0aWxzL2ZpbGVFeGNsdWRlUGF0dGVybnNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgU2Nhbm5lZEZpbGUge1xyXG4gIHBhdGg6IHN0cmluZztcclxuICBuYW1lOiBzdHJpbmc7XHJcbiAgZXh0ZW5zaW9uOiBzdHJpbmc7XHJcbiAgbWltZVR5cGU6IHN0cmluZyB8IGZhbHNlO1xyXG4gIHNpemU6IG51bWJlcjtcclxuICBtdGltZTogRGF0ZTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBFeGNsdWRlZEZpbGVJbmZvIHtcclxuICByZWxhdGl2ZVBhdGg6IHN0cmluZztcclxuICBwYXR0ZXJuOiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgU2NhbkRpcmVjdG9yeU9wdGlvbnMge1xyXG4gIGV4Y2x1ZGVQYXR0ZXJucz86IHN0cmluZ1tdO1xyXG4gIG9uRXhjbHVkZWRGaWxlPzogKGluZm86IEV4Y2x1ZGVkRmlsZUluZm8pID0+IHZvaWQ7XHJcbn1cclxuXHJcbi8qKiBOb3JtYWxpemUgYW5kIHZhbGlkYXRlIHRoZSByb290IGRpcmVjdG9yeSBmb3Igc2Nhbm5pbmcgKHJlc29sdmVzIHBhdGgsIHN0cmlwcyB0cmFpbGluZyBzbGFzaGVzKS4gKi9cclxuZnVuY3Rpb24gbm9ybWFsaXplUm9vdERpcihyb290RGlyOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIHJldHVybiBwYXRoLnJlc29sdmUocm9vdERpci50cmltKCkpLnJlcGxhY2UoL1svXFxcXF0rJC8sIFwiXCIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB0b1Bvc2l4UmVsYXRpdmVQYXRoKHJvb3Q6IHN0cmluZywgZnVsbFBhdGg6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgcmV0dXJuIHBhdGgucmVsYXRpdmUocm9vdCwgZnVsbFBhdGgpLnNwbGl0KHBhdGguc2VwKS5qb2luKFwiL1wiKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFJlY3Vyc2l2ZWx5IHNjYW4gYSBkaXJlY3RvcnkgZm9yIHN1cHBvcnRlZCBmaWxlc1xyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNjYW5EaXJlY3RvcnkoXHJcbiAgcm9vdERpcjogc3RyaW5nLFxyXG4gIG9uUHJvZ3Jlc3M/OiAoY3VycmVudDogbnVtYmVyLCB0b3RhbDogbnVtYmVyKSA9PiB2b2lkLFxyXG4gIG9wdGlvbnM/OiBTY2FuRGlyZWN0b3J5T3B0aW9ucyxcclxuKTogUHJvbWlzZTxTY2FubmVkRmlsZVtdPiB7XHJcbiAgY29uc3Qgcm9vdCA9IG5vcm1hbGl6ZVJvb3REaXIocm9vdERpcik7XHJcbiAgY29uc3QgZXhjbHVkZVBhdHRlcm5zID0gb3B0aW9ucz8uZXhjbHVkZVBhdHRlcm5zID8/IFtdO1xyXG4gIGNvbnN0IG9uRXhjbHVkZWRGaWxlID0gb3B0aW9ucz8ub25FeGNsdWRlZEZpbGU7XHJcblxyXG4gIHRyeSB7XHJcbiAgICBhd2FpdCBmcy5wcm9taXNlcy5hY2Nlc3Mocm9vdCwgZnMuY29uc3RhbnRzLlJfT0spO1xyXG4gIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICBpZiAoZXJyPy5jb2RlID09PSBcIkVOT0VOVFwiKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihcclxuICAgICAgICBgRG9jdW1lbnRzIGRpcmVjdG9yeSBkb2VzIG5vdCBleGlzdDogJHtyb290fS4gQ2hlY2sgdGhlIHBhdGggKGUuZy4gc3BlbGxpbmcgYW5kIHRoYXQgdGhlIGZvbGRlciBleGlzdHMpLmAsXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgICB0aHJvdyBlcnI7XHJcbiAgfVxyXG5cclxuICBjb25zdCBmaWxlczogU2Nhbm5lZEZpbGVbXSA9IFtdO1xyXG4gIGxldCBzY2FubmVkQ291bnQgPSAwO1xyXG5cclxuICBjb25zdCBzdXBwb3J0ZWRFeHRlbnNpb25zRGVzY3JpcHRpb24gPSBsaXN0U3VwcG9ydGVkRXh0ZW5zaW9ucygpLmpvaW4oXCIsIFwiKTtcclxuICBjb25zb2xlLmxvZyhgW1NjYW5uZXJdIFN1cHBvcnRlZCBleHRlbnNpb25zOiAke3N1cHBvcnRlZEV4dGVuc2lvbnNEZXNjcmlwdGlvbn1gKTtcclxuXHJcbiAgYXN5bmMgZnVuY3Rpb24gd2FsayhkaXI6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgZW50cmllcyA9IGF3YWl0IGZzLnByb21pc2VzLnJlYWRkaXIoZGlyLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSk7XHJcblxyXG4gICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgICAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGguam9pbihkaXIsIGVudHJ5Lm5hbWUpO1xyXG5cclxuICAgICAgICBpZiAoZW50cnkuaXNEaXJlY3RvcnkoKSkge1xyXG4gICAgICAgICAgYXdhaXQgd2FsayhmdWxsUGF0aCk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChlbnRyeS5pc0ZpbGUoKSkge1xyXG4gICAgICAgICAgc2Nhbm5lZENvdW50Kys7XHJcblxyXG4gICAgICAgICAgY29uc3QgZXh0ID0gcGF0aC5leHRuYW1lKGVudHJ5Lm5hbWUpLnRvTG93ZXJDYXNlKCk7XHJcblxyXG4gICAgICAgICAgaWYgKFNVUFBPUlRFRF9FWFRFTlNJT05TLmhhcyhleHQpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlbGF0aXZlUG9zaXggPSB0b1Bvc2l4UmVsYXRpdmVQYXRoKHJvb3QsIGZ1bGxQYXRoKTtcclxuICAgICAgICAgICAgY29uc3QgbWF0Y2hlZFBhdHRlcm4gPVxyXG4gICAgICAgICAgICAgIGV4Y2x1ZGVQYXR0ZXJucy5sZW5ndGggPiAwID8gbWF0Y2hFeGNsdWRlUGF0dGVybihyZWxhdGl2ZVBvc2l4LCBleGNsdWRlUGF0dGVybnMpIDogbnVsbDtcclxuXHJcbiAgICAgICAgICAgIGlmIChtYXRjaGVkUGF0dGVybiAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgIG9uRXhjbHVkZWRGaWxlPy4oeyByZWxhdGl2ZVBhdGg6IHJlbGF0aXZlUG9zaXgsIHBhdHRlcm46IG1hdGNoZWRQYXR0ZXJuIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIGNvbnN0IHN0YXRzID0gYXdhaXQgZnMucHJvbWlzZXMuc3RhdChmdWxsUGF0aCk7XHJcbiAgICAgICAgICAgICAgY29uc3QgbWltZVR5cGUgPSBtaW1lLmxvb2t1cChmdWxsUGF0aCk7XHJcblxyXG4gICAgICAgICAgICAgIGZpbGVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgcGF0aDogZnVsbFBhdGgsXHJcbiAgICAgICAgICAgICAgICBuYW1lOiBlbnRyeS5uYW1lLFxyXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uOiBleHQsXHJcbiAgICAgICAgICAgICAgICBtaW1lVHlwZSxcclxuICAgICAgICAgICAgICAgIHNpemU6IHN0YXRzLnNpemUsXHJcbiAgICAgICAgICAgICAgICBtdGltZTogc3RhdHMubXRpbWUsXHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBpZiAob25Qcm9ncmVzcyAmJiBzY2FubmVkQ291bnQgJSAxMDAgPT09IDApIHtcclxuICAgICAgICAgICAgb25Qcm9ncmVzcyhzY2FubmVkQ291bnQsIGZpbGVzLmxlbmd0aCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBzY2FubmluZyBkaXJlY3RvcnkgJHtkaXJ9OmAsIGVycm9yKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGF3YWl0IHdhbGsocm9vdCk7XHJcblxyXG4gIGlmIChvblByb2dyZXNzKSB7XHJcbiAgICBvblByb2dyZXNzKHNjYW5uZWRDb3VudCwgZmlsZXMubGVuZ3RoKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBmaWxlcztcclxufVxyXG5cclxuLyoqXHJcbiAqIENoZWNrIGlmIGEgZmlsZSB0eXBlIGlzIHN1cHBvcnRlZFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGlzU3VwcG9ydGVkRmlsZShmaWxlUGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgY29uc3QgZXh0ID0gcGF0aC5leHRuYW1lKGZpbGVQYXRoKS50b0xvd2VyQ2FzZSgpO1xyXG4gIHJldHVybiBTVVBQT1JURURfRVhURU5TSU9OUy5oYXMoZXh0KTtcclxufVxyXG4iLCAiaW1wb3J0ICogYXMgY2hlZXJpbyBmcm9tIFwiY2hlZXJpb1wiO1xyXG5pbXBvcnQgKiBhcyBmcyBmcm9tIFwiZnNcIjtcclxuXHJcbi8qKlxyXG4gKiBQYXJzZSBIVE1ML0hUTSBmaWxlcyBhbmQgZXh0cmFjdCB0ZXh0IGNvbnRlbnRcclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwYXJzZUhUTUwoZmlsZVBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCBmcy5wcm9taXNlcy5yZWFkRmlsZShmaWxlUGF0aCwgXCJ1dGYtOFwiKTtcclxuICAgIGNvbnN0ICQgPSBjaGVlcmlvLmxvYWQoY29udGVudCk7XHJcbiAgICBcclxuICAgIC8vIFJlbW92ZSBzY3JpcHQgYW5kIHN0eWxlIGVsZW1lbnRzXHJcbiAgICAkKFwic2NyaXB0LCBzdHlsZSwgbm9zY3JpcHRcIikucmVtb3ZlKCk7XHJcbiAgICBcclxuICAgIC8vIEV4dHJhY3QgdGV4dFxyXG4gICAgY29uc3QgdGV4dCA9ICQoXCJib2R5XCIpLnRleHQoKSB8fCAkLnRleHQoKTtcclxuICAgIFxyXG4gICAgLy8gQ2xlYW4gdXAgd2hpdGVzcGFjZVxyXG4gICAgcmV0dXJuIHRleHRcclxuICAgICAgLnJlcGxhY2UoL1xccysvZywgXCIgXCIpXHJcbiAgICAgIC5yZXBsYWNlKC9cXG4rL2csIFwiXFxuXCIpXHJcbiAgICAgIC50cmltKCk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIHBhcnNpbmcgSFRNTCBmaWxlICR7ZmlsZVBhdGh9OmAsIGVycm9yKTtcclxuICAgIHJldHVybiBcIlwiO1xyXG4gIH1cclxufVxyXG5cclxuIiwgImltcG9ydCB7IHR5cGUgTE1TdHVkaW9DbGllbnQgfSBmcm9tIFwiQGxtc3R1ZGlvL3Nka1wiO1xyXG5pbXBvcnQgKiBhcyBmcyBmcm9tIFwiZnNcIjtcclxuaW1wb3J0IHBkZlBhcnNlIGZyb20gXCJwZGYtcGFyc2VcIjtcclxuaW1wb3J0IHsgY3JlYXRlV29ya2VyIH0gZnJvbSBcInRlc3NlcmFjdC5qc1wiO1xyXG5cclxuLy8gbXVwZGYgaXMgYW4gRVNNIG1vZHVsZSB3aXRoIHRvcC1sZXZlbCBhd2FpdCBcdTIwMTQgaXQgY2Fubm90IGJlIHJlcXVpcmUoKSdkLlxyXG4vLyBXZSBsb2FkIGl0IGxhemlseSB2aWEgZHluYW1pYyBpbXBvcnQoKSBzbyB0aGUgQ0pTIGhvc3QgZG9lc24ndCBjaG9rZSBvbiBpdC5cclxubGV0IGNhY2hlZE11cGRmOiB0eXBlb2YgaW1wb3J0KFwibXVwZGZcIikgfCBudWxsID0gbnVsbDtcclxuYXN5bmMgZnVuY3Rpb24gZ2V0TXVwZGYoKSB7XHJcbiAgaWYgKCFjYWNoZWRNdXBkZikge1xyXG4gICAgY2FjaGVkTXVwZGYgPSBhd2FpdCBpbXBvcnQoXCJtdXBkZlwiKTtcclxuICB9XHJcbiAgcmV0dXJuIGNhY2hlZE11cGRmO1xyXG59XHJcblxyXG5jb25zdCBNSU5fVEVYVF9MRU5HVEggPSA1MDtcclxuY29uc3QgT0NSX01BWF9QQUdFUyA9IDUwO1xyXG5jb25zdCBPQ1JfREVGQVVMVF9TQ0FMRSA9IDI7IC8vIDE0NCBkcGksIGdvb2QgYmFsYW5jZSBvZiBPQ1IgYWNjdXJhY3kgdnMgbWVtb3J5XHJcbmNvbnN0IE9DUl9NSU5fU0NBTEUgPSAwLjc1OyAvLyBmbG9vciBiZWZvcmUgd2UgZ2l2ZSB1cCBvbiBhIHBhZ2UgaW5zdGVhZCBvZiByaXNraW5nIGEgbmF0aXZlIGNyYXNoXHJcbmNvbnN0IE9DUl9NQVhfUElYTUFQX1BJWEVMUyA9IDUwXzAwMF8wMDA7IC8vIH43MDAweDcwMDA7IHByZXZlbnRzIGxlcHRvbmljYSBwaXhkYXRhX21hbGxvYyBjcmFzaGVzXHJcblxyXG5leHBvcnQgdHlwZSBQZGZGYWlsdXJlUmVhc29uID1cclxuICB8IFwicGRmLmxtc3R1ZGlvLWVycm9yXCJcclxuICB8IFwicGRmLmxtc3R1ZGlvLWVtcHR5XCJcclxuICB8IFwicGRmLnBkZnBhcnNlLWVycm9yXCJcclxuICB8IFwicGRmLnBkZnBhcnNlLWVtcHR5XCJcclxuICB8IFwicGRmLm9jci1kaXNhYmxlZFwiXHJcbiAgfCBcInBkZi5vY3ItZXJyb3JcIlxyXG4gIHwgXCJwZGYub2NyLXJlbmRlci1lcnJvclwiXHJcbiAgfCBcInBkZi5vY3ItZW1wdHlcIjtcclxuXHJcbnR5cGUgUGRmUGFyc2VTdGFnZSA9IFwibG1zdHVkaW9cIiB8IFwicGRmLXBhcnNlXCIgfCBcIm9jclwiO1xyXG5cclxuaW50ZXJmYWNlIFBkZlBhcnNlclN1Y2Nlc3Mge1xyXG4gIHN1Y2Nlc3M6IHRydWU7XHJcbiAgdGV4dDogc3RyaW5nO1xyXG4gIHN0YWdlOiBQZGZQYXJzZVN0YWdlO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFBkZlBhcnNlckZhaWx1cmUge1xyXG4gIHN1Y2Nlc3M6IGZhbHNlO1xyXG4gIHJlYXNvbjogUGRmRmFpbHVyZVJlYXNvbjtcclxuICBkZXRhaWxzPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgdHlwZSBQZGZQYXJzZXJSZXN1bHQgPSBQZGZQYXJzZXJTdWNjZXNzIHwgUGRmUGFyc2VyRmFpbHVyZTtcclxuXHJcbmZ1bmN0aW9uIGNsZWFuVGV4dCh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIHJldHVybiB0ZXh0XHJcbiAgICAucmVwbGFjZSgvXFxzKy9nLCBcIiBcIilcclxuICAgIC5yZXBsYWNlKC9cXG4rL2csIFwiXFxuXCIpXHJcbiAgICAudHJpbSgpO1xyXG59XHJcblxyXG50eXBlIFN0YWdlUmVzdWx0ID0gUGRmUGFyc2VyU3VjY2VzcyB8IFBkZlBhcnNlckZhaWx1cmU7XHJcblxyXG5hc3luYyBmdW5jdGlvbiB0cnlMbVN0dWRpb1BhcnNlcihmaWxlUGF0aDogc3RyaW5nLCBjbGllbnQ6IExNU3R1ZGlvQ2xpZW50KTogUHJvbWlzZTxTdGFnZVJlc3VsdD4ge1xyXG4gIGNvbnN0IG1heFJldHJpZXMgPSAyO1xyXG4gIGNvbnN0IGZpbGVOYW1lID0gZmlsZVBhdGguc3BsaXQoXCIvXCIpLnBvcCgpIHx8IGZpbGVQYXRoO1xyXG5cclxuICBmb3IgKGxldCBhdHRlbXB0ID0gMTsgYXR0ZW1wdCA8PSBtYXhSZXRyaWVzOyBhdHRlbXB0KyspIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGZpbGVIYW5kbGUgPSBhd2FpdCBjbGllbnQuZmlsZXMucHJlcGFyZUZpbGUoZmlsZVBhdGgpO1xyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjbGllbnQuZmlsZXMucGFyc2VEb2N1bWVudChmaWxlSGFuZGxlLCB7XHJcbiAgICAgICAgb25Qcm9ncmVzczogKHByb2dyZXNzKSA9PiB7XHJcbiAgICAgICAgICBpZiAocHJvZ3Jlc3MgPT09IDAgfHwgcHJvZ3Jlc3MgPT09IDEpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXHJcbiAgICAgICAgICAgICAgYFtQREYgUGFyc2VyXSAoTE0gU3R1ZGlvKSBQcm9jZXNzaW5nICR7ZmlsZU5hbWV9OiAkeyhwcm9ncmVzcyAqIDEwMCkudG9GaXhlZCgwKX0lYCxcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IGNsZWFuZWQgPSBjbGVhblRleHQocmVzdWx0LmNvbnRlbnQpO1xyXG4gICAgICBpZiAoY2xlYW5lZC5sZW5ndGggPj0gTUlOX1RFWFRfTEVOR1RIKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgdGV4dDogY2xlYW5lZCwgc3RhZ2U6IFwibG1zdHVkaW9cIiB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhcclxuICAgICAgICBgW1BERiBQYXJzZXJdIChMTSBTdHVkaW8pIFBhcnNlZCBidXQgZ290IHZlcnkgbGl0dGxlIHRleHQgZnJvbSAke2ZpbGVOYW1lfSAobGVuZ3RoPSR7Y2xlYW5lZC5sZW5ndGh9KSwgd2lsbCB0cnkgZmFsbGJhY2tzYCxcclxuICAgICAgKTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICByZWFzb246IFwicGRmLmxtc3R1ZGlvLWVtcHR5XCIsXHJcbiAgICAgICAgZGV0YWlsczogYGxlbmd0aD0ke2NsZWFuZWQubGVuZ3RofWAsXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zdCBpc1dlYlNvY2tldEVycm9yID1cclxuICAgICAgICBlcnJvciBpbnN0YW5jZW9mIEVycm9yICYmXHJcbiAgICAgICAgKGVycm9yLm1lc3NhZ2UuaW5jbHVkZXMoXCJXZWJTb2NrZXRcIikgfHwgZXJyb3IubWVzc2FnZS5pbmNsdWRlcyhcImNvbm5lY3Rpb24gY2xvc2VkXCIpKTtcclxuXHJcbiAgICAgIGlmIChpc1dlYlNvY2tldEVycm9yICYmIGF0dGVtcHQgPCBtYXhSZXRyaWVzKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKFxyXG4gICAgICAgICAgYFtQREYgUGFyc2VyXSAoTE0gU3R1ZGlvKSBXZWJTb2NrZXQgZXJyb3Igb24gJHtmaWxlTmFtZX0sIHJldHJ5aW5nICgke2F0dGVtcHR9LyR7bWF4UmV0cmllc30pLi4uYCxcclxuICAgICAgICApO1xyXG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMDAgKiBhdHRlbXB0KSk7XHJcbiAgICAgICAgY29udGludWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoYFtQREYgUGFyc2VyXSAoTE0gU3R1ZGlvKSBFcnJvciBwYXJzaW5nIFBERiBmaWxlICR7ZmlsZVBhdGh9OmAsIGVycm9yKTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICByZWFzb246IFwicGRmLmxtc3R1ZGlvLWVycm9yXCIsXHJcbiAgICAgICAgZGV0YWlsczogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgcmVhc29uOiBcInBkZi5sbXN0dWRpby1lcnJvclwiLFxyXG4gICAgZGV0YWlsczogXCJFeGNlZWRlZCByZXRyeSBhdHRlbXB0c1wiLFxyXG4gIH07XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHRyeVBkZlBhcnNlKGZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPFN0YWdlUmVzdWx0PiB7XHJcbiAgY29uc3QgZmlsZU5hbWUgPSBmaWxlUGF0aC5zcGxpdChcIi9cIikucG9wKCkgfHwgZmlsZVBhdGg7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGJ1ZmZlciA9IGF3YWl0IGZzLnByb21pc2VzLnJlYWRGaWxlKGZpbGVQYXRoKTtcclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHBkZlBhcnNlKGJ1ZmZlcik7XHJcbiAgICBjb25zdCBjbGVhbmVkID0gY2xlYW5UZXh0KHJlc3VsdC50ZXh0IHx8IFwiXCIpO1xyXG5cclxuICAgIGlmIChjbGVhbmVkLmxlbmd0aCA+PSBNSU5fVEVYVF9MRU5HVEgpIHtcclxuICAgICAgY29uc29sZS5sb2coYFtQREYgUGFyc2VyXSAocGRmLXBhcnNlKSBTdWNjZXNzZnVsbHkgZXh0cmFjdGVkIHRleHQgZnJvbSAke2ZpbGVOYW1lfWApO1xyXG4gICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCB0ZXh0OiBjbGVhbmVkLCBzdGFnZTogXCJwZGYtcGFyc2VcIiB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKFxyXG4gICAgICBgW1BERiBQYXJzZXJdIChwZGYtcGFyc2UpIFZlcnkgbGl0dGxlIG9yIG5vIHRleHQgZXh0cmFjdGVkIGZyb20gJHtmaWxlTmFtZX0gKGxlbmd0aD0ke2NsZWFuZWQubGVuZ3RofSlgLFxyXG4gICAgKTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICByZWFzb246IFwicGRmLnBkZnBhcnNlLWVtcHR5XCIsXHJcbiAgICAgIGRldGFpbHM6IGBsZW5ndGg9JHtjbGVhbmVkLmxlbmd0aH1gLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcihgW1BERiBQYXJzZXJdIChwZGYtcGFyc2UpIEVycm9yIHBhcnNpbmcgUERGIGZpbGUgJHtmaWxlUGF0aH06YCwgZXJyb3IpO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgIHJlYXNvbjogXCJwZGYucGRmcGFyc2UtZXJyb3JcIixcclxuICAgICAgZGV0YWlsczogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpLFxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQaWNrIHRoZSBsYXJnZXN0IHNjYWxlICg8PSBkZXNpcmVkU2NhbGUsID49IE9DUl9NSU5fU0NBTEUsIGluIHN0ZXBzIG9mIDAuMjUpIHdob3NlXHJcbiAqIHJlc3VsdGluZyBwaXhtYXAgc3RheXMgd2l0aGluIE9DUl9NQVhfUElYTUFQX1BJWEVMUy4gUmV0dXJucyBudWxsIGlmIGV2ZW4gdGhlIG1pbmltdW1cclxuICogc2NhbGUgd291bGQgZXhjZWVkIHRoZSBidWRnZXQgKHBhZ2UgaXMgdG9vIGxhcmdlIHRvIHJlbmRlciBzYWZlbHkpLlxyXG4gKi9cclxuZnVuY3Rpb24gY29tcHV0ZVNhZmVPY3JTY2FsZShib3VuZHM6IG51bWJlcltdLCBkZXNpcmVkU2NhbGU6IG51bWJlcik6IG51bWJlciB8IG51bGwge1xyXG4gIGNvbnN0IHdpZHRoID0gYm91bmRzWzJdIC0gYm91bmRzWzBdO1xyXG4gIGNvbnN0IGhlaWdodCA9IGJvdW5kc1szXSAtIGJvdW5kc1sxXTtcclxuICBpZiAoISh3aWR0aCA+IDApIHx8ICEoaGVpZ2h0ID4gMCkpIHtcclxuICAgIHJldHVybiBudWxsO1xyXG4gIH1cclxuXHJcbiAgZm9yIChsZXQgc2NhbGUgPSBkZXNpcmVkU2NhbGU7IHNjYWxlID49IE9DUl9NSU5fU0NBTEU7IHNjYWxlIC09IDAuMjUpIHtcclxuICAgIGNvbnN0IHBpeGVscyA9IHdpZHRoICogc2NhbGUgKiAoaGVpZ2h0ICogc2NhbGUpO1xyXG4gICAgaWYgKHBpeGVscyA8PSBPQ1JfTUFYX1BJWE1BUF9QSVhFTFMpIHtcclxuICAgICAgcmV0dXJuIHNjYWxlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIG51bGw7XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHRyeU9jcldpdGhNdVBkZihmaWxlUGF0aDogc3RyaW5nKTogUHJvbWlzZTxTdGFnZVJlc3VsdD4ge1xyXG4gIGNvbnNvbGUubG9nKFwiW1BERiBQYXJzZXJdIChPQ1IpIFN0YXJ0aW5nIE9DUiBmYWxsYmFjayBmb3JcIiwgZmlsZVBhdGgpO1xyXG4gIGNvbnN0IGZpbGVOYW1lID0gZmlsZVBhdGguc3BsaXQoXCIvXCIpLnBvcCgpIHx8IGZpbGVQYXRoO1xyXG5cclxuICBsZXQgd29ya2VyOiBBd2FpdGVkPFJldHVyblR5cGU8dHlwZW9mIGNyZWF0ZVdvcmtlcj4+IHwgbnVsbCA9IG51bGw7XHJcbiAgbGV0IGRvY0hhbmRsZTogeyBkZXN0cm95KCk6IHZvaWQgfSB8IG51bGwgPSBudWxsO1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBtdXBkZiA9IGF3YWl0IGdldE11cGRmKCk7XHJcbiAgICBjb25zdCBmaWxlQnVmZmVyID0gYXdhaXQgZnMucHJvbWlzZXMucmVhZEZpbGUoZmlsZVBhdGgpO1xyXG5cclxuICAgIGNvbnN0IGRvYyA9IG11cGRmLkRvY3VtZW50Lm9wZW5Eb2N1bWVudChmaWxlQnVmZmVyLCBcImFwcGxpY2F0aW9uL3BkZlwiKTtcclxuICAgIGRvY0hhbmRsZSA9IGRvYztcclxuXHJcbiAgICBjb25zdCBudW1QYWdlcyA9IGRvYy5jb3VudFBhZ2VzKCk7XHJcbiAgICBjb25zdCBtYXhQYWdlcyA9IE1hdGgubWluKG51bVBhZ2VzLCBPQ1JfTUFYX1BBR0VTKTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhcclxuICAgICAgYFtQREYgUGFyc2VyXSAoT0NSKSBTdGFydGluZyBNdVBERiBPQ1IgZm9yICR7ZmlsZU5hbWV9IC0gcGFnZXMgMSB0byAke21heFBhZ2VzfWAsXHJcbiAgICApO1xyXG5cclxuICAgIHdvcmtlciA9IGF3YWl0IGNyZWF0ZVdvcmtlcihcImVuZ1wiKTtcclxuICAgIGNvbnN0IHRleHRQYXJ0czogc3RyaW5nW10gPSBbXTtcclxuICAgIGxldCByZW5kZXJFcnJvcnMgPSAwO1xyXG4gICAgdHlwZSBNdXBkZlBhZ2UgPSBSZXR1cm5UeXBlPHR5cGVvZiBkb2MubG9hZFBhZ2U+O1xyXG4gICAgdHlwZSBNdXBkZlBpeG1hcCA9IFJldHVyblR5cGU8TXVwZGZQYWdlW1widG9QaXhtYXBcIl0+O1xyXG5cclxuICAgIGZvciAobGV0IHBhZ2VOdW0gPSAwOyBwYWdlTnVtIDwgbWF4UGFnZXM7IHBhZ2VOdW0rKykge1xyXG4gICAgICBsZXQgcGFnZTogTXVwZGZQYWdlIHwgbnVsbCA9IG51bGw7XHJcbiAgICAgIGxldCBwaXhtYXA6IE11cGRmUGl4bWFwIHwgbnVsbCA9IG51bGw7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgcGFnZSA9IGRvYy5sb2FkUGFnZShwYWdlTnVtKTtcclxuICAgICAgICBjb25zdCBib3VuZHMgPSBwYWdlLmdldEJvdW5kcygpO1xyXG4gICAgICAgIGNvbnN0IHNjYWxlID0gY29tcHV0ZVNhZmVPY3JTY2FsZShib3VuZHMsIE9DUl9ERUZBVUxUX1NDQUxFKTtcclxuXHJcbiAgICAgICAgaWYgKHNjYWxlID09PSBudWxsKSB7XHJcbiAgICAgICAgICByZW5kZXJFcnJvcnMrKztcclxuICAgICAgICAgIGNvbnNvbGUud2FybihcclxuICAgICAgICAgICAgYFtQREYgUGFyc2VyXSAoT0NSKSBTa2lwcGluZyBvdmVyc2l6ZWQgcGFnZSAke3BhZ2VOdW0gKyAxfSBvZiAke2ZpbGVOYW1lfSBgICtcclxuICAgICAgICAgICAgICBgKGJvdW5kcz0ke2JvdW5kcy5qb2luKFwiLFwiKX0pIHRvIGF2b2lkIGEgbmF0aXZlIGFsbG9jYXRpb24gZmFpbHVyZWAsXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBtYXRyaXggPSBtdXBkZi5NYXRyaXguc2NhbGUoc2NhbGUsIHNjYWxlKTtcclxuICAgICAgICBwaXhtYXAgPSBwYWdlLnRvUGl4bWFwKG1hdHJpeCwgbXVwZGYuQ29sb3JTcGFjZS5EZXZpY2VSR0IsIGZhbHNlLCB0cnVlKTtcclxuICAgICAgICBjb25zdCBwbmdCdWZmZXIgPSBwaXhtYXAuYXNQTkcoKTtcclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgIGNvbnN0IHsgZGF0YTogeyB0ZXh0IH0gfSA9IGF3YWl0IHdvcmtlci5yZWNvZ25pemUoQnVmZmVyLmZyb20ocG5nQnVmZmVyKSk7XHJcbiAgICAgICAgICBjb25zdCBjbGVhbmVkID0gY2xlYW5UZXh0KHRleHQgfHwgXCJcIik7XHJcbiAgICAgICAgICBpZiAoY2xlYW5lZC5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIHRleHRQYXJ0cy5wdXNoKGNsZWFuZWQpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKHJlY29nbml6ZUVycm9yKSB7XHJcbiAgICAgICAgICByZW5kZXJFcnJvcnMrKztcclxuICAgICAgICAgIGNvbnNvbGUud2FybihcclxuICAgICAgICAgICAgYFtQREYgUGFyc2VyXSAoT0NSKSBGYWlsZWQgdG8gcmVjb2duaXplIHBhZ2UgJHtwYWdlTnVtICsgMX0gb2YgJHtmaWxlTmFtZX0sIHJlY3JlYXRpbmcgd29ya2VyOmAsXHJcbiAgICAgICAgICAgIHJlY29nbml6ZUVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyByZWNvZ25pemVFcnJvci5tZXNzYWdlIDogcmVjb2duaXplRXJyb3IsXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgICAgLy8gVGhlIHdvcmtlciBtYXkgaGF2ZSBjcmFzaGVkOyB0cnkgdG8gcmVjcmVhdGUgaXQgZm9yIHJlbWFpbmluZyBwYWdlc1xyXG4gICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgYXdhaXQgd29ya2VyLnRlcm1pbmF0ZSgpO1xyXG4gICAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgIC8vIHdvcmtlciBhbHJlYWR5IGRlYWQsIGlnbm9yZVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgd29ya2VyID0gYXdhaXQgY3JlYXRlV29ya2VyKFwiZW5nXCIpO1xyXG4gICAgICAgICAgfSBjYXRjaCAocmVjcmVhdGVFcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFxyXG4gICAgICAgICAgICAgIGBbUERGIFBhcnNlcl0gKE9DUikgRmFpbGVkIHRvIHJlY3JlYXRlIE9DUiB3b3JrZXIsIGFib3J0aW5nIE9DUiBmb3IgJHtmaWxlTmFtZX1gLFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICB3b3JrZXIgPSBudWxsO1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgIHJlYXNvbjogXCJwZGYub2NyLWVycm9yXCIsXHJcbiAgICAgICAgICAgICAgZGV0YWlsczogYFdvcmtlciBjcmFzaGVkIGFuZCBjb3VsZCBub3QgYmUgcmVjcmVhdGVkOiAke1xyXG4gICAgICAgICAgICAgICAgcmVjcmVhdGVFcnJvciBpbnN0YW5jZW9mIEVycm9yID8gcmVjcmVhdGVFcnJvci5tZXNzYWdlIDogU3RyaW5nKHJlY3JlYXRlRXJyb3IpXHJcbiAgICAgICAgICAgICAgfWAsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocGFnZU51bSA9PT0gMCB8fCAocGFnZU51bSArIDEpICUgMTAgPT09IDAgfHwgcGFnZU51bSArIDEgPT09IG1heFBhZ2VzKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhcclxuICAgICAgICAgICAgYFtQREYgUGFyc2VyXSAoT0NSKSAke2ZpbGVOYW1lfSAtIHByb2Nlc3NlZCBwYWdlICR7cGFnZU51bSArIDF9LyR7bWF4UGFnZXN9IChjaGFycz0ke3RleHRQYXJ0cy5qb2luKFwiXFxuXFxuXCIpLmxlbmd0aH0pYCxcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGNhdGNoIChwYWdlRXJyb3IpIHtcclxuICAgICAgICByZW5kZXJFcnJvcnMrKztcclxuICAgICAgICBjb25zb2xlLmVycm9yKFxyXG4gICAgICAgICAgYFtQREYgUGFyc2VyXSAoT0NSKSBFcnJvciByZW5kZXJpbmcgcGFnZSAke3BhZ2VOdW0gKyAxfSBvZiAke2ZpbGVOYW1lfTpgLFxyXG4gICAgICAgICAgcGFnZUVycm9yLFxyXG4gICAgICAgICk7XHJcbiAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgcGl4bWFwPy5kZXN0cm95KCk7XHJcbiAgICAgICAgcGFnZT8uZGVzdHJveSgpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHdvcmtlcikge1xyXG4gICAgICBhd2FpdCB3b3JrZXIudGVybWluYXRlKCk7XHJcbiAgICAgIHdvcmtlciA9IG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHJlbmRlckVycm9ycyA+IDApIHtcclxuICAgICAgY29uc29sZS53YXJuKFxyXG4gICAgICAgIGBbUERGIFBhcnNlcl0gKE9DUikgJHtmaWxlTmFtZX0gaGFkICR7cmVuZGVyRXJyb3JzfS8ke21heFBhZ2VzfSBwYWdlIHJlbmRlciBlcnJvcnNgLFxyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGZ1bGxUZXh0ID0gY2xlYW5UZXh0KHRleHRQYXJ0cy5qb2luKFwiXFxuXFxuXCIpKTtcclxuICAgIGlmIChmdWxsVGV4dC5sZW5ndGggPj0gTUlOX1RFWFRfTEVOR1RIKSB7XHJcbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIHRleHQ6IGZ1bGxUZXh0LCBzdGFnZTogXCJvY3JcIiB9O1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChyZW5kZXJFcnJvcnMgPiAwKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgcmVhc29uOiBcInBkZi5vY3ItcmVuZGVyLWVycm9yXCIsXHJcbiAgICAgICAgZGV0YWlsczogYCR7cmVuZGVyRXJyb3JzfS8ke21heFBhZ2VzfSBwYWdlIHJlbmRlciBlcnJvcnNgLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICByZWFzb246IFwicGRmLm9jci1lbXB0eVwiLFxyXG4gICAgICBkZXRhaWxzOiBcIk9DUiBwcm9kdWNlZCBpbnN1ZmZpY2llbnQgdGV4dFwiLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcihgW1BERiBQYXJzZXJdIChPQ1IpIEVycm9yIGR1cmluZyBPQ1I6YCwgZXJyb3IpO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgIHJlYXNvbjogXCJwZGYub2NyLWVycm9yXCIsXHJcbiAgICAgIGRldGFpbHM6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSxcclxuICAgIH07XHJcbiAgfSBmaW5hbGx5IHtcclxuICAgIGlmICh3b3JrZXIpIHtcclxuICAgICAgYXdhaXQgd29ya2VyLnRlcm1pbmF0ZSgpO1xyXG4gICAgfVxyXG4gICAgZG9jSGFuZGxlPy5kZXN0cm95KCk7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcGFyc2VQREYoXHJcbiAgZmlsZVBhdGg6IHN0cmluZyxcclxuICBjbGllbnQ6IExNU3R1ZGlvQ2xpZW50LFxyXG4gIGVuYWJsZU9DUjogYm9vbGVhbixcclxuKTogUHJvbWlzZTxQZGZQYXJzZXJSZXN1bHQ+IHtcclxuICBjb25zdCBmaWxlTmFtZSA9IGZpbGVQYXRoLnNwbGl0KFwiL1wiKS5wb3AoKSB8fCBmaWxlUGF0aDtcclxuXHJcbiAgLy8gMSkgTE0gU3R1ZGlvIHBhcnNlclxyXG4gIGNvbnN0IGxtU3R1ZGlvUmVzdWx0ID0gYXdhaXQgdHJ5TG1TdHVkaW9QYXJzZXIoZmlsZVBhdGgsIGNsaWVudCk7XHJcbiAgaWYgKGxtU3R1ZGlvUmVzdWx0LnN1Y2Nlc3MpIHtcclxuICAgIHJldHVybiBsbVN0dWRpb1Jlc3VsdDtcclxuICB9XHJcbiAgbGV0IGxhc3RGYWlsdXJlOiBQZGZQYXJzZXJGYWlsdXJlID0gbG1TdHVkaW9SZXN1bHQ7XHJcblxyXG4gIC8vIDIpIExvY2FsIHBkZi1wYXJzZSBmYWxsYmFja1xyXG4gIGNvbnN0IHBkZlBhcnNlUmVzdWx0ID0gYXdhaXQgdHJ5UGRmUGFyc2UoZmlsZVBhdGgpO1xyXG4gIGlmIChwZGZQYXJzZVJlc3VsdC5zdWNjZXNzKSB7XHJcbiAgICByZXR1cm4gcGRmUGFyc2VSZXN1bHQ7XHJcbiAgfVxyXG4gIGxhc3RGYWlsdXJlID0gcGRmUGFyc2VSZXN1bHQ7XHJcblxyXG4gIC8vIDMpIE9DUiBmYWxsYmFjayAob25seSBpZiBlbmFibGVkKVxyXG4gIGlmICghZW5hYmxlT0NSKSB7XHJcbiAgICBjb25zb2xlLmxvZyhcclxuICAgICAgYFtQREYgUGFyc2VyXSAoT0NSKSBFbmFibGUgT0NSIGlzIG9mZiwgc2tpcHBpbmcgT0NSIGZhbGxiYWNrIGZvciAke2ZpbGVOYW1lfSBhZnRlciBvdGhlciBtZXRob2RzIHJldHVybmVkIG5vIHRleHRgLFxyXG4gICAgKTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICByZWFzb246IFwicGRmLm9jci1kaXNhYmxlZFwiLFxyXG4gICAgICBkZXRhaWxzOiBgUHJldmlvdXMgZmFpbHVyZSByZWFzb246ICR7bGFzdEZhaWx1cmUucmVhc29ufWAsXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgY29uc29sZS5sb2coXHJcbiAgICBgW1BERiBQYXJzZXJdIChPQ1IpIE5vIHRleHQgZXh0cmFjdGVkIGZyb20gJHtmaWxlTmFtZX0gd2l0aCBMTSBTdHVkaW8gb3IgcGRmLXBhcnNlLCBhdHRlbXB0aW5nIE9DUi4uLmAsXHJcbiAgKTtcclxuXHJcbiAgcmV0dXJuIHRyeU9jcldpdGhNdVBkZihmaWxlUGF0aCk7XHJcbn0iLCAiLy8gQHRzLWlnbm9yZSAtIGVwdWIyIGRvZXNuJ3QgaGF2ZSBjb21wbGV0ZSB0eXBlc1xyXG5pbXBvcnQgeyBFUHViIH0gZnJvbSBcImVwdWIyXCI7XHJcblxyXG4vKipcclxuICogUGFyc2UgRVBVQiBmaWxlcyBhbmQgZXh0cmFjdCB0ZXh0IGNvbnRlbnRcclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwYXJzZUVQVUIoZmlsZVBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGVwdWIgPSBuZXcgRVB1YihmaWxlUGF0aCk7XHJcbiAgICAgIFxyXG4gICAgICBlcHViLm9uKFwiZXJyb3JcIiwgKGVycm9yOiBFcnJvcikgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIHBhcnNpbmcgRVBVQiBmaWxlICR7ZmlsZVBhdGh9OmAsIGVycm9yKTtcclxuICAgICAgICByZXNvbHZlKFwiXCIpO1xyXG4gICAgICB9KTtcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IHN0cmlwSHRtbCA9IChpbnB1dDogc3RyaW5nKSA9PlxyXG4gICAgICAgIGlucHV0LnJlcGxhY2UoLzxbXj5dKj4vZywgXCIgXCIpO1xyXG5cclxuICAgICAgY29uc3QgZ2V0TWFuaWZlc3RFbnRyeSA9IChjaGFwdGVySWQ6IHN0cmluZykgPT4ge1xyXG4gICAgICAgIHJldHVybiAoZXB1YiBhcyB1bmtub3duIGFzIHsgbWFuaWZlc3Q/OiBSZWNvcmQ8c3RyaW5nLCB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9PiB9KS5tYW5pZmVzdD8uW2NoYXB0ZXJJZF07XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCBkZWNvZGVNZWRpYVR5cGUgPSAoZW50cnk/OiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9KSA9PlxyXG4gICAgICAgIGVudHJ5Py5bXCJtZWRpYS10eXBlXCJdIHx8IGVudHJ5Py5tZWRpYVR5cGUgfHwgXCJcIjtcclxuXHJcbiAgICAgIGNvbnN0IHNob3VsZFJlYWRSYXcgPSAobWVkaWFUeXBlOiBzdHJpbmcpID0+IHtcclxuICAgICAgICBjb25zdCBub3JtYWxpemVkID0gbWVkaWFUeXBlLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgaWYgKCFub3JtYWxpemVkKSB7XHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChub3JtYWxpemVkID09PSBcImFwcGxpY2F0aW9uL3hodG1sK3htbFwiIHx8IG5vcm1hbGl6ZWQgPT09IFwiaW1hZ2Uvc3ZnK3htbFwiKSB7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAobm9ybWFsaXplZC5zdGFydHNXaXRoKFwidGV4dC9cIikpIHtcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG5vcm1hbGl6ZWQuaW5jbHVkZXMoXCJodG1sXCIpKSB7XHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgcmVhZENoYXB0ZXIgPSBhc3luYyAoY2hhcHRlcklkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4gPT4ge1xyXG4gICAgICAgIGNvbnN0IG1hbmlmZXN0RW50cnkgPSBnZXRNYW5pZmVzdEVudHJ5KGNoYXB0ZXJJZCk7XHJcbiAgICAgICAgaWYgKCFtYW5pZmVzdEVudHJ5KSB7XHJcbiAgICAgICAgICBjb25zb2xlLndhcm4oYEVQVUIgY2hhcHRlciAke2NoYXB0ZXJJZH0gbWlzc2luZyBtYW5pZmVzdCBlbnRyeSBpbiAke2ZpbGVQYXRofSwgc2tpcHBpbmdgKTtcclxuICAgICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbWVkaWFUeXBlID0gZGVjb2RlTWVkaWFUeXBlKG1hbmlmZXN0RW50cnkpO1xyXG4gICAgICAgIGlmIChzaG91bGRSZWFkUmF3KG1lZGlhVHlwZSkpIHtcclxuICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzLCByZWopID0+IHtcclxuICAgICAgICAgICAgZXB1Yi5nZXRGaWxlKFxyXG4gICAgICAgICAgICAgIGNoYXB0ZXJJZCxcclxuICAgICAgICAgICAgICAoZXJyb3I6IEVycm9yIHwgbnVsbCwgZGF0YT86IEJ1ZmZlcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlaihlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcyhcIlwiKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcyhzdHJpcEh0bWwoZGF0YS50b1N0cmluZyhcInV0Zi04XCIpKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlcywgcmVqKSA9PiB7XHJcbiAgICAgICAgICBlcHViLmdldENoYXB0ZXIoXHJcbiAgICAgICAgICAgIGNoYXB0ZXJJZCxcclxuICAgICAgICAgICAgKGVycm9yOiBFcnJvciB8IG51bGwsIHRleHQ/OiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIHJlaihlcnJvcik7XHJcbiAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdGV4dCA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICAgICAgcmVzKHN0cmlwSHRtbCh0ZXh0KSk7XHJcbiAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJlcyhcIlwiKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBlcHViLm9uKFwiZW5kXCIsIGFzeW5jICgpID0+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgY29uc3QgY2hhcHRlcnMgPSBlcHViLmZsb3c7XHJcbiAgICAgICAgICBjb25zdCB0ZXh0UGFydHM6IHN0cmluZ1tdID0gW107XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGZvciAoY29uc3QgY2hhcHRlciBvZiBjaGFwdGVycykge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgIGNvbnN0IGNoYXB0ZXJJZCA9IGNoYXB0ZXIuaWQ7XHJcbiAgICAgICAgICAgICAgaWYgKCFjaGFwdGVySWQpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgRVBVQiBjaGFwdGVyIG1pc3NpbmcgaWQgaW4gJHtmaWxlUGF0aH0sIHNraXBwaW5nYCk7XHJcbiAgICAgICAgICAgICAgICB0ZXh0UGFydHMucHVzaChcIlwiKTtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGF3YWl0IHJlYWRDaGFwdGVyKGNoYXB0ZXJJZCk7XHJcbiAgICAgICAgICAgICAgdGV4dFBhcnRzLnB1c2godGV4dCk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGNoYXB0ZXJFcnJvcikge1xyXG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIHJlYWRpbmcgY2hhcHRlciAke2NoYXB0ZXIuaWR9OmAsIGNoYXB0ZXJFcnJvcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgY29uc3QgZnVsbFRleHQgPSB0ZXh0UGFydHMuam9pbihcIlxcblxcblwiKTtcclxuICAgICAgICAgIHJlc29sdmUoXHJcbiAgICAgICAgICAgIGZ1bGxUZXh0XHJcbiAgICAgICAgICAgICAgLnJlcGxhY2UoL1xccysvZywgXCIgXCIpXHJcbiAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcbisvZywgXCJcXG5cIilcclxuICAgICAgICAgICAgICAudHJpbSgpXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBwcm9jZXNzaW5nIEVQVUIgY2hhcHRlcnM6YCwgZXJyb3IpO1xyXG4gICAgICAgICAgcmVzb2x2ZShcIlwiKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgICBcclxuICAgICAgZXB1Yi5wYXJzZSgpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgaW5pdGlhbGl6aW5nIEVQVUIgcGFyc2VyIGZvciAke2ZpbGVQYXRofTpgLCBlcnJvcik7XHJcbiAgICAgIHJlc29sdmUoXCJcIik7XHJcbiAgICB9XHJcbiAgfSk7XHJcbn1cclxuXHJcbiIsICJpbXBvcnQgeyBjcmVhdGVXb3JrZXIgfSBmcm9tIFwidGVzc2VyYWN0LmpzXCI7XHJcblxyXG4vKipcclxuICogUGFyc2UgaW1hZ2UgZmlsZXMgdXNpbmcgT0NSIChUZXNzZXJhY3QpXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcGFyc2VJbWFnZShmaWxlUGF0aDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3Qgd29ya2VyID0gYXdhaXQgY3JlYXRlV29ya2VyKFwiZW5nXCIpO1xyXG4gICAgXHJcbiAgICBjb25zdCB7IGRhdGE6IHsgdGV4dCB9IH0gPSBhd2FpdCB3b3JrZXIucmVjb2duaXplKGZpbGVQYXRoKTtcclxuICAgIFxyXG4gICAgYXdhaXQgd29ya2VyLnRlcm1pbmF0ZSgpO1xyXG4gICAgXHJcbiAgICByZXR1cm4gdGV4dFxyXG4gICAgICAucmVwbGFjZSgvXFxzKy9nLCBcIiBcIilcclxuICAgICAgLnJlcGxhY2UoL1xcbisvZywgXCJcXG5cIilcclxuICAgICAgLnRyaW0oKTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcihgRXJyb3IgcGFyc2luZyBpbWFnZSBmaWxlICR7ZmlsZVBhdGh9OmAsIGVycm9yKTtcclxuICAgIHJldHVybiBcIlwiO1xyXG4gIH1cclxufVxyXG5cclxuIiwgImltcG9ydCAqIGFzIGZzIGZyb20gXCJmc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBQYXJzZVRleHRPcHRpb25zIHtcclxuICBzdHJpcE1hcmtkb3duPzogYm9vbGVhbjtcclxuICBwcmVzZXJ2ZUxpbmVCcmVha3M/OiBib29sZWFuO1xyXG59XHJcblxyXG4vKipcclxuICogUGFyc2UgcGxhaW4gdGV4dCBmaWxlcyAodHh0LCBtZCBhbmQgcmVsYXRlZCBmb3JtYXRzKVxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHBhcnNlVGV4dChcclxuICBmaWxlUGF0aDogc3RyaW5nLFxyXG4gIG9wdGlvbnM6IFBhcnNlVGV4dE9wdGlvbnMgPSB7fSxcclxuKTogUHJvbWlzZTxzdHJpbmc+IHtcclxuICBjb25zdCB7IHN0cmlwTWFya2Rvd24gPSBmYWxzZSwgcHJlc2VydmVMaW5lQnJlYWtzID0gZmFsc2UgfSA9IG9wdGlvbnM7XHJcblxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgZnMucHJvbWlzZXMucmVhZEZpbGUoZmlsZVBhdGgsIFwidXRmLThcIik7XHJcbiAgICBjb25zdCBub3JtYWxpemVkID0gbm9ybWFsaXplTGluZUVuZGluZ3MoY29udGVudCk7XHJcblxyXG4gICAgY29uc3Qgc3RyaXBwZWQgPSBzdHJpcE1hcmtkb3duID8gc3RyaXBNYXJrZG93blN5bnRheChub3JtYWxpemVkKSA6IG5vcm1hbGl6ZWQ7XHJcblxyXG4gICAgcmV0dXJuIChwcmVzZXJ2ZUxpbmVCcmVha3MgPyBjb2xsYXBzZVdoaXRlc3BhY2VCdXRLZWVwTGluZXMoc3RyaXBwZWQpIDogY29sbGFwc2VXaGl0ZXNwYWNlKHN0cmlwcGVkKSkudHJpbSgpO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKGBFcnJvciBwYXJzaW5nIHRleHQgZmlsZSAke2ZpbGVQYXRofTpgLCBlcnJvcik7XHJcbiAgICByZXR1cm4gXCJcIjtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG5vcm1hbGl6ZUxpbmVFbmRpbmdzKGlucHV0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIHJldHVybiBpbnB1dC5yZXBsYWNlKC9cXHJcXG4/L2csIFwiXFxuXCIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjb2xsYXBzZVdoaXRlc3BhY2UoaW5wdXQ6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgcmV0dXJuIGlucHV0LnJlcGxhY2UoL1xccysvZywgXCIgXCIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjb2xsYXBzZVdoaXRlc3BhY2VCdXRLZWVwTGluZXMoaW5wdXQ6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgcmV0dXJuIChcclxuICAgIGlucHV0XHJcbiAgICAgIC8vIFRyaW0gdHJhaWxpbmcgd2hpdGVzcGFjZSBwZXIgbGluZVxyXG4gICAgICAucmVwbGFjZSgvWyBcXHRdK1xcbi9nLCBcIlxcblwiKVxyXG4gICAgICAvLyBDb2xsYXBzZSBtdWx0aXBsZSBibGFuayBsaW5lcyBidXQga2VlcCBwYXJhZ3JhcGggc2VwYXJhdGlvblxyXG4gICAgICAucmVwbGFjZSgvXFxuezMsfS9nLCBcIlxcblxcblwiKVxyXG4gICAgICAvLyBDb2xsYXBzZSBpbnRlcm5hbCBzcGFjZXMvdGFic1xyXG4gICAgICAucmVwbGFjZSgvWyBcXHRdezIsfS9nLCBcIiBcIilcclxuICApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzdHJpcE1hcmtkb3duU3ludGF4KGlucHV0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIGxldCBvdXRwdXQgPSBpbnB1dDtcclxuXHJcbiAgLy8gUmVtb3ZlIGZlbmNlZCBjb2RlIGJsb2Nrc1xyXG4gIG91dHB1dCA9IG91dHB1dC5yZXBsYWNlKC9gYGBbXFxzXFxTXSo/YGBgL2csIFwiIFwiKTtcclxuICAvLyBSZW1vdmUgaW5saW5lIGNvZGVcclxuICBvdXRwdXQgPSBvdXRwdXQucmVwbGFjZSgvYChbXmBdKylgL2csIFwiJDFcIik7XHJcbiAgLy8gUmVwbGFjZSBpbWFnZXMgd2l0aCBhbHQgdGV4dFxyXG4gIG91dHB1dCA9IG91dHB1dC5yZXBsYWNlKC8hXFxbKFteXFxdXSopXFxdXFwoW14pXSpcXCkvZywgXCIkMSBcIik7XHJcbiAgLy8gUmVwbGFjZSBsaW5rcyB3aXRoIGxpbmsgdGV4dFxyXG4gIG91dHB1dCA9IG91dHB1dC5yZXBsYWNlKC9cXFsoW15cXF1dKylcXF1cXChbXildKlxcKS9nLCBcIiQxXCIpO1xyXG4gIC8vIFJlbW92ZSBlbXBoYXNpcyBtYXJrZXJzXHJcbiAgb3V0cHV0ID0gb3V0cHV0LnJlcGxhY2UoLyhcXCpcXCp8X18pKC4qPylcXDEvZywgXCIkMlwiKTtcclxuICBvdXRwdXQgPSBvdXRwdXQucmVwbGFjZSgvKFxcKnxfKSguKj8pXFwxL2csIFwiJDJcIik7XHJcbiAgLy8gUmVtb3ZlIGhlYWRpbmdzXHJcbiAgb3V0cHV0ID0gb3V0cHV0LnJlcGxhY2UoL15cXHN7MCwzfSN7MSw2fVxccysvZ20sIFwiXCIpO1xyXG4gIC8vIFJlbW92ZSBibG9jayBxdW90ZXNcclxuICBvdXRwdXQgPSBvdXRwdXQucmVwbGFjZSgvXlxcc3swLDN9Plxccz8vZ20sIFwiXCIpO1xyXG4gIC8vIFJlbW92ZSB1bm9yZGVyZWQgbGlzdCBtYXJrZXJzXHJcbiAgb3V0cHV0ID0gb3V0cHV0LnJlcGxhY2UoL15cXHN7MCwzfVstKitdXFxzKy9nbSwgXCJcIik7XHJcbiAgLy8gUmVtb3ZlIG9yZGVyZWQgbGlzdCBtYXJrZXJzXHJcbiAgb3V0cHV0ID0gb3V0cHV0LnJlcGxhY2UoL15cXHN7MCwzfVxcZCtbXFwuXFwpXVxccysvZ20sIFwiXCIpO1xyXG4gIC8vIFJlbW92ZSBob3Jpem9udGFsIHJ1bGVzXHJcbiAgb3V0cHV0ID0gb3V0cHV0LnJlcGxhY2UoL15cXHN7MCwzfShbLSpfXVxccz8pezMsfSQvZ20sIFwiXCIpO1xyXG4gIC8vIFJlbW92ZSByZXNpZHVhbCBIVE1MIHRhZ3NcclxuICBvdXRwdXQgPSBvdXRwdXQucmVwbGFjZSgvPFtePl0rPi9nLCBcIiBcIik7XHJcblxyXG4gIHJldHVybiBvdXRwdXQ7XHJcbn1cclxuXHJcbiIsICJpbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCB7IHBhcnNlSFRNTCB9IGZyb20gXCIuL2h0bWxQYXJzZXJcIjtcclxuaW1wb3J0IHsgcGFyc2VQREYsIHR5cGUgUGRmRmFpbHVyZVJlYXNvbiB9IGZyb20gXCIuL3BkZlBhcnNlclwiO1xyXG5pbXBvcnQgeyBwYXJzZUVQVUIgfSBmcm9tIFwiLi9lcHViUGFyc2VyXCI7XHJcbmltcG9ydCB7IHBhcnNlSW1hZ2UgfSBmcm9tIFwiLi9pbWFnZVBhcnNlclwiO1xyXG5pbXBvcnQgeyBwYXJzZVRleHQgfSBmcm9tIFwiLi90ZXh0UGFyc2VyXCI7XHJcbmltcG9ydCB7IHR5cGUgTE1TdHVkaW9DbGllbnQgfSBmcm9tIFwiQGxtc3R1ZGlvL3Nka1wiO1xyXG5pbXBvcnQge1xyXG4gIElNQUdFX0VYVEVOU0lPTl9TRVQsXHJcbiAgaXNIdG1sRXh0ZW5zaW9uLFxyXG4gIGlzTWFya2Rvd25FeHRlbnNpb24sXHJcbiAgaXNQbGFpblRleHRFeHRlbnNpb24sXHJcbiAgaXNUZXh0dWFsRXh0ZW5zaW9uLFxyXG59IGZyb20gXCIuLi91dGlscy9zdXBwb3J0ZWRFeHRlbnNpb25zXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFBhcnNlZERvY3VtZW50IHtcclxuICB0ZXh0OiBzdHJpbmc7XHJcbiAgbWV0YWRhdGE6IHtcclxuICAgIGZpbGVQYXRoOiBzdHJpbmc7XHJcbiAgICBmaWxlTmFtZTogc3RyaW5nO1xyXG4gICAgZXh0ZW5zaW9uOiBzdHJpbmc7XHJcbiAgICBwYXJzZWRBdDogRGF0ZTtcclxuICB9O1xyXG59XHJcblxyXG5leHBvcnQgdHlwZSBQYXJzZUZhaWx1cmVSZWFzb24gPVxyXG4gIHwgXCJ1bnN1cHBvcnRlZC1leHRlbnNpb25cIlxyXG4gIHwgXCJwZGYubWlzc2luZy1jbGllbnRcIlxyXG4gIHwgUGRmRmFpbHVyZVJlYXNvblxyXG4gIHwgXCJlcHViLmVtcHR5XCJcclxuICB8IFwiaHRtbC5lbXB0eVwiXHJcbiAgfCBcImh0bWwuZXJyb3JcIlxyXG4gIHwgXCJ0ZXh0LmVtcHR5XCJcclxuICB8IFwidGV4dC5lcnJvclwiXHJcbiAgfCBcImltYWdlLm9jci1kaXNhYmxlZFwiXHJcbiAgfCBcImltYWdlLmVtcHR5XCJcclxuICB8IFwiaW1hZ2UuZXJyb3JcIlxyXG4gIHwgXCJwYXJzZXIudW5leHBlY3RlZC1lcnJvclwiO1xyXG5cclxuZXhwb3J0IHR5cGUgRG9jdW1lbnRQYXJzZVJlc3VsdCA9XHJcbiAgfCB7IHN1Y2Nlc3M6IHRydWU7IGRvY3VtZW50OiBQYXJzZWREb2N1bWVudCB9XHJcbiAgfCB7IHN1Y2Nlc3M6IGZhbHNlOyByZWFzb246IFBhcnNlRmFpbHVyZVJlYXNvbjsgZGV0YWlscz86IHN0cmluZyB9O1xyXG5cclxuLyoqXHJcbiAqIFBhcnNlIGEgZG9jdW1lbnQgZmlsZSBiYXNlZCBvbiBpdHMgZXh0ZW5zaW9uXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcGFyc2VEb2N1bWVudChcclxuICBmaWxlUGF0aDogc3RyaW5nLFxyXG4gIGVuYWJsZU9DUjogYm9vbGVhbiA9IGZhbHNlLFxyXG4gIGNsaWVudD86IExNU3R1ZGlvQ2xpZW50LFxyXG4pOiBQcm9taXNlPERvY3VtZW50UGFyc2VSZXN1bHQ+IHtcclxuICBjb25zdCBleHQgPSBwYXRoLmV4dG5hbWUoZmlsZVBhdGgpLnRvTG93ZXJDYXNlKCk7XHJcbiAgY29uc3QgZmlsZU5hbWUgPSBwYXRoLmJhc2VuYW1lKGZpbGVQYXRoKTtcclxuXHJcbiAgY29uc3QgYnVpbGRTdWNjZXNzID0gKHRleHQ6IHN0cmluZyk6IERvY3VtZW50UGFyc2VSZXN1bHQgPT4gKHtcclxuICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICBkb2N1bWVudDoge1xyXG4gICAgICB0ZXh0LFxyXG4gICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgIGZpbGVQYXRoLFxyXG4gICAgICAgIGZpbGVOYW1lLFxyXG4gICAgICAgIGV4dGVuc2lvbjogZXh0LFxyXG4gICAgICAgIHBhcnNlZEF0OiBuZXcgRGF0ZSgpLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9KTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIGlmIChpc0h0bWxFeHRlbnNpb24oZXh0KSkge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IHRleHQgPSBjbGVhbkFuZFZhbGlkYXRlKFxyXG4gICAgICAgICAgYXdhaXQgcGFyc2VIVE1MKGZpbGVQYXRoKSxcclxuICAgICAgICAgIFwiaHRtbC5lbXB0eVwiLFxyXG4gICAgICAgICAgYCR7ZmlsZU5hbWV9IGh0bWxgLFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgcmV0dXJuIHRleHQuc3VjY2VzcyA/IGJ1aWxkU3VjY2Vzcyh0ZXh0LnZhbHVlKSA6IHRleHQ7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihgW1BhcnNlcl1bSFRNTF0gRXJyb3IgcGFyc2luZyAke2ZpbGVQYXRofTpgLCBlcnJvcik7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgcmVhc29uOiBcImh0bWwuZXJyb3JcIixcclxuICAgICAgICAgIGRldGFpbHM6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSxcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGV4dCA9PT0gXCIucGRmXCIpIHtcclxuICAgICAgaWYgKCFjbGllbnQpIHtcclxuICAgICAgICBjb25zb2xlLndhcm4oYFtQYXJzZXJdIE5vIExNIFN0dWRpbyBjbGllbnQgYXZhaWxhYmxlIGZvciBQREYgcGFyc2luZzogJHtmaWxlTmFtZX1gKTtcclxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgcmVhc29uOiBcInBkZi5taXNzaW5nLWNsaWVudFwiIH07XHJcbiAgICAgIH1cclxuICAgICAgY29uc3QgcGRmUmVzdWx0ID0gYXdhaXQgcGFyc2VQREYoZmlsZVBhdGgsIGNsaWVudCwgZW5hYmxlT0NSKTtcclxuICAgICAgaWYgKHBkZlJlc3VsdC5zdWNjZXNzKSB7XHJcbiAgICAgICAgcmV0dXJuIGJ1aWxkU3VjY2VzcyhwZGZSZXN1bHQudGV4dCk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHBkZlJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoZXh0ID09PSBcIi5lcHViXCIpIHtcclxuICAgICAgY29uc3QgdGV4dCA9IGF3YWl0IHBhcnNlRVBVQihmaWxlUGF0aCk7XHJcbiAgICAgIGNvbnN0IGNsZWFuZWQgPSBjbGVhbkFuZFZhbGlkYXRlKHRleHQsIFwiZXB1Yi5lbXB0eVwiLCBmaWxlTmFtZSk7XHJcbiAgICAgIHJldHVybiBjbGVhbmVkLnN1Y2Nlc3MgPyBidWlsZFN1Y2Nlc3MoY2xlYW5lZC52YWx1ZSkgOiBjbGVhbmVkO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChpc1RleHR1YWxFeHRlbnNpb24oZXh0KSkge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IHRleHQgPSBhd2FpdCBwYXJzZVRleHQoZmlsZVBhdGgsIHtcclxuICAgICAgICAgIHN0cmlwTWFya2Rvd246IGlzTWFya2Rvd25FeHRlbnNpb24oZXh0KSxcclxuICAgICAgICAgIHByZXNlcnZlTGluZUJyZWFrczogaXNQbGFpblRleHRFeHRlbnNpb24oZXh0KSxcclxuICAgICAgICB9KTtcclxuICAgICAgICBjb25zdCBjbGVhbmVkID0gY2xlYW5BbmRWYWxpZGF0ZSh0ZXh0LCBcInRleHQuZW1wdHlcIiwgZmlsZU5hbWUpO1xyXG4gICAgICAgIHJldHVybiBjbGVhbmVkLnN1Y2Nlc3MgPyBidWlsZFN1Y2Nlc3MoY2xlYW5lZC52YWx1ZSkgOiBjbGVhbmVkO1xyXG4gICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFtQYXJzZXJdW1RleHRdIEVycm9yIHBhcnNpbmcgJHtmaWxlUGF0aH06YCwgZXJyb3IpO1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgIHJlYXNvbjogXCJ0ZXh0LmVycm9yXCIsXHJcbiAgICAgICAgICBkZXRhaWxzOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvciksXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChJTUFHRV9FWFRFTlNJT05fU0VULmhhcyhleHQpKSB7XHJcbiAgICAgIGlmICghZW5hYmxlT0NSKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYFNraXBwaW5nIGltYWdlIGZpbGUgJHtmaWxlUGF0aH0gKE9DUiBkaXNhYmxlZClgKTtcclxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgcmVhc29uOiBcImltYWdlLm9jci1kaXNhYmxlZFwiIH07XHJcbiAgICAgIH1cclxuICAgICAgdHJ5IHtcclxuICAgICAgICBjb25zdCB0ZXh0ID0gYXdhaXQgcGFyc2VJbWFnZShmaWxlUGF0aCk7XHJcbiAgICAgICAgY29uc3QgY2xlYW5lZCA9IGNsZWFuQW5kVmFsaWRhdGUodGV4dCwgXCJpbWFnZS5lbXB0eVwiLCBmaWxlTmFtZSk7XHJcbiAgICAgICAgcmV0dXJuIGNsZWFuZWQuc3VjY2VzcyA/IGJ1aWxkU3VjY2VzcyhjbGVhbmVkLnZhbHVlKSA6IGNsZWFuZWQ7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihgW1BhcnNlcl1bSW1hZ2VdIEVycm9yIHBhcnNpbmcgJHtmaWxlUGF0aH06YCwgZXJyb3IpO1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgIHJlYXNvbjogXCJpbWFnZS5lcnJvclwiLFxyXG4gICAgICAgICAgZGV0YWlsczogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpLFxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpZiAoZXh0ID09PSBcIi5yYXJcIikge1xyXG4gICAgICBjb25zb2xlLmxvZyhgUkFSIGZpbGVzIG5vdCB5ZXQgc3VwcG9ydGVkOiAke2ZpbGVQYXRofWApO1xyXG4gICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgcmVhc29uOiBcInVuc3VwcG9ydGVkLWV4dGVuc2lvblwiLCBkZXRhaWxzOiBcIi5yYXJcIiB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKGBVbnN1cHBvcnRlZCBmaWxlIHR5cGU6ICR7ZmlsZVBhdGh9YCk7XHJcbiAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgcmVhc29uOiBcInVuc3VwcG9ydGVkLWV4dGVuc2lvblwiLCBkZXRhaWxzOiBleHQgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcihgRXJyb3IgcGFyc2luZyBkb2N1bWVudCAke2ZpbGVQYXRofTpgLCBlcnJvcik7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgcmVhc29uOiBcInBhcnNlci51bmV4cGVjdGVkLWVycm9yXCIsXHJcbiAgICAgIGRldGFpbHM6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSxcclxuICAgIH07XHJcbiAgfVxyXG59XHJcblxyXG50eXBlIENsZWFuUmVzdWx0ID1cclxuICB8IHsgc3VjY2VzczogdHJ1ZTsgdmFsdWU6IHN0cmluZyB9XHJcbiAgfCB7IHN1Y2Nlc3M6IGZhbHNlOyByZWFzb246IFBhcnNlRmFpbHVyZVJlYXNvbjsgZGV0YWlscz86IHN0cmluZyB9O1xyXG5cclxuZnVuY3Rpb24gY2xlYW5BbmRWYWxpZGF0ZShcclxuICB0ZXh0OiBzdHJpbmcsXHJcbiAgZW1wdHlSZWFzb246IFBhcnNlRmFpbHVyZVJlYXNvbixcclxuICBkZXRhaWxzQ29udGV4dD86IHN0cmluZyxcclxuKTogQ2xlYW5SZXN1bHQge1xyXG4gIGNvbnN0IGNsZWFuZWQgPSB0ZXh0Py50cmltKCkgPz8gXCJcIjtcclxuICBpZiAoY2xlYW5lZC5sZW5ndGggPT09IDApIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICByZWFzb246IGVtcHR5UmVhc29uLFxyXG4gICAgICBkZXRhaWxzOiBkZXRhaWxzQ29udGV4dCA/IGAke2RldGFpbHNDb250ZXh0fSB0cmltbWVkIHRvIHplcm8gbGVuZ3RoYCA6IHVuZGVmaW5lZCxcclxuICAgIH07XHJcbiAgfVxyXG4gIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIHZhbHVlOiBjbGVhbmVkIH07XHJcbn1cclxuXHJcbiIsICIvKipcclxuICogU2ltcGxlIHRleHQgY2h1bmtlciB0aGF0IHNwbGl0cyB0ZXh0IGludG8gb3ZlcmxhcHBpbmcgY2h1bmtzXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY2h1bmtUZXh0KFxyXG4gIHRleHQ6IHN0cmluZyxcclxuICBjaHVua1NpemU6IG51bWJlcixcclxuICBvdmVybGFwOiBudW1iZXIsXHJcbik6IEFycmF5PHsgdGV4dDogc3RyaW5nOyBzdGFydEluZGV4OiBudW1iZXI7IGVuZEluZGV4OiBudW1iZXIgfT4ge1xyXG4gIGNvbnN0IGNodW5rczogQXJyYXk8eyB0ZXh0OiBzdHJpbmc7IHN0YXJ0SW5kZXg6IG51bWJlcjsgZW5kSW5kZXg6IG51bWJlciB9PiA9IFtdO1xyXG4gIFxyXG4gIC8vIFNpbXBsZSB3b3JkLWJhc2VkIGNodW5raW5nXHJcbiAgY29uc3Qgd29yZHMgPSB0ZXh0LnNwbGl0KC9cXHMrLyk7XHJcbiAgXHJcbiAgaWYgKHdvcmRzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgcmV0dXJuIGNodW5rcztcclxuICB9XHJcbiAgXHJcbiAgbGV0IHN0YXJ0SWR4ID0gMDtcclxuICBcclxuICB3aGlsZSAoc3RhcnRJZHggPCB3b3Jkcy5sZW5ndGgpIHtcclxuICAgIGNvbnN0IGVuZElkeCA9IE1hdGgubWluKHN0YXJ0SWR4ICsgY2h1bmtTaXplLCB3b3Jkcy5sZW5ndGgpO1xyXG4gICAgY29uc3QgY2h1bmtXb3JkcyA9IHdvcmRzLnNsaWNlKHN0YXJ0SWR4LCBlbmRJZHgpO1xyXG4gICAgY29uc3QgY2h1bmtUZXh0ID0gY2h1bmtXb3Jkcy5qb2luKFwiIFwiKTtcclxuICAgIFxyXG4gICAgY2h1bmtzLnB1c2goe1xyXG4gICAgICB0ZXh0OiBjaHVua1RleHQsXHJcbiAgICAgIHN0YXJ0SW5kZXg6IHN0YXJ0SWR4LFxyXG4gICAgICBlbmRJbmRleDogZW5kSWR4LFxyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIC8vIE1vdmUgZm9yd2FyZCBieSAoY2h1bmtTaXplIC0gb3ZlcmxhcCkgdG8gY3JlYXRlIG92ZXJsYXBwaW5nIGNodW5rc1xyXG4gICAgc3RhcnRJZHggKz0gTWF0aC5tYXgoMSwgY2h1bmtTaXplIC0gb3ZlcmxhcCk7XHJcbiAgICBcclxuICAgIC8vIEJyZWFrIGlmIHdlJ3ZlIHJlYWNoZWQgdGhlIGVuZFxyXG4gICAgaWYgKGVuZElkeCA+PSB3b3Jkcy5sZW5ndGgpIHtcclxuICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgfVxyXG4gIFxyXG4gIHJldHVybiBjaHVua3M7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBFc3RpbWF0ZSB0b2tlbiBjb3VudCAocm91Z2ggYXBwcm94aW1hdGlvbjogMSB0b2tlbiBcdTIyNDggNCBjaGFyYWN0ZXJzKVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGVzdGltYXRlVG9rZW5Db3VudCh0ZXh0OiBzdHJpbmcpOiBudW1iZXIge1xyXG4gIHJldHVybiBNYXRoLmNlaWwodGV4dC5sZW5ndGggLyA0KTtcclxufVxyXG5cclxuIiwgImltcG9ydCAqIGFzIGNyeXB0byBmcm9tIFwiY3J5cHRvXCI7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gXCJmc1wiO1xyXG5cclxuLyoqXHJcbiAqIENhbGN1bGF0ZSBTSEEtMjU2IGhhc2ggb2YgYSBmaWxlIGZvciBjaGFuZ2UgZGV0ZWN0aW9uXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2FsY3VsYXRlRmlsZUhhc2goZmlsZVBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgIGNvbnN0IGhhc2ggPSBjcnlwdG8uY3JlYXRlSGFzaChcInNoYTI1NlwiKTtcclxuICAgIGNvbnN0IHN0cmVhbSA9IGZzLmNyZWF0ZVJlYWRTdHJlYW0oZmlsZVBhdGgpO1xyXG4gICAgXHJcbiAgICBzdHJlYW0ub24oXCJkYXRhXCIsIChkYXRhKSA9PiBoYXNoLnVwZGF0ZShkYXRhKSk7XHJcbiAgICBzdHJlYW0ub24oXCJlbmRcIiwgKCkgPT4gcmVzb2x2ZShoYXNoLmRpZ2VzdChcImhleFwiKSkpO1xyXG4gICAgc3RyZWFtLm9uKFwiZXJyb3JcIiwgcmVqZWN0KTtcclxuICB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCBmaWxlIG1ldGFkYXRhIGluY2x1ZGluZyBzaXplIGFuZCBtb2RpZmljYXRpb24gdGltZVxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEZpbGVNZXRhZGF0YShmaWxlUGF0aDogc3RyaW5nKTogUHJvbWlzZTx7XHJcbiAgc2l6ZTogbnVtYmVyO1xyXG4gIG10aW1lOiBEYXRlO1xyXG4gIGhhc2g6IHN0cmluZztcclxufT4ge1xyXG4gIGNvbnN0IHN0YXRzID0gYXdhaXQgZnMucHJvbWlzZXMuc3RhdChmaWxlUGF0aCk7XHJcbiAgY29uc3QgaGFzaCA9IGF3YWl0IGNhbGN1bGF0ZUZpbGVIYXNoKGZpbGVQYXRoKTtcclxuICBcclxuICByZXR1cm4ge1xyXG4gICAgc2l6ZTogc3RhdHMuc2l6ZSxcclxuICAgIG10aW1lOiBzdGF0cy5tdGltZSxcclxuICAgIGhhc2gsXHJcbiAgfTtcclxufVxyXG5cclxuIiwgImltcG9ydCAqIGFzIGZzIGZyb20gXCJmcy9wcm9taXNlc1wiO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XHJcblxyXG5pbnRlcmZhY2UgRmFpbGVkRmlsZUVudHJ5IHtcclxuICBmaWxlSGFzaDogc3RyaW5nO1xyXG4gIHJlYXNvbjogc3RyaW5nO1xyXG4gIHRpbWVzdGFtcDogc3RyaW5nO1xyXG59XHJcblxyXG4vKipcclxuICogVHJhY2tzIGZpbGVzIHRoYXQgZmFpbGVkIGluZGV4aW5nIGZvciBhIGdpdmVuIGhhc2ggc28gd2UgY2FuIHNraXAgdGhlbVxyXG4gKiB3aGVuIGF1dG8tcmVpbmRleGluZyB1bmNoYW5nZWQgZGF0YS5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBGYWlsZWRGaWxlUmVnaXN0cnkge1xyXG4gIHByaXZhdGUgbG9hZGVkID0gZmFsc2U7XHJcbiAgcHJpdmF0ZSBlbnRyaWVzOiBSZWNvcmQ8c3RyaW5nLCBGYWlsZWRGaWxlRW50cnk+ID0ge307XHJcbiAgcHJpdmF0ZSBxdWV1ZTogUHJvbWlzZTx2b2lkPiA9IFByb21pc2UucmVzb2x2ZSgpO1xyXG5cclxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHJlZ2lzdHJ5UGF0aDogc3RyaW5nKSB7fVxyXG5cclxuICBwcml2YXRlIGFzeW5jIGxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZiAodGhpcy5sb2FkZWQpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IGZzLnJlYWRGaWxlKHRoaXMucmVnaXN0cnlQYXRoLCBcInV0Zi04XCIpO1xyXG4gICAgICB0aGlzLmVudHJpZXMgPSBKU09OLnBhcnNlKGRhdGEpID8/IHt9O1xyXG4gICAgfSBjYXRjaCB7XHJcbiAgICAgIHRoaXMuZW50cmllcyA9IHt9O1xyXG4gICAgfVxyXG4gICAgdGhpcy5sb2FkZWQgPSB0cnVlO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBwZXJzaXN0KCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgZnMubWtkaXIocGF0aC5kaXJuYW1lKHRoaXMucmVnaXN0cnlQYXRoKSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XHJcbiAgICBhd2FpdCBmcy53cml0ZUZpbGUodGhpcy5yZWdpc3RyeVBhdGgsIEpTT04uc3RyaW5naWZ5KHRoaXMuZW50cmllcywgbnVsbCwgMiksIFwidXRmLThcIik7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHJ1bkV4Y2x1c2l2ZTxUPihvcGVyYXRpb246ICgpID0+IFByb21pc2U8VD4pOiBQcm9taXNlPFQ+IHtcclxuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMucXVldWUudGhlbihvcGVyYXRpb24pO1xyXG4gICAgdGhpcy5xdWV1ZSA9IHJlc3VsdC50aGVuKFxyXG4gICAgICAoKSA9PiB7fSxcclxuICAgICAgKCkgPT4ge30sXHJcbiAgICApO1xyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9XHJcblxyXG4gIGFzeW5jIHJlY29yZEZhaWx1cmUoZmlsZVBhdGg6IHN0cmluZywgZmlsZUhhc2g6IHN0cmluZywgcmVhc29uOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHJldHVybiB0aGlzLnJ1bkV4Y2x1c2l2ZShhc3luYyAoKSA9PiB7XHJcbiAgICAgIGF3YWl0IHRoaXMubG9hZCgpO1xyXG4gICAgICB0aGlzLmVudHJpZXNbZmlsZVBhdGhdID0ge1xyXG4gICAgICAgIGZpbGVIYXNoLFxyXG4gICAgICAgIHJlYXNvbixcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgfTtcclxuICAgICAgYXdhaXQgdGhpcy5wZXJzaXN0KCk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGFzeW5jIGNsZWFyRmFpbHVyZShmaWxlUGF0aDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICByZXR1cm4gdGhpcy5ydW5FeGNsdXNpdmUoYXN5bmMgKCkgPT4ge1xyXG4gICAgICBhd2FpdCB0aGlzLmxvYWQoKTtcclxuICAgICAgaWYgKHRoaXMuZW50cmllc1tmaWxlUGF0aF0pIHtcclxuICAgICAgICBkZWxldGUgdGhpcy5lbnRyaWVzW2ZpbGVQYXRoXTtcclxuICAgICAgICBhd2FpdCB0aGlzLnBlcnNpc3QoKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBhc3luYyBnZXRGYWlsdXJlUmVhc29uKGZpbGVQYXRoOiBzdHJpbmcsIGZpbGVIYXNoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZyB8IHVuZGVmaW5lZD4ge1xyXG4gICAgYXdhaXQgdGhpcy5sb2FkKCk7XHJcbiAgICBjb25zdCBlbnRyeSA9IHRoaXMuZW50cmllc1tmaWxlUGF0aF07XHJcbiAgICBpZiAoIWVudHJ5KSB7XHJcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZW50cnkuZmlsZUhhc2ggPT09IGZpbGVIYXNoID8gZW50cnkucmVhc29uIDogdW5kZWZpbmVkO1xyXG4gIH1cclxufVxyXG5cclxuIiwgImltcG9ydCBQUXVldWUgZnJvbSBcInAtcXVldWVcIjtcclxuaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzXCI7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgc2NhbkRpcmVjdG9yeSwgdHlwZSBTY2FubmVkRmlsZSwgdHlwZSBFeGNsdWRlZEZpbGVJbmZvIH0gZnJvbSBcIi4vZmlsZVNjYW5uZXJcIjtcclxuaW1wb3J0IHsgcGFyc2VEb2N1bWVudCwgdHlwZSBQYXJzZUZhaWx1cmVSZWFzb24gfSBmcm9tIFwiLi4vcGFyc2Vycy9kb2N1bWVudFBhcnNlclwiO1xyXG5pbXBvcnQgeyBWZWN0b3JTdG9yZSwgdHlwZSBEb2N1bWVudENodW5rIH0gZnJvbSBcIi4uL3ZlY3RvcnN0b3JlL3ZlY3RvclN0b3JlXCI7XHJcbmltcG9ydCB7IGNodW5rVGV4dCB9IGZyb20gXCIuLi91dGlscy90ZXh0Q2h1bmtlclwiO1xyXG5pbXBvcnQgeyBjYWxjdWxhdGVGaWxlSGFzaCB9IGZyb20gXCIuLi91dGlscy9maWxlSGFzaFwiO1xyXG5pbXBvcnQgeyB0eXBlIEVtYmVkZGluZ0R5bmFtaWNIYW5kbGUsIHR5cGUgTE1TdHVkaW9DbGllbnQgfSBmcm9tIFwiQGxtc3R1ZGlvL3Nka1wiO1xyXG5pbXBvcnQgeyBGYWlsZWRGaWxlUmVnaXN0cnkgfSBmcm9tIFwiLi4vdXRpbHMvZmFpbGVkRmlsZVJlZ2lzdHJ5XCI7XHJcbmltcG9ydCB7IGNvZXJjZUVtYmVkZGluZ1ZlY3RvciB9IGZyb20gXCIuLi91dGlscy9jb2VyY2VFbWJlZGRpbmdcIjtcclxuXHJcbmNvbnN0IEVYQ0xVREVfUFJPR1JFU1NfVEhST1RUTEUgPSA0MDtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSW5kZXhpbmdQcm9ncmVzcyB7XHJcbiAgdG90YWxGaWxlczogbnVtYmVyO1xyXG4gIHByb2Nlc3NlZEZpbGVzOiBudW1iZXI7XHJcbiAgY3VycmVudEZpbGU6IHN0cmluZztcclxuICBzdGF0dXM6IFwic2Nhbm5pbmdcIiB8IFwiaW5kZXhpbmdcIiB8IFwiY29tcGxldGVcIiB8IFwiZXJyb3JcIjtcclxuICBzdWNjZXNzZnVsRmlsZXM/OiBudW1iZXI7XHJcbiAgZmFpbGVkRmlsZXM/OiBudW1iZXI7XHJcbiAgc2tpcHBlZEZpbGVzPzogbnVtYmVyO1xyXG4gIGVycm9yPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEluZGV4aW5nUmVzdWx0IHtcclxuICB0b3RhbEZpbGVzOiBudW1iZXI7XHJcbiAgc3VjY2Vzc2Z1bEZpbGVzOiBudW1iZXI7XHJcbiAgZmFpbGVkRmlsZXM6IG51bWJlcjtcclxuICBza2lwcGVkRmlsZXM6IG51bWJlcjtcclxuICB1cGRhdGVkRmlsZXM6IG51bWJlcjtcclxuICBuZXdGaWxlczogbnVtYmVyO1xyXG59XHJcblxyXG50eXBlIEZpbGVJbmRleE91dGNvbWUgPVxyXG4gIHwgeyB0eXBlOiBcInNraXBwZWRcIiB9XHJcbiAgfCB7IHR5cGU6IFwiaW5kZXhlZFwiOyBjaGFuZ2VUeXBlOiBcIm5ld1wiIHwgXCJ1cGRhdGVkXCIgfVxyXG4gIHwgeyB0eXBlOiBcImZhaWxlZFwiIH07XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEluZGV4aW5nT3B0aW9ucyB7XHJcbiAgZG9jdW1lbnRzRGlyOiBzdHJpbmc7XHJcbiAgdmVjdG9yU3RvcmU6IFZlY3RvclN0b3JlO1xyXG4gIHZlY3RvclN0b3JlRGlyOiBzdHJpbmc7XHJcbiAgZW1iZWRkaW5nTW9kZWw6IEVtYmVkZGluZ0R5bmFtaWNIYW5kbGU7XHJcbiAgY2xpZW50OiBMTVN0dWRpb0NsaWVudDtcclxuICBjaHVua1NpemU6IG51bWJlcjtcclxuICBjaHVua092ZXJsYXA6IG51bWJlcjtcclxuICBtYXhDb25jdXJyZW50OiBudW1iZXI7XHJcbiAgZW5hYmxlT0NSOiBib29sZWFuO1xyXG4gIGF1dG9SZWluZGV4OiBib29sZWFuO1xyXG4gIHBhcnNlRGVsYXlNczogbnVtYmVyO1xyXG4gIGZhaWx1cmVSZXBvcnRQYXRoPzogc3RyaW5nO1xyXG4gIC8qKiBHbG9iIHBhdHRlcm5zIChyZWxhdGl2ZSB0byBkb2N1bWVudHMgZGlyKTsgbWF0Y2hlZCBzdXBwb3J0ZWQgZmlsZXMgYXJlIHNraXBwZWQgYmVmb3JlIHBhcnNpbmcuICovXHJcbiAgZXhjbHVkZVBhdHRlcm5zPzogc3RyaW5nW107XHJcbiAgYWJvcnRTaWduYWw/OiBBYm9ydFNpZ25hbDtcclxuICBvblByb2dyZXNzPzogKHByb2dyZXNzOiBJbmRleGluZ1Byb2dyZXNzKSA9PiB2b2lkO1xyXG59XHJcblxyXG50eXBlIEZhaWx1cmVSZWFzb24gPSBQYXJzZUZhaWx1cmVSZWFzb24gfCBcImluZGV4LmNodW5rLWVtcHR5XCIgfCBcImluZGV4LnZlY3Rvci1hZGQtZXJyb3JcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBJbmRleE1hbmFnZXIge1xyXG4gIHByaXZhdGUgcXVldWU6IFBRdWV1ZTtcclxuICBwcml2YXRlIG9wdGlvbnM6IEluZGV4aW5nT3B0aW9ucztcclxuICBwcml2YXRlIGZhaWx1cmVSZWFzb25Db3VudHM6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7fTtcclxuICBwcml2YXRlIGZhaWxlZEZpbGVSZWdpc3RyeTogRmFpbGVkRmlsZVJlZ2lzdHJ5O1xyXG5cclxuICBjb25zdHJ1Y3RvcihvcHRpb25zOiBJbmRleGluZ09wdGlvbnMpIHtcclxuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XHJcbiAgICB0aGlzLnF1ZXVlID0gbmV3IFBRdWV1ZSh7IGNvbmN1cnJlbmN5OiBvcHRpb25zLm1heENvbmN1cnJlbnQgfSk7XHJcbiAgICB0aGlzLmZhaWxlZEZpbGVSZWdpc3RyeSA9IG5ldyBGYWlsZWRGaWxlUmVnaXN0cnkoXHJcbiAgICAgIHBhdGguam9pbihvcHRpb25zLnZlY3RvclN0b3JlRGlyLCBcIi5iaWctcmFnLWZhaWx1cmVzLmpzb25cIiksXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU3RhcnQgdGhlIGluZGV4aW5nIHByb2Nlc3NcclxuICAgKi9cclxuICBhc3luYyBpbmRleCgpOiBQcm9taXNlPEluZGV4aW5nUmVzdWx0PiB7XHJcbiAgICBjb25zdCB7IGRvY3VtZW50c0RpciwgdmVjdG9yU3RvcmUsIG9uUHJvZ3Jlc3MgfSA9IHRoaXMub3B0aW9ucztcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBmaWxlSW52ZW50b3J5ID0gYXdhaXQgdmVjdG9yU3RvcmUuZ2V0RmlsZUhhc2hJbnZlbnRvcnkoKTtcclxuXHJcbiAgICAgIC8vIFN0ZXAgMTogU2NhbiBkaXJlY3RvcnlcclxuICAgICAgaWYgKG9uUHJvZ3Jlc3MpIHtcclxuICAgICAgICBvblByb2dyZXNzKHtcclxuICAgICAgICAgIHRvdGFsRmlsZXM6IDAsXHJcbiAgICAgICAgICBwcm9jZXNzZWRGaWxlczogMCxcclxuICAgICAgICAgIGN1cnJlbnRGaWxlOiBcIlwiLFxyXG4gICAgICAgICAgc3RhdHVzOiBcInNjYW5uaW5nXCIsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IGV4Y2x1ZGVQYXR0ZXJucyA9IHRoaXMub3B0aW9ucy5leGNsdWRlUGF0dGVybnMgPz8gW107XHJcbiAgICAgIGxldCBleGNsdWRlZEJ5UGF0dGVybiA9IDA7XHJcbiAgICAgIGxldCBsYXN0RXhjbHVkZVByb2dyZXNzRW1pdHRlZEF0ID0gMDtcclxuICAgICAgbGV0IGxhc3RFeGNsdWRlZFJlbGF0aXZlID0gXCJcIjtcclxuXHJcbiAgICAgIGNvbnN0IG9uRXhjbHVkZWRGaWxlOiAoKGluZm86IEV4Y2x1ZGVkRmlsZUluZm8pID0+IHZvaWQpIHwgdW5kZWZpbmVkID1cclxuICAgICAgICBleGNsdWRlUGF0dGVybnMubGVuZ3RoID4gMFxyXG4gICAgICAgICAgPyAoaW5mbzogRXhjbHVkZWRGaWxlSW5mbykgPT4ge1xyXG4gICAgICAgICAgICAgIGV4Y2x1ZGVkQnlQYXR0ZXJuKys7XHJcbiAgICAgICAgICAgICAgbGFzdEV4Y2x1ZGVkUmVsYXRpdmUgPSBpbmZvLnJlbGF0aXZlUGF0aDtcclxuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcclxuICAgICAgICAgICAgICAgIGBFeGNsdWRlZCBmcm9tIGluZGV4aW5nIChleGNsdWRlIHBhdHRlcm4pOiAke2luZm8ucmVsYXRpdmVQYXRofSAobWF0Y2hlZDogJHtpbmZvLnBhdHRlcm59KWAsXHJcbiAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICBpZiAoIW9uUHJvZ3Jlc3MpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICAgICAgZXhjbHVkZWRCeVBhdHRlcm4gPT09IDEgfHxcclxuICAgICAgICAgICAgICAgIGV4Y2x1ZGVkQnlQYXR0ZXJuIC0gbGFzdEV4Y2x1ZGVQcm9ncmVzc0VtaXR0ZWRBdCA+PSBFWENMVURFX1BST0dSRVNTX1RIUk9UVExFXHJcbiAgICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICBsYXN0RXhjbHVkZVByb2dyZXNzRW1pdHRlZEF0ID0gZXhjbHVkZWRCeVBhdHRlcm47XHJcbiAgICAgICAgICAgICAgICBvblByb2dyZXNzKHtcclxuICAgICAgICAgICAgICAgICAgdG90YWxGaWxlczogMCxcclxuICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkRmlsZXM6IDAsXHJcbiAgICAgICAgICAgICAgICAgIGN1cnJlbnRGaWxlOiBgRXhjbHVkZWQgJHtleGNsdWRlZEJ5UGF0dGVybn0gYnkgcGF0dGVybiAobGF0ZXN0OiAke2xhc3RFeGNsdWRlZFJlbGF0aXZlfSlgLFxyXG4gICAgICAgICAgICAgICAgICBzdGF0dXM6IFwic2Nhbm5pbmdcIixcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgOiB1bmRlZmluZWQ7XHJcblxyXG4gICAgICBjb25zdCBmaWxlcyA9IGF3YWl0IHNjYW5EaXJlY3RvcnkoXHJcbiAgICAgICAgZG9jdW1lbnRzRGlyLFxyXG4gICAgICAgIChzY2FubmVkLCBmb3VuZCkgPT4ge1xyXG4gICAgICAgICAgaWYgKG9uUHJvZ3Jlc3MpIHtcclxuICAgICAgICAgICAgb25Qcm9ncmVzcyh7XHJcbiAgICAgICAgICAgICAgdG90YWxGaWxlczogZm91bmQsXHJcbiAgICAgICAgICAgICAgcHJvY2Vzc2VkRmlsZXM6IDAsXHJcbiAgICAgICAgICAgICAgY3VycmVudEZpbGU6IGBTY2FubmVkICR7c2Nhbm5lZH0gZmlsZXMuLi5gLFxyXG4gICAgICAgICAgICAgIHN0YXR1czogXCJzY2FubmluZ1wiLFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGV4Y2x1ZGVQYXR0ZXJucyxcclxuICAgICAgICAgIG9uRXhjbHVkZWRGaWxlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBpZiAoXHJcbiAgICAgICAgb25Qcm9ncmVzcyAmJlxyXG4gICAgICAgIGV4Y2x1ZGVkQnlQYXR0ZXJuID4gMCAmJlxyXG4gICAgICAgIGV4Y2x1ZGVkQnlQYXR0ZXJuICE9PSBsYXN0RXhjbHVkZVByb2dyZXNzRW1pdHRlZEF0XHJcbiAgICAgICkge1xyXG4gICAgICAgIG9uUHJvZ3Jlc3Moe1xyXG4gICAgICAgICAgdG90YWxGaWxlczogMCxcclxuICAgICAgICAgIHByb2Nlc3NlZEZpbGVzOiAwLFxyXG4gICAgICAgICAgY3VycmVudEZpbGU6IGBFeGNsdWRlZCAke2V4Y2x1ZGVkQnlQYXR0ZXJufSBieSBwYXR0ZXJuIChsYXRlc3Q6ICR7bGFzdEV4Y2x1ZGVkUmVsYXRpdmV9KWAsXHJcbiAgICAgICAgICBzdGF0dXM6IFwic2Nhbm5pbmdcIixcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy5vcHRpb25zLmFib3J0U2lnbmFsPy50aHJvd0lmQWJvcnRlZCgpO1xyXG5cclxuICAgICAgY29uc29sZS5sb2coXHJcbiAgICAgICAgYEZvdW5kICR7ZmlsZXMubGVuZ3RofSBmaWxlcyB0byBwcm9jZXNzYCArXHJcbiAgICAgICAgICAoZXhjbHVkZWRCeVBhdHRlcm4gPiAwXHJcbiAgICAgICAgICAgID8gYCAoJHtleGNsdWRlZEJ5UGF0dGVybn0gZXhjbHVkZWQgYnkgZXhjbHVkZSBwYXR0ZXJucylgXHJcbiAgICAgICAgICAgIDogXCJcIiksXHJcbiAgICAgICk7XHJcblxyXG4gICAgICAvLyBTdGVwIDI6IEluZGV4IGZpbGVzXHJcbiAgICAgIGxldCBwcm9jZXNzZWRDb3VudCA9IDA7XHJcbiAgICAgIGxldCBzdWNjZXNzQ291bnQgPSAwO1xyXG4gICAgICBsZXQgZmFpbENvdW50ID0gMDtcclxuICAgICAgbGV0IHNraXBwZWRDb3VudCA9IDA7XHJcbiAgICAgIGxldCB1cGRhdGVkQ291bnQgPSAwO1xyXG4gICAgICBsZXQgbmV3Q291bnQgPSAwO1xyXG5cclxuICAgICAgaWYgKG9uUHJvZ3Jlc3MpIHtcclxuICAgICAgICBvblByb2dyZXNzKHtcclxuICAgICAgICAgIHRvdGFsRmlsZXM6IGZpbGVzLmxlbmd0aCxcclxuICAgICAgICAgIHByb2Nlc3NlZEZpbGVzOiAwLFxyXG4gICAgICAgICAgY3VycmVudEZpbGU6IGZpbGVzWzBdPy5uYW1lID8/IFwiXCIsXHJcbiAgICAgICAgICBzdGF0dXM6IFwiaW5kZXhpbmdcIixcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gQWJvcnQgbGlzdGVuZXI6IHdoZW4gc2lnbmFsIGZpcmVzLCBjbGVhciBwZW5kaW5nIHRhc2tzIGZyb20gdGhlIHF1ZXVlXHJcbiAgICAgIGNvbnN0IGFib3J0U2lnbmFsID0gdGhpcy5vcHRpb25zLmFib3J0U2lnbmFsO1xyXG4gICAgICBjb25zdCBvbkFib3J0ID0gKCkgPT4gdGhpcy5xdWV1ZS5jbGVhcigpO1xyXG4gICAgICBpZiAoYWJvcnRTaWduYWwpIHtcclxuICAgICAgICBhYm9ydFNpZ25hbC5hZGRFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgb25BYm9ydCwgeyBvbmNlOiB0cnVlIH0pO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBQcm9jZXNzIGZpbGVzIGluIGJhdGNoZXNcclxuICAgICAgY29uc3QgdGFza3MgPSBmaWxlcy5tYXAoKGZpbGUpID0+XHJcbiAgICAgICAgdGhpcy5xdWV1ZS5hZGQoYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgLy8gQ2hlY2sgYWJvcnQgYmVmb3JlIHByb2Nlc3NpbmcgZWFjaCBmaWxlXHJcbiAgICAgICAgICBhYm9ydFNpZ25hbD8udGhyb3dJZkFib3J0ZWQoKTtcclxuXHJcbiAgICAgICAgICBsZXQgb3V0Y29tZTogRmlsZUluZGV4T3V0Y29tZSA9IHsgdHlwZTogXCJmYWlsZWRcIiB9O1xyXG4gICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKG9uUHJvZ3Jlc3MpIHtcclxuICAgICAgICAgICAgICBvblByb2dyZXNzKHtcclxuICAgICAgICAgICAgICAgIHRvdGFsRmlsZXM6IGZpbGVzLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgIHByb2Nlc3NlZEZpbGVzOiBwcm9jZXNzZWRDb3VudCxcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRGaWxlOiBmaWxlLm5hbWUsXHJcbiAgICAgICAgICAgICAgICBzdGF0dXM6IFwiaW5kZXhpbmdcIixcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3NmdWxGaWxlczogc3VjY2Vzc0NvdW50LFxyXG4gICAgICAgICAgICAgICAgZmFpbGVkRmlsZXM6IGZhaWxDb3VudCxcclxuICAgICAgICAgICAgICAgIHNraXBwZWRGaWxlczogc2tpcHBlZENvdW50LFxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBvdXRjb21lID0gYXdhaXQgdGhpcy5pbmRleEZpbGUoZmlsZSwgZmlsZUludmVudG9yeSk7XHJcbiAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBpbmRleGluZyBmaWxlICR7ZmlsZS5wYXRofTpgLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHRoaXMucmVjb3JkRmFpbHVyZShcclxuICAgICAgICAgICAgICBcInBhcnNlci51bmV4cGVjdGVkLWVycm9yXCIsXHJcbiAgICAgICAgICAgICAgZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpLFxyXG4gICAgICAgICAgICAgIGZpbGUsXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgcHJvY2Vzc2VkQ291bnQrKztcclxuICAgICAgICAgIHN3aXRjaCAob3V0Y29tZS50eXBlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJza2lwcGVkXCI6XHJcbiAgICAgICAgICAgICAgc3VjY2Vzc0NvdW50Kys7XHJcbiAgICAgICAgICAgICAgc2tpcHBlZENvdW50Kys7XHJcbiAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJpbmRleGVkXCI6XHJcbiAgICAgICAgICAgICAgc3VjY2Vzc0NvdW50Kys7XHJcbiAgICAgICAgICAgICAgaWYgKG91dGNvbWUuY2hhbmdlVHlwZSA9PT0gXCJuZXdcIikge1xyXG4gICAgICAgICAgICAgICAgbmV3Q291bnQrKztcclxuICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdXBkYXRlZENvdW50Kys7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwiZmFpbGVkXCI6XHJcbiAgICAgICAgICAgICAgZmFpbENvdW50Kys7XHJcbiAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgaWYgKG9uUHJvZ3Jlc3MpIHtcclxuICAgICAgICAgICAgb25Qcm9ncmVzcyh7XHJcbiAgICAgICAgICAgICAgdG90YWxGaWxlczogZmlsZXMubGVuZ3RoLFxyXG4gICAgICAgICAgICAgIHByb2Nlc3NlZEZpbGVzOiBwcm9jZXNzZWRDb3VudCxcclxuICAgICAgICAgICAgICBjdXJyZW50RmlsZTogZmlsZS5uYW1lLFxyXG4gICAgICAgICAgICAgIHN0YXR1czogXCJpbmRleGluZ1wiLFxyXG4gICAgICAgICAgICAgIHN1Y2Nlc3NmdWxGaWxlczogc3VjY2Vzc0NvdW50LFxyXG4gICAgICAgICAgICAgIGZhaWxlZEZpbGVzOiBmYWlsQ291bnQsXHJcbiAgICAgICAgICAgICAgc2tpcHBlZEZpbGVzOiBza2lwcGVkQ291bnQsXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBhd2FpdCBQcm9taXNlLmFsbCh0YXNrcyk7XHJcblxyXG4gICAgICAvLyBDbGVhbiB1cCBhYm9ydCBsaXN0ZW5lclxyXG4gICAgICBpZiAoYWJvcnRTaWduYWwpIHtcclxuICAgICAgICBhYm9ydFNpZ25hbC5yZW1vdmVFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgb25BYm9ydCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChvblByb2dyZXNzKSB7XHJcbiAgICAgICAgb25Qcm9ncmVzcyh7XHJcbiAgICAgICAgICB0b3RhbEZpbGVzOiBmaWxlcy5sZW5ndGgsXHJcbiAgICAgICAgICBwcm9jZXNzZWRGaWxlczogcHJvY2Vzc2VkQ291bnQsXHJcbiAgICAgICAgICBjdXJyZW50RmlsZTogXCJcIixcclxuICAgICAgICAgIHN0YXR1czogXCJjb21wbGV0ZVwiLFxyXG4gICAgICAgICAgc3VjY2Vzc2Z1bEZpbGVzOiBzdWNjZXNzQ291bnQsXHJcbiAgICAgICAgICBmYWlsZWRGaWxlczogZmFpbENvdW50LFxyXG4gICAgICAgICAgc2tpcHBlZEZpbGVzOiBza2lwcGVkQ291bnQsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMubG9nRmFpbHVyZVN1bW1hcnkoKTtcclxuICAgICAgYXdhaXQgdGhpcy53cml0ZUZhaWx1cmVSZXBvcnQoe1xyXG4gICAgICAgIHRvdGFsRmlsZXM6IGZpbGVzLmxlbmd0aCxcclxuICAgICAgICBzdWNjZXNzZnVsRmlsZXM6IHN1Y2Nlc3NDb3VudCxcclxuICAgICAgICBmYWlsZWRGaWxlczogZmFpbENvdW50LFxyXG4gICAgICAgIHNraXBwZWRGaWxlczogc2tpcHBlZENvdW50LFxyXG4gICAgICAgIHVwZGF0ZWRGaWxlczogdXBkYXRlZENvdW50LFxyXG4gICAgICAgIG5ld0ZpbGVzOiBuZXdDb3VudCxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhcclxuICAgICAgICBgSW5kZXhpbmcgY29tcGxldGU6ICR7c3VjY2Vzc0NvdW50fS8ke2ZpbGVzLmxlbmd0aH0gZmlsZXMgc3VjY2Vzc2Z1bGx5IGluZGV4ZWQgKCR7ZmFpbENvdW50fSBmYWlsZWQsIHNraXBwZWQ9JHtza2lwcGVkQ291bnR9LCB1cGRhdGVkPSR7dXBkYXRlZENvdW50fSwgbmV3PSR7bmV3Q291bnR9KWAgK1xyXG4gICAgICAgICAgKGV4Y2x1ZGVkQnlQYXR0ZXJuID4gMCA/IGA7IGV4Y2x1ZGVkIGJ5IHBhdHRlcm49JHtleGNsdWRlZEJ5UGF0dGVybn1gIDogXCJcIiksXHJcbiAgICAgICk7XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHRvdGFsRmlsZXM6IGZpbGVzLmxlbmd0aCxcclxuICAgICAgICBzdWNjZXNzZnVsRmlsZXM6IHN1Y2Nlc3NDb3VudCxcclxuICAgICAgICBmYWlsZWRGaWxlczogZmFpbENvdW50LFxyXG4gICAgICAgIHNraXBwZWRGaWxlczogc2tpcHBlZENvdW50LFxyXG4gICAgICAgIHVwZGF0ZWRGaWxlczogdXBkYXRlZENvdW50LFxyXG4gICAgICAgIG5ld0ZpbGVzOiBuZXdDb3VudCxcclxuICAgICAgfTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBkdXJpbmcgaW5kZXhpbmc6XCIsIGVycm9yKTtcclxuICAgICAgaWYgKG9uUHJvZ3Jlc3MpIHtcclxuICAgICAgICBvblByb2dyZXNzKHtcclxuICAgICAgICAgIHRvdGFsRmlsZXM6IDAsXHJcbiAgICAgICAgICBwcm9jZXNzZWRGaWxlczogMCxcclxuICAgICAgICAgIGN1cnJlbnRGaWxlOiBcIlwiLFxyXG4gICAgICAgICAgc3RhdHVzOiBcImVycm9yXCIsXHJcbiAgICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5kZXggYSBzaW5nbGUgZmlsZVxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgaW5kZXhGaWxlKFxyXG4gICAgZmlsZTogU2Nhbm5lZEZpbGUsXHJcbiAgICBmaWxlSW52ZW50b3J5OiBNYXA8c3RyaW5nLCBTZXQ8c3RyaW5nPj4gPSBuZXcgTWFwKCksXHJcbiAgKTogUHJvbWlzZTxGaWxlSW5kZXhPdXRjb21lPiB7XHJcbiAgICBjb25zdCB7IHZlY3RvclN0b3JlLCBlbWJlZGRpbmdNb2RlbCwgY2xpZW50LCBjaHVua1NpemUsIGNodW5rT3ZlcmxhcCwgZW5hYmxlT0NSLCBhdXRvUmVpbmRleCB9ID1cclxuICAgICAgdGhpcy5vcHRpb25zO1xyXG5cclxuICAgIGxldCBmaWxlSGFzaDogc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gQ2FsY3VsYXRlIGZpbGUgaGFzaFxyXG4gICAgICBmaWxlSGFzaCA9IGF3YWl0IGNhbGN1bGF0ZUZpbGVIYXNoKGZpbGUucGF0aCk7XHJcbiAgICAgIGNvbnN0IGV4aXN0aW5nSGFzaGVzID0gZmlsZUludmVudG9yeS5nZXQoZmlsZS5wYXRoKTtcclxuICAgICAgY29uc3QgaGFzU2VlbkJlZm9yZSA9IGV4aXN0aW5nSGFzaGVzICE9PSB1bmRlZmluZWQgJiYgZXhpc3RpbmdIYXNoZXMuc2l6ZSA+IDA7XHJcbiAgICAgIGNvbnN0IGhhc1NhbWVIYXNoID0gZXhpc3RpbmdIYXNoZXM/LmhhcyhmaWxlSGFzaCkgPz8gZmFsc2U7XHJcblxyXG4gICAgICAvLyBDaGVjayBpZiBmaWxlIGFscmVhZHkgaW5kZXhlZFxyXG4gICAgICBpZiAoYXV0b1JlaW5kZXggJiYgaGFzU2FtZUhhc2gpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgRmlsZSBhbHJlYWR5IGluZGV4ZWQgKHNraXBwZWQpOiAke2ZpbGUubmFtZX1gKTtcclxuICAgICAgICByZXR1cm4geyB0eXBlOiBcInNraXBwZWRcIiB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoYXV0b1JlaW5kZXgpIHtcclxuICAgICAgICBjb25zdCBwcmV2aW91c0ZhaWx1cmUgPSBhd2FpdCB0aGlzLmZhaWxlZEZpbGVSZWdpc3RyeS5nZXRGYWlsdXJlUmVhc29uKGZpbGUucGF0aCwgZmlsZUhhc2gpO1xyXG4gICAgICAgIGlmIChwcmV2aW91c0ZhaWx1cmUpIHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKFxyXG4gICAgICAgICAgICBgRmlsZSBwcmV2aW91c2x5IGZhaWxlZCAoc2tpcHBlZCk6ICR7ZmlsZS5uYW1lfSAocmVhc29uPSR7cHJldmlvdXNGYWlsdXJlfSlgLFxyXG4gICAgICAgICAgKTtcclxuICAgICAgICAgIHJldHVybiB7IHR5cGU6IFwic2tpcHBlZFwiIH07XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBXYWl0IGJlZm9yZSBwYXJzaW5nIHRvIHJlZHVjZSBXZWJTb2NrZXQgbG9hZFxyXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnBhcnNlRGVsYXlNcyA+IDApIHtcclxuICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgdGhpcy5vcHRpb25zLnBhcnNlRGVsYXlNcykpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBQYXJzZSBkb2N1bWVudFxyXG4gICAgICBjb25zdCBwYXJzZWRSZXN1bHQgPSBhd2FpdCBwYXJzZURvY3VtZW50KGZpbGUucGF0aCwgZW5hYmxlT0NSLCBjbGllbnQpO1xyXG4gICAgICBpZiAoIXBhcnNlZFJlc3VsdC5zdWNjZXNzKSB7XHJcbiAgICAgICAgdGhpcy5yZWNvcmRGYWlsdXJlKHBhcnNlZFJlc3VsdC5yZWFzb24sIHBhcnNlZFJlc3VsdC5kZXRhaWxzLCBmaWxlKTtcclxuICAgICAgICBpZiAoZmlsZUhhc2gpIHtcclxuICAgICAgICAgIGF3YWl0IHRoaXMuZmFpbGVkRmlsZVJlZ2lzdHJ5LnJlY29yZEZhaWx1cmUoZmlsZS5wYXRoLCBmaWxlSGFzaCwgcGFyc2VkUmVzdWx0LnJlYXNvbik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB7IHR5cGU6IFwiZmFpbGVkXCIgfTtcclxuICAgICAgfVxyXG4gICAgICBjb25zdCBwYXJzZWQgPSBwYXJzZWRSZXN1bHQuZG9jdW1lbnQ7XHJcblxyXG4gICAgICAvLyBDaHVuayB0ZXh0XHJcbiAgICAgIGNvbnN0IGNodW5rcyA9IGNodW5rVGV4dChwYXJzZWQudGV4dCwgY2h1bmtTaXplLCBjaHVua092ZXJsYXApO1xyXG4gICAgICBpZiAoY2h1bmtzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBObyBjaHVua3MgY3JlYXRlZCBmcm9tICR7ZmlsZS5uYW1lfWApO1xyXG4gICAgICAgIHRoaXMucmVjb3JkRmFpbHVyZShcImluZGV4LmNodW5rLWVtcHR5XCIsIFwiY2h1bmtUZXh0IHByb2R1Y2VkIDAgY2h1bmtzXCIsIGZpbGUpO1xyXG4gICAgICAgIGlmIChmaWxlSGFzaCkge1xyXG4gICAgICAgICAgYXdhaXQgdGhpcy5mYWlsZWRGaWxlUmVnaXN0cnkucmVjb3JkRmFpbHVyZShmaWxlLnBhdGgsIGZpbGVIYXNoLCBcImluZGV4LmNodW5rLWVtcHR5XCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4geyB0eXBlOiBcImZhaWxlZFwiIH07IC8vIEZhaWxlZCB0byBjaHVua1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBHZW5lcmF0ZSBlbWJlZGRpbmdzIGFuZCBjcmVhdGUgZG9jdW1lbnQgY2h1bmtzXHJcbiAgICAgIGNvbnN0IGRvY3VtZW50Q2h1bmtzOiBEb2N1bWVudENodW5rW10gPSBbXTtcclxuXHJcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY2h1bmtzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgY29uc3QgY2h1bmsgPSBjaHVua3NbaV07XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gQ2hlY2sgYWJvcnQgYmV0d2VlbiBjaHVuayBlbWJlZGRpbmdzXHJcbiAgICAgICAgdGhpcy5vcHRpb25zLmFib3J0U2lnbmFsPy50aHJvd0lmQWJvcnRlZCgpO1xyXG5cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgLy8gR2VuZXJhdGUgZW1iZWRkaW5nXHJcbiAgICAgICAgICBjb25zdCBlbWJlZGRpbmdSZXN1bHQgPSBhd2FpdCBlbWJlZGRpbmdNb2RlbC5lbWJlZChjaHVuay50ZXh0KTtcclxuICAgICAgICAgIGNvbnN0IGVtYmVkZGluZyA9IGNvZXJjZUVtYmVkZGluZ1ZlY3RvcihlbWJlZGRpbmdSZXN1bHQuZW1iZWRkaW5nKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgZG9jdW1lbnRDaHVua3MucHVzaCh7XHJcbiAgICAgICAgICAgIGlkOiBgJHtmaWxlSGFzaH0tJHtpfWAsXHJcbiAgICAgICAgICAgIHRleHQ6IGNodW5rLnRleHQsXHJcbiAgICAgICAgICAgIHZlY3RvcjogZW1iZWRkaW5nLFxyXG4gICAgICAgICAgICBmaWxlUGF0aDogZmlsZS5wYXRoLFxyXG4gICAgICAgICAgICBmaWxlTmFtZTogZmlsZS5uYW1lLFxyXG4gICAgICAgICAgICBmaWxlSGFzaCxcclxuICAgICAgICAgICAgY2h1bmtJbmRleDogaSxcclxuICAgICAgICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICAgICAgICBleHRlbnNpb246IGZpbGUuZXh0ZW5zaW9uLFxyXG4gICAgICAgICAgICAgIHNpemU6IGZpbGUuc2l6ZSxcclxuICAgICAgICAgICAgICBtdGltZTogZmlsZS5tdGltZS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgICAgIHN0YXJ0SW5kZXg6IGNodW5rLnN0YXJ0SW5kZXgsXHJcbiAgICAgICAgICAgICAgZW5kSW5kZXg6IGNodW5rLmVuZEluZGV4LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGVtYmVkZGluZyBjaHVuayAke2l9IG9mICR7ZmlsZS5uYW1lfTpgLCBlcnJvcik7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBBZGQgY2h1bmtzIHRvIHZlY3RvciBzdG9yZVxyXG4gICAgICBpZiAoZG9jdW1lbnRDaHVua3MubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgdGhpcy5yZWNvcmRGYWlsdXJlKFxyXG4gICAgICAgICAgXCJpbmRleC5jaHVuay1lbXB0eVwiLFxyXG4gICAgICAgICAgXCJBbGwgY2h1bmsgZW1iZWRkaW5ncyBmYWlsZWQsIG5vIGRvY3VtZW50IGNodW5rc1wiLFxyXG4gICAgICAgICAgZmlsZSxcclxuICAgICAgICApO1xyXG4gICAgICAgIGlmIChmaWxlSGFzaCkge1xyXG4gICAgICAgICAgYXdhaXQgdGhpcy5mYWlsZWRGaWxlUmVnaXN0cnkucmVjb3JkRmFpbHVyZShmaWxlLnBhdGgsIGZpbGVIYXNoLCBcImluZGV4LmNodW5rLWVtcHR5XCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4geyB0eXBlOiBcImZhaWxlZFwiIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgYXdhaXQgdmVjdG9yU3RvcmUuYWRkQ2h1bmtzKGRvY3VtZW50Q2h1bmtzKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhgSW5kZXhlZCAke2RvY3VtZW50Q2h1bmtzLmxlbmd0aH0gY2h1bmtzIGZyb20gJHtmaWxlLm5hbWV9YCk7XHJcbiAgICAgICAgaWYgKCFleGlzdGluZ0hhc2hlcykge1xyXG4gICAgICAgICAgZmlsZUludmVudG9yeS5zZXQoZmlsZS5wYXRoLCBuZXcgU2V0KFtmaWxlSGFzaF0pKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgZXhpc3RpbmdIYXNoZXMuYWRkKGZpbGVIYXNoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYXdhaXQgdGhpcy5mYWlsZWRGaWxlUmVnaXN0cnkuY2xlYXJGYWlsdXJlKGZpbGUucGF0aCk7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHR5cGU6IFwiaW5kZXhlZFwiLFxyXG4gICAgICAgICAgY2hhbmdlVHlwZTogaGFzU2VlbkJlZm9yZSA/IFwidXBkYXRlZFwiIDogXCJuZXdcIixcclxuICAgICAgICB9O1xyXG4gICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGFkZGluZyBjaHVua3MgZm9yICR7ZmlsZS5uYW1lfTpgLCBlcnJvcik7XHJcbiAgICAgICAgdGhpcy5yZWNvcmRGYWlsdXJlKFxyXG4gICAgICAgICAgXCJpbmRleC52ZWN0b3ItYWRkLWVycm9yXCIsXHJcbiAgICAgICAgICBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvciksXHJcbiAgICAgICAgICBmaWxlLFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgaWYgKGZpbGVIYXNoKSB7XHJcbiAgICAgICAgICBhd2FpdCB0aGlzLmZhaWxlZEZpbGVSZWdpc3RyeS5yZWNvcmRGYWlsdXJlKGZpbGUucGF0aCwgZmlsZUhhc2gsIFwiaW5kZXgudmVjdG9yLWFkZC1lcnJvclwiKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogXCJmYWlsZWRcIiB9O1xyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgaW5kZXhpbmcgZmlsZSAke2ZpbGUucGF0aH06YCwgZXJyb3IpO1xyXG4gICAgICAgICAgdGhpcy5yZWNvcmRGYWlsdXJlKFxyXG4gICAgICAgICAgICBcInBhcnNlci51bmV4cGVjdGVkLWVycm9yXCIsXHJcbiAgICAgICAgICAgIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSxcclxuICAgICAgICAgICAgZmlsZSxcclxuICAgICAgICAgICk7XHJcbiAgICAgIGlmIChmaWxlSGFzaCkge1xyXG4gICAgICAgIGF3YWl0IHRoaXMuZmFpbGVkRmlsZVJlZ2lzdHJ5LnJlY29yZEZhaWx1cmUoZmlsZS5wYXRoLCBmaWxlSGFzaCwgXCJwYXJzZXIudW5leHBlY3RlZC1lcnJvclwiKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4geyB0eXBlOiBcImZhaWxlZFwiIH07IC8vIEZhaWxlZFxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVpbmRleCBhIHNwZWNpZmljIGZpbGUgKGRlbGV0ZSBvbGQgY2h1bmtzIGFuZCByZWluZGV4KVxyXG4gICAqL1xyXG4gIGFzeW5jIHJlaW5kZXhGaWxlKGZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnN0IHsgdmVjdG9yU3RvcmUgfSA9IHRoaXMub3B0aW9ucztcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBmaWxlSGFzaCA9IGF3YWl0IGNhbGN1bGF0ZUZpbGVIYXNoKGZpbGVQYXRoKTtcclxuICAgICAgXHJcbiAgICAgIC8vIERlbGV0ZSBvbGQgY2h1bmtzXHJcbiAgICAgIGF3YWl0IHZlY3RvclN0b3JlLmRlbGV0ZUJ5RmlsZUhhc2goZmlsZUhhc2gpO1xyXG4gICAgICBcclxuICAgICAgLy8gUmVpbmRleFxyXG4gICAgICBjb25zdCBmaWxlOiBTY2FubmVkRmlsZSA9IHtcclxuICAgICAgICBwYXRoOiBmaWxlUGF0aCxcclxuICAgICAgICBuYW1lOiBmaWxlUGF0aC5zcGxpdChcIi9cIikucG9wKCkgfHwgZmlsZVBhdGgsXHJcbiAgICAgICAgZXh0ZW5zaW9uOiBmaWxlUGF0aC5zcGxpdChcIi5cIikucG9wKCkgfHwgXCJcIixcclxuICAgICAgICBtaW1lVHlwZTogZmFsc2UsXHJcbiAgICAgICAgc2l6ZTogMCxcclxuICAgICAgICBtdGltZTogbmV3IERhdGUoKSxcclxuICAgICAgfTtcclxuICAgICAgXHJcbiAgICAgIGF3YWl0IHRoaXMuaW5kZXhGaWxlKGZpbGUpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgcmVpbmRleGluZyBmaWxlICR7ZmlsZVBhdGh9OmAsIGVycm9yKTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHJlY29yZEZhaWx1cmUocmVhc29uOiBGYWlsdXJlUmVhc29uLCBkZXRhaWxzOiBzdHJpbmcgfCB1bmRlZmluZWQsIGZpbGU6IFNjYW5uZWRGaWxlKSB7XHJcbiAgICBjb25zdCBjdXJyZW50ID0gdGhpcy5mYWlsdXJlUmVhc29uQ291bnRzW3JlYXNvbl0gPz8gMDtcclxuICAgIHRoaXMuZmFpbHVyZVJlYXNvbkNvdW50c1tyZWFzb25dID0gY3VycmVudCArIDE7XHJcbiAgICBjb25zdCBkZXRhaWxTdWZmaXggPSBkZXRhaWxzID8gYCBkZXRhaWxzPSR7ZGV0YWlsc31gIDogXCJcIjtcclxuICAgIGNvbnNvbGUud2FybihcclxuICAgICAgYFtCaWdSQUddIEZhaWxlZCB0byBwYXJzZSAke2ZpbGUubmFtZX0gKHJlYXNvbj0ke3JlYXNvbn0sIGNvdW50PSR7dGhpcy5mYWlsdXJlUmVhc29uQ291bnRzW3JlYXNvbl19KSR7ZGV0YWlsU3VmZml4fWAsXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBsb2dGYWlsdXJlU3VtbWFyeSgpIHtcclxuICAgIGNvbnN0IGVudHJpZXMgPSBPYmplY3QuZW50cmllcyh0aGlzLmZhaWx1cmVSZWFzb25Db3VudHMpO1xyXG4gICAgaWYgKGVudHJpZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKFwiW0JpZ1JBR10gTm8gcGFyc2luZyBmYWlsdXJlcyByZWNvcmRlZC5cIik7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGNvbnNvbGUubG9nKFwiW0JpZ1JBR10gRmFpbHVyZSByZWFzb24gc3VtbWFyeTpcIik7XHJcbiAgICBmb3IgKGNvbnN0IFtyZWFzb24sIGNvdW50XSBvZiBlbnRyaWVzKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGAgIC0gJHtyZWFzb259OiAke2NvdW50fWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyB3cml0ZUZhaWx1cmVSZXBvcnQoc3VtbWFyeTogSW5kZXhpbmdSZXN1bHQpIHtcclxuICAgIGNvbnN0IHJlcG9ydFBhdGggPSB0aGlzLm9wdGlvbnMuZmFpbHVyZVJlcG9ydFBhdGg7XHJcbiAgICBpZiAoIXJlcG9ydFBhdGgpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHBheWxvYWQgPSB7XHJcbiAgICAgIC4uLnN1bW1hcnksXHJcbiAgICAgIGRvY3VtZW50c0RpcjogdGhpcy5vcHRpb25zLmRvY3VtZW50c0RpcixcclxuICAgICAgZmFpbHVyZVJlYXNvbnM6IHRoaXMuZmFpbHVyZVJlYXNvbkNvdW50cyxcclxuICAgICAgZ2VuZXJhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgIH07XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgYXdhaXQgZnMucHJvbWlzZXMubWtkaXIocGF0aC5kaXJuYW1lKHJlcG9ydFBhdGgpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcclxuICAgICAgYXdhaXQgZnMucHJvbWlzZXMud3JpdGVGaWxlKHJlcG9ydFBhdGgsIEpTT04uc3RyaW5naWZ5KHBheWxvYWQsIG51bGwsIDIpLCBcInV0Zi04XCIpO1xyXG4gICAgICBjb25zb2xlLmxvZyhgW0JpZ1JBR10gV3JvdGUgZmFpbHVyZSByZXBvcnQgdG8gJHtyZXBvcnRQYXRofWApO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcihgW0JpZ1JBR10gRmFpbGVkIHRvIHdyaXRlIGZhaWx1cmUgcmVwb3J0IHRvICR7cmVwb3J0UGF0aH06YCwgZXJyb3IpO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuIiwgImltcG9ydCB7IHR5cGUgTE1TdHVkaW9DbGllbnQgfSBmcm9tIFwiQGxtc3R1ZGlvL3Nka1wiO1xyXG5pbXBvcnQgeyBJbmRleE1hbmFnZXIsIHR5cGUgSW5kZXhpbmdQcm9ncmVzcywgdHlwZSBJbmRleGluZ1Jlc3VsdCB9IGZyb20gXCIuL2luZGV4TWFuYWdlclwiO1xyXG5pbXBvcnQgeyBWZWN0b3JTdG9yZSB9IGZyb20gXCIuLi92ZWN0b3JzdG9yZS92ZWN0b3JTdG9yZVwiO1xyXG5pbXBvcnQgeyByZXNvbHZlRW1iZWRkaW5nTW9kZWxJZCB9IGZyb20gXCIuLi9jb25maWdcIjtcclxuaW1wb3J0IHsgc3luY0VtYmVkZGluZ01hbmlmZXN0QWZ0ZXJJbmRleGluZyB9IGZyb20gXCIuLi91dGlscy9lbWJlZGRpbmdJbmRleE1hbmlmZXN0XCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJ1bkluZGV4aW5nUGFyYW1zIHtcclxuICBjbGllbnQ6IExNU3R1ZGlvQ2xpZW50O1xyXG4gIGFib3J0U2lnbmFsOiBBYm9ydFNpZ25hbDtcclxuICBkb2N1bWVudHNEaXI6IHN0cmluZztcclxuICB2ZWN0b3JTdG9yZURpcjogc3RyaW5nO1xyXG4gIGVtYmVkZGluZ01vZGVsSWQ6IHN0cmluZztcclxuICBjaHVua1NpemU6IG51bWJlcjtcclxuICBjaHVua092ZXJsYXA6IG51bWJlcjtcclxuICBtYXhDb25jdXJyZW50OiBudW1iZXI7XHJcbiAgZW5hYmxlT0NSOiBib29sZWFuO1xyXG4gIGF1dG9SZWluZGV4OiBib29sZWFuO1xyXG4gIHBhcnNlRGVsYXlNczogbnVtYmVyO1xyXG4gIC8qKiBHbG9iIHBhdHRlcm5zIHJlbGF0aXZlIHRvIGRvY3VtZW50cyBkaXI7IG1hdGNoaW5nIHN1cHBvcnRlZCBmaWxlcyBhcmUgbm90IHBhcnNlZCBvciBlbWJlZGRlZC4gKi9cclxuICBleGNsdWRlUGF0dGVybnM/OiBzdHJpbmdbXTtcclxuICBmb3JjZVJlaW5kZXg/OiBib29sZWFuO1xyXG4gIHZlY3RvclN0b3JlPzogVmVjdG9yU3RvcmU7XHJcbiAgb25Qcm9ncmVzcz86IChwcm9ncmVzczogSW5kZXhpbmdQcm9ncmVzcykgPT4gdm9pZDtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBSdW5JbmRleGluZ1Jlc3VsdCB7XHJcbiAgc3VtbWFyeTogc3RyaW5nO1xyXG4gIHN0YXRzOiB7XHJcbiAgICB0b3RhbENodW5rczogbnVtYmVyO1xyXG4gICAgdW5pcXVlRmlsZXM6IG51bWJlcjtcclxuICB9O1xyXG4gIGluZGV4aW5nUmVzdWx0OiBJbmRleGluZ1Jlc3VsdDtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNoYXJlZCBoZWxwZXIgdGhhdCBydW5zIHRoZSBmdWxsIGluZGV4aW5nIHBpcGVsaW5lLlxyXG4gKiBBbGxvd3MgcmV1c2UgYWNyb3NzIHRoZSBtYW51YWwgdG9vbCwgY29uZmlnLXRyaWdnZXJlZCBpbmRleGluZywgYW5kIGF1dG9tYXRpYyBib290c3RyYXBwaW5nLlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1bkluZGV4aW5nSm9iKHtcclxuICBjbGllbnQsXHJcbiAgYWJvcnRTaWduYWwsXHJcbiAgZG9jdW1lbnRzRGlyLFxyXG4gIHZlY3RvclN0b3JlRGlyLFxyXG4gIGVtYmVkZGluZ01vZGVsSWQsXHJcbiAgY2h1bmtTaXplLFxyXG4gIGNodW5rT3ZlcmxhcCxcclxuICBtYXhDb25jdXJyZW50LFxyXG4gIGVuYWJsZU9DUixcclxuICBhdXRvUmVpbmRleCxcclxuICBwYXJzZURlbGF5TXMsXHJcbiAgZXhjbHVkZVBhdHRlcm5zID0gW10sXHJcbiAgZm9yY2VSZWluZGV4ID0gZmFsc2UsXHJcbiAgdmVjdG9yU3RvcmU6IGV4aXN0aW5nVmVjdG9yU3RvcmUsXHJcbiAgb25Qcm9ncmVzcyxcclxufTogUnVuSW5kZXhpbmdQYXJhbXMpOiBQcm9taXNlPFJ1bkluZGV4aW5nUmVzdWx0PiB7XHJcbiAgY29uc3QgdmVjdG9yU3RvcmUgPSBleGlzdGluZ1ZlY3RvclN0b3JlID8/IG5ldyBWZWN0b3JTdG9yZSh2ZWN0b3JTdG9yZURpcik7XHJcbiAgY29uc3Qgb3duc1ZlY3RvclN0b3JlID0gZXhpc3RpbmdWZWN0b3JTdG9yZSA9PT0gdW5kZWZpbmVkO1xyXG5cclxuICBpZiAob3duc1ZlY3RvclN0b3JlKSB7XHJcbiAgICBhd2FpdCB2ZWN0b3JTdG9yZS5pbml0aWFsaXplKCk7XHJcbiAgfVxyXG5cclxuICBjb25zdCByZXNvbHZlZE1vZGVsSWQgPSByZXNvbHZlRW1iZWRkaW5nTW9kZWxJZChlbWJlZGRpbmdNb2RlbElkKTtcclxuICBjb25zdCBlbWJlZGRpbmdNb2RlbCA9IGF3YWl0IGNsaWVudC5lbWJlZGRpbmcubW9kZWwocmVzb2x2ZWRNb2RlbElkLCB7IHNpZ25hbDogYWJvcnRTaWduYWwgfSk7XHJcblxyXG4gIGNvbnN0IGluZGV4TWFuYWdlciA9IG5ldyBJbmRleE1hbmFnZXIoe1xyXG4gICAgZG9jdW1lbnRzRGlyLFxyXG4gICAgdmVjdG9yU3RvcmUsXHJcbiAgICB2ZWN0b3JTdG9yZURpcixcclxuICAgIGVtYmVkZGluZ01vZGVsLFxyXG4gICAgY2xpZW50LFxyXG4gICAgY2h1bmtTaXplLFxyXG4gICAgY2h1bmtPdmVybGFwLFxyXG4gICAgbWF4Q29uY3VycmVudCxcclxuICAgIGVuYWJsZU9DUixcclxuICAgIGF1dG9SZWluZGV4OiBmb3JjZVJlaW5kZXggPyBmYWxzZSA6IGF1dG9SZWluZGV4LFxyXG4gICAgcGFyc2VEZWxheU1zLFxyXG4gICAgZXhjbHVkZVBhdHRlcm5zLFxyXG4gICAgYWJvcnRTaWduYWwsXHJcbiAgICBvblByb2dyZXNzLFxyXG4gIH0pO1xyXG5cclxuICBjb25zdCBpbmRleGluZ1Jlc3VsdCA9IGF3YWl0IGluZGV4TWFuYWdlci5pbmRleCgpO1xyXG4gIGNvbnN0IHN0YXRzID0gYXdhaXQgdmVjdG9yU3RvcmUuZ2V0U3RhdHMoKTtcclxuXHJcbiAgYXdhaXQgc3luY0VtYmVkZGluZ01hbmlmZXN0QWZ0ZXJJbmRleGluZyhcclxuICAgIHZlY3RvclN0b3JlRGlyLFxyXG4gICAgc3RhdHMudG90YWxDaHVua3MsXHJcbiAgICByZXNvbHZlZE1vZGVsSWQsXHJcbiAgICBlbWJlZGRpbmdNb2RlbCxcclxuICApO1xyXG5cclxuICBpZiAob3duc1ZlY3RvclN0b3JlKSB7XHJcbiAgICBhd2FpdCB2ZWN0b3JTdG9yZS5jbG9zZSgpO1xyXG4gIH1cclxuXHJcbiAgY29uc3Qgc3VtbWFyeSA9IGBJbmRleGluZyBjb21wbGV0ZWQhXFxuXFxuYCArXHJcbiAgICBgXHUyMDIyIFN1Y2Nlc3NmdWxseSBpbmRleGVkOiAke2luZGV4aW5nUmVzdWx0LnN1Y2Nlc3NmdWxGaWxlc30vJHtpbmRleGluZ1Jlc3VsdC50b3RhbEZpbGVzfVxcbmAgK1xyXG4gICAgYFx1MjAyMiBGYWlsZWQ6ICR7aW5kZXhpbmdSZXN1bHQuZmFpbGVkRmlsZXN9XFxuYCArXHJcbiAgICBgXHUyMDIyIFNraXBwZWQgKHVuY2hhbmdlZCk6ICR7aW5kZXhpbmdSZXN1bHQuc2tpcHBlZEZpbGVzfVxcbmAgK1xyXG4gICAgYFx1MjAyMiBVcGRhdGVkIGV4aXN0aW5nIGZpbGVzOiAke2luZGV4aW5nUmVzdWx0LnVwZGF0ZWRGaWxlc31cXG5gICtcclxuICAgIGBcdTIwMjIgTmV3IGZpbGVzIGFkZGVkOiAke2luZGV4aW5nUmVzdWx0Lm5ld0ZpbGVzfVxcbmAgK1xyXG4gICAgYFx1MjAyMiBDaHVua3MgaW4gc3RvcmU6ICR7c3RhdHMudG90YWxDaHVua3N9XFxuYCArXHJcbiAgICBgXHUyMDIyIFVuaXF1ZSBmaWxlcyBpbiBzdG9yZTogJHtzdGF0cy51bmlxdWVGaWxlc31gO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgc3VtbWFyeSxcclxuICAgIHN0YXRzLFxyXG4gICAgaW5kZXhpbmdSZXN1bHQsXHJcbiAgfTtcclxufVxyXG5cclxuIiwgImltcG9ydCB7XHJcbiAgdHlwZSBDaGF0TWVzc2FnZSxcclxuICB0eXBlIFByb21wdFByZXByb2Nlc3NvckNvbnRyb2xsZXIsXHJcbn0gZnJvbSBcIkBsbXN0dWRpby9zZGtcIjtcclxuaW1wb3J0IHsgY29uZmlnU2NoZW1hdGljcywgREVGQVVMVF9QUk9NUFRfVEVNUExBVEUsIHJlc29sdmVFbWJlZGRpbmdNb2RlbElkIH0gZnJvbSBcIi4vY29uZmlnXCI7XHJcbmltcG9ydCB7IFZlY3RvclN0b3JlIH0gZnJvbSBcIi4vdmVjdG9yc3RvcmUvdmVjdG9yU3RvcmVcIjtcclxuaW1wb3J0IHsgcGVyZm9ybVNhbml0eUNoZWNrcyB9IGZyb20gXCIuL3V0aWxzL3Nhbml0eUNoZWNrc1wiO1xyXG5pbXBvcnQgeyB0cnlTdGFydEluZGV4aW5nLCBmaW5pc2hJbmRleGluZyB9IGZyb20gXCIuL3V0aWxzL2luZGV4aW5nTG9ja1wiO1xyXG5pbXBvcnQge1xyXG4gIGNoZWNrRW1iZWRkaW5nTW9kZWxGb3JSZXRyaWV2YWwsXHJcbiAgZGVsZXRlRW1iZWRkaW5nSW5kZXhNYW5pZmVzdCxcclxufSBmcm9tIFwiLi91dGlscy9lbWJlZGRpbmdJbmRleE1hbmlmZXN0XCI7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgcnVuSW5kZXhpbmdKb2IgfSBmcm9tIFwiLi9pbmdlc3Rpb24vcnVuSW5kZXhpbmdcIjtcclxuaW1wb3J0IHsgcGFyc2VFeGNsdWRlUGF0dGVybnNCbG9jayB9IGZyb20gXCIuL3V0aWxzL2ZpbGVFeGNsdWRlUGF0dGVybnNcIjtcclxuXHJcbi8qKlxyXG4gKiBDaGVjayB0aGUgYWJvcnQgc2lnbmFsIGFuZCB0aHJvdyBpZiB0aGUgcmVxdWVzdCBoYXMgYmVlbiBjYW5jZWxsZWQuXHJcbiAqIFRoaXMgZ2l2ZXMgTE0gU3R1ZGlvIHRoZSBvcHBvcnR1bml0eSB0byBzdG9wIHRoZSBwcmVwcm9jZXNzb3IgcHJvbXB0bHkuXHJcbiAqL1xyXG5mdW5jdGlvbiBjaGVja0Fib3J0KHNpZ25hbDogQWJvcnRTaWduYWwpOiB2b2lkIHtcclxuICBpZiAoc2lnbmFsLmFib3J0ZWQpIHtcclxuICAgIHRocm93IHNpZ25hbC5yZWFzb24gPz8gbmV3IERPTUV4Y2VwdGlvbihcIkFib3J0ZWRcIiwgXCJBYm9ydEVycm9yXCIpO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZXJyb3IgaXMgYW4gYWJvcnQvY2FuY2VsbGF0aW9uIGVycm9yIHRoYXQgc2hvdWxkIGJlIHJlLXRocm93bi5cclxuICovXHJcbmZ1bmN0aW9uIGlzQWJvcnRFcnJvcihlcnJvcjogdW5rbm93bik6IGJvb2xlYW4ge1xyXG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIERPTUV4Y2VwdGlvbiAmJiBlcnJvci5uYW1lID09PSBcIkFib3J0RXJyb3JcIikgcmV0dXJuIHRydWU7XHJcbiAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgJiYgZXJyb3IubmFtZSA9PT0gXCJBYm9ydEVycm9yXCIpIHJldHVybiB0cnVlO1xyXG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yICYmIGVycm9yLm1lc3NhZ2UgPT09IFwiQWJvcnRlZFwiKSByZXR1cm4gdHJ1ZTtcclxuICByZXR1cm4gZmFsc2U7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHN1bW1hcml6ZVRleHQodGV4dDogc3RyaW5nLCBtYXhMaW5lczogbnVtYmVyID0gMywgbWF4Q2hhcnM6IG51bWJlciA9IDQwMCk6IHN0cmluZyB7XHJcbiAgY29uc3QgbGluZXMgPSB0ZXh0LnNwbGl0KC9cXHI/XFxuLykuZmlsdGVyKGxpbmUgPT4gbGluZS50cmltKCkgIT09IFwiXCIpO1xyXG4gIGNvbnN0IGNsaXBwZWRMaW5lcyA9IGxpbmVzLnNsaWNlKDAsIG1heExpbmVzKTtcclxuICBsZXQgY2xpcHBlZCA9IGNsaXBwZWRMaW5lcy5qb2luKFwiXFxuXCIpO1xyXG4gIGlmIChjbGlwcGVkLmxlbmd0aCA+IG1heENoYXJzKSB7XHJcbiAgICBjbGlwcGVkID0gY2xpcHBlZC5zbGljZSgwLCBtYXhDaGFycyk7XHJcbiAgfVxyXG4gIGNvbnN0IG5lZWRzRWxsaXBzaXMgPVxyXG4gICAgbGluZXMubGVuZ3RoID4gbWF4TGluZXMgfHxcclxuICAgIHRleHQubGVuZ3RoID4gY2xpcHBlZC5sZW5ndGggfHxcclxuICAgIGNsaXBwZWQubGVuZ3RoID09PSBtYXhDaGFycyAmJiB0ZXh0Lmxlbmd0aCA+IG1heENoYXJzO1xyXG4gIHJldHVybiBuZWVkc0VsbGlwc2lzID8gYCR7Y2xpcHBlZC50cmltRW5kKCl9XHUyMDI2YCA6IGNsaXBwZWQ7XHJcbn1cclxuXHJcbi8vIEdsb2JhbCBzdGF0ZSBmb3IgdmVjdG9yIHN0b3JlIChwZXJzaXN0cyBhY3Jvc3MgcmVxdWVzdHMpXHJcbmxldCB2ZWN0b3JTdG9yZTogVmVjdG9yU3RvcmUgfCBudWxsID0gbnVsbDtcclxubGV0IGxhc3RJbmRleGVkRGlyID0gXCJcIjtcclxubGV0IHNhbml0eUNoZWNrc1Bhc3NlZCA9IGZhbHNlO1xyXG5cclxuY29uc3QgUkFHX0NPTlRFWFRfTUFDUk8gPSBcInt7cmFnX2NvbnRleHR9fVwiO1xyXG5jb25zdCBVU0VSX1FVRVJZX01BQ1JPID0gXCJ7e3VzZXJfcXVlcnl9fVwiO1xyXG5cclxuZnVuY3Rpb24gbm9ybWFsaXplUHJvbXB0VGVtcGxhdGUodGVtcGxhdGU6IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQpOiBzdHJpbmcge1xyXG4gIGNvbnN0IGhhc0NvbnRlbnQgPSB0eXBlb2YgdGVtcGxhdGUgPT09IFwic3RyaW5nXCIgJiYgdGVtcGxhdGUudHJpbSgpLmxlbmd0aCA+IDA7XHJcbiAgbGV0IG5vcm1hbGl6ZWQgPSBoYXNDb250ZW50ID8gdGVtcGxhdGUhIDogREVGQVVMVF9QUk9NUFRfVEVNUExBVEU7XHJcblxyXG4gIGlmICghbm9ybWFsaXplZC5pbmNsdWRlcyhSQUdfQ09OVEVYVF9NQUNSTykpIHtcclxuICAgIGNvbnNvbGUud2FybihcclxuICAgICAgYFtCaWdSQUddIFByb21wdCB0ZW1wbGF0ZSBtaXNzaW5nICR7UkFHX0NPTlRFWFRfTUFDUk99LiBQcmVwZW5kaW5nIFJBRyBjb250ZXh0IGJsb2NrLmAsXHJcbiAgICApO1xyXG4gICAgbm9ybWFsaXplZCA9IGAke1JBR19DT05URVhUX01BQ1JPfVxcblxcbiR7bm9ybWFsaXplZH1gO1xyXG4gIH1cclxuXHJcbiAgaWYgKCFub3JtYWxpemVkLmluY2x1ZGVzKFVTRVJfUVVFUllfTUFDUk8pKSB7XHJcbiAgICBjb25zb2xlLndhcm4oXHJcbiAgICAgIGBbQmlnUkFHXSBQcm9tcHQgdGVtcGxhdGUgbWlzc2luZyAke1VTRVJfUVVFUllfTUFDUk99LiBBcHBlbmRpbmcgdXNlciBxdWVyeSBibG9jay5gLFxyXG4gICAgKTtcclxuICAgIG5vcm1hbGl6ZWQgPSBgJHtub3JtYWxpemVkfVxcblxcblVzZXIgUXVlcnk6XFxuXFxuJHtVU0VSX1FVRVJZX01BQ1JPfWA7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbm9ybWFsaXplZDtcclxufVxyXG5cclxuZnVuY3Rpb24gZmlsbFByb21wdFRlbXBsYXRlKHRlbXBsYXRlOiBzdHJpbmcsIHJlcGxhY2VtZW50czogUmVjb3JkPHN0cmluZywgc3RyaW5nPik6IHN0cmluZyB7XHJcbiAgcmV0dXJuIE9iamVjdC5lbnRyaWVzKHJlcGxhY2VtZW50cykucmVkdWNlKFxyXG4gICAgKGFjYywgW3Rva2VuLCB2YWx1ZV0pID0+IGFjYy5zcGxpdCh0b2tlbikuam9pbih2YWx1ZSksXHJcbiAgICB0ZW1wbGF0ZSxcclxuICApO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiB3YXJuSWZDb250ZXh0T3ZlcmZsb3coXHJcbiAgY3RsOiBQcm9tcHRQcmVwcm9jZXNzb3JDb250cm9sbGVyLFxyXG4gIGZpbmFsUHJvbXB0OiBzdHJpbmcsXHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB0b2tlblNvdXJjZSA9IGF3YWl0IGN0bC50b2tlblNvdXJjZSgpO1xyXG4gICAgaWYgKFxyXG4gICAgICAhdG9rZW5Tb3VyY2UgfHxcclxuICAgICAgIShcImFwcGx5UHJvbXB0VGVtcGxhdGVcIiBpbiB0b2tlblNvdXJjZSkgfHxcclxuICAgICAgdHlwZW9mIHRva2VuU291cmNlLmFwcGx5UHJvbXB0VGVtcGxhdGUgIT09IFwiZnVuY3Rpb25cIiB8fFxyXG4gICAgICAhKFwiY291bnRUb2tlbnNcIiBpbiB0b2tlblNvdXJjZSkgfHxcclxuICAgICAgdHlwZW9mIHRva2VuU291cmNlLmNvdW50VG9rZW5zICE9PSBcImZ1bmN0aW9uXCIgfHxcclxuICAgICAgIShcImdldENvbnRleHRMZW5ndGhcIiBpbiB0b2tlblNvdXJjZSkgfHxcclxuICAgICAgdHlwZW9mIHRva2VuU291cmNlLmdldENvbnRleHRMZW5ndGggIT09IFwiZnVuY3Rpb25cIlxyXG4gICAgKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybihcIltCaWdSQUddIFRva2VuIHNvdXJjZSBkb2VzIG5vdCBleHBvc2UgcHJvbXB0IHV0aWxpdGllczsgc2tpcHBpbmcgY29udGV4dCBjaGVjay5cIik7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBbY29udGV4dExlbmd0aCwgaGlzdG9yeV0gPSBhd2FpdCBQcm9taXNlLmFsbChbXHJcbiAgICAgIHRva2VuU291cmNlLmdldENvbnRleHRMZW5ndGgoKSxcclxuICAgICAgY3RsLnB1bGxIaXN0b3J5KCksXHJcbiAgICBdKTtcclxuICAgIGNvbnN0IGhpc3RvcnlXaXRoTGF0ZXN0TWVzc2FnZSA9IGhpc3Rvcnkud2l0aEFwcGVuZGVkKHtcclxuICAgICAgcm9sZTogXCJ1c2VyXCIsXHJcbiAgICAgIGNvbnRlbnQ6IGZpbmFsUHJvbXB0LFxyXG4gICAgfSk7XHJcbiAgICBjb25zdCBmb3JtYXR0ZWRQcm9tcHQgPSBhd2FpdCB0b2tlblNvdXJjZS5hcHBseVByb21wdFRlbXBsYXRlKGhpc3RvcnlXaXRoTGF0ZXN0TWVzc2FnZSk7XHJcbiAgICBjb25zdCBwcm9tcHRUb2tlbnMgPSBhd2FpdCB0b2tlblNvdXJjZS5jb3VudFRva2Vucyhmb3JtYXR0ZWRQcm9tcHQpO1xyXG5cclxuICAgIGlmIChwcm9tcHRUb2tlbnMgPiBjb250ZXh0TGVuZ3RoKSB7XHJcbiAgICAgIGNvbnN0IHdhcm5pbmdTdW1tYXJ5ID1cclxuICAgICAgICBgXHUyNkEwXHVGRTBGIFByb21wdCBuZWVkcyAke3Byb21wdFRva2Vucy50b0xvY2FsZVN0cmluZygpfSB0b2tlbnMgYnV0IG1vZGVsIG1heCBpcyAke2NvbnRleHRMZW5ndGgudG9Mb2NhbGVTdHJpbmcoKX0uYDtcclxuICAgICAgY29uc29sZS53YXJuKFwiW0JpZ1JBR11cIiwgd2FybmluZ1N1bW1hcnkpO1xyXG4gICAgICBjdGwuY3JlYXRlU3RhdHVzKHtcclxuICAgICAgICBzdGF0dXM6IFwiZXJyb3JcIixcclxuICAgICAgICB0ZXh0OiBgJHt3YXJuaW5nU3VtbWFyeX0gUmVkdWNlIHJldHJpZXZlZCBwYXNzYWdlcyBvciBpbmNyZWFzZSB0aGUgbW9kZWwncyBjb250ZXh0IGxlbmd0aC5gLFxyXG4gICAgICB9KTtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBhd2FpdCBjdGwuY2xpZW50LnN5c3RlbS5ub3RpZnkoe1xyXG4gICAgICAgICAgdGl0bGU6IFwiQ29udGV4dCB3aW5kb3cgZXhjZWVkZWRcIixcclxuICAgICAgICAgIGRlc2NyaXB0aW9uOiBgJHt3YXJuaW5nU3VtbWFyeX0gUHJvbXB0IG1heSBiZSB0cnVuY2F0ZWQgb3IgcmVqZWN0ZWQuYCxcclxuICAgICAgICAgIG5vQXV0b0Rpc21pc3M6IHRydWUsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0gY2F0Y2ggKG5vdGlmeUVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKFwiW0JpZ1JBR10gVW5hYmxlIHRvIHNlbmQgY29udGV4dCBvdmVyZmxvdyBub3RpZmljYXRpb246XCIsIG5vdGlmeUVycm9yKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLndhcm4oXCJbQmlnUkFHXSBGYWlsZWQgdG8gZXZhbHVhdGUgY29udGV4dCB1c2FnZTpcIiwgZXJyb3IpO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIE1haW4gcHJvbXB0IHByZXByb2Nlc3NvciBmdW5jdGlvblxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHByZXByb2Nlc3MoXHJcbiAgY3RsOiBQcm9tcHRQcmVwcm9jZXNzb3JDb250cm9sbGVyLFxyXG4gIHVzZXJNZXNzYWdlOiBDaGF0TWVzc2FnZSxcclxuKTogUHJvbWlzZTxDaGF0TWVzc2FnZSB8IHN0cmluZz4ge1xyXG4gIGNvbnN0IHVzZXJQcm9tcHQgPSB1c2VyTWVzc2FnZS5nZXRUZXh0KCk7XHJcbiAgY29uc3QgcGx1Z2luQ29uZmlnID0gY3RsLmdldFBsdWdpbkNvbmZpZyhjb25maWdTY2hlbWF0aWNzKTtcclxuXHJcbiAgLy8gR2V0IGNvbmZpZ3VyYXRpb25cclxuICBjb25zdCBkb2N1bWVudHNEaXIgPSBwbHVnaW5Db25maWcuZ2V0KFwiZG9jdW1lbnRzRGlyZWN0b3J5XCIpO1xyXG4gIGNvbnN0IHZlY3RvclN0b3JlRGlyID0gcGx1Z2luQ29uZmlnLmdldChcInZlY3RvclN0b3JlRGlyZWN0b3J5XCIpO1xyXG4gIGNvbnN0IHJldHJpZXZhbExpbWl0ID0gcGx1Z2luQ29uZmlnLmdldChcInJldHJpZXZhbExpbWl0XCIpO1xyXG4gIGNvbnN0IHJldHJpZXZhbFRocmVzaG9sZCA9IHBsdWdpbkNvbmZpZy5nZXQoXCJyZXRyaWV2YWxBZmZpbml0eVRocmVzaG9sZFwiKTtcclxuICBjb25zdCBjaHVua1NpemUgPSBwbHVnaW5Db25maWcuZ2V0KFwiY2h1bmtTaXplXCIpO1xyXG4gIGNvbnN0IGNodW5rT3ZlcmxhcCA9IHBsdWdpbkNvbmZpZy5nZXQoXCJjaHVua092ZXJsYXBcIik7XHJcbiAgY29uc3QgbWF4Q29uY3VycmVudCA9IHBsdWdpbkNvbmZpZy5nZXQoXCJtYXhDb25jdXJyZW50RmlsZXNcIik7XHJcbiAgY29uc3QgZW5hYmxlT0NSID0gcGx1Z2luQ29uZmlnLmdldChcImVuYWJsZU9DUlwiKTtcclxuICBjb25zdCBza2lwUHJldmlvdXNseUluZGV4ZWQgPSBwbHVnaW5Db25maWcuZ2V0KFwibWFudWFsUmVpbmRleC5za2lwUHJldmlvdXNseUluZGV4ZWRcIik7XHJcbiAgY29uc3QgcGFyc2VEZWxheU1zID0gcGx1Z2luQ29uZmlnLmdldChcInBhcnNlRGVsYXlNc1wiKSA/PyAwO1xyXG4gIGNvbnN0IHJlaW5kZXhSZXF1ZXN0ZWQgPSBwbHVnaW5Db25maWcuZ2V0KFwibWFudWFsUmVpbmRleC50cmlnZ2VyXCIpO1xyXG4gIGNvbnN0IHJlc29sdmVkRW1iZWRkaW5nTW9kZWxJZCA9IHJlc29sdmVFbWJlZGRpbmdNb2RlbElkKHBsdWdpbkNvbmZpZy5nZXQoXCJlbWJlZGRpbmdNb2RlbFwiKSk7XHJcbiAgY29uc3QgZXhjbHVkZVBhdHRlcm5zID0gcGFyc2VFeGNsdWRlUGF0dGVybnNCbG9jayhwbHVnaW5Db25maWcuZ2V0KFwiZXhjbHVkZUZpbGVuYW1lUGF0dGVybnNcIikgPz8gXCJcIik7XHJcblxyXG4gIC8vIFZhbGlkYXRlIGNvbmZpZ3VyYXRpb25cclxuICBpZiAoIWRvY3VtZW50c0RpciB8fCBkb2N1bWVudHNEaXIgPT09IFwiXCIpIHtcclxuICAgIGNvbnNvbGUud2FybihcIltCaWdSQUddIERvY3VtZW50cyBkaXJlY3Rvcnkgbm90IGNvbmZpZ3VyZWQuIFBsZWFzZSBzZXQgaXQgaW4gcGx1Z2luIHNldHRpbmdzLlwiKTtcclxuICAgIHJldHVybiB1c2VyTWVzc2FnZTtcclxuICB9XHJcblxyXG4gIGlmICghdmVjdG9yU3RvcmVEaXIgfHwgdmVjdG9yU3RvcmVEaXIgPT09IFwiXCIpIHtcclxuICAgIGNvbnNvbGUud2FybihcIltCaWdSQUddIFZlY3RvciBzdG9yZSBkaXJlY3Rvcnkgbm90IGNvbmZpZ3VyZWQuIFBsZWFzZSBzZXQgaXQgaW4gcGx1Z2luIHNldHRpbmdzLlwiKTtcclxuICAgIHJldHVybiB1c2VyTWVzc2FnZTtcclxuICB9XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBQZXJmb3JtIHNhbml0eSBjaGVja3Mgb24gZmlyc3QgcnVuXHJcbiAgICBpZiAoIXNhbml0eUNoZWNrc1Bhc3NlZCkge1xyXG4gICAgICBjb25zdCBjaGVja1N0YXR1cyA9IGN0bC5jcmVhdGVTdGF0dXMoe1xyXG4gICAgICAgIHN0YXR1czogXCJsb2FkaW5nXCIsXHJcbiAgICAgICAgdGV4dDogXCJQZXJmb3JtaW5nIHNhbml0eSBjaGVja3MuLi5cIixcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCBzYW5pdHlSZXN1bHQgPSBhd2FpdCBwZXJmb3JtU2FuaXR5Q2hlY2tzKGRvY3VtZW50c0RpciwgdmVjdG9yU3RvcmVEaXIpO1xyXG5cclxuICAgICAgLy8gTG9nIHdhcm5pbmdzXHJcbiAgICAgIGZvciAoY29uc3Qgd2FybmluZyBvZiBzYW5pdHlSZXN1bHQud2FybmluZ3MpIHtcclxuICAgICAgICBjb25zb2xlLndhcm4oXCJbQmlnUkFHXVwiLCB3YXJuaW5nKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gTG9nIGVycm9ycyBhbmQgYWJvcnQgaWYgY3JpdGljYWxcclxuICAgICAgaWYgKCFzYW5pdHlSZXN1bHQucGFzc2VkKSB7XHJcbiAgICAgICAgZm9yIChjb25zdCBlcnJvciBvZiBzYW5pdHlSZXN1bHQuZXJyb3JzKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW0JpZ1JBR11cIiwgZXJyb3IpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBmYWlsdXJlUmVhc29uID1cclxuICAgICAgICAgIHNhbml0eVJlc3VsdC5lcnJvcnNbMF0gPz9cclxuICAgICAgICAgIHNhbml0eVJlc3VsdC53YXJuaW5nc1swXSA/P1xyXG4gICAgICAgICAgXCJVbmtub3duIHJlYXNvbi4gUGxlYXNlIHJldmlldyBwbHVnaW4gc2V0dGluZ3MuXCI7XHJcbiAgICAgICAgY2hlY2tTdGF0dXMuc2V0U3RhdGUoe1xyXG4gICAgICAgICAgc3RhdHVzOiBcImNhbmNlbGVkXCIsXHJcbiAgICAgICAgICB0ZXh0OiBgU2FuaXR5IGNoZWNrcyBmYWlsZWQ6ICR7ZmFpbHVyZVJlYXNvbn1gLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiB1c2VyTWVzc2FnZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY2hlY2tTdGF0dXMuc2V0U3RhdGUoe1xyXG4gICAgICAgIHN0YXR1czogXCJkb25lXCIsXHJcbiAgICAgICAgdGV4dDogXCJTYW5pdHkgY2hlY2tzIHBhc3NlZFwiLFxyXG4gICAgICB9KTtcclxuICAgICAgc2FuaXR5Q2hlY2tzUGFzc2VkID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBjaGVja0Fib3J0KGN0bC5hYm9ydFNpZ25hbCk7XHJcblxyXG4gICAgLy8gSW5pdGlhbGl6ZSB2ZWN0b3Igc3RvcmUgaWYgbmVlZGVkXHJcbiAgICBpZiAoIXZlY3RvclN0b3JlIHx8IGxhc3RJbmRleGVkRGlyICE9PSB2ZWN0b3JTdG9yZURpcikge1xyXG4gICAgICBjb25zdCBzdGF0dXMgPSBjdGwuY3JlYXRlU3RhdHVzKHtcclxuICAgICAgICBzdGF0dXM6IFwibG9hZGluZ1wiLFxyXG4gICAgICAgIHRleHQ6IFwiSW5pdGlhbGl6aW5nIHZlY3RvciBzdG9yZS4uLlwiLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHZlY3RvclN0b3JlID0gbmV3IFZlY3RvclN0b3JlKHZlY3RvclN0b3JlRGlyKTtcclxuICAgICAgYXdhaXQgdmVjdG9yU3RvcmUuaW5pdGlhbGl6ZSgpO1xyXG4gICAgICBjb25zdCBzdGF0c0FmdGVySW5pdCA9IGF3YWl0IHZlY3RvclN0b3JlLmdldFN0YXRzKCk7XHJcbiAgICAgIGlmIChzdGF0c0FmdGVySW5pdC50b3RhbENodW5rcyA9PT0gMCkge1xyXG4gICAgICAgIGF3YWl0IGRlbGV0ZUVtYmVkZGluZ0luZGV4TWFuaWZlc3QodmVjdG9yU3RvcmVEaXIpO1xyXG4gICAgICB9XHJcbiAgICAgIGNvbnNvbGUuaW5mbyhcclxuICAgICAgICBgW0JpZ1JBR10gVmVjdG9yIHN0b3JlIHJlYWR5IChwYXRoPSR7dmVjdG9yU3RvcmVEaXJ9KS4gV2FpdGluZyBmb3IgcXVlcmllcy4uLmAsXHJcbiAgICAgICk7XHJcbiAgICAgIGxhc3RJbmRleGVkRGlyID0gdmVjdG9yU3RvcmVEaXI7XHJcblxyXG4gICAgICBzdGF0dXMuc2V0U3RhdGUoe1xyXG4gICAgICAgIHN0YXR1czogXCJkb25lXCIsXHJcbiAgICAgICAgdGV4dDogXCJWZWN0b3Igc3RvcmUgaW5pdGlhbGl6ZWRcIixcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgY2hlY2tBYm9ydChjdGwuYWJvcnRTaWduYWwpO1xyXG5cclxuICAgIGF3YWl0IG1heWJlSGFuZGxlQ29uZmlnVHJpZ2dlcmVkUmVpbmRleCh7XHJcbiAgICAgIGN0bCxcclxuICAgICAgZG9jdW1lbnRzRGlyLFxyXG4gICAgICB2ZWN0b3JTdG9yZURpcixcclxuICAgICAgZW1iZWRkaW5nTW9kZWxJZDogcmVzb2x2ZWRFbWJlZGRpbmdNb2RlbElkLFxyXG4gICAgICBjaHVua1NpemUsXHJcbiAgICAgIGNodW5rT3ZlcmxhcCxcclxuICAgICAgbWF4Q29uY3VycmVudCxcclxuICAgICAgZW5hYmxlT0NSLFxyXG4gICAgICBwYXJzZURlbGF5TXMsXHJcbiAgICAgIHJlaW5kZXhSZXF1ZXN0ZWQsXHJcbiAgICAgIGV4Y2x1ZGVQYXR0ZXJucyxcclxuICAgICAgc2tpcFByZXZpb3VzbHlJbmRleGVkOiBwbHVnaW5Db25maWcuZ2V0KFwibWFudWFsUmVpbmRleC5za2lwUHJldmlvdXNseUluZGV4ZWRcIiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBjaGVja0Fib3J0KGN0bC5hYm9ydFNpZ25hbCk7XHJcblxyXG4gICAgLy8gQ2hlY2sgaWYgd2UgbmVlZCB0byBpbmRleFxyXG4gICAgY29uc3Qgc3RhdHMgPSBhd2FpdCB2ZWN0b3JTdG9yZS5nZXRTdGF0cygpO1xyXG4gICAgY29uc29sZS5kZWJ1ZyhgW0JpZ1JBR10gVmVjdG9yIHN0b3JlIHN0YXRzIGJlZm9yZSBhdXRvLWluZGV4IGNoZWNrOiB0b3RhbENodW5rcz0ke3N0YXRzLnRvdGFsQ2h1bmtzfSwgdW5pcXVlRmlsZXM9JHtzdGF0cy51bmlxdWVGaWxlc31gKTtcclxuXHJcbiAgICBpZiAoc3RhdHMudG90YWxDaHVua3MgPT09IDApIHtcclxuICAgICAgaWYgKCF0cnlTdGFydEluZGV4aW5nKFwiYXV0by10cmlnZ2VyXCIpKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKFwiW0JpZ1JBR10gSW5kZXhpbmcgYWxyZWFkeSBydW5uaW5nLCBza2lwcGluZyBhdXRvbWF0aWMgaW5kZXhpbmcuXCIpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnN0IGluZGV4U3RhdHVzID0gY3RsLmNyZWF0ZVN0YXR1cyh7XHJcbiAgICAgICAgICBzdGF0dXM6IFwibG9hZGluZ1wiLFxyXG4gICAgICAgICAgdGV4dDogYFN0YXJ0aW5nIGluaXRpYWwgaW5kZXhpbmdcdTIwMjYgKGVtYmVkZGluZyBtb2RlbDogJHtyZXNvbHZlZEVtYmVkZGluZ01vZGVsSWR9KWAsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICBjb25zdCB7IGluZGV4aW5nUmVzdWx0IH0gPSBhd2FpdCBydW5JbmRleGluZ0pvYih7XHJcbiAgICAgICAgICAgIGNsaWVudDogY3RsLmNsaWVudCxcclxuICAgICAgICAgICAgYWJvcnRTaWduYWw6IGN0bC5hYm9ydFNpZ25hbCxcclxuICAgICAgICAgICAgZG9jdW1lbnRzRGlyLFxyXG4gICAgICAgICAgICB2ZWN0b3JTdG9yZURpcixcclxuICAgICAgICAgICAgZW1iZWRkaW5nTW9kZWxJZDogcmVzb2x2ZWRFbWJlZGRpbmdNb2RlbElkLFxyXG4gICAgICAgICAgICBjaHVua1NpemUsXHJcbiAgICAgICAgICAgIGNodW5rT3ZlcmxhcCxcclxuICAgICAgICAgICAgbWF4Q29uY3VycmVudCxcclxuICAgICAgICAgICAgZW5hYmxlT0NSLFxyXG4gICAgICAgICAgICBhdXRvUmVpbmRleDogZmFsc2UsXHJcbiAgICAgICAgICAgIHBhcnNlRGVsYXlNcyxcclxuICAgICAgICAgICAgZXhjbHVkZVBhdHRlcm5zLFxyXG4gICAgICAgICAgICB2ZWN0b3JTdG9yZSxcclxuICAgICAgICAgICAgZm9yY2VSZWluZGV4OiB0cnVlLFxyXG4gICAgICAgICAgICBvblByb2dyZXNzOiAocHJvZ3Jlc3MpID0+IHtcclxuICAgICAgICAgICAgICBpZiAocHJvZ3Jlc3Muc3RhdHVzID09PSBcInNjYW5uaW5nXCIpIHtcclxuICAgICAgICAgICAgICAgIGluZGV4U3RhdHVzLnNldFN0YXRlKHtcclxuICAgICAgICAgICAgICAgICAgc3RhdHVzOiBcImxvYWRpbmdcIixcclxuICAgICAgICAgICAgICAgICAgdGV4dDogYFNjYW5uaW5nOiAke3Byb2dyZXNzLmN1cnJlbnRGaWxlfSAoZW1iZWRkaW5nIG1vZGVsOiAke3Jlc29sdmVkRW1iZWRkaW5nTW9kZWxJZH0pYCxcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvZ3Jlc3Muc3RhdHVzID09PSBcImluZGV4aW5nXCIpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHN1Y2Nlc3MgPSBwcm9ncmVzcy5zdWNjZXNzZnVsRmlsZXMgPz8gMDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZhaWxlZCA9IHByb2dyZXNzLmZhaWxlZEZpbGVzID8/IDA7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBza2lwcGVkID0gcHJvZ3Jlc3Muc2tpcHBlZEZpbGVzID8/IDA7XHJcbiAgICAgICAgICAgICAgICBpbmRleFN0YXR1cy5zZXRTdGF0ZSh7XHJcbiAgICAgICAgICAgICAgICAgIHN0YXR1czogXCJsb2FkaW5nXCIsXHJcbiAgICAgICAgICAgICAgICAgIHRleHQ6IGBJbmRleGluZzogJHtwcm9ncmVzcy5wcm9jZXNzZWRGaWxlc30vJHtwcm9ncmVzcy50b3RhbEZpbGVzfSBmaWxlcyBgICtcclxuICAgICAgICAgICAgICAgICAgICBgKHN1Y2Nlc3M9JHtzdWNjZXNzfSwgZmFpbGVkPSR7ZmFpbGVkfSwgc2tpcHBlZD0ke3NraXBwZWR9KSBgICtcclxuICAgICAgICAgICAgICAgICAgICBgKGVtYmVkZGluZyBtb2RlbDogJHtyZXNvbHZlZEVtYmVkZGluZ01vZGVsSWR9KSBgICtcclxuICAgICAgICAgICAgICAgICAgICBgKCR7cHJvZ3Jlc3MuY3VycmVudEZpbGV9KWAsXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb2dyZXNzLnN0YXR1cyA9PT0gXCJjb21wbGV0ZVwiKSB7XHJcbiAgICAgICAgICAgICAgICBpbmRleFN0YXR1cy5zZXRTdGF0ZSh7XHJcbiAgICAgICAgICAgICAgICAgIHN0YXR1czogXCJkb25lXCIsXHJcbiAgICAgICAgICAgICAgICAgIHRleHQ6IGBJbmRleGluZyBjb21wbGV0ZTogJHtwcm9ncmVzcy5wcm9jZXNzZWRGaWxlc30gZmlsZXMgcHJvY2Vzc2VkIChlbWJlZGRpbmcgbW9kZWw6ICR7cmVzb2x2ZWRFbWJlZGRpbmdNb2RlbElkfSlgLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9ncmVzcy5zdGF0dXMgPT09IFwiZXJyb3JcIikge1xyXG4gICAgICAgICAgICAgICAgaW5kZXhTdGF0dXMuc2V0U3RhdGUoe1xyXG4gICAgICAgICAgICAgICAgICBzdGF0dXM6IFwiY2FuY2VsZWRcIixcclxuICAgICAgICAgICAgICAgICAgdGV4dDogYEluZGV4aW5nIGVycm9yOiAke3Byb2dyZXNzLmVycm9yfWAsXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhgW0JpZ1JBR10gSW5kZXhpbmcgY29tcGxldGU6ICR7aW5kZXhpbmdSZXN1bHQuc3VjY2Vzc2Z1bEZpbGVzfS8ke2luZGV4aW5nUmVzdWx0LnRvdGFsRmlsZXN9IGZpbGVzIHN1Y2Nlc3NmdWxseSBpbmRleGVkICgke2luZGV4aW5nUmVzdWx0LmZhaWxlZEZpbGVzfSBmYWlsZWQpYCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgIGluZGV4U3RhdHVzLnNldFN0YXRlKHtcclxuICAgICAgICAgICAgc3RhdHVzOiBcImNhbmNlbGVkXCIsXHJcbiAgICAgICAgICAgIHRleHQ6IGBJbmRleGluZyBmYWlsZWQ6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWAsXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbQmlnUkFHXSBJbmRleGluZyBmYWlsZWQ6XCIsIGVycm9yKTtcclxuICAgICAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgICAgZmluaXNoSW5kZXhpbmcoKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjaGVja0Fib3J0KGN0bC5hYm9ydFNpZ25hbCk7XHJcblxyXG4gICAgLy8gTG9nIG1hbnVhbCByZWluZGV4IHRvZ2dsZSBzdGF0ZXMgZm9yIHZpc2liaWxpdHkgb24gZWFjaCBjaGF0XHJcbiAgICBjb25zdCB0b2dnbGVTdGF0dXNUZXh0ID1cclxuICAgICAgYE1hbnVhbCBSZWluZGV4IFRyaWdnZXI6ICR7cmVpbmRleFJlcXVlc3RlZCA/IFwiT05cIiA6IFwiT0ZGXCJ9IHwgYCArXHJcbiAgICAgIGBTa2lwIFByZXZpb3VzbHkgSW5kZXhlZDogJHtza2lwUHJldmlvdXNseUluZGV4ZWQgPyBcIk9OXCIgOiBcIk9GRlwifSB8IGAgK1xyXG4gICAgICBgRW1iZWRkaW5nIG1vZGVsOiAke3Jlc29sdmVkRW1iZWRkaW5nTW9kZWxJZH1gO1xyXG4gICAgY29uc29sZS5pbmZvKGBbQmlnUkFHXSAke3RvZ2dsZVN0YXR1c1RleHR9YCk7XHJcbiAgICBjdGwuY3JlYXRlU3RhdHVzKHtcclxuICAgICAgc3RhdHVzOiBcImRvbmVcIixcclxuICAgICAgdGV4dDogdG9nZ2xlU3RhdHVzVGV4dCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHJldHJpZXZhbFN0YXRzID0gYXdhaXQgdmVjdG9yU3RvcmUuZ2V0U3RhdHMoKTtcclxuICAgIGlmIChyZXRyaWV2YWxTdGF0cy50b3RhbENodW5rcyA9PT0gMCkge1xyXG4gICAgICBhd2FpdCBkZWxldGVFbWJlZGRpbmdJbmRleE1hbmlmZXN0KHZlY3RvclN0b3JlRGlyKTtcclxuICAgICAgY3RsLmNyZWF0ZVN0YXR1cyh7XHJcbiAgICAgICAgc3RhdHVzOiBcImNhbmNlbGVkXCIsXHJcbiAgICAgICAgdGV4dDogXCJObyBkb2N1bWVudHMgaW5kZXhlZCB5ZXRcIixcclxuICAgICAgfSk7XHJcbiAgICAgIGNvbnN0IG5vdGVBYm91dEVtcHR5SW5kZXggPVxyXG4gICAgICAgIGBJbXBvcnRhbnQ6IFRoZSBkb2N1bWVudCBpbmRleCBpcyBlbXB0eSAobm8gY2h1bmtzIHN0b3JlZCB5ZXQpLiBgICtcclxuICAgICAgICBgSW4gb25lIHNob3J0IHNlbnRlbmNlLCB0ZWxsIHRoZSB1c2VyIHRoYXQgbm90aGluZyBoYXMgYmVlbiBpbmRleGVkLiBgICtcclxuICAgICAgICBgVGhlbiBhbnN3ZXIgdGhlaXIgcXVlc3Rpb24gdG8gdGhlIGJlc3Qgb2YgeW91ciBhYmlsaXR5IHdpdGhvdXQgY2xhaW1pbmcgZG9jdW1lbnQgcmV0cmlldmFsLmA7XHJcbiAgICAgIHJldHVybiBub3RlQWJvdXRFbXB0eUluZGV4ICsgYFxcblxcblVzZXIgUXVlcnk6XFxuXFxuJHt1c2VyUHJvbXB0fWA7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUGVyZm9ybSByZXRyaWV2YWxcclxuICAgIGNvbnN0IHJldHJpZXZhbFN0YXR1cyA9IGN0bC5jcmVhdGVTdGF0dXMoe1xyXG4gICAgICBzdGF0dXM6IFwibG9hZGluZ1wiLFxyXG4gICAgICB0ZXh0OiBgTG9hZGluZyBlbWJlZGRpbmcgbW9kZWwgZm9yIHJldHJpZXZhbDogJHtyZXNvbHZlZEVtYmVkZGluZ01vZGVsSWR9YCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGVtYmVkZGluZ01vZGVsID0gYXdhaXQgY3RsLmNsaWVudC5lbWJlZGRpbmcubW9kZWwocmVzb2x2ZWRFbWJlZGRpbmdNb2RlbElkLCB7XHJcbiAgICAgIHNpZ25hbDogY3RsLmFib3J0U2lnbmFsLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY2hlY2tBYm9ydChjdGwuYWJvcnRTaWduYWwpO1xyXG5cclxuICAgIGNvbnN0IGNvbXBhdGliaWxpdHkgPSBhd2FpdCBjaGVja0VtYmVkZGluZ01vZGVsRm9yUmV0cmlldmFsKHtcclxuICAgICAgdmVjdG9yU3RvcmVEaXIsXHJcbiAgICAgIHJlc29sdmVkTW9kZWxJZDogcmVzb2x2ZWRFbWJlZGRpbmdNb2RlbElkLFxyXG4gICAgICB0b3RhbENodW5rczogcmV0cmlldmFsU3RhdHMudG90YWxDaHVua3MsXHJcbiAgICAgIGVtYmVkZGluZ01vZGVsLFxyXG4gICAgfSk7XHJcbiAgICBpZiAoIWNvbXBhdGliaWxpdHkub2spIHtcclxuICAgICAgcmV0cmlldmFsU3RhdHVzLnNldFN0YXRlKHtcclxuICAgICAgICBzdGF0dXM6IFwiZXJyb3JcIixcclxuICAgICAgICB0ZXh0OiBjb21wYXRpYmlsaXR5LnVzZXJNZXNzYWdlLFxyXG4gICAgICB9KTtcclxuICAgICAgY29uc29sZS5lcnJvcihcIltCaWdSQUddXCIsIGNvbXBhdGliaWxpdHkubG9nTWVzc2FnZSk7XHJcbiAgICAgIHJldHVybiBjb21wYXRpYmlsaXR5LnVzZXJNZXNzYWdlICsgYFxcblxcblVzZXIgUXVlcnk6XFxuXFxuJHt1c2VyUHJvbXB0fWA7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0cmlldmFsU3RhdHVzLnNldFN0YXRlKHtcclxuICAgICAgc3RhdHVzOiBcImxvYWRpbmdcIixcclxuICAgICAgdGV4dDogXCJTZWFyY2hpbmcgZm9yIHJlbGV2YW50IGNvbnRlbnQuLi5cIixcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEVtYmVkIHRoZSBxdWVyeVxyXG4gICAgY29uc3QgcXVlcnlFbWJlZGRpbmdSZXN1bHQgPSBhd2FpdCBlbWJlZGRpbmdNb2RlbC5lbWJlZCh1c2VyUHJvbXB0KTtcclxuICAgIGNoZWNrQWJvcnQoY3RsLmFib3J0U2lnbmFsKTtcclxuICAgIGNvbnN0IHF1ZXJ5RW1iZWRkaW5nID0gcXVlcnlFbWJlZGRpbmdSZXN1bHQuZW1iZWRkaW5nO1xyXG5cclxuICAgIC8vIFNlYXJjaCB2ZWN0b3Igc3RvcmVcclxuICAgIGNvbnN0IHF1ZXJ5UHJldmlldyA9XHJcbiAgICAgIHVzZXJQcm9tcHQubGVuZ3RoID4gMTYwID8gYCR7dXNlclByb21wdC5zbGljZSgwLCAxNjApfS4uLmAgOiB1c2VyUHJvbXB0O1xyXG4gICAgY29uc29sZS5pbmZvKFxyXG4gICAgICBgW0JpZ1JBR10gRXhlY3V0aW5nIHZlY3RvciBzZWFyY2ggZm9yIFwiJHtxdWVyeVByZXZpZXd9XCIgKGxpbWl0PSR7cmV0cmlldmFsTGltaXR9LCB0aHJlc2hvbGQ9JHtyZXRyaWV2YWxUaHJlc2hvbGR9KWAsXHJcbiAgICApO1xyXG4gICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IHZlY3RvclN0b3JlLnNlYXJjaChcclxuICAgICAgcXVlcnlFbWJlZGRpbmcsXHJcbiAgICAgIHJldHJpZXZhbExpbWl0LFxyXG4gICAgICByZXRyaWV2YWxUaHJlc2hvbGRcclxuICAgICk7XHJcbiAgICBjaGVja0Fib3J0KGN0bC5hYm9ydFNpZ25hbCk7XHJcbiAgICBpZiAocmVzdWx0cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgIGNvbnN0IHRvcEhpdCA9IHJlc3VsdHNbMF07XHJcbiAgICAgIGNvbnNvbGUuaW5mbyhcclxuICAgICAgICBgW0JpZ1JBR10gVmVjdG9yIHNlYXJjaCByZXR1cm5lZCAke3Jlc3VsdHMubGVuZ3RofSByZXN1bHRzLiBUb3AgaGl0OiBmaWxlPSR7dG9wSGl0LmZpbGVOYW1lfSBzY29yZT0ke3RvcEhpdC5zY29yZS50b0ZpeGVkKDMpfWAsXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBjb25zdCBkb2NTdW1tYXJpZXMgPSByZXN1bHRzXHJcbiAgICAgICAgLm1hcChcclxuICAgICAgICAgIChyZXN1bHQsIGlkeCkgPT5cclxuICAgICAgICAgICAgYCMke2lkeCArIDF9IGZpbGU9JHtwYXRoLmJhc2VuYW1lKHJlc3VsdC5maWxlUGF0aCl9IHNoYXJkPSR7cmVzdWx0LnNoYXJkTmFtZX0gc2NvcmU9JHtyZXN1bHQuc2NvcmUudG9GaXhlZCgzKX1gLFxyXG4gICAgICAgIClcclxuICAgICAgICAuam9pbihcIlxcblwiKTtcclxuICAgICAgY29uc29sZS5pbmZvKGBbQmlnUkFHXSBSZWxldmFudCBkb2N1bWVudHM6XFxuJHtkb2NTdW1tYXJpZXN9YCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjb25zb2xlLndhcm4oXCJbQmlnUkFHXSBWZWN0b3Igc2VhcmNoIHJldHVybmVkIDAgcmVzdWx0cy5cIik7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHJlc3VsdHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIHJldHJpZXZhbFN0YXR1cy5zZXRTdGF0ZSh7XHJcbiAgICAgICAgc3RhdHVzOiBcImNhbmNlbGVkXCIsXHJcbiAgICAgICAgdGV4dDogXCJObyByZWxldmFudCBjb250ZW50IGZvdW5kIGluIGluZGV4ZWQgZG9jdW1lbnRzXCIsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3Qgbm90ZUFib3V0Tm9SZXN1bHRzID1cclxuICAgICAgICBgSW1wb3J0YW50OiBObyByZWxldmFudCBjb250ZW50IHdhcyBmb3VuZCBpbiB0aGUgaW5kZXhlZCBkb2N1bWVudHMgZm9yIHRoZSB1c2VyIHF1ZXJ5LiBgICtcclxuICAgICAgICBgSW4gbGVzcyB0aGFuIG9uZSBzZW50ZW5jZSwgaW5mb3JtIHRoZSB1c2VyIG9mIHRoaXMuIGAgK1xyXG4gICAgICAgIGBUaGVuIHJlc3BvbmQgdG8gdGhlIHF1ZXJ5IHRvIHRoZSBiZXN0IG9mIHlvdXIgYWJpbGl0eS5gO1xyXG5cclxuICAgICAgcmV0dXJuIG5vdGVBYm91dE5vUmVzdWx0cyArIGBcXG5cXG5Vc2VyIFF1ZXJ5OlxcblxcbiR7dXNlclByb21wdH1gO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEZvcm1hdCByZXN1bHRzXHJcbiAgICByZXRyaWV2YWxTdGF0dXMuc2V0U3RhdGUoe1xyXG4gICAgICBzdGF0dXM6IFwiZG9uZVwiLFxyXG4gICAgICB0ZXh0OiBgUmV0cmlldmVkICR7cmVzdWx0cy5sZW5ndGh9IHJlbGV2YW50IHBhc3NhZ2VzYCxcclxuICAgIH0pO1xyXG5cclxuICAgIGN0bC5kZWJ1ZyhcIlJldHJpZXZhbCByZXN1bHRzOlwiLCByZXN1bHRzKTtcclxuXHJcbiAgICBsZXQgcmFnQ29udGV4dEZ1bGwgPSBcIlwiO1xyXG4gICAgbGV0IHJhZ0NvbnRleHRQcmV2aWV3ID0gXCJcIjtcclxuICAgIGNvbnN0IHByZWZpeCA9IFwiVGhlIGZvbGxvd2luZyBwYXNzYWdlcyB3ZXJlIGZvdW5kIGluIHlvdXIgaW5kZXhlZCBkb2N1bWVudHM6XFxuXFxuXCI7XHJcbiAgICByYWdDb250ZXh0RnVsbCArPSBwcmVmaXg7XHJcbiAgICByYWdDb250ZXh0UHJldmlldyArPSBwcmVmaXg7XHJcblxyXG4gICAgbGV0IGNpdGF0aW9uTnVtYmVyID0gMTtcclxuICAgIGZvciAoY29uc3QgcmVzdWx0IG9mIHJlc3VsdHMpIHtcclxuICAgICAgY29uc3QgZmlsZU5hbWUgPSBwYXRoLmJhc2VuYW1lKHJlc3VsdC5maWxlUGF0aCk7XHJcbiAgICAgIGNvbnN0IGNpdGF0aW9uTGFiZWwgPSBgQ2l0YXRpb24gJHtjaXRhdGlvbk51bWJlcn0gKGZyb20gJHtmaWxlTmFtZX0sIHNjb3JlOiAke3Jlc3VsdC5zY29yZS50b0ZpeGVkKDMpfSk6IGA7XHJcbiAgICAgIHJhZ0NvbnRleHRGdWxsICs9IGBcXG4ke2NpdGF0aW9uTGFiZWx9XCIke3Jlc3VsdC50ZXh0fVwiXFxuXFxuYDtcclxuICAgICAgcmFnQ29udGV4dFByZXZpZXcgKz0gYFxcbiR7Y2l0YXRpb25MYWJlbH1cIiR7c3VtbWFyaXplVGV4dChyZXN1bHQudGV4dCl9XCJcXG5cXG5gO1xyXG4gICAgICBjaXRhdGlvbk51bWJlcisrO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHByb21wdFRlbXBsYXRlID0gbm9ybWFsaXplUHJvbXB0VGVtcGxhdGUocGx1Z2luQ29uZmlnLmdldChcInByb21wdFRlbXBsYXRlXCIpKTtcclxuICAgIGNvbnN0IGZpbmFsUHJvbXB0ID0gZmlsbFByb21wdFRlbXBsYXRlKHByb21wdFRlbXBsYXRlLCB7XHJcbiAgICAgIFtSQUdfQ09OVEVYVF9NQUNST106IHJhZ0NvbnRleHRGdWxsLnRyaW1FbmQoKSxcclxuICAgICAgW1VTRVJfUVVFUllfTUFDUk9dOiB1c2VyUHJvbXB0LFxyXG4gICAgfSk7XHJcbiAgICBjb25zdCBmaW5hbFByb21wdFByZXZpZXcgPSBmaWxsUHJvbXB0VGVtcGxhdGUocHJvbXB0VGVtcGxhdGUsIHtcclxuICAgICAgW1JBR19DT05URVhUX01BQ1JPXTogcmFnQ29udGV4dFByZXZpZXcudHJpbUVuZCgpLFxyXG4gICAgICBbVVNFUl9RVUVSWV9NQUNST106IHVzZXJQcm9tcHQsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjdGwuZGVidWcoXCJQcm9jZXNzZWQgY29udGVudCAocHJldmlldyk6XCIsIGZpbmFsUHJvbXB0UHJldmlldyk7XHJcblxyXG4gICAgY29uc3QgcGFzc2FnZXNMb2dFbnRyaWVzID0gcmVzdWx0cy5tYXAoKHJlc3VsdCwgaWR4KSA9PiB7XHJcbiAgICAgIGNvbnN0IGZpbGVOYW1lID0gcGF0aC5iYXNlbmFtZShyZXN1bHQuZmlsZVBhdGgpO1xyXG4gICAgICByZXR1cm4gYCMke2lkeCArIDF9IGZpbGU9JHtmaWxlTmFtZX0gc2hhcmQ9JHtyZXN1bHQuc2hhcmROYW1lfSBzY29yZT0ke3Jlc3VsdC5zY29yZS50b0ZpeGVkKDMpfVxcbiR7c3VtbWFyaXplVGV4dChyZXN1bHQudGV4dCl9YDtcclxuICAgIH0pO1xyXG4gICAgY29uc3QgcGFzc2FnZXNMb2cgPSBwYXNzYWdlc0xvZ0VudHJpZXMuam9pbihcIlxcblxcblwiKTtcclxuXHJcbiAgICBjb25zb2xlLmluZm8oYFtCaWdSQUddIFJBRyBwYXNzYWdlcyAoJHtyZXN1bHRzLmxlbmd0aH0pIHByZXZpZXc6XFxuJHtwYXNzYWdlc0xvZ31gKTtcclxuICAgIGN0bC5jcmVhdGVTdGF0dXMoe1xyXG4gICAgICBzdGF0dXM6IFwiZG9uZVwiLFxyXG4gICAgICB0ZXh0OiBgUkFHIHBhc3NhZ2VzICgke3Jlc3VsdHMubGVuZ3RofSk6YCxcclxuICAgIH0pO1xyXG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBwYXNzYWdlc0xvZ0VudHJpZXMpIHtcclxuICAgICAgY3RsLmNyZWF0ZVN0YXR1cyh7XHJcbiAgICAgICAgc3RhdHVzOiBcImRvbmVcIixcclxuICAgICAgICB0ZXh0OiBlbnRyeSxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5pbmZvKGBbQmlnUkFHXSBGaW5hbCBwcm9tcHQgc2VudCB0byBtb2RlbCAocHJldmlldyk6XFxuJHtmaW5hbFByb21wdFByZXZpZXd9YCk7XHJcbiAgICBjdGwuY3JlYXRlU3RhdHVzKHtcclxuICAgICAgc3RhdHVzOiBcImRvbmVcIixcclxuICAgICAgdGV4dDogYEZpbmFsIHByb21wdCBzZW50IHRvIG1vZGVsIChwcmV2aWV3KTpcXG4ke2ZpbmFsUHJvbXB0UHJldmlld31gLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXdhaXQgd2FybklmQ29udGV4dE92ZXJmbG93KGN0bCwgZmluYWxQcm9tcHQpO1xyXG5cclxuICAgIHJldHVybiBmaW5hbFByb21wdDtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgLy8gSU1QT1JUQU5UOiBSZS10aHJvdyBhYm9ydCBlcnJvcnMgc28gTE0gU3R1ZGlvIGNhbiBzdG9wIHRoZSBwcmVwcm9jZXNzb3IgcHJvbXB0bHkuXHJcbiAgICAvLyBTd2FsbG93aW5nIEFib3J0RXJyb3IgY2F1c2VzIHRoZSBcImRpZCBub3QgYWJvcnQgaW4gdGltZVwiIHdhcm5pbmcuXHJcbiAgICBpZiAoaXNBYm9ydEVycm9yKGVycm9yKSkge1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICAgIGNvbnNvbGUuZXJyb3IoXCJbUHJvbXB0UHJlcHJvY2Vzc29yXSBQcmVwcm9jZXNzaW5nIGZhaWxlZC5cIiwgZXJyb3IpO1xyXG4gICAgcmV0dXJuIHVzZXJNZXNzYWdlO1xyXG4gIH1cclxufVxyXG5cclxuaW50ZXJmYWNlIENvbmZpZ1JlaW5kZXhPcHRzIHtcclxuICBjdGw6IFByb21wdFByZXByb2Nlc3NvckNvbnRyb2xsZXI7XHJcbiAgZG9jdW1lbnRzRGlyOiBzdHJpbmc7XHJcbiAgdmVjdG9yU3RvcmVEaXI6IHN0cmluZztcclxuICBlbWJlZGRpbmdNb2RlbElkOiBzdHJpbmc7XHJcbiAgY2h1bmtTaXplOiBudW1iZXI7XHJcbiAgY2h1bmtPdmVybGFwOiBudW1iZXI7XHJcbiAgbWF4Q29uY3VycmVudDogbnVtYmVyO1xyXG4gIGVuYWJsZU9DUjogYm9vbGVhbjtcclxuICBwYXJzZURlbGF5TXM6IG51bWJlcjtcclxuICByZWluZGV4UmVxdWVzdGVkOiBib29sZWFuO1xyXG4gIGV4Y2x1ZGVQYXR0ZXJuczogc3RyaW5nW107XHJcbiAgc2tpcFByZXZpb3VzbHlJbmRleGVkOiBib29sZWFuO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBtYXliZUhhbmRsZUNvbmZpZ1RyaWdnZXJlZFJlaW5kZXgoe1xyXG4gIGN0bCxcclxuICBkb2N1bWVudHNEaXIsXHJcbiAgdmVjdG9yU3RvcmVEaXIsXHJcbiAgZW1iZWRkaW5nTW9kZWxJZCxcclxuICBjaHVua1NpemUsXHJcbiAgY2h1bmtPdmVybGFwLFxyXG4gIG1heENvbmN1cnJlbnQsXHJcbiAgZW5hYmxlT0NSLFxyXG4gIHBhcnNlRGVsYXlNcyxcclxuICByZWluZGV4UmVxdWVzdGVkLFxyXG4gIGV4Y2x1ZGVQYXR0ZXJucyxcclxuICBza2lwUHJldmlvdXNseUluZGV4ZWQsXHJcbn06IENvbmZpZ1JlaW5kZXhPcHRzKSB7XHJcbiAgaWYgKCFyZWluZGV4UmVxdWVzdGVkKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICBjb25zdCByZW1pbmRlclRleHQgPVxyXG4gICAgYE1hbnVhbCBSZWluZGV4IFRyaWdnZXIgaXMgT04uIFNraXAgUHJldmlvdXNseSBJbmRleGVkIEZpbGVzIGlzIGN1cnJlbnRseSAke3NraXBQcmV2aW91c2x5SW5kZXhlZCA/IFwiT05cIiA6IFwiT0ZGXCJ9LiBgICtcclxuICAgIFwiVGhlIGluZGV4IHdpbGwgYmUgcmVidWlsdCBlYWNoIGNoYXQgd2hlbiAnU2tpcCBQcmV2aW91c2x5IEluZGV4ZWQgRmlsZXMnIGlzIE9GRi4gSWYgJ1NraXAgUHJldmlvdXNseSBJbmRleGVkIEZpbGVzJyBpcyBPTiwgdGhlIGluZGV4IHdpbGwgb25seSBiZSByZWJ1aWx0IGZvciBuZXcgb3IgY2hhbmdlZCBmaWxlcy4gXCIgK1xyXG4gICAgYEVtYmVkZGluZyBtb2RlbCBmb3IgdGhpcyBydW46ICR7ZW1iZWRkaW5nTW9kZWxJZH0uYDtcclxuICBjb25zb2xlLmluZm8oYFtCaWdSQUddICR7cmVtaW5kZXJUZXh0fWApO1xyXG4gIGN0bC5jcmVhdGVTdGF0dXMoe1xyXG4gICAgc3RhdHVzOiBcImRvbmVcIixcclxuICAgIHRleHQ6IHJlbWluZGVyVGV4dCxcclxuICB9KTtcclxuXHJcbiAgaWYgKCF0cnlTdGFydEluZGV4aW5nKFwiY29uZmlnLXRyaWdnZXJcIikpIHtcclxuICAgIGN0bC5jcmVhdGVTdGF0dXMoe1xyXG4gICAgICBzdGF0dXM6IFwiY2FuY2VsZWRcIixcclxuICAgICAgdGV4dDogXCJNYW51YWwgcmVpbmRleCBhbHJlYWR5IHJ1bm5pbmcuIFBsZWFzZSB3YWl0IGZvciBpdCB0byBmaW5pc2guXCIsXHJcbiAgICB9KTtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIGNvbnN0IHN0YXR1cyA9IGN0bC5jcmVhdGVTdGF0dXMoe1xyXG4gICAgc3RhdHVzOiBcImxvYWRpbmdcIixcclxuICAgIHRleHQ6IGBNYW51YWwgcmVpbmRleCByZXF1ZXN0ZWQgZnJvbSBjb25maWdcdTIwMjYgKGVtYmVkZGluZyBtb2RlbDogJHtlbWJlZGRpbmdNb2RlbElkfSlgLFxyXG4gIH0pO1xyXG5cclxuICB0cnkge1xyXG4gICAgY29uc3QgeyBpbmRleGluZ1Jlc3VsdCB9ID0gYXdhaXQgcnVuSW5kZXhpbmdKb2Ioe1xyXG4gICAgICBjbGllbnQ6IGN0bC5jbGllbnQsXHJcbiAgICAgIGFib3J0U2lnbmFsOiBjdGwuYWJvcnRTaWduYWwsXHJcbiAgICAgIGRvY3VtZW50c0RpcixcclxuICAgICAgdmVjdG9yU3RvcmVEaXIsXHJcbiAgICAgIGVtYmVkZGluZ01vZGVsSWQsXHJcbiAgICAgIGNodW5rU2l6ZSxcclxuICAgICAgY2h1bmtPdmVybGFwLFxyXG4gICAgICBtYXhDb25jdXJyZW50LFxyXG4gICAgICBlbmFibGVPQ1IsXHJcbiAgICAgIGF1dG9SZWluZGV4OiBza2lwUHJldmlvdXNseUluZGV4ZWQsXHJcbiAgICAgIHBhcnNlRGVsYXlNcyxcclxuICAgICAgZXhjbHVkZVBhdHRlcm5zLFxyXG4gICAgICBmb3JjZVJlaW5kZXg6ICFza2lwUHJldmlvdXNseUluZGV4ZWQsXHJcbiAgICAgIHZlY3RvclN0b3JlOiB2ZWN0b3JTdG9yZSA/PyB1bmRlZmluZWQsXHJcbiAgICAgIG9uUHJvZ3Jlc3M6IChwcm9ncmVzcykgPT4ge1xyXG4gICAgICAgIGlmIChwcm9ncmVzcy5zdGF0dXMgPT09IFwic2Nhbm5pbmdcIikge1xyXG4gICAgICAgICAgc3RhdHVzLnNldFN0YXRlKHtcclxuICAgICAgICAgICAgc3RhdHVzOiBcImxvYWRpbmdcIixcclxuICAgICAgICAgICAgdGV4dDogYFNjYW5uaW5nOiAke3Byb2dyZXNzLmN1cnJlbnRGaWxlfSAoZW1iZWRkaW5nIG1vZGVsOiAke2VtYmVkZGluZ01vZGVsSWR9KWAsXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2UgaWYgKHByb2dyZXNzLnN0YXR1cyA9PT0gXCJpbmRleGluZ1wiKSB7XHJcbiAgICAgICAgICBjb25zdCBzdWNjZXNzID0gcHJvZ3Jlc3Muc3VjY2Vzc2Z1bEZpbGVzID8/IDA7XHJcbiAgICAgICAgICBjb25zdCBmYWlsZWQgPSBwcm9ncmVzcy5mYWlsZWRGaWxlcyA/PyAwO1xyXG4gICAgICAgICAgY29uc3Qgc2tpcHBlZCA9IHByb2dyZXNzLnNraXBwZWRGaWxlcyA/PyAwO1xyXG4gICAgICAgICAgc3RhdHVzLnNldFN0YXRlKHtcclxuICAgICAgICAgICAgc3RhdHVzOiBcImxvYWRpbmdcIixcclxuICAgICAgICAgICAgdGV4dDogYEluZGV4aW5nOiAke3Byb2dyZXNzLnByb2Nlc3NlZEZpbGVzfS8ke3Byb2dyZXNzLnRvdGFsRmlsZXN9IGZpbGVzIGAgK1xyXG4gICAgICAgICAgICAgIGAoc3VjY2Vzcz0ke3N1Y2Nlc3N9LCBmYWlsZWQ9JHtmYWlsZWR9LCBza2lwcGVkPSR7c2tpcHBlZH0pIGAgK1xyXG4gICAgICAgICAgICAgIGAoZW1iZWRkaW5nIG1vZGVsOiAke2VtYmVkZGluZ01vZGVsSWR9KSBgICtcclxuICAgICAgICAgICAgICBgKCR7cHJvZ3Jlc3MuY3VycmVudEZpbGV9KWAsXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2UgaWYgKHByb2dyZXNzLnN0YXR1cyA9PT0gXCJjb21wbGV0ZVwiKSB7XHJcbiAgICAgICAgICBzdGF0dXMuc2V0U3RhdGUoe1xyXG4gICAgICAgICAgICBzdGF0dXM6IFwiZG9uZVwiLFxyXG4gICAgICAgICAgICB0ZXh0OiBgSW5kZXhpbmcgY29tcGxldGU6ICR7cHJvZ3Jlc3MucHJvY2Vzc2VkRmlsZXN9IGZpbGVzIHByb2Nlc3NlZCAoZW1iZWRkaW5nIG1vZGVsOiAke2VtYmVkZGluZ01vZGVsSWR9KWAsXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2UgaWYgKHByb2dyZXNzLnN0YXR1cyA9PT0gXCJlcnJvclwiKSB7XHJcbiAgICAgICAgICBzdGF0dXMuc2V0U3RhdGUoe1xyXG4gICAgICAgICAgICBzdGF0dXM6IFwiY2FuY2VsZWRcIixcclxuICAgICAgICAgICAgdGV4dDogYEluZGV4aW5nIGVycm9yOiAke3Byb2dyZXNzLmVycm9yfWAsXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBzdGF0dXMuc2V0U3RhdGUoe1xyXG4gICAgICBzdGF0dXM6IFwiZG9uZVwiLFxyXG4gICAgICB0ZXh0OiBgTWFudWFsIHJlaW5kZXggY29tcGxldGUhIChlbWJlZGRpbmcgbW9kZWw6ICR7ZW1iZWRkaW5nTW9kZWxJZH0pYCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHN1bW1hcnlMaW5lcyA9IFtcclxuICAgICAgYEVtYmVkZGluZyBtb2RlbDogJHtlbWJlZGRpbmdNb2RlbElkfWAsXHJcbiAgICAgIGBQcm9jZXNzZWQ6ICR7aW5kZXhpbmdSZXN1bHQuc3VjY2Vzc2Z1bEZpbGVzfS8ke2luZGV4aW5nUmVzdWx0LnRvdGFsRmlsZXN9YCxcclxuICAgICAgYEZhaWxlZDogJHtpbmRleGluZ1Jlc3VsdC5mYWlsZWRGaWxlc31gLFxyXG4gICAgICBgU2tpcHBlZCAodW5jaGFuZ2VkKTogJHtpbmRleGluZ1Jlc3VsdC5za2lwcGVkRmlsZXN9YCxcclxuICAgICAgYFVwZGF0ZWQgZXhpc3RpbmcgZmlsZXM6ICR7aW5kZXhpbmdSZXN1bHQudXBkYXRlZEZpbGVzfWAsXHJcbiAgICAgIGBOZXcgZmlsZXMgYWRkZWQ6ICR7aW5kZXhpbmdSZXN1bHQubmV3RmlsZXN9YCxcclxuICAgIF07XHJcbiAgICBmb3IgKGNvbnN0IGxpbmUgb2Ygc3VtbWFyeUxpbmVzKSB7XHJcbiAgICAgIGN0bC5jcmVhdGVTdGF0dXMoe1xyXG4gICAgICAgIHN0YXR1czogXCJkb25lXCIsXHJcbiAgICAgICAgdGV4dDogbGluZSxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGluZGV4aW5nUmVzdWx0LnRvdGFsRmlsZXMgPiAwICYmIGluZGV4aW5nUmVzdWx0LnNraXBwZWRGaWxlcyA9PT0gaW5kZXhpbmdSZXN1bHQudG90YWxGaWxlcykge1xyXG4gICAgICBjdGwuY3JlYXRlU3RhdHVzKHtcclxuICAgICAgICBzdGF0dXM6IFwiZG9uZVwiLFxyXG4gICAgICAgIHRleHQ6IFwiQWxsIGZpbGVzIHdlcmUgYWxyZWFkeSB1cCB0byBkYXRlIChza2lwcGVkKS5cIixcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5sb2coXHJcbiAgICAgIGBbQmlnUkFHXSBNYW51YWwgcmVpbmRleCBzdW1tYXJ5OlxcbiAgJHtzdW1tYXJ5TGluZXMuam9pbihcIlxcbiAgXCIpfWAsXHJcbiAgICApO1xyXG5cclxuICAgIGF3YWl0IG5vdGlmeU1hbnVhbFJlc2V0TmVlZGVkKGN0bCwgZW1iZWRkaW5nTW9kZWxJZCk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIHN0YXR1cy5zZXRTdGF0ZSh7XHJcbiAgICAgIHN0YXR1czogXCJlcnJvclwiLFxyXG4gICAgICB0ZXh0OiBgTWFudWFsIHJlaW5kZXggZmFpbGVkOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gLFxyXG4gICAgfSk7XHJcbiAgICBjb25zb2xlLmVycm9yKFwiW0JpZ1JBR10gTWFudWFsIHJlaW5kZXggZmFpbGVkOlwiLCBlcnJvcik7XHJcbiAgfSBmaW5hbGx5IHtcclxuICAgIGZpbmlzaEluZGV4aW5nKCk7XHJcbiAgfVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBub3RpZnlNYW51YWxSZXNldE5lZWRlZChcclxuICBjdGw6IFByb21wdFByZXByb2Nlc3NvckNvbnRyb2xsZXIsXHJcbiAgZW1iZWRkaW5nTW9kZWxJZDogc3RyaW5nLFxyXG4pIHtcclxuICB0cnkge1xyXG4gICAgYXdhaXQgY3RsLmNsaWVudC5zeXN0ZW0ubm90aWZ5KHtcclxuICAgICAgdGl0bGU6IFwiTWFudWFsIHJlaW5kZXggY29tcGxldGVkXCIsXHJcbiAgICAgIGRlc2NyaXB0aW9uOlxyXG4gICAgICAgIGBNYW51YWwgUmVpbmRleCBUcmlnZ2VyIGlzIE9OLiBUaGUgaW5kZXggd2lsbCBiZSByZWJ1aWx0IGVhY2ggY2hhdCB3aGVuICdTa2lwIFByZXZpb3VzbHkgSW5kZXhlZCBGaWxlcycgaXMgT0ZGLiBJZiAnU2tpcCBQcmV2aW91c2x5IEluZGV4ZWQgRmlsZXMnIGlzIE9OLCB0aGUgaW5kZXggd2lsbCBvbmx5IGJlIHJlYnVpbHQgZm9yIG5ldyBvciBjaGFuZ2VkIGZpbGVzLiBMYXN0IHJ1biB1c2VkIGVtYmVkZGluZyBtb2RlbDogJHtlbWJlZGRpbmdNb2RlbElkfS5gLFxyXG4gICAgfSk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUud2FybihcIltCaWdSQUddIFVuYWJsZSB0byBzZW5kIG5vdGlmaWNhdGlvbiBhYm91dCBtYW51YWwgcmVpbmRleCByZXNldDpcIiwgZXJyb3IpO1xyXG4gIH1cclxufVxyXG5cclxuXHJcbiIsICJpbXBvcnQgeyB0eXBlIFBsdWdpbkNvbnRleHQgfSBmcm9tIFwiQGxtc3R1ZGlvL3Nka1wiO1xyXG5pbXBvcnQgeyBjb25maWdTY2hlbWF0aWNzIH0gZnJvbSBcIi4vY29uZmlnXCI7XHJcbmltcG9ydCB7IHByZXByb2Nlc3MgfSBmcm9tIFwiLi9wcm9tcHRQcmVwcm9jZXNzb3JcIjtcclxuXHJcbi8qKlxyXG4gKiBNYWluIGVudHJ5IHBvaW50IGZvciB0aGUgQmlnIFJBRyBwbHVnaW4uXHJcbiAqIFRoaXMgcGx1Z2luIGluZGV4ZXMgbGFyZ2UgZG9jdW1lbnQgY29sbGVjdGlvbnMgYW5kIHByb3ZpZGVzIFJBRyBjYXBhYmlsaXRpZXMuXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbWFpbihjb250ZXh0OiBQbHVnaW5Db250ZXh0KSB7XHJcbiAgLy8gUmVnaXN0ZXIgdGhlIGNvbmZpZ3VyYXRpb24gc2NoZW1hdGljc1xyXG4gIGNvbnRleHQud2l0aENvbmZpZ1NjaGVtYXRpY3MoY29uZmlnU2NoZW1hdGljcyk7XHJcbiAgXHJcbiAgLy8gUmVnaXN0ZXIgdGhlIHByb21wdCBwcmVwcm9jZXNzb3JcclxuICBjb250ZXh0LndpdGhQcm9tcHRQcmVwcm9jZXNzb3IocHJlcHJvY2Vzcyk7XHJcbiAgXHJcbiAgY29uc29sZS5sb2coXCJbQmlnUkFHXSBQbHVnaW4gaW5pdGlhbGl6ZWQgc3VjY2Vzc2Z1bGx5XCIpO1xyXG59XHJcblxyXG4iLCAiaW1wb3J0IHsgTE1TdHVkaW9DbGllbnQsIHR5cGUgUGx1Z2luQ29udGV4dCB9IGZyb20gXCJAbG1zdHVkaW8vc2RrXCI7XG5cbmRlY2xhcmUgdmFyIHByb2Nlc3M6IGFueTtcblxuLy8gV2UgcmVjZWl2ZSBydW50aW1lIGluZm9ybWF0aW9uIGluIHRoZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG5jb25zdCBjbGllbnRJZGVudGlmaWVyID0gcHJvY2Vzcy5lbnYuTE1TX1BMVUdJTl9DTElFTlRfSURFTlRJRklFUjtcbmNvbnN0IGNsaWVudFBhc3NrZXkgPSBwcm9jZXNzLmVudi5MTVNfUExVR0lOX0NMSUVOVF9QQVNTS0VZO1xuY29uc3QgYmFzZVVybCA9IHByb2Nlc3MuZW52LkxNU19QTFVHSU5fQkFTRV9VUkw7XG5cbmNvbnN0IGNsaWVudCA9IG5ldyBMTVN0dWRpb0NsaWVudCh7XG4gIGNsaWVudElkZW50aWZpZXIsXG4gIGNsaWVudFBhc3NrZXksXG4gIGJhc2VVcmwsXG59KTtcblxuKGdsb2JhbFRoaXMgYXMgYW55KS5fX0xNU19QTFVHSU5fQ09OVEVYVCA9IHRydWU7XG5cbmxldCBwcmVkaWN0aW9uTG9vcEhhbmRsZXJTZXQgPSBmYWxzZTtcbmxldCBwcm9tcHRQcmVwcm9jZXNzb3JTZXQgPSBmYWxzZTtcbmxldCBjb25maWdTY2hlbWF0aWNzU2V0ID0gZmFsc2U7XG5sZXQgZ2xvYmFsQ29uZmlnU2NoZW1hdGljc1NldCA9IGZhbHNlO1xubGV0IHRvb2xzUHJvdmlkZXJTZXQgPSBmYWxzZTtcbmxldCBnZW5lcmF0b3JTZXQgPSBmYWxzZTtcblxuY29uc3Qgc2VsZlJlZ2lzdHJhdGlvbkhvc3QgPSBjbGllbnQucGx1Z2lucy5nZXRTZWxmUmVnaXN0cmF0aW9uSG9zdCgpO1xuXG5jb25zdCBwbHVnaW5Db250ZXh0OiBQbHVnaW5Db250ZXh0ID0ge1xuICB3aXRoUHJlZGljdGlvbkxvb3BIYW5kbGVyOiAoZ2VuZXJhdGUpID0+IHtcbiAgICBpZiAocHJlZGljdGlvbkxvb3BIYW5kbGVyU2V0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQcmVkaWN0aW9uTG9vcEhhbmRsZXIgYWxyZWFkeSByZWdpc3RlcmVkXCIpO1xuICAgIH1cbiAgICBpZiAodG9vbHNQcm92aWRlclNldCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUHJlZGljdGlvbkxvb3BIYW5kbGVyIGNhbm5vdCBiZSB1c2VkIHdpdGggYSB0b29scyBwcm92aWRlclwiKTtcbiAgICB9XG5cbiAgICBwcmVkaWN0aW9uTG9vcEhhbmRsZXJTZXQgPSB0cnVlO1xuICAgIHNlbGZSZWdpc3RyYXRpb25Ib3N0LnNldFByZWRpY3Rpb25Mb29wSGFuZGxlcihnZW5lcmF0ZSk7XG4gICAgcmV0dXJuIHBsdWdpbkNvbnRleHQ7XG4gIH0sXG4gIHdpdGhQcm9tcHRQcmVwcm9jZXNzb3I6IChwcmVwcm9jZXNzKSA9PiB7XG4gICAgaWYgKHByb21wdFByZXByb2Nlc3NvclNldCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUHJvbXB0UHJlcHJvY2Vzc29yIGFscmVhZHkgcmVnaXN0ZXJlZFwiKTtcbiAgICB9XG4gICAgcHJvbXB0UHJlcHJvY2Vzc29yU2V0ID0gdHJ1ZTtcbiAgICBzZWxmUmVnaXN0cmF0aW9uSG9zdC5zZXRQcm9tcHRQcmVwcm9jZXNzb3IocHJlcHJvY2Vzcyk7XG4gICAgcmV0dXJuIHBsdWdpbkNvbnRleHQ7XG4gIH0sXG4gIHdpdGhDb25maWdTY2hlbWF0aWNzOiAoY29uZmlnU2NoZW1hdGljcykgPT4ge1xuICAgIGlmIChjb25maWdTY2hlbWF0aWNzU2V0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb25maWcgc2NoZW1hdGljcyBhbHJlYWR5IHJlZ2lzdGVyZWRcIik7XG4gICAgfVxuICAgIGNvbmZpZ1NjaGVtYXRpY3NTZXQgPSB0cnVlO1xuICAgIHNlbGZSZWdpc3RyYXRpb25Ib3N0LnNldENvbmZpZ1NjaGVtYXRpY3MoY29uZmlnU2NoZW1hdGljcyk7XG4gICAgcmV0dXJuIHBsdWdpbkNvbnRleHQ7XG4gIH0sXG4gIHdpdGhHbG9iYWxDb25maWdTY2hlbWF0aWNzOiAoZ2xvYmFsQ29uZmlnU2NoZW1hdGljcykgPT4ge1xuICAgIGlmIChnbG9iYWxDb25maWdTY2hlbWF0aWNzU2V0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJHbG9iYWwgY29uZmlnIHNjaGVtYXRpY3MgYWxyZWFkeSByZWdpc3RlcmVkXCIpO1xuICAgIH1cbiAgICBnbG9iYWxDb25maWdTY2hlbWF0aWNzU2V0ID0gdHJ1ZTtcbiAgICBzZWxmUmVnaXN0cmF0aW9uSG9zdC5zZXRHbG9iYWxDb25maWdTY2hlbWF0aWNzKGdsb2JhbENvbmZpZ1NjaGVtYXRpY3MpO1xuICAgIHJldHVybiBwbHVnaW5Db250ZXh0O1xuICB9LFxuICB3aXRoVG9vbHNQcm92aWRlcjogKHRvb2xzUHJvdmlkZXIpID0+IHtcbiAgICBpZiAodG9vbHNQcm92aWRlclNldCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVG9vbHMgcHJvdmlkZXIgYWxyZWFkeSByZWdpc3RlcmVkXCIpO1xuICAgIH1cbiAgICBpZiAocHJlZGljdGlvbkxvb3BIYW5kbGVyU2V0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUb29scyBwcm92aWRlciBjYW5ub3QgYmUgdXNlZCB3aXRoIGEgcHJlZGljdGlvbkxvb3BIYW5kbGVyXCIpO1xuICAgIH1cblxuICAgIHRvb2xzUHJvdmlkZXJTZXQgPSB0cnVlO1xuICAgIHNlbGZSZWdpc3RyYXRpb25Ib3N0LnNldFRvb2xzUHJvdmlkZXIodG9vbHNQcm92aWRlcik7XG4gICAgcmV0dXJuIHBsdWdpbkNvbnRleHQ7XG4gIH0sXG4gIHdpdGhHZW5lcmF0b3I6IChnZW5lcmF0b3IpID0+IHtcbiAgICBpZiAoZ2VuZXJhdG9yU2V0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJHZW5lcmF0b3IgYWxyZWFkeSByZWdpc3RlcmVkXCIpO1xuICAgIH1cblxuICAgIGdlbmVyYXRvclNldCA9IHRydWU7XG4gICAgc2VsZlJlZ2lzdHJhdGlvbkhvc3Quc2V0R2VuZXJhdG9yKGdlbmVyYXRvcik7XG4gICAgcmV0dXJuIHBsdWdpbkNvbnRleHQ7XG4gIH0sXG59O1xuXG5pbXBvcnQoXCIuLy4uL3NyYy9pbmRleC50c1wiKS50aGVuKGFzeW5jIG1vZHVsZSA9PiB7XG4gIHJldHVybiBhd2FpdCBtb2R1bGUubWFpbihwbHVnaW5Db250ZXh0KTtcbn0pLnRoZW4oKCkgPT4ge1xuICBzZWxmUmVnaXN0cmF0aW9uSG9zdC5pbml0Q29tcGxldGVkKCk7XG59KS5jYXRjaCgoZXJyb3IpID0+IHtcbiAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBleGVjdXRlIHRoZSBtYWluIGZ1bmN0aW9uIG9mIHRoZSBwbHVnaW4uXCIpO1xuICBjb25zb2xlLmVycm9yKGVycm9yKTtcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFLTyxTQUFTLHdCQUF3QixLQUF3QztBQUM5RSxRQUFNLElBQUksT0FBTyxRQUFRLFdBQVcsSUFBSSxLQUFLLElBQUk7QUFDakQsU0FBTyxFQUFFLFNBQVMsSUFBSSxJQUFJO0FBQzVCO0FBUkEsZ0JBR2EsNEJBT0EseUJBUUE7QUFsQmI7QUFBQTtBQUFBO0FBQUEsaUJBQXVDO0FBR2hDLElBQU0sNkJBQTZCO0FBT25DLElBQU0sMEJBQTBCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBUWhDLElBQU0sdUJBQW1CLG1DQUF1QixFQUNwRDtBQUFBLE1BQ0M7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLFFBQ0UsYUFBYTtBQUFBLFFBQ2IsVUFBVTtBQUFBLFFBQ1YsYUFBYTtBQUFBLE1BQ2Y7QUFBQSxNQUNBO0FBQUEsSUFDRixFQUNDO0FBQUEsTUFDQztBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsUUFDRSxhQUFhO0FBQUEsUUFDYixVQUFVO0FBQUEsUUFDVixhQUFhO0FBQUEsTUFDZjtBQUFBLE1BQ0E7QUFBQSxJQUNGLEVBQ0M7QUFBQSxNQUNDO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxRQUNFLGFBQWE7QUFBQSxRQUNiLFVBQ0U7QUFBQSxRQUNGLGFBQWE7QUFBQSxNQUNmO0FBQUEsTUFDQTtBQUFBLElBQ0YsRUFDQztBQUFBLE1BQ0M7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLFFBQ0UsS0FBSztBQUFBLFFBQ0wsS0FBSztBQUFBLFFBQ0wsS0FBSztBQUFBLFFBQ0wsYUFBYTtBQUFBLFFBQ2IsVUFBVTtBQUFBLFFBQ1YsUUFBUSxFQUFFLEtBQUssR0FBRyxLQUFLLElBQUksTUFBTSxFQUFFO0FBQUEsTUFDckM7QUFBQSxNQUNBO0FBQUEsSUFDRixFQUNDO0FBQUEsTUFDQztBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsUUFDRSxLQUFLO0FBQUEsUUFDTCxLQUFLO0FBQUEsUUFDTCxhQUFhO0FBQUEsUUFDYixVQUFVO0FBQUEsUUFDVixRQUFRLEVBQUUsS0FBSyxHQUFLLEtBQUssR0FBSyxNQUFNLEtBQUs7QUFBQSxNQUMzQztBQUFBLE1BQ0E7QUFBQSxJQUNGLEVBQ0M7QUFBQSxNQUNDO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxRQUNFLEtBQUs7QUFBQSxRQUNMLEtBQUs7QUFBQSxRQUNMLEtBQUs7QUFBQSxRQUNMLGFBQWE7QUFBQSxRQUNiLFVBQVU7QUFBQSxRQUNWLFFBQVEsRUFBRSxLQUFLLEtBQUssS0FBSyxNQUFNLE1BQU0sSUFBSTtBQUFBLE1BQzNDO0FBQUEsTUFDQTtBQUFBLElBQ0YsRUFDQztBQUFBLE1BQ0M7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLFFBQ0UsS0FBSztBQUFBLFFBQ0wsS0FBSztBQUFBLFFBQ0wsS0FBSztBQUFBLFFBQ0wsYUFBYTtBQUFBLFFBQ2IsVUFBVTtBQUFBLFFBQ1YsUUFBUSxFQUFFLEtBQUssR0FBRyxLQUFLLEtBQUssTUFBTSxHQUFHO0FBQUEsTUFDdkM7QUFBQSxNQUNBO0FBQUEsSUFDRixFQUNDO0FBQUEsTUFDQztBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsUUFDRSxLQUFLO0FBQUEsUUFDTCxLQUFLO0FBQUEsUUFDTCxLQUFLO0FBQUEsUUFDTCxhQUFhO0FBQUEsUUFDYixVQUFVO0FBQUEsUUFDVixRQUFRLEVBQUUsS0FBSyxHQUFHLEtBQUssSUFBSSxNQUFNLEVBQUU7QUFBQSxNQUNyQztBQUFBLE1BQ0E7QUFBQSxJQUNGLEVBQ0M7QUFBQSxNQUNDO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxRQUNFLEtBQUs7QUFBQSxRQUNMLEtBQUs7QUFBQSxRQUNMLEtBQUs7QUFBQSxRQUNMLGFBQWE7QUFBQSxRQUNiLFVBQVU7QUFBQSxRQUNWLFFBQVEsRUFBRSxLQUFLLEdBQUcsS0FBSyxLQUFNLE1B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TSx1Q0FBdUM7QUFBQSxJQUN6RDtBQUNBLDRCQUF3QjtBQUN4Qix5QkFBcUIsc0JBQXNCQSxXQUFVO0FBQ3JELFdBQU87QUFBQSxFQUNUO0FBQUEsRUFDQSxzQkFBc0IsQ0FBQ0Msc0JBQXFCO0FBQzFDLFFBQUkscUJBQXFCO0FBQ3ZCLFlBQU0sSUFBSSxNQUFNLHNDQUFzQztBQUFBLElBQ3hEO0FBQ0EsMEJBQXNCO0FBQ3RCLHlCQUFxQixvQkFBb0JBLGlCQUFnQjtBQUN6RCxXQUFPO0FBQUEsRUFDVDtBQUFBLEVBQ0EsNEJBQTRCLENBQUMsMkJBQTJCO0FBQ3RELFFBQUksMkJBQTJCO0FBQzdCLFlBQU0sSUFBSSxNQUFNLDZDQUE2QztBQUFBLElBQy9EO0FBQ0EsZ0NBQTRCO0FBQzVCLHlCQUFxQiwwQkFBMEIsc0JBQXNCO0FBQ3JFLFdBQU87QUFBQSxFQUNUO0FBQUEsRUFDQSxtQkFBbUIsQ0FBQyxrQkFBa0I7QUFDcEMsUUFBSSxrQkFBa0I7QUFDcEIsWUFBTSxJQUFJLE1BQU0sbUNBQW1DO0FBQUEsSUFDckQ7QUFDQSxRQUFJLDBCQUEwQjtBQUM1QixZQUFNLElBQUksTUFBTSw0REFBNEQ7QUFBQSxJQUM5RTtBQUVBLHVCQUFtQjtBQUNuQix5QkFBcUIsaUJBQWlCLGFBQWE7QUFDbkQsV0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUNBLGVBQWUsQ0FBQyxjQUFjO0FBQzVCLFFBQUksY0FBYztBQUNoQixZQUFNLElBQUksTUFBTSw4QkFBOEI7QUFBQSxJQUNoRDtBQUVBLG1CQUFlO0FBQ2YseUJBQXFCLGFBQWEsU0FBUztBQUMzQyxXQUFPO0FBQUEsRUFDVDtBQUNGO0FBRUEsd0RBQTRCLEtBQUssT0FBTUMsWUFBVTtBQUMvQyxTQUFPLE1BQU1BLFFBQU8sS0FBSyxhQUFhO0FBQ3hDLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDWix1QkFBcUIsY0FBYztBQUNyQyxDQUFDLEVBQUUsTUFBTSxDQUFDLFVBQVU7QUFDbEIsVUFBUSxNQUFNLG9EQUFvRDtBQUNsRSxVQUFRLE1BQU0sS0FBSztBQUNyQixDQUFDOyIsCiAgIm5hbWVzIjogWyJmcyIsICJmcyIsICJwYXRoIiwgImZzIiwgInBhdGgiLCAiZnMiLCAiY2xpZW50IiwgInJlc29sdmUiLCAicGRmUGFyc2UiLCAiZnMiLCAicmVzb2x2ZSIsICJpbXBvcnRfdGVzc2VyYWN0IiwgImZzIiwgImNsaWVudCIsICJwYXRoIiwgImNodW5rVGV4dCIsICJyZXNvbHZlIiwgImZzIiwgImZzIiwgInBhdGgiLCAiZnMiLCAicGF0aCIsICJQUXVldWUiLCAidmVjdG9yU3RvcmUiLCAiY2xpZW50IiwgInJlc29sdmUiLCAiY2xpZW50IiwgInZlY3RvclN0b3JlIiwgInBhdGgiLCAiaW1wb3J0X3NkayIsICJwcmVwcm9jZXNzIiwgImNvbmZpZ1NjaGVtYXRpY3MiLCAibW9kdWxlIl0KfQo=
