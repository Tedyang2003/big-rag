/**
 * How many of the retrieved passages can be sent without overflowing the model's context.
 *
 * Overflowing is worse than it sounds: the prompt template puts the passages first and the
 * question last, and a model truncates from the beginning, so an oversized prompt loses exactly
 * the passages it was built to deliver and keeps the instruction telling the model to use them.
 * A user sees a confident "I could not find anything about that" beside a citation panel showing
 * the answer. Measured rather than estimated, because only the model's own template and
 * tokenizer know what a prompt really costs.
 */
export interface ContextFit {
  /** How many passages, counted from the highest ranked, fit the budget. May be 0. */
  used: number;
  /** Tokens the prompt with `used` passages costs, as the model's tokenizer counts them. */
  tokens: number;
}

/**
 * The longest prefix of `total` passages whose prompt fits `budget` tokens.
 *
 * A prefix rather than a selection: neighbour expansion emits each passage immediately followed
 * by the chunks either side of it, so cutting from the end drops a whole group at a time and
 * leaves the earlier ones contiguous. Dropping by score across the whole list would strand half
 * an expanded span, which is the truncation problem again in miniature.
 *
 * Walks down from the full set, so the common case where everything fits costs one measurement.
 * `atLeast` is a floor: below it, passages are sent regardless of the budget.
 */
export async function fitToContext(
  total: number,
  budget: number,
  measure: (passageCount: number) => Promise<number>,
  atLeast = 0,
): Promise<ContextFit> {
  for (let used = total; used > atLeast; used--) {
    const tokens = await measure(used);
    if (tokens <= budget) return { used, tokens };
  }
  // Nothing fit. `atLeast` sends the best passages anyway rather than none: a long conversation
  // can fill the window on its own, and silently answering with no retrieval at all is a worse
  // failure than a prompt the host has to trim - it trims whole earlier turns, not this message.
  const used = Math.min(atLeast, total);
  return { used, tokens: await measure(used) };
}
