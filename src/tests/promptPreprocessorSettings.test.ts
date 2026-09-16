import { test } from "node:test";
import * as assert from "node:assert/strict";
import { type ChatMessage, type PromptPreprocessorController } from "@lmstudio/sdk";
import { preprocess, reindexChangedStore } from "../promptPreprocessor";

test("reindexChangedStore is false when a run touched nothing (all files skipped as unchanged)", () => {
  assert.equal(reindexChangedStore({ updatedFiles: 0, newFiles: 0 }), false);
});

test("reindexChangedStore is true when a run updated an existing file", () => {
  assert.equal(reindexChangedStore({ updatedFiles: 1, newFiles: 0 }), true);
});

test("reindexChangedStore is true when a run added a new file", () => {
  assert.equal(reindexChangedStore({ updatedFiles: 0, newFiles: 1 }), true);
});

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
