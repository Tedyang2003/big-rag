/**
 * HyDE: instead of searching for the question, search for what an answer to it would look like.
 *
 * A question written in English sits far from a grid of numbers, which is why financial
 * statements are the hardest case measured - only 9 of 41 such questions have their evidence
 * anywhere in the top 50. Asked to write the passage rather than answer the question, a model
 * produces text shaped like the document, and that embeds much closer to it. Measured on
 * FinanceBench, fusing a hypothetical's results with the question's own moved the median rank of
 * statement evidence from 24 to 8.
 *
 * The text is embedded and discarded. Its specifics are invented - the spike produced a table of
 * acquisitions that do not exist - so it must never reach a passage, a citation, the prompt or a
 * status line. Only its vector leaves the caller.
 */

/** Deliberately domain-neutral: this plugin indexes manuals and papers, not only filings. */
export function buildHypotheticalPrompt(question: string): string {
  return (
    "Write a short passage, two or three sentences, that would plausibly appear in a document " +
    "containing the answer to the question below. Write it as the document itself would be " +
    "written, using the terms, labels and figures such a passage would contain. Do not address " +
    "the reader, do not explain, and do not say whether you know the answer. Invented specifics " +
    "are fine.\n\nQuestion: " +
    question +
    "\n\nPassage:"
  );
}

export interface HypotheticalDeps {
  generate: (prompt: string, abortSignal?: AbortSignal) => Promise<string>;
  /** Bounds a pathological model; generation measured a median 542ms. */
  timeoutMs: number;
  abortSignal?: AbortSignal;
}

/**
 * The hypothetical answer for a question, or null when one could not be produced - the generator
 * failed, was aborted, ran past `timeoutMs`, or returned nothing but whitespace. Never throws:
 * High depth degrades to Medium for that query rather than failing it.
 */
export async function hypotheticalFor(question: string, deps: HypotheticalDeps): Promise<string | null> {
  if (question.trim().length === 0) return null;

  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), deps.timeoutMs);
  // The caller's own cancellation must still reach the generator, so both are watched.
  const onAbort = () => timeout.abort();
  deps.abortSignal?.addEventListener("abort", onAbort, { once: true });

  try {
    const generated = await Promise.race([
      deps.generate(buildHypotheticalPrompt(question), timeout.signal),
      new Promise<null>((resolve) => {
        timeout.signal.addEventListener("abort", () => resolve(null), { once: true });
      }),
    ]);
    if (typeof generated !== "string") return null;
    const trimmed = generated.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch (error) {
    console.warn("[BigRAG] Could not draft a hypothetical answer; searching on the question alone:", error);
    return null;
  } finally {
    clearTimeout(timer);
    deps.abortSignal?.removeEventListener("abort", onAbort);
  }
}
