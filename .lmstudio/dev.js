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

Answer the question below using the passages above, which were retrieved for it. Any passages earlier in this conversation belong to earlier questions and do not apply here. If the passages above are not relevant, answer as best you can without them.

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
    ).field(
      "retrievalDepth",
      "select",
      {
        displayName: "Retrieval Depth",
        subtitle: "Medium searches by meaning and lifts passages matching any date your question names \u2014 no extra model calls. Low searches by meaning only, like earlier versions. High also asks the loaded model to draft a likely answer and searches for that too, which finds passages worded unlike the question, at one model call and about half a second per message.",
        options: [
          { value: "low", displayName: "Low" },
          { value: "medium", displayName: "Medium" },
          { value: "high", displayName: "High" }
        ]
      },
      "medium"
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
      enableContextCompaction: false,
      laneCandidates: 50,
      rrfConstant: 60,
      // A passage that continues into the next chunk is returned with it, when that chunk is already
      // a candidate. Worth 7 of 88 questions on FinanceBench, where four answers ran past the end of
      // the chunk chosen and three sat beside it. See documentation/Evaluation.md.
      neighbourChunks: 1,
      laneWeightVector: 1,
      laneWeightHyde: 1,
      // BM25 is a document-identification signal: it says which document, not which passage in it.
      // Worthless on FinanceBench, where the candidates are ten near-identical filings of one
      // company and the document was never in doubt; worth 21 questions and a fifth of the mean
      // reciprocal rank on QASPER, where choosing the paper is the hard part. Neutral on the
      // former and clearly positive on the latter, so on. See documentation/Evaluation.md.
      laneWeightKeyword: 1,
      rerankDepth: 10,
      bm25K1: 1.2,
      bm25B: 0,
      laneWeightDate: 1,
      catalogVersion: 4,
      // Bounds a pathological generator at High depth; drafting measured a median 542ms.
      hypotheticalTimeoutMs: 1e4,
      // The share of the model's context window retrieved passages may use. The rest is left for
      // the conversation and the reply, which the host trims to fit. Budgeting against what the
      // conversation leaves instead would starve retrieval as a chat grows.
      ragContextShare: 0.6,
      // Passages scoring below this share of the best match are dropped rather than padding the
      // result out to the quota. One strong match returns one passage; several return several.
      passageRelevanceCut: 0.9
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
  const retrievalDepth = readString(chatConfig, "retrievalDepth");
  return {
    documentsDirectory,
    vectorStoreDirectory,
    embeddingModelId: resolveEmbeddingModelId(readString(globalConfig, "embeddingModel")),
    excludePatterns: parseExcludePatternsBlock(readString(globalConfig, "excludeFilenamePatterns")),
    promptTemplate: promptTemplate.trim() ? promptTemplate : DEFAULT_PROMPT_TEMPLATE,
    reindexMode: reindexMode === "changed" || reindexMode === "rebuild" ? reindexMode : "off",
    retrievalDepth: retrievalDepth === "low" ? "low" : "medium",
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
function chunkKey(parts) {
  return `${parts.shardName}/${parts.id}`;
}
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
       * Search several query vectors in one pass, returning one result list per vector in the order
       * given. Each shard is opened once and queried once per vector, so N vectors cost one parse of
       * that shard rather than N - and a parse is most of what a search costs, since `openShard`
       * deliberately does not cache (see its comment). Nothing is retained past the call.
       */
      async searchMany(queryVectors, limit = 5, threshold = 0.5) {
        const merged = queryVectors.map(() => []);
        for (const dir of this.shardDirs) {
          const shard = this.openShard(dir);
          for (let i = 0; i < queryVectors.length; i++) {
            const results = await shard.queryItems(queryVectors[i], "", limit, void 0, false);
            for (const r of results) {
              const m = r.item.metadata;
              merged[i].push({
                id: r.item.id,
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
        }
        return merged.map(
          (results) => results.filter((r) => r.score >= threshold).sort((a, b) => b.score - a.score).slice(0, limit)
        );
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
              id: item.id,
              shardName: dir,
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

// src/utils/embeddingPrefix.ts
function prefixConventionFor(modelId) {
  return /nomic-embed/i.test(modelId) ? "nomic" : "none";
}
function documentText(modelId, text) {
  return prefixConventionFor(modelId) === "nomic" ? `${DOCUMENT_PREFIX}${text}` : text;
}
function queryText(modelId, text) {
  return prefixConventionFor(modelId) === "nomic" ? `${QUERY_PREFIX}${text}` : text;
}
var DOCUMENT_PREFIX, QUERY_PREFIX;
var init_embeddingPrefix = __esm({
  "src/utils/embeddingPrefix.ts"() {
    "use strict";
    DOCUMENT_PREFIX = "search_document: ";
    QUERY_PREFIX = "search_query: ";
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
        indexFormat: data.indexFormat === "structured-v1" || data.indexFormat === "structured-v2" || data.indexFormat === "structured-v3" ? data.indexFormat : "legacy",
        embeddingPrefixes: data.embeddingPrefixes === "nomic" ? "nomic" : "none"
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
    indexFormat,
    embeddingPrefixes: prefixConventionFor(resolvedModelId)
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
    if (prefixConventionFor(resolvedModelId) === "nomic") {
      return {
        ok: false,
        logMessage: `Embedding prefix mismatch: index has chunks but no manifest, so it was built without prefixes, and "${resolvedModelId}" expects "nomic" prefixes. Reindex required.`,
        userMessage: "The document index was built before this version's embedding change, so searches would score badly. Reindex your documents to rebuild it."
      };
    }
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
  const expectedPrefixes = prefixConventionFor(resolvedModelId);
  if (manifest.embeddingPrefixes !== expectedPrefixes) {
    const logMessage = `Embedding prefix mismatch: index was built with "${manifest.embeddingPrefixes}" prefixes but "${resolvedModelId}" expects "${expectedPrefixes}". Reindex required.`;
    return {
      ok: false,
      logMessage,
      userMessage: "The document index was built before this version's embedding change, so searches would score badly. Reindex your documents to rebuild it."
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
  return structuredIndexing ? STRUCTURED_INDEX_FORMAT : "legacy";
}
async function planIndexFormat(vectorStoreDir, totalChunks, structuredIndexing, resolvedModelId) {
  const indexFormat = desiredIndexFormat(structuredIndexing);
  if (totalChunks === 0) {
    return { indexFormat, rebuildExistingFiles: false };
  }
  const manifest = await readEmbeddingIndexManifest(vectorStoreDir);
  const formatChanged = (manifest?.indexFormat ?? "legacy") !== indexFormat;
  const prefixesChanged = (manifest?.embeddingPrefixes ?? "none") !== prefixConventionFor(resolvedModelId);
  return { indexFormat, rebuildExistingFiles: formatChanged || prefixesChanged };
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
  if (desired === "legacy") return "Reindex required to switch back to standard indexing.";
  return indexed === "legacy" ? "Reindex required to apply structured indexing." : "Reindex required to apply improved structured indexing.";
}
var fs3, path2, EMBEDDING_INDEX_MANIFEST_FILENAME, STRUCTURED_INDEX_FORMAT, legacyWarnedDirs;
var init_embeddingIndexManifest = __esm({
  "src/utils/embeddingIndexManifest.ts"() {
    "use strict";
    fs3 = __toESM(require("fs/promises"));
    path2 = __toESM(require("path"));
    init_coerceEmbedding();
    init_embeddingPrefix();
    EMBEDDING_INDEX_MANIFEST_FILENAME = ".big-rag-embedding.json";
    STRUCTURED_INDEX_FORMAT = "structured-v3";
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
  return /\p{L}/u.test(line);
}
function inferStructure(raw, options = {}) {
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
    if (options.inferHeadings !== false && current.length === 0) {
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

// src/parsers/markdown/pdfTables.ts
function isNumericCell(text) {
  const bare = text.replace(/^-/, "").replace(/[$%(),.]/g, "").trim();
  return bare.length > 0 && /^\d+$/.test(bare);
}
function isListMarker(text) {
  return LIST_MARKER.test(text.trim());
}
function columnsOf(line) {
  return (line.cells ?? []).map((cell) => cell.x0);
}
function isRowLike(line) {
  const cells = line.cells ?? [];
  return cells.length >= 2 && !cells.some((cell) => isListMarker(cell.text));
}
function continuesRun(columns, line, tolerance) {
  if (!isRowLike(line)) return false;
  const cells = line.cells ?? [];
  if (cells.length > columns.length) return false;
  let columnIndex = 0;
  for (const cell of cells) {
    while (columnIndex < columns.length && Math.abs(cell.x0 - columns[columnIndex]) > tolerance) columnIndex++;
    if (columnIndex >= columns.length) return false;
    columnIndex++;
  }
  return true;
}
function headerIndex(run) {
  const firstCell = (line) => (line.cells ?? [])[0]?.text ?? "";
  const labelled = run.findIndex((line) => !isNumericCell(firstCell(line)));
  return labelled >= 0 ? labelled : 0;
}
function findTableRows(lines, pageWidth) {
  const tolerance = pageWidth * COLUMN_TOLERANCE_SHARE;
  const rows = /* @__PURE__ */ new Map();
  let index = 0;
  while (index < lines.length) {
    const start = lines[index];
    if (!isRowLike(start)) {
      index++;
      continue;
    }
    const columns = columnsOf(start);
    let end = index + 1;
    while (end < lines.length && continuesRun(columns, lines[end], tolerance)) end++;
    if (end - index >= MIN_RUN_ROWS) {
      const run = lines.slice(index, end);
      const header = headerIndex(run);
      const tableRun = run.slice(header);
      const hasNumericCell = tableRun.some((line) => (line.cells ?? []).some((cell) => isNumericCell(cell.text)));
      if (hasNumericCell && tableRun.length >= MIN_RUN_ROWS) {
        tableRun.forEach((line, i) => {
          rows.set(index + header + i, { cells: (line.cells ?? []).map((cell) => cell.text), isHeader: i === 0 });
        });
      }
      index = end;
    } else {
      index++;
    }
  }
  return rows;
}
var COLUMN_TOLERANCE_SHARE, MIN_RUN_ROWS, LIST_MARKER;
var init_pdfTables = __esm({
  "src/parsers/markdown/pdfTables.ts"() {
    "use strict";
    COLUMN_TOLERANCE_SHARE = 0.03;
    MIN_RUN_ROWS = 2;
    LIST_MARKER = /^(?:[-*•·▪◦]|\d{1,3}[.)]|[a-zA-Z][.)]|[ivxlcdm]{2,4}[.)])$/i;
  }
});

// src/parsers/markdown/pdfStyles.ts
function styleKey(style) {
  return `${style.size}${style.bold ? "b" : ""}${style.italic ? "i" : ""}`;
}
function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}
function furnitureKey(text) {
  return text.replace(/\d+/g, "#").replace(/\s+/g, " ").trim().toLowerCase();
}
function inBand(line, height) {
  return line.box[1] < height * FURNITURE_BAND || line.box[3] > height * (1 - FURNITURE_BAND);
}
function mergeSameRowLines(lines) {
  const n = lines.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = lines[i];
      const b = lines[j];
      const heightA = a.box[3] - a.box[1];
      const heightB = b.box[3] - b.box[1];
      const shorter = Math.min(heightA, heightB);
      const overlap = Math.min(a.box[3], b.box[3]) - Math.max(a.box[1], b.box[1]);
      if (shorter > 0 && overlap > shorter * SAME_ROW_OVERLAP) {
        const ra = find(i);
        const rb = find(j);
        if (ra !== rb) parent[ra] = rb;
      }
    }
  }
  const groups = /* @__PURE__ */ new Map();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const members = groups.get(root) ?? [];
    members.push(i);
    groups.set(root, members);
  }
  const nonSpaceLength = (text) => text.replace(/\s/g, "").length;
  const merged = [];
  for (const members of groups.values()) {
    if (members.length === 1) {
      merged.push({ firstIndex: members[0], line: lines[members[0]] });
      continue;
    }
    const parts = members.map((i) => lines[i]);
    const byLeft = [...parts].sort((a, b) => a.box[0] - b.box[0]);
    const text = byLeft.map((part) => part.text).join(" ");
    const box = [
      Math.min(...parts.map((p) => p.box[0])),
      Math.min(...parts.map((p) => p.box[1])),
      Math.max(...parts.map((p) => p.box[2])),
      Math.max(...parts.map((p) => p.box[3]))
    ];
    let dominant = parts[0];
    for (const part of parts) {
      if (nonSpaceLength(part.text) > nonSpaceLength(dominant.text)) dominant = part;
    }
    const stylesDiffer = new Set(parts.map((part) => styleKey(part))).size > 1;
    const mixed = stylesDiffer || parts.some((part) => part.mixed);
    const cells = byLeft.map((part) => ({ text: part.text, x0: part.box[0], x1: part.box[2] }));
    merged.push({
      firstIndex: Math.min(...members),
      line: { text, size: dominant.size, bold: dominant.bold, italic: dominant.italic, mixed, box, cells }
    });
  }
  merged.sort((a, b) => a.firstIndex - b.firstIndex);
  return merged.map((entry) => entry.line);
}
function mergeRowsAcrossPages(pages) {
  return pages.map((page) => ({
    ...page,
    blocks: page.blocks.map((block) => ({ lines: mergeSameRowLines(block.lines) }))
  }));
}
function removeFurniture(rawPages) {
  const pages = mergeRowsAcrossPages(rawPages);
  const pagesByKey = /* @__PURE__ */ new Map();
  if (pages.length >= FURNITURE_MIN_PAGES) {
    pages.forEach((page, pageNumber) => {
      for (const block of page.blocks) {
        for (const line of block.lines) {
          if (!inBand(line, page.height)) continue;
          const key = furnitureKey(line.text);
          const seen = pagesByKey.get(key) ?? /* @__PURE__ */ new Set();
          seen.add(pageNumber);
          pagesByKey.set(key, seen);
        }
      }
    });
  }
  const isRepeated = (line, height) => inBand(line, height) && (pagesByKey.get(furnitureKey(line.text))?.size ?? 0) >= pages.length * FURNITURE_PAGE_SHARE;
  const kept = [];
  pages.forEach((page, pageNumber) => {
    page.blocks.forEach((block, blockNumber) => {
      for (const line of block.lines) {
        const text = line.text.replace(/\s+/g, " ").trim();
        if (!text || inBand(line, page.height) && PAGE_NUMBER.test(text)) continue;
        if (pagesByKey.size > 0 && isRepeated(line, page.height)) continue;
        kept.push({ line: { ...line, text }, page: pageNumber, block: blockNumber, order: kept.length });
      }
    });
  });
  return kept;
}
function bodyStyleOf(lines) {
  const words = /* @__PURE__ */ new Map();
  for (const { line } of lines) {
    const key = styleKey(line);
    words.set(key, (words.get(key) ?? 0) + wordCount(line.text));
  }
  let best = "";
  let bestWords = -1;
  for (const [key, count] of words) {
    if (count > bestWords) {
      best = key;
      bestWords = count;
    }
  }
  const { size, bold, italic } = lines.find(({ line }) => styleKey(line) === best).line;
  return { key: best, size, bold, italic };
}
function isHeadingStyle(line, body) {
  if (line.size < body.size) return false;
  return line.size > body.size || line.bold && !body.bold || line.italic && !body.italic;
}
function isNumericWord(word) {
  const stripped = word.replace(/[$%(),.]/g, "").replace(/^-/, "");
  return stripped.length > 0 && /^\d+$/.test(stripped);
}
function isNumericRow(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const numeric = words.filter(isNumericWord).length;
  return numeric >= 2 && numeric * 2 >= words.length;
}
function pageRowsOf(pageLines) {
  const lines = [...pageLines].sort((a, b) => a.line.box[1] - b.line.box[1]);
  const maxHeight = lines.reduce((max, { line }) => Math.max(max, line.box[3] - line.box[1]), 0);
  return { lines, maxHeight };
}
function firstAtOrBelow(lines, top) {
  let low = 0;
  let high = lines.length;
  while (low < high) {
    const mid = low + high >> 1;
    if (lines[mid].line.box[1] < top) low = mid + 1;
    else high = mid;
  }
  return low;
}
function sharesRow(target, rows) {
  const [, top, , bottom] = target.line.box;
  const height = Math.max(bottom - top, 1);
  for (let i = firstAtOrBelow(rows.lines, top - rows.maxHeight); i < rows.lines.length; i++) {
    const other = rows.lines[i];
    if (other.line.box[1] >= bottom) break;
    if (other === target || wordCount(other.line.text) > MAX_ROW_CELL_WORDS) continue;
    const overlap = Math.min(bottom, other.line.box[3]) - Math.max(top, other.line.box[1]);
    if (overlap > height * SAME_ROW_OVERLAP) return true;
  }
  return false;
}
function isCandidate(placed, body, rows) {
  const { line } = placed;
  if (line.mixed || styleKey(line) === body.key || !isHeadingStyle(line, body)) return false;
  if (wordCount(line.text) > MAX_HEADING_WORDS2) return false;
  if (!/\p{L}/u.test(line.text) || /[.,;:]$/.test(line.text)) return false;
  if (isNumericRow(line.text)) return false;
  return !sharesRow(placed, rows);
}
function followsDirectly(previous, next) {
  if (previous.page !== next.page) return false;
  const previousHeight = previous.line.box[3] - previous.line.box[1];
  const gap = next.line.box[1] - previous.line.box[3];
  return gap <= previousHeight && gap >= -previousHeight / 2;
}
function groupCandidates(lines, candidate) {
  const groups = [];
  let current = [];
  const close = () => {
    if (current.length === 0) return;
    const text = current.map((placed) => placed.line.text).join(" ");
    if (wordCount(text) <= MAX_HEADING_WORDS2) {
      groups.push({ style: styleKey(current[0].line), size: current[0].line.size, lines: current, text });
    }
    current = [];
  };
  lines.forEach((placed, i) => {
    if (!candidate[i]) {
      close();
      return;
    }
    const previous = current[current.length - 1];
    if (previous) {
      const adjacent = styleKey(previous.line) === styleKey(placed.line) && followsDirectly(previous, placed);
      if (!adjacent) close();
    }
    current.push(placed);
  });
  close();
  return groups;
}
function isWrappedParagraph(group, lines, candidate) {
  const first = group.lines[0];
  const last = group.lines[group.lines.length - 1];
  const continues = (neighbour, before) => neighbour !== void 0 && !candidate[neighbour.order] && styleKey(neighbour.line) === group.style && (before ? followsDirectly(neighbour, first) : followsDirectly(last, neighbour));
  return continues(lines[first.order - 1], true) || continues(lines[last.order + 1], false);
}
function rankStyles(groups, multiPage) {
  const styles = [...new Set(groups.map((group) => group.style))].map((style) => {
    const own = groups.filter((group) => group.style === style);
    const afterCover = own.find((group) => group.lines[0].page > 0);
    return {
      style,
      size: own[0].size,
      coverOnly: multiPage && afterCover === void 0,
      first: (afterCover ?? own[0]).lines[0].order
    };
  });
  styles.sort((a, b) => Number(a.coverOnly) - Number(b.coverOnly) || b.size - a.size || a.first - b.first);
  const levels = /* @__PURE__ */ new Map();
  styles.forEach(({ style }, i) => {
    levels.set(style, styles.length === 1 ? 2 : Math.min(i + 1, MAX_HEADING_LEVEL));
  });
  return levels;
}
function styledPagesToMarkdown(pages) {
  const lines = removeFurniture(pages);
  if (lines.length === 0) return null;
  const bodyStyle = bodyStyleOf(lines);
  const linesByPage = /* @__PURE__ */ new Map();
  for (const placed of lines) {
    const pageLines = linesByPage.get(placed.page) ?? [];
    pageLines.push(placed);
    linesByPage.set(placed.page, pageLines);
  }
  const rowsByPage = /* @__PURE__ */ new Map();
  for (const [pageNumber, pageLines] of linesByPage) rowsByPage.set(pageNumber, pageRowsOf(pageLines));
  const candidate = lines.map((placed) => isCandidate(placed, bodyStyle, rowsByPage.get(placed.page)));
  const allGroups = groupCandidates(lines, candidate);
  const linesPerStyle = /* @__PURE__ */ new Map();
  lines.forEach((placed, i) => {
    if (!candidate[i]) return;
    const key = styleKey(placed.line);
    linesPerStyle.set(key, (linesPerStyle.get(key) ?? 0) + 1);
  });
  const groups = allGroups.filter(
    (group) => (linesPerStyle.get(group.style) ?? 0) <= lines.length * MAX_HEADING_STYLE_SHARE && !isWrappedParagraph(group, lines, candidate)
  );
  if (groups.length === 0) return null;
  const levels = rankStyles(groups, pages.length > 1);
  const headingAt = /* @__PURE__ */ new Map();
  const headingLineOrders = /* @__PURE__ */ new Set();
  for (const group of groups) {
    headingAt.set(group.lines[0].order, `${"#".repeat(levels.get(group.style))} ${group.text}`);
    for (const placed of group.lines) headingLineOrders.add(placed.order);
  }
  const rowByOrder = /* @__PURE__ */ new Map();
  const pageLinesForTables = /* @__PURE__ */ new Map();
  for (const placed of lines) {
    const list = pageLinesForTables.get(placed.page) ?? [];
    list.push(placed);
    pageLinesForTables.set(placed.page, list);
  }
  for (const [pageNumber, placedLines] of pageLinesForTables) {
    const pageWidth = pages[pageNumber]?.width ?? 612;
    for (const [index, row] of findTableRows(placedLines.map((p) => p.line), pageWidth)) {
      rowByOrder.set(placedLines[index].order, row.cells.join(" | "));
    }
  }
  const parts = [];
  let paragraph = [];
  let currentBlock = "";
  const flush = () => {
    if (paragraph.length > 0) parts.push(paragraph.join("\n"));
    paragraph = [];
  };
  for (const placed of lines) {
    const blockId = `${placed.page}:${placed.block}`;
    if (blockId !== currentBlock) flush();
    currentBlock = blockId;
    const heading = headingAt.get(placed.order);
    if (heading) {
      flush();
      parts.push(heading);
      continue;
    }
    if (headingLineOrders.has(placed.order)) continue;
    const row = rowByOrder.get(placed.order);
    if (row) {
      flush();
      parts.push(row);
      continue;
    }
    paragraph.push(/^#{1,6}\s/.test(placed.line.text) ? `\\${placed.line.text}` : placed.line.text);
  }
  flush();
  return inferStructure(parts.join("\n\n"), { inferHeadings: false });
}
function pagesToPlainText(pages) {
  return pages.flatMap((page) => page.blocks).map((block) => block.lines.map((line) => line.text).join("\n")).join("\n\n");
}
var MAX_HEADING_WORDS2, FURNITURE_BAND, FURNITURE_PAGE_SHARE, FURNITURE_MIN_PAGES, MAX_HEADING_STYLE_SHARE, SAME_ROW_OVERLAP, MAX_ROW_CELL_WORDS, MAX_HEADING_LEVEL, PAGE_NUMBER;
var init_pdfStyles = __esm({
  "src/parsers/markdown/pdfStyles.ts"() {
    "use strict";
    init_inferStructure();
    init_pdfTables();
    MAX_HEADING_WORDS2 = 12;
    FURNITURE_BAND = 0.08;
    FURNITURE_PAGE_SHARE = 0.5;
    FURNITURE_MIN_PAGES = 3;
    MAX_HEADING_STYLE_SHARE = 0.15;
    SAME_ROW_OVERLAP = 0.5;
    MAX_ROW_CELL_WORDS = 5;
    MAX_HEADING_LEVEL = 3;
    PAGE_NUMBER = /^(?:page\s+)?\d+(?:\s+of\s+\d+)?$/i;
  }
});

// src/parsers/pdfParser.ts
async function getMupdf() {
  if (!cachedMupdf) {
    cachedMupdf = await import("mupdf");
  }
  return cachedMupdf;
}
function readStyledPage(doc, pageNumber) {
  const page = doc.loadPage(pageNumber);
  try {
    const bounds = page.getBounds();
    const stext = page.toStructuredText("preserve-whitespace");
    const blocks = [];
    let lines = [];
    let chars = "";
    let box = [0, 0, 0, 0];
    let styles = /* @__PURE__ */ new Map();
    let lastFontPointer = null;
    let lastFontFlags = { bold: false, italic: false };
    try {
      stext.walk({
        beginTextBlock() {
          lines = [];
        },
        beginLine(bbox) {
          chars = "";
          box = [bbox[0], bbox[1] - bounds[1], bbox[2], bbox[3] - bounds[1]];
          styles = /* @__PURE__ */ new Map();
        },
        onChar(c, _origin, font, size) {
          chars += c;
          if (!c.trim()) {
            font.destroy();
            return;
          }
          if (font.pointer !== lastFontPointer) {
            const name = font.getName();
            lastFontPointer = font.pointer;
            lastFontFlags = {
              bold: font.isBold() || BOLD_FONT.test(name),
              italic: font.isItalic() || ITALIC_FONT.test(name)
            };
          }
          font.destroy();
          const style = { size: Math.round(size * 2) / 2, ...lastFontFlags };
          const key = styleKey(style);
          const entry = styles.get(key) ?? { ...style, count: 0 };
          entry.count++;
          styles.set(key, entry);
        },
        endLine() {
          const text = chars.replace(/\s+/g, " ").trim();
          if (!text || styles.size === 0) return;
          const dominant = [...styles.values()].sort((a, b) => b.count - a.count)[0];
          lines.push({
            text,
            size: dominant.size,
            bold: dominant.bold,
            italic: dominant.italic,
            mixed: styles.size > 1,
            box
          });
        },
        endTextBlock() {
          if (lines.length > 0) blocks.push({ lines });
        }
      });
    } finally {
      stext.destroy();
    }
    return { width: bounds[2] - bounds[0], height: bounds[3] - bounds[1], blocks };
  } finally {
    page.destroy();
  }
}
async function tryMupdfStyledText(filePath) {
  const fileName = path4.basename(filePath);
  let doc = null;
  try {
    const mupdf = await getMupdf();
    doc = mupdf.Document.openDocument(await fs6.promises.readFile(filePath), "application/pdf");
    const pages = [];
    for (let pageNumber = 0; pageNumber < doc.countPages(); pageNumber++) {
      if (pageNumber > 0 && pageNumber % 10 === 0) await new Promise((resolve4) => setImmediate(resolve4));
      pages.push(readStyledPage(doc, pageNumber));
    }
    if (pages.every((page) => page.blocks.length === 0)) {
      return { success: false, reason: "pdf.mupdf-empty", details: "no text layer" };
    }
    const markdown = styledPagesToMarkdown(pages);
    if (markdown === null) {
      console.log(`[PDF Parser] (MuPDF) No heading styles found in ${fileName}; trying pdf-parse`);
      return { success: false, reason: "pdf.mupdf-no-headings", fallbackText: pagesToPlainText(pages) };
    }
    if (markdown.length < MIN_TEXT_LENGTH) {
      return { success: false, reason: "pdf.mupdf-empty", details: `length=${markdown.length}` };
    }
    console.log(`[PDF Parser] (MuPDF) Extracted styled text from ${fileName}`);
    return { success: true, text: markdown, stage: "mupdf" };
  } catch (error) {
    const summary = summarizeParserError(error);
    console.warn(`[PDF Parser] MuPDF couldn't read ${fileName} (${summary}); trying pdf-parse`);
    return { success: false, reason: "pdf.mupdf-error", details: summary };
  } finally {
    doc?.destroy();
  }
}
function summarizeParserError(error) {
  const raw = error instanceof Error ? error.message : String(error);
  const withoutStack = raw.split(/<\/>\s*STACK TRACE|\n\s*at\s/)[0];
  const text = withoutStack.replace(/[\u2500-\u257F]/g, " ").replace(/^\s*Error\b/, " ").replace(/\s+/g, " ").trim();
  if (!text) return "unknown error";
  return text.length > MAX_ERROR_SUMMARY_LENGTH ? `${text.slice(0, MAX_ERROR_SUMMARY_LENGTH - 1)}\u2026` : text;
}
async function tryLmStudioParser(filePath, client2) {
  const maxRetries = 2;
  const fileName = path4.basename(filePath);
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
        `[PDF Parser] (LM Studio) Parsed but got very little text from ${fileName} (length=${cleaned.length})`
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
      const summary = summarizeParserError(error);
      console.warn(`[PDF Parser] LM Studio parser couldn't read ${fileName} (${summary})`);
      return {
        success: false,
        reason: "pdf.lmstudio-error",
        details: summary
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
  const fileName = path4.basename(filePath);
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
    const summary = summarizeParserError(error);
    console.warn(`[PDF Parser] pdf-parse couldn't read ${fileName} (${summary}); trying the next fallback`);
    return {
      success: false,
      reason: "pdf.pdfparse-error",
      details: summary
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
async function parsePDF(filePath, client2, enableOCR, stages = DEFAULT_PDF_STAGES) {
  const fileName = path4.basename(filePath);
  const earlierFailures = [];
  const reportAllFailed = (final) => {
    const stagesTried = [...earlierFailures, final].map((failure) => `${failure.reason}${failure.details ? ` (${failure.details})` : ""}`).join("; ");
    console.error(`[PDF Parser] Could not extract text from ${filePath}: ${stagesTried}`);
    const earlier = earlierFailures.map((failure) => `${failure.reason}${failure.details ? ` (${failure.details})` : ""}`).join("; ");
    return { ...final, details: `${final.details ? `${final.details}; ` : ""}earlier: ${earlier}` };
  };
  const mupdfResult = await stages.mupdf(filePath);
  if (mupdfResult.success) return mupdfResult;
  earlierFailures.push(mupdfResult);
  const pdfParseResult = await stages.pdfParse(filePath);
  if (pdfParseResult.success) return pdfParseResult;
  earlierFailures.push(pdfParseResult);
  if (mupdfResult.fallbackText !== void 0) {
    const plain = inferStructure(mupdfResult.fallbackText);
    if (plain.length >= MIN_TEXT_LENGTH) {
      console.log(`[PDF Parser] pdf-parse couldn't read ${fileName}; using MuPDF's plain text instead`);
      return { success: true, text: plain, stage: "mupdf" };
    }
  }
  if (enableOCR) {
    console.log(`[PDF Parser] (OCR) No text extracted from ${fileName} with MuPDF or pdf-parse, attempting OCR...`);
    const ocrResult = await stages.ocr(filePath);
    if (ocrResult.success) return ocrResult;
    earlierFailures.push(ocrResult);
  } else {
    console.log(`[PDF Parser] (OCR) Enable OCR is off, skipping OCR for ${fileName}`);
    earlierFailures.push({ success: false, reason: "pdf.ocr-disabled" });
  }
  const lmStudioResult = await stages.lmStudio(filePath, client2);
  return lmStudioResult.success ? lmStudioResult : reportAllFailed(lmStudioResult);
}
var fs6, path4, import_pdf_parse, import_tesseract, cachedMupdf, BOLD_FONT, ITALIC_FONT, MIN_TEXT_LENGTH, OCR_MAX_PAGES, OCR_DEFAULT_SCALE, OCR_MIN_SCALE, OCR_MAX_PIXMAP_PIXELS, MAX_ERROR_SUMMARY_LENGTH, DEFAULT_PDF_STAGES;
var init_pdfParser = __esm({
  "src/parsers/pdfParser.ts"() {
    "use strict";
    fs6 = __toESM(require("fs"));
    path4 = __toESM(require("path"));
    import_pdf_parse = __toESM(require("pdf-parse"));
    import_tesseract = require("tesseract.js");
    init_inferStructure();
    init_ocrPages();
    init_pdfStyles();
    cachedMupdf = null;
    BOLD_FONT = /bold|black|heavy|semibold|demi/i;
    ITALIC_FONT = /italic|oblique/i;
    MIN_TEXT_LENGTH = 50;
    OCR_MAX_PAGES = 50;
    OCR_DEFAULT_SCALE = 2;
    OCR_MIN_SCALE = 0.75;
    OCR_MAX_PIXMAP_PIXELS = 5e7;
    MAX_ERROR_SUMMARY_LENGTH = 160;
    DEFAULT_PDF_STAGES = {
      mupdf: tryMupdfStyledText,
      pdfParse: tryPdfParse,
      ocr: tryOcrWithMuPdf,
      lmStudio: tryLmStudioParser
    };
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
  return path5.posix.normalize(`${baseDir}/${target}`);
}
function slideRelsPath(slidePath) {
  return `${path5.posix.dirname(slidePath)}/_rels/${path5.posix.basename(slidePath)}.rels`;
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
  const notesPath = resolveRelativeTarget(path5.posix.dirname(slidePath), notesRel.target);
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
var fs8, path5, import_jszip2;
var init_pptxParser = __esm({
  "src/parsers/pptxParser.ts"() {
    "use strict";
    fs8 = __toESM(require("fs"));
    path5 = __toESM(require("path"));
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
  const ext = path6.extname(filePath).toLowerCase();
  const fileName = path6.basename(filePath);
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
var path6;
var init_documentParser = __esm({
  "src/parsers/documentParser.ts"() {
    "use strict";
    path6 = __toESM(require("path"));
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
var fs10, path7, FailedFileRegistry;
var init_failedFileRegistry = __esm({
  "src/utils/failedFileRegistry.ts"() {
    "use strict";
    fs10 = __toESM(require("fs/promises"));
    path7 = __toESM(require("path"));
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
        await fs10.mkdir(path7.dirname(this.registryPath), { recursive: true });
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

// src/chunking/linariseTables.ts
function startsNewTable(previousRowCells, cells) {
  return previousRowCells.some(isNumericCell) && !cells.some(isNumericCell);
}
function linariseTables(text) {
  const out = [];
  let header = null;
  let previousRowCells = null;
  for (const line of text.split("\n")) {
    if (!line.includes(" | ")) {
      header = null;
      previousRowCells = null;
      out.push(line);
      continue;
    }
    const cells = line.split(" | ").map((cell) => cell.trim());
    const newTable = previousRowCells !== null && startsNewTable(previousRowCells, cells);
    previousRowCells = cells;
    if (!header || newTable) {
      header = cells;
      out.push(line);
      continue;
    }
    const named = cells.slice(1).map((value, i) => {
      const column = header?.[i + 1] ?? "";
      return column ? `${column}: ${value}` : value;
    }).join("; ");
    out.push(named ? `${cells[0]} \u2014 ${named}` : cells[0]);
  }
  return out.join("\n");
}
var init_linariseTables = __esm({
  "src/chunking/linariseTables.ts"() {
    "use strict";
    init_pdfTables();
  }
});

// src/chunking/structuredChunker.ts
function wordCount2(text) {
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
      const path11 = section.blocks[0]?.kind === "listItem" ? pending.path : section.path;
      merged.push({ ...section, path: path11, blocks: [...pending.blocks, ...section.blocks] });
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
  const tables = [];
  let openTable = null;
  let previousRowCells = null;
  section.blocks.forEach((block) => {
    const rendered = renderBlock(block);
    const blockWords = rendered.split(/\s+/).filter(Boolean);
    blockWords.forEach((word, i) => tokens.push({ word, separator: i === blockWords.length - 1 ? "\n" : " " }));
    if (block.kind === "tableRow") {
      const cells = rendered.split(" | ").map((cell) => cell.trim());
      const rowStart = tokens.length - blockWords.length;
      if (openTable && previousRowCells && startsNewTable(previousRowCells, cells)) {
        tables.push({ ...openTable, end: rowStart });
        openTable = null;
      }
      if (!openTable) openTable = { start: rowStart, headerText: rendered };
      previousRowCells = cells;
    } else {
      previousRowCells = null;
      if (openTable) {
        const opened = openTable;
        tables.push({ ...opened, end: tokens.length - blockWords.length });
        openTable = null;
      }
    }
    if (block.kind === "heading") {
      headingEnds.push(tokens.length);
      if (inLeadingHeadingRun) headingEnd = tokens.length;
    } else {
      inLeadingHeadingRun = false;
      blockEnds.push(tokens.length);
    }
  });
  if (openTable) {
    const closing = openTable;
    tables.push({ ...closing, end: tokens.length });
  }
  return { section, tokens, offset, blockEnds, headingEnd, headingEnds, tables };
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
function chooseCut(blockEnds, sentences, lowerExclusive, limit, fullEnough) {
  const paragraphEnd = lastBoundary(blockEnds, lowerExclusive, limit);
  if (paragraphEnd !== void 0 && paragraphEnd >= fullEnough) return paragraphEnd;
  const sentenceEnd = lastBoundary(sentences, lowerExclusive, limit);
  if (sentenceEnd !== void 0 && (paragraphEnd === void 0 || sentenceEnd > paragraphEnd)) return sentenceEnd;
  return paragraphEnd ?? limit;
}
async function chunkStructured(markdown, options) {
  const withDates = options.extractDates !== false;
  const sections = mergeHeadingOnlySections(buildSections(markdown, options.dateContext, withDates));
  if (sections.length === 0) return [];
  const totalWords = wordCount2(markdown);
  const totalTokens = await options.countTokens(markdown);
  const tokensPerWord = totalTokens > 0 && totalWords > 0 ? totalTokens / totalWords : 1;
  const budgetWords = Math.max(1, Math.round(options.chunkSize / tokensPerWord));
  const textDates = (text) => withDates ? extractDates(text, options.dateContext) : [];
  const describe = (group, text) => {
    const [first, ...rest] = group;
    const firstPath = first.path.join(" > ");
    const extraTitles = rest.filter((s) => s.blocks[0]?.kind === "heading").map((s) => s.path[s.path.length - 1]).filter((title) => Boolean(title));
    const shownTitles = extraTitles.slice(0, MAX_EXTRA_TITLES);
    const hiddenCount = extraTitles.length - shownTitles.length;
    const sectionPath = [firstPath, ...shownTitles].filter(Boolean).join(" ; ") + (hiddenCount > 0 ? ` +${hiddenCount} more` : "");
    const dates = dedupeRanges([...group.flatMap((s) => s.dates), ...textDates(text)]);
    const contextHeader = buildContextHeader(options.fileName, options.postedDate, sectionPath, dates);
    return { sectionPath, dates, contextHeader };
  };
  const firstHeader = describe([sections[0]], tokensToText(tokenizeSection(sections[0], 0).tokens)).contextHeader;
  const firstHeaderWords = wordCount2(firstHeader);
  const firstHeaderTokens = await options.countTokens(firstHeader);
  const headerTokensPerWord = firstHeaderTokens > 0 && firstHeaderWords > 0 ? firstHeaderTokens / firstHeaderWords : tokensPerWord;
  const headerBudgetWords = (header) => Math.ceil(wordCount2(header) * headerTokensPerWord / tokensPerWord);
  const chunks = [];
  const emit = (group, tokens, startIndex, prefix = "") => {
    const body = tokensToText(tokens);
    const text = prefix ? `${prefix}
${body}` : body;
    const { sectionPath, dates, contextHeader } = describe(group, text);
    const embedded = linariseTables(text);
    chunks.push({
      text,
      embedText: embedded === text ? void 0 : embedded,
      contextHeader,
      sectionPath,
      dates,
      startIndex,
      endIndex: startIndex + tokens.length
    });
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
    const tableAt = (position) => item.tables.find((table) => position > table.start && position < table.end);
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
        end = chooseCut(item.blockEnds, sentences, lower, limit, start + Math.ceil(pieceBudget * MIN_PIECE_FILL));
      }
      if (start === 0 && end <= item.headingEnd) {
        end = Math.min(total, item.headingEnd + 1);
      }
      const straddled = tableAt(end);
      if (straddled) {
        if (straddled.start > lower) {
          end = straddled.start;
        } else {
          end = lastBoundary(item.blockEnds, lower, limit) ?? end;
        }
      } else {
        end = avoidHeadingEnd(end, lower);
      }
      const openedIn = tableAt(start);
      const repeatHeader = openedIn && start > openedIn.start ? openedIn.headerText : "";
      emit([item.section], item.tokens.slice(start, end), item.offset + start, repeatHeader);
      start = end;
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
var MAX_EXTRA_TITLES, MIN_PIECE_FILL;
var init_structuredChunker = __esm({
  "src/chunking/structuredChunker.ts"() {
    "use strict";
    init_dates();
    init_sections();
    init_linariseTables();
    MAX_EXTRA_TITLES = 2;
    MIN_PIECE_FILL = 0.75;
  }
});

// src/ingestion/indexManager.ts
var import_p_queue, fs11, path8, EXCLUDE_PROGRESS_THROTTLE, IndexManager;
var init_indexManager = __esm({
  "src/ingestion/indexManager.ts"() {
    "use strict";
    import_p_queue = __toESM(require("p-queue"));
    fs11 = __toESM(require("fs"));
    path8 = __toESM(require("path"));
    init_fileScanner();
    init_documentParser();
    init_textChunker();
    init_normalizeMarkdown();
    init_fileHash();
    init_failedFileRegistry();
    init_coerceEmbedding();
    init_structuredChunker();
    init_dates();
    init_embeddingIndexManifest();
    init_embeddingPrefix();
    EXCLUDE_PROGRESS_THROTTLE = 40;
    IndexManager = class {
      constructor(options) {
        this.failureReasonCounts = {};
        this.options = options;
        this.queue = new import_p_queue.default({ concurrency: options.maxConcurrent });
        this.failedFileRegistry = new FailedFileRegistry(
          path8.join(options.vectorStoreDir, ".big-rag-failures.json")
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
              const embeddingResult = await embeddingModel.embed(
                documentText(this.options.embeddingModelId, chunk.embedText)
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
${chunk.embedText ?? chunk.text}`,
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex,
          metadata: {
            indexFormat: STRUCTURED_INDEX_FORMAT,
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
          await fs11.promises.mkdir(path8.dirname(reportPath), { recursive: true });
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
    structuredIndexing,
    resolvedModelId
  );
  const indexManager = new IndexManager({
    documentsDir,
    vectorStore: vectorStore2,
    vectorStoreDir,
    embeddingModel,
    embeddingModelId: resolvedModelId,
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

// src/retrieval/bm25.ts
function trimSuffix(word) {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 3 && word.endsWith("ed")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}
function tokenize(text) {
  const terms = [];
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < MIN_TERM_LENGTH || STOP_WORDS.has(raw)) continue;
    terms.push(trimSuffix(raw));
  }
  return terms;
}
function rankTexts(terms, candidates, options) {
  if (terms.length === 0 || candidates.length === 0) return [];
  const wanted = new Set(terms);
  const frequenciesPer = [];
  const lengths = [];
  const documentFrequency = /* @__PURE__ */ new Map();
  for (const candidate of candidates) {
    const candidateTerms = tokenize(candidate.text);
    lengths.push(candidateTerms.length);
    const frequencies = /* @__PURE__ */ new Map();
    for (const term of candidateTerms) {
      if (!wanted.has(term)) continue;
      frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
    }
    for (const term of frequencies.keys()) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
    frequenciesPer.push(frequencies);
  }
  const totalLength = lengths.reduce((sum, length) => sum + length, 0);
  if (totalLength === 0) return [];
  const averageLength = totalLength / candidates.length;
  const total = candidates.length;
  const idfByTerm = /* @__PURE__ */ new Map();
  for (const [term, df] of documentFrequency) {
    idfByTerm.set(term, Math.log(1 + (total - df + 0.5) / (df + 0.5)));
  }
  const scored = [];
  candidates.forEach((candidate, order) => {
    const frequencies = frequenciesPer[order];
    if (frequencies.size === 0) return;
    const lengthRatio = lengths[order] / averageLength;
    const normalisation = options.k1 * (1 - options.b + options.b * lengthRatio);
    let score = 0;
    for (const [term, termFrequency] of frequencies) {
      const idf = idfByTerm.get(term) ?? 0;
      score += idf * (termFrequency * (options.k1 + 1) / (termFrequency + normalisation));
    }
    if (score > 0) scored.push({ key: candidate.key, score, order });
  });
  return scored.sort((a, b) => b.score - a.score || a.order - b.order).map((entry) => entry.key);
}
var STOP_WORDS, MIN_TERM_LENGTH;
var init_bm25 = __esm({
  "src/retrieval/bm25.ts"() {
    "use strict";
    STOP_WORDS = /* @__PURE__ */ new Set([
      "a",
      "an",
      "and",
      "are",
      "as",
      "at",
      "be",
      "but",
      "by",
      "can",
      "did",
      "do",
      "does",
      "for",
      "from",
      "had",
      "has",
      "have",
      "he",
      "her",
      "his",
      "how",
      "i",
      "if",
      "in",
      "into",
      "is",
      "it",
      "its",
      "me",
      "my",
      "of",
      "on",
      "or",
      "our",
      "she",
      "so",
      "some",
      "than",
      "that",
      "the",
      "their",
      "them",
      "then",
      "there",
      "these",
      "they",
      "this",
      "to",
      "was",
      "we",
      "were",
      "what",
      "when",
      "where",
      "which",
      "who",
      "why",
      "will",
      "with",
      "would",
      "you",
      "your"
    ]);
    MIN_TERM_LENGTH = 2;
  }
});

// src/retrieval/fuse.ts
function fuseLanes(lanes, rrfConstant) {
  const fused = /* @__PURE__ */ new Map();
  const firstSeen = /* @__PURE__ */ new Map();
  let order = 0;
  for (const lane of lanes) {
    if (lane.weight === 0) continue;
    lane.keys.forEach((key, index) => {
      const existing = fused.get(key) ?? { key, score: 0, lanes: [] };
      existing.score += lane.weight / (rrfConstant + index + 1);
      existing.lanes.push(lane.name);
      fused.set(key, existing);
      if (!firstSeen.has(key)) firstSeen.set(key, order++);
    });
  }
  return [...fused.values()].sort(
    (a, b) => b.score - a.score || firstSeen.get(a.key) - firstSeen.get(b.key)
  );
}
var init_fuse = __esm({
  "src/retrieval/fuse.ts"() {
    "use strict";
  }
});

// src/retrieval/queryDates.ts
function toDayNumber(date) {
  return date.getFullYear() * 1e4 + (date.getMonth() + 1) * 100 + date.getDate();
}
function dayRangeOfDates(start, end) {
  return { start: toDayNumber(start), end: toDayNumber(end) };
}
function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS2);
}
function startOfWeek(date) {
  const offset = (date.getDay() + 6) % 7;
  return addDays(date, -offset);
}
function monthRange2(year, month) {
  const lastDay = new Date(year, month, 0).getDate();
  return { start: year * 1e4 + month * 100 + 1, end: year * 1e4 + month * 100 + lastDay };
}
function quarterRange2(year, quarter) {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const lastDay = new Date(year, endMonth, 0).getDate();
  return { start: year * 1e4 + startMonth * 100 + 1, end: year * 1e4 + endMonth * 100 + lastDay };
}
function isoToDayNumber(iso) {
  return Number(iso.replace(/-/g, ""));
}
function rangeFromExtracted(range) {
  return { start: isoToDayNumber(range.start), end: isoToDayNumber(range.end) };
}
function relativeRange(question, now) {
  const text = question.toLowerCase();
  const countMatch = /\b(?:past|last)\s+(\d{1,3})\s+(day|week|month)s?\b/.exec(text);
  if (countMatch) {
    const count = Number(countMatch[1]);
    if (countMatch[2] === "day") return dayRangeOfDates(addDays(now, -(count - 1)), now);
    if (countMatch[2] === "week") return dayRangeOfDates(addDays(now, -(count * 7 - 1)), now);
    const start = new Date(now.getFullYear(), now.getMonth() - (count - 1), 1);
    return dayRangeOfDates(start, now);
  }
  if (/\btoday\b/.test(text)) return dayRangeOfDates(now, now);
  if (/\byesterday\b/.test(text)) {
    const day = addDays(now, -1);
    return dayRangeOfDates(day, day);
  }
  if (/\bthis week\b/.test(text)) {
    const start = startOfWeek(now);
    return dayRangeOfDates(start, addDays(start, 6));
  }
  if (/\blast week\b/.test(text)) {
    const start = addDays(startOfWeek(now), -7);
    return dayRangeOfDates(start, addDays(start, 6));
  }
  if (/\bthis month\b/.test(text)) return monthRange2(now.getFullYear(), now.getMonth() + 1);
  if (/\blast month\b/.test(text)) {
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return monthRange2(previous.getFullYear(), previous.getMonth() + 1);
  }
  if (/\bthis quarter\b/.test(text)) return quarterRange2(now.getFullYear(), Math.floor(now.getMonth() / 3) + 1);
  if (/\blast quarter\b/.test(text)) {
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    return quarter === 1 ? quarterRange2(now.getFullYear() - 1, 4) : quarterRange2(now.getFullYear(), quarter - 1);
  }
  if (/\bthis year\b/.test(text)) {
    return { start: now.getFullYear() * 1e4 + 101, end: now.getFullYear() * 1e4 + 1231 };
  }
  if (/\blast year\b/.test(text)) {
    const year = now.getFullYear() - 1;
    return { start: year * 1e4 + 101, end: year * 1e4 + 1231 };
  }
  return null;
}
function yearlessRanges(question, now, yearsPresent) {
  const match = YEARLESS_DAY_MONTH.exec(question) ?? YEARLESS_MONTH_DAY.exec(question);
  if (!match) return [];
  const dayFirst = YEARLESS_DAY_MONTH.test(question);
  const day = Number(dayFirst ? match[1] : match[2]);
  const monthName = (dayFirst ? match[2] : match[1]).slice(0, 3).toLowerCase();
  const month = MONTH_KEYS2.indexOf(monthName) + 1;
  if (month === 0 || day < 1 || day > 31) return [];
  const years = yearsPresent && yearsPresent.length > 0 ? [...yearsPresent] : [now.getFullYear()];
  years.sort((a, b) => b - a);
  return years.filter((year) => new Date(year, month - 1, day).getDate() === day).map((year) => {
    const dayNumber = year * 1e4 + month * 100 + day;
    return { start: dayNumber, end: dayNumber };
  });
}
function bareYearRanges(question) {
  const years = /* @__PURE__ */ new Set();
  for (const match of question.matchAll(YEAR_ONLY)) {
    const before = question.slice(0, match.index ?? 0).trimEnd();
    const after = question.slice((match.index ?? 0) + match[0].length);
    if (NOT_A_YEAR_BEFORE.test(before) || NOT_A_YEAR_AFTER.test(after)) continue;
    years.add(Number(match[1]));
  }
  return [...years].sort((a, b) => b - a).map((year) => ({ start: year * 1e4 + 101, end: year * 1e4 + 1231 }));
}
function queryDayRanges(question, options = {}) {
  if (!question.trim()) return [];
  const now = options.now ?? /* @__PURE__ */ new Date();
  const relative2 = relativeRange(question, now);
  if (relative2) return [relative2];
  const extracted = extractDates(question, { referenceTime: now });
  if (extracted.length > 0) return extracted.map(rangeFromExtracted);
  const yearless = yearlessRanges(question, now, options.yearsPresent);
  if (yearless.length > 0) return yearless;
  return bareYearRanges(question);
}
var DAY_MS2, YEARLESS_DAY_MONTH, YEARLESS_MONTH_DAY, MONTH_KEYS2, YEAR_ONLY, NOT_A_YEAR_BEFORE, NOT_A_YEAR_AFTER;
var init_queryDates = __esm({
  "src/retrieval/queryDates.ts"() {
    "use strict";
    init_dates();
    DAY_MS2 = 864e5;
    YEARLESS_DAY_MONTH = new RegExp(
      `(?<![\\w])(\\d{1,2})(?:st|nd|rd|th)?[\\s-]+(${MONTH_PATTERN})\\.?(?![\\s-]*\\d{4})(?![\\w])`,
      "i"
    );
    YEARLESS_MONTH_DAY = new RegExp(
      `(?<![\\w])(${MONTH_PATTERN})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?![,\\s]*\\d{4})(?![\\w])`,
      "i"
    );
    MONTH_KEYS2 = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    YEAR_ONLY = /(?<![\w.$-])(?:fy\s*|fiscal\s+(?:year\s+)?)?((?:19|20)\d{2})(?![\w.%-])/gi;
    NOT_A_YEAR_BEFORE = /(?:\$|usd|eur|gbp|versions?)\s*$/i;
    NOT_A_YEAR_AFTER = /^\s*(?:dollars|usd|eur|euros|gbp|pounds)\b/i;
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
function withNeighbours(chosen, candidates, neighbourChunks) {
  if (neighbourChunks <= 0 || chosen.length === 0) return chosen;
  const byPosition = /* @__PURE__ */ new Map();
  for (const candidate of candidates.values()) {
    byPosition.set(`${candidate.filePath}::${candidate.chunkIndex}`, candidate);
  }
  const out = [];
  const taken = new Set(chosen.map((result) => `${result.filePath}::${result.chunkIndex}`));
  for (const result of chosen) {
    for (let offset = -neighbourChunks; offset <= neighbourChunks; offset++) {
      if (offset === 0) {
        out.push(result);
        continue;
      }
      const key = `${result.filePath}::${result.chunkIndex + offset}`;
      const neighbour = byPosition.get(key);
      if (!neighbour || taken.has(key)) continue;
      taken.add(key);
      out.push({ ...neighbour, score: result.score, similarity: result.similarity ?? result.score });
    }
  }
  return out;
}
async function safeLane(name, run) {
  try {
    return await run();
  } catch (error) {
    console.warn(`[BigRAG] ${name} lane failed; continuing without it:`, error);
    return [];
  }
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
  const fusing = options.depth === "medium" || options.depth === "high";
  const searchLimit = fusing ? options.laneCandidates : options.enableContextCompaction ? options.retrievalLimit * CONTEXT_COMPACTION_POOL_MULTIPLIER : options.retrievalLimit;
  let hypotheticalEmbedding = null;
  if (options.depth === "high" && deps.hypothetical) {
    hypotheticalEmbedding = await timed("hypothetical", async () => {
      const drafted = await deps.hypothetical(query);
      return drafted === null ? null : await deps.embedQuery(drafted);
    });
    options.abortSignal?.throwIfAborted();
  }
  const queryVectors = hypotheticalEmbedding ? [queryEmbedding, hypotheticalEmbedding] : [queryEmbedding];
  const [searched, hypotheticalResults = []] = await timed(
    "vectorSearch",
    () => deps.vectorStore.searchMany(queryVectors, searchLimit, options.retrievalThreshold)
  );
  options.abortSignal?.throwIfAborted();
  const catalog = fusing ? deps.catalog ?? null : null;
  const laneCounts = { vector: 0, hyde: 0, keyword: 0, date: 0 };
  let dayRanges = [];
  let ranked = searched;
  let winnerLanesByKey = null;
  let fusedKeys = null;
  const resolvedByKey = /* @__PURE__ */ new Map();
  if (catalog) {
    const datedKeys = await timed(
      "dateLane",
      () => safeLane("date", async () => {
        dayRanges = queryDayRanges(query, {
          now: deps.nowDate?.() ?? /* @__PURE__ */ new Date(),
          yearsPresent: catalog.yearsPresent()
        });
        if (dayRanges.length === 0) return [];
        return catalog.chunksForRanges(dayRanges).map((chunkNumber) => catalog.keyOf(chunkNumber));
      })
    );
    options.abortSignal?.throwIfAborted();
    const vectorByKey = new Map(searched.map((result) => [chunkKey(result), result]));
    for (const [key, result] of vectorByKey) resolvedByKey.set(key, result);
    const lanes = [
      { name: "vector", weight: options.laneWeights.vector, keys: [...vectorByKey.keys()] }
    ];
    if (hypotheticalResults.length > 0) {
      for (const result of hypotheticalResults) resolvedByKey.set(chunkKey(result), result);
      lanes.push({
        name: "hyde",
        weight: options.laneWeights.hyde,
        keys: hypotheticalResults.map(chunkKey)
      });
    }
    const keywordRanking = options.laneWeights.keyword === 0 ? [] : await timed(
      "keywordRerank",
      () => safeLane(
        "keyword",
        async () => rankTexts(
          tokenize(query),
          [...resolvedByKey.values()].map((result) => ({ key: chunkKey(result), text: result.text })),
          { k1: options.bm25K1, b: options.bm25B }
        )
      )
    );
    options.abortSignal?.throwIfAborted();
    const dated = new Set(datedKeys);
    const dateBoost = options.laneWeights.date / (options.rrfConstant + 1);
    const fused = await timed("fuse", async () => {
      const ranking = fuseLanes(lanes, options.rrfConstant);
      let boosted = false;
      const byKey = new Map(ranking.map((entry) => [entry.key, entry]));
      keywordRanking.slice(0, options.rerankDepth).forEach((key, index) => {
        const entry = byKey.get(key);
        if (!entry) return;
        entry.score += options.laneWeights.keyword / (options.rrfConstant + index + 1);
        entry.lanes.push("keyword");
        boosted = true;
      });
      for (const entry of ranking) {
        if (!dated.has(entry.key)) continue;
        entry.score += dateBoost;
        entry.lanes.push("date");
        boosted = true;
      }
      return boosted ? ranking.sort((a, b) => b.score - a.score) : ranking;
    });
    fusedKeys = fused.map((entry) => entry.key);
    const winnerCount = options.enableContextCompaction ? options.retrievalLimit * CONTEXT_COMPACTION_POOL_MULTIPLIER : options.retrievalLimit;
    const winners = fused.slice(0, winnerCount);
    winnerLanesByKey = new Map(winners.map((winner) => [winner.key, winner.lanes]));
    const chosen = winners.map((winner) => {
      const source = resolvedByKey.get(winner.key);
      return source ? { ...source, score: winner.score, similarity: source.score } : null;
    }).filter((result) => result !== null);
    ranked = withNeighbours(chosen, resolvedByKey, options.neighbourChunks);
    options.abortSignal?.throwIfAborted();
  } else {
    laneCounts.vector = Math.min(searched.length, options.retrievalLimit);
    ranked = searched.slice(0, options.enableContextCompaction ? searched.length : options.retrievalLimit);
  }
  let passages = await timed("trimOverlap", async () => trimOverlappingChunks(ranked));
  if (options.enableContextCompaction && passages.length > 0) {
    const targetTokenBudget = options.retrievalLimit * options.chunkSize;
    const candidates = passages;
    passages = await timed(
      "compaction",
      () => compactResultsToBudget(candidates, queryEmbedding, deps, targetTokenBudget)
    );
  }
  let diagnosticPool = [];
  if (options.diagnosticPoolSize && fusedKeys) {
    diagnosticPool = fusedKeys.slice(0, options.diagnosticPoolSize).map((key) => resolvedByKey.get(key)).filter((result) => result !== void 0);
  } else if (options.diagnosticPoolSize) {
    diagnosticPool = (await deps.vectorStore.searchMany([queryEmbedding], options.diagnosticPoolSize, Number.NEGATIVE_INFINITY))[0];
  }
  let passageLanes = passages.map(() => []);
  if (winnerLanesByKey) {
    const finalLanesByKey = winnerLanesByKey;
    passageLanes = passages.map((passage) => finalLanesByKey.get(chunkKey(passage)) ?? []);
    laneCounts.vector = 0;
    laneCounts.hyde = 0;
    laneCounts.keyword = 0;
    laneCounts.date = 0;
    for (const lanes of passageLanes) {
      if (lanes.includes("vector")) laneCounts.vector++;
      if (lanes.includes("hyde")) laneCounts.hyde++;
      if (lanes.includes("keyword")) laneCounts.keyword++;
      if (lanes.includes("date")) laneCounts.date++;
    }
  }
  return { passages, diagnosticPool, timings, laneCounts, passageLanes, dayRanges };
}
var CONTEXT_COMPACTION_POOL_MULTIPLIER;
var init_retrieve = __esm({
  "src/retrieval/retrieve.ts"() {
    "use strict";
    init_vectorStore();
    init_trimOverlappingChunks();
    init_compactPassages();
    init_bm25();
    init_fuse();
    init_queryDates();
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

// src/retrieval/chunkCatalog.ts
function isoToDayNumber2(iso) {
  return Number(iso.replace(/-/g, ""));
}
function daysOf(metadata) {
  const days = /* @__PURE__ */ new Set();
  const add = (raw) => {
    if (typeof raw !== "string" || raw.length === 0) return;
    try {
      const parsed = JSON.parse(raw);
      for (const range of Array.isArray(parsed) ? parsed : [parsed]) {
        if (range && typeof range.start === "string") days.add(isoToDayNumber2(range.start));
        if (range && typeof range.end === "string") days.add(isoToDayNumber2(range.end));
      }
    } catch {
    }
  };
  add(metadata?.postedDate);
  add(metadata?.dates);
  return [...days].sort((a, b) => a - b);
}
var fs12, path9, CATALOG_FILENAME, ChunkCatalog;
var init_chunkCatalog = __esm({
  "src/retrieval/chunkCatalog.ts"() {
    "use strict";
    fs12 = __toESM(require("fs/promises"));
    path9 = __toESM(require("path"));
    init_vectorStore();
    CATALOG_FILENAME = ".big-rag-catalog.json";
    ChunkCatalog = class _ChunkCatalog {
      constructor(file) {
        this.file = file;
      }
      static build(chunks, options) {
        const rows = [];
        const days = {};
        chunks.forEach((chunk, chunkNumber) => {
          const chunkDays = daysOf(chunk.metadata ?? {});
          rows.push({ key: chunkKey(chunk), filePath: chunk.filePath });
          for (const day of chunkDays) {
            const key = String(day);
            (days[key] ??= []).push(chunkNumber);
          }
        });
        const file = {
          version: options.version,
          chunkCount: chunks.length,
          chunks: rows,
          days
        };
        return new _ChunkCatalog(file);
      }
      static async load(vectorStoreDir, options) {
        try {
          const raw = await fs12.readFile(path9.join(vectorStoreDir, CATALOG_FILENAME), "utf-8");
          const file = JSON.parse(raw);
          if (file?.version !== options.version || !Array.isArray(file.chunks) || typeof file.chunkCount !== "number" || typeof file.days !== "object") {
            return null;
          }
          return new _ChunkCatalog(file);
        } catch {
          return null;
        }
      }
      async save(vectorStoreDir) {
        await fs12.writeFile(path9.join(vectorStoreDir, CATALOG_FILENAME), JSON.stringify(this.file), "utf-8");
      }
      get chunkCount() {
        return this.file.chunkCount;
      }
      isStaleFor(storeChunkCount) {
        return storeChunkCount !== this.file.chunkCount;
      }
      keyOf(chunkNumber) {
        return this.file.chunks[chunkNumber]?.key ?? "";
      }
      /** Years present in the index, most recent first. */
      yearsPresent() {
        const years = /* @__PURE__ */ new Set();
        for (const key of Object.keys(this.file.days)) years.add(Math.floor(Number(key) / 1e4));
        return [...years].sort((a, b) => b - a);
      }
      /** Chunk numbers whose posted or section dates fall inside any range, sorted ascending. */
      chunksForRanges(ranges) {
        if (ranges.length === 0) return [];
        const matched = /* @__PURE__ */ new Set();
        for (const [dayKey, chunkNumbers] of Object.entries(this.file.days)) {
          const day = Number(dayKey);
          if (ranges.some((range) => day >= range.start && day <= range.end)) {
            for (const chunkNumber of chunkNumbers) matched.add(chunkNumber);
          }
        }
        return [...matched].sort((a, b) => a - b);
      }
    };
  }
});

// src/retrieval/catalogManager.ts
function resetCatalogCache(vectorStoreDir) {
  if (vectorStoreDir) sharedCache.invalidate(vectorStoreDir);
}
async function getCatalog(vectorStoreDir, store, options, cache = sharedCache, onBuildStart) {
  const started = Date.now();
  if (cache.hasFailed(vectorStoreDir)) {
    return {
      catalog: null,
      built: false,
      ms: 0,
      error: "catalog build failed earlier this session",
      reportFailure: false
    };
  }
  try {
    const { totalChunks } = await store.getStats();
    if (totalChunks === 0) {
      return { catalog: null, built: false, ms: Date.now() - started, reportFailure: false };
    }
    const cached = cache.get(vectorStoreDir);
    if (cached && !cached.isStaleFor(totalChunks)) {
      return { catalog: cached, built: false, ms: Date.now() - started, reportFailure: false };
    }
    const loaded = await ChunkCatalog.load(vectorStoreDir, options);
    if (loaded && !loaded.isStaleFor(totalChunks)) {
      cache.set(vectorStoreDir, loaded);
      return { catalog: loaded, built: false, ms: Date.now() - started, reportFailure: false };
    }
    onBuildStart?.();
    const built = ChunkCatalog.build(await store.listChunks(), options);
    await built.save(vectorStoreDir);
    cache.set(vectorStoreDir, built);
    return { catalog: built, built: true, ms: Date.now() - started, reportFailure: false };
  } catch (error) {
    cache.markFailed(vectorStoreDir);
    const reportFailure = !cache.hasReported("failure", vectorStoreDir);
    if (reportFailure) cache.markReported("failure", vectorStoreDir);
    return {
      catalog: null,
      built: false,
      ms: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
      reportFailure
    };
  }
}
var CatalogCache, sharedCache;
var init_catalogManager = __esm({
  "src/retrieval/catalogManager.ts"() {
    "use strict";
    init_chunkCatalog();
    CatalogCache = class {
      constructor() {
        this.catalogs = /* @__PURE__ */ new Map();
        this.failures = /* @__PURE__ */ new Set();
        this.reported = /* @__PURE__ */ new Map();
      }
      get(dir) {
        return this.catalogs.get(dir);
      }
      set(dir, catalog) {
        this.catalogs.set(dir, catalog);
      }
      hasFailed(dir) {
        return this.failures.has(dir);
      }
      markFailed(dir) {
        this.failures.add(dir);
      }
      hasReported(kind, vectorStoreDir) {
        return this.reported.get(vectorStoreDir)?.has(kind) ?? false;
      }
      markReported(kind, vectorStoreDir) {
        const kinds = this.reported.get(vectorStoreDir) ?? /* @__PURE__ */ new Set();
        kinds.add(kind);
        this.reported.set(vectorStoreDir, kinds);
      }
      /** Called after an indexing run so the next query refreshes the catalog and can re-report once. */
      invalidate(dir) {
        this.catalogs.delete(dir);
        this.failures.delete(dir);
        this.reported.delete(dir);
      }
    };
    sharedCache = new CatalogCache();
  }
});

// src/utils/fitToContext.ts
async function fitToContext(total, budget, measure, atLeast = 0) {
  for (let used2 = total; used2 > atLeast; used2--) {
    const tokens = await measure(used2);
    if (tokens <= budget) return { used: used2, tokens };
  }
  const used = Math.min(atLeast, total);
  return { used, tokens: await measure(used) };
}
var init_fitToContext = __esm({
  "src/utils/fitToContext.ts"() {
    "use strict";
  }
});

// src/utils/relevanceCut.ts
function dropWeakPassages(passages, keepWithin) {
  if (passages.length === 0 || keepWithin <= 0) return passages;
  const relevanceOf = (passage) => passage.similarity ?? passage.score;
  const best = Math.max(...passages.map(relevanceOf));
  if (!(best > 0)) return passages;
  const floor = best * keepWithin;
  return passages.filter((passage, index) => index === 0 || relevanceOf(passage) >= floor);
}
function passagesForPrompt(ranked, count) {
  return ranked.slice(0, count).reverse();
}
var init_relevanceCut = __esm({
  "src/utils/relevanceCut.ts"() {
    "use strict";
  }
});

// src/retrieval/hypothetical.ts
function buildHypotheticalPrompt(question) {
  return "Write a short passage, two or three sentences, that would plausibly appear in a document containing the answer to the question below. Write it as the document itself would be written, using the terms, labels and figures such a passage would contain. Do not address the reader, do not explain, and do not say whether you know the answer. Invented specifics are fine.\n\nQuestion: " + question + "\n\nPassage:";
}
async function hypotheticalFor(question, deps) {
  if (question.trim().length === 0) return null;
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), deps.timeoutMs);
  const onAbort = () => timeout.abort();
  deps.abortSignal?.addEventListener("abort", onAbort, { once: true });
  try {
    const generated = await Promise.race([
      deps.generate(buildHypotheticalPrompt(question), timeout.signal),
      new Promise((resolve4) => {
        timeout.signal.addEventListener("abort", () => resolve4(null), { once: true });
      })
    ]);
    if (typeof generated !== "string") return null;
    const trimmed = generated.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch (error) {
    console.warn("[BigRAG] Could not draft a hypothetical answer; searching on the question alone:", error);
    return null;
  } finally {
    clearTimeout(timer);
    deps.abortSignal?.removeEventListener("abort", onAbort);
  }
}
var init_hypothetical = __esm({
  "src/retrieval/hypothetical.ts"() {
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
function describeMatch(position, lanes, score) {
  if (!lanes || lanes.length === 0) {
    return `score: ${score.toFixed(3)}`;
  }
  return `match #${position} via ${lanes.map((lane) => LANE_LABELS[lane] ?? lane).join(", ")}`;
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
async function fitPassagesToContext(ctl, passageCount, buildPrompt, contextShare) {
  try {
    const tokenSource = await ctl.tokenSource();
    if (!tokenSource || !("countTokens" in tokenSource) || typeof tokenSource.countTokens !== "function" || !("getContextLength" in tokenSource) || typeof tokenSource.getContextLength !== "function") {
      console.warn("[BigRAG] Token source does not expose prompt utilities; skipping context check.");
      return null;
    }
    const contextLength = await tokenSource.getContextLength();
    const measure = (passageCount2) => tokenSource.countTokens(buildPrompt(passageCount2));
    const budget = Math.max(0, Math.floor(contextLength * contextShare));
    const fit = await fitToContext(passageCount, budget, measure, passageCount > 0 ? 1 : 0);
    return { ...fit, contextLength, budget };
  } catch (error) {
    console.warn("[BigRAG] Failed to evaluate context usage:", error);
    return null;
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
    reindexMode,
    retrievalDepth
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
    let catalog = null;
    if (retrievalDepth === "medium" || retrievalDepth === "high") {
      let catalogStatus = null;
      const outcome = await getCatalog(
        vectorStoreDir,
        store,
        { version: settings.catalogVersion },
        void 0,
        () => {
          catalogStatus = ctl.createStatus({
            status: "loading",
            text: `Preparing search index\u2026 (${retrievalStats.totalChunks.toLocaleString()} chunks)`
          });
        }
      );
      catalog = outcome.catalog;
      if (outcome.error) {
        if (outcome.reportFailure) {
          const status = catalogStatus ?? ctl.createStatus({ status: "loading", text: "Preparing search index\u2026" });
          status.setState({
            status: "error",
            text: `Search index unavailable: ${outcome.error}. Using meaning-based search for now.`
          });
          console.warn("[BigRAG] Catalog unavailable:", outcome.error);
        }
      } else if (outcome.built) {
        const status = catalogStatus ?? ctl.createStatus({ status: "loading", text: "Preparing search index\u2026" });
        status.setState({
          status: "done",
          text: `Search index ready (${catalog?.chunkCount.toLocaleString()} chunks, ${(outcome.ms / 1e3).toFixed(1)}s)`
        });
        console.info(`[BigRAG] Catalog built: chunks=${catalog?.chunkCount} ms=${outcome.ms}`);
      }
    }
    retrievalStatus.setState({
      status: "loading",
      text: retrievalDepth === "high" ? "Drafting a likely answer, then searching by meaning and dates..." : retrievalDepth === "medium" ? "Searching by meaning and dates..." : "Searching for relevant content..."
    });
    const queryPreview = userPrompt.length > 160 ? `${userPrompt.slice(0, 160)}...` : userPrompt;
    console.info(
      `[BigRAG] Executing retrieval for "${queryPreview}" (limit=${retrievalLimit}, threshold=${retrievalThreshold}, compaction=${enableContextCompaction})`
    );
    const { passages: results, timings, laneCounts, passageLanes, dayRanges } = await retrieve(
      userPrompt,
      {
        vectorStore,
        embedQuery: async (text) => (await embeddingModel.embed(queryText(resolvedEmbeddingModelId, text))).embedding,
        embedSentences: (sentences) => embeddingModel.embed(sentences.map((sentence) => documentText(resolvedEmbeddingModelId, sentence))),
        countTokens: (text) => embeddingModel.countTokens(text),
        // Only reached at High. The draft is embedded and thrown away: its specifics are
        // invented, so it must never reach the prompt, a citation or a status line.
        hypothetical: async (question) => hypotheticalFor(question, {
          generate: async (prompt, abortSignal) => {
            const llm = await ctl.client.llm.model();
            return (await llm.respond(prompt, { signal: abortSignal })).content;
          },
          timeoutMs: settings.hypotheticalTimeoutMs,
          abortSignal: ctl.abortSignal
        }),
        catalog
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
          date: settings.laneWeightDate
        },
        abortSignal: ctl.abortSignal
      }
    );
    checkAbort(ctl.abortSignal);
    console.info(
      `[BigRAG] Retrieval timings: ${timings.map((t) => `${t.stage}=${t.ms.toFixed(0)}ms`).join(" ")}`
    );
    console.info(
      `[BigRAG] Lanes: meaning=${laneCounts.vector} likely-wording=${laneCounts.hyde} dates=${laneCounts.date}` + (dayRanges.length > 0 ? ` ranges=${dayRanges.map((r) => `${r.start}-${r.end}`).join(",")}` : " ranges=none")
    );
    if (results.length > 0) {
      const topHit = results[0];
      console.info(
        `[BigRAG] Vector search returned ${results.length} results. Top hit: file=${topHit.fileName} score=${topHit.score.toFixed(3)}`
      );
      const docSummaries = results.map(
        (result, idx) => `#${idx + 1} file=${path10.basename(result.filePath)} shard=${result.shardName} ${describeMatch(idx + 1, passageLanes[idx], result.score)}`
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
    const relevant = dropWeakPassages(results, settings.passageRelevanceCut);
    const relevantLanes = relevant.map((passage) => passageLanes[results.indexOf(passage)] ?? []);
    const keptCounts = { vector: 0, hyde: 0, keyword: 0, date: 0 };
    for (const lanes of relevantLanes) {
      if (lanes.includes("vector")) keptCounts.vector++;
      if (lanes.includes("hyde")) keptCounts.hyde++;
      if (lanes.includes("keyword")) keptCounts.keyword++;
      if (lanes.includes("date")) keptCounts.date++;
    }
    const dateSuffix = dayRanges.length > 0 ? `, dates: ${dayRanges.map((range) => range.start === range.end ? String(range.start) : `${range.start}-${range.end}`).join(", ")}` : "";
    const dropped = results.length - relevant.length;
    const kept = dropped > 0 ? `Kept ${relevant.length} of ${results.length} passages, the rest well below the best match` : `Retrieved ${relevant.length} relevant passages`;
    retrievalStatus.setState({
      status: "done",
      text: retrievalDepth === "high" ? `${kept} (meaning ${keptCounts.vector}, likely wording ${keptCounts.hyde}, dates ${keptCounts.date}${dateSuffix})` : retrievalDepth === "medium" ? `${kept} (meaning ${keptCounts.vector}, dates ${keptCounts.date}${dateSuffix})` : kept
    });
    ctl.debug("Retrieval results:", results);
    const prefix = `The passages below were retrieved for this question, and only this one: "${userPrompt}"

`;
    const promptTemplate = normalizePromptTemplate(settings.promptTemplate);
    const buildPrompt = (count, abbreviated = false) => {
      let ragContext = prefix;
      passagesForPrompt(relevant, count).forEach((result) => {
        const rank = relevant.indexOf(result);
        const fileName = path10.basename(result.filePath);
        const matchLabel = describeMatch(rank + 1, relevantLanes[rank], result.score);
        const citationLabel = `Citation ${rank + 1} (from ${fileName}, ${matchLabel}): `;
        const passage = renderPassageForPrompt(result);
        ragContext += `
${citationLabel}"${abbreviated ? summarizeText(passage) : passage}"

`;
      });
      return fillPromptTemplate(promptTemplate, {
        [RAG_CONTEXT_MACRO]: ragContext.trimEnd(),
        [USER_QUERY_MACRO]: userPrompt
      });
    };
    const fit = await fitPassagesToContext(ctl, relevant.length, buildPrompt, settings.ragContextShare);
    const sent = fit ? relevant.slice(0, fit.used) : relevant;
    if (dropped > 0) {
      console.info(
        `[BigRAG] Dropped ${dropped} of ${results.length} passages as far less relevant than the best match.`
      );
    }
    if (fit && fit.used < relevant.length) {
      const summary = `Sent ${fit.used} of ${relevant.length} passages \u2014 the rest would exceed the ${fit.budget.toLocaleString()} tokens retrieval may use of this model's ${fit.contextLength.toLocaleString()}. Raise the context length to send more.`;
      console.warn(`[BigRAG] ${summary}`);
      ctl.createStatus({ status: "done", text: summary });
    }
    const finalPrompt = buildPrompt(sent.length);
    const finalPromptPreview = buildPrompt(sent.length, true);
    ctl.debug("Prompt sent to model (full):", finalPrompt);
    const passagesLogEntries = sent.map((result, idx) => {
      const fileName = path10.basename(result.filePath);
      return `#${idx + 1} file=${fileName} shard=${result.shardName} score=${result.score.toFixed(3)}
${summarizeText(result.text)}`;
    });
    const passagesLog = passagesLogEntries.join("\n\n");
    console.info(`[BigRAG] RAG passages sent (${sent.length} of ${results.length}) preview:
${passagesLog}`);
    const tokensNote = fit ? `${fit.tokens.toLocaleString()} of ${fit.budget.toLocaleString()} tokens` : "size unknown";
    console.info(
      `[BigRAG] Prompt sent to model: ${tokensNote}, ${sent.length} passages from ${new Set(sent.map((r) => path10.basename(r.filePath))).size} files. Enable plugin debug logging to see it in full.`
    );
    console.info(`[BigRAG] Prompt preview (passages abbreviated, NOT what was sent):
${finalPromptPreview}`);
    const citationEntries = [];
    for (const result of sent) {
      try {
        const fileHash = typeof result.metadata.fileHash === "string" ? result.metadata.fileHash : "";
        const fileHandle = await getCitationFileHandle(ctl.client, result.filePath, fileHash);
        const matchLabel = describeMatch(citationEntries.length + 1, relevantLanes[citationEntries.length], result.score);
        citationEntries.push({ content: `${result.text} 

 [${matchLabel}]`, score: result.score, source: fileHandle });
      } catch (error) {
        console.warn(`[BigRAG] Could not prepare citation for ${result.filePath}:`, error);
      }
    }
    if (citationEntries.length > 0) {
      await ctl.addCitations({ entries: citationEntries });
    }
    return finalPrompt;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    console.error("[PromptPreprocessor] Preprocessing failed.", error);
    return userMessage;
  }
}
function reindexChangedStore(result) {
  return result.updatedFiles + result.newFiles > 0;
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
    if (reindexChangedStore(indexingResult)) {
      resetCatalogCache(settings.vectorStoreDirectory);
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
var path10, vectorStore, lastIndexedDir, sanityChecksPassed, lastSanityCheckedDirs, citationFileHandleCache, LANE_LABELS, RAG_CONTEXT_MACRO, USER_QUERY_MACRO, REINDEX_MODE_LABELS;
var init_promptPreprocessor = __esm({
  "src/promptPreprocessor.ts"() {
    "use strict";
    init_config();
    init_resolveSettings();
    init_vectorStore();
    init_sanityChecks();
    init_indexingLock();
    init_embeddingIndexManifest();
    init_embeddingPrefix();
    path10 = __toESM(require("path"));
    init_runIndexing();
    init_retrieve();
    init_renderPassage();
    init_catalogManager();
    init_fitToContext();
    init_relevanceCut();
    init_hypothetical();
    vectorStore = null;
    lastIndexedDir = "";
    sanityChecksPassed = false;
    lastSanityCheckedDirs = "";
    citationFileHandleCache = /* @__PURE__ */ new Map();
    LANE_LABELS = { vector: "meaning", hyde: "likely wording", keyword: "keywords", date: "dates" };
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
