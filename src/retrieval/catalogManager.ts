import { type IndexedChunk } from "../vectorstore/vectorStore";
import { ChunkCatalog, type CatalogOptions } from "./chunkCatalog";

export interface CatalogSource {
  listChunks(): Promise<IndexedChunk[]>;
  getStats(): Promise<{ totalChunks: number }>;
}

export interface CatalogOutcome {
  catalog: ChunkCatalog | null;
  /** True when this call built (rather than loaded or reused) the catalog. */
  built: boolean;
  ms: number;
  error?: string;
}

/** Per-session state: the loaded catalog per store directory, and whether building already failed. */
export class CatalogCache {
  private catalogs = new Map<string, ChunkCatalog>();
  private failures = new Set<string>();

  get(dir: string): ChunkCatalog | undefined {
    return this.catalogs.get(dir);
  }
  set(dir: string, catalog: ChunkCatalog): void {
    this.catalogs.set(dir, catalog);
  }
  hasFailed(dir: string): boolean {
    return this.failures.has(dir);
  }
  markFailed(dir: string): void {
    this.failures.add(dir);
  }
  /** Called after an indexing run so the next query refreshes the catalog. */
  invalidate(dir: string): void {
    this.catalogs.delete(dir);
    this.failures.delete(dir);
  }
}

const sharedCache = new CatalogCache();

/** Test seam and post-indexing hook for the module-level cache. */
export function resetCatalogCache(vectorStoreDir?: string): void {
  if (vectorStoreDir) sharedCache.invalidate(vectorStoreDir);
}

/**
 * Returns the catalog for a store, loading it from disk, reusing the session cache, or
 * building and saving it. Never throws: a failure is reported once per session and the
 * caller falls back to the vector lane.
 */
export async function getCatalog(
  vectorStoreDir: string,
  store: CatalogSource,
  options: CatalogOptions,
  cache: CatalogCache = sharedCache,
): Promise<CatalogOutcome> {
  const started = Date.now();
  if (cache.hasFailed(vectorStoreDir)) {
    return { catalog: null, built: false, ms: 0, error: "catalog build failed earlier this session" };
  }

  try {
    const { totalChunks } = await store.getStats();
    if (totalChunks === 0) return { catalog: null, built: false, ms: Date.now() - started };

    const cached = cache.get(vectorStoreDir);
    if (cached && !cached.isStaleFor(totalChunks)) {
      return { catalog: cached, built: false, ms: Date.now() - started };
    }

    const loaded = await ChunkCatalog.load(vectorStoreDir, options);
    if (loaded && !loaded.isStaleFor(totalChunks)) {
      cache.set(vectorStoreDir, loaded);
      return { catalog: loaded, built: false, ms: Date.now() - started };
    }

    const built = ChunkCatalog.build(await store.listChunks(), options);
    await built.save(vectorStoreDir);
    cache.set(vectorStoreDir, built);
    return { catalog: built, built: true, ms: Date.now() - started };
  } catch (error) {
    cache.markFailed(vectorStoreDir);
    return {
      catalog: null,
      built: false,
      ms: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
