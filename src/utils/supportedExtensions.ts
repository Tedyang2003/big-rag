
// Parsing Extensions and Checkers
const HTML_EXTENSIONS = [".htm", ".html", ".xhtml"];
const MARKDOWN_EXTENSIONS = [".md", ".markdown", ".mdown", ".mdx", ".mkd", ".mkdn"];
const TEXT_EXTENSIONS = [".txt", ".text"];
const PDF_EXTENSIONS = [".pdf"];
const EPUB_EXTENSIONS = [".epub"];
const IMAGE_EXTENSIONS = [".bmp", ".jpg", ".jpeg", ".png"];
const ARCHIVE_EXTENSIONS = [".rar"];
const PPTX_EXTENSIONS = [".pptx"];
const DOCX_EXTENSIONS = [".docx"];

const ALL_EXTENSION_GROUPS = [
  HTML_EXTENSIONS,
  MARKDOWN_EXTENSIONS,
  TEXT_EXTENSIONS,
  PDF_EXTENSIONS,
  EPUB_EXTENSIONS,
  IMAGE_EXTENSIONS,
  ARCHIVE_EXTENSIONS,
  PPTX_EXTENSIONS,
  DOCX_EXTENSIONS,
];

export const SUPPORTED_EXTENSIONS = new Set(
  ALL_EXTENSION_GROUPS.flatMap((group) => group.map((ext) => ext.toLowerCase())),
);

export const HTML_EXTENSION_SET = new Set(HTML_EXTENSIONS);
export const MARKDOWN_EXTENSION_SET = new Set(MARKDOWN_EXTENSIONS);
export const TEXT_EXTENSION_SET = new Set(TEXT_EXTENSIONS);
export const IMAGE_EXTENSION_SET = new Set(IMAGE_EXTENSIONS);
export const PPTX_EXTENSION_SET = new Set(PPTX_EXTENSIONS);
export const DOCX_EXTENSION_SET = new Set(DOCX_EXTENSIONS);

export function isPptxExtension(ext: string): boolean {
  return PPTX_EXTENSION_SET.has(ext.toLowerCase());
}

export function isDocxExtension(ext: string): boolean {
  return DOCX_EXTENSION_SET.has(ext.toLowerCase());
}

export function isHtmlExtension(ext: string): boolean {
  return HTML_EXTENSION_SET.has(ext.toLowerCase());
}

export function isMarkdownExtension(ext: string): boolean {
  return MARKDOWN_EXTENSION_SET.has(ext.toLowerCase());
}

export function isPlainTextExtension(ext: string): boolean {
  return TEXT_EXTENSION_SET.has(ext.toLowerCase());
}

export function isTextualExtension(ext: string): boolean {
  return isMarkdownExtension(ext) || isPlainTextExtension(ext);
}

export function listSupportedExtensions(): string[] {
  return Array.from(SUPPORTED_EXTENSIONS.values()).sort();
}


