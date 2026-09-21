# Agent Loop Evidence Report

## Task

- Task ID: `TEAMCOLLAB-005`
- Title: Protected Work workspace switcher and real project-index reads
- Date: 2026-07-27
- Agent: Codex with continuing scoped subagents
- Status: Completed as a read-only Work BFF/UI slice

## Source Docs Read

- `AGENTS.md`
- Required manual/index, product, maturity, acceptance, strategy, sprint, backlog, and loop-state documents
- `docs/02_architecture-and-rules/AUT-008_team-membership-project-role-invitation-and-ai-feedback-boundary.md`
- `docs/02_architecture-and-rules/SCH-006_team-workspace-project-collaboration-schema-proposal.md`
- `docs/02_architecture-and-rules/ARC-012_frontend-operating-surface.md`
- `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`
- `docs/05_execution-plans/PLN-066_team-workspace-collaboration-implementation-plan.md`
- `docs/07_research-and-design/RES-026_team-workspace-project-collaboration-and-ai-feedback-memory-research.md`
- Loop reports 201, 202, and 203
- Current Next.js 16.2.4 local guides for BFF, Server/Client Components, and data fetching
- Existing Work page/cards, auth service, capability contract, Prisma schema/seed, mapper/service conventions, and protected loading-state pattern

## Scope

In scope:

- A client-safe `WorkspaceProjectIndexDto` and read-capability snapshots.
- A server-only BFF that derives caller identity from `requireUser()`, loads active membership/workspace rows, and reuses the TEAMCOLLAB-003 resolver for every project.
- A Work-scoped personal/team switcher using query navigation and request-time server reauthorization.
- Loading, empty, filter-empty, unavailable, forbidden, stale-selection fallback, and legacy compatibility states.
- Non-clickable TEAM project cards until the detail route receives collaboration authorization.
- Static/fixture/type/build validation plus a real disposable browser route proof.
- Continuing BFF, UI, and QA subagents with non-overlapping file ownership.

Out of scope:

- Applying the review migration to a live, configured, or valuable database.
- Team/workspace creation, invitation delivery/acceptance, membership mutation, project transfer, grant mutation, feedback writes, or AI-memory runtime.
- Client Portal/public output changes, RLS claims, provider calls, external agent access, or launch-level upgrade.

## Strategic Review

- Current formal launch level remains `L0_LOCAL_PROTOTYPE`; owner-run Auth, Work persistence, and deployment evidence still block L1.
- Last three loops: 201 made team authorization executable, 202 cut Formal File/Media Library to real owner-scoped reads, and 203 proved the additive collaboration schema/backfill in a disposable database.
- Repetition check: this loop is a user-visible runtime/BFF slice after contract, real-data, and schema-proof work, not another proposal/checklist-only loop.
- Acceptance mapping: `TEAMCOLLAB-005`, `PLN-066` Stage 3, `ACC-002` Work/TEAMCOLLAB runtime targets, and the `RES-026` personal/team Work scenario.
- Product delta: a signed-in user can now select among verified personal/team workspaces and see only resolver-authorized projects in `/work`.
- Proof delta: disposable browser evidence now covers the BFF and rendered UI, including an unauthorized workspace-selection case.
- Cadence: loop 204 is the fourth normal loop after review loop 200; loop 205 is the required fifth-loop launch review.

## Subagent Contributions

| Subagent | Responsibility | Integrated result |
|---|---|---|
| `teamcollab005_bff` | DTO, mapper, and server-only project-index service | Active memberships, exact persisted grants, resolver filtering, token-safe DTOs, safe fallback, legacy compatibility, fail-closed errors |
| `teamcollab005_ui` | Work switcher and workspace-aware project cards | Query-link tabs, role/count/state UI, guarded legacy add action, non-clickable TEAM cards |
| `teamcollab005_qa` | Static BFF/UI/security checker | 24 required checks covering identity, authz, DTO privacy, fallback, UI behavior, and TEAMCOLLAB-006+ scope exclusion |
| Mainline | Server page, loading state, integration, route proof, docs/state | Direct `requireUser()` + service load, package command, build/browser proof, cleanup, evidence/task updates |

## Research / Reference Basis

- Page requirement understanding score: 89/100 High, inherited from `RES-026`.
- Required/completed rounds: three, already completed for the same Work collaboration issue across local product/code fit, comparable collaboration UI patterns, and data/BFF/auth/AI safety.
- Selected: request-time Server Component loader -> server-only authorization service -> capability resolver -> redacted DTO -> Client Component query-link navigation.
- Selected compatibility rule: only missing collaboration tables (`P2021`) or exactly zero memberships may use labelled exact-owner legacy reads; other errors are unavailable and corrupt persisted membership state fails closed.
- Selected detail rule: TEAM project cards remain index-only with `detailHref: null` until a project detail service implements membership/grant authorization.
- Rejected: localStorage/sessionStorage authorization, trusting the query workspace ID, raw Prisma models, API/GET indirection, client-token projection, mock fallback on DB errors, owner-ID-only TEAM detail access, and enabling invitation/transfer/write actions in the read slice.

## NANDA / Agent Protocol Alignment

- Applies because the wider collaboration track includes external collaborator feedback and future WorkAgent feedback retrieval.
- No AgentFacts-lite identity, provider, lifecycle, endpoint, protocol, skill, observability, or registry fields changed.
- Trust artifact: `WorkspaceProjectIndexDto` plus read-only capability snapshots form a redacted protected BFF boundary; no external agent receives workspace/project context.
- WorkAgent remains internal/protected/proposal-only for future work. `externalRegisterable: false` remains unchanged.
- Invitation, feedback retrieval, AI provider use, durable memory promotion, external collaboration packages, and external registration remain disabled and human-approval-gated.

## Changes

- Added `src/types/workspace-project-index.ts`.
- Added `src/lib/mappers/team-workspace.mapper.ts`.
- Added `src/lib/services/team-workspace.service.ts`.
- Updated `src/lib/services/auth.service.ts` to select only the existing identity fields needed by `requireUser()`, allowing unmigrated databases to reach the collaboration compatibility path.
- Updated `src/app/(dashboard)/work/page.tsx` to await Next.js 16 `searchParams`, call `requireUser()`, and load the BFF directly.
- Added `src/app/(dashboard)/work/loading.tsx`.
- Updated the Work client and project/focus cards for workspace selection and read-only shared rows.
- Added `scripts/check-team-workspace-project-index.mjs` and `pnpm teamcollab:project-index:check`.
- Updated PRD, acceptance, plan, backlog, sprint, task memory, completed log, loop state, and this evidence report.

## Verification

| Command / check | Result | Notes |
|---|---|---|
| `pnpm teamcollab:project-index:check` | PASS | 24/24 required BFF, DTO, UI, privacy, fallback, and no-expansion checks |
| `pnpm teamcollab:capability:check` | PASS | 20 built-in + 25 extended fixtures |
| targeted `pnpm exec eslint ...` | PASS | Work page/loading/client/cards, DTO, mapper, service, checker |
| `pnpm db:validate` | PASS | Prisma schema valid |
| `pnpm db:generate` | PASS | Prisma Client 7.8 regenerated |
| `pnpm exec tsc --noEmit --pretty false` | PASS | Whole repository |
| `pnpm build` | PASS | Next.js 16.2.4 production Webpack build; `/work` and `/work/[projectId]` dynamic routes generated |
| current configured-database browser smoke | PASS | `/work` returned 200 in labelled `legacy_personal_compatibility`; no schema write or live migration |
| disposable PostgreSQL/browser route smoke | PASS | Personal/team switch, selected state, TEAM project article/non-link, no TEAM add action, stale-ID fallback, no project leakage |
| browser console check | PASS | Zero errors/warnings after Work route tests |
| disposable cleanup | PASS | Dev server stopped, PostgreSQL stopped, owned temp directory removed |

## Evidence

- Initial `/work` displayed an active personal tab with 5 authorized projects and an available team tab with 1 authorized project.
- Selecting the team changed the URL to the team workspace query and rendered `團隊專案索引驗證` as `article "團隊專案索引驗證，唯讀專案"`, not a link.
- TEAM selection displayed workspace OWNER, 1 member, 1 visible project, and no `新增專案` action.
- Navigating to a guessed workspace UUID displayed `已回到可使用的工作區`, selected the authorized personal workspace, did not show the guessed UUID in visible text, and did not show the TEAM project.
- The disposable database used only `127.0.0.1`, existing deployable history, the review-only collaboration draft, deterministic seed data, and disposable fixtures. No configured/live database was mutated.
- Before the Auth projection fix, the configured database correctly exposed schema drift: Prisma's default Profile selection requested the pending `auth_user_id` column and prevented the workspace fallback from running. Selecting only `id/email/role` removed that accidental column dependency without changing identity or role semantics; the configured database then rendered the explicit legacy mode with zero browser errors.
- Product capability delta: the Work project index is now membership/capability aware and user-operable.
- Proof delta: the runtime path is proven against real PostgreSQL data and rendered browser behavior, not only source markers.
- Blocker delta: `TEAMCOLLAB-006` may build on a verified read boundary, but its writes/provider delivery remain approval-gated.
- Launch delta: none; formal level stays L0.

## Remaining Risks

- The collaboration migration remains review-only and is not applied to the configured live database; production workspace rows are therefore not yet available.
- The current project detail loader still uses exact `ownerId`; TEAM project detail, editing, comments, and audit must remain unavailable until a later service-authorized slice.
- After a collaboration migration, even a PERSONAL workspace intentionally hides the legacy add-project action because that action does not yet persist `workspaceId`; an authorized workspace-aware create path is still required before restoring it.
- Workspace project counts currently require per-workspace project reads; pagination/count-query optimization may be needed at larger scale.
- Invitation lifecycle, project transfer/grants, feedback moderation, deletion/offboarding, AI retrieval/memory review, audit persistence, and JWT-aware RLS proof remain later tasks.
- Real provider invitation/recipient action and all high-risk Auth/Permission writes need explicit owner approval.

## Final Status

- `TEAMCOLLAB-005`: complete.
- Live schema apply: not performed.
- Launch level: unchanged.
- Next loop: required loop-205 launch-level review; after it, `TEAMCOLLAB-006` remains the next collaboration stage only with explicit approval for its high-risk write/provider boundaries.
