/**
 * Normalizes an authored Markdown file to the shared contract: keeps
 * headings, lists, paragraphs, and table rows; drops links' URLs, emphasis
 * and inline-code markers, fenced code blocks, block-quote markers, and
 * horizontal rules.
 */
export function normalizeMarkdown(markdown: string): string {
  let output = markdown.replace(/\r\n?/g, "\n");
  output = output.replace(/```[\s\S]*?```/g, "");
  output = output.replace(/`([^`]+)`/g, "$1");
  output = output.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  output = output.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  output = output.replace(/^[ \t]{0,3}>[ \t]?/gm, "");
  output = output.replace(/^[ \t]{0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/gm, "");
  output = output.replace(/^([ \t]*)[*+]([ \t]+)/gm, "$1-$2");
  output = output.replace(/(\*\*|__)(.+?)\1/g, "$2");
  output = output.replace(/(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])/g, "$1");
  output = output.replace(/(?<![\w_])_(?!\s)(.+?)(?<!\s)_(?![\w_])/g, "$1");
  output = output.replace(/^[ \t]*\|?[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-{3,}:?[ \t]*)+\|?[ \t]*$\n?/gm, "");
  output = output.replace(/^[ \t]*\|(.*)\|[ \t]*$/gm, (_match, inner: string) =>
    inner
      .split("|")
      .map((cell) => cell.trim())
      .join(" | "),
  );
  output = output.replace(/<[^>]+>/g, " ");
  output = output
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n");
  return output.replace(/\n{3,}/g, "\n\n").trim();
}

/** Strips heading and bullet markers so legacy chunking sees plain text. */
export function markdownToPlain(markdown: string): string {
  return markdown.replace(/^#{1,6}[ \t]+/gm, "").replace(/^[ \t]*-[ \t]+/gm, "");
}
