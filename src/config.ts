import { createConfigSchematics, type ConfigSchematicsBuilder } from "@lmstudio/sdk";
import { FIXED_DEFAULTS } from "./settings/defaults";
import { ADVANCED_RETRIEVAL_FIELDS, SHOW_ADVANCED_KEY } from "./settings/advancedRetrieval";

/** Default embedding model id (must match CLI default when env is unset). */
export const DEFAULT_EMBEDDING_MODEL_ID = "nomic-ai/nomic-embed-text-v1.5-GGUF";

// Check of the identifier is string, trim it, length > 0, else use default embeddings model
export function resolveEmbeddingModelId(raw: string | undefined | null): string {
  const t = typeof raw === "string" ? raw.trim() : "";
  return t.length > 0 ? t : DEFAULT_EMBEDDING_MODEL_ID;
}


// Default Prompt Template
export const DEFAULT_PROMPT_TEMPLATE = `{{rag_context}}
Answer the question below using the passages above, which were retrieved for it. Any passages earlier in this conversation belong to earlier questions and do not apply here. If the passages above are not relevant, answer as best you can without them.
User Query:
{{user_query}}`;



/** Set once for the plugin in LM Studio's plugin settings; not shown per chat. */
const globalConfigBase = createConfigSchematics()
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
        "Model id used to index and search your documents. LM Studio lists some models under two names "
        + "(e.g. mixedbread-ai/mxbai-embed-large-v1 and text-embedding-mxbai-embed-large-v1) — either works, but always use the same one. "
        + "After changing this, select Rebuild everything under Reindex.",
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
  );

/** Shown in each chat's sidebar. */
export const configSchematics = createConfigSchematics()
  .field(
    "reindexMode",
    "select",
    {
      displayName: "Reindex",
      subtitle:
        "To prevent reindexing, select No reindex. To keep the index up to date, select Always index new & changed files: "
        + "every message checks for new or edited documents and indexes those. "
        + "To rebuild the index from scratch, select Always rebuild everything — this re-indexes every file on every message, "
        + "so switch back to No reindex once it has finished.",
      options: [
        { value: "off", displayName: "No reindex" },
        { value: "changed", displayName: "Always index new & changed files" },
        { value: "rebuild", displayName: "Always rebuild everything" },
      ],
    },
    "off",
  )
  .field(
    "retrievalDepth",
    "select",
    {
      displayName: "Retrieval Depth",
      subtitle:
        "Medium searches by meaning and lifts passages matching any date your question names — no extra model calls. "
        + "Low searches by meaning only, like earlier versions. "
        + "High also asks the loaded model to draft a likely answer and searches for that too, "
        + "which finds passages worded unlike the question, at one model call and about half a second per message.",
      options: [
        { value: "low", displayName: "Low" },
        { value: "medium", displayName: "Medium" },
        { value: "high", displayName: "High" },
      ],
    },
    "medium",
  )
  .build();

/**
 * Retrieval tuning, last on the global settings page and hidden behind one toggle.
 *
 * Global rather than per chat, so there is one place to set a value and one place to check which
 * value is in force. The cost is that there is no way to compare two settings side by side.
 *
 * The fields are added from one table rather than written out, so a key cannot be renamed here
 * without `resolveSettings` failing to compile. The builder's types describe each field it is
 * given, which a loop cannot express, so the chain is typed loosely from here on; nothing reads
 * this config through those types - `asConfigReader` takes string keys.
 */
const withAdvancedFields = ADVANCED_RETRIEVAL_FIELDS.reduce(
  (builder, field) =>
    builder.field(
      field.key,
      "numeric",
      {
        displayName: field.displayName,
        subtitle: field.subtitle,
        min: field.min,
        max: field.max,
        step: field.step,
        int: field.int,
        warning: field.warning,
        // Hidden until the toggle above is on, which is what keeps fifteen numbers out of the
        // way of someone who only came to set two directories.
        dependencies: [{ key: SHOW_ADVANCED_KEY, condition: { type: "equals", value: true } }],
      },
      FIXED_DEFAULTS[field.key],
    ),
  globalConfigBase
    .field(
      SHOW_ADVANCED_KEY,
      "boolean",
      {
        displayName: "Show advanced retrieval settings",
        subtitle:
          "How retrieval is tuned. These apply only while this is on, so turning it off restores "
          + "every default. Nothing here touches the stored index.",
      },
      false,
    ) as unknown as ConfigSchematicsBuilder<Record<string, never>>,
);

export const globalConfigSchematics = withAdvancedFields.build();

