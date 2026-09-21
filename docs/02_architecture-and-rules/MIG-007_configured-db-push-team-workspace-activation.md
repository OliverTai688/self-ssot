# MIG-007 Configured DB Push Team Workspace Activation

**Task:** `TEAMCOLLAB-005B2`  
**Date:** 2026-07-27  
**Status:** Configured database activated; first signed-in owner create/select smoke pending  
**Related:** `MIG-005`, `MIG-006`, `DBS-006`, `AUT-008`, `PLN-066`

## 1. Trigger And Observed State

The owner ran `prisma db push` and `prisma generate`, then explicitly requested formal activation. Read-only preflight proved that the configured database had the complete Prisma table/column/index/FK shape, including `operating_audit_events`, but retained the known db-push gaps:

- Prisma ledger contained only baseline and file/media migrations;
- 3 Profiles had 0 PERSONAL workspaces and 0 memberships;
- all 10 Projects had `workspace_id IS NULL`;
- the active-PERSONAL partial unique index was absent;
- four collaboration CHECK constraints were absent;
- three audit CHECK constraints and the append-only trigger/function were absent;
- TEAM, invitation, grant, feedback, memory-candidate, and audit event counts were all zero.

This is expected because Prisma `db push` does not run migration data backfill, partial-index SQL, custom CHECK SQL, trigger SQL, or migration-ledger entries.

## 2. Recovery Packet And Rehearsal

The local PostgreSQL 16 `pg_dump` client could not safely dump the PostgreSQL 17 target. Before writing, a mode-0700 local recovery directory was created with mode-0600 focused snapshots of:

- all Project IDs, owner IDs, and prior workspace IDs;
- prior workspace and membership identity/state rows;
- prior audit identity/envelope rows;
- prior Prisma migration-ledger rows;
- aggregate manifest counts.

The target began with 0 workspace, membership, and audit rows, so this packet captures every field changed by the activation. A full provider-level backup remains preferable for later migrations with non-empty collaboration data.

The exact combined `MIG-005` repair plus `MIG-007` hardening was first executed against the configured target inside a transaction ending in `ROLLBACK`. The rehearsal produced the expected 3 PERSONAL rows, 3 OWNER memberships, 10 Project updates, partial index, constraints, and trigger with no error or persisted change.

## 3. Applied Activation

One advisory-locked transaction then committed:

- deterministic active PERSONAL workspace for each Profile;
- one ACTIVE OWNER membership for each PERSONAL creator;
- only null `projects.workspace_id` values backfilled to the matching legacy owner PERSONAL workspace;
- `workspaces_active_personal_creator_unique`;
- four canonical collaboration CHECK constraints omitted by db push;
- three exact no-secret audit CHECK constraints;
- exact append-only audit function/trigger using SQLSTATE `55000`.

No TEAM, invitation, grant, feedback, feedback version, memory candidate, or audit event row was created.

After physical/schema postconditions passed, Prisma migrations `20260727150000_team_workspace_collaboration` and `20260727170000_team_workspace_creation_audit` were individually marked applied with `prisma migrate resolve --applied`. `prisma migrate status` then reported all four migrations current.

## 4. Final Evidence

- Profiles: 3.
- Active PERSONAL workspaces: 3.
- Active creator OWNER memberships: 3.
- Null-workspace Projects: 0.
- TEAM/invitation/grant/feedback/version/memory/audit rows: 0.
- Eligible platform OWNER Profiles: 2.
- Required custom CHECKs: 7 present and validated.
- Required partial/audit unique indexes: exact.
- Append-only trigger/function: enabled and exact.
- Prisma ledger: both collaboration migrations finished, not rolled back.
- `prisma migrate status`: database schema up to date.
- `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`: no difference detected.
- `pnpm teamcollab:configured-activation:check`: 12/12 PASS.

## 5. Runtime Meaning

The protected `/work` loader now has the persisted prerequisites required to return `teamWorkspaceCreation = { available: true, code: "ready" }` for either configured platform OWNER. After a signed-in owner refreshes `/work`, 建立團隊 should be enabled. The action still reauthenticates, rechecks all prerequisites and exact audit catalog state, and atomically writes TEAM + ACTIVE OWNER + one no-secret audit event.

No team was created automatically because the owner must choose its name. The first owner create/select/audit browser round trip remains the final interaction proof, not a database readiness blocker.

## 6. Rollback And Forward Fix

The activation deliberately preserved IDs, owner IDs, project content, Client Portal fields, and all collaboration tables. If the owner reports a UI/runtime issue, keep creation fail-closed and forward-fix the service or exact catalog invariant. Do not reset, `db push` over custom invariants, delete audit history, or blindly remove repaired PERSONAL rows.

## 7. NANDA Boundary

No agent manifest, endpoint, provider, trust scope, or registry state changed. WorkAgent remains protected/internal and `externalRegisterable: false`; external agents still receive no database access.

