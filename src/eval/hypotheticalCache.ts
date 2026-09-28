import * as fs from "fs/promises";

/**
 * The drafted answers a High-depth evaluation run searches with, kept on disk between runs.
 *
 * Drafting is not deterministic, so without this two runs of the same configuration differ by
 * the generator's variance rather than by the change being measured - and each run pays 88
 * generations it has already paid for. Hypotheticals from two different models are not a
 * comparable set, so a change of model rewrites the file rather than mixing into it.
 */
export interface HypotheticalCacheFile {
  model: string;
  generated: string;
  byQuestion: Record<string, string>;
}

export const HYPOTHETICALS_FILENAME = "hypotheticals.json";

function isCacheFile(value: unknown): value is HypotheticalCacheFile {
  const file = value as HypotheticalCacheFile | null;
  return (
    !!file &&
    typeof file.model === "string" &&
    typeof file.byQuestion === "object" &&
    file.byQuestion !== null
  );
}

/**
 * Reads the cache for `model`. Returns an empty set when the file is missing, unreadable,
 * written by another model, or when `regenerate` asks for a fresh start.
 */
export async function loadHypotheticals(
  filePath: string,
  model: string,
  regenerate: boolean,
): Promise<Record<string, string>> {
  if (regenerate) return {};
  try {
    const parsed = JSON.parse(await fs.readFile(filePath, "utf-8")) as unknown;
    if (!isCacheFile(parsed) || parsed.model !== model) return {};
    return parsed.byQuestion;
  } catch {
    return {};
  }
}

export async function saveHypotheticals(
  filePath: string,
  model: string,
  byQuestion: Record<string, string>,
  now: () => Date = () => new Date(),
): Promise<void> {
  const file: HypotheticalCacheFile = { model, generated: now().toISOString(), byQuestion };
  await fs.writeFile(filePath, `${JSON.stringify(file, null, 2)}\n`, "utf-8");
}

export interface HypotheticalStore {
  /** The draft for a question, generating and remembering one when it is not already held. */
  forQuestion(id: string, question: string): Promise<string | null>;
  /** Drafts served from the file rather than the model, for the run report. */
  readonly hits: number;
  readonly misses: number;
  readonly byQuestion: Record<string, string>;
}

/**
 * Wraps a generator so each question is drafted at most once per model, reusing `cached`.
 * A question the generator cannot answer is not cached, so a later run retries it.
 */
export function hypotheticalStore(
  cached: Record<string, string>,
  generate: (question: string) => Promise<string | null>,
): HypotheticalStore {
  const byQuestion: Record<string, string> = { ...cached };
  let hits = 0;
  let misses = 0;

  return {
    byQuestion,
    get hits() {
      return hits;
    },
    get misses() {
      return misses;
    },
    async forQuestion(id, question) {
      const existing = byQuestion[id];
      if (typeof existing === "string" && existing.length > 0) {
        hits++;
        return existing;
      }
      misses++;
      const drafted = await generate(question);
      if (drafted !== null) byQuestion[id] = drafted;
      return drafted;
    },
  };
}
