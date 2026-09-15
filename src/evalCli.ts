import { LMStudioClient } from "@lmstudio/sdk";
import * as path from "path";
import { resolveEmbeddingModelId } from "./config";
import { VectorStore } from "./vectorstore/vectorStore";
import { retrieve, CONTEXT_COMPACTION_POOL_MULTIPLIER } from "./retrieval/retrieve";
import {
  checkEmbeddingModelForRetrieval,
  readEmbeddingIndexManifest,
} from "./utils/embeddingIndexManifest";
import { buildQuestionPrompt, generateQuestions, QUESTION_JSON_SCHEMA } from "./eval/generateQuestions";
import { loadQuestionSet, toRelativeSourcePath, writeNewFile } from "./eval/questionSet";
import { formatMetricsTable, runEval } from "./eval/runEval";
import { readGenerationSettings, readRetrievalSettings } from "./eval/settings";
import { isPathIgnored } from "./eval/gitIgnore";

const USAGE =
  "Usage:\n" +
  "  BIG_RAG_DOCS_DIR=/path/to/docs BIG_RAG_DB_DIR=/path/to/db npm run eval:generate\n" +
  "  BIG_RAG_DOCS_DIR=/path/to/docs BIG_RAG_DB_DIR=/path/to/db npm run eval:run\n";

const EVAL_DIR = path.resolve(process.cwd(), "eval");
const MIN_DIAGNOSTIC_POOL_SIZE = 50;

async function runGenerate(client: LMStudioClient, vectorStore: VectorStore, documentsDir: string) {
  const { count, seed, leakLimit } = readGenerationSettings(process.env);

  const modelKey = process.env.BIG_RAG_EVAL_LLM;
  const llm = await (modelKey ? client.llm.model(modelKey) : client.llm.model()).catch((error: unknown) => {
    throw new Error(
      `No LLM available for question generation (${modelKey ? `BIG_RAG_EVAL_LLM=${modelKey}` : "no model loaded in LM Studio"}): ` +
        (error instanceof Error ? error.message : String(error)),
    );
  });
  const modelName = (await llm.getModelInfo()).identifier;

  console.log(
    `[BigRAG Eval] Generating up to ${count} questions with ${modelName} (seed ${seed}, leak limit ${leakLimit})...`,
  );

  const summary = await generateQuestions(
    {
      listChunks: () => vectorStore.listChunks(),
      askForQuestion: async (chunkText, attempt) => {
        const result = await llm.respond(buildQuestionPrompt(chunkText, attempt), {
          structured: { type: "json", jsonSchema: QUESTION_JSON_SCHEMA },
        });
        return result.content;
      },
      isPathIgnored: (filePath) => isPathIgnored(filePath),
      writeNewFile,
      now: () => new Date(),
    },
    { documentsDir, outputDir: EVAL_DIR, count, seed, modelName, leakLimit },
  );

  console.log(`[BigRAG Eval] Wrote ${summary.generated} candidate questions to ${summary.outputPath}`);
  if (summary.outsideDocumentsDir > 0) {
    console.warn(
      `[BigRAG Eval] Warning: ${summary.outsideDocumentsDir} indexed chunk(s) were outside BIG_RAG_DOCS_DIR and ` +
        `were skipped. Check that BIG_RAG_DOCS_DIR matches the plugin's Documents Directory.`,
    );
  }
  console.log(`[BigRAG Eval] Dropped: ${JSON.stringify(summary.dropped)}`);
  console.log(`[BigRAG Eval] Questions per file: ${JSON.stringify(summary.questionsPerFile, null, 2)}`);
  console.log(
    "[BigRAG Eval] Next: review the candidates file, delete bad questions, and save it as eval/questions.json.",
  );
}

async function runRun(client: LMStudioClient, vectorStore: VectorStore, documentsDir: string, vectorStoreDir: string) {
  const questionsPath = path.resolve(process.env.BIG_RAG_EVAL_FILE ?? path.join(EVAL_DIR, "questions.json"));
  const questionSet = await loadQuestionSet(questionsPath);

  const embeddingModelId = resolveEmbeddingModelId(process.env.BIG_RAG_EMBEDDING_MODEL);
  const embeddingModel = await client.embedding.model(embeddingModelId);
  const stats = await vectorStore.getStats();

  const compatibility = await checkEmbeddingModelForRetrieval({
    vectorStoreDir,
    resolvedModelId: embeddingModelId,
    totalChunks: stats.totalChunks,
    embeddingModel,
  });
  if (!compatibility.ok) {
    throw new Error(compatibility.userMessage);
  }

  const settings = readRetrievalSettings(process.env);
  const diagnosticPoolSize = Math.max(
    MIN_DIAGNOSTIC_POOL_SIZE,
    settings.retrievalLimit * (settings.enableContextCompaction ? CONTEXT_COMPACTION_POOL_MULTIPLIER : 1),
  );
  const settingsSnapshot = {
    ...settings,
    diagnosticPoolSize,
    embeddingModelId,
    indexManifest: await readEmbeddingIndexManifest(vectorStoreDir),
    totalChunks: stats.totalChunks,
    questionsFile: questionsPath,
    questionCount: questionSet.questions.length,
    questionGenerator: questionSet.generator,
  };

  console.log(`[BigRAG Eval] Running ${questionSet.questions.length} questions with ${JSON.stringify(settings)}...`);

  const { report, reportPath } = await runEval(
    {
      retrieve: (query) =>
        retrieve(
          query,
          {
            vectorStore,
            embedQuery: async (text) => (await embeddingModel.embed(text)).embedding,
            embedSentences: (sentences) => embeddingModel.embed(sentences),
            countTokens: (text) => embeddingModel.countTokens(text),
          },
          { ...settings, diagnosticPoolSize },
        ),
      listIndexedFiles: async () =>
        new Set((await vectorStore.listChunks()).map((c) => toRelativeSourcePath(documentsDir, c.filePath))),
      writeNewFile,
      now: () => new Date(),
    },
    { questionSet, documentsDir, reportsDir: path.join(EVAL_DIR, "reports"), settingsSnapshot },
  );

  console.log(`\n${formatMetricsTable(report.metrics, diagnosticPoolSize)}\n`);
  console.log(`[BigRAG Eval] Full report: ${reportPath}`);
  if (report.metrics.unscorable > report.metrics.scored) {
    console.warn(
      `[BigRAG Eval] Warning: more questions were unscorable (${report.metrics.unscorable}) than scored ` +
        `(${report.metrics.scored}). Check that BIG_RAG_DOCS_DIR matches the plugin's Documents Directory.`,
    );
  }
}

async function main() {
  const subcommand = process.argv[2];
  const documentsDir = process.env.BIG_RAG_DOCS_DIR;
  const vectorStoreDir = process.env.BIG_RAG_DB_DIR;

  if ((subcommand !== "generate" && subcommand !== "run") || !documentsDir || !vectorStoreDir) {
    console.error(USAGE);
    process.exit(1);
  }

  const client = new LMStudioClient();
  const vectorStore = new VectorStore(vectorStoreDir);

  try {
    await vectorStore.initialize();
    if (subcommand === "generate") {
      await runGenerate(client, vectorStore, documentsDir);
    } else {
      await runRun(client, vectorStore, documentsDir, vectorStoreDir);
    }
  } catch (error) {
    console.error(`[BigRAG Eval] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  } finally {
    await vectorStore.close();
  }
}

void main();
