# Personal OS Loop 212 — Team Workspace Invitation Lifecycle

## Task

- Task ID: `TEAMCOLLAB-006`
- Date: 2026-07-27
- Status: `REVIEW_REQUIRED`
- Agents: primary integration plus continuing BFF/authz, UI, and QA/security subagents

## Strategic Review

- Current product target: formal `L0_LOCAL_PROTOTYPE`, conditional `M1_MANUAL_OPS_READY` / `C3_ARCHITECTURE_GATE_READY`, next formal target `L1_PRIVATE_ONLINE_WORK_OS`.
- Last three completed loops: 209 configured collaboration activation, 210 protected AI Input provider-manifest BFF, 211 launch-level review.
- Owner preemption: the owner explicitly requested formal team operation, continued subagents, and had already authorized schema changes. This preempted the loop-211 fallback `AIINPUT-CONN-005`.
- Capability moved: invitation create/revoke/accept/expire, members/invitations UI, explicit project roles, exact-email membership/grant creation, configured append-only audit catalog.
- What is more true: after this loop the application and configured DB can process an existing-Profile/manual-link invitation once the owner creates/selects a TEAM; before it, invitation writes always failed the audit gate and no UI/action lifecycle existed.

## Research-To-Task Gate

- Local sources: `RES-026`, `SCH-006`, `AUT-008`, `DBS-006`, `PLN-066`, `ACC-002`, current Prisma schema, capability resolver, create-team runtime, and Work Server Component/client.
- Page understanding: inherited 89/100 High; the three required same-issue rounds were already complete across local product fit, comparable collaboration patterns, and BFF/auth/risk boundaries. This loop added a provider-boundary confirmation pass.
- Primary sources: [Supabase Users and Invitations](https://supabase.com/docs/guides/auth/users), [JavaScript `inviteUserByEmail`](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail), and [Redirect URL allow-list behavior](https://supabase.com/docs/guides/auth/redirect-urls).
- Selected pattern: application invitation is authorization truth; existing Profile + exact verified Email accepts; one-time raw token/manual link; digest-only persistence; fixed no-secret audit catalog; provider delivery disabled.
- Rejected patterns: browser/provider secrets, pretending a link was sent, automatic new-user/Profile creation, domain-based membership, raw token persistence, role authorization from global `UserRole`, client-state authorization, and cross-workspace project grants.

## Implementation

- Added UI-safe invitation/member/index/action DTOs.
- Added server-only invitation index and create/revoke/accept services with direct input validation, serializable transactions, advisory locks, capability rechecks, role-escalation guard, exact Email, idempotency, reinvite token rotation, optional direct project grant, and finite safe errors.
- Added protected Server Actions deriving identity from `requireUser()` / `resolveCurrentUser()`.
- Added `/work` TEAM members/invitations Sheet, explicit manual Email handoff, project/role selection, pending revoke, and invitation acceptance card.
- Added exact shared audit-readiness gate compatible with both `workspace.created` and the invitation event family.
- Added `20260727183000_team_workspace_invitation_audit_catalog` and documented configured activation in `MIG-008`.
- Added 27-check static security gate and actual-service self-created PostgreSQL proof.

## Configured Database Activation

- Preflight: 0 TEAM, 0 invitations, 0 audit events; legacy catalog validated; invitation catalog absent.
- Recovery: `/tmp/personal-os-teamcollab006-recovery-20260727-001`, directory mode 0700 and files mode 0600.
- Rehearsal: exact migration applied inside configured-target transaction and ended in `ROLLBACK`.
- Apply: `prisma migrate deploy` successfully applied `20260727183000_team_workspace_invitation_audit_catalog`.
- Postcheck: new catalog validated; legacy catalog absent; ledger row finished/non-rolled-back; TEAM/invitation/audit counts remain zero.
- Reconciliation: migration status current and schema diff clean.

## Verification

| Command / proof | Result |
|---|---|
| `pnpm teamcollab:invitation:check` | PASS 27/27 |
| `pnpm teamcollab:create-team:check` | PASS 32/32 |
| `pnpm teamcollab:configured-activation:check` | PASS 12/12 |
| `pnpm teamcollab:invitation:proof -- --dry-run` | ready; no configured DB/provider |
| gated `pnpm teamcollab:invitation:proof -- --run` | PASS; owned loopback target and cleanup complete |
| disposable lifecycle | exact Email, reinvite, replay, expiry, revoke, escalation/cross-workspace denial, digest-only, 11 redacted audits, append-only SQLSTATE `55000` |
| `pnpm db:validate` / `pnpm db:generate` | PASS |
| targeted ESLint | PASS |
| `pnpm exec tsc --noEmit --pretty false` | PASS |
| `pnpm build` | PASS |
| `prisma migrate status` | schema up to date |
| configured schema diff | no difference detected |

Disposable final counts were 2 baseline workspaces, 2 baseline projects, 6 memberships (5 baseline + 1 accepted), 4 invitations, 1 explicit project grant, 11 audits, and 0 feedback/version/memory rows. The configured target was not accessed by the disposable proof; the later explicitly authorized migration changed only the catalog constraint/ledger.

## Product And Proof Delta

- Product capability delta: a complete existing-Profile/manual-link invitation vertical slice is now wired into formal Work.
- Proof delta: the actual service is transactionally proven on disposable PostgreSQL, the configured audit catalog is active, and prior create-team behavior remains green.
- Blocker delta: provider credentials are no longer required for existing-account collaboration because delivery is honest/manual. New-user onboarding and automatic Email remain blocked separately.
- Formal launch level: unchanged at L0; owner-session Auth/Work and intended deployment evidence still gate L1.

## NANDA Gate

- This task affects human workspace collaboration, not agent capability creation/routing/registration.
- WorkAgent identity, provider, endpoints, protocols, capabilities, skills, auth, trust, observability, and registry state are unchanged.
- WorkAgent remains protected/internal and `externalRegisterable: false`.
- No external agent receives database access or a context package.

## Remaining Risks And Next Decision

- Owner-run proof: sign in as an eligible OWNER, create/select a named TEAM, invite a second existing Profile, manually deliver the one-time link, accept while signed in with the exact Email, and confirm team/project visibility and redacted audit rows.
- Existing Profile only: the runtime does not call Supabase Admin, create an Auth user, or provision a Profile.
- Membership suspend/remove remains unimplemented; do not claim full offboarding.
- Automatic provider delivery/new-user onboarding needs a separate trusted-server secret, redirect allow-list, Auth/Profile provisioning, audit, rollback, and owner approval slice.
- After owner interaction proof, split those lifecycle gaps before high-risk `TEAMCOLLAB-007` project transfer/access writes. If launch evidence preempts, run `AUTH-005`, Work owner proof, or `DEPLOY-002` in that order.
