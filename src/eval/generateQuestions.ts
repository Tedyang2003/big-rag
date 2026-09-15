import * as path from "path";
import { type IndexedChunk } from "../vectorstore/vectorStore";
import { containsSnippet } from "./matchSnippet";
import { isWordingLeak } from "./wordingLeak";
import { toRelativeSourcePath, type EvalQuestion, type QuestionSet } from "./questionSet";
import { sampleChunksAcrossFiles } from "./sampleChunks";

export interface GeneratedQA {
  question: string;
  answerSnippet: string;
}

export type DropReason = "invalid-output" | "snippet-not-found" | "wording-leak";

export const QUESTION_JSON_SCHEMA = {
  type: "object",
  properties: {
    question: { type: "string" },
    answerSnippet: { type: "string" },
  },
  required: ["question", "answerSnippet"],
  additionalProperties: false,
};

export function buildQuestionPrompt(chunkText: string, attempt: number): string {
  const retryNote =
    attempt > 0
      ? `\n\nYour previous answer was rejected. Make sure the snippet is copied exactly from the passage, ` +
        `and the question uses different wording from the passage.`
      : "";
  return (
    `You are writing a test question for a document search system.\n\n` +
    `Read the passage below and pick one specific fact from it. Return JSON with:\n` +
    `- "answerSnippet": one or two sentences copied EXACTLY, word for word, from the passage, containing that fact.\n` +
    `- "question": a question that a person who has NOT read this passage would ask to find that fact. ` +
    `Use your own words. Do not reuse distinctive phrases from the passage.\n\n` +
    `Passage:\n"""\n${chunkText}\n"""` +
    retryNote
  );
}

export function parseGeneratedQA(raw: string): GeneratedQA | null {
  try {
    const data = JSON.parse(raw);
    if (typeof data?.question !== "string" || typeof data?.answerSnippet !== "string") return null;
    const question = data.question.trim();
    const answerSnippet = data.answerSnippet.trim();
    if (!question || !answerSnippet) return null;
    return { question, answerSnippet };
  } catch {
    return null;
  }
}

export function validateCandidate(qa: GeneratedQA, chunkText: string): DropReason | null {
  if (!containsSnippet(chunkText, qa.answerSnippet)) return "snippet-not-found";
  if (isWordingLeak(qa.question, chunkText)) return "wording-leak";
  return null;
}

export interface GenerateDeps {
  listChunks: () => Promise<IndexedChunk[]>;
  askForQuestion: (chunkText: string, attempt: number) => Promise<string>;
  isPathIgnored: (filePath: string) => Promise<boolean>;
  writeNewFile: (filePath: string, content: string) => Promise<void>;
  now: () => Date;
}

export interface GenerateOptions {
  documentsDir: string;
  outputDir: string;
  count: number;
  seed: number;
  modelName: string;
}

export interface GenerateSummary {
  outputPath: string;
  generated: number;
  dropped: Record<DropReason, number>;
  questionsPerFile: Record<string, number>;
}

const MAX_ATTEMPTS = 2;

export async function generateQuestions(deps: GenerateDeps, options: GenerateOptions): Promise<GenerateSummary> {
  const chunks = await deps.listChunks();
  if (chunks.length === 0) {
    throw new Error("The index is empty. Run indexing before generating evaluation questions.");
  }

  const generatedAt = deps.now().toISOString();
  const outputPath = path.join(options.outputDir, `candidates-${generatedAt.replace(/[:.]/g, "-")}.json`);

  if (!(await deps.isPathIgnored(outputPath))) {
    throw new Error(
      `Refusing to write ${outputPath}: it is not gitignored. Evaluation files contain excerpts ` +
        `from your documents; add "eval/" to .gitignore first.`,
    );
  }

  const dropped: Record<DropReason, number> = { "invalid-output": 0, "snippet-not-found": 0, "wording-leak": 0 };
  const questions: EvalQuestion[] = [];
  const questionsPerFile: Record<string, number> = {};

  for (const sampled of sampleChunksAcrossFiles(chunks, options.count, options.seed)) {
    let accepted: GeneratedQA | null = null;
    let lastReason: DropReason = "invalid-output";

    for (let attempt = 0; attempt < MAX_ATTEMPTS && !accepted; attempt++) {
      const qa = parseGeneratedQA(await deps.askForQuestion(sampled.text, attempt));
      const reason = qa ? validateCandidate(qa, sampled.text) : "invalid-output";
      if (qa && reason === null) {
        accepted = qa;
      } else {
        lastReason = reason ?? "invalid-output";
      }
    }

    if (!accepted) {
      dropped[lastReason]++;
      continue;
    }

    const sourceFile = toRelativeSourcePath(options.documentsDir, sampled.filePath);
    questions.push({
      id: `q-${String(questions.length + 1).padStart(3, "0")}`,
      question: accepted.question,
      sourceFile,
      answerSnippet: accepted.answerSnippet,
    });
    questionsPerFile[sourceFile] = (questionsPerFile[sourceFile] ?? 0) + 1;
  }

  const set: QuestionSet = {
    version: 1,
    generatedAt,
    generator: { model: options.modelName, seed: options.seed },
    questions,
  };
  await deps.writeNewFile(outputPath, `${JSON.stringify(set, null, 2)}\n`);

  return { outputPath, generated: questions.length, dropped, questionsPerFile };
}
