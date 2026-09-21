# Cloudflare R2 Storage — Multi-Stage Implementation Plan

**Document ID:** `PLN-064`
**Last updated:** 2026-07-27
**Status:** Stages 0-4A implemented; authenticated owner upload/reload/download click-through remains owner-run evidence
**Companions:** `docs/07_research-and-design/RES-022_cloudflare-r2-file-media-storage-integration-gap-research.md` (research/rationale), `docs/02_architecture-and-rules/SCH-005_cloudflare-r2-storage-schema-proposal.md` (schema proposal)
**Backlog:** `docs/05_execution-plans/PLN-060_task-backlog.md` Phase 17 (`R2STORE-001..010`)

---

## Why Staged

Nothing in this codebase persists a real uploaded file today (`RES-022` §4 confirms every current upload UI either discards bytes or fabricates mock rows). Wiring Cloudflare R2 correctly touches an external account/credential the owner must create, a schema addition, a new authorization-gated server route, and — eventually — the Client Portal's public-output boundary (`AUT-004`). None of that should land in one pass. Each stage below is independently shippable and independently verifiable, and later stages depend on earlier ones actually working, not just existing on paper.

## Stage 0 — Owner Action: Cloudflare Account, Bucket, API Token (no code)

**Not automatable from this repo.** Requires:
- A Cloudflare account with R2 enabled.
- One R2 bucket created (private — do not enable public access / `r2.dev` per `RES-022` §3/§6).
- An R2 API token (Access Key ID + Secret Access Key) scoped to that bucket only, not an account-wide token.
- The account's R2 S3-API endpoint (account-ID-specific, per Cloudflare's docs).

Owner adds these as env vars (server-side only, never `NEXT_PUBLIC_*`): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT`. Document the convention in `.env.example` with placeholder values only (no real credentials ever committed), matching the existing `.env.example` pattern for Supabase vars.

**Stop condition:** no Stage 1+ code should call a real R2 endpoint until these env vars exist in the owner's own `.env.local` (or deployment secrets). Development/typecheck work in Stage 1-2 can and should proceed without real credentials (schema, types, route scaffolding, unit-testable presigned-URL construction logic behind a provider abstraction) — only an actual network call to R2 needs the real bucket.

## Stage 1 — Schema Foundation (`R2STORE-001`)

Apply `SCH-005`'s proposal: `FileAsset`, `MediaAsset` models (new), confirm `AUT-004`'s `ProjectDeliverableFile` model (still unmigrated) is adopted alongside them in the same migration pass for consistency. Add the `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` dependencies.

- Files: `prisma/schema.prisma`, `prisma/migrations/*`, `package.json`.
- Verification: `pnpm db:validate`, `pnpm db:generate`, disposable-DB migrate dry run (per `DBS-001`/`AGENTS.md` §13 — never against the live Supabase target without explicit owner go-ahead).
- Risk: MEDIUM (additive schema only, no backfill, per `SCH-005` §4). Requires the same owner go-ahead any live-DB migration requires per `AGENTS.md` §11.

## Stage 2 — R2 Client + Presigned-URL BFF Route (`R2STORE-002`, `R2STORE-003`)

- A server-only R2 client module (`src/lib/storage/r2-client.ts` or similar) wrapping `S3Client` construction from env vars, never imported by a Client Component.
- One server action/route handler that: `requireUser()` → ownership check on the target `FileAsset`/`MediaAsset`/`ProjectDeliverableFile` row (create-then-authorize for new uploads: create the DB row first scoped to `ownerId`, then mint the PUT URL for that row's `objectKey`) → server-generates `objectKey` (never client-supplied) → calls `getSignedUrl(PutObjectCommand, { expiresIn: <= 900 })` → returns the URL only.
- A parallel download route: ownership/visibility check → `getSignedUrl(GetObjectCommand, { expiresIn: 300-900 })`, matching `AUT-004`'s 5-15 minute TTL rule.
- Bucket CORS policy set (via Cloudflare dashboard or `wrangler r2 bucket cors set`, Stage 0/owner-adjacent action) allowing `PUT`/`GET` from the app's actual origin(s) only.
- Files: new `src/lib/storage/*`, `src/app/actions/storage.ts` or equivalent route handler.
- Verification: `pnpm exec tsc --noEmit --pretty false`; if real Stage 0 credentials exist, a manual smoke test (mint a presigned PUT URL, `curl -T` a test file, mint a GET URL, confirm round-trip) — otherwise this step waits for Stage 0.
- Risk: MEDIUM — this is the actual authorization boundary; must not skip the ownership check before minting either URL type.

## Stage 3 — First Real Upload Entry Point (`R2STORE-004`)

Wire exactly **one** existing upload surface to the real flow end-to-end, to prove the pattern before replicating it. Recommend **AI Input File Library** (`src/components/ai/file-library/file-library-page.tsx`) over Work's add-project dialog, because `ARC-012` §5A.1 already designates AI Input/the module-scoped library as the "one canonical asset store" — starting there avoids building the real flow against a secondary surface first.

- Replace `handleUpload()`'s fabrication with: real `<input type="file">`, request a presigned PUT from Stage 2's route, upload directly from the browser to R2, then confirm/finalize the `FileAsset` row (e.g. mark `scanStatus` per any validation performed).
- Files: `src/components/ai/file-library/file-library-page.tsx`, `src/lib/actions/library.ts` (new or extended).
- Verification: `pnpm exec tsc --noEmit --pretty false`; manual browser upload-and-reload check (per `AGENTS.md`'s UI verification rule — upload a real file, reload, confirm it's still there and re-downloadable).
- Risk: LOW-MEDIUM once Stage 2's authorization boundary is proven correct.

## Stage 4 — Remaining Upload Surfaces (`R2STORE-005`, `R2STORE-006`)

- AI Input Media Library (`media-library-page.tsx`) — same pattern as Stage 3, for `MediaAsset`.
- Work "新增專案" file dropzone (`add-project-dialog.tsx`) and `parseProjectDocuments` — switch from discarding `_files` to actually uploading them and creating real asset rows, reusing Stage 2's route rather than a parallel implementation.
- Risk: LOW — mechanical replication of Stage 3's proven pattern.

## Stage 4A — Formal Library Read Cutover (`R2STORE-009`)

The upload actions alone were insufficient because the shared client provider still initialized mock arrays and did not reconstruct persisted rows after reload. Formal mode now uses a protected server-loaded, owner-scoped DTO for `FileAsset` and `MediaAsset`; Mock and Formal state are kept in separate stores.

- Zero persisted rows render a truthful upload-first empty state.
- A DB read failure renders an unavailable state and never substitutes mock rows.
- Successful upload actions return the persisted DB row mapped to the same UI DTO used by reload hydration.
- Mock uploads are blocked so demo interaction cannot silently create formal rows.
- Verification: `pnpm library:formal:check`, targeted ESLint, typecheck, DB validation, production build, live read-only owner-count proof, and authenticated owner browser upload/reload/download when a signed-in session is available.

## Stage 5 — Client Portal Exposure (`R2STORE-007`) — Explicit Human Approval Required

Only once `AUT-004`'s full checklist is satisfiable: audit event path for file access, revocation behavior, scan-status gating, `share_state` enforcement. This is the point where uploaded content can become reachable (via short-TTL signed URL, never a raw R2 URL) from `/client/[token]`. Per `AGENTS.md` §11, Public output and Client Portal are named high-risk areas — do not implement without a fresh, explicit owner go-ahead at that time, separate from this plan's approval.

## Stage 6 — Backup/Retention Policy (`R2STORE-008`) — Deferred, Not MVP

`ARC-001` §13.1 sketches a backup matrix (Postgres → R2 daily `pg_dump`, structured docs/images primary in R2 with cross-region replication, weekly mirroring for small user uploads). None of this is required for the first working upload/download loop; revisit only once Stages 1-4 are live and real user content exists worth protecting.

## Backlog Summary

| Task id | Stage | Depends on | Status |
|---|---|---|---|
| `R2STORE-000` | 0 (owner action) | — | DONE |
| `R2STORE-001` | 1 (schema) | `R2STORE-000` for live migration only; schema authoring itself can start now | DONE |
| `R2STORE-002` | 2 (R2 client) | `R2STORE-001` | DONE |
| `R2STORE-003` | 2 (BFF routes) | `R2STORE-002` | DONE |
| `R2STORE-004` | 3 (first surface: AI Input File Library) | `R2STORE-003`, `R2STORE-000` for a real smoke test | DONE (owner browser round trip pending) |
| `R2STORE-005` | 4 (Media Library) | `R2STORE-004` | DONE (owner browser round trip pending) |
| `R2STORE-006` | 4 (Work upload dialog) | `R2STORE-004` | DONE (owner browser round trip pending) |
| `R2STORE-009` | 4A (formal owner-scoped read cutover) | `R2STORE-004`, `R2STORE-005` | DONE (owner browser round trip pending) |
| `R2STORE-007` | 5 (Client Portal exposure) | `R2STORE-006`, explicit owner approval | BLOCKED (approval gate) |
| `R2STORE-008` | 6 (backup/retention) | Stages 1-4 live with real content | DEFERRED |

Full rows with files/acceptance/verification are in `PLN-060_task-backlog.md` Phase 17.
