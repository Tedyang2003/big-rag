import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as path from "path";
import { isPathIgnored } from "../eval/gitIgnore";

const REPO_ROOT = path.resolve(__dirname, "../..");

test("isPathIgnored is true for a gitignored path", async () => {
  assert.equal(await isPathIgnored(path.join(REPO_ROOT, "node_modules", "anything.json"), REPO_ROOT), true);
});

test("isPathIgnored is false for a tracked source path", async () => {
  assert.equal(await isPathIgnored(path.join(REPO_ROOT, "src", "not-ignored.ts"), REPO_ROOT), false);
});
