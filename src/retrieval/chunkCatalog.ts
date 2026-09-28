import * as fs from "fs/promises";
import * as path from "path";
import { chunkKey, type IndexedChunk } from "../vectorstore/vectorStore";
import { type DayRange } from "./queryDates";

export const CATALOG_FILENAME = ".big-rag-catalog.json";

export interface CatalogOptions {
  version: number;
}

interface CatalogChunkRow {
  key: string;
  filePath: string;
  days: number[];
}

interface CatalogFile {
  version: number;
  chunkCount: number;
  chunks: CatalogChunkRow[];
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
 * A derived index of the vector store: one row per chunk plus a day lookup. Holds no chunk
 * text and nothing about words - dates are the only signal read from here - so it stays small
 * at any collection size and can be rebuilt from the store at any time.
 */
export class ChunkCatalog {
  private constructor(private readonly file: CatalogFile) {}

  static build(chunks: IndexedChunk[], options: CatalogOptions): ChunkCatalog {
    const rows: CatalogChunkRow[] = [];
    const days: Record<string, number[]> = {};

    chunks.forEach((chunk, chunkNumber) => {
      const chunkDays = daysOf(chunk.metadata ?? {});
      rows.push({ key: chunkKey(chunk), filePath: chunk.filePath, days: chunkDays });

      for (const day of chunkDays) {
        const key = String(day);
        (days[key] ??= []).push(chunkNumber);
      }
    });

    const file: CatalogFile = {
      version: options.version,
      chunkCount: chunks.length,
      chunks: rows,
      days,
    };
    return new ChunkCatalog(file);
  }

  static async load(vectorStoreDir: string, options: CatalogOptions): Promise<ChunkCatalog | null> {
    try {
      const raw = await fs.readFile(path.join(vectorStoreDir, CATALOG_FILENAME), "utf-8");
      const file = JSON.parse(raw) as CatalogFile;
      if (
        file?.version !== options.version ||
        !Array.isArray(file.chunks) ||
        typeof file.chunkCount !== "number" ||
        typeof file.days !== "object"
      ) {
        return null;
      }
      return new ChunkCatalog(file);
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
