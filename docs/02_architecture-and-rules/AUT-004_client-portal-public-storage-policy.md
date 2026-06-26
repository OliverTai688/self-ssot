# Client Portal Public Storage Policy

**Document ID:** `AUT-004`
**Last updated:** 2026-06-21
**Status:** Policy proposal only
**Related task:** `CLIENT-006`

## Purpose

Client Portal file links are public output. A `CLIENT_VISIBLE` deliverable title does not automatically make the underlying file safe to expose. This policy defines when `ProjectDeliverable.fileUrl` or future storage objects may be exposed through `/client/[token]`.

The current runtime must keep file URLs excluded until a signed URL BFF route, storage metadata model, audit event path, and revocation behavior are implemented and verified.

## Current State

- `ProjectDeliverable.fileUrl` exists in Prisma as nullable `project_deliverables.file_url`.
- Work deliverable UI can create folders/files, change status, and toggle `CLIENT_VISIBLE`, but does not upload or enter `fileUrl`.
- `src/lib/services/client-portal.service.ts` intentionally excludes `fileUrl` from `ClientPortalDeliverable`.
- Public `/client/[token]` shows deliverable title, description, type, status, and delivered date only.
- The public DTO boundary includes `fileUrlsExcluded: true`.
- Public unavailable/error states mention no token, private records, or file URLs.

## Research Basis

Local sources reviewed:

- `docs/02_architecture-and-rules/ARC-025_client-portal-public-bff.md`
- `docs/02_architecture-and-rules/ARC-001_data-flow-and-storage.md`
- `docs/02_architecture-and-rules/DBS-004_client-portal-token-schema-contract.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `src/lib/services/client-portal.service.ts`
- `src/lib/services/client-portal-readiness.service.ts`
- `src/app/client/[token]/page.tsx`
- `src/app/client/[token]/not-found.tsx`
- `src/app/client/[token]/error.tsx`
- `src/components/work/deliverable/deliverable-tree.tsx`
- `src/app/actions/work.ts`
- `prisma/schema.prisma`

External primary/security references reviewed:

- Supabase Storage buckets fundamentals: private buckets are private by default, all operations on private buckets are subject to RLS, and public buckets bypass read access controls for anyone with the URL.
- Supabase Storage access control: Storage uses Postgres RLS policies on `storage.objects` and denies uploads unless policies explicitly allow operations.
- Supabase serving assets guide: private bucket assets are not accessible through public URLs and can be served through server-created signed URLs with a fixed expiry.
- Supabase Smart CDN guide: signed URL responses can be cached; token expiry and CDN/browser cache TTL are separate, so revocation cannot rely on signed URL expiry alone.
- OWASP File Upload Cheat Sheet: public file retrieval increases disclosure and abuse risks; public access should go through an application handler and uploads need defense in depth.

Source links:

- https://supabase.com/docs/guides/storage/buckets/fundamentals
- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/guides/storage/serving/downloads
- https://supabase.com/docs/guides/storage/cdn/smart-cdn
- https://supabase.com/docs/reference/javascript/file-buckets-createsignedurl
- https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html

## Selected Pattern

Keep public Client Portal file URLs excluded until a future BFF file-access route is implemented:

```txt
/client/[token]
  -> renders deliverable metadata only
  -> no file hrefs

future /client/[token]/files/[fileRef]
  -> connection()
  -> validate Client Portal token through the same server-only token service
  -> find opaque fileRef owned by the client-visible project/deliverable
  -> require Project.visibility = CLIENT_VISIBLE
  -> require ProjectDeliverable.visibility = CLIENT_VISIBLE
  -> require file share state = CLIENT_VISIBLE
  -> generate a short-lived signed URL server-side
  -> append access audit event without raw token or storage secret
  -> redirect or return URL with no-store response headers
```

The public page should link only to the BFF route, never directly to `ProjectDeliverable.fileUrl`, raw Supabase object URLs, storage bucket paths, object keys, or provider-specific signed URLs stored in the database.

## Storage Rules

Required for v0.1 before file links can render:

| Area | Rule |
|---|---|
| Bucket model | Client Portal files must live in private buckets by default. Public buckets are disallowed for client deliverables unless a later public-marketing asset task explicitly approves them. |
| Storage metadata | Store provider, bucket, object key, MIME type, size, content hash, upload owner, scan status, and visibility metadata. Do not store long-lived public URLs as the source of truth. |
| Public DTO | `/client/[token]` may expose only opaque file references and display metadata after approval, never storage keys, bucket names, object paths, raw URLs, or internal DB IDs. |
| Signed URL generation | Signed URLs must be generated server-side after token, project, deliverable, file visibility, and revoke checks pass. |
| TTL | Default signed URL TTL should be short: 5 minutes for private launch; maximum 15 minutes unless a task explicitly approves longer. |
| Caching | The BFF response that issues or redirects to a signed URL must be `Cache-Control: private, no-store`. Storage/CDN cache behavior must be documented per provider. |
| Revocation | Revoking a client token or file share must stop new signed URL generation immediately. Already-issued signed URLs may remain usable until TTL/CDN cache expiry, so TTL must stay short. |
| Audit | Record file-access attempts as append-only events without raw token, verifier, object key, URL, or file contents. |
| File safety | Upload path must use extension allowlist, MIME sniffing/validation, size limits, generated storage keys, and malware/CDR plan before broad file upload is enabled. |
| UX | File links should be user-click initiated. Do not prefetch signed URLs, preload storage targets, or render provider URLs into HTML. |

## Proposed Metadata Shape

This is not a Prisma migration. It is the minimal information a future migration should review.

```prisma
enum ClientPortalFileShareState {
  DISABLED
  CLIENT_VISIBLE
  REVOKED

  @@map("client_portal_file_share_state")
}

enum FileScanStatus {
  NOT_REQUIRED
  PENDING
  PASSED
  FAILED

  @@map("file_scan_status")
}

model ProjectDeliverableFile {
  id             String                    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  deliverableId  String                    @map("deliverable_id") @db.Uuid
  deliverable    ProjectDeliverable        @relation(fields: [deliverableId], references: [id], onDelete: Cascade)
  storageProvider String                   @map("storage_provider")
  bucket          String
  objectKey       String                   @map("object_key")
  displayName     String                   @map("display_name")
  mimeType        String?                  @map("mime_type")
  sizeBytes       Int?                     @map("size_bytes")
  contentHash     String?                  @map("content_hash")
  shareState      ClientPortalFileShareState @default(DISABLED) @map("share_state")
  scanStatus      FileScanStatus           @default(NOT_REQUIRED) @map("scan_status")
  uploadedById    String?                  @map("uploaded_by_id") @db.Uuid
  revokedAt       DateTime?                @map("revoked_at")
  lastAccessedAt  DateTime?                @map("last_accessed_at")
  createdAt       DateTime                 @default(now()) @map("created_at")
  updatedAt       DateTime                 @updatedAt @map("updated_at")

  @@index([deliverableId, shareState], map: "project_deliverable_files_share_idx")
  @@map("project_deliverable_files")
}
```

The legacy `ProjectDeliverable.fileUrl` field should not be used as a public URL source. It can remain an internal reference field until a reviewed migration replaces or scopes it.

## Supabase-Specific Policy

For a Supabase-only v0.1 path:

- Use private buckets for client deliverables.
- Use RLS policies on `storage.objects` for owner-side upload/read where applicable.
- Generate client download links from the server using `createSignedUrl(path, expiresIn)` after BFF authorization.
- Do not use `getPublicUrl()` for client deliverables because it is for public buckets and produces predictable public URLs.
- Do not put service role keys or storage secrets in Client Components.
- Do not persist generated signed URLs in Postgres.
- Use path versioning or object replacement on a new path when a file is updated and cache freshness matters.
- For urgent revocation, disable new BFF signing immediately and delete or move the object if already-issued signed URLs must stop sooner than TTL/CDN cache expiry.

## Rejected Alternatives

- Render `ProjectDeliverable.fileUrl` directly in `/client/[token]`.
- Store provider signed URLs in the database and reuse them as durable file links.
- Use a public bucket for client deliverables.
- Treat `ProjectDeliverable.visibility = CLIENT_VISIBLE` as enough authorization for file bytes.
- Generate signed URLs in a Client Component.
- Prefetch signed URLs when the Client Portal page loads.
- Put storage bucket names, object keys, or signed URL query tokens in HTML.
- Depend on token revoke to invalidate already-issued signed URLs immediately.

## Acceptance For CLIENT-006

- This policy exists as `AUT-004`.
- `ARC-025` points to `AUT-004` as the Client Portal storage/file URL policy.
- Protected admin/settings readiness can report public storage policy as reviewed while implementation remains proposal-only and file URLs remain excluded.
- Public Client Portal source still excludes `fileUrl` and storage URLs.
- No Prisma schema change, migration, seed change, storage bucket change, upload runtime, signed URL runtime, public file link, production DB mutation, or public output expansion is added.

## Remaining Decisions

- Whether the first implementation should use Supabase Storage only or keep a provider abstraction for future R2.
- Whether private-launch file link TTL should be 5 minutes or 15 minutes.
- Whether file access should redirect to a signed URL or return JSON for client-side navigation.
- Which file types are allowed in the first owner upload path.
- Whether malware scanning/CDR is required before any client-visible PDF/DOCX upload.
