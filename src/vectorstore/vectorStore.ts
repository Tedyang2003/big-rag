import * as fs from "fs/promises";
import * as path from "path";
import { LocalIndex } from "vectra";

const DEFAULT_MAX_ITEMS_PER_SHARD = 10000;
const SHARD_DIR_PREFIX = "shard_";
const SHARD_DIR_REGEX = /^shard_(\d+)$/;

export interface DocumentChunk {
  id: string;
  text: string;
  vector: number[];
  filePath: string;
  fileName: string;
  fileHash: string;
  chunkIndex: number;
  metadata: Record<string, any>;
}

export interface SearchResult {
  id: string;
  text: string;
  score: number;
  filePath: string;
  fileName: string;
  chunkIndex: number;
  shardName: string;
  metadata: Record<string, any>;
}

export interface IndexedChunk {
  id: string;
  shardName: string;
  text: string;
  filePath: string;
  fileName: string;
  chunkIndex: number;
  metadata: Record<string, any>;
}

/** Stable identifier for a chunk across shards, used by the retrieval catalog. */
export function chunkKey(parts: { shardName: string; id: string }): string {
  return `${parts.shardName}/${parts.id}`;
}

function parseChunkKey(key: string): { shardName: string; id: string } | null {
  const separator = key.indexOf("/");
  if (separator <= 0 || separator === key.length - 1) return null;
  return { shardName: key.slice(0, separator), id: key.slice(separator + 1) };
}

type ChunkMetadata = {
  text: string;
  filePath: string;
  fileName: string;
  fileHash: string;
  chunkIndex: number;
  [key: string]: any;
};

export class VectorStore {
  private dbPath: string;
  private shardDirs: string[] = [];
  private activeShard: LocalIndex | null = null;
  private activeShardCount: number = 0;
  /**
   * Shard instances that have been mutated or scanned for deletion. vectra caches a shard's
   * parsed index.json inside its LocalIndex, so every write to a shard directory must go
   * through one shared instance - otherwise a stale cached copy can write deleted items back.
   */
  private shardCache = new Map<string, LocalIndex>();
  private updateMutex: Promise<void> = Promise.resolve();
  private readonly maxItemsPerShard: number;

  /**
   * @param maxItemsPerShard Test seam only: overrides the shard rotation threshold so tests
   * can force multiple shards without inserting thousands of chunks. Production callers should
   * omit this and get the real default.
   */
  constructor(dbPath: string, maxItemsPerShard: number = DEFAULT_MAX_ITEMS_PER_SHARD) {
    this.dbPath = path.resolve(dbPath);
    this.maxItemsPerShard = maxItemsPerShard;
  }

  /** Number of shards currently held in the write-through cache. Exposed for tests. */
  get cachedShardCount(): number {
    return this.shardCache.size;
  }

  /**
   * Open a shard by directory name (e.g. "shard_000") for reading. Reuses the shared cached
   * instance when one exists; otherwise returns a fresh instance the caller must not hold,
   * so GC can free the parsed index data.
   */
  private openShard(dir: string): LocalIndex {
    return this.shardCache.get(dir) ?? new LocalIndex(path.join(this.dbPath, dir));
  }

  /**
   * Get (creating if needed) the shared cached instance for a shard directory. Use this for
   * every mutation so all writes to a directory see the same in-memory data.
   */
  private cachedShard(dir: string): LocalIndex {
    let shard = this.shardCache.get(dir);
    if (!shard) {
      shard = new LocalIndex(path.join(this.dbPath, dir));
      this.shardCache.set(dir, shard);
    }
    return shard;
  }

  /**
   * Scan dbPath for shard_NNN directories and return sorted list.
   */
  private async discoverShardDirs(): Promise<string[]> {
    const entries = await fs.readdir(this.dbPath, { withFileTypes: true });
    const dirs: string[] = [];
    for (const e of entries) {
      if (e.isDirectory() && SHARD_DIR_REGEX.test(e.name)) {
        dirs.push(e.name);
      }
    }
    dirs.sort((a, b) => {
      const n = (m: string) => parseInt(m.match(SHARD_DIR_REGEX)![1], 10);
      return n(a) - n(b);
    });
    return dirs;
  }

  /**
   * Initialize the vector store: discover or create shards, open the last as active.
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.dbPath, { recursive: true });
    this.shardCache.clear();
    this.shardDirs = await this.discoverShardDirs();

    if (this.shardDirs.length === 0) {
      const firstDir = `${SHARD_DIR_PREFIX}000`;
      const fullPath = path.join(this.dbPath, firstDir);
      const index = new LocalIndex(fullPath);
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
  async addChunks(chunks: DocumentChunk[]): Promise<void> {
    if (!this.activeShard) {
      throw new Error("Vector store not initialized");
    }
    if (chunks.length === 0) return;

    this.updateMutex = this.updateMutex.then(async () => {
      await this.activeShard!.beginUpdate();
      try {
        for (const chunk of chunks) {
          const metadata: ChunkMetadata = {
            text: chunk.text,
            filePath: chunk.filePath,
            fileName: chunk.fileName,
            fileHash: chunk.fileHash,
            chunkIndex: chunk.chunkIndex,
            ...chunk.metadata,
          };
          await this.activeShard!.upsertItem({
            id: chunk.id,
            vector: chunk.vector,
            metadata,
          });
        }
        await this.activeShard!.endUpdate();
      } catch (e) {
        this.activeShard!.cancelUpdate();
        throw e;
      }
      this.activeShardCount += chunks.length;
      console.log(`Added ${chunks.length} chunks to vector store`);

      if (this.activeShardCount >= this.maxItemsPerShard) {
        const nextNum = this.shardDirs.length;
        const nextDir = `${SHARD_DIR_PREFIX}${String(nextNum).padStart(3, "0")}`;
        const fullPath = path.join(this.dbPath, nextDir);
        const newIndex = new LocalIndex(fullPath);
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
  async search(
    queryVector: number[],
    limit: number = 5,
    threshold: number = 0.5,
  ): Promise<SearchResult[]> {
    const merged: SearchResult[] = [];
    for (const dir of this.shardDirs) {
      const shard = this.openShard(dir);
      const results = await shard.queryItems(
        queryVector,
        "",
        limit,
        undefined,
        false,
      );
      for (const r of results) {
        const m = r.item.metadata as ChunkMetadata;
        merged.push({
          id: r.item.id,
          text: m?.text ?? "",
          score: r.score,
          filePath: m?.filePath ?? "",
          fileName: m?.fileName ?? "",
          chunkIndex: m?.chunkIndex ?? 0,
          shardName: dir,
          metadata: (r.item.metadata as Record<string, any>) ?? {},
        });
      }
    }
    return merged
      .filter((r) => r.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Delete all chunks for a file (by hash) across all shards.
   */
  async deleteByFileHash(fileHash: string): Promise<void> {
    this.updateMutex = this.updateMutex.then(async () => {
      const lastDir = this.shardDirs[this.shardDirs.length - 1];
      for (const dir of this.shardDirs) {
        // Shared instance: the active shard's cache must see this deletion, and later
        // deletions reuse the parsed data instead of re-reading every shard from disk.
        const shard = this.cachedShard(dir);
        const items = await shard.listItems();
        const toDelete = items.filter(
          (i) => (i.metadata as ChunkMetadata)?.fileHash === fileHash,
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
  async getFileHashInventory(): Promise<Map<string, Set<string>>> {
    const inventory = new Map<string, Set<string>>();
    for (const dir of this.shardDirs) {
      const shard = this.openShard(dir);
      const items = await shard.listItems();
      for (const item of items) {
        const m = item.metadata as ChunkMetadata;
        const filePath = m?.filePath;
        const fileHash = m?.fileHash;
        if (!filePath || !fileHash) continue;
        let set = inventory.get(filePath);
        if (!set) {
          set = new Set<string>();
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
  async listChunks(): Promise<IndexedChunk[]> {
    const chunks: IndexedChunk[] = [];
    for (const dir of this.shardDirs) {
      const shard = this.openShard(dir);
      const items = await shard.listItems();
      for (const item of items) {
        const m = item.metadata as ChunkMetadata;
        if (!m?.filePath || typeof m.text !== "string") continue;
        chunks.push({
          id: item.id,
          shardName: dir,
          text: m.text,
          filePath: m.filePath,
          fileName: m.fileName,
          chunkIndex: m.chunkIndex,
          metadata: m,
        });
      }
    }
    return chunks;
  }

  /**
   * Fetch chunks by `chunkKey`, in the order given. Keys that no longer exist are skipped.
   * Scores are 0: the caller supplies its own ranking.
   */
  async getChunksByKeys(keys: string[]): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    for (const key of keys) {
      const parsed = parseChunkKey(key);
      if (!parsed || !this.shardDirs.includes(parsed.shardName)) continue;
      const shard = this.openShard(parsed.shardName);
      const item = await shard.getItem(parsed.id);
      const m = item?.metadata as ChunkMetadata | undefined;
      if (!item || !m || typeof m.text !== "string") continue;
      results.push({
        id: item.id,
        text: m.text,
        score: 0,
        filePath: m.filePath ?? "",
        fileName: m.fileName ?? "",
        chunkIndex: m.chunkIndex ?? 0,
        shardName: parsed.shardName,
        metadata: m as Record<string, any>,
      });
    }
    return results;
  }

  /**
   * Get total chunk count and unique file count.
   */
  async getStats(): Promise<{
    totalChunks: number;
    uniqueFiles: number;
  }> {
    let totalChunks = 0;
    const uniqueHashes = new Set<string>();
    for (const dir of this.shardDirs) {
      const shard = this.openShard(dir);
      const items = await shard.listItems();
      totalChunks += items.length;
      for (const item of items) {
        const h = (item.metadata as ChunkMetadata)?.fileHash;
        if (h) uniqueHashes.add(h);
      }
    }
    return { totalChunks, uniqueFiles: uniqueHashes.size };
  }

  /**
   * Check if any chunk exists for the given file hash (short-circuits on first match).
   */
  async hasFile(fileHash: string): Promise<boolean> {
    for (const dir of this.shardDirs) {
      const shard = this.openShard(dir);
      const items = await shard.listItems();
      if (items.some((i) => (i.metadata as ChunkMetadata)?.fileHash === fileHash)) {
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
  async releaseShardCache(): Promise<void> {
    this.updateMutex = this.updateMutex.then(() => {
      let activeDir: string | undefined;
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
  async close(): Promise<void> {
    this.activeShard = null;
    this.shardCache.clear();
  }
}
