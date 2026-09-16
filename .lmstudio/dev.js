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
var import_sdk, DEFAULT_EMBEDDING_MODEL_ID, DEFAULT_PROMPT_TEMPLATE, globalConfigSchematics, configSchematics;
var init_config = __esm({
  "src/config.ts"() {
    "use strict";
    import_sdk = require("@lmstudio/sdk");
    DEFAULT_EMBEDDING_MODEL_ID = "nomic-ai/nomic-embed-text-v1.5-GGUF";
    DEFAULT_PROMPT_TEMPLATE = `{{rag_context}}

Use the citations above to respond to the user query, only if they are relevant. Otherwise, respond to the best of your ability without them.

User Query:

{{user_query}}`;
    globalConfigSchematics = (0, import_sdk.createConfigSchematics)().field(
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
        subtitle: "Model id used to index and search your documents. LM Studio lists some models under two names (e.g. mixedbread-ai/mxbai-embed-large-v1 and text-embedding-mxbai-embed-large-v1) \u2014 either works, but always use the same one. After changing this, select Rebuild everything under Reindex.",
        placeholder: DEFAULT_EMBEDDING_MODEL_ID
      },
      DEFAULT_EMBEDDING_MODEL_ID
    ).field(
      "excludeFilenamePatterns",
      "string",
      {
        displayName: "Exclude filename patterns",
        subtitle: "Optional. One glob per line to skip files, e.g. *.png or archive/**; # starts a comment. Images are always OCR'd, so exclude them here if you don't need them. Files already indexed stay until you rebuild.",
        placeholder: "*.png\n# *.jpg",
        isParagraph: true
      },
      ""
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
    configSchematics = (0, import_sdk.createConfigSchematics)().field(
      "reindexMode",
      "select",
      {
        displayName: "Reindex",
        subtitle: "To prevent reindexing, select No reindex. To keep the index up to date, select Always index new & changed files: every message checks for new or edited documents and indexes those. To rebuild the index from scratch, select Always rebuild everything \u2014 this re-indexes every file on every message, so switch back to No reindex once it has finished.",
        options: [
          { value: "off", displayName: "No reindex" },
          { value: "changed", displayName: "Always index new & changed files" },
          { value: "rebuild", displayName: "Always rebuild everything" }
        ]
      },
      "off"
    ).build();
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

// src/settings/defaults.ts
var FIXED_DEFAULTS;
var init_defaults = __esm({
  "src/settings/defaults.ts"() {
    "use strict";
    FIXED_DEFAULTS = {
      retrievalLimit: 5,
      retrievalThreshold: 0.5,
      chunkSize: 512,
      chunkOverlap: 100,
      maxConcurrentFiles: 1,
      parseDelayMs: 500,
      enableOCR: true,
      structuredIndexing: true,
      enableContextCompaction: false
    };
  }
});

// src/settings/resolveSettings.ts
function asConfigReader(config) {
  const get = config.get;
  return { get: (key) => get.call(config, key) };
}
function readString(config, key) {
  const value = config.get(key);
  return typeof value === "string" ? value : "";
}
function resolveSettings(globalConfig, chatConfig) {
  const documentsDirectory = readString(globalConfig, "documentsDirectory").trim();
  const vectorStoreDirectory = readString(globalConfig, "vectorStoreDirectory").trim();
  const missingRequired = [];
  if (!documentsDirectory) missingRequired.push("Documents Directory");
  if (!vectorStoreDirectory) missingRequired.push("Vector Store Directory");
  const promptTemplate = readString(globalConfig, "promptTemplate");
  const reindexMode = readString(chatConfig, "reindexMode");
  return {
    documentsDirectory,
    vectorStoreDirectory,
    embeddingModelId: resolveEmbeddingModelId(readString(globalConfig, "embeddingModel")),
    excludePatterns: parseExcludePatternsBlock(readString(globalConfig, "excludeFilenamePatterns")),
    promptTemplate: promptTemplate.trim() ? promptTemplate : DEFAULT_PROMPT_TEMPLATE,
    reindexMode: reindexMode === "changed" || reindexMode === "rebuild" ? reindexMode : "off",
    ...FIXED_DEFAULTS,
    missingRequired
  };
}
function notConfiguredMessage(missingRequired) {
  return `Big RAG is not in use: set ${missingRequired.join(" and ")} in Big RAG's global settings.`;
}
var init_resolveSettings = __esm({
  "src/settings/resolveSettings.ts"() {
    "use strict";
    init_config();
    init_fileExcludePatterns();
    init_defaults();
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
  return new RegExp("\\p{L}", "u").test(line);
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
  const settings = resolveSettings(
    asConfigReader(ctl.getGlobalPluginConfig(globalConfigSchematics)),
    asConfigReader(ctl.getPluginConfig(configSchematics))
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
    reindexMode
  } = settings;
  try {
    const currentDirsKey = `${documentsDir}
${vectorStoreDir}`;
    const needsSanityCheck = !sanityChecksPassed || lastSanityCheckedDirs !== currentDirsKey;
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
        lastSanityCheckedDirs = currentDirsKey;
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
    await runRequestedReindex(ctl, settings, vectorStore);
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
    console.info(`[BigRAG] Reindex: ${reindexMode} | Embedding model: ${resolvedEmbeddingModelId}`);
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
    const promptTemplate = normalizePromptTemplate(settings.promptTemplate);
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
async function runRequestedReindex(ctl, settings, store) {
  const mode = settings.reindexMode;
  if (mode === "off") {
    return;
  }
  const embeddingModelId = settings.embeddingModelId;
  const label = REINDEX_MODE_LABELS[mode];
  if (!tryStartIndexing("config-trigger")) {
    ctl.createStatus({
      status: "canceled",
      text: "A reindex is already running. Please wait for it to finish."
    });
    return;
  }
  const status = ctl.createStatus({
    status: "loading",
    text: `Reindex requested (${label})\u2026 (embedding model: ${embeddingModelId})`
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
    if (ctl.abortSignal.aborted) {
      status.setState({
        status: "canceled",
        text: "Reindex cancelled."
      });
      return;
    }
    status.setState({
      status: "done",
      text: `Reindex complete (${label}). Select No reindex to stop reindexing on every message.`
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
    console.log(`[BigRAG] Reindex summary:
  ${summaryLines.join("\n  ")}`);
    try {
      await ctl.client.system.notify({
        title: "Big RAG reindex completed",
        description: `Reindex (${label}) finished. Select No reindex to stop reindexing on every message.`
      });
    } catch (error) {
      console.warn("[BigRAG] Unable to send reindex notification:", error);
    }
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    status.setState({
      status: "error",
      text: `Reindex failed: ${error instanceof Error ? error.message : String(error)}`
    });
    console.error("[BigRAG] Reindex failed:", error);
  } finally {
    finishIndexing();
  }
}
var path8, vectorStore, lastIndexedDir, sanityChecksPassed, lastSanityCheckedDirs, citationFileHandleCache, RAG_CONTEXT_MACRO, USER_QUERY_MACRO, REINDEX_MODE_LABELS;
var init_promptPreprocessor = __esm({
  "src/promptPreprocessor.ts"() {
    "use strict";
    init_config();
    init_resolveSettings();
    init_vectorStore();
    init_sanityChecks();
    init_indexingLock();
    init_embeddingIndexManifest();
    path8 = __toESM(require("path"));
    init_runIndexing();
    init_retrieve();
    init_renderPassage();
    vectorStore = null;
    lastIndexedDir = "";
    sanityChecksPassed = false;
    lastSanityCheckedDirs = "";
    citationFileHandleCache = /* @__PURE__ */ new Map();
    RAG_CONTEXT_MACRO = "{{rag_context}}";
    USER_QUERY_MACRO = "{{user_query}}";
    REINDEX_MODE_LABELS = {
      changed: "Always index new & changed files",
      rebuild: "Always rebuild everything"
    };
  }
});

// src/index.ts
var src_exports = {};
__export(src_exports, {
  main: () => main
});
async function main(context) {
  context.withGlobalConfigSchematics(globalConfigSchematics);
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
  withGlobalConfigSchematics: (globalConfigSchematics2) => {
    if (globalConfigSchematicsSet) {
      throw new Error("Global config schematics already registered");
    }
    globalConfigSchematicsSet = true;
    selfRegistrationHost.setGlobalConfigSchematics(globalConfigSchematics2);
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2NvbmZpZy50cyIsICIuLi9zcmMvdXRpbHMvZmlsZUV4Y2x1ZGVQYXR0ZXJucy50cyIsICIuLi9zcmMvc2V0dGluZ3MvZGVmYXVsdHMudHMiLCAiLi4vc3JjL3NldHRpbmdzL3Jlc29sdmVTZXR0aW5ncy50cyIsICIuLi9zcmMvdmVjdG9yc3RvcmUvdmVjdG9yU3RvcmUudHMiLCAiLi4vc3JjL3V0aWxzL3Nhbml0eUNoZWNrcy50cyIsICIuLi9zcmMvdXRpbHMvaW5kZXhpbmdMb2NrLnRzIiwgIi4uL3NyYy91dGlscy9jb2VyY2VFbWJlZGRpbmcudHMiLCAiLi4vc3JjL3V0aWxzL2VtYmVkZGluZ0luZGV4TWFuaWZlc3QudHMiLCAiLi4vc3JjL3V0aWxzL3N1cHBvcnRlZEV4dGVuc2lvbnMudHMiLCAiLi4vc3JjL2luZ2VzdGlvbi9maWxlU2Nhbm5lci50cyIsICIuLi9zcmMvcGFyc2Vycy9tYXJrZG93bi9odG1sVG9NYXJrZG93bi50cyIsICIuLi9zcmMvcGFyc2Vycy9odG1sUGFyc2VyLnRzIiwgIi4uL3NyYy9wYXJzZXJzL21hcmtkb3duL2luZmVyU3RydWN0dXJlLnRzIiwgIi4uL3NyYy9wYXJzZXJzL21hcmtkb3duL29jclBhZ2VzLnRzIiwgIi4uL3NyYy9wYXJzZXJzL3BkZlBhcnNlci50cyIsICIuLi9zcmMvcGFyc2Vycy9lcHViUGFyc2VyLnRzIiwgIi4uL3NyYy9wYXJzZXJzL2ltYWdlUGFyc2VyLnRzIiwgIi4uL3NyYy9wYXJzZXJzL21hcmtkb3duL25vcm1hbGl6ZU1hcmtkb3duLnRzIiwgIi4uL3NyYy9wYXJzZXJzL3RleHRQYXJzZXIudHMiLCAiLi4vc3JjL3BhcnNlcnMvZW1iZWRkZWRJbWFnZXMudHMiLCAiLi4vc3JjL3BhcnNlcnMvcHB0eFBhcnNlci50cyIsICIuLi9zcmMvcGFyc2Vycy9kb2N4UGFyc2VyLnRzIiwgIi4uL3NyYy9wYXJzZXJzL2RvY3VtZW50UGFyc2VyLnRzIiwgIi4uL3NyYy91dGlscy90ZXh0Q2h1bmtlci50cyIsICIuLi9zcmMvdXRpbHMvZmlsZUhhc2gudHMiLCAiLi4vc3JjL3V0aWxzL2ZhaWxlZEZpbGVSZWdpc3RyeS50cyIsICIuLi9zcmMvbWV0YWRhdGEvZGF0ZXMudHMiLCAiLi4vc3JjL2NodW5raW5nL3NlY3Rpb25zLnRzIiwgIi4uL3NyYy9jaHVua2luZy9zdHJ1Y3R1cmVkQ2h1bmtlci50cyIsICIuLi9zcmMvaW5nZXN0aW9uL2luZGV4TWFuYWdlci50cyIsICIuLi9zcmMvaW5nZXN0aW9uL3J1bkluZGV4aW5nLnRzIiwgIi4uL3NyYy91dGlscy90cmltT3ZlcmxhcHBpbmdDaHVua3MudHMiLCAiLi4vc3JjL3V0aWxzL2NvbXBhY3RQYXNzYWdlcy50cyIsICIuLi9zcmMvcmV0cmlldmFsL3JldHJpZXZlLnRzIiwgIi4uL3NyYy9yZXRyaWV2YWwvcmVuZGVyUGFzc2FnZS50cyIsICIuLi9zcmMvcHJvbXB0UHJlcHJvY2Vzc29yLnRzIiwgIi4uL3NyYy9pbmRleC50cyIsICJlbnRyeS50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgY3JlYXRlQ29uZmlnU2NoZW1hdGljcyB9IGZyb20gXCJAbG1zdHVkaW8vc2RrXCI7XHJcblxyXG4vKiogRGVmYXVsdCBlbWJlZGRpbmcgbW9kZWwgaWQgKG11c3QgbWF0Y2ggQ0xJIGRlZmF1bHQgd2hlbiBlbnYgaXMgdW5zZXQpLiAqL1xyXG5leHBvcnQgY29uc3QgREVGQVVMVF9FTUJFRERJTkdfTU9ERUxfSUQgPSBcIm5vbWljLWFpL25vbWljLWVtYmVkLXRleHQtdjEuNS1HR1VGXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUVtYmVkZGluZ01vZGVsSWQocmF3OiBzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsKTogc3RyaW5nIHtcclxuICBjb25zdCB0ID0gdHlwZW9mIHJhdyA9PT0gXCJzdHJpbmdcIiA/IHJhdy50cmltKCkgOiBcIlwiO1xyXG4gIHJldHVybiB0Lmxlbmd0aCA+IDAgPyB0IDogREVGQVVMVF9FTUJFRERJTkdfTU9ERUxfSUQ7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBERUZBVUxUX1BST01QVF9URU1QTEFURSA9IGB7e3JhZ19jb250ZXh0fX1cclxuXHJcblVzZSB0aGUgY2l0YXRpb25zIGFib3ZlIHRvIHJlc3BvbmQgdG8gdGhlIHVzZXIgcXVlcnksIG9ubHkgaWYgdGhleSBhcmUgcmVsZXZhbnQuIE90aGVyd2lzZSwgcmVzcG9uZCB0byB0aGUgYmVzdCBvZiB5b3VyIGFiaWxpdHkgd2l0aG91dCB0aGVtLlxyXG5cclxuVXNlciBRdWVyeTpcclxuXHJcbnt7dXNlcl9xdWVyeX19YDtcclxuXHJcbi8qKiBTZXQgb25jZSBmb3IgdGhlIHBsdWdpbiBpbiBMTSBTdHVkaW8ncyBwbHVnaW4gc2V0dGluZ3M7IG5vdCBzaG93biBwZXIgY2hhdC4gKi9cclxuZXhwb3J0IGNvbnN0IGdsb2JhbENvbmZpZ1NjaGVtYXRpY3MgPSBjcmVhdGVDb25maWdTY2hlbWF0aWNzKClcclxuICAuZmllbGQoXHJcbiAgICBcImRvY3VtZW50c0RpcmVjdG9yeVwiLFxyXG4gICAgXCJzdHJpbmdcIixcclxuICAgIHtcclxuICAgICAgZGlzcGxheU5hbWU6IFwiRG9jdW1lbnRzIERpcmVjdG9yeVwiLFxyXG4gICAgICBzdWJ0aXRsZTogXCJSb290IGRpcmVjdG9yeSBjb250YWluaW5nIGRvY3VtZW50cyB0byBpbmRleC4gQWxsIHN1YmRpcmVjdG9yaWVzIHdpbGwgYmUgc2Nhbm5lZC5cIixcclxuICAgICAgcGxhY2Vob2xkZXI6IFwiL3BhdGgvdG8vZG9jdW1lbnRzXCIsXHJcbiAgICB9LFxyXG4gICAgXCJcIixcclxuICApXHJcbiAgLmZpZWxkKFxyXG4gICAgXCJ2ZWN0b3JTdG9yZURpcmVjdG9yeVwiLFxyXG4gICAgXCJzdHJpbmdcIixcclxuICAgIHtcclxuICAgICAgZGlzcGxheU5hbWU6IFwiVmVjdG9yIFN0b3JlIERpcmVjdG9yeVwiLFxyXG4gICAgICBzdWJ0aXRsZTogXCJEaXJlY3Rvcnkgd2hlcmUgdGhlIHZlY3RvciBkYXRhYmFzZSB3aWxsIGJlIHN0b3JlZC5cIixcclxuICAgICAgcGxhY2Vob2xkZXI6IFwiL3BhdGgvdG8vdmVjdG9yL3N0b3JlXCIsXHJcbiAgICB9LFxyXG4gICAgXCJcIixcclxuICApXHJcbiAgLmZpZWxkKFxyXG4gICAgXCJlbWJlZGRpbmdNb2RlbFwiLFxyXG4gICAgXCJzdHJpbmdcIixcclxuICAgIHtcclxuICAgICAgZGlzcGxheU5hbWU6IFwiRW1iZWRkaW5nIE1vZGVsXCIsXHJcbiAgICAgIHN1YnRpdGxlOlxyXG4gICAgICAgIFwiTW9kZWwgaWQgdXNlZCB0byBpbmRleCBhbmQgc2VhcmNoIHlvdXIgZG9jdW1lbnRzLiBMTSBTdHVkaW8gbGlzdHMgc29tZSBtb2RlbHMgdW5kZXIgdHdvIG5hbWVzIFwiXHJcbiAgICAgICAgKyBcIihlLmcuIG1peGVkYnJlYWQtYWkvbXhiYWktZW1iZWQtbGFyZ2UtdjEgYW5kIHRleHQtZW1iZWRkaW5nLW14YmFpLWVtYmVkLWxhcmdlLXYxKSBcdTIwMTQgZWl0aGVyIHdvcmtzLCBidXQgYWx3YXlzIHVzZSB0aGUgc2FtZSBvbmUuIFwiXHJcbiAgICAgICAgKyBcIkFmdGVyIGNoYW5naW5nIHRoaXMsIHNlbGVjdCBSZWJ1aWxkIGV2ZXJ5dGhpbmcgdW5kZXIgUmVpbmRleC5cIixcclxuICAgICAgcGxhY2Vob2xkZXI6IERFRkFVTFRfRU1CRURESU5HX01PREVMX0lELFxyXG4gICAgfSxcclxuICAgIERFRkFVTFRfRU1CRURESU5HX01PREVMX0lELFxyXG4gIClcclxuICAuZmllbGQoXHJcbiAgICBcImV4Y2x1ZGVGaWxlbmFtZVBhdHRlcm5zXCIsXHJcbiAgICBcInN0cmluZ1wiLFxyXG4gICAge1xyXG4gICAgICBkaXNwbGF5TmFtZTogXCJFeGNsdWRlIGZpbGVuYW1lIHBhdHRlcm5zXCIsXHJcbiAgICAgIHN1YnRpdGxlOlxyXG4gICAgICAgIFwiT3B0aW9uYWwuIE9uZSBnbG9iIHBlciBsaW5lIHRvIHNraXAgZmlsZXMsIGUuZy4gKi5wbmcgb3IgYXJjaGl2ZS8qKjsgIyBzdGFydHMgYSBjb21tZW50LiBcIlxyXG4gICAgICAgICsgXCJJbWFnZXMgYXJlIGFsd2F5cyBPQ1InZCwgc28gZXhjbHVkZSB0aGVtIGhlcmUgaWYgeW91IGRvbid0IG5lZWQgdGhlbS4gRmlsZXMgYWxyZWFkeSBpbmRleGVkIHN0YXkgdW50aWwgeW91IHJlYnVpbGQuXCIsXHJcbiAgICAgIHBsYWNlaG9sZGVyOiBcIioucG5nXFxuIyAqLmpwZ1wiLFxyXG4gICAgICBpc1BhcmFncmFwaDogdHJ1ZSxcclxuICAgIH0sXHJcbiAgICBcIlwiLFxyXG4gIClcclxuICAuZmllbGQoXHJcbiAgICBcInByb21wdFRlbXBsYXRlXCIsXHJcbiAgICBcInN0cmluZ1wiLFxyXG4gICAge1xyXG4gICAgICBkaXNwbGF5TmFtZTogXCJQcm9tcHQgVGVtcGxhdGVcIixcclxuICAgICAgc3VidGl0bGU6XHJcbiAgICAgICAgXCJTdXBwb3J0cyB7e3JhZ19jb250ZXh0fX0gKHJlcXVpcmVkKSBhbmQge3t1c2VyX3F1ZXJ5fX0gbWFjcm9zIGZvciBjdXN0b21pemluZyB0aGUgZmluYWwgcHJvbXB0LlwiLFxyXG4gICAgICBwbGFjZWhvbGRlcjogREVGQVVMVF9QUk9NUFRfVEVNUExBVEUsXHJcbiAgICAgIGlzUGFyYWdyYXBoOiB0cnVlLFxyXG4gICAgfSxcclxuICAgIERFRkFVTFRfUFJPTVBUX1RFTVBMQVRFLFxyXG4gIClcclxuICAuYnVpbGQoKTtcclxuXHJcbi8qKiBTaG93biBpbiBlYWNoIGNoYXQncyBzaWRlYmFyLiAqL1xyXG5leHBvcnQgY29uc3QgY29uZmlnU2NoZW1hdGljcyA9IGNyZWF0ZUNvbmZpZ1NjaGVtYXRpY3MoKVxyXG4gIC5maWVsZChcclxuICAgIFwicmVpbmRleE1vZGVcIixcclxuICAgIFwic2VsZWN0XCIsXHJcbiAgICB7XHJcbiAgICAgIGRpc3BsYXlOYW1lOiBcIlJlaW5kZXhcIixcclxuICAgICAgc3VidGl0bGU6XHJcbiAgICAgICAgXCJUbyBwcmV2ZW50IHJlaW5kZXhpbmcsIHNlbGVjdCBObyByZWluZGV4LiBUbyBrZWVwIHRoZSBpbmRleCB1cCB0byBkYXRlLCBzZWxlY3QgQWx3YXlzIGluZGV4IG5ldyAmIGNoYW5nZWQgZmlsZXM6IFwiXHJcbiAgICAgICAgKyBcImV2ZXJ5IG1lc3NhZ2UgY2hlY2tzIGZvciBuZXcgb3IgZWRpdGVkIGRvY3VtZW50cyBhbmQgaW5kZXhlcyB0aG9zZS4gXCJcclxuICAgICAgICArIFwiVG8gcmVidWlsZCB0aGUgaW5kZXggZnJvbSBzY3JhdGNoLCBzZWxlY3QgQWx3YXlzIHJlYnVpbGQgZXZlcnl0aGluZyBcdTIwMTQgdGhpcyByZS1pbmRleGVzIGV2ZXJ5IGZpbGUgb24gZXZlcnkgbWVzc2FnZSwgXCJcclxuICAgICAgICArIFwic28gc3dpdGNoIGJhY2sgdG8gTm8gcmVpbmRleCBvbmNlIGl0IGhhcyBmaW5pc2hlZC5cIixcclxuICAgICAgb3B0aW9uczogW1xyXG4gICAgICAgIHsgdmFsdWU6IFwib2ZmXCIsIGRpc3BsYXlOYW1lOiBcIk5vIHJlaW5kZXhcIiB9LFxyXG4gICAgICAgIHsgdmFsdWU6IFwiY2hhbmdlZFwiLCBkaXNwbGF5TmFtZTogXCJBbHdheXMgaW5kZXggbmV3ICYgY2hhbmdlZCBmaWxlc1wiIH0sXHJcbiAgICAgICAgeyB2YWx1ZTogXCJyZWJ1aWxkXCIsIGRpc3BsYXlOYW1lOiBcIkFsd2F5cyByZWJ1aWxkIGV2ZXJ5dGhpbmdcIiB9LFxyXG4gICAgICBdLFxyXG4gICAgfSxcclxuICAgIFwib2ZmXCIsXHJcbiAgKVxyXG4gIC5idWlsZCgpO1xyXG5cclxuIiwgImltcG9ydCB7IG1pbmltYXRjaCB9IGZyb20gXCJtaW5pbWF0Y2hcIjtcclxuXHJcbmNvbnN0IE1JTklNQVRDSF9PUFRTID0ge1xyXG4gIGRvdDogdHJ1ZSxcclxuICBtYXRjaEJhc2U6IHRydWUsXHJcbiAgd2luZG93c1BhdGhzTm9Fc2NhcGU6IHRydWUsXHJcbn0gYXMgY29uc3Q7XHJcblxyXG4vKipcclxuICogT25lIGdsb2IgcGF0dGVybiBwZXIgbGluZTsgdHJpbTsgc2tpcCBlbXB0eSBhbmQgIyBjb21tZW50cy5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUV4Y2x1ZGVQYXR0ZXJuc0Jsb2NrKHRleHQ6IHN0cmluZyk6IHN0cmluZ1tdIHtcclxuICBjb25zdCBvdXQ6IHN0cmluZ1tdID0gW107XHJcbiAgZm9yIChjb25zdCByYXdMaW5lIG9mIHRleHQuc3BsaXQoL1xccj9cXG4vKSkge1xyXG4gICAgY29uc3QgbGluZSA9IHJhd0xpbmUudHJpbSgpO1xyXG4gICAgaWYgKGxpbmUgPT09IFwiXCIgfHwgbGluZS5zdGFydHNXaXRoKFwiI1wiKSkge1xyXG4gICAgICBjb250aW51ZTtcclxuICAgIH1cclxuICAgIG91dC5wdXNoKGxpbmUpO1xyXG4gIH1cclxuICByZXR1cm4gb3V0O1xyXG59XHJcblxyXG4vKiogU2VtaWNvbG9uLXNlcGFyYXRlZCBwYXR0ZXJucyBmb3IgZW52IHZhcnMgKHNoZWxsLWZyaWVuZGx5KS4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlRXhjbHVkZVBhdHRlcm5zRnJvbUVudihyYXc6IHN0cmluZyB8IHVuZGVmaW5lZCk6IHN0cmluZ1tdIHtcclxuICBpZiAocmF3ID09PSB1bmRlZmluZWQgfHwgcmF3LnRyaW0oKSA9PT0gXCJcIikge1xyXG4gICAgcmV0dXJuIFtdO1xyXG4gIH1cclxuICByZXR1cm4gcGFyc2VFeGNsdWRlUGF0dGVybnNCbG9jayhyYXcucmVwbGFjZSgvOy9nLCBcIlxcblwiKSk7XHJcbn1cclxuXHJcbi8qKiBGaXJzdCBtYXRjaGluZyBwYXR0ZXJuLCBvciBudWxsIGlmIG5vbmUgbWF0Y2guICovXHJcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaEV4Y2x1ZGVQYXR0ZXJuKHJlbGF0aXZlUG9zaXhQYXRoOiBzdHJpbmcsIHBhdHRlcm5zOiBzdHJpbmdbXSk6IHN0cmluZyB8IG51bGwge1xyXG4gIGZvciAoY29uc3QgcCBvZiBwYXR0ZXJucykge1xyXG4gICAgaWYgKG1pbmltYXRjaChyZWxhdGl2ZVBvc2l4UGF0aCwgcCwgTUlOSU1BVENIX09QVFMpKSB7XHJcbiAgICAgIHJldHVybiBwO1xyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gbnVsbDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGlzUmVsYXRpdmVQYXRoRXhjbHVkZWQocmVsYXRpdmVQb3NpeFBhdGg6IHN0cmluZywgcGF0dGVybnM6IHN0cmluZ1tdKTogYm9vbGVhbiB7XHJcbiAgcmV0dXJuIG1hdGNoRXhjbHVkZVBhdHRlcm4ocmVsYXRpdmVQb3NpeFBhdGgsIHBhdHRlcm5zKSAhPT0gbnVsbDtcclxufVxyXG4iLCAiLyoqXHJcbiAqIFZhbHVlcyB0aGF0IGFyZSBub3QgZXhwb3NlZCBhcyBwbHVnaW4gc2V0dGluZ3MuIFRoZSBwbHVnaW4gYWx3YXlzIHVzZXNcclxuICogdGhlc2U7IHRoZSBDTEkgaW5kZXhlciBhbmQgZXZhbCBoYXJuZXNzIHVzZSB0aGVtIHVubGVzcyBhIEJJR19SQUdfKiBlbnYgdmFyXHJcbiAqIG92ZXJyaWRlcyB0aGVtLlxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IEZJWEVEX0RFRkFVTFRTID0ge1xyXG4gIHJldHJpZXZhbExpbWl0OiA1LFxyXG4gIHJldHJpZXZhbFRocmVzaG9sZDogMC41LFxyXG4gIGNodW5rU2l6ZTogNTEyLFxyXG4gIGNodW5rT3ZlcmxhcDogMTAwLFxyXG4gIG1heENvbmN1cnJlbnRGaWxlczogMSxcclxuICBwYXJzZURlbGF5TXM6IDUwMCxcclxuICBlbmFibGVPQ1I6IHRydWUsXHJcbiAgc3RydWN0dXJlZEluZGV4aW5nOiB0cnVlLFxyXG4gIGVuYWJsZUNvbnRleHRDb21wYWN0aW9uOiBmYWxzZSxcclxufSBhcyBjb25zdDtcclxuIiwgImltcG9ydCB7IERFRkFVTFRfUFJPTVBUX1RFTVBMQVRFLCByZXNvbHZlRW1iZWRkaW5nTW9kZWxJZCB9IGZyb20gXCIuLi9jb25maWdcIjtcclxuaW1wb3J0IHsgcGFyc2VFeGNsdWRlUGF0dGVybnNCbG9jayB9IGZyb20gXCIuLi91dGlscy9maWxlRXhjbHVkZVBhdHRlcm5zXCI7XHJcbmltcG9ydCB7IEZJWEVEX0RFRkFVTFRTIH0gZnJvbSBcIi4vZGVmYXVsdHNcIjtcclxuXHJcbmV4cG9ydCB0eXBlIFJlaW5kZXhNb2RlID0gXCJvZmZcIiB8IFwiY2hhbmdlZFwiIHwgXCJyZWJ1aWxkXCI7XHJcblxyXG4vKiogTWluaW1hbCB2aWV3IG9mIExNIFN0dWRpbydzIHBhcnNlZCBjb25maWcsIHNvIHRlc3RzIGNhbiBwYXNzIHBsYWluIHN0dWJzLiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIENvbmZpZ1JlYWRlciB7XHJcbiAgZ2V0KGtleTogc3RyaW5nKTogdW5rbm93bjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBSZXNvbHZlZFNldHRpbmdzIHtcclxuICBkb2N1bWVudHNEaXJlY3Rvcnk6IHN0cmluZztcclxuICB2ZWN0b3JTdG9yZURpcmVjdG9yeTogc3RyaW5nO1xyXG4gIGVtYmVkZGluZ01vZGVsSWQ6IHN0cmluZztcclxuICBleGNsdWRlUGF0dGVybnM6IHN0cmluZ1tdO1xyXG4gIHByb21wdFRlbXBsYXRlOiBzdHJpbmc7XHJcbiAgcmVpbmRleE1vZGU6IFJlaW5kZXhNb2RlO1xyXG4gIHJldHJpZXZhbExpbWl0OiBudW1iZXI7XHJcbiAgcmV0cmlldmFsVGhyZXNob2xkOiBudW1iZXI7XHJcbiAgY2h1bmtTaXplOiBudW1iZXI7XHJcbiAgY2h1bmtPdmVybGFwOiBudW1iZXI7XHJcbiAgbWF4Q29uY3VycmVudEZpbGVzOiBudW1iZXI7XHJcbiAgcGFyc2VEZWxheU1zOiBudW1iZXI7XHJcbiAgZW5hYmxlT0NSOiBib29sZWFuO1xyXG4gIHN0cnVjdHVyZWRJbmRleGluZzogYm9vbGVhbjtcclxuICBlbmFibGVDb250ZXh0Q29tcGFjdGlvbjogYm9vbGVhbjtcclxuICAvKiogUmVxdWlyZWQgZ2xvYmFsIHNldHRpbmdzIHRoYXQgYXJlIGVtcHR5LCBieSBkaXNwbGF5IG5hbWUuICovXHJcbiAgbWlzc2luZ1JlcXVpcmVkOiBzdHJpbmdbXTtcclxufVxyXG5cclxuLyoqIFdyYXBzIGFuIExNIFN0dWRpbyBQYXJzZWRDb25maWcgKHdob3NlIHR5cGVkIGdldCgpIG9ubHkgYWNjZXB0cyBpdHMgb3duIGtleXMpIGFzIGEgQ29uZmlnUmVhZGVyLiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gYXNDb25maWdSZWFkZXIoY29uZmlnOiB7IGdldDogdW5rbm93biB9KTogQ29uZmlnUmVhZGVyIHtcclxuICBjb25zdCBnZXQgPSBjb25maWcuZ2V0IGFzIChrZXk6IHN0cmluZykgPT4gdW5rbm93bjtcclxuICByZXR1cm4geyBnZXQ6IChrZXkpID0+IGdldC5jYWxsKGNvbmZpZywga2V5KSB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiByZWFkU3RyaW5nKGNvbmZpZzogQ29uZmlnUmVhZGVyLCBrZXk6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgY29uc3QgdmFsdWUgPSBjb25maWcuZ2V0KGtleSk7XHJcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIiA/IHZhbHVlIDogXCJcIjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVTZXR0aW5ncyhnbG9iYWxDb25maWc6IENvbmZpZ1JlYWRlciwgY2hhdENvbmZpZzogQ29uZmlnUmVhZGVyKTogUmVzb2x2ZWRTZXR0aW5ncyB7XHJcbiAgY29uc3QgZG9jdW1lbnRzRGlyZWN0b3J5ID0gcmVhZFN0cmluZyhnbG9iYWxDb25maWcsIFwiZG9jdW1lbnRzRGlyZWN0b3J5XCIpLnRyaW0oKTtcclxuICBjb25zdCB2ZWN0b3JTdG9yZURpcmVjdG9yeSA9IHJlYWRTdHJpbmcoZ2xvYmFsQ29uZmlnLCBcInZlY3RvclN0b3JlRGlyZWN0b3J5XCIpLnRyaW0oKTtcclxuICBjb25zdCBtaXNzaW5nUmVxdWlyZWQ6IHN0cmluZ1tdID0gW107XHJcbiAgaWYgKCFkb2N1bWVudHNEaXJlY3RvcnkpIG1pc3NpbmdSZXF1aXJlZC5wdXNoKFwiRG9jdW1lbnRzIERpcmVjdG9yeVwiKTtcclxuICBpZiAoIXZlY3RvclN0b3JlRGlyZWN0b3J5KSBtaXNzaW5nUmVxdWlyZWQucHVzaChcIlZlY3RvciBTdG9yZSBEaXJlY3RvcnlcIik7XHJcblxyXG4gIGNvbnN0IHByb21wdFRlbXBsYXRlID0gcmVhZFN0cmluZyhnbG9iYWxDb25maWcsIFwicHJvbXB0VGVtcGxhdGVcIik7XHJcbiAgY29uc3QgcmVpbmRleE1vZGUgPSByZWFkU3RyaW5nKGNoYXRDb25maWcsIFwicmVpbmRleE1vZGVcIik7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBkb2N1bWVudHNEaXJlY3RvcnksXHJcbiAgICB2ZWN0b3JTdG9yZURpcmVjdG9yeSxcclxuICAgIGVtYmVkZGluZ01vZGVsSWQ6IHJlc29sdmVFbWJlZGRpbmdNb2RlbElkKHJlYWRTdHJpbmcoZ2xvYmFsQ29uZmlnLCBcImVtYmVkZGluZ01vZGVsXCIpKSxcclxuICAgIGV4Y2x1ZGVQYXR0ZXJuczogcGFyc2VFeGNsdWRlUGF0dGVybnNCbG9jayhyZWFkU3RyaW5nKGdsb2JhbENvbmZpZywgXCJleGNsdWRlRmlsZW5hbWVQYXR0ZXJuc1wiKSksXHJcbiAgICBwcm9tcHRUZW1wbGF0ZTogcHJvbXB0VGVtcGxhdGUudHJpbSgpID8gcHJvbXB0VGVtcGxhdGUgOiBERUZBVUxUX1BST01QVF9URU1QTEFURSxcclxuICAgIHJlaW5kZXhNb2RlOiByZWluZGV4TW9kZSA9PT0gXCJjaGFuZ2VkXCIgfHwgcmVpbmRleE1vZGUgPT09IFwicmVidWlsZFwiID8gcmVpbmRleE1vZGUgOiBcIm9mZlwiLFxyXG4gICAgLi4uRklYRURfREVGQVVMVFMsXHJcbiAgICBtaXNzaW5nUmVxdWlyZWQsXHJcbiAgfTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG5vdENvbmZpZ3VyZWRNZXNzYWdlKG1pc3NpbmdSZXF1aXJlZDogc3RyaW5nW10pOiBzdHJpbmcge1xyXG4gIHJldHVybiBgQmlnIFJBRyBpcyBub3QgaW4gdXNlOiBzZXQgJHttaXNzaW5nUmVxdWlyZWQuam9pbihcIiBhbmQgXCIpfSBpbiBCaWcgUkFHJ3MgZ2xvYmFsIHNldHRpbmdzLmA7XHJcbn1cclxuIiwgImltcG9ydCAqIGFzIGZzIGZyb20gXCJmcy9wcm9taXNlc1wiO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCB7IExvY2FsSW5kZXggfSBmcm9tIFwidmVjdHJhXCI7XHJcblxyXG5jb25zdCBERUZBVUxUX01BWF9JVEVNU19QRVJfU0hBUkQgPSAxMDAwMDtcclxuY29uc3QgU0hBUkRfRElSX1BSRUZJWCA9IFwic2hhcmRfXCI7XHJcbmNvbnN0IFNIQVJEX0RJUl9SRUdFWCA9IC9ec2hhcmRfKFxcZCspJC87XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIERvY3VtZW50Q2h1bmsge1xyXG4gIGlkOiBzdHJpbmc7XHJcbiAgdGV4dDogc3RyaW5nO1xyXG4gIHZlY3RvcjogbnVtYmVyW107XHJcbiAgZmlsZVBhdGg6IHN0cmluZztcclxuICBmaWxlTmFtZTogc3RyaW5nO1xyXG4gIGZpbGVIYXNoOiBzdHJpbmc7XHJcbiAgY2h1bmtJbmRleDogbnVtYmVyO1xyXG4gIG1ldGFkYXRhOiBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFNlYXJjaFJlc3VsdCB7XHJcbiAgdGV4dDogc3RyaW5nO1xyXG4gIHNjb3JlOiBudW1iZXI7XHJcbiAgZmlsZVBhdGg6IHN0cmluZztcclxuICBmaWxlTmFtZTogc3RyaW5nO1xyXG4gIGNodW5rSW5kZXg6IG51bWJlcjtcclxuICBzaGFyZE5hbWU6IHN0cmluZztcclxuICBtZXRhZGF0YTogUmVjb3JkPHN0cmluZywgYW55PjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJbmRleGVkQ2h1bmsge1xyXG4gIHRleHQ6IHN0cmluZztcclxuICBmaWxlUGF0aDogc3RyaW5nO1xyXG4gIGZpbGVOYW1lOiBzdHJpbmc7XHJcbiAgY2h1bmtJbmRleDogbnVtYmVyO1xyXG4gIG1ldGFkYXRhOiBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xyXG59XHJcblxyXG50eXBlIENodW5rTWV0YWRhdGEgPSB7XHJcbiAgdGV4dDogc3RyaW5nO1xyXG4gIGZpbGVQYXRoOiBzdHJpbmc7XHJcbiAgZmlsZU5hbWU6IHN0cmluZztcclxuICBmaWxlSGFzaDogc3RyaW5nO1xyXG4gIGNodW5rSW5kZXg6IG51bWJlcjtcclxuICBba2V5OiBzdHJpbmddOiBhbnk7XHJcbn07XHJcblxyXG5leHBvcnQgY2xhc3MgVmVjdG9yU3RvcmUge1xyXG4gIHByaXZhdGUgZGJQYXRoOiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSBzaGFyZERpcnM6IHN0cmluZ1tdID0gW107XHJcbiAgcHJpdmF0ZSBhY3RpdmVTaGFyZDogTG9jYWxJbmRleCB8IG51bGwgPSBudWxsO1xyXG4gIHByaXZhdGUgYWN0aXZlU2hhcmRDb3VudDogbnVtYmVyID0gMDtcclxuICAvKipcclxuICAgKiBTaGFyZCBpbnN0YW5jZXMgdGhhdCBoYXZlIGJlZW4gbXV0YXRlZCBvciBzY2FubmVkIGZvciBkZWxldGlvbi4gdmVjdHJhIGNhY2hlcyBhIHNoYXJkJ3NcclxuICAgKiBwYXJzZWQgaW5kZXguanNvbiBpbnNpZGUgaXRzIExvY2FsSW5kZXgsIHNvIGV2ZXJ5IHdyaXRlIHRvIGEgc2hhcmQgZGlyZWN0b3J5IG11c3QgZ29cclxuICAgKiB0aHJvdWdoIG9uZSBzaGFyZWQgaW5zdGFuY2UgLSBvdGhlcndpc2UgYSBzdGFsZSBjYWNoZWQgY29weSBjYW4gd3JpdGUgZGVsZXRlZCBpdGVtcyBiYWNrLlxyXG4gICAqL1xyXG4gIHByaXZhdGUgc2hhcmRDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBMb2NhbEluZGV4PigpO1xyXG4gIHByaXZhdGUgdXBkYXRlTXV0ZXg6IFByb21pc2U8dm9pZD4gPSBQcm9taXNlLnJlc29sdmUoKTtcclxuICBwcml2YXRlIHJlYWRvbmx5IG1heEl0ZW1zUGVyU2hhcmQ6IG51bWJlcjtcclxuXHJcbiAgLyoqXHJcbiAgICogQHBhcmFtIG1heEl0ZW1zUGVyU2hhcmQgVGVzdCBzZWFtIG9ubHk6IG92ZXJyaWRlcyB0aGUgc2hhcmQgcm90YXRpb24gdGhyZXNob2xkIHNvIHRlc3RzXHJcbiAgICogY2FuIGZvcmNlIG11bHRpcGxlIHNoYXJkcyB3aXRob3V0IGluc2VydGluZyB0aG91c2FuZHMgb2YgY2h1bmtzLiBQcm9kdWN0aW9uIGNhbGxlcnMgc2hvdWxkXHJcbiAgICogb21pdCB0aGlzIGFuZCBnZXQgdGhlIHJlYWwgZGVmYXVsdC5cclxuICAgKi9cclxuICBjb25zdHJ1Y3RvcihkYlBhdGg6IHN0cmluZywgbWF4SXRlbXNQZXJTaGFyZDogbnVtYmVyID0gREVGQVVMVF9NQVhfSVRFTVNfUEVSX1NIQVJEKSB7XHJcbiAgICB0aGlzLmRiUGF0aCA9IHBhdGgucmVzb2x2ZShkYlBhdGgpO1xyXG4gICAgdGhpcy5tYXhJdGVtc1BlclNoYXJkID0gbWF4SXRlbXNQZXJTaGFyZDtcclxuICB9XHJcblxyXG4gIC8qKiBOdW1iZXIgb2Ygc2hhcmRzIGN1cnJlbnRseSBoZWxkIGluIHRoZSB3cml0ZS10aHJvdWdoIGNhY2hlLiBFeHBvc2VkIGZvciB0ZXN0cy4gKi9cclxuICBnZXQgY2FjaGVkU2hhcmRDb3VudCgpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIHRoaXMuc2hhcmRDYWNoZS5zaXplO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogT3BlbiBhIHNoYXJkIGJ5IGRpcmVjdG9yeSBuYW1lIChlLmcuIFwic2hhcmRfMDAwXCIpIGZvciByZWFkaW5nLiBSZXVzZXMgdGhlIHNoYXJlZCBjYWNoZWRcclxuICAgKiBpbnN0YW5jZSB3aGVuIG9uZSBleGlzdHM7IG90aGVyd2lzZSByZXR1cm5zIGEgZnJlc2ggaW5zdGFuY2UgdGhlIGNhbGxlciBtdXN0IG5vdCBob2xkLFxyXG4gICAqIHNvIEdDIGNhbiBmcmVlIHRoZSBwYXJzZWQgaW5kZXggZGF0YS5cclxuICAgKi9cclxuICBwcml2YXRlIG9wZW5TaGFyZChkaXI6IHN0cmluZyk6IExvY2FsSW5kZXgge1xyXG4gICAgcmV0dXJuIHRoaXMuc2hhcmRDYWNoZS5nZXQoZGlyKSA/PyBuZXcgTG9jYWxJbmRleChwYXRoLmpvaW4odGhpcy5kYlBhdGgsIGRpcikpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IChjcmVhdGluZyBpZiBuZWVkZWQpIHRoZSBzaGFyZWQgY2FjaGVkIGluc3RhbmNlIGZvciBhIHNoYXJkIGRpcmVjdG9yeS4gVXNlIHRoaXMgZm9yXHJcbiAgICogZXZlcnkgbXV0YXRpb24gc28gYWxsIHdyaXRlcyB0byBhIGRpcmVjdG9yeSBzZWUgdGhlIHNhbWUgaW4tbWVtb3J5IGRhdGEuXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjYWNoZWRTaGFyZChkaXI6IHN0cmluZyk6IExvY2FsSW5kZXgge1xyXG4gICAgbGV0IHNoYXJkID0gdGhpcy5zaGFyZENhY2hlLmdldChkaXIpO1xyXG4gICAgaWYgKCFzaGFyZCkge1xyXG4gICAgICBzaGFyZCA9IG5ldyBMb2NhbEluZGV4KHBhdGguam9pbih0aGlzLmRiUGF0aCwgZGlyKSk7XHJcbiAgICAgIHRoaXMuc2hhcmRDYWNoZS5zZXQoZGlyLCBzaGFyZCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gc2hhcmQ7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTY2FuIGRiUGF0aCBmb3Igc2hhcmRfTk5OIGRpcmVjdG9yaWVzIGFuZCByZXR1cm4gc29ydGVkIGxpc3QuXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBkaXNjb3ZlclNoYXJkRGlycygpOiBQcm9taXNlPHN0cmluZ1tdPiB7XHJcbiAgICBjb25zdCBlbnRyaWVzID0gYXdhaXQgZnMucmVhZGRpcih0aGlzLmRiUGF0aCwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xyXG4gICAgY29uc3QgZGlyczogc3RyaW5nW10gPSBbXTtcclxuICAgIGZvciAoY29uc3QgZSBvZiBlbnRyaWVzKSB7XHJcbiAgICAgIGlmIChlLmlzRGlyZWN0b3J5KCkgJiYgU0hBUkRfRElSX1JFR0VYLnRlc3QoZS5uYW1lKSkge1xyXG4gICAgICAgIGRpcnMucHVzaChlLm5hbWUpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBkaXJzLnNvcnQoKGEsIGIpID0+IHtcclxuICAgICAgY29uc3QgbiA9IChtOiBzdHJpbmcpID0+IHBhcnNlSW50KG0ubWF0Y2goU0hBUkRfRElSX1JFR0VYKSFbMV0sIDEwKTtcclxuICAgICAgcmV0dXJuIG4oYSkgLSBuKGIpO1xyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gZGlycztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemUgdGhlIHZlY3RvciBzdG9yZTogZGlzY292ZXIgb3IgY3JlYXRlIHNoYXJkcywgb3BlbiB0aGUgbGFzdCBhcyBhY3RpdmUuXHJcbiAgICovXHJcbiAgYXN5bmMgaW5pdGlhbGl6ZSgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IGZzLm1rZGlyKHRoaXMuZGJQYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcclxuICAgIHRoaXMuc2hhcmRDYWNoZS5jbGVhcigpO1xyXG4gICAgdGhpcy5zaGFyZERpcnMgPSBhd2FpdCB0aGlzLmRpc2NvdmVyU2hhcmREaXJzKCk7XHJcblxyXG4gICAgaWYgKHRoaXMuc2hhcmREaXJzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICBjb25zdCBmaXJzdERpciA9IGAke1NIQVJEX0RJUl9QUkVGSVh9MDAwYDtcclxuICAgICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLmpvaW4odGhpcy5kYlBhdGgsIGZpcnN0RGlyKTtcclxuICAgICAgY29uc3QgaW5kZXggPSBuZXcgTG9jYWxJbmRleChmdWxsUGF0aCk7XHJcbiAgICAgIGF3YWl0IGluZGV4LmNyZWF0ZUluZGV4KHsgdmVyc2lvbjogMSB9KTtcclxuICAgICAgdGhpcy5zaGFyZENhY2hlLnNldChmaXJzdERpciwgaW5kZXgpO1xyXG4gICAgICB0aGlzLnNoYXJkRGlycyA9IFtmaXJzdERpcl07XHJcbiAgICAgIHRoaXMuYWN0aXZlU2hhcmQgPSBpbmRleDtcclxuICAgICAgdGhpcy5hY3RpdmVTaGFyZENvdW50ID0gMDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNvbnN0IGxhc3REaXIgPSB0aGlzLnNoYXJkRGlyc1t0aGlzLnNoYXJkRGlycy5sZW5ndGggLSAxXTtcclxuICAgICAgdGhpcy5hY3RpdmVTaGFyZCA9IHRoaXMuY2FjaGVkU2hhcmQobGFzdERpcik7XHJcbiAgICAgIGNvbnN0IGl0ZW1zID0gYXdhaXQgdGhpcy5hY3RpdmVTaGFyZC5saXN0SXRlbXMoKTtcclxuICAgICAgdGhpcy5hY3RpdmVTaGFyZENvdW50ID0gaXRlbXMubGVuZ3RoO1xyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2coXCJWZWN0b3Igc3RvcmUgaW5pdGlhbGl6ZWQgc3VjY2Vzc2Z1bGx5XCIpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQWRkIGRvY3VtZW50IGNodW5rcyB0byB0aGUgYWN0aXZlIHNoYXJkLiBSb3RhdGVzIHRvIGEgbmV3IHNoYXJkIHdoZW4gZnVsbC5cclxuICAgKi9cclxuICBhc3luYyBhZGRDaHVua3MoY2h1bmtzOiBEb2N1bWVudENodW5rW10pOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmICghdGhpcy5hY3RpdmVTaGFyZCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJWZWN0b3Igc3RvcmUgbm90IGluaXRpYWxpemVkXCIpO1xyXG4gICAgfVxyXG4gICAgaWYgKGNodW5rcy5sZW5ndGggPT09IDApIHJldHVybjtcclxuXHJcbiAgICB0aGlzLnVwZGF0ZU11dGV4ID0gdGhpcy51cGRhdGVNdXRleC50aGVuKGFzeW5jICgpID0+IHtcclxuICAgICAgYXdhaXQgdGhpcy5hY3RpdmVTaGFyZCEuYmVnaW5VcGRhdGUoKTtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBmb3IgKGNvbnN0IGNodW5rIG9mIGNodW5rcykge1xyXG4gICAgICAgICAgY29uc3QgbWV0YWRhdGE6IENodW5rTWV0YWRhdGEgPSB7XHJcbiAgICAgICAgICAgIHRleHQ6IGNodW5rLnRleHQsXHJcbiAgICAgICAgICAgIGZpbGVQYXRoOiBjaHVuay5maWxlUGF0aCxcclxuICAgICAgICAgICAgZmlsZU5hbWU6IGNodW5rLmZpbGVOYW1lLFxyXG4gICAgICAgICAgICBmaWxlSGFzaDogY2h1bmsuZmlsZUhhc2gsXHJcbiAgICAgICAgICAgIGNodW5rSW5kZXg6IGNodW5rLmNodW5rSW5kZXgsXHJcbiAgICAgICAgICAgIC4uLmNodW5rLm1ldGFkYXRhLFxyXG4gICAgICAgICAgfTtcclxuICAgICAgICAgIGF3YWl0IHRoaXMuYWN0aXZlU2hhcmQhLnVwc2VydEl0ZW0oe1xyXG4gICAgICAgICAgICBpZDogY2h1bmsuaWQsXHJcbiAgICAgICAgICAgIHZlY3RvcjogY2h1bmsudmVjdG9yLFxyXG4gICAgICAgICAgICBtZXRhZGF0YSxcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBhd2FpdCB0aGlzLmFjdGl2ZVNoYXJkIS5lbmRVcGRhdGUoKTtcclxuICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIHRoaXMuYWN0aXZlU2hhcmQhLmNhbmNlbFVwZGF0ZSgpO1xyXG4gICAgICAgIHRocm93IGU7XHJcbiAgICAgIH1cclxuICAgICAgdGhpcy5hY3RpdmVTaGFyZENvdW50ICs9IGNodW5rcy5sZW5ndGg7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBBZGRlZCAke2NodW5rcy5sZW5ndGh9IGNodW5rcyB0byB2ZWN0b3Igc3RvcmVgKTtcclxuXHJcbiAgICAgIGlmICh0aGlzLmFjdGl2ZVNoYXJkQ291bnQgPj0gdGhpcy5tYXhJdGVtc1BlclNoYXJkKSB7XHJcbiAgICAgICAgY29uc3QgbmV4dE51bSA9IHRoaXMuc2hhcmREaXJzLmxlbmd0aDtcclxuICAgICAgICBjb25zdCBuZXh0RGlyID0gYCR7U0hBUkRfRElSX1BSRUZJWH0ke1N0cmluZyhuZXh0TnVtKS5wYWRTdGFydCgzLCBcIjBcIil9YDtcclxuICAgICAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGguam9pbih0aGlzLmRiUGF0aCwgbmV4dERpcik7XHJcbiAgICAgICAgY29uc3QgbmV3SW5kZXggPSBuZXcgTG9jYWxJbmRleChmdWxsUGF0aCk7XHJcbiAgICAgICAgYXdhaXQgbmV3SW5kZXguY3JlYXRlSW5kZXgoeyB2ZXJzaW9uOiAxIH0pO1xyXG4gICAgICAgIHRoaXMuc2hhcmRDYWNoZS5zZXQobmV4dERpciwgbmV3SW5kZXgpO1xyXG4gICAgICAgIHRoaXMuc2hhcmREaXJzLnB1c2gobmV4dERpcik7XHJcbiAgICAgICAgdGhpcy5hY3RpdmVTaGFyZCA9IG5ld0luZGV4O1xyXG4gICAgICAgIHRoaXMuYWN0aXZlU2hhcmRDb3VudCA9IDA7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB0aGlzLnVwZGF0ZU11dGV4O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2VhcmNoOiBxdWVyeSBlYWNoIHNoYXJkIGluIHR1cm4sIG1lcmdlIHJlc3VsdHMsIHNvcnQgYnkgc2NvcmUsIGZpbHRlciBieSB0aHJlc2hvbGQsIHJldHVybiB0b3AgbGltaXQuXHJcbiAgICovXHJcbiAgYXN5bmMgc2VhcmNoKFxyXG4gICAgcXVlcnlWZWN0b3I6IG51bWJlcltdLFxyXG4gICAgbGltaXQ6IG51bWJlciA9IDUsXHJcbiAgICB0aHJlc2hvbGQ6IG51bWJlciA9IDAuNSxcclxuICApOiBQcm9taXNlPFNlYXJjaFJlc3VsdFtdPiB7XHJcbiAgICBjb25zdCBtZXJnZWQ6IFNlYXJjaFJlc3VsdFtdID0gW107XHJcbiAgICBmb3IgKGNvbnN0IGRpciBvZiB0aGlzLnNoYXJkRGlycykge1xyXG4gICAgICBjb25zdCBzaGFyZCA9IHRoaXMub3BlblNoYXJkKGRpcik7XHJcbiAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBzaGFyZC5xdWVyeUl0ZW1zKFxyXG4gICAgICAgIHF1ZXJ5VmVjdG9yLFxyXG4gICAgICAgIFwiXCIsXHJcbiAgICAgICAgbGltaXQsXHJcbiAgICAgICAgdW5kZWZpbmVkLFxyXG4gICAgICAgIGZhbHNlLFxyXG4gICAgICApO1xyXG4gICAgICBmb3IgKGNvbnN0IHIgb2YgcmVzdWx0cykge1xyXG4gICAgICAgIGNvbnN0IG0gPSByLml0ZW0ubWV0YWRhdGEgYXMgQ2h1bmtNZXRhZGF0YTtcclxuICAgICAgICBtZXJnZWQucHVzaCh7XHJcbiAgICAgICAgICB0ZXh0OiBtPy50ZXh0ID8/IFwiXCIsXHJcbiAgICAgICAgICBzY29yZTogci5zY29yZSxcclxuICAgICAgICAgIGZpbGVQYXRoOiBtPy5maWxlUGF0aCA/PyBcIlwiLFxyXG4gICAgICAgICAgZmlsZU5hbWU6IG0/LmZpbGVOYW1lID8/IFwiXCIsXHJcbiAgICAgICAgICBjaHVua0luZGV4OiBtPy5jaHVua0luZGV4ID8/IDAsXHJcbiAgICAgICAgICBzaGFyZE5hbWU6IGRpcixcclxuICAgICAgICAgIG1ldGFkYXRhOiAoci5pdGVtLm1ldGFkYXRhIGFzIFJlY29yZDxzdHJpbmcsIGFueT4pID8/IHt9LFxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbWVyZ2VkXHJcbiAgICAgIC5maWx0ZXIoKHIpID0+IHIuc2NvcmUgPj0gdGhyZXNob2xkKVxyXG4gICAgICAuc29ydCgoYSwgYikgPT4gYi5zY29yZSAtIGEuc2NvcmUpXHJcbiAgICAgIC5zbGljZSgwLCBsaW1pdCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBEZWxldGUgYWxsIGNodW5rcyBmb3IgYSBmaWxlIChieSBoYXNoKSBhY3Jvc3MgYWxsIHNoYXJkcy5cclxuICAgKi9cclxuICBhc3luYyBkZWxldGVCeUZpbGVIYXNoKGZpbGVIYXNoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRoaXMudXBkYXRlTXV0ZXggPSB0aGlzLnVwZGF0ZU11dGV4LnRoZW4oYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBsYXN0RGlyID0gdGhpcy5zaGFyZERpcnNbdGhpcy5zaGFyZERpcnMubGVuZ3RoIC0gMV07XHJcbiAgICAgIGZvciAoY29uc3QgZGlyIG9mIHRoaXMuc2hhcmREaXJzKSB7XHJcbiAgICAgICAgLy8gU2hhcmVkIGluc3RhbmNlOiB0aGUgYWN0aXZlIHNoYXJkJ3MgY2FjaGUgbXVzdCBzZWUgdGhpcyBkZWxldGlvbiwgYW5kIGxhdGVyXHJcbiAgICAgICAgLy8gZGVsZXRpb25zIHJldXNlIHRoZSBwYXJzZWQgZGF0YSBpbnN0ZWFkIG9mIHJlLXJlYWRpbmcgZXZlcnkgc2hhcmQgZnJvbSBkaXNrLlxyXG4gICAgICAgIGNvbnN0IHNoYXJkID0gdGhpcy5jYWNoZWRTaGFyZChkaXIpO1xyXG4gICAgICAgIGNvbnN0IGl0ZW1zID0gYXdhaXQgc2hhcmQubGlzdEl0ZW1zKCk7XHJcbiAgICAgICAgY29uc3QgdG9EZWxldGUgPSBpdGVtcy5maWx0ZXIoXHJcbiAgICAgICAgICAoaSkgPT4gKGkubWV0YWRhdGEgYXMgQ2h1bmtNZXRhZGF0YSk/LmZpbGVIYXNoID09PSBmaWxlSGFzaCxcclxuICAgICAgICApO1xyXG4gICAgICAgIGlmICh0b0RlbGV0ZS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICBhd2FpdCBzaGFyZC5iZWdpblVwZGF0ZSgpO1xyXG4gICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRvRGVsZXRlKSB7XHJcbiAgICAgICAgICAgICAgYXdhaXQgc2hhcmQuZGVsZXRlSXRlbShpdGVtLmlkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBhd2FpdCBzaGFyZC5lbmRVcGRhdGUoKTtcclxuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgc2hhcmQuY2FuY2VsVXBkYXRlKCk7XHJcbiAgICAgICAgICAgIHRocm93IGU7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoZGlyID09PSBsYXN0RGlyICYmIHRoaXMuYWN0aXZlU2hhcmQpIHtcclxuICAgICAgICAgICAgdGhpcy5hY3RpdmVTaGFyZENvdW50ID0gKGF3YWl0IHRoaXMuYWN0aXZlU2hhcmQubGlzdEl0ZW1zKCkpLmxlbmd0aDtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgY29uc29sZS5sb2coYERlbGV0ZWQgY2h1bmtzIGZvciBmaWxlIGhhc2g6ICR7ZmlsZUhhc2h9YCk7XHJcbiAgICB9KTtcclxuICAgIHJldHVybiB0aGlzLnVwZGF0ZU11dGV4O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGZpbGUgcGF0aCAtPiBzZXQgb2YgZmlsZSBoYXNoZXMgY3VycmVudGx5IGluIHRoZSBzdG9yZS5cclxuICAgKi9cclxuICBhc3luYyBnZXRGaWxlSGFzaEludmVudG9yeSgpOiBQcm9taXNlPE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+Pj4ge1xyXG4gICAgY29uc3QgaW52ZW50b3J5ID0gbmV3IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PigpO1xyXG4gICAgZm9yIChjb25zdCBkaXIgb2YgdGhpcy5zaGFyZERpcnMpIHtcclxuICAgICAgY29uc3Qgc2hhcmQgPSB0aGlzLm9wZW5TaGFyZChkaXIpO1xyXG4gICAgICBjb25zdCBpdGVtcyA9IGF3YWl0IHNoYXJkLmxpc3RJdGVtcygpO1xyXG4gICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcclxuICAgICAgICBjb25zdCBtID0gaXRlbS5tZXRhZGF0YSBhcyBDaHVua01ldGFkYXRhO1xyXG4gICAgICAgIGNvbnN0IGZpbGVQYXRoID0gbT8uZmlsZVBhdGg7XHJcbiAgICAgICAgY29uc3QgZmlsZUhhc2ggPSBtPy5maWxlSGFzaDtcclxuICAgICAgICBpZiAoIWZpbGVQYXRoIHx8ICFmaWxlSGFzaCkgY29udGludWU7XHJcbiAgICAgICAgbGV0IHNldCA9IGludmVudG9yeS5nZXQoZmlsZVBhdGgpO1xyXG4gICAgICAgIGlmICghc2V0KSB7XHJcbiAgICAgICAgICBzZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuICAgICAgICAgIGludmVudG9yeS5zZXQoZmlsZVBhdGgsIHNldCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNldC5hZGQoZmlsZUhhc2gpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gaW52ZW50b3J5O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTGlzdCBldmVyeSBpbmRleGVkIGNodW5rIGFjcm9zcyBhbGwgc2hhcmRzLlxyXG4gICAqL1xyXG4gIGFzeW5jIGxpc3RDaHVua3MoKTogUHJvbWlzZTxJbmRleGVkQ2h1bmtbXT4ge1xyXG4gICAgY29uc3QgY2h1bmtzOiBJbmRleGVkQ2h1bmtbXSA9IFtdO1xyXG4gICAgZm9yIChjb25zdCBkaXIgb2YgdGhpcy5zaGFyZERpcnMpIHtcclxuICAgICAgY29uc3Qgc2hhcmQgPSB0aGlzLm9wZW5TaGFyZChkaXIpO1xyXG4gICAgICBjb25zdCBpdGVtcyA9IGF3YWl0IHNoYXJkLmxpc3RJdGVtcygpO1xyXG4gICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcclxuICAgICAgICBjb25zdCBtID0gaXRlbS5tZXRhZGF0YSBhcyBDaHVua01ldGFkYXRhO1xyXG4gICAgICAgIGlmICghbT8uZmlsZVBhdGggfHwgdHlwZW9mIG0udGV4dCAhPT0gXCJzdHJpbmdcIikgY29udGludWU7XHJcbiAgICAgICAgY2h1bmtzLnB1c2goe1xyXG4gICAgICAgICAgdGV4dDogbS50ZXh0LFxyXG4gICAgICAgICAgZmlsZVBhdGg6IG0uZmlsZVBhdGgsXHJcbiAgICAgICAgICBmaWxlTmFtZTogbS5maWxlTmFtZSxcclxuICAgICAgICAgIGNodW5rSW5kZXg6IG0uY2h1bmtJbmRleCxcclxuICAgICAgICAgIG1ldGFkYXRhOiBtLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gY2h1bmtzO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IHRvdGFsIGNodW5rIGNvdW50IGFuZCB1bmlxdWUgZmlsZSBjb3VudC5cclxuICAgKi9cclxuICBhc3luYyBnZXRTdGF0cygpOiBQcm9taXNlPHtcclxuICAgIHRvdGFsQ2h1bmtzOiBudW1iZXI7XHJcbiAgICB1bmlxdWVGaWxlczogbnVtYmVyO1xyXG4gIH0+IHtcclxuICAgIGxldCB0b3RhbENodW5rcyA9IDA7XHJcbiAgICBjb25zdCB1bmlxdWVIYXNoZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuICAgIGZvciAoY29uc3QgZGlyIG9mIHRoaXMuc2hhcmREaXJzKSB7XHJcbiAgICAgIGNvbnN0IHNoYXJkID0gdGhpcy5vcGVuU2hhcmQoZGlyKTtcclxuICAgICAgY29uc3QgaXRlbXMgPSBhd2FpdCBzaGFyZC5saXN0SXRlbXMoKTtcclxuICAgICAgdG90YWxDaHVua3MgKz0gaXRlbXMubGVuZ3RoO1xyXG4gICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcclxuICAgICAgICBjb25zdCBoID0gKGl0ZW0ubWV0YWRhdGEgYXMgQ2h1bmtNZXRhZGF0YSk/LmZpbGVIYXNoO1xyXG4gICAgICAgIGlmIChoKSB1bmlxdWVIYXNoZXMuYWRkKGgpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4geyB0b3RhbENodW5rcywgdW5pcXVlRmlsZXM6IHVuaXF1ZUhhc2hlcy5zaXplIH07XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVjayBpZiBhbnkgY2h1bmsgZXhpc3RzIGZvciB0aGUgZ2l2ZW4gZmlsZSBoYXNoIChzaG9ydC1jaXJjdWl0cyBvbiBmaXJzdCBtYXRjaCkuXHJcbiAgICovXHJcbiAgYXN5bmMgaGFzRmlsZShmaWxlSGFzaDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICBmb3IgKGNvbnN0IGRpciBvZiB0aGlzLnNoYXJkRGlycykge1xyXG4gICAgICBjb25zdCBzaGFyZCA9IHRoaXMub3BlblNoYXJkKGRpcik7XHJcbiAgICAgIGNvbnN0IGl0ZW1zID0gYXdhaXQgc2hhcmQubGlzdEl0ZW1zKCk7XHJcbiAgICAgIGlmIChpdGVtcy5zb21lKChpKSA9PiAoaS5tZXRhZGF0YSBhcyBDaHVua01ldGFkYXRhKT8uZmlsZUhhc2ggPT09IGZpbGVIYXNoKSkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBEcm9wIGV2ZXJ5IGNhY2hlZCBzaGFyZCBleGNlcHQgdGhlIGFjdGl2ZSBzaGFyZCdzIGVudHJ5LiBgY2FjaGVkU2hhcmRgICh1c2VkIGJ5XHJcbiAgICogZGVsZXRlQnlGaWxlSGFzaCkgY2FjaGVzIGV2ZXJ5IHNoYXJkIGl0IHRvdWNoZXMsIGFuZCB2ZWN0cmEncyBMb2NhbEluZGV4IGtlZXBzIGl0cyBlbnRpcmVcclxuICAgKiBwYXJzZWQgaW5kZXguanNvbiAtIGluY2x1ZGluZyBldmVyeSBpdGVtJ3MgdmVjdG9yIC0gaW4gbWVtb3J5IGZvciB0aGUgbGlmZSBvZiB0aGVcclxuICAgKiBpbnN0YW5jZS4gSW4gYSBsb25nLWxpdmVkIFZlY3RvclN0b3JlIHRoYXQgc2NhbiBtYWtlcyB0aGUgd2hvbGUgaW5kZXggcmVzaWRlbnQgaW4gUkFNIGFmdGVyXHJcbiAgICogdGhlIGZpcnN0IGRlbGV0ZSBvZiBhbiBpbmRleGluZyBydW4uIEV2ZXJ5dGhpbmcgY2FjaGVkIGhlcmUgaGFzIGFscmVhZHkgYmVlbiBmbHVzaGVkIHRvXHJcbiAgICogZGlzayAodmVjdHJhIHdyaXRlcyBvbiBlbmRVcGRhdGUpLCBzbyBkcm9wcGluZyB0aGUgZW50cmllcyBsb3NlcyBub3RoaW5nOyBhIGxhdGVyIHJlYWRcclxuICAgKiBzaW1wbHkgcmUtb3BlbnMgdGhlIHNoYXJkIGZyZXNoIHZpYSBgb3BlblNoYXJkYC4gQ2hhaW5lZCB0aHJvdWdoIHVwZGF0ZU11dGV4IHNvIGl0IGNhbid0XHJcbiAgICogcmFjZSBhbiBpbi1mbGlnaHQgYWRkQ2h1bmtzL2RlbGV0ZUJ5RmlsZUhhc2guXHJcbiAgICovXHJcbiAgYXN5bmMgcmVsZWFzZVNoYXJkQ2FjaGUoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0aGlzLnVwZGF0ZU11dGV4ID0gdGhpcy51cGRhdGVNdXRleC50aGVuKCgpID0+IHtcclxuICAgICAgbGV0IGFjdGl2ZURpcjogc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG4gICAgICBmb3IgKGNvbnN0IFtkaXIsIHNoYXJkXSBvZiB0aGlzLnNoYXJkQ2FjaGUpIHtcclxuICAgICAgICBpZiAoc2hhcmQgPT09IHRoaXMuYWN0aXZlU2hhcmQpIHtcclxuICAgICAgICAgIGFjdGl2ZURpciA9IGRpcjtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBmb3IgKGNvbnN0IGRpciBvZiBbLi4udGhpcy5zaGFyZENhY2hlLmtleXMoKV0pIHtcclxuICAgICAgICBpZiAoZGlyICE9PSBhY3RpdmVEaXIpIHtcclxuICAgICAgICAgIHRoaXMuc2hhcmRDYWNoZS5kZWxldGUoZGlyKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHRoaXMudXBkYXRlTXV0ZXg7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZWxlYXNlIHRoZSBhY3RpdmUgc2hhcmQgcmVmZXJlbmNlLlxyXG4gICAqL1xyXG4gIGFzeW5jIGNsb3NlKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdGhpcy5hY3RpdmVTaGFyZCA9IG51bGw7XHJcbiAgICB0aGlzLnNoYXJkQ2FjaGUuY2xlYXIoKTtcclxuICB9XHJcbn1cclxuIiwgImltcG9ydCAqIGFzIGZzIGZyb20gXCJmc1wiO1xyXG5pbXBvcnQgKiBhcyBvcyBmcm9tIFwib3NcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgU2FuaXR5Q2hlY2tSZXN1bHQge1xyXG4gIHBhc3NlZDogYm9vbGVhbjtcclxuICB3YXJuaW5nczogc3RyaW5nW107XHJcbiAgZXJyb3JzOiBzdHJpbmdbXTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFBlcmZvcm0gc2FuaXR5IGNoZWNrcyBiZWZvcmUgaW5kZXhpbmcgbGFyZ2UgZGlyZWN0b3JpZXNcclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwZXJmb3JtU2FuaXR5Q2hlY2tzKFxyXG4gIGRvY3VtZW50c0Rpcjogc3RyaW5nLFxyXG4gIHZlY3RvclN0b3JlRGlyOiBzdHJpbmcsXHJcbik6IFByb21pc2U8U2FuaXR5Q2hlY2tSZXN1bHQ+IHtcclxuICBjb25zdCB3YXJuaW5nczogc3RyaW5nW10gPSBbXTtcclxuICBjb25zdCBlcnJvcnM6IHN0cmluZ1tdID0gW107XHJcblxyXG4gIC8vIENoZWNrIGlmIGRpcmVjdG9yaWVzIGV4aXN0XHJcbiAgdHJ5IHtcclxuICAgIGF3YWl0IGZzLnByb21pc2VzLmFjY2Vzcyhkb2N1bWVudHNEaXIsIGZzLmNvbnN0YW50cy5SX09LKTtcclxuICB9IGNhdGNoIHtcclxuICAgIGVycm9ycy5wdXNoKGBEb2N1bWVudHMgZGlyZWN0b3J5IGRvZXMgbm90IGV4aXN0IG9yIGlzIG5vdCByZWFkYWJsZTogJHtkb2N1bWVudHNEaXJ9YCk7XHJcbiAgfVxyXG5cclxuICB0cnkge1xyXG4gICAgYXdhaXQgZnMucHJvbWlzZXMuYWNjZXNzKHZlY3RvclN0b3JlRGlyLCBmcy5jb25zdGFudHMuV19PSyk7XHJcbiAgfSBjYXRjaCB7XHJcbiAgICAvLyBUcnkgdG8gY3JlYXRlIGl0XHJcbiAgICB0cnkge1xyXG4gICAgICBhd2FpdCBmcy5wcm9taXNlcy5ta2Rpcih2ZWN0b3JTdG9yZURpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XHJcbiAgICB9IGNhdGNoIHtcclxuICAgICAgZXJyb3JzLnB1c2goXHJcbiAgICAgICAgYFZlY3RvciBzdG9yZSBkaXJlY3RvcnkgZG9lcyBub3QgZXhpc3QgYW5kIGNhbm5vdCBiZSBjcmVhdGVkOiAke3ZlY3RvclN0b3JlRGlyfWBcclxuICAgICAgKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIENoZWNrIGF2YWlsYWJsZSBkaXNrIHNwYWNlXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHN0YXRzID0gYXdhaXQgZnMucHJvbWlzZXMuc3RhdGZzKHZlY3RvclN0b3JlRGlyKTtcclxuICAgIGNvbnN0IGF2YWlsYWJsZUdCID0gKHN0YXRzLmJhdmFpbCAqIHN0YXRzLmJzaXplKSAvICgxMDI0ICogMTAyNCAqIDEwMjQpO1xyXG4gICAgXHJcbiAgICBpZiAoYXZhaWxhYmxlR0IgPCAxKSB7XHJcbiAgICAgIGVycm9ycy5wdXNoKGBWZXJ5IGxvdyBkaXNrIHNwYWNlIGF2YWlsYWJsZTogJHthdmFpbGFibGVHQi50b0ZpeGVkKDIpfSBHQmApO1xyXG4gICAgfSBlbHNlIGlmIChhdmFpbGFibGVHQiA8IDEwKSB7XHJcbiAgICAgIHdhcm5pbmdzLnB1c2goYExvdyBkaXNrIHNwYWNlIGF2YWlsYWJsZTogJHthdmFpbGFibGVHQi50b0ZpeGVkKDIpfSBHQmApO1xyXG4gICAgfVxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICB3YXJuaW5ncy5wdXNoKFwiQ291bGQgbm90IGNoZWNrIGF2YWlsYWJsZSBkaXNrIHNwYWNlXCIpO1xyXG4gIH1cclxuXHJcbiAgLy8gQ2hlY2sgYXZhaWxhYmxlIG1lbW9yeVxyXG4gIGNvbnN0IGZyZWVNZW1vcnlHQiA9IG9zLmZyZWVtZW0oKSAvICgxMDI0ICogMTAyNCAqIDEwMjQpO1xyXG4gIGNvbnN0IHRvdGFsTWVtb3J5R0IgPSBvcy50b3RhbG1lbSgpIC8gKDEwMjQgKiAxMDI0ICogMTAyNCk7XHJcbiAgY29uc3QgcnVubmluZ09uTWFjID0gcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gXCJkYXJ3aW5cIjtcclxuICBjb25zdCBsb3dNZW1vcnlNZXNzYWdlID1cclxuICAgIGBMb3cgZnJlZSBtZW1vcnk6ICR7ZnJlZU1lbW9yeUdCLnRvRml4ZWQoMil9IEdCIG9mICR7dG90YWxNZW1vcnlHQi50b0ZpeGVkKDIpfSBHQiB0b3RhbC4gYCArXHJcbiAgICBcIkNvbnNpZGVyIHJlZHVjaW5nIGNvbmN1cnJlbnQgZmlsZSBwcm9jZXNzaW5nLlwiO1xyXG4gIGNvbnN0IHZlcnlMb3dNZW1vcnlNZXNzYWdlID1cclxuICAgIGBWZXJ5IGxvdyBmcmVlIG1lbW9yeTogJHtmcmVlTWVtb3J5R0IudG9GaXhlZCgyKX0gR0IuIGAgK1xyXG4gICAgKHJ1bm5pbmdPbk1hY1xyXG4gICAgICA/IFwibWFjT1MgbWF5IGJlIHJlcG9ydGluZyBjYWNoZWQgcGFnZXMgYXMgdXNlZDsgY2FjaGVkIG1lbW9yeSBjYW4gdXN1YWxseSBiZSByZWNsYWltZWQgYXV0b21hdGljYWxseS5cIlxyXG4gICAgICA6IFwiSW5kZXhpbmcgbWF5IGZhaWwgZHVlIHRvIGluc3VmZmljaWVudCBSQU0uXCIpO1xyXG5cclxuICBpZiAoZnJlZU1lbW9yeUdCIDwgMC41KSB7XHJcbiAgICBpZiAocnVubmluZ09uTWFjKSB7XHJcbiAgICAgIHdhcm5pbmdzLnB1c2godmVyeUxvd01lbW9yeU1lc3NhZ2UpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgZXJyb3JzLnB1c2goYFZlcnkgbG93IGZyZWUgbWVtb3J5OiAke2ZyZWVNZW1vcnlHQi50b0ZpeGVkKDIpfSBHQmApO1xyXG4gICAgfVxyXG4gIH0gZWxzZSBpZiAoZnJlZU1lbW9yeUdCIDwgMikge1xyXG4gICAgd2FybmluZ3MucHVzaChsb3dNZW1vcnlNZXNzYWdlKTtcclxuICB9XHJcblxyXG4gIC8vIEVzdGltYXRlIGRpcmVjdG9yeSBzaXplIChzYW1wbGUtYmFzZWQgZm9yIHBlcmZvcm1hbmNlKVxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBzYW1wbGVTaXplID0gYXdhaXQgZXN0aW1hdGVEaXJlY3RvcnlTaXplKGRvY3VtZW50c0Rpcik7XHJcbiAgICBjb25zdCBlc3RpbWF0ZWRHQiA9IHNhbXBsZVNpemUgLyAoMTAyNCAqIDEwMjQgKiAxMDI0KTtcclxuICAgIFxyXG4gICAgaWYgKGVzdGltYXRlZEdCID4gMTAwKSB7XHJcbiAgICAgIHdhcm5pbmdzLnB1c2goXHJcbiAgICAgICAgYExhcmdlIGRpcmVjdG9yeSBkZXRlY3RlZCAofiR7ZXN0aW1hdGVkR0IudG9GaXhlZCgxKX0gR0IpLiBJbml0aWFsIGluZGV4aW5nIG1heSB0YWtlIHNldmVyYWwgaG91cnMuYFxyXG4gICAgICApO1xyXG4gICAgfSBlbHNlIGlmIChlc3RpbWF0ZWRHQiA+IDEwKSB7XHJcbiAgICAgIHdhcm5pbmdzLnB1c2goXHJcbiAgICAgICAgYE1lZGl1bS1zaXplZCBkaXJlY3RvcnkgZGV0ZWN0ZWQgKH4ke2VzdGltYXRlZEdCLnRvRml4ZWQoMSl9IEdCKS4gSW5pdGlhbCBpbmRleGluZyBtYXkgdGFrZSAzMC02MCBtaW51dGVzLmBcclxuICAgICAgKTtcclxuICAgIH1cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgd2FybmluZ3MucHVzaChcIkNvdWxkIG5vdCBlc3RpbWF0ZSBkaXJlY3Rvcnkgc2l6ZVwiKTtcclxuICB9XHJcblxyXG4gIC8vIENoZWNrIGlmIHZlY3RvciBzdG9yZSBhbHJlYWR5IGhhcyBkYXRhXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGZpbGVzID0gYXdhaXQgZnMucHJvbWlzZXMucmVhZGRpcih2ZWN0b3JTdG9yZURpcik7XHJcbiAgICBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICB3YXJuaW5ncy5wdXNoKFxyXG4gICAgICAgIFwiVmVjdG9yIHN0b3JlIGRpcmVjdG9yeSBpcyBub3QgZW1wdHkuIEV4aXN0aW5nIGRhdGEgd2lsbCBiZSB1c2VkIGZvciBpbmNyZW1lbnRhbCBpbmRleGluZy5cIlxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIH0gY2F0Y2gge1xyXG4gICAgLy8gRGlyZWN0b3J5IGRvZXNuJ3QgZXhpc3QgeWV0LCB0aGF0J3MgZmluZVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHBhc3NlZDogZXJyb3JzLmxlbmd0aCA9PT0gMCxcclxuICAgIHdhcm5pbmdzLFxyXG4gICAgZXJyb3JzLFxyXG4gIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBFc3RpbWF0ZSBkaXJlY3Rvcnkgc2l6ZSBieSBzYW1wbGluZ1xyXG4gKiAoUXVpY2sgZXN0aW1hdGUsIG5vdCBleGFjdClcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGVzdGltYXRlRGlyZWN0b3J5U2l6ZShkaXI6IHN0cmluZywgbWF4U2FtcGxlczogbnVtYmVyID0gMTAwKTogUHJvbWlzZTxudW1iZXI+IHtcclxuICBsZXQgdG90YWxTaXplID0gMDtcclxuICBsZXQgZmlsZUNvdW50ID0gMDtcclxuICBsZXQgc2FtcGxlZFNpemUgPSAwO1xyXG4gIGxldCBzYW1wbGVkQ291bnQgPSAwO1xyXG5cclxuICBhc3luYyBmdW5jdGlvbiB3YWxrKGN1cnJlbnREaXI6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYgKHNhbXBsZWRDb3VudCA+PSBtYXhTYW1wbGVzKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBlbnRyaWVzID0gYXdhaXQgZnMucHJvbWlzZXMucmVhZGRpcihjdXJyZW50RGlyLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSk7XHJcblxyXG4gICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgICAgICBpZiAoc2FtcGxlZENvdW50ID49IG1heFNhbXBsZXMpIHtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZnVsbFBhdGggPSBgJHtjdXJyZW50RGlyfS8ke2VudHJ5Lm5hbWV9YDtcclxuXHJcbiAgICAgICAgaWYgKGVudHJ5LmlzRGlyZWN0b3J5KCkpIHtcclxuICAgICAgICAgIGF3YWl0IHdhbGsoZnVsbFBhdGgpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoZW50cnkuaXNGaWxlKCkpIHtcclxuICAgICAgICAgIGZpbGVDb3VudCsrO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZiAoc2FtcGxlZENvdW50IDwgbWF4U2FtcGxlcykge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgIGNvbnN0IHN0YXRzID0gYXdhaXQgZnMucHJvbWlzZXMuc3RhdChmdWxsUGF0aCk7XHJcbiAgICAgICAgICAgICAgc2FtcGxlZFNpemUgKz0gc3RhdHMuc2l6ZTtcclxuICAgICAgICAgICAgICBzYW1wbGVkQ291bnQrKztcclxuICAgICAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgICAgLy8gU2tpcCBmaWxlcyB3ZSBjYW4ndCBzdGF0XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2gge1xyXG4gICAgICAvLyBTa2lwIGRpcmVjdG9yaWVzIHdlIGNhbid0IHJlYWRcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGF3YWl0IHdhbGsoZGlyKTtcclxuXHJcbiAgLy8gRXh0cmFwb2xhdGUgZnJvbSBzYW1wbGVcclxuICBpZiAoc2FtcGxlZENvdW50ID4gMCAmJiBmaWxlQ291bnQgPiAwKSB7XHJcbiAgICBjb25zdCBhdmdGaWxlU2l6ZSA9IHNhbXBsZWRTaXplIC8gc2FtcGxlZENvdW50O1xyXG4gICAgdG90YWxTaXplID0gYXZnRmlsZVNpemUgKiBmaWxlQ291bnQ7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gdG90YWxTaXplO1xyXG59XHJcblxyXG4vKipcclxuICogQ2hlY2sgc3lzdGVtIHJlc291cmNlcyBhbmQgcHJvdmlkZSByZWNvbW1lbmRhdGlvbnNcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRSZXNvdXJjZVJlY29tbWVuZGF0aW9ucyhcclxuICBlc3RpbWF0ZWRTaXplR0I6IG51bWJlcixcclxuICBmcmVlTWVtb3J5R0I6IG51bWJlcixcclxuKToge1xyXG4gIHJlY29tbWVuZGVkQ29uY3VycmVuY3k6IG51bWJlcjtcclxuICByZWNvbW1lbmRlZENodW5rU2l6ZTogbnVtYmVyO1xyXG4gIGVzdGltYXRlZFRpbWU6IHN0cmluZztcclxufSB7XHJcbiAgbGV0IHJlY29tbWVuZGVkQ29uY3VycmVuY3kgPSAzO1xyXG4gIGxldCByZWNvbW1lbmRlZENodW5rU2l6ZSA9IDUxMjtcclxuICBsZXQgZXN0aW1hdGVkVGltZSA9IFwidW5rbm93blwiO1xyXG5cclxuICAvLyBBZGp1c3QgYmFzZWQgb24gYXZhaWxhYmxlIG1lbW9yeVxyXG4gIGlmIChmcmVlTWVtb3J5R0IgPCAyKSB7XHJcbiAgICByZWNvbW1lbmRlZENvbmN1cnJlbmN5ID0gMTtcclxuICB9IGVsc2UgaWYgKGZyZWVNZW1vcnlHQiA8IDQpIHtcclxuICAgIHJlY29tbWVuZGVkQ29uY3VycmVuY3kgPSAyO1xyXG4gIH0gZWxzZSBpZiAoZnJlZU1lbW9yeUdCID49IDgpIHtcclxuICAgIHJlY29tbWVuZGVkQ29uY3VycmVuY3kgPSA1O1xyXG4gIH1cclxuXHJcbiAgLy8gQWRqdXN0IGJhc2VkIG9uIGRhdGFzZXQgc2l6ZVxyXG4gIGlmIChlc3RpbWF0ZWRTaXplR0IgPCAxKSB7XHJcbiAgICBlc3RpbWF0ZWRUaW1lID0gXCI1LTE1IG1pbnV0ZXNcIjtcclxuICB9IGVsc2UgaWYgKGVzdGltYXRlZFNpemVHQiA8IDEwKSB7XHJcbiAgICBlc3RpbWF0ZWRUaW1lID0gXCIzMC02MCBtaW51dGVzXCI7XHJcbiAgICByZWNvbW1lbmRlZENodW5rU2l6ZSA9IDc2ODtcclxuICB9IGVsc2UgaWYgKGVzdGltYXRlZFNpemVHQiA8IDEwMCkge1xyXG4gICAgZXN0aW1hdGVkVGltZSA9IFwiMi00IGhvdXJzXCI7XHJcbiAgICByZWNvbW1lbmRlZENodW5rU2l6ZSA9IDEwMjQ7XHJcbiAgfSBlbHNlIHtcclxuICAgIGVzdGltYXRlZFRpbWUgPSBcIjQtMTIgaG91cnNcIjtcclxuICAgIHJlY29tbWVuZGVkQ2h1bmtTaXplID0gMTAyNDtcclxuICAgIHJlY29tbWVuZGVkQ29uY3VycmVuY3kgPSBNYXRoLm1pbihyZWNvbW1lbmRlZENvbmN1cnJlbmN5LCAzKTtcclxuICB9XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICByZWNvbW1lbmRlZENvbmN1cnJlbmN5LFxyXG4gICAgcmVjb21tZW5kZWRDaHVua1NpemUsXHJcbiAgICBlc3RpbWF0ZWRUaW1lLFxyXG4gIH07XHJcbn1cclxuXHJcbiIsICJsZXQgaW5kZXhpbmdJblByb2dyZXNzID0gZmFsc2U7XHJcblxyXG4vKipcclxuICogQXR0ZW1wdCB0byBhY3F1aXJlIHRoZSBzaGFyZWQgaW5kZXhpbmcgbG9jay5cclxuICogUmV0dXJucyB0cnVlIGlmIG5vIG90aGVyIGluZGV4aW5nIGpvYiBpcyBydW5uaW5nLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHRyeVN0YXJ0SW5kZXhpbmcoY29udGV4dDogc3RyaW5nID0gXCJ1bmtub3duXCIpOiBib29sZWFuIHtcclxuICBpZiAoaW5kZXhpbmdJblByb2dyZXNzKSB7XHJcbiAgICBjb25zb2xlLmRlYnVnKGBbQmlnUkFHXSB0cnlTdGFydEluZGV4aW5nICgke2NvbnRleHR9KSBmYWlsZWQ6IGxvY2sgYWxyZWFkeSBoZWxkYCk7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICBpbmRleGluZ0luUHJvZ3Jlc3MgPSB0cnVlO1xyXG4gIGNvbnNvbGUuZGVidWcoYFtCaWdSQUddIHRyeVN0YXJ0SW5kZXhpbmcgKCR7Y29udGV4dH0pIHN1Y2NlZWRlZGApO1xyXG4gIHJldHVybiB0cnVlO1xyXG59XHJcblxyXG4vKipcclxuICogUmVsZWFzZSB0aGUgc2hhcmVkIGluZGV4aW5nIGxvY2suXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZmluaXNoSW5kZXhpbmcoKTogdm9pZCB7XHJcbiAgaW5kZXhpbmdJblByb2dyZXNzID0gZmFsc2U7XHJcbiAgY29uc29sZS5kZWJ1ZyhcIltCaWdSQUddIGZpbmlzaEluZGV4aW5nOiBsb2NrIHJlbGVhc2VkXCIpO1xyXG59XHJcblxyXG4vKipcclxuICogSW5kaWNhdGVzIHdoZXRoZXIgYW4gaW5kZXhpbmcgam9iIGlzIGN1cnJlbnRseSBydW5uaW5nLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGlzSW5kZXhpbmcoKTogYm9vbGVhbiB7XHJcbiAgcmV0dXJuIGluZGV4aW5nSW5Qcm9ncmVzcztcclxufVxyXG5cclxuIiwgIi8qKlxyXG4gKiBOb3JtYWxpemUgZW1iZWRkaW5nIEFQSSBvdXRwdXQgdG8gYSBmaW5pdGUgbnVtYmVyW10uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY29lcmNlRW1iZWRkaW5nVmVjdG9yKHJhdzogdW5rbm93bik6IG51bWJlcltdIHtcclxuICBpZiAoQXJyYXkuaXNBcnJheShyYXcpKSB7XHJcbiAgICByZXR1cm4gcmF3Lm1hcChhc3NlcnRGaW5pdGVOdW1iZXIpO1xyXG4gIH1cclxuXHJcbiAgaWYgKHR5cGVvZiByYXcgPT09IFwibnVtYmVyXCIpIHtcclxuICAgIHJldHVybiBbYXNzZXJ0RmluaXRlTnVtYmVyKHJhdyldO1xyXG4gIH1cclxuXHJcbiAgaWYgKHJhdyAmJiB0eXBlb2YgcmF3ID09PSBcIm9iamVjdFwiKSB7XHJcbiAgICBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KHJhdykpIHtcclxuICAgICAgcmV0dXJuIEFycmF5LmZyb20ocmF3IGFzIHVua25vd24gYXMgQXJyYXlMaWtlPG51bWJlcj4pLm1hcChhc3NlcnRGaW5pdGVOdW1iZXIpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGNhbmRpZGF0ZSA9XHJcbiAgICAgIChyYXcgYXMgYW55KS5lbWJlZGRpbmcgPz9cclxuICAgICAgKHJhdyBhcyBhbnkpLnZlY3RvciA/P1xyXG4gICAgICAocmF3IGFzIGFueSkuZGF0YSA/P1xyXG4gICAgICAodHlwZW9mIChyYXcgYXMgYW55KS50b0FycmF5ID09PSBcImZ1bmN0aW9uXCIgPyAocmF3IGFzIGFueSkudG9BcnJheSgpIDogdW5kZWZpbmVkKSA/P1xyXG4gICAgICAodHlwZW9mIChyYXcgYXMgYW55KS50b0pTT04gPT09IFwiZnVuY3Rpb25cIiA/IChyYXcgYXMgYW55KS50b0pTT04oKSA6IHVuZGVmaW5lZCk7XHJcblxyXG4gICAgaWYgKGNhbmRpZGF0ZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHJldHVybiBjb2VyY2VFbWJlZGRpbmdWZWN0b3IoY2FuZGlkYXRlKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHRocm93IG5ldyBFcnJvcihcIkVtYmVkZGluZyBwcm92aWRlciByZXR1cm5lZCBhIG5vbi1udW1lcmljIHZlY3RvclwiKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYXNzZXJ0RmluaXRlTnVtYmVyKHZhbHVlOiB1bmtub3duKTogbnVtYmVyIHtcclxuICBjb25zdCBudW0gPSB0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIgPyB2YWx1ZSA6IE51bWJlcih2YWx1ZSk7XHJcbiAgaWYgKCFOdW1iZXIuaXNGaW5pdGUobnVtKSkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiRW1iZWRkaW5nIHZlY3RvciBjb250YWlucyBhIG5vbi1maW5pdGUgdmFsdWVcIik7XHJcbiAgfVxyXG4gIHJldHVybiBudW07XHJcbn1cclxuIiwgImltcG9ydCAqIGFzIGZzIGZyb20gXCJmcy9wcm9taXNlc1wiO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCB7IHR5cGUgRW1iZWRkaW5nRHluYW1pY0hhbmRsZSB9IGZyb20gXCJAbG1zdHVkaW8vc2RrXCI7XHJcbmltcG9ydCB7IGNvZXJjZUVtYmVkZGluZ1ZlY3RvciB9IGZyb20gXCIuL2NvZXJjZUVtYmVkZGluZ1wiO1xyXG5cclxuZXhwb3J0IGNvbnN0IEVNQkVERElOR19JTkRFWF9NQU5JRkVTVF9GSUxFTkFNRSA9IFwiLmJpZy1yYWctZW1iZWRkaW5nLmpzb25cIjtcclxuXHJcbmV4cG9ydCB0eXBlIEluZGV4Rm9ybWF0ID0gXCJsZWdhY3lcIiB8IFwic3RydWN0dXJlZC12MVwiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBFbWJlZGRpbmdJbmRleE1hbmlmZXN0IHtcclxuICBlbWJlZGRpbmdNb2RlbElkOiBzdHJpbmc7XHJcbiAgZGltZW5zaW9uczogbnVtYmVyO1xyXG4gIGluZGV4Rm9ybWF0OiBJbmRleEZvcm1hdDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEVtYmVkZGluZ01hbmlmZXN0UGF0aCh2ZWN0b3JTdG9yZURpcjogc3RyaW5nKTogc3RyaW5nIHtcclxuICByZXR1cm4gcGF0aC5qb2luKHBhdGgucmVzb2x2ZSh2ZWN0b3JTdG9yZURpciksIEVNQkVERElOR19JTkRFWF9NQU5JRkVTVF9GSUxFTkFNRSk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWFkRW1iZWRkaW5nSW5kZXhNYW5pZmVzdChcclxuICB2ZWN0b3JTdG9yZURpcjogc3RyaW5nLFxyXG4pOiBQcm9taXNlPEVtYmVkZGluZ0luZGV4TWFuaWZlc3QgfCBudWxsPiB7XHJcbiAgY29uc3QgZmlsZVBhdGggPSBnZXRFbWJlZGRpbmdNYW5pZmVzdFBhdGgodmVjdG9yU3RvcmVEaXIpO1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCByYXcgPSBhd2FpdCBmcy5yZWFkRmlsZShmaWxlUGF0aCwgXCJ1dGYtOFwiKTtcclxuICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKHJhdykgYXMgUGFydGlhbDxFbWJlZGRpbmdJbmRleE1hbmlmZXN0PjtcclxuICAgIGlmIChcclxuICAgICAgdHlwZW9mIGRhdGEuZW1iZWRkaW5nTW9kZWxJZCA9PT0gXCJzdHJpbmdcIiAmJlxyXG4gICAgICBkYXRhLmVtYmVkZGluZ01vZGVsSWQubGVuZ3RoID4gMCAmJlxyXG4gICAgICB0eXBlb2YgZGF0YS5kaW1lbnNpb25zID09PSBcIm51bWJlclwiICYmXHJcbiAgICAgIE51bWJlci5pc0Zpbml0ZShkYXRhLmRpbWVuc2lvbnMpICYmXHJcbiAgICAgIGRhdGEuZGltZW5zaW9ucyA+IDBcclxuICAgICkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIGVtYmVkZGluZ01vZGVsSWQ6IGRhdGEuZW1iZWRkaW5nTW9kZWxJZCxcclxuICAgICAgICBkaW1lbnNpb25zOiBkYXRhLmRpbWVuc2lvbnMsXHJcbiAgICAgICAgaW5kZXhGb3JtYXQ6IGRhdGEuaW5kZXhGb3JtYXQgPT09IFwic3RydWN0dXJlZC12MVwiID8gXCJzdHJ1Y3R1cmVkLXYxXCIgOiBcImxlZ2FjeVwiLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG51bGw7XHJcbiAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICBpZiAoZT8uY29kZSA9PT0gXCJFTk9FTlRcIikge1xyXG4gICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICAgIGNvbnNvbGUud2FybihcIltCaWdSQUddIENvdWxkIG5vdCByZWFkIGVtYmVkZGluZyBpbmRleCBtYW5pZmVzdDpcIiwgZSk7XHJcbiAgICByZXR1cm4gbnVsbDtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZUVtYmVkZGluZ0luZGV4TWFuaWZlc3QoXHJcbiAgdmVjdG9yU3RvcmVEaXI6IHN0cmluZyxcclxuICBtYW5pZmVzdDogRW1iZWRkaW5nSW5kZXhNYW5pZmVzdCxcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc3QgZmlsZVBhdGggPSBnZXRFbWJlZGRpbmdNYW5pZmVzdFBhdGgodmVjdG9yU3RvcmVEaXIpO1xyXG4gIGF3YWl0IGZzLm1rZGlyKHBhdGguZGlybmFtZShmaWxlUGF0aCksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xyXG4gIGF3YWl0IGZzLndyaXRlRmlsZShmaWxlUGF0aCwgSlNPTi5zdHJpbmdpZnkobWFuaWZlc3QsIG51bGwsIDIpLCBcInV0Zi04XCIpO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZGVsZXRlRW1iZWRkaW5nSW5kZXhNYW5pZmVzdCh2ZWN0b3JTdG9yZURpcjogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc3QgZmlsZVBhdGggPSBnZXRFbWJlZGRpbmdNYW5pZmVzdFBhdGgodmVjdG9yU3RvcmVEaXIpO1xyXG4gIHRyeSB7XHJcbiAgICBhd2FpdCBmcy51bmxpbmsoZmlsZVBhdGgpO1xyXG4gIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgaWYgKGU/LmNvZGUgIT09IFwiRU5PRU5UXCIpIHtcclxuICAgICAgY29uc29sZS53YXJuKFwiW0JpZ1JBR10gQ291bGQgbm90IGRlbGV0ZSBlbWJlZGRpbmcgaW5kZXggbWFuaWZlc3Q6XCIsIGUpO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEFmdGVyIGluZGV4aW5nOiBwZXJzaXN0IG1hbmlmZXN0IHdoZW4gdGhlIHN0b3JlIGhhcyBjaHVua3M7IG90aGVyd2lzZSByZW1vdmUgc3RhbGUgbWFuaWZlc3QuXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3luY0VtYmVkZGluZ01hbmlmZXN0QWZ0ZXJJbmRleGluZyhcclxuICB2ZWN0b3JTdG9yZURpcjogc3RyaW5nLFxyXG4gIHRvdGFsQ2h1bmtzOiBudW1iZXIsXHJcbiAgcmVzb2x2ZWRNb2RlbElkOiBzdHJpbmcsXHJcbiAgZW1iZWRkaW5nTW9kZWw6IEVtYmVkZGluZ0R5bmFtaWNIYW5kbGUsXHJcbiAgaW5kZXhGb3JtYXQ6IEluZGV4Rm9ybWF0LFxyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICBpZiAodG90YWxDaHVua3MgPT09IDApIHtcclxuICAgIGF3YWl0IGRlbGV0ZUVtYmVkZGluZ0luZGV4TWFuaWZlc3QodmVjdG9yU3RvcmVEaXIpO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICBjb25zdCBwcm9iZSA9IGF3YWl0IGVtYmVkZGluZ01vZGVsLmVtYmVkKFwiLlwiKTtcclxuICBjb25zdCBkaW1lbnNpb25zID0gY29lcmNlRW1iZWRkaW5nVmVjdG9yKHByb2JlLmVtYmVkZGluZykubGVuZ3RoO1xyXG4gIGF3YWl0IHdyaXRlRW1iZWRkaW5nSW5kZXhNYW5pZmVzdCh2ZWN0b3JTdG9yZURpciwge1xyXG4gICAgZW1iZWRkaW5nTW9kZWxJZDogcmVzb2x2ZWRNb2RlbElkLFxyXG4gICAgZGltZW5zaW9ucyxcclxuICAgIGluZGV4Rm9ybWF0LFxyXG4gIH0pO1xyXG59XHJcblxyXG5leHBvcnQgdHlwZSBFbWJlZGRpbmdSZXRyaWV2YWxDaGVjayA9XHJcbiAgfCB7IG9rOiB0cnVlIH1cclxuICB8IHsgb2s6IGZhbHNlOyB1c2VyTWVzc2FnZTogc3RyaW5nOyBsb2dNZXNzYWdlOiBzdHJpbmcgfTtcclxuXHJcbmNvbnN0IGxlZ2FjeVdhcm5lZERpcnMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHJcbi8qKlxyXG4gKiBWYWxpZGF0ZSBjb25maWd1cmVkIGVtYmVkZGluZyBtb2RlbCBhZ2FpbnN0IG9uLWRpc2sgbWFuaWZlc3QgYmVmb3JlIHJldHJpZXZhbC5cclxuICogV2hlbiB0b3RhbENodW5rcyBpcyAwLCBjbGVhcnMgYW55IHN0YWxlIG1hbmlmZXN0LlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoZWNrRW1iZWRkaW5nTW9kZWxGb3JSZXRyaWV2YWwoYXJnczoge1xyXG4gIHZlY3RvclN0b3JlRGlyOiBzdHJpbmc7XHJcbiAgcmVzb2x2ZWRNb2RlbElkOiBzdHJpbmc7XHJcbiAgdG90YWxDaHVua3M6IG51bWJlcjtcclxuICBlbWJlZGRpbmdNb2RlbDogRW1iZWRkaW5nRHluYW1pY0hhbmRsZTtcclxufSk6IFByb21pc2U8RW1iZWRkaW5nUmV0cmlldmFsQ2hlY2s+IHtcclxuICBjb25zdCB7IHZlY3RvclN0b3JlRGlyLCByZXNvbHZlZE1vZGVsSWQsIHRvdGFsQ2h1bmtzLCBlbWJlZGRpbmdNb2RlbCB9ID0gYXJncztcclxuXHJcbiAgaWYgKHRvdGFsQ2h1bmtzID09PSAwKSB7XHJcbiAgICBhd2FpdCBkZWxldGVFbWJlZGRpbmdJbmRleE1hbmlmZXN0KHZlY3RvclN0b3JlRGlyKTtcclxuICAgIHJldHVybiB7IG9rOiB0cnVlIH07XHJcbiAgfVxyXG5cclxuICBjb25zdCBtYW5pZmVzdCA9IGF3YWl0IHJlYWRFbWJlZGRpbmdJbmRleE1hbmlmZXN0KHZlY3RvclN0b3JlRGlyKTtcclxuICBpZiAoIW1hbmlmZXN0KSB7XHJcbiAgICBjb25zdCBrZXkgPSBwYXRoLnJlc29sdmUodmVjdG9yU3RvcmVEaXIpO1xyXG4gICAgaWYgKCFsZWdhY3lXYXJuZWREaXJzLmhhcyhrZXkpKSB7XHJcbiAgICAgIGxlZ2FjeVdhcm5lZERpcnMuYWRkKGtleSk7XHJcbiAgICAgIGNvbnNvbGUud2FybihcclxuICAgICAgICBcIltCaWdSQUddIEluZGV4IGhhcyBjaHVua3MgYnV0IG5vIGAuYmlnLXJhZy1lbWJlZGRpbmcuanNvbmAgbWFuaWZlc3QgKGxpa2VseSBidWlsdCB3aXRoIGFuIG9sZGVyIHBsdWdpbikuIFwiICtcclxuICAgICAgICAgIFwiUmV0cmlldmFsIHByb2NlZWRzOyBydW4gYSBmdWxsIHJlaW5kZXggdG8gcmVjb3JkIGVtYmVkZGluZyBtZXRhZGF0YS5cIixcclxuICAgICAgKTtcclxuICAgIH1cclxuICAgIHJldHVybiB7IG9rOiB0cnVlIH07XHJcbiAgfVxyXG5cclxuICBpZiAobWFuaWZlc3QuZW1iZWRkaW5nTW9kZWxJZCAhPT0gcmVzb2x2ZWRNb2RlbElkKSB7XHJcbiAgICBjb25zdCBsb2dNZXNzYWdlID1cclxuICAgICAgYEVtYmVkZGluZyBtb2RlbCBtaXNtYXRjaDogaW5kZXggd2FzIGJ1aWx0IHdpdGggXCIke21hbmlmZXN0LmVtYmVkZGluZ01vZGVsSWR9XCIgYnV0IHNldHRpbmdzIHVzZSBcIiR7cmVzb2x2ZWRNb2RlbElkfVwiLiBSZWluZGV4IG9yIGNoYW5nZSB0aGUgc2V0dGluZy5gO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgb2s6IGZhbHNlLFxyXG4gICAgICBsb2dNZXNzYWdlLFxyXG4gICAgICB1c2VyTWVzc2FnZTpcclxuICAgICAgICBgVGhlIGRvY3VtZW50IGluZGV4IHdhcyBidWlsdCB3aXRoIGVtYmVkZGluZyBtb2RlbCBcIiR7bWFuaWZlc3QuZW1iZWRkaW5nTW9kZWxJZH1cIiwgYnV0IHRoZSBwbHVnaW4gaXMgc2V0IHRvIFwiJHtyZXNvbHZlZE1vZGVsSWR9XCIuIGAgK1xyXG4gICAgICAgIGBFaXRoZXIgc3dpdGNoIHRoZSBFbWJlZGRpbmcgTW9kZWwgc2V0dGluZyBiYWNrLCBvciByZWluZGV4IHlvdXIgZG9jdW1lbnRzIGFmdGVyIGNoYW5naW5nIHRoZSBtb2RlbC5gLFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGNvbnN0IHByb2JlID0gYXdhaXQgZW1iZWRkaW5nTW9kZWwuZW1iZWQoXCIuXCIpO1xyXG4gIGNvbnN0IGRpbSA9IGNvZXJjZUVtYmVkZGluZ1ZlY3Rvcihwcm9iZS5lbWJlZGRpbmcpLmxlbmd0aDtcclxuICBpZiAoZGltICE9PSBtYW5pZmVzdC5kaW1lbnNpb25zKSB7XHJcbiAgICBjb25zdCBsb2dNZXNzYWdlID1cclxuICAgICAgYEVtYmVkZGluZyBkaW1lbnNpb24gbWlzbWF0Y2g6IG1hbmlmZXN0IGhhcyAke21hbmlmZXN0LmRpbWVuc2lvbnN9IGJ1dCBtb2RlbCBcIiR7cmVzb2x2ZWRNb2RlbElkfVwiIHJldHVybmVkICR7ZGltfS4gUmVpbmRleCByZXF1aXJlZC5gO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgb2s6IGZhbHNlLFxyXG4gICAgICBsb2dNZXNzYWdlLFxyXG4gICAgICB1c2VyTWVzc2FnZTpcclxuICAgICAgICBgVGhlIHN0b3JlZCBpbmRleCBleHBlY3RzIGVtYmVkZGluZyB2ZWN0b3JzIG9mIGxlbmd0aCAke21hbmlmZXN0LmRpbWVuc2lvbnN9LCBidXQgdGhlIGN1cnJlbnQgbW9kZWwgcHJvZHVjZWQgbGVuZ3RoICR7ZGltfS4gYCArXHJcbiAgICAgICAgYFJlaW5kZXggeW91ciBkb2N1bWVudHMgKG9yIGZpeCB0aGUgbW9kZWwgaWRlbnRpZmllcikuYCxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICByZXR1cm4geyBvazogdHJ1ZSB9O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZGVzaXJlZEluZGV4Rm9ybWF0KHN0cnVjdHVyZWRJbmRleGluZzogYm9vbGVhbik6IEluZGV4Rm9ybWF0IHtcclxuICByZXR1cm4gc3RydWN0dXJlZEluZGV4aW5nID8gXCJzdHJ1Y3R1cmVkLXYxXCIgOiBcImxlZ2FjeVwiO1xyXG59XHJcblxyXG4vKipcclxuICogRGVjaWRlcyB0aGUgZm9ybWF0IHRvIGluZGV4IHdpdGgsIGFuZCB3aGV0aGVyIGV4aXN0aW5nIGZpbGVzIG11c3QgYmVcclxuICogcmVidWlsdCBiZWNhdXNlIHRoZSBzdG9yZSBhbHJlYWR5IGhvbGRzIGNodW5rcyBpbiB0aGUgb3RoZXIgZm9ybWF0LlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHBsYW5JbmRleEZvcm1hdChcclxuICB2ZWN0b3JTdG9yZURpcjogc3RyaW5nLFxyXG4gIHRvdGFsQ2h1bmtzOiBudW1iZXIsXHJcbiAgc3RydWN0dXJlZEluZGV4aW5nOiBib29sZWFuLFxyXG4pOiBQcm9taXNlPHsgaW5kZXhGb3JtYXQ6IEluZGV4Rm9ybWF0OyByZWJ1aWxkRXhpc3RpbmdGaWxlczogYm9vbGVhbiB9PiB7XHJcbiAgY29uc3QgaW5kZXhGb3JtYXQgPSBkZXNpcmVkSW5kZXhGb3JtYXQoc3RydWN0dXJlZEluZGV4aW5nKTtcclxuICBpZiAodG90YWxDaHVua3MgPT09IDApIHtcclxuICAgIHJldHVybiB7IGluZGV4Rm9ybWF0LCByZWJ1aWxkRXhpc3RpbmdGaWxlczogZmFsc2UgfTtcclxuICB9XHJcbiAgY29uc3QgbWFuaWZlc3QgPSBhd2FpdCByZWFkRW1iZWRkaW5nSW5kZXhNYW5pZmVzdCh2ZWN0b3JTdG9yZURpcik7XHJcbiAgcmV0dXJuIHsgaW5kZXhGb3JtYXQsIHJlYnVpbGRFeGlzdGluZ0ZpbGVzOiAobWFuaWZlc3Q/LmluZGV4Rm9ybWF0ID8/IFwibGVnYWN5XCIpICE9PSBpbmRleEZvcm1hdCB9O1xyXG59XHJcblxyXG4vKipcclxuICogU3RhdHVzIG1lc3NhZ2Ugd2hlbiB0aGUgc3RvcmVkIGluZGV4IGZvcm1hdCBkaWZmZXJzIGZyb20gdGhlIGNvbmZpZ3VyZWQgb25lLiBBIHN0b3JlIHdpdGhcclxuICogY2h1bmtzIGJ1dCBubyBtYW5pZmVzdCB3YXMgYnVpbHQgYmVmb3JlIG1hbmlmZXN0cyByZWNvcmRlZCBhIGZvcm1hdCwgc28gaXQgY291bnRzIGFzIGxlZ2FjeVxyXG4gKiAoYXMgaW4gcGxhbkluZGV4Rm9ybWF0KS4gVGhlIGNodW5rIGNvdW50IGlzIG9ubHkgcmVhZCB3aGVuIHRoZSBtYW5pZmVzdCBpcyBtaXNzaW5nLlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluZGV4Rm9ybWF0U3RhdHVzTWVzc2FnZShcclxuICB2ZWN0b3JTdG9yZURpcjogc3RyaW5nLFxyXG4gIHN0cnVjdHVyZWRJbmRleGluZzogYm9vbGVhbixcclxuICBnZXRUb3RhbENodW5rczogKCkgPT4gUHJvbWlzZTxudW1iZXI+LFxyXG4pOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcclxuICBjb25zdCBtYW5pZmVzdCA9IGF3YWl0IHJlYWRFbWJlZGRpbmdJbmRleE1hbmlmZXN0KHZlY3RvclN0b3JlRGlyKTtcclxuICBsZXQgaW5kZXhlZDogSW5kZXhGb3JtYXQ7XHJcbiAgaWYgKG1hbmlmZXN0KSB7XHJcbiAgICBpbmRleGVkID0gbWFuaWZlc3QuaW5kZXhGb3JtYXQ7XHJcbiAgfSBlbHNlIHtcclxuICAgIGlmICgoYXdhaXQgZ2V0VG90YWxDaHVua3MoKSkgPT09IDApIHJldHVybiBudWxsO1xyXG4gICAgaW5kZXhlZCA9IFwibGVnYWN5XCI7XHJcbiAgfVxyXG4gIHJldHVybiBpbmRleEZvcm1hdE1pc21hdGNoTWVzc2FnZShpbmRleGVkLCBkZXNpcmVkSW5kZXhGb3JtYXQoc3RydWN0dXJlZEluZGV4aW5nKSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBpbmRleEZvcm1hdE1pc21hdGNoTWVzc2FnZShpbmRleGVkOiBJbmRleEZvcm1hdCwgZGVzaXJlZDogSW5kZXhGb3JtYXQpOiBzdHJpbmcgfCBudWxsIHtcclxuICBpZiAoaW5kZXhlZCA9PT0gZGVzaXJlZCkgcmV0dXJuIG51bGw7XHJcbiAgcmV0dXJuIGRlc2lyZWQgPT09IFwic3RydWN0dXJlZC12MVwiXHJcbiAgICA/IFwiUmVpbmRleCByZXF1aXJlZCB0byBhcHBseSBzdHJ1Y3R1cmVkIGluZGV4aW5nLlwiXHJcbiAgICA6IFwiUmVpbmRleCByZXF1aXJlZCB0byBzd2l0Y2ggYmFjayB0byBzdGFuZGFyZCBpbmRleGluZy5cIjtcclxufVxyXG4iLCAiXHJcbi8vIFBhcnNpbmcgRXh0ZW5zaW9ucyBhbmQgQ2hlY2tlcnNcclxuY29uc3QgSFRNTF9FWFRFTlNJT05TID0gW1wiLmh0bVwiLCBcIi5odG1sXCIsIFwiLnhodG1sXCJdO1xyXG5jb25zdCBNQVJLRE9XTl9FWFRFTlNJT05TID0gW1wiLm1kXCIsIFwiLm1hcmtkb3duXCIsIFwiLm1kb3duXCIsIFwiLm1keFwiLCBcIi5ta2RcIiwgXCIubWtkblwiXTtcclxuY29uc3QgVEVYVF9FWFRFTlNJT05TID0gW1wiLnR4dFwiLCBcIi50ZXh0XCJdO1xyXG5jb25zdCBQREZfRVhURU5TSU9OUyA9IFtcIi5wZGZcIl07XHJcbmNvbnN0IEVQVUJfRVhURU5TSU9OUyA9IFtcIi5lcHViXCJdO1xyXG5jb25zdCBJTUFHRV9FWFRFTlNJT05TID0gW1wiLmJtcFwiLCBcIi5qcGdcIiwgXCIuanBlZ1wiLCBcIi5wbmdcIl07XHJcbmNvbnN0IEFSQ0hJVkVfRVhURU5TSU9OUyA9IFtcIi5yYXJcIl07XHJcbmNvbnN0IFBQVFhfRVhURU5TSU9OUyA9IFtcIi5wcHR4XCJdO1xyXG5jb25zdCBET0NYX0VYVEVOU0lPTlMgPSBbXCIuZG9jeFwiXTtcclxuXHJcbmNvbnN0IEFMTF9FWFRFTlNJT05fR1JPVVBTID0gW1xyXG4gIEhUTUxfRVhURU5TSU9OUyxcclxuICBNQVJLRE9XTl9FWFRFTlNJT05TLFxyXG4gIFRFWFRfRVhURU5TSU9OUyxcclxuICBQREZfRVhURU5TSU9OUyxcclxuICBFUFVCX0VYVEVOU0lPTlMsXHJcbiAgSU1BR0VfRVhURU5TSU9OUyxcclxuICBBUkNISVZFX0VYVEVOU0lPTlMsXHJcbiAgUFBUWF9FWFRFTlNJT05TLFxyXG4gIERPQ1hfRVhURU5TSU9OUyxcclxuXTtcclxuXHJcbmV4cG9ydCBjb25zdCBTVVBQT1JURURfRVhURU5TSU9OUyA9IG5ldyBTZXQoXHJcbiAgQUxMX0VYVEVOU0lPTl9HUk9VUFMuZmxhdE1hcCgoZ3JvdXApID0+IGdyb3VwLm1hcCgoZXh0KSA9PiBleHQudG9Mb3dlckNhc2UoKSkpLFxyXG4pO1xyXG5cclxuZXhwb3J0IGNvbnN0IEhUTUxfRVhURU5TSU9OX1NFVCA9IG5ldyBTZXQoSFRNTF9FWFRFTlNJT05TKTtcclxuZXhwb3J0IGNvbnN0IE1BUktET1dOX0VYVEVOU0lPTl9TRVQgPSBuZXcgU2V0KE1BUktET1dOX0VYVEVOU0lPTlMpO1xyXG5leHBvcnQgY29uc3QgVEVYVF9FWFRFTlNJT05fU0VUID0gbmV3IFNldChURVhUX0VYVEVOU0lPTlMpO1xyXG5leHBvcnQgY29uc3QgSU1BR0VfRVhURU5TSU9OX1NFVCA9IG5ldyBTZXQoSU1BR0VfRVhURU5TSU9OUyk7XHJcbmV4cG9ydCBjb25zdCBQUFRYX0VYVEVOU0lPTl9TRVQgPSBuZXcgU2V0KFBQVFhfRVhURU5TSU9OUyk7XHJcbmV4cG9ydCBjb25zdCBET0NYX0VYVEVOU0lPTl9TRVQgPSBuZXcgU2V0KERPQ1hfRVhURU5TSU9OUyk7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gaXNQcHR4RXh0ZW5zaW9uKGV4dDogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgcmV0dXJuIFBQVFhfRVhURU5TSU9OX1NFVC5oYXMoZXh0LnRvTG93ZXJDYXNlKCkpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gaXNEb2N4RXh0ZW5zaW9uKGV4dDogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgcmV0dXJuIERPQ1hfRVhURU5TSU9OX1NFVC5oYXMoZXh0LnRvTG93ZXJDYXNlKCkpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gaXNIdG1sRXh0ZW5zaW9uKGV4dDogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgcmV0dXJuIEhUTUxfRVhURU5TSU9OX1NFVC5oYXMoZXh0LnRvTG93ZXJDYXNlKCkpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gaXNNYXJrZG93bkV4dGVuc2lvbihleHQ6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gIHJldHVybiBNQVJLRE9XTl9FWFRFTlNJT05fU0VULmhhcyhleHQudG9Mb3dlckNhc2UoKSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBpc1BsYWluVGV4dEV4dGVuc2lvbihleHQ6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gIHJldHVybiBURVhUX0VYVEVOU0lPTl9TRVQuaGFzKGV4dC50b0xvd2VyQ2FzZSgpKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGlzVGV4dHVhbEV4dGVuc2lvbihleHQ6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gIHJldHVybiBpc01hcmtkb3duRXh0ZW5zaW9uKGV4dCkgfHwgaXNQbGFpblRleHRFeHRlbnNpb24oZXh0KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RTdXBwb3J0ZWRFeHRlbnNpb25zKCk6IHN0cmluZ1tdIHtcclxuICByZXR1cm4gQXJyYXkuZnJvbShTVVBQT1JURURfRVhURU5TSU9OUy52YWx1ZXMoKSkuc29ydCgpO1xyXG59XHJcblxyXG5cclxuIiwgImltcG9ydCAqIGFzIGZzIGZyb20gXCJmc1wiO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCAqIGFzIG1pbWUgZnJvbSBcIm1pbWUtdHlwZXNcIjtcclxuaW1wb3J0IHtcclxuICBTVVBQT1JURURfRVhURU5TSU9OUyxcclxuICBsaXN0U3VwcG9ydGVkRXh0ZW5zaW9ucyxcclxufSBmcm9tIFwiLi4vdXRpbHMvc3VwcG9ydGVkRXh0ZW5zaW9uc1wiO1xyXG5pbXBvcnQgeyBtYXRjaEV4Y2x1ZGVQYXR0ZXJuIH0gZnJvbSBcIi4uL3V0aWxzL2ZpbGVFeGNsdWRlUGF0dGVybnNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgU2Nhbm5lZEZpbGUge1xyXG4gIHBhdGg6IHN0cmluZztcclxuICBuYW1lOiBzdHJpbmc7XHJcbiAgZXh0ZW5zaW9uOiBzdHJpbmc7XHJcbiAgbWltZVR5cGU6IHN0cmluZyB8IGZhbHNlO1xyXG4gIHNpemU6IG51bWJlcjtcclxuICBtdGltZTogRGF0ZTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBFeGNsdWRlZEZpbGVJbmZvIHtcclxuICByZWxhdGl2ZVBhdGg6IHN0cmluZztcclxuICBwYXR0ZXJuOiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgU2NhbkRpcmVjdG9yeU9wdGlvbnMge1xyXG4gIGV4Y2x1ZGVQYXR0ZXJucz86IHN0cmluZ1tdO1xyXG4gIG9uRXhjbHVkZWRGaWxlPzogKGluZm86IEV4Y2x1ZGVkRmlsZUluZm8pID0+IHZvaWQ7XHJcbn1cclxuXHJcbi8qKiBOb3JtYWxpemUgYW5kIHZhbGlkYXRlIHRoZSByb290IGRpcmVjdG9yeSBmb3Igc2Nhbm5pbmcgKHJlc29sdmVzIHBhdGgsIHN0cmlwcyB0cmFpbGluZyBzbGFzaGVzKS4gKi9cclxuZnVuY3Rpb24gbm9ybWFsaXplUm9vdERpcihyb290RGlyOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIHJldHVybiBwYXRoLnJlc29sdmUocm9vdERpci50cmltKCkpLnJlcGxhY2UoL1svXFxcXF0rJC8sIFwiXCIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB0b1Bvc2l4UmVsYXRpdmVQYXRoKHJvb3Q6IHN0cmluZywgZnVsbFBhdGg6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgcmV0dXJuIHBhdGgucmVsYXRpdmUocm9vdCwgZnVsbFBhdGgpLnNwbGl0KHBhdGguc2VwKS5qb2luKFwiL1wiKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFJlY3Vyc2l2ZWx5IHNjYW4gYSBkaXJlY3RvcnkgZm9yIHN1cHBvcnRlZCBmaWxlc1xyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNjYW5EaXJlY3RvcnkoXHJcbiAgcm9vdERpcjogc3RyaW5nLFxyXG4gIG9uUHJvZ3Jlc3M/OiAoY3VycmVudDogbnVtYmVyLCB0b3RhbDogbnVtYmVyKSA9PiB2b2lkLFxyXG4gIG9wdGlvbnM/OiBTY2FuRGlyZWN0b3J5T3B0aW9ucyxcclxuKTogUHJvbWlzZTxTY2FubmVkRmlsZVtdPiB7XHJcbiAgY29uc3Qgcm9vdCA9IG5vcm1hbGl6ZVJvb3REaXIocm9vdERpcik7XHJcbiAgY29uc3QgZXhjbHVkZVBhdHRlcm5zID0gb3B0aW9ucz8uZXhjbHVkZVBhdHRlcm5zID8/IFtdO1xyXG4gIGNvbnN0IG9uRXhjbHVkZWRGaWxlID0gb3B0aW9ucz8ub25FeGNsdWRlZEZpbGU7XHJcblxyXG4gIHRyeSB7XHJcbiAgICBhd2FpdCBmcy5wcm9taXNlcy5hY2Nlc3Mocm9vdCwgZnMuY29uc3RhbnRzLlJfT0spO1xyXG4gIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICBpZiAoZXJyPy5jb2RlID09PSBcIkVOT0VOVFwiKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihcclxuICAgICAgICBgRG9jdW1lbnRzIGRpcmVjdG9yeSBkb2VzIG5vdCBleGlzdDogJHtyb290fS4gQ2hlY2sgdGhlIHBhdGggKGUuZy4gc3BlbGxpbmcgYW5kIHRoYXQgdGhlIGZvbGRlciBleGlzdHMpLmAsXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgICB0aHJvdyBlcnI7XHJcbiAgfVxyXG5cclxuICBjb25zdCBmaWxlczogU2Nhbm5lZEZpbGVbXSA9IFtdO1xyXG4gIGxldCBzY2FubmVkQ291bnQgPSAwO1xyXG5cclxuICBjb25zdCBzdXBwb3J0ZWRFeHRlbnNpb25zRGVzY3JpcHRpb24gPSBsaXN0U3VwcG9ydGVkRXh0ZW5zaW9ucygpLmpvaW4oXCIsIFwiKTtcclxuICBjb25zb2xlLmxvZyhgW1NjYW5uZXJdIFN1cHBvcnRlZCBleHRlbnNpb25zOiAke3N1cHBvcnRlZEV4dGVuc2lvbnNEZXNjcmlwdGlvbn1gKTtcclxuXHJcbiAgYXN5bmMgZnVuY3Rpb24gd2FsayhkaXI6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgZW50cmllcyA9IGF3YWl0IGZzLnByb21pc2VzLnJlYWRkaXIoZGlyLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSk7XHJcblxyXG4gICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgICAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGguam9pbihkaXIsIGVudHJ5Lm5hbWUpO1xyXG5cclxuICAgICAgICBpZiAoZW50cnkuaXNEaXJlY3RvcnkoKSkge1xyXG4gICAgICAgICAgYXdhaXQgd2FsayhmdWxsUGF0aCk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChlbnRyeS5pc0ZpbGUoKSkge1xyXG4gICAgICAgICAgc2Nhbm5lZENvdW50Kys7XHJcblxyXG4gICAgICAgICAgY29uc3QgZXh0ID0gcGF0aC5leHRuYW1lKGVudHJ5Lm5hbWUpLnRvTG93ZXJDYXNlKCk7XHJcblxyXG4gICAgICAgICAgaWYgKFNVUFBPUlRFRF9FWFRFTlNJT05TLmhhcyhleHQpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlbGF0aXZlUG9zaXggPSB0b1Bvc2l4UmVsYXRpdmVQYXRoKHJvb3QsIGZ1bGxQYXRoKTtcclxuICAgICAgICAgICAgY29uc3QgbWF0Y2hlZFBhdHRlcm4gPVxyXG4gICAgICAgICAgICAgIGV4Y2x1ZGVQYXR0ZXJucy5sZW5ndGggPiAwID8gbWF0Y2hFeGNsdWRlUGF0dGVybihyZWxhdGl2ZVBvc2l4LCBleGNsdWRlUGF0dGVybnMpIDogbnVsbDtcclxuXHJcbiAgICAgICAgICAgIGlmIChtYXRjaGVkUGF0dGVybiAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgIG9uRXhjbHVkZWRGaWxlPy4oeyByZWxhdGl2ZVBhdGg6IHJlbGF0aXZlUG9zaXgsIHBhdHRlcm46IG1hdGNoZWRQYXR0ZXJuIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIGNvbnN0IHN0YXRzID0gYXdhaXQgZnMucHJvbWlzZXMuc3RhdChmdWxsUGF0aCk7XHJcbiAgICAgICAgICAgICAgY29uc3QgbWltZVR5cGUgPSBtaW1lLmxvb2t1cChmdWxsUGF0aCk7XHJcblxyXG4gICAgICAgICAgICAgIGZpbGVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgcGF0aDogZnVsbFBhdGgsXHJcbiAgICAgICAgICAgICAgICBuYW1lOiBlbnRyeS5uYW1lLFxyXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uOiBleHQsXHJcbiAgICAgICAgICAgICAgICBtaW1lVHlwZSxcclxuICAgICAgICAgICAgICAgIHNpemU6IHN0YXRzLnNpemUsXHJcbiAgICAgICAgICAgICAgICBtdGltZTogc3RhdHMubXRpbWUsXHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBpZiAob25Qcm9ncmVzcyAmJiBzY2FubmVkQ291bnQgJSAxMDAgPT09IDApIHtcclxuICAgICAgICAgICAgb25Qcm9ncmVzcyhzY2FubmVkQ291bnQsIGZpbGVzLmxlbmd0aCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBzY2FubmluZyBkaXJlY3RvcnkgJHtkaXJ9OmAsIGVycm9yKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGF3YWl0IHdhbGsocm9vdCk7XHJcblxyXG4gIGlmIChvblByb2dyZXNzKSB7XHJcbiAgICBvblByb2dyZXNzKHNjYW5uZWRDb3VudCwgZmlsZXMubGVuZ3RoKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBmaWxlcztcclxufVxyXG5cclxuLyoqXHJcbiAqIENoZWNrIGlmIGEgZmlsZSB0eXBlIGlzIHN1cHBvcnRlZFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGlzU3VwcG9ydGVkRmlsZShmaWxlUGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgY29uc3QgZXh0ID0gcGF0aC5leHRuYW1lKGZpbGVQYXRoKS50b0xvd2VyQ2FzZSgpO1xyXG4gIHJldHVybiBTVVBQT1JURURfRVhURU5TSU9OUy5oYXMoZXh0KTtcclxufVxyXG4iLCAiaW1wb3J0ICogYXMgY2hlZXJpbyBmcm9tIFwiY2hlZXJpb1wiO1xyXG5pbXBvcnQgdHlwZSB7IEFueU5vZGUsIEVsZW1lbnQsIFRleHQgfSBmcm9tIFwiZG9taGFuZGxlclwiO1xyXG5cclxuY29uc3QgQkxPQ0tfU0VMRUNUT1IgPSBcInAsZGl2LHNlY3Rpb24sYXJ0aWNsZSxtYWluLGhlYWRlcixmb290ZXIsYXNpZGUsYmxvY2txdW90ZSxmaWd1cmUsdWwsb2wsdGFibGUsaDEsaDIsaDMsaDQsaDUsaDZcIjtcclxuLyoqIEVsZW1lbnRzIHdob3NlIHRleHQgbXVzdCBzdGF5IHdoaXRlc3BhY2Utc2VwYXJhdGVkIGZyb20gbmVpZ2hib3VyaW5nIHRleHQuICovXHJcbmNvbnN0IFNFUEFSQVRFRF9UQUdTID0gbmV3IFNldChbXHJcbiAgLi4uQkxPQ0tfU0VMRUNUT1Iuc3BsaXQoXCIsXCIpLFxyXG4gIFwiaHRtbFwiLCBcImJvZHlcIiwgXCJmb3JtXCIsIFwiZmllbGRzZXRcIiwgXCJsaVwiLCBcImRsXCIsIFwiZHRcIiwgXCJkZFwiLCBcInRyXCIsIFwidGRcIiwgXCJ0aFwiLCBcInRoZWFkXCIsIFwidGJvZHlcIiwgXCJ0Zm9vdFwiLFxyXG4gIFwiY2FwdGlvblwiLCBcInByZVwiLCBcImFkZHJlc3NcIiwgXCJkZXRhaWxzXCIsIFwic3VtbWFyeVwiLCBcImZpZ2NhcHRpb25cIiwgXCJuYXZcIiwgXCJoclwiLCBcImJyXCIsXHJcbl0pO1xyXG5cclxuZnVuY3Rpb24gY29sbGFwc2UodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcclxuICByZXR1cm4gdGV4dC5yZXBsYWNlKC9cXHMrL2csIFwiIFwiKS50cmltKCk7XHJcbn1cclxuXHJcbi8qKiBUZXh0IG9mIGEgbm9kZSB3aXRoIGxpbmUgYnJlYWtzIGFuZCBibG9jayBib3VuZGFyaWVzIGtlcHQgYXMgd2hpdGVzcGFjZSwgdGhlbiBjb2xsYXBzZWQuICovXHJcbmZ1bmN0aW9uIHNlcGFyYXRlZFRleHQobm9kZXM6IEFueU5vZGVbXSk6IHN0cmluZyB7XHJcbiAgY29uc3QgcGFydHM6IHN0cmluZ1tdID0gW107XHJcbiAgY29uc3Qgd2FsayA9IChub2RlOiBBbnlOb2RlKTogdm9pZCA9PiB7XHJcbiAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMykge1xyXG4gICAgICBwYXJ0cy5wdXNoKChub2RlIGFzIFRleHQpLmRhdGEpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBpZiAobm9kZS5ub2RlVHlwZSAhPT0gMSkgcmV0dXJuO1xyXG4gICAgY29uc3QgZWxlbWVudCA9IG5vZGUgYXMgRWxlbWVudDtcclxuICAgIGNvbnN0IHNlcGFyYXRlZCA9IFNFUEFSQVRFRF9UQUdTLmhhcyhlbGVtZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKSk7XHJcbiAgICBpZiAoc2VwYXJhdGVkKSBwYXJ0cy5wdXNoKFwiIFwiKTtcclxuICAgIGVsZW1lbnQuY2hpbGRyZW4uZm9yRWFjaCh3YWxrKTtcclxuICAgIGlmIChzZXBhcmF0ZWQpIHBhcnRzLnB1c2goXCIgXCIpO1xyXG4gIH07XHJcbiAgbm9kZXMuZm9yRWFjaCh3YWxrKTtcclxuICByZXR1cm4gY29sbGFwc2UocGFydHMuam9pbihcIlwiKSk7XHJcbn1cclxuXHJcbi8qKiBDb252ZXJ0cyBIVE1MIHRvIHRoZSBub3JtYWxpemVkIE1hcmtkb3duIGNvbnRyYWN0IChoZWFkaW5ncywgcGFyYWdyYXBocywgbGlzdHMsIHRhYmxlIHJvd3MpLiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaHRtbFRvTWFya2Rvd24oaHRtbDogc3RyaW5nKTogc3RyaW5nIHtcclxuICBjb25zdCAkID0gY2hlZXJpby5sb2FkKGh0bWwpO1xyXG4gICQoXCJzY3JpcHQsIHN0eWxlLCBub3NjcmlwdCwgbmF2XCIpLnJlbW92ZSgpO1xyXG4gIGNvbnN0IGJsb2Nrczogc3RyaW5nW10gPSBbXTtcclxuXHJcbiAgY29uc3QgcmVuZGVyTGlzdCA9IChsaXN0OiBFbGVtZW50LCBkZXB0aDogbnVtYmVyKTogc3RyaW5nW10gPT4ge1xyXG4gICAgY29uc3Qgb3JkZXJlZCA9IGxpc3QudGFnTmFtZS50b0xvd2VyQ2FzZSgpID09PSBcIm9sXCI7XHJcbiAgICBjb25zdCBsaW5lczogc3RyaW5nW10gPSBbXTtcclxuICAgICQobGlzdClcclxuICAgICAgLmNoaWxkcmVuKFwibGlcIilcclxuICAgICAgLmVhY2goKGluZGV4LCBpdGVtKSA9PiB7XHJcbiAgICAgICAgY29uc3Qgb3duID0gJChpdGVtKS5jbG9uZSgpO1xyXG4gICAgICAgIG93bi5maW5kKFwidWwsIG9sXCIpLnJlbW92ZSgpO1xyXG4gICAgICAgIGNvbnN0IHRleHQgPSBzZXBhcmF0ZWRUZXh0KG93bi5nZXQoKSk7XHJcbiAgICAgICAgaWYgKHRleHQpIGxpbmVzLnB1c2goYCR7XCIgIFwiLnJlcGVhdChkZXB0aCl9JHtvcmRlcmVkID8gYCR7aW5kZXggKyAxfS5gIDogXCItXCJ9ICR7dGV4dH1gKTtcclxuICAgICAgICAkKGl0ZW0pXHJcbiAgICAgICAgICAuY2hpbGRyZW4oXCJ1bCwgb2xcIilcclxuICAgICAgICAgIC5lYWNoKChfLCBuZXN0ZWQpID0+IHtcclxuICAgICAgICAgICAgbGluZXMucHVzaCguLi5yZW5kZXJMaXN0KG5lc3RlZCwgZGVwdGggKyAxKSk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgfSk7XHJcbiAgICByZXR1cm4gbGluZXM7XHJcbiAgfTtcclxuXHJcbiAgY29uc3QgcmVuZGVyVGFibGUgPSAodGFibGU6IEVsZW1lbnQpOiBzdHJpbmdbXSA9PiB7XHJcbiAgICBjb25zdCByb3dzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgJCh0YWJsZSlcclxuICAgICAgLmZpbmQoXCJ0clwiKVxyXG4gICAgICAuZWFjaCgoXywgcm93KSA9PiB7XHJcbiAgICAgICAgY29uc3QgY2VsbHMgPSAkKHJvdylcclxuICAgICAgICAgIC5jaGlsZHJlbihcInRkLCB0aFwiKVxyXG4gICAgICAgICAgLm1hcCgoXywgY2VsbCkgPT4gc2VwYXJhdGVkVGV4dChbY2VsbF0pKVxyXG4gICAgICAgICAgLmdldCgpO1xyXG4gICAgICAgIGlmIChjZWxscy5zb21lKChjZWxsKSA9PiBjZWxsLmxlbmd0aCA+IDApKSByb3dzLnB1c2goY2VsbHMuam9pbihcIiB8IFwiKSk7XHJcbiAgICAgIH0pO1xyXG4gICAgcmV0dXJuIHJvd3M7XHJcbiAgfTtcclxuXHJcbiAgY29uc3QgdmlzaXQgPSAobm9kZTogQW55Tm9kZSk6IHZvaWQgPT4ge1xyXG4gICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IDMpIHtcclxuICAgICAgY29uc3QgdGV4dCA9IGNvbGxhcHNlKChub2RlIGFzIFRleHQpLmRhdGEpO1xyXG4gICAgICBpZiAodGV4dCkgYmxvY2tzLnB1c2godGV4dCk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGlmIChub2RlLm5vZGVUeXBlICE9PSAxKSByZXR1cm47XHJcbiAgICBjb25zdCBlbGVtZW50ID0gbm9kZSBhcyBFbGVtZW50O1xyXG4gICAgY29uc3QgdGFnID0gZWxlbWVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XHJcblxyXG4gICAgY29uc3QgaGVhZGluZyA9IC9eaChbMS02XSkkLy5leGVjKHRhZyk7XHJcbiAgICBpZiAoaGVhZGluZykge1xyXG4gICAgICBjb25zdCB0ZXh0ID0gc2VwYXJhdGVkVGV4dChbZWxlbWVudF0pO1xyXG4gICAgICBpZiAodGV4dCkgYmxvY2tzLnB1c2goYCR7XCIjXCIucmVwZWF0KE1hdGgubWluKE51bWJlcihoZWFkaW5nWzFdKSwgMykpfSAke3RleHR9YCk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGlmICh0YWcgPT09IFwidWxcIiB8fCB0YWcgPT09IFwib2xcIikge1xyXG4gICAgICBjb25zdCBsaW5lcyA9IHJlbmRlckxpc3QoZWxlbWVudCwgMCk7XHJcbiAgICAgIGlmIChsaW5lcy5sZW5ndGggPiAwKSBibG9ja3MucHVzaChsaW5lcy5qb2luKFwiXFxuXCIpKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgaWYgKHRhZyA9PT0gXCJ0YWJsZVwiKSB7XHJcbiAgICAgIGNvbnN0IHJvd3MgPSByZW5kZXJUYWJsZShlbGVtZW50KTtcclxuICAgICAgaWYgKHJvd3MubGVuZ3RoID4gMCkgYmxvY2tzLnB1c2gocm93cy5qb2luKFwiXFxuXCIpKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgLy8gQW55IGVsZW1lbnQgaG9sZGluZyBibG9jayBlbGVtZW50cyBpcyBhIGNvbnRhaW5lciwgc28gaXRzIGJsb2NrcyBzdGF5IHNlcGFyYXRlLlxyXG4gICAgaWYgKCQoZWxlbWVudCkuZmluZChCTE9DS19TRUxFQ1RPUikubGVuZ3RoID4gMCkge1xyXG4gICAgICBlbGVtZW50LmNoaWxkcmVuLmZvckVhY2godmlzaXQpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBjb25zdCB0ZXh0ID0gc2VwYXJhdGVkVGV4dChbZWxlbWVudF0pO1xyXG4gICAgaWYgKHRleHQpIGJsb2Nrcy5wdXNoKHRleHQpO1xyXG4gIH07XHJcblxyXG4gICQoXCJib2R5XCIpXHJcbiAgICAuY29udGVudHMoKVxyXG4gICAgLmVhY2goKF8sIG5vZGUpID0+IHZpc2l0KG5vZGUpKTtcclxuXHJcbiAgcmV0dXJuIGJsb2Nrcy5qb2luKFwiXFxuXFxuXCIpO1xyXG59XHJcbiIsICJpbXBvcnQgKiBhcyBmcyBmcm9tIFwiZnNcIjtcclxuaW1wb3J0IHsgaHRtbFRvTWFya2Rvd24gfSBmcm9tIFwiLi9tYXJrZG93bi9odG1sVG9NYXJrZG93blwiO1xyXG5cclxuLyoqXHJcbiAqIFBhcnNlIEhUTUwvSFRNIGZpbGVzIGludG8gbm9ybWFsaXplZCBNYXJrZG93bi5cclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwYXJzZUhUTUwoZmlsZVBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCBmcy5wcm9taXNlcy5yZWFkRmlsZShmaWxlUGF0aCwgXCJ1dGYtOFwiKTtcclxuICAgIHJldHVybiBodG1sVG9NYXJrZG93bihjb250ZW50KTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcihgRXJyb3IgcGFyc2luZyBIVE1MIGZpbGUgJHtmaWxlUGF0aH06YCwgZXJyb3IpO1xyXG4gICAgcmV0dXJuIFwiXCI7XHJcbiAgfVxyXG59XHJcbiIsICJjb25zdCBMSVNUX0lURU0gPSAvXig/OihcXGR7MSwzfSlbLildfChbYS16QS1aXSlbLildfFstKlx1MjAyMlx1MjVBQVx1MjVFNl0pXFxzKy87XHJcbmNvbnN0IEVYSVNUSU5HX0hFQURJTkcgPSAvXiN7MSw2fVxccytcXFMvO1xyXG5jb25zdCBNQVhfSEVBRElOR19XT1JEUyA9IDEyO1xyXG5cclxuZnVuY3Rpb24gbm9ybWFsaXplTGlzdEl0ZW0obGluZTogc3RyaW5nKTogc3RyaW5nIHtcclxuICBjb25zdCBtYXRjaCA9IExJU1RfSVRFTS5leGVjKGxpbmUpITtcclxuICBjb25zdCByZXN0ID0gbGluZS5zbGljZShtYXRjaFswXS5sZW5ndGgpO1xyXG4gIGlmIChtYXRjaFsxXSkgcmV0dXJuIGAke21hdGNoWzFdfS4gJHtyZXN0fWA7XHJcbiAgaWYgKG1hdGNoWzJdKSByZXR1cm4gYCR7bWF0Y2hbMl19LiAke3Jlc3R9YDtcclxuICByZXR1cm4gYC0gJHtyZXN0fWA7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzSGVhZGluZ0NhbmRpZGF0ZShsaW5lOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICBpZiAobGluZS5zcGxpdChcIiBcIikubGVuZ3RoID4gTUFYX0hFQURJTkdfV09SRFMpIHJldHVybiBmYWxzZTtcclxuICBpZiAoL1suLDs6XSQvLnRlc3QobGluZSkpIHJldHVybiBmYWxzZTtcclxuICByZXR1cm4gL1xccHtMfS91LnRlc3QobGluZSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBZGRzIE1hcmtkb3duIHN0cnVjdHVyZSB0byB0ZXh0IHRoYXQgaGFzIG5vbmUgKFBERiwgcGxhaW4gdGV4dCwgT0NSKTpcclxuICogc2hvcnQgc3RhbmRhbG9uZSBsaW5lcyBiZWNvbWUgaGVhZGluZ3MsIGJ1bGxldC9udW1iZXJlZCBsaW5lcyBiZWNvbWUgbGlzdFxyXG4gKiBpdGVtcywgYW5kIHdyYXBwZWQgbGluZXMgYXJlIGpvaW5lZCBpbnRvIHBhcmFncmFwaHMuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaW5mZXJTdHJ1Y3R1cmUocmF3OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIGNvbnN0IGxpbmVzID0gcmF3XHJcbiAgICAucmVwbGFjZSgvXFxyXFxuPy9nLCBcIlxcblwiKVxyXG4gICAgLnNwbGl0KFwiXFxuXCIpXHJcbiAgICAubWFwKChsaW5lKSA9PiBsaW5lLnJlcGxhY2UoL1sgXFx0XFxmXFx2XSsvZywgXCIgXCIpLnRyaW0oKSk7XHJcblxyXG4gIGNvbnN0IGJsb2Nrczogc3RyaW5nW10gPSBbXTtcclxuICBsZXQgY3VycmVudDogc3RyaW5nW10gPSBbXTtcclxuICBsZXQgc2VlbkNvbnRlbnQgPSBmYWxzZTtcclxuICBjb25zdCBmbHVzaCA9ICgpID0+IHtcclxuICAgIGlmIChjdXJyZW50Lmxlbmd0aCA+IDApIHtcclxuICAgICAgYmxvY2tzLnB1c2goY3VycmVudC5qb2luKFwiIFwiKSk7XHJcbiAgICAgIGN1cnJlbnQgPSBbXTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBjb25zdCBsaW5lID0gbGluZXNbaV07XHJcbiAgICBpZiAobGluZSA9PT0gXCJcIikge1xyXG4gICAgICBmbHVzaCgpO1xyXG4gICAgICBjb250aW51ZTtcclxuICAgIH1cclxuICAgIGlmIChFWElTVElOR19IRUFESU5HLnRlc3QobGluZSkpIHtcclxuICAgICAgZmx1c2goKTtcclxuICAgICAgYmxvY2tzLnB1c2gobGluZSk7XHJcbiAgICAgIHNlZW5Db250ZW50ID0gdHJ1ZTtcclxuICAgICAgY29udGludWU7XHJcbiAgICB9XHJcbiAgICBpZiAoTElTVF9JVEVNLnRlc3QobGluZSkpIHtcclxuICAgICAgZmx1c2goKTtcclxuICAgICAgY3VycmVudCA9IFtub3JtYWxpemVMaXN0SXRlbShsaW5lKV07XHJcbiAgICAgIHNlZW5Db250ZW50ID0gdHJ1ZTtcclxuICAgICAgY29udGludWU7XHJcbiAgICB9XHJcbiAgICBpZiAoY3VycmVudC5sZW5ndGggPT09IDApIHtcclxuICAgICAgY29uc3QgbmV4dCA9IGxpbmVzW2kgKyAxXTtcclxuICAgICAgY29uc3QgZm9sbG93ZWRCeUJsYW5rID0gbmV4dCA9PT0gdW5kZWZpbmVkIHx8IG5leHQgPT09IFwiXCI7XHJcbiAgICAgIGlmIChpc0hlYWRpbmdDYW5kaWRhdGUobGluZSkgJiYgKGZvbGxvd2VkQnlCbGFuayB8fCAhc2VlbkNvbnRlbnQpKSB7XHJcbiAgICAgICAgYmxvY2tzLnB1c2goYCMjICR7bGluZX1gKTtcclxuICAgICAgICBzZWVuQ29udGVudCA9IHRydWU7XHJcbiAgICAgICAgY29udGludWU7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGN1cnJlbnQucHVzaChsaW5lKTtcclxuICAgIHNlZW5Db250ZW50ID0gdHJ1ZTtcclxuICB9XHJcbiAgZmx1c2goKTtcclxuXHJcbiAgcmV0dXJuIGJsb2Nrcy5qb2luKFwiXFxuXFxuXCIpO1xyXG59XHJcbiIsICJpbXBvcnQgeyBpbmZlclN0cnVjdHVyZSB9IGZyb20gXCIuL2luZmVyU3RydWN0dXJlXCI7XHJcblxyXG4vKipcclxuICogTWFya2Rvd24gZm9yIG9uZSBPQ1InZCBwYWdlOiBhIHBhZ2UgaGVhZGluZyBwbHVzIGluZmVycmVkIHN0cnVjdHVyZS5cclxuICogYGNvbnRlbnRMZW5ndGhgIGV4Y2x1ZGVzIHRoZSBoZWFkaW5nIHNvIG1pbmltdW0tdGV4dCBjaGVja3MgYXJlbid0XHJcbiAqIHNhdGlzZmllZCBieSBwYWdlIGhlYWRpbmdzIGFsb25lLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdE9jclBhZ2UocGFnZU51bWJlcjogbnVtYmVyLCByYXdUZXh0OiBzdHJpbmcpOiB7IG1hcmtkb3duOiBzdHJpbmc7IGNvbnRlbnRMZW5ndGg6IG51bWJlciB9IHwgbnVsbCB7XHJcbiAgY29uc3QgYm9keSA9IGluZmVyU3RydWN0dXJlKHJhd1RleHQpO1xyXG4gIGlmICghYm9keSkgcmV0dXJuIG51bGw7XHJcbiAgcmV0dXJuIHsgbWFya2Rvd246IGAjIyBQYWdlICR7cGFnZU51bWJlcn1cXG5cXG4ke2JvZHl9YCwgY29udGVudExlbmd0aDogYm9keS5sZW5ndGggfTtcclxufVxyXG4iLCAiaW1wb3J0IHsgdHlwZSBMTVN0dWRpb0NsaWVudCB9IGZyb20gXCJAbG1zdHVkaW8vc2RrXCI7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gXCJmc1wiO1xyXG5pbXBvcnQgcGRmUGFyc2UgZnJvbSBcInBkZi1wYXJzZVwiO1xyXG5pbXBvcnQgeyBjcmVhdGVXb3JrZXIgfSBmcm9tIFwidGVzc2VyYWN0LmpzXCI7XHJcbmltcG9ydCB7IGluZmVyU3RydWN0dXJlIH0gZnJvbSBcIi4vbWFya2Rvd24vaW5mZXJTdHJ1Y3R1cmVcIjtcclxuaW1wb3J0IHsgZm9ybWF0T2NyUGFnZSB9IGZyb20gXCIuL21hcmtkb3duL29jclBhZ2VzXCI7XHJcblxyXG4vLyBtdXBkZiBpcyBhbiBFU00gbW9kdWxlIHdpdGggdG9wLWxldmVsIGF3YWl0IFx1MjAxNCBpdCBjYW5ub3QgYmUgcmVxdWlyZSgpJ2QuXHJcbi8vIFdlIGxvYWQgaXQgbGF6aWx5IHZpYSBkeW5hbWljIGltcG9ydCgpIHNvIHRoZSBDSlMgaG9zdCBkb2Vzbid0IGNob2tlIG9uIGl0LlxyXG5sZXQgY2FjaGVkTXVwZGY6IHR5cGVvZiBpbXBvcnQoXCJtdXBkZlwiKSB8IG51bGwgPSBudWxsO1xyXG5hc3luYyBmdW5jdGlvbiBnZXRNdXBkZigpIHtcclxuICBpZiAoIWNhY2hlZE11cGRmKSB7XHJcbiAgICBjYWNoZWRNdXBkZiA9IGF3YWl0IGltcG9ydChcIm11cGRmXCIpO1xyXG4gIH1cclxuICByZXR1cm4gY2FjaGVkTXVwZGY7XHJcbn1cclxuXHJcbmNvbnN0IE1JTl9URVhUX0xFTkdUSCA9IDUwO1xyXG5jb25zdCBPQ1JfTUFYX1BBR0VTID0gNTA7XHJcbmNvbnN0IE9DUl9ERUZBVUxUX1NDQUxFID0gMjsgLy8gMTQ0IGRwaSwgZ29vZCBiYWxhbmNlIG9mIE9DUiBhY2N1cmFjeSB2cyBtZW1vcnlcclxuY29uc3QgT0NSX01JTl9TQ0FMRSA9IDAuNzU7IC8vIGZsb29yIGJlZm9yZSB3ZSBnaXZlIHVwIG9uIGEgcGFnZSBpbnN0ZWFkIG9mIHJpc2tpbmcgYSBuYXRpdmUgY3Jhc2hcclxuY29uc3QgT0NSX01BWF9QSVhNQVBfUElYRUxTID0gNTBfMDAwXzAwMDsgLy8gfjcwMDB4NzAwMDsgcHJldmVudHMgbGVwdG9uaWNhIHBpeGRhdGFfbWFsbG9jIGNyYXNoZXNcclxuXHJcbmV4cG9ydCB0eXBlIFBkZkZhaWx1cmVSZWFzb24gPVxyXG4gIHwgXCJwZGYubG1zdHVkaW8tZXJyb3JcIlxyXG4gIHwgXCJwZGYubG1zdHVkaW8tZW1wdHlcIlxyXG4gIHwgXCJwZGYucGRmcGFyc2UtZXJyb3JcIlxyXG4gIHwgXCJwZGYucGRmcGFyc2UtZW1wdHlcIlxyXG4gIHwgXCJwZGYub2NyLWRpc2FibGVkXCJcclxuICB8IFwicGRmLm9jci1lcnJvclwiXHJcbiAgfCBcInBkZi5vY3ItcmVuZGVyLWVycm9yXCJcclxuICB8IFwicGRmLm9jci1lbXB0eVwiO1xyXG5cclxudHlwZSBQZGZQYXJzZVN0YWdlID0gXCJsbXN0dWRpb1wiIHwgXCJwZGYtcGFyc2VcIiB8IFwib2NyXCI7XHJcblxyXG5pbnRlcmZhY2UgUGRmUGFyc2VyU3VjY2VzcyB7XHJcbiAgc3VjY2VzczogdHJ1ZTtcclxuICB0ZXh0OiBzdHJpbmc7XHJcbiAgc3RhZ2U6IFBkZlBhcnNlU3RhZ2U7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUGRmUGFyc2VyRmFpbHVyZSB7XHJcbiAgc3VjY2VzczogZmFsc2U7XHJcbiAgcmVhc29uOiBQZGZGYWlsdXJlUmVhc29uO1xyXG4gIGRldGFpbHM/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIFBkZlBhcnNlclJlc3VsdCA9IFBkZlBhcnNlclN1Y2Nlc3MgfCBQZGZQYXJzZXJGYWlsdXJlO1xyXG5cclxudHlwZSBTdGFnZVJlc3VsdCA9IFBkZlBhcnNlclN1Y2Nlc3MgfCBQZGZQYXJzZXJGYWlsdXJlO1xyXG5cclxuYXN5bmMgZnVuY3Rpb24gdHJ5TG1TdHVkaW9QYXJzZXIoZmlsZVBhdGg6IHN0cmluZywgY2xpZW50OiBMTVN0dWRpb0NsaWVudCk6IFByb21pc2U8U3RhZ2VSZXN1bHQ+IHtcclxuICBjb25zdCBtYXhSZXRyaWVzID0gMjtcclxuICBjb25zdCBmaWxlTmFtZSA9IGZpbGVQYXRoLnNwbGl0KFwiL1wiKS5wb3AoKSB8fCBmaWxlUGF0aDtcclxuXHJcbiAgZm9yIChsZXQgYXR0ZW1wdCA9IDE7IGF0dGVtcHQgPD0gbWF4UmV0cmllczsgYXR0ZW1wdCsrKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBmaWxlSGFuZGxlID0gYXdhaXQgY2xpZW50LmZpbGVzLnByZXBhcmVGaWxlKGZpbGVQYXRoKTtcclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2xpZW50LmZpbGVzLnBhcnNlRG9jdW1lbnQoZmlsZUhhbmRsZSwge1xyXG4gICAgICAgIG9uUHJvZ3Jlc3M6IChwcm9ncmVzcykgPT4ge1xyXG4gICAgICAgICAgaWYgKHByb2dyZXNzID09PSAwIHx8IHByb2dyZXNzID09PSAxKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFxyXG4gICAgICAgICAgICAgIGBbUERGIFBhcnNlcl0gKExNIFN0dWRpbykgUHJvY2Vzc2luZyAke2ZpbGVOYW1lfTogJHsocHJvZ3Jlc3MgKiAxMDApLnRvRml4ZWQoMCl9JWAsXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCBjbGVhbmVkID0gaW5mZXJTdHJ1Y3R1cmUocmVzdWx0LmNvbnRlbnQpO1xyXG4gICAgICBpZiAoY2xlYW5lZC5sZW5ndGggPj0gTUlOX1RFWFRfTEVOR1RIKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgdGV4dDogY2xlYW5lZCwgc3RhZ2U6IFwibG1zdHVkaW9cIiB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhcclxuICAgICAgICBgW1BERiBQYXJzZXJdIChMTSBTdHVkaW8pIFBhcnNlZCBidXQgZ290IHZlcnkgbGl0dGxlIHRleHQgZnJvbSAke2ZpbGVOYW1lfSAobGVuZ3RoPSR7Y2xlYW5lZC5sZW5ndGh9KSwgd2lsbCB0cnkgZmFsbGJhY2tzYCxcclxuICAgICAgKTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICByZWFzb246IFwicGRmLmxtc3R1ZGlvLWVtcHR5XCIsXHJcbiAgICAgICAgZGV0YWlsczogYGxlbmd0aD0ke2NsZWFuZWQubGVuZ3RofWAsXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zdCBpc1dlYlNvY2tldEVycm9yID1cclxuICAgICAgICBlcnJvciBpbnN0YW5jZW9mIEVycm9yICYmXHJcbiAgICAgICAgKGVycm9yLm1lc3NhZ2UuaW5jbHVkZXMoXCJXZWJTb2NrZXRcIikgfHwgZXJyb3IubWVzc2FnZS5pbmNsdWRlcyhcImNvbm5lY3Rpb24gY2xvc2VkXCIpKTtcclxuXHJcbiAgICAgIGlmIChpc1dlYlNvY2tldEVycm9yICYmIGF0dGVtcHQgPCBtYXhSZXRyaWVzKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKFxyXG4gICAgICAgICAgYFtQREYgUGFyc2VyXSAoTE0gU3R1ZGlvKSBXZWJTb2NrZXQgZXJyb3Igb24gJHtmaWxlTmFtZX0sIHJldHJ5aW5nICgke2F0dGVtcHR9LyR7bWF4UmV0cmllc30pLi4uYCxcclxuICAgICAgICApO1xyXG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMDAgKiBhdHRlbXB0KSk7XHJcbiAgICAgICAgY29udGludWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoYFtQREYgUGFyc2VyXSAoTE0gU3R1ZGlvKSBFcnJvciBwYXJzaW5nIFBERiBmaWxlICR7ZmlsZVBhdGh9OmAsIGVycm9yKTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICByZWFzb246IFwicGRmLmxtc3R1ZGlvLWVycm9yXCIsXHJcbiAgICAgICAgZGV0YWlsczogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgcmVhc29uOiBcInBkZi5sbXN0dWRpby1lcnJvclwiLFxyXG4gICAgZGV0YWlsczogXCJFeGNlZWRlZCByZXRyeSBhdHRlbXB0c1wiLFxyXG4gIH07XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHRyeVBkZlBhcnNlKGZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPFN0YWdlUmVzdWx0PiB7XHJcbiAgY29uc3QgZmlsZU5hbWUgPSBmaWxlUGF0aC5zcGxpdChcIi9cIikucG9wKCkgfHwgZmlsZVBhdGg7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGJ1ZmZlciA9IGF3YWl0IGZzLnByb21pc2VzLnJlYWRGaWxlKGZpbGVQYXRoKTtcclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHBkZlBhcnNlKGJ1ZmZlcik7XHJcbiAgICBjb25zdCBjbGVhbmVkID0gaW5mZXJTdHJ1Y3R1cmUocmVzdWx0LnRleHQgfHwgXCJcIik7XHJcblxyXG4gICAgaWYgKGNsZWFuZWQubGVuZ3RoID49IE1JTl9URVhUX0xFTkdUSCkge1xyXG4gICAgICBjb25zb2xlLmxvZyhgW1BERiBQYXJzZXJdIChwZGYtcGFyc2UpIFN1Y2Nlc3NmdWxseSBleHRyYWN0ZWQgdGV4dCBmcm9tICR7ZmlsZU5hbWV9YCk7XHJcbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIHRleHQ6IGNsZWFuZWQsIHN0YWdlOiBcInBkZi1wYXJzZVwiIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5sb2coXHJcbiAgICAgIGBbUERGIFBhcnNlcl0gKHBkZi1wYXJzZSkgVmVyeSBsaXR0bGUgb3Igbm8gdGV4dCBleHRyYWN0ZWQgZnJvbSAke2ZpbGVOYW1lfSAobGVuZ3RoPSR7Y2xlYW5lZC5sZW5ndGh9KWAsXHJcbiAgICApO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgIHJlYXNvbjogXCJwZGYucGRmcGFyc2UtZW1wdHlcIixcclxuICAgICAgZGV0YWlsczogYGxlbmd0aD0ke2NsZWFuZWQubGVuZ3RofWAsXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKGBbUERGIFBhcnNlcl0gKHBkZi1wYXJzZSkgRXJyb3IgcGFyc2luZyBQREYgZmlsZSAke2ZpbGVQYXRofTpgLCBlcnJvcik7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgcmVhc29uOiBcInBkZi5wZGZwYXJzZS1lcnJvclwiLFxyXG4gICAgICBkZXRhaWxzOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvciksXHJcbiAgICB9O1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFBpY2sgdGhlIGxhcmdlc3Qgc2NhbGUgKDw9IGRlc2lyZWRTY2FsZSwgPj0gT0NSX01JTl9TQ0FMRSwgaW4gc3RlcHMgb2YgMC4yNSkgd2hvc2VcclxuICogcmVzdWx0aW5nIHBpeG1hcCBzdGF5cyB3aXRoaW4gT0NSX01BWF9QSVhNQVBfUElYRUxTLiBSZXR1cm5zIG51bGwgaWYgZXZlbiB0aGUgbWluaW11bVxyXG4gKiBzY2FsZSB3b3VsZCBleGNlZWQgdGhlIGJ1ZGdldCAocGFnZSBpcyB0b28gbGFyZ2UgdG8gcmVuZGVyIHNhZmVseSkuXHJcbiAqL1xyXG5mdW5jdGlvbiBjb21wdXRlU2FmZU9jclNjYWxlKGJvdW5kczogbnVtYmVyW10sIGRlc2lyZWRTY2FsZTogbnVtYmVyKTogbnVtYmVyIHwgbnVsbCB7XHJcbiAgY29uc3Qgd2lkdGggPSBib3VuZHNbMl0gLSBib3VuZHNbMF07XHJcbiAgY29uc3QgaGVpZ2h0ID0gYm91bmRzWzNdIC0gYm91bmRzWzFdO1xyXG4gIGlmICghKHdpZHRoID4gMCkgfHwgIShoZWlnaHQgPiAwKSkge1xyXG4gICAgcmV0dXJuIG51bGw7XHJcbiAgfVxyXG5cclxuICBmb3IgKGxldCBzY2FsZSA9IGRlc2lyZWRTY2FsZTsgc2NhbGUgPj0gT0NSX01JTl9TQ0FMRTsgc2NhbGUgLT0gMC4yNSkge1xyXG4gICAgY29uc3QgcGl4ZWxzID0gd2lkdGggKiBzY2FsZSAqIChoZWlnaHQgKiBzY2FsZSk7XHJcbiAgICBpZiAocGl4ZWxzIDw9IE9DUl9NQVhfUElYTUFQX1BJWEVMUykge1xyXG4gICAgICByZXR1cm4gc2NhbGU7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbnVsbDtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gdHJ5T2NyV2l0aE11UGRmKGZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPFN0YWdlUmVzdWx0PiB7XHJcbiAgY29uc29sZS5sb2coXCJbUERGIFBhcnNlcl0gKE9DUikgU3RhcnRpbmcgT0NSIGZhbGxiYWNrIGZvclwiLCBmaWxlUGF0aCk7XHJcbiAgY29uc3QgZmlsZU5hbWUgPSBmaWxlUGF0aC5zcGxpdChcIi9cIikucG9wKCkgfHwgZmlsZVBhdGg7XHJcblxyXG4gIGxldCB3b3JrZXI6IEF3YWl0ZWQ8UmV0dXJuVHlwZTx0eXBlb2YgY3JlYXRlV29ya2VyPj4gfCBudWxsID0gbnVsbDtcclxuICBsZXQgZG9jSGFuZGxlOiB7IGRlc3Ryb3koKTogdm9pZCB9IHwgbnVsbCA9IG51bGw7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IG11cGRmID0gYXdhaXQgZ2V0TXVwZGYoKTtcclxuICAgIGNvbnN0IGZpbGVCdWZmZXIgPSBhd2FpdCBmcy5wcm9taXNlcy5yZWFkRmlsZShmaWxlUGF0aCk7XHJcblxyXG4gICAgY29uc3QgZG9jID0gbXVwZGYuRG9jdW1lbnQub3BlbkRvY3VtZW50KGZpbGVCdWZmZXIsIFwiYXBwbGljYXRpb24vcGRmXCIpO1xyXG4gICAgZG9jSGFuZGxlID0gZG9jO1xyXG5cclxuICAgIGNvbnN0IG51bVBhZ2VzID0gZG9jLmNvdW50UGFnZXMoKTtcclxuICAgIGNvbnN0IG1heFBhZ2VzID0gTWF0aC5taW4obnVtUGFnZXMsIE9DUl9NQVhfUEFHRVMpO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKFxyXG4gICAgICBgW1BERiBQYXJzZXJdIChPQ1IpIFN0YXJ0aW5nIE11UERGIE9DUiBmb3IgJHtmaWxlTmFtZX0gLSBwYWdlcyAxIHRvICR7bWF4UGFnZXN9YCxcclxuICAgICk7XHJcblxyXG4gICAgd29ya2VyID0gYXdhaXQgY3JlYXRlV29ya2VyKFwiZW5nXCIpO1xyXG4gICAgY29uc3QgdGV4dFBhcnRzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgbGV0IGNvbnRlbnRMZW5ndGggPSAwO1xyXG4gICAgbGV0IHJlbmRlckVycm9ycyA9IDA7XHJcbiAgICB0eXBlIE11cGRmUGFnZSA9IFJldHVyblR5cGU8dHlwZW9mIGRvYy5sb2FkUGFnZT47XHJcbiAgICB0eXBlIE11cGRmUGl4bWFwID0gUmV0dXJuVHlwZTxNdXBkZlBhZ2VbXCJ0b1BpeG1hcFwiXT47XHJcblxyXG4gICAgZm9yIChsZXQgcGFnZU51bSA9IDA7IHBhZ2VOdW0gPCBtYXhQYWdlczsgcGFnZU51bSsrKSB7XHJcbiAgICAgIGxldCBwYWdlOiBNdXBkZlBhZ2UgfCBudWxsID0gbnVsbDtcclxuICAgICAgbGV0IHBpeG1hcDogTXVwZGZQaXhtYXAgfCBudWxsID0gbnVsbDtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBwYWdlID0gZG9jLmxvYWRQYWdlKHBhZ2VOdW0pO1xyXG4gICAgICAgIGNvbnN0IGJvdW5kcyA9IHBhZ2UuZ2V0Qm91bmRzKCk7XHJcbiAgICAgICAgY29uc3Qgc2NhbGUgPSBjb21wdXRlU2FmZU9jclNjYWxlKGJvdW5kcywgT0NSX0RFRkFVTFRfU0NBTEUpO1xyXG5cclxuICAgICAgICBpZiAoc2NhbGUgPT09IG51bGwpIHtcclxuICAgICAgICAgIHJlbmRlckVycm9ycysrO1xyXG4gICAgICAgICAgY29uc29sZS53YXJuKFxyXG4gICAgICAgICAgICBgW1BERiBQYXJzZXJdIChPQ1IpIFNraXBwaW5nIG92ZXJzaXplZCBwYWdlICR7cGFnZU51bSArIDF9IG9mICR7ZmlsZU5hbWV9IGAgK1xyXG4gICAgICAgICAgICAgIGAoYm91bmRzPSR7Ym91bmRzLmpvaW4oXCIsXCIpfSkgdG8gYXZvaWQgYSBuYXRpdmUgYWxsb2NhdGlvbiBmYWlsdXJlYCxcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IG1hdHJpeCA9IG11cGRmLk1hdHJpeC5zY2FsZShzY2FsZSwgc2NhbGUpO1xyXG4gICAgICAgIHBpeG1hcCA9IHBhZ2UudG9QaXhtYXAobWF0cml4LCBtdXBkZi5Db2xvclNwYWNlLkRldmljZVJHQiwgZmFsc2UsIHRydWUpO1xyXG4gICAgICAgIGNvbnN0IHBuZ0J1ZmZlciA9IHBpeG1hcC5hc1BORygpO1xyXG5cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgY29uc3QgeyBkYXRhOiB7IHRleHQgfSB9ID0gYXdhaXQgd29ya2VyLnJlY29nbml6ZShCdWZmZXIuZnJvbShwbmdCdWZmZXIpKTtcclxuICAgICAgICAgIGNvbnN0IHBhZ2UgPSBmb3JtYXRPY3JQYWdlKHBhZ2VOdW0gKyAxLCB0ZXh0IHx8IFwiXCIpO1xyXG4gICAgICAgICAgaWYgKHBhZ2UpIHtcclxuICAgICAgICAgICAgdGV4dFBhcnRzLnB1c2gocGFnZS5tYXJrZG93bik7XHJcbiAgICAgICAgICAgIGNvbnRlbnRMZW5ndGggKz0gcGFnZS5jb250ZW50TGVuZ3RoO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKHJlY29nbml6ZUVycm9yKSB7XHJcbiAgICAgICAgICByZW5kZXJFcnJvcnMrKztcclxuICAgICAgICAgIGNvbnNvbGUud2FybihcclxuICAgICAgICAgICAgYFtQREYgUGFyc2VyXSAoT0NSKSBGYWlsZWQgdG8gcmVjb2duaXplIHBhZ2UgJHtwYWdlTnVtICsgMX0gb2YgJHtmaWxlTmFtZX0sIHJlY3JlYXRpbmcgd29ya2VyOmAsXHJcbiAgICAgICAgICAgIHJlY29nbml6ZUVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyByZWNvZ25pemVFcnJvci5tZXNzYWdlIDogcmVjb2duaXplRXJyb3IsXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgICAgLy8gVGhlIHdvcmtlciBtYXkgaGF2ZSBjcmFzaGVkOyB0cnkgdG8gcmVjcmVhdGUgaXQgZm9yIHJlbWFpbmluZyBwYWdlc1xyXG4gICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgYXdhaXQgd29ya2VyLnRlcm1pbmF0ZSgpO1xyXG4gICAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgIC8vIHdvcmtlciBhbHJlYWR5IGRlYWQsIGlnbm9yZVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgd29ya2VyID0gYXdhaXQgY3JlYXRlV29ya2VyKFwiZW5nXCIpO1xyXG4gICAgICAgICAgfSBjYXRjaCAocmVjcmVhdGVFcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFxyXG4gICAgICAgICAgICAgIGBbUERGIFBhcnNlcl0gKE9DUikgRmFpbGVkIHRvIHJlY3JlYXRlIE9DUiB3b3JrZXIsIGFib3J0aW5nIE9DUiBmb3IgJHtmaWxlTmFtZX1gLFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICB3b3JrZXIgPSBudWxsO1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgIHJlYXNvbjogXCJwZGYub2NyLWVycm9yXCIsXHJcbiAgICAgICAgICAgICAgZGV0YWlsczogYFdvcmtlciBjcmFzaGVkIGFuZCBjb3VsZCBub3QgYmUgcmVjcmVhdGVkOiAke1xyXG4gICAgICAgICAgICAgICAgcmVjcmVhdGVFcnJvciBpbnN0YW5jZW9mIEVycm9yID8gcmVjcmVhdGVFcnJvci5tZXNzYWdlIDogU3RyaW5nKHJlY3JlYXRlRXJyb3IpXHJcbiAgICAgICAgICAgICAgfWAsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocGFnZU51bSA9PT0gMCB8fCAocGFnZU51bSArIDEpICUgMTAgPT09IDAgfHwgcGFnZU51bSArIDEgPT09IG1heFBhZ2VzKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhcclxuICAgICAgICAgICAgYFtQREYgUGFyc2VyXSAoT0NSKSAke2ZpbGVOYW1lfSAtIHByb2Nlc3NlZCBwYWdlICR7cGFnZU51bSArIDF9LyR7bWF4UGFnZXN9IChjaGFycz0ke3RleHRQYXJ0cy5qb2luKFwiXFxuXFxuXCIpLmxlbmd0aH0pYCxcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGNhdGNoIChwYWdlRXJyb3IpIHtcclxuICAgICAgICByZW5kZXJFcnJvcnMrKztcclxuICAgICAgICBjb25zb2xlLmVycm9yKFxyXG4gICAgICAgICAgYFtQREYgUGFyc2VyXSAoT0NSKSBFcnJvciByZW5kZXJpbmcgcGFnZSAke3BhZ2VOdW0gKyAxfSBvZiAke2ZpbGVOYW1lfTpgLFxyXG4gICAgICAgICAgcGFnZUVycm9yLFxyXG4gICAgICAgICk7XHJcbiAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgcGl4bWFwPy5kZXN0cm95KCk7XHJcbiAgICAgICAgcGFnZT8uZGVzdHJveSgpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHdvcmtlcikge1xyXG4gICAgICBhd2FpdCB3b3JrZXIudGVybWluYXRlKCk7XHJcbiAgICAgIHdvcmtlciA9IG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHJlbmRlckVycm9ycyA+IDApIHtcclxuICAgICAgY29uc29sZS53YXJuKFxyXG4gICAgICAgIGBbUERGIFBhcnNlcl0gKE9DUikgJHtmaWxlTmFtZX0gaGFkICR7cmVuZGVyRXJyb3JzfS8ke21heFBhZ2VzfSBwYWdlIHJlbmRlciBlcnJvcnNgLFxyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGZ1bGxUZXh0ID0gdGV4dFBhcnRzLmpvaW4oXCJcXG5cXG5cIik7XHJcbiAgICBpZiAoY29udGVudExlbmd0aCA+PSBNSU5fVEVYVF9MRU5HVEgpIHtcclxuICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgdGV4dDogZnVsbFRleHQsIHN0YWdlOiBcIm9jclwiIH07XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHJlbmRlckVycm9ycyA+IDApIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICByZWFzb246IFwicGRmLm9jci1yZW5kZXItZXJyb3JcIixcclxuICAgICAgICBkZXRhaWxzOiBgJHtyZW5kZXJFcnJvcnN9LyR7bWF4UGFnZXN9IHBhZ2UgcmVuZGVyIGVycm9yc2AsXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgIHJlYXNvbjogXCJwZGYub2NyLWVtcHR5XCIsXHJcbiAgICAgIGRldGFpbHM6IFwiT0NSIHByb2R1Y2VkIGluc3VmZmljaWVudCB0ZXh0XCIsXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKGBbUERGIFBhcnNlcl0gKE9DUikgRXJyb3IgZHVyaW5nIE9DUjpgLCBlcnJvcik7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgcmVhc29uOiBcInBkZi5vY3ItZXJyb3JcIixcclxuICAgICAgZGV0YWlsczogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpLFxyXG4gICAgfTtcclxuICB9IGZpbmFsbHkge1xyXG4gICAgaWYgKHdvcmtlcikge1xyXG4gICAgICBhd2FpdCB3b3JrZXIudGVybWluYXRlKCk7XHJcbiAgICB9XHJcbiAgICBkb2NIYW5kbGU/LmRlc3Ryb3koKTtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwYXJzZVBERihcclxuICBmaWxlUGF0aDogc3RyaW5nLFxyXG4gIGNsaWVudDogTE1TdHVkaW9DbGllbnQsXHJcbiAgZW5hYmxlT0NSOiBib29sZWFuLFxyXG4pOiBQcm9taXNlPFBkZlBhcnNlclJlc3VsdD4ge1xyXG4gIGNvbnN0IGZpbGVOYW1lID0gZmlsZVBhdGguc3BsaXQoXCIvXCIpLnBvcCgpIHx8IGZpbGVQYXRoO1xyXG5cclxuICAvLyAxKSBMTSBTdHVkaW8gcGFyc2VyXHJcbiAgY29uc3QgbG1TdHVkaW9SZXN1bHQgPSBhd2FpdCB0cnlMbVN0dWRpb1BhcnNlcihmaWxlUGF0aCwgY2xpZW50KTtcclxuICBpZiAobG1TdHVkaW9SZXN1bHQuc3VjY2Vzcykge1xyXG4gICAgcmV0dXJuIGxtU3R1ZGlvUmVzdWx0O1xyXG4gIH1cclxuICBsZXQgbGFzdEZhaWx1cmU6IFBkZlBhcnNlckZhaWx1cmUgPSBsbVN0dWRpb1Jlc3VsdDtcclxuXHJcbiAgLy8gMikgTG9jYWwgcGRmLXBhcnNlIGZhbGxiYWNrXHJcbiAgY29uc3QgcGRmUGFyc2VSZXN1bHQgPSBhd2FpdCB0cnlQZGZQYXJzZShmaWxlUGF0aCk7XHJcbiAgaWYgKHBkZlBhcnNlUmVzdWx0LnN1Y2Nlc3MpIHtcclxuICAgIHJldHVybiBwZGZQYXJzZVJlc3VsdDtcclxuICB9XHJcbiAgbGFzdEZhaWx1cmUgPSBwZGZQYXJzZVJlc3VsdDtcclxuXHJcbiAgLy8gMykgT0NSIGZhbGxiYWNrIChvbmx5IGlmIGVuYWJsZWQpXHJcbiAgaWYgKCFlbmFibGVPQ1IpIHtcclxuICAgIGNvbnNvbGUubG9nKFxyXG4gICAgICBgW1BERiBQYXJzZXJdIChPQ1IpIEVuYWJsZSBPQ1IgaXMgb2ZmLCBza2lwcGluZyBPQ1IgZmFsbGJhY2sgZm9yICR7ZmlsZU5hbWV9IGFmdGVyIG90aGVyIG1ldGhvZHMgcmV0dXJuZWQgbm8gdGV4dGAsXHJcbiAgICApO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgIHJlYXNvbjogXCJwZGYub2NyLWRpc2FibGVkXCIsXHJcbiAgICAgIGRldGFpbHM6IGBQcmV2aW91cyBmYWlsdXJlIHJlYXNvbjogJHtsYXN0RmFpbHVyZS5yZWFzb259YCxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBjb25zb2xlLmxvZyhcclxuICAgIGBbUERGIFBhcnNlcl0gKE9DUikgTm8gdGV4dCBleHRyYWN0ZWQgZnJvbSAke2ZpbGVOYW1lfSB3aXRoIExNIFN0dWRpbyBvciBwZGYtcGFyc2UsIGF0dGVtcHRpbmcgT0NSLi4uYCxcclxuICApO1xyXG5cclxuICByZXR1cm4gdHJ5T2NyV2l0aE11UGRmKGZpbGVQYXRoKTtcclxufSIsICIvLyBAdHMtaWdub3JlIC0gZXB1YjIgZG9lc24ndCBoYXZlIGNvbXBsZXRlIHR5cGVzXHJcbmltcG9ydCB7IEVQdWIgfSBmcm9tIFwiZXB1YjJcIjtcclxuaW1wb3J0IHsgaHRtbFRvTWFya2Rvd24gfSBmcm9tIFwiLi9tYXJrZG93bi9odG1sVG9NYXJrZG93blwiO1xyXG5cclxuLyoqXHJcbiAqIFBhcnNlIEVQVUIgZmlsZXMgYW5kIGV4dHJhY3QgdGV4dCBjb250ZW50XHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcGFyc2VFUFVCKGZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBlcHViID0gbmV3IEVQdWIoZmlsZVBhdGgpO1xyXG4gICAgICBcclxuICAgICAgZXB1Yi5vbihcImVycm9yXCIsIChlcnJvcjogRXJyb3IpID0+IHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBwYXJzaW5nIEVQVUIgZmlsZSAke2ZpbGVQYXRofTpgLCBlcnJvcik7XHJcbiAgICAgICAgcmVzb2x2ZShcIlwiKTtcclxuICAgICAgfSk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCBzdHJpcEh0bWwgPSAoaW5wdXQ6IHN0cmluZykgPT4gaHRtbFRvTWFya2Rvd24oaW5wdXQpO1xyXG5cclxuICAgICAgY29uc3QgZ2V0TWFuaWZlc3RFbnRyeSA9IChjaGFwdGVySWQ6IHN0cmluZykgPT4ge1xyXG4gICAgICAgIHJldHVybiAoZXB1YiBhcyB1bmtub3duIGFzIHsgbWFuaWZlc3Q/OiBSZWNvcmQ8c3RyaW5nLCB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9PiB9KS5tYW5pZmVzdD8uW2NoYXB0ZXJJZF07XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCBkZWNvZGVNZWRpYVR5cGUgPSAoZW50cnk/OiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9KSA9PlxyXG4gICAgICAgIGVudHJ5Py5bXCJtZWRpYS10eXBlXCJdIHx8IGVudHJ5Py5tZWRpYVR5cGUgfHwgXCJcIjtcclxuXHJcbiAgICAgIGNvbnN0IHNob3VsZFJlYWRSYXcgPSAobWVkaWFUeXBlOiBzdHJpbmcpID0+IHtcclxuICAgICAgICBjb25zdCBub3JtYWxpemVkID0gbWVkaWFUeXBlLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgaWYgKCFub3JtYWxpemVkKSB7XHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChub3JtYWxpemVkID09PSBcImFwcGxpY2F0aW9uL3hodG1sK3htbFwiIHx8IG5vcm1hbGl6ZWQgPT09IFwiaW1hZ2Uvc3ZnK3htbFwiKSB7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAobm9ybWFsaXplZC5zdGFydHNXaXRoKFwidGV4dC9cIikpIHtcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG5vcm1hbGl6ZWQuaW5jbHVkZXMoXCJodG1sXCIpKSB7XHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgcmVhZENoYXB0ZXIgPSBhc3luYyAoY2hhcHRlcklkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4gPT4ge1xyXG4gICAgICAgIGNvbnN0IG1hbmlmZXN0RW50cnkgPSBnZXRNYW5pZmVzdEVudHJ5KGNoYXB0ZXJJZCk7XHJcbiAgICAgICAgaWYgKCFtYW5pZmVzdEVudHJ5KSB7XHJcbiAgICAgICAgICBjb25zb2xlLndhcm4oYEVQVUIgY2hhcHRlciAke2NoYXB0ZXJJZH0gbWlzc2luZyBtYW5pZmVzdCBlbnRyeSBpbiAke2ZpbGVQYXRofSwgc2tpcHBpbmdgKTtcclxuICAgICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbWVkaWFUeXBlID0gZGVjb2RlTWVkaWFUeXBlKG1hbmlmZXN0RW50cnkpO1xyXG4gICAgICAgIGlmIChzaG91bGRSZWFkUmF3KG1lZGlhVHlwZSkpIHtcclxuICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzLCByZWopID0+IHtcclxuICAgICAgICAgICAgZXB1Yi5nZXRGaWxlKFxyXG4gICAgICAgICAgICAgIGNoYXB0ZXJJZCxcclxuICAgICAgICAgICAgICAoZXJyb3I6IEVycm9yIHwgbnVsbCwgZGF0YT86IEJ1ZmZlcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlaihlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcyhcIlwiKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcyhzdHJpcEh0bWwoZGF0YS50b1N0cmluZyhcInV0Zi04XCIpKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlcywgcmVqKSA9PiB7XHJcbiAgICAgICAgICBlcHViLmdldENoYXB0ZXIoXHJcbiAgICAgICAgICAgIGNoYXB0ZXJJZCxcclxuICAgICAgICAgICAgKGVycm9yOiBFcnJvciB8IG51bGwsIHRleHQ/OiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIHJlaihlcnJvcik7XHJcbiAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdGV4dCA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICAgICAgcmVzKHN0cmlwSHRtbCh0ZXh0KSk7XHJcbiAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJlcyhcIlwiKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBlcHViLm9uKFwiZW5kXCIsIGFzeW5jICgpID0+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgY29uc3QgY2hhcHRlcnMgPSBlcHViLmZsb3c7XHJcbiAgICAgICAgICBjb25zdCB0ZXh0UGFydHM6IHN0cmluZ1tdID0gW107XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGZvciAoY29uc3QgY2hhcHRlciBvZiBjaGFwdGVycykge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgIGNvbnN0IGNoYXB0ZXJJZCA9IGNoYXB0ZXIuaWQ7XHJcbiAgICAgICAgICAgICAgaWYgKCFjaGFwdGVySWQpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgRVBVQiBjaGFwdGVyIG1pc3NpbmcgaWQgaW4gJHtmaWxlUGF0aH0sIHNraXBwaW5nYCk7XHJcbiAgICAgICAgICAgICAgICB0ZXh0UGFydHMucHVzaChcIlwiKTtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGF3YWl0IHJlYWRDaGFwdGVyKGNoYXB0ZXJJZCk7XHJcbiAgICAgICAgICAgICAgdGV4dFBhcnRzLnB1c2godGV4dCk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGNoYXB0ZXJFcnJvcikge1xyXG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIHJlYWRpbmcgY2hhcHRlciAke2NoYXB0ZXIuaWR9OmAsIGNoYXB0ZXJFcnJvcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgY29uc3QgZnVsbFRleHQgPSB0ZXh0UGFydHMuam9pbihcIlxcblxcblwiKTtcclxuICAgICAgICAgIHJlc29sdmUoZnVsbFRleHQucmVwbGFjZSgvXFxuezMsfS9nLCBcIlxcblxcblwiKS50cmltKCkpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBwcm9jZXNzaW5nIEVQVUIgY2hhcHRlcnM6YCwgZXJyb3IpO1xyXG4gICAgICAgICAgcmVzb2x2ZShcIlwiKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgICBcclxuICAgICAgZXB1Yi5wYXJzZSgpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgaW5pdGlhbGl6aW5nIEVQVUIgcGFyc2VyIGZvciAke2ZpbGVQYXRofTpgLCBlcnJvcik7XHJcbiAgICAgIHJlc29sdmUoXCJcIik7XHJcbiAgICB9XHJcbiAgfSk7XHJcbn1cclxuXHJcbiIsICJpbXBvcnQgeyBjcmVhdGVXb3JrZXIgfSBmcm9tIFwidGVzc2VyYWN0LmpzXCI7XHJcbmltcG9ydCB7IGluZmVyU3RydWN0dXJlIH0gZnJvbSBcIi4vbWFya2Rvd24vaW5mZXJTdHJ1Y3R1cmVcIjtcclxuXHJcbi8qKlxyXG4gKiBQYXJzZSBpbWFnZSBmaWxlcyB1c2luZyBPQ1IgKFRlc3NlcmFjdClcclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwYXJzZUltYWdlKGZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB3b3JrZXIgPSBhd2FpdCBjcmVhdGVXb3JrZXIoXCJlbmdcIik7XHJcblxyXG4gICAgY29uc3QgeyBkYXRhOiB7IHRleHQgfSB9ID0gYXdhaXQgd29ya2VyLnJlY29nbml6ZShmaWxlUGF0aCk7XHJcblxyXG4gICAgYXdhaXQgd29ya2VyLnRlcm1pbmF0ZSgpO1xyXG5cclxuICAgIHJldHVybiBpbmZlclN0cnVjdHVyZSh0ZXh0KTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcihgRXJyb3IgcGFyc2luZyBpbWFnZSBmaWxlICR7ZmlsZVBhdGh9OmAsIGVycm9yKTtcclxuICAgIHJldHVybiBcIlwiO1xyXG4gIH1cclxufVxyXG5cclxuIiwgIi8qKlxyXG4gKiBOb3JtYWxpemVzIGFuIGF1dGhvcmVkIE1hcmtkb3duIGZpbGUgdG8gdGhlIHNoYXJlZCBjb250cmFjdDoga2VlcHNcclxuICogaGVhZGluZ3MsIGxpc3RzLCBwYXJhZ3JhcGhzLCBhbmQgdGFibGUgcm93czsgZHJvcHMgbGlua3MnIFVSTHMsIGVtcGhhc2lzXHJcbiAqIGFuZCBpbmxpbmUtY29kZSBtYXJrZXJzLCBmZW5jZWQgY29kZSBibG9ja3MsIGJsb2NrLXF1b3RlIG1hcmtlcnMsIGFuZFxyXG4gKiBob3Jpem9udGFsIHJ1bGVzLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZU1hcmtkb3duKG1hcmtkb3duOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIGxldCBvdXRwdXQgPSBtYXJrZG93bi5yZXBsYWNlKC9cXHJcXG4/L2csIFwiXFxuXCIpO1xyXG4gIG91dHB1dCA9IG91dHB1dC5yZXBsYWNlKC9gYGBbXFxzXFxTXSo/YGBgL2csIFwiXCIpO1xyXG4gIG91dHB1dCA9IG91dHB1dC5yZXBsYWNlKC9gKFteYF0rKWAvZywgXCIkMVwiKTtcclxuICBvdXRwdXQgPSBvdXRwdXQucmVwbGFjZSgvIVxcWyhbXlxcXV0qKVxcXVxcKFteKV0qXFwpL2csIFwiJDFcIik7XHJcbiAgb3V0cHV0ID0gb3V0cHV0LnJlcGxhY2UoL1xcWyhbXlxcXV0rKVxcXVxcKFteKV0qXFwpL2csIFwiJDFcIik7XHJcbiAgb3V0cHV0ID0gb3V0cHV0LnJlcGxhY2UoL15bIFxcdF17MCwzfT5bIFxcdF0/L2dtLCBcIlwiKTtcclxuICBvdXRwdXQgPSBvdXRwdXQucmVwbGFjZSgvXlsgXFx0XXswLDN9KFstKl9dKSg/OlsgXFx0XSpcXDEpezIsfVsgXFx0XSokL2dtLCBcIlwiKTtcclxuICBvdXRwdXQgPSBvdXRwdXQucmVwbGFjZSgvXihbIFxcdF0qKVsqK10oWyBcXHRdKykvZ20sIFwiJDEtJDJcIik7XHJcbiAgb3V0cHV0ID0gb3V0cHV0LnJlcGxhY2UoLyhcXCpcXCp8X18pKC4rPylcXDEvZywgXCIkMlwiKTtcclxuICBvdXRwdXQgPSBvdXRwdXQucmVwbGFjZSgvKD88IVtcXHcqXSlcXCooPyFcXHMpKC4rPykoPzwhXFxzKVxcKig/IVtcXHcqXSkvZywgXCIkMVwiKTtcclxuICBvdXRwdXQgPSBvdXRwdXQucmVwbGFjZSgvKD88IVtcXHdfXSlfKD8hXFxzKSguKz8pKD88IVxccylfKD8hW1xcd19dKS9nLCBcIiQxXCIpO1xyXG4gIG91dHB1dCA9IG91dHB1dC5yZXBsYWNlKC9eWyBcXHRdKlxcfD9bIFxcdF0qOj8tezMsfTo/WyBcXHRdKig/OlxcfFsgXFx0XSo6Py17Myx9Oj9bIFxcdF0qKStcXHw/WyBcXHRdKiRcXG4/L2dtLCBcIlwiKTtcclxuICBvdXRwdXQgPSBvdXRwdXQucmVwbGFjZSgvXlsgXFx0XSpcXHwoLiopXFx8WyBcXHRdKiQvZ20sIChfbWF0Y2gsIGlubmVyOiBzdHJpbmcpID0+XHJcbiAgICBpbm5lclxyXG4gICAgICAuc3BsaXQoXCJ8XCIpXHJcbiAgICAgIC5tYXAoKGNlbGwpID0+IGNlbGwudHJpbSgpKVxyXG4gICAgICAuam9pbihcIiB8IFwiKSxcclxuICApO1xyXG4gIG91dHB1dCA9IG91dHB1dC5yZXBsYWNlKC88W14+XSs+L2csIFwiIFwiKTtcclxuICBvdXRwdXQgPSBvdXRwdXRcclxuICAgIC5zcGxpdChcIlxcblwiKVxyXG4gICAgLm1hcCgobGluZSkgPT4gbGluZS5yZXBsYWNlKC9bIFxcdF0rJC8sIFwiXCIpKVxyXG4gICAgLmpvaW4oXCJcXG5cIik7XHJcbiAgcmV0dXJuIG91dHB1dC5yZXBsYWNlKC9cXG57Myx9L2csIFwiXFxuXFxuXCIpLnRyaW0oKTtcclxufVxyXG5cclxuLyoqIFN0cmlwcyBoZWFkaW5nIGFuZCBidWxsZXQgbWFya2VycyBzbyBsZWdhY3kgY2h1bmtpbmcgc2VlcyBwbGFpbiB0ZXh0LiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbWFya2Rvd25Ub1BsYWluKG1hcmtkb3duOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIHJldHVybiBtYXJrZG93bi5yZXBsYWNlKC9eI3sxLDZ9WyBcXHRdKy9nbSwgXCJcIikucmVwbGFjZSgvXlsgXFx0XSotWyBcXHRdKy9nbSwgXCJcIik7XHJcbn1cclxuIiwgImltcG9ydCAqIGFzIGZzIGZyb20gXCJmc1wiO1xyXG5pbXBvcnQgeyBpbmZlclN0cnVjdHVyZSB9IGZyb20gXCIuL21hcmtkb3duL2luZmVyU3RydWN0dXJlXCI7XHJcbmltcG9ydCB7IG5vcm1hbGl6ZU1hcmtkb3duIH0gZnJvbSBcIi4vbWFya2Rvd24vbm9ybWFsaXplTWFya2Rvd25cIjtcclxuXHJcbmV4cG9ydCB0eXBlIFRleHRLaW5kID0gXCJtYXJrZG93blwiIHwgXCJwbGFpblwiO1xyXG5cclxuLyoqXHJcbiAqIFBhcnNlIE1hcmtkb3duIGFuZCBwbGFpbiB0ZXh0IGZpbGVzIGludG8gbm9ybWFsaXplZCBNYXJrZG93bi5cclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwYXJzZVRleHQoZmlsZVBhdGg6IHN0cmluZywga2luZDogVGV4dEtpbmQpOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgZnMucHJvbWlzZXMucmVhZEZpbGUoZmlsZVBhdGgsIFwidXRmLThcIik7XHJcbiAgICByZXR1cm4ga2luZCA9PT0gXCJtYXJrZG93blwiID8gbm9ybWFsaXplTWFya2Rvd24oY29udGVudCkgOiBpbmZlclN0cnVjdHVyZShjb250ZW50KTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcihgRXJyb3IgcGFyc2luZyB0ZXh0IGZpbGUgJHtmaWxlUGF0aH06YCwgZXJyb3IpO1xyXG4gICAgcmV0dXJuIFwiXCI7XHJcbiAgfVxyXG59XHJcbiIsICJpbXBvcnQgKiBhcyBmcyBmcm9tIFwiZnNcIjtcclxuaW1wb3J0IEpTWmlwIGZyb20gXCJqc3ppcFwiO1xyXG5pbXBvcnQgeyB0eXBlIExNU3R1ZGlvQ2xpZW50IH0gZnJvbSBcIkBsbXN0dWRpby9zZGtcIjtcclxuXHJcbmNvbnN0IElNQUdFX0VYVEVOU0lPTl9NSU1FOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG4gIHBuZzogXCJpbWFnZS9wbmdcIixcclxuICBqcGc6IFwiaW1hZ2UvanBlZ1wiLFxyXG4gIGpwZWc6IFwiaW1hZ2UvanBlZ1wiLFxyXG4gIGdpZjogXCJpbWFnZS9naWZcIixcclxuICBibXA6IFwiaW1hZ2UvYm1wXCIsXHJcbiAgdGlmOiBcImltYWdlL3RpZmZcIixcclxuICB0aWZmOiBcImltYWdlL3RpZmZcIixcclxuICBlbWY6IFwiaW1hZ2UveC1lbWZcIixcclxuICB3bWY6IFwiaW1hZ2UveC13bWZcIixcclxufTtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRW1iZWRkZWRJbWFnZSB7XHJcbiAgLyoqIFBhdGggaW5zaWRlIHRoZSB6aXAgYXJjaGl2ZSwgZS5nLiBcInBwdC9tZWRpYS9pbWFnZTEucG5nXCIgb3IgXCJ3b3JkL21lZGlhL2ltYWdlMS5qcGVnXCIgKi9cclxuICBhcmNoaXZlUGF0aDogc3RyaW5nO1xyXG4gIC8qKiBMb3dlcmNhc2VkIGV4dGVuc2lvbiB3aXRob3V0IHRoZSBkb3QsIGUuZy4gXCJwbmdcIiAqL1xyXG4gIGV4dGVuc2lvbjogc3RyaW5nO1xyXG4gIG1pbWVUeXBlOiBzdHJpbmc7XHJcbiAgZGF0YTogQnVmZmVyO1xyXG4gIC8qKiBCZXN0LWVmZm9ydCBodW1hbi1yZWFkYWJsZSBhbmNob3IgZm9yIHdoZXJlIHRoZSBpbWFnZSBhcHBlYXJzLCBlLmcuIFwiU2xpZGUgM1wiICovXHJcbiAgbG9jYXRpb24/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2FkWmlwKGZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPEpTWmlwPiB7XHJcbiAgY29uc3QgYnVmZmVyID0gYXdhaXQgZnMucHJvbWlzZXMucmVhZEZpbGUoZmlsZVBhdGgpO1xyXG4gIHJldHVybiBKU1ppcC5sb2FkQXN5bmMoYnVmZmVyKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFB1bGxzIGV2ZXJ5IHJhc3RlciBpbWFnZSBvdXQgb2YgYSBgd29yZC9tZWRpYS9gIG9yIGBwcHQvbWVkaWEvYCBzdHlsZSBmb2xkZXJcclxuICogaW5zaWRlIGFuIE9mZmljZSBPcGVuIFhNTCB6aXAuIE5vbi1pbWFnZSBtZWRpYSAoYXVkaW8vdmlkZW8vdmVjdG9yIGZvcm1hdHNcclxuICogd2UgZG9uJ3QgbWFwIGFib3ZlKSBpcyBza2lwcGVkIHJhdGhlciB0aGFuIGd1ZXNzZWQgYXQuXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXh0cmFjdEltYWdlc0Zyb21aaXAoXHJcbiAgemlwOiBKU1ppcCxcclxuICBtZWRpYVByZWZpeDogc3RyaW5nLFxyXG4gIGxvY2F0aW9uRm9yPzogKGFyY2hpdmVQYXRoOiBzdHJpbmcpID0+IHN0cmluZyB8IHVuZGVmaW5lZCxcclxuKTogUHJvbWlzZTxFbWJlZGRlZEltYWdlW10+IHtcclxuICBjb25zdCBtZWRpYVBhdGhzID0gT2JqZWN0LmtleXMoemlwLmZpbGVzKS5maWx0ZXIoXHJcbiAgICAocGF0aCkgPT4gcGF0aC5zdGFydHNXaXRoKG1lZGlhUHJlZml4KSAmJiAhemlwLmZpbGVzW3BhdGhdLmRpcixcclxuICApO1xyXG5cclxuICBjb25zdCBpbWFnZXM6IEVtYmVkZGVkSW1hZ2VbXSA9IFtdO1xyXG4gIGZvciAoY29uc3QgYXJjaGl2ZVBhdGggb2YgbWVkaWFQYXRocykge1xyXG4gICAgY29uc3QgZXh0ZW5zaW9uID0gYXJjaGl2ZVBhdGguc3BsaXQoXCIuXCIpLnBvcCgpPy50b0xvd2VyQ2FzZSgpID8/IFwiXCI7XHJcbiAgICBjb25zdCBtaW1lVHlwZSA9IElNQUdFX0VYVEVOU0lPTl9NSU1FW2V4dGVuc2lvbl07XHJcbiAgICBpZiAoIW1pbWVUeXBlKSB7XHJcbiAgICAgIGNvbnRpbnVlO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCB6aXAuZmlsZXNbYXJjaGl2ZVBhdGhdLmFzeW5jKFwibm9kZWJ1ZmZlclwiKTtcclxuICAgIGltYWdlcy5wdXNoKHtcclxuICAgICAgYXJjaGl2ZVBhdGgsXHJcbiAgICAgIGV4dGVuc2lvbixcclxuICAgICAgbWltZVR5cGUsXHJcbiAgICAgIGRhdGEsXHJcbiAgICAgIGxvY2F0aW9uOiBsb2NhdGlvbkZvcj8uKGFyY2hpdmVQYXRoKSxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGltYWdlcztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJbWFnZURlc2NyaXB0aW9uIHtcclxuICBhcmNoaXZlUGF0aDogc3RyaW5nO1xyXG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQbGFjZWhvbGRlciBmb3IgZnV0dXJlIFZMTS1iYXNlZCBjYXB0aW9uaW5nIG9mIGVtYmVkZGVkIERPQ1gvUFBUWCBpbWFnZXMuXHJcbiAqXHJcbiAqIE5vdCB3aXJlZCBpbnRvIHBhcnNlRE9DWC9wYXJzZVBQVFggeWV0IC0gY2FsbGVycyBjYW4gZXh0cmFjdCBpbWFnZXMgd2l0aFxyXG4gKiBgZXh0cmFjdERvY3hJbWFnZXNgL2BleHRyYWN0UHB0eEltYWdlc2AgdG9kYXksIGJ1dCB0aGVpciBjb250ZW50IGlzXHJcbiAqIGN1cnJlbnRseSBpZ25vcmVkIChubyBjYXB0aW9ucyBhcmUgbWVyZ2VkIGludG8gdGhlIHBhcnNlZCBkb2N1bWVudCB0ZXh0KS5cclxuICogV2hlbiBhIHZpc2lvbiBtb2RlbCBpcyBhdmFpbGFibGUsIHRoaXMgaXMgd2hlcmUgZWFjaCBpbWFnZSdzIGBkYXRhYC9cclxuICogYG1pbWVUeXBlYCBzaG91bGQgYmUgc2VudCB0byBpdCwgYW5kIHRoZSByZXR1cm5lZCBkZXNjcmlwdGlvbnMgbWVyZ2VkIGJhY2tcclxuICogaW50byB0aGUgc3Vycm91bmRpbmcgdGV4dCAoZS5nLiBhcyBhIFwiW0ltYWdlOiA8ZGVzY3JpcHRpb24+XVwiIGxpbmUgcGxhY2VkXHJcbiAqIHVzaW5nIGVhY2ggRW1iZWRkZWRJbWFnZSdzIGBsb2NhdGlvbmApLlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRlc2NyaWJlRW1iZWRkZWRJbWFnZXMoXHJcbiAgaW1hZ2VzOiBFbWJlZGRlZEltYWdlW10sXHJcbiAgY2xpZW50PzogTE1TdHVkaW9DbGllbnQsXHJcbik6IFByb21pc2U8SW1hZ2VEZXNjcmlwdGlvbltdPiB7XHJcbiAgaWYgKGltYWdlcy5sZW5ndGggPT09IDAgfHwgIWNsaWVudCkge1xyXG4gICAgcmV0dXJuIFtdO1xyXG4gIH1cclxuXHJcbiAgLy8gVE9ETzogaW1wbGVtZW50IG9uY2UgYSB2aXNpb24tY2FwYWJsZSBtb2RlbCBwYXRoIGlzIGF2YWlsYWJsZS5cclxuICByZXR1cm4gW107XHJcbn1cclxuIiwgImltcG9ydCAqIGFzIGZzIGZyb20gXCJmc1wiO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCBKU1ppcCBmcm9tIFwianN6aXBcIjtcclxuaW1wb3J0IHsgZXh0cmFjdEltYWdlc0Zyb21aaXAsIGxvYWRaaXAsIHR5cGUgRW1iZWRkZWRJbWFnZSB9IGZyb20gXCIuL2VtYmVkZGVkSW1hZ2VzXCI7XHJcblxyXG4vKipcclxuICogRXh0cmFjdHMgZXZlcnkgPGE6dD4gcnVuIGZyb20gYSBzbGlkZSBYTUwgc3RyaW5nLCBpbiBkb2N1bWVudCBvcmRlci5cclxuICogPGE6dD4gaXMgdGhlIERyYXdpbmdNTCBcInRleHQgcnVuXCIgZWxlbWVudCAtIGl0IGhvbGRzIHRoZSBsaXRlcmFsIHZpc2libGVcclxuICogdGV4dCBpbnNpZGUgYSB0ZXh0IGJveCwgdGFibGUgY2VsbCwgb3Igc2hhcGUuIFRoaXMgaXMgaG93IFBvd2VyUG9pbnRcclxuICogaXRzZWxmIHN0b3JlcyBhbGwgdHlwZWQgdGV4dCwgc28gdGhpcyBpcyBsb3NzbGVzcyAobm8gT0NSIG5lZWRlZCkuXHJcbiAqL1xyXG5mdW5jdGlvbiBleHRyYWN0VGV4dFJ1bnMoeG1sOiBzdHJpbmcpOiBzdHJpbmdbXSB7XHJcbiAgY29uc3QgcnVuczogc3RyaW5nW10gPSBbXTtcclxuICBjb25zdCByZWdleCA9IC88YTp0PihbXFxzXFxTXSo/KTxcXC9hOnQ+L2c7XHJcbiAgbGV0IG1hdGNoOiBSZWdFeHBFeGVjQXJyYXkgfCBudWxsO1xyXG4gIHdoaWxlICgobWF0Y2ggPSByZWdleC5leGVjKHhtbCkpICE9PSBudWxsKSB7XHJcbiAgICBjb25zdCBkZWNvZGVkID0gZGVjb2RlWG1sRW50aXRpZXMobWF0Y2hbMV0pO1xyXG4gICAgaWYgKGRlY29kZWQubGVuZ3RoID4gMCkgcnVucy5wdXNoKGRlY29kZWQpO1xyXG4gIH1cclxuICByZXR1cm4gcnVucztcclxufVxyXG5cclxuZnVuY3Rpb24gZGVjb2RlWG1sRW50aXRpZXModGV4dDogc3RyaW5nKTogc3RyaW5nIHtcclxuICByZXR1cm4gdGV4dFxyXG4gICAgLnJlcGxhY2UoLyZsdDsvZywgXCI8XCIpXHJcbiAgICAucmVwbGFjZSgvJmd0Oy9nLCBcIj5cIilcclxuICAgIC5yZXBsYWNlKC8mcXVvdDsvZywgJ1wiJylcclxuICAgIC5yZXBsYWNlKC8mYXBvczsvZywgXCInXCIpXHJcbiAgICAucmVwbGFjZSgvJmFtcDsvZywgXCImXCIpO1xyXG59XHJcblxyXG4vKipcclxuICogR3JvdXBzIGNvbnNlY3V0aXZlIDxhOnQ+IHJ1bnMgdGhhdCBiZWxvbmcgdG8gdGhlIHNhbWUgcGFyYWdyYXBoICg8YTpwPikgc29cclxuICogd29yZHMgaW4gb25lIHNlbnRlbmNlIGFyZW4ndCBzaWxlbnRseSBtYXNoZWQgaW50byB0aGUgbmV4dCBzZW50ZW5jZSB3aXRoXHJcbiAqIG5vIHNwYWNlLiBQb3dlclBvaW50IG9mdGVuIHNwbGl0cyBhIHNpbmdsZSBzZW50ZW5jZSBhY3Jvc3MgbXVsdGlwbGUgcnVuc1xyXG4gKiAoZS5nLiBmb3IgbWl4ZWQgZm9ybWF0dGluZyksIHNvIHJ1bnMgd2l0aGluIGEgcGFyYWdyYXBoIGFyZSBqb2luZWQgZGlyZWN0bHksXHJcbiAqIHdpdGggYSBuZXdsaW5lIGluc2VydGVkIGJldHdlZW4gcGFyYWdyYXBocy5cclxuICovXHJcbmZ1bmN0aW9uIGV4dHJhY3RQYXJhZ3JhcGhzKHhtbDogc3RyaW5nKTogc3RyaW5nW10ge1xyXG4gIGNvbnN0IHBhcmFncmFwaHM6IHN0cmluZ1tdID0gW107XHJcbiAgY29uc3QgcGFyYVJlZ2V4ID0gLzxhOnA+KFtcXHNcXFNdKj8pPFxcL2E6cD4vZztcclxuICBsZXQgcGFyYU1hdGNoOiBSZWdFeHBFeGVjQXJyYXkgfCBudWxsO1xyXG4gIHdoaWxlICgocGFyYU1hdGNoID0gcGFyYVJlZ2V4LmV4ZWMoeG1sKSkgIT09IG51bGwpIHtcclxuICAgIGNvbnN0IHJ1bnMgPSBleHRyYWN0VGV4dFJ1bnMocGFyYU1hdGNoWzFdKTtcclxuICAgIGNvbnN0IGpvaW5lZCA9IHJ1bnMuam9pbihcIlwiKS50cmltKCk7XHJcbiAgICBpZiAoam9pbmVkLmxlbmd0aCA+IDApIHBhcmFncmFwaHMucHVzaChqb2luZWQpO1xyXG4gIH1cclxuICByZXR1cm4gcGFyYWdyYXBocztcclxufVxyXG5cclxuLyoqXHJcbiAqIEV4dHJhY3RzIGVhY2ggcm93IG9mIGFuIDxhOnRibD4gYXMgb25lIFwiY2VsbCB8IGNlbGwgfCBjZWxsXCIgbGluZSwgc28gdGFibGVcclxuICogcm93L2NvbHVtbiBzdHJ1Y3R1cmUgc3Vydml2ZXMgaW5zdGVhZCBvZiBjZWxscyBmbGF0dGVuaW5nIGludG8gYSBydW4gb2ZcclxuICogaW5kaXN0aW5ndWlzaGFibGUgcGFyYWdyYXBocy5cclxuICovXHJcbmZ1bmN0aW9uIGV4dHJhY3RUYWJsZVJvd3ModGFibGVYbWw6IHN0cmluZyk6IHN0cmluZ1tdIHtcclxuICBjb25zdCByb3dzOiBzdHJpbmdbXSA9IFtdO1xyXG4gIGNvbnN0IHJvd1JlZ2V4ID0gLzxhOnRyXFxiW14+XSo+KFtcXHNcXFNdKj8pPFxcL2E6dHI+L2c7XHJcbiAgbGV0IHJvd01hdGNoOiBSZWdFeHBFeGVjQXJyYXkgfCBudWxsO1xyXG4gIHdoaWxlICgocm93TWF0Y2ggPSByb3dSZWdleC5leGVjKHRhYmxlWG1sKSkgIT09IG51bGwpIHtcclxuICAgIGNvbnN0IGNlbGxzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgY29uc3QgY2VsbFJlZ2V4ID0gLzxhOnRjXFxiW14+XSo+KFtcXHNcXFNdKj8pPFxcL2E6dGM+L2c7XHJcbiAgICBsZXQgY2VsbE1hdGNoOiBSZWdFeHBFeGVjQXJyYXkgfCBudWxsO1xyXG4gICAgd2hpbGUgKChjZWxsTWF0Y2ggPSBjZWxsUmVnZXguZXhlYyhyb3dNYXRjaFsxXSkpICE9PSBudWxsKSB7XHJcbiAgICAgIGNlbGxzLnB1c2goZXh0cmFjdFBhcmFncmFwaHMoY2VsbE1hdGNoWzFdKS5qb2luKFwiIFwiKS50cmltKCkpO1xyXG4gICAgfVxyXG4gICAgaWYgKGNlbGxzLnNvbWUoKGNlbGwpID0+IGNlbGwubGVuZ3RoID4gMCkpIHtcclxuICAgICAgcm93cy5wdXNoKGNlbGxzLmpvaW4oXCIgfCBcIikpO1xyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gcm93cztcclxufVxyXG5cclxuaW50ZXJmYWNlIFNsaWRlQmxvY2sge1xyXG4gIGtpbmQ6IFwicGFyYWdyYXBoXCIgfCBcInRhYmxlUm93XCI7XHJcbiAgdGV4dDogc3RyaW5nO1xyXG59XHJcblxyXG4vKipcclxuICogRXh0cmFjdHMgdGV4dCBibG9ja3MgZnJvbSBhIHNsaWRlL25vdGVzIFhNTCBzdHJpbmcgaW4gZG9jdW1lbnQgb3JkZXIuXHJcbiAqIDxhOnRibD4gdGFibGVzIGFyZSBoYW5kbGVkIHNlcGFyYXRlbHkgZnJvbSBgZXh0cmFjdFBhcmFncmFwaHNgIHNvIGVhY2ggcm93XHJcbiAqIGJlY29tZXMgaXRzIG93biBibG9jayAtIG90aGVyd2lzZSB0YWJsZSBjZWxsIHBhcmFncmFwaHMgd291bGQgYWxzbyBiZVxyXG4gKiBwaWNrZWQgdXAgYnkgdGhlIGdlbmVyaWMgPGE6cD4gc2NhbiBhbmQgbG9zZSB0aGVpciByb3cgZ3JvdXBpbmcuXHJcbiAqL1xyXG5mdW5jdGlvbiBleHRyYWN0Q29udGVudEJsb2Nrcyh4bWw6IHN0cmluZyk6IFNsaWRlQmxvY2tbXSB7XHJcbiAgY29uc3QgYmxvY2tzOiBTbGlkZUJsb2NrW10gPSBbXTtcclxuICBjb25zdCBwYXJhZ3JhcGhzID0gKGZyYWdtZW50OiBzdHJpbmcpID0+XHJcbiAgICBleHRyYWN0UGFyYWdyYXBocyhmcmFnbWVudCkubWFwKCh0ZXh0KTogU2xpZGVCbG9jayA9PiAoeyBraW5kOiBcInBhcmFncmFwaFwiLCB0ZXh0IH0pKTtcclxuICBjb25zdCB0YWJsZVJlZ2V4ID0gLzxhOnRibD4oW1xcc1xcU10qPyk8XFwvYTp0Ymw+L2c7XHJcbiAgbGV0IGxhc3RJbmRleCA9IDA7XHJcbiAgbGV0IG1hdGNoOiBSZWdFeHBFeGVjQXJyYXkgfCBudWxsO1xyXG4gIHdoaWxlICgobWF0Y2ggPSB0YWJsZVJlZ2V4LmV4ZWMoeG1sKSkgIT09IG51bGwpIHtcclxuICAgIGJsb2Nrcy5wdXNoKC4uLnBhcmFncmFwaHMoeG1sLnNsaWNlKGxhc3RJbmRleCwgbWF0Y2guaW5kZXgpKSk7XHJcbiAgICBibG9ja3MucHVzaCguLi5leHRyYWN0VGFibGVSb3dzKG1hdGNoWzFdKS5tYXAoKHRleHQpOiBTbGlkZUJsb2NrID0+ICh7IGtpbmQ6IFwidGFibGVSb3dcIiwgdGV4dCB9KSkpO1xyXG4gICAgbGFzdEluZGV4ID0gdGFibGVSZWdleC5sYXN0SW5kZXg7XHJcbiAgfVxyXG4gIGJsb2Nrcy5wdXNoKC4uLnBhcmFncmFwaHMoeG1sLnNsaWNlKGxhc3RJbmRleCkpKTtcclxuICByZXR1cm4gYmxvY2tzO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgUmVsYXRpb25zaGlwRW50cnkge1xyXG4gIGlkOiBzdHJpbmc7XHJcbiAgdHlwZTogc3RyaW5nO1xyXG4gIHRhcmdldDogc3RyaW5nO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwYXJzZVJlbGF0aW9uc2hpcHMoeG1sOiBzdHJpbmcpOiBSZWxhdGlvbnNoaXBFbnRyeVtdIHtcclxuICBjb25zdCBlbnRyaWVzOiBSZWxhdGlvbnNoaXBFbnRyeVtdID0gW107XHJcbiAgY29uc3QgcmVsUmVnZXggPSAvPFJlbGF0aW9uc2hpcFxcYltePl0qXFwvPi9nO1xyXG4gIGxldCBtYXRjaDogUmVnRXhwRXhlY0FycmF5IHwgbnVsbDtcclxuICB3aGlsZSAoKG1hdGNoID0gcmVsUmVnZXguZXhlYyh4bWwpKSAhPT0gbnVsbCkge1xyXG4gICAgY29uc3QgdGFnID0gbWF0Y2hbMF07XHJcbiAgICBjb25zdCBpZCA9IHRhZy5tYXRjaCgvXFxiSWQ9XCIoW15cIl0rKVwiLyk/LlsxXTtcclxuICAgIGNvbnN0IHR5cGUgPSB0YWcubWF0Y2goL1xcYlR5cGU9XCIoW15cIl0rKVwiLyk/LlsxXTtcclxuICAgIGNvbnN0IHRhcmdldCA9IHRhZy5tYXRjaCgvXFxiVGFyZ2V0PVwiKFteXCJdKylcIi8pPy5bMV07XHJcbiAgICBpZiAoaWQgJiYgdHlwZSAmJiB0YXJnZXQpIHtcclxuICAgICAgZW50cmllcy5wdXNoKHsgaWQsIHR5cGUsIHRhcmdldCB9KTtcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIGVudHJpZXM7XHJcbn1cclxuXHJcbi8qKiBSZXNvbHZlcyBhIHJlbGF0aW9uc2hpcCBUYXJnZXQgYWdhaW5zdCB0aGUgZGlyZWN0b3J5IHRoYXQgb3ducyB0aGUgLnJlbHMgZmlsZSByZWZlcmVuY2luZyBpdC4gKi9cclxuZnVuY3Rpb24gcmVzb2x2ZVJlbGF0aXZlVGFyZ2V0KGJhc2VEaXI6IHN0cmluZywgdGFyZ2V0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIGlmICh0YXJnZXQuc3RhcnRzV2l0aChcIi9cIikpIHtcclxuICAgIHJldHVybiB0YXJnZXQuc2xpY2UoMSk7XHJcbiAgfVxyXG4gIHJldHVybiBwYXRoLnBvc2l4Lm5vcm1hbGl6ZShgJHtiYXNlRGlyfS8ke3RhcmdldH1gKTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2xpZGVSZWxzUGF0aChzbGlkZVBhdGg6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgcmV0dXJuIGAke3BhdGgucG9zaXguZGlybmFtZShzbGlkZVBhdGgpfS9fcmVscy8ke3BhdGgucG9zaXguYmFzZW5hbWUoc2xpZGVQYXRoKX0ucmVsc2A7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNsaWRlTnVtYmVyRnJvbUZpbGVuYW1lKHNsaWRlUGF0aDogc3RyaW5nKTogbnVtYmVyIHtcclxuICByZXR1cm4gcGFyc2VJbnQoc2xpZGVQYXRoLm1hdGNoKC9zbGlkZShcXGQrKVxcLnhtbCQvKT8uWzFdID8/IFwiMFwiLCAxMCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZXR1cm5zIHNsaWRlIHBhcnQgcGF0aHMgKGUuZy4gXCJwcHQvc2xpZGVzL3NsaWRlMy54bWxcIikgaW4gYWN0dWFsXHJcbiAqIHByZXNlbnRhdGlvbiBkaXNwbGF5IG9yZGVyLCByZXNvbHZlZCBmcm9tIHBwdC9wcmVzZW50YXRpb24ueG1sJ3NcclxuICogPHA6c2xkSWRMc3Q+IHZpYSBwcHQvX3JlbHMvcHJlc2VudGF0aW9uLnhtbC5yZWxzLlxyXG4gKlxyXG4gKiBUaGUgbnVtZXJpYyBzdWZmaXggb24gYSBzbGlkZSdzIGZpbGVuYW1lIHJlZmxlY3RzIGNyZWF0aW9uIG9yZGVyLCBub3RcclxuICogZGlzcGxheSBvcmRlciAtIFBvd2VyUG9pbnQgZG9lcyBub3QgcmVuYW1lIHNsaWRlIHBhcnRzIHdoZW4gc2xpZGVzIGFyZVxyXG4gKiByZW9yZGVyZWQsIGFkZGVkLCBvciBkZWxldGVkIC0gc28gc29ydGluZyBieSBmaWxlbmFtZSBzaWxlbnRseSBtaXNvcmRlcnNcclxuICogYW55IGRlY2sgdGhhdCBoYXMgYmVlbiByZW9yZGVyZWQgYWZ0ZXIgaXRzIHNsaWRlcyB3ZXJlIGZpcnN0IGNyZWF0ZWQuXHJcbiAqIEZhbGxzIGJhY2sgdG8gZmlsZW5hbWUgc29ydGluZyBvbmx5IGlmIHByZXNlbnRhdGlvbi54bWwvcmVscyBjYW4ndCBiZVxyXG4gKiByZWFkIChlLmcuIGEgaGFuZC1idWlsdCBvciB1bnVzdWFsIHBhY2thZ2UpLlxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gZ2V0T3JkZXJlZFNsaWRlUGF0aHMoemlwOiBKU1ppcCk6IFByb21pc2U8c3RyaW5nW10+IHtcclxuICBjb25zdCBwcmVzZW50YXRpb25GaWxlID0gemlwLmZpbGVzW1wicHB0L3ByZXNlbnRhdGlvbi54bWxcIl07XHJcbiAgY29uc3QgcmVsc0ZpbGUgPSB6aXAuZmlsZXNbXCJwcHQvX3JlbHMvcHJlc2VudGF0aW9uLnhtbC5yZWxzXCJdO1xyXG5cclxuICBpZiAocHJlc2VudGF0aW9uRmlsZSAmJiByZWxzRmlsZSkge1xyXG4gICAgY29uc3QgW3ByZXNlbnRhdGlvblhtbCwgcmVsc1htbF0gPSBhd2FpdCBQcm9taXNlLmFsbChbXHJcbiAgICAgIHByZXNlbnRhdGlvbkZpbGUuYXN5bmMoXCJ0ZXh0XCIpLFxyXG4gICAgICByZWxzRmlsZS5hc3luYyhcInRleHRcIiksXHJcbiAgICBdKTtcclxuXHJcbiAgICBjb25zdCByZWxUYXJnZXRCeUlkID0gbmV3IE1hcChwYXJzZVJlbGF0aW9uc2hpcHMocmVsc1htbCkubWFwKChyKSA9PiBbci5pZCwgci50YXJnZXRdKSk7XHJcbiAgICBjb25zdCBzbGRJZExpc3RNYXRjaCA9IHByZXNlbnRhdGlvblhtbC5tYXRjaCgvPHA6c2xkSWRMc3Q+KFtcXHNcXFNdKj8pPFxcL3A6c2xkSWRMc3Q+Lyk7XHJcblxyXG4gICAgaWYgKHNsZElkTGlzdE1hdGNoKSB7XHJcbiAgICAgIGNvbnN0IGlkUmVnZXggPSAvPHA6c2xkSWRcXGJbXj5dKlxcYnI6aWQ9XCIoW15cIl0rKVwiL2c7XHJcbiAgICAgIGNvbnN0IG9yZGVyZWRQYXRoczogc3RyaW5nW10gPSBbXTtcclxuICAgICAgbGV0IG1hdGNoOiBSZWdFeHBFeGVjQXJyYXkgfCBudWxsO1xyXG4gICAgICB3aGlsZSAoKG1hdGNoID0gaWRSZWdleC5leGVjKHNsZElkTGlzdE1hdGNoWzFdKSkgIT09IG51bGwpIHtcclxuICAgICAgICBjb25zdCB0YXJnZXQgPSByZWxUYXJnZXRCeUlkLmdldChtYXRjaFsxXSk7XHJcbiAgICAgICAgaWYgKCF0YXJnZXQpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICBjb25zdCBzbGlkZVBhdGggPSByZXNvbHZlUmVsYXRpdmVUYXJnZXQoXCJwcHRcIiwgdGFyZ2V0KTtcclxuICAgICAgICBpZiAoemlwLmZpbGVzW3NsaWRlUGF0aF0gJiYgIXppcC5maWxlc1tzbGlkZVBhdGhdLmRpcikge1xyXG4gICAgICAgICAgb3JkZXJlZFBhdGhzLnB1c2goc2xpZGVQYXRoKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChvcmRlcmVkUGF0aHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIHJldHVybiBvcmRlcmVkUGF0aHM7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiBPYmplY3Qua2V5cyh6aXAuZmlsZXMpXHJcbiAgICAuZmlsdGVyKChwKSA9PiAvXnBwdFxcL3NsaWRlc1xcL3NsaWRlXFxkK1xcLnhtbCQvLnRlc3QocCkpXHJcbiAgICAuc29ydCgoYSwgYikgPT4gc2xpZGVOdW1iZXJGcm9tRmlsZW5hbWUoYSkgLSBzbGlkZU51bWJlckZyb21GaWxlbmFtZShiKSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBGaW5kcyB0aGUgbm90ZXMtc2xpZGUgcGFydCBhY3R1YWxseSBsaW5rZWQgZnJvbSB0aGlzIHNsaWRlJ3Mgb3duXHJcbiAqIHJlbGF0aW9uc2hpcCBmaWxlIChUeXBlIGVuZGluZyBpbiBcIi4uLi9yZWxhdGlvbnNoaXBzL25vdGVzU2xpZGVcIiksIHJhdGhlclxyXG4gKiB0aGFuIGFzc3VtaW5nIG5vdGVzU2xpZGVOLnhtbCBwYWlycyB3aXRoIHNsaWRlTi54bWwgYnkgbnVtYmVyIC0gdGhhdFxyXG4gKiBwYWlyaW5nIGlzIG5vdCBndWFyYW50ZWVkIG9uY2Ugc2xpZGVzIGhhdmUgYmVlbiBhZGRlZCwgcmVtb3ZlZCwgb3JcclxuICogcmVvcmRlcmVkLlxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gZ2V0Tm90ZXNQYXRoRm9yU2xpZGUoemlwOiBKU1ppcCwgc2xpZGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZyB8IHVuZGVmaW5lZD4ge1xyXG4gIGNvbnN0IHJlbHNGaWxlID0gemlwLmZpbGVzW3NsaWRlUmVsc1BhdGgoc2xpZGVQYXRoKV07XHJcbiAgaWYgKCFyZWxzRmlsZSkgcmV0dXJuIHVuZGVmaW5lZDtcclxuXHJcbiAgY29uc3QgcmVsc1htbCA9IGF3YWl0IHJlbHNGaWxlLmFzeW5jKFwidGV4dFwiKTtcclxuICBjb25zdCBub3Rlc1JlbCA9IHBhcnNlUmVsYXRpb25zaGlwcyhyZWxzWG1sKS5maW5kKChyKSA9PiByLnR5cGUuZW5kc1dpdGgoXCIvbm90ZXNTbGlkZVwiKSk7XHJcbiAgaWYgKCFub3Rlc1JlbCkgcmV0dXJuIHVuZGVmaW5lZDtcclxuXHJcbiAgY29uc3Qgbm90ZXNQYXRoID0gcmVzb2x2ZVJlbGF0aXZlVGFyZ2V0KHBhdGgucG9zaXguZGlybmFtZShzbGlkZVBhdGgpLCBub3Rlc1JlbC50YXJnZXQpO1xyXG4gIHJldHVybiB6aXAuZmlsZXNbbm90ZXNQYXRoXSAmJiAhemlwLmZpbGVzW25vdGVzUGF0aF0uZGlyID8gbm90ZXNQYXRoIDogdW5kZWZpbmVkO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFBhcnNlUHB0eE9wdGlvbnMge1xyXG4gIGluY2x1ZGVTcGVha2VyTm90ZXM/OiBib29sZWFuO1xyXG59XHJcblxyXG4vKipcclxuICogUGFyc2UgUFBUWCBmaWxlcyBhbmQgZXh0cmFjdCBzbGlkZSAoYW5kIG9wdGlvbmFsbHkgc3BlYWtlciBub3RlcykgdGV4dCwgaW5cclxuICogYWN0dWFsIHByZXNlbnRhdGlvbiBkaXNwbGF5IG9yZGVyLlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHBhcnNlUFBUWChcclxuICBmaWxlUGF0aDogc3RyaW5nLFxyXG4gIG9wdGlvbnM6IFBhcnNlUHB0eE9wdGlvbnMgPSB7fSxcclxuKTogUHJvbWlzZTxzdHJpbmc+IHtcclxuICBjb25zdCB7IGluY2x1ZGVTcGVha2VyTm90ZXMgPSB0cnVlIH0gPSBvcHRpb25zO1xyXG5cclxuICBjb25zdCBmaWxlQnVmZmVyID0gYXdhaXQgZnMucHJvbWlzZXMucmVhZEZpbGUoZmlsZVBhdGgpO1xyXG4gIGNvbnN0IHppcCA9IGF3YWl0IEpTWmlwLmxvYWRBc3luYyhmaWxlQnVmZmVyKTtcclxuXHJcbiAgY29uc3Qgc2xpZGVQYXRocyA9IGF3YWl0IGdldE9yZGVyZWRTbGlkZVBhdGhzKHppcCk7XHJcbiAgaWYgKHNsaWRlUGF0aHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICByZXR1cm4gXCJcIjtcclxuICB9XHJcblxyXG4gIGNvbnN0IHNsaWRlczogc3RyaW5nW10gPSBbXTtcclxuXHJcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBzbGlkZVBhdGhzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBjb25zdCBzbGlkZVBhdGggPSBzbGlkZVBhdGhzW2ldO1xyXG4gICAgY29uc3QgZGlzcGxheU51bWJlciA9IGkgKyAxO1xyXG4gICAgY29uc3QgeG1sID0gYXdhaXQgemlwLmZpbGVzW3NsaWRlUGF0aF0uYXN5bmMoXCJ0ZXh0XCIpO1xyXG4gICAgY29uc3QgYmxvY2tzID0gZXh0cmFjdENvbnRlbnRCbG9ja3MoeG1sKTtcclxuXHJcbiAgICBpZiAoYmxvY2tzLmxlbmd0aCA9PT0gMCAmJiAhaW5jbHVkZVNwZWFrZXJOb3RlcykgY29udGludWU7XHJcblxyXG4gICAgY29uc3QgdGl0bGVJbmRleCA9IGJsb2Nrcy5maW5kSW5kZXgoKGJsb2NrKSA9PiBibG9jay5raW5kID09PSBcInBhcmFncmFwaFwiKTtcclxuICAgIGNvbnN0IHRpdGxlID0gdGl0bGVJbmRleCA+PSAwID8gYmxvY2tzW3RpdGxlSW5kZXhdLnRleHQgOiBcIlwiO1xyXG4gICAgY29uc3QgbGluZXMgPSBbYCMjIFNsaWRlICR7ZGlzcGxheU51bWJlcn0ke3RpdGxlID8gYDogJHt0aXRsZX1gIDogXCJcIn1gXTtcclxuICAgIGJsb2Nrcy5mb3JFYWNoKChibG9jaywgaW5kZXgpID0+IHtcclxuICAgICAgaWYgKGluZGV4ID09PSB0aXRsZUluZGV4KSByZXR1cm47XHJcbiAgICAgIGxpbmVzLnB1c2goYmxvY2sua2luZCA9PT0gXCJ0YWJsZVJvd1wiID8gYmxvY2sudGV4dCA6IGAtICR7YmxvY2sudGV4dH1gKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGlmIChpbmNsdWRlU3BlYWtlck5vdGVzKSB7XHJcbiAgICAgIGNvbnN0IG5vdGVzUGF0aCA9IGF3YWl0IGdldE5vdGVzUGF0aEZvclNsaWRlKHppcCwgc2xpZGVQYXRoKTtcclxuICAgICAgaWYgKG5vdGVzUGF0aCkge1xyXG4gICAgICAgIGNvbnN0IG5vdGVzWG1sID0gYXdhaXQgemlwLmZpbGVzW25vdGVzUGF0aF0uYXN5bmMoXCJ0ZXh0XCIpO1xyXG4gICAgICAgIGNvbnN0IG5vdGVzQmxvY2tzID0gZXh0cmFjdENvbnRlbnRCbG9ja3Mobm90ZXNYbWwpO1xyXG4gICAgICAgIGlmIChub3Rlc0Jsb2Nrcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICBsaW5lcy5wdXNoKFwiXCIsIFwiIyMjIE5vdGVzXCIsIC4uLm5vdGVzQmxvY2tzLm1hcCgoYmxvY2spID0+IGJsb2NrLnRleHQpKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzbGlkZXMucHVzaChsaW5lcy5qb2luKFwiXFxuXCIpKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBzbGlkZXMuam9pbihcIlxcblxcblwiKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEV4dHJhY3RzIGV2ZXJ5IGVtYmVkZGVkIHJhc3RlciBpbWFnZSBmcm9tIGEgUFBUWCwgdGFnZ2VkIHdpdGggdGhlIHNsaWRlIGl0XHJcbiAqIGFwcGVhcnMgb24gKGJ5IGRpc3BsYXkgb3JkZXIsIG1hdGNoaW5nIHBhcnNlUFBUWCdzIG51bWJlcmluZykuIEltYWdlcyBhcmVcclxuICogbm90IHJlYWQgb3IgaW50ZXJwcmV0ZWQgaGVyZSAtIHRoaXMgaXMgaG9sZGluZyBjb2RlIGZvciBhIGZ1dHVyZSBWTE1cclxuICogY2FwdGlvbmluZyBzdGVwOyBzZWUgYGRlc2NyaWJlRW1iZWRkZWRJbWFnZXNgIGluIGAuL2VtYmVkZGVkSW1hZ2VzYC5cclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBleHRyYWN0UHB0eEltYWdlcyhmaWxlUGF0aDogc3RyaW5nKTogUHJvbWlzZTxFbWJlZGRlZEltYWdlW10+IHtcclxuICBjb25zdCB6aXAgPSBhd2FpdCBsb2FkWmlwKGZpbGVQYXRoKTtcclxuXHJcbiAgY29uc3Qgc2xpZGVQYXRocyA9IGF3YWl0IGdldE9yZGVyZWRTbGlkZVBhdGhzKHppcCk7XHJcbiAgY29uc3Qgc2xpZGVGb3JJbWFnZSA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XHJcblxyXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc2xpZGVQYXRocy5sZW5ndGg7IGkrKykge1xyXG4gICAgY29uc3Qgc2xpZGVQYXRoID0gc2xpZGVQYXRoc1tpXTtcclxuICAgIGNvbnN0IGRpc3BsYXlOdW1iZXIgPSBpICsgMTtcclxuICAgIGNvbnN0IHJlbHNGaWxlID0gemlwLmZpbGVzW3NsaWRlUmVsc1BhdGgoc2xpZGVQYXRoKV07XHJcbiAgICBpZiAoIXJlbHNGaWxlKSBjb250aW51ZTtcclxuXHJcbiAgICBjb25zdCByZWxzWG1sID0gYXdhaXQgcmVsc0ZpbGUuYXN5bmMoXCJ0ZXh0XCIpO1xyXG4gICAgZm9yIChjb25zdCByZWwgb2YgcGFyc2VSZWxhdGlvbnNoaXBzKHJlbHNYbWwpKSB7XHJcbiAgICAgIGlmICghcmVsLnR5cGUuZW5kc1dpdGgoXCIvaW1hZ2VcIikpIGNvbnRpbnVlO1xyXG4gICAgICBjb25zdCBhcmNoaXZlUGF0aCA9IHJlc29sdmVSZWxhdGl2ZVRhcmdldChwYXRoLnBvc2l4LmRpcm5hbWUoc2xpZGVQYXRoKSwgcmVsLnRhcmdldCk7XHJcbiAgICAgIHNsaWRlRm9ySW1hZ2Uuc2V0KGFyY2hpdmVQYXRoLCBkaXNwbGF5TnVtYmVyKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiBleHRyYWN0SW1hZ2VzRnJvbVppcCh6aXAsIFwicHB0L21lZGlhL1wiLCAoYXJjaGl2ZVBhdGgpID0+IHtcclxuICAgIGNvbnN0IHNsaWRlTnVtID0gc2xpZGVGb3JJbWFnZS5nZXQoYXJjaGl2ZVBhdGgpO1xyXG4gICAgcmV0dXJuIHNsaWRlTnVtID8gYFNsaWRlICR7c2xpZGVOdW19YCA6IHVuZGVmaW5lZDtcclxuICB9KTtcclxufVxyXG4iLCAiaW1wb3J0IG1hbW1vdGggZnJvbSBcIm1hbW1vdGhcIjtcclxuaW1wb3J0IHsgZXh0cmFjdEltYWdlc0Zyb21aaXAsIGxvYWRaaXAsIHR5cGUgRW1iZWRkZWRJbWFnZSB9IGZyb20gXCIuL2VtYmVkZGVkSW1hZ2VzXCI7XHJcbmltcG9ydCB7IGh0bWxUb01hcmtkb3duIH0gZnJvbSBcIi4vbWFya2Rvd24vaHRtbFRvTWFya2Rvd25cIjtcclxuXHJcbi8qKlxyXG4gKiBQYXJzZSBET0NYIGZpbGVzIGludG8gbm9ybWFsaXplZCBNYXJrZG93bi4gVXNlcyBtYW1tb3RoJ3MgSFRNTCBjb252ZXJzaW9uXHJcbiAqIChub3QgZXh0cmFjdFJhd1RleHQpLCB3aGljaCBrZWVwcyBoZWFkaW5nIHN0eWxlcywgbGlzdHMsIGFuZCB0YWJsZSByb3dzLlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHBhcnNlRE9DWChmaWxlUGF0aDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcclxuICBjb25zdCB7IHZhbHVlOiBodG1sIH0gPSBhd2FpdCBtYW1tb3RoLmNvbnZlcnRUb0h0bWwoeyBwYXRoOiBmaWxlUGF0aCB9KTtcclxuICByZXR1cm4gaHRtbFRvTWFya2Rvd24oaHRtbCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBFeHRyYWN0cyBldmVyeSBlbWJlZGRlZCByYXN0ZXIgaW1hZ2UgZnJvbSBhIERPQ1gncyBgd29yZC9tZWRpYS9gIGZvbGRlci5cclxuICogSW1hZ2VzIGFyZSBub3QgcmVhZCBvciBpbnRlcnByZXRlZCBoZXJlIC0gdGhpcyBpcyBob2xkaW5nIGNvZGUgZm9yIGFcclxuICogZnV0dXJlIFZMTSBjYXB0aW9uaW5nIHN0ZXA7IHNlZSBgZGVzY3JpYmVFbWJlZGRlZEltYWdlc2AgaW5cclxuICogYC4vZW1iZWRkZWRJbWFnZXNgLiBVbmxpa2UgUFBUWCBzbGlkZXMsIG1hcHBpbmcgYW4gaW1hZ2UgYmFjayB0byB0aGVcclxuICogcGFyYWdyYXBoIGl0IGFwcGVhcnMgaW4gcmVxdWlyZXMgcGFyc2luZyBgPHc6ZHJhd2luZz5gIGFuY2hvcnMgaW5cclxuICogZG9jdW1lbnQueG1sLCB3aGljaCBpcyBsZWZ0IGZvciB3aGVuZXZlciB0aGF0IG1hcHBpbmcgaXMgYWN0dWFsbHkgbmVlZGVkLlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV4dHJhY3REb2N4SW1hZ2VzKGZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPEVtYmVkZGVkSW1hZ2VbXT4ge1xyXG4gIGNvbnN0IHppcCA9IGF3YWl0IGxvYWRaaXAoZmlsZVBhdGgpO1xyXG4gIHJldHVybiBleHRyYWN0SW1hZ2VzRnJvbVppcCh6aXAsIFwid29yZC9tZWRpYS9cIik7XHJcbn1cclxuIiwgImltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgcGFyc2VIVE1MIH0gZnJvbSBcIi4vaHRtbFBhcnNlclwiO1xyXG5pbXBvcnQgeyBwYXJzZVBERiwgdHlwZSBQZGZGYWlsdXJlUmVhc29uIH0gZnJvbSBcIi4vcGRmUGFyc2VyXCI7XHJcbmltcG9ydCB7IHBhcnNlRVBVQiB9IGZyb20gXCIuL2VwdWJQYXJzZXJcIjtcclxuaW1wb3J0IHsgcGFyc2VJbWFnZSB9IGZyb20gXCIuL2ltYWdlUGFyc2VyXCI7XHJcbmltcG9ydCB7IHBhcnNlVGV4dCB9IGZyb20gXCIuL3RleHRQYXJzZXJcIjtcclxuaW1wb3J0IHsgcGFyc2VQUFRYIH0gZnJvbSBcIi4vcHB0eFBhcnNlclwiO1xyXG5pbXBvcnQgeyBwYXJzZURPQ1ggfSBmcm9tIFwiLi9kb2N4UGFyc2VyXCI7XHJcbmltcG9ydCB7IHR5cGUgTE1TdHVkaW9DbGllbnQgfSBmcm9tIFwiQGxtc3R1ZGlvL3Nka1wiO1xyXG5pbXBvcnQge1xyXG4gIElNQUdFX0VYVEVOU0lPTl9TRVQsXHJcbiAgaXNEb2N4RXh0ZW5zaW9uLFxyXG4gIGlzSHRtbEV4dGVuc2lvbixcclxuICBpc01hcmtkb3duRXh0ZW5zaW9uLFxyXG4gIGlzUHB0eEV4dGVuc2lvbixcclxuICBpc1RleHR1YWxFeHRlbnNpb24sXHJcbn0gZnJvbSBcIi4uL3V0aWxzL3N1cHBvcnRlZEV4dGVuc2lvbnNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUGFyc2VkRG9jdW1lbnQge1xyXG4gIHRleHQ6IHN0cmluZztcclxuICBtZXRhZGF0YToge1xyXG4gICAgZmlsZVBhdGg6IHN0cmluZztcclxuICAgIGZpbGVOYW1lOiBzdHJpbmc7XHJcbiAgICBleHRlbnNpb246IHN0cmluZztcclxuICAgIHBhcnNlZEF0OiBEYXRlO1xyXG4gIH07XHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIFBhcnNlRmFpbHVyZVJlYXNvbiA9XHJcbiAgfCBcInVuc3VwcG9ydGVkLWV4dGVuc2lvblwiXHJcbiAgfCBcInBkZi5taXNzaW5nLWNsaWVudFwiXHJcbiAgfCBQZGZGYWlsdXJlUmVhc29uXHJcbiAgfCBcImVwdWIuZW1wdHlcIlxyXG4gIHwgXCJodG1sLmVtcHR5XCJcclxuICB8IFwiaHRtbC5lcnJvclwiXHJcbiAgfCBcInRleHQuZW1wdHlcIlxyXG4gIHwgXCJ0ZXh0LmVycm9yXCJcclxuICB8IFwicHB0eC5lbXB0eVwiXHJcbiAgfCBcInBwdHguZXJyb3JcIlxyXG4gIHwgXCJkb2N4LmVtcHR5XCJcclxuICB8IFwiZG9jeC5lcnJvclwiXHJcbiAgfCBcImltYWdlLm9jci1kaXNhYmxlZFwiXHJcbiAgfCBcImltYWdlLmVtcHR5XCJcclxuICB8IFwiaW1hZ2UuZXJyb3JcIlxyXG4gIHwgXCJwYXJzZXIudW5leHBlY3RlZC1lcnJvclwiO1xyXG5cclxuZXhwb3J0IHR5cGUgRG9jdW1lbnRQYXJzZVJlc3VsdCA9XHJcbiAgfCB7IHN1Y2Nlc3M6IHRydWU7IGRvY3VtZW50OiBQYXJzZWREb2N1bWVudCB9XHJcbiAgfCB7IHN1Y2Nlc3M6IGZhbHNlOyByZWFzb246IFBhcnNlRmFpbHVyZVJlYXNvbjsgZGV0YWlscz86IHN0cmluZyB9O1xyXG5cclxudHlwZSBDbGVhblJlc3VsdCA9XHJcbiAgfCB7IHN1Y2Nlc3M6IHRydWU7IHZhbHVlOiBzdHJpbmcgfVxyXG4gIHwgeyBzdWNjZXNzOiBmYWxzZTsgcmVhc29uOiBQYXJzZUZhaWx1cmVSZWFzb247IGRldGFpbHM/OiBzdHJpbmcgfTtcclxuXHJcbi8qKlxyXG4gKiBSdW5zIGEgcGFyc2VyIHRoYXQgcmV0dXJucyByYXcgdGV4dCwgdGhlbiB0cmltcy92YWxpZGF0ZXMgaXQuIENlbnRyYWxpemVzXHJcbiAqIHRoZSB0cnkvY2F0Y2ggKyBlbXB0eS1jaGVjayBzaGFwZSBzaGFyZWQgYnkgZXZlcnkgZm9ybWF0IGJlbG93IHNvIGVhY2hcclxuICogYnJhbmNoIGluIHBhcnNlRG9jdW1lbnQgcmVhZHMgYXMgYSBvbmUtbGluZXIgaW5zdGVhZCBvZiByZXBlYXRpbmcgaXQuXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBydW5QYXJzZXIoXHJcbiAgZmlsZVBhdGg6IHN0cmluZyxcclxuICBsYWJlbDogc3RyaW5nLFxyXG4gIGRldGFpbHNDb250ZXh0OiBzdHJpbmcsXHJcbiAgZW1wdHlSZWFzb246IFBhcnNlRmFpbHVyZVJlYXNvbixcclxuICBlcnJvclJlYXNvbjogUGFyc2VGYWlsdXJlUmVhc29uLFxyXG4gIHBhcnNlOiAoKSA9PiBQcm9taXNlPHN0cmluZz4sXHJcbik6IFByb21pc2U8Q2xlYW5SZXN1bHQ+IHtcclxuICB0cnkge1xyXG4gICAgcmV0dXJuIGNsZWFuQW5kVmFsaWRhdGUoYXdhaXQgcGFyc2UoKSwgZW1wdHlSZWFzb24sIGRldGFpbHNDb250ZXh0KTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcihgW1BhcnNlcl1bJHtsYWJlbH1dIEVycm9yIHBhcnNpbmcgJHtmaWxlUGF0aH06YCwgZXJyb3IpO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgIHJlYXNvbjogZXJyb3JSZWFzb24sXHJcbiAgICAgIGRldGFpbHM6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSxcclxuICAgIH07XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjbGVhbkFuZFZhbGlkYXRlKFxyXG4gIHRleHQ6IHN0cmluZyxcclxuICBlbXB0eVJlYXNvbjogUGFyc2VGYWlsdXJlUmVhc29uLFxyXG4gIGRldGFpbHNDb250ZXh0Pzogc3RyaW5nLFxyXG4pOiBDbGVhblJlc3VsdCB7XHJcbiAgY29uc3QgY2xlYW5lZCA9IHRleHQ/LnRyaW0oKSA/PyBcIlwiO1xyXG4gIGlmIChjbGVhbmVkLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgIHJlYXNvbjogZW1wdHlSZWFzb24sXHJcbiAgICAgIGRldGFpbHM6IGRldGFpbHNDb250ZXh0ID8gYCR7ZGV0YWlsc0NvbnRleHR9IHRyaW1tZWQgdG8gemVybyBsZW5ndGhgIDogdW5kZWZpbmVkLFxyXG4gICAgfTtcclxuICB9XHJcbiAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgdmFsdWU6IGNsZWFuZWQgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFBhcnNlIGEgZG9jdW1lbnQgZmlsZSBiYXNlZCBvbiBpdHMgZXh0ZW5zaW9uXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcGFyc2VEb2N1bWVudChcclxuICBmaWxlUGF0aDogc3RyaW5nLFxyXG4gIGVuYWJsZU9DUjogYm9vbGVhbiA9IGZhbHNlLFxyXG4gIGNsaWVudD86IExNU3R1ZGlvQ2xpZW50LFxyXG4pOiBQcm9taXNlPERvY3VtZW50UGFyc2VSZXN1bHQ+IHtcclxuICBjb25zdCBleHQgPSBwYXRoLmV4dG5hbWUoZmlsZVBhdGgpLnRvTG93ZXJDYXNlKCk7XHJcbiAgY29uc3QgZmlsZU5hbWUgPSBwYXRoLmJhc2VuYW1lKGZpbGVQYXRoKTtcclxuXHJcbiAgY29uc3QgYnVpbGRTdWNjZXNzID0gKHRleHQ6IHN0cmluZyk6IERvY3VtZW50UGFyc2VSZXN1bHQgPT4gKHtcclxuICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICBkb2N1bWVudDoge1xyXG4gICAgICB0ZXh0LFxyXG4gICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgIGZpbGVQYXRoLFxyXG4gICAgICAgIGZpbGVOYW1lLFxyXG4gICAgICAgIGV4dGVuc2lvbjogZXh0LFxyXG4gICAgICAgIHBhcnNlZEF0OiBuZXcgRGF0ZSgpLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9KTtcclxuXHJcbiAgY29uc3QgZmluaXNoID0gKHJlc3VsdDogQ2xlYW5SZXN1bHQpOiBEb2N1bWVudFBhcnNlUmVzdWx0ID0+XHJcbiAgICByZXN1bHQuc3VjY2VzcyA/IGJ1aWxkU3VjY2VzcyhyZXN1bHQudmFsdWUpIDogcmVzdWx0O1xyXG5cclxuICB0cnkge1xyXG4gICAgaWYgKGlzSHRtbEV4dGVuc2lvbihleHQpKSB7XHJcbiAgICAgIHJldHVybiBmaW5pc2goXHJcbiAgICAgICAgYXdhaXQgcnVuUGFyc2VyKGZpbGVQYXRoLCBcIkhUTUxcIiwgYCR7ZmlsZU5hbWV9IGh0bWxgLCBcImh0bWwuZW1wdHlcIiwgXCJodG1sLmVycm9yXCIsICgpID0+XHJcbiAgICAgICAgICBwYXJzZUhUTUwoZmlsZVBhdGgpLFxyXG4gICAgICAgICksXHJcbiAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGV4dCA9PT0gXCIucGRmXCIpIHtcclxuICAgICAgaWYgKCFjbGllbnQpIHtcclxuICAgICAgICBjb25zb2xlLndhcm4oYFtQYXJzZXJdIE5vIExNIFN0dWRpbyBjbGllbnQgYXZhaWxhYmxlIGZvciBQREYgcGFyc2luZzogJHtmaWxlTmFtZX1gKTtcclxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgcmVhc29uOiBcInBkZi5taXNzaW5nLWNsaWVudFwiIH07XHJcbiAgICAgIH1cclxuICAgICAgY29uc3QgcGRmUmVzdWx0ID0gYXdhaXQgcGFyc2VQREYoZmlsZVBhdGgsIGNsaWVudCwgZW5hYmxlT0NSKTtcclxuICAgICAgcmV0dXJuIHBkZlJlc3VsdC5zdWNjZXNzID8gYnVpbGRTdWNjZXNzKHBkZlJlc3VsdC50ZXh0KSA6IHBkZlJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoZXh0ID09PSBcIi5lcHViXCIpIHtcclxuICAgICAgLy8gcGFyc2VFUFVCIG5ldmVyIHRocm93cyAoaXQgcmVzb2x2ZXMgXCJcIiBvbiBpbnRlcm5hbCBlcnJvcnMpLCBzb1xyXG4gICAgICAvLyBcInBhcnNlci51bmV4cGVjdGVkLWVycm9yXCIgaGVyZSBpcyB1bnJlYWNoYWJsZSBpbiBwcmFjdGljZSAtIGtlcHQgb25seVxyXG4gICAgICAvLyB0byBtYXRjaCB3aGF0IHRoZSBvdXRlciBjYXRjaCBiZWxvdyB3b3VsZCBoYXZlIHByb2R1Y2VkIGFueXdheS5cclxuICAgICAgcmV0dXJuIGZpbmlzaChcclxuICAgICAgICBhd2FpdCBydW5QYXJzZXIoZmlsZVBhdGgsIFwiRVBVQlwiLCBmaWxlTmFtZSwgXCJlcHViLmVtcHR5XCIsIFwicGFyc2VyLnVuZXhwZWN0ZWQtZXJyb3JcIiwgKCkgPT5cclxuICAgICAgICAgIHBhcnNlRVBVQihmaWxlUGF0aCksXHJcbiAgICAgICAgKSxcclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoaXNEb2N4RXh0ZW5zaW9uKGV4dCkpIHtcclxuICAgICAgcmV0dXJuIGZpbmlzaChcclxuICAgICAgICBhd2FpdCBydW5QYXJzZXIoZmlsZVBhdGgsIFwiRE9DWFwiLCBmaWxlTmFtZSwgXCJkb2N4LmVtcHR5XCIsIFwiZG9jeC5lcnJvclwiLCAoKSA9PlxyXG4gICAgICAgICAgcGFyc2VET0NYKGZpbGVQYXRoKSxcclxuICAgICAgICApLFxyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChpc1BwdHhFeHRlbnNpb24oZXh0KSkge1xyXG4gICAgICByZXR1cm4gZmluaXNoKFxyXG4gICAgICAgIGF3YWl0IHJ1blBhcnNlcihmaWxlUGF0aCwgXCJQUFRYXCIsIGZpbGVOYW1lLCBcInBwdHguZW1wdHlcIiwgXCJwcHR4LmVycm9yXCIsICgpID0+XHJcbiAgICAgICAgICBwYXJzZVBQVFgoZmlsZVBhdGgpLFxyXG4gICAgICAgICksXHJcbiAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGlzVGV4dHVhbEV4dGVuc2lvbihleHQpKSB7XHJcbiAgICAgIHJldHVybiBmaW5pc2goXHJcbiAgICAgICAgYXdhaXQgcnVuUGFyc2VyKGZpbGVQYXRoLCBcIlRleHRcIiwgZmlsZU5hbWUsIFwidGV4dC5lbXB0eVwiLCBcInRleHQuZXJyb3JcIiwgKCkgPT5cclxuICAgICAgICAgIHBhcnNlVGV4dChmaWxlUGF0aCwgaXNNYXJrZG93bkV4dGVuc2lvbihleHQpID8gXCJtYXJrZG93blwiIDogXCJwbGFpblwiKSxcclxuICAgICAgICApLFxyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChJTUFHRV9FWFRFTlNJT05fU0VULmhhcyhleHQpKSB7XHJcbiAgICAgIGlmICghZW5hYmxlT0NSKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYFNraXBwaW5nIGltYWdlIGZpbGUgJHtmaWxlUGF0aH0gKE9DUiBkaXNhYmxlZClgKTtcclxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgcmVhc29uOiBcImltYWdlLm9jci1kaXNhYmxlZFwiIH07XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIGZpbmlzaChcclxuICAgICAgICBhd2FpdCBydW5QYXJzZXIoZmlsZVBhdGgsIFwiSW1hZ2VcIiwgZmlsZU5hbWUsIFwiaW1hZ2UuZW1wdHlcIiwgXCJpbWFnZS5lcnJvclwiLCAoKSA9PlxyXG4gICAgICAgICAgcGFyc2VJbWFnZShmaWxlUGF0aCksXHJcbiAgICAgICAgKSxcclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoZXh0ID09PSBcIi5yYXJcIikge1xyXG4gICAgICBjb25zb2xlLmxvZyhgUkFSIGZpbGVzIG5vdCB5ZXQgc3VwcG9ydGVkOiAke2ZpbGVQYXRofWApO1xyXG4gICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgcmVhc29uOiBcInVuc3VwcG9ydGVkLWV4dGVuc2lvblwiLCBkZXRhaWxzOiBcIi5yYXJcIiB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKGBVbnN1cHBvcnRlZCBmaWxlIHR5cGU6ICR7ZmlsZVBhdGh9YCk7XHJcbiAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgcmVhc29uOiBcInVuc3VwcG9ydGVkLWV4dGVuc2lvblwiLCBkZXRhaWxzOiBleHQgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcihgRXJyb3IgcGFyc2luZyBkb2N1bWVudCAke2ZpbGVQYXRofTpgLCBlcnJvcik7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgcmVhc29uOiBcInBhcnNlci51bmV4cGVjdGVkLWVycm9yXCIsXHJcbiAgICAgIGRldGFpbHM6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSxcclxuICAgIH07XHJcbiAgfVxyXG59XHJcbiIsICJleHBvcnQgdHlwZSBDb3VudFRva2VucyA9ICh0ZXh0OiBzdHJpbmcpID0+IFByb21pc2U8bnVtYmVyPjtcclxuXHJcbi8qKlxyXG4gKiBTcGxpdHMgdGV4dCBpbnRvIG92ZXJsYXBwaW5nIGNodW5rcyBzaXplZCBhZ2FpbnN0IHJlYWwgZW1iZWRkaW5nLW1vZGVsXHJcbiAqIHRva2VucyByYXRoZXIgdGhhbiB3aGl0ZXNwYWNlLWRlbGltaXRlZCB3b3Jkcy5cclxuICpcclxuICogVGhlcmUgaXMgbm8gd2F5IHRvIHNsaWNlIGEgcmF3IHRva2VuIGFycmF5IGFuZCBmZWVkIGl0IGJhY2sgdG8gYW5cclxuICogZW1iZWRkaW5nIG1vZGVsIChlbWJlZCgpIG9ubHkgYWNjZXB0cyBzdHJpbmdzLCBhbmQgdGhlIFNESyBleHBvc2VzIG5vXHJcbiAqIGRldG9rZW5pemUgY2FsbCksIHNvIGNodW5rIGJvdW5kYXJpZXMgYXJlIHN0aWxsIHBsYWNlZCBvbiB3b3JkIGJyZWFrcy5cclxuICogV2hhdCBjaGFuZ2VzIGlzIGhvdyBtYW55IHdvcmRzIHRoYXQgY29ycmVzcG9uZHMgdG86IGBjb3VudFRva2Vuc2AgaXNcclxuICogY2FsbGVkIG9uY2Ugb24gdGhlIGZ1bGwgdGV4dCB0byBtZWFzdXJlIGl0cyByZWFsIHRva2VuIGRlbnNpdHksIGFuZFxyXG4gKiBjaHVua1NpemUvb3ZlcmxhcCAodG9rZW4gdGFyZ2V0cykgYXJlIGNvbnZlcnRlZCBpbnRvIGFuIGVxdWl2YWxlbnQgd29yZFxyXG4gKiBjb3VudCB1c2luZyB0aGF0IHJhdGlvLCBpbnN0ZWFkIG9mIGJlaW5nIHVzZWQgYXMgd29yZCBjb3VudHMgZGlyZWN0bHkuXHJcbiAqIFRoYXQgcmF0aW8gY2FuIHN0aWxsIGRyaWZ0IHdpdGhpbiBhIHNpbmdsZSBkb2N1bWVudCAoZS5nLiBwcm9zZSBuZXh0IHRvXHJcbiAqIGRlbnNlIGNvZGUpLCBzbyB0cmVhdCBjaHVuayBzaXppbmcgYXMgXCJjbG9zZSB0byB0aGUgdGFyZ2V0LFwiIG5vdCBleGFjdC5cclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaHVua1RleHQoXHJcbiAgdGV4dDogc3RyaW5nLFxyXG4gIGNodW5rU2l6ZTogbnVtYmVyLFxyXG4gIG92ZXJsYXA6IG51bWJlcixcclxuICBjb3VudFRva2VuczogQ291bnRUb2tlbnMsXHJcbik6IFByb21pc2U8QXJyYXk8eyB0ZXh0OiBzdHJpbmc7IHN0YXJ0SW5kZXg6IG51bWJlcjsgZW5kSW5kZXg6IG51bWJlciB9Pj4ge1xyXG4gIGNvbnN0IGNodW5rczogQXJyYXk8eyB0ZXh0OiBzdHJpbmc7IHN0YXJ0SW5kZXg6IG51bWJlcjsgZW5kSW5kZXg6IG51bWJlciB9PiA9IFtdO1xyXG5cclxuICBjb25zdCB3b3JkcyA9IHRleHQuc3BsaXQoL1xccysvKS5maWx0ZXIoKHdvcmQpID0+IHdvcmQubGVuZ3RoID4gMCk7XHJcblxyXG4gIGlmICh3b3Jkcy5sZW5ndGggPT09IDApIHtcclxuICAgIHJldHVybiBjaHVua3M7XHJcbiAgfVxyXG5cclxuICBjb25zdCB0b3RhbFRva2VucyA9IGF3YWl0IGNvdW50VG9rZW5zKHRleHQpO1xyXG4gIGNvbnN0IHRva2Vuc1BlcldvcmQgPSB0b3RhbFRva2VucyA+IDAgPyB0b3RhbFRva2VucyAvIHdvcmRzLmxlbmd0aCA6IDE7XHJcblxyXG4gIGNvbnN0IHdvcmRDaHVua1NpemUgPSBNYXRoLm1heCgxLCBNYXRoLnJvdW5kKGNodW5rU2l6ZSAvIHRva2Vuc1BlcldvcmQpKTtcclxuICBjb25zdCB3b3JkT3ZlcmxhcCA9IE1hdGgubWF4KDAsIE1hdGgubWluKHdvcmRDaHVua1NpemUgLSAxLCBNYXRoLnJvdW5kKG92ZXJsYXAgLyB0b2tlbnNQZXJXb3JkKSkpO1xyXG5cclxuICBsZXQgc3RhcnRJZHggPSAwO1xyXG5cclxuICB3aGlsZSAoc3RhcnRJZHggPCB3b3Jkcy5sZW5ndGgpIHtcclxuICAgIGNvbnN0IGVuZElkeCA9IE1hdGgubWluKHN0YXJ0SWR4ICsgd29yZENodW5rU2l6ZSwgd29yZHMubGVuZ3RoKTtcclxuICAgIGNvbnN0IGNodW5rV29yZHMgPSB3b3Jkcy5zbGljZShzdGFydElkeCwgZW5kSWR4KTtcclxuICAgIGNvbnN0IGNodW5rQ29udGVudCA9IGNodW5rV29yZHMuam9pbihcIiBcIik7XHJcblxyXG4gICAgY2h1bmtzLnB1c2goe1xyXG4gICAgICB0ZXh0OiBjaHVua0NvbnRlbnQsXHJcbiAgICAgIHN0YXJ0SW5kZXg6IHN0YXJ0SWR4LFxyXG4gICAgICBlbmRJbmRleDogZW5kSWR4LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTW92ZSBmb3J3YXJkIGJ5ICh3b3JkQ2h1bmtTaXplIC0gd29yZE92ZXJsYXApIHRvIGNyZWF0ZSBvdmVybGFwcGluZyBjaHVua3NcclxuICAgIHN0YXJ0SWR4ICs9IE1hdGgubWF4KDEsIHdvcmRDaHVua1NpemUgLSB3b3JkT3ZlcmxhcCk7XHJcblxyXG4gICAgLy8gQnJlYWsgaWYgd2UndmUgcmVhY2hlZCB0aGUgZW5kXHJcbiAgICBpZiAoZW5kSWR4ID49IHdvcmRzLmxlbmd0aCkge1xyXG4gICAgICBicmVhaztcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiBjaHVua3M7XHJcbn1cclxuIiwgImltcG9ydCAqIGFzIGNyeXB0byBmcm9tIFwiY3J5cHRvXCI7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gXCJmc1wiO1xyXG5cclxuLyoqXHJcbiAqIENhbGN1bGF0ZSBTSEEtMjU2IGhhc2ggb2YgYSBmaWxlIGZvciBjaGFuZ2UgZGV0ZWN0aW9uXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2FsY3VsYXRlRmlsZUhhc2goZmlsZVBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgIGNvbnN0IGhhc2ggPSBjcnlwdG8uY3JlYXRlSGFzaChcInNoYTI1NlwiKTtcclxuICAgIGNvbnN0IHN0cmVhbSA9IGZzLmNyZWF0ZVJlYWRTdHJlYW0oZmlsZVBhdGgpO1xyXG4gICAgXHJcbiAgICBzdHJlYW0ub24oXCJkYXRhXCIsIChkYXRhKSA9PiBoYXNoLnVwZGF0ZShkYXRhKSk7XHJcbiAgICBzdHJlYW0ub24oXCJlbmRcIiwgKCkgPT4gcmVzb2x2ZShoYXNoLmRpZ2VzdChcImhleFwiKSkpO1xyXG4gICAgc3RyZWFtLm9uKFwiZXJyb3JcIiwgcmVqZWN0KTtcclxuICB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCBmaWxlIG1ldGFkYXRhIGluY2x1ZGluZyBzaXplIGFuZCBtb2RpZmljYXRpb24gdGltZVxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEZpbGVNZXRhZGF0YShmaWxlUGF0aDogc3RyaW5nKTogUHJvbWlzZTx7XHJcbiAgc2l6ZTogbnVtYmVyO1xyXG4gIG10aW1lOiBEYXRlO1xyXG4gIGhhc2g6IHN0cmluZztcclxufT4ge1xyXG4gIGNvbnN0IHN0YXRzID0gYXdhaXQgZnMucHJvbWlzZXMuc3RhdChmaWxlUGF0aCk7XHJcbiAgY29uc3QgaGFzaCA9IGF3YWl0IGNhbGN1bGF0ZUZpbGVIYXNoKGZpbGVQYXRoKTtcclxuICBcclxuICByZXR1cm4ge1xyXG4gICAgc2l6ZTogc3RhdHMuc2l6ZSxcclxuICAgIG10aW1lOiBzdGF0cy5tdGltZSxcclxuICAgIGhhc2gsXHJcbiAgfTtcclxufVxyXG5cclxuIiwgImltcG9ydCAqIGFzIGZzIGZyb20gXCJmcy9wcm9taXNlc1wiO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XHJcblxyXG5pbnRlcmZhY2UgRmFpbGVkRmlsZUVudHJ5IHtcclxuICBmaWxlSGFzaDogc3RyaW5nO1xyXG4gIHJlYXNvbjogc3RyaW5nO1xyXG4gIHRpbWVzdGFtcDogc3RyaW5nO1xyXG59XHJcblxyXG4vKipcclxuICogVHJhY2tzIGZpbGVzIHRoYXQgZmFpbGVkIGluZGV4aW5nIGZvciBhIGdpdmVuIGhhc2ggc28gd2UgY2FuIHNraXAgdGhlbVxyXG4gKiB3aGVuIGF1dG8tcmVpbmRleGluZyB1bmNoYW5nZWQgZGF0YS5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBGYWlsZWRGaWxlUmVnaXN0cnkge1xyXG4gIHByaXZhdGUgbG9hZGVkID0gZmFsc2U7XHJcbiAgcHJpdmF0ZSBlbnRyaWVzOiBSZWNvcmQ8c3RyaW5nLCBGYWlsZWRGaWxlRW50cnk+ID0ge307XHJcbiAgcHJpdmF0ZSBxdWV1ZTogUHJvbWlzZTx2b2lkPiA9IFByb21pc2UucmVzb2x2ZSgpO1xyXG5cclxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHJlZ2lzdHJ5UGF0aDogc3RyaW5nKSB7fVxyXG5cclxuICBwcml2YXRlIGFzeW5jIGxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZiAodGhpcy5sb2FkZWQpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IGZzLnJlYWRGaWxlKHRoaXMucmVnaXN0cnlQYXRoLCBcInV0Zi04XCIpO1xyXG4gICAgICB0aGlzLmVudHJpZXMgPSBKU09OLnBhcnNlKGRhdGEpID8/IHt9O1xyXG4gICAgfSBjYXRjaCB7XHJcbiAgICAgIHRoaXMuZW50cmllcyA9IHt9O1xyXG4gICAgfVxyXG4gICAgdGhpcy5sb2FkZWQgPSB0cnVlO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBwZXJzaXN0KCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgZnMubWtkaXIocGF0aC5kaXJuYW1lKHRoaXMucmVnaXN0cnlQYXRoKSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XHJcbiAgICBhd2FpdCBmcy53cml0ZUZpbGUodGhpcy5yZWdpc3RyeVBhdGgsIEpTT04uc3RyaW5naWZ5KHRoaXMuZW50cmllcywgbnVsbCwgMiksIFwidXRmLThcIik7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHJ1bkV4Y2x1c2l2ZTxUPihvcGVyYXRpb246ICgpID0+IFByb21pc2U8VD4pOiBQcm9taXNlPFQ+IHtcclxuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMucXVldWUudGhlbihvcGVyYXRpb24pO1xyXG4gICAgdGhpcy5xdWV1ZSA9IHJlc3VsdC50aGVuKFxyXG4gICAgICAoKSA9PiB7fSxcclxuICAgICAgKCkgPT4ge30sXHJcbiAgICApO1xyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9XHJcblxyXG4gIGFzeW5jIHJlY29yZEZhaWx1cmUoZmlsZVBhdGg6IHN0cmluZywgZmlsZUhhc2g6IHN0cmluZywgcmVhc29uOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHJldHVybiB0aGlzLnJ1bkV4Y2x1c2l2ZShhc3luYyAoKSA9PiB7XHJcbiAgICAgIGF3YWl0IHRoaXMubG9hZCgpO1xyXG4gICAgICB0aGlzLmVudHJpZXNbZmlsZVBhdGhdID0ge1xyXG4gICAgICAgIGZpbGVIYXNoLFxyXG4gICAgICAgIHJlYXNvbixcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgfTtcclxuICAgICAgYXdhaXQgdGhpcy5wZXJzaXN0KCk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGFzeW5jIGNsZWFyRmFpbHVyZShmaWxlUGF0aDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICByZXR1cm4gdGhpcy5ydW5FeGNsdXNpdmUoYXN5bmMgKCkgPT4ge1xyXG4gICAgICBhd2FpdCB0aGlzLmxvYWQoKTtcclxuICAgICAgaWYgKHRoaXMuZW50cmllc1tmaWxlUGF0aF0pIHtcclxuICAgICAgICBkZWxldGUgdGhpcy5lbnRyaWVzW2ZpbGVQYXRoXTtcclxuICAgICAgICBhd2FpdCB0aGlzLnBlcnNpc3QoKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBhc3luYyBnZXRGYWlsdXJlUmVhc29uKGZpbGVQYXRoOiBzdHJpbmcsIGZpbGVIYXNoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZyB8IHVuZGVmaW5lZD4ge1xyXG4gICAgYXdhaXQgdGhpcy5sb2FkKCk7XHJcbiAgICBjb25zdCBlbnRyeSA9IHRoaXMuZW50cmllc1tmaWxlUGF0aF07XHJcbiAgICBpZiAoIWVudHJ5KSB7XHJcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZW50cnkuZmlsZUhhc2ggPT09IGZpbGVIYXNoID8gZW50cnkucmVhc29uIDogdW5kZWZpbmVkO1xyXG4gIH1cclxufVxyXG5cclxuIiwgImV4cG9ydCBpbnRlcmZhY2UgRGF0ZVJhbmdlIHtcclxuICBzdGFydDogc3RyaW5nO1xyXG4gIGVuZDogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgdHlwZSBEYXlNb250aE9yZGVyID0gXCJkYXktZmlyc3RcIiB8IFwibW9udGgtZmlyc3RcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRGF0ZUNvbnRleHQge1xyXG4gIC8qKiBEYXkvbW9udGggb3JkZXIgdGhlIGRvY3VtZW50IGlzIGtub3duIHRvIHVzZSwgZm9yIGFtYmlndW91cyBudW1lcmljIGRhdGVzLiAqL1xyXG4gIG9yZGVyPzogRGF5TW9udGhPcmRlcjtcclxuICAvKiogRmlsZSBtb2RpZmllZCB0aW1lLCB1c2VkIHRvIHBpY2sgYmV0d2VlbiBhbWJpZ3VvdXMgcmVhZGluZ3MuICovXHJcbiAgcmVmZXJlbmNlVGltZT86IERhdGU7XHJcbiAgLyoqIFllYXIgZm9yIGRheS1tb250aCBmb3JtcyB3cml0dGVuIHdpdGhvdXQgb25lIChlLmcuIFwiMTUgU2VwXCIpLiAqL1xyXG4gIGRlZmF1bHRZZWFyPzogbnVtYmVyO1xyXG4gIC8qKiBBbGxvdyBjb21wYWN0IGRhdGVzIHN1Y2ggYXMgMjAyNjA5MTUsIHdoaWNoIGFyZSBvbmx5IHJlbGlhYmxlIGluIGZpbGUgbmFtZXMuICovXHJcbiAgZmlsZU5hbWU/OiBib29sZWFuO1xyXG59XHJcblxyXG5jb25zdCBNT05USF9QQVRURVJOID1cclxuICBcImphbig/OnVhcnkpP3xmZWIoPzpydWFyeSk/fG1hcig/OmNoKT98YXByKD86aWwpP3xtYXl8anVuZT98anVseT98YXVnKD86dXN0KT98c2VwKD86dCg/OmVtYmVyKT8pP3xvY3QoPzpvYmVyKT98bm92KD86ZW1iZXIpP3xkZWMoPzplbWJlcik/XCI7XHJcbmNvbnN0IE1PTlRIX0tFWVMgPSBbXCJqYW5cIiwgXCJmZWJcIiwgXCJtYXJcIiwgXCJhcHJcIiwgXCJtYXlcIiwgXCJqdW5cIiwgXCJqdWxcIiwgXCJhdWdcIiwgXCJzZXBcIiwgXCJvY3RcIiwgXCJub3ZcIiwgXCJkZWNcIl07XHJcbmNvbnN0IEFNQklHVUlUWV9XSU5ET1dfREFZUyA9IDQ1O1xyXG5jb25zdCBQT1NURURfREFURV9XT1JEX1dJTkRPVyA9IDMwMDtcclxuY29uc3QgREFZX01TID0gODZfNDAwXzAwMDtcclxuXHJcbmNvbnN0IE5VTUVSSUNfREFURSA9IC8oPzwhW1xcdy5cXC8kLV0pKFxcZHsxLDJ9KShbXFwvLlxcLV0pKFxcZHsxLDJ9KVxcMihcXGR7NH0pKD8hW1xcdyVdfFsuXFwvLV1cXGQpL2c7XHJcblxyXG5mdW5jdGlvbiBwYWQodmFsdWU6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgcmV0dXJuIFN0cmluZyh2YWx1ZSkucGFkU3RhcnQoMiwgXCIwXCIpO1xyXG59XHJcblxyXG4vKiogWWVhci1sZXNzIGZvcm1zIChcIjUgTWF5XCIsIFwiTWF5IDVcIikgb25seSBjb3VudCB3aXRoIGEgY2FwaXRhbGlzZWQgbW9udGgsIHNvIFwiY29zdHMgNSBtYXkgcmlzZVwiIGlzIG5vIGRhdGUuICovXHJcbmZ1bmN0aW9uIGNhcGl0YWxpc2VkKG1vbnRoTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgcmV0dXJuIC9eW0EtWl0vLnRlc3QobW9udGhOYW1lKTtcclxufVxyXG5cclxuZnVuY3Rpb24gbW9udGhJbmRleChuYW1lOiBzdHJpbmcpOiBudW1iZXIge1xyXG4gIHJldHVybiBNT05USF9LRVlTLmluZGV4T2YobmFtZS5zbGljZSgwLCAzKS50b0xvd2VyQ2FzZSgpKSArIDE7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNpbmdsZURheSh5ZWFyOiBudW1iZXIsIG1vbnRoOiBudW1iZXIsIGRheU9mTW9udGg6IG51bWJlcik6IERhdGVSYW5nZSB8IG51bGwge1xyXG4gIGlmIChtb250aCA8IDEgfHwgbW9udGggPiAxMiB8fCBkYXlPZk1vbnRoIDwgMSB8fCBkYXlPZk1vbnRoID4gMzEpIHJldHVybiBudWxsO1xyXG4gIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShEYXRlLlVUQyh5ZWFyLCBtb250aCAtIDEsIGRheU9mTW9udGgpKTtcclxuICBpZiAoZGF0ZS5nZXRVVENNb250aCgpICE9PSBtb250aCAtIDEgfHwgZGF0ZS5nZXRVVENEYXRlKCkgIT09IGRheU9mTW9udGgpIHJldHVybiBudWxsO1xyXG4gIGNvbnN0IGlzbyA9IGAke3llYXJ9LSR7cGFkKG1vbnRoKX0tJHtwYWQoZGF5T2ZNb250aCl9YDtcclxuICByZXR1cm4geyBzdGFydDogaXNvLCBlbmQ6IGlzbyB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBtb250aFJhbmdlKHllYXI6IG51bWJlciwgbW9udGg6IG51bWJlcik6IERhdGVSYW5nZSB7XHJcbiAgY29uc3QgbGFzdERheSA9IG5ldyBEYXRlKERhdGUuVVRDKHllYXIsIG1vbnRoLCAwKSkuZ2V0VVRDRGF0ZSgpO1xyXG4gIHJldHVybiB7IHN0YXJ0OiBgJHt5ZWFyfS0ke3BhZChtb250aCl9LTAxYCwgZW5kOiBgJHt5ZWFyfS0ke3BhZChtb250aCl9LSR7cGFkKGxhc3REYXkpfWAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gcXVhcnRlclJhbmdlKHllYXI6IG51bWJlciwgcXVhcnRlcjogbnVtYmVyKTogRGF0ZVJhbmdlIHtcclxuICBjb25zdCBzdGFydE1vbnRoID0gKHF1YXJ0ZXIgLSAxKSAqIDMgKyAxO1xyXG4gIGNvbnN0IGVuZE1vbnRoID0gc3RhcnRNb250aCArIDI7XHJcbiAgY29uc3QgbGFzdERheSA9IG5ldyBEYXRlKERhdGUuVVRDKHllYXIsIGVuZE1vbnRoLCAwKSkuZ2V0VVRDRGF0ZSgpO1xyXG4gIHJldHVybiB7IHN0YXJ0OiBgJHt5ZWFyfS0ke3BhZChzdGFydE1vbnRoKX0tMDFgLCBlbmQ6IGAke3llYXJ9LSR7cGFkKGVuZE1vbnRoKX0tJHtwYWQobGFzdERheSl9YCB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBleHBhbmRUd29EaWdpdFllYXIodmFsdWU6IHN0cmluZyk6IG51bWJlciB7XHJcbiAgY29uc3QgbiA9IE51bWJlcih2YWx1ZSk7XHJcbiAgcmV0dXJuIG4gPCA3MCA/IDIwMDAgKyBuIDogMTkwMCArIG47XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRheXNBcGFydChpc286IHN0cmluZywgcmVmZXJlbmNlOiBEYXRlKTogbnVtYmVyIHtcclxuICBjb25zdCBbeWVhciwgbW9udGgsIGRheU9mTW9udGhdID0gaXNvLnNwbGl0KFwiLVwiKS5tYXAoTnVtYmVyKTtcclxuICBjb25zdCByZWZlcmVuY2VEYXkgPSBEYXRlLlVUQyhyZWZlcmVuY2UuZ2V0RnVsbFllYXIoKSwgcmVmZXJlbmNlLmdldE1vbnRoKCksIHJlZmVyZW5jZS5nZXREYXRlKCkpO1xyXG4gIHJldHVybiBNYXRoLmFicyhEYXRlLlVUQyh5ZWFyLCBtb250aCAtIDEsIGRheU9mTW9udGgpIC0gcmVmZXJlbmNlRGF5KSAvIERBWV9NUztcclxufVxyXG5cclxuZnVuY3Rpb24gcHJlc2VudChyYW5nZXM6IEFycmF5PERhdGVSYW5nZSB8IG51bGw+KTogRGF0ZVJhbmdlW10ge1xyXG4gIHJldHVybiByYW5nZXMuZmlsdGVyKChyYW5nZSk6IHJhbmdlIGlzIERhdGVSYW5nZSA9PiByYW5nZSAhPT0gbnVsbCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlc29sdmVOdW1lcmljKGZpcnN0OiBudW1iZXIsIHNlY29uZDogbnVtYmVyLCB5ZWFyOiBudW1iZXIsIGNvbnRleHQ6IERhdGVDb250ZXh0KTogRGF0ZVJhbmdlW10ge1xyXG4gIGNvbnN0IGRheUZpcnN0ID0gc2luZ2xlRGF5KHllYXIsIHNlY29uZCwgZmlyc3QpO1xyXG4gIGNvbnN0IG1vbnRoRmlyc3QgPSBzaW5nbGVEYXkoeWVhciwgZmlyc3QsIHNlY29uZCk7XHJcbiAgaWYgKCFkYXlGaXJzdCAmJiAhbW9udGhGaXJzdCkgcmV0dXJuIFtdO1xyXG4gIGlmICghZGF5Rmlyc3QpIHJldHVybiBbbW9udGhGaXJzdCFdO1xyXG4gIGlmICghbW9udGhGaXJzdCkgcmV0dXJuIFtkYXlGaXJzdF07XHJcbiAgaWYgKGZpcnN0ID09PSBzZWNvbmQpIHJldHVybiBbZGF5Rmlyc3RdO1xyXG4gIGlmIChjb250ZXh0Lm9yZGVyKSByZXR1cm4gW2NvbnRleHQub3JkZXIgPT09IFwiZGF5LWZpcnN0XCIgPyBkYXlGaXJzdCA6IG1vbnRoRmlyc3RdO1xyXG4gIGlmIChjb250ZXh0LnJlZmVyZW5jZVRpbWUpIHtcclxuICAgIGNvbnN0IGRheUNsb3NlID0gZGF5c0FwYXJ0KGRheUZpcnN0LnN0YXJ0LCBjb250ZXh0LnJlZmVyZW5jZVRpbWUpIDw9IEFNQklHVUlUWV9XSU5ET1dfREFZUztcclxuICAgIGNvbnN0IG1vbnRoQ2xvc2UgPSBkYXlzQXBhcnQobW9udGhGaXJzdC5zdGFydCwgY29udGV4dC5yZWZlcmVuY2VUaW1lKSA8PSBBTUJJR1VJVFlfV0lORE9XX0RBWVM7XHJcbiAgICBpZiAoZGF5Q2xvc2UgIT09IG1vbnRoQ2xvc2UpIHJldHVybiBbZGF5Q2xvc2UgPyBkYXlGaXJzdCA6IG1vbnRoRmlyc3RdO1xyXG4gIH1cclxuICByZXR1cm4gW2RheUZpcnN0LCBtb250aEZpcnN0XTtcclxufVxyXG5cclxuaW50ZXJmYWNlIFBhdHRlcm5SdWxlIHtcclxuICByZWdleDogUmVnRXhwO1xyXG4gIGZpbGVOYW1lT25seT86IGJvb2xlYW47XHJcbiAgdG9SYW5nZXM6IChtYXRjaDogUmVnRXhwTWF0Y2hBcnJheSwgY29udGV4dDogRGF0ZUNvbnRleHQpID0+IERhdGVSYW5nZVtdO1xyXG59XHJcblxyXG5jb25zdCBSVUxFUzogUGF0dGVyblJ1bGVbXSA9IFtcclxuICB7XHJcbiAgICByZWdleDogLyg/PCFbXFx3LlxcLy1dKShcXGR7NH0pWy1cXC9dKFxcZHsxLDJ9KVstXFwvXShcXGR7MSwyfSkoPyFbXFx3JV18Wy5cXC8tXVxcZCkvZyxcclxuICAgIHRvUmFuZ2VzOiAobSkgPT4gcHJlc2VudChbc2luZ2xlRGF5KE51bWJlcihtWzFdKSwgTnVtYmVyKG1bMl0pLCBOdW1iZXIobVszXSkpXSksXHJcbiAgfSxcclxuICB7XHJcbiAgICByZWdleDogLyg/PCFcXGQpKCg/OjE5fDIwKVxcZHsyfSkoXFxkezJ9KShcXGR7Mn0pKD8hXFxkKS9nLFxyXG4gICAgZmlsZU5hbWVPbmx5OiB0cnVlLFxyXG4gICAgdG9SYW5nZXM6IChtKSA9PiBwcmVzZW50KFtzaW5nbGVEYXkoTnVtYmVyKG1bMV0pLCBOdW1iZXIobVsyXSksIE51bWJlcihtWzNdKSldKSxcclxuICB9LFxyXG4gIHtcclxuICAgIHJlZ2V4OiBOVU1FUklDX0RBVEUsXHJcbiAgICB0b1JhbmdlczogKG0sIGNvbnRleHQpID0+IHJlc29sdmVOdW1lcmljKE51bWJlcihtWzFdKSwgTnVtYmVyKG1bM10pLCBOdW1iZXIobVs0XSksIGNvbnRleHQpLFxyXG4gIH0sXHJcbiAge1xyXG4gICAgcmVnZXg6IC8oPzwhW1xcd10pKD86UShbMS00XSlbXFxzLV0qKFxcZHs0fSl8KFxcZHs0fSlbXFxzLV0qUShbMS00XSkpKD8hW1xcd10pL2dpLFxyXG4gICAgdG9SYW5nZXM6IChtKSA9PiBbcXVhcnRlclJhbmdlKE51bWJlcihtWzJdID8/IG1bM10pLCBOdW1iZXIobVsxXSA/PyBtWzRdKSldLFxyXG4gIH0sXHJcbiAge1xyXG4gICAgcmVnZXg6IG5ldyBSZWdFeHAoXHJcbiAgICAgIGAoPzwhW1xcXFx3XSkoXFxcXGR7MSwyfSkoPzpzdHxuZHxyZHx0aCk/W1xcXFxzLV0rKCR7TU9OVEhfUEFUVEVSTn0pXFxcXC4/KD86LD9cXFxccysoXFxcXGR7NH0pfC0oXFxcXGR7Mn0pKT8oPyFbXFxcXHddKWAsXHJcbiAgICAgIFwiZ2lcIixcclxuICAgICksXHJcbiAgICB0b1JhbmdlczogKG0sIGNvbnRleHQpID0+IHtcclxuICAgICAgY29uc3QgeWVhciA9IG1bM10gPyBOdW1iZXIobVszXSkgOiBtWzRdID8gZXhwYW5kVHdvRGlnaXRZZWFyKG1bNF0pIDogY29udGV4dC5kZWZhdWx0WWVhcjtcclxuICAgICAgaWYgKHllYXIgPT09IHVuZGVmaW5lZCkgcmV0dXJuIFtdO1xyXG4gICAgICBpZiAoIW1bM10gJiYgIW1bNF0gJiYgIWNhcGl0YWxpc2VkKG1bMl0pKSByZXR1cm4gW107XHJcbiAgICAgIHJldHVybiBwcmVzZW50KFtzaW5nbGVEYXkoeWVhciwgbW9udGhJbmRleChtWzJdKSwgTnVtYmVyKG1bMV0pKV0pO1xyXG4gICAgfSxcclxuICB9LFxyXG4gIHtcclxuICAgIHJlZ2V4OiBuZXcgUmVnRXhwKGAoPzwhW1xcXFx3XSkoJHtNT05USF9QQVRURVJOfSlcXFxcLj9cXFxccysoXFxcXGR7MSwyfSkoPzpzdHxuZHxyZHx0aCk/KD86LD9cXFxccysoXFxcXGR7NH0pKT8oPyFbXFxcXHddKWAsIFwiZ2lcIiksXHJcbiAgICB0b1JhbmdlczogKG0sIGNvbnRleHQpID0+IHtcclxuICAgICAgY29uc3QgeWVhciA9IG1bM10gPyBOdW1iZXIobVszXSkgOiBjb250ZXh0LmRlZmF1bHRZZWFyO1xyXG4gICAgICBpZiAoeWVhciA9PT0gdW5kZWZpbmVkKSByZXR1cm4gW107XHJcbiAgICAgIGlmICghbVszXSAmJiAhY2FwaXRhbGlzZWQobVsxXSkpIHJldHVybiBbXTtcclxuICAgICAgcmV0dXJuIHByZXNlbnQoW3NpbmdsZURheSh5ZWFyLCBtb250aEluZGV4KG1bMV0pLCBOdW1iZXIobVsyXSkpXSk7XHJcbiAgICB9LFxyXG4gIH0sXHJcbiAge1xyXG4gICAgcmVnZXg6IG5ldyBSZWdFeHAoYCg/PCFbXFxcXHddKSgke01PTlRIX1BBVFRFUk59KVxcXFwuPyw/XFxcXHMrKFxcXFxkezR9KSg/IVtcXFxcd10pYCwgXCJnaVwiKSxcclxuICAgIHRvUmFuZ2VzOiAobSkgPT4gW21vbnRoUmFuZ2UoTnVtYmVyKG1bMl0pLCBtb250aEluZGV4KG1bMV0pKV0sXHJcbiAgfSxcclxuXTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBkZWR1cGVSYW5nZXMocmFuZ2VzOiBEYXRlUmFuZ2VbXSk6IERhdGVSYW5nZVtdIHtcclxuICBjb25zdCBzZWVuID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcbiAgY29uc3QgdW5pcXVlOiBEYXRlUmFuZ2VbXSA9IFtdO1xyXG4gIGZvciAoY29uc3QgcmFuZ2Ugb2YgcmFuZ2VzKSB7XHJcbiAgICBjb25zdCBrZXkgPSBgJHtyYW5nZS5zdGFydH0vJHtyYW5nZS5lbmR9YDtcclxuICAgIGlmICghc2Vlbi5oYXMoa2V5KSkge1xyXG4gICAgICBzZWVuLmFkZChrZXkpO1xyXG4gICAgICB1bmlxdWUucHVzaChyYW5nZSk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiB1bmlxdWU7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0RGF0ZXModGV4dDogc3RyaW5nLCBjb250ZXh0OiBEYXRlQ29udGV4dCA9IHt9KTogRGF0ZVJhbmdlW10ge1xyXG4gIGNvbnN0IGZvdW5kOiBBcnJheTx7IHN0YXJ0OiBudW1iZXI7IGVuZDogbnVtYmVyOyByYW5nZXM6IERhdGVSYW5nZVtdIH0+ID0gW107XHJcbiAgY29uc3Qgb3ZlcmxhcHMgPSAoc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIpID0+IGZvdW5kLnNvbWUoKGYpID0+IHN0YXJ0IDwgZi5lbmQgJiYgZW5kID4gZi5zdGFydCk7XHJcblxyXG4gIGZvciAoY29uc3QgcnVsZSBvZiBSVUxFUykge1xyXG4gICAgaWYgKHJ1bGUuZmlsZU5hbWVPbmx5ICYmICFjb250ZXh0LmZpbGVOYW1lKSBjb250aW51ZTtcclxuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgdGV4dC5tYXRjaEFsbChydWxlLnJlZ2V4KSkge1xyXG4gICAgICBjb25zdCBzdGFydCA9IG1hdGNoLmluZGV4ID8/IDA7XHJcbiAgICAgIGNvbnN0IGVuZCA9IHN0YXJ0ICsgbWF0Y2hbMF0ubGVuZ3RoO1xyXG4gICAgICBpZiAob3ZlcmxhcHMoc3RhcnQsIGVuZCkpIGNvbnRpbnVlO1xyXG4gICAgICBjb25zdCByYW5nZXMgPSBydWxlLnRvUmFuZ2VzKG1hdGNoLCBjb250ZXh0KTtcclxuICAgICAgaWYgKHJhbmdlcy5sZW5ndGggPiAwKSBmb3VuZC5wdXNoKHsgc3RhcnQsIGVuZCwgcmFuZ2VzIH0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZm91bmQuc29ydCgoYSwgYikgPT4gYS5zdGFydCAtIGIuc3RhcnQpO1xyXG4gIHJldHVybiBkZWR1cGVSYW5nZXMoZm91bmQuZmxhdE1hcCgoZikgPT4gZi5yYW5nZXMpKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGRldGVjdERheU1vbnRoT3JkZXIodGV4dDogc3RyaW5nKTogRGF5TW9udGhPcmRlciB8IHVuZGVmaW5lZCB7XHJcbiAgY29uc3Qgc2VlbiA9IG5ldyBTZXQ8RGF5TW9udGhPcmRlcj4oKTtcclxuICBmb3IgKGNvbnN0IG1hdGNoIG9mIHRleHQubWF0Y2hBbGwoTlVNRVJJQ19EQVRFKSkge1xyXG4gICAgY29uc3QgZmlyc3QgPSBOdW1iZXIobWF0Y2hbMV0pO1xyXG4gICAgY29uc3Qgc2Vjb25kID0gTnVtYmVyKG1hdGNoWzNdKTtcclxuICAgIGlmIChmaXJzdCA+IDEyICYmIHNlY29uZCA8PSAxMikgc2Vlbi5hZGQoXCJkYXktZmlyc3RcIik7XHJcbiAgICBlbHNlIGlmIChzZWNvbmQgPiAxMiAmJiBmaXJzdCA8PSAxMikgc2Vlbi5hZGQoXCJtb250aC1maXJzdFwiKTtcclxuICB9XHJcbiAgcmV0dXJuIHNlZW4uc2l6ZSA9PT0gMSA/IFsuLi5zZWVuXVswXSA6IHVuZGVmaW5lZDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGRheVJhbmdlT2YoZGF0ZTogRGF0ZSk6IERhdGVSYW5nZSB7XHJcbiAgY29uc3QgaXNvID0gYCR7ZGF0ZS5nZXRGdWxsWWVhcigpfS0ke3BhZChkYXRlLmdldE1vbnRoKCkgKyAxKX0tJHtwYWQoZGF0ZS5nZXREYXRlKCkpfWA7XHJcbiAgcmV0dXJuIHsgc3RhcnQ6IGlzbywgZW5kOiBpc28gfTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGRvY3VtZW50UG9zdGVkRGF0ZShtYXJrZG93bjogc3RyaW5nLCBmaWxlTmFtZTogc3RyaW5nLCBmaWxlTW9kaWZpZWRUaW1lOiBEYXRlKTogRGF0ZVJhbmdlIHtcclxuICBjb25zdCBjb250ZXh0OiBEYXRlQ29udGV4dCA9IHsgb3JkZXI6IGRldGVjdERheU1vbnRoT3JkZXIobWFya2Rvd24pLCByZWZlcmVuY2VUaW1lOiBmaWxlTW9kaWZpZWRUaW1lIH07XHJcblxyXG4gIGNvbnN0IG9wZW5pbmcgPSBtYXJrZG93bi5zcGxpdCgvXFxzKy8pLmZpbHRlcihCb29sZWFuKS5zbGljZSgwLCBQT1NURURfREFURV9XT1JEX1dJTkRPVykuam9pbihcIiBcIik7XHJcbiAgY29uc3QgZnJvbVRleHQgPSBleHRyYWN0RGF0ZXMob3BlbmluZywgY29udGV4dClbMF07XHJcbiAgaWYgKGZyb21UZXh0KSByZXR1cm4gZnJvbVRleHQ7XHJcblxyXG4gIGNvbnN0IGJhc2VOYW1lID0gZmlsZU5hbWUucmVwbGFjZSgvXFwuW14uXSskLywgXCJcIikucmVwbGFjZSgvXysvZywgXCIgXCIpO1xyXG4gIGNvbnN0IGZyb21OYW1lID0gZXh0cmFjdERhdGVzKGJhc2VOYW1lLCB7IC4uLmNvbnRleHQsIGZpbGVOYW1lOiB0cnVlIH0pWzBdO1xyXG4gIGlmIChmcm9tTmFtZSkgcmV0dXJuIGZyb21OYW1lO1xyXG5cclxuICByZXR1cm4gZGF5UmFuZ2VPZihmaWxlTW9kaWZpZWRUaW1lKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdERhdGVSYW5nZShyYW5nZTogRGF0ZVJhbmdlKTogc3RyaW5nIHtcclxuICByZXR1cm4gcmFuZ2Uuc3RhcnQgPT09IHJhbmdlLmVuZCA/IHJhbmdlLnN0YXJ0IDogYCR7cmFuZ2Uuc3RhcnR9XHUyMDEzJHtyYW5nZS5lbmR9YDtcclxufVxyXG4iLCAiaW1wb3J0IHsgZXh0cmFjdERhdGVzLCB0eXBlIERhdGVDb250ZXh0LCB0eXBlIERhdGVSYW5nZSB9IGZyb20gXCIuLi9tZXRhZGF0YS9kYXRlc1wiO1xyXG5cclxuZXhwb3J0IHR5cGUgQmxvY2tLaW5kID0gXCJoZWFkaW5nXCIgfCBcInBhcmFncmFwaFwiIHwgXCJsaXN0SXRlbVwiIHwgXCJ0YWJsZVJvd1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBCbG9jayB7XHJcbiAga2luZDogQmxvY2tLaW5kO1xyXG4gIHRleHQ6IHN0cmluZztcclxuICAvKiogSGVhZGluZzogbnVtYmVyIG9mIGAjYC4gTGlzdCBpdGVtOiBpbmRlbnQgZGVwdGguIE90aGVyd2lzZSAwLiAqL1xyXG4gIGxldmVsOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgU2VjdGlvbiB7XHJcbiAgcGF0aDogc3RyaW5nW107XHJcbiAgZGF0ZXM6IERhdGVSYW5nZVtdO1xyXG4gIGJsb2NrczogQmxvY2tbXTtcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IE1BWF9USVRMRV9DSEFSUyA9IDgwO1xyXG5cclxuY29uc3QgSEVBRElORyA9IC9eKCN7MSw2fSlcXHMrKC4qXFxTKVxccyokLztcclxuY29uc3QgTElTVF9JVEVNID0gL14oWyBcXHRdKikoPzotfFxcZHsxLDN9XFwufFthLXpdXFwuKVsgXFx0XStcXFMvO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlQmxvY2tzKG1hcmtkb3duOiBzdHJpbmcpOiBCbG9ja1tdIHtcclxuICBjb25zdCBibG9ja3M6IEJsb2NrW10gPSBbXTtcclxuICBsZXQgcGFyYWdyYXBoOiBzdHJpbmdbXSA9IFtdO1xyXG4gIGxldCBsYXN0V2FzTGlzdEl0ZW0gPSBmYWxzZTtcclxuXHJcbiAgY29uc3QgZmx1c2hQYXJhZ3JhcGggPSAoKSA9PiB7XHJcbiAgICBpZiAocGFyYWdyYXBoLmxlbmd0aCA+IDApIHtcclxuICAgICAgYmxvY2tzLnB1c2goeyBraW5kOiBcInBhcmFncmFwaFwiLCB0ZXh0OiBwYXJhZ3JhcGguam9pbihcIiBcIiksIGxldmVsOiAwIH0pO1xyXG4gICAgICBwYXJhZ3JhcGggPSBbXTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICBmb3IgKGNvbnN0IHJhd0xpbmUgb2YgbWFya2Rvd24ucmVwbGFjZSgvXFxyXFxuPy9nLCBcIlxcblwiKS5zcGxpdChcIlxcblwiKSkge1xyXG4gICAgY29uc3QgbGluZSA9IHJhd0xpbmUucmVwbGFjZSgvXFxzKyQvLCBcIlwiKTtcclxuICAgIGNvbnN0IHRyaW1tZWQgPSBsaW5lLnRyaW0oKTtcclxuICAgIGlmICh0cmltbWVkID09PSBcIlwiKSB7XHJcbiAgICAgIGZsdXNoUGFyYWdyYXBoKCk7XHJcbiAgICAgIGxhc3RXYXNMaXN0SXRlbSA9IGZhbHNlO1xyXG4gICAgICBjb250aW51ZTtcclxuICAgIH1cclxuICAgIGNvbnN0IGhlYWRpbmcgPSBIRUFESU5HLmV4ZWModHJpbW1lZCk7XHJcbiAgICBpZiAoaGVhZGluZykge1xyXG4gICAgICBmbHVzaFBhcmFncmFwaCgpO1xyXG4gICAgICBibG9ja3MucHVzaCh7IGtpbmQ6IFwiaGVhZGluZ1wiLCB0ZXh0OiBoZWFkaW5nWzJdLCBsZXZlbDogaGVhZGluZ1sxXS5sZW5ndGggfSk7XHJcbiAgICAgIGxhc3RXYXNMaXN0SXRlbSA9IGZhbHNlO1xyXG4gICAgICBjb250aW51ZTtcclxuICAgIH1cclxuICAgIGNvbnN0IGxpc3QgPSBMSVNUX0lURU0uZXhlYyhsaW5lKTtcclxuICAgIGlmIChsaXN0KSB7XHJcbiAgICAgIGZsdXNoUGFyYWdyYXBoKCk7XHJcbiAgICAgIGJsb2Nrcy5wdXNoKHsga2luZDogXCJsaXN0SXRlbVwiLCB0ZXh0OiB0cmltbWVkLCBsZXZlbDogTWF0aC5mbG9vcihsaXN0WzFdLmxlbmd0aCAvIDIpIH0pO1xyXG4gICAgICBsYXN0V2FzTGlzdEl0ZW0gPSB0cnVlO1xyXG4gICAgICBjb250aW51ZTtcclxuICAgIH1cclxuICAgIGlmICh0cmltbWVkLmluY2x1ZGVzKFwiIHwgXCIpKSB7XHJcbiAgICAgIGZsdXNoUGFyYWdyYXBoKCk7XHJcbiAgICAgIGJsb2Nrcy5wdXNoKHsga2luZDogXCJ0YWJsZVJvd1wiLCB0ZXh0OiB0cmltbWVkLCBsZXZlbDogMCB9KTtcclxuICAgICAgbGFzdFdhc0xpc3RJdGVtID0gZmFsc2U7XHJcbiAgICAgIGNvbnRpbnVlO1xyXG4gICAgfVxyXG4gICAgaWYgKGxhc3RXYXNMaXN0SXRlbSkge1xyXG4gICAgICBjb25zdCBsYXN0ID0gYmxvY2tzW2Jsb2Nrcy5sZW5ndGggLSAxXTtcclxuICAgICAgbGFzdC50ZXh0ID0gYCR7bGFzdC50ZXh0fSAke3RyaW1tZWR9YDtcclxuICAgICAgY29udGludWU7XHJcbiAgICB9XHJcbiAgICBwYXJhZ3JhcGgucHVzaCh0cmltbWVkKTtcclxuICB9XHJcbiAgZmx1c2hQYXJhZ3JhcGgoKTtcclxuICByZXR1cm4gYmxvY2tzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyQmxvY2soYmxvY2s6IEJsb2NrKTogc3RyaW5nIHtcclxuICBpZiAoYmxvY2sua2luZCA9PT0gXCJoZWFkaW5nXCIpIHJldHVybiBgJHtcIiNcIi5yZXBlYXQoYmxvY2subGV2ZWwpfSAke2Jsb2NrLnRleHR9YDtcclxuICBpZiAoYmxvY2sua2luZCA9PT0gXCJsaXN0SXRlbVwiKSByZXR1cm4gYCR7XCIgIFwiLnJlcGVhdChibG9jay5sZXZlbCl9JHtibG9jay50ZXh0fWA7XHJcbiAgcmV0dXJuIGJsb2NrLnRleHQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxlYWRpbmdUZXh0KHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgcmV0dXJuIHRleHQubGVuZ3RoID4gTUFYX1RJVExFX0NIQVJTID8gdGV4dC5zbGljZSgwLCBNQVhfVElUTEVfQ0hBUlMpLnRyaW1FbmQoKSA6IHRleHQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTcGxpdHMgTWFya2Rvd24gaW50byBzZWN0aW9uczogYSBoZWFkaW5nIGFuZCBpdHMgY29udGVudCB1bnRpbCB0aGUgbmV4dFxyXG4gKiBoZWFkaW5nIG9mIHRoZSBzYW1lIG9yIGhpZ2hlciBsZXZlbCwgb3IgYSB0b3AtbGV2ZWwgbGlzdCBpdGVtIHVudGlsIHRoZVxyXG4gKiBuZXh0IHRvcC1sZXZlbCBsaXN0IGl0ZW0gb3IgaGVhZGluZy4gQSBzZWN0aW9uJ3MgZGF0ZXMgY29tZSBmcm9tIGl0c1xyXG4gKiBoZWFkaW5nIChvciBsaXN0IGl0ZW0pIHRleHQsIGVsc2UgdGhlIGZpcnN0IGNvbnRlbnQgYmxvY2sgb2YgYSBoZWFkaW5nXHJcbiAqIHNlY3Rpb24sIGVsc2UgaXRzIHBhcmVudCBoZWFkaW5nOyBpbmhlcml0YW5jZSBlbmRzIHdpdGggdGhlIHNlY3Rpb24uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRTZWN0aW9ucyhtYXJrZG93bjogc3RyaW5nLCBjb250ZXh0OiBEYXRlQ29udGV4dCwgd2l0aERhdGVzID0gdHJ1ZSk6IFNlY3Rpb25bXSB7XHJcbiAgY29uc3QgZGF0ZXNPZiA9ICh0ZXh0OiBzdHJpbmcpOiBEYXRlUmFuZ2VbXSA9PiAod2l0aERhdGVzID8gZXh0cmFjdERhdGVzKGxlYWRpbmdUZXh0KHRleHQpLCBjb250ZXh0KSA6IFtdKTtcclxuICBjb25zdCBzZWN0aW9uczogU2VjdGlvbltdID0gW107XHJcbiAgY29uc3QgaGVhZGluZ1N0YWNrOiBBcnJheTx7IGxldmVsOiBudW1iZXI7IHRpdGxlOiBzdHJpbmc7IGRhdGVzOiBEYXRlUmFuZ2VbXSB9PiA9IFtdO1xyXG4gIGNvbnN0IHN0YXRlOiB7IGN1cnJlbnQ6IFNlY3Rpb24gfCBudWxsOyBpc0hlYWRpbmc6IGJvb2xlYW47IGhhc093bkRhdGVzOiBib29sZWFuIH0gPSB7XHJcbiAgICBjdXJyZW50OiBudWxsLFxyXG4gICAgaXNIZWFkaW5nOiBmYWxzZSxcclxuICAgIGhhc093bkRhdGVzOiBmYWxzZSxcclxuICB9O1xyXG5cclxuICBjb25zdCBpbmhlcml0ZWREYXRlcyA9ICgpOiBEYXRlUmFuZ2VbXSA9PlxyXG4gICAgaGVhZGluZ1N0YWNrLmxlbmd0aCA+IDAgPyBoZWFkaW5nU3RhY2tbaGVhZGluZ1N0YWNrLmxlbmd0aCAtIDFdLmRhdGVzIDogW107XHJcblxyXG4gIGNvbnN0IHN0YXJ0U2VjdGlvbiA9IChzZWN0aW9uOiBTZWN0aW9uLCBpc0hlYWRpbmc6IGJvb2xlYW4sIGhhc093bkRhdGVzOiBib29sZWFuKSA9PiB7XHJcbiAgICBpZiAoc3RhdGUuY3VycmVudCAmJiBzdGF0ZS5jdXJyZW50LmJsb2Nrcy5sZW5ndGggPiAwKSBzZWN0aW9ucy5wdXNoKHN0YXRlLmN1cnJlbnQpO1xyXG4gICAgc3RhdGUuY3VycmVudCA9IHNlY3Rpb247XHJcbiAgICBzdGF0ZS5pc0hlYWRpbmcgPSBpc0hlYWRpbmc7XHJcbiAgICBzdGF0ZS5oYXNPd25EYXRlcyA9IGhhc093bkRhdGVzO1xyXG4gIH07XHJcblxyXG4gIGZvciAoY29uc3QgYmxvY2sgb2YgcGFyc2VCbG9ja3MobWFya2Rvd24pKSB7XHJcbiAgICBpZiAoYmxvY2sua2luZCA9PT0gXCJoZWFkaW5nXCIpIHtcclxuICAgICAgd2hpbGUgKGhlYWRpbmdTdGFjay5sZW5ndGggPiAwICYmIGhlYWRpbmdTdGFja1toZWFkaW5nU3RhY2subGVuZ3RoIC0gMV0ubGV2ZWwgPj0gYmxvY2subGV2ZWwpIHtcclxuICAgICAgICBoZWFkaW5nU3RhY2sucG9wKCk7XHJcbiAgICAgIH1cclxuICAgICAgY29uc3Qgb3duID0gZGF0ZXNPZihibG9jay50ZXh0KTtcclxuICAgICAgY29uc3QgZGF0ZXMgPSBvd24ubGVuZ3RoID4gMCA/IG93biA6IGluaGVyaXRlZERhdGVzKCk7XHJcbiAgICAgIGhlYWRpbmdTdGFjay5wdXNoKHsgbGV2ZWw6IGJsb2NrLmxldmVsLCB0aXRsZTogYmxvY2sudGV4dCwgZGF0ZXMgfSk7XHJcbiAgICAgIHN0YXJ0U2VjdGlvbih7IHBhdGg6IGhlYWRpbmdTdGFjay5tYXAoKGgpID0+IGgudGl0bGUpLCBkYXRlcywgYmxvY2tzOiBbYmxvY2tdIH0sIHRydWUsIG93bi5sZW5ndGggPiAwKTtcclxuICAgICAgY29udGludWU7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGJsb2NrLmtpbmQgPT09IFwibGlzdEl0ZW1cIiAmJiBibG9jay5sZXZlbCA9PT0gMCkge1xyXG4gICAgICBjb25zdCBvd24gPSBkYXRlc09mKGJsb2NrLnRleHQpO1xyXG4gICAgICBzdGFydFNlY3Rpb24oXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgcGF0aDogWy4uLmhlYWRpbmdTdGFjay5tYXAoKGgpID0+IGgudGl0bGUpLCBsZWFkaW5nVGV4dChibG9jay50ZXh0KV0sXHJcbiAgICAgICAgICBkYXRlczogb3duLmxlbmd0aCA+IDAgPyBvd24gOiBpbmhlcml0ZWREYXRlcygpLFxyXG4gICAgICAgICAgYmxvY2tzOiBbYmxvY2tdLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZmFsc2UsXHJcbiAgICAgICAgdHJ1ZSxcclxuICAgICAgKTtcclxuICAgICAgY29udGludWU7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFzdGF0ZS5jdXJyZW50KSB7XHJcbiAgICAgIHN0YXJ0U2VjdGlvbih7IHBhdGg6IFtdLCBkYXRlczogW10sIGJsb2NrczogW10gfSwgZmFsc2UsIGZhbHNlKTtcclxuICAgIH1cclxuICAgIGNvbnN0IGN1cnJlbnQgPSBzdGF0ZS5jdXJyZW50ITtcclxuICAgIGlmIChzdGF0ZS5pc0hlYWRpbmcgJiYgIXN0YXRlLmhhc093bkRhdGVzICYmIGN1cnJlbnQuYmxvY2tzLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICBjb25zdCBvd24gPSBkYXRlc09mKGJsb2NrLnRleHQpO1xyXG4gICAgICBpZiAob3duLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBjdXJyZW50LmRhdGVzID0gb3duO1xyXG4gICAgICAgIGhlYWRpbmdTdGFja1toZWFkaW5nU3RhY2subGVuZ3RoIC0gMV0uZGF0ZXMgPSBvd247XHJcbiAgICAgICAgc3RhdGUuaGFzT3duRGF0ZXMgPSB0cnVlO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBjdXJyZW50LmJsb2Nrcy5wdXNoKGJsb2NrKTtcclxuICB9XHJcblxyXG4gIGlmIChzdGF0ZS5jdXJyZW50ICYmIHN0YXRlLmN1cnJlbnQuYmxvY2tzLmxlbmd0aCA+IDApIHNlY3Rpb25zLnB1c2goc3RhdGUuY3VycmVudCk7XHJcbiAgcmV0dXJuIHNlY3Rpb25zO1xyXG59XHJcbiIsICJpbXBvcnQgeyB0eXBlIENvdW50VG9rZW5zIH0gZnJvbSBcIi4uL3V0aWxzL3RleHRDaHVua2VyXCI7XHJcbmltcG9ydCB7IGRlZHVwZVJhbmdlcywgZXh0cmFjdERhdGVzLCBmb3JtYXREYXRlUmFuZ2UsIHR5cGUgRGF0ZUNvbnRleHQsIHR5cGUgRGF0ZVJhbmdlIH0gZnJvbSBcIi4uL21ldGFkYXRhL2RhdGVzXCI7XHJcbmltcG9ydCB7IGJ1aWxkU2VjdGlvbnMsIHJlbmRlckJsb2NrLCB0eXBlIFNlY3Rpb24gfSBmcm9tIFwiLi9zZWN0aW9uc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBTdHJ1Y3R1cmVkQ2h1bmsge1xyXG4gIHRleHQ6IHN0cmluZztcclxuICBjb250ZXh0SGVhZGVyOiBzdHJpbmc7XHJcbiAgc2VjdGlvblBhdGg6IHN0cmluZztcclxuICBkYXRlczogRGF0ZVJhbmdlW107XHJcbiAgc3RhcnRJbmRleDogbnVtYmVyO1xyXG4gIGVuZEluZGV4OiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgU3RydWN0dXJlZENodW5rT3B0aW9ucyB7XHJcbiAgZmlsZU5hbWU6IHN0cmluZztcclxuICBwb3N0ZWREYXRlOiBEYXRlUmFuZ2U7XHJcbiAgY2h1bmtTaXplOiBudW1iZXI7XHJcbiAgY2h1bmtPdmVybGFwOiBudW1iZXI7XHJcbiAgY291bnRUb2tlbnM6IENvdW50VG9rZW5zO1xyXG4gIGRhdGVDb250ZXh0OiBEYXRlQ29udGV4dDtcclxuICAvKiogU2V0IHRvIGZhbHNlIHRvIHNraXAgYWxsIGRhdGUgZXh0cmFjdGlvbiAoZmFsbGJhY2sgd2hlbiBleHRyYWN0aW9uIGZhaWxzKS4gKi9cclxuICBleHRyYWN0RGF0ZXM/OiBib29sZWFuO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgVG9rZW4ge1xyXG4gIHdvcmQ6IHN0cmluZztcclxuICAvKiogV2hpdGVzcGFjZSBhZnRlciB0aGUgd29yZDogbmV3bGluZSBhdCB0aGUgZW5kIG9mIGEgYmxvY2ssIG90aGVyd2lzZSBhIHNwYWNlLiAqL1xyXG4gIHNlcGFyYXRvcjogc3RyaW5nO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgU2VjdGlvblRva2VucyB7XHJcbiAgc2VjdGlvbjogU2VjdGlvbjtcclxuICB0b2tlbnM6IFRva2VuW107XHJcbiAgb2Zmc2V0OiBudW1iZXI7XHJcbiAgYmxvY2tFbmRzOiBudW1iZXJbXTtcclxuICBoZWFkaW5nRW5kOiBudW1iZXI7XHJcbiAgaGVhZGluZ0VuZHM6IG51bWJlcltdO1xyXG59XHJcblxyXG5mdW5jdGlvbiB3b3JkQ291bnQodGV4dDogc3RyaW5nKTogbnVtYmVyIHtcclxuICByZXR1cm4gdGV4dC5zcGxpdCgvXFxzKy8pLmZpbHRlcihCb29sZWFuKS5sZW5ndGg7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBidWlsZENvbnRleHRIZWFkZXIoXHJcbiAgZmlsZU5hbWU6IHN0cmluZyxcclxuICBwb3N0ZWREYXRlOiBEYXRlUmFuZ2UsXHJcbiAgc2VjdGlvblBhdGg6IHN0cmluZyxcclxuICBkYXRlczogRGF0ZVJhbmdlW10sXHJcbik6IHN0cmluZyB7XHJcbiAgY29uc3QgcGFydHMgPSBbYEZpbGU6ICR7ZmlsZU5hbWV9YCwgYFBvc3RlZDogJHtmb3JtYXREYXRlUmFuZ2UocG9zdGVkRGF0ZSl9YF07XHJcbiAgaWYgKHNlY3Rpb25QYXRoKSBwYXJ0cy5wdXNoKGBTZWN0aW9uOiAke3NlY3Rpb25QYXRofWApO1xyXG4gIGlmIChkYXRlcy5sZW5ndGggPiAwKSBwYXJ0cy5wdXNoKGBEYXRlczogJHtkYXRlcy5tYXAoZm9ybWF0RGF0ZVJhbmdlKS5qb2luKFwiLCBcIil9YCk7XHJcbiAgcmV0dXJuIGBbJHtwYXJ0cy5qb2luKFwiIHwgXCIpfV1gO1xyXG59XHJcblxyXG4vKipcclxuICogQSBoZWFkaW5nIHdpdGggbm90aGluZyB1bmRlciBpdCBpcyBjYXJyaWVkIGludG8gdGhlIG5leHQgc2VjdGlvbiBzbyBhIGhlYWRpbmcgbmV2ZXIgZW5kcyBhIGNodW5rLlxyXG4gKiBXaGVuIHRoYXQgbmV4dCBzZWN0aW9uIGlzIGEgbGlzdCBpdGVtLCB0aGUgbWVyZ2VkIHNlY3Rpb24ga2VlcHMgdGhlIGhlYWRpbmcncyBwYXRoOiB0aGUgc2VjdGlvblxyXG4gKiBub3cgYmVnaW5zIHdpdGggdGhlIGhlYWRpbmcsIGFuZCBsaXN0IGl0ZW1zIGNvbnRyaWJ1dGUgbm8gdGl0bGUgb2YgdGhlaXIgb3duIHRvIHRoZSBoZWFkZXIuXHJcbiAqL1xyXG5mdW5jdGlvbiBtZXJnZUhlYWRpbmdPbmx5U2VjdGlvbnMoc2VjdGlvbnM6IFNlY3Rpb25bXSk6IFNlY3Rpb25bXSB7XHJcbiAgY29uc3QgbWVyZ2VkOiBTZWN0aW9uW10gPSBbXTtcclxuICBsZXQgcGVuZGluZzogU2VjdGlvbiB8IG51bGwgPSBudWxsO1xyXG4gIGZvciAoY29uc3Qgc2VjdGlvbiBvZiBzZWN0aW9ucykge1xyXG4gICAgY29uc3QgaGVhZGluZ09ubHkgPSBzZWN0aW9uLmJsb2Nrcy5sZW5ndGggPT09IDEgJiYgc2VjdGlvbi5ibG9ja3NbMF0ua2luZCA9PT0gXCJoZWFkaW5nXCI7XHJcbiAgICBpZiAoaGVhZGluZ09ubHkpIHtcclxuICAgICAgcGVuZGluZyA9IHBlbmRpbmcgPyB7IC4uLnNlY3Rpb24sIGJsb2NrczogWy4uLnBlbmRpbmcuYmxvY2tzLCAuLi5zZWN0aW9uLmJsb2Nrc10gfSA6IHNlY3Rpb247XHJcbiAgICAgIGNvbnRpbnVlO1xyXG4gICAgfVxyXG4gICAgaWYgKHBlbmRpbmcpIHtcclxuICAgICAgY29uc3QgcGF0aCA9IHNlY3Rpb24uYmxvY2tzWzBdPy5raW5kID09PSBcImxpc3RJdGVtXCIgPyBwZW5kaW5nLnBhdGggOiBzZWN0aW9uLnBhdGg7XHJcbiAgICAgIG1lcmdlZC5wdXNoKHsgLi4uc2VjdGlvbiwgcGF0aCwgYmxvY2tzOiBbLi4ucGVuZGluZy5ibG9ja3MsIC4uLnNlY3Rpb24uYmxvY2tzXSB9KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIG1lcmdlZC5wdXNoKHNlY3Rpb24pO1xyXG4gICAgfVxyXG4gICAgcGVuZGluZyA9IG51bGw7XHJcbiAgfVxyXG4gIGlmIChwZW5kaW5nKSBtZXJnZWQucHVzaChwZW5kaW5nKTtcclxuICByZXR1cm4gbWVyZ2VkO1xyXG59XHJcblxyXG5mdW5jdGlvbiB0b2tlbml6ZVNlY3Rpb24oc2VjdGlvbjogU2VjdGlvbiwgb2Zmc2V0OiBudW1iZXIpOiBTZWN0aW9uVG9rZW5zIHtcclxuICBjb25zdCB0b2tlbnM6IFRva2VuW10gPSBbXTtcclxuICBjb25zdCBibG9ja0VuZHM6IG51bWJlcltdID0gW107XHJcbiAgY29uc3QgaGVhZGluZ0VuZHM6IG51bWJlcltdID0gW107XHJcbiAgbGV0IGhlYWRpbmdFbmQgPSAwO1xyXG4gIGxldCBpbkxlYWRpbmdIZWFkaW5nUnVuID0gdHJ1ZTtcclxuICBzZWN0aW9uLmJsb2Nrcy5mb3JFYWNoKChibG9jaykgPT4ge1xyXG4gICAgY29uc3QgYmxvY2tXb3JkcyA9IHJlbmRlckJsb2NrKGJsb2NrKS5zcGxpdCgvXFxzKy8pLmZpbHRlcihCb29sZWFuKTtcclxuICAgIGJsb2NrV29yZHMuZm9yRWFjaCgod29yZCwgaSkgPT4gdG9rZW5zLnB1c2goeyB3b3JkLCBzZXBhcmF0b3I6IGkgPT09IGJsb2NrV29yZHMubGVuZ3RoIC0gMSA/IFwiXFxuXCIgOiBcIiBcIiB9KSk7XHJcbiAgICBpZiAoYmxvY2sua2luZCA9PT0gXCJoZWFkaW5nXCIpIHtcclxuICAgICAgLy8gRXZlcnkgaGVhZGluZydzIGVuZCBpcyB0cmFja2VkIHNlcGFyYXRlbHkgc28gaXQgbmV2ZXIgYmVjb21lcyBhIHNwbGl0XHJcbiAgICAgIC8vIGJvdW5kYXJ5OyB0aGUgbGVhZGluZyBydW4gb2YgY29uc2VjdXRpdmUgaGVhZGluZ3MgYWxzbyBhZHZhbmNlc1xyXG4gICAgICAvLyBoZWFkaW5nRW5kIHNvIHRoZSBmaXJzdCBwaWVjZSBpcyBmb3JjZWQgcGFzdCBhbGwgb2YgdGhlbSBhdCBvbmNlLlxyXG4gICAgICBoZWFkaW5nRW5kcy5wdXNoKHRva2Vucy5sZW5ndGgpO1xyXG4gICAgICBpZiAoaW5MZWFkaW5nSGVhZGluZ1J1bikgaGVhZGluZ0VuZCA9IHRva2Vucy5sZW5ndGg7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBpbkxlYWRpbmdIZWFkaW5nUnVuID0gZmFsc2U7XHJcbiAgICAgIGJsb2NrRW5kcy5wdXNoKHRva2Vucy5sZW5ndGgpO1xyXG4gICAgfVxyXG4gIH0pO1xyXG4gIHJldHVybiB7IHNlY3Rpb24sIHRva2Vucywgb2Zmc2V0LCBibG9ja0VuZHMsIGhlYWRpbmdFbmQsIGhlYWRpbmdFbmRzIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRva2Vuc1RvVGV4dCh0b2tlbnM6IFRva2VuW10pOiBzdHJpbmcge1xyXG4gIHJldHVybiB0b2tlbnMubWFwKCh0b2tlbiwgaSkgPT4gKGkgPT09IHRva2Vucy5sZW5ndGggLSAxID8gdG9rZW4ud29yZCA6IHRva2VuLndvcmQgKyB0b2tlbi5zZXBhcmF0b3IpKS5qb2luKFwiXCIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZW50ZW5jZUVuZHModG9rZW5zOiBUb2tlbltdKTogbnVtYmVyW10ge1xyXG4gIGNvbnN0IGVuZHM6IG51bWJlcltdID0gW107XHJcbiAgdG9rZW5zLmZvckVhY2goKHRva2VuLCBpKSA9PiB7XHJcbiAgICBpZiAoL1suIT9dW1wiJylcXF1dKiQvLnRlc3QodG9rZW4ud29yZCkpIGVuZHMucHVzaChpICsgMSk7XHJcbiAgfSk7XHJcbiAgcmV0dXJuIGVuZHM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxhc3RCb3VuZGFyeShib3VuZHM6IG51bWJlcltdLCBsb3dlckV4Y2x1c2l2ZTogbnVtYmVyLCB1cHBlckluY2x1c2l2ZTogbnVtYmVyKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcclxuICBsZXQgYmVzdDogbnVtYmVyIHwgdW5kZWZpbmVkO1xyXG4gIGZvciAoY29uc3QgYm91bmQgb2YgYm91bmRzKSB7XHJcbiAgICBpZiAoYm91bmQgPiBsb3dlckV4Y2x1c2l2ZSAmJiBib3VuZCA8PSB1cHBlckluY2x1c2l2ZSkgYmVzdCA9IGJvdW5kO1xyXG4gIH1cclxuICByZXR1cm4gYmVzdDtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNodW5rU3RydWN0dXJlZChtYXJrZG93bjogc3RyaW5nLCBvcHRpb25zOiBTdHJ1Y3R1cmVkQ2h1bmtPcHRpb25zKTogUHJvbWlzZTxTdHJ1Y3R1cmVkQ2h1bmtbXT4ge1xyXG4gIGNvbnN0IHdpdGhEYXRlcyA9IG9wdGlvbnMuZXh0cmFjdERhdGVzICE9PSBmYWxzZTtcclxuICBjb25zdCBzZWN0aW9ucyA9IG1lcmdlSGVhZGluZ09ubHlTZWN0aW9ucyhidWlsZFNlY3Rpb25zKG1hcmtkb3duLCBvcHRpb25zLmRhdGVDb250ZXh0LCB3aXRoRGF0ZXMpKTtcclxuICBpZiAoc2VjdGlvbnMubGVuZ3RoID09PSAwKSByZXR1cm4gW107XHJcblxyXG4gIGNvbnN0IHRvdGFsV29yZHMgPSB3b3JkQ291bnQobWFya2Rvd24pO1xyXG4gIGNvbnN0IHRvdGFsVG9rZW5zID0gYXdhaXQgb3B0aW9ucy5jb3VudFRva2VucyhtYXJrZG93bik7XHJcbiAgY29uc3QgdG9rZW5zUGVyV29yZCA9IHRvdGFsVG9rZW5zID4gMCAmJiB0b3RhbFdvcmRzID4gMCA/IHRvdGFsVG9rZW5zIC8gdG90YWxXb3JkcyA6IDE7XHJcbiAgY29uc3QgYnVkZ2V0V29yZHMgPSBNYXRoLm1heCgxLCBNYXRoLnJvdW5kKG9wdGlvbnMuY2h1bmtTaXplIC8gdG9rZW5zUGVyV29yZCkpO1xyXG4gIGNvbnN0IG92ZXJsYXBXb3JkcyA9IE1hdGgubWF4KDAsIE1hdGgubWluKGJ1ZGdldFdvcmRzIC0gMSwgTWF0aC5yb3VuZChvcHRpb25zLmNodW5rT3ZlcmxhcCAvIHRva2Vuc1BlcldvcmQpKSk7XHJcblxyXG4gIGNvbnN0IHRleHREYXRlcyA9ICh0ZXh0OiBzdHJpbmcpOiBEYXRlUmFuZ2VbXSA9PiAod2l0aERhdGVzID8gZXh0cmFjdERhdGVzKHRleHQsIG9wdGlvbnMuZGF0ZUNvbnRleHQpIDogW10pO1xyXG5cclxuICBjb25zdCBkZXNjcmliZSA9IChncm91cDogU2VjdGlvbltdLCB0ZXh0OiBzdHJpbmcpID0+IHtcclxuICAgIGNvbnN0IFtmaXJzdCwgLi4ucmVzdF0gPSBncm91cDtcclxuICAgIGNvbnN0IGZpcnN0UGF0aCA9IGZpcnN0LnBhdGguam9pbihcIiA+IFwiKTtcclxuICAgIC8vIE9ubHkgcGFja2VkIHNlY3Rpb25zIHRoYXQgYmVnaW4gd2l0aCBhIGhlYWRpbmcgYWRkIHRoZWlyIHRpdGxlOyBsaXN0LWl0ZW0gc2VjdGlvbnMgYWRkIG5vbmUsXHJcbiAgICAvLyBzbyBidWxsZXQtaGVhdnkgY2h1bmtzIGRvIG5vdCBnZXQgaGVhZGVycyBsYXJnZXIgdGhhbiB0aGVpciB0ZXh0LlxyXG4gICAgY29uc3QgZXh0cmFUaXRsZXMgPSByZXN0XHJcbiAgICAgIC5maWx0ZXIoKHMpID0+IHMuYmxvY2tzWzBdPy5raW5kID09PSBcImhlYWRpbmdcIilcclxuICAgICAgLm1hcCgocykgPT4gcy5wYXRoW3MucGF0aC5sZW5ndGggLSAxXSlcclxuICAgICAgLmZpbHRlcigodGl0bGUpOiB0aXRsZSBpcyBzdHJpbmcgPT4gQm9vbGVhbih0aXRsZSkpO1xyXG4gICAgY29uc3Qgc2VjdGlvblBhdGggPSBbZmlyc3RQYXRoLCAuLi5leHRyYVRpdGxlc10uZmlsdGVyKEJvb2xlYW4pLmpvaW4oXCIgOyBcIik7XHJcbiAgICBjb25zdCBkYXRlcyA9IGRlZHVwZVJhbmdlcyhbLi4uZ3JvdXAuZmxhdE1hcCgocykgPT4gcy5kYXRlcyksIC4uLnRleHREYXRlcyh0ZXh0KV0pO1xyXG4gICAgY29uc3QgY29udGV4dEhlYWRlciA9IGJ1aWxkQ29udGV4dEhlYWRlcihvcHRpb25zLmZpbGVOYW1lLCBvcHRpb25zLnBvc3RlZERhdGUsIHNlY3Rpb25QYXRoLCBkYXRlcyk7XHJcbiAgICByZXR1cm4geyBzZWN0aW9uUGF0aCwgZGF0ZXMsIGNvbnRleHRIZWFkZXIgfTtcclxuICB9O1xyXG5cclxuICAvLyBIZWFkZXJzIChkYXRlcywgcGlwZXMpIHVzdWFsbHkgdG9rZW5pemUgZGVuc2VyIHRoYW4gYm9keSB0ZXh0LCBzbyBtZWFzdXJlIHRoZWlyXHJcbiAgLy8gZGVuc2l0eSBvbmNlIHBlciBkb2N1bWVudCBhbmQgY29udmVydCBoZWFkZXIgd29yZHMgdG8gYm9keS1lcXVpdmFsZW50IGJ1ZGdldCB3b3Jkcy5cclxuICBjb25zdCBmaXJzdEhlYWRlciA9IGRlc2NyaWJlKFtzZWN0aW9uc1swXV0sIHRva2Vuc1RvVGV4dCh0b2tlbml6ZVNlY3Rpb24oc2VjdGlvbnNbMF0sIDApLnRva2VucykpLmNvbnRleHRIZWFkZXI7XHJcbiAgY29uc3QgZmlyc3RIZWFkZXJXb3JkcyA9IHdvcmRDb3VudChmaXJzdEhlYWRlcik7XHJcbiAgY29uc3QgZmlyc3RIZWFkZXJUb2tlbnMgPSBhd2FpdCBvcHRpb25zLmNvdW50VG9rZW5zKGZpcnN0SGVhZGVyKTtcclxuICBjb25zdCBoZWFkZXJUb2tlbnNQZXJXb3JkID1cclxuICAgIGZpcnN0SGVhZGVyVG9rZW5zID4gMCAmJiBmaXJzdEhlYWRlcldvcmRzID4gMCA/IGZpcnN0SGVhZGVyVG9rZW5zIC8gZmlyc3RIZWFkZXJXb3JkcyA6IHRva2Vuc1BlcldvcmQ7XHJcbiAgY29uc3QgaGVhZGVyQnVkZ2V0V29yZHMgPSAoaGVhZGVyOiBzdHJpbmcpOiBudW1iZXIgPT5cclxuICAgIE1hdGguY2VpbCgod29yZENvdW50KGhlYWRlcikgKiBoZWFkZXJUb2tlbnNQZXJXb3JkKSAvIHRva2Vuc1BlcldvcmQpO1xyXG5cclxuICBjb25zdCBjaHVua3M6IFN0cnVjdHVyZWRDaHVua1tdID0gW107XHJcbiAgY29uc3QgZW1pdCA9IChncm91cDogU2VjdGlvbltdLCB0b2tlbnM6IFRva2VuW10sIHN0YXJ0SW5kZXg6IG51bWJlcikgPT4ge1xyXG4gICAgY29uc3QgdGV4dCA9IHRva2Vuc1RvVGV4dCh0b2tlbnMpO1xyXG4gICAgY29uc3QgeyBzZWN0aW9uUGF0aCwgZGF0ZXMsIGNvbnRleHRIZWFkZXIgfSA9IGRlc2NyaWJlKGdyb3VwLCB0ZXh0KTtcclxuICAgIGNodW5rcy5wdXNoKHsgdGV4dCwgY29udGV4dEhlYWRlciwgc2VjdGlvblBhdGgsIGRhdGVzLCBzdGFydEluZGV4LCBlbmRJbmRleDogc3RhcnRJbmRleCArIHRva2Vucy5sZW5ndGggfSk7XHJcbiAgfTtcclxuXHJcbiAgY29uc3QgZml0cyA9IChpdGVtczogU2VjdGlvblRva2Vuc1tdKTogYm9vbGVhbiA9PiB7XHJcbiAgICBjb25zdCB0b2tlbnMgPSBpdGVtcy5mbGF0TWFwKChpdGVtKSA9PiBpdGVtLnRva2Vucyk7XHJcbiAgICBjb25zdCB7IGNvbnRleHRIZWFkZXIgfSA9IGRlc2NyaWJlKFxyXG4gICAgICBpdGVtcy5tYXAoKGl0ZW0pID0+IGl0ZW0uc2VjdGlvbiksXHJcbiAgICAgIHRva2Vuc1RvVGV4dCh0b2tlbnMpLFxyXG4gICAgKTtcclxuICAgIHJldHVybiBoZWFkZXJCdWRnZXRXb3Jkcyhjb250ZXh0SGVhZGVyKSArIHRva2Vucy5sZW5ndGggPD0gYnVkZ2V0V29yZHM7XHJcbiAgfTtcclxuXHJcbiAgY29uc3Qgc3BsaXRPdmVyc2l6ZWQgPSAoaXRlbTogU2VjdGlvblRva2VucykgPT4ge1xyXG4gICAgY29uc3Qgd2hvbGVUZXh0ID0gdG9rZW5zVG9UZXh0KGl0ZW0udG9rZW5zKTtcclxuICAgIGNvbnN0IHdvcnN0SGVhZGVyID0gZGVzY3JpYmUoW2l0ZW0uc2VjdGlvbl0sIHdob2xlVGV4dCkuY29udGV4dEhlYWRlcjtcclxuICAgIC8vIEEgaGVhZGVyIGNhbiBpdHNlbGYgYXBwcm9hY2ggb3IgZXhjZWVkIHRoZSBidWRnZXQ7IGZsb29yIHRoZSBwaWVjZSBidWRnZXRcclxuICAgIC8vIGF0IGhhbGYgdGhlIGJ1ZGdldCBpbnN0ZWFkIG9mIHNocmlua2luZyBwaWVjZXMgdG8gbm90aGluZy4gQ2h1bmtzIHdob3NlXHJcbiAgICAvLyBoZWFkZXIgaXMgdW51c3VhbGx5IGxhcmdlIG1heSB0aGVuIGV4Y2VlZCB0aGUgbm9taW5hbCB0b2tlbiBidWRnZXQuXHJcbiAgICBjb25zdCBwaWVjZUJ1ZGdldCA9IE1hdGgubWF4KE1hdGguY2VpbChidWRnZXRXb3JkcyAvIDIpLCBidWRnZXRXb3JkcyAtIGhlYWRlckJ1ZGdldFdvcmRzKHdvcnN0SGVhZGVyKSk7XHJcbiAgICBjb25zdCBzZW50ZW5jZXMgPSBzZW50ZW5jZUVuZHMoaXRlbS50b2tlbnMpO1xyXG4gICAgY29uc3QgdG90YWwgPSBpdGVtLnRva2Vucy5sZW5ndGg7XHJcbiAgICBjb25zdCBoZWFkaW5nRW5kU2V0ID0gbmV3IFNldChpdGVtLmhlYWRpbmdFbmRzKTtcclxuXHJcbiAgICBjb25zdCBhdm9pZEhlYWRpbmdFbmQgPSAoZW5kOiBudW1iZXIsIGxvd2VyOiBudW1iZXIpOiBudW1iZXIgPT4ge1xyXG4gICAgICBpZiAoZW5kID49IHRvdGFsIHx8ICFoZWFkaW5nRW5kU2V0LmhhcyhlbmQpKSByZXR1cm4gZW5kO1xyXG4gICAgICBjb25zdCBwcmV2aW91cyA9IGxhc3RCb3VuZGFyeShpdGVtLmJsb2NrRW5kcywgbG93ZXIsIGVuZCAtIDEpID8/IGxhc3RCb3VuZGFyeShzZW50ZW5jZXMsIGxvd2VyLCBlbmQgLSAxKTtcclxuICAgICAgcmV0dXJuIHByZXZpb3VzICE9PSB1bmRlZmluZWQgJiYgcHJldmlvdXMgPiBsb3dlciA/IHByZXZpb3VzIDogZW5kICsgMTtcclxuICAgIH07XHJcblxyXG4gICAgbGV0IHN0YXJ0ID0gMDtcclxuICAgIHdoaWxlIChzdGFydCA8IHRvdGFsKSB7XHJcbiAgICAgIGNvbnN0IGxpbWl0ID0gTWF0aC5taW4odG90YWwsIHN0YXJ0ICsgcGllY2VCdWRnZXQpO1xyXG4gICAgICBjb25zdCBsb3dlciA9IHN0YXJ0ID09PSAwID8gTWF0aC5tYXgoc3RhcnQsIGl0ZW0uaGVhZGluZ0VuZCkgOiBzdGFydDtcclxuICAgICAgbGV0IGVuZCA9IGxpbWl0O1xyXG4gICAgICBpZiAobGltaXQgPCB0b3RhbCkge1xyXG4gICAgICAgIGVuZCA9IGxhc3RCb3VuZGFyeShpdGVtLmJsb2NrRW5kcywgbG93ZXIsIGxpbWl0KSA/PyBsYXN0Qm91bmRhcnkoc2VudGVuY2VzLCBsb3dlciwgbGltaXQpID8/IGxpbWl0O1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChzdGFydCA9PT0gMCAmJiBlbmQgPD0gaXRlbS5oZWFkaW5nRW5kKSB7XHJcbiAgICAgICAgZW5kID0gTWF0aC5taW4odG90YWwsIGl0ZW0uaGVhZGluZ0VuZCArIDEpO1xyXG4gICAgICB9XHJcbiAgICAgIGVuZCA9IGF2b2lkSGVhZGluZ0VuZChlbmQsIGxvd2VyKTtcclxuICAgICAgZW1pdChbaXRlbS5zZWN0aW9uXSwgaXRlbS50b2tlbnMuc2xpY2Uoc3RhcnQsIGVuZCksIGl0ZW0ub2Zmc2V0ICsgc3RhcnQpO1xyXG4gICAgICBpZiAoZW5kID49IHRvdGFsKSBicmVhaztcclxuICAgICAgc3RhcnQgPSBNYXRoLm1heChzdGFydCArIDEsIGVuZCAtIG92ZXJsYXBXb3Jkcyk7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgbGV0IHBhY2tlZDogU2VjdGlvblRva2Vuc1tdID0gW107XHJcbiAgY29uc3QgZmx1c2hQYWNrZWQgPSAoKSA9PiB7XHJcbiAgICBpZiAocGFja2VkLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xyXG4gICAgZW1pdChcclxuICAgICAgcGFja2VkLm1hcCgoaXRlbSkgPT4gaXRlbS5zZWN0aW9uKSxcclxuICAgICAgcGFja2VkLmZsYXRNYXAoKGl0ZW0pID0+IGl0ZW0udG9rZW5zKSxcclxuICAgICAgcGFja2VkWzBdLm9mZnNldCxcclxuICAgICk7XHJcbiAgICBwYWNrZWQgPSBbXTtcclxuICB9O1xyXG5cclxuICBsZXQgb2Zmc2V0ID0gMDtcclxuICBmb3IgKGNvbnN0IHNlY3Rpb24gb2Ygc2VjdGlvbnMpIHtcclxuICAgIGNvbnN0IGl0ZW0gPSB0b2tlbml6ZVNlY3Rpb24oc2VjdGlvbiwgb2Zmc2V0KTtcclxuICAgIG9mZnNldCArPSBpdGVtLnRva2Vucy5sZW5ndGg7XHJcblxyXG4gICAgaWYgKHBhY2tlZC5sZW5ndGggPiAwKSB7XHJcbiAgICAgIGNvbnN0IGNhbmRpZGF0ZSA9IFsuLi5wYWNrZWQsIGl0ZW1dO1xyXG4gICAgICBpZiAoZml0cyhjYW5kaWRhdGUpKSB7XHJcbiAgICAgICAgcGFja2VkID0gY2FuZGlkYXRlO1xyXG4gICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICB9XHJcbiAgICAgIGZsdXNoUGFja2VkKCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGZpdHMoW2l0ZW1dKSkge1xyXG4gICAgICBwYWNrZWQgPSBbaXRlbV07XHJcbiAgICAgIGNvbnRpbnVlO1xyXG4gICAgfVxyXG4gICAgc3BsaXRPdmVyc2l6ZWQoaXRlbSk7XHJcbiAgfVxyXG4gIGZsdXNoUGFja2VkKCk7XHJcblxyXG4gIHJldHVybiBjaHVua3M7XHJcbn1cclxuIiwgImltcG9ydCBQUXVldWUgZnJvbSBcInAtcXVldWVcIjtcclxuaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzXCI7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgc2NhbkRpcmVjdG9yeSwgdHlwZSBTY2FubmVkRmlsZSwgdHlwZSBFeGNsdWRlZEZpbGVJbmZvIH0gZnJvbSBcIi4vZmlsZVNjYW5uZXJcIjtcclxuaW1wb3J0IHsgcGFyc2VEb2N1bWVudCwgdHlwZSBQYXJzZUZhaWx1cmVSZWFzb24gfSBmcm9tIFwiLi4vcGFyc2Vycy9kb2N1bWVudFBhcnNlclwiO1xyXG5pbXBvcnQgeyBWZWN0b3JTdG9yZSwgdHlwZSBEb2N1bWVudENodW5rIH0gZnJvbSBcIi4uL3ZlY3RvcnN0b3JlL3ZlY3RvclN0b3JlXCI7XHJcbmltcG9ydCB7IGNodW5rVGV4dCB9IGZyb20gXCIuLi91dGlscy90ZXh0Q2h1bmtlclwiO1xyXG5pbXBvcnQgeyBtYXJrZG93blRvUGxhaW4gfSBmcm9tIFwiLi4vcGFyc2Vycy9tYXJrZG93bi9ub3JtYWxpemVNYXJrZG93blwiO1xyXG5pbXBvcnQgeyBjYWxjdWxhdGVGaWxlSGFzaCB9IGZyb20gXCIuLi91dGlscy9maWxlSGFzaFwiO1xyXG5pbXBvcnQgeyB0eXBlIEVtYmVkZGluZ0R5bmFtaWNIYW5kbGUsIHR5cGUgTE1TdHVkaW9DbGllbnQgfSBmcm9tIFwiQGxtc3R1ZGlvL3Nka1wiO1xyXG5pbXBvcnQgeyBGYWlsZWRGaWxlUmVnaXN0cnkgfSBmcm9tIFwiLi4vdXRpbHMvZmFpbGVkRmlsZVJlZ2lzdHJ5XCI7XHJcbmltcG9ydCB7IGNvZXJjZUVtYmVkZGluZ1ZlY3RvciB9IGZyb20gXCIuLi91dGlscy9jb2VyY2VFbWJlZGRpbmdcIjtcclxuaW1wb3J0IHsgY2h1bmtTdHJ1Y3R1cmVkLCB0eXBlIFN0cnVjdHVyZWRDaHVuayB9IGZyb20gXCIuLi9jaHVua2luZy9zdHJ1Y3R1cmVkQ2h1bmtlclwiO1xyXG5pbXBvcnQgeyBkYXlSYW5nZU9mLCBkZXRlY3REYXlNb250aE9yZGVyLCBkb2N1bWVudFBvc3RlZERhdGUsIHR5cGUgRGF0ZVJhbmdlIH0gZnJvbSBcIi4uL21ldGFkYXRhL2RhdGVzXCI7XHJcblxyXG5jb25zdCBFWENMVURFX1BST0dSRVNTX1RIUk9UVExFID0gNDA7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEluZGV4aW5nUHJvZ3Jlc3Mge1xyXG4gIHRvdGFsRmlsZXM6IG51bWJlcjtcclxuICBwcm9jZXNzZWRGaWxlczogbnVtYmVyO1xyXG4gIGN1cnJlbnRGaWxlOiBzdHJpbmc7XHJcbiAgc3RhdHVzOiBcInNjYW5uaW5nXCIgfCBcImluZGV4aW5nXCIgfCBcImNvbXBsZXRlXCIgfCBcImVycm9yXCI7XHJcbiAgc3VjY2Vzc2Z1bEZpbGVzPzogbnVtYmVyO1xyXG4gIGZhaWxlZEZpbGVzPzogbnVtYmVyO1xyXG4gIHNraXBwZWRGaWxlcz86IG51bWJlcjtcclxuICBlcnJvcj86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJbmRleGluZ1Jlc3VsdCB7XHJcbiAgdG90YWxGaWxlczogbnVtYmVyO1xyXG4gIHN1Y2Nlc3NmdWxGaWxlczogbnVtYmVyO1xyXG4gIGZhaWxlZEZpbGVzOiBudW1iZXI7XHJcbiAgc2tpcHBlZEZpbGVzOiBudW1iZXI7XHJcbiAgdXBkYXRlZEZpbGVzOiBudW1iZXI7XHJcbiAgbmV3RmlsZXM6IG51bWJlcjtcclxufVxyXG5cclxudHlwZSBGaWxlSW5kZXhPdXRjb21lID1cclxuICB8IHsgdHlwZTogXCJza2lwcGVkXCIgfVxyXG4gIHwgeyB0eXBlOiBcImluZGV4ZWRcIjsgY2hhbmdlVHlwZTogXCJuZXdcIiB8IFwidXBkYXRlZFwiIH1cclxuICB8IHsgdHlwZTogXCJmYWlsZWRcIiB9O1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJbmRleGluZ09wdGlvbnMge1xyXG4gIGRvY3VtZW50c0Rpcjogc3RyaW5nO1xyXG4gIHZlY3RvclN0b3JlOiBWZWN0b3JTdG9yZTtcclxuICB2ZWN0b3JTdG9yZURpcjogc3RyaW5nO1xyXG4gIGVtYmVkZGluZ01vZGVsOiBFbWJlZGRpbmdEeW5hbWljSGFuZGxlO1xyXG4gIGNsaWVudDogTE1TdHVkaW9DbGllbnQ7XHJcbiAgY2h1bmtTaXplOiBudW1iZXI7XHJcbiAgY2h1bmtPdmVybGFwOiBudW1iZXI7XHJcbiAgbWF4Q29uY3VycmVudDogbnVtYmVyO1xyXG4gIGVuYWJsZU9DUjogYm9vbGVhbjtcclxuICBhdXRvUmVpbmRleDogYm9vbGVhbjtcclxuICBwYXJzZURlbGF5TXM6IG51bWJlcjtcclxuICAvKiogQnVpbGQgc3RydWN0dXJlZCBjaHVua3MgKE1hcmtkb3duIHNlY3Rpb25zLCBkYXRlcywgY29udGV4dCBoZWFkZXJzKSBpbnN0ZWFkIG9mIGxlZ2FjeSBjaHVua3MuICovXHJcbiAgc3RydWN0dXJlZEluZGV4aW5nOiBib29sZWFuO1xyXG4gIC8qKiBUaGUgc3RvcmUgaG9sZHMgY2h1bmtzIGluIHRoZSBvdGhlciBmb3JtYXQ6IHJlcHJvY2VzcyBldmVyeSBmaWxlIGFuZCByZXBsYWNlIGl0cyBvbGQgY2h1bmtzLiAqL1xyXG4gIHJlYnVpbGRFeGlzdGluZ0ZpbGVzOiBib29sZWFuO1xyXG4gIGZhaWx1cmVSZXBvcnRQYXRoPzogc3RyaW5nO1xyXG4gIC8qKiBHbG9iIHBhdHRlcm5zIChyZWxhdGl2ZSB0byBkb2N1bWVudHMgZGlyKTsgbWF0Y2hlZCBzdXBwb3J0ZWQgZmlsZXMgYXJlIHNraXBwZWQgYmVmb3JlIHBhcnNpbmcuICovXHJcbiAgZXhjbHVkZVBhdHRlcm5zPzogc3RyaW5nW107XHJcbiAgYWJvcnRTaWduYWw/OiBBYm9ydFNpZ25hbDtcclxuICBvblByb2dyZXNzPzogKHByb2dyZXNzOiBJbmRleGluZ1Byb2dyZXNzKSA9PiB2b2lkO1xyXG59XHJcblxyXG50eXBlIEZhaWx1cmVSZWFzb24gPSBQYXJzZUZhaWx1cmVSZWFzb24gfCBcImluZGV4LmNodW5rLWVtcHR5XCIgfCBcImluZGV4LnZlY3Rvci1hZGQtZXJyb3JcIjtcclxuXHJcbmludGVyZmFjZSBQcmVwYXJlZENodW5rIHtcclxuICB0ZXh0OiBzdHJpbmc7XHJcbiAgZW1iZWRUZXh0OiBzdHJpbmc7XHJcbiAgc3RhcnRJbmRleDogbnVtYmVyO1xyXG4gIGVuZEluZGV4OiBudW1iZXI7XHJcbiAgbWV0YWRhdGE6IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBJbmRleE1hbmFnZXIge1xyXG4gIHByaXZhdGUgcXVldWU6IFBRdWV1ZTtcclxuICBwcml2YXRlIG9wdGlvbnM6IEluZGV4aW5nT3B0aW9ucztcclxuICBwcml2YXRlIGZhaWx1cmVSZWFzb25Db3VudHM6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7fTtcclxuICBwcml2YXRlIGZhaWxlZEZpbGVSZWdpc3RyeTogRmFpbGVkRmlsZVJlZ2lzdHJ5O1xyXG5cclxuICBjb25zdHJ1Y3RvcihvcHRpb25zOiBJbmRleGluZ09wdGlvbnMpIHtcclxuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XHJcbiAgICB0aGlzLnF1ZXVlID0gbmV3IFBRdWV1ZSh7IGNvbmN1cnJlbmN5OiBvcHRpb25zLm1heENvbmN1cnJlbnQgfSk7XHJcbiAgICB0aGlzLmZhaWxlZEZpbGVSZWdpc3RyeSA9IG5ldyBGYWlsZWRGaWxlUmVnaXN0cnkoXHJcbiAgICAgIHBhdGguam9pbihvcHRpb25zLnZlY3RvclN0b3JlRGlyLCBcIi5iaWctcmFnLWZhaWx1cmVzLmpzb25cIiksXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU3RhcnQgdGhlIGluZGV4aW5nIHByb2Nlc3NcclxuICAgKi9cclxuICBhc3luYyBpbmRleCgpOiBQcm9taXNlPEluZGV4aW5nUmVzdWx0PiB7XHJcbiAgICBjb25zdCB7IGRvY3VtZW50c0RpciwgdmVjdG9yU3RvcmUsIG9uUHJvZ3Jlc3MgfSA9IHRoaXMub3B0aW9ucztcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBmaWxlSW52ZW50b3J5ID0gYXdhaXQgdmVjdG9yU3RvcmUuZ2V0RmlsZUhhc2hJbnZlbnRvcnkoKTtcclxuXHJcbiAgICAgIC8vIFN0ZXAgMTogU2NhbiBkaXJlY3RvcnlcclxuICAgICAgaWYgKG9uUHJvZ3Jlc3MpIHtcclxuICAgICAgICBvblByb2dyZXNzKHtcclxuICAgICAgICAgIHRvdGFsRmlsZXM6IDAsXHJcbiAgICAgICAgICBwcm9jZXNzZWRGaWxlczogMCxcclxuICAgICAgICAgIGN1cnJlbnRGaWxlOiBcIlwiLFxyXG4gICAgICAgICAgc3RhdHVzOiBcInNjYW5uaW5nXCIsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IGV4Y2x1ZGVQYXR0ZXJucyA9IHRoaXMub3B0aW9ucy5leGNsdWRlUGF0dGVybnMgPz8gW107XHJcbiAgICAgIGxldCBleGNsdWRlZEJ5UGF0dGVybiA9IDA7XHJcbiAgICAgIGxldCBsYXN0RXhjbHVkZVByb2dyZXNzRW1pdHRlZEF0ID0gMDtcclxuICAgICAgbGV0IGxhc3RFeGNsdWRlZFJlbGF0aXZlID0gXCJcIjtcclxuXHJcbiAgICAgIGNvbnN0IG9uRXhjbHVkZWRGaWxlOiAoKGluZm86IEV4Y2x1ZGVkRmlsZUluZm8pID0+IHZvaWQpIHwgdW5kZWZpbmVkID1cclxuICAgICAgICBleGNsdWRlUGF0dGVybnMubGVuZ3RoID4gMFxyXG4gICAgICAgICAgPyAoaW5mbzogRXhjbHVkZWRGaWxlSW5mbykgPT4ge1xyXG4gICAgICAgICAgICAgIGV4Y2x1ZGVkQnlQYXR0ZXJuKys7XHJcbiAgICAgICAgICAgICAgbGFzdEV4Y2x1ZGVkUmVsYXRpdmUgPSBpbmZvLnJlbGF0aXZlUGF0aDtcclxuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcclxuICAgICAgICAgICAgICAgIGBFeGNsdWRlZCBmcm9tIGluZGV4aW5nIChleGNsdWRlIHBhdHRlcm4pOiAke2luZm8ucmVsYXRpdmVQYXRofSAobWF0Y2hlZDogJHtpbmZvLnBhdHRlcm59KWAsXHJcbiAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICBpZiAoIW9uUHJvZ3Jlc3MpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICAgICAgZXhjbHVkZWRCeVBhdHRlcm4gPT09IDEgfHxcclxuICAgICAgICAgICAgICAgIGV4Y2x1ZGVkQnlQYXR0ZXJuIC0gbGFzdEV4Y2x1ZGVQcm9ncmVzc0VtaXR0ZWRBdCA+PSBFWENMVURFX1BST0dSRVNTX1RIUk9UVExFXHJcbiAgICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICBsYXN0RXhjbHVkZVByb2dyZXNzRW1pdHRlZEF0ID0gZXhjbHVkZWRCeVBhdHRlcm47XHJcbiAgICAgICAgICAgICAgICBvblByb2dyZXNzKHtcclxuICAgICAgICAgICAgICAgICAgdG90YWxGaWxlczogMCxcclxuICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkRmlsZXM6IDAsXHJcbiAgICAgICAgICAgICAgICAgIGN1cnJlbnRGaWxlOiBgRXhjbHVkZWQgJHtleGNsdWRlZEJ5UGF0dGVybn0gYnkgcGF0dGVybiAobGF0ZXN0OiAke2xhc3RFeGNsdWRlZFJlbGF0aXZlfSlgLFxyXG4gICAgICAgICAgICAgICAgICBzdGF0dXM6IFwic2Nhbm5pbmdcIixcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgOiB1bmRlZmluZWQ7XHJcblxyXG4gICAgICBjb25zdCBmaWxlcyA9IGF3YWl0IHNjYW5EaXJlY3RvcnkoXHJcbiAgICAgICAgZG9jdW1lbnRzRGlyLFxyXG4gICAgICAgIChzY2FubmVkLCBmb3VuZCkgPT4ge1xyXG4gICAgICAgICAgaWYgKG9uUHJvZ3Jlc3MpIHtcclxuICAgICAgICAgICAgb25Qcm9ncmVzcyh7XHJcbiAgICAgICAgICAgICAgdG90YWxGaWxlczogZm91bmQsXHJcbiAgICAgICAgICAgICAgcHJvY2Vzc2VkRmlsZXM6IDAsXHJcbiAgICAgICAgICAgICAgY3VycmVudEZpbGU6IGBTY2FubmVkICR7c2Nhbm5lZH0gZmlsZXMuLi5gLFxyXG4gICAgICAgICAgICAgIHN0YXR1czogXCJzY2FubmluZ1wiLFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGV4Y2x1ZGVQYXR0ZXJucyxcclxuICAgICAgICAgIG9uRXhjbHVkZWRGaWxlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBpZiAoXHJcbiAgICAgICAgb25Qcm9ncmVzcyAmJlxyXG4gICAgICAgIGV4Y2x1ZGVkQnlQYXR0ZXJuID4gMCAmJlxyXG4gICAgICAgIGV4Y2x1ZGVkQnlQYXR0ZXJuICE9PSBsYXN0RXhjbHVkZVByb2dyZXNzRW1pdHRlZEF0XHJcbiAgICAgICkge1xyXG4gICAgICAgIG9uUHJvZ3Jlc3Moe1xyXG4gICAgICAgICAgdG90YWxGaWxlczogMCxcclxuICAgICAgICAgIHByb2Nlc3NlZEZpbGVzOiAwLFxyXG4gICAgICAgICAgY3VycmVudEZpbGU6IGBFeGNsdWRlZCAke2V4Y2x1ZGVkQnlQYXR0ZXJufSBieSBwYXR0ZXJuIChsYXRlc3Q6ICR7bGFzdEV4Y2x1ZGVkUmVsYXRpdmV9KWAsXHJcbiAgICAgICAgICBzdGF0dXM6IFwic2Nhbm5pbmdcIixcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy5vcHRpb25zLmFib3J0U2lnbmFsPy50aHJvd0lmQWJvcnRlZCgpO1xyXG5cclxuICAgICAgY29uc29sZS5sb2coXHJcbiAgICAgICAgYEZvdW5kICR7ZmlsZXMubGVuZ3RofSBmaWxlcyB0byBwcm9jZXNzYCArXHJcbiAgICAgICAgICAoZXhjbHVkZWRCeVBhdHRlcm4gPiAwXHJcbiAgICAgICAgICAgID8gYCAoJHtleGNsdWRlZEJ5UGF0dGVybn0gZXhjbHVkZWQgYnkgZXhjbHVkZSBwYXR0ZXJucylgXHJcbiAgICAgICAgICAgIDogXCJcIiksXHJcbiAgICAgICk7XHJcblxyXG4gICAgICAvLyBTdGVwIDI6IEluZGV4IGZpbGVzXHJcbiAgICAgIGxldCBwcm9jZXNzZWRDb3VudCA9IDA7XHJcbiAgICAgIGxldCBzdWNjZXNzQ291bnQgPSAwO1xyXG4gICAgICBsZXQgZmFpbENvdW50ID0gMDtcclxuICAgICAgbGV0IHNraXBwZWRDb3VudCA9IDA7XHJcbiAgICAgIGxldCB1cGRhdGVkQ291bnQgPSAwO1xyXG4gICAgICBsZXQgbmV3Q291bnQgPSAwO1xyXG5cclxuICAgICAgaWYgKG9uUHJvZ3Jlc3MpIHtcclxuICAgICAgICBvblByb2dyZXNzKHtcclxuICAgICAgICAgIHRvdGFsRmlsZXM6IGZpbGVzLmxlbmd0aCxcclxuICAgICAgICAgIHByb2Nlc3NlZEZpbGVzOiAwLFxyXG4gICAgICAgICAgY3VycmVudEZpbGU6IGZpbGVzWzBdPy5uYW1lID8/IFwiXCIsXHJcbiAgICAgICAgICBzdGF0dXM6IFwiaW5kZXhpbmdcIixcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gQWJvcnQgbGlzdGVuZXI6IHdoZW4gc2lnbmFsIGZpcmVzLCBjbGVhciBwZW5kaW5nIHRhc2tzIGZyb20gdGhlIHF1ZXVlXHJcbiAgICAgIGNvbnN0IGFib3J0U2lnbmFsID0gdGhpcy5vcHRpb25zLmFib3J0U2lnbmFsO1xyXG4gICAgICBjb25zdCBvbkFib3J0ID0gKCkgPT4gdGhpcy5xdWV1ZS5jbGVhcigpO1xyXG4gICAgICBpZiAoYWJvcnRTaWduYWwpIHtcclxuICAgICAgICBhYm9ydFNpZ25hbC5hZGRFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgb25BYm9ydCwgeyBvbmNlOiB0cnVlIH0pO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBQcm9jZXNzIGZpbGVzIGluIGJhdGNoZXNcclxuICAgICAgY29uc3QgdGFza3MgPSBmaWxlcy5tYXAoKGZpbGUpID0+XHJcbiAgICAgICAgdGhpcy5xdWV1ZS5hZGQoYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgLy8gQ2hlY2sgYWJvcnQgYmVmb3JlIHByb2Nlc3NpbmcgZWFjaCBmaWxlXHJcbiAgICAgICAgICBhYm9ydFNpZ25hbD8udGhyb3dJZkFib3J0ZWQoKTtcclxuXHJcbiAgICAgICAgICBsZXQgb3V0Y29tZTogRmlsZUluZGV4T3V0Y29tZSA9IHsgdHlwZTogXCJmYWlsZWRcIiB9O1xyXG4gICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKG9uUHJvZ3Jlc3MpIHtcclxuICAgICAgICAgICAgICBvblByb2dyZXNzKHtcclxuICAgICAgICAgICAgICAgIHRvdGFsRmlsZXM6IGZpbGVzLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgIHByb2Nlc3NlZEZpbGVzOiBwcm9jZXNzZWRDb3VudCxcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRGaWxlOiBmaWxlLm5hbWUsXHJcbiAgICAgICAgICAgICAgICBzdGF0dXM6IFwiaW5kZXhpbmdcIixcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3NmdWxGaWxlczogc3VjY2Vzc0NvdW50LFxyXG4gICAgICAgICAgICAgICAgZmFpbGVkRmlsZXM6IGZhaWxDb3VudCxcclxuICAgICAgICAgICAgICAgIHNraXBwZWRGaWxlczogc2tpcHBlZENvdW50LFxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBvdXRjb21lID0gYXdhaXQgdGhpcy5pbmRleEZpbGUoZmlsZSwgZmlsZUludmVudG9yeSk7XHJcbiAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBpbmRleGluZyBmaWxlICR7ZmlsZS5wYXRofTpgLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHRoaXMucmVjb3JkRmFpbHVyZShcclxuICAgICAgICAgICAgICBcInBhcnNlci51bmV4cGVjdGVkLWVycm9yXCIsXHJcbiAgICAgICAgICAgICAgZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpLFxyXG4gICAgICAgICAgICAgIGZpbGUsXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgcHJvY2Vzc2VkQ291bnQrKztcclxuICAgICAgICAgIHN3aXRjaCAob3V0Y29tZS50eXBlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJza2lwcGVkXCI6XHJcbiAgICAgICAgICAgICAgc3VjY2Vzc0NvdW50Kys7XHJcbiAgICAgICAgICAgICAgc2tpcHBlZENvdW50Kys7XHJcbiAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJpbmRleGVkXCI6XHJcbiAgICAgICAgICAgICAgc3VjY2Vzc0NvdW50Kys7XHJcbiAgICAgICAgICAgICAgaWYgKG91dGNvbWUuY2hhbmdlVHlwZSA9PT0gXCJuZXdcIikge1xyXG4gICAgICAgICAgICAgICAgbmV3Q291bnQrKztcclxuICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdXBkYXRlZENvdW50Kys7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwiZmFpbGVkXCI6XHJcbiAgICAgICAgICAgICAgZmFpbENvdW50Kys7XHJcbiAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgaWYgKG9uUHJvZ3Jlc3MpIHtcclxuICAgICAgICAgICAgb25Qcm9ncmVzcyh7XHJcbiAgICAgICAgICAgICAgdG90YWxGaWxlczogZmlsZXMubGVuZ3RoLFxyXG4gICAgICAgICAgICAgIHByb2Nlc3NlZEZpbGVzOiBwcm9jZXNzZWRDb3VudCxcclxuICAgICAgICAgICAgICBjdXJyZW50RmlsZTogZmlsZS5uYW1lLFxyXG4gICAgICAgICAgICAgIHN0YXR1czogXCJpbmRleGluZ1wiLFxyXG4gICAgICAgICAgICAgIHN1Y2Nlc3NmdWxGaWxlczogc3VjY2Vzc0NvdW50LFxyXG4gICAgICAgICAgICAgIGZhaWxlZEZpbGVzOiBmYWlsQ291bnQsXHJcbiAgICAgICAgICAgICAgc2tpcHBlZEZpbGVzOiBza2lwcGVkQ291bnQsXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBhd2FpdCBQcm9taXNlLmFsbCh0YXNrcyk7XHJcblxyXG4gICAgICAvLyBDbGVhbiB1cCBhYm9ydCBsaXN0ZW5lclxyXG4gICAgICBpZiAoYWJvcnRTaWduYWwpIHtcclxuICAgICAgICBhYm9ydFNpZ25hbC5yZW1vdmVFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgb25BYm9ydCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChvblByb2dyZXNzKSB7XHJcbiAgICAgICAgb25Qcm9ncmVzcyh7XHJcbiAgICAgICAgICB0b3RhbEZpbGVzOiBmaWxlcy5sZW5ndGgsXHJcbiAgICAgICAgICBwcm9jZXNzZWRGaWxlczogcHJvY2Vzc2VkQ291bnQsXHJcbiAgICAgICAgICBjdXJyZW50RmlsZTogXCJcIixcclxuICAgICAgICAgIHN0YXR1czogXCJjb21wbGV0ZVwiLFxyXG4gICAgICAgICAgc3VjY2Vzc2Z1bEZpbGVzOiBzdWNjZXNzQ291bnQsXHJcbiAgICAgICAgICBmYWlsZWRGaWxlczogZmFpbENvdW50LFxyXG4gICAgICAgICAgc2tpcHBlZEZpbGVzOiBza2lwcGVkQ291bnQsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMubG9nRmFpbHVyZVN1bW1hcnkoKTtcclxuICAgICAgYXdhaXQgdGhpcy53cml0ZUZhaWx1cmVSZXBvcnQoe1xyXG4gICAgICAgIHRvdGFsRmlsZXM6IGZpbGVzLmxlbmd0aCxcclxuICAgICAgICBzdWNjZXNzZnVsRmlsZXM6IHN1Y2Nlc3NDb3VudCxcclxuICAgICAgICBmYWlsZWRGaWxlczogZmFpbENvdW50LFxyXG4gICAgICAgIHNraXBwZWRGaWxlczogc2tpcHBlZENvdW50LFxyXG4gICAgICAgIHVwZGF0ZWRGaWxlczogdXBkYXRlZENvdW50LFxyXG4gICAgICAgIG5ld0ZpbGVzOiBuZXdDb3VudCxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhcclxuICAgICAgICBgSW5kZXhpbmcgY29tcGxldGU6ICR7c3VjY2Vzc0NvdW50fS8ke2ZpbGVzLmxlbmd0aH0gZmlsZXMgc3VjY2Vzc2Z1bGx5IGluZGV4ZWQgKCR7ZmFpbENvdW50fSBmYWlsZWQsIHNraXBwZWQ9JHtza2lwcGVkQ291bnR9LCB1cGRhdGVkPSR7dXBkYXRlZENvdW50fSwgbmV3PSR7bmV3Q291bnR9KWAgK1xyXG4gICAgICAgICAgKGV4Y2x1ZGVkQnlQYXR0ZXJuID4gMCA/IGA7IGV4Y2x1ZGVkIGJ5IHBhdHRlcm49JHtleGNsdWRlZEJ5UGF0dGVybn1gIDogXCJcIiksXHJcbiAgICAgICk7XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHRvdGFsRmlsZXM6IGZpbGVzLmxlbmd0aCxcclxuICAgICAgICBzdWNjZXNzZnVsRmlsZXM6IHN1Y2Nlc3NDb3VudCxcclxuICAgICAgICBmYWlsZWRGaWxlczogZmFpbENvdW50LFxyXG4gICAgICAgIHNraXBwZWRGaWxlczogc2tpcHBlZENvdW50LFxyXG4gICAgICAgIHVwZGF0ZWRGaWxlczogdXBkYXRlZENvdW50LFxyXG4gICAgICAgIG5ld0ZpbGVzOiBuZXdDb3VudCxcclxuICAgICAgfTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBkdXJpbmcgaW5kZXhpbmc6XCIsIGVycm9yKTtcclxuICAgICAgaWYgKG9uUHJvZ3Jlc3MpIHtcclxuICAgICAgICBvblByb2dyZXNzKHtcclxuICAgICAgICAgIHRvdGFsRmlsZXM6IDAsXHJcbiAgICAgICAgICBwcm9jZXNzZWRGaWxlczogMCxcclxuICAgICAgICAgIGN1cnJlbnRGaWxlOiBcIlwiLFxyXG4gICAgICAgICAgc3RhdHVzOiBcImVycm9yXCIsXHJcbiAgICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5kZXggYSBzaW5nbGUgZmlsZVxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgaW5kZXhGaWxlKFxyXG4gICAgZmlsZTogU2Nhbm5lZEZpbGUsXHJcbiAgICBmaWxlSW52ZW50b3J5OiBNYXA8c3RyaW5nLCBTZXQ8c3RyaW5nPj4gPSBuZXcgTWFwKCksXHJcbiAgKTogUHJvbWlzZTxGaWxlSW5kZXhPdXRjb21lPiB7XHJcbiAgICBjb25zdCB7IHZlY3RvclN0b3JlLCBlbWJlZGRpbmdNb2RlbCwgY2xpZW50LCBjaHVua1NpemUsIGNodW5rT3ZlcmxhcCwgZW5hYmxlT0NSLCBhdXRvUmVpbmRleCB9ID1cclxuICAgICAgdGhpcy5vcHRpb25zO1xyXG5cclxuICAgIGxldCBmaWxlSGFzaDogc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gQ2FsY3VsYXRlIGZpbGUgaGFzaFxyXG4gICAgICBmaWxlSGFzaCA9IGF3YWl0IGNhbGN1bGF0ZUZpbGVIYXNoKGZpbGUucGF0aCk7XHJcbiAgICAgIGNvbnN0IGV4aXN0aW5nSGFzaGVzID0gZmlsZUludmVudG9yeS5nZXQoZmlsZS5wYXRoKTtcclxuICAgICAgY29uc3QgaGFzU2VlbkJlZm9yZSA9IGV4aXN0aW5nSGFzaGVzICE9PSB1bmRlZmluZWQgJiYgZXhpc3RpbmdIYXNoZXMuc2l6ZSA+IDA7XHJcbiAgICAgIGNvbnN0IGhhc1NhbWVIYXNoID0gZXhpc3RpbmdIYXNoZXM/LmhhcyhmaWxlSGFzaCkgPz8gZmFsc2U7XHJcbiAgICAgIGNvbnN0IHNraXBVbmNoYW5nZWQgPSBhdXRvUmVpbmRleCAmJiAhdGhpcy5vcHRpb25zLnJlYnVpbGRFeGlzdGluZ0ZpbGVzO1xyXG5cclxuICAgICAgLy8gQ2hlY2sgaWYgZmlsZSBhbHJlYWR5IGluZGV4ZWRcclxuICAgICAgaWYgKHNraXBVbmNoYW5nZWQgJiYgaGFzU2FtZUhhc2gpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgRmlsZSBhbHJlYWR5IGluZGV4ZWQgKHNraXBwZWQpOiAke2ZpbGUubmFtZX1gKTtcclxuICAgICAgICByZXR1cm4geyB0eXBlOiBcInNraXBwZWRcIiB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoc2tpcFVuY2hhbmdlZCkge1xyXG4gICAgICAgIGNvbnN0IHByZXZpb3VzRmFpbHVyZSA9IGF3YWl0IHRoaXMuZmFpbGVkRmlsZVJlZ2lzdHJ5LmdldEZhaWx1cmVSZWFzb24oZmlsZS5wYXRoLCBmaWxlSGFzaCk7XHJcbiAgICAgICAgaWYgKHByZXZpb3VzRmFpbHVyZSkge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coXHJcbiAgICAgICAgICAgIGBGaWxlIHByZXZpb3VzbHkgZmFpbGVkIChza2lwcGVkKTogJHtmaWxlLm5hbWV9IChyZWFzb249JHtwcmV2aW91c0ZhaWx1cmV9KWAsXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgICAgcmV0dXJuIHsgdHlwZTogXCJza2lwcGVkXCIgfTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFdhaXQgYmVmb3JlIHBhcnNpbmcgdG8gcmVkdWNlIFdlYlNvY2tldCBsb2FkXHJcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMucGFyc2VEZWxheU1zID4gMCkge1xyXG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCB0aGlzLm9wdGlvbnMucGFyc2VEZWxheU1zKSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFBhcnNlIGRvY3VtZW50XHJcbiAgICAgIGNvbnN0IHBhcnNlZFJlc3VsdCA9IGF3YWl0IHBhcnNlRG9jdW1lbnQoZmlsZS5wYXRoLCBlbmFibGVPQ1IsIGNsaWVudCk7XHJcbiAgICAgIGlmICghcGFyc2VkUmVzdWx0LnN1Y2Nlc3MpIHtcclxuICAgICAgICB0aGlzLnJlY29yZEZhaWx1cmUocGFyc2VkUmVzdWx0LnJlYXNvbiwgcGFyc2VkUmVzdWx0LmRldGFpbHMsIGZpbGUpO1xyXG4gICAgICAgIGlmIChmaWxlSGFzaCkge1xyXG4gICAgICAgICAgYXdhaXQgdGhpcy5mYWlsZWRGaWxlUmVnaXN0cnkucmVjb3JkRmFpbHVyZShmaWxlLnBhdGgsIGZpbGVIYXNoLCBwYXJzZWRSZXN1bHQucmVhc29uKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYXdhaXQgdGhpcy5kcm9wU3RhbGVDaHVua3NGb3JSZWJ1aWxkKGV4aXN0aW5nSGFzaGVzKTtcclxuICAgICAgICByZXR1cm4geyB0eXBlOiBcImZhaWxlZFwiIH07XHJcbiAgICAgIH1cclxuICAgICAgY29uc3QgcGFyc2VkID0gcGFyc2VkUmVzdWx0LmRvY3VtZW50O1xyXG5cclxuICAgICAgY29uc3QgY2h1bmtzID0gdGhpcy5vcHRpb25zLnN0cnVjdHVyZWRJbmRleGluZ1xyXG4gICAgICAgID8gYXdhaXQgdGhpcy5wcmVwYXJlU3RydWN0dXJlZENodW5rcyhwYXJzZWQudGV4dCwgZmlsZSlcclxuICAgICAgICA6IGF3YWl0IHRoaXMucHJlcGFyZUxlZ2FjeUNodW5rcyhwYXJzZWQudGV4dCk7XHJcbiAgICAgIGlmIChjaHVua3MubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYE5vIGNodW5rcyBjcmVhdGVkIGZyb20gJHtmaWxlLm5hbWV9YCk7XHJcbiAgICAgICAgdGhpcy5yZWNvcmRGYWlsdXJlKFwiaW5kZXguY2h1bmstZW1wdHlcIiwgXCJjaHVua2luZyBwcm9kdWNlZCAwIGNodW5rc1wiLCBmaWxlKTtcclxuICAgICAgICBpZiAoZmlsZUhhc2gpIHtcclxuICAgICAgICAgIGF3YWl0IHRoaXMuZmFpbGVkRmlsZVJlZ2lzdHJ5LnJlY29yZEZhaWx1cmUoZmlsZS5wYXRoLCBmaWxlSGFzaCwgXCJpbmRleC5jaHVuay1lbXB0eVwiKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYXdhaXQgdGhpcy5kcm9wU3RhbGVDaHVua3NGb3JSZWJ1aWxkKGV4aXN0aW5nSGFzaGVzKTtcclxuICAgICAgICByZXR1cm4geyB0eXBlOiBcImZhaWxlZFwiIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEdlbmVyYXRlIGVtYmVkZGluZ3MgYW5kIGNyZWF0ZSBkb2N1bWVudCBjaHVua3NcclxuICAgICAgY29uc3QgZG9jdW1lbnRDaHVua3M6IERvY3VtZW50Q2h1bmtbXSA9IFtdO1xyXG5cclxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjaHVua3MubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBjb25zdCBjaHVuayA9IGNodW5rc1tpXTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBDaGVjayBhYm9ydCBiZXR3ZWVuIGNodW5rIGVtYmVkZGluZ3NcclxuICAgICAgICB0aGlzLm9wdGlvbnMuYWJvcnRTaWduYWw/LnRocm93SWZBYm9ydGVkKCk7XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAvLyBHZW5lcmF0ZSBlbWJlZGRpbmdcclxuICAgICAgICAgIGNvbnN0IGVtYmVkZGluZ1Jlc3VsdCA9IGF3YWl0IGVtYmVkZGluZ01vZGVsLmVtYmVkKGNodW5rLmVtYmVkVGV4dCk7XHJcbiAgICAgICAgICBjb25zdCBlbWJlZGRpbmcgPSBjb2VyY2VFbWJlZGRpbmdWZWN0b3IoZW1iZWRkaW5nUmVzdWx0LmVtYmVkZGluZyk7XHJcblxyXG4gICAgICAgICAgZG9jdW1lbnRDaHVua3MucHVzaCh7XHJcbiAgICAgICAgICAgIGlkOiBgJHtmaWxlSGFzaH0tJHtpfWAsXHJcbiAgICAgICAgICAgIHRleHQ6IGNodW5rLnRleHQsXHJcbiAgICAgICAgICAgIHZlY3RvcjogZW1iZWRkaW5nLFxyXG4gICAgICAgICAgICBmaWxlUGF0aDogZmlsZS5wYXRoLFxyXG4gICAgICAgICAgICBmaWxlTmFtZTogZmlsZS5uYW1lLFxyXG4gICAgICAgICAgICBmaWxlSGFzaCxcclxuICAgICAgICAgICAgY2h1bmtJbmRleDogaSxcclxuICAgICAgICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICAgICAgICBleHRlbnNpb246IGZpbGUuZXh0ZW5zaW9uLFxyXG4gICAgICAgICAgICAgIHNpemU6IGZpbGUuc2l6ZSxcclxuICAgICAgICAgICAgICBtdGltZTogZmlsZS5tdGltZS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgICAgIHN0YXJ0SW5kZXg6IGNodW5rLnN0YXJ0SW5kZXgsXHJcbiAgICAgICAgICAgICAgZW5kSW5kZXg6IGNodW5rLmVuZEluZGV4LFxyXG4gICAgICAgICAgICAgIC4uLmNodW5rLm1ldGFkYXRhLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGVtYmVkZGluZyBjaHVuayAke2l9IG9mICR7ZmlsZS5uYW1lfTpgLCBlcnJvcik7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBBZGQgY2h1bmtzIHRvIHZlY3RvciBzdG9yZVxyXG4gICAgICBpZiAoZG9jdW1lbnRDaHVua3MubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgdGhpcy5yZWNvcmRGYWlsdXJlKFxyXG4gICAgICAgICAgXCJpbmRleC5jaHVuay1lbXB0eVwiLFxyXG4gICAgICAgICAgXCJBbGwgY2h1bmsgZW1iZWRkaW5ncyBmYWlsZWQsIG5vIGRvY3VtZW50IGNodW5rc1wiLFxyXG4gICAgICAgICAgZmlsZSxcclxuICAgICAgICApO1xyXG4gICAgICAgIGlmIChmaWxlSGFzaCkge1xyXG4gICAgICAgICAgYXdhaXQgdGhpcy5mYWlsZWRGaWxlUmVnaXN0cnkucmVjb3JkRmFpbHVyZShmaWxlLnBhdGgsIGZpbGVIYXNoLCBcImluZGV4LmNodW5rLWVtcHR5XCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBhd2FpdCB0aGlzLmRyb3BTdGFsZUNodW5rc0ZvclJlYnVpbGQoZXhpc3RpbmdIYXNoZXMpO1xyXG4gICAgICAgIHJldHVybiB7IHR5cGU6IFwiZmFpbGVkXCIgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdHJ5IHtcclxuICAgICAgICBhd2FpdCB0aGlzLmRyb3BTdGFsZUNodW5rc0ZvclJlYnVpbGQoZXhpc3RpbmdIYXNoZXMpO1xyXG4gICAgICAgIGF3YWl0IHZlY3RvclN0b3JlLmFkZENodW5rcyhkb2N1bWVudENodW5rcyk7XHJcbiAgICAgICAgY29uc29sZS5sb2coYEluZGV4ZWQgJHtkb2N1bWVudENodW5rcy5sZW5ndGh9IGNodW5rcyBmcm9tICR7ZmlsZS5uYW1lfWApO1xyXG4gICAgICAgIGlmICghZXhpc3RpbmdIYXNoZXMpIHtcclxuICAgICAgICAgIGZpbGVJbnZlbnRvcnkuc2V0KGZpbGUucGF0aCwgbmV3IFNldChbZmlsZUhhc2hdKSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGV4aXN0aW5nSGFzaGVzLmFkZChmaWxlSGFzaCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGF3YWl0IHRoaXMuZmFpbGVkRmlsZVJlZ2lzdHJ5LmNsZWFyRmFpbHVyZShmaWxlLnBhdGgpO1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICB0eXBlOiBcImluZGV4ZWRcIixcclxuICAgICAgICAgIGNoYW5nZVR5cGU6IGhhc1NlZW5CZWZvcmUgPyBcInVwZGF0ZWRcIiA6IFwibmV3XCIsXHJcbiAgICAgICAgfTtcclxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBhZGRpbmcgY2h1bmtzIGZvciAke2ZpbGUubmFtZX06YCwgZXJyb3IpO1xyXG4gICAgICAgIHRoaXMucmVjb3JkRmFpbHVyZShcclxuICAgICAgICAgIFwiaW5kZXgudmVjdG9yLWFkZC1lcnJvclwiLFxyXG4gICAgICAgICAgZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpLFxyXG4gICAgICAgICAgZmlsZSxcclxuICAgICAgICApO1xyXG4gICAgICAgIGlmIChmaWxlSGFzaCkge1xyXG4gICAgICAgICAgYXdhaXQgdGhpcy5mYWlsZWRGaWxlUmVnaXN0cnkucmVjb3JkRmFpbHVyZShmaWxlLnBhdGgsIGZpbGVIYXNoLCBcImluZGV4LnZlY3Rvci1hZGQtZXJyb3JcIik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB7IHR5cGU6IFwiZmFpbGVkXCIgfTtcclxuICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGluZGV4aW5nIGZpbGUgJHtmaWxlLnBhdGh9OmAsIGVycm9yKTtcclxuICAgICAgICAgIHRoaXMucmVjb3JkRmFpbHVyZShcclxuICAgICAgICAgICAgXCJwYXJzZXIudW5leHBlY3RlZC1lcnJvclwiLFxyXG4gICAgICAgICAgICBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvciksXHJcbiAgICAgICAgICAgIGZpbGUsXHJcbiAgICAgICAgICApO1xyXG4gICAgICBpZiAoZmlsZUhhc2gpIHtcclxuICAgICAgICBhd2FpdCB0aGlzLmZhaWxlZEZpbGVSZWdpc3RyeS5yZWNvcmRGYWlsdXJlKGZpbGUucGF0aCwgZmlsZUhhc2gsIFwicGFyc2VyLnVuZXhwZWN0ZWQtZXJyb3JcIik7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHsgdHlwZTogXCJmYWlsZWRcIiB9OyAvLyBGYWlsZWRcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFdoZW4gcmVidWlsZGluZyBiZWNhdXNlIHRoZSBpbmRleCBmb3JtYXQgY2hhbmdlZCwgYSBmaWxlJ3Mgb2xkLWZvcm1hdFxyXG4gICAqIGNodW5rcyBtdXN0IG5ldmVyIHN1cnZpdmUgdGhlIHJlYnVpbGQsIGV2ZW4gaWYgdGhlIHJlYnVpbGQgaXRzZWxmIGZhaWxzXHJcbiAgICogKHBhcnNlIGZhaWx1cmUsIHplcm8gY2h1bmtzLCBvciBldmVyeSBlbWJlZGRpbmcgZmFpbGluZykgLSBvdGhlcndpc2UgdGhlXHJcbiAgICogc3RvcmUgZW5kcyB1cCBtaXhpbmcgZm9ybWF0cyBhbmQgdGhlIHN0YWxlIGNodW5rcyBhcmUgbmV2ZXIgcmV2aXNpdGVkLlxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgZHJvcFN0YWxlQ2h1bmtzRm9yUmVidWlsZChleGlzdGluZ0hhc2hlczogU2V0PHN0cmluZz4gfCB1bmRlZmluZWQpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmICghdGhpcy5vcHRpb25zLnJlYnVpbGRFeGlzdGluZ0ZpbGVzIHx8ICFleGlzdGluZ0hhc2hlcykge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBmb3IgKGNvbnN0IG9sZEhhc2ggb2YgZXhpc3RpbmdIYXNoZXMpIHtcclxuICAgICAgYXdhaXQgdGhpcy5vcHRpb25zLnZlY3RvclN0b3JlLmRlbGV0ZUJ5RmlsZUhhc2gob2xkSGFzaCk7XHJcbiAgICB9XHJcbiAgICBleGlzdGluZ0hhc2hlcy5jbGVhcigpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBwcmVwYXJlTGVnYWN5Q2h1bmtzKHRleHQ6IHN0cmluZyk6IFByb21pc2U8UHJlcGFyZWRDaHVua1tdPiB7XHJcbiAgICBjb25zdCBjaHVua3MgPSBhd2FpdCBjaHVua1RleHQobWFya2Rvd25Ub1BsYWluKHRleHQpLCB0aGlzLm9wdGlvbnMuY2h1bmtTaXplLCB0aGlzLm9wdGlvbnMuY2h1bmtPdmVybGFwLCAodCkgPT5cclxuICAgICAgdGhpcy5vcHRpb25zLmVtYmVkZGluZ01vZGVsLmNvdW50VG9rZW5zKHQpLFxyXG4gICAgKTtcclxuICAgIHJldHVybiBjaHVua3MubWFwKChjaHVuaykgPT4gKHtcclxuICAgICAgdGV4dDogY2h1bmsudGV4dCxcclxuICAgICAgZW1iZWRUZXh0OiBjaHVuay50ZXh0LFxyXG4gICAgICBzdGFydEluZGV4OiBjaHVuay5zdGFydEluZGV4LFxyXG4gICAgICBlbmRJbmRleDogY2h1bmsuZW5kSW5kZXgsXHJcbiAgICAgIG1ldGFkYXRhOiB7IGluZGV4Rm9ybWF0OiBcImxlZ2FjeVwiIH0sXHJcbiAgICB9KSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIHByZXBhcmVTdHJ1Y3R1cmVkQ2h1bmtzKG1hcmtkb3duOiBzdHJpbmcsIGZpbGU6IFNjYW5uZWRGaWxlKTogUHJvbWlzZTxQcmVwYXJlZENodW5rW10+IHtcclxuICAgIGNvbnN0IGJhc2UgPSB7XHJcbiAgICAgIGZpbGVOYW1lOiBmaWxlLm5hbWUsXHJcbiAgICAgIGNodW5rU2l6ZTogdGhpcy5vcHRpb25zLmNodW5rU2l6ZSxcclxuICAgICAgY2h1bmtPdmVybGFwOiB0aGlzLm9wdGlvbnMuY2h1bmtPdmVybGFwLFxyXG4gICAgICBjb3VudFRva2VuczogKHQ6IHN0cmluZykgPT4gdGhpcy5vcHRpb25zLmVtYmVkZGluZ01vZGVsLmNvdW50VG9rZW5zKHQpLFxyXG4gICAgfTtcclxuXHJcbiAgICBsZXQgcG9zdGVkRGF0ZTogRGF0ZVJhbmdlO1xyXG4gICAgbGV0IGNodW5rczogU3RydWN0dXJlZENodW5rW107XHJcbiAgICB0cnkge1xyXG4gICAgICBwb3N0ZWREYXRlID0gZG9jdW1lbnRQb3N0ZWREYXRlKG1hcmtkb3duLCBmaWxlLm5hbWUsIGZpbGUubXRpbWUpO1xyXG4gICAgICBjaHVua3MgPSBhd2FpdCBjaHVua1N0cnVjdHVyZWQobWFya2Rvd24sIHtcclxuICAgICAgICAuLi5iYXNlLFxyXG4gICAgICAgIHBvc3RlZERhdGUsXHJcbiAgICAgICAgZGF0ZUNvbnRleHQ6IHtcclxuICAgICAgICAgIG9yZGVyOiBkZXRlY3REYXlNb250aE9yZGVyKG1hcmtkb3duKSxcclxuICAgICAgICAgIHJlZmVyZW5jZVRpbWU6IGZpbGUubXRpbWUsXHJcbiAgICAgICAgICBkZWZhdWx0WWVhcjogTnVtYmVyKHBvc3RlZERhdGUuc3RhcnQuc2xpY2UoMCwgNCkpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS53YXJuKGBbQmlnUkFHXSBEYXRlIGV4dHJhY3Rpb24gZmFpbGVkIGZvciAke2ZpbGUubmFtZX07IGluZGV4aW5nIHdpdGhvdXQgZGF0ZXM6YCwgZXJyb3IpO1xyXG4gICAgICBwb3N0ZWREYXRlID0gZGF5UmFuZ2VPZihmaWxlLm10aW1lKTtcclxuICAgICAgY2h1bmtzID0gYXdhaXQgY2h1bmtTdHJ1Y3R1cmVkKG1hcmtkb3duLCB7IC4uLmJhc2UsIHBvc3RlZERhdGUsIGRhdGVDb250ZXh0OiB7fSwgZXh0cmFjdERhdGVzOiBmYWxzZSB9KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gY2h1bmtzLm1hcCgoY2h1bmspID0+ICh7XHJcbiAgICAgIHRleHQ6IGNodW5rLnRleHQsXHJcbiAgICAgIGVtYmVkVGV4dDogYCR7Y2h1bmsuY29udGV4dEhlYWRlcn1cXG4ke2NodW5rLnRleHR9YCxcclxuICAgICAgc3RhcnRJbmRleDogY2h1bmsuc3RhcnRJbmRleCxcclxuICAgICAgZW5kSW5kZXg6IGNodW5rLmVuZEluZGV4LFxyXG4gICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgIGluZGV4Rm9ybWF0OiBcInN0cnVjdHVyZWQtdjFcIixcclxuICAgICAgICBwb3N0ZWREYXRlOiBKU09OLnN0cmluZ2lmeShwb3N0ZWREYXRlKSxcclxuICAgICAgICBkYXRlczogSlNPTi5zdHJpbmdpZnkoY2h1bmsuZGF0ZXMpLFxyXG4gICAgICAgIHNlY3Rpb25QYXRoOiBjaHVuay5zZWN0aW9uUGF0aCxcclxuICAgICAgICBjb250ZXh0SGVhZGVyOiBjaHVuay5jb250ZXh0SGVhZGVyLFxyXG4gICAgICB9LFxyXG4gICAgfSkpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVpbmRleCBhIHNwZWNpZmljIGZpbGUgKGRlbGV0ZSBvbGQgY2h1bmtzIGFuZCByZWluZGV4KVxyXG4gICAqL1xyXG4gIGFzeW5jIHJlaW5kZXhGaWxlKGZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnN0IHsgdmVjdG9yU3RvcmUgfSA9IHRoaXMub3B0aW9ucztcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBmaWxlSGFzaCA9IGF3YWl0IGNhbGN1bGF0ZUZpbGVIYXNoKGZpbGVQYXRoKTtcclxuICAgICAgXHJcbiAgICAgIC8vIERlbGV0ZSBvbGQgY2h1bmtzXHJcbiAgICAgIGF3YWl0IHZlY3RvclN0b3JlLmRlbGV0ZUJ5RmlsZUhhc2goZmlsZUhhc2gpO1xyXG4gICAgICBcclxuICAgICAgLy8gUmVpbmRleFxyXG4gICAgICBjb25zdCBmaWxlOiBTY2FubmVkRmlsZSA9IHtcclxuICAgICAgICBwYXRoOiBmaWxlUGF0aCxcclxuICAgICAgICBuYW1lOiBmaWxlUGF0aC5zcGxpdChcIi9cIikucG9wKCkgfHwgZmlsZVBhdGgsXHJcbiAgICAgICAgZXh0ZW5zaW9uOiBmaWxlUGF0aC5zcGxpdChcIi5cIikucG9wKCkgfHwgXCJcIixcclxuICAgICAgICBtaW1lVHlwZTogZmFsc2UsXHJcbiAgICAgICAgc2l6ZTogMCxcclxuICAgICAgICBtdGltZTogbmV3IERhdGUoKSxcclxuICAgICAgfTtcclxuICAgICAgXHJcbiAgICAgIGF3YWl0IHRoaXMuaW5kZXhGaWxlKGZpbGUpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgcmVpbmRleGluZyBmaWxlICR7ZmlsZVBhdGh9OmAsIGVycm9yKTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHJlY29yZEZhaWx1cmUocmVhc29uOiBGYWlsdXJlUmVhc29uLCBkZXRhaWxzOiBzdHJpbmcgfCB1bmRlZmluZWQsIGZpbGU6IFNjYW5uZWRGaWxlKSB7XHJcbiAgICBjb25zdCBjdXJyZW50ID0gdGhpcy5mYWlsdXJlUmVhc29uQ291bnRzW3JlYXNvbl0gPz8gMDtcclxuICAgIHRoaXMuZmFpbHVyZVJlYXNvbkNvdW50c1tyZWFzb25dID0gY3VycmVudCArIDE7XHJcbiAgICBjb25zdCBkZXRhaWxTdWZmaXggPSBkZXRhaWxzID8gYCBkZXRhaWxzPSR7ZGV0YWlsc31gIDogXCJcIjtcclxuICAgIGNvbnNvbGUud2FybihcclxuICAgICAgYFtCaWdSQUddIEZhaWxlZCB0byBwYXJzZSAke2ZpbGUubmFtZX0gKHJlYXNvbj0ke3JlYXNvbn0sIGNvdW50PSR7dGhpcy5mYWlsdXJlUmVhc29uQ291bnRzW3JlYXNvbl19KSR7ZGV0YWlsU3VmZml4fWAsXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBsb2dGYWlsdXJlU3VtbWFyeSgpIHtcclxuICAgIGNvbnN0IGVudHJpZXMgPSBPYmplY3QuZW50cmllcyh0aGlzLmZhaWx1cmVSZWFzb25Db3VudHMpO1xyXG4gICAgaWYgKGVudHJpZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKFwiW0JpZ1JBR10gTm8gcGFyc2luZyBmYWlsdXJlcyByZWNvcmRlZC5cIik7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGNvbnNvbGUubG9nKFwiW0JpZ1JBR10gRmFpbHVyZSByZWFzb24gc3VtbWFyeTpcIik7XHJcbiAgICBmb3IgKGNvbnN0IFtyZWFzb24sIGNvdW50XSBvZiBlbnRyaWVzKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGAgIC0gJHtyZWFzb259OiAke2NvdW50fWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyB3cml0ZUZhaWx1cmVSZXBvcnQoc3VtbWFyeTogSW5kZXhpbmdSZXN1bHQpIHtcclxuICAgIGNvbnN0IHJlcG9ydFBhdGggPSB0aGlzLm9wdGlvbnMuZmFpbHVyZVJlcG9ydFBhdGg7XHJcbiAgICBpZiAoIXJlcG9ydFBhdGgpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHBheWxvYWQgPSB7XHJcbiAgICAgIC4uLnN1bW1hcnksXHJcbiAgICAgIGRvY3VtZW50c0RpcjogdGhpcy5vcHRpb25zLmRvY3VtZW50c0RpcixcclxuICAgICAgZmFpbHVyZVJlYXNvbnM6IHRoaXMuZmFpbHVyZVJlYXNvbkNvdW50cyxcclxuICAgICAgZ2VuZXJhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgIH07XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgYXdhaXQgZnMucHJvbWlzZXMubWtkaXIocGF0aC5kaXJuYW1lKHJlcG9ydFBhdGgpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcclxuICAgICAgYXdhaXQgZnMucHJvbWlzZXMud3JpdGVGaWxlKHJlcG9ydFBhdGgsIEpTT04uc3RyaW5naWZ5KHBheWxvYWQsIG51bGwsIDIpLCBcInV0Zi04XCIpO1xyXG4gICAgICBjb25zb2xlLmxvZyhgW0JpZ1JBR10gV3JvdGUgZmFpbHVyZSByZXBvcnQgdG8gJHtyZXBvcnRQYXRofWApO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcihgW0JpZ1JBR10gRmFpbGVkIHRvIHdyaXRlIGZhaWx1cmUgcmVwb3J0IHRvICR7cmVwb3J0UGF0aH06YCwgZXJyb3IpO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuIiwgImltcG9ydCB7IHR5cGUgTE1TdHVkaW9DbGllbnQgfSBmcm9tIFwiQGxtc3R1ZGlvL3Nka1wiO1xyXG5pbXBvcnQgeyBJbmRleE1hbmFnZXIsIHR5cGUgSW5kZXhpbmdQcm9ncmVzcywgdHlwZSBJbmRleGluZ1Jlc3VsdCB9IGZyb20gXCIuL2luZGV4TWFuYWdlclwiO1xyXG5pbXBvcnQgeyBWZWN0b3JTdG9yZSB9IGZyb20gXCIuLi92ZWN0b3JzdG9yZS92ZWN0b3JTdG9yZVwiO1xyXG5pbXBvcnQgeyByZXNvbHZlRW1iZWRkaW5nTW9kZWxJZCB9IGZyb20gXCIuLi9jb25maWdcIjtcclxuaW1wb3J0IHsgcGxhbkluZGV4Rm9ybWF0LCBzeW5jRW1iZWRkaW5nTWFuaWZlc3RBZnRlckluZGV4aW5nIH0gZnJvbSBcIi4uL3V0aWxzL2VtYmVkZGluZ0luZGV4TWFuaWZlc3RcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUnVuSW5kZXhpbmdQYXJhbXMge1xyXG4gIGNsaWVudDogTE1TdHVkaW9DbGllbnQ7XHJcbiAgYWJvcnRTaWduYWw6IEFib3J0U2lnbmFsO1xyXG4gIGRvY3VtZW50c0Rpcjogc3RyaW5nO1xyXG4gIHZlY3RvclN0b3JlRGlyOiBzdHJpbmc7XHJcbiAgZW1iZWRkaW5nTW9kZWxJZDogc3RyaW5nO1xyXG4gIGNodW5rU2l6ZTogbnVtYmVyO1xyXG4gIGNodW5rT3ZlcmxhcDogbnVtYmVyO1xyXG4gIG1heENvbmN1cnJlbnQ6IG51bWJlcjtcclxuICBlbmFibGVPQ1I6IGJvb2xlYW47XHJcbiAgc3RydWN0dXJlZEluZGV4aW5nOiBib29sZWFuO1xyXG4gIGF1dG9SZWluZGV4OiBib29sZWFuO1xyXG4gIHBhcnNlRGVsYXlNczogbnVtYmVyO1xyXG4gIC8qKiBHbG9iIHBhdHRlcm5zIHJlbGF0aXZlIHRvIGRvY3VtZW50cyBkaXI7IG1hdGNoaW5nIHN1cHBvcnRlZCBmaWxlcyBhcmUgbm90IHBhcnNlZCBvciBlbWJlZGRlZC4gKi9cclxuICBleGNsdWRlUGF0dGVybnM/OiBzdHJpbmdbXTtcclxuICBmb3JjZVJlaW5kZXg/OiBib29sZWFuO1xyXG4gIHZlY3RvclN0b3JlPzogVmVjdG9yU3RvcmU7XHJcbiAgb25Qcm9ncmVzcz86IChwcm9ncmVzczogSW5kZXhpbmdQcm9ncmVzcykgPT4gdm9pZDtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBSdW5JbmRleGluZ1Jlc3VsdCB7XHJcbiAgc3VtbWFyeTogc3RyaW5nO1xyXG4gIHN0YXRzOiB7XHJcbiAgICB0b3RhbENodW5rczogbnVtYmVyO1xyXG4gICAgdW5pcXVlRmlsZXM6IG51bWJlcjtcclxuICB9O1xyXG4gIGluZGV4aW5nUmVzdWx0OiBJbmRleGluZ1Jlc3VsdDtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNoYXJlZCBoZWxwZXIgdGhhdCBydW5zIHRoZSBmdWxsIGluZGV4aW5nIHBpcGVsaW5lLlxyXG4gKiBBbGxvd3MgcmV1c2UgYWNyb3NzIHRoZSBtYW51YWwgdG9vbCwgY29uZmlnLXRyaWdnZXJlZCBpbmRleGluZywgYW5kIGF1dG9tYXRpYyBib290c3RyYXBwaW5nLlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1bkluZGV4aW5nSm9iKHtcclxuICBjbGllbnQsXHJcbiAgYWJvcnRTaWduYWwsXHJcbiAgZG9jdW1lbnRzRGlyLFxyXG4gIHZlY3RvclN0b3JlRGlyLFxyXG4gIGVtYmVkZGluZ01vZGVsSWQsXHJcbiAgY2h1bmtTaXplLFxyXG4gIGNodW5rT3ZlcmxhcCxcclxuICBtYXhDb25jdXJyZW50LFxyXG4gIGVuYWJsZU9DUixcclxuICBzdHJ1Y3R1cmVkSW5kZXhpbmcsXHJcbiAgYXV0b1JlaW5kZXgsXHJcbiAgcGFyc2VEZWxheU1zLFxyXG4gIGV4Y2x1ZGVQYXR0ZXJucyA9IFtdLFxyXG4gIGZvcmNlUmVpbmRleCA9IGZhbHNlLFxyXG4gIHZlY3RvclN0b3JlOiBleGlzdGluZ1ZlY3RvclN0b3JlLFxyXG4gIG9uUHJvZ3Jlc3MsXHJcbn06IFJ1bkluZGV4aW5nUGFyYW1zKTogUHJvbWlzZTxSdW5JbmRleGluZ1Jlc3VsdD4ge1xyXG4gIGNvbnN0IHZlY3RvclN0b3JlID0gZXhpc3RpbmdWZWN0b3JTdG9yZSA/PyBuZXcgVmVjdG9yU3RvcmUodmVjdG9yU3RvcmVEaXIpO1xyXG4gIGNvbnN0IG93bnNWZWN0b3JTdG9yZSA9IGV4aXN0aW5nVmVjdG9yU3RvcmUgPT09IHVuZGVmaW5lZDtcclxuXHJcbiAgaWYgKG93bnNWZWN0b3JTdG9yZSkge1xyXG4gICAgYXdhaXQgdmVjdG9yU3RvcmUuaW5pdGlhbGl6ZSgpO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgcmVzb2x2ZWRNb2RlbElkID0gcmVzb2x2ZUVtYmVkZGluZ01vZGVsSWQoZW1iZWRkaW5nTW9kZWxJZCk7XHJcbiAgY29uc3QgZW1iZWRkaW5nTW9kZWwgPSBhd2FpdCBjbGllbnQuZW1iZWRkaW5nLm1vZGVsKHJlc29sdmVkTW9kZWxJZCwgeyBzaWduYWw6IGFib3J0U2lnbmFsIH0pO1xyXG5cclxuICBjb25zdCBzdGF0c0JlZm9yZSA9IGF3YWl0IHZlY3RvclN0b3JlLmdldFN0YXRzKCk7XHJcbiAgY29uc3QgeyBpbmRleEZvcm1hdCwgcmVidWlsZEV4aXN0aW5nRmlsZXMgfSA9IGF3YWl0IHBsYW5JbmRleEZvcm1hdChcclxuICAgIHZlY3RvclN0b3JlRGlyLFxyXG4gICAgc3RhdHNCZWZvcmUudG90YWxDaHVua3MsXHJcbiAgICBzdHJ1Y3R1cmVkSW5kZXhpbmcsXHJcbiAgKTtcclxuXHJcbiAgY29uc3QgaW5kZXhNYW5hZ2VyID0gbmV3IEluZGV4TWFuYWdlcih7XHJcbiAgICBkb2N1bWVudHNEaXIsXHJcbiAgICB2ZWN0b3JTdG9yZSxcclxuICAgIHZlY3RvclN0b3JlRGlyLFxyXG4gICAgZW1iZWRkaW5nTW9kZWwsXHJcbiAgICBjbGllbnQsXHJcbiAgICBjaHVua1NpemUsXHJcbiAgICBjaHVua092ZXJsYXAsXHJcbiAgICBtYXhDb25jdXJyZW50LFxyXG4gICAgZW5hYmxlT0NSLFxyXG4gICAgYXV0b1JlaW5kZXg6IGZvcmNlUmVpbmRleCB8fCByZWJ1aWxkRXhpc3RpbmdGaWxlcyA/IGZhbHNlIDogYXV0b1JlaW5kZXgsXHJcbiAgICBzdHJ1Y3R1cmVkSW5kZXhpbmcsXHJcbiAgICByZWJ1aWxkRXhpc3RpbmdGaWxlcyxcclxuICAgIHBhcnNlRGVsYXlNcyxcclxuICAgIGV4Y2x1ZGVQYXR0ZXJucyxcclxuICAgIGFib3J0U2lnbmFsLFxyXG4gICAgb25Qcm9ncmVzcyxcclxuICB9KTtcclxuXHJcbiAgbGV0IGluZGV4aW5nUmVzdWx0OiBJbmRleGluZ1Jlc3VsdDtcclxuICB0cnkge1xyXG4gICAgaW5kZXhpbmdSZXN1bHQgPSBhd2FpdCBpbmRleE1hbmFnZXIuaW5kZXgoKTtcclxuICB9IGZpbmFsbHkge1xyXG4gICAgYXdhaXQgdmVjdG9yU3RvcmUucmVsZWFzZVNoYXJkQ2FjaGUoKTtcclxuICB9XHJcbiAgY29uc3Qgc3RhdHMgPSBhd2FpdCB2ZWN0b3JTdG9yZS5nZXRTdGF0cygpO1xyXG5cclxuICBhd2FpdCBzeW5jRW1iZWRkaW5nTWFuaWZlc3RBZnRlckluZGV4aW5nKFxyXG4gICAgdmVjdG9yU3RvcmVEaXIsXHJcbiAgICBzdGF0cy50b3RhbENodW5rcyxcclxuICAgIHJlc29sdmVkTW9kZWxJZCxcclxuICAgIGVtYmVkZGluZ01vZGVsLFxyXG4gICAgaW5kZXhGb3JtYXQsXHJcbiAgKTtcclxuXHJcbiAgaWYgKG93bnNWZWN0b3JTdG9yZSkge1xyXG4gICAgYXdhaXQgdmVjdG9yU3RvcmUuY2xvc2UoKTtcclxuICB9XHJcblxyXG4gIGNvbnN0IHN1bW1hcnkgPSBgSW5kZXhpbmcgY29tcGxldGVkIVxcblxcbmAgK1xyXG4gICAgYFx1MjAyMiBTdWNjZXNzZnVsbHkgaW5kZXhlZDogJHtpbmRleGluZ1Jlc3VsdC5zdWNjZXNzZnVsRmlsZXN9LyR7aW5kZXhpbmdSZXN1bHQudG90YWxGaWxlc31cXG5gICtcclxuICAgIGBcdTIwMjIgRmFpbGVkOiAke2luZGV4aW5nUmVzdWx0LmZhaWxlZEZpbGVzfVxcbmAgK1xyXG4gICAgYFx1MjAyMiBTa2lwcGVkICh1bmNoYW5nZWQpOiAke2luZGV4aW5nUmVzdWx0LnNraXBwZWRGaWxlc31cXG5gICtcclxuICAgIGBcdTIwMjIgVXBkYXRlZCBleGlzdGluZyBmaWxlczogJHtpbmRleGluZ1Jlc3VsdC51cGRhdGVkRmlsZXN9XFxuYCArXHJcbiAgICBgXHUyMDIyIE5ldyBmaWxlcyBhZGRlZDogJHtpbmRleGluZ1Jlc3VsdC5uZXdGaWxlc31cXG5gICtcclxuICAgIGBcdTIwMjIgQ2h1bmtzIGluIHN0b3JlOiAke3N0YXRzLnRvdGFsQ2h1bmtzfVxcbmAgK1xyXG4gICAgYFx1MjAyMiBVbmlxdWUgZmlsZXMgaW4gc3RvcmU6ICR7c3RhdHMudW5pcXVlRmlsZXN9YDtcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHN1bW1hcnksXHJcbiAgICBzdGF0cyxcclxuICAgIGluZGV4aW5nUmVzdWx0LFxyXG4gIH07XHJcbn1cclxuXHJcbiIsICJpbXBvcnQgeyB0eXBlIFNlYXJjaFJlc3VsdCB9IGZyb20gXCIuLi92ZWN0b3JzdG9yZS92ZWN0b3JTdG9yZVwiO1xyXG5cclxuLyoqXHJcbiAqIFdoZW4gdHdvIHNlbGVjdGVkIHNlYXJjaCByZXN1bHRzIGFyZSBhZGphY2VudCBjaHVua3MgKGNvbnNlY3V0aXZlXHJcbiAqIGNodW5rSW5kZXgpIGZyb20gdGhlIHNhbWUgZmlsZSwgdGhleSBzaGFyZSBgb3ZlcmxhcGAgd29yZHMgYnlcclxuICogY29uc3RydWN0aW9uIChzZWUgdGV4dENodW5rZXIudHMncyBzbGlkaW5nIHdpbmRvdykgLSBib3RoIGNhbiBzY29yZSBoaWdobHlcclxuICogZm9yIHRoZSBzYW1lIHF1ZXJ5IGJlY2F1c2UgdGhleSBib3RoIGNvbnRhaW4gdGhlIHNoYXJlZCBzcGFuLiBUaGlzIGRvZXNcclxuICogTk9UIGRyb3AgZWl0aGVyIGNodW5rIChvdmVybGFwIGFscmVhZHkgZGlkIGl0cyBqb2IgYnkgZW5zdXJpbmcgdGhlXHJcbiAqIHJlbGV2YW50IGNvbnRlbnQgd2Fzbid0IGxvc3QgYXQgYSBjaHVuayBib3VuZGFyeSk7IGl0IG9ubHkgdHJpbXMgdGhlXHJcbiAqIHNoYXJlZCB3b3JkcyBvZmYgdGhlIGxhdGVyIGNodW5rJ3MgdGV4dCBzbyB0aGUgc2FtZSB3b3JkcyBhcmVuJ3Qgc2hvd24gdG9cclxuICogdGhlIG1vZGVsL3VzZXIgdHdpY2UsIHdoaWxlIGtlZXBpbmcgZWFjaCBjaHVuaydzIHVuaXF1ZSBjb250ZW50IGludGFjdC5cclxuICpcclxuICogVXNlcyBlYWNoIGNodW5rJ3Mgb3duIHJlY29yZGVkIHN0YXJ0SW5kZXgvZW5kSW5kZXggKHdvcmQgb2Zmc2V0cywgc3RhbXBlZFxyXG4gKiBkdXJpbmcgaW5kZXhpbmcpIHJhdGhlciB0aGFuIGEgZml4ZWQgb3ZlcmxhcCBjb25zdGFudCwgc2luY2UgY2h1bmsgc2l6aW5nXHJcbiAqIGlzIGNhbGlicmF0ZWQgcGVyIGRvY3VtZW50IGFuZCBjYW4gZGlmZmVyIGZyb20gb25lIGluZGV4aW5nIHJ1biB0byBhbm90aGVyLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHRyaW1PdmVybGFwcGluZ0NodW5rcyhyZXN1bHRzOiBTZWFyY2hSZXN1bHRbXSk6IFNlYXJjaFJlc3VsdFtdIHtcclxuICBjb25zdCBieUZpbGUgPSBuZXcgTWFwPHN0cmluZywgU2VhcmNoUmVzdWx0W10+KCk7XHJcbiAgZm9yIChjb25zdCByZXN1bHQgb2YgcmVzdWx0cykge1xyXG4gICAgY29uc3QgbGlzdCA9IGJ5RmlsZS5nZXQocmVzdWx0LmZpbGVQYXRoKTtcclxuICAgIGlmIChsaXN0KSB7XHJcbiAgICAgIGxpc3QucHVzaChyZXN1bHQpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgYnlGaWxlLnNldChyZXN1bHQuZmlsZVBhdGgsIFtyZXN1bHRdKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGNvbnN0IHRyaW1tZWRUZXh0QnlLZXkgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xyXG4gIGNvbnN0IGtleUZvciA9IChyZXN1bHQ6IFNlYXJjaFJlc3VsdCkgPT4gYCR7cmVzdWx0LmZpbGVQYXRofTo6JHtyZXN1bHQuY2h1bmtJbmRleH1gO1xyXG5cclxuICBmb3IgKGNvbnN0IGZpbGVSZXN1bHRzIG9mIGJ5RmlsZS52YWx1ZXMoKSkge1xyXG4gICAgaWYgKGZpbGVSZXN1bHRzLmxlbmd0aCA8IDIpIGNvbnRpbnVlO1xyXG5cclxuICAgIGNvbnN0IGJ5UG9zaXRpb24gPSBbLi4uZmlsZVJlc3VsdHNdLnNvcnQoKGEsIGIpID0+IGEuY2h1bmtJbmRleCAtIGIuY2h1bmtJbmRleCk7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCBieVBvc2l0aW9uLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IHByZXYgPSBieVBvc2l0aW9uW2kgLSAxXTtcclxuICAgICAgY29uc3QgY3VyciA9IGJ5UG9zaXRpb25baV07XHJcbiAgICAgIGlmIChjdXJyLmNodW5rSW5kZXggLSBwcmV2LmNodW5rSW5kZXggIT09IDEpIGNvbnRpbnVlOyAvLyBub3QgYWRqYWNlbnQsIGNhbid0IG92ZXJsYXBcclxuXHJcbiAgICAgIGNvbnN0IHByZXZFbmQgPSBwcmV2Lm1ldGFkYXRhPy5lbmRJbmRleDtcclxuICAgICAgY29uc3QgY3VyclN0YXJ0ID0gY3Vyci5tZXRhZGF0YT8uc3RhcnRJbmRleDtcclxuICAgICAgaWYgKHR5cGVvZiBwcmV2RW5kICE9PSBcIm51bWJlclwiIHx8IHR5cGVvZiBjdXJyU3RhcnQgIT09IFwibnVtYmVyXCIpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgY29uc3Qgb3ZlcmxhcFdvcmRDb3VudCA9IHByZXZFbmQgLSBjdXJyU3RhcnQ7XHJcbiAgICAgIGlmIChvdmVybGFwV29yZENvdW50IDw9IDApIGNvbnRpbnVlO1xyXG5cclxuICAgICAgY29uc3Qgd29yZHMgPSBjdXJyLnRleHQuc3BsaXQoL1xccysvKTtcclxuICAgICAgaWYgKG92ZXJsYXBXb3JkQ291bnQgPj0gd29yZHMubGVuZ3RoKSBjb250aW51ZTsgLy8gaW5jb25zaXN0ZW50IG1ldGFkYXRhIC0gbGVhdmUgYXMtaXMgcmF0aGVyIHRoYW4gZW1wdHlpbmcgaXRcclxuXHJcbiAgICAgIHRyaW1tZWRUZXh0QnlLZXkuc2V0KGtleUZvcihjdXJyKSwgd29yZHMuc2xpY2Uob3ZlcmxhcFdvcmRDb3VudCkuam9pbihcIiBcIikpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYgKHRyaW1tZWRUZXh0QnlLZXkuc2l6ZSA9PT0gMCkge1xyXG4gICAgcmV0dXJuIHJlc3VsdHM7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gcmVzdWx0cy5tYXAoKHJlc3VsdCkgPT4ge1xyXG4gICAgY29uc3QgdHJpbW1lZFRleHQgPSB0cmltbWVkVGV4dEJ5S2V5LmdldChrZXlGb3IocmVzdWx0KSk7XHJcbiAgICByZXR1cm4gdHJpbW1lZFRleHQgIT09IHVuZGVmaW5lZCA/IHsgLi4ucmVzdWx0LCB0ZXh0OiB0cmltbWVkVGV4dCB9IDogcmVzdWx0O1xyXG4gIH0pO1xyXG59XHJcbiIsICJleHBvcnQgdHlwZSBFbWJlZFNlbnRlbmNlcyA9IChzZW50ZW5jZXM6IHN0cmluZ1tdKSA9PiBQcm9taXNlPEFycmF5PHsgZW1iZWRkaW5nOiBudW1iZXJbXSB9Pj47XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENvbXBhY3RQYXNzYWdlT3B0aW9ucyB7XHJcbiAgLyoqIFNlbnRlbmNlcyBzY29yaW5nIGJlbG93IHRoaXMgY29zaW5lIHNpbWlsYXJpdHkgdG8gdGhlIHF1ZXJ5IGFyZSBkcm9wcGVkLiAqL1xyXG4gIG1pblNpbWlsYXJpdHk/OiBudW1iZXI7XHJcbiAgLyoqIEFsd2F5cyBrZWVwIGF0IGxlYXN0IHRoaXMgbWFueSBzZW50ZW5jZXMgKHRoZSBoaWdoZXN0LXNjb3Jpbmcgb25lcyksIGV2ZW4gaWYgbm9uZSBjbGVhciBtaW5TaW1pbGFyaXR5LiAqL1xyXG4gIG1pblNlbnRlbmNlcz86IG51bWJlcjtcclxufVxyXG5cclxuY29uc3QgREVGQVVMVF9NSU5fU0lNSUxBUklUWSA9IDAuNTtcclxuY29uc3QgREVGQVVMVF9NSU5fU0VOVEVOQ0VTID0gMjtcclxuXHJcbi8qKlxyXG4gKiBTcGxpdHMgY2h1bmsgdGV4dCBpbnRvIHNlbnRlbmNlcyBvbiB0ZXJtaW5hbCBwdW5jdHVhdGlvbi4gQ2h1bmsgdGV4dCBoYXNcclxuICogYWxyZWFkeSBoYWQgYWxsIHdoaXRlc3BhY2UgKGluY2x1ZGluZyBuZXdsaW5lcykgY29sbGFwc2VkIHRvIHNpbmdsZSBzcGFjZXNcclxuICogYnkgdGV4dENodW5rZXIudHMsIHNvIHRoaXMgaXMgdGhlIG9ubHkgc3RydWN0dXJlIGxlZnQgdG8gc3BsaXQgb24uIENvbnRlbnRcclxuICogd2l0aCBubyB0ZXJtaW5hbCBwdW5jdHVhdGlvbiBhdCBhbGwgKGUuZy4gYSBQUFRYL0RPQ1ggdGFibGUgcm93IHJlbmRlcmVkIGFzXHJcbiAqIFwiQ2VsbDEgfCBDZWxsMlwiKSBmYWxscyBiYWNrIHRvIGEgc2luZ2xlIFwic2VudGVuY2VcIiBjb3ZlcmluZyB0aGUgd2hvbGVcclxuICogdGV4dCwgd2hpY2ggY29tcGFjdFBhc3NhZ2VUZXh0IHRoZW4gbGVhdmVzIHVudG91Y2hlZCByYXRoZXIgdGhhbiBndWVzc2luZ1xyXG4gKiB3aGVyZSB0byBjdXQgaXQuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gc3BsaXRJbnRvU2VudGVuY2VzKHRleHQ6IHN0cmluZyk6IHN0cmluZ1tdIHtcclxuICBjb25zdCBtYXRjaGVzID0gdGV4dC5tYXRjaCgvW14uIT9dK1suIT9dKyg/PVxcc3wkKXxbXi4hP10rJC9nKTtcclxuICBpZiAoIW1hdGNoZXMgfHwgbWF0Y2hlcy5sZW5ndGggPT09IDApIHtcclxuICAgIGNvbnN0IHRyaW1tZWQgPSB0ZXh0LnRyaW0oKTtcclxuICAgIHJldHVybiB0cmltbWVkLmxlbmd0aCA+IDAgPyBbdHJpbW1lZF0gOiBbXTtcclxuICB9XHJcbiAgcmV0dXJuIG1hdGNoZXMubWFwKChzKSA9PiBzLnRyaW0oKSkuZmlsdGVyKChzKSA9PiBzLmxlbmd0aCA+IDApO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY29zaW5lU2ltaWxhcml0eShhOiBudW1iZXJbXSwgYjogbnVtYmVyW10pOiBudW1iZXIge1xyXG4gIGNvbnN0IGxlbmd0aCA9IE1hdGgubWluKGEubGVuZ3RoLCBiLmxlbmd0aCk7XHJcbiAgbGV0IGRvdCA9IDA7XHJcbiAgbGV0IG5vcm1BID0gMDtcclxuICBsZXQgbm9ybUIgPSAwO1xyXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcclxuICAgIGRvdCArPSBhW2ldICogYltpXTtcclxuICAgIG5vcm1BICs9IGFbaV0gKiBhW2ldO1xyXG4gICAgbm9ybUIgKz0gYltpXSAqIGJbaV07XHJcbiAgfVxyXG4gIGlmIChub3JtQSA9PT0gMCB8fCBub3JtQiA9PT0gMCkge1xyXG4gICAgcmV0dXJuIDA7XHJcbiAgfVxyXG4gIHJldHVybiBkb3QgLyAoTWF0aC5zcXJ0KG5vcm1BKSAqIE1hdGguc3FydChub3JtQikpO1xyXG59XHJcblxyXG4vKipcclxuICogRXh0cmFjdGl2ZSBjb21wYWN0aW9uOiBrZWVwcyBvbmx5IHRoZSBzZW50ZW5jZXMgb2YgYHRleHRgIG1vc3QgcmVsZXZhbnQgdG9cclxuICogYHF1ZXJ5RW1iZWRkaW5nYCwgaW4gdGhlaXIgb3JpZ2luYWwgb3JkZXIuIE5ldmVyIHJld3JpdGVzIG9yIHN1bW1hcml6ZXMgLVxyXG4gKiBvbmx5IHNlbGVjdHMgYSBzdWJzZXQgb2YgdGhlIG9yaWdpbmFsIHNlbnRlbmNlcyAtIHNvIGl0IGNhbiBzaHJpbmsgYVxyXG4gKiBwYXNzYWdlJ3Mgc2l6ZSB3aXRob3V0IHJpc2tpbmcgYSBmYWN0IGJlaW5nIHBhcmFwaHJhc2VkIGF3YXkuXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY29tcGFjdFBhc3NhZ2VUZXh0KFxyXG4gIHRleHQ6IHN0cmluZyxcclxuICBxdWVyeUVtYmVkZGluZzogbnVtYmVyW10sXHJcbiAgZW1iZWQ6IEVtYmVkU2VudGVuY2VzLFxyXG4gIG9wdGlvbnM6IENvbXBhY3RQYXNzYWdlT3B0aW9ucyA9IHt9LFxyXG4pOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gIGNvbnN0IHsgbWluU2ltaWxhcml0eSA9IERFRkFVTFRfTUlOX1NJTUlMQVJJVFksIG1pblNlbnRlbmNlcyA9IERFRkFVTFRfTUlOX1NFTlRFTkNFUyB9ID0gb3B0aW9ucztcclxuXHJcbiAgY29uc3Qgc2VudGVuY2VzID0gc3BsaXRJbnRvU2VudGVuY2VzKHRleHQpO1xyXG4gIGlmIChzZW50ZW5jZXMubGVuZ3RoIDw9IG1pblNlbnRlbmNlcykge1xyXG4gICAgcmV0dXJuIHRleHQ7XHJcbiAgfVxyXG5cclxuICBjb25zdCBlbWJlZGRlZCA9IGF3YWl0IGVtYmVkKHNlbnRlbmNlcyk7XHJcbiAgY29uc3Qgc2NvcmVkID0gc2VudGVuY2VzLm1hcCgoc2VudGVuY2UsIGluZGV4KSA9PiAoe1xyXG4gICAgc2VudGVuY2UsXHJcbiAgICBpbmRleCxcclxuICAgIHNpbWlsYXJpdHk6IGNvc2luZVNpbWlsYXJpdHkocXVlcnlFbWJlZGRpbmcsIGVtYmVkZGVkW2luZGV4XS5lbWJlZGRpbmcpLFxyXG4gIH0pKTtcclxuXHJcbiAgY29uc3QgYWJvdmVUaHJlc2hvbGQgPSBzY29yZWQuZmlsdGVyKChzKSA9PiBzLnNpbWlsYXJpdHkgPj0gbWluU2ltaWxhcml0eSk7XHJcbiAgY29uc3Qga2VwdCA9XHJcbiAgICBhYm92ZVRocmVzaG9sZC5sZW5ndGggPj0gbWluU2VudGVuY2VzXHJcbiAgICAgID8gYWJvdmVUaHJlc2hvbGRcclxuICAgICAgOiBbLi4uc2NvcmVkXS5zb3J0KChhLCBiKSA9PiBiLnNpbWlsYXJpdHkgLSBhLnNpbWlsYXJpdHkpLnNsaWNlKDAsIG1pblNlbnRlbmNlcyk7XHJcblxyXG4gIGtlcHQuc29ydCgoYSwgYikgPT4gYS5pbmRleCAtIGIuaW5kZXgpOyAvLyByZXN0b3JlIG9yaWdpbmFsIHNlbnRlbmNlIG9yZGVyXHJcbiAgcmV0dXJuIGtlcHQubWFwKChzKSA9PiBzLnNlbnRlbmNlKS5qb2luKFwiIFwiKTtcclxufVxyXG4iLCAiaW1wb3J0IHsgdHlwZSBTZWFyY2hSZXN1bHQsIHR5cGUgVmVjdG9yU3RvcmUgfSBmcm9tIFwiLi4vdmVjdG9yc3RvcmUvdmVjdG9yU3RvcmVcIjtcclxuaW1wb3J0IHsgdHJpbU92ZXJsYXBwaW5nQ2h1bmtzIH0gZnJvbSBcIi4uL3V0aWxzL3RyaW1PdmVybGFwcGluZ0NodW5rc1wiO1xyXG5pbXBvcnQgeyBjb21wYWN0UGFzc2FnZVRleHQsIHR5cGUgRW1iZWRTZW50ZW5jZXMgfSBmcm9tIFwiLi4vdXRpbHMvY29tcGFjdFBhc3NhZ2VzXCI7XHJcbmltcG9ydCB7IHR5cGUgQ291bnRUb2tlbnMgfSBmcm9tIFwiLi4vdXRpbHMvdGV4dENodW5rZXJcIjtcclxuXHJcbi8qKiBIb3cgbWFueSBjYW5kaWRhdGUgcGFzc2FnZXMgdG8gcHVsbCBwZXIgb25lIHJlcXVlc3RlZCBieSByZXRyaWV2YWxMaW1pdCB3aGVuIGNvbXBhY3Rpb24gaXMgb24uICovXHJcbmV4cG9ydCBjb25zdCBDT05URVhUX0NPTVBBQ1RJT05fUE9PTF9NVUxUSVBMSUVSID0gMztcclxuXHJcbmV4cG9ydCB0eXBlIFN0YWdlTmFtZSA9IFwiZW1iZWRRdWVyeVwiIHwgXCJ2ZWN0b3JTZWFyY2hcIiB8IFwidHJpbU92ZXJsYXBcIiB8IFwiY29tcGFjdGlvblwiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBTdGFnZVRpbWluZyB7XHJcbiAgc3RhZ2U6IFN0YWdlTmFtZTtcclxuICBtczogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJldHJpZXZlRGVwcyB7XHJcbiAgdmVjdG9yU3RvcmU6IFBpY2s8VmVjdG9yU3RvcmUsIFwic2VhcmNoXCI+O1xyXG4gIGVtYmVkUXVlcnk6ICh0ZXh0OiBzdHJpbmcpID0+IFByb21pc2U8bnVtYmVyW10+O1xyXG4gIGVtYmVkU2VudGVuY2VzOiBFbWJlZFNlbnRlbmNlcztcclxuICBjb3VudFRva2VuczogQ291bnRUb2tlbnM7XHJcbiAgbm93PzogKCkgPT4gbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJldHJpZXZlT3B0aW9ucyB7XHJcbiAgcmV0cmlldmFsTGltaXQ6IG51bWJlcjtcclxuICByZXRyaWV2YWxUaHJlc2hvbGQ6IG51bWJlcjtcclxuICBjaHVua1NpemU6IG51bWJlcjtcclxuICBlbmFibGVDb250ZXh0Q29tcGFjdGlvbjogYm9vbGVhbjtcclxuICAvKiogV2hlbiBzZXQsIGFsc28gcmV0dXJuIHRoZSB0b3AtTiB2ZWN0b3IgbWF0Y2hlcyB3aXRoIG5vIHRocmVzaG9sZCwgZm9yIGV2YWx1YXRpb24gZGlhZ25vc3RpY3MuICovXHJcbiAgZGlhZ25vc3RpY1Bvb2xTaXplPzogbnVtYmVyO1xyXG4gIC8qKiBDaGVja2VkIGJldHdlZW4gc3RhZ2VzIHNvIGEgY2FuY2VsbGVkIHJlcXVlc3Qgc3RvcHMgYmVmb3JlIGRvaW5nIG1vcmUgd29yay4gKi9cclxuICBhYm9ydFNpZ25hbD86IEFib3J0U2lnbmFsO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJldHJpZXZlUmVzdWx0IHtcclxuICBwYXNzYWdlczogU2VhcmNoUmVzdWx0W107XHJcbiAgZGlhZ25vc3RpY1Bvb2w6IFNlYXJjaFJlc3VsdFtdO1xyXG4gIHRpbWluZ3M6IFN0YWdlVGltaW5nW107XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb21wYWN0cyBlYWNoIGNhbmRpZGF0ZSBwYXNzYWdlIChleHRyYWN0aXZlLCBzZW50ZW5jZS1sZXZlbCkgYW5kIGdyZWVkaWx5XHJcbiAqIGZpbGxzIHRoZSB0b2tlbiBidWRnZXQgcmV0cmlldmFsTGltaXQgZnVsbC1zaXplIGNodW5rcyB3b3VsZCBoYXZlIHVzZWQsIGluXHJcbiAqIHNjb3JlIG9yZGVyLiBLZWVwcyBhdCBsZWFzdCBvbmUgcGFzc2FnZTsgc2tpcHMgKG5vdCBicmVha3MpIG9uIG92ZXJmbG93IHNvIGFcclxuICogc21hbGxlciBjYW5kaWRhdGUgZnVydGhlciBkb3duIGNhbiBzdGlsbCBmaXQuXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBjb21wYWN0UmVzdWx0c1RvQnVkZ2V0KFxyXG4gIHJlc3VsdHM6IFNlYXJjaFJlc3VsdFtdLFxyXG4gIHF1ZXJ5RW1iZWRkaW5nOiBudW1iZXJbXSxcclxuICBkZXBzOiBSZXRyaWV2ZURlcHMsXHJcbiAgdGFyZ2V0VG9rZW5CdWRnZXQ6IG51bWJlcixcclxuKTogUHJvbWlzZTxTZWFyY2hSZXN1bHRbXT4ge1xyXG4gIGNvbnN0IGNvbXBhY3RlZDogU2VhcmNoUmVzdWx0W10gPSBbXTtcclxuICBsZXQgdXNlZFRva2VucyA9IDA7XHJcblxyXG4gIGZvciAoY29uc3QgcmVzdWx0IG9mIHJlc3VsdHMpIHtcclxuICAgIGNvbnN0IGNvbXBhY3RlZFRleHQgPSBhd2FpdCBjb21wYWN0UGFzc2FnZVRleHQocmVzdWx0LnRleHQsIHF1ZXJ5RW1iZWRkaW5nLCBkZXBzLmVtYmVkU2VudGVuY2VzKTtcclxuICAgIGNvbnN0IHRva2VuQ291bnQgPSBhd2FpdCBkZXBzLmNvdW50VG9rZW5zKGNvbXBhY3RlZFRleHQpO1xyXG5cclxuICAgIGlmIChjb21wYWN0ZWQubGVuZ3RoID4gMCAmJiB1c2VkVG9rZW5zICsgdG9rZW5Db3VudCA+IHRhcmdldFRva2VuQnVkZ2V0KSB7XHJcbiAgICAgIGNvbnRpbnVlO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbXBhY3RlZC5wdXNoKHsgLi4ucmVzdWx0LCB0ZXh0OiBjb21wYWN0ZWRUZXh0IH0pO1xyXG4gICAgdXNlZFRva2VucyArPSB0b2tlbkNvdW50O1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGNvbXBhY3RlZDtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJldHJpZXZlKFxyXG4gIHF1ZXJ5OiBzdHJpbmcsXHJcbiAgZGVwczogUmV0cmlldmVEZXBzLFxyXG4gIG9wdGlvbnM6IFJldHJpZXZlT3B0aW9ucyxcclxuKTogUHJvbWlzZTxSZXRyaWV2ZVJlc3VsdD4ge1xyXG4gIGNvbnN0IG5vdyA9IGRlcHMubm93ID8/ICgoKSA9PiBwZXJmb3JtYW5jZS5ub3coKSk7XHJcbiAgY29uc3QgdGltaW5nczogU3RhZ2VUaW1pbmdbXSA9IFtdO1xyXG5cclxuICBhc3luYyBmdW5jdGlvbiB0aW1lZDxUPihzdGFnZTogU3RhZ2VOYW1lLCBydW46ICgpID0+IFByb21pc2U8VD4pOiBQcm9taXNlPFQ+IHtcclxuICAgIGNvbnN0IHN0YXJ0ID0gbm93KCk7XHJcbiAgICBjb25zdCB2YWx1ZSA9IGF3YWl0IHJ1bigpO1xyXG4gICAgdGltaW5ncy5wdXNoKHsgc3RhZ2UsIG1zOiBub3coKSAtIHN0YXJ0IH0pO1xyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgcXVlcnlFbWJlZGRpbmcgPSBhd2FpdCB0aW1lZChcImVtYmVkUXVlcnlcIiwgKCkgPT4gZGVwcy5lbWJlZFF1ZXJ5KHF1ZXJ5KSk7XHJcbiAgb3B0aW9ucy5hYm9ydFNpZ25hbD8udGhyb3dJZkFib3J0ZWQoKTtcclxuXHJcbiAgLy8gQ29tcGFjdGlvbiBzaHJpbmtzIHBhc3NhZ2VzLCBzbyBpdCBuZWVkcyBhIGxhcmdlciBjYW5kaWRhdGUgcG9vbCB0byBjaG9vc2UgZnJvbS5cclxuICBjb25zdCBzZWFyY2hMaW1pdCA9IG9wdGlvbnMuZW5hYmxlQ29udGV4dENvbXBhY3Rpb25cclxuICAgID8gb3B0aW9ucy5yZXRyaWV2YWxMaW1pdCAqIENPTlRFWFRfQ09NUEFDVElPTl9QT09MX01VTFRJUExJRVJcclxuICAgIDogb3B0aW9ucy5yZXRyaWV2YWxMaW1pdDtcclxuXHJcbiAgY29uc3Qgc2VhcmNoZWQgPSBhd2FpdCB0aW1lZChcInZlY3RvclNlYXJjaFwiLCAoKSA9PlxyXG4gICAgZGVwcy52ZWN0b3JTdG9yZS5zZWFyY2gocXVlcnlFbWJlZGRpbmcsIHNlYXJjaExpbWl0LCBvcHRpb25zLnJldHJpZXZhbFRocmVzaG9sZCksXHJcbiAgKTtcclxuICBvcHRpb25zLmFib3J0U2lnbmFsPy50aHJvd0lmQWJvcnRlZCgpO1xyXG5cclxuICBsZXQgcGFzc2FnZXMgPSBhd2FpdCB0aW1lZChcInRyaW1PdmVybGFwXCIsIGFzeW5jICgpID0+IHRyaW1PdmVybGFwcGluZ0NodW5rcyhzZWFyY2hlZCkpO1xyXG5cclxuICBpZiAob3B0aW9ucy5lbmFibGVDb250ZXh0Q29tcGFjdGlvbiAmJiBwYXNzYWdlcy5sZW5ndGggPiAwKSB7XHJcbiAgICBjb25zdCB0YXJnZXRUb2tlbkJ1ZGdldCA9IG9wdGlvbnMucmV0cmlldmFsTGltaXQgKiBvcHRpb25zLmNodW5rU2l6ZTtcclxuICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSBwYXNzYWdlcztcclxuICAgIHBhc3NhZ2VzID0gYXdhaXQgdGltZWQoXCJjb21wYWN0aW9uXCIsICgpID0+XHJcbiAgICAgIGNvbXBhY3RSZXN1bHRzVG9CdWRnZXQoY2FuZGlkYXRlcywgcXVlcnlFbWJlZGRpbmcsIGRlcHMsIHRhcmdldFRva2VuQnVkZ2V0KSxcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICBjb25zdCBkaWFnbm9zdGljUG9vbCA9IG9wdGlvbnMuZGlhZ25vc3RpY1Bvb2xTaXplXHJcbiAgICA/IGF3YWl0IGRlcHMudmVjdG9yU3RvcmUuc2VhcmNoKHF1ZXJ5RW1iZWRkaW5nLCBvcHRpb25zLmRpYWdub3N0aWNQb29sU2l6ZSwgTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZKVxyXG4gICAgOiBbXTtcclxuXHJcbiAgcmV0dXJuIHsgcGFzc2FnZXMsIGRpYWdub3N0aWNQb29sLCB0aW1pbmdzIH07XHJcbn1cclxuIiwgImltcG9ydCB7IHR5cGUgU2VhcmNoUmVzdWx0IH0gZnJvbSBcIi4uL3ZlY3RvcnN0b3JlL3ZlY3RvclN0b3JlXCI7XHJcblxyXG4vKiogUGFzc2FnZSB0ZXh0IGFzIHNob3duIHRvIHRoZSBtb2RlbDogdGhlIGNodW5rJ3MgY29udGV4dCBoZWFkZXIgKHdoZW4gaXQgaGFzIG9uZSkgZm9sbG93ZWQgYnkgaXRzIHRleHQuICovXHJcbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJQYXNzYWdlRm9yUHJvbXB0KHJlc3VsdDogU2VhcmNoUmVzdWx0KTogc3RyaW5nIHtcclxuICBjb25zdCBoZWFkZXIgPSByZXN1bHQubWV0YWRhdGE/LmNvbnRleHRIZWFkZXI7XHJcbiAgcmV0dXJuIHR5cGVvZiBoZWFkZXIgPT09IFwic3RyaW5nXCIgJiYgaGVhZGVyLmxlbmd0aCA+IDAgPyBgJHtoZWFkZXJ9XFxuJHtyZXN1bHQudGV4dH1gIDogcmVzdWx0LnRleHQ7XHJcbn1cclxuIiwgImltcG9ydCB7XHJcbiAgdHlwZSBDaGF0TWVzc2FnZSxcclxuICB0eXBlIEZpbGVIYW5kbGUsXHJcbiAgdHlwZSBMTVN0dWRpb0NsaWVudCxcclxuICB0eXBlIFByb21wdFByZXByb2Nlc3NvckNvbnRyb2xsZXIsXHJcbiAgdHlwZSBSZXRyaWV2YWxSZXN1bHRFbnRyeSxcclxufSBmcm9tIFwiQGxtc3R1ZGlvL3Nka1wiO1xyXG5pbXBvcnQgeyBjb25maWdTY2hlbWF0aWNzLCBERUZBVUxUX1BST01QVF9URU1QTEFURSwgZ2xvYmFsQ29uZmlnU2NoZW1hdGljcyB9IGZyb20gXCIuL2NvbmZpZ1wiO1xyXG5pbXBvcnQge1xyXG4gIGFzQ29uZmlnUmVhZGVyLFxyXG4gIG5vdENvbmZpZ3VyZWRNZXNzYWdlLFxyXG4gIHJlc29sdmVTZXR0aW5ncyxcclxuICB0eXBlIFJlaW5kZXhNb2RlLFxyXG4gIHR5cGUgUmVzb2x2ZWRTZXR0aW5ncyxcclxufSBmcm9tIFwiLi9zZXR0aW5ncy9yZXNvbHZlU2V0dGluZ3NcIjtcclxuaW1wb3J0IHsgVmVjdG9yU3RvcmUgfSBmcm9tIFwiLi92ZWN0b3JzdG9yZS92ZWN0b3JTdG9yZVwiO1xyXG5pbXBvcnQgeyBwZXJmb3JtU2FuaXR5Q2hlY2tzIH0gZnJvbSBcIi4vdXRpbHMvc2FuaXR5Q2hlY2tzXCI7XHJcbmltcG9ydCB7IHRyeVN0YXJ0SW5kZXhpbmcsIGZpbmlzaEluZGV4aW5nIH0gZnJvbSBcIi4vdXRpbHMvaW5kZXhpbmdMb2NrXCI7XHJcbmltcG9ydCB7XHJcbiAgY2hlY2tFbWJlZGRpbmdNb2RlbEZvclJldHJpZXZhbCxcclxuICBkZWxldGVFbWJlZGRpbmdJbmRleE1hbmlmZXN0LFxyXG4gIGluZGV4Rm9ybWF0U3RhdHVzTWVzc2FnZSxcclxufSBmcm9tIFwiLi91dGlscy9lbWJlZGRpbmdJbmRleE1hbmlmZXN0XCI7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgcnVuSW5kZXhpbmdKb2IgfSBmcm9tIFwiLi9pbmdlc3Rpb24vcnVuSW5kZXhpbmdcIjtcclxuaW1wb3J0IHsgcmV0cmlldmUgfSBmcm9tIFwiLi9yZXRyaWV2YWwvcmV0cmlldmVcIjtcclxuaW1wb3J0IHsgcmVuZGVyUGFzc2FnZUZvclByb21wdCB9IGZyb20gXCIuL3JldHJpZXZhbC9yZW5kZXJQYXNzYWdlXCI7XHJcblxyXG4vKipcclxuICogQ2hlY2sgdGhlIGFib3J0IHNpZ25hbCBhbmQgdGhyb3cgaWYgdGhlIHJlcXVlc3QgaGFzIGJlZW4gY2FuY2VsbGVkLlxyXG4gKiBUaGlzIGdpdmVzIExNIFN0dWRpbyB0aGUgb3Bwb3J0dW5pdHkgdG8gc3RvcCB0aGUgcHJlcHJvY2Vzc29yIHByb21wdGx5LlxyXG4gKi9cclxuZnVuY3Rpb24gY2hlY2tBYm9ydChzaWduYWw6IEFib3J0U2lnbmFsKTogdm9pZCB7XHJcbiAgaWYgKHNpZ25hbC5hYm9ydGVkKSB7XHJcbiAgICB0aHJvdyBzaWduYWwucmVhc29uID8/IG5ldyBET01FeGNlcHRpb24oXCJBYm9ydGVkXCIsIFwiQWJvcnRFcnJvclwiKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGVycm9yIGlzIGFuIGFib3J0L2NhbmNlbGxhdGlvbiBlcnJvciB0aGF0IHNob3VsZCBiZSByZS10aHJvd24uXHJcbiAqL1xyXG5mdW5jdGlvbiBpc0Fib3J0RXJyb3IoZXJyb3I6IHVua25vd24pOiBib29sZWFuIHtcclxuICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBET01FeGNlcHRpb24gJiYgZXJyb3IubmFtZSA9PT0gXCJBYm9ydEVycm9yXCIpIHJldHVybiB0cnVlO1xyXG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yICYmIGVycm9yLm5hbWUgPT09IFwiQWJvcnRFcnJvclwiKSByZXR1cm4gdHJ1ZTtcclxuICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvciAmJiBlcnJvci5tZXNzYWdlID09PSBcIkFib3J0ZWRcIikgcmV0dXJuIHRydWU7XHJcbiAgcmV0dXJuIGZhbHNlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzdW1tYXJpemVUZXh0KHRleHQ6IHN0cmluZywgbWF4TGluZXM6IG51bWJlciA9IDMsIG1heENoYXJzOiBudW1iZXIgPSA0MDApOiBzdHJpbmcge1xyXG4gIGNvbnN0IGxpbmVzID0gdGV4dC5zcGxpdCgvXFxyP1xcbi8pLmZpbHRlcihsaW5lID0+IGxpbmUudHJpbSgpICE9PSBcIlwiKTtcclxuICBjb25zdCBjbGlwcGVkTGluZXMgPSBsaW5lcy5zbGljZSgwLCBtYXhMaW5lcyk7XHJcbiAgbGV0IGNsaXBwZWQgPSBjbGlwcGVkTGluZXMuam9pbihcIlxcblwiKTtcclxuICBpZiAoY2xpcHBlZC5sZW5ndGggPiBtYXhDaGFycykge1xyXG4gICAgY2xpcHBlZCA9IGNsaXBwZWQuc2xpY2UoMCwgbWF4Q2hhcnMpO1xyXG4gIH1cclxuICBjb25zdCBuZWVkc0VsbGlwc2lzID1cclxuICAgIGxpbmVzLmxlbmd0aCA+IG1heExpbmVzIHx8XHJcbiAgICB0ZXh0Lmxlbmd0aCA+IGNsaXBwZWQubGVuZ3RoIHx8XHJcbiAgICBjbGlwcGVkLmxlbmd0aCA9PT0gbWF4Q2hhcnMgJiYgdGV4dC5sZW5ndGggPiBtYXhDaGFycztcclxuICByZXR1cm4gbmVlZHNFbGxpcHNpcyA/IGAke2NsaXBwZWQudHJpbUVuZCgpfVx1MjAyNmAgOiBjbGlwcGVkO1xyXG59XHJcblxyXG4vLyBHbG9iYWwgc3RhdGUgZm9yIHZlY3RvciBzdG9yZSAocGVyc2lzdHMgYWNyb3NzIHJlcXVlc3RzKVxyXG5sZXQgdmVjdG9yU3RvcmU6IFZlY3RvclN0b3JlIHwgbnVsbCA9IG51bGw7XHJcbmxldCBsYXN0SW5kZXhlZERpciA9IFwiXCI7XHJcbmxldCBzYW5pdHlDaGVja3NQYXNzZWQgPSBmYWxzZTtcclxubGV0IGxhc3RTYW5pdHlDaGVja2VkRGlycyA9IFwiXCI7XHJcblxyXG4vLyBDYWNoZSBvZiBGaWxlSGFuZGxlcyBwcmVwYXJlZCBmb3IgY2l0YXRpb25zLCBrZXllZCBieSBmaWxlIHBhdGggKHBlcnNpc3RzXHJcbi8vIGFjcm9zcyByZXF1ZXN0cyBsaWtlIHRoZSBzdGF0ZSBhYm92ZSkuIEtleWVkIGJ5IGZpbGVIYXNoIHRvbyBzbyBhXHJcbi8vIHJlaW5kZXhlZCBmaWxlIGdldHMgYSBmcmVzaCBoYW5kbGUgaW5zdGVhZCBvZiBjaXRpbmcgc3RhbGUgY29udGVudCB1bmRlclxyXG4vLyBhIHN0YWxlIHJlZ2lzdHJhdGlvbi5cclxuY29uc3QgY2l0YXRpb25GaWxlSGFuZGxlQ2FjaGUgPSBuZXcgTWFwPHN0cmluZywgeyBmaWxlSGFzaDogc3RyaW5nOyBmaWxlSGFuZGxlOiBGaWxlSGFuZGxlIH0+KCk7XHJcblxyXG5hc3luYyBmdW5jdGlvbiBnZXRDaXRhdGlvbkZpbGVIYW5kbGUoXHJcbiAgY2xpZW50OiBMTVN0dWRpb0NsaWVudCxcclxuICBmaWxlUGF0aDogc3RyaW5nLFxyXG4gIGZpbGVIYXNoOiBzdHJpbmcsXHJcbik6IFByb21pc2U8RmlsZUhhbmRsZT4ge1xyXG4gIGNvbnN0IGNhY2hlZCA9IGNpdGF0aW9uRmlsZUhhbmRsZUNhY2hlLmdldChmaWxlUGF0aCk7XHJcbiAgaWYgKGNhY2hlZCAmJiBjYWNoZWQuZmlsZUhhc2ggPT09IGZpbGVIYXNoKSB7XHJcbiAgICByZXR1cm4gY2FjaGVkLmZpbGVIYW5kbGU7XHJcbiAgfVxyXG4gIGNvbnN0IGZpbGVIYW5kbGUgPSBhd2FpdCBjbGllbnQuZmlsZXMucHJlcGFyZUZpbGUoZmlsZVBhdGgpO1xyXG4gIGNpdGF0aW9uRmlsZUhhbmRsZUNhY2hlLnNldChmaWxlUGF0aCwgeyBmaWxlSGFzaCwgZmlsZUhhbmRsZSB9KTtcclxuICByZXR1cm4gZmlsZUhhbmRsZTtcclxufVxyXG5cclxuY29uc3QgUkFHX0NPTlRFWFRfTUFDUk8gPSBcInt7cmFnX2NvbnRleHR9fVwiO1xyXG5jb25zdCBVU0VSX1FVRVJZX01BQ1JPID0gXCJ7e3VzZXJfcXVlcnl9fVwiO1xyXG5cclxuZnVuY3Rpb24gbm9ybWFsaXplUHJvbXB0VGVtcGxhdGUodGVtcGxhdGU6IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQpOiBzdHJpbmcge1xyXG4gIGNvbnN0IGhhc0NvbnRlbnQgPSB0eXBlb2YgdGVtcGxhdGUgPT09IFwic3RyaW5nXCIgJiYgdGVtcGxhdGUudHJpbSgpLmxlbmd0aCA+IDA7XHJcbiAgbGV0IG5vcm1hbGl6ZWQgPSBoYXNDb250ZW50ID8gdGVtcGxhdGUhIDogREVGQVVMVF9QUk9NUFRfVEVNUExBVEU7XHJcblxyXG4gIGlmICghbm9ybWFsaXplZC5pbmNsdWRlcyhSQUdfQ09OVEVYVF9NQUNSTykpIHtcclxuICAgIGNvbnNvbGUud2FybihcclxuICAgICAgYFtCaWdSQUddIFByb21wdCB0ZW1wbGF0ZSBtaXNzaW5nICR7UkFHX0NPTlRFWFRfTUFDUk99LiBQcmVwZW5kaW5nIFJBRyBjb250ZXh0IGJsb2NrLmAsXHJcbiAgICApO1xyXG4gICAgbm9ybWFsaXplZCA9IGAke1JBR19DT05URVhUX01BQ1JPfVxcblxcbiR7bm9ybWFsaXplZH1gO1xyXG4gIH1cclxuXHJcbiAgaWYgKCFub3JtYWxpemVkLmluY2x1ZGVzKFVTRVJfUVVFUllfTUFDUk8pKSB7XHJcbiAgICBjb25zb2xlLndhcm4oXHJcbiAgICAgIGBbQmlnUkFHXSBQcm9tcHQgdGVtcGxhdGUgbWlzc2luZyAke1VTRVJfUVVFUllfTUFDUk99LiBBcHBlbmRpbmcgdXNlciBxdWVyeSBibG9jay5gLFxyXG4gICAgKTtcclxuICAgIG5vcm1hbGl6ZWQgPSBgJHtub3JtYWxpemVkfVxcblxcblVzZXIgUXVlcnk6XFxuXFxuJHtVU0VSX1FVRVJZX01BQ1JPfWA7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbm9ybWFsaXplZDtcclxufVxyXG5cclxuZnVuY3Rpb24gZmlsbFByb21wdFRlbXBsYXRlKHRlbXBsYXRlOiBzdHJpbmcsIHJlcGxhY2VtZW50czogUmVjb3JkPHN0cmluZywgc3RyaW5nPik6IHN0cmluZyB7XHJcbiAgcmV0dXJuIE9iamVjdC5lbnRyaWVzKHJlcGxhY2VtZW50cykucmVkdWNlKFxyXG4gICAgKGFjYywgW3Rva2VuLCB2YWx1ZV0pID0+IGFjYy5zcGxpdCh0b2tlbikuam9pbih2YWx1ZSksXHJcbiAgICB0ZW1wbGF0ZSxcclxuICApO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiB3YXJuSWZDb250ZXh0T3ZlcmZsb3coXHJcbiAgY3RsOiBQcm9tcHRQcmVwcm9jZXNzb3JDb250cm9sbGVyLFxyXG4gIGZpbmFsUHJvbXB0OiBzdHJpbmcsXHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB0b2tlblNvdXJjZSA9IGF3YWl0IGN0bC50b2tlblNvdXJjZSgpO1xyXG4gICAgaWYgKFxyXG4gICAgICAhdG9rZW5Tb3VyY2UgfHxcclxuICAgICAgIShcImFwcGx5UHJvbXB0VGVtcGxhdGVcIiBpbiB0b2tlblNvdXJjZSkgfHxcclxuICAgICAgdHlwZW9mIHRva2VuU291cmNlLmFwcGx5UHJvbXB0VGVtcGxhdGUgIT09IFwiZnVuY3Rpb25cIiB8fFxyXG4gICAgICAhKFwiY291bnRUb2tlbnNcIiBpbiB0b2tlblNvdXJjZSkgfHxcclxuICAgICAgdHlwZW9mIHRva2VuU291cmNlLmNvdW50VG9rZW5zICE9PSBcImZ1bmN0aW9uXCIgfHxcclxuICAgICAgIShcImdldENvbnRleHRMZW5ndGhcIiBpbiB0b2tlblNvdXJjZSkgfHxcclxuICAgICAgdHlwZW9mIHRva2VuU291cmNlLmdldENvbnRleHRMZW5ndGggIT09IFwiZnVuY3Rpb25cIlxyXG4gICAgKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybihcIltCaWdSQUddIFRva2VuIHNvdXJjZSBkb2VzIG5vdCBleHBvc2UgcHJvbXB0IHV0aWxpdGllczsgc2tpcHBpbmcgY29udGV4dCBjaGVjay5cIik7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBbY29udGV4dExlbmd0aCwgaGlzdG9yeV0gPSBhd2FpdCBQcm9taXNlLmFsbChbXHJcbiAgICAgIHRva2VuU291cmNlLmdldENvbnRleHRMZW5ndGgoKSxcclxuICAgICAgY3RsLnB1bGxIaXN0b3J5KCksXHJcbiAgICBdKTtcclxuICAgIGNvbnN0IGhpc3RvcnlXaXRoTGF0ZXN0TWVzc2FnZSA9IGhpc3Rvcnkud2l0aEFwcGVuZGVkKHtcclxuICAgICAgcm9sZTogXCJ1c2VyXCIsXHJcbiAgICAgIGNvbnRlbnQ6IGZpbmFsUHJvbXB0LFxyXG4gICAgfSk7XHJcbiAgICBjb25zdCBmb3JtYXR0ZWRQcm9tcHQgPSBhd2FpdCB0b2tlblNvdXJjZS5hcHBseVByb21wdFRlbXBsYXRlKGhpc3RvcnlXaXRoTGF0ZXN0TWVzc2FnZSk7XHJcbiAgICBjb25zdCBwcm9tcHRUb2tlbnMgPSBhd2FpdCB0b2tlblNvdXJjZS5jb3VudFRva2Vucyhmb3JtYXR0ZWRQcm9tcHQpO1xyXG5cclxuICAgIGlmIChwcm9tcHRUb2tlbnMgPiBjb250ZXh0TGVuZ3RoKSB7XHJcbiAgICAgIGNvbnN0IHdhcm5pbmdTdW1tYXJ5ID1cclxuICAgICAgICBgXHUyNkEwXHVGRTBGIFByb21wdCBuZWVkcyAke3Byb21wdFRva2Vucy50b0xvY2FsZVN0cmluZygpfSB0b2tlbnMgYnV0IG1vZGVsIG1heCBpcyAke2NvbnRleHRMZW5ndGgudG9Mb2NhbGVTdHJpbmcoKX0uYDtcclxuICAgICAgY29uc29sZS53YXJuKFwiW0JpZ1JBR11cIiwgd2FybmluZ1N1bW1hcnkpO1xyXG4gICAgICBjdGwuY3JlYXRlU3RhdHVzKHtcclxuICAgICAgICBzdGF0dXM6IFwiZXJyb3JcIixcclxuICAgICAgICB0ZXh0OiBgJHt3YXJuaW5nU3VtbWFyeX0gUmVkdWNlIHJldHJpZXZlZCBwYXNzYWdlcyBvciBpbmNyZWFzZSB0aGUgbW9kZWwncyBjb250ZXh0IGxlbmd0aC5gLFxyXG4gICAgICB9KTtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBhd2FpdCBjdGwuY2xpZW50LnN5c3RlbS5ub3RpZnkoe1xyXG4gICAgICAgICAgdGl0bGU6IFwiQ29udGV4dCB3aW5kb3cgZXhjZWVkZWRcIixcclxuICAgICAgICAgIGRlc2NyaXB0aW9uOiBgJHt3YXJuaW5nU3VtbWFyeX0gUHJvbXB0IG1heSBiZSB0cnVuY2F0ZWQgb3IgcmVqZWN0ZWQuYCxcclxuICAgICAgICAgIG5vQXV0b0Rpc21pc3M6IHRydWUsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0gY2F0Y2ggKG5vdGlmeUVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKFwiW0JpZ1JBR10gVW5hYmxlIHRvIHNlbmQgY29udGV4dCBvdmVyZmxvdyBub3RpZmljYXRpb246XCIsIG5vdGlmeUVycm9yKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLndhcm4oXCJbQmlnUkFHXSBGYWlsZWQgdG8gZXZhbHVhdGUgY29udGV4dCB1c2FnZTpcIiwgZXJyb3IpO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIE1haW4gcHJvbXB0IHByZXByb2Nlc3NvciBmdW5jdGlvblxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHByZXByb2Nlc3MoXHJcbiAgY3RsOiBQcm9tcHRQcmVwcm9jZXNzb3JDb250cm9sbGVyLFxyXG4gIHVzZXJNZXNzYWdlOiBDaGF0TWVzc2FnZSxcclxuKTogUHJvbWlzZTxDaGF0TWVzc2FnZSB8IHN0cmluZz4ge1xyXG4gIGNvbnN0IHVzZXJQcm9tcHQgPSB1c2VyTWVzc2FnZS5nZXRUZXh0KCk7XHJcbiAgY29uc3Qgc2V0dGluZ3MgPSByZXNvbHZlU2V0dGluZ3MoXHJcbiAgICBhc0NvbmZpZ1JlYWRlcihjdGwuZ2V0R2xvYmFsUGx1Z2luQ29uZmlnKGdsb2JhbENvbmZpZ1NjaGVtYXRpY3MpKSxcclxuICAgIGFzQ29uZmlnUmVhZGVyKGN0bC5nZXRQbHVnaW5Db25maWcoY29uZmlnU2NoZW1hdGljcykpLFxyXG4gICk7XHJcblxyXG4gIGlmIChzZXR0aW5ncy5taXNzaW5nUmVxdWlyZWQubGVuZ3RoID4gMCkge1xyXG4gICAgY29uc3QgdGV4dCA9IG5vdENvbmZpZ3VyZWRNZXNzYWdlKHNldHRpbmdzLm1pc3NpbmdSZXF1aXJlZCk7XHJcbiAgICBjb25zb2xlLndhcm4oYFtCaWdSQUddICR7dGV4dH1gKTtcclxuICAgIGN0bC5jcmVhdGVTdGF0dXMoeyBzdGF0dXM6IFwiY2FuY2VsZWRcIiwgdGV4dCB9KTtcclxuICAgIHJldHVybiB1c2VyTWVzc2FnZTtcclxuICB9XHJcblxyXG4gIGNvbnN0IHtcclxuICAgIGRvY3VtZW50c0RpcmVjdG9yeTogZG9jdW1lbnRzRGlyLFxyXG4gICAgdmVjdG9yU3RvcmVEaXJlY3Rvcnk6IHZlY3RvclN0b3JlRGlyLFxyXG4gICAgZW1iZWRkaW5nTW9kZWxJZDogcmVzb2x2ZWRFbWJlZGRpbmdNb2RlbElkLFxyXG4gICAgZXhjbHVkZVBhdHRlcm5zLFxyXG4gICAgcmV0cmlldmFsTGltaXQsXHJcbiAgICByZXRyaWV2YWxUaHJlc2hvbGQsXHJcbiAgICBjaHVua1NpemUsXHJcbiAgICBjaHVua092ZXJsYXAsXHJcbiAgICBtYXhDb25jdXJyZW50RmlsZXM6IG1heENvbmN1cnJlbnQsXHJcbiAgICBwYXJzZURlbGF5TXMsXHJcbiAgICBlbmFibGVPQ1IsXHJcbiAgICBzdHJ1Y3R1cmVkSW5kZXhpbmcsXHJcbiAgICBlbmFibGVDb250ZXh0Q29tcGFjdGlvbixcclxuICAgIHJlaW5kZXhNb2RlLFxyXG4gIH0gPSBzZXR0aW5ncztcclxuXHJcbiAgdHJ5IHtcclxuICAgIC8vIFNhbml0eSBjaGVja3MgYW5kIHZlY3RvciBzdG9yZSBpbml0IGFyZSBvbmUtdGltZSBzZXR1cCAoZ3VhcmRlZCBiZWxvdylcclxuICAgIC8vIC0gbWVyZ2VkIGludG8gYSBzaW5nbGUgc3RhdHVzIHNvIGEgZnJlc2ggc2Vzc2lvbiBzaG93cyBvbmUgXCJVc2luZyBCaWdcclxuICAgIC8vIFJBR1wiIGxpbmUgaW5zdGVhZCBvZiB0d28gc2VwYXJhdGUgb25lcywgYW5kIHN0ZWFkeS1zdGF0ZSB0dXJucyAob25jZVxyXG4gICAgLy8gYm90aCBhcmUgYWxyZWFkeSBkb25lKSBzaG93IG5vdGhpbmcgZXh0cmEgYXQgYWxsLlxyXG4gICAgY29uc3QgY3VycmVudERpcnNLZXkgPSBgJHtkb2N1bWVudHNEaXJ9XFxuJHt2ZWN0b3JTdG9yZURpcn1gO1xyXG4gICAgY29uc3QgbmVlZHNTYW5pdHlDaGVjayA9ICFzYW5pdHlDaGVja3NQYXNzZWQgfHwgbGFzdFNhbml0eUNoZWNrZWREaXJzICE9PSBjdXJyZW50RGlyc0tleTtcclxuICAgIGNvbnN0IG5lZWRzVmVjdG9yU3RvcmVJbml0ID0gIXZlY3RvclN0b3JlIHx8IGxhc3RJbmRleGVkRGlyICE9PSB2ZWN0b3JTdG9yZURpcjtcclxuXHJcbiAgICBpZiAobmVlZHNTYW5pdHlDaGVjayB8fCBuZWVkc1ZlY3RvclN0b3JlSW5pdCkge1xyXG4gICAgICBjb25zdCB1c2luZ0JpZ1JhZ1N0YXR1cyA9IGN0bC5jcmVhdGVTdGF0dXMoe1xyXG4gICAgICAgIHN0YXR1czogXCJsb2FkaW5nXCIsXHJcbiAgICAgICAgdGV4dDogXCJVc2luZyBCaWcgUkFHLi4uXCIsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgaWYgKG5lZWRzU2FuaXR5Q2hlY2spIHtcclxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgZG9jdW1lbnRzIGFuZCB2ZWN0b3Igc3RvcmUgZGlyZWN0b3JpZXMgZXhpc3QgYW5kIGFyZSBhY2Nlc3NpYmxlLCBhbmQgY2hlY2sgZGlzayBzcGFjZSBhbmQgbWVtb3J5XHJcbiAgICAgICAgY29uc3Qgc2FuaXR5UmVzdWx0ID0gYXdhaXQgcGVyZm9ybVNhbml0eUNoZWNrcyhkb2N1bWVudHNEaXIsIHZlY3RvclN0b3JlRGlyKTtcclxuXHJcbiAgICAgICAgLy8gTG9nIHdhcm5pbmdzXHJcbiAgICAgICAgZm9yIChjb25zdCB3YXJuaW5nIG9mIHNhbml0eVJlc3VsdC53YXJuaW5ncykge1xyXG4gICAgICAgICAgY29uc29sZS53YXJuKFwiW0JpZ1JBR11cIiwgd2FybmluZyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBMb2cgZXJyb3JzIGFuZCBhYm9ydCBpZiBjcml0aWNhbFxyXG4gICAgICAgIGlmICghc2FuaXR5UmVzdWx0LnBhc3NlZCkge1xyXG4gICAgICAgICAgZm9yIChjb25zdCBlcnJvciBvZiBzYW5pdHlSZXN1bHQuZXJyb3JzKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbQmlnUkFHXVwiLCBlcnJvcik7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBjb25zdCBmYWlsdXJlUmVhc29uID1cclxuICAgICAgICAgICAgc2FuaXR5UmVzdWx0LmVycm9yc1swXSA/P1xyXG4gICAgICAgICAgICBzYW5pdHlSZXN1bHQud2FybmluZ3NbMF0gPz9cclxuICAgICAgICAgICAgXCJVbmtub3duIHJlYXNvbi4gUGxlYXNlIHJldmlldyBwbHVnaW4gc2V0dGluZ3MuXCI7XHJcbiAgICAgICAgICB1c2luZ0JpZ1JhZ1N0YXR1cy5zZXRTdGF0ZSh7XHJcbiAgICAgICAgICAgIHN0YXR1czogXCJjYW5jZWxlZFwiLFxyXG4gICAgICAgICAgICB0ZXh0OiBgQmlnIFJBRyB1bmF2YWlsYWJsZTogJHtmYWlsdXJlUmVhc29ufWAsXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIHJldHVybiB1c2VyTWVzc2FnZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNhbml0eUNoZWNrc1Bhc3NlZCA9IHRydWU7XHJcbiAgICAgICAgbGFzdFNhbml0eUNoZWNrZWREaXJzID0gY3VycmVudERpcnNLZXk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNoZWNrQWJvcnQoY3RsLmFib3J0U2lnbmFsKTtcclxuXHJcbiAgICAgIGlmIChuZWVkc1ZlY3RvclN0b3JlSW5pdCkge1xyXG4gICAgICAgIC8vIENyZWF0ZSBWZWN0b3IgU3RvcmUgaWYgaXQgZG9lcyBub3QgZXhpc3QgeWV0LCBvciBvcGVuIGV4aXN0aW5nIG9uZVxyXG4gICAgICAgIHZlY3RvclN0b3JlID0gbmV3IFZlY3RvclN0b3JlKHZlY3RvclN0b3JlRGlyKTtcclxuICAgICAgICBhd2FpdCB2ZWN0b3JTdG9yZS5pbml0aWFsaXplKCk7XHJcbiAgICAgICAgY29uc3Qgc3RhdHNBZnRlckluaXQgPSBhd2FpdCB2ZWN0b3JTdG9yZS5nZXRTdGF0cygpO1xyXG4gICAgICAgIGlmIChzdGF0c0FmdGVySW5pdC50b3RhbENodW5rcyA9PT0gMCkge1xyXG4gICAgICAgICAgYXdhaXQgZGVsZXRlRW1iZWRkaW5nSW5kZXhNYW5pZmVzdCh2ZWN0b3JTdG9yZURpcik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnNvbGUuaW5mbyhcclxuICAgICAgICAgIGBbQmlnUkFHXSBWZWN0b3Igc3RvcmUgcmVhZHkgKHBhdGg9JHt2ZWN0b3JTdG9yZURpcn0pLiBXYWl0aW5nIGZvciBxdWVyaWVzLi4uYCxcclxuICAgICAgICApO1xyXG4gICAgICAgIGxhc3RJbmRleGVkRGlyID0gdmVjdG9yU3RvcmVEaXI7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHVzaW5nQmlnUmFnU3RhdHVzLnNldFN0YXRlKHtcclxuICAgICAgICBzdGF0dXM6IFwiZG9uZVwiLFxyXG4gICAgICAgIHRleHQ6IFwiVXNpbmcgQmlnIFJBR1wiLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIXZlY3RvclN0b3JlKSB7XHJcbiAgICAgIC8vIFVucmVhY2hhYmxlIGdpdmVuIHRoZSBzZXR1cCBibG9jayBhYm92ZSBhbHdheXMgaW5pdGlhbGl6ZXMgaXQgYmVmb3JlXHJcbiAgICAgIC8vIHRoaXMgcG9pbnQgaXMgcmVhY2hlZDsgZ3VhcmRzIFR5cGVTY3JpcHQncyBuYXJyb3dpbmcgYW5kIGFjdHMgYXMgYVxyXG4gICAgICAvLyBzYWZldHkgbmV0IGFnYWluc3QgYSBmdXR1cmUgcmVmYWN0b3IgYnJlYWtpbmcgdGhhdCBpbnZhcmlhbnQuXHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlZlY3RvciBzdG9yZSB3YXMgbm90IGluaXRpYWxpemVkXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIGNoZWNrQWJvcnQoY3RsLmFib3J0U2lnbmFsKTtcclxuXHJcbiAgICBhd2FpdCBydW5SZXF1ZXN0ZWRSZWluZGV4KGN0bCwgc2V0dGluZ3MsIHZlY3RvclN0b3JlKTtcclxuXHJcbiAgICBjaGVja0Fib3J0KGN0bC5hYm9ydFNpZ25hbCk7XHJcblxyXG4gICAgLy8gQ2hlY2sgaWYgd2UgbmVlZCB0byBpbmRleFxyXG4gICAgY29uc3Qgc3RhdHMgPSBhd2FpdCB2ZWN0b3JTdG9yZS5nZXRTdGF0cygpO1xyXG4gICAgY29uc29sZS5kZWJ1ZyhgW0JpZ1JBR10gVmVjdG9yIHN0b3JlIHN0YXRzIGJlZm9yZSBhdXRvLWluZGV4IGNoZWNrOiB0b3RhbENodW5rcz0ke3N0YXRzLnRvdGFsQ2h1bmtzfSwgdW5pcXVlRmlsZXM9JHtzdGF0cy51bmlxdWVGaWxlc31gKTtcclxuXHJcbiAgICBpZiAoc3RhdHMudG90YWxDaHVua3MgPT09IDApIHtcclxuICAgICAgaWYgKCF0cnlTdGFydEluZGV4aW5nKFwiYXV0by10cmlnZ2VyXCIpKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKFwiW0JpZ1JBR10gSW5kZXhpbmcgYWxyZWFkeSBydW5uaW5nLCBza2lwcGluZyBhdXRvbWF0aWMgaW5kZXhpbmcuXCIpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnN0IGluZGV4U3RhdHVzID0gY3RsLmNyZWF0ZVN0YXR1cyh7XHJcbiAgICAgICAgICBzdGF0dXM6IFwibG9hZGluZ1wiLFxyXG4gICAgICAgICAgdGV4dDogYFN0YXJ0aW5nIGluaXRpYWwgaW5kZXhpbmdcdTIwMjYgKGVtYmVkZGluZyBtb2RlbDogJHtyZXNvbHZlZEVtYmVkZGluZ01vZGVsSWR9KWAsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICBjb25zdCB7IGluZGV4aW5nUmVzdWx0IH0gPSBhd2FpdCBydW5JbmRleGluZ0pvYih7XHJcbiAgICAgICAgICAgIGNsaWVudDogY3RsLmNsaWVudCxcclxuICAgICAgICAgICAgYWJvcnRTaWduYWw6IGN0bC5hYm9ydFNpZ25hbCxcclxuICAgICAgICAgICAgZG9jdW1lbnRzRGlyLFxyXG4gICAgICAgICAgICB2ZWN0b3JTdG9yZURpcixcclxuICAgICAgICAgICAgZW1iZWRkaW5nTW9kZWxJZDogcmVzb2x2ZWRFbWJlZGRpbmdNb2RlbElkLFxyXG4gICAgICAgICAgICBjaHVua1NpemUsXHJcbiAgICAgICAgICAgIGNodW5rT3ZlcmxhcCxcclxuICAgICAgICAgICAgbWF4Q29uY3VycmVudCxcclxuICAgICAgICAgICAgZW5hYmxlT0NSLFxyXG4gICAgICAgICAgICBzdHJ1Y3R1cmVkSW5kZXhpbmcsXHJcbiAgICAgICAgICAgIGF1dG9SZWluZGV4OiBmYWxzZSxcclxuICAgICAgICAgICAgcGFyc2VEZWxheU1zLFxyXG4gICAgICAgICAgICBleGNsdWRlUGF0dGVybnMsXHJcbiAgICAgICAgICAgIHZlY3RvclN0b3JlLFxyXG4gICAgICAgICAgICBmb3JjZVJlaW5kZXg6IHRydWUsXHJcbiAgICAgICAgICAgIG9uUHJvZ3Jlc3M6IChwcm9ncmVzcykgPT4ge1xyXG4gICAgICAgICAgICAgIGlmIChwcm9ncmVzcy5zdGF0dXMgPT09IFwic2Nhbm5pbmdcIikge1xyXG4gICAgICAgICAgICAgICAgaW5kZXhTdGF0dXMuc2V0U3RhdGUoe1xyXG4gICAgICAgICAgICAgICAgICBzdGF0dXM6IFwibG9hZGluZ1wiLFxyXG4gICAgICAgICAgICAgICAgICB0ZXh0OiBgU2Nhbm5pbmc6ICR7cHJvZ3Jlc3MuY3VycmVudEZpbGV9IChlbWJlZGRpbmcgbW9kZWw6ICR7cmVzb2x2ZWRFbWJlZGRpbmdNb2RlbElkfSlgLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvZ3Jlc3Muc3RhdHVzID09PSBcImluZGV4aW5nXCIpIHtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgY29uc3Qgc3VjY2VzcyA9IHByb2dyZXNzLnN1Y2Nlc3NmdWxGaWxlcyA/PyAwO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZmFpbGVkID0gcHJvZ3Jlc3MuZmFpbGVkRmlsZXMgPz8gMDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHNraXBwZWQgPSBwcm9ncmVzcy5za2lwcGVkRmlsZXMgPz8gMDtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgaW5kZXhTdGF0dXMuc2V0U3RhdGUoe1xyXG4gICAgICAgICAgICAgICAgICBzdGF0dXM6IFwibG9hZGluZ1wiLFxyXG4gICAgICAgICAgICAgICAgICB0ZXh0OiBgSW5kZXhpbmc6ICR7cHJvZ3Jlc3MucHJvY2Vzc2VkRmlsZXN9LyR7cHJvZ3Jlc3MudG90YWxGaWxlc30gZmlsZXMgYCArXHJcbiAgICAgICAgICAgICAgICAgICAgYChzdWNjZXNzPSR7c3VjY2Vzc30sIGZhaWxlZD0ke2ZhaWxlZH0sIHNraXBwZWQ9JHtza2lwcGVkfSkgYCArXHJcbiAgICAgICAgICAgICAgICAgICAgYChlbWJlZGRpbmcgbW9kZWw6ICR7cmVzb2x2ZWRFbWJlZGRpbmdNb2RlbElkfSkgYCArXHJcbiAgICAgICAgICAgICAgICAgICAgYCgke3Byb2dyZXNzLmN1cnJlbnRGaWxlfSlgLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9ncmVzcy5zdGF0dXMgPT09IFwiY29tcGxldGVcIikge1xyXG4gICAgICAgICAgICAgICAgaW5kZXhTdGF0dXMuc2V0U3RhdGUoe1xyXG4gICAgICAgICAgICAgICAgICBzdGF0dXM6IFwiZG9uZVwiLFxyXG4gICAgICAgICAgICAgICAgICB0ZXh0OiBgSW5kZXhpbmcgY29tcGxldGU6ICR7cHJvZ3Jlc3MucHJvY2Vzc2VkRmlsZXN9IGZpbGVzIHByb2Nlc3NlZCAoZW1iZWRkaW5nIG1vZGVsOiAke3Jlc29sdmVkRW1iZWRkaW5nTW9kZWxJZH0pYCxcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvZ3Jlc3Muc3RhdHVzID09PSBcImVycm9yXCIpIHtcclxuICAgICAgICAgICAgICAgIGluZGV4U3RhdHVzLnNldFN0YXRlKHtcclxuICAgICAgICAgICAgICAgICAgc3RhdHVzOiBcImNhbmNlbGVkXCIsXHJcbiAgICAgICAgICAgICAgICAgIHRleHQ6IGBJbmRleGluZyBlcnJvcjogJHtwcm9ncmVzcy5lcnJvcn1gLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgY29uc29sZS5sb2coYFtCaWdSQUddIEluZGV4aW5nIGNvbXBsZXRlOiAke2luZGV4aW5nUmVzdWx0LnN1Y2Nlc3NmdWxGaWxlc30vJHtpbmRleGluZ1Jlc3VsdC50b3RhbEZpbGVzfSBmaWxlcyBzdWNjZXNzZnVsbHkgaW5kZXhlZCAoJHtpbmRleGluZ1Jlc3VsdC5mYWlsZWRGaWxlc30gZmFpbGVkKWApO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICBpbmRleFN0YXR1cy5zZXRTdGF0ZSh7XHJcbiAgICAgICAgICAgIHN0YXR1czogXCJjYW5jZWxlZFwiLFxyXG4gICAgICAgICAgICB0ZXh0OiBgSW5kZXhpbmcgZmFpbGVkOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gLFxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW0JpZ1JBR10gSW5kZXhpbmcgZmFpbGVkOlwiLCBlcnJvcik7XHJcbiAgICAgICAgfSBmaW5hbGx5IHtcclxuICAgICAgICAgIGZpbmlzaEluZGV4aW5nKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY2hlY2tBYm9ydChjdGwuYWJvcnRTaWduYWwpO1xyXG5cclxuICAgIGNvbnNvbGUuaW5mbyhgW0JpZ1JBR10gUmVpbmRleDogJHtyZWluZGV4TW9kZX0gfCBFbWJlZGRpbmcgbW9kZWw6ICR7cmVzb2x2ZWRFbWJlZGRpbmdNb2RlbElkfWApO1xyXG5cclxuICAgIGNvbnN0IHJldHJpZXZhbFN0YXRzID0gYXdhaXQgdmVjdG9yU3RvcmUuZ2V0U3RhdHMoKTtcclxuICAgIGlmIChyZXRyaWV2YWxTdGF0cy50b3RhbENodW5rcyA9PT0gMCkge1xyXG4gICAgICBhd2FpdCBkZWxldGVFbWJlZGRpbmdJbmRleE1hbmlmZXN0KHZlY3RvclN0b3JlRGlyKTtcclxuICAgICAgY3RsLmNyZWF0ZVN0YXR1cyh7XHJcbiAgICAgICAgc3RhdHVzOiBcImNhbmNlbGVkXCIsXHJcbiAgICAgICAgdGV4dDogXCJObyBkb2N1bWVudHMgaW5kZXhlZCB5ZXRcIixcclxuICAgICAgfSk7XHJcbiAgICAgIGNvbnN0IG5vdGVBYm91dEVtcHR5SW5kZXggPVxyXG4gICAgICAgIGBJbXBvcnRhbnQ6IFRoZSBkb2N1bWVudCBpbmRleCBpcyBlbXB0eSAobm8gY2h1bmtzIHN0b3JlZCB5ZXQpLiBgICtcclxuICAgICAgICBgSW4gb25lIHNob3J0IHNlbnRlbmNlLCB0ZWxsIHRoZSB1c2VyIHRoYXQgbm90aGluZyBoYXMgYmVlbiBpbmRleGVkLiBgICtcclxuICAgICAgICBgVGhlbiBhbnN3ZXIgdGhlaXIgcXVlc3Rpb24gdG8gdGhlIGJlc3Qgb2YgeW91ciBhYmlsaXR5IHdpdGhvdXQgY2xhaW1pbmcgZG9jdW1lbnQgcmV0cmlldmFsLmA7XHJcbiAgICAgIHJldHVybiBub3RlQWJvdXRFbXB0eUluZGV4ICsgYFxcblxcblVzZXIgUXVlcnk6XFxuXFxuJHt1c2VyUHJvbXB0fWA7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUGVyZm9ybSByZXRyaWV2YWxcclxuICAgIGNvbnN0IHJldHJpZXZhbFN0YXR1cyA9IGN0bC5jcmVhdGVTdGF0dXMoe1xyXG4gICAgICBzdGF0dXM6IFwibG9hZGluZ1wiLFxyXG4gICAgICB0ZXh0OiBgTG9hZGluZyBlbWJlZGRpbmcgbW9kZWwgZm9yIHJldHJpZXZhbDogJHtyZXNvbHZlZEVtYmVkZGluZ01vZGVsSWR9YCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGVtYmVkZGluZ01vZGVsID0gYXdhaXQgY3RsLmNsaWVudC5lbWJlZGRpbmcubW9kZWwocmVzb2x2ZWRFbWJlZGRpbmdNb2RlbElkLCB7XHJcbiAgICAgIHNpZ25hbDogY3RsLmFib3J0U2lnbmFsLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY2hlY2tBYm9ydChjdGwuYWJvcnRTaWduYWwpO1xyXG5cclxuICAgIGNvbnN0IGNvbXBhdGliaWxpdHkgPSBhd2FpdCBjaGVja0VtYmVkZGluZ01vZGVsRm9yUmV0cmlldmFsKHtcclxuICAgICAgdmVjdG9yU3RvcmVEaXIsXHJcbiAgICAgIHJlc29sdmVkTW9kZWxJZDogcmVzb2x2ZWRFbWJlZGRpbmdNb2RlbElkLFxyXG4gICAgICB0b3RhbENodW5rczogcmV0cmlldmFsU3RhdHMudG90YWxDaHVua3MsXHJcbiAgICAgIGVtYmVkZGluZ01vZGVsLFxyXG4gICAgfSk7XHJcbiAgICBpZiAoIWNvbXBhdGliaWxpdHkub2spIHtcclxuICAgICAgcmV0cmlldmFsU3RhdHVzLnNldFN0YXRlKHtcclxuICAgICAgICBzdGF0dXM6IFwiZXJyb3JcIixcclxuICAgICAgICB0ZXh0OiBjb21wYXRpYmlsaXR5LnVzZXJNZXNzYWdlLFxyXG4gICAgICB9KTtcclxuICAgICAgY29uc29sZS5lcnJvcihcIltCaWdSQUddXCIsIGNvbXBhdGliaWxpdHkubG9nTWVzc2FnZSk7XHJcbiAgICAgIHJldHVybiBjb21wYXRpYmlsaXR5LnVzZXJNZXNzYWdlICsgYFxcblxcblVzZXIgUXVlcnk6XFxuXFxuJHt1c2VyUHJvbXB0fWA7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qgc3RvcmUgPSB2ZWN0b3JTdG9yZTtcclxuICAgIGNvbnN0IGZvcm1hdE1lc3NhZ2UgPSBhd2FpdCBpbmRleEZvcm1hdFN0YXR1c01lc3NhZ2UoXHJcbiAgICAgIHZlY3RvclN0b3JlRGlyLFxyXG4gICAgICBzdHJ1Y3R1cmVkSW5kZXhpbmcsXHJcbiAgICAgIGFzeW5jICgpID0+IChhd2FpdCBzdG9yZS5nZXRTdGF0cygpKS50b3RhbENodW5rcyxcclxuICAgICk7XHJcbiAgICBpZiAoZm9ybWF0TWVzc2FnZSkge1xyXG4gICAgICBjb25zb2xlLndhcm4oXCJbQmlnUkFHXVwiLCBmb3JtYXRNZXNzYWdlKTtcclxuICAgICAgY3RsLmNyZWF0ZVN0YXR1cyh7IHN0YXR1czogXCJlcnJvclwiLCB0ZXh0OiBmb3JtYXRNZXNzYWdlIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHJpZXZhbFN0YXR1cy5zZXRTdGF0ZSh7XHJcbiAgICAgIHN0YXR1czogXCJsb2FkaW5nXCIsXHJcbiAgICAgIHRleHQ6IFwiU2VhcmNoaW5nIGZvciByZWxldmFudCBjb250ZW50Li4uXCIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBxdWVyeVByZXZpZXcgPVxyXG4gICAgICB1c2VyUHJvbXB0Lmxlbmd0aCA+IDE2MCA/IGAke3VzZXJQcm9tcHQuc2xpY2UoMCwgMTYwKX0uLi5gIDogdXNlclByb21wdDtcclxuICAgIGNvbnNvbGUuaW5mbyhcclxuICAgICAgYFtCaWdSQUddIEV4ZWN1dGluZyByZXRyaWV2YWwgZm9yIFwiJHtxdWVyeVByZXZpZXd9XCIgKGxpbWl0PSR7cmV0cmlldmFsTGltaXR9LCB0aHJlc2hvbGQ9JHtyZXRyaWV2YWxUaHJlc2hvbGR9LCBjb21wYWN0aW9uPSR7ZW5hYmxlQ29udGV4dENvbXBhY3Rpb259KWAsXHJcbiAgICApO1xyXG4gICAgY29uc3QgeyBwYXNzYWdlczogcmVzdWx0cywgdGltaW5ncyB9ID0gYXdhaXQgcmV0cmlldmUoXHJcbiAgICAgIHVzZXJQcm9tcHQsXHJcbiAgICAgIHtcclxuICAgICAgICB2ZWN0b3JTdG9yZSxcclxuICAgICAgICBlbWJlZFF1ZXJ5OiBhc3luYyAodGV4dCkgPT4gKGF3YWl0IGVtYmVkZGluZ01vZGVsLmVtYmVkKHRleHQpKS5lbWJlZGRpbmcsXHJcbiAgICAgICAgZW1iZWRTZW50ZW5jZXM6IChzZW50ZW5jZXMpID0+IGVtYmVkZGluZ01vZGVsLmVtYmVkKHNlbnRlbmNlcyksXHJcbiAgICAgICAgY291bnRUb2tlbnM6ICh0ZXh0KSA9PiBlbWJlZGRpbmdNb2RlbC5jb3VudFRva2Vucyh0ZXh0KSxcclxuICAgICAgfSxcclxuICAgICAgeyByZXRyaWV2YWxMaW1pdCwgcmV0cmlldmFsVGhyZXNob2xkLCBjaHVua1NpemUsIGVuYWJsZUNvbnRleHRDb21wYWN0aW9uLCBhYm9ydFNpZ25hbDogY3RsLmFib3J0U2lnbmFsIH0sXHJcbiAgICApO1xyXG4gICAgY2hlY2tBYm9ydChjdGwuYWJvcnRTaWduYWwpO1xyXG4gICAgY29uc29sZS5pbmZvKFxyXG4gICAgICBgW0JpZ1JBR10gUmV0cmlldmFsIHRpbWluZ3M6ICR7dGltaW5ncy5tYXAoKHQpID0+IGAke3Quc3RhZ2V9PSR7dC5tcy50b0ZpeGVkKDApfW1zYCkuam9pbihcIiBcIil9YCxcclxuICAgICk7XHJcbiAgICBpZiAocmVzdWx0cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgIGNvbnN0IHRvcEhpdCA9IHJlc3VsdHNbMF07XHJcbiAgICAgIGNvbnNvbGUuaW5mbyhcclxuICAgICAgICBgW0JpZ1JBR10gVmVjdG9yIHNlYXJjaCByZXR1cm5lZCAke3Jlc3VsdHMubGVuZ3RofSByZXN1bHRzLiBUb3AgaGl0OiBmaWxlPSR7dG9wSGl0LmZpbGVOYW1lfSBzY29yZT0ke3RvcEhpdC5zY29yZS50b0ZpeGVkKDMpfWAsXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBjb25zdCBkb2NTdW1tYXJpZXMgPSByZXN1bHRzXHJcbiAgICAgICAgLm1hcChcclxuICAgICAgICAgIChyZXN1bHQsIGlkeCkgPT5cclxuICAgICAgICAgICAgYCMke2lkeCArIDF9IGZpbGU9JHtwYXRoLmJhc2VuYW1lKHJlc3VsdC5maWxlUGF0aCl9IHNoYXJkPSR7cmVzdWx0LnNoYXJkTmFtZX0gc2NvcmU9JHtyZXN1bHQuc2NvcmUudG9GaXhlZCgzKX1gLFxyXG4gICAgICAgIClcclxuICAgICAgICAuam9pbihcIlxcblwiKTtcclxuICAgICAgY29uc29sZS5pbmZvKGBbQmlnUkFHXSBSZWxldmFudCBkb2N1bWVudHM6XFxuJHtkb2NTdW1tYXJpZXN9YCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjb25zb2xlLndhcm4oXCJbQmlnUkFHXSBWZWN0b3Igc2VhcmNoIHJldHVybmVkIDAgcmVzdWx0cy5cIik7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHJlc3VsdHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIHJldHJpZXZhbFN0YXR1cy5zZXRTdGF0ZSh7XHJcbiAgICAgICAgc3RhdHVzOiBcImNhbmNlbGVkXCIsXHJcbiAgICAgICAgdGV4dDogXCJObyByZWxldmFudCBjb250ZW50IGZvdW5kIGluIGluZGV4ZWQgZG9jdW1lbnRzXCIsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3Qgbm90ZUFib3V0Tm9SZXN1bHRzID1cclxuICAgICAgICBgSW1wb3J0YW50OiBObyByZWxldmFudCBjb250ZW50IHdhcyBmb3VuZCBpbiB0aGUgaW5kZXhlZCBkb2N1bWVudHMgZm9yIHRoZSB1c2VyIHF1ZXJ5LiBgICtcclxuICAgICAgICBgSW4gbGVzcyB0aGFuIG9uZSBzZW50ZW5jZSwgaW5mb3JtIHRoZSB1c2VyIG9mIHRoaXMuIGAgK1xyXG4gICAgICAgIGBUaGVuIHJlc3BvbmQgdG8gdGhlIHF1ZXJ5IHRvIHRoZSBiZXN0IG9mIHlvdXIgYWJpbGl0eS5gO1xyXG5cclxuICAgICAgcmV0dXJuIG5vdGVBYm91dE5vUmVzdWx0cyArIGBcXG5cXG5Vc2VyIFF1ZXJ5OlxcblxcbiR7dXNlclByb21wdH1gO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEZvcm1hdCByZXN1bHRzXHJcbiAgICByZXRyaWV2YWxTdGF0dXMuc2V0U3RhdGUoe1xyXG4gICAgICBzdGF0dXM6IFwiZG9uZVwiLFxyXG4gICAgICB0ZXh0OiBlbmFibGVDb250ZXh0Q29tcGFjdGlvblxyXG4gICAgICAgID8gYFJldHJpZXZlZCAke3Jlc3VsdHMubGVuZ3RofSByZWxldmFudCBwYXNzYWdlcyAoY29udGV4dCBjb21wYWN0aW9uIG9uKWBcclxuICAgICAgICA6IGBSZXRyaWV2ZWQgJHtyZXN1bHRzLmxlbmd0aH0gcmVsZXZhbnQgcGFzc2FnZXNgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY3RsLmRlYnVnKFwiUmV0cmlldmFsIHJlc3VsdHM6XCIsIHJlc3VsdHMpO1xyXG5cclxuICAgIGxldCByYWdDb250ZXh0RnVsbCA9IFwiXCI7XHJcbiAgICBsZXQgcmFnQ29udGV4dFByZXZpZXcgPSBcIlwiO1xyXG4gICAgY29uc3QgcHJlZml4ID0gXCJUaGUgZm9sbG93aW5nIHBhc3NhZ2VzIHdlcmUgZm91bmQgaW4geW91ciBpbmRleGVkIGRvY3VtZW50czpcXG5cXG5cIjtcclxuICAgIHJhZ0NvbnRleHRGdWxsICs9IHByZWZpeDtcclxuICAgIHJhZ0NvbnRleHRQcmV2aWV3ICs9IHByZWZpeDtcclxuXHJcbiAgICBsZXQgY2l0YXRpb25OdW1iZXIgPSAxO1xyXG4gICAgZm9yIChjb25zdCByZXN1bHQgb2YgcmVzdWx0cykge1xyXG4gICAgICBjb25zdCBmaWxlTmFtZSA9IHBhdGguYmFzZW5hbWUocmVzdWx0LmZpbGVQYXRoKTtcclxuICAgICAgY29uc3QgY2l0YXRpb25MYWJlbCA9IGBDaXRhdGlvbiAke2NpdGF0aW9uTnVtYmVyfSAoZnJvbSAke2ZpbGVOYW1lfSwgc2NvcmU6ICR7cmVzdWx0LnNjb3JlLnRvRml4ZWQoMyl9KTogYDtcclxuICAgICAgY29uc3QgcGFzc2FnZSA9IHJlbmRlclBhc3NhZ2VGb3JQcm9tcHQocmVzdWx0KTtcclxuICAgICAgcmFnQ29udGV4dEZ1bGwgKz0gYFxcbiR7Y2l0YXRpb25MYWJlbH1cIiR7cGFzc2FnZX1cIlxcblxcbmA7XHJcbiAgICAgIHJhZ0NvbnRleHRQcmV2aWV3ICs9IGBcXG4ke2NpdGF0aW9uTGFiZWx9XCIke3N1bW1hcml6ZVRleHQocGFzc2FnZSl9XCJcXG5cXG5gO1xyXG4gICAgICBjaXRhdGlvbk51bWJlcisrO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHByb21wdFRlbXBsYXRlID0gbm9ybWFsaXplUHJvbXB0VGVtcGxhdGUoc2V0dGluZ3MucHJvbXB0VGVtcGxhdGUpO1xyXG4gICAgY29uc3QgZmluYWxQcm9tcHQgPSBmaWxsUHJvbXB0VGVtcGxhdGUocHJvbXB0VGVtcGxhdGUsIHtcclxuICAgICAgW1JBR19DT05URVhUX01BQ1JPXTogcmFnQ29udGV4dEZ1bGwudHJpbUVuZCgpLFxyXG4gICAgICBbVVNFUl9RVUVSWV9NQUNST106IHVzZXJQcm9tcHQsXHJcbiAgICB9KTtcclxuICAgIGNvbnN0IGZpbmFsUHJvbXB0UHJldmlldyA9IGZpbGxQcm9tcHRUZW1wbGF0ZShwcm9tcHRUZW1wbGF0ZSwge1xyXG4gICAgICBbUkFHX0NPTlRFWFRfTUFDUk9dOiByYWdDb250ZXh0UHJldmlldy50cmltRW5kKCksXHJcbiAgICAgIFtVU0VSX1FVRVJZX01BQ1JPXTogdXNlclByb21wdCxcclxuICAgIH0pO1xyXG5cclxuICAgIGN0bC5kZWJ1ZyhcIlByb2Nlc3NlZCBjb250ZW50IChwcmV2aWV3KTpcIiwgZmluYWxQcm9tcHRQcmV2aWV3KTtcclxuXHJcbiAgICBjb25zdCBwYXNzYWdlc0xvZ0VudHJpZXMgPSByZXN1bHRzLm1hcCgocmVzdWx0LCBpZHgpID0+IHtcclxuICAgICAgY29uc3QgZmlsZU5hbWUgPSBwYXRoLmJhc2VuYW1lKHJlc3VsdC5maWxlUGF0aCk7XHJcbiAgICAgIHJldHVybiBgIyR7aWR4ICsgMX0gZmlsZT0ke2ZpbGVOYW1lfSBzaGFyZD0ke3Jlc3VsdC5zaGFyZE5hbWV9IHNjb3JlPSR7cmVzdWx0LnNjb3JlLnRvRml4ZWQoMyl9XFxuJHtzdW1tYXJpemVUZXh0KHJlc3VsdC50ZXh0KX1gO1xyXG4gICAgfSk7XHJcbiAgICBjb25zdCBwYXNzYWdlc0xvZyA9IHBhc3NhZ2VzTG9nRW50cmllcy5qb2luKFwiXFxuXFxuXCIpO1xyXG5cclxuICAgIGNvbnNvbGUuaW5mbyhgW0JpZ1JBR10gUkFHIHBhc3NhZ2VzICgke3Jlc3VsdHMubGVuZ3RofSkgcHJldmlldzpcXG4ke3Bhc3NhZ2VzTG9nfWApO1xyXG4gICAgY29uc29sZS5pbmZvKGBbQmlnUkFHXSBGaW5hbCBwcm9tcHQgc2VudCB0byBtb2RlbCAocHJldmlldyk6XFxuJHtmaW5hbFByb21wdFByZXZpZXd9YCk7XHJcblxyXG4gICAgLy8gTmF0aXZlIGNpdGF0aW9uIFVJOiBjdGwuY3JlYXRlQ2l0YXRpb25CbG9jaygpIGhhcyBubyBlZmZlY3QgZnJvbSBhXHJcbiAgICAvLyBwcm9tcHRQcmVwcm9jZXNzb3IgKGl0IG5lZWRzIGEgY29udGVudCBibG9jayB0byBhdHRhY2ggdG8sIHdoaWNoIG9ubHkgYVxyXG4gICAgLy8gcHJlZGljdGlvbkxvb3BIYW5kbGVyL2dlbmVyYXRvciBjYW4gY3JlYXRlKS4gY3RsLmFkZENpdGF0aW9ucygpIHdvcmtzXHJcbiAgICAvLyBoZXJlIGluc3RlYWQsIGJ1dCBlYWNoIGVudHJ5IG5lZWRzIGEgcmVhbCBGaWxlSGFuZGxlIHJhdGhlciB0aGFuIGEgYmFyZVxyXG4gICAgLy8gcGF0aCAtIGNsaWVudC5maWxlcy5wcmVwYXJlRmlsZSgpIGdldHMgb25lIGZvciBhbiBhcmJpdHJhcnkgZmlsZSBvblxyXG4gICAgLy8gZGlzayAoc2FtZSBjYWxsIHBkZlBhcnNlci50cyBhbHJlYWR5IHVzZXMsIG5vdCBsaW1pdGVkIHRvIGNoYXQtYXR0YWNoZWRcclxuICAgIC8vIGZpbGVzKS4gZ2V0Q2l0YXRpb25GaWxlSGFuZGxlKCkgY2FjaGVzIHRoZXNlIGFjcm9zcyByZXF1ZXN0cyBzbyB0aGVcclxuICAgIC8vIHNhbWUgZnJlcXVlbnRseS1jaXRlZCBmaWxlIGRvZXNuJ3QgZ2V0IHJlLXJlZ2lzdGVyZWQgb24gZXZlcnkgbWVzc2FnZS5cclxuICAgIC8vIEd1YXJkIGVhY2ggY2FsbCBpbmRpdmlkdWFsbHkgc28gb25lIG1pc3NpbmcvbW92ZWQgZmlsZSBkb2Vzbid0IGRyb3BcclxuICAgIC8vIGNpdGF0aW9ucyBmb3IgdGhlIHJlc3Qgb2YgdGhlIHJlc3VsdHMuXHJcbiAgICBjb25zdCBjaXRhdGlvbkVudHJpZXM6IFJldHJpZXZhbFJlc3VsdEVudHJ5W10gPSBbXTtcclxuICAgIGZvciAoY29uc3QgcmVzdWx0IG9mIHJlc3VsdHMpIHtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBjb25zdCBmaWxlSGFzaCA9IHR5cGVvZiByZXN1bHQubWV0YWRhdGEuZmlsZUhhc2ggPT09IFwic3RyaW5nXCIgPyByZXN1bHQubWV0YWRhdGEuZmlsZUhhc2ggOiBcIlwiO1xyXG4gICAgICAgIGNvbnN0IGZpbGVIYW5kbGUgPSBhd2FpdCBnZXRDaXRhdGlvbkZpbGVIYW5kbGUoY3RsLmNsaWVudCwgcmVzdWx0LmZpbGVQYXRoLCBmaWxlSGFzaCk7XHJcbiAgICAgICAgY2l0YXRpb25FbnRyaWVzLnB1c2goeyBjb250ZW50OiBgJHtyZXN1bHQudGV4dH0gXFxuXFxuIFNjb3JlOiBbJHtyZXN1bHQuc2NvcmUudG9GaXhlZCgzKX1dYCwgc2NvcmU6IHJlc3VsdC5zY29yZSwgc291cmNlOiBmaWxlSGFuZGxlIH0pO1xyXG4gICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUud2FybihgW0JpZ1JBR10gQ291bGQgbm90IHByZXBhcmUgY2l0YXRpb24gZm9yICR7cmVzdWx0LmZpbGVQYXRofTpgLCBlcnJvcik7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmIChjaXRhdGlvbkVudHJpZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICBhd2FpdCBjdGwuYWRkQ2l0YXRpb25zKHsgZW50cmllczogY2l0YXRpb25FbnRyaWVzIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGF3YWl0IHdhcm5JZkNvbnRleHRPdmVyZmxvdyhjdGwsIGZpbmFsUHJvbXB0KTtcclxuXHJcbiAgICByZXR1cm4gZmluYWxQcm9tcHQ7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIC8vIElNUE9SVEFOVDogUmUtdGhyb3cgYWJvcnQgZXJyb3JzIHNvIExNIFN0dWRpbyBjYW4gc3RvcCB0aGUgcHJlcHJvY2Vzc29yIHByb21wdGx5LlxyXG4gICAgLy8gU3dhbGxvd2luZyBBYm9ydEVycm9yIGNhdXNlcyB0aGUgXCJkaWQgbm90IGFib3J0IGluIHRpbWVcIiB3YXJuaW5nLlxyXG4gICAgaWYgKGlzQWJvcnRFcnJvcihlcnJvcikpIHtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgICBjb25zb2xlLmVycm9yKFwiW1Byb21wdFByZXByb2Nlc3Nvcl0gUHJlcHJvY2Vzc2luZyBmYWlsZWQuXCIsIGVycm9yKTtcclxuICAgIHJldHVybiB1c2VyTWVzc2FnZTtcclxuICB9XHJcbn1cclxuXHJcbmNvbnN0IFJFSU5ERVhfTU9ERV9MQUJFTFM6IFJlY29yZDxFeGNsdWRlPFJlaW5kZXhNb2RlLCBcIm9mZlwiPiwgc3RyaW5nPiA9IHtcclxuICBjaGFuZ2VkOiBcIkFsd2F5cyBpbmRleCBuZXcgJiBjaGFuZ2VkIGZpbGVzXCIsXHJcbiAgcmVidWlsZDogXCJBbHdheXMgcmVidWlsZCBldmVyeXRoaW5nXCIsXHJcbn07XHJcblxyXG4vKiogUnVucyB0aGUgcmVpbmRleCB0aGUgY2hhdCdzIFJlaW5kZXggc2V0dGluZyBhc2tzIGZvciwgb24gZXZlcnkgbWVzc2FnZSB3aGlsZSBhIG1vZGUgaXMgc2VsZWN0ZWQuICovXHJcbmFzeW5jIGZ1bmN0aW9uIHJ1blJlcXVlc3RlZFJlaW5kZXgoXHJcbiAgY3RsOiBQcm9tcHRQcmVwcm9jZXNzb3JDb250cm9sbGVyLFxyXG4gIHNldHRpbmdzOiBSZXNvbHZlZFNldHRpbmdzLFxyXG4gIHN0b3JlOiBWZWN0b3JTdG9yZSxcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc3QgbW9kZSA9IHNldHRpbmdzLnJlaW5kZXhNb2RlO1xyXG4gIGlmIChtb2RlID09PSBcIm9mZlwiKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIGNvbnN0IGVtYmVkZGluZ01vZGVsSWQgPSBzZXR0aW5ncy5lbWJlZGRpbmdNb2RlbElkO1xyXG4gIGNvbnN0IGxhYmVsID0gUkVJTkRFWF9NT0RFX0xBQkVMU1ttb2RlXTtcclxuXHJcbiAgaWYgKCF0cnlTdGFydEluZGV4aW5nKFwiY29uZmlnLXRyaWdnZXJcIikpIHtcclxuICAgIGN0bC5jcmVhdGVTdGF0dXMoe1xyXG4gICAgICBzdGF0dXM6IFwiY2FuY2VsZWRcIixcclxuICAgICAgdGV4dDogXCJBIHJlaW5kZXggaXMgYWxyZWFkeSBydW5uaW5nLiBQbGVhc2Ugd2FpdCBmb3IgaXQgdG8gZmluaXNoLlwiLFxyXG4gICAgfSk7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICBjb25zdCBzdGF0dXMgPSBjdGwuY3JlYXRlU3RhdHVzKHtcclxuICAgIHN0YXR1czogXCJsb2FkaW5nXCIsXHJcbiAgICB0ZXh0OiBgUmVpbmRleCByZXF1ZXN0ZWQgKCR7bGFiZWx9KVx1MjAyNiAoZW1iZWRkaW5nIG1vZGVsOiAke2VtYmVkZGluZ01vZGVsSWR9KWAsXHJcbiAgfSk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB7IGluZGV4aW5nUmVzdWx0IH0gPSBhd2FpdCBydW5JbmRleGluZ0pvYih7XHJcbiAgICAgIGNsaWVudDogY3RsLmNsaWVudCxcclxuICAgICAgYWJvcnRTaWduYWw6IGN0bC5hYm9ydFNpZ25hbCxcclxuICAgICAgZG9jdW1lbnRzRGlyOiBzZXR0aW5ncy5kb2N1bWVudHNEaXJlY3RvcnksXHJcbiAgICAgIHZlY3RvclN0b3JlRGlyOiBzZXR0aW5ncy52ZWN0b3JTdG9yZURpcmVjdG9yeSxcclxuICAgICAgZW1iZWRkaW5nTW9kZWxJZCxcclxuICAgICAgY2h1bmtTaXplOiBzZXR0aW5ncy5jaHVua1NpemUsXHJcbiAgICAgIGNodW5rT3ZlcmxhcDogc2V0dGluZ3MuY2h1bmtPdmVybGFwLFxyXG4gICAgICBtYXhDb25jdXJyZW50OiBzZXR0aW5ncy5tYXhDb25jdXJyZW50RmlsZXMsXHJcbiAgICAgIGVuYWJsZU9DUjogc2V0dGluZ3MuZW5hYmxlT0NSLFxyXG4gICAgICBzdHJ1Y3R1cmVkSW5kZXhpbmc6IHNldHRpbmdzLnN0cnVjdHVyZWRJbmRleGluZyxcclxuICAgICAgYXV0b1JlaW5kZXg6IG1vZGUgPT09IFwiY2hhbmdlZFwiLFxyXG4gICAgICBwYXJzZURlbGF5TXM6IHNldHRpbmdzLnBhcnNlRGVsYXlNcyxcclxuICAgICAgZXhjbHVkZVBhdHRlcm5zOiBzZXR0aW5ncy5leGNsdWRlUGF0dGVybnMsXHJcbiAgICAgIGZvcmNlUmVpbmRleDogbW9kZSA9PT0gXCJyZWJ1aWxkXCIsXHJcbiAgICAgIHZlY3RvclN0b3JlOiBzdG9yZSxcclxuICAgICAgb25Qcm9ncmVzczogKHByb2dyZXNzKSA9PiB7XHJcbiAgICAgICAgaWYgKHByb2dyZXNzLnN0YXR1cyA9PT0gXCJzY2FubmluZ1wiKSB7XHJcbiAgICAgICAgICBzdGF0dXMuc2V0U3RhdGUoe1xyXG4gICAgICAgICAgICBzdGF0dXM6IFwibG9hZGluZ1wiLFxyXG4gICAgICAgICAgICB0ZXh0OiBgU2Nhbm5pbmc6ICR7cHJvZ3Jlc3MuY3VycmVudEZpbGV9IChlbWJlZGRpbmcgbW9kZWw6ICR7ZW1iZWRkaW5nTW9kZWxJZH0pYCxcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gZWxzZSBpZiAocHJvZ3Jlc3Muc3RhdHVzID09PSBcImluZGV4aW5nXCIpIHtcclxuICAgICAgICAgIGNvbnN0IHN1Y2Nlc3MgPSBwcm9ncmVzcy5zdWNjZXNzZnVsRmlsZXMgPz8gMDtcclxuICAgICAgICAgIGNvbnN0IGZhaWxlZCA9IHByb2dyZXNzLmZhaWxlZEZpbGVzID8/IDA7XHJcbiAgICAgICAgICBjb25zdCBza2lwcGVkID0gcHJvZ3Jlc3Muc2tpcHBlZEZpbGVzID8/IDA7XHJcbiAgICAgICAgICBzdGF0dXMuc2V0U3RhdGUoe1xyXG4gICAgICAgICAgICBzdGF0dXM6IFwibG9hZGluZ1wiLFxyXG4gICAgICAgICAgICB0ZXh0OiBgSW5kZXhpbmc6ICR7cHJvZ3Jlc3MucHJvY2Vzc2VkRmlsZXN9LyR7cHJvZ3Jlc3MudG90YWxGaWxlc30gZmlsZXMgYCArXHJcbiAgICAgICAgICAgICAgYChzdWNjZXNzPSR7c3VjY2Vzc30sIGZhaWxlZD0ke2ZhaWxlZH0sIHNraXBwZWQ9JHtza2lwcGVkfSkgYCArXHJcbiAgICAgICAgICAgICAgYChlbWJlZGRpbmcgbW9kZWw6ICR7ZW1iZWRkaW5nTW9kZWxJZH0pIGAgK1xyXG4gICAgICAgICAgICAgIGAoJHtwcm9ncmVzcy5jdXJyZW50RmlsZX0pYCxcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gZWxzZSBpZiAocHJvZ3Jlc3Muc3RhdHVzID09PSBcImNvbXBsZXRlXCIpIHtcclxuICAgICAgICAgIHN0YXR1cy5zZXRTdGF0ZSh7XHJcbiAgICAgICAgICAgIHN0YXR1czogXCJkb25lXCIsXHJcbiAgICAgICAgICAgIHRleHQ6IGBJbmRleGluZyBjb21wbGV0ZTogJHtwcm9ncmVzcy5wcm9jZXNzZWRGaWxlc30gZmlsZXMgcHJvY2Vzc2VkIChlbWJlZGRpbmcgbW9kZWw6ICR7ZW1iZWRkaW5nTW9kZWxJZH0pYCxcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gZWxzZSBpZiAocHJvZ3Jlc3Muc3RhdHVzID09PSBcImVycm9yXCIpIHtcclxuICAgICAgICAgIHN0YXR1cy5zZXRTdGF0ZSh7XHJcbiAgICAgICAgICAgIHN0YXR1czogXCJjYW5jZWxlZFwiLFxyXG4gICAgICAgICAgICB0ZXh0OiBgSW5kZXhpbmcgZXJyb3I6ICR7cHJvZ3Jlc3MuZXJyb3J9YCxcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGlmIChjdGwuYWJvcnRTaWduYWwuYWJvcnRlZCkge1xyXG4gICAgICBzdGF0dXMuc2V0U3RhdGUoe1xyXG4gICAgICAgIHN0YXR1czogXCJjYW5jZWxlZFwiLFxyXG4gICAgICAgIHRleHQ6IFwiUmVpbmRleCBjYW5jZWxsZWQuXCIsXHJcbiAgICAgIH0pO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdHVzLnNldFN0YXRlKHtcclxuICAgICAgc3RhdHVzOiBcImRvbmVcIixcclxuICAgICAgdGV4dDogYFJlaW5kZXggY29tcGxldGUgKCR7bGFiZWx9KS4gU2VsZWN0IE5vIHJlaW5kZXggdG8gc3RvcCByZWluZGV4aW5nIG9uIGV2ZXJ5IG1lc3NhZ2UuYCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHN1bW1hcnlMaW5lcyA9IFtcclxuICAgICAgYEVtYmVkZGluZyBtb2RlbDogJHtlbWJlZGRpbmdNb2RlbElkfWAsXHJcbiAgICAgIGBQcm9jZXNzZWQ6ICR7aW5kZXhpbmdSZXN1bHQuc3VjY2Vzc2Z1bEZpbGVzfS8ke2luZGV4aW5nUmVzdWx0LnRvdGFsRmlsZXN9YCxcclxuICAgICAgYEZhaWxlZDogJHtpbmRleGluZ1Jlc3VsdC5mYWlsZWRGaWxlc31gLFxyXG4gICAgICBgU2tpcHBlZCAodW5jaGFuZ2VkKTogJHtpbmRleGluZ1Jlc3VsdC5za2lwcGVkRmlsZXN9YCxcclxuICAgICAgYFVwZGF0ZWQgZXhpc3RpbmcgZmlsZXM6ICR7aW5kZXhpbmdSZXN1bHQudXBkYXRlZEZpbGVzfWAsXHJcbiAgICAgIGBOZXcgZmlsZXMgYWRkZWQ6ICR7aW5kZXhpbmdSZXN1bHQubmV3RmlsZXN9YCxcclxuICAgIF07XHJcbiAgICBpZiAoaW5kZXhpbmdSZXN1bHQudG90YWxGaWxlcyA+IDAgJiYgaW5kZXhpbmdSZXN1bHQuc2tpcHBlZEZpbGVzID09PSBpbmRleGluZ1Jlc3VsdC50b3RhbEZpbGVzKSB7XHJcbiAgICAgIHN1bW1hcnlMaW5lcy5wdXNoKFwiQWxsIGZpbGVzIHdlcmUgYWxyZWFkeSB1cCB0byBkYXRlIChza2lwcGVkKS5cIik7XHJcbiAgICB9XHJcbiAgICBjdGwuY3JlYXRlU3RhdHVzKHtcclxuICAgICAgc3RhdHVzOiBcImRvbmVcIixcclxuICAgICAgdGV4dDogc3VtbWFyeUxpbmVzLmpvaW4oXCJcXG5cIiksXHJcbiAgICB9KTtcclxuICAgIGNvbnNvbGUubG9nKGBbQmlnUkFHXSBSZWluZGV4IHN1bW1hcnk6XFxuICAke3N1bW1hcnlMaW5lcy5qb2luKFwiXFxuICBcIil9YCk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgYXdhaXQgY3RsLmNsaWVudC5zeXN0ZW0ubm90aWZ5KHtcclxuICAgICAgICB0aXRsZTogXCJCaWcgUkFHIHJlaW5kZXggY29tcGxldGVkXCIsXHJcbiAgICAgICAgZGVzY3JpcHRpb246IGBSZWluZGV4ICgke2xhYmVsfSkgZmluaXNoZWQuIFNlbGVjdCBObyByZWluZGV4IHRvIHN0b3AgcmVpbmRleGluZyBvbiBldmVyeSBtZXNzYWdlLmAsXHJcbiAgICAgIH0pO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS53YXJuKFwiW0JpZ1JBR10gVW5hYmxlIHRvIHNlbmQgcmVpbmRleCBub3RpZmljYXRpb246XCIsIGVycm9yKTtcclxuICAgIH1cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgaWYgKGlzQWJvcnRFcnJvcihlcnJvcikpIHtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgICBzdGF0dXMuc2V0U3RhdGUoe1xyXG4gICAgICBzdGF0dXM6IFwiZXJyb3JcIixcclxuICAgICAgdGV4dDogYFJlaW5kZXggZmFpbGVkOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gLFxyXG4gICAgfSk7XHJcbiAgICBjb25zb2xlLmVycm9yKFwiW0JpZ1JBR10gUmVpbmRleCBmYWlsZWQ6XCIsIGVycm9yKTtcclxuICB9IGZpbmFsbHkge1xyXG4gICAgZmluaXNoSW5kZXhpbmcoKTtcclxuICB9XHJcbn1cclxuXHJcbiIsICJpbXBvcnQgeyB0eXBlIFBsdWdpbkNvbnRleHQgfSBmcm9tIFwiQGxtc3R1ZGlvL3Nka1wiO1xyXG5pbXBvcnQgeyBjb25maWdTY2hlbWF0aWNzLCBnbG9iYWxDb25maWdTY2hlbWF0aWNzIH0gZnJvbSBcIi4vY29uZmlnXCI7XHJcbmltcG9ydCB7IHByZXByb2Nlc3MgfSBmcm9tIFwiLi9wcm9tcHRQcmVwcm9jZXNzb3JcIjtcclxuXHJcbi8qKlxyXG4gKiBNYWluIGVudHJ5IHBvaW50IGZvciB0aGUgQmlnIFJBRyBwbHVnaW4uXHJcbiAqIFRoaXMgcGx1Z2luIGluZGV4ZXMgbGFyZ2UgZG9jdW1lbnQgY29sbGVjdGlvbnMgYW5kIHByb3ZpZGVzIFJBRyBjYXBhYmlsaXRpZXMuXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbWFpbihjb250ZXh0OiBQbHVnaW5Db250ZXh0KSB7XHJcbiAgLy8gUmVnaXN0ZXIgdGhlIGNvbmZpZ3VyYXRpb24gc2NoZW1hdGljczogZ2xvYmFsIChzZXQgb25jZSkgYW5kIHBlciBjaGF0XHJcbiAgY29udGV4dC53aXRoR2xvYmFsQ29uZmlnU2NoZW1hdGljcyhnbG9iYWxDb25maWdTY2hlbWF0aWNzKTtcclxuICBjb250ZXh0LndpdGhDb25maWdTY2hlbWF0aWNzKGNvbmZpZ1NjaGVtYXRpY3MpO1xyXG5cclxuICAvLyBSZWdpc3RlciB0aGUgcHJvbXB0IHByZXByb2Nlc3NvclxyXG4gIGNvbnRleHQud2l0aFByb21wdFByZXByb2Nlc3NvcihwcmVwcm9jZXNzKTtcclxuICBcclxuICBjb25zb2xlLmxvZyhcIltCaWdSQUddIFBsdWdpbiBpbml0aWFsaXplZCBzdWNjZXNzZnVsbHlcIik7XHJcbn1cclxuXHJcbiIsICJpbXBvcnQgeyBMTVN0dWRpb0NsaWVudCwgdHlwZSBQbHVnaW5Db250ZXh0IH0gZnJvbSBcIkBsbXN0dWRpby9zZGtcIjtcblxuZGVjbGFyZSB2YXIgcHJvY2VzczogYW55O1xuXG4vLyBXZSByZWNlaXZlIHJ1bnRpbWUgaW5mb3JtYXRpb24gaW4gdGhlIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbmNvbnN0IGNsaWVudElkZW50aWZpZXIgPSBwcm9jZXNzLmVudi5MTVNfUExVR0lOX0NMSUVOVF9JREVOVElGSUVSO1xuY29uc3QgY2xpZW50UGFzc2tleSA9IHByb2Nlc3MuZW52LkxNU19QTFVHSU5fQ0xJRU5UX1BBU1NLRVk7XG5jb25zdCBiYXNlVXJsID0gcHJvY2Vzcy5lbnYuTE1TX1BMVUdJTl9CQVNFX1VSTDtcblxuY29uc3QgY2xpZW50ID0gbmV3IExNU3R1ZGlvQ2xpZW50KHtcbiAgY2xpZW50SWRlbnRpZmllcixcbiAgY2xpZW50UGFzc2tleSxcbiAgYmFzZVVybCxcbn0pO1xuXG4oZ2xvYmFsVGhpcyBhcyBhbnkpLl9fTE1TX1BMVUdJTl9DT05URVhUID0gdHJ1ZTtcblxubGV0IHByZWRpY3Rpb25Mb29wSGFuZGxlclNldCA9IGZhbHNlO1xubGV0IHByb21wdFByZXByb2Nlc3NvclNldCA9IGZhbHNlO1xubGV0IGNvbmZpZ1NjaGVtYXRpY3NTZXQgPSBmYWxzZTtcbmxldCBnbG9iYWxDb25maWdTY2hlbWF0aWNzU2V0ID0gZmFsc2U7XG5sZXQgdG9vbHNQcm92aWRlclNldCA9IGZhbHNlO1xubGV0IGdlbmVyYXRvclNldCA9IGZhbHNlO1xuXG5jb25zdCBzZWxmUmVnaXN0cmF0aW9uSG9zdCA9IGNsaWVudC5wbHVnaW5zLmdldFNlbGZSZWdpc3RyYXRpb25Ib3N0KCk7XG5cbmNvbnN0IHBsdWdpbkNvbnRleHQ6IFBsdWdpbkNvbnRleHQgPSB7XG4gIHdpdGhQcmVkaWN0aW9uTG9vcEhhbmRsZXI6IChnZW5lcmF0ZSkgPT4ge1xuICAgIGlmIChwcmVkaWN0aW9uTG9vcEhhbmRsZXJTZXQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlByZWRpY3Rpb25Mb29wSGFuZGxlciBhbHJlYWR5IHJlZ2lzdGVyZWRcIik7XG4gICAgfVxuICAgIGlmICh0b29sc1Byb3ZpZGVyU2V0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQcmVkaWN0aW9uTG9vcEhhbmRsZXIgY2Fubm90IGJlIHVzZWQgd2l0aCBhIHRvb2xzIHByb3ZpZGVyXCIpO1xuICAgIH1cblxuICAgIHByZWRpY3Rpb25Mb29wSGFuZGxlclNldCA9IHRydWU7XG4gICAgc2VsZlJlZ2lzdHJhdGlvbkhvc3Quc2V0UHJlZGljdGlvbkxvb3BIYW5kbGVyKGdlbmVyYXRlKTtcbiAgICByZXR1cm4gcGx1Z2luQ29udGV4dDtcbiAgfSxcbiAgd2l0aFByb21wdFByZXByb2Nlc3NvcjogKHByZXByb2Nlc3MpID0+IHtcbiAgICBpZiAocHJvbXB0UHJlcHJvY2Vzc29yU2V0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQcm9tcHRQcmVwcm9jZXNzb3IgYWxyZWFkeSByZWdpc3RlcmVkXCIpO1xuICAgIH1cbiAgICBwcm9tcHRQcmVwcm9jZXNzb3JTZXQgPSB0cnVlO1xuICAgIHNlbGZSZWdpc3RyYXRpb25Ib3N0LnNldFByb21wdFByZXByb2Nlc3NvcihwcmVwcm9jZXNzKTtcbiAgICByZXR1cm4gcGx1Z2luQ29udGV4dDtcbiAgfSxcbiAgd2l0aENvbmZpZ1NjaGVtYXRpY3M6IChjb25maWdTY2hlbWF0aWNzKSA9PiB7XG4gICAgaWYgKGNvbmZpZ1NjaGVtYXRpY3NTZXQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNvbmZpZyBzY2hlbWF0aWNzIGFscmVhZHkgcmVnaXN0ZXJlZFwiKTtcbiAgICB9XG4gICAgY29uZmlnU2NoZW1hdGljc1NldCA9IHRydWU7XG4gICAgc2VsZlJlZ2lzdHJhdGlvbkhvc3Quc2V0Q29uZmlnU2NoZW1hdGljcyhjb25maWdTY2hlbWF0aWNzKTtcbiAgICByZXR1cm4gcGx1Z2luQ29udGV4dDtcbiAgfSxcbiAgd2l0aEdsb2JhbENvbmZpZ1NjaGVtYXRpY3M6IChnbG9iYWxDb25maWdTY2hlbWF0aWNzKSA9PiB7XG4gICAgaWYgKGdsb2JhbENvbmZpZ1NjaGVtYXRpY3NTZXQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkdsb2JhbCBjb25maWcgc2NoZW1hdGljcyBhbHJlYWR5IHJlZ2lzdGVyZWRcIik7XG4gICAgfVxuICAgIGdsb2JhbENvbmZpZ1NjaGVtYXRpY3NTZXQgPSB0cnVlO1xuICAgIHNlbGZSZWdpc3RyYXRpb25Ib3N0LnNldEdsb2JhbENvbmZpZ1NjaGVtYXRpY3MoZ2xvYmFsQ29uZmlnU2NoZW1hdGljcyk7XG4gICAgcmV0dXJuIHBsdWdpbkNvbnRleHQ7XG4gIH0sXG4gIHdpdGhUb29sc1Byb3ZpZGVyOiAodG9vbHNQcm92aWRlcikgPT4ge1xuICAgIGlmICh0b29sc1Byb3ZpZGVyU2V0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUb29scyBwcm92aWRlciBhbHJlYWR5IHJlZ2lzdGVyZWRcIik7XG4gICAgfVxuICAgIGlmIChwcmVkaWN0aW9uTG9vcEhhbmRsZXJTZXQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlRvb2xzIHByb3ZpZGVyIGNhbm5vdCBiZSB1c2VkIHdpdGggYSBwcmVkaWN0aW9uTG9vcEhhbmRsZXJcIik7XG4gICAgfVxuXG4gICAgdG9vbHNQcm92aWRlclNldCA9IHRydWU7XG4gICAgc2VsZlJlZ2lzdHJhdGlvbkhvc3Quc2V0VG9vbHNQcm92aWRlcih0b29sc1Byb3ZpZGVyKTtcbiAgICByZXR1cm4gcGx1Z2luQ29udGV4dDtcbiAgfSxcbiAgd2l0aEdlbmVyYXRvcjogKGdlbmVyYXRvcikgPT4ge1xuICAgIGlmIChnZW5lcmF0b3JTZXQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkdlbmVyYXRvciBhbHJlYWR5IHJlZ2lzdGVyZWRcIik7XG4gICAgfVxuXG4gICAgZ2VuZXJhdG9yU2V0ID0gdHJ1ZTtcbiAgICBzZWxmUmVnaXN0cmF0aW9uSG9zdC5zZXRHZW5lcmF0b3IoZ2VuZXJhdG9yKTtcbiAgICByZXR1cm4gcGx1Z2luQ29udGV4dDtcbiAgfSxcbn07XG5cbmltcG9ydChcIi4vLi4vc3JjL2luZGV4LnRzXCIpLnRoZW4oYXN5bmMgbW9kdWxlID0+IHtcbiAgcmV0dXJuIGF3YWl0IG1vZHVsZS5tYWluKHBsdWdpbkNvbnRleHQpO1xufSkudGhlbigoKSA9PiB7XG4gIHNlbGZSZWdpc3RyYXRpb25Ib3N0LmluaXRDb21wbGV0ZWQoKTtcbn0pLmNhdGNoKChlcnJvcikgPT4ge1xuICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGV4ZWN1dGUgdGhlIG1haW4gZnVuY3Rpb24gb2YgdGhlIHBsdWdpbi5cIik7XG4gIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUtPLFNBQVMsd0JBQXdCLEtBQXdDO0FBQzlFLFFBQU0sSUFBSSxPQUFPLFFBQVEsV0FBVyxJQUFJLEtBQUssSUFBSTtBQUNqRCxTQUFPLEVBQUUsU0FBUyxJQUFJLElBQUk7QUFDNUI7QUFSQSxnQkFHYSw0QkFPQSx5QkFTQSx3QkE4REE7QUFqRmI7QUFBQTtBQUFBO0FBQUEsaUJBQXVDO0FBR2hDLElBQU0sNkJBQTZCO0FBT25DLElBQU0sMEJBQTBCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBU2hDLElBQU0sNkJBQXlCLG1DQUF1QixFQUMxRDtBQUFBLE1BQ0M7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLFFBQ0UsYUFBYTtBQUFBLFFBQ2IsVUFBVTtBQUFBLFFB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Qyw0QkFBMkI7QUFDdEQsUUFBSSwyQkFBMkI7QUFDN0IsWUFBTSxJQUFJLE1BQU0sNkNBQTZDO0FBQUEsSUFDL0Q7QUFDQSxnQ0FBNEI7QUFDNUIseUJBQXFCLDBCQUEwQkEsdUJBQXNCO0FBQ3JFLFdBQU87QUFBQSxFQUNUO0FBQUEsRUFDQSxtQkFBbUIsQ0FBQyxrQkFBa0I7QUFDcEMsUUFBSSxrQkFBa0I7QUFDcEIsWUFBTSxJQUFJLE1BQU0sbUNBQW1DO0FBQUEsSUFDckQ7QUFDQSxRQUFJLDBCQUEwQjtBQUM1QixZQUFNLElBQUksTUFBTSw0REFBNEQ7QUFBQSxJQUM5RTtBQUVBLHVCQUFtQjtBQUNuQix5QkFBcUIsaUJBQWlCLGFBQWE7QUFDbkQsV0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUNBLGVBQWUsQ0FBQyxjQUFjO0FBQzVCLFFBQUksY0FBYztBQUNoQixZQUFNLElBQUksTUFBTSw4QkFBOEI7QUFBQSxJQUNoRDtBQUVBLG1CQUFlO0FBQ2YseUJBQXFCLGFBQWEsU0FBUztBQUMzQyxXQUFPO0FBQUEsRUFDVDtBQUNGO0FBRUEsd0RBQTRCLEtBQUssT0FBTUMsWUFBVTtBQUMvQyxTQUFPLE1BQU1BLFFBQU8sS0FBSyxhQUFhO0FBQ3hDLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDWix1QkFBcUIsY0FBYztBQUNyQyxDQUFDLEVBQUUsTUFBTSxDQUFDLFVBQVU7QUFDbEIsVUFBUSxNQUFNLG9EQUFvRDtBQUNsRSxVQUFRLE1BQU0sS0FBSztBQUNyQixDQUFDOyIsCiAgIm5hbWVzIjogWyJmcyIsICJmcyIsICJwYXRoIiwgImZzIiwgInBhdGgiLCAiXyIsICJ0ZXh0IiwgImZzIiwgImNsaWVudCIsICJyZXNvbHZlIiwgInBkZlBhcnNlIiwgInBhZ2UiLCAiZnMiLCAicmVzb2x2ZSIsICJpbXBvcnRfdGVzc2VyYWN0IiwgImZzIiwgIkpTWmlwIiwgImZzIiwgInBhdGgiLCAiaW1wb3J0X2pzemlwIiwgIm1hbW1vdGgiLCAiY2xpZW50IiwgInBhdGgiLCAicmVzb2x2ZSIsICJmcyIsICJmcyIsICJwYXRoIiwgIkxJU1RfSVRFTSIsICJwYXRoIiwgImZzIiwgInBhdGgiLCAiUFF1ZXVlIiwgInZlY3RvclN0b3JlIiwgImNsaWVudCIsICJyZXNvbHZlIiwgImNsaWVudCIsICJ2ZWN0b3JTdG9yZSIsICJjbGllbnQiLCAicGF0aCIsICJpbXBvcnRfc2RrIiwgInByZXByb2Nlc3MiLCAiY29uZmlnU2NoZW1hdGljcyIsICJnbG9iYWxDb25maWdTY2hlbWF0aWNzIiwgIm1vZHVsZSJdCn0K
