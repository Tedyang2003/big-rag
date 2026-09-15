import * as fs from "fs";
import { htmlToMarkdown } from "./markdown/htmlToMarkdown";

/**
 * Parse HTML/HTM files into normalized Markdown.
 */
export async function parseHTML(filePath: string): Promise<string> {
  try {
    const content = await fs.promises.readFile(filePath, "utf-8");
    return htmlToMarkdown(content);
  } catch (error) {
    console.error(`Error parsing HTML file ${filePath}:`, error);
    return "";
  }
}
