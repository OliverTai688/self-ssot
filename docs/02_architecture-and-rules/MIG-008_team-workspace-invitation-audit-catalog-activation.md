# MIG-008 Team Workspace Invitation Audit Catalog Activation

**Task:** `TEAMCOLLAB-006`  
**Date:** 2026-07-27  
**Status:** Configured database activated; signed-in owner invitation/acceptance smoke pending  
**Related:** `MIG-006`, `MIG-007`, `DBS-006`, `AUT-008`, `PLN-066`

## 1. Scope

`20260727183000_team_workspace_invitation_audit_catalog` expands the exact append-only Work audit catalog from the existing `workspace.created` event to the reviewed application-invitation family:

- `workspace.member.invited / success`;
- `workspace.invitation.accepted / success|blocked`;
- `workspace.invitation.revoked / success`;
- `workspace.invitation.expired / blocked`.

It preserves the SHA-256 request-reference CHECK, empty-metadata CHECK, exact three-column idempotency index, and append-only trigger/function. It creates no workspace, invitation, membership, grant, Auth user, provider message, feedback, or memory row.

## 2. Recovery And Rehearsal

Before apply, a mode-0700 focused recovery directory was created at `/tmp/personal-os-teamcollab006-recovery-20260727-001`; its mode-0600 files record the prior audit constraint definitions, audit aggregates, invitation-state aggregates, and Prisma migration ledger. Preflight returned 0 TEAM workspaces, 0 invitations, 0 audit events, the validated legacy catalog present, and the new catalog absent.

The exact migration was then executed on the configured target inside one transaction ending in `ROLLBACK`. The new validated catalog appeared during the rehearsal and the legacy catalog was restored by rollback.

## 3. Applied Activation

With the owner's explicit schema/formal-use authorization, `prisma migrate deploy` applied the migration. Postconditions:

- legacy `operating_audit_events_workspace_created_only_check`: absent;
- `operating_audit_events_teamcollab_action_catalog_check`: present and validated;
- migration ledger contains one finished, non-rolled-back `20260727183000_team_workspace_invitation_audit_catalog` row;
- TEAM workspaces, invitations, and audit events remain 0;
- `prisma migrate status`: database schema up to date;
- `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`: no difference detected.

## 4. Runtime Meaning

The protected `/work` invitation BFF can now pass its exact audit-readiness gate after the owner creates and selects a TEAM workspace. OWNER/ADMIN may create and revoke application invitations; only OWNER may invite another OWNER. Acceptance requires an existing Personal OS Profile, an authenticated verified Email exactly matching the normalized invited Email, and a pending/unexpired/unrevoked token. Optional direct project grants support `VIEWER`, `COMMENTER`, `EDITOR`, or `MANAGER` and are checked against the same workspace.

The raw token is returned only once in `/work?invitation=<token>` and only its SHA-256 digest is stored. Delivery is deliberately `MANUAL_EMAIL_LINK`: the UI can copy the link or open an Email draft, but no provider is called and the UI never claims that mail was sent.

## 5. Verification

- `pnpm teamcollab:invitation:check`: 27/27 PASS.
- `pnpm teamcollab:create-team:check`: 32/32 PASS.
- Self-created loopback PostgreSQL lifecycle proof: PASS, including exact Email, reinvite rotation, idempotent replay, expiry/revoke/reuse, role escalation, cross-workspace denial, digest-only storage, 11 redacted audit rows, append-only SQLSTATE `55000`, and complete cleanup.
- Configured activation checker: 12/12 PASS.
- Prisma validate/generate, whole-project TypeScript, targeted ESLint, production build, migration status/diff: PASS.

## 6. Remaining Boundary

The configured database and runtime are ready, but no test TEAM or invitation was created automatically. One signed-in owner must still create/select a named TEAM, invite a second existing Profile, manually send the one-time link, and confirm acceptance/switch/audit behavior. Automatic provider delivery, new Auth/Profile onboarding, membership suspension/removal, project transfer, feedback, AI memory, RLS, public output, and external-agent access remain separate tasks.

## 7. NANDA Boundary

This is human workspace collaboration, not an agent capability or registry change. WorkAgent remains protected/internal and `externalRegisterable: false`; external agents receive no database access.
