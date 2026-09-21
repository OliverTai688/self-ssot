# Cloudflare R2 File/Media Storage Integration Gap Research

**Document ID:** `RES-022`
**Last updated:** 2026-07-27
**Status:** Research complete; Stages 0-4 are implemented. The 2026-07-27 addendum identifies and scopes the remaining formal-mode read/hydration gap as `R2STORE-009`.
**Trigger:** Owner-directed request, same session as `RES-021`: "另外檔案上傳和媒體上傳的部分也要對接到cloudflare R2才對" (the file-upload and media-upload parts should also connect to Cloudflare R2).

---

## 1. Purpose

Determine what actually exists today for file/media upload and storage in this codebase, what Cloudflare R2 requires and guarantees per its own documentation, and what the smallest correct integration shape is — reusing this repo's own prior (unimplemented) storage design rather than inventing a new one.

## 2. Source Basis

Local: `AUT-004_client-portal-public-storage-policy.md`, `ARC-001_data-flow-and-storage.md` §12.1/§13, `ARC-011_document-attribute-layer.md`, `ARC-012_frontend-operating-surface.md` §5A, `ARC-033_tenant-owner-isolation-invariant.md`, `RES-016`, `RES-019`, `PLN-060_task-backlog.md`, `prisma/schema.prisma`, `.env.example`, `package.json`, and every upload UI component in `src/` (full audit via a dedicated research pass — see §4).

External (official Cloudflare docs, fetched 2026-07-22): `developers.cloudflare.com/r2/api/s3/presigned-urls/`, `developers.cloudflare.com/r2/buckets/public-buckets/`, `developers.cloudflare.com/r2/buckets/cors/`.

## 3. Cloudflare R2 — What The Official Docs Actually Say

- R2 exposes an **S3-compatible REST API**. Any standard S3 SDK (this repo would use AWS SDK v3, `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`) works against R2 by pointing the client at R2's account-specific endpoint with an R2 API token (Access Key ID/Secret Access Key) — no Cloudflare Workers runtime is required; a normal Next.js Node server route can call it directly.
- **Presigned URLs**: generated server-side with `getSignedUrl(client, PutObjectCommand|GetObjectCommand, { expiresIn })`. Expiry ranges from 1 second to 7 days. Presigned URLs work only against the S3 API domain, **not** a custom domain. Multipart POST form uploads are unsupported (use PUT with a presigned URL instead). Cloudflare's own docs describe a presigned URL as a bearer token — anyone holding it can perform the action until it expires.
- **Public buckets are all-or-nothing.** Either via the `r2.dev` dev subdomain (rate-limited, dev-only) or a custom domain, making a bucket public exposes **every object in it** — R2 has no per-object ACL/privacy mechanism, and the docs explicitly warn that public access must be disabled before layering Zero Trust/WAF token auth, or the `r2.dev` subdomain bypasses those controls entirely.
- **CORS is required for any browser-direct upload/download** via presigned URLs — without a bucket CORS policy, a valid presigned URL still fails in-browser. A representative policy allows `PUT` with `Content-Type` from the app's own origin only.

This confirms, independently of local docs, exactly what `ARC-001` §12.1 already concluded in Chinese months ago ("不公開 bucket... 後端代理" — private bucket, backend-proxy pattern) and what `AUT-004`'s storage rules table already mandates (private buckets, short-TTL server-generated signed URLs, no persisted long-lived URLs). **The architecture decision was already correct before this research started; what was missing was choosing R2 over Supabase Storage, and doing the actual audit of current code.**

## 4. Current-State Audit — Nothing Is Actually Persisted Today

A dedicated code audit (this session) found **zero working storage backend anywhere in `src/`** — no Supabase Storage calls, no S3/R2 SDK usage, no filesystem writes, no base64-in-DB pattern. Specifically:

| Upload surface | What happens today |
|---|---|
| Work → "新增專案" file dropzone (`src/components/work/project/add-project-dialog.tsx:333-355`) | Real drag-and-drop + `<input type="file">` capture `File[]` in React state, but on submit only `file.name`/`file.type`/`file.size` are copied into an in-memory mock `FileAsset` (`toFileAsset`, lines 60-71) via `MODLIB-010`'s fix. **Byte content is never read or persisted.** `src/lib/ai/project-init.ts:23-24`'s `parseProjectDocuments(_files, ...)` ignores its `_files` argument entirely (unused-param prefix) and returns a fixed mock parse result. |
| AI Input File Library "上傳新檔案" button (`src/components/ai/file-library/file-library-page.tsx:305-334`) | Not wired to any file picker at all — `handleUpload()` fabricates a fake row using a random name from a hardcoded list and a hardcoded `size: 1_400_000`. |
| AI Input Media Library upload (`src/components/ai/media-library/media-library-page.tsx:127-165`) | Same fabrication pattern, no real file input exists anywhere under `src/components/ai/`. |

`prisma/schema.prisma` has **no `FileAsset`, `MediaAsset`, or `ProjectDeliverableFile` model** — `SourceAsset` (AI Input's ingestion model) has no storage fields at all, and is a different concept (external-reference metadata, not uploaded bytes — see `SCH-005` §5). `.env.example`/`package.json` have no storage SDK or credentials of any kind. The one existing backlog row that touches this (`AIINPUT-LIB-001`, `PLN-060` line 320, `TODO`, P2) already names the real gap ("real local upload input and SourceAsset-backed persistence path") but predates any provider decision.

## 5. Gap Analysis

| Need | Current state | Gap |
|---|---|---|
| A storage provider actually wired up | None | Full integration needed: SDK, credentials, bucket, presigned-URL BFF route |
| Schema to record what was uploaded and where | `ProjectDeliverableFile` proposed in `AUT-004` (unmigrated); nothing for library files | `SCH-005` (this session) extends the same shape to `FileAsset`/`MediaAsset` |
| Correct access-control model for mixed-visibility content | N/A | R2 public buckets are bucket-wide, not per-object (confirmed §3) — must use a **private** bucket with app-layer authorization, matching `ARC-033`'s existing `ownerId`-scoping pattern and `AUT-004`'s Client Portal token-scoping pattern |
| A real upload entry point | Three UI surfaces exist, none persist bytes | Needs a presigned-PUT flow wired to at least one surface first |
| Provider decision (Supabase Storage vs. R2) | Open in `AUT-004` line 179 | **Resolved this session: Cloudflare R2**, per direct owner instruction |

## 6. Recommended Architecture

Backend-proxy / presigned-URL pattern, exactly as `ARC-001` §12.1 already sketched and Cloudflare's own docs corroborate:

1. **One private R2 bucket** (or a small number, e.g. split by environment) — never a public bucket or `r2.dev` exposure for this system's content, since visibility is mixed (private owner files vs. future `CLIENT_VISIBLE` deliverables) and R2 cannot express per-object privacy.
2. **Upload**: client requests a presigned `PUT` URL from a Next.js server action/route handler that first runs `requireUser()` + the relevant ownership check (same pattern as every other Work/service boundary), generates a server-controlled `objectKey` (never client-supplied, to prevent path traversal/overwrite), calls R2's presigned-URL API with a short expiry, and returns the URL to the client for a direct browser `PUT`. The DB row (`FileAsset`/`MediaAsset`/`ProjectDeliverableFile`) is created referencing `bucket`+`objectKey` only — never a raw URL.
3. **Download**: same authorization check, then a fresh short-TTL (5-15 min, per `AUT-004`'s existing rule) presigned `GET` URL minted per request — never cached or persisted.
4. **CORS**: bucket CORS policy scoped to this app's actual origin(s), `PUT`/`GET` only, matching Cloudflare's documented pattern.
5. **Credentials**: R2 API token (Access Key ID/Secret) stored only in server-side env vars, never exposed to Client Components — same rule `AUT-004` already states for Supabase service-role keys.

## 7. Rejected Alternatives

- **Public R2 bucket with long-lived direct URLs.** Rejected — confirmed by Cloudflare's own docs to be bucket-wide, not selectively private; incompatible with this system's mixed-visibility content and `AUT-004`'s explicit "no public bucket for client deliverables" rule.
- **Supabase Storage instead of R2.** This was `AUT-004`'s actual open question; the owner resolved it directly this session in favor of R2. (Supabase Storage remains a reserved enum value in `SCH-005` in case a future need reintroduces it, e.g. tight RLS coupling for a specific asset class — not used today.)
- **Cloudflare Workers-based upload proxy.** Not needed — R2's S3-compatible API is directly callable from a normal Next.js server route; introducing a separate Workers deployment would add infrastructure this repo doesn't otherwise have (no existing Workers usage) for no benefit at this stage.
- **Storing signed/public URLs in Postgres as the source of truth.** Rejected, consistent with `AUT-004`'s existing rule — only `bucket`/`objectKey` persist; URLs are always generated fresh, server-side, per request.
- **base64-encoding files into Postgres columns.** Never seriously considered — would defeat the entire point of object storage and bloat the DB; not aligned with any existing doc's direction.

## 8. Risk Classification

This work touches **data persistence** and, downstream (once Client Portal deliverables are wired), **public output** — both named high-risk areas under `AGENTS.md` §11. Concretely:

- Creating an actual R2 bucket, generating a real API token, and setting real credentials in `.env.local`/deployment env is an **owner action outside this repo's automatable scope** — no code change can do this; it requires the owner's own Cloudflare account.
- Wiring the *first* real upload path (schema + presigned-URL route + one UI surface) is a normal implementation slice, not high-risk by itself, provided: private bucket only, server-generated object keys, `requireUser()` + ownership checks before every signed-URL mint, and no long-lived URLs persisted — i.e., building exactly what `AUT-004` and this document specify, nothing looser.
- Exposing any file link through `/client/[token]` (Client Portal) remains gated by `AUT-004`'s full checklist (audit event path, revocation behavior, scan status) and is **explicitly out of scope** for the first implementation stage — see `PLN-064` Stage 5.

## 9. Next Steps

See `docs/05_execution-plans/PLN-064_cloudflare-r2-storage-multi-stage-implementation-plan.md` for the staged execution plan (`R2STORE-001..0NN` in `PLN-060` Phase 17), starting with an owner action (Stage 0: real Cloudflare account/bucket/token) that this repo cannot perform on its own.

## 10. 2026-07-27 Formal-Mode Read/Hydration Addendum

### Trigger And Current Gap

The owner reported that AI Input's File Library and Media Library still show demo rows after the application is switched to formal mode, and asked for a truthful empty state plus the ability to upload the first real asset.

The code audit found that `R2STORE-004` and `R2STORE-005` implemented the write path but not the read/cutover path:

- `requestFileUpload` / `requestMediaUpload` create owner-scoped Postgres rows and presigned R2 upload URLs.
- `LibraryClassificationProvider` still initializes `fileAssets`, `mediaAssets`, and classification links from mock imports unconditionally.
- No protected Server Component or BFF loader reads `FileAsset` / `MediaAsset` rows back into the shared library provider.
- Consequently, formal mode leaks mock rows and a real uploaded row survives in Postgres/R2 but is not reconstructed after a page reload.

### Page Requirement Understanding Score

| Dimension | Score | Reason |
|---|---:|---|
| Actor/job clarity | 20/20 | The protected owner wants a truthful formal library and a first-upload path. |
| PRD/local evidence fit | 20/20 | `DATTR-023`, `RES-002`, `SCH-005`, `PLN-064`, and the existing storage actions all require explicit mock/formal separation. |
| Data/BFF/API clarity | 19/20 | Owner-scoped read services and storage metadata already exist; only a serializable read DTO and provider hydration are missing. |
| UI/reference-pattern confidence | 14/15 | Existing file/media empty states and mock toggle are reusable. |
| Risk/auth/public-output clarity | 13/15 | Protected owner reads are clear; Client Portal file exposure remains excluded. |
| Acceptance/verification clarity | 8/10 | Static/type/build proof is available; final authenticated upload/reload/download remains a browser proof. |
| **Total** | **94/100** | **High — three same-issue research rounds required and completed.** |

### Research Optimization Rounds

1. **Local product and code fit.** Selected separate mock and formal stores inside the existing shared provider. Rejected filtering mock rows by naming convention or clearing one shared array on toggle because either approach can contaminate or destroy the other mode's state.
2. **Data/BFF/auth boundary.** Selected an owner-scoped server-only library index loader called directly by the protected dashboard Server Component, followed by a serializable mapper DTO. Rejected client-side Prisma/R2 imports, a data-fetching Server Action, and a same-app Route Handler round trip.
3. **Acceptance and failure-state split.** Selected three explicit states: Mock demo rows, Formal real rows (including a valid empty array), and Formal unavailable. Rejected falling back to mock rows when the DB read fails because that would recreate the original misleading behavior.

### Selected Implementation Shape (`R2STORE-009`)

- Scope: owner-scoped `FileAsset` / `MediaAsset` read DTO, dashboard-layout hydration, separate mock/formal provider stores and classification links, honest formal empty/unavailable states, stable reconstruction of uploaded assets after reload.
- Acceptance:
  - Formal mode never renders `mockFileAssets`, `mockMediaAssets`, or mock classification links.
  - A profile with zero persisted assets sees zero counts and an upload-first empty state.
  - A successful real upload appears immediately and is reconstructed from Postgres after reload.
  - A DB read failure renders an unavailable state and never falls back to mock rows.
  - Mock mode retains the intentional demo dataset.
- Likely files: `src/app/(dashboard)/layout.tsx`, `src/lib/services/storage.service.ts` or a dedicated library-index service, a mapper/DTO file, `src/lib/context/library-classification-context.tsx`, File/Media Library components, and task/acceptance/evidence memory.
- Verification: targeted checker/lint, `pnpm exec tsc --noEmit --pretty false`, `pnpm db:validate`, `pnpm build`, and authenticated browser toggle/upload/reload/download proof when the session is available.
- Risks and stop conditions: no schema/migration, Client Portal/public output, cross-owner query, external agent access, or mock fallback is allowed. Stop if the required read path would broaden authorization or expose bucket/object-key data outside the protected owner Client Component boundary.

### NANDA / Agent Protocol Gate

This slice is within AI Input, so `ARC-028` was reviewed. It does not create, change, route, expose, or register an agent capability. Agent identity/provider/endpoints/protocols/capabilities/skills/auth/trust/observability/registry fields remain unchanged; `externalRegisterable` remains `false`. The concrete artifact is the executable `R2STORE-009` protected read/cutover task and its verification evidence, not a new agent manifest.
