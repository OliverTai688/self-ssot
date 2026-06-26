# Admin And Settings Audit BFF Contract

**Document ID:** `ARC-026`
**Last updated:** 2026-06-20
**Status:** Active read-only contract

## Purpose

`ADMIN-002` defines the shared read-only Backend-for-Frontend contract for the protected admin/operator console and owner settings page.

The goal is to make launch readiness, permission source, auth status, and evidence visibility consistent across `/admin` and `/settings` without adding high-risk writes, permission mutation, audit persistence, deployment mutation, production environment editing, seed, or migration behavior.

## Contract

```txt
Protected dashboard route
  -> server layout auth check
  -> Server Component page
  -> server-only admin readiness service
  -> resolveCurrentUser()
  -> ModulePermissionSnapshot
  -> loop-state/report file references
  -> env presence checks without values
  -> UI-safe AdminAuditBffContract DTO
```

Runtime files:

- `src/lib/services/admin-readiness.service.ts`
- `src/app/(dashboard)/admin/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`

## DTO Rules

`AdminAuditBffContract` may expose:

- Contract id and read-only status.
- Auth readiness status and whether Supabase public config is present.
- Module permission source, enabled/hidden counts, DB row count, and unknown-row count.
- Relative evidence report path and count.
- Next recommended task from loop state.
- Write boundaries and future gates.

`AdminAuditBffContract` must not expose:

- Supabase URLs or keys.
- Database URLs, database hostnames, cookies, tokens, raw claims, raw provider payloads, or raw env values.
- Internal profile IDs.
- Raw `UserModulePermission` rows.
- Generated report bodies through a public route.
- Any mutation endpoint or form action.

## Current Decision

`src/lib/services/admin-readiness.service.ts` is now explicitly server-only and exports `buildAdminAuditBffContract()`.

`/admin` renders the full contract table for operator review.

`/settings` renders the same contract as an owner-facing summary so member settings and admin readiness do not drift.

The contract is not persisted. It is a shared read model over current runtime readiness and generated evidence files.

## Research Basis

Local references reviewed:

- Next.js 16 Backend-for-Frontend guide: route/backend surfaces must avoid sensitive error output and implement auth/authorization when exposed.
- Next.js 16 authentication guide: authorization decisions should protect routes and data access.
- `AUT-003_module-permission-source.md`: module visibility is a UI/readiness snapshot, not service-layer authorization.
- `ACC-002_module-acceptance-criteria.md`: admin stays read-only until an explicit BFF contract exists.

External references reviewed:

- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [OWASP Top 10 A09 Security Logging and Monitoring Failures](https://owasp.org/Top10/2021/A09_2021-Security_Logging_and_Monitoring_Failures/)
- [OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)

Selected pattern: expose a narrow server-only readiness DTO now; defer append-only or tamper-resistant audit persistence until schema, retention, authorization, and event taxonomy are reviewed.

Rejected alternatives:

- Add permission writes in the same slice.
- Persist audit records without schema and retention review.
- Render raw generated report bodies in the app.
- Expose environment values for debugging.
- Treat module visibility controls as authorization.

## Acceptance

- `/admin` and `/settings` use the shared `AdminAuditBffContract` DTO.
- The contract remains read-only and server-only.
- Admin/settings display auth, permission, loop evidence, and write-boundary state consistently.
- No user management, permission write, env mutation, deployment write, connector sync, audit persistence, Prisma schema change, migration, seed, or production DB mutation is added.
- Future persisted audit records require a separate reviewed task.

## Follow-Up

- Define append-only audit schema only after loop 15 launch-level review.
- Decide event taxonomy for auth failures, permission writes, public sharing, deployment checks, and high-risk module actions.
- Add retention and access rules before storing generated readiness/audit records in PostgreSQL.
