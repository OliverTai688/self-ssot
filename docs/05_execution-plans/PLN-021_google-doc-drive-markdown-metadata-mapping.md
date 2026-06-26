# D-PLAN-012: Google Doc / Drive / Markdown Source Metadata Mapping

**Task:** DATTR-004
**Date:** 2026-06-09
**Status:** DONE — mapping reference; no migration until AUTH-001 + DATTR-002 approved

---

## Purpose

Define exactly which fields to capture when ingesting a Google Doc, Google Drive file, or Markdown document (local or repo). Each field maps to a `SourceAsset` or `AssetAttributeSet` column proposed in D-PROPOSAL-005.

This mapping allows the adapter to produce a complete, normalizable asset record from the provider API response without making judgment calls at ingestion time.

---

## 1. Google Doc

**API:** Google Docs API v1 + Drive API v3 (supplemental)

### Identity Fields

| Personal OS Field | Drive/Docs API Field | Notes |
|---|---|---|
| `stableId` | `document.documentId` | Stable across renames and moves |
| `sourceRef` | `document.documentId` | Same; use as canonical provider ref |
| `canonicalUrl` | `https://docs.google.com/document/d/{documentId}/edit` | Constructed from documentId |
| `mimeType` | `application/vnd.google-apps.document` | Fixed for Google Docs |
| `title` | `document.title` | User-visible display name |
| `revisionId` | Drive API `files.get` → `headRevisionId` | Must call Drive API; not in Docs API response |
| `contentHash` | SHA-256 of exported plain-text content | Computed from the normalized text export; Drive `md5Checksum` is of the Drive-internal binary, not the text |
| `language` | Not directly provided | Infer from content or Drive `properties.language` if set |
| `sizeBytes` | Drive `files.get` → `size` (export size varies; use Drive size as proxy) | |

### Attribute Fields (AssetAttributeSet — DOCUMENT_META)

| Attribute Key | Source | Notes |
|---|---|---|
| `authors` | Drive `files.get` → `owners[].displayName`, `owners[].emailAddress` | Array |
| `lastModifiedBy` | Drive `files.get` → `lastModifyingUser.displayName` | |
| `createdTime` | Drive `files.get` → `createdTime` | RFC 3339 |
| `modifiedTime` | Drive `files.get` → `modifiedTime` | RFC 3339 |
| `parentFolderIds` | Drive `files.get` → `parents[]` | Array of folder IDs |
| `sharedDriveId` | Drive `files.get` → `driveId` | null if My Drive |
| `labels` | Drive Labels API → `labelInfo.labels[]` | Typed label fields per label schema |
| `customProperties` | Drive `files.get` → `properties` (public) + `appProperties` (app-private) | Map |
| `starred` | Drive `files.get` → `starred` | Boolean |
| `trashed` | Drive `files.get` → `trashed` | If true, defer ingestion |
| `viewersCanCopyContent` | Drive `files.get` → `capabilities.canCopy` | Governs export rights |
| `wordCount` | Computed from exported text | Approximate |
| `headingCount` | Computed from exported Markdown/HTML | |
| `exportFormat` | `text/plain` or `text/markdown` | Format used for normalization |

### Snapshot Intent

```
snapshotIntent: "ON_CHANGE"   // trigger snapshot on Drive push notification or revision change
```

Use Drive `changes.watch` or `files.watch` push notifications to detect document changes. The `headRevisionId` delta triggers a new `SourceAssetSnapshot`.

### Risk Flags

- `UNVERIFIED_SOURCE` — if the document is from a shared drive not owned by the user
- `PII_SUSPECTED` — if document title or labels contain PII keywords
- `LARGE_FILE` — if `sizeBytes > 10MB` (text export threshold)

---

## 2. Google Drive File (non-Doc)

**API:** Drive API v3. Covers: PDF, DOCX, XLSX, PPTX, images, videos, CSVs, ZIP, etc. that are stored in Drive but are not native Google Docs.

### Identity Fields

| Personal OS Field | Drive API Field | Notes |
|---|---|---|
| `stableId` | `files.get` → `id` | Stable Drive file ID |
| `sourceRef` | Same as `stableId` | |
| `canonicalUrl` | `files.get` → `webViewLink` | Direct Drive viewer URL |
| `mimeType` | `files.get` → `mimeType` | Actual MIME type from Drive |
| `title` | `files.get` → `name` | |
| `revisionId` | `files.get` → `headRevisionId` | Only present for revisioned files |
| `contentHash` | `files.get` → `md5Checksum` | SHA-256 not provided by Drive; use md5Checksum as the dedup key |
| `sizeBytes` | `files.get` → `size` | |
| `language` | `files.get` → `properties.language` if set, otherwise null | |

### Attribute Fields (AssetAttributeSet — typed by MIME)

**For any Drive file:**

| Attribute Key | Source |
|---|---|
| `authors` | `files.get` → `owners[].displayName` |
| `createdTime` | `files.get` → `createdTime` |
| `modifiedTime` | `files.get` → `modifiedTime` |
| `lastModifiedBy` | `files.get` → `lastModifyingUser.displayName` |
| `parentFolderIds` | `files.get` → `parents[]` |
| `sharedWithMeTime` | `files.get` → `sharedWithMeTime` |
| `labels` | Drive Labels API |
| `customProperties` | `files.get` → `properties`, `appProperties` |
| `exportable` | True if `files.get` → `exportLinks` is non-empty |
| `thumbnailLink` | `files.get` → `thumbnailLink` |

**For PDFs specifically:**

| Attribute Key | Source | Notes |
|---|---|---|
| `pageCount` | PDF metadata or extraction | Requires PDF extraction run |
| `isScanned` | Infer from text layer presence | If no text layer, flag for OCR extraction |

**For Spreadsheets (XLSX / Google Sheets):**

| Attribute Key | Source |
|---|---|
| `sheetNames` | Export or Sheets API `spreadsheets.get` |
| `rowCount` | Sheets API per sheet |
| `columnCount` | Sheets API per sheet |

### Snapshot Intent

```
snapshotIntent: "ON_CHANGE"    // use Drive push notifications for revisioned files
snapshotIntent: "MANUAL"       // for non-revisioned files (e.g., ZIP, large binaries)
```

### Risk Flags

- `LARGE_FILE` — if `sizeBytes > 50MB`
- `UNVERIFIED_SOURCE` — shared externally from outside user's domain
- `BINARY_ONLY` — if no text layer and no export format available

---

## 3. Markdown Document (local file or repo)

**Source:** local filesystem or Git repository. No OAuth. Adapter reads via filesystem or `git` CLI.

### Identity Fields

| Personal OS Field | Adapter Source | Notes |
|---|---|---|
| `stableId` | Relative path within repo root, e.g. `docs/product/P-PRD-002.md` | Stable if file is not renamed |
| `sourceRef` | Absolute or repo-relative path | |
| `canonicalUrl` | GitHub `https://github.com/{owner}/{repo}/blob/{sha}/{path}` (if remote known) | null for local-only repos |
| `mimeType` | `text/markdown` | Fixed |
| `title` | First `# Heading` in document, or filename without extension | |
| `revisionId` | Git commit SHA at capture time | Null if file is not in a git repo |
| `contentHash` | SHA-256 of file content at capture time | |
| `sizeBytes` | Filesystem `stat.size` | |
| `language` | Infer from YAML front-matter `lang:` if present, or null | |

### Attribute Fields (AssetAttributeSet — DOCUMENT_META)

| Attribute Key | Source | Notes |
|---|---|---|
| `frontMatter` | YAML front-matter parsed from top of file | Map of key→value pairs |
| `authors` | `frontMatter.author` or `frontMatter.authors`, or git `git log --format='%aN' -- <path>` | Array |
| `createdAt` | `frontMatter.date` or filesystem `birthtime` or earliest git commit date | |
| `modifiedAt` | Filesystem `mtime` or latest git commit date | |
| `headings` | All `#`/`##`/`###` headings extracted from document | Array of `{level, text}` |
| `wordCount` | Computed from body text (exclude front-matter and code blocks) | |
| `codeBlockCount` | Extracted from ` ``` ` delimiters | |
| `linkCount` | Count of `[text](url)` inline links and `[text][ref]` reference links | |
| `imageCount` | Count of `![alt](src)` patterns | |
| `repoName` | Git remote `origin` URL parsed to owner/repo | null if no remote |
| `branch` | `git branch --show-current` at capture time | |
| `commitSha` | `git rev-parse HEAD -- <path>` | |
| `stagedOrDirty` | `git status --short -- <path>` is non-empty | If true, snapshot may be ahead of HEAD |

### Snapshot Intent

```
snapshotIntent: "ON_CHANGE"    // watch filesystem events or git post-commit hook
snapshotIntent: "MANUAL"       // for repos without a configured watcher
```

### Risk Flags

- `UNVERIFIED_SOURCE` — if file is outside the known repo root (e.g., pasted from clipboard, unknown origin)
- `STAGED_OR_DIRTY` — if snapshot was taken from a dirty working tree
- `LARGE_FILE` — if `sizeBytes > 5MB` (unusual for Markdown)

---

## 4. Common Normalization Rules

Regardless of source type, apply these rules before storing in `NormalizedContent`:

| Rule | Description |
|---|---|
| Strip front-matter | Remove YAML/TOML front-matter before text normalization |
| Collapse whitespace | Normalize line endings, trim trailing whitespace per line |
| Extract code blocks | Move ` ``` ` fenced blocks to a separate `code_blocks` attribute |
| Extract URLs | Collect all inline and reference links into a `linked_urls` array |
| Extract headings | Produce a `table_of_contents` structure from heading hierarchy |
| Language detection | If not already set, infer from IANA subtag or `franc` equivalent on first 200 chars |

---

## 5. Module Hint Derivation

| Source combination | moduleHint |
|---|---|
| Google Doc + label `project_brief` or `deliverable` | `Work` |
| Google Doc + label `paper` or `conference` | `Research` |
| Google Doc, no labels | `Work / Research` |
| Google Drive file + `application/pdf` + title contains "invoice" or "receipt" | `Finance` |
| Google Drive file + MIME `image/*` | `Research` |
| Markdown + path contains `docs/product/` or `docs/dev/` | `Work` |
| Markdown + path contains `docs/research/` | `Research` |
| Markdown + no recognized path | `Work / Research` |

---

## Acceptance Criteria

- [x] Google Doc stable ID, revision, snapshot intent, and attribute set defined
- [x] Google Drive file (non-Doc) fields including PDF and spreadsheet variants
- [x] Markdown document fields including front-matter, git provenance, and heading extraction
- [x] Common normalization rules documented
- [x] Risk flag rules per source type
- [x] Module hint derivation table
- [ ] Type additions to `src/types/ingestion.ts` (follow-on DATTR-005 or dedicated impl task)
- [ ] Adapter implementation (follow-on after DATTR-024 and Supabase connectivity)
