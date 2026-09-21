# Cloudflare R2 Storage Schema Proposal

**Document ID:** `SCH-005`
**Last updated:** 2026-07-22
**Status:** Proposal only — no Prisma migration applied, no storage bucket created, no credentials configured
**Companion:** `docs/07_research-and-design/RES-022_cloudflare-r2-file-media-storage-integration-gap-research.md` (research/rationale), `docs/05_execution-plans/PLN-064_cloudflare-r2-storage-multi-stage-implementation-plan.md` (execution phases)

---

## 1. Purpose

Give the file/media storage layer a concrete Prisma shape before any migration is written. This proposal adopts and extends work already sitting unreviewed in this repo: `AUT-004_client-portal-public-storage-policy.md` already designed a `ProjectDeliverableFile` model with exactly the storage metadata Cloudflare R2 needs (provider, bucket, object key, MIME type, size, content hash, share state, scan status) but left "Supabase Storage only vs. provider abstraction for future R2" as an open `Remaining Decisions` item (`AUT-004` line 179). The owner's 2026-07-22 request ("檔案上傳和媒體上傳的部分也要對接到cloudflare R2") resolves that decision: **R2**, not Supabase Storage, is the storage backend going forward. This document closes that decision and extends the same shape to `FileAsset`/`MediaAsset` — the two library-asset types `ARC-012` §5A and `RES-016` already designed in TypeScript (`src/types/library-classification.ts`) but which have **no Prisma model at all** today.

## 2. Source Basis

- `AUT-004_client-portal-public-storage-policy.md` §"Storage Rules", §"Proposed Metadata Shape" — the `ProjectDeliverableFile` model, `ClientPortalFileShareState`, `FileScanStatus` enums, and the storage rules table (private-bucket-only, short signed-URL TTL, no persisted long-lived URLs, server-side signing only).
- `ARC-001_data-flow-and-storage.md` §12.1 — already designed the R2 access pattern conceptually: "R2 沒有像 Supabase Storage 的 RLS... 不公開 bucket... 後端代理：使用者請求檔案時，先由 Next.js API 驗證權限（讀 Postgres 確認可存取），再產生 signed URL 回傳" (no bucket-level RLS on R2; keep the bucket private; a Next.js backend route verifies authorization against Postgres before minting a signed URL) — this matches Cloudflare's own official guidance (see `RES-022` §3): R2 public buckets are all-or-nothing (no per-object privacy), so any mixed-visibility content (internal vs. client-visible) **must** stay in a private bucket behind app-layer authorization, never a public bucket.
- `ARC-033_tenant-owner-isolation-invariant.md` — every DB-backed model must scope by `ownerId` (direct or parent-chain), no role-based bypass. `FileAsset`/`MediaAsset` are new DB-backed models, so this proposal gives both a direct `ownerId`.
- `prisma/schema.prisma` — confirmed no `FileAsset`, `MediaAsset`, or `ProjectDeliverableFile` model exists today (grepped for all three). `Project`/`Profile` models and their FK/cascade conventions used as the template below.

## 3. Proposed Shape

```prisma
enum StorageProvider {
  CLOUDFLARE_R2
  SUPABASE_STORAGE // reserved for future use; CLOUDFLARE_R2 is the only provider this repo writes today

  @@map("storage_provider")
}

enum FileScanStatus {
  NOT_REQUIRED
  PENDING
  PASSED
  FAILED

  @@map("file_scan_status")
}

enum LibraryAssetVisibility {
  PRIVATE
  CLIENT_VISIBLE

  @@map("library_asset_visibility")
}

model FileAsset {
  id              String                  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId         String                  @map("owner_id") @db.Uuid
  owner           Profile                 @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  displayName     String                  @map("display_name")
  storageProvider StorageProvider         @default(CLOUDFLARE_R2) @map("storage_provider")
  bucket          String
  objectKey       String                  @map("object_key")
  mimeType        String?                 @map("mime_type")
  sizeBytes       Int?                    @map("size_bytes")
  contentHash     String?                 @map("content_hash")
  scanStatus      FileScanStatus          @default(NOT_REQUIRED) @map("scan_status")
  visibility      LibraryAssetVisibility  @default(PRIVATE)
  deletedAt       DateTime?               @map("deleted_at")
  createdAt       DateTime                @default(now()) @map("created_at")
  updatedAt       DateTime                @updatedAt @map("updated_at")

  @@index([ownerId], map: "file_assets_owner_idx")
  @@unique([bucket, objectKey], map: "file_assets_object_key_unique")
  @@map("file_assets")
}

model MediaAsset {
  id              String                  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId         String                  @map("owner_id") @db.Uuid
  owner           Profile                 @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  displayName     String                  @map("display_name")
  storageProvider StorageProvider         @default(CLOUDFLARE_R2) @map("storage_provider")
  bucket          String
  objectKey       String                  @map("object_key")
  mimeType        String?                 @map("mime_type")
  sizeBytes       Int?                    @map("size_bytes")
  contentHash     String?                 @map("content_hash")
  scanStatus      FileScanStatus          @default(NOT_REQUIRED) @map("scan_status")
  visibility      LibraryAssetVisibility  @default(PRIVATE)
  durationSeconds Int?                    @map("duration_seconds")
  deletedAt       DateTime?               @map("deleted_at")
  createdAt       DateTime                @default(now()) @map("created_at")
  updatedAt       DateTime                @updatedAt @map("updated_at")

  @@index([ownerId], map: "media_assets_owner_idx")
  @@unique([bucket, objectKey], map: "media_assets_object_key_unique")
  @@map("media_assets")
}
```

`AUT-004`'s `ProjectDeliverableFile` model is adopted **as-is**, with one clarification: its `storageProvider String` field should be populated `"cloudflare_r2"` in practice going forward (kept as a plain string there, not this proposal's enum, to avoid re-opening an already-reviewed proposal over a type nuance — reconcile to the shared `StorageProvider` enum only if `AUT-004` itself is revised).

`LibraryAssetModuleLink` (the module-classification join already designed in TypeScript by `RES-016`/`ARC-012` §5A, `src/types/library-classification.ts`) is **not** included in this proposal — it links an asset to modules, not to storage, and stays a separate, later schema decision once `FileAsset`/`MediaAsset` exist to link to.

## 4. Migration Impact Note (per `DBS-001`)

- **New tables only.** `file_assets`, `media_assets`. No existing table is altered. `ProjectDeliverableFile` (from `AUT-004`) is a separate new table, also additive.
- **No backfill required** — there is no existing file/media byte data anywhere in the system to migrate (confirmed by `RES-022`'s audit: all current "uploads" are UI-only mocks that discard file content; zero real files exist in any current store).
- **No RLS today.** Per `ARC-033`, isolation is app-layer (`ownerId`-scoped service checks), matching every other current DB-backed model. R2 itself has no RLS equivalent (per `ARC-001` §12.1) — authorization must happen in the Next.js backend route before a signed URL is ever minted, not at the storage layer.
- **Rollback:** dropping `file_assets`/`media_assets` is safe pre-launch (no dependent data); once real objects exist in R2, a rollback must not orphan bucket objects — deletion policy is a `PLN-064` implementation detail, not a schema concern.

## 5. Rejected Alternatives

- **Public R2 bucket for everything.** Rejected — Cloudflare's own documentation confirms public buckets expose the **entire bucket**, with no per-object privacy (see `RES-022` §3). This repo has mixed-visibility content (private owner files vs. `CLIENT_VISIBLE` deliverables) that `AUT-004` already requires stay behind server-side authorization. A public bucket cannot express that distinction.
- **Storing raw R2 URLs or signed URLs in Postgres.** Rejected, consistent with `AUT-004`'s existing rule ("Do not persist generated signed URLs in Postgres"). Only `bucket`/`objectKey` (stable references) are persisted; signed URLs are generated on demand, server-side, per request.
- **One unified `LibraryAsset` model instead of separate `FileAsset`/`MediaAsset`.** Rejected for this pass — the existing TypeScript contract (`RES-016`, `ARC-012` §5A) already treats files and media as two distinct UI/library concepts with different downstream handling (e.g., `durationSeconds` only makes sense for media); collapsing them into one table with a `kind` discriminator is a smaller, defensible alternative but changes an already-designed frontend contract and is deferred unless a real duplication cost appears.
- **Reusing `SourceAsset` for uploaded library files.** Rejected — `SourceAsset` (AI Input's ingestion model) represents externally-sourced content references (`externalRef`, `sourceConnectionId`), not raw uploaded bytes with storage coordinates; conflating the two would blur AI Input's ingestion pipeline with the library's storage layer.

## 6. Open Items For The Next Loop

- Confirm bucket-naming/object-key convention (e.g. `owner/{ownerId}/{assetId}/{filename}`) before Stage 1 of `PLN-064` writes the actual migration — not decided here, since it depends on Stage 0's real Cloudflare account/bucket setup (owner action).
- Decide whether `ProjectDeliverableFile.storageProvider` should be migrated from `String` to the shared `StorageProvider` enum in the same pass or left alone — low-stakes, defer to implementation time.
