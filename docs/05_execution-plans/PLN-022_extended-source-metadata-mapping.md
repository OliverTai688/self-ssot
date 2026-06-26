# D-PLAN-013: Extended Source Metadata Mapping — Image / Video / Audio / HTML / Link / Dataset

**Task:** DATTR-005
**Date:** 2026-06-09
**Status:** DONE — mapping reference; no runtime extraction or migration in this pass

---

## Purpose

Extend the source metadata mapping (D-PLAN-012 covers Google Doc / Drive / Markdown) to the remaining major source asset kinds: image, video, audio, HTML/web page, link/URL, and dataset. Each mapping defines what fields to capture, what extraction passes are needed, and what evidence selectors are produced.

This is a planning document. No OCR, transcription, embedding, or HTML rendering runtime is added here.

---

## 1. Image

**MIME types:** `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/heic`, `image/tiff`, `image/svg+xml`

### Identity Fields

| Personal OS Field | Source | Notes |
|---|---|---|
| `stableId` | File path (local) or provider object ID (Drive, camera roll) | |
| `sourceRef` | Absolute path or provider URL | |
| `mimeType` | From file magic bytes or MIME sniff; not trusted from extension alone | |
| `title` | Filename without extension, or EXIF `ImageDescription` | |
| `contentHash` | SHA-256 of raw binary | Dedup key |
| `sizeBytes` | Filesystem `stat.size` | |
| `revisionId` | null for local files; Drive `headRevisionId` if from Drive | |

### Attribute Fields (AssetAttributeSet — IMAGE_META)

| Attribute Key | Source | Notes |
|---|---|---|
| `width` | EXIF / image header | px |
| `height` | EXIF / image header | px |
| `colorSpace` | EXIF `ColorSpace` | sRGB, CMYK, etc. |
| `capturedAt` | EXIF `DateTimeOriginal` | Prefer over file mtime |
| `cameraMake` | EXIF `Make` | |
| `cameraModel` | EXIF `Model` | |
| `gpsLat` / `gpsLon` | EXIF GPS IFD | Strip before sharing unless user consents |
| `gpsAltitude` | EXIF GPS IFD | |
| `orientation` | EXIF `Orientation` | 1–8; needed for correct display |
| `hasAlpha` | PNG chunk / WebP VP8L | |
| `altText` | User-supplied or AI-generated caption | |
| `ocrText` | `AssetExtraction` type `OCR` | Triggered only if image contains text |
| `embeddingRef` | `AssetExtraction` type `EMBEDDING` | Vector store reference |
| `c2paProvenance` | C2PA manifest if present | For AI-generated image detection |

### Extraction Passes

| Pass | Trigger | Output |
|---|---|---|
| OCR | `processingStatus: "processing"`, image contains text blocks | `AssetExtraction{ extractionType: "OCR" }` → `NormalizedContent` |
| Caption | AI image description for content-sparse images | `AssetExtraction{ extractionType: "CAPTION" }` → `altText` |
| Embedding | After OCR or caption is available | `AssetExtraction{ extractionType: "EMBEDDING" }` |

### Risk Flags

- `PII_SUSPECTED` — if EXIF GPS is present
- `UNVERIFIED_SOURCE` — if received via messaging without attribution
- `LARGE_FILE` — if `sizeBytes > 20MB`

### Evidence Selectors

```
SourceEvidenceSelector {
  kind: "REGION",          // bounding box within image
  region: { x, y, w, h }, // pixel coordinates
  extractionRef: "ocr-run-id"
}
SourceEvidenceSelector {
  kind: "FULL",
  note: "caption evidence"
}
```

---

## 2. Video

**MIME types:** `video/mp4`, `video/quicktime`, `video/webm`, `video/x-matroska`, `video/avi`

### Identity Fields

| Personal OS Field | Source | Notes |
|---|---|---|
| `stableId` | File path or provider ID | |
| `mimeType` | From file magic bytes | |
| `title` | Filename without extension | |
| `contentHash` | SHA-256 of binary (or first 10MB for very large files) | |
| `sizeBytes` | Filesystem | |

### Attribute Fields (AssetAttributeSet — VIDEO_META)

| Attribute Key | Source | Notes |
|---|---|---|
| `durationSeconds` | Container metadata (MP4 `mvhd`, WebM) | |
| `width` / `height` | Video track header | |
| `frameRate` | Video track | |
| `videoCodec` | Container (H.264, H.265, VP9, AV1) | |
| `audioCodec` | Container (AAC, Opus, MP3) | |
| `hasSubtitles` | Container track list | |
| `language` | Audio track language tag | |
| `capturedAt` | Container metadata or EXIF for `.mov` | |
| `gpsLat` / `gpsLon` | Container GPS metadata | Strip unless consented |
| `thumbnailRef` | `AssetExtraction{ extractionType: "THUMBNAIL" }` | Storage path |
| `transcriptRef` | `AssetExtraction{ extractionType: "TRANSCRIPTION" }` | |

### Extraction Passes

| Pass | Trigger | Output |
|---|---|---|
| Thumbnail | Always, at 10% of duration | `AssetExtraction{ extractionType: "THUMBNAIL" }` |
| Transcription | If audio track present and user consent | `AssetExtraction{ extractionType: "TRANSCRIPTION" }` → `NormalizedContent` |
| Embedding | After transcription | `AssetExtraction{ extractionType: "EMBEDDING" }` |

### Risk Flags

- `LARGE_FILE` — if `sizeBytes > 200MB`
- `PII_SUSPECTED` — if GPS in container metadata
- `UNVERIFIED_SOURCE` — received from unknown source
- `BINARY_ONLY` — if no audio track and no subtitle track (cannot extract text)

### Evidence Selectors

```
SourceEvidenceSelector {
  kind: "TIMECODE",
  timecodeStart: "00:02:34",
  timecodeEnd: "00:02:47",
  note: "key claim in transcript"
}
```

---

## 3. Audio

**MIME types:** `audio/mpeg` (MP3), `audio/mp4` (M4A), `audio/wav`, `audio/ogg`, `audio/flac`, `audio/webm`

### Identity Fields

| Personal OS Field | Source | Notes |
|---|---|---|
| `stableId` | File path or provider ID | |
| `mimeType` | From file magic bytes | |
| `title` | ID3 tag `TIT2` or filename | |
| `contentHash` | SHA-256 of binary | |
| `sizeBytes` | Filesystem | |

### Attribute Fields (AssetAttributeSet — AUDIO_META)

| Attribute Key | Source | Notes |
|---|---|---|
| `durationSeconds` | Container metadata | |
| `sampleRate` | Audio header | Hz |
| `channels` | Audio header | 1 = mono, 2 = stereo |
| `bitrate` | Audio header | kbps |
| `codec` | Container | MP3, AAC, FLAC, Opus |
| `artist` | ID3 `TPE1` / M4A `©ART` | |
| `album` | ID3 `TALB` / M4A `©alb` | |
| `recordedAt` | ID3 `TDRC` / file mtime | |
| `language` | ID3 `TLAN` or inferred from transcript | |
| `transcriptRef` | `AssetExtraction{ extractionType: "TRANSCRIPTION" }` | |

### Extraction Passes

| Pass | Trigger | Output |
|---|---|---|
| Transcription | User consent + audio length < 4 hours | `AssetExtraction{ extractionType: "TRANSCRIPTION" }` → `NormalizedContent` |
| Embedding | After transcription | `AssetExtraction{ extractionType: "EMBEDDING" }` |

### Risk Flags

- `LARGE_FILE` — if `sizeBytes > 100MB`
- `PII_SUSPECTED` — if transcript contains names/phone numbers
- `BINARY_ONLY` — if transcription not run

### Evidence Selectors

```
SourceEvidenceSelector {
  kind: "TIMECODE",
  timecodeStart: "00:05:12",
  timecodeEnd: "00:05:30"
}
```

---

## 4. HTML / Web Page

**MIME types:** `text/html`, `application/xhtml+xml`
**Source:** fetched via HTTP/HTTPS from a captured link (see Section 5), or pasted directly.

### Identity Fields

| Personal OS Field | Source | Notes |
|---|---|---|
| `stableId` | Canonical URL (from `<link rel="canonical">` or final URL after redirects) | |
| `sourceRef` | Requested URL | |
| `canonicalUrl` | `<link rel="canonical">` href, or final URL | |
| `mimeType` | HTTP `Content-Type` header | |
| `title` | `<title>` element text | |
| `contentHash` | SHA-256 of raw HTML body | Changes on every fetch if dynamic |
| `sizeBytes` | `Content-Length` header or byte count of body | |
| `language` | HTTP `Content-Language` or `<html lang>` attribute | |
| `revisionId` | HTTP `ETag` header if present | |
| `snapshotAt` | Fetch timestamp | |
| `httpStatus` | HTTP response status code | |
| `fetchedUrl` | Final URL after all redirects | |

### Attribute Fields (AssetAttributeSet — WEB_META)

| Attribute Key | Source | Notes |
|---|---|---|
| `metaDescription` | `<meta name="description">` | |
| `metaKeywords` | `<meta name="keywords">` | |
| `ogTitle` / `ogDescription` / `ogImage` | OpenGraph `<meta property="og:*">` | |
| `twitterCard` | `<meta name="twitter:card">` | |
| `publishedAt` | JSON-LD `datePublished` or `<meta property="article:published_time">` | |
| `modifiedAt` | JSON-LD `dateModified` | |
| `authors` | JSON-LD `author.name` array | |
| `schemaType` | JSON-LD `@type` (Article, Product, Event, etc.) | |
| `robotsDirective` | `<meta name="robots">` | `noindex`, `noarchive`, etc. |
| `canonicalConfirmed` | Whether `<link rel="canonical">` matches fetched URL | |
| `readabilityText` | `AssetExtraction{ extractionType: "READABILITY" }` | Extracted main body text |
| `wordCount` | Computed from readability text | |
| `linkCount` | All `<a href>` links found in body | |
| `internalLinks` | Links pointing to same domain | Array |
| `externalLinks` | Links pointing to other domains | Array |

### Extraction Passes

| Pass | Trigger | Output |
|---|---|---|
| Readability | Always | `AssetExtraction{ extractionType: "READABILITY" }` → `NormalizedContent` |
| Embedding | After readability | `AssetExtraction{ extractionType: "EMBEDDING" }` |

### Snapshot Intent

```
snapshotIntent: "PERIODIC"   // re-fetch on schedule for change detection
snapshotIntent: "MANUAL"     // user-triggered only (for noarchive pages)
```

### Risk Flags

- `ROBOTS_NOARCHIVE` — if `robotsDirective` contains `noarchive`
- `PAYWALL_SUSPECTED` — if readability text is very short relative to page size
- `UNVERIFIED_SOURCE` — if domain is not in user's trusted list
- `LARGE_FILE` — if raw HTML `sizeBytes > 5MB`

### Evidence Selectors

```
SourceEvidenceSelector {
  kind: "CSS_SELECTOR",
  selector: "article > p:nth-child(3)",
  note: "key claim paragraph"
}
SourceEvidenceSelector {
  kind: "TEXT_RANGE",
  startOffset: 1200,
  endOffset: 1450,
  note: "from readability extraction"
}
```

---

## 5. Link / URL

**Concept:** A `LINK` asset is a captured URL before it has been fetched. It is the entry point for the fetch pipeline that produces a `WEB_PAGE` asset (Section 4). A `LINK` can remain a standalone asset if fetching is deferred or blocked.

### Identity Fields

| Personal OS Field | Source | Notes |
|---|---|---|
| `stableId` | Normalized URL (scheme + host + path, no fragment) | |
| `sourceRef` | Raw captured URL (may include fragment/UTM) | |
| `canonicalUrl` | null until fetch confirms canonical URL | |
| `mimeType` | null until fetch returns `Content-Type` | |
| `title` | Anchor text at capture time, or user-supplied label | |
| `contentHash` | SHA-256 of normalized URL string | Dedup key before fetch |
| `sizeBytes` | null until fetched | |

### Attribute Fields (AssetAttributeSet — LINK_META)

| Attribute Key | Source | Notes |
|---|---|---|
| `capturedFrom` | Provider where link was captured (LINE message ID, Gmail message ID, etc.) | |
| `anchorText` | Text of the `<a>` element or the raw URL text if no anchor | |
| `utmParams` | Query params starting with `utm_` | Extract and store separately |
| `fragment` | URL `#fragment` | |
| `scheme` | `https`, `http`, `ftp`, etc. | Flag `http` as risk |
| `host` | Hostname | |
| `path` | URL path | |
| `linkPreviewTitle` | From OpenGraph fetch of HEAD request (lightweight) | |
| `linkPreviewImage` | From OpenGraph `og:image` | |
| `fetchStatus` | `pending`, `fetched`, `blocked_by_robots`, `failed`, `skipped` | |
| `relatedWebPageAssetId` | FK to `SourceAsset` if a `WEB_PAGE` asset was created from this link | |

### Risk Flags

- `UNVERIFIED_SOURCE` — if host is not recognized
- `SHORT_URL` — if host is a known URL shortener (resolve before storing)
- `HTTP_ONLY` — if scheme is `http` not `https`
- `BLOCKED_BY_ROBOTS` — if robots.txt disallows fetch

---

## 6. Dataset

**MIME types:** `text/csv`, `application/json`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/x-parquet`, `application/x-ndjson`

### Identity Fields

| Personal OS Field | Source | Notes |
|---|---|---|
| `stableId` | File path, Drive ID, or API endpoint URL | |
| `mimeType` | From file magic bytes or Content-Type | |
| `title` | Filename or user-supplied name | |
| `contentHash` | SHA-256 of binary or first 10MB | |
| `sizeBytes` | Filesystem | |

### Attribute Fields (AssetAttributeSet — DATASET_META)

| Attribute Key | Source | Notes |
|---|---|---|
| `format` | CSV, JSON, NDJSON, XLSX, Parquet | |
| `rowCount` | Counted from file | Approximate for streaming formats |
| `columnCount` | Inferred from header row or schema | |
| `columns` | Array of `{ name, inferredType }` | inferredType: string/number/date/boolean/unknown |
| `hasHeader` | Whether first row is a header | |
| `delimiter` | CSV delimiter (`,`, `;`, `\t`, etc.) | |
| `encoding` | Character encoding (UTF-8, UTF-16, ISO-8859-1) | |
| `schemaRef` | JSON Schema or OpenAPI schema URL if declared | |
| `jsonPointerSample` | JSON Pointer path to array root if nested JSON | |
| `dateRangeMin` / `dateRangeMax` | If a date column is detected | |
| `nullCount` | Count of null/empty cells | |
| `sampleRows` | First 5 rows as JSON for preview | |

### Extraction Passes

| Pass | Trigger | Output |
|---|---|---|
| Schema inference | On import | Writes `columns`, `rowCount`, `format`, `sampleRows` to `AssetAttributeSet` |
| Summary | For structured datasets | `AssetExtraction{ extractionType: "SUMMARY" }` → `NormalizedContent` |
| Embedding | After summary | `AssetExtraction{ extractionType: "EMBEDDING" }` |

### Risk Flags

- `LARGE_FILE` — if `sizeBytes > 100MB`
- `PII_SUSPECTED` — if column names suggest personal data (email, phone, name, ssn, dob)
- `UNVERIFIED_SOURCE` — if origin is unknown

### Evidence Selectors

```
SourceEvidenceSelector {
  kind: "JSON_POINTER",
  pointer: "/rows/42/revenue",
  note: "Q3 revenue figure"
}
SourceEvidenceSelector {
  kind: "ROW_RANGE",
  rowStart: 100,
  rowEnd: 150,
  note: "outlier rows"
}
```

---

## 7. Common Patterns Across All Types

### Extraction Priority Order

```
1. Format detection + identity fields  (always, no network)
2. Metadata attributes                 (always, no network)
3. Text extraction (OCR/transcript/readability/summary)  (requires user consent for audio/video)
4. Embedding                           (requires text extraction to complete)
```

### Module Hint Derivation (extended)

| Source kind + signals | moduleHint |
|---|---|
| Image + EXIF GPS + location keyword | `Life` |
| Image + no GPS + document text detected | `Work / Research` |
| Video + transcript contains meeting/project keywords | `Work` |
| Audio + duration > 30 min + meeting keywords | `Work` |
| Audio + creative/music | `Life` |
| HTML/Web Page + schema `Article` + no commercial signals | `Research` |
| HTML/Web Page + schema `Product` or `Offer` | `Finance / Work` |
| Link + captured from LINE chamber group | `Chamber` |
| Dataset + CSV + columns suggest financial data | `Finance` |
| Dataset + CSV + columns suggest research data | `Research` |

### Privacy Constraint Summary

| Source kind | EXIF GPS strip | Consent required | Transcription gated |
|---|---|---|---|
| Image | Yes, strip before sharing | No (local) | No (text only via OCR) |
| Video | Yes, strip from container | Yes, for transcription | Yes |
| Audio | n/a | Yes, for transcription | Yes |
| HTML | n/a | No | n/a |
| Link | n/a | No | n/a |
| Dataset | n/a | Case-by-case if PII | n/a |

---

## Acceptance Criteria

- [x] Image: EXIF fields, OCR/caption/embedding extraction, GPS strip rule, evidence selectors
- [x] Video: container metadata, transcription, thumbnail, timecode evidence selectors
- [x] Audio: ID3/M4A metadata, transcription, timecode evidence selectors
- [x] HTML/Web Page: HTTP headers, OpenGraph, JSON-LD, readability extraction, robots/paywall flags, CSS selector evidence
- [x] Link/URL: normalized URL, anchor text, UTM params, fetch status, related WEB_PAGE asset link
- [x] Dataset: schema inference, column types, JSON pointer evidence selectors, PII column detection
- [x] Common extraction priority order documented
- [x] Module hint derivation extended to all new types
- [x] Privacy constraint summary table
- [ ] Type additions to `src/types/ingestion.ts` (follow-on implementation task)
- [ ] Extraction runner adapter (follow-on after AUTH-001 + Supabase connectivity)
