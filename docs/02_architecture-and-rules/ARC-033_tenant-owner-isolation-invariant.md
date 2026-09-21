# Tenant/Owner Isolation Invariant

**Document ID:** `ARC-033`
**Task:** `TENANT-001`
**Last updated:** 2026-07-17
**Status:** Active — audit of current services, one schema-only gap closed

---

## 2026-07-27 Forward Compatibility Note

`RES-026` introduces a future workspace-membership and project-capability model because the owner now explicitly requires shared team projects. This does not weaken the current invariant or create a role bypass:

- current runtime remains exact `ownerId === profileId`;
- future collaboration must replace that check through a server-only, deny-by-default membership/capability resolver;
- global `OWNER | PARTNER | CLIENT` roles must not grant project access;
- the current invariant may be retired only after `SCH-006` backfill, dual-read proof, cross-workspace negative tests, and service cutover are complete.

## Purpose

Make explicit and enforceable the isolation rule that `docs/07_research-and-design/RES-020_multi-tenant-team-workspace-isolation-research.md` found already holds informally: **every DB-backed service must scope every read and write by the current session's own `ownerId` (directly, or via a verified parent chain), with no role-based bypass.** Until this document, that rule was a pattern services happened to follow, not something written down or checked. This matters concretely now that a second real person (`lilyzuo405@gmail.com`) has a `Profile` row in the same production database as the owner's (`taioliver688@gmail.com`).

## The Rule

For any Prisma model reachable from a `Profile` (directly via an `ownerId`/`profileId` FK, or transitively through a parent model that itself carries one):

1. Every read query must filter by `ownerId: currentUser.id` (or the equivalent parent-chain check) — never an unscoped `findMany`/`findFirst` outside of a public token-scoped route (see Exception below).
2. Every write (create/update/delete) must first call an `assertCanAccessX`-style check that throws `UnauthorizedError`/`NotFoundError` unless the target row's `ownerId` (or its parent's) exactly equals `currentUser.id`.
3. No role value (`OWNER`, `PARTNER`, `CLIENT`) may be used as a bypass for step 1 or 2. Roles gate *which modules/UI render* (`module-permission.service.ts`) and, in the future, may gate *actions within a person's own tenant* — they are never a cross-person visibility grant.
4. A model with no `ownerId`/tenant path at all (a global reference table) must be treated as **shared across every tenant** and must not carry person-specific or private fields. If it does, it needs an owner relation before it is safe to read/write from more than one person's session (see Finding, below).

**Exception:** Client Portal (`client-portal.service.ts`) is intentionally not `ownerId`-scoped — the unique `clientToken` itself is the capability boundary for that one public, unauthenticated route. This is correct and is not a violation of the rule.

## Audit: Current DB-Backed Services

| Service | Compliant? | Evidence |
|---|---|---|
| `src/lib/services/project.service.ts` | Yes | `assertCanAccessProject(profileId, projectId)` throws unless `project.ownerId === profileId`; every read/write (`getProjectsForProfile`, `getProjectDetailForProfile`, `createTaskForProject`, `getTaskForProfile`, `getNoteForProfile`, `getDeliverableForProfile`, …) routes through this check or the equivalent parent-chain check (`task.project.ownerId !== profileId`, `note.project.ownerId !== profileId`, `deliverable.project.ownerId !== profileId`). No role-based bypass exists anywhere in the file. |
| `src/lib/services/client-portal.service.ts` | Yes (exception case) | `getClientPortalViewByToken` scopes its one `db.project.findMany` by unique `clientToken` + `visibility: CLIENT_VISIBLE` — the token is the capability, not `ownerId`. Correct for a public route. |
| `src/lib/services/module-permission.service.ts` | Yes | `getPermissionRowsForProfile`/`getModulePermissionSnapshotForProfile` scope by `profileId` throughout. |
| `src/lib/services/admin-readiness.service.ts` | Yes | Every profile-scoped read found uses `auth.user.id` (the current session's own resolved profile), not an unscoped or cross-profile query. No admin-wide/global data read exists. |
| `src/lib/services/auth.service.ts` | N/A (identity resolution, not tenant-scoped data) | `resolveSupabaseCurrentUser`/`resolveMockCurrentUser` look up exactly one `Profile` by the authenticated email; generic per-email, not hardcoded to a single owner. |
| Research services (`research-owner-read-*.service.ts`) | N/A — not DB-backed yet | Confirmed via `AGENTS.md` §8 and `DBS-003`: Research remains mock/state. The rule applies the moment any of these gets a real `prisma.researchThread.findMany` (already gated behind `RESEARCH-BFF-011..017`'s explicit runtime-readiness chain, which itself already encodes an owner-scope predicate consistent with this rule). |
| AI Input Source Workflow services | N/A — formal-mode cutover not complete | `DATTR-024` remains the gating task; when it lands, its services must be audited against this rule before formal-mode reads/writes are enabled. |

**Grep confirmation:** searched the full `src/` tree for `role === "OWNER"` (and case variants) used as an access-control condition. No result is a cross-profile bypass — the only matches are `toClientRole()`'s label mapping in `module-permission.service.ts`, which does not gate data access.

## Finding Closed: `AcademicPerson` Had No Owner Scope

Before this document, `AcademicPerson` (`prisma/schema.prisma`) was a fully global model — no `ownerId`, no tenant path, and no code marks it as intentionally shared reference data either. It stores fields like `relevanceToMyResearch` and `conversationAngles`, which read as person-specific research notes, not neutral public facts. This was already flagged independently in `src/lib/contracts/research-owner-read-adapter-authz.contract.ts` (`people` family: `"Blocked until AcademicPerson separates public person metadata from owner-private relationship notes or receives an owner relation"`) and `research-owner-read-query-plan.contract.ts` — both written before this document, both correctly refusing to mark the `people` family runtime-eligible for exactly this reason.

**Resolution:** `AcademicPerson` now has an optional `ownerId -> Profile` relation in `prisma/schema.prisma`, nullable pending `TENANT-003`'s reviewed migration and backfill (see `RES-020`, `SCH-004`). This is a schema-only change — no migration was applied to the live database, and Research remains mock/state, so there is no runtime behavior change. Both contract files above were updated to reflect the new schema state while still correctly reporting the `people` family as not runtime-eligible until the migration lands.

## What This Document Does Not Do

- It does not apply any migration. `AcademicPerson.ownerId` exists in `prisma/schema.prisma` only; the live database is unchanged until `TENANT-003`.
- It does not add RLS. That is `TENANT-004`.
- It does not audit AI Input or Research services beyond confirming they are not yet DB-backed — re-audit each against this rule at the point it goes DB-backed, not before.

## Related Files

- `docs/07_research-and-design/RES-020_multi-tenant-team-workspace-isolation-research.md`
- `docs/02_architecture-and-rules/SCH-004_tenant-workspace-schema-proposal.md`
- `docs/02_architecture-and-rules/AUT-002_auth-runtime-strategy.md`
- `docs/02_architecture-and-rules/AUT-005_owner-demo-account-boundary.md`
- `docs/02_architecture-and-rules/DBS-001_database-contract.md`
- `src/lib/services/project.service.ts`
- `prisma/schema.prisma`
- `src/lib/contracts/research-owner-read-adapter-authz.contract.ts`
- `src/lib/contracts/research-owner-read-query-plan.contract.ts`
