# Loop 118 Source Workflow Post-L Gap Review

**Document ID:** `RPT-027`  
**Date:** 2026-06-23  
**Status:** Active research-to-task routing  
**Related task:** `LOOP-118`  

## Decision

Loop 118 confirms that `AUTH-005` and `WORK-009` still cannot safely preempt the automation loop:

- `pnpm launch:proof` remains blocked by missing Supabase public URL and publishable key.
- `pnpm auth:proof` reports `canRunAuth005=false` because Supabase public env and signed-in `/auth/status` evidence are absent.
- `pnpm work:proof-target:check` reports `canRunWORK009=false` because `WORK_PROOF_DATABASE_URL` and write confirmations are absent.

The next no-proof implementation task should be `DATTR-024M-CUTOVER-READINESS`: a formal Source Workflow cutover readiness contract/checker that aggregates the completed H/I/J/K/L gates into one machine-checkable promotion boundary before any migration apply, RLS policy apply, DB read/write, connector activation, public output, or external registration.

## Strategic Review

| Question | Answer |
|---|---|
| Current product target | Post-30 convergence toward `L3_FULL_FRONT_MEMBER_ADMIN_EXPERIENCE` while formal launch remains `L0_LOCAL_PROTOTYPE`. |
| Last three completed loops | Loop 115 kept launch honest and routed Source Workflow blockers; loop 116 completed connector runtime approval; loop 117 surfaced H/I/J/K/L gates in protected AI Input/admin/settings. |
| Current blocker | Full `DATTR-024` lacks one promotion gate that ties proof target, migration apply, identity strategy, RLS/audit, service authz, connector activation, rollback, and owner evidence together. |
| Is this repeated low-impact work? | No. This is the required third-loop `RES-001`/`RES-002` review after a runtime-facing UI slice, and it creates a new executable blocker row. |
| What moves? | The ambiguous "formal cutover later" blocker becomes `DATTR-024M-CUTOVER-READINESS`, with concrete acceptance, files, verification, risks, and stop conditions. |

## Research Inputs

Local sources reviewed:

- `AGENTS.md`
- `RES-001_next-thirty-loop-maturity-research.md`
- `RES-002_saas-os-operating-surface-maturity-research.md`
- `ARC-028_nanda-agent-protocol-alignment.md`
- `ARC-031_ai-input-source-workflow-bff-split-contract.md`
- `AUT-006_ai-input-source-workflow-rls-audit-storage.md`
- `AUT-007_ai-input-source-workflow-connector-runtime-approval.md`
- `MIG-003_ai-input-source-workflow-create-only-migration-draft.md`
- `ACC-002_module-acceptance-criteria.md`
- `PLN-060_task-backlog.md`
- `PLN-061_current-sprint.md`
- Loop 115, 116, and 117 reports

Primary external sources reviewed:

- Supabase Row Level Security docs: https://supabase.com/docs/guides/database/postgres/row-level-security
- Prisma Migrate deploy docs: https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate
- Next.js authentication guide: https://nextjs.org/docs/app/guides/authentication
- Next.js data security guide: https://nextjs.org/docs/app/guides/data-security

Key source implications:

- Supabase requires RLS on exposed schemas and shows that `auth.uid()` is `null` for unauthenticated requests, so cutover must explicitly prove authenticated identity and policy behavior before browser/API access.
- Prisma recommends `migrate deploy` in staging/production through CI/CD rather than ad hoc local production URLs, so migration apply must remain a controlled owner/operator promotion step.
- Next recommends centralizing authorization in a Data Access Layer and returning minimal DTOs; Server Actions remain externally callable POST endpoints and must verify auth/authz if introduced.
- RES-002 requires visible operations to map to BFF/API/CLI/auth/audit/manual-ops boundaries before runtime persistence or high-risk writes expand.

## Gap Matrix

| Area | Current state | Gap | Decision |
|---|---|---|---|
| Source Workflow cutover | H/I/J/K/L and ops surface are complete | No single machine-readable promotion gate ties proof target, migration apply, RLS/audit, service authz, connector runtime, rollback, and owner approval together | Add `DATTR-024M-CUTOVER-READINESS`. |
| Auth proof | `auth:proof` blocks on missing Supabase env/status evidence | Cannot claim real owner launch or run `AUTH-005` | Keep owner-run Manual Ops; do not spend more loop time collecting adjacent evidence. |
| Work proof | `work:proof-target:check` needs target and confirmations | Cannot run `WORK-009` | Keep owner-run handoff; do not claim Work refresh proof. |
| Admin/operator | Admin/settings now show evidence, actions, backend ops, and Source Workflow gates | Promotion readiness still split across many rows and docs | DATTR-024M should expose a single readiness/checker output for admin/settings later if needed. |
| Backend/API | Agent dry-run route is protected; Source Workflow runtime service is no-DB | Full DB-backed Source Workflow loaders/actions remain blocked | DATTR-024M should stop before route/server-action runtime but define exact promotion prerequisites. |
| Agent API/CLI | Internal agent API is protected and dry-run; external registration blocked | No external agent can touch Source Workflow data directly | Keep NANDA external registration disabled; DATTR-024M must preserve scoped context/proposal-only external boundary. |
| Multi-agent/NANDA | AgentFacts-lite and protected command center exist | No public endpoint/trust package for external collaboration | Not next; remains `AGENT-013` after auth/deploy/trust prerequisites. |

## Selected Task: DATTR-024M-CUTOVER-READINESS

Purpose: create a formal Source Workflow cutover readiness contract/checker that answers "what exact conditions must be true before full `DATTR-024` runtime can begin?"

Expected scope:

- Define ordered promotion gates:
  - proof target selected and write-confirmed;
  - migration draft promoted to deployable migration only after review;
  - migration apply strategy selected;
  - identity strategy selected;
  - RLS policy apply allowed;
  - persisted audit storage runtime allowed;
  - service runtime DB read/write flags still disabled until proof passes;
  - connector runtime approval selected only after proof/RLS/audit/rollback;
  - rollback/manual recovery plan present;
  - owner approval recorded;
  - external registration remains false.
- Add a checker exposed as `pnpm ai-input:cutover-readiness:check`.
- Keep all runtime side effects disabled.
- Update `ACC-002`, backlog, sprint, tasks, completed log, loop state, and evidence.

Likely files:

- `src/lib/contracts/ai-input-source-workflow-formal-cutover-readiness.contract.ts`
- `scripts/check-ai-input-source-workflow-formal-cutover-readiness.mjs`
- `package.json`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `tasks.md`

Verification:

- `node --check scripts/check-ai-input-source-workflow-formal-cutover-readiness.mjs`
- `pnpm ai-input:cutover-readiness:check`
- `pnpm ai-input:ops-surface:check`
- `pnpm ai-input:persistence-sequence:check`
- `pnpm ai-input:connector-runtime:check`
- `pnpm ai-input:rls-audit-storage:check`
- `pnpm db:validate`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

Stop conditions:

- Stop before schema/migration apply, generated Prisma migration promotion, DB connection, DB read/write, RLS policy apply, persisted audit write, route handler, server action, OAuth/webhook/polling/provider runtime, secret write, public output, high-risk module final write, external agent database access, external collaboration, or external registration.
- Stop if identity strategy, migration apply path, rollback ownership, or owner approval semantics become ambiguous.

## Rejected Alternatives

- Run full `DATTR-024` now: rejected because proof target/write confirmations, identity strategy, RLS apply, audit storage runtime, migration apply approval, and auth evidence are absent.
- Run `AUTH-005` now: rejected because `auth:proof` reports missing Supabase public env and signed-in `/auth/status` evidence.
- Run `WORK-009` now: rejected because no proof DB target or write confirmations are present.
- Activate connector runtime after DATTR-024L: rejected because DATTR-024L is approval-only and still depends on proof/RLS/audit/service/runtime activation.
- Start external NANDA/A2A/MCP adapter work: rejected because endpoint/auth/scopes/trust/deploy/public-safety/human approval remain absent.

## NANDA Gate

This review touches AI Input, agent-mediated source workflows, connector readiness, and external collaboration boundaries.

- Runtime posture: internal/protected-owner readiness only.
- AgentFacts-lite impact: no new external identity, endpoint, provider, skill, or registry record is approved.
- Trust boundary: external agents receive no direct database/provider access; future outputs remain scoped context packages and proposals.
- Observability: DATTR-024M should improve owner/operator observability through one no-secret readiness checker.
- Registry status: `externalRegisterable=false`.

## Next Routing

Run `DATTR-024M-CUTOVER-READINESS` in loop 119 unless `AUTH-005` or `WORK-009` proof prerequisites appear first.
