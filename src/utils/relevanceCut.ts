import { type SearchResult } from "../vectorstore/vectorStore";

/**
 * Drops passages that are not comparably relevant to the best one.
 *
 * Retrieval returns a fixed number of passages whether or not that many are relevant. On a
 * small collection a question with one good answer still fills every slot, and the rest come
 * back as page footers, advertisements and OCR noise. Measured on a dozen documents: "what does
 * shao yang like" returned the answer first and then seven passages about Ukraine, Korean
 * semiconductors and a stock-image URL, and the model reported there was nothing about Shao
 * Yang - a fair reading of what it was given.
 *
 * The test is relative, because similarity scores have no absolute meaning: embedding models
 * differ in where they put unrelated text, and an absolute floor tuned on one collection is
 * wrong on the next. A passage is kept while it scores at least `keepWithin` of the best one,
 * so one strong match returns one passage and five comparable matches return five.
 */
export function dropWeakPassages(passages: SearchResult[], keepWithin: number): SearchResult[] {
  if (passages.length === 0 || keepWithin <= 0) return passages;

  const relevanceOf = (passage: SearchResult) => passage.similarity ?? passage.score;
  const best = Math.max(...passages.map(relevanceOf));
  // A non-positive best means similarity is unavailable or meaningless here; keep everything
  // rather than guess, since the floor would be nonsense.
  if (!(best > 0)) return passages;

  const floor = best * keepWithin;
  // The first passage always stays: something was asked, and the best answer available beats
  // none at all even when nothing scores well.
  return passages.filter((passage, index) => index === 0 || relevanceOf(passage) >= floor);
}

/**
 * The top `count` passages, ordered weakest first so the best sits last — immediately above the
 * question in the prompt.
 *
 * Models attend to the ends of a long prompt. Asked for a Sapporo itinerary with the itinerary
 * ranked first, this one summarised the last passage it was given and never mentioned the
 * first. Putting the strongest match next to the question uses the position that gets read.
 */
export function passagesForPrompt(ranked: SearchResult[], count: number): SearchResult[] {
  return ranked.slice(0, count).reverse();
}
