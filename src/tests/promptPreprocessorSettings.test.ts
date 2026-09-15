import { test } from "node:test";
import * as assert from "node:assert/strict";
import { type ChatMessage, type PromptPreprocessorController } from "@lmstudio/sdk";
import { preprocess } from "../promptPreprocessor";

test("preprocess returns the message unchanged and says what to set when directories are missing", async () => {
  const statuses: string[] = [];
  const emptyConfig = { get: (_key: string) => "" };
  const ctl = {
    getGlobalPluginConfig: () => emptyConfig,
    getPluginConfig: () => ({ get: (key: string) => (key === "reindexMode" ? "off" : undefined) }),
    createStatus: (state: { text: string }) => {
      statuses.push(state.text);
      return { setState: () => undefined };
    },
    abortSignal: new AbortController().signal,
  } as unknown as PromptPreprocessorController;
  const userMessage = { getText: () => "What happened on 8 Sep?" } as unknown as ChatMessage;

  const result = await preprocess(ctl, userMessage);

  assert.equal(result, userMessage);
  assert.deepEqual(statuses, [
    "Big RAG is not in use: set Documents Directory and Vector Store Directory in Big RAG's global settings.",
  ]);
});
