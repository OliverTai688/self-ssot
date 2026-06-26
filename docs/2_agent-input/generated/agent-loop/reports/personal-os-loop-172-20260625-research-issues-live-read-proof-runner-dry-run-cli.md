# Personal OS Loop 172 Evidence - Research Issues Live-Read Proof Runner Dry-Run CLI

## Strategic Review Gate

- Current launch target: POST_30_CONVERGENCE toward `L1_PRIVATE_ONLINE_WORK_OS`, with conditional product maturity still at `C3_ARCHITECTURE_GATE_READY`.
- Last three loops: loop 170 launch review kept formal launch at `L0_LOCAL_PROTOTYPE`; loop 171 completed the RES-001/RES-002 research-to-task review and created BFF-015; this loop implemented BFF-015.
- Current blocker: `AUTH-005` still lacks Supabase public env plus signed-in `/auth/status` evidence, `WORK-009` lacks safe proof target/write confirmations, and `DEPLOY-002` remains downstream.
- Selected task: `RESEARCH-BFF-015-RESEARCH-OWNER-READ-ISSUES-LIVE-READ-PROOF-RUNNER-DRY-RUN-CLI`.
- Capability delta: owner/operator can now run a no-secret Research issues live-read dry-run packet and inspect missing prerequisites without any Research DB read.

## Implementation

- Added `scripts/run-research-owner-read-issues-live-read-proof-runner.mjs`.
- Added `scripts/check-research-owner-read-issues-live-read-proof-runner-dry-run-cli.mjs`.
- Added package scripts:
  - `pnpm research:read-issues-live-read-proof-runner:run`
  - `pnpm research:read-issues-live-read-proof-runner:dry-run:check`
- Updated `ACC-002`, `PLN-060`, `PLN-061`, `tasks.md`, `RPT-007`, and `loop-state.json`.
- Added `RESEARCH-BFF-016-RESEARCH-OWNER-READ-ISSUES-LIVE-READ-ELIGIBILITY-GATE` as the next no-live-read gate.

## Proof Packet Result

- Dry-run status: `dry_run_ready_no_live_research_read`.
- BFF-014/BFF-013/BFF-012 dependency markers: ready.
- Owner-run readiness: false.
- Future live-read eligibility: false.
- Missing owner-run prerequisites:
  - `PERSONAL_OS_RESEARCH_READ_PROOF_ALLOW_LIVE_READ=1`
  - `PERSONAL_OS_RESEARCH_READ_PROOF_CONFIRM=I_UNDERSTAND_THIS_READS_OWNER_RESEARCH_DATA`
  - `PERSONAL_OS_RESEARCH_READ_PROOF_TARGET`
  - AUTH-005 sanitized owner/Profile evidence.

## Safety Boundary

- `liveReadExecutionAllowed: false`
- `runtimeDbReadEnabled: false`
- `runtimePrismaReadEnabled: false`
- `runtimeDbWriteEnabled: false`
- `externalAgentDatabaseAccessAllowed: false`
- `externalRegisterable: false`
- No Prisma/db imports.
- No DB connection.
- No live Research read/write.
- No route handler or server action.
- No public output, external collaboration, Research final write, or launch-level claim.

## Verification

- PASS: `node --check scripts/run-research-owner-read-issues-live-read-proof-runner.mjs`
- PASS: `node --check scripts/check-research-owner-read-issues-live-read-proof-runner-dry-run-cli.mjs`
- PASS: `pnpm research:read-issues-live-read-proof-runner:run -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-172-20260625-research-issues-live-read-proof-runner-dry-run.json`
- PASS: `pnpm research:read-issues-live-read-proof-runner:dry-run:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-172-20260625-research-issues-live-read-proof-runner-dry-run-check.json`
- PASS: `pnpm research:read-issues-live-read-proof-runner:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-172-20260625-research-issues-live-read-proof-runner-contract-check.json`
- PASS: `pnpm research:read-issues-selected-field-runtime-adapter:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-172-20260625-research-issues-selected-field-check.json`
- PASS: `pnpm research:read-issues-service-authz-runtime:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-172-20260625-research-issues-service-authz-check.json`
- PASS: generated JSON parse.
- PASS: `pnpm db:validate`
- PASS: `pnpm exec tsc --noEmit --pretty false`
- PASS: `git diff --check`

## Owner-Run Handoff

When owner-run prerequisites are ready, run:

```bash
PERSONAL_OS_RESEARCH_READ_PROOF_ALLOW_LIVE_READ=1 \
PERSONAL_OS_RESEARCH_READ_PROOF_CONFIRM=I_UNDERSTAND_THIS_READS_OWNER_RESEARCH_DATA \
PERSONAL_OS_RESEARCH_READ_PROOF_TARGET=local_or_disposable_or_owner_approved \
pnpm research:read-issues-live-read-proof-runner:run -- --json --out docs/2_agent-input/generated/agent-loop/reports/owner-research-issues-read-dry-run.json
```

Pass signal: `futureLiveReadEligible` may only become true when sanitized auth proof also allows AUTH-005. Even then, BFF-015 still does not execute a live read.

## NANDA / Agent Boundary

- Affected surface: Research agent proposal/readiness surface.
- Status: protected-owner visible, proposal-only, non-registerable.
- External collaboration: disabled.
- External agent database access: disabled.
- Final writes: human approval required.

## Next Task

Run `AUTH-005` if Supabase/session evidence appears, `WORK-009` if safe Work proof target plus confirmations appear, otherwise implement `RESEARCH-BFF-016-RESEARCH-OWNER-READ-ISSUES-LIVE-READ-ELIGIBILITY-GATE`.
