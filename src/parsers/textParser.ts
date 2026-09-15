import * as fs from "fs";
import { inferStructure } from "./markdown/inferStructure";
import { normalizeMarkdown } from "./markdown/normalizeMarkdown";

export type TextKind = "markdown" | "plain";

/**
 * Parse Markdown and plain text files into normalized Markdown.
 */
export async function parseText(filePath: string, kind: TextKind): Promise<string> {
  try {
    const content = await fs.promises.readFile(filePath, "utf-8");
    return kind === "markdown" ? normalizeMarkdown(content) : inferStructure(content);
  } catch (error) {
    console.error(`Error parsing text file ${filePath}:`, error);
    return "";
  }
}
