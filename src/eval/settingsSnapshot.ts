import { readEmbeddingIndexManifest } from "../utils/embeddingIndexManifest";
import { type QuestionSet } from "./questionSet";
import { type RetrievalSettings } from "./settings";

export interface SettingsSnapshotArgs {
  settings: RetrievalSettings;
  diagnosticPoolSize: number;
  embeddingModelId: string;
  vectorStoreDir: string;
  totalChunks: number;
  questionsFile: string;
  questionSet: QuestionSet;
  /** Present only at High depth: the model that drafted the hypotheticals searched with. */
  hypotheticalGenerator?: string;
}

/**
 * The settings as the run will actually apply them, not as they were configured.
 *
 * A depth ignores the signals below it: Low fuses nothing, so keywords, dates, the drafted
 * answer and neighbour expansion are all inert; Medium never drafts. Recording the raw
 * configuration means a report can read `hyde: 1` for a run where no draft was ever made, which
 * is exactly the sort of thing that misleads when two reports are compared months apart.
 */
function asApplied(settings: RetrievalSettings): RetrievalSettings {
  const fusing = settings.retrievalDepth === "medium" || settings.retrievalDepth === "high";
  const drafting = settings.retrievalDepth === "high";
  return {
    ...settings,
    laneWeights: {
      vector: settings.laneWeights.vector,
      hyde: drafting ? settings.laneWeights.hyde : 0,
      keyword: fusing ? settings.laneWeights.keyword : 0,
      date: fusing ? settings.laneWeights.date : 0,
    },
    neighbourChunks: fusing ? settings.neighbourChunks : 0,
  };
}

/** Settings recorded in an eval run report, including the index format the store was built with. */
export async function buildSettingsSnapshot(args: SettingsSnapshotArgs): Promise<Record<string, unknown>> {
  const indexManifest = await readEmbeddingIndexManifest(args.vectorStoreDir);
  return {
    ...asApplied(args.settings),
    diagnosticPoolSize: args.diagnosticPoolSize,
    embeddingModelId: args.embeddingModelId,
    indexFormat: indexManifest?.indexFormat ?? "legacy",
    indexManifest,
    totalChunks: args.totalChunks,
    questionsFile: args.questionsFile,
    questionCount: args.questionSet.questions.length,
    questionGenerator: args.questionSet.generator,
    ...(args.hypotheticalGenerator ? { hypotheticalGenerator: args.hypotheticalGenerator } : {}),
  };
}
