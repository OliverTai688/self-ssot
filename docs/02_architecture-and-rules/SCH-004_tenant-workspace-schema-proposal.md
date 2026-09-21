# Tenant/Workspace Prisma Schema Proposal

**Task:** `TENANT-002`
**Date:** 2026-07-17
**Status:** SUPERSEDED — do not implement or migrate. The owner changed direction on 2026-07-27 to require shared team workspaces, multi-workspace membership, project transfer, project roles, and collaborator feedback. Use `SCH-006_team-workspace-project-collaboration-schema-proposal.md`, derived from `RES-026`, instead. This file remains historical evidence for the earlier one-Profile/one-Tenant decision.

---

## Context

`RES-020` found that per-person row isolation already exists today for the Work module via `ownerId`-scoped service checks, and recommended a phased, minimal-footprint path to formal multi-tenancy rather than a day-one heavy migration. This document is Phase 2 of that plan: a first-class `Tenant` identity, added without changing how row isolation actually works.

## Design Decision: `Profile.tenantId`, Not a Membership Table

Each `Profile` belongs to exactly **one** `Tenant`. No `TenantMembership` many-to-many is proposed. Rationale (full detail in `RES-020` §6): no stated need exists yet for one person to belong to multiple tenants or for cross-tenant collaboration; a direct FK is simpler, matches the owner's explicit "fully independent tenant" requirement, and does not block adding a membership table later if a real need appears.

Existing `ownerId` FKs on `Project`, `ResearchThread`, `SourceAsset`, etc. are **left unchanged**. Tenant isolation for those rows is derived transitively: `row.ownerId -> Profile.id -> Profile.tenantId`. No `tenantId` column is added to those 23 models in this phase — see `RES-020` §6 for why denormalizing onto every table is deferred to the RLS phase (`TENANT-004`), and only for tables RLS actually needs a direct column on.

## Proposed Prisma Models

```prisma
// A person's isolated workspace boundary. One tenant per Profile in this phase.
model Tenant {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name      String                              // e.g. "Oliver's Workspace"
  slug      String   @unique                    // url-safe identity, e.g. "oliver"
  status    TenantStatus @default(ACTIVE)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt      @map("updated_at")

  profiles  Profile[]

  @@map("tenants")
}

enum TenantStatus {
  ACTIVE
  SUSPENDED

  @@map("tenant_status")
}
```

## Proposed Change to Existing `Profile` Model

```prisma
model Profile {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId  String   @db.Uuid @map("tenant_id")           // NEW — nullable during migration, NOT NULL after backfill
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Restrict)  // NEW
  email     String   @unique
  fullName  String?  @map("full_name")
  avatarUrl String?  @map("avatar_url")
  role      UserRole @default(CLIENT)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // ... existing relations unchanged
}
```

`email` remains globally unique (one Supabase Auth identity → one Profile → one Tenant, in this phase). `onDelete: Restrict` on the `Tenant` relation is deliberate: a `Tenant` must not be deletable while it still has a `Profile`, forcing an explicit offboarding step rather than a silent orphan.

## Migration Impact Note

- Additive: one new table (`tenants`), one new nullable FK column on `profiles` initially.
- Backfill required before `NOT NULL` can be applied: create one `Tenant` row for the existing owner dataset (e.g. `name: "Oliver's Workspace"`), assign `taioliver688@gmail.com`'s existing `Profile.tenantId` to it; create a second, empty `Tenant` row for `lilyzuo405@gmail.com` and assign her `Profile.tenantId` to it. This must run as a single reviewed migration script, not ad hoc SQL, and must be rehearsed on a disposable database first per `DBS-001`.
- No existing `ownerId` column on any other model changes. No data migration is needed on `Project`, `ResearchThread`, `SourceAsset`, etc. — their tenant boundary is derived transitively through `Profile`, so this migration touches exactly two tables.

## Seed Impact Note

`prisma/seed.ts`'s `DEMO_PROFILE_EMAIL` (`admin@example.com`) upsert must also create/assign a demo `Tenant` once `Profile.tenantId` is `NOT NULL`, or seeding will fail on a disposable database. This is a small, mechanical addition to `TENANT-003`'s implementation, not a design question.

## Rollback Note

Additive-only until the `NOT NULL` constraint is applied. Rollback before that point is a plain `DROP TABLE tenants` + drop the nullable column, no data loss. After `NOT NULL` + backfill, rollback requires re-nullable-ing the column before dropping — standard Prisma migration reversal, no destructive data loss since no other table's data is touched.

## What This Proposal Deliberately Does Not Include

- No `TenantMembership` table (see Design Decision above).
- No `tenantId` on `Project`/`ResearchThread`/`SourceAsset`/etc. (deferred to `TENANT-004`, RLS phase, and only where RLS needs it).
- No RLS policies (that is `TENANT-004`).
- No invite/onboarding service changes (that is `TENANT-005`).
- No UI (tenant switcher, workspace settings) — not needed while every `Profile` has exactly one `Tenant` and the UI already scopes everything to `requireUser()`'s single resolved profile.

## Related Files

- `docs/07_research-and-design/RES-020_multi-tenant-team-workspace-isolation-research.md`
- `docs/02_architecture-and-rules/DBS-001_database-contract.md`
- `docs/02_architecture-and-rules/AUT-005_owner-demo-account-boundary.md`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `scripts/provision-team-profiles.ts`
