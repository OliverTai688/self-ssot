# Personal OS Loop 200 Launch-Level Review

## Task

- Task IDs: `LOOP-200`, `TEAMCOLLAB-001`, `TEAMCOLLAB-002`
- Title: Launch review plus team workspace, shared project, invitation, feedback, and AI memory research
- Date: 2026-07-27
- Agent: Codex
- Status: Completed as research/docs/launch review only

## Source Docs And Code Read

- `AGENTS.md`
- Required manuals, PRDs, acceptance docs, `RES-001`, `RES-002`, `RES-005`, `PLN-063`, strategy, loop state, sprint, and backlog
- Last five loop reports 195 through 199
- `RES-011`, `RES-020`, `SCH-004`, `ARC-033`, `AUT-002`, `AUT-003`, `ARC-018`, `DBS-001`
- `prisma/schema.prisma`
- `src/lib/services/auth.service.ts`
- `src/lib/services/project.service.ts`
- `src/lib/services/module-permission.service.ts`
- Loop 200 whole-site review prompt and report template
- Current `package.json` and git status

## Scope

In scope:

- Reconcile the owner's new shared-team requirement with the earlier fully independent tenant decision.
- Research personal/team workspace switching, email invitations, workspace/project roles, project transfer, collaborator feedback, AI retrieval/memory, BFF/auth/audit/RLS/NANDA boundaries.
- Produce formal research, schema, auth, implementation-plan, PRD, acceptance, backlog, sprint, completed-log, task-memory, loop-state, and evidence artifacts.
- Run the overdue fifth-loop launch review.

Out of scope:

- Runtime UI/service/action changes.
- Prisma schema edits or migration apply.
- Production DB writes/backfills.
- Real invitation emails or service-role/secret configuration.
- Project transfer, collaborator feedback runtime, AI provider calls, fine-tuning, automatic memory, public output, or external agents.

## Strategic Review

### Current Target

- Formal launch level before and after: `L0_LOCAL_PROTOTYPE`.
- Conditional Manual Ops: `M1_MANUAL_OPS_READY`.
- Conditional product maturity: `C3_ARCHITECTURE_GATE_READY`.
- Next formal target: `L1_PRIVATE_ONLINE_WORK_OS`.
- Team collaboration target: future L5 multi-user path; research-ready only.

### Last Five Loops

| Loop | Class | Delta |
|---|---|---|
| 195 | Research/plan | AI Development Team OS structure and plan |
| 196 | Research | Shared trust plane and independent AI Development Team interface |
| 197 | Research | GitHub reference repository matrix |
| 198 | Contract/static proof | AI Development Team domain/adapter contract and checker |
| 199 | Runtime implementation | Six-digit email OTP login while retaining Magic Link |

Pattern:

- Four of five loops were research/contract-heavy.
- Loop 199 moved the user-visible Auth journey.
- This loop is owner-directed research and also closes an overdue required review.
- Anti-repeat response: next no-owner-proof slice should be executable contract/fixture proof (`TEAMCOLLAB-003`), not another broad research document. If real Auth evidence appears, `AUTH-010/AUTH-005` preempts.

### Current Strongest Blockers

1. `AUTH-010/AUTH-005`: hosted template and one real signed-in owner session proof.
2. `WORK-009/WORK-007`: explicit safe disposable/local Work proof target and confirmations.
3. `DEPLOY-002`: deployed marker and protected route evidence.
4. Team collaboration has no membership/capability resolver or schema/runtime.
5. Existing interface smoke checker currently fails on a stale/changed `ModuleOperatingShell` marker; this is unrelated to the docs-only changes and needs a separately scoped diagnostic/fix.

### What Becomes More True

Before:

- `RES-020/SCH-004` said one Profile belongs to one isolated Tenant and explicitly rejected shared workspaces.
- No canonical design existed for team tabs, multi-team identity, project transfer, project roles, invitation lifecycle, collaborator feedback, or AI use.

After:

- `RES-026`, `SCH-006`, `AUT-008`, and `PLN-066` define one personal plus multiple team workspaces, workspace/project role separation, invitations, stable-ID project transfer, project feedback, governed AI memory, BFF/auth/audit/RLS/NANDA boundaries, and `TEAMCOLLAB-001..010`.
- `SCH-004` is explicitly superseded.
- Current exact-owner runtime remains safe and unchanged until a verified resolver/migration cutover.

## Research / Reference Basis

### Page Requirement Score

- Score: 89/100.
- Level: High.
- Required rounds: 3.
- Completed rounds:
  1. Local PRD/code/prior-decision fit.
  2. Comparable workspace/member/resource-role products.
  3. Auth, persistence, RLS, feedback provenance, AI memory, and NANDA safety.

### External Official Sources

- Linear workspaces, members/roles, invitations.
- Notion teamspaces and page permissions.
- Google Drive visitor sharing and Viewer/Commenter/Editor access.
- GitHub organization repository roles.
- Supabase users/invitations, RLS, and custom-claims RBAC.
- NIST AI RMF Playbook and Generative AI Profile.

### Selected Pattern

```txt
Profile
  -> personal workspace + team memberships
  -> server-authorized active workspace
  -> workspace-owned project
  -> inherited/direct project role
  -> attributed feedback
  -> project-scoped AI summary/action/memory candidate
  -> human review before durable memory/final write
```

### Rejected Alternatives

- One Profile per tenant/team.
- UI-only team tab.
- Global `UserRole` as project authorization.
- Team-wide access for every guest.
- Public link-based edit/comment.
- Email-domain auto-join.
- Raw invitation token storage.
- Client/JWT user metadata as authorization source.
- Automatic model fine-tuning or global memory from collaborator comments.

## Product And Architecture Decisions

### Roles

- Workspace: `OWNER`, `ADMIN`, `MEMBER`, `GUEST`.
- Project: `VIEWER`, `COMMENTER`, `EDITOR`, `MANAGER`.
- Existing global `OWNER | PARTNER | CLIENT` remains separate.

### Visibility

- Active team members inherit the workspace default project role for `WORKSPACE_VISIBLE` projects; safe initial default is viewer.
- Guests require explicit project grants.
- Private projects require direct access unless workspace owner/admin.

### Project Transfer

- Personal-to-team conversion is an explicit, audited ownership-container transfer.
- Project ID and related records remain stable.
- Client Portal visibility/token does not expand.

### Feedback And AI

- Feedback keeps author, target, version, provenance, AI-use eligibility, withdrawal/deletion state, and audit ref.
- WorkAgent retrieval is limited to an already-authorized project.
- AI may propose summaries/actions/`MemoryCandidate`.
- Provider fine-tuning, cross-workspace/global memory, final writes, public output, and external agents remain disabled.

## Top Five Gaps

| Rank | Gap | Severity | Leverage | Actor impact / next action |
|---:|---|---:|---:|---|
| 1 | Real Auth session proof absent | 3 | 3 | Owner cannot prove protected online use; confirm hosted template, sign in once, capture `/auth/status?proof=1` |
| 2 | Work refresh proof target absent | 3 | 3 | Owner cannot prove DB-backed persistence; provide explicit disposable/local target and confirmations |
| 3 | Deployment proof absent | 3 | 3 | Frontstage/member/admin online claim remains unproven; collect deployment marker and protected route proof after Auth/Work |
| 4 | Team capability resolver absent | 3 | 3 | Members cannot safely see/edit shared projects; implement `TEAMCOLLAB-003` contract/fixture proof |
| 5 | Interface smoke marker mismatch | 2 | 2 | Existing interface-operability proof is red; diagnose checker/source drift in a separate runtime/proof task |

## NANDA / Agent Protocol Gate

Applies because external human feedback becomes AI-readable context.

- Affected capability: future WorkAgent feedback summarization, action proposal, and project-memory candidate proposal.
- Identity/provider/lifecycle: existing internal WorkAgent; no external agent created.
- Endpoint/protocol: protected internal BFF only.
- Auth/trust: current user plus workspace/project capability; project-scoped visibility.
- Observability: feedback/version/source, AI proposal, approval, audit, and trace refs.
- Registry: `internalDiscoverable: true`, `externalRegisterable: false`.
- No NANDA/A2A/MCP endpoint, public agent route, external registry write, external-agent DB access, or autonomous final write is approved.

## Files Changed

Created:

- `docs/07_research-and-design/RES-026_team-workspace-project-collaboration-and-ai-feedback-memory-research.md`
- `docs/02_architecture-and-rules/SCH-006_team-workspace-project-collaboration-schema-proposal.md`
- `docs/02_architecture-and-rules/AUT-008_team-membership-project-role-invitation-and-ai-feedback-boundary.md`
- `docs/05_execution-plans/PLN-066_team-workspace-collaboration-implementation-plan.md`
- this report

Updated:

- `RES-020`, `SCH-004`, `ARC-033`
- `PRD-004`
- `MAN-001`
- `PLN-060`, `PLN-061`
- `ACC-002`
- `RPT-007`
- `tasks.md`
- `loop-state.json`

Behavior changed: none.

## Verification

| Command | Result | Notes |
|---|---|---|
| `pnpm launch:check` | PASS/WARN | Runtime env ready signals pass; local deployment marker absent |
| `pnpm launch:manual-ops` | PASS | `M1_MANUAL_OPS_READY`; formal `L0`; Auth/Work/deployment/Docker proof remain |
| `pnpm owner:access:check` | PASS | Owner access readiness remains ready |
| `pnpm work:proof-target:check` | PASS/BLOCKED | `needs_operator_input`; no target/write confirmations |
| `pnpm agent:registry:check` | PASS | 15 manifests, 0 errors/warnings, 0 external-registerable |
| `pnpm agent:devteam:check` | PASS | 20/20 terms, 12/12 safety markers |
| `pnpm l3:architecture:check` | PASS | `C3_ARCHITECTURE_GATE_READY`; formal claims disabled |
| `pnpm db:validate` | PASS | Existing schema valid; unchanged by this task |
| `pnpm interface:smoke:check` | FAIL | Existing checker expects an exact `ModuleOperatingShell` type marker that current source does not contain; not caused by docs-only changes |
| loop-state JSON parse | PASS | Updated loop 200 state parses successfully |
| docs local-link scan | PASS | New formal docs and `MAN-001` references resolve |
| `git diff --check` | PASS | No tracked-diff whitespace errors |

## Evidence Delta

- Product capability delta: no runtime capability; the product decision and complete implementation path now exist.
- Proof delta: current launch blockers were refreshed; collaboration now has a machine-testable next slice.
- Blocker delta: the prior architecture contradiction is removed; `TEAMCOLLAB-003` is the next safe proof gate.
- Launch delta: none; formal launch remains L0.
- Agent protocol delta: feedback-to-memory capability is bounded to internal/protected, evidence-linked, proposal-only behavior with external registration disabled.

## Next Four-Loop Plan

1. If provider/owner Auth evidence appears: finish `AUTH-010`, run `AUTH-005`.
2. Otherwise: `TEAMCOLLAB-003` capability resolver contract and fixture checker.
3. Diagnose/fix the interface smoke marker mismatch if still failing and if no higher launch proof preempts.
4. Do not start `TEAMCOLLAB-004` live schema/migration; only a separately approved disposable proof task may draft it.

## Remaining Risks

- Multi-workspace schema/backfill is high-risk and not approved.
- Real Supabase invitation delivery requires trusted-server secret handling and explicit recipient authorization.
- Current Prisma direct connection does not prove end-user RLS identity propagation.
- Feedback deletion/consent and derived-memory invalidation need executable proof.
- Client Portal and protected team collaboration must remain separate.
- The current interface checker failure needs a scoped diagnosis.

## Final Status

- `LOOP-200`: completed.
- `TEAMCOLLAB-001`: done.
- `TEAMCOLLAB-002`: done.
- Formal launch: unchanged at `L0_LOCAL_PROTOTYPE`.
- Recommended next task: `AUTH-010/AUTH-005` if owner/provider proof appears; otherwise `TEAMCOLLAB-003`.
