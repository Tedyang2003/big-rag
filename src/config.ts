import { createConfigSchematics } from "@lmstudio/sdk";

/** Default embedding model id (must match CLI default when env is unset). */
export const DEFAULT_EMBEDDING_MODEL_ID = "nomic-ai/nomic-embed-text-v1.5-GGUF";

export function resolveEmbeddingModelId(raw: string | undefined | null): string {
  const t = typeof raw === "string" ? raw.trim() : "";
  return t.length > 0 ? t : DEFAULT_EMBEDDING_MODEL_ID;
}

export const DEFAULT_PROMPT_TEMPLATE = `{{rag_context}}

Use the citations above to respond to the user query, only if they are relevant. Otherwise, respond to the best of your ability without them.

User Query:

{{user_query}}`;

/** Set once for the plugin in LM Studio's plugin settings; not shown per chat. */
export const globalConfigSchematics = createConfigSchematics()
  .field(
    "documentsDirectory",
    "string",
    {
      displayName: "Documents Directory",
      subtitle: "Root directory containing documents to index. All subdirectories will be scanned.",
      placeholder: "/path/to/documents",
    },
    "",
  )
  .field(
    "vectorStoreDirectory",
    "string",
    {
      displayName: "Vector Store Directory",
      subtitle: "Directory where the vector database will be stored.",
      placeholder: "/path/to/vector/store",
    },
    "",
  )
  .field(
    "embeddingModel",
    "string",
    {
      displayName: "Embedding Model",
      subtitle:
        "LM Studio accepts more than one spelling for the same model—for example mixedbread-ai/mxbai-embed-large-v1 (Hub / download) or text-embedding-mxbai-embed-large-v1 (as in lms ls). Both are valid; use one value consistently for indexing and chat so it matches .big-rag-embedding.json. Reindex after changing.",
      placeholder: DEFAULT_EMBEDDING_MODEL_ID,
    },
    DEFAULT_EMBEDDING_MODEL_ID,
  )
  .field(
    "excludeFilenamePatterns",
    "string",
    {
      displayName: "Exclude filename patterns",
      subtitle:
        "Optional. One glob per line to skip files, e.g. *.png or archive/**; # starts a comment. "
        + "Images are always OCR'd, so exclude them here if you don't need them. Files already indexed stay until you rebuild.",
      placeholder: "*.png\n# *.jpg",
      isParagraph: true,
    },
    "",
  )
  .field(
    "promptTemplate",
    "string",
    {
      displayName: "Prompt Template",
      subtitle:
        "Supports {{rag_context}} (required) and {{user_query}} macros for customizing the final prompt.",
      placeholder: DEFAULT_PROMPT_TEMPLATE,
      isParagraph: true,
    },
    DEFAULT_PROMPT_TEMPLATE,
  )
  .build();

/** Shown in each chat's sidebar. */
export const configSchematics = createConfigSchematics()
  .field(
    "reindexMode",
    "select",
    {
      displayName: "Reindex",
      subtitle:
        "To prevent reindexing, select No reindex. To index only new or updated files, select New & changed files. "
        + "To rebuild the whole index from scratch, select Rebuild everything. "
        + "The chosen mode runs once on your next message; to run it again, select No reindex, send a message, then choose a mode again.",
      options: [
        { value: "off", displayName: "No reindex" },
        { value: "changed", displayName: "New & changed files" },
        { value: "rebuild", displayName: "Rebuild everything" },
      ],
    },
    "off",
  )
  .build();

