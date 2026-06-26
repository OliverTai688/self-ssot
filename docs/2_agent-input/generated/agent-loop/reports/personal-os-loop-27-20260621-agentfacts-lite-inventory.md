# Agent Loop Evidence Report

## Task

- Task ID: `AGENT-005`
- Title: Inventory internal agents into AgentFacts-lite manifests
- Date: 2026-06-21
- Agent: Codex heartbeat loop `personal-os-20m-aggressive-launch-loop`
- Loop: 27
- Launch level before: `L0_LOCAL_PROTOTYPE`
- Launch level after: `L0_LOCAL_PROTOTYPE`

## Source Docs Read

- `AGENTS.md`
- `docs/00_manual-and-index/MAN-000_docs-usage-manual.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/01_product-requirements/PRD-004_next-stage-development-plan.md`
- `docs/01_product-requirements/PRD-005_situation-driven-prd.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/01_product-requirements/PRD-001_personal-os-situation.md`
- `docs/00_manual-and-index/MAN-002_development-loop.md`
- `docs/05_execution-plans/PLN-063_thirty-loop-launch-automation-plan.md`
- `docs/2_agent-input/generated/agent-loop/development-strategy.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`
- `docs/02_architecture-and-rules/ARC-020_internal-agents.md`
- `docs/02_architecture-and-rules/ARC-019_agent-boundary-policy.md`
- `docs/02_architecture-and-rules/ARC-021_skill-registry.md`
- `docs/02_architecture-and-rules/ARC-022_task-routing.md`
- `docs/02_architecture-and-rules/ARC-023_agent-team-os-operating-contract.md`
- `docs/02_architecture-and-rules/ARC-024_ai-service-adapter-boundary.md`
- Last three reports: loop 24 `AUTH-006`, loop 25 launch-level review, loop 26 `ENV-002`.

## Scope

- In scope: Create internal-only generated AgentFacts-lite manifest inventory for all `ARC-020` agents, add a manifest index, document the generated inventory pointer, update acceptance/task tracking, run no-secret proof checks, and record evidence.
- Out of scope: Runtime agent registry, public `/agents` UI, public agent directory, external NANDA Index registration, MCP/A2A bridge, endpoint exposure, DB schema changes, migrations, seed, provider writes, external collaboration runtime, telemetry claims, certification claims, high-risk module writes, or public output.

## Strategic Review

- Current launch level / target: `L0_LOCAL_PROTOTYPE`; next target remains `L1_PRIVATE_ONLINE_WORK_OS`.
- Last-three-loop delta: Loop 24 added auth/session proof collection, loop 25 found proof blockers still repeated, and loop 26 created the launch env unblock handoff.
- Repetition check: This loop is agent protocol readiness, not another env checklist. It creates the concrete AgentFacts-lite artifact that loop 25/26 identified as the next safe L3/L4 readiness step while env/session/DB target proof remains blocked.
- Current strongest blocker: L1 proof still lacks Supabase public env, signed-in `/auth/status`, safe Work proof target, and deployment marker. These require external/operator state, so internal agent manifest readiness is the highest safe non-blocked task.
- Acceptance / roadmap / blocker mapping: Maps to `ACC-001` closed-loop development, `ACC-002` Agent Team OS readiness, `ARC-028` Phase B internal manifest inventory, `PLN-063` agent protocol/registry readiness, and backlog row `AGENT-005`.
- Expected capability, proof, or blocker delta: Every internal governance agent is now internally discoverable as generated AgentFacts-lite data, with trust boundaries and external registration blockers explicit.

## Research / Reference Basis

- Local docs/code reviewed: `ARC-020` agent table, `ARC-028` AgentFacts-lite contract, `ARC-019` risk/approval policy, `ARC-021` skill registry, `ARC-022` routing, `ARC-023` Agent Team OS proposal, `ARC-024` AI adapter boundary, and existing loop proof scripts.
- External primary sources reviewed:
  - Project NANDA: https://github.com/projnanda/projnanda
  - AgentFacts format: https://github.com/projnanda/agentfacts-format
  - AgentFacts JSON schema: https://raw.githubusercontent.com/projnanda/agentfacts-format/main/agentfacts_schema.json
  - NANDA Index: https://github.com/projnanda/nanda-index
- Selected implementation pattern: Use a local AgentFacts-lite inventory first. It mirrors stable identity, provider, capabilities, skills, trust, observability, and registry state while leaving endpoints empty and external registration false.
- Rejected alternatives: Full AgentFacts schema validation in this loop, one JSON file per agent, runtime registry routes, public directory, external NANDA Index registration, invented telemetry/certification metrics, and DB-backed `AgentProfile` records.
- Task shape created or updated: `AGENT-005` is complete; `AGENT-006` should add a no-secret validation command/schema for required fields, source coverage, trust boundaries, and external registration blockers.

## NANDA / Agent Protocol Alignment

- Applies?: Yes.
- Affected agents or capabilities: All 15 internal governance agents from `ARC-020`.
- AgentFacts-lite fields changed: Added generated identity, provider, lifecycle, endpoints, protocols, capabilities, skills, auth, trust, observability, and registry state for every internal agent.
- Internal discovery / registry state: `docs/2_agent-input/generated/agent-loop/agent-registry/internal-agent-manifests.agentfacts-lite.json` and `manifest-index.json` now provide internal-only generated discovery data.
- External registration state: Every agent has `externalRegisterable: false` and `registrationStatus: not-registered`.
- Trust, auth, approval, and data-visibility boundaries: High-risk modules and surfaces remain `HUMAN_APPROVAL_REQUIRED` or capability-level approval-gated. No manifest declares auth scopes or endpoints.
- Concrete protocol artifact created: AgentFacts-lite manifest inventory plus coverage index.
- NANDA / AgentFacts / MCP / A2A sources reviewed: Project NANDA, AgentFacts format/schema, and NANDA Index. MCP/A2A were not implemented.

## Changes

- Files changed:
  - `docs/2_agent-input/generated/agent-loop/agent-registry/README.md`
  - `docs/2_agent-input/generated/agent-loop/agent-registry/internal-agent-manifests.agentfacts-lite.json`
  - `docs/2_agent-input/generated/agent-loop/agent-registry/manifest-index.json`
  - `docs/02_architecture-and-rules/ARC-020_internal-agents.md`
  - `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
  - `docs/00_manual-and-index/MAN-001_document-index.md`
  - `docs/05_execution-plans/PLN-060_task-backlog.md`
  - `docs/05_execution-plans/PLN-061_current-sprint.md`
  - `docs/06_audits-and-reports/RPT-007_completed-log.md`
  - `docs/2_agent-input/generated/agent-loop/loop-state.json`
  - `tasks.md`
- Behavior changed: None at runtime.
- Docs/data changed: Added generated agent registry inventory and tracking/acceptance references.

## Verification

| Command | Result | Notes |
|---|---|---|
| ARC-020 coverage Node check | Passed | 15 source agents, 15 manifests, no missing or extra agents, no accidental endpoints, no missing required sections, no empty capabilities. |
| JSON parse for `loop-state.json`, manifest inventory, and manifest index | Passed | All JSON files parse. |
| Registry state summary Node check | Passed | 15 governance-only, 15 internalDiscoverable, 15 externalRegisterable false, 15 not-registered, 24 total capabilities. |
| `pnpm launch:proof -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-27-20260621-launch-proof.json` | Passed as collector; proof status blocked | Blocked labels: Supabase public URL, Supabase publishable key. `canRunAuth005=false`, `canRunWork007=true`, `canClaimL1=false`. |
| `pnpm auth:proof -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-27-20260621-auth-proof.json` | Passed as collector; proof status blocked | Blocked labels: Supabase public URL, Supabase publishable key, Auth status evidence. `canRunAuth005=false`. |
| `pnpm work:proof -- --json` | Passed dry-run | No proof DB URL or write confirmations provided; writes refused safely. |
| docs/source marker scans | Passed | `AGENT-005`, `AGENT-006`, `agent-registry`, and registration state references are present. |
| touched-file trailing whitespace scan | Passed | `rg -n "[ \t]+$"` returned no matches for touched files. |
| `git diff --check` on touched files | Passed | No whitespace errors. |

## Evidence

- Manifest inventory: `docs/2_agent-input/generated/agent-loop/agent-registry/internal-agent-manifests.agentfacts-lite.json`
- Manifest index: `docs/2_agent-input/generated/agent-loop/agent-registry/manifest-index.json`
- Launch proof JSON: `docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-27-20260621-launch-proof.json`
- Auth proof JSON: `docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-27-20260621-auth-proof.json`
- Product capability delta: Agent Team OS now has machine-readable internal manifest data for every governance agent.
- Proof delta: Coverage and registry-safety state can be checked statically instead of inferred from prose.
- Blocker delta: Agent protocol readiness advanced while external env/session/DB proof targets remain blocked.
- Agent protocol-readiness delta: Phase B from `ARC-028` is complete enough for `AGENT-006` validation to begin.

## Remaining Risks

- The generated inventory is not yet validated by a committed script/schema.
- No protected owner/admin readiness surface reads these manifests yet.
- No runtime agent registry, DB-backed `AgentProfile`, public endpoint, or external adapter exists.
- External NANDA registration remains blocked until endpoint, auth, permission, trust, public-safety, rollback, validation, protected visibility, and human approval are complete.
- L1 remains blocked by missing Supabase public env, signed-in `/auth/status`, safe Work proof target, and deployment marker.

## Final Status

- Status: DONE
- Recommended next task: `AGENT-006` local AgentFacts-lite validation and registry readiness check, unless `AUTH-005`, `WORK-009`, or `WORK-007` can preempt with safe proof targets.
