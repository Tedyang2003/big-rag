import * as fs from "fs/promises";
import * as path from "path";
import { chunkKey, type IndexedChunk } from "../vectorstore/vectorStore";
import { rankTexts, tokenize, type Bm25Candidate, type Bm25Stats } from "./bm25";
import { type DayRange } from "./queryDates";

export const CATALOG_FILENAME = ".big-rag-catalog.json";

export interface CatalogOptions {
  version: number;
  k1: number;
  b: number;
}

interface CatalogChunkRow {
  key: string;
  filePath: string;
  days: number[];
}

interface CatalogFile {
  version: number;
  chunkCount: number;
  /** Mean scoring-term count per chunk, for BM25 length normalisation. */
  averageWordCount: number;
  chunks: CatalogChunkRow[];
  /** Term -> how many chunks contain it. Only the count: BM25 reranks passages another
   * lane already found, so it reads their term frequencies from their own text and never
   * needs posting lists, which at scale were the whole memory cost of this file. */
  df: Record<string, number>;
  days: Record<string, number[]>;
}

function isoToDayNumber(iso: string): number {
  return Number(iso.replace(/-/g, ""));
}

/** Day numbers for a chunk: its posted date plus every section date, deduped and sorted. */
function daysOf(metadata: Record<string, any>): number[] {
  const days = new Set<number>();
  const add = (raw: unknown) => {
    if (typeof raw !== "string" || raw.length === 0) return;
    try {
      const parsed = JSON.parse(raw);
      for (const range of Array.isArray(parsed) ? parsed : [parsed]) {
        if (range && typeof range.start === "string") days.add(isoToDayNumber(range.start));
        if (range && typeof range.end === "string") days.add(isoToDayNumber(range.end));
      }
    } catch {
      // Metadata written by an older version; treat as undated.
    }
  };
  add(metadata?.postedDate);
  add(metadata?.dates);
  return [...days].sort((a, b) => a - b);
}

/**
 * A derived index of the vector store: one row per chunk plus word and day lookups.
 * Holds no chunk text and can be rebuilt from the store at any time.
 */
export class ChunkCatalog {
  private constructor(
    private readonly file: CatalogFile,
    private readonly options: CatalogOptions,
  ) {}

  static build(chunks: IndexedChunk[], options: CatalogOptions): ChunkCatalog {
    const rows: CatalogChunkRow[] = [];
    const df: Record<string, number> = {};
    const days: Record<string, number[]> = {};
    let totalWords = 0;

    chunks.forEach((chunk, chunkNumber) => {
      const terms = tokenize(chunk.text);
      const chunkDays = daysOf(chunk.metadata ?? {});
      rows.push({ key: chunkKey(chunk), filePath: chunk.filePath, days: chunkDays });
      totalWords += terms.length;

      for (const term of new Set(terms)) df[term] = (df[term] ?? 0) + 1;

      for (const day of chunkDays) {
        const key = String(day);
        (days[key] ??= []).push(chunkNumber);
      }
    });

    const file: CatalogFile = {
      version: options.version,
      chunkCount: chunks.length,
      averageWordCount: chunks.length > 0 ? totalWords / chunks.length : 0,
      chunks: rows,
      df,
      days,
    };
    return new ChunkCatalog(file, options);
  }

  static async load(vectorStoreDir: string, options: CatalogOptions): Promise<ChunkCatalog | null> {
    try {
      const raw = await fs.readFile(path.join(vectorStoreDir, CATALOG_FILENAME), "utf-8");
      const file = JSON.parse(raw) as CatalogFile;
      if (
        file?.version !== options.version ||
        !Array.isArray(file.chunks) ||
        typeof file.chunkCount !== "number" ||
        typeof file.averageWordCount !== "number" ||
        typeof file.df !== "object" ||
        typeof file.days !== "object"
      ) {
        return null;
      }
      return new ChunkCatalog(file, options);
    } catch {
      return null;
    }
  }

  async save(vectorStoreDir: string): Promise<void> {
    await fs.writeFile(path.join(vectorStoreDir, CATALOG_FILENAME), JSON.stringify(this.file), "utf-8");
  }

  get chunkCount(): number {
    return this.file.chunkCount;
  }

  get termCount(): number {
    return Object.keys(this.file.df).length;
  }

  isStaleFor(storeChunkCount: number): boolean {
    return storeChunkCount !== this.file.chunkCount;
  }

  /** The file a chunk came from, used to stop one document filling a lane. */
  fileOf(chunkNumber: number): string {
    return this.file.chunks[chunkNumber]?.filePath ?? "";
  }

  keyOf(chunkNumber: number): string {
    return this.file.chunks[chunkNumber]?.key ?? "";
  }

  /** Most recent day recorded for a chunk, or 0 when it has none. */
  latestDayOf(chunkNumber: number): number {
    const days = this.file.chunks[chunkNumber]?.days ?? [];
    return days.length > 0 ? days[days.length - 1] : 0;
  }

  /** Years present in the index, most recent first. */
  yearsPresent(): number[] {
    const years = new Set<number>();
    for (const key of Object.keys(this.file.days)) years.add(Math.floor(Number(key) / 10000));
    return [...years].sort((a, b) => b - a);
  }

  /** Reorders passages another lane found, best first; see `rankTexts`. */
  rankByTerms(terms: string[], candidates: Bm25Candidate[]): string[] {
    const stats: Bm25Stats = {
      totalChunks: this.file.chunkCount,
      averageWordCount: this.file.averageWordCount,
      documentFrequency: (term) => this.file.df[term] ?? 0,
    };
    return rankTexts(terms, candidates, stats, { k1: this.options.k1, b: this.options.b });
  }

  /** Chunk numbers whose posted or section dates fall inside any range, sorted ascending. */
  chunksForRanges(ranges: DayRange[]): number[] {
    if (ranges.length === 0) return [];
    const matched = new Set<number>();
    for (const [dayKey, chunkNumbers] of Object.entries(this.file.days)) {
      const day = Number(dayKey);
      if (ranges.some((range) => day >= range.start && day <= range.end)) {
        for (const chunkNumber of chunkNumbers) matched.add(chunkNumber);
      }
    }
    return [...matched].sort((a, b) => a - b);
  }
}
