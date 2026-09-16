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
  /** True only the first time a failure is returned for this store directory this session. */
  reportFailure: boolean;
  /** True only the first time an outcome's catalog lacks a word table, for this store directory this session. */
  reportCeiling: boolean;
}

type ReportKind = "failure" | "ceiling";

/** Per-session state: the loaded catalog per store directory, whether building already failed,
 * and which one-off notices (failure, ceiling) have already been reported for that directory. */
export class CatalogCache {
  private catalogs = new Map<string, ChunkCatalog>();
  private failures = new Set<string>();
  private reported = new Map<string, Set<ReportKind>>();

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
  hasReported(kind: ReportKind, vectorStoreDir: string): boolean {
    return this.reported.get(vectorStoreDir)?.has(kind) ?? false;
  }
  markReported(kind: ReportKind, vectorStoreDir: string): void {
    const kinds = this.reported.get(vectorStoreDir) ?? new Set<ReportKind>();
    kinds.add(kind);
    this.reported.set(vectorStoreDir, kinds);
  }
  /** Called after an indexing run so the next query refreshes the catalog and can re-report once. */
  invalidate(dir: string): void {
    this.catalogs.delete(dir);
    this.failures.delete(dir);
    this.reported.delete(dir);
  }
}

const sharedCache = new CatalogCache();

/** Test seam and post-indexing hook for the module-level cache. */
export function resetCatalogCache(vectorStoreDir?: string): void {
  if (vectorStoreDir) sharedCache.invalidate(vectorStoreDir);
}

/** True (once) the first time this session's cache sees a word-table-less catalog for this directory. */
function ceilingReport(cache: CatalogCache, vectorStoreDir: string, catalog: ChunkCatalog | null): boolean {
  if (!catalog || catalog.hasWordTable) return false;
  if (cache.hasReported("ceiling", vectorStoreDir)) return false;
  cache.markReported("ceiling", vectorStoreDir);
  return true;
}

/**
 * Returns the catalog for a store, loading it from disk, reusing the session cache, or
 * building and saving it. Never throws: a failure is reported once per session and the
 * caller falls back to the vector lane.
 *
 * `onBuildStart`, when given, is called synchronously right before a build actually runs
 * (never on a cache hit or a successful disk load), so a caller can show a one-off "building…"
 * status without also having to inspect `built` after the fact.
 */
export async function getCatalog(
  vectorStoreDir: string,
  store: CatalogSource,
  options: CatalogOptions,
  cache: CatalogCache = sharedCache,
  onBuildStart?: () => void,
): Promise<CatalogOutcome> {
  const started = Date.now();
  if (cache.hasFailed(vectorStoreDir)) {
    return {
      catalog: null,
      built: false,
      ms: 0,
      error: "catalog build failed earlier this session",
      reportFailure: false,
      reportCeiling: false,
    };
  }

  try {
    const { totalChunks } = await store.getStats();
    if (totalChunks === 0) {
      return { catalog: null, built: false, ms: Date.now() - started, reportFailure: false, reportCeiling: false };
    }

    const cached = cache.get(vectorStoreDir);
    if (cached && !cached.isStaleFor(totalChunks)) {
      return {
        catalog: cached,
        built: false,
        ms: Date.now() - started,
        reportFailure: false,
        reportCeiling: ceilingReport(cache, vectorStoreDir, cached),
      };
    }

    const loaded = await ChunkCatalog.load(vectorStoreDir, options);
    if (loaded && !loaded.isStaleFor(totalChunks)) {
      cache.set(vectorStoreDir, loaded);
      return {
        catalog: loaded,
        built: false,
        ms: Date.now() - started,
        reportFailure: false,
        reportCeiling: ceilingReport(cache, vectorStoreDir, loaded),
      };
    }

    onBuildStart?.();
    const built = ChunkCatalog.build(await store.listChunks(), options);
    await built.save(vectorStoreDir);
    cache.set(vectorStoreDir, built);
    return {
      catalog: built,
      built: true,
      ms: Date.now() - started,
      reportFailure: false,
      reportCeiling: ceilingReport(cache, vectorStoreDir, built),
    };
  } catch (error) {
    cache.markFailed(vectorStoreDir);
    const reportFailure = !cache.hasReported("failure", vectorStoreDir);
    if (reportFailure) cache.markReported("failure", vectorStoreDir);
    return {
      catalog: null,
      built: false,
      ms: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
      reportFailure,
      reportCeiling: false,
    };
  }
}
