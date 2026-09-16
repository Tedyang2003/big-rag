import * as fs from "fs/promises";
import * as path from "path";
import { chunkKey, type IndexedChunk } from "../vectorstore/vectorStore";
import { scoreTerms as scoreBm25, tokenize, type Bm25Corpus, type TermEntry } from "./bm25";
import { type DayRange } from "./queryDates";

export const CATALOG_FILENAME = ".big-rag-catalog.json";

export interface CatalogOptions {
  version: number;
  /** Above this many chunks the word table is skipped to bound memory. */
  maxChunks: number;
  k1: number;
  b: number;
}

interface CatalogChunkRow {
  key: string;
  filePath: string;
  wordCount: number;
  days: number[];
}

interface CatalogFile {
  version: number;
  chunkCount: number;
  wordTableSkipped: boolean;
  chunks: CatalogChunkRow[];
  words: Record<string, TermEntry>;
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
    private readonly averageWordCount: number,
  ) {}

  static build(chunks: IndexedChunk[], options: CatalogOptions): ChunkCatalog {
    const skipWords = chunks.length > options.maxChunks;
    const rows: CatalogChunkRow[] = [];
    const words: Record<string, TermEntry> = {};
    const days: Record<string, number[]> = {};

    chunks.forEach((chunk, chunkNumber) => {
      const terms = skipWords ? [] : tokenize(chunk.text);
      const chunkDays = daysOf(chunk.metadata ?? {});
      rows.push({
        key: chunkKey(chunk),
        filePath: chunk.filePath,
        wordCount: terms.length > 0 ? terms.length : chunk.text.split(/\s+/).filter(Boolean).length,
        days: chunkDays,
      });

      const frequencies = new Map<string, number>();
      for (const term of terms) frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
      for (const [term, frequency] of frequencies) {
        const entry = words[term] ?? { df: 0, postings: [] };
        entry.df += 1;
        entry.postings.push([chunkNumber, frequency]);
        words[term] = entry;
      }

      for (const day of chunkDays) {
        const key = String(day);
        (days[key] ??= []).push(chunkNumber);
      }
    });

    const file: CatalogFile = {
      version: options.version,
      chunkCount: chunks.length,
      wordTableSkipped: skipWords,
      chunks: rows,
      words,
      days,
    };
    return new ChunkCatalog(file, options, averageOf(rows));
  }

  static async load(vectorStoreDir: string, options: CatalogOptions): Promise<ChunkCatalog | null> {
    try {
      const raw = await fs.readFile(path.join(vectorStoreDir, CATALOG_FILENAME), "utf-8");
      const file = JSON.parse(raw) as CatalogFile;
      if (
        file?.version !== options.version ||
        !Array.isArray(file.chunks) ||
        typeof file.chunkCount !== "number" ||
        typeof file.words !== "object" ||
        typeof file.days !== "object"
      ) {
        return null;
      }
      return new ChunkCatalog(file, options, averageOf(file.chunks));
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

  get hasWordTable(): boolean {
    return !this.file.wordTableSkipped;
  }

  get termCount(): number {
    return Object.keys(this.file.words).length;
  }

  isStaleFor(storeChunkCount: number): boolean {
    return storeChunkCount !== this.file.chunkCount;
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

  scoreTerms(terms: string[]): Map<number, number> {
    if (this.file.wordTableSkipped || terms.length === 0) return new Map();
    const corpus: Bm25Corpus = {
      totalChunks: this.file.chunkCount,
      averageWordCount: this.averageWordCount,
      wordCountOf: (chunkNumber) => this.file.chunks[chunkNumber]?.wordCount ?? 0,
      entryFor: (term) => this.file.words[term],
    };
    return scoreBm25(terms, corpus, { k1: this.options.k1, b: this.options.b });
  }

  /** Chunk numbers whose posted or section dates fall inside any range, in catalog order. */
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

function averageOf(rows: CatalogChunkRow[]): number {
  if (rows.length === 0) return 0;
  return rows.reduce((sum, row) => sum + row.wordCount, 0) / rows.length;
}
