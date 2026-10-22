# Usage Examples

Six collections, and what differs between them. Note how little that is: chunk size,
retrieval limit, concurrency and the similarity floor are fixed defaults rather than
settings, so a collection is characterised by its **Retrieval Depth**, its exclude
patterns and its prompt template. The queries are the interesting part.

This document provides practical examples of using the Big RAG Plugin with different types of document collections.

## Example 1: Technical Documentation Library

### Scenario
You have a large collection of technical documentation, API references, and tutorials that you want to query using natural language.

### Setup

```bash
# Directory structure
~/Documents/tech-library/
├── python/
│   ├── official-docs/
│   ├── tutorials/
│   └── api-reference/
├── javascript/
│   ├── mdn-docs/
│   └── frameworks/
└── databases/
    ├── postgresql/
    └── mongodb/
```

### Configuration

- **Documents Directory**: `~/Documents/tech-library`
- **Vector Store Directory**: `~/.lmstudio/tech-library-db`
- **Retrieval Depth**: High — reference prose is worded unlike the questions asked of it

### Example Queries

**Query 1**: "How do I connect to PostgreSQL using Python?"

**Expected Behavior**:
- Retrieves relevant passages from both Python and PostgreSQL documentation
- Combines information from multiple sources
- Provides code examples if available in the docs

**Query 2**: "What are the differences between var, let, and const in JavaScript?"

**Expected Behavior**:
- Finds relevant sections from JavaScript documentation
- Returns explanations with examples
- May include best practices if documented

**Query 3**: "Show me MongoDB aggregation pipeline examples"

**Expected Behavior**:
- Retrieves MongoDB-specific documentation
- Includes practical examples
- May reference multiple documents showing different use cases

## Example 2: Research Paper Collection

### Scenario
You're a researcher with hundreds of PDF papers that you want to search and reference.

### Setup

```bash
# Directory structure
~/Research/papers/
├── machine-learning/
│   ├── deep-learning/
│   ├── reinforcement-learning/
│   └── nlp/
├── computer-vision/
└── robotics/
```

### Configuration

- **Documents Directory**: `~/Research/papers`
- **Vector Store Directory**: `~/.lmstudio/research-db`
- **Retrieval Depth**: High — a question in English sits far from a results table

### Example Queries

**Query 1**: "What are the latest approaches to attention mechanisms in transformers?"

**Expected Behavior**:
- Searches across all NLP papers
- Retrieves relevant sections discussing attention
- May include citations from multiple papers

**Query 2**: "Compare different reinforcement learning algorithms for robotics"

**Expected Behavior**:
- Finds content from both RL and robotics papers
- Retrieves comparative information
- Provides context from multiple sources

**Query 3**: "What datasets are commonly used for object detection?"

**Expected Behavior**:
- Searches computer vision papers
- Lists datasets mentioned in papers
- May include performance benchmarks

## Example 3: Legal Document Archive

### Scenario
A law firm with thousands of legal documents, contracts, and case files.

### Setup

```bash
# Directory structure
~/Legal/documents/
├── contracts/
│   ├── 2020/
│   ├── 2021/
│   ├── 2022/
│   ├── 2023/
│   └── 2024/
├── case-files/
└── regulations/
```

### Configuration

- **Documents Directory**: `~/Legal/documents`
- **Vector Store Directory**: `~/.lmstudio/legal-db`
- **Retrieval Depth**: Medium — clause wording usually appears in the question

### Example Queries

**Query 1**: "Find all contracts with non-compete clauses"

**Expected Behavior**:
- Searches across all contract documents
- Retrieves sections containing non-compete language
- Provides file references for review

**Query 2**: "What are the standard terms for intellectual property rights?"

**Expected Behavior**:
- Finds IP-related clauses across documents
- Shows variations in language
- Helps identify standard vs. custom terms

**Query 3**: "Show precedents for breach of contract cases"

**Expected Behavior**:
- Searches case files
- Retrieves relevant case information
- Provides context for similar situations

## Example 4: Personal Knowledge Base

### Scenario
Personal collection of notes, articles, ebooks, and saved web pages.

### Setup

```bash
# Directory structure
~/Knowledge/
├── books/
│   ├── fiction/
│   └── non-fiction/
├── articles/
│   ├── saved-webpages/
│   └── pdfs/
├── notes/
│   ├── work/
│   └── personal/
└── recipes/
```

### Configuration

- **Documents Directory**: `~/Knowledge`
- **Vector Store Directory**: `~/.lmstudio/knowledge-db`
- **Retrieval Depth**: Medium

### Example Queries

**Query 1**: "What did I save about productivity techniques?"

**Expected Behavior**:
- Searches across articles and notes
- Finds productivity-related content
- Combines information from multiple sources

**Query 2**: "Find that recipe for chocolate cake"

**Expected Behavior**:
- Searches recipe directory
- May use OCR if recipe is an image
- Returns recipe details

**Query 3**: "What books have I read about history?"

**Expected Behavior**:
- Searches book collection
- Identifies history-related books
- May provide summaries or key points

## Example 5: Software Development Project

### Scenario
Large codebase with documentation, README files, and code comments.

### Setup

```bash
# Directory structure
~/Projects/myapp/
├── docs/
│   ├── api/
│   ├── guides/
│   └── tutorials/
├── README.md
├── CONTRIBUTING.md
└── src/
    └── (various .md files for documentation)
```

### Configuration

- **Documents Directory**: `~/Projects/myapp`
- **Vector Store Directory**: `~/.lmstudio/myapp-docs-db`
- **Retrieval Depth**: Medium; add `*.min.js` and `node_modules/**` to **Exclude filename patterns**

### Example Queries

**Query 1**: "How do I set up the development environment?"

**Expected Behavior**:
- Finds setup instructions from README or guides
- Provides step-by-step information
- May reference multiple documentation files

**Query 2**: "What's the API for user authentication?"

**Expected Behavior**:
- Searches API documentation
- Retrieves authentication-related endpoints
- Shows usage examples

**Query 3**: "How do I contribute to this project?"

**Expected Behavior**:
- Finds CONTRIBUTING.md content
- Provides guidelines and workflow
- May include code style requirements

## Example 6: Medical/Healthcare Records (Anonymized)

### Scenario
Healthcare provider with anonymized patient records, research notes, and medical literature.

### Setup

```bash
# Directory structure
~/Medical/data/
├── research/
├── literature/
└── case-studies/
```

### Configuration

- **Documents Directory**: `~/Medical/data`
- **Vector Store Directory**: `~/.lmstudio/medical-db`
- **Retrieval Depth**: Medium — Low if the records are highly formulaic

### Example Queries

**Query 1**: "What are common treatments for condition X?"

**Expected Behavior**:
- Searches medical literature and case studies
- Retrieves treatment protocols
- Provides evidence-based information

**Query 2**: "Find cases with similar symptoms"

**Expected Behavior**:
- Searches case studies
- Identifies similar presentations
- Helps with differential diagnosis

## Notes by Collection Type

**Large collections.** The vector store shards every 10,000 chunks, and a search
parses each shard it touches, so search time grows with the index rather than
with the query. Parsing, not embedding, dominates the initial run.

**PDF-heavy collections.** A text-bearing PDF is read directly; a scanned one
falls through to OCR, which is far slower. If a collection is mostly scans,
expect indexing to take hours and plan to leave it running.

**Code repositories.** Exclude build output and vendored dependencies with
**Exclude filename patterns** — `node_modules/**`, `dist/**`, `*.min.js`. The
scanner walks everything under the documents directory, including those.

**Frequently updated collections.** Set **Reindex** to `Always index new &
changed files`. Each message re-scans and processes only files whose hash
changed, which is cheap once the first run is done. `Always rebuild everything`
rebuilds on every message and is almost never what you want.

## Troubleshooting

**Content you know exists is not found.** Confirm the file was indexed at all —
the terminal reports a count and names what failed. Then try **High** depth,
which drafts a likely answer and searches for that too; it is the only setting
that helps when a question is worded unlike the document. Rephrasing the
question towards the document's own vocabulary also works, because keyword
reranking matches literal terms.

**Irrelevant passages come back alongside the right one.** Expected at present.
`passageRelevanceCut` ships at `0`, so results are padded to five rather than
trimmed to what is comparably relevant. A question with one good answer returns
that answer plus four weaker passages. Nothing in the settings changes this; see
[Development](documentation/Development.md).

**Answers cite an outdated document.** Retrieval has no notion of supersession.
A revised document does not displace the original, and both may be returned.
Removing the stale file from the collection is the only reliable fix.

**A follow-up question retrieves nothing useful.** There is no query rewriting,
so `why?` is searched literally. Ask follow-ups as complete questions.

## Best Practices

1. **Start with a subset.** Index a handful of files and check the answers before
   committing to a run of hours.
2. **Keep the embedding model fixed.** Changing it invalidates every vector and
   forces a full rebuild.
3. **Exclude aggressively.** Anything the scanner skips is time you keep.
4. **Read the status line.** `Retrieved N relevant passages (meaning X, dates Y)`
   tells you which signals found what.
5. **Ask self-contained questions.** The plugin searches what you typed.
