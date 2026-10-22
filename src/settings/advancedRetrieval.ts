import { FIXED_DEFAULTS } from "./defaults";

/**
 * The retrieval settings offered in the chat's settings panel, behind one toggle.
 *
 * These were moved out of the sidebar in 1.4 because most of them are set once and forgotten.
 * They are back because the evaluation harness reads them from environment variables, so there
 * was no way to try a value against a real conversation without editing the source.
 *
 * One table drives both the settings panel and `resolveSettings`, so the two cannot drift: a key
 * renamed in one place would not compile in the other. Declared separately, a renamed field
 * would silently fall back to its default with nothing failing, which is how High depth was
 * broken for a fortnight.
 *
 * Only settings that take effect on the next question are here. `chunkSize`, `chunkOverlap`,
 * `structuredIndexing` and `enableOCR` decide the shape of the stored index, so changing one
 * makes existing vectors incomparable and forces a full rebuild; `catalogVersion` is a data
 * format version. None of those belongs in a panel a user can nudge.
 */
export interface AdvancedRetrievalField {
  /** Also the config key, and the key in FIXED_DEFAULTS. */
  key: AdvancedRetrievalKey;
  displayName: string;
  subtitle: string;
  min: number;
  max: number;
  step: number;
  int?: boolean;
  warning?: string;
}

export type AdvancedRetrievalKey =
  | "retrievalLimit"
  | "retrievalThreshold"
  | "passageRelevanceCut"
  | "ragContextShare"
  | "laneCandidates"
  | "neighbourChunks"
  | "rerankDepth"
  | "rrfConstant"
  | "bm25K1"
  | "bm25B"
  | "laneWeightVector"
  | "laneWeightHyde"
  | "laneWeightKeyword"
  | "laneWeightDate"
  | "hypotheticalTimeoutMs";

export const ADVANCED_RETRIEVAL_FIELDS: readonly AdvancedRetrievalField[] = [
  {
    key: "retrievalLimit",
    displayName: "Passages returned",
    subtitle: "How many passages to send with your question.",
    min: 1,
    max: 20,
    step: 1,
    int: true,
  },
  {
    key: "retrievalThreshold",
    displayName: "Similarity floor",
    subtitle: "Discard passages below this similarity. Unrelated text scores about 0.5, so this rarely bites.",
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    key: "passageRelevanceCut",
    displayName: "Relevance cut",
    subtitle: "Keep a passage only if it scores this share of the best match. 0 keeps all of them.",
    min: 0,
    max: 1,
    step: 0.05,
    warning: "Untested. Raising this can drop correct passages as well as noise.",
  },
  {
    key: "ragContextShare",
    displayName: "Context share",
    subtitle: "The share of the model's context window passages may fill. The rest is left for the conversation.",
    min: 0.1,
    max: 0.9,
    step: 0.05,
  },
  {
    key: "laneCandidates",
    displayName: "Candidates per search",
    subtitle: "How many passages each search considers before they are combined. Higher is slower.",
    min: 5,
    max: 200,
    step: 5,
    int: true,
  },
  {
    key: "neighbourChunks",
    displayName: "Neighbouring chunks",
    subtitle: "Also send this many chunks either side of a match, so a split answer arrives whole.",
    min: 0,
    max: 5,
    step: 1,
    int: true,
  },
  {
    key: "rerankDepth",
    displayName: "Keyword rerank depth",
    subtitle: "How many of the top passages keyword matching reorders.",
    min: 0,
    max: 50,
    step: 1,
    int: true,
  },
  {
    key: "rrfConstant",
    displayName: "Rank fusion constant",
    subtitle: "Flattens rank differences when searches are combined. Higher treats rank 1 and rank 10 as more alike.",
    min: 1,
    max: 200,
    step: 1,
    int: true,
  },
  {
    key: "bm25K1",
    displayName: "Keyword saturation (k1)",
    subtitle: "How much a repeated word keeps adding to a passage's keyword score.",
    min: 0,
    max: 3,
    step: 0.1,
  },
  {
    key: "bm25B",
    displayName: "Keyword length penalty (b)",
    subtitle: "How much a long passage is penalised for keyword matches. 0 suits chunks of a capped length.",
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    key: "laneWeightVector",
    displayName: "Weight: meaning",
    subtitle: "How much the meaning search counts when results are combined.",
    min: 0,
    max: 5,
    step: 0.1,
  },
  {
    key: "laneWeightHyde",
    displayName: "Weight: drafted answer",
    subtitle: "How much the drafted-answer search counts. Only used at High depth.",
    min: 0,
    max: 5,
    step: 0.1,
  },
  {
    key: "laneWeightKeyword",
    displayName: "Weight: keywords",
    subtitle: "How much keyword matching counts. Finds the right document better than the right passage.",
    min: 0,
    max: 5,
    step: 0.1,
  },
  {
    key: "laneWeightDate",
    displayName: "Weight: dates",
    subtitle: "How much a passage is lifted for matching a date your question names.",
    min: 0,
    max: 5,
    step: 0.1,
  },
  {
    key: "hypotheticalTimeoutMs",
    displayName: "Draft timeout (ms)",
    subtitle: "How long to wait for the drafted answer at High depth before searching without it.",
    min: 1000,
    max: 60_000,
    step: 1000,
    int: true,
  },
];

/** The key that reveals the fields above. Each one declares a dependency on it. */
export const SHOW_ADVANCED_KEY = "showAdvancedRetrieval";

/**
 * A configured number, or the shipped default when the value is missing, not a number, or outside
 * the bounds the field advertises.
 *
 * It clamps rather than throws. A chat's stored config can hold anything - a value written by an
 * older build, or one edited by hand - and refusing to answer over a bad number would be worse
 * than ignoring it. The evaluation harness throws instead, because there a wrong value silently
 * accepted would corrupt a measurement.
 */
export function readAdvancedNumber(
  raw: unknown,
  field: AdvancedRetrievalField,
): number {
  const fallback = FIXED_DEFAULTS[field.key];
  if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
  if (raw < field.min || raw > field.max) return fallback;
  if (field.int && !Number.isInteger(raw)) return fallback;
  return raw;
}
