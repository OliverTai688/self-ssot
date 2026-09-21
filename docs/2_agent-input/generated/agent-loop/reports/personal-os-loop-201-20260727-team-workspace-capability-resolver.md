# Agent Loop Evidence Report

## Task

- Task ID: `TEAMCOLLAB-003`
- Title: Add workspace/project capability resolver contract and fixture checker
- Date: 2026-07-27
- Agent: Codex with three scoped subagents
- Status: Completed as contract/fixture implementation; no persistence or UI runtime

## Source Docs Read

- `AGENTS.md`
- Required product, maturity, acceptance, strategy, sprint, backlog, and loop-state context retained from loop 200 and refreshed for loop 201
- `docs/07_research-and-design/RES-026_team-workspace-project-collaboration-and-ai-feedback-memory-research.md`
- `docs/02_architecture-and-rules/SCH-006_team-workspace-project-collaboration-schema-proposal.md`
- `docs/02_architecture-and-rules/AUT-008_team-membership-project-role-invitation-and-ai-feedback-boundary.md`
- `docs/05_execution-plans/PLN-066_team-workspace-collaboration-implementation-plan.md`
- `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`
- Loop reports 198, 199, and 200
- Next.js 16.2.4 local guides: `backend-for-frontend.md` and `server-and-client-components.md`
- Existing Work page/actions/services/mappers, module shell/settings prototypes, contract/checker patterns, package scripts, and dirty-worktree inventory

## Scope

In scope:

- Implement a pure, server-only workspace/project capability resolver.
- Encode exact workspace/project capability maps and deny-by-default precedence.
- Declare UI-safe BFF decision DTOs and future operation policies.
- Execute positive, negative, invalid-enum, cross-workspace, immutability, and determinism fixtures.
- Map all 13 `AUT-008` negative rows without overstating future invitation/AI runtime proof.
- Use subagents to separately cover contract implementation, interface/whole-scenario integration, and QA/security.

Out of scope:

- Prisma/schema/migration/seed or production DB work.
- Replacing current exact-owner Work authorization.
- Service, route, Server Action, or UI changes.
- Real workspace switching, invitations, project transfer, feedback persistence, or AI retrieval/memory.
- Public/Client Portal expansion, RLS claims, external agents, or launch upgrade.

## Strategic Review

- Current launch level / target: formal `L0_LOCAL_PROTOTYPE`; next formal target `L1_PRIVATE_ONLINE_WORK_OS`; team collaboration remains an L5 path.
- Last three reports: loop 198 added AI Development Team contract/static proof; loop 199 added user-visible email OTP runtime; loop 200 completed the team-collaboration research/architecture decision and launch review.
- Repetition check: this loop is executable contract logic plus 45 runtime fixtures, not another proposal-only research artifact.
- Current strongest blockers: real Auth session proof, Work proof target, deployment evidence; team runtime additionally requires approved migration/backfill proof.
- Acceptance mapping: `TEAMCOLLAB-003`, `AUT-008`, `PLN-066` Stage 1, and `ACC-002` capability resolver acceptance.
- What becomes more true: future Work UI and services now have one machine-tested source for effective workspace/project role, capability snapshots, redacted denial DTOs, and operation prerequisites.

## Subagent Contributions

| Subagent | Responsibility | Integrated result |
|---|---|---|
| `teamcollab_contract` | Core resolver implementation | Pure server-only contract, role maps, redacted DTO mapper, fixtures, NANDA/safety metadata |
| `teamcollab_scenarios` | Work interface and whole-scenario audit | Work-scoped switcher; future `WorkspaceProjectIndexDto`; capability snapshots for cards/detail; reusable UI patterns; complete loading/empty/forbidden states; no localStorage authorization |
| `teamcollab_qa` | Role matrix and security review | Exact capability maps, invalid-enum fail-closed cases, direct grant override/downscope, 13-row `AUT-008` coverage split, forbidden pattern list |
| Mainline | Integration and verification | Expanded capability namespaces, BFF operation policies, 25 additional fixtures, executable checker/package script, docs/task memory |

## Research / Reference Basis

- Page requirement understanding score: inherited 89/100 High from `RES-026`; its three required research rounds were already complete.
- Local implementation lens: current Work page loads `Project[]`, while detail/task/note/deliverable controls assume writes; later UI must consume server-derived capability snapshots.
- Current Next.js lens: protected data is loaded directly in Server Components; Server Actions are for mutations; every protected resource still needs explicit credentials/authorization; Client Component props must be serializable.
- Selected implementation: pure contract imported only on the server, fixture runner under the React server condition, safe DTO mapper for client consumption, and service rechecks still mandatory.
- Rejected: client/localStorage roles, global `UserRole` reuse, union/max role grants, guest inheritance, UI-only team tabs, marker-only checker, route/provider/DB runtime in this slice.

## NANDA / Agent Protocol Alignment

- Applies: yes, because the operation catalog includes future WorkAgent feedback-memory review and external human collaboration.
- Affected capability: future project feedback summary/action/memory proposal only.
- AgentFacts-lite: no identity/provider/endpoint change; capabilities remain internal/protected/project-scoped; observability remains source/version/decision/audit/trace.
- Registry: `internalDiscoverable: true` remains conceptually unchanged; `externalRegisterable: false` is machine-checked.
- Concrete artifact: contract safety/NANDA metadata plus executable checker.
- No MCP/A2A/NANDA endpoint, external registration, external-agent DB access, provider call, AI runtime, or autonomous final write was added.

## Contract Decisions

### Project role map

| Role | Exact capabilities |
|---|---|
| `VIEWER` | `project.read` |
| `COMMENTER` | Viewer + create/update-own feedback |
| `EDITOR` | Commenter + project content write |
| `MANAGER` | Editor + feedback moderation, access management, transfer, feedback-memory review |

`feedback.update_own` still requires an author check. `project.transfer` proves only the source-side capability; the target must separately provide `workspace.project.receive_transfer` to an active owner/admin. Project manager alone never grants workspace invitation or policy capability.

### Precedence

1. Deny missing/invalid/inactive/cross-workspace identity, workspace, membership, project, or grant.
2. Active workspace owner/admin receives project manager.
3. Active exact direct grant applies and exactly overrides inherited role, including deliberate downscope.
4. Active member inherits the configured role only for workspace-visible projects.
5. Guest never inherits; private projects require governance or direct grant.

## Interface / Whole-Scenario Handoff

- Keep the switcher Work-scoped until other modules have real workspace data boundaries.
- Replace Work's raw `Project[]` with a future server-loaded `WorkspaceProjectIndexDto` containing workspace state, effective role, capability snapshot, and collaborator summary.
- Project cards/detail and nested task/note/deliverable controls must receive capability-based read-only/write states; hiding only the outer button is insufficient.
- Members/invitations belong in protected team settings; transfer/access belongs in project detail drawer/dialog; feedback and memory candidates belong in Collaboration/Agent/Records surfaces.
- Required states include no teams, no shared projects, no grants, suspended/removed membership, stale selected-workspace preference, cross-workspace guessed IDs, transfer-target unavailable, no eligible feedback, and stale/withdrawn sources.
- Cross-workspace denial must render one safe not-found-or-forbidden state without leaking workspace/project existence.

## Changes

- Added `src/lib/contracts/team-workspace-capability.contract.ts`.
- Added `scripts/check-team-workspace-capability.ts`.
- Added `pnpm teamcollab:capability:check`.
- Updated `AUT-008`, `PLN-066`, `PLN-060`, `PLN-061`, `ACC-002`, `RPT-007`, `tasks.md`, loop state, and this report.
- Runtime behavior changed: none; a new developer verification command is available.

## Verification

| Command | Result | Notes |
|---|---|---|
| `pnpm teamcollab:capability:check` | PASS | 20 built-in + 25 extended fixtures; exact role maps; 13/13 `AUT-008`; DTO/safety/forbidden scans |
| targeted ESLint | PASS | Contract and checker |
| `pnpm exec tsc --noEmit --pretty false` | PASS | Whole repo |
| `pnpm db:validate` | PASS | Existing schema valid and unchanged by this task |
| `pnpm agent:registry:check` | PASS | 15 manifests, 0 errors/warnings, 0 external-registerable, 0 runtime endpoints |
| loop-state JSON parse | PASS | Records current/completed loop 201 and next loop 202 |
| docs/marker scan | PASS | 8 contract/checker/task-memory markers resolve |
| `git diff --check` | PASS | No tracked-diff whitespace errors |

## Evidence

- Product capability delta: effective collaboration authorization logic now exists and can be consumed by later services/UI.
- Proof delta: 45 executable fixtures plus exact role maps and negative coverage replace prose-only role decisions.
- Blocker delta: capability ambiguity is removed; `TEAMCOLLAB-004` remains the explicit schema/disposable-proof gate.
- Agent protocol-readiness delta: feedback-memory review is explicitly scoped and external registration remains false.
- Launch delta: none; formal level remains L0.

## Remaining Risks

- `SCH-006` does not yet contain a grant status column; the future adapter should normalize an active row to `ACTIVE` and absence/revocation to no grant rather than trusting client input.
- Current Work runtime still uses exact owner authorization and must not import team context until migration/backfill and negative DB proof pass.
- A UI-only/localStorage switcher would be misleading and unsafe.
- Migration/backfill, invitation delivery, transfer writes, feedback persistence, and AI data use remain approval-gated future stages.

## Final Status

- `TEAMCOLLAB-003`: complete.
- Recommended next team-collaboration task: select `TEAMCOLLAB-004` separately for an additive schema/migration draft and disposable proof; never apply it to the live database without explicit approval. After that proof, implement the Work-scoped `TEAMCOLLAB-005` interface/read path.
