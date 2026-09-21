# MIG-006 Team Workspace Creation Audit Migration

**Task:** `TEAMCOLLAB-005B1`  
**Date:** 2026-07-27  
**Status:** Runtime/disposable proof complete; configured db-push shape hardened and ledger reconciled on 2026-07-27 through `MIG-007`  
**Related:** `DBS-006`, `MIG-005`, `AUT-008`, `PLN-066`

## 1. Scope

`TEAMCOLLAB-005B1` adds the smallest audited write required to create a team safely:

- one active `TEAM` workspace;
- one active creator `OWNER` membership;
- one append-only, no-secret `workspace.created` audit event;
- all three rows in one serializable transaction.

The follow-on migration is `prisma/migrations/20260727170000_team_workspace_creation_audit/migration.sql`. It adds `operating_audit_events` but does not apply itself to the configured database. Invitation delivery, project transfer, access grants, feedback, AI-memory promotion, public output, and provider calls remain outside this slice.

## 2. Persisted Audit Boundary

This is the first persisted writer derived from `DBS-006`. The database restricts the initial table to the approved `workspace.created` envelope:

- actor `owner`, module `work`, target `workspace`, result `success`;
- risk `HIGH`, approval `owner_review`, `human_approval_required = true`;
- source `server_action`, redaction version `teamcollab-005b-v1`;
- high-risk seven-year review retention class;
- lowercase SHA-256 request reference;
- metadata exactly `{}`;
- unique `(actor_ref, action, request_ref)` idempotency key;
- trigger-enforced UPDATE/DELETE rejection with SQLSTATE `55000`.

The runtime readiness guard checks the exact validated CHECK definitions, exact append-only trigger/function body, and an exact unconditional three-key unique index. Missing, disabled, renamed, partial, or same-name weakened artifacts fail closed.

## 3. BFF And Authorization

```txt
/work Server Component readiness
  -> requireUser()
  -> Profile.role OWNER eligibility
  -> exactly one active creator PERSONAL workspace
  -> exactly one active creator OWNER membership
  -> zero owner Projects with workspace_id IS NULL
  -> exact audit catalog readiness
  -> createTeamWorkspace Server Action
  -> defensive service input validation
  -> per-profile advisory transaction lock
  -> TEAM + OWNER membership + audit transaction
  -> redacted result DTO and /work revalidation
```

Browser state never authorizes the write. The action and service both validate input boundaries; the service independently re-queries platform eligibility and persisted prerequisites. A UUID idempotency key is stored only as a caller/profile/action-bound SHA-256 digest. Sequential and concurrent same-key calls converge on one workspace and one write set; a changed name with the same key is rejected.

## 4. Configured-Target Apply Gate

The configured target is currently in the `MIG-005` drift shape: collaboration objects exist outside Prisma history, while PERSONAL workspace/membership/project backfill is incomplete. Therefore `prisma migrate deploy` must not be run blindly.

Activation is a separate `TEAMCOLLAB-005B2` owner-run operation:

1. name the target and capture a restorable backup;
2. rerun `MIG-005` read-only preflight;
3. apply only the reviewed PERSONAL/OWNER/null-project repair if its exact applicability checks pass;
4. verify project and Client Portal snapshots plus zero collaboration side effects;
5. separately review and reconcile migration history for `20260727150000_team_workspace_collaboration`;
6. apply `20260727170000_team_workspace_creation_audit` through the reviewed deploy path;
7. verify exact audit table constraints, trigger/function, and unique index;
8. load `/work`, confirm `建立團隊` becomes available, create one named test team, and verify selection plus one redacted audit row;
9. stop and forward-fix on any mismatch. Do not reset, `db push`, or delete valuable rows.

No configured/live step above was executed in `TEAMCOLLAB-005B1`.

## 5. Disposable Proof

The proof runner accepts no database URL, ignores inherited database variables, creates and fingerprints its own loopback PostgreSQL cluster, requires three explicit local-write/apply confirmations, and removes only its marker-owned temporary root.

The passing proof covers:

- atomic eligible creation and distinct-request creation;
- sequential and concurrent idempotent replay;
- direct service invalid-name/UUID rejection with zero writes;
- platform-owner, PERSONAL workspace, and unscoped-project denials;
- dropped and same-name weakened trigger/function/CHECK/index fail-closed behavior;
- forced audit-insert failure rolling back workspace and membership;
- SHA-256/no-secret audit content;
- UPDATE/DELETE rejection with SQLSTATE `55000`;
- zero invitation, grant, feedback, feedback-version, or memory-candidate rows;
- database shutdown and temporary-root cleanup.

## 6. Recovery And Rollback

Before a valuable-target apply, recovery is backup plus abort. After a successful apply or team creation, do not drop the audit table, delete audit rows, or delete workspaces as a routine rollback. Disable the create control by failing readiness closed and forward-fix schema/data inconsistencies while preserving workspace IDs, membership attribution, and audit history.

## 7. NANDA Boundary

No AI agent capability, manifest, provider, endpoint, trust scope, or registry state changes. WorkAgent remains protected/internal and `externalRegisterable: false`; external agents receive no database access.

## 8. Verification

- `pnpm teamcollab:create-team:check`: 31/31 PASS.
- Three-gate `pnpm teamcollab:create-team:proof --run`: PASS on a self-created loopback target.
- `pnpm teamcollab:migration-reconcile:check`: 25/25 PASS after recognizing the follow-on migration/runtime split.
- Prisma validate/generate, targeted ESLint, whole-project TypeScript, production build, and `git diff --check` are required before final handoff.
