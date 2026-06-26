# Manual Ops Conditional Launch Gate

**Document ID:** `ACC-007`
**Last updated:** 2026-06-22
**Status:** Active
**Task:** `MANUAL-OPS-001`

## Purpose

This gate separates two things that were previously bundled together:

1. the formal launch level, which must stay below `L1_PRIVATE_ONLINE_WORK_OS` until auth, Work persistence, and deployment proof exist;
2. a conditional Manual Ops level, which can say the remaining blockers are owner/operator actions instead of product-development blockers.

This prevents the loop from treating missing owner-run evidence as proof that the product surface is not operable.

## Levels

| Level | Meaning | Formal launch impact |
|---|---|---|
| `M0_MANUAL_OPS_BLOCKED` | A checker failed before Manual Ops can be trusted. | No upgrade. |
| `M1_MANUAL_OPS_READY` | Remaining no-upgrade reasons are mapped to explicit owner/operator Manual Ops with commands, evidence targets, pass/fail signals, and no-secret rules. | Formal level remains `L0`; workflow can route blockers to Manual Ops. |
| `M2_MANUAL_EVIDENCE_READY_FOR_L1_REVIEW` | Manual Ops evidence appears collected and ready for formal L1 review. | Still does not change formal level by itself. |

`M1` and `M2` are conditional workflow states, not product launch levels.

## Command

```bash
pnpm launch:manual-ops
```

Write a no-secret packet:

```bash
pnpm launch:manual-ops -- --out docs/2_agent-input/generated/agent-loop/reports/<manual-ops-proof>.json
```

## Acceptance

- `pnpm launch:manual-ops` emits a JSON packet with:
  - `formalLaunchLevel.current`;
  - `formalLaunchLevel.canUpgradeToL1Now`;
  - `conditionalManualOps.level`;
  - `noUpgradeReasons`;
  - `manualOpsRows`;
  - `manualOpsSummary`;
  - `sourceChecks`;
  - `secretPolicy`.
- When formal L1 is blocked only by owner/operator evidence, the conditional level may be `M1_MANUAL_OPS_READY`.
- `M1_MANUAL_OPS_READY` must not change `launchLevels.current` to `L1_PRIVATE_ONLINE_WORK_OS`.
- Every manual op row must include command, evidence target, pass signal, fail signal, linked blocker class, risk, database-write flag, approval flag, and no-secret stance.
- Manual Ops must convert these no-upgrade reasons into owner/operator actions:
  - Supabase public env;
  - signed-in `/auth/status` evidence;
  - runtime or disposable DB readiness;
  - Work proof target and confirmations;
  - Docker disposable Work proof;
  - deployment marker proof.
- Manual Ops packets must not print Supabase URLs/keys, database URLs/hosts, cookies, tokens, raw claims, profile IDs, row IDs, client tokens, provider payloads, Docker socket paths, or external registry credentials.

## Formal L1 Still Requires ACC-003

Manual Ops does not replace the formal `L1` gate in `ACC-003`.

The formal level can only move toward `L1_PRIVATE_ONLINE_WORK_OS` after:

- launch proof is ready in the intended environment;
- signed-in Supabase `/auth/status` evidence is sanitized and accepted;
- `AUTH-005` is recorded;
- Work persistence proof passes;
- `WORK-007` or accepted equivalent browser/manual refresh proof is recorded;
- deployment marker proof is collected in the intended launch environment.

## Stop Rules

Stop before changing formal launch level when:

- Manual Ops rows are still open;
- proof packets are missing or unparseable;
- a valuable database could be mutated;
- public Client Portal output or token lifecycle writes are involved;
- external agent registration or cross-organization collaboration is involved;
- the evidence contains secrets or raw private payloads.
