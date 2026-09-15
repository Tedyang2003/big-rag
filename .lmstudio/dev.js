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
      "enableContextCompaction",
      "boolean",
      {
        displayName: "Enable Context Compaction",
        subtitle: "Retrieve a larger pool of candidate passages, then trim each one down to only the sentences relevant to the query (never rewritten - only selected) before filling the same overall token budget. Result: more, smaller, distinct passages instead of fewer full-size chunks. Adds embedding calls per query."
      },
      false
    ).field(
      "structuredIndexing",
      "boolean",
      {
        displayName: "Structured Indexing",
        subtitle: "Chunk documents by their headings, sections, and list items, record each chunk's dates, and give every chunk a header with its file, section, and dates. Turning this on or off requires a manual reindex, which rebuilds every file regardless of 'Skip Previously Indexed Files'."
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
var fs, path, import_vectra, DEFAULT_MAX_ITEMS_PER_SHARD, SHARD_DIR_PREFIX, SHARD_DIR_REGEX, VectorStore;
var init_vectorStore = __esm({
  "src/vectorstore/vectorStore.ts"() {
    "use strict";
    fs = __toESM(require("fs/promises"));
    path = __toESM(require("path"));
    import_vectra = require("vectra");
    DEFAULT_MAX_ITEMS_PER_SHARD = 1e4;
    SHARD_DIR_PREFIX = "shard_";
    SHARD_DIR_REGEX = /^shard_(\d+)$/;
    VectorStore = class {
      /**
       * @param maxItemsPerShard Test seam only: overrides the shard rotation threshold so tests
       * can force multiple shards without inserting thousands of chunks. Production callers should
       * omit this and get the real default.
       */
      constructor(dbPath, maxItemsPerShard = DEFAULT_MAX_ITEMS_PER_SHARD) {
        this.shardDirs = [];
        this.activeShard = null;
        this.activeShardCount = 0;
        /**
         * Shard instances that have been mutated or scanned for deletion. vectra caches a shard's
         * parsed index.json inside its LocalIndex, so every write to a shard directory must go
         * through one shared instance - otherwise a stale cached copy can write deleted items back.
         */
        this.shardCache = /* @__PURE__ */ new Map();
        this.updateMutex = Promise.resolve();
        this.dbPath = path.resolve(dbPath);
        this.maxItemsPerShard = maxItemsPerShard;
      }
      /** Number of shards currently held in the write-through cache. Exposed for tests. */
      get cachedShardCount() {
        return this.shardCache.size;
      }
      /**
       * Open a shard by directory name (e.g. "shard_000") for reading. Reuses the shared cached
       * instance when one exists; otherwise returns a fresh instance the caller must not hold,
       * so GC can free the parsed index data.
       */
      openShard(dir) {
        return this.shardCache.get(dir) ?? new import_vectra.LocalIndex(path.join(this.dbPath, dir));
      }
      /**
       * Get (creating if needed) the shared cached instance for a shard directory. Use this for
       * every mutation so all writes to a directory see the same in-memory data.
       */
      cachedShard(dir) {
        let shard = this.shardCache.get(dir);
        if (!shard) {
          shard = new import_vectra.LocalIndex(path.join(this.dbPath, dir));
          this.shardCache.set(dir, shard);
        }
        return shard;
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
        this.shardCache.clear();
        this.shardDirs = await this.discoverShardDirs();
        if (this.shardDirs.length === 0) {
          const firstDir = `${SHARD_DIR_PREFIX}000`;
          const fullPath = path.join(this.dbPath, firstDir);
          const index = new import_vectra.LocalIndex(fullPath);
          await index.createIndex({ version: 1 });
          this.shardCache.set(firstDir, index);
          this.shardDirs = [firstDir];
          this.activeShard = index;
          this.activeShardCount = 0;
        } else {
          const lastDir = this.shardDirs[this.shardDirs.length - 1];
          this.activeShard = this.cachedShard(lastDir);
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
          if (this.activeShardCount >= this.maxItemsPerShard) {
            const nextNum = this.shardDirs.length;
            const nextDir = `${SHARD_DIR_PREFIX}${String(nextNum).padStart(3, "0")}`;
            const fullPath = path.join(this.dbPath, nextDir);
            const newIndex = new import_vectra.LocalIndex(fullPath);
            await newIndex.createIndex({ version: 1 });
            this.shardCache.set(nextDir, newIndex);
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
        this.updateMutex = this.updateMutex.then(async () => {
          const lastDir = this.shardDirs[this.shardDirs.length - 1];
          for (const dir of this.shardDirs) {
            const shard = this.cachedShard(dir);
            const items = await shard.listItems();
            const toDelete = items.filter(
              (i) => i.metadata?.fileHash === fileHash
            );
            if (toDelete.length > 0) {
              await shard.beginUpdate();
              try {
                for (const item of toDelete) {
                  await shard.deleteItem(item.id);
                }
                await shard.endUpdate();
              } catch (e) {
                shard.cancelUpdate();
                throw e;
              }
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
       * List every indexed chunk across all shards.
       */
      async listChunks() {
        const chunks = [];
        for (const dir of this.shardDirs) {
          const shard = this.openShard(dir);
          const items = await shard.listItems();
          for (const item of items) {
            const m = item.metadata;
            if (!m?.filePath || typeof m.text !== "string") continue;
            chunks.push({
              text: m.text,
              filePath: m.filePath,
              fileName: m.fileName,
              chunkIndex: m.chunkIndex,
              metadata: m
            });
          }
        }
        return chunks;
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
       * Drop every cached shard except the active shard's entry. `cachedShard` (used by
       * deleteByFileHash) caches every shard it touches, and vectra's LocalIndex keeps its entire
       * parsed index.json - including every item's vector - in memory for the life of the
       * instance. In a long-lived VectorStore that scan makes the whole index resident in RAM after
       * the first delete of an indexing run. Everything cached here has already been flushed to
       * disk (vectra writes on endUpdate), so dropping the entries loses nothing; a later read
       * simply re-opens the shard fresh via `openShard`. Chained through updateMutex so it can't
       * race an in-flight addChunks/deleteByFileHash.
       */
      async releaseShardCache() {
        this.updateMutex = this.updateMutex.then(() => {
          let activeDir;
          for (const [dir, shard] of this.shardCache) {
            if (shard === this.activeShard) {
              activeDir = dir;
              break;
            }
          }
          for (const dir of [...this.shardCache.keys()]) {
            if (dir !== activeDir) {
              this.shardCache.delete(dir);
            }
          }
        });
        return this.updateMutex;
      }
      /**
       * Release the active shard reference.
       */
      async close() {
        this.activeShard = null;
        this.shardCache.clear();
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
      return {
        embeddingModelId: data.embeddingModelId,
        dimensions: data.dimensions,
        indexFormat: data.indexFormat === "structured-v1" ? "structured-v1" : "legacy"
      };
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
async function syncEmbeddingManifestAfterIndexing(vectorStoreDir, totalChunks, resolvedModelId, embeddingModel, indexFormat) {
  if (totalChunks === 0) {
    await deleteEmbeddingIndexManifest(vectorStoreDir);
    return;
  }
  const probe = await embeddingModel.embed(".");
  const dimensions = coerceEmbeddingVector(probe.embedding).length;
  await writeEmbeddingIndexManifest(vectorStoreDir, {
    embeddingModelId: resolvedModelId,
    dimensions,
    indexFormat
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
function desiredIndexFormat(structuredIndexing) {
  return structuredIndexing ? "structured-v1" : "legacy";
}
async function planIndexFormat(vectorStoreDir, totalChunks, structuredIndexing) {
  const indexFormat = desiredIndexFormat(structuredIndexing);
  if (totalChunks === 0) {
    return { indexFormat, rebuildExistingFiles: false };
  }
  const manifest = await readEmbeddingIndexManifest(vectorStoreDir);
  return { indexFormat, rebuildExistingFiles: (manifest?.indexFormat ?? "legacy") !== indexFormat };
}
async function indexFormatStatusMessage(vectorStoreDir, structuredIndexing, getTotalChunks) {
  const manifest = await readEmbeddingIndexManifest(vectorStoreDir);
  let indexed;
  if (manifest) {
    indexed = manifest.indexFormat;
  } else {
    if (await getTotalChunks() === 0) return null;
    indexed = "legacy";
  }
  return indexFormatMismatchMessage(indexed, desiredIndexFormat(structuredIndexing));
}
function indexFormatMismatchMessage(indexed, desired) {
  if (indexed === desired) return null;
  return desired === "structured-v1" ? "Reindex required to apply structured indexing." : "Reindex required to switch back to standard indexing.";
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
function isPptxExtension(ext) {
  return PPTX_EXTENSION_SET.has(ext.toLowerCase());
}
function isDocxExtension(ext) {
  return DOCX_EXTENSION_SET.has(ext.toLowerCase());
}
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
var HTML_EXTENSIONS, MARKDOWN_EXTENSIONS, TEXT_EXTENSIONS, PDF_EXTENSIONS, EPUB_EXTENSIONS, IMAGE_EXTENSIONS, ARCHIVE_EXTENSIONS, PPTX_EXTENSIONS, DOCX_EXTENSIONS, ALL_EXTENSION_GROUPS, SUPPORTED_EXTENSIONS, HTML_EXTENSION_SET, MARKDOWN_EXTENSION_SET, TEXT_EXTENSION_SET, IMAGE_EXTENSION_SET, PPTX_EXTENSION_SET, DOCX_EXTENSION_SET;
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
    PPTX_EXTENSIONS = [".pptx"];
    DOCX_EXTENSIONS = [".docx"];
    ALL_EXTENSION_GROUPS = [
      HTML_EXTENSIONS,
      MARKDOWN_EXTENSIONS,
      TEXT_EXTENSIONS,
      PDF_EXTENSIONS,
      EPUB_EXTENSIONS,
      IMAGE_EXTENSIONS,
      ARCHIVE_EXTENSIONS,
      PPTX_EXTENSIONS,
      DOCX_EXTENSIONS
    ];
    SUPPORTED_EXTENSIONS = new Set(
      ALL_EXTENSION_GROUPS.flatMap((group) => group.map((ext) => ext.toLowerCase()))
    );
    HTML_EXTENSION_SET = new Set(HTML_EXTENSIONS);
    MARKDOWN_EXTENSION_SET = new Set(MARKDOWN_EXTENSIONS);
    TEXT_EXTENSION_SET = new Set(TEXT_EXTENSIONS);
    IMAGE_EXTENSION_SET = new Set(IMAGE_EXTENSIONS);
    PPTX_EXTENSION_SET = new Set(PPTX_EXTENSIONS);
    DOCX_EXTENSION_SET = new Set(DOCX_EXTENSIONS);
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

// src/parsers/markdown/htmlToMarkdown.ts
function collapse(text) {
  return text.replace(/\s+/g, " ").trim();
}
function separatedText(nodes) {
  const parts = [];
  const walk = (node) => {
    if (node.nodeType === 3) {
      parts.push(node.data);
      return;
    }
    if (node.nodeType !== 1) return;
    const element = node;
    const separated = SEPARATED_TAGS.has(element.tagName.toLowerCase());
    if (separated) parts.push(" ");
    element.children.forEach(walk);
    if (separated) parts.push(" ");
  };
  nodes.forEach(walk);
  return collapse(parts.join(""));
}
function htmlToMarkdown(html) {
  const $ = cheerio.load(html);
  $("script, style, noscript, nav").remove();
  const blocks = [];
  const renderList = (list, depth) => {
    const ordered = list.tagName.toLowerCase() === "ol";
    const lines = [];
    $(list).children("li").each((index, item) => {
      const own = $(item).clone();
      own.find("ul, ol").remove();
      const text = separatedText(own.get());
      if (text) lines.push(`${"  ".repeat(depth)}${ordered ? `${index + 1}.` : "-"} ${text}`);
      $(item).children("ul, ol").each((_, nested) => {
        lines.push(...renderList(nested, depth + 1));
      });
    });
    return lines;
  };
  const renderTable = (table) => {
    const rows = [];
    $(table).find("tr").each((_, row) => {
      const cells = $(row).children("td, th").map((_2, cell) => separatedText([cell])).get();
      if (cells.some((cell) => cell.length > 0)) rows.push(cells.join(" | "));
    });
    return rows;
  };
  const visit = (node) => {
    if (node.nodeType === 3) {
      const text2 = collapse(node.data);
      if (text2) blocks.push(text2);
      return;
    }
    if (node.nodeType !== 1) return;
    const element = node;
    const tag = element.tagName.toLowerCase();
    const heading = /^h([1-6])$/.exec(tag);
    if (heading) {
      const text2 = separatedText([element]);
      if (text2) blocks.push(`${"#".repeat(Math.min(Number(heading[1]), 3))} ${text2}`);
      return;
    }
    if (tag === "ul" || tag === "ol") {
      const lines = renderList(element, 0);
      if (lines.length > 0) blocks.push(lines.join("\n"));
      return;
    }
    if (tag === "table") {
      const rows = renderTable(element);
      if (rows.length > 0) blocks.push(rows.join("\n"));
      return;
    }
    if ($(element).find(BLOCK_SELECTOR).length > 0) {
      element.children.forEach(visit);
      return;
    }
    const text = separatedText([element]);
    if (text) blocks.push(text);
  };
  $("body").contents().each((_, node) => visit(node));
  return blocks.join("\n\n");
}
var cheerio, BLOCK_SELECTOR, SEPARATED_TAGS;
var init_htmlToMarkdown = __esm({
  "src/parsers/markdown/htmlToMarkdown.ts"() {
    "use strict";
    cheerio = __toESM(require("cheerio"));
    BLOCK_SELECTOR = "p,div,section,article,main,header,footer,aside,blockquote,figure,ul,ol,table,h1,h2,h3,h4,h5,h6";
    SEPARATED_TAGS = /* @__PURE__ */ new Set([
      ...BLOCK_SELECTOR.split(","),
      "html",
      "body",
      "form",
      "fieldset",
      "li",
      "dl",
      "dt",
      "dd",
      "tr",
      "td",
      "th",
      "thead",
      "tbody",
      "tfoot",
      "caption",
      "pre",
      "address",
      "details",
      "summary",
      "figcaption",
      "nav",
      "hr",
      "br"
    ]);
  }
});

// src/parsers/htmlParser.ts
async function parseHTML(filePath) {
  try {
    const content = await fs5.promises.readFile(filePath, "utf-8");
    return htmlToMarkdown(content);
  } catch (error) {
    console.error(`Error parsing HTML file ${filePath}:`, error);
    return "";
  }
}
var fs5;
var init_htmlParser = __esm({
  "src/parsers/htmlParser.ts"() {
    "use strict";
    fs5 = __toESM(require("fs"));
    init_htmlToMarkdown();
  }
});

// src/parsers/markdown/inferStructure.ts
function normalizeListItem(line) {
  const match = LIST_ITEM.exec(line);
  const rest = line.slice(match[0].length);
  if (match[1]) return `${match[1]}. ${rest}`;
  if (match[2]) return `${match[2]}. ${rest}`;
  return `- ${rest}`;
}
function isHeadingCandidate(line) {
  if (line.split(" ").length > MAX_HEADING_WORDS) return false;
  if (/[.,;:]$/.test(line)) return false;
  return /\p{L}/u.test(line);
}
function inferStructure(raw) {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n").map((line) => line.replace(/[ \t\f\v]+/g, " ").trim());
  const blocks = [];
  let current = [];
  let seenContent = false;
  const flush = () => {
    if (current.length > 0) {
      blocks.push(current.join(" "));
      current = [];
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === "") {
      flush();
      continue;
    }
    if (EXISTING_HEADING.test(line)) {
      flush();
      blocks.push(line);
      seenContent = true;
      continue;
    }
    if (LIST_ITEM.test(line)) {
      flush();
      current = [normalizeListItem(line)];
      seenContent = true;
      continue;
    }
    if (current.length === 0) {
      const next = lines[i + 1];
      const followedByBlank = next === void 0 || next === "";
      if (isHeadingCandidate(line) && (followedByBlank || !seenContent)) {
        blocks.push(`## ${line}`);
        seenContent = true;
        continue;
      }
    }
    current.push(line);
    seenContent = true;
  }
  flush();
  return blocks.join("\n\n");
}
var LIST_ITEM, EXISTING_HEADING, MAX_HEADING_WORDS;
var init_inferStructure = __esm({
  "src/parsers/markdown/inferStructure.ts"() {
    "use strict";
    LIST_ITEM = /^(?:(\d{1,3})[.)]|([a-zA-Z])[.)]|[-*•▪◦])\s+/;
    EXISTING_HEADING = /^#{1,6}\s+\S/;
    MAX_HEADING_WORDS = 12;
  }
});

// src/parsers/markdown/ocrPages.ts
function formatOcrPage(pageNumber, rawText) {
  const body = inferStructure(rawText);
  if (!body) return null;
  return { markdown: `## Page ${pageNumber}

${body}`, contentLength: body.length };
}
var init_ocrPages = __esm({
  "src/parsers/markdown/ocrPages.ts"() {
    "use strict";
    init_inferStructure();
  }
});

// src/parsers/pdfParser.ts
async function getMupdf() {
  if (!cachedMupdf) {
    cachedMupdf = await import("mupdf");
  }
  return cachedMupdf;
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
      const cleaned = inferStructure(result.content);
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
    const cleaned = inferStructure(result.text || "");
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
    let contentLength = 0;
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
          const page2 = formatOcrPage(pageNum + 1, text || "");
          if (page2) {
            textParts.push(page2.markdown);
            contentLength += page2.contentLength;
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
    const fullText = textParts.join("\n\n");
    if (contentLength >= MIN_TEXT_LENGTH) {
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
    init_inferStructure();
    init_ocrPages();
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
      const stripHtml = (input) => htmlToMarkdown(input);
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
          resolve4(fullText.replace(/\n{3,}/g, "\n\n").trim());
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
    init_htmlToMarkdown();
  }
});

// src/parsers/imageParser.ts
async function parseImage(filePath) {
  try {
    const worker = await (0, import_tesseract2.createWorker)("eng");
    const { data: { text } } = await worker.recognize(filePath);
    await worker.terminate();
    return inferStructure(text);
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
    init_inferStructure();
  }
});

// src/parsers/markdown/normalizeMarkdown.ts
function normalizeMarkdown(markdown) {
  let output = markdown.replace(/\r\n?/g, "\n");
  output = output.replace(/```[\s\S]*?```/g, "");
  output = output.replace(/`([^`]+)`/g, "$1");
  output = output.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  output = output.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  output = output.replace(/^[ \t]{0,3}>[ \t]?/gm, "");
  output = output.replace(/^[ \t]{0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/gm, "");
  output = output.replace(/^([ \t]*)[*+]([ \t]+)/gm, "$1-$2");
  output = output.replace(/(\*\*|__)(.+?)\1/g, "$2");
  output = output.replace(/(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])/g, "$1");
  output = output.replace(/(?<![\w_])_(?!\s)(.+?)(?<!\s)_(?![\w_])/g, "$1");
  output = output.replace(/^[ \t]*\|?[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-{3,}:?[ \t]*)+\|?[ \t]*$\n?/gm, "");
  output = output.replace(
    /^[ \t]*\|(.*)\|[ \t]*$/gm,
    (_match, inner) => inner.split("|").map((cell) => cell.trim()).join(" | ")
  );
  output = output.replace(/<[^>]+>/g, " ");
  output = output.split("\n").map((line) => line.replace(/[ \t]+$/, "")).join("\n");
  return output.replace(/\n{3,}/g, "\n\n").trim();
}
function markdownToPlain(markdown) {
  return markdown.replace(/^#{1,6}[ \t]+/gm, "").replace(/^[ \t]*-[ \t]+/gm, "");
}
var init_normalizeMarkdown = __esm({
  "src/parsers/markdown/normalizeMarkdown.ts"() {
    "use strict";
  }
});

// src/parsers/textParser.ts
async function parseText(filePath, kind) {
  try {
    const content = await fs7.promises.readFile(filePath, "utf-8");
    return kind === "markdown" ? normalizeMarkdown(content) : inferStructure(content);
  } catch (error) {
    console.error(`Error parsing text file ${filePath}:`, error);
    return "";
  }
}
var fs7;
var init_textParser = __esm({
  "src/parsers/textParser.ts"() {
    "use strict";
    fs7 = __toESM(require("fs"));
    init_inferStructure();
    init_normalizeMarkdown();
  }
});

// src/parsers/embeddedImages.ts
var import_jszip;
var init_embeddedImages = __esm({
  "src/parsers/embeddedImages.ts"() {
    "use strict";
    import_jszip = __toESM(require("jszip"));
  }
});

// src/parsers/pptxParser.ts
function extractTextRuns(xml) {
  const runs = [];
  const regex = /<a:t>([\s\S]*?)<\/a:t>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const decoded = decodeXmlEntities(match[1]);
    if (decoded.length > 0) runs.push(decoded);
  }
  return runs;
}
function decodeXmlEntities(text) {
  return text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}
function extractParagraphs(xml) {
  const paragraphs = [];
  const paraRegex = /<a:p>([\s\S]*?)<\/a:p>/g;
  let paraMatch;
  while ((paraMatch = paraRegex.exec(xml)) !== null) {
    const runs = extractTextRuns(paraMatch[1]);
    const joined = runs.join("").trim();
    if (joined.length > 0) paragraphs.push(joined);
  }
  return paragraphs;
}
function extractTableRows(tableXml) {
  const rows = [];
  const rowRegex = /<a:tr\b[^>]*>([\s\S]*?)<\/a:tr>/g;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(tableXml)) !== null) {
    const cells = [];
    const cellRegex = /<a:tc\b[^>]*>([\s\S]*?)<\/a:tc>/g;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      cells.push(extractParagraphs(cellMatch[1]).join(" ").trim());
    }
    if (cells.some((cell) => cell.length > 0)) {
      rows.push(cells.join(" | "));
    }
  }
  return rows;
}
function extractContentBlocks(xml) {
  const blocks = [];
  const paragraphs = (fragment) => extractParagraphs(fragment).map((text) => ({ kind: "paragraph", text }));
  const tableRegex = /<a:tbl>([\s\S]*?)<\/a:tbl>/g;
  let lastIndex = 0;
  let match;
  while ((match = tableRegex.exec(xml)) !== null) {
    blocks.push(...paragraphs(xml.slice(lastIndex, match.index)));
    blocks.push(...extractTableRows(match[1]).map((text) => ({ kind: "tableRow", text })));
    lastIndex = tableRegex.lastIndex;
  }
  blocks.push(...paragraphs(xml.slice(lastIndex)));
  return blocks;
}
function parseRelationships(xml) {
  const entries = [];
  const relRegex = /<Relationship\b[^>]*\/>/g;
  let match;
  while ((match = relRegex.exec(xml)) !== null) {
    const tag = match[0];
    const id = tag.match(/\bId="([^"]+)"/)?.[1];
    const type = tag.match(/\bType="([^"]+)"/)?.[1];
    const target = tag.match(/\bTarget="([^"]+)"/)?.[1];
    if (id && type && target) {
      entries.push({ id, type, target });
    }
  }
  return entries;
}
function resolveRelativeTarget(baseDir, target) {
  if (target.startsWith("/")) {
    return target.slice(1);
  }
  return path4.posix.normalize(`${baseDir}/${target}`);
}
function slideRelsPath(slidePath) {
  return `${path4.posix.dirname(slidePath)}/_rels/${path4.posix.basename(slidePath)}.rels`;
}
function slideNumberFromFilename(slidePath) {
  return parseInt(slidePath.match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10);
}
async function getOrderedSlidePaths(zip) {
  const presentationFile = zip.files["ppt/presentation.xml"];
  const relsFile = zip.files["ppt/_rels/presentation.xml.rels"];
  if (presentationFile && relsFile) {
    const [presentationXml, relsXml] = await Promise.all([
      presentationFile.async("text"),
      relsFile.async("text")
    ]);
    const relTargetById = new Map(parseRelationships(relsXml).map((r) => [r.id, r.target]));
    const sldIdListMatch = presentationXml.match(/<p:sldIdLst>([\s\S]*?)<\/p:sldIdLst>/);
    if (sldIdListMatch) {
      const idRegex = /<p:sldId\b[^>]*\br:id="([^"]+)"/g;
      const orderedPaths = [];
      let match;
      while ((match = idRegex.exec(sldIdListMatch[1])) !== null) {
        const target = relTargetById.get(match[1]);
        if (!target) continue;
        const slidePath = resolveRelativeTarget("ppt", target);
        if (zip.files[slidePath] && !zip.files[slidePath].dir) {
          orderedPaths.push(slidePath);
        }
      }
      if (orderedPaths.length > 0) {
        return orderedPaths;
      }
    }
  }
  return Object.keys(zip.files).filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p)).sort((a, b) => slideNumberFromFilename(a) - slideNumberFromFilename(b));
}
async function getNotesPathForSlide(zip, slidePath) {
  const relsFile = zip.files[slideRelsPath(slidePath)];
  if (!relsFile) return void 0;
  const relsXml = await relsFile.async("text");
  const notesRel = parseRelationships(relsXml).find((r) => r.type.endsWith("/notesSlide"));
  if (!notesRel) return void 0;
  const notesPath = resolveRelativeTarget(path4.posix.dirname(slidePath), notesRel.target);
  return zip.files[notesPath] && !zip.files[notesPath].dir ? notesPath : void 0;
}
async function parsePPTX(filePath, options = {}) {
  const { includeSpeakerNotes = true } = options;
  const fileBuffer = await fs8.promises.readFile(filePath);
  const zip = await import_jszip2.default.loadAsync(fileBuffer);
  const slidePaths = await getOrderedSlidePaths(zip);
  if (slidePaths.length === 0) {
    return "";
  }
  const slides = [];
  for (let i = 0; i < slidePaths.length; i++) {
    const slidePath = slidePaths[i];
    const displayNumber = i + 1;
    const xml = await zip.files[slidePath].async("text");
    const blocks = extractContentBlocks(xml);
    if (blocks.length === 0 && !includeSpeakerNotes) continue;
    const titleIndex = blocks.findIndex((block) => block.kind === "paragraph");
    const title = titleIndex >= 0 ? blocks[titleIndex].text : "";
    const lines = [`## Slide ${displayNumber}${title ? `: ${title}` : ""}`];
    blocks.forEach((block, index) => {
      if (index === titleIndex) return;
      lines.push(block.kind === "tableRow" ? block.text : `- ${block.text}`);
    });
    if (includeSpeakerNotes) {
      const notesPath = await getNotesPathForSlide(zip, slidePath);
      if (notesPath) {
        const notesXml = await zip.files[notesPath].async("text");
        const notesBlocks = extractContentBlocks(notesXml);
        if (notesBlocks.length > 0) {
          lines.push("", "### Notes", ...notesBlocks.map((block) => block.text));
        }
      }
    }
    slides.push(lines.join("\n"));
  }
  return slides.join("\n\n");
}
var fs8, path4, import_jszip2;
var init_pptxParser = __esm({
  "src/parsers/pptxParser.ts"() {
    "use strict";
    fs8 = __toESM(require("fs"));
    path4 = __toESM(require("path"));
    import_jszip2 = __toESM(require("jszip"));
    init_embeddedImages();
  }
});

// src/parsers/docxParser.ts
async function parseDOCX(filePath) {
  const { value: html } = await import_mammoth.default.convertToHtml({ path: filePath });
  return htmlToMarkdown(html);
}
var import_mammoth;
var init_docxParser = __esm({
  "src/parsers/docxParser.ts"() {
    "use strict";
    import_mammoth = __toESM(require("mammoth"));
    init_embeddedImages();
    init_htmlToMarkdown();
  }
});

// src/parsers/documentParser.ts
async function runParser(filePath, label, detailsContext, emptyReason, errorReason, parse) {
  try {
    return cleanAndValidate(await parse(), emptyReason, detailsContext);
  } catch (error) {
    console.error(`[Parser][${label}] Error parsing ${filePath}:`, error);
    return {
      success: false,
      reason: errorReason,
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
async function parseDocument(filePath, enableOCR = false, client2) {
  const ext = path5.extname(filePath).toLowerCase();
  const fileName = path5.basename(filePath);
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
  const finish = (result) => result.success ? buildSuccess(result.value) : result;
  try {
    if (isHtmlExtension(ext)) {
      return finish(
        await runParser(
          filePath,
          "HTML",
          `${fileName} html`,
          "html.empty",
          "html.error",
          () => parseHTML(filePath)
        )
      );
    }
    if (ext === ".pdf") {
      if (!client2) {
        console.warn(`[Parser] No LM Studio client available for PDF parsing: ${fileName}`);
        return { success: false, reason: "pdf.missing-client" };
      }
      const pdfResult = await parsePDF(filePath, client2, enableOCR);
      return pdfResult.success ? buildSuccess(pdfResult.text) : pdfResult;
    }
    if (ext === ".epub") {
      return finish(
        await runParser(
          filePath,
          "EPUB",
          fileName,
          "epub.empty",
          "parser.unexpected-error",
          () => parseEPUB(filePath)
        )
      );
    }
    if (isDocxExtension(ext)) {
      return finish(
        await runParser(
          filePath,
          "DOCX",
          fileName,
          "docx.empty",
          "docx.error",
          () => parseDOCX(filePath)
        )
      );
    }
    if (isPptxExtension(ext)) {
      return finish(
        await runParser(
          filePath,
          "PPTX",
          fileName,
          "pptx.empty",
          "pptx.error",
          () => parsePPTX(filePath)
        )
      );
    }
    if (isTextualExtension(ext)) {
      return finish(
        await runParser(
          filePath,
          "Text",
          fileName,
          "text.empty",
          "text.error",
          () => parseText(filePath, isMarkdownExtension(ext) ? "markdown" : "plain")
        )
      );
    }
    if (IMAGE_EXTENSION_SET.has(ext)) {
      if (!enableOCR) {
        console.log(`Skipping image file ${filePath} (OCR disabled)`);
        return { success: false, reason: "image.ocr-disabled" };
      }
      return finish(
        await runParser(
          filePath,
          "Image",
          fileName,
          "image.empty",
          "image.error",
          () => parseImage(filePath)
        )
      );
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
var path5;
var init_documentParser = __esm({
  "src/parsers/documentParser.ts"() {
    "use strict";
    path5 = __toESM(require("path"));
    init_htmlParser();
    init_pdfParser();
    init_epubParser();
    init_imageParser();
    init_textParser();
    init_pptxParser();
    init_docxParser();
    init_supportedExtensions();
  }
});

// src/utils/textChunker.ts
async function chunkText(text, chunkSize, overlap, countTokens) {
  const chunks = [];
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) {
    return chunks;
  }
  const totalTokens = await countTokens(text);
  const tokensPerWord = totalTokens > 0 ? totalTokens / words.length : 1;
  const wordChunkSize = Math.max(1, Math.round(chunkSize / tokensPerWord));
  const wordOverlap = Math.max(0, Math.min(wordChunkSize - 1, Math.round(overlap / tokensPerWord)));
  let startIdx = 0;
  while (startIdx < words.length) {
    const endIdx = Math.min(startIdx + wordChunkSize, words.length);
    const chunkWords = words.slice(startIdx, endIdx);
    const chunkContent = chunkWords.join(" ");
    chunks.push({
      text: chunkContent,
      startIndex: startIdx,
      endIndex: endIdx
    });
    startIdx += Math.max(1, wordChunkSize - wordOverlap);
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
    const stream = fs9.createReadStream(filePath);
    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => resolve4(hash.digest("hex")));
    stream.on("error", reject);
  });
}
var crypto, fs9;
var init_fileHash = __esm({
  "src/utils/fileHash.ts"() {
    "use strict";
    crypto = __toESM(require("crypto"));
    fs9 = __toESM(require("fs"));
  }
});

// src/utils/failedFileRegistry.ts
var fs10, path6, FailedFileRegistry;
var init_failedFileRegistry = __esm({
  "src/utils/failedFileRegistry.ts"() {
    "use strict";
    fs10 = __toESM(require("fs/promises"));
    path6 = __toESM(require("path"));
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
          const data = await fs10.readFile(this.registryPath, "utf-8");
          this.entries = JSON.parse(data) ?? {};
        } catch {
          this.entries = {};
        }
        this.loaded = true;
      }
      async persist() {
        await fs10.mkdir(path6.dirname(this.registryPath), { recursive: true });
        await fs10.writeFile(this.registryPath, JSON.stringify(this.entries, null, 2), "utf-8");
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

// src/metadata/dates.ts
function pad(value) {
  return String(value).padStart(2, "0");
}
function capitalised(monthName) {
  return /^[A-Z]/.test(monthName);
}
function monthIndex(name) {
  return MONTH_KEYS.indexOf(name.slice(0, 3).toLowerCase()) + 1;
}
function singleDay(year, month, dayOfMonth) {
  if (month < 1 || month > 12 || dayOfMonth < 1 || dayOfMonth > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, dayOfMonth));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== dayOfMonth) return null;
  const iso = `${year}-${pad(month)}-${pad(dayOfMonth)}`;
  return { start: iso, end: iso };
}
function monthRange(year, month) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { start: `${year}-${pad(month)}-01`, end: `${year}-${pad(month)}-${pad(lastDay)}` };
}
function quarterRange(year, quarter) {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const lastDay = new Date(Date.UTC(year, endMonth, 0)).getUTCDate();
  return { start: `${year}-${pad(startMonth)}-01`, end: `${year}-${pad(endMonth)}-${pad(lastDay)}` };
}
function expandTwoDigitYear(value) {
  const n = Number(value);
  return n < 70 ? 2e3 + n : 1900 + n;
}
function daysApart(iso, reference) {
  const [year, month, dayOfMonth] = iso.split("-").map(Number);
  const referenceDay = Date.UTC(reference.getFullYear(), reference.getMonth(), reference.getDate());
  return Math.abs(Date.UTC(year, month - 1, dayOfMonth) - referenceDay) / DAY_MS;
}
function present(ranges) {
  return ranges.filter((range) => range !== null);
}
function resolveNumeric(first, second, year, context) {
  const dayFirst = singleDay(year, second, first);
  const monthFirst = singleDay(year, first, second);
  if (!dayFirst && !monthFirst) return [];
  if (!dayFirst) return [monthFirst];
  if (!monthFirst) return [dayFirst];
  if (first === second) return [dayFirst];
  if (context.order) return [context.order === "day-first" ? dayFirst : monthFirst];
  if (context.referenceTime) {
    const dayClose = daysApart(dayFirst.start, context.referenceTime) <= AMBIGUITY_WINDOW_DAYS;
    const monthClose = daysApart(monthFirst.start, context.referenceTime) <= AMBIGUITY_WINDOW_DAYS;
    if (dayClose !== monthClose) return [dayClose ? dayFirst : monthFirst];
  }
  return [dayFirst, monthFirst];
}
function dedupeRanges(ranges) {
  const seen = /* @__PURE__ */ new Set();
  const unique = [];
  for (const range of ranges) {
    const key = `${range.start}/${range.end}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(range);
    }
  }
  return unique;
}
function extractDates(text, context = {}) {
  const found = [];
  const overlaps = (start, end) => found.some((f) => start < f.end && end > f.start);
  for (const rule of RULES) {
    if (rule.fileNameOnly && !context.fileName) continue;
    for (const match of text.matchAll(rule.regex)) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      if (overlaps(start, end)) continue;
      const ranges = rule.toRanges(match, context);
      if (ranges.length > 0) found.push({ start, end, ranges });
    }
  }
  found.sort((a, b) => a.start - b.start);
  return dedupeRanges(found.flatMap((f) => f.ranges));
}
function detectDayMonthOrder(text) {
  const seen = /* @__PURE__ */ new Set();
  for (const match of text.matchAll(NUMERIC_DATE)) {
    const first = Number(match[1]);
    const second = Number(match[3]);
    if (first > 12 && second <= 12) seen.add("day-first");
    else if (second > 12 && first <= 12) seen.add("month-first");
  }
  return seen.size === 1 ? [...seen][0] : void 0;
}
function dayRangeOf(date) {
  const iso = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return { start: iso, end: iso };
}
function documentPostedDate(markdown, fileName, fileModifiedTime) {
  const context = { order: detectDayMonthOrder(markdown), referenceTime: fileModifiedTime };
  const opening = markdown.split(/\s+/).filter(Boolean).slice(0, POSTED_DATE_WORD_WINDOW).join(" ");
  const fromText = extractDates(opening, context)[0];
  if (fromText) return fromText;
  const baseName = fileName.replace(/\.[^.]+$/, "").replace(/_+/g, " ");
  const fromName = extractDates(baseName, { ...context, fileName: true })[0];
  if (fromName) return fromName;
  return dayRangeOf(fileModifiedTime);
}
function formatDateRange(range) {
  return range.start === range.end ? range.start : `${range.start}\u2013${range.end}`;
}
var MONTH_PATTERN, MONTH_KEYS, AMBIGUITY_WINDOW_DAYS, POSTED_DATE_WORD_WINDOW, DAY_MS, NUMERIC_DATE, RULES;
var init_dates = __esm({
  "src/metadata/dates.ts"() {
    "use strict";
    MONTH_PATTERN = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
    MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    AMBIGUITY_WINDOW_DAYS = 45;
    POSTED_DATE_WORD_WINDOW = 300;
    DAY_MS = 864e5;
    NUMERIC_DATE = /(?<![\w.\/$-])(\d{1,2})([\/.\-])(\d{1,2})\2(\d{4})(?![\w%]|[.\/-]\d)/g;
    RULES = [
      {
        regex: /(?<![\w.\/-])(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?![\w%]|[.\/-]\d)/g,
        toRanges: (m) => present([singleDay(Number(m[1]), Number(m[2]), Number(m[3]))])
      },
      {
        regex: /(?<!\d)((?:19|20)\d{2})(\d{2})(\d{2})(?!\d)/g,
        fileNameOnly: true,
        toRanges: (m) => present([singleDay(Number(m[1]), Number(m[2]), Number(m[3]))])
      },
      {
        regex: NUMERIC_DATE,
        toRanges: (m, context) => resolveNumeric(Number(m[1]), Number(m[3]), Number(m[4]), context)
      },
      {
        regex: /(?<![\w])(?:Q([1-4])[\s-]*(\d{4})|(\d{4})[\s-]*Q([1-4]))(?![\w])/gi,
        toRanges: (m) => [quarterRange(Number(m[2] ?? m[3]), Number(m[1] ?? m[4]))]
      },
      {
        regex: new RegExp(
          `(?<![\\w])(\\d{1,2})(?:st|nd|rd|th)?[\\s-]+(${MONTH_PATTERN})\\.?(?:,?\\s+(\\d{4})|-(\\d{2}))?(?![\\w])`,
          "gi"
        ),
        toRanges: (m, context) => {
          const year = m[3] ? Number(m[3]) : m[4] ? expandTwoDigitYear(m[4]) : context.defaultYear;
          if (year === void 0) return [];
          if (!m[3] && !m[4] && !capitalised(m[2])) return [];
          return present([singleDay(year, monthIndex(m[2]), Number(m[1]))]);
        }
      },
      {
        regex: new RegExp(`(?<![\\w])(${MONTH_PATTERN})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?(?![\\w])`, "gi"),
        toRanges: (m, context) => {
          const year = m[3] ? Number(m[3]) : context.defaultYear;
          if (year === void 0) return [];
          if (!m[3] && !capitalised(m[1])) return [];
          return present([singleDay(year, monthIndex(m[1]), Number(m[2]))]);
        }
      },
      {
        regex: new RegExp(`(?<![\\w])(${MONTH_PATTERN})\\.?,?\\s+(\\d{4})(?![\\w])`, "gi"),
        toRanges: (m) => [monthRange(Number(m[2]), monthIndex(m[1]))]
      }
    ];
  }
});

// src/chunking/sections.ts
function parseBlocks(markdown) {
  const blocks = [];
  let paragraph = [];
  let lastWasListItem = false;
  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: "paragraph", text: paragraph.join(" "), level: 0 });
      paragraph = [];
    }
  };
  for (const rawLine of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.replace(/\s+$/, "");
    const trimmed = line.trim();
    if (trimmed === "") {
      flushParagraph();
      lastWasListItem = false;
      continue;
    }
    const heading = HEADING.exec(trimmed);
    if (heading) {
      flushParagraph();
      blocks.push({ kind: "heading", text: heading[2], level: heading[1].length });
      lastWasListItem = false;
      continue;
    }
    const list = LIST_ITEM2.exec(line);
    if (list) {
      flushParagraph();
      blocks.push({ kind: "listItem", text: trimmed, level: Math.floor(list[1].length / 2) });
      lastWasListItem = true;
      continue;
    }
    if (trimmed.includes(" | ")) {
      flushParagraph();
      blocks.push({ kind: "tableRow", text: trimmed, level: 0 });
      lastWasListItem = false;
      continue;
    }
    if (lastWasListItem) {
      const last = blocks[blocks.length - 1];
      last.text = `${last.text} ${trimmed}`;
      continue;
    }
    paragraph.push(trimmed);
  }
  flushParagraph();
  return blocks;
}
function renderBlock(block) {
  if (block.kind === "heading") return `${"#".repeat(block.level)} ${block.text}`;
  if (block.kind === "listItem") return `${"  ".repeat(block.level)}${block.text}`;
  return block.text;
}
function leadingText(text) {
  return text.length > MAX_TITLE_CHARS ? text.slice(0, MAX_TITLE_CHARS).trimEnd() : text;
}
function buildSections(markdown, context, withDates = true) {
  const datesOf = (text) => withDates ? extractDates(leadingText(text), context) : [];
  const sections = [];
  const headingStack = [];
  const state = {
    current: null,
    isHeading: false,
    hasOwnDates: false
  };
  const inheritedDates = () => headingStack.length > 0 ? headingStack[headingStack.length - 1].dates : [];
  const startSection = (section, isHeading, hasOwnDates) => {
    if (state.current && state.current.blocks.length > 0) sections.push(state.current);
    state.current = section;
    state.isHeading = isHeading;
    state.hasOwnDates = hasOwnDates;
  };
  for (const block of parseBlocks(markdown)) {
    if (block.kind === "heading") {
      while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= block.level) {
        headingStack.pop();
      }
      const own = datesOf(block.text);
      const dates = own.length > 0 ? own : inheritedDates();
      headingStack.push({ level: block.level, title: block.text, dates });
      startSection({ path: headingStack.map((h) => h.title), dates, blocks: [block] }, true, own.length > 0);
      continue;
    }
    if (block.kind === "listItem" && block.level === 0) {
      const own = datesOf(block.text);
      startSection(
        {
          path: [...headingStack.map((h) => h.title), leadingText(block.text)],
          dates: own.length > 0 ? own : inheritedDates(),
          blocks: [block]
        },
        false,
        true
      );
      continue;
    }
    if (!state.current) {
      startSection({ path: [], dates: [], blocks: [] }, false, false);
    }
    const current = state.current;
    if (state.isHeading && !state.hasOwnDates && current.blocks.length === 1) {
      const own = datesOf(block.text);
      if (own.length > 0) {
        current.dates = own;
        headingStack[headingStack.length - 1].dates = own;
        state.hasOwnDates = true;
      }
    }
    current.blocks.push(block);
  }
  if (state.current && state.current.blocks.length > 0) sections.push(state.current);
  return sections;
}
var MAX_TITLE_CHARS, HEADING, LIST_ITEM2;
var init_sections = __esm({
  "src/chunking/sections.ts"() {
    "use strict";
    init_dates();
    MAX_TITLE_CHARS = 80;
    HEADING = /^(#{1,6})\s+(.*\S)\s*$/;
    LIST_ITEM2 = /^([ \t]*)(?:-|\d{1,3}\.|[a-z]\.)[ \t]+\S/;
  }
});

// src/chunking/structuredChunker.ts
function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}
function buildContextHeader(fileName, postedDate, sectionPath, dates) {
  const parts = [`File: ${fileName}`, `Posted: ${formatDateRange(postedDate)}`];
  if (sectionPath) parts.push(`Section: ${sectionPath}`);
  if (dates.length > 0) parts.push(`Dates: ${dates.map(formatDateRange).join(", ")}`);
  return `[${parts.join(" | ")}]`;
}
function mergeHeadingOnlySections(sections) {
  const merged = [];
  let pending = null;
  for (const section of sections) {
    const headingOnly = section.blocks.length === 1 && section.blocks[0].kind === "heading";
    if (headingOnly) {
      pending = pending ? { ...section, blocks: [...pending.blocks, ...section.blocks] } : section;
      continue;
    }
    if (pending) {
      const path9 = section.blocks[0]?.kind === "listItem" ? pending.path : section.path;
      merged.push({ ...section, path: path9, blocks: [...pending.blocks, ...section.blocks] });
    } else {
      merged.push(section);
    }
    pending = null;
  }
  if (pending) merged.push(pending);
  return merged;
}
function tokenizeSection(section, offset) {
  const tokens = [];
  const blockEnds = [];
  const headingEnds = [];
  let headingEnd = 0;
  let inLeadingHeadingRun = true;
  section.blocks.forEach((block) => {
    const blockWords = renderBlock(block).split(/\s+/).filter(Boolean);
    blockWords.forEach((word, i) => tokens.push({ word, separator: i === blockWords.length - 1 ? "\n" : " " }));
    if (block.kind === "heading") {
      headingEnds.push(tokens.length);
      if (inLeadingHeadingRun) headingEnd = tokens.length;
    } else {
      inLeadingHeadingRun = false;
      blockEnds.push(tokens.length);
    }
  });
  return { section, tokens, offset, blockEnds, headingEnd, headingEnds };
}
function tokensToText(tokens) {
  return tokens.map((token, i) => i === tokens.length - 1 ? token.word : token.word + token.separator).join("");
}
function sentenceEnds(tokens) {
  const ends = [];
  tokens.forEach((token, i) => {
    if (/[.!?]["')\]]*$/.test(token.word)) ends.push(i + 1);
  });
  return ends;
}
function lastBoundary(bounds, lowerExclusive, upperInclusive) {
  let best;
  for (const bound of bounds) {
    if (bound > lowerExclusive && bound <= upperInclusive) best = bound;
  }
  return best;
}
async function chunkStructured(markdown, options) {
  const withDates = options.extractDates !== false;
  const sections = mergeHeadingOnlySections(buildSections(markdown, options.dateContext, withDates));
  if (sections.length === 0) return [];
  const totalWords = wordCount(markdown);
  const totalTokens = await options.countTokens(markdown);
  const tokensPerWord = totalTokens > 0 && totalWords > 0 ? totalTokens / totalWords : 1;
  const budgetWords = Math.max(1, Math.round(options.chunkSize / tokensPerWord));
  const overlapWords = Math.max(0, Math.min(budgetWords - 1, Math.round(options.chunkOverlap / tokensPerWord)));
  const textDates = (text) => withDates ? extractDates(text, options.dateContext) : [];
  const describe = (group, text) => {
    const [first, ...rest] = group;
    const firstPath = first.path.join(" > ");
    const extraTitles = rest.filter((s) => s.blocks[0]?.kind === "heading").map((s) => s.path[s.path.length - 1]).filter((title) => Boolean(title));
    const sectionPath = [firstPath, ...extraTitles].filter(Boolean).join(" ; ");
    const dates = dedupeRanges([...group.flatMap((s) => s.dates), ...textDates(text)]);
    const contextHeader = buildContextHeader(options.fileName, options.postedDate, sectionPath, dates);
    return { sectionPath, dates, contextHeader };
  };
  const firstHeader = describe([sections[0]], tokensToText(tokenizeSection(sections[0], 0).tokens)).contextHeader;
  const firstHeaderWords = wordCount(firstHeader);
  const firstHeaderTokens = await options.countTokens(firstHeader);
  const headerTokensPerWord = firstHeaderTokens > 0 && firstHeaderWords > 0 ? firstHeaderTokens / firstHeaderWords : tokensPerWord;
  const headerBudgetWords = (header) => Math.ceil(wordCount(header) * headerTokensPerWord / tokensPerWord);
  const chunks = [];
  const emit = (group, tokens, startIndex) => {
    const text = tokensToText(tokens);
    const { sectionPath, dates, contextHeader } = describe(group, text);
    chunks.push({ text, contextHeader, sectionPath, dates, startIndex, endIndex: startIndex + tokens.length });
  };
  const fits = (items) => {
    const tokens = items.flatMap((item) => item.tokens);
    const { contextHeader } = describe(
      items.map((item) => item.section),
      tokensToText(tokens)
    );
    return headerBudgetWords(contextHeader) + tokens.length <= budgetWords;
  };
  const splitOversized = (item) => {
    const wholeText = tokensToText(item.tokens);
    const worstHeader = describe([item.section], wholeText).contextHeader;
    const pieceBudget = Math.max(Math.ceil(budgetWords / 2), budgetWords - headerBudgetWords(worstHeader));
    const sentences = sentenceEnds(item.tokens);
    const total = item.tokens.length;
    const headingEndSet = new Set(item.headingEnds);
    const avoidHeadingEnd = (end, lower) => {
      if (end >= total || !headingEndSet.has(end)) return end;
      const previous = lastBoundary(item.blockEnds, lower, end - 1) ?? lastBoundary(sentences, lower, end - 1);
      return previous !== void 0 && previous > lower ? previous : end + 1;
    };
    let start = 0;
    while (start < total) {
      const limit = Math.min(total, start + pieceBudget);
      const lower = start === 0 ? Math.max(start, item.headingEnd) : start;
      let end = limit;
      if (limit < total) {
        end = lastBoundary(item.blockEnds, lower, limit) ?? lastBoundary(sentences, lower, limit) ?? limit;
      }
      if (start === 0 && end <= item.headingEnd) {
        end = Math.min(total, item.headingEnd + 1);
      }
      end = avoidHeadingEnd(end, lower);
      emit([item.section], item.tokens.slice(start, end), item.offset + start);
      if (end >= total) break;
      start = Math.max(start + 1, end - overlapWords);
    }
  };
  let packed = [];
  const flushPacked = () => {
    if (packed.length === 0) return;
    emit(
      packed.map((item) => item.section),
      packed.flatMap((item) => item.tokens),
      packed[0].offset
    );
    packed = [];
  };
  let offset = 0;
  for (const section of sections) {
    const item = tokenizeSection(section, offset);
    offset += item.tokens.length;
    if (packed.length > 0) {
      const candidate = [...packed, item];
      if (fits(candidate)) {
        packed = candidate;
        continue;
      }
      flushPacked();
    }
    if (fits([item])) {
      packed = [item];
      continue;
    }
    splitOversized(item);
  }
  flushPacked();
  return chunks;
}
var init_structuredChunker = __esm({
  "src/chunking/structuredChunker.ts"() {
    "use strict";
    init_dates();
    init_sections();
  }
});

// src/ingestion/indexManager.ts
var import_p_queue, fs11, path7, EXCLUDE_PROGRESS_THROTTLE, IndexManager;
var init_indexManager = __esm({
  "src/ingestion/indexManager.ts"() {
    "use strict";
    import_p_queue = __toESM(require("p-queue"));
    fs11 = __toESM(require("fs"));
    path7 = __toESM(require("path"));
    init_fileScanner();
    init_documentParser();
    init_textChunker();
    init_normalizeMarkdown();
    init_fileHash();
    init_failedFileRegistry();
    init_coerceEmbedding();
    init_structuredChunker();
    init_dates();
    EXCLUDE_PROGRESS_THROTTLE = 40;
    IndexManager = class {
      constructor(options) {
        this.failureReasonCounts = {};
        this.options = options;
        this.queue = new import_p_queue.default({ concurrency: options.maxConcurrent });
        this.failedFileRegistry = new FailedFileRegistry(
          path7.join(options.vectorStoreDir, ".big-rag-failures.json")
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
          const skipUnchanged = autoReindex && !this.options.rebuildExistingFiles;
          if (skipUnchanged && hasSameHash) {
            console.log(`File already indexed (skipped): ${file.name}`);
            return { type: "skipped" };
          }
          if (skipUnchanged) {
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
            await this.dropStaleChunksForRebuild(existingHashes);
            return { type: "failed" };
          }
          const parsed = parsedResult.document;
          const chunks = this.options.structuredIndexing ? await this.prepareStructuredChunks(parsed.text, file) : await this.prepareLegacyChunks(parsed.text);
          if (chunks.length === 0) {
            console.log(`No chunks created from ${file.name}`);
            this.recordFailure("index.chunk-empty", "chunking produced 0 chunks", file);
            if (fileHash) {
              await this.failedFileRegistry.recordFailure(file.path, fileHash, "index.chunk-empty");
            }
            await this.dropStaleChunksForRebuild(existingHashes);
            return { type: "failed" };
          }
          const documentChunks = [];
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            this.options.abortSignal?.throwIfAborted();
            try {
              const embeddingResult = await embeddingModel.embed(chunk.embedText);
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
                  ...chunk.metadata
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
            await this.dropStaleChunksForRebuild(existingHashes);
            return { type: "failed" };
          }
          try {
            await this.dropStaleChunksForRebuild(existingHashes);
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
       * When rebuilding because the index format changed, a file's old-format
       * chunks must never survive the rebuild, even if the rebuild itself fails
       * (parse failure, zero chunks, or every embedding failing) - otherwise the
       * store ends up mixing formats and the stale chunks are never revisited.
       */
      async dropStaleChunksForRebuild(existingHashes) {
        if (!this.options.rebuildExistingFiles || !existingHashes) {
          return;
        }
        for (const oldHash of existingHashes) {
          await this.options.vectorStore.deleteByFileHash(oldHash);
        }
        existingHashes.clear();
      }
      async prepareLegacyChunks(text) {
        const chunks = await chunkText(
          markdownToPlain(text),
          this.options.chunkSize,
          this.options.chunkOverlap,
          (t) => this.options.embeddingModel.countTokens(t)
        );
        return chunks.map((chunk) => ({
          text: chunk.text,
          embedText: chunk.text,
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex,
          metadata: { indexFormat: "legacy" }
        }));
      }
      async prepareStructuredChunks(markdown, file) {
        const base = {
          fileName: file.name,
          chunkSize: this.options.chunkSize,
          chunkOverlap: this.options.chunkOverlap,
          countTokens: (t) => this.options.embeddingModel.countTokens(t)
        };
        let postedDate;
        let chunks;
        try {
          postedDate = documentPostedDate(markdown, file.name, file.mtime);
          chunks = await chunkStructured(markdown, {
            ...base,
            postedDate,
            dateContext: {
              order: detectDayMonthOrder(markdown),
              referenceTime: file.mtime,
              defaultYear: Number(postedDate.start.slice(0, 4))
            }
          });
        } catch (error) {
          console.warn(`[BigRAG] Date extraction failed for ${file.name}; indexing without dates:`, error);
          postedDate = dayRangeOf(file.mtime);
          chunks = await chunkStructured(markdown, { ...base, postedDate, dateContext: {}, extractDates: false });
        }
        return chunks.map((chunk) => ({
          text: chunk.text,
          embedText: `${chunk.contextHeader}
${chunk.text}`,
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex,
          metadata: {
            indexFormat: "structured-v1",
            postedDate: JSON.stringify(postedDate),
            dates: JSON.stringify(chunk.dates),
            sectionPath: chunk.sectionPath,
            contextHeader: chunk.contextHeader
          }
        }));
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
          await fs11.promises.mkdir(path7.dirname(reportPath), { recursive: true });
          await fs11.promises.writeFile(reportPath, JSON.stringify(payload, null, 2), "utf-8");
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
  structuredIndexing,
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
  const statsBefore = await vectorStore2.getStats();
  const { indexFormat, rebuildExistingFiles } = await planIndexFormat(
    vectorStoreDir,
    statsBefore.totalChunks,
    structuredIndexing
  );
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
    autoReindex: forceReindex || rebuildExistingFiles ? false : autoReindex,
    structuredIndexing,
    rebuildExistingFiles,
    parseDelayMs,
    excludePatterns,
    abortSignal,
    onProgress
  });
  let indexingResult;
  try {
    indexingResult = await indexManager.index();
  } finally {
    await vectorStore2.releaseShardCache();
  }
  const stats = await vectorStore2.getStats();
  await syncEmbeddingManifestAfterIndexing(
    vectorStoreDir,
    stats.totalChunks,
    resolvedModelId,
    embeddingModel,
    indexFormat
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

// src/utils/trimOverlappingChunks.ts
function trimOverlappingChunks(results) {
  const byFile = /* @__PURE__ */ new Map();
  for (const result of results) {
    const list = byFile.get(result.filePath);
    if (list) {
      list.push(result);
    } else {
      byFile.set(result.filePath, [result]);
    }
  }
  const trimmedTextByKey = /* @__PURE__ */ new Map();
  const keyFor = (result) => `${result.filePath}::${result.chunkIndex}`;
  for (const fileResults of byFile.values()) {
    if (fileResults.length < 2) continue;
    const byPosition = [...fileResults].sort((a, b) => a.chunkIndex - b.chunkIndex);
    for (let i = 1; i < byPosition.length; i++) {
      const prev = byPosition[i - 1];
      const curr = byPosition[i];
      if (curr.chunkIndex - prev.chunkIndex !== 1) continue;
      const prevEnd = prev.metadata?.endIndex;
      const currStart = curr.metadata?.startIndex;
      if (typeof prevEnd !== "number" || typeof currStart !== "number") continue;
      const overlapWordCount = prevEnd - currStart;
      if (overlapWordCount <= 0) continue;
      const words = curr.text.split(/\s+/);
      if (overlapWordCount >= words.length) continue;
      trimmedTextByKey.set(keyFor(curr), words.slice(overlapWordCount).join(" "));
    }
  }
  if (trimmedTextByKey.size === 0) {
    return results;
  }
  return results.map((result) => {
    const trimmedText = trimmedTextByKey.get(keyFor(result));
    return trimmedText !== void 0 ? { ...result, text: trimmedText } : result;
  });
}
var init_trimOverlappingChunks = __esm({
  "src/utils/trimOverlappingChunks.ts"() {
    "use strict";
  }
});

// src/utils/compactPassages.ts
function splitIntoSentences(text) {
  const matches = text.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g);
  if (!matches || matches.length === 0) {
    const trimmed = text.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }
  return matches.map((s) => s.trim()).filter((s) => s.length > 0);
}
function cosineSimilarity(a, b) {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
async function compactPassageText(text, queryEmbedding, embed, options = {}) {
  const { minSimilarity = DEFAULT_MIN_SIMILARITY, minSentences = DEFAULT_MIN_SENTENCES } = options;
  const sentences = splitIntoSentences(text);
  if (sentences.length <= minSentences) {
    return text;
  }
  const embedded = await embed(sentences);
  const scored = sentences.map((sentence, index) => ({
    sentence,
    index,
    similarity: cosineSimilarity(queryEmbedding, embedded[index].embedding)
  }));
  const aboveThreshold = scored.filter((s) => s.similarity >= minSimilarity);
  const kept = aboveThreshold.length >= minSentences ? aboveThreshold : [...scored].sort((a, b) => b.similarity - a.similarity).slice(0, minSentences);
  kept.sort((a, b) => a.index - b.index);
  return kept.map((s) => s.sentence).join(" ");
}
var DEFAULT_MIN_SIMILARITY, DEFAULT_MIN_SENTENCES;
var init_compactPassages = __esm({
  "src/utils/compactPassages.ts"() {
    "use strict";
    DEFAULT_MIN_SIMILARITY = 0.5;
    DEFAULT_MIN_SENTENCES = 2;
  }
});

// src/retrieval/retrieve.ts
async function compactResultsToBudget(results, queryEmbedding, deps, targetTokenBudget) {
  const compacted = [];
  let usedTokens = 0;
  for (const result of results) {
    const compactedText = await compactPassageText(result.text, queryEmbedding, deps.embedSentences);
    const tokenCount = await deps.countTokens(compactedText);
    if (compacted.length > 0 && usedTokens + tokenCount > targetTokenBudget) {
      continue;
    }
    compacted.push({ ...result, text: compactedText });
    usedTokens += tokenCount;
  }
  return compacted;
}
async function retrieve(query, deps, options) {
  const now = deps.now ?? (() => performance.now());
  const timings = [];
  async function timed(stage, run) {
    const start = now();
    const value = await run();
    timings.push({ stage, ms: now() - start });
    return value;
  }
  const queryEmbedding = await timed("embedQuery", () => deps.embedQuery(query));
  options.abortSignal?.throwIfAborted();
  const searchLimit = options.enableContextCompaction ? options.retrievalLimit * CONTEXT_COMPACTION_POOL_MULTIPLIER : options.retrievalLimit;
  const searched = await timed(
    "vectorSearch",
    () => deps.vectorStore.search(queryEmbedding, searchLimit, options.retrievalThreshold)
  );
  options.abortSignal?.throwIfAborted();
  let passages = await timed("trimOverlap", async () => trimOverlappingChunks(searched));
  if (options.enableContextCompaction && passages.length > 0) {
    const targetTokenBudget = options.retrievalLimit * options.chunkSize;
    const candidates = passages;
    passages = await timed(
      "compaction",
      () => compactResultsToBudget(candidates, queryEmbedding, deps, targetTokenBudget)
    );
  }
  const diagnosticPool = options.diagnosticPoolSize ? await deps.vectorStore.search(queryEmbedding, options.diagnosticPoolSize, Number.NEGATIVE_INFINITY) : [];
  return { passages, diagnosticPool, timings };
}
var CONTEXT_COMPACTION_POOL_MULTIPLIER;
var init_retrieve = __esm({
  "src/retrieval/retrieve.ts"() {
    "use strict";
    init_trimOverlappingChunks();
    init_compactPassages();
    CONTEXT_COMPACTION_POOL_MULTIPLIER = 3;
  }
});

// src/retrieval/renderPassage.ts
function renderPassageForPrompt(result) {
  const header = result.metadata?.contextHeader;
  return typeof header === "string" && header.length > 0 ? `${header}
${result.text}` : result.text;
}
var init_renderPassage = __esm({
  "src/retrieval/renderPassage.ts"() {
    "use strict";
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
async function getCitationFileHandle(client2, filePath, fileHash) {
  const cached = citationFileHandleCache.get(filePath);
  if (cached && cached.fileHash === fileHash) {
    return cached.fileHandle;
  }
  const fileHandle = await client2.files.prepareFile(filePath);
  citationFileHandleCache.set(filePath, { fileHash, fileHandle });
  return fileHandle;
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
  const enableContextCompaction = pluginConfig.get("enableContextCompaction");
  const structuredIndexing = pluginConfig.get("structuredIndexing");
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
    const needsSanityCheck = !sanityChecksPassed;
    const needsVectorStoreInit = !vectorStore || lastIndexedDir !== vectorStoreDir;
    if (needsSanityCheck || needsVectorStoreInit) {
      const usingBigRagStatus = ctl.createStatus({
        status: "loading",
        text: "Using Big RAG..."
      });
      if (needsSanityCheck) {
        const sanityResult = await performSanityChecks(documentsDir, vectorStoreDir);
        for (const warning of sanityResult.warnings) {
          console.warn("[BigRAG]", warning);
        }
        if (!sanityResult.passed) {
          for (const error of sanityResult.errors) {
            console.error("[BigRAG]", error);
          }
          const failureReason = sanityResult.errors[0] ?? sanityResult.warnings[0] ?? "Unknown reason. Please review plugin settings.";
          usingBigRagStatus.setState({
            status: "canceled",
            text: `Big RAG unavailable: ${failureReason}`
          });
          return userMessage;
        }
        sanityChecksPassed = true;
      }
      checkAbort(ctl.abortSignal);
      if (needsVectorStoreInit) {
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
      }
      usingBigRagStatus.setState({
        status: "done",
        text: "Using Big RAG"
      });
    }
    if (!vectorStore) {
      throw new Error("Vector store was not initialized");
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
      structuredIndexing,
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
    const store = vectorStore;
    const formatMessage = await indexFormatStatusMessage(
      vectorStoreDir,
      structuredIndexing,
      async () => (await store.getStats()).totalChunks
    );
    if (formatMessage) {
      console.warn("[BigRAG]", formatMessage);
      ctl.createStatus({ status: "error", text: formatMessage });
    }
    retrievalStatus.setState({
      status: "loading",
      text: "Searching for relevant content..."
    });
    const queryPreview = userPrompt.length > 160 ? `${userPrompt.slice(0, 160)}...` : userPrompt;
    console.info(
      `[BigRAG] Executing retrieval for "${queryPreview}" (limit=${retrievalLimit}, threshold=${retrievalThreshold}, compaction=${enableContextCompaction})`
    );
    const { passages: results, timings } = await retrieve(
      userPrompt,
      {
        vectorStore,
        embedQuery: async (text) => (await embeddingModel.embed(text)).embedding,
        embedSentences: (sentences) => embeddingModel.embed(sentences),
        countTokens: (text) => embeddingModel.countTokens(text)
      },
      { retrievalLimit, retrievalThreshold, chunkSize, enableContextCompaction, abortSignal: ctl.abortSignal }
    );
    checkAbort(ctl.abortSignal);
    console.info(
      `[BigRAG] Retrieval timings: ${timings.map((t) => `${t.stage}=${t.ms.toFixed(0)}ms`).join(" ")}`
    );
    if (results.length > 0) {
      const topHit = results[0];
      console.info(
        `[BigRAG] Vector search returned ${results.length} results. Top hit: file=${topHit.fileName} score=${topHit.score.toFixed(3)}`
      );
      const docSummaries = results.map(
        (result, idx) => `#${idx + 1} file=${path8.basename(result.filePath)} shard=${result.shardName} score=${result.score.toFixed(3)}`
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
      text: enableContextCompaction ? `Retrieved ${results.length} relevant passages (context compaction on)` : `Retrieved ${results.length} relevant passages`
    });
    ctl.debug("Retrieval results:", results);
    let ragContextFull = "";
    let ragContextPreview = "";
    const prefix = "The following passages were found in your indexed documents:\n\n";
    ragContextFull += prefix;
    ragContextPreview += prefix;
    let citationNumber = 1;
    for (const result of results) {
      const fileName = path8.basename(result.filePath);
      const citationLabel = `Citation ${citationNumber} (from ${fileName}, score: ${result.score.toFixed(3)}): `;
      const passage = renderPassageForPrompt(result);
      ragContextFull += `
${citationLabel}"${passage}"

`;
      ragContextPreview += `
${citationLabel}"${summarizeText(passage)}"

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
      const fileName = path8.basename(result.filePath);
      return `#${idx + 1} file=${fileName} shard=${result.shardName} score=${result.score.toFixed(3)}
${summarizeText(result.text)}`;
    });
    const passagesLog = passagesLogEntries.join("\n\n");
    console.info(`[BigRAG] RAG passages (${results.length}) preview:
${passagesLog}`);
    console.info(`[BigRAG] Final prompt sent to model (preview):
${finalPromptPreview}`);
    const citationEntries = [];
    for (const result of results) {
      try {
        const fileHash = typeof result.metadata.fileHash === "string" ? result.metadata.fileHash : "";
        const fileHandle = await getCitationFileHandle(ctl.client, result.filePath, fileHash);
        citationEntries.push({ content: `${result.text} 

 Score: [${result.score.toFixed(3)}]`, score: result.score, source: fileHandle });
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
  structuredIndexing,
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
      structuredIndexing,
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
    if (indexingResult.totalFiles > 0 && indexingResult.skippedFiles === indexingResult.totalFiles) {
      summaryLines.push("All files were already up to date (skipped).");
    }
    ctl.createStatus({
      status: "done",
      text: summaryLines.join("\n")
    });
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
var path8, vectorStore, lastIndexedDir, sanityChecksPassed, citationFileHandleCache, RAG_CONTEXT_MACRO, USER_QUERY_MACRO;
var init_promptPreprocessor = __esm({
  "src/promptPreprocessor.ts"() {
    "use strict";
    init_config();
    init_vectorStore();
    init_sanityChecks();
    init_indexingLock();
    init_embeddingIndexManifest();
    path8 = __toESM(require("path"));
    init_runIndexing();
    init_fileExcludePatterns();
    init_retrieve();
    init_renderPassage();
    vectorStore = null;
    lastIndexedDir = "";
    sanityChecksPassed = false;
    citationFileHandleCache = /* @__PURE__ */ new Map();
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
