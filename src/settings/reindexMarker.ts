import * as fs from "fs/promises";
import * as path from "path";
import { type ReindexMode } from "./resolveSettings";

export const REINDEX_MARKER_FILENAME = ".big-rag-reindex.json";

/** Records that a reindex request completed, so it is not repeated on every message. */
export interface ReindexMarker {
  mode: "changed" | "rebuild";
  completedAt: string;
}

export type ReindexDecision = "run" | "skip" | "clear" | "none";

function markerPath(vectorStoreDir: string): string {
  return path.join(vectorStoreDir, REINDEX_MARKER_FILENAME);
}

export function decideReindex(mode: ReindexMode, marker: ReindexMarker | null): ReindexDecision {
  if (mode === "off") return marker ? "clear" : "none";
  if (marker) return "skip";
  return "run";
}

export async function readReindexMarker(vectorStoreDir: string): Promise<ReindexMarker | null> {
  try {
    const data = JSON.parse(await fs.readFile(markerPath(vectorStoreDir), "utf-8"));
    if ((data?.mode === "changed" || data?.mode === "rebuild") && typeof data.completedAt === "string") {
      return { mode: data.mode, completedAt: data.completedAt };
    }
    return null;
  } catch {
    return null;
  }
}

export async function writeReindexMarker(vectorStoreDir: string, marker: ReindexMarker): Promise<void> {
  await fs.writeFile(markerPath(vectorStoreDir), JSON.stringify(marker, null, 2), "utf-8");
}

export async function clearReindexMarker(vectorStoreDir: string): Promise<void> {
  try {
    await fs.rm(markerPath(vectorStoreDir), { force: true });
  } catch (error) {
    console.warn("[BigRAG] Could not clear reindex marker:", error);
  }
}

/**
 * Applies the reindex decision: runs `run` when a new request is pending and
 * records completion only when `run` resolves true.
 */
export async function handleReindexRequest(opts: {
  vectorStoreDir: string;
  mode: ReindexMode;
  run: () => Promise<boolean>;
  now?: () => Date;
}): Promise<{ decision: ReindexDecision; marker: ReindexMarker | null }> {
  const existing = await readReindexMarker(opts.vectorStoreDir);
  const decision = decideReindex(opts.mode, existing);

  if (decision === "clear") {
    await clearReindexMarker(opts.vectorStoreDir);
    return { decision, marker: null };
  }
  if (decision !== "run" || opts.mode === "off") {
    return { decision, marker: existing };
  }

  const completed = await opts.run();
  if (!completed) {
    return { decision, marker: existing };
  }

  const marker: ReindexMarker = { mode: opts.mode, completedAt: (opts.now?.() ?? new Date()).toISOString() };
  try {
    await writeReindexMarker(opts.vectorStoreDir, marker);
  } catch (error) {
    console.warn("[BigRAG] Could not write reindex marker; the next message may reindex again:", error);
  }
  return { decision, marker };
}

export function reindexAlreadyDoneMessage(marker: ReindexMarker): string {
  return `Reindex already done at ${new Date(marker.completedAt).toLocaleString()} — set Reindex to Off, then choose it again to run another.`;
}
