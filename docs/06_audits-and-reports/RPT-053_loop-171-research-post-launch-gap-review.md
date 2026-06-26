# Loop 171 Research Post Launch Gap Review

**Document ID:** `RPT-053`
**Date:** 2026-06-25
**Status:** Complete
**Task:** `LOOP-171-RESEARCH-POST-LAUNCH-GAP-REVIEW`

## 1. Purpose

Loop 171 is the due `RES-001` / `RES-002` research-to-task review after the loop 170 launch-level review. Its job is to avoid another adjacent proof/status loop when formal launch evidence is still owner/operator-gated, and to convert the highest-leverage current gap into an implementation-ready task.

## 2. Strategic Review Gate

| Question | Answer |
|---|---|
| Current product target | Formal launch stays `L0_LOCAL_PROTOTYPE`; next formal target is `L1_PRIVATE_ONLINE_WORK_OS`; Manual Ops stays `M1_MANUAL_OPS_READY`; conditional product maturity stays `C3_ARCHITECTURE_GATE_READY`. |
| Last three completed loops | Loop 168 converted the selected-field adapter gap into `RESEARCH-BFF-014`; loop 169 implemented the dry-run-first live-read proof-runner contract; loop 170 refreshed launch proof and kept formal launch blocked. |
| Current strongest blocker | `AUTH-005`, `WORK-009` / `WORK-007`, and `DEPLOY-002` remain blocked by missing owner/operator evidence. |
| Anti-repeat read | Loop 170 was a required launch review. Loop 171 is a required research cadence loop, but it must produce a runtime/proof implementation task instead of another status-only artifact. |
| Moved item | `RES-001`, `RES-002`, `ACC-002`, `DBS-003`, `AUT-002`, `AUT-005`, and the Research owner-read BFF chain. |
| More true after this loop | The next Research real-data step is no longer vague: `RESEARCH-BFF-015` is the dry-run CLI proof runner that can generate an owner-run no-secret packet before any live Research read is considered. |

## 3. Proof Preemption Result

`pnpm launch:preempt:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-171-20260625-launch-preemption-router.json` still recommends `RES-001-RESEARCH-REVIEW`.

Blocked candidates:

- `AUTH-005`: missing Supabase public URL, publishable key, and signed-in `/auth/status` evidence.
- `WORK-009`: missing `WORK_PROOF_DATABASE_URL`, target approval, write allow flag, and confirmation phrase.
- `DEPLOY-002`: downstream of auth and Work proof plus deployment marker.

Therefore this loop did not upgrade formal launch level and did not select live proof work.

## 4. Highest-Leverage Gap

Selected gap: Research owner-read issues live-read proof runner has a contract and checker (`RESEARCH-BFF-014`), but it does not yet have a dedicated owner-run CLI runner that emits a structured no-secret dry-run proof packet.

Why this gap wins:

- It converts the Research real-data path from proposal/checker to an owner-runnable proof surface.
- It advances a DB-backed module read path without requiring schema changes, writes, public output, external collaboration, or formal launch claims.
- It gives the owner a single command to inspect when proof inputs exist, while keeping the live read disabled until the next explicit task.

## 5. Understanding Score

Subject: `RESEARCH-BFF-015-RESEARCH-OWNER-READ-ISSUES-LIVE-READ-PROOF-RUNNER-DRY-RUN-CLI`

| Dimension | Score | Reason |
|---|---:|---|
| Actor/job clarity | 20/20 | Owner/operator needs a safe CLI proof packet before any Research live-read attempt. |
| PRD/local evidence fit | 20/20 | `RES-001`, `RES-002`, `DBS-003`, `ACC-002`, and loops 168-170 all route toward this exact proof step. |
| Data/BFF/API clarity | 19/20 | BFF-012 through BFF-014 define owner identity, selected fields, mapper boundary, proof target, allow flag, and stop conditions. |
| UI/reference-pattern confidence | 14/15 | This is a CLI/proof workflow rather than a visual page; current protected `/research/readiness` already supplies the UI mirror. |
| Risk/auth/public-output clarity | 15/15 | Live reads, writes, public output, external agent access, external registration, and launch claims remain explicitly disabled. |
| Acceptance/verification clarity | 10/10 | Next task can be verified through node syntax checks, a dry-run packet, the existing BFF chain checks, JSON parse, db validate, typecheck, and diff check. |
| **Total** | **98/100** | High understanding. Three same-issue research rounds are enough. |

## 6. Research Optimization Rounds

### Round 1 - Local Product, Code, And Evidence Fit

Reviewed local artifacts:

- `src/lib/services/research-owner-read-issues-live-read-proof-runner.service.ts`
- `scripts/check-research-owner-read-issues-live-read-proof-runner.mjs`
- `src/lib/services/research-owner-read-dto.service.ts`
- protected `/research/readiness`
- `DBS-003`, `AUT-002`, `AUT-005`, `ACC-002`
- loop 168, 169, and 170 reports

Selected pattern: add a separate CLI runner for BFF-015, while keeping the existing BFF-014 checker as the contract verifier.

Rejected alternatives:

- Mutate the BFF-014 checker into a runner, because checker and owner-run proof have different responsibilities.
- Enable Prisma live read in this loop, because proof target and owner approval are not present.
- Add a route handler/server action first, because the safest next step is local owner-run proof, not HTTP exposure.

Requirement update: BFF-015 must emit a no-secret dry-run JSON packet, classify prerequisites as booleans/categories only, and keep live read disabled.

### Round 2 - Framework And Provider Guidance

Reviewed primary/local guidance:

- local Next.js data security docs in `node_modules/next/dist/docs/01-app/02-guides/data-security.md`
- local Next.js Server/Client Component docs in `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- Prisma official selected-field guidance: https://www.prisma.io/docs/orm/prisma-client/queries/select-fields
- Supabase official server-side Auth for Next.js: https://supabase.com/docs/guides/auth/server-side/nextjs

Selected pattern: keep data access behind a server-only service/DAL boundary and keep the CLI dry-run packet separate from any future live Prisma adapter execution.

Rejected alternatives:

- Passing raw rows or raw auth data through the proof packet.
- Letting a Client Component or UI action collect live-read secrets.
- Expanding selected fields beyond the BFF-013 scalar and `_count` boundary.

Requirement update: BFF-015 should not print Supabase URLs/keys, database URLs/hosts, cookies, tokens, raw claims, Profile ids, actual owner emails, raw Prisma rows, source bodies, or private Research content.

### Round 3 - Auth, NANDA, Manual Ops, And Acceptance Boundary

Reviewed:

- `ARC-028_nanda-agent-protocol-alignment.md`
- `AUT-002_auth-runtime-strategy.md`
- `AUT-005_owner-demo-account-boundary.md`
- `RES-005_conditional-l3-interface-scenario-architecture-gap-research.md`
- loop 171 proof preemption packet

Selected pattern: BFF-015 is protected-owner/local CLI proof readiness only, not an agent operation, public endpoint, external registration, or launch-level proof.

Rejected alternatives:

- Use Manual Ops readiness to claim formal L1/L3/L4.
- Allow external agents to run or receive Research DB proof packets.
- Treat a dry-run packet as a live Research read success.

Requirement update: BFF-015 may advance proof readiness, but formal launch remains blocked until `AUTH-005`, Work proof, and deployment evidence exist.

## 7. Executable Task Created

| Field | Value |
|---|---|
| Task id | `RESEARCH-BFF-015-RESEARCH-OWNER-READ-ISSUES-LIVE-READ-PROOF-RUNNER-DRY-RUN-CLI` |
| Scope | Add an owner-run no-secret dry-run CLI runner for the Research issues live-read proof path. |
| Likely files | `scripts/run-research-owner-read-issues-live-read-proof-runner.mjs`, `scripts/check-research-owner-read-issues-live-read-proof-runner-dry-run-cli.mjs`, `package.json`, `ACC-002`, generated evidence, task memory. |
| Acceptance | CLI emits JSON dry-run packet; verifies BFF-014/BFF-013/BFF-012 prerequisites; classifies allow flag, confirmation phrase, proof target, and auth proof availability without printing secret values; keeps `liveReadExecutionAllowed=false`, `runtimePrismaReadEnabled=false`, writes/public/external/registration false. |
| Verification | `node --check` for new scripts, new `pnpm research:read-issues-live-read-proof-runner:run -- --dry-run --json --out ...`, new checker, BFF-014/BFF-013/BFF-012 checks, JSON parse, `pnpm db:validate`, `pnpm exec tsc --noEmit --pretty false`, `git diff --check`. |
| Stop conditions | Stop before Prisma/db import, database connection, live Research read/write, schema/migration/seed change, route handler, server action, public output, external collaboration, external agent DB access, Research agent final write, external registration, or launch-level upgrade. |

## 8. NANDA / Agent Protocol Gate

Applies lightly because this is Research agent-adjacent, but BFF-015 does not create an agent runtime or external agent capability.

- Affected surface: Research owner-read proof readiness and Research agent proposal boundary.
- AgentFacts-lite fields changed: none.
- Runtime classification: protected-owner local CLI dry-run proof, not external-registerable.
- External registration: remains `false`.
- Trust boundary: no public output, no external collaboration, no external agent database access, no Research agent final writes, no cross-organization sharing.
- Concrete artifact: implementation-ready BFF-015 task row plus acceptance criteria.

## 9. Verification Performed In This Loop

| Command | Result | Notes |
|---|---|---|
| `pnpm launch:preempt:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-171-20260625-launch-preemption-router.json` | Passed | Proof preemption unavailable; routes to research fallback. |
| `pnpm research:read-issues-live-read-proof-runner:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-171-20260625-research-live-read-proof-runner-contract-check.json` | Passed | BFF-014 contract ready, dry-run only, live read disabled. |
| `pnpm research:read-issues-selected-field-runtime-adapter:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-171-20260625-selected-field-runtime-adapter-check.json` | Passed | BFF-013 selected-field gate remains ready. |
| `pnpm research:read-issues-service-authz-runtime:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-171-20260625-service-authz-runtime-check.json` | Passed | BFF-012 service-authz proof remains ready. |

Final repository verification is recorded in the generated loop evidence report.

## 10. Launch Decision

No formal launch upgrade is claimed.

- Formal launch: `L0_LOCAL_PROTOTYPE`
- Manual Ops: `M1_MANUAL_OPS_READY`
- Conditional product maturity: `C3_ARCHITECTURE_GATE_READY`
- Next formal target: `L1_PRIVATE_ONLINE_WORK_OS`

## 11. Next Task

Run `RESEARCH-BFF-015-RESEARCH-OWNER-READ-ISSUES-LIVE-READ-PROOF-RUNNER-DRY-RUN-CLI` unless `AUTH-005` or `WORK-009` prerequisites appear first.
