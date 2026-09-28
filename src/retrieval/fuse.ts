export interface RankedLane {
  name: string;
  /** Scales this lane's whole curve; 1 is neutral. */
  weight: number;
  /** Chunk keys, best first. */
  keys: string[];
}

export interface FusedChunk {
  key: string;
  score: number;
  /** Lanes that ranked this chunk, in lane order. */
  lanes: string[];
}

/**
 * Weighted reciprocal rank fusion: each lane contributes weight / (rrfConstant + rank)
 * for the chunks it ranked, ranks being 1-based. A chunk missing from a lane simply
 * receives nothing from it, so no lane can exclude a chunk.
 *
 * A lane of weight 0 is skipped entirely rather than contributing 0. Adding its chunks at no
 * score still puts them in the ranking, where a later boost - a matching date, say - can lift
 * them into the results; a run meant to measure retrieval without that lane then measures it
 * with the lane half on. Attribution depends on a zeroed lane being genuinely absent.
 */
export function fuseLanes(lanes: RankedLane[], rrfConstant: number): FusedChunk[] {
  const fused = new Map<string, FusedChunk>();
  const firstSeen = new Map<string, number>();
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
    (a, b) => b.score - a.score || firstSeen.get(a.key)! - firstSeen.get(b.key)!,
  );
}
