# Multi-Tenant Team Workspace Isolation Research

**Document ID:** `RES-020`
**Last updated:** 2026-07-17
**Status:** Research / design — no schema migration applied
**Trigger:** Owner-directed request: "幫我規劃成多租戶，我想要我的團隊每人有一個這個系統" (plan this into multi-tenant; I want each team member to have their own instance of this system). Owner selected **fully independent tenants** (option: 完全獨立租戶) over a shared team workspace or a hybrid model, in response to a direct clarifying question. This followed a same-session task provisioning `taioliver688@gmail.com` (OWNER) and `lilyzuo405@gmail.com` (PARTNER) as real `Profile` rows against the live Supabase-targeted database via a new `pnpm profiles:provision-team` script (see `docs/06_audits-and-reports/RPT-007_completed-log.md` for that task's evidence).

---

## 2026-07-27 Owner-Direction Supersession Notice

The owner has now explicitly requested shared team workspaces, multi-workspace switching, personal-to-team project transfer, email invitations, project roles, and collaborator feedback that can become governed AI knowledge.

Therefore:

- this document remains the historical audit of the current exact-`ownerId` runtime;
- its decision to reject shared workspaces and `TenantMembership` is superseded;
- do not implement its `Profile.tenantId`/one-Profile-one-Tenant direction;
- use `RES-026_team-workspace-project-collaboration-and-ai-feedback-memory-research.md`, `SCH-006`, `AUT-008`, and `PLN-066` for the current product direction.

Current runtime authorization remains exact-owner and fail-closed until the new workspace membership capability resolver, migration proof, and negative authorization tests are implemented.

## 1. Purpose

Determine what "multi-tenant, each team member has their own fully isolated instance" actually requires in this codebase, given the system is currently documented (`AUT-005`, `DBS-001`, module boundary table in `AGENTS.md` §8) as a single-owner, role-based system (`OWNER | PARTNER | CLIENT`) with no `Tenant`/`Organization` concept and no Row-Level Security. This document audits the **actual current isolation behavior** (not just the documented intent), then proposes the smallest architecture that delivers real per-person data isolation without building capability nobody asked for yet.

## 2. Source Basis

Local docs and code reviewed:

- `AGENTS.md` §8 (Module Boundaries) — confirms only Work is DB-backed today; Research/AI Input are mock/state; Life/Finance/Chamber/Company have no DB models at all.
- `docs/02_architecture-and-rules/AUT-002_auth-runtime-strategy.md`, `AUT-005_owner-demo-account-boundary.md` — current auth runtime resolves one `Profile` by exact email via Supabase claims; explicitly rejects auto-provisioning a `Profile` from claims ("owner policy" must gate it); frames the system around "one real owner account."
- `docs/02_architecture-and-rules/DBS-001_database-contract.md` — **"Do not claim RLS protection until the runtime auth strategy is designed and tested."** App-layer authorization (`requireUser()`, service-level ownership checks) is the only enforced boundary today; Postgres RLS is not active.
- `prisma/schema.prisma` — 23 models; every data-bearing model (`Project`, `ResearchThread`, `SourceAsset`, `AIWorkflowRun`, `ModuleWriteIntent`, etc.) already carries an `ownerId` FK to `Profile`, directly or via a parent chain (e.g. `ProjectTask.projectId -> Project.ownerId`). No `Tenant`/`Organization` model exists. One exception found: `AcademicPerson` (research-contact reference data) has **no owner/tenant field at all** — see Finding 4.
- `src/lib/services/project.service.ts` — read in full. `assertCanAccessProject(profileId, projectId)` throws `UnauthorizedError` unless `project.ownerId === profileId`, with **no role-based bypass** — an `OWNER`-role profile does not see another profile's projects. Every read/write path (`getProjectsForProfile`, `getProjectDetailForProfile`, `createTaskForProject`, `getTaskForProfile`, `getNoteForProfile`, `getDeliverableForProfile`, …) routes through this same exact-match check or an equivalent `project.ownerId !== profileId` guard on the parent chain.
- `src/lib/services/client-portal.service.ts` — the one other DB `findMany` on `Project` is scoped by unique `clientToken` + `visibility: CLIENT_VISIBLE`, not by owner — correct, since the token itself is the public capability boundary.
- `src/lib/services/module-permission.service.ts` — per-profile module enable/disable, already scoped by `profileId`.
- `src/lib/services/admin-readiness.service.ts` — grepped for cross-profile reads; every profile-scoped read found uses `auth.user.id` (the current session's own id), not an unscoped or admin-wide query.
- Grepped the full `src/` tree for `role === "OWNER"` (or equivalent) used as a cross-profile access bypass: **none found.** No code path today grants one `Profile` visibility into another `Profile`'s owned rows.

## 3. Current-State Audit: Isolation Already Exists, Informally

This is the load-bearing finding of this document.

**Today, for the one operational DB-backed module (Work), per-person data isolation already exists at the service layer.** `assertCanAccessProject` and its siblings check `ownerId === profileId` with no exception. Provisioning `lilyzuo405@gmail.com` as a second real `Profile` earlier this session did **not** create a data leak: once she signs in, `getProjectsForProfile(lilyProfileId)` returns only projects where `ownerId = lilyProfileId` — zero of Oliver's projects, by construction, not by coincidence.

This reframes the request. "Multi-tenant, each person has their own instance" is not starting from zero — it is starting from **row-level isolation that already works for Work, enforced only by convention/code review, not by an explicit `Tenant` concept, not by a documented invariant, and not audited across every current or future service.** The actual gaps are:

| # | Gap | Why it matters | Severity |
|---|---|---|---|
| 1 | No documented, enforced **tenant isolation invariant**. `ownerId`-scoping is a pattern every service *happens* to follow, not a rule anything checks or fails loudly on. A future service (AI Input, Research, once DB-backed) could ship an unscoped `findMany` and nobody would notice until it leaked cross-person data. | The exact failure mode `AUT-005`/`DBS-001` already worry about for auth, now extended to every future DB-backed service. | HIGH |
| 2 | No Row-Level Security. Isolation is 100% app-layer. One missed `where: { ownerId }` in one query is a full cross-person data leak, with no second layer to catch it. `DBS-001` already flags this as unresolved even for the single-owner case; it is materially more urgent now that a second real person's private data (Work notes, tasks, deliverables) lives in the same tables. | Defense-in-depth gap, now with real stakes. | HIGH |
| 3 | `AcademicPerson` (research reference data) has no `ownerId`/`tenantId` field at all — it is implicitly global/shared. If Research ever becomes DB-backed (`DBS-003`), every profile would see every other profile's academic contacts by default, contradicting "fully independent." | Pre-existing gap, invisible until Research goes DB-backed; must be fixed before that migration, not after. | MEDIUM (latent) |
| 4 | `PARTNER`/`CLIENT` roles are currently **inert for cross-owner access** — they gate which modules render (`module-permission.service.ts`) but grant no access to another profile's rows. Provisioning Lily as `PARTNER` today does not make her a collaborator on Oliver's projects; it gives her her own empty Work module. If the product intent for `PARTNER` was ever "can see the owner's data," that capability does not exist and was never built. | Naming/expectation mismatch the owner should be aware of before assuming today's `PARTNER` role does anything cross-owner. | MEDIUM (product clarity) |
| 5 | No self-serve or admin-driven onboarding flow. New team members require a manual script run against production (`pnpm profiles:provision-team`, added this session) plus a manual Supabase Dashboard invite. Fine for 2 people; does not scale past a handful without becoming risky/error-prone. | Operational gap, not a data-safety gap. | LOW (for now) |
| 6 | No `Tenant`/workspace identity to hang naming, branding, settings, or lifecycle (suspend/offboard a team member's whole workspace) on. `Profile` currently conflates "the person" with "their entire data boundary." | Limits future product surface (workspace settings, per-workspace branding, clean offboarding) even though row isolation itself doesn't strictly require it yet. | LOW (for now) |

## 4. Recommended Standard

Reject a heavy day-one migration (new `Tenant` table + `tenantId` backfilled onto all 23 models + RLS policies + invite service, in one pass). That is over-building for two people whose isolation already works, and it is exactly the kind of "design for hypothetical future requirements" `AGENTS.md` warns against. Instead, phase by actual leverage:

### Phase 1 — Make the existing isolation invariant explicit and audited (no schema change)
Formalize "every DB-backed service must scope every read/write by `ownerId` (directly or via parent chain) with no role-based bypass" as a written architecture rule (this document + an `ARC` cross-reference), and audit every current DB-backed service against it. **Confirmed compliant today:** `project.service.ts`, `client-portal.service.ts`, `module-permission.service.ts`, `admin-readiness.service.ts`'s profile-scoped reads. **Not yet applicable:** AI Input / Research services, which are not DB-backed yet (`DBS-003`, `AGENTS.md` §8) — the rule must gate their eventual migration, not retrofit code that doesn't touch the DB. This phase also fixes Finding 4 by adding an `ownerId` field to `AcademicPerson` now, before Research ever goes DB-backed and before the gap becomes an actual cross-profile leak.

### Phase 2 — Introduce an explicit `Tenant` identity (schema addition, no behavior change to isolation)
Add a `Tenant` model and `Profile.tenantId` (one tenant per profile for now — see §6 for why a `TenantMembership` many-to-many is explicitly rejected at this stage). This does **not** change how row isolation works (still `ownerId`-based); it gives the system a first-class place to hang workspace naming, per-tenant settings, and future admin actions (suspend/offboard), and is the anchor `AUT-005`'s eventual `AUT-008` tenant-aware auth runtime addendum would build on. See `docs/02_architecture-and-rules/SCH-004_tenant-workspace-schema-proposal.md` (companion artifact to this document) for the concrete proposed Prisma model — **proposal only, not migrated**, per `DBS-001`'s "Required Before DB Changes" gate (migration impact note, seed impact note, rollback note all still owed before this is applied).

### Phase 3 — Row-Level Security as defense-in-depth
Once `Tenant`/`tenantId` exists, add Supabase Postgres RLS policies mirroring the app-layer `ownerId`/`tenantId` checks, so a bug in application code cannot alone cause a cross-person leak. This directly resolves `DBS-001`'s standing "do not claim RLS protection" caveat, scoped specifically to tenant isolation.

### Phase 4 — Formal onboarding flow
Replace the manual `pnpm profiles:provision-team` + manual Supabase Dashboard invite with an owner-only admin action (new `Tenant` + `Profile` + Supabase invite, in one authorized flow), once Phase 2 exists to provision *into*.

### Explicitly out of scope unless a real need appears
Cross-tenant collaboration (one profile with access into another profile's tenant), a tenant switcher UI, and self-serve signup are **not** part of this plan. They would require a `TenantMembership` many-to-many and meaningfully more auth-runtime complexity for a need nobody has stated. `AGENTS.md`'s "don't design for hypothetical future requirements" applies directly here.

## 5. What "Each Team Member Has Their Own Instance" Means Concretely, Post-Phase-2

- One shared deployment, one shared Supabase project/database (not N separate deployments — rejected in §6).
- Every `Profile` belongs to exactly one `Tenant`.
- Every tenant-scoped row is reachable only through that tenant's own `Profile.id` (today) / `tenantId` (after Phase 2), with no code path granting cross-tenant visibility.
- `OWNER`/`PARTNER`/`CLIENT` roles remain meaningful **within** a person's own tenant (e.g. Oliver could later grant a `CLIENT`-role Profile visibility scoped to his own tenant only) — they are not a cross-tenant sharing mechanism and this document does not make them one.
- Onboarding a new team member creates a new empty `Tenant` + `Profile` (role `OWNER` of their own tenant), not a new row inside an existing tenant.

## 6. Rejected Alternatives

- **Separate deployments per team member (separate Supabase projects/hosting).** Rejected: multiplies ops/cost/maintenance per person, loses shared codebase evolution and any future cross-tenant admin visibility, and is not what "multi-tenant" (the owner's own term) means. Only worth revisiting if data-residency or billing-isolation requirements appear later.
- **Shared team workspace (current `OWNER`/`PARTNER`/`CLIENT` model, formalized as one tenant).** Rejected by the owner directly in the clarifying question for this document — explicit "完全獨立租戶" (fully independent tenant) choice.
- **`tenantId` denormalized onto all 23 models on day one.** Rejected for now: since every model already chains back to `ownerId -> Profile`, and Phase 2 gives `Profile` exactly one `tenantId`, per-row tenant isolation is already derivable transitively with zero additional columns. Denormalizing `tenantId` onto every child table only becomes worth its migration cost when RLS policies need a direct (non-join) column to filter on (Phase 3) — deferred to that phase, and only for the models RLS actually needs it on, not all 23 preemptively.
- **`TenantMembership` many-to-many from day one.** Rejected: no stated need for one person to belong to multiple tenants or for cross-tenant collaboration exists yet; a direct `Profile.tenantId` FK is simpler, matches the "fully independent" requirement exactly, and does not block adding a membership table later if a real need appears.
- **Auto-provisioning a `Tenant`/`Profile` from first Supabase sign-in (self-serve).** Rejected: `AUT-005` already rejected auto-provisioning `Profile` from claims pending owner policy review; multi-tenant onboarding inherits the same caution — Phase 4's owner-only invite flow is the safer near-term shape.

## 7. Executable Task Shape

| Task id | Title | Module | Scope | Acceptance criteria | Files likely affected | Verification | Risks / stop conditions |
|---|---|---|---|---|---|---|---|
| `TENANT-001` | Document and audit the tenant/owner isolation invariant | Architecture / Auth | Add the "every DB-backed service scopes by `ownerId`/`tenantId`, no role bypass" rule to an `ARC` doc; audit all current DB-backed services against it (`project.service.ts` confirmed compliant this session); add `ownerId` to `AcademicPerson` | Rule is documented and cross-referenced from `AUT-002`/`AUT-005`/`DBS-001`; `AcademicPerson.ownerId` exists and is backfillable; no service found in violation, or violations are listed as follow-up rows | New/updated `ARC-*` doc, `prisma/schema.prisma` (`AcademicPerson` only), `PLN-060`, `PLN-061` | `pnpm db:validate`, `pnpm exec tsc --noEmit --pretty false`, docs review | Docs + one narrow additive schema field; no migration applied without a reviewed migration-impact note per `DBS-001`. |
| `TENANT-002` | Author `SCH-004` Tenant/Profile schema proposal | Database / Architecture | Concrete `Tenant` model + `Profile.tenantId` proposal (this document's companion artifact) | `SCH-004` exists with proposed Prisma model, migration-impact note, seed-impact note, rollback note, per `DBS-001` | `docs/02_architecture-and-rules/SCH-004_tenant-workspace-schema-proposal.md` | Docs review | Proposal only — do not migrate until `TENANT-001` audit is clean and owner approves. |
| `TENANT-003` | Apply `Tenant`/`Profile.tenantId` migration and backfill | Database | Create `Tenant` row for existing data (owner's tenant), create a second `Tenant` for `lilyzuo405@gmail.com`, backfill `Profile.tenantId`, add `NOT NULL` | Migration applies cleanly on disposable DB first; both current profiles end up in correct, separate tenants; `pnpm db:seed` still idempotent | `prisma/schema.prisma`, `prisma/migrations/*`, `scripts/provision-team-profiles.ts` | `pnpm db:validate`, `pnpm db:generate`, disposable-DB migrate + seed dry run, `pnpm build` | High risk: real production data migration. Requires disposable-DB rehearsal first per `DBS-001`; requires explicit owner go-ahead before running against the live Supabase target. |
| `TENANT-004` | Add Postgres RLS policies mirroring tenant isolation | Database / Security | RLS policy per tenant-scoped table matching existing app-layer checks | Policies verified on disposable DB with two seeded tenants; cross-tenant `SELECT` denied at the DB layer even if app-layer check is bypassed in a test | `supabase/migrations/*`, `DBS-001` | Disposable-DB RLS test (seed two tenants, attempt cross-tenant read as each), `pnpm db:validate` | Resolves `DBS-001`'s standing RLS caveat. Do not claim RLS protection in docs until this is actually tested, per `DBS-001`'s own rule. |
| `TENANT-005` | Replace manual provisioning script with owner-only invite flow | Admin / Onboarding | Admin-only action creates `Tenant` + `Profile` + triggers Supabase invite in one authorized step | Owner can invite a new team member from `/admin` without running a script or touching `.env.local` | New admin route/action, `src/lib/services/*`, `scripts/provision-team-profiles.ts` (superseded) | `pnpm exec tsc --noEmit --pretty false`, protected route smoke, `git diff --check` | High-risk write (creates real Supabase Auth invites + Profile rows) — requires `requireUser()` OWNER-only gate and audit event per `AUDIT-OPS-001`/`AUDIT-OPS-002`. |

`TENANT-001` and `TENANT-002` are docs/narrow-schema only and are the correct next-loop starting point. `TENANT-003` onward touch real production data or security policy and must not proceed without an explicit owner go-ahead per loop, consistent with `AGENTS.md` §11's Auth/Permission human-approval requirement.

## 8. Verification

This document and its companion `SCH-004` are the primary artifacts for this loop (Research-To-Task Quality Gate satisfied: local code audit with file/line evidence, a load-bearing current-state finding, phased recommended standard, rejected alternatives with reasons, executable backlog rows with scope/acceptance/files/verification/risk). No schema migration, RLS policy, or runtime code was changed by this document. `pnpm exec tsc --noEmit --pretty false` was run after the same-session `provision-team-profiles.ts` addition and passed clean; it is unaffected by this document itself since no code changed here.

## 9. Next Loop Recommendation

Start with `TENANT-001` (audit + `AcademicPerson.ownerId` fix — narrow, additive, closes the one latent isolation gap found) and `TENANT-002` (`SCH-004` proposal) together. Do not start `TENANT-003` (real migration against the live Supabase target) until the owner explicitly approves proceeding past the proposal stage, since it is a real-data, hard-to-reverse, Auth/Permission-boundary change per `AGENTS.md` §11.
