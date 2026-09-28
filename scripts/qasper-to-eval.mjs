/**
 * Converts QASPER into a corpus and a question set this harness can run.
 *
 * QASPER is 1,585 NLP papers with questions written by researchers who had read only the
 * abstract, answered by others who marked the paragraphs holding the answer. That makes it a
 * better measuring instrument than FinanceBench in one specific way: the documents are written
 * here from the same paragraphs the evidence is taken from, so the evidence matches the index
 * verbatim and almost nothing is unscorable. FinanceBench loses 62 of 150 questions to text its
 * own extractor produced differently from ours.
 *
 * Download the dataset first (qasper-dev-v0.3.json is ~281 papers, about the right size):
 *   https://allenai.org/data/qasper
 *
 * Usage:
 *   node scripts/qasper-to-eval.mjs <qasper.json> [--papers 300] [--out eval]
 *
 * Writes:
 *   <out>/documents/qasper/<paper_id>.txt   one plain-text paper per file
 *   <out>/questions-qasper.json             the question set, in the harness's schema
 */
import * as fs from "fs/promises";
import * as path from "path";

/** Evidence that points at a figure or table rather than text cannot be matched in the body. */
function isTextEvidence(evidence) {
  return typeof evidence === "string" && evidence.trim().length > 0 && !evidence.startsWith("FLOAT SELECTED");
}

/**
 * The paper as one document. Section names become Markdown headings so the structured chunker
 * has the same structure to work with that it would find in a real paper.
 */
function renderPaper(paper) {
  const parts = [`# ${paper.title ?? "Untitled"}`, ""];
  if (paper.abstract?.trim()) parts.push("## Abstract", "", paper.abstract.trim(), "");
  for (const section of paper.full_text ?? []) {
    if (section.section_name?.trim()) parts.push(`## ${section.section_name.trim()}`, "");
    for (const paragraph of section.paragraphs ?? []) {
      if (paragraph?.trim()) parts.push(paragraph.trim(), "");
    }
  }
  return `${parts.join("\n").trimEnd()}\n`;
}

/** The first annotator's answer that is answerable and cites text, with its longest evidence. */
function usableEvidence(qa) {
  for (const entry of qa.answers ?? []) {
    const answer = entry?.answer;
    if (!answer || answer.unanswerable) continue;
    const evidence = (answer.evidence ?? []).filter(isTextEvidence);
    if (evidence.length === 0) continue;
    // The longest paragraph is the least likely to appear elsewhere in the paper by chance.
    return evidence.reduce((longest, current) => (current.length > longest.length ? current : longest));
  }
  return null;
}

function parseArgs(argv) {
  const [source, ...rest] = argv;
  const options = { source, papers: 300, out: "eval" };
  for (let i = 0; i < rest.length; i += 2) {
    if (rest[i] === "--papers") options.papers = Number(rest[i + 1]);
    else if (rest[i] === "--out") options.out = rest[i + 1];
    else throw new Error(`Unknown option ${rest[i]}`);
  }
  if (!options.source) throw new Error("Usage: node scripts/qasper-to-eval.mjs <qasper.json> [--papers N] [--out DIR]");
  if (!Number.isInteger(options.papers) || options.papers < 1) throw new Error("--papers must be a positive whole number");
  return options;
}

async function main() {
  const { source, papers: paperLimit, out } = parseArgs(process.argv.slice(2));
  const data = JSON.parse(await fs.readFile(path.resolve(source), "utf-8"));

  const documentsDir = path.resolve(out, "documents", "qasper");
  await fs.rm(documentsDir, { recursive: true, force: true });
  await fs.mkdir(documentsDir, { recursive: true });

  // Sorted so a smaller --papers is a prefix of a larger one, and two runs see the same corpus.
  const ids = Object.keys(data).sort().slice(0, paperLimit);
  const questions = [];
  let skippedUnanswerable = 0;
  let skippedNotInText = 0;

  for (const id of ids) {
    const paper = data[id];
    const fileName = `${id}.txt`;
    const body = renderPaper(paper);
    await fs.writeFile(path.join(documentsDir, fileName), body, "utf-8");

    for (const qa of paper.qas ?? []) {
      const evidence = usableEvidence(qa);
      if (!evidence) {
        skippedUnanswerable++;
        continue;
      }
      // The evidence must survive into the document verbatim, or no retrieval could score it.
      if (!body.includes(evidence)) {
        skippedNotInText++;
        continue;
      }
      questions.push({
        id: qa.question_id ?? `${id}-${questions.length}`,
        question: qa.question,
        sourceFile: fileName,
        answerSnippet: evidence,
      });
    }
  }

  const questionsPath = path.resolve(out, "questions-qasper.json");
  await fs.writeFile(
    questionsPath,
    `${JSON.stringify(
      {
        version: 1,
        generatedAt: new Date().toISOString(),
        generator: { model: `qasper:${path.basename(source)}`, seed: 0 },
        questions,
      },
      null,
      2,
    )}\n`,
    "utf-8",
  );

  const words = questions.length === 0 ? 0 : Math.round(
    questions.reduce((sum, q) => sum + q.answerSnippet.split(/\s+/).length, 0) / questions.length,
  );
  console.log(`papers written        ${ids.length}  -> ${documentsDir}`);
  console.log(`questions kept        ${questions.length}  -> ${questionsPath}`);
  console.log(`  skipped, unanswerable or evidence is a figure/table  ${skippedUnanswerable}`);
  console.log(`  skipped, evidence not found verbatim in the paper    ${skippedNotInText}`);
  console.log(`mean evidence length  ${words} words`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
