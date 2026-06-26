# Client Portal Public BFF Contract

**Document ID:** `ARC-025`
**Last updated:** 2026-06-21
**Status:** Active gated implementation

## Purpose

`/client/[token]` is public output. It must never behave like an owner dashboard route and must never fall back to mock data, token-derived content, raw Prisma records, or optimistic public rendering.

Loop 13 implements `CLIENT-001` as a gated DB-backed Backend-for-Frontend contract. The loader can render persisted Work data only when the explicit runtime gate is enabled and every token and visibility check passes. By default it remains fail-closed through the existing unavailable/noindex route boundary.

Loop 17 implements `CLIENT-003` as a protected readiness contract for Client Portal launch hardening. It does not change public rendering. Instead, admin/settings now read a server-only `ClientPortalReadinessContract` that makes token lifecycle, audit, storage/file URL, schema, and real DB smoke gates explicit before any client link is treated as launch-ready.

Loop 21 implements `CLIENT-004` as a proposal-only token schema and hashing contract. `DBS-004_client-portal-token-schema-contract.md` is now the source of truth for the selector/verifier token shape, HMAC digest storage, key id, uniqueness/index behavior, revoke/rotate/last-access metadata, audit relation, and migration/backfill path. No Prisma schema change, migration, token lifecycle write, or public output expansion was added.

Loop 22 implements `CLIENT-006` as a proposal-only public storage and file URL policy. `AUT-004_client-portal-public-storage-policy.md` is now the source of truth for private-bucket defaults, server-side signed URL BFF requirements, TTL/caching/revocation behavior, file metadata, audit expectations, and rejected leak paths. No storage bucket change, signed URL runtime, upload runtime, schema change, or public file output was added.

## Contract

```txt
/client/[token] Server Component
  -> connection()
  -> getClientPortalViewByToken(token)
  -> PERSONAL_OS_ENABLE_CLIENT_PORTAL_DB === "1"
  -> token format validation
  -> Project.clientToken match
  -> Project.visibility = CLIENT_VISIBLE
  -> ProjectTask.visibility = CLIENT_VISIBLE
  -> ProjectDeliverable.visibility = CLIENT_VISIBLE
  -> UI-safe ClientPortalView DTO
  -> render public page or notFound()
```

Implementation files:

- `src/app/client/[token]/page.tsx`
- `src/app/client/[token]/not-found.tsx`
- `src/lib/services/client-portal.service.ts`
- `src/lib/services/client-portal-readiness.service.ts`

## Runtime Gate

The service returns `disabled` unless `PERSONAL_OS_ENABLE_CLIENT_PORTAL_DB` is exactly `1`.

All non-ready states are rendered as `notFound()`:

- `disabled`
- `invalid_token`
- `not_found`
- `unavailable`

This means the current launch default is still public-safe unavailable/noindex output. A production operator must intentionally enable the gate after DB connectivity, token records, visibility rules, and public storage boundaries are reviewed.

## Public DTO Rules

The public DTO may include:

- Project name, client name, description, status, phase, health, due date, updated date, and derived progress.
- Client-visible task title, status, priority, due date, and completed date.
- Client-visible deliverable title, description, type, status, and delivered date.
- A boundary object that states notes, internal records, and file URLs are excluded.

The public DTO must not include:

- `ownerId`, `projectId`, task IDs, deliverable IDs, note IDs, profile IDs, or other internal record IDs.
- `clientToken`.
- Internal notes.
- Internal tasks or deliverables.
- `fileUrl` or storage URLs.
- Raw Prisma rows or adapter payloads.
- Mock project/task/deliverable data.

## Query Rules

- Token format must pass a conservative allowlist before any DB query.
- The DB query must match both `clientToken` and `Project.visibility = CLIENT_VISIBLE`.
- The DB query uses `take: 2`; any duplicate token state fails closed instead of selecting the first match.
- Tasks and deliverables are filtered inside the query by `visibility = CLIENT_VISIBLE`.
- Notes are intentionally not queried in this version.
- DB errors are hidden from the public user and return the unavailable boundary.

## CLIENT-003 Readiness Contract

`src/lib/services/client-portal-readiness.service.ts` exports a server-only `ClientPortalReadinessContract`.

The contract is rendered only in protected owner/admin surfaces:

- `/admin` renders the full Client Portal launch hardening table.
- `/settings` renders the owner-facing summary.

The contract exposes only UI-safe readiness signals:

- Whether `PERSONAL_OS_ENABLE_CLIENT_PORTAL_DB` is enabled.
- Whether the public route currently fails closed or allows DB-backed rendering.
- Which public DTO and unavailable-state guards already exist.
- Which schema/lifecycle/audit/storage gates remain incomplete.
- Follow-up task labels for token actions, real DB smoke, and remaining launch proof work.

The contract must not expose:

- Real client token values.
- Project IDs, owner IDs, profile IDs, raw Prisma rows, file URLs, storage URLs, database URLs, hostnames, cookies, provider payloads, or secrets.
- Public route debug details that would let a caller distinguish invalid, missing, duplicate, disabled, or DB-unavailable token states.

Current token hardening state:

| Gate | State |
|---|---|
| Public output | Still fail-closed unless `PERSONAL_OS_ENABLE_CLIENT_PORTAL_DB=1` and all DB/token/visibility checks pass |
| Token lookup | Token format allowlist, project visibility filter, task/deliverable visibility filter, duplicate fail-closed guard |
| Token storage | `Project.clientToken` is nullable plain text at runtime; `DBS-004` now proposes selector/verifier plus HMAC token rows, key id, status, revoked/rotated/last-accessed metadata, audit relation, and unique/index behavior |
| Rotation/revoke | Not implemented |
| Access audit | Not persisted |
| File URLs | Excluded from public DTO; `AUT-004` reviewed private-bucket, signed URL BFF, short TTL, no-store, revocation, and audit policy before any file link can render |

Follow-up task split:

- `CLIENT-004`: Client Portal token schema and hashing proposal. Done in `DBS-004`; runtime still pending.
- `CLIENT-005`: Owner token rotate/revoke BFF actions with audit contract.
- `CLIENT-006`: Public storage and file URL review. Done in `AUT-004`; runtime still excluded.
- `CLIENT-007`: Real DB client-token smoke when env is reachable.

## Research Basis

Local references reviewed:

- Next.js 16 route handlers and Backend-for-Frontend docs under `node_modules/next/dist/docs/`.
- Next.js 16 authentication/DAL guidance under `node_modules/next/dist/docs/01-app/02-guides/authentication.md`.
- Next.js `notFound()` and `connection()` docs under `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/`.
- Existing Work service and mapper boundaries in `src/lib/services/project.service.ts` and `src/lib/mappers/work.mapper.ts`.

External security references reviewed:

- [OWASP Insecure Direct Object Reference Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [Supabase Storage serving assets](https://supabase.com/docs/guides/storage/serving/downloads)

Selected pattern: a server-only BFF service returns a narrow DTO after scoped DB filtering. The public Server Component renders only that DTO and maps all failure states to `notFound()`.

Rejected alternatives:

- Render mock fallback while DB is unavailable.
- Treat token text as a project selector without DB validation.
- Expose notes or file URLs in the first DB-backed slice.
- Enable DB-backed rendering without an explicit env gate.
- Accept duplicate token matches by rendering the first row.

## Acceptance

- `src/lib/services/client-portal.service.ts` stays server-only.
- `/client/[token]` remains request-time dynamic and noindex.
- Default env state fails closed.
- When enabled, only persisted Work records passing token and visibility checks can render.
- Public output excludes internal IDs, token, notes, file URLs, and raw records.
- No schema change, migration, token rotation action, revoke action, storage URL review, or public write was added in `CLIENT-001`.
- `CLIENT-003` adds a protected server-only readiness contract and does not enable public output, public writes, token lifecycle writes, schema changes, migrations, seeds, or storage URL rendering.
- `CLIENT-004` adds `DBS-004` and updates protected readiness signals only. It does not add token lifecycle writes, schema changes, migrations, seeds, public output expansion, production DB mutation, or storage URL rendering.
- `CLIENT-006` adds `AUT-004` and updates protected readiness signals only. It does not add storage bucket changes, signed URL runtime, upload runtime, public file links, schema changes, migrations, seeds, production DB mutation, or public output expansion.

## Follow-up

- `CLIENT-005`: add owner token generate/rotate/revoke/readiness actions only after `DBS-004` approval, service-layer project ownership checks, migration review, and audit contract.
- `CLIENT-007`: run a real DB/token smoke once `pnpm launch:check` is ready or a disposable DB is available.
