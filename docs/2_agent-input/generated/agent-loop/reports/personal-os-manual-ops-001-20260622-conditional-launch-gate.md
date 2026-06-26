# Personal OS Manual Ops Evidence Report — Conditional Launch Gate

## Task

- Task ID: `MANUAL-OPS-001`
- Title: Convert no-upgrade reasons into Manual Ops
- Date: 2026-06-22
- Agent: Codex

## Source Docs Read

- `AGENTS.md`
- `docs/00_manual-and-index/MAN-000_docs-usage-manual.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/08_acceptance-and-qa/ACC-003_launch-proof-checklist.md`
- `docs/04_playbook/PBK-001_launch-env-unblock-handoff.md`
- Last three completed reports: loop 98 `AGENT-016`, loop 99 `AUDIT-OPS-002`, loop 100 `LOOP-100`

## Scope

- In scope: Identify why formal launch level did not upgrade, decide whether conditional workflow upgrade is valid, add a no-secret Manual Ops checker, document the conditional gate, and update task memory.
- Out of scope: Formal L1 claim, auth provider mutation, env mutation, DB writes, migrations, deployment writes, public output expansion, Client Portal token writes, persisted audit rows, high-risk final writes, or external registration.

## Strategic Review

- Current launch level / target: Formal level remains `L0_LOCAL_PROTOTYPE`; target remains `L1_PRIVATE_ONLINE_WORK_OS`.
- Last three reports reviewed: loop 98 agent readiness matrix, loop 99 audit readiness catalog, loop 100 launch-level review.
- Last-three-loop delta: protected agent visibility, audit operation mapping, and launch blocker review are complete.
- Repetition check: This task is not another readiness summary; it adds a checker that changes blocker handling from vague blocked state to explicit Manual Ops rows.
- Current strongest blocker: owner/operator evidence is missing: Supabase public env, signed-in auth status, Work proof target, Docker proof, and deployment marker.
- Acceptance / roadmap / research / blocker mapping: Maps to `ACC-003`, new `ACC-007`, `PBK-001`, `AUTH-005`, `WORK-009`, `WORK-007`, and `DEPLOY-002`.
- Expected capability, proof, or blocker delta: Formal L1 remains honest, while the workflow can conditionally upgrade to `M1_MANUAL_OPS_READY`.

## Research / Reference Basis

- Local docs/code reviewed: launch proof checklist, launch unblock playbook, launch readiness script, auth proof script, Work proof target script, Docker proof script, launch operator action registry, loop state, backlog, sprint, and recent reports.
- External or reference websites reviewed: None. The issue was local launch evidence and project policy, not a current external API behavior question.
- Page requirement understanding score: N/A.
- Understanding level: High for checker/documentation scope because all proof scripts and blockers already exist.
- Required research optimization rounds: N/A.
- Completed rounds and lenses: local launch proof lens, owner-run evidence lens, formal-vs-conditional level semantics lens.
- Same-issue synthesis: The system was not upgrading because formal L1 correctly requires proof that has not been collected. The right move is not to lower L1, but to add a Manual Ops conditional level.
- Selected implementation pattern: `pnpm launch:manual-ops` reads existing no-secret readiness/proof helpers and emits a Manual Ops packet with formal level unchanged.
- Rejected alternatives: Directly set `launchLevels.current` to L1; mark AUTH/Work/deploy as done without evidence; keep blockers as vague `BLOCKED`; collect secrets or raw proof bodies.
- Task shape created or updated: `MANUAL-OPS-001`, `ACC-007`, package script, task memory, loop state, and generated evidence.

## NANDA / Agent Protocol Alignment

- Applies?: Partially. Manual Ops includes external agent registration as a blocked high-risk area through existing action registry policy, but this task does not change agent runtime.
- Affected agents or capabilities: None.
- AgentFacts-lite fields changed: None.
- Internal discovery / registry state: Unchanged.
- External registration state: `externalRegisterable=false`; no external registration was added.
- Trust, auth, approval, and data-visibility boundaries: Manual Ops packets exclude secrets, private identifiers, raw claims, tokens, database URLs, and public-output expansion.
- Concrete protocol artifact created: No agent protocol artifact; launch Manual Ops artifact created.
- NANDA / AgentFacts / MCP / A2A sources reviewed: Local `ARC-028` policy remains in force; no external protocol behavior changed.

## Changes

- Files changed:
  - `scripts/check-manual-ops-launch-gate.mjs`
  - `package.json`
  - `docs/08_acceptance-and-qa/ACC-007_manual-ops-conditional-launch-gate.md`
  - `docs/08_acceptance-and-qa/ACC-003_launch-proof-checklist.md`
  - `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
  - `docs/00_manual-and-index/MAN-001_document-index.md`
  - `docs/05_execution-plans/PLN-060_task-backlog.md`
  - `docs/05_execution-plans/PLN-061_current-sprint.md`
  - `docs/06_audits-and-reports/RPT-007_completed-log.md`
  - `tasks.md`
  - `docs/2_agent-input/generated/agent-loop/loop-state.json`
- Behavior changed: New `pnpm launch:manual-ops` checker emits conditional Manual Ops launch gate packets.
- Docs changed: `ACC-007` defines `M0`, `M1`, and `M2` Manual Ops workflow levels and explicitly preserves formal L1 requirements.

## Verification

| Command | Result | Notes |
|---|---|---|
| `node --check scripts/check-manual-ops-launch-gate.mjs` | Passed | Script syntax valid. |
| `pnpm launch:manual-ops -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-manual-ops-001-20260622-manual-ops-gate.json` | Passed | Status `manual_ops_ready`; conditional level `M1_MANUAL_OPS_READY`; formal L1 false. |
| `pnpm launch:manual-ops -- --json` | Passed | Printed no-secret JSON packet. |
| `pnpm launch:proof -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-manual-ops-001-20260622-launch-proof.json` | Blocked as expected | Missing Supabase public env and deployment marker. |
| `pnpm auth:proof -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-manual-ops-001-20260622-auth-proof.json` | Blocked as expected | No signed-in `/auth/status` evidence. |
| `pnpm work:proof-target:check -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-manual-ops-001-20260622-work-target.json` | Needs operator input | Missing Work proof target and confirmations. |
| `pnpm work:proof:docker-disposable -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-manual-ops-001-20260622-docker-work.json` | Docker daemon unavailable | Owner-run Docker proof remains Manual Ops. |
| `pnpm exec tsc --noEmit --pretty false` | Passed | TypeScript baseline remains valid. |
| `pnpm db:validate` | Passed | Prisma schema remains valid. |
| JSON parse | Passed | Manual Ops and loop-state packets parse. |
| `git diff --check` | Passed | No whitespace errors. |

## Evidence

- Relevant output or observation: `pnpm launch:manual-ops` reported `manual_ops_ready`, formal level `L0_LOCAL_PROTOTYPE`, `canUpgradeToL1Now=false`, conditional level `M1_MANUAL_OPS_READY`, and five Manual Ops rows.
- Screenshots or browser checks: Not applicable; no UI changed.
- DB checks: `pnpm db:validate` passed; no DB connection or writes were performed.
- Product capability delta: New CLI checker makes no-upgrade causes actionable.
- Proof delta: Conditional Manual Ops evidence can now be generated without secrets.
- Blocker delta: Formal blockers are no longer ambiguous; they are owner/operator rows.
- Agent protocol-readiness delta: External registration remains disabled and unchanged.

## Remaining Risks

- `M1_MANUAL_OPS_READY` is not `L1_PRIVATE_ONLINE_WORK_OS`.
- `AUTH-005`, `WORK-009`, `WORK-007`, `DEPLOY-002`, L1, L3, and L4 remain unproven until owner/operator evidence exists.
- The Docker Work proof writes to a disposable local DB when run; owner must inspect the child Work proof packet and cleanup state.

## Final Status

- Status: `MANUAL-OPS-001` complete.
- Recommended next task: If owner/operator evidence appears, run `AUTH-005` or `WORK-009`; otherwise continue loop 101 with `AUDIT-OPS-003`.
