# Agent Loop Evidence Report

## Task

- Task ID: `AGENT-006`
- Title: Add AgentFacts-lite validation and registry readiness check
- Date: 2026-06-21
- Agent: QAAgent, DevOpsAgent

## Source Docs Read

- `AGENTS.md`
- `docs/00_manual-and-index/MAN-000_docs-usage-manual.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/01_product-requirements/PRD-004_next-stage-development-plan.md`
- `docs/01_product-requirements/PRD-005_situation-driven-prd.md`
- `docs/01_product-requirements/PRD-001_personal-os-situation.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/00_manual-and-index/MAN-002_development-loop.md`
- `docs/05_execution-plans/PLN-063_thirty-loop-launch-automation-plan.md`
- `docs/2_agent-input/generated/agent-loop/development-strategy.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/02_architecture-and-rules/ARC-020_internal-agents.md`
- `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`
- Last three reports: loops 25, 26, and 27

## Scope

- In scope: local no-secret AgentFacts-lite validation command, package script, registry README update, acceptance/task tracking, evidence, and loop state.
- Out of scope: external NANDA Index registration, public agent directory, runtime agent endpoint, DB schema/migration, provider writes, autonomous agent runtime, and public output.

## Strategic Review

- Current launch level / target: current remains `L0_LOCAL_PROTOTYPE`; target by loop 30 is `L3_FULL_FRONT_MEMBER_ADMIN_EXPERIENCE`, stretch `L4_HARDENED_PRIVATE_LAUNCH`.
- Last three reports reviewed: loop 25 launch-level review, loop 26 launch env handoff, loop 27 AgentFacts-lite inventory.
- Last-three-loop delta: proof blockers were made explicit, operator handoff was created, and internal agent manifests now cover all 15 `ARC-020` agents.
- Repetition check: this loop did not rewrite handoff or manifests; it converted the generated inventory into repeatable validation.
- Current strongest blocker: online launch proof is still blocked by missing Supabase public env/session evidence and no safe Work proof DB target.
- Acceptance / roadmap / research / blocker mapping: `AGENT-006` closes the protocol-validation gap while `AUTH-005`, `WORK-009`, and `WORK-007` remain blocked by external proof prerequisites.
- Expected capability, proof, or blocker delta: `pnpm agent:registry:check` provides a stable proof artifact for internal agent registry readiness and external registration blockers.

## Research / Reference Basis

- Local docs/code reviewed: `ARC-020`, `ARC-028`, `ARC-019`, generated manifests, `manifest-index.json`, existing proof scripts, `package.json`, backlog, sprint, and acceptance docs.
- External or reference websites reviewed:
  - [Project NANDA](https://github.com/projnanda/projnanda)
  - [AgentFacts format](https://github.com/projnanda/agentfacts-format)
  - [AgentFacts JSON Schema](https://raw.githubusercontent.com/projnanda/agentfacts-format/main/agentfacts_schema.json)
  - [NANDA Index](https://github.com/projnanda/nanda-index)
- Selected implementation pattern: no-dependency Node ESM checker matching existing proof-script style, with human output by default, optional JSON/file output, non-secret validation, and explicit internal-ready vs external-registration-blocked states.
- Rejected alternatives: full public AgentFacts compliance claim, external registration call, runtime endpoint, DB-backed registry table, schema migration, UI surface in the same loop, and broad JSON Schema dependency.
- Task shape created or updated: `AGENT-006` validates required fields, coverage, source references, risk gates, no-secret markers, index consistency, and missing registration-readiness fields.

## NANDA / Agent Protocol Alignment

- Applies?: Yes.
- Affected agents or capabilities: all 15 internal agents from `ARC-020`.
- AgentFacts-lite fields changed: no manifest fields changed; validation now enforces required root and manifest fields.
- Internal discovery / registry state: every manifest remains `internalDiscoverable: true`.
- External registration state: every manifest remains `externalRegisterable: false`, `registrationStatus: not-registered`; checker reports `blocked_by_policy`.
- Trust, auth, approval, and data-visibility boundaries: high/critical capabilities must require human approval; high-risk owner modules must use `HUMAN_APPROVAL_REQUIRED`; runtime auth methods/scopes stay empty until reviewed.
- Concrete protocol artifact created: `scripts/check-agent-registry.mjs` plus JSON evidence at `docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-28-20260621-agent-registry-check.json`.
- NANDA / AgentFacts / MCP / A2A sources reviewed: Project NANDA, AgentFacts format/schema, and NANDA Index. No MCP/A2A runtime adapter was implemented.

## Changes

- Files changed:
  - `scripts/check-agent-registry.mjs`
  - `package.json`
  - `docs/2_agent-input/generated/agent-loop/agent-registry/README.md`
  - `docs/00_manual-and-index/MAN-001_document-index.md`
  - `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
  - `docs/05_execution-plans/PLN-060_task-backlog.md`
  - `docs/05_execution-plans/PLN-061_current-sprint.md`
  - `docs/06_audits-and-reports/RPT-007_completed-log.md`
  - `docs/2_agent-input/generated/agent-loop/loop-state.json`
  - `tasks.md`
- Behavior changed: added `pnpm agent:registry:check`, which exits nonzero on validation errors and exits zero when manifests are internally ready while external registration remains blocked by policy.
- Docs changed: acceptance, backlog, sprint, task memory, completed log, index, registry README, and loop state now describe AGENT-006 completion and AGENT-007 as next default.

## Verification

| Command | Result | Notes |
|---|---|---|
| `curl -L --fail --silent https://raw.githubusercontent.com/projnanda/agentfacts-format/main/agentfacts_schema.json ...` | Passed | Confirmed upstream AgentFacts required fields include identity, provider, endpoints, capabilities, and skills. |
| `node --check scripts/check-agent-registry.mjs` | Passed | Script syntax valid. |
| `pnpm agent:registry:check -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-28-20260621-agent-registry-check.json` | Passed | `ready_for_internal_use`; 15 source agents, 15 manifests, 0 external-registerable agents, 14/14 high-risk capability gates, 0 validation errors. |
| `pnpm launch:proof -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-28-20260621-launch-proof.json` | Passed | Evidence collection passed; overall remains `blocked` due to missing Supabase public URL/key. |
| `pnpm auth:proof -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-28-20260621-auth-proof.json` | Passed | Evidence collection passed; `AUTH-005` cannot run without Supabase env and signed-in `/auth/status` evidence. |
| `pnpm work:proof -- --json` | Passed | Dry-run proof remains ready for review; no proof DB target or write confirmations supplied. |
| `node - <<'NODE' ... JSON.parse(...)` | Passed | Parsed loop state, registry manifests, manifest index, registry validation JSON, launch proof JSON, and auth proof JSON. |
| `rg -n 'AGENT-006.*TODO\|Loop 28:.*TODO\|default loop 28 is ...' ...` | Passed | No stale AGENT-006 TODO / loop 28 TODO next-task references remained in active loop docs. |
| `git diff --check` | Passed | No whitespace or conflict marker issues in touched diffs. |

## Evidence

- Relevant output or observation: `pnpm agent:registry:check` reports `Internal status: ready_for_internal_use`, `External registration: blocked_by_policy`, `Source agents: 15`, `Manifests: 15`, `Runtime endpoints: 0`, and `Validation errors: 0`.
- Screenshots or browser checks: not run; this loop was CLI validation and documentation tracking only.
- DB checks: no DB connection or writes were required.
- Product capability delta: internal agent registry evidence is now machine-checkable.
- Proof delta: generated registry validation JSON, launch proof JSON, and auth proof JSON for loop 28.
- Blocker delta: auth/session/Work launch blockers did not improve; agent protocol external registration blockers are now explicit and repeatable.
- Agent protocol-readiness delta: internal registry moves from static inventory to validated internal readiness; protected UI visibility remains `AGENT-007`.

## Remaining Risks

- External registration is intentionally blocked until protected readiness visibility, runtime endpoint, auth/scopes, trust attestations, telemetry claims, registry targets, and human approval exist.
- `AUTH-005` remains blocked by missing Supabase public env and signed-in `/auth/status` evidence.
- `WORK-009` / `WORK-007` remain blocked by lack of an explicitly safe local/disposable proof DB target and write confirmation.
- The checker is AgentFacts-lite, not a claim of full public AgentFacts compliance.

## Final Status

- Status: `DONE`
- Recommended next task: `AGENT-007` protected read-only agent protocol readiness surface unless `AUTH-005`, `WORK-009`, or `WORK-007` can preempt with safe proof targets.
