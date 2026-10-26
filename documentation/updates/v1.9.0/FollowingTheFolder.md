# Following the Folder

Date: 2026-10-26
Status: Completed Implementation
version: `v1.9.0`

---

## Context

Deleting a document from the documents directory did nothing to the index. Its
chunks stayed, kept being returned as search results, and kept being cited —
with a path that no longer existed on disk.

Worse, no amount of reindexing cleared them. **Always rebuild everything**
re-embeds every file the scanner finds, and a deleted file is never found, so
its chunks were never visited. The only way to remove them was to delete the
vector store directory and build the index again from scratch.

The information needed to detect this was already loaded on every run. The
indexer reads the whole file inventory from the store before scanning, and
never compared the two.

---

## Changes Made

### A file deleted from the documents directory loses its chunks

After the scan, any path in the store that the scan did not return is treated as
gone, and every chunk carrying one of its hashes is removed. A path can hold
more than one hash — an edited file adds chunks under a new hash while the old
ones remain — so all of them are deleted.

This runs on an ordinary incremental run, not only on a rebuild, because that is
the path almost every user is on.

### Excluding a file now removes it too

A file hidden by an exclude pattern is absent from the scan for a different
reason, and pruning cannot tell the two cases apart. Adding `archive/**` now
clears those chunks on the next indexing run rather than leaving them until a
rebuild.

That is a deliberate choice: an exclude pattern reads as "I do not want this
searchable", and leaving the content retrievable would be the surprise. The
User Guide said the opposite and has been corrected.

### The removals are reported

A notification names the files that were removed and says their content is no
longer searchable, capped so that clearing a large folder does not produce a
notification listing hundreds of paths. A silent deletion of indexed content is
not something a user should have to infer from worse answers.

### A prune-only run now refreshes the date catalog

`reindexChangedStore` decided whether to invalidate the cached catalog from the
updated and new file counts alone. A run that only deleted files scored zero on
both, so the catalog kept dates belonging to chunks that no longer existed.
Deletions now count toward that total.

### Also

The evaluation document described HyDE as "rewriting the question". It drafts a
hypothetical answer and searches for that; the question is untouched. Since
1.7.0 records a query-rewriting step that was built and removed, the old heading
read as that feature surviving under another name.

---

## Implementation

The comparison is a set difference: paths in the store's inventory that the scan
did not return. Both sides are byte-identical strings in practice, because the
stored `filePath` is the exact value the scanner produced, and both derive from
the same resolved root. They would only diverge if the Documents Directory
setting were re-entered with a different drive-letter case, which `path.resolve`
preserves rather than normalising — the symptom would be unmistakable, since
every file would appear deleted at once.

Pruning runs before the per-file indexing loop, so the removals are durable even
if the run is cancelled partway.

---

## Outcome

The index converges on the folder. Delete a document and its chunks go on the
next indexing run; restore it and they come back. Verified against a real store:
eight files and ten chunks, three files deleted, five files and seven chunks
remaining, no orphans.

---

## Known Gaps

**Pruning only happens when indexing happens.** With **Reindex** set to
`No reindex`, which is the default, deleting documents never triggers a scan, so
the chunks remain until something else causes an indexing run. The fix reaches
users who keep reindexing on.

**A scan that under-reports will prune files that still exist.** If a
subdirectory cannot be read partway through a walk, the scanner logs the error
and continues, so those files are absent from the scan and look deleted. The
cause is transient and the effect is permanent: the files are unchanged by hash,
so a later run skips them rather than re-indexing. Recovery is a full rebuild.
Guarding this means having the scanner report that a walk failed, rather than
only logging it.

**Deleting is one pass per hash.** `deleteByFileHash` walks every shard, so
removing many files at once costs a pass each. Fine at the sizes measured;
a batch variant is the obvious change if it ever hurts.

---

## Next Steps

1. Have the scanner surface walk failures, so pruning can decline when the scan
   is incomplete.
2. Consider whether chunks orphaned by an *edit* should also be cleared — an
   updated file leaves its previous version's chunks in the store on an
   incremental run.
