# Team Workspace Collaboration Implementation Plan

**Document ID:** `PLN-066`  
**Last updated:** 2026-07-27  
**Status:** Active implementation; Stage 1 contract proof complete  
**Inputs:** `RES-026`, `SCH-006`, `AUT-008`  
**Launch impact:** L5 multi-user path; no current launch-level upgrade

---

## 1. Objective

Deliver an end-to-end protected collaboration journey:

```txt
Owner creates/selects team
  -> invites email with role
  -> recipient signs in and accepts
  -> recipient selects team
  -> shared projects appear
  -> owner transfers a personal project to team
  -> collaborator views/comments/edits according to role
  -> WorkAgent can summarize attributed feedback
  -> durable memory/final actions remain review-gated
```

## 2. Delivery Principles

- BFF-first and deny-by-default.
- Keep global, workspace, and project roles separate.
- Do not implement `SCH-004`/`Profile.tenantId`.
- No live migration without explicit owner approval and disposable proof.
- No client-supplied authorization evidence.
- No public unauthenticated collaboration in this plan.
- No provider fine-tuning or automatic durable memory.
- Every membership/access/transfer/feedback-memory decision is auditable.

## 3. Stage Plan

### Stage 0 — Research And Decision Reconciliation

Tasks: `TEAMCOLLAB-001`, `TEAMCOLLAB-002`

Outputs:

- `RES-026`
- `SCH-006`
- `AUT-008`
- `PLN-066`
- `RES-020`/`SCH-004` supersession notes
- PRD/acceptance/task-memory updates

Exit:

- One consistent product decision exists.
- No runtime/schema behavior changed.

### Stage 1 — Capability Resolver Contract And Fixture Proof

Task: `TEAMCOLLAB-003`

Status: DONE on 2026-07-27.

Scope:

- TypeScript contracts for workspace/project roles and capabilities.
- Pure resolver for inherited/direct capability.
- Fixture matrix for owner/admin/member/guest and viewer/commenter/editor/manager.
- Negative tests/checker.
- BFF DTO/action shape.

Exit:

- Role matrix is machine-verifiable.
- No Prisma read/write or route/action runtime.
- `pnpm teamcollab:capability:check` executes 20 built-in plus 25 extended fixtures, exact role maps, all 13 `AUT-008` negative rows, BFF-safe denial DTO checks, and forbidden runtime/DB/provider/public/agent scans.

### Stage 2 — Migration Draft And Disposable Proof

Task: `TEAMCOLLAB-004`

Status: DONE on 2026-07-27 for additive Prisma schema, nondeployable SQL draft, seed, and self-created local disposable proof. No live apply.

Scope:

- Edit Prisma schema only after task selection.
- Generate reviewed migration draft.
- Backfill personal workspaces/memberships/project workspace IDs.
- Update seed.
- Rehearse on disposable DB.

Exit:

- Zero orphan projects.
- One personal workspace owner membership per Profile.
- Two-workspace negative proof passes.
- No live database apply.

Stop:

- Production migration needs a new explicit owner approval.

### Stage 3 — Protected Workspace Reads And Work UI

Task: `TEAMCOLLAB-005`

Status: `DONE` on 2026-07-27 as a protected read-only BFF/UI slice.

Scope:

- Server-only workspace list/project index loaders.
- Workspace switcher in protected shell.
- Work `個人`/team tabs.
- Empty/loading/error/forbidden states.
- Member/guest visibility proof.

Exit:

- Signed-in fixture users see only allowed workspaces/projects.
- Active workspace preference cannot bypass server authorization.
- Disposable browser proof confirmed personal/team switching, a non-clickable TEAM project card, no TEAM add action, and safe fallback from a guessed workspace ID without project leakage.

### Stage 3.5 — Audit-Backed Team Creation And Activation

`TEAMCOLLAB-005B1` implements and disposable-proves the audit-backed owner create-team command/UI. The owner-approved configured-target portion of `TEAMCOLLAB-005B2` has now passed through `MIG-007`: PERSONAL reconciliation, Project scoping, custom invariant restoration, audit hardening, and migration-history reconciliation are complete. `/work` can enable the create control for either eligible OWNER after a signed-in refresh. The first named create/select/audit browser round trip remains review-required and no test TEAM is created automatically.

### Stage 4 — Invitation And Membership Lifecycle

Task: `TEAMCOLLAB-006`

Implemented application slice:

- Create/revoke/accept application invitation.
- Pending/expired/revoked/member states.
- One-time manual Email-link handoff with zero provider call.
- Members/invitations settings surface.
- Audit.

Verified exit:

- Exact-email acceptance and idempotency pass.
- Wrong-email, expired, revoked, suspended cases fail closed.

`TEAMCOLLAB-006` is `REVIEW_REQUIRED`: create/revoke/accept/expire, exact-email, optional direct project grants, audit, and `/work` UI are implemented and the configured audit catalog is active through `MIG-008`. Suspension/removal and automatic provider/new-user delivery remain follow-up scope; signed-in owner plus second existing Profile browser proof is pending.

Executable follow-ups:

- `TEAMCOLLAB-006B`: trusted provider delivery plus invitation-gated Auth/Profile onboarding, only after provider/secret/provisioning approval.
- `TEAMCOLLAB-006C`: suspension/removal, last-owner quorum, grant/session impact, offboarding audit and recovery.

Stop:

- Real email delivery/recipient requires owner authorization.

### Stage 5 — Project Conversion And Access Management

Task: `TEAMCOLLAB-007`

Scope:

- Consequence preview.
- Transfer personal project into team.
- Stable project ID and related rows.
- Project access drawer and role changes.
- Client Portal non-regression.
- Audit/rollback-forward-fix.

Exit:

- Team members see the transferred project according to effective role.
- Unauthorized users cannot read/write by guessed IDs.

### Stage 6 — Project Feedback

Task: `TEAMCOLLAB-008`

Scope:

- Feedback/comment CRUD within role matrix.
- Target project/task/note/deliverable/file/media.
- Versioning, moderation, withdrawal/deletion.
- Project feedback UI and records/audit.

Exit:

- Commenter can comment but cannot edit project content.
- Feedback retains author/source/version.

### Stage 7 — AI Feedback Knowledge And Memory Candidate

Task: `TEAMCOLLAB-009`

Scope:

- Project-scoped feedback retrieval contract.
- WorkAgent summary/action proposal.
- Evidence-linked `ProjectMemoryCandidate`.
- Review/approve/reject/invalidate.
- No provider fine-tuning.

Exit:

- AI output cites feedback/version.
- Cross-workspace retrieval fails.
- Withdrawal/deletion invalidates future retrieval/memory.

NANDA:

- Internal/protected WorkAgent only.
- `externalRegisterable: false`.

### Stage 8 — Defense-In-Depth And Launch Review

Task: `TEAMCOLLAB-010`

Scope:

- Two-workspace authorization suite.
- Audit storage proof.
- RLS design/apply only on approved JWT-aware path.
- invite/transfer/offboarding/AI-memory abuse tests.
- error/loading/mobile/accessibility review.
- L5 readiness report.

Exit:

- App-layer authorization and any claimed RLS behavior are independently proven.
- No cross-workspace data leakage.
- Recovery/offboarding/runbook exists.

## 4. Executable Task Table

| Task ID | Title | Status | Acceptance | Likely files | Verification | Risk / stop |
|---|---|---|---|---|---|---|
| `TEAMCOLLAB-001` | Research team workspace, project collaboration, and AI feedback memory | DONE | `RES-026` completes three research rounds, prior-decision reconciliation, UI/BFF/auth/AI boundary, external sources, rejected alternatives, scenarios, and next tasks | `RES-026`, index, backlog/sprint/tasks/report | docs scan, link scan, `git diff --check` | Docs only |
| `TEAMCOLLAB-002` | Define schema, auth boundary, and implementation plan | DONE | `SCH-006`, `AUT-008`, and `PLN-066` exist; `SCH-004` is superseded; no schema/runtime change | Four formal docs plus PRD/ACC/task memory | docs scan, JSON parse, `git diff --check` | Proposal only |
| `TEAMCOLLAB-003` | Add workspace/project capability resolver contract and fixture checker | DONE | Pure role/capability resolver covers inherited/direct access, BFF-safe DTO/operation policy, and all 13 negative rows in `AUT-008` as fixture, policy, or explicit follow-up coverage without claiming runtime proof | `src/lib/contracts/team-workspace-capability.contract.ts`, `scripts/check-team-workspace-capability.ts`, package script, docs | `pnpm teamcollab:capability:check`, typecheck, lint, DB validate, diff check | No Prisma/route/action/provider runtime |
| `TEAMCOLLAB-004` | Draft workspace membership migration and disposable proof | DONE | Additive schema plus nondeployable SQL draft; zero-orphan personal workspace backfill; seed twice stable; persisted-context cross-workspace denial and feedback-version lineage proof pass; no live apply | `prisma/schema.prisma`, `prisma/migration-drafts/20260727_teamcollab_004_workspace_collaboration_additive/`, seed, proof/check scripts, `MIG-004` | db validate/generate, static draft check, dry-run + explicit disposable run, capability check, typecheck/build | Live/valuable DB apply remains separately approval-gated |
| `TEAMCOLLAB-005` | Add protected workspace switcher and team project index reads | DONE | Personal/team tabs load only active-member and resolver-authorized projects; unsafe selection falls back without disclosure; TEAM cards are read-only/non-clickable; full loading/empty/unavailable/forbidden states exist | protected Work page/loading, `WorkspaceProjectIndexDto`, server service/mappers, workspace-aware cards, checker | 24/24 static/BFF/UI checks, 45 capability fixtures, lint, DB validate/generate, typecheck/build, disposable browser smoke | Read-only only; no live apply or TEAMCOLLAB-006+ writes |
| `TEAMCOLLAB-005A` | Reconcile collaboration migration history and PERSONAL workspace backfill | DONE | Canonical migration plus configured-drift preflight/repair exist; clean-history and drift-shaped disposable paths produce one active PERSONAL/OWNER membership per Profile, zero orphan Projects, the partial unique index, stable Project/Client Portal fields, and zero TEAM/collaboration rows | canonical migration, review repair packet, static checker, dual-path disposable proof, `MIG-005` | 21/21 reconciliation checks, gated local proof, db validate/generate, typecheck, build, browser-safe legacy check | Configured/live repair and `migrate resolve` remain owner-run and separately target-approved; no create-team runtime |
| `TEAMCOLLAB-005B` | Add audit-backed owner TEAM workspace creation BFF and UI | REVIEW_REQUIRED | Offline runtime and configured DB activation pass; first owner-chosen named team and audit observation close the parent | 005B1 + 005B2 | combined proof + owner browser handoff | No automatic test TEAM or adjacent collaboration writes |
| `TEAMCOLLAB-005B1` | Implement audit-backed create-team runtime and disposable proof | DONE | Eligible owner atomically creates TEAM + ACTIVE OWNER + redacted append-only audit; direct invalid input and sequential/concurrent replay are safe; missing or weakened audit artifacts fail closed | `OperatingAuditEvent`, follow-on migration, service/action, readiness-gated dialog, checker/proof, `MIG-006` | 31/31 checker, full loopback proof, lint, Prisma, typecheck/build | No configured DB write; no invite/provider/transfer/feedback/AI scope |
| `TEAMCOLLAB-005B2` | Reconcile and activate create-team on the configured target | REVIEW_REQUIRED | Physical/data/audit/ledger activation passes with zero Prisma diff; signed-in owner sees enabled control and supplies the team name | db-push hardening/postcheck packet, focused recovery snapshot, `MIG-007` | rollback rehearsal, 12/12 checker, postconditions, migrate status/diff; owner browser smoke pending | Applied only after explicit formal-use request; no reset or automatic TEAM |
| `TEAMCOLLAB-006` | Implement email invitation and membership lifecycle | REVIEW_REQUIRED | Existing-Profile manual-link create/accept/revoke/expire paths are audited, exact-email, idempotent, and configured; suspend/remove and provider/new-user delivery remain split follow-ups | server actions/service/types, Work team Sheet/acceptance card, audit migration, checker/proof, `MIG-008` | 27/27 static, 32/32 create regression, actual-service disposable proof, Prisma/type/build, configured rollback/deploy/status/diff; signed-in smoke pending | No provider secret/call or Auth/Profile provisioning; automatic delivery and member offboarding remain approval-gated |
| `TEAMCOLLAB-006B` | Add trusted provider delivery and invitation-gated new-user onboarding | BLOCKED | Existing-user and new-user paths are explicit; no membership before exact-email acceptance; secrets/redirects/provisioning fail closed | provider/Auth adapter, onboarding service, audit/runbook/tests | provider primary-source review, mock/disposable adapter, Auth/redirect/secret negative tests, owner two-user proof | Real recipient/provider/Auth/Profile writes require explicit approval |
| `TEAMCOLLAB-006C` | Add member suspend/remove and offboarding | BLOCKED | Exact owner/admin boundaries, last-owner guard, immediate inherited/direct denial, preserved attribution/audit | member management service/actions/UI, audit/recovery runbook | two-workspace/grant/session negative tests, last-owner proof, browser/build | High-risk permission writes require explicit review |
| `TEAMCOLLAB-007` | Implement personal-to-team project transfer and access management | BLOCKED | Stable-ID transfer, grants, access drawer, audit, Client Portal non-regression | project service/actions/UI, audit | two-workspace integration test, client-token regression, build | High-risk Auth/Permission write; explicit review |
| `TEAMCOLLAB-008` | Add project feedback/version/moderation surface | BLOCKED | Role-scoped feedback works with author/version/withdrawal/audit | schema/service/actions/project UI | capability matrix, CRUD/version tests, browser smoke | Depends on 007; no public feedback |
| `TEAMCOLLAB-009` | Add WorkAgent feedback summary and memory-candidate review | BLOCKED | Project-scoped retrieval, evidence-linked proposals, approval/invalidation, no global training | AI/Work service, memory candidate contract/UI, audit | fixture model adapter, cross-workspace denial, deletion invalidation, agent registry check | Provider call/data-use approval separate; no fine-tuning/final writes |
| `TEAMCOLLAB-010` | Add cross-workspace security, RLS, audit, and offboarding proof | BLOCKED | Negative suite, audit proof, JWT-aware RLS proof if enabled, runbook | tests/scripts, RLS migration proposal, audit/runbook docs | two-tenant proof, RLS test, launch check | Production policy apply and L5 claim require owner approval |

## 5. BFF Contract Milestones

| Milestone | Reads | Writes |
|---|---|---|
| BFF-A | workspaces, effective role/capability | none |
| BFF-B | workspace projects, members, invitations | create/revoke/accept invite |
| BFF-C | project access summary | transfer project/change grant |
| BFF-D | project feedback | feedback create/update/withdraw |
| BFF-E | feedback memory candidates | propose/review/invalidate candidate |

Each milestone needs:

- `requireUser()`;
- service authorization;
- Zod input validation;
- UI-safe mapper;
- audit event;
- negative authz tests;
- loading/empty/error state;
- explicit real/demo/unavailable label.

## 6. Verification Matrix

| Layer | Proof |
|---|---|
| Contract | Role/capability checker |
| Schema | Prisma validate/generate + SQL review |
| Migration | Disposable migrate/seed/backfill |
| Service | Two-workspace positive/negative integration tests |
| UI | Workspace switch, team project list, access drawer, feedback surface |
| Invitation | Exact email, expiry, revoke, idempotency, suspension |
| Transfer | Stable ID, relation preservation, Client Portal non-regression |
| AI | Project-only source refs, approval, invalidation, no external registration |
| Audit | Required event families and no-secret payload |
| Launch | Formal L0/L1/L5 claims remain evidence-gated |

## 7. Current Top Risks

1. Stale `RES-020/SCH-004` decision being implemented after the owner changed direction.
2. Reusing global `UserRole` and accidentally granting cross-project access.
3. Migration/backfill changing all Work authorization at once.
4. Provider invitation secret exposure.
5. Guests inheriting workspace-wide projects.
6. Project transfer expanding Client Portal visibility.
7. Deleted collaborator feedback remaining in AI retrieval.
8. Calling retrieval/memory "training" and enabling provider fine-tuning without consent.
9. Claiming RLS while Prisma direct connection bypasses end-user JWT context.
10. Losing authorship/audit during offboarding.

## 8. Next Task

`TEAMCOLLAB-003..005B1` are complete; configured activation through `MIG-007` and the invitation catalog through `MIG-008` are current with zero schema diff. `TEAMCOLLAB-006` has a formal existing-Profile/manual-link runtime and disposable proof, but remains review-required until a signed-in owner creates/selects the first named team and a second existing Profile accepts the manually delivered link. The shortest next collaboration task is that owner interaction proof; after it, split automatic provider/new-user onboarding and membership suspension/removal before entering high-risk `TEAMCOLLAB-007` transfer/access writes.
