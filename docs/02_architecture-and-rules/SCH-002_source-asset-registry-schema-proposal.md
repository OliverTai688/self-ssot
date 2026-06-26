# D-PROPOSAL-005: Source Asset Registry Prisma Schema

**Task:** DATTR-002
**Date:** 2026-06-09
**Status:** PROPOSAL — do not migrate until DATA-002 + DATTR-011 are approved and AUTH-001 complete

---

## Context

The Source Asset layer (A-ARCH-011, DATTR-001) defines the contract for documents, images, audio, video, links, HTML pages, and datasets ingested from any source. This document proposes the Prisma schema for the Source Asset Registry tables.

---

## Proposed Prisma Models

```prisma
// The canonical record for a distinct ingested asset
model SourceAsset {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId           String   @db.Uuid  @map("owner_id")
  assetKind         String             @map("asset_kind")
  // KINDS: "DOCUMENT", "IMAGE", "AUDIO", "VIDEO", "LINK", "WEB_PAGE", "DATASET", "MESSAGE_THREAD"
  mimeType          String?            @map("mime_type")
  title             String?
  stableId          String?            @map("stable_id")   // provider-side stable ID (Google Doc ID, LINE msg ID)
  sourceRef         String?            @map("source_ref")  // URL, file path, chat ID
  canonicalUrl      String?            @map("canonical_url")
  contentHash       String?            @map("content_hash") // SHA-256 of raw content for dedup
  sizeBytes         Int?               @map("size_bytes")
  language          String?
  revisionId        String?            @map("revision_id")
  snapshotIntent    String?            @map("snapshot_intent")  // "ON_CHANGE", "PERIODIC", "MANUAL"
  workflowState     String  @default("INBOX") @map("workflow_state")
  // STATES: "INBOX", "NORMALIZING", "NORMALIZED", "EVIDENCE_EXTRACTED", "ARCHIVED", "REVOKED"
  riskFlags         String[]           @map("risk_flags")  // ["LARGE_FILE", "PII_SUSPECTED", "UNVERIFIED_SOURCE"]
  moduleHint        String?            @map("module_hint") // suggested target module
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt      @map("updated_at")

  attributeSets     AssetAttributeSet[]
  actionItems       SourceActionItem[]
  extractions       AssetExtraction[]
  snapshots         SourceAssetSnapshot[]
  links             SourceAssetLink[]
}

// Typed metadata/attribute profile for an asset (one per interpretation type)
model AssetAttributeSet {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  sourceAssetId   String   @db.Uuid  @map("source_asset_id")
  sourceAsset     SourceAsset @relation(fields: [sourceAssetId], references: [id], onDelete: Cascade)
  attributeType   String             @map("attribute_type")
  // TYPES: "DOCUMENT_META", "IMAGE_META", "AUDIO_META", "VIDEO_META", "LINK_META", "WEB_META", "DATASET_META"
  attributes      Json               // typed attribute JSON per kind (authors, doi, duration, alt-text, etc.)
  interpretedAt   DateTime           @map("interpreted_at")
  createdAt       DateTime @default(now()) @map("created_at")
}

// An actionable item derived from an asset (task suggestion, note suggestion, etc.)
model SourceActionItem {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  sourceAssetId   String   @db.Uuid  @map("source_asset_id")
  sourceAsset     SourceAsset @relation(fields: [sourceAssetId], references: [id], onDelete: Cascade)
  ownerId         String   @db.Uuid  @map("owner_id")
  actionType      String             @map("action_type")  // "TASK", "NOTE", "RESEARCH_LINK", "DELIVERABLE"
  targetModule    String             @map("target_module")
  summary         String
  detail          Json?
  status          String  @default("PENDING")             // PENDING, CONVERTED, REJECTED, EXPIRED
  writeIntentId   String?  @db.Uuid  @map("write_intent_id")  // FK to ModuleWriteIntent when converted
  createdAt       DateTime @default(now()) @map("created_at")
  resolvedAt      DateTime?          @map("resolved_at")
}

// AI/system extraction run on an asset (OCR, transcription, readability, embedding)
model AssetExtraction {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  sourceAssetId   String   @db.Uuid  @map("source_asset_id")
  sourceAsset     SourceAsset @relation(fields: [sourceAssetId], references: [id], onDelete: Cascade)
  extractionType  String             @map("extraction_type")
  // TYPES: "OCR", "TRANSCRIPTION", "READABILITY", "EMBEDDING", "SUMMARY", "CAPTION"
  status          String             // PENDING, RUNNING, COMPLETED, FAILED
  outputRef       String?            @map("output_ref")   // reference to output (text, vector store ID, etc.)
  outputSizeBytes Int?               @map("output_size_bytes")
  modelUsed       String?            @map("model_used")
  runAt           DateTime?          @map("run_at")
  createdAt       DateTime @default(now()) @map("created_at")
}

// Version/snapshot of an asset at a point in time
model SourceAssetSnapshot {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  sourceAssetId   String   @db.Uuid  @map("source_asset_id")
  sourceAsset     SourceAsset @relation(fields: [sourceAssetId], references: [id], onDelete: Cascade)
  revisionId      String?            @map("revision_id")
  contentHash     String             @map("content_hash")
  snapshotRef     String?            @map("snapshot_ref")  // storage path or URL
  fetchedUrl      String?            @map("fetched_url")
  httpStatus      Int?               @map("http_status")
  snapshotAt      DateTime           @map("snapshot_at")
  createdAt       DateTime @default(now()) @map("created_at")
}

// Many-to-many links between source assets
model SourceAssetLink {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  sourceAssetId   String   @db.Uuid  @map("source_asset_id")
  sourceAsset     SourceAsset @relation(fields: [sourceAssetId], references: [id], onDelete: Cascade)
  targetAssetId   String   @db.Uuid  @map("target_asset_id")  // may not be FK if cross-table
  linkType        String             @map("link_type")         // "CITES", "DERIVED_FROM", "SAME_SOURCE", "MENTIONS"
  metadata        Json?
  createdAt       DateTime @default(now()) @map("created_at")
}
```

---

## Migration Impact

| Table | New | Risk | Dependencies |
|---|---|---|---|
| `source_assets` | Yes | MEDIUM | `profiles` |
| `asset_attribute_sets` | Yes | LOW | `source_assets` |
| `source_action_items` | Yes | MEDIUM | `source_assets`, future `module_write_intents` |
| `asset_extractions` | Yes | LOW | `source_assets` |
| `source_asset_snapshots` | Yes | MEDIUM | `source_assets` |
| `source_asset_links` | Yes | LOW | `source_assets` |

---

## Blocking Conditions

- **DATA-002** (data operations persistence) must be approved first (defines `ModuleWriteIntent` FK for `SourceActionItem`)
- **DATTR-011** (security policy) must be approved before storing real raw payloads in `SourceAssetSnapshot`
- **AUTH-001** required for `ownerId` FK to be meaningful

---

## Acceptance Criteria

- [x] SourceAsset, AssetAttributeSet, SourceActionItem, AssetExtraction, SourceAssetSnapshot, SourceAssetLink proposed
- [x] Migration impact table with dependencies
- [x] Blocking conditions documented
- [ ] Prisma models added to schema.prisma (follow-on)
- [ ] `pnpm db:validate` + `pnpm db:generate` pass (follow-on)
