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
}

/** Settings recorded in an eval run report, including the index format the store was built with. */
export async function buildSettingsSnapshot(args: SettingsSnapshotArgs): Promise<Record<string, unknown>> {
  const indexManifest = await readEmbeddingIndexManifest(args.vectorStoreDir);
  return {
    ...args.settings,
    diagnosticPoolSize: args.diagnosticPoolSize,
    embeddingModelId: args.embeddingModelId,
    indexFormat: indexManifest?.indexFormat ?? "legacy",
    indexManifest,
    totalChunks: args.totalChunks,
    questionsFile: args.questionsFile,
    questionCount: args.questionSet.questions.length,
    questionGenerator: args.questionSet.generator,
  };
}
