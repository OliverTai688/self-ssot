# RPT-048 Loop 160 Launch Level And Research Review

Date: 2026-06-24

## Summary

Loop 160 ran the required fifth-loop launch review and the due RES-001 / RES-002 research-to-task review after `RESEARCH-BFF-008-RESEARCH-OWNER-READ-ADAPTER-MOCK-HARNESS`.

Formal launch remains `L0_LOCAL_PROTOTYPE`. The system is still not eligible for `L1`, `L3`, or `L4` because `AUTH-005`, `WORK-009` or an approved Work persistence proof, and `DEPLOY-002` evidence are absent. Manual Ops remains `M1_MANUAL_OPS_READY`, and conditional product maturity remains `C3_ARCHITECTURE_GATE_READY`.

The highest-leverage next task is `RESEARCH-BFF-009-RESEARCH-OWNER-READ-FIRST-RUNTIME-ADAPTER-SLICE`: select the first owner-scoped Research read family and implement a proof-gated runtime adapter slice only as far as the current auth and proof boundaries safely allow.

## Launch Decision

| Level | Decision | Reason |
|---|---|---|
| `L0_LOCAL_PROTOTYPE` | Keep | Local/prototype and protected surfaces remain usable, but real owner launch proof is incomplete. |
| `M1_MANUAL_OPS_READY` | Keep | `pnpm launch:manual-ops` converts remaining no-upgrade reasons into owner/operator Manual Ops rows without claiming formal L1. |
| `C3_ARCHITECTURE_GATE_READY` | Keep | Interface, scenario, architecture, backend operation catalog, module index, and agent readiness checks remain green. |
| `L1_PRIVATE_ONLINE_WORK_OS` | Do not upgrade | Missing Supabase public env/session evidence, Work proof target/write confirmations, and deployment marker. |
| `L3_FULL_FRONT_MEMBER_ADMIN_EXPERIENCE` | Do not upgrade formally | Product viewframes are conditionally mature, but formal evidence gates remain blocked. |
| `L4_HARDENED_PRIVATE_LAUNCH` | Do not upgrade | Hardened private launch requires the same owner-run auth, Work persistence, deployment, and route proof evidence. |

## No-Upgrade Reasons

1. `AUTH-005` cannot run because Supabase public URL/key and signed-in sanitized `/auth/status` evidence are not present.
2. `WORK-009` cannot run because no safe Work proof target, write confirmations, or approved local/disposable proof setup is present.
3. `DEPLOY-002` remains downstream until auth/session and Work proof are meaningful.
4. `OWNER-UI-REVIEW` still blocks the conditional full-experience claim; this is owner-run visual evidence and should not consume adjacent dev loops unless the owner reports a concrete UI issue.
5. External agent/NANDA registration remains blocked because endpoint, auth scope, trust, telemetry, rollback, public-safety review, deployment proof, and human approval are incomplete.

## Last-Five-Loop Review

| Loop | Primary Result | Class |
|---|---|---|
| 156 | `RESEARCH-BFF-006` service loader skeleton | Runtime-facing protected UI/service contract |
| 157 | Research post-loader gap review and `RESEARCH-BFF-007` routing | Required research review |
| 158 | `RESEARCH-BFF-007` adapter authz contract | Implementation/proof contract |
| 159 | `RESEARCH-BFF-008` adapter mock harness | Implementation/proof harness |
| 160 | Launch level plus research review | Required launch/research review |

The loop sequence is not repeating low-value documentation. It has produced a progressive Research BFF chain from DTO contract to service surface, authz, mapper, query plan, service loader, adapter authz, and mock harness. Because loop 160 is review-heavy by cadence, loop 161 should be an implementation slice unless `AUTH-005` or `WORK-009` becomes runnable.

## Research-To-Task Review

Page / workflow issue: Research owner-read first runtime adapter slice.

Requirement understanding score: 94 / 100, High.

| Dimension | Score | Rationale |
|---|---:|---|
| Actor/job clarity | 19 / 20 | Protected owner needs real Research read rows behind the readiness surface without exposing unsafe writes or public output. |
| PRD/local evidence fit | 20 / 20 | RES-001, RES-002, DBS-003, ACC-002, and BFF-001 through BFF-008 all point to Research real-data/BFF progression. |
| Data/BFF/API clarity | 19 / 20 | Query-plan, authz, mapper, and mock harness exist; the first runtime adapter still needs the exact safest family selection. |
| UI interaction/reference confidence | 14 / 15 | Existing `/research/readiness` surface already exposes rows, states, and next safe loader actions. |
| Risk/auth/public-output clarity | 14 / 15 | Owner identity, service authorization, no caller owner id, no direct thread-only reads, no public output, and proposal-only agent boundaries are clear. |
| Acceptance/verification clarity | 8 / 10 | Existing checkers cover prerequisites; loop 161 must add a task-specific runtime-adapter checker or stop if runtime DB proof is unsafe. |

Required research rounds for High level: 3.

Completed same-issue rounds:

1. Local BFF chain review: confirmed `RESEARCH-BFF-001` through `RESEARCH-BFF-008` provide DTO, service, authz, mapper, query-plan, loader, adapter-authz, and fixture harness coverage before runtime reads.
2. Launch/proof boundary review: confirmed formal launch cannot upgrade until owner/operator evidence exists, so the next Research task must not depend on formal launch proof and must not claim persistence unless its own proof target is safe.
3. Auth/NANDA/acceptance boundary review: confirmed Research agent outputs remain protected-owner visible and proposal-only; external registration stays false; first adapter slice must preserve service authorization, selected fields, UI-safe mapping, no public route, no server action write, and no external collaboration.

Selected implementation pattern:

- Implement `RESEARCH-BFF-009` as the smallest owner-scoped Research read adapter slice, defaulting to `issues` or `sources` only after loop 161 inspects current code/schema one more time.
- Prefer a service-owned adapter boundary and checker over a route handler.
- If runtime DB reads are not safe, implement a proof-gated adapter skeleton plus verifier that proves runtime execution remains disabled until `requireUser()`/Profile evidence and proof target criteria pass.

Rejected alternatives:

- Do not jump directly to all 11 Research families.
- Do not expose a public or external agent Research API.
- Do not let Client Components import Prisma, raw model payloads, provider secrets, or database clients.
- Do not use caller-supplied owner identifiers, direct `threadId`-only reads, or raw Prisma passthrough.
- Do not spend loop 161 on another broad review unless proof prerequisites suddenly become runnable.

## Top Gaps After Loop 160

| Rank | Gap | Severity | Leverage | Next action |
|---:|---|---:|---:|---|
| 1 | Real auth/Profile proof | 3 | 3 | Run `AUTH-005` only after Supabase public env and signed-in sanitized `/auth/status` evidence exist. |
| 2 | Work persistence proof | 3 | 3 | Run `WORK-009` only after a safe proof target and write confirmations exist. |
| 3 | Deployment proof | 3 | 3 | Run `DEPLOY-002` after auth/session and Work proof are meaningful. |
| 4 | Research first real-data/BFF slice | 2 | 3 | Implement `RESEARCH-BFF-009` next if proof prerequisites remain absent. |
| 5 | External agent registration readiness | 2 | 2 | Keep externalRegisterable false until auth, scopes, trust, telemetry, deployment, rollback, and approval are complete. |

## Evidence

Current-loop checks refreshed launch, auth, Work, manual ops, proof freshness, interface/scenario/architecture, backend operations, module index, real-data migration matrix, owner evidence, Work source, Research BFF, and agent protocol readiness.

One freshness quirk remains: `launch:freshness:check` currently recognizes the loop 160 owner-plan packet when the canonical filename contains `20260623`, so this loop generated both the 20260624 owner-plan packets and the accepted canonical fallback copy. This affects freshness routing evidence naming only, not launch level.

## NANDA / Agent Protocol

Applies because the review includes agent protocol readiness and Research agent proposal boundaries.

- Affected capability: protected owner-visible Research agent proposal rows and internal AgentFacts-lite readiness.
- Registry state: internal-ready only.
- External registration: `externalRegisterable: false`.
- Trust boundary: no public endpoint, no external collaboration, no external agent database access, no provider call, no final write, no registration.
- Concrete artifact: refreshed agent registry/API/command/bus/command-center evidence and acceptance routing for `RESEARCH-BFF-009`.

## Final Decision

`LOOP-160-LAUNCH-LEVEL-AND-RESEARCH-REVIEW` is complete.

Next loop should run:

1. `AUTH-005` if Supabase public env plus signed-in `/auth/status` evidence appears.
2. `WORK-009` if a safe Work proof target and exact write confirmations appear.
3. Otherwise `RESEARCH-BFF-009-RESEARCH-OWNER-READ-FIRST-RUNTIME-ADAPTER-SLICE`.
