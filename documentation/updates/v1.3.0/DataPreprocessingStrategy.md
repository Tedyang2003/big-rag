# Data Preprocessing Improvement

Date: 2026-09-15
Status: Completed Implementation
version: `v1.3.0`

---

## Context
As indicated in the update documentation for version 1.2.0, the first milestone for improving accuracy is how documents are prepared before they ever reach retrieval. If a document is formatted poorly, split in the wrong places, or stripped of its dates, no retrieval strategy later on can recover what was lost.

In the legacy version, every parser produced a flat block of text, which was then cut into chunks of 512 tokens with 100 tokens of overlap. This caused a few problems

- Headings, lists and tables were flattened, so the structure of a document was lost
- Chunks were cut at arbitrary points, often splitting a single incident or section across two chunks
- A chunk had no idea which file, section or date it came from once it was separated from its neighbours
- Dates written inside a document, the very thing our users were asking about, were never recorded

---

## New Pipeline

<!-- DIAGRAM PLACEHOLDER: replace the image below with the v1.3.0 preprocessing pipeline -->
![Data Preprocessing Pipeline](../../images/DataPreprocessingPipeline.png)

The diagram should show the following components, in order

- Document Parsers (PDF, DOCX, PPTX, EPUB, HTML, Text, Images)
- Markdown Normalisation
- Section Builder
- Date Extraction
- Structured Chunker
- Contextual Chunk Headers
- Embedding and Vector Database
- Index Manifest (records the index format)

---

## Changes Made

### One Common Format for Every Parser
Every parser now produces the same simple Markdown structure, regardless of the original file type. This includes

- Headings (`#`, `##`, `###`)
- Paragraphs separated by a blank line
- List items, including nested lists
- Table rows written as `cell | cell | cell`
- Page and slide boundaries written as headings, such as `## Page 3` or `## Slide 2: Title`

Formats that already carry structure, such as DOCX, HTML and PPTX, keep their headings, lists and tables. Formats that don't, such as PDF text and OCR output, have their structure inferred from short standalone lines and bullet markers. Having one format means the steps after parsing no longer need to care where a document came from.

### Structure Aware Chunking
Instead of cutting every 512 tokens, documents are now split along their own structure. A section is either a heading and everything under it, or a top level list item, since many of our users' reports list incidents one item at a time.

Small sections are packed together until they reach the chunk size, and sections that are too large are split at the nearest block, then sentence, then word boundary. Overlap is only applied when a single oversized section has to be split, so ordinary chunks no longer repeat text from their neighbours. A heading is never left dangling at the end of a chunk.

### Date Extraction
Dates are now extracted from every document and every section. This covers

- ISO dates such as `2026-09-08`
- Written dates such as `8 Sep 2026` or `September 8, 2026`
- Numeric dates such as `08/09/2026`
- Months and quarters, such as `September 2026` or `Q3 2026`

Each document is given a posted date, taken from the first page, then the file name, then the file's modified time. Each section is given the dates it mentions, and subsections inherit the dates of the section they belong to.

Numeric dates can be ambiguous, as `03/04/2026` could be the 3rd of April or the 4th of March. Rather than assuming one convention, we resolve them in layers

- If one part is above 12, the order is decided
- Otherwise, the convention the rest of the document uses is applied
- Otherwise, the reading closest to the file's modified time (within 45 days) is chosen
- Otherwise, both readings are kept

### Contextual Chunk Headers
Every chunk now carries a short header describing where it came from, for example

```
[File: incident_roundup.pdf | Posted: 2026-09-20 | Section: Incident Roundup > 2. Bus collision | Dates: 2026-09-08]
```

The header is included when the chunk is embedded, so a search for a date or a section name can find it, and it is shown to the model along with the passage. Citations still show only the original passage, so what a user verifies against the source document is unchanged.

### Index Format and Rebuilding
Because structured chunks are not compatible with legacy ones, the index now records which format it was built with. If the format of an existing index does not match, the plugin tells the user a reindex is required, and that reindex rebuilds every file. This prevents an index from quietly mixing old and new chunks.

Structured indexing is on by default from this version onwards.

---

## Outcome
With these changes, every chunk that reaches retrieval knows its file, its section and its dates, and no longer depends on its neighbours to make sense. This does not change how retrieval works on its own, but it gives the next milestone, the retrieval strategy, the metadata it needs to search by keyword and by date.

The effect of these changes on accuracy is measured using the evaluation described in the v1.3.0 Evaluation Strategy document, by comparing a legacy index against a structured index built from the same documents.
