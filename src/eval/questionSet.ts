import * as fs from "fs/promises";
import * as path from "path";

export interface EvalQuestion {
  id: string;
  question: string;
  sourceFile: string;
  answerSnippet: string;
}

export interface QuestionSet {
  version: 1;
  generatedAt: string;
  generator: { model: string; seed: number };
  questions: EvalQuestion[];
}

const REQUIRED_FIELDS = ["question", "sourceFile", "answerSnippet"] as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function parseQuestionSet(raw: string): QuestionSet {
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Question file is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (data?.version !== 1) {
    throw new Error(`Unsupported question file version: ${JSON.stringify(data?.version)} (expected 1)`);
  }
  if (!Array.isArray(data.questions)) {
    throw new Error(`Question file must contain a "questions" array`);
  }

  const seenIds = new Set<string>();
  data.questions.forEach((entry: any, index: number) => {
    if (!isNonEmptyString(entry?.id)) {
      throw new Error(`Question at index ${index} has no "id"`);
    }
    for (const field of REQUIRED_FIELDS) {
      if (!isNonEmptyString(entry[field])) {
        throw new Error(`Question ${entry.id} is missing "${field}"`);
      }
    }
    if (seenIds.has(entry.id)) {
      throw new Error(`Duplicate question id "${entry.id}"`);
    }
    seenIds.add(entry.id);
  });

  return data as QuestionSet;
}

export async function loadQuestionSet(filePath: string): Promise<QuestionSet> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      throw new Error(
        `No question set found at ${filePath}. Run "npm run eval:generate", review the candidates file, ` +
          `and save it as eval/questions.json (or set BIG_RAG_EVAL_FILE).`,
      );
    }
    throw error;
  }
  return parseQuestionSet(raw);
}

/** Writes a file, creating parent directories. Fails instead of overwriting an existing file. */
export async function writeNewFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, { encoding: "utf-8", flag: "wx" });
}

export function toRelativeSourcePath(documentsDir: string, filePath: string): string {
  return path.relative(path.resolve(documentsDir), path.resolve(filePath)).split(path.sep).join("/");
}

/**
 * True if a relative source path (as produced by `toRelativeSourcePath`) actually points inside
 * the documents dir it was computed against. False for paths that escaped it via `..` segments,
 * or that ended up drive-absolute (a different Windows drive) or POSIX-absolute.
 */
export function isInsideDocumentsDir(relativeSourcePath: string): boolean {
  if (relativeSourcePath === "..") return false;
  if (relativeSourcePath.startsWith("../")) return false;
  if (relativeSourcePath.startsWith("/")) return false;
  if (/^[A-Za-z]:\//.test(relativeSourcePath)) return false;
  return true;
}
