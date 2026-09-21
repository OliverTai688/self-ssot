# Agent Loop Evidence Report

## Task

- Task ID: `AIDEVTEAM-001`
- Title: AI Development Team OS structural research and research plan
- Date: 2026-07-22
- Agent: Codex

## Addendum - Owner Direction

- Owner follow-up on 2026-07-22 selected the **Shared Team OS Trust Plane** direction.
- AI Development Team OS should become a brand-new independent protected interface, not a tab, section, or extension of `/agents`, `/ai-input`, `/admin`, `/settings`, `/work`, or module pages.
- `AIDEVTEAM-006` is re-scoped to an independent AI Development Team interface while sharing identity, AgentFacts-lite, BoundaryPolicy, Owner Inbox, Rule Memory, audit, evidence, and external-registration posture through the trust plane.

## Source Docs Read

- `AGENTS.md`
- `docs/00_manual-and-index/MAN-000_docs-usage-manual.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/01_product-requirements/PRD-001_personal-os-situation.md`
- `docs/01_product-requirements/PRD-004_next-stage-development-plan.md`
- `docs/01_product-requirements/PRD-005_situation-driven-prd.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/00_manual-and-index/MAN-002_development-loop.md`
- `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`
- `docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md`
- `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md`
- `docs/07_research-and-design/RES-005_conditional-l3-interface-scenario-architecture-gap-research.md`
- `docs/05_execution-plans/PLN-063_thirty-loop-launch-automation-plan.md`
- `docs/2_agent-input/generated/agent-loop/development-strategy.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/07_research-and-design/RES-010_cross-module-human-ai-agent-operating-model-research.md`
- `docs/07_research-and-design/RES-011_human-ai-event-operating-model-research.md`
- `docs/07_research-and-design/RES-015_ai-chat-reference-context-and-cross-model-collaboration-research.md`
- `docs/02_architecture-and-rules/ARC-023_agent-team-os-formal-governance-contract.md`
- `docs/02_architecture-and-rules/ARC-032_internal-multi-agent-task-message-bus.md`
- last reports:
  - `docs/2_agent-input/generated/agent-loop/reports/2026-07-16_MODLIB-008-012_sub-module-upload-sync-and-origin-reference.md`
  - `docs/2_agent-input/generated/agent-loop/reports/2026-07-16_MODLIB-001-005_module-scoped-file-media-library.md`
  - `docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-194-20260716-collaboration-scenarios-research.md`

## Scope

- In scope: structured research, RES-015-style architecture evolution, OSS layer assessment, NANDA safety gate, research plan, backlog/current-sprint/completed-log/task-memory/evidence updates.
- Out of scope: runtime agent execution, external registration, public endpoint, provider call, container runner, schema migration, live DB write, external coding-agent invocation, automatic merge.

## Strategic Review

- Current launch level / target: formal launch remains `L0_LOCAL_PROTOTYPE`; conditional Manual Ops remains `M1_MANUAL_OPS_READY`; conditional product maturity remains `C3_ARCHITECTURE_GATE_READY`.
- Last three reports reviewed: MODLIB origin sync, module-scoped file/media library, human-AI chat and inbox collaboration scenarios.
- Last-three-loop delta: file/media operating surfaces and collaboration scenarios improved, but launch blockers were not removed.
- Repetition check: this is documentation/research, but it is owner-directed and closes a missing architecture link between `RES-015` chat collaboration and AI development-team execution.
- Current strongest blocker: `AUTH-005`, `WORK-009`, and `DEPLOY-002` still block formal launch; AI Development Team runtime also lacks worktree/session, memory/versioning, durable workflow, evidence, and adapter contracts.
- Acceptance / roadmap / research / blocker mapping: maps to `RES-001` multi-agent/NANDA maturity, `RES-002` operating-surface standard, `RES-015` cross-agent consent, and `ARC-028` AgentFacts readiness.
- Expected capability, proof, or blocker delta: a concrete research/plan artifact exists, enabling architecture-contract follow-up without starting unsafe runtime.

## Research / Reference Basis

- Local docs/code reviewed: Agent Team OS docs, NANDA docs, event operating model docs, RES-015, internal bus/dry-run contracts, protected `/agents` surface.
- External or reference websites reviewed: GitHub/official docs for LangGraph, Deep Agents, Paperclip, OpenHands, OpenHands Agent Canvas, Pane, OpenCode, Goose, Plandex, Superset, Letta, Graphiti, Neo4j, Temporal, NATS, Ollama, vLLM, Podman, Moby, PostgreSQL, Redis, OpenTelemetry Collector, Grafana, Loki, MinIO, Garage.
- Page requirement understanding score: 92 / 100.
- Understanding level: High.
- Required research optimization rounds: 3.
- Completed rounds and lenses:
  - local RES-015/RES-010/RES-011/ARC-032 fit
  - OSS layered architecture comparison
  - NANDA/safety/launch boundary review
- Same-issue synthesis: evolve RES-015 requester/custodian/owner-inbox/rule-memory into development task context packages, durable workflow, worktree sandbox, evidence/review, and memory/skill promotion.
- Selected implementation pattern: contract-first, internal/protected, worktree-isolated, evidence-backed, owner-approved development-team architecture.
- Rejected alternatives: one-platform replacement, free-running inter-agent chat, direct DB/secret access, autonomous merge, automatic skill promotion, MinIO default artifact store, premature Temporal/NATS/vLLM/Grafana deployment.
- Task shape created or updated: `AIDEVTEAM-001..009` in `PLN-060`, `RES-023`, `PLN-065`.

## NANDA / Agent Protocol Alignment

- Applies?: Yes.
- Affected agents or capabilities: ProductManagerAgent, ArchitectAgent, DeveloperAgent, QAAgent, ReviewerAgent, MemoryManagerAgent, AuthPermissionAgent, coding-agent adapters, local-model adapters.
- AgentFacts-lite fields changed: no runtime fields changed; research maps identity, provider, lifecycle, endpoints, protocols, capabilities, skills, auth, trust, observability, registry status.
- Internal discovery / registry state: planning artifact only; internal protected readiness remains proposal/dry-run.
- External registration state: `externalRegisterable: false`.
- Trust, auth, approval, and data-visibility boundaries: no direct DB access, no production secrets, no public endpoint, no high-risk final writes, no external collaboration, no core governance edits, no automatic merge.
- Concrete protocol artifact created: `RES-023` and `PLN-065` define the NANDA-aligned AI Development Team OS contract path.
- NANDA / AgentFacts / MCP / A2A sources reviewed: local `ARC-028`; local `ARC-032`; `RES-015`; no external registration docs were used to claim readiness.

## Changes

- Files changed:
  - `docs/07_research-and-design/RES-023_ai-development-team-os-structural-research.md`
  - `docs/05_execution-plans/PLN-065_ai-development-team-os-research-plan.md`
  - `docs/00_manual-and-index/MAN-001_document-index.md`
  - `docs/05_execution-plans/PLN-060_task-backlog.md`
  - `docs/05_execution-plans/PLN-061_current-sprint.md`
  - `docs/06_audits-and-reports/RPT-007_completed-log.md`
  - `tasks.md`
  - `docs/2_agent-input/generated/agent-loop/loop-state.json`
  - this evidence report
- Behavior changed: none.
- Docs changed: formal research, plan, index, backlog, sprint, completed log, task memory, loop state, evidence.

## Verification

| Command | Result | Notes |
|---|---|---|
| `pnpm agent:registry:check` | PASSED | Internal status ready; external registration still blocked by policy; 15 manifests, 0 external-registerable, 0 errors. |
| `pnpm agent:bus:check` | PASSED | Internal bus contract ready; external runtime enabled `false`; 0 errors. |
| `pnpm exec tsc --noEmit --pretty false` | PASSED | Whole-project typecheck passed. |
| `node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('docs/2_agent-input/generated/agent-loop/loop-state.json','utf8')); console.log('loop-state json ok')"` | PASSED | Loop-state JSON parsed successfully. |
| `git diff --check` | PASSED | No whitespace errors. |

## Evidence

- Relevant output or observation: GitHub API metadata showed the owner-listed OSS projects are mostly active; MinIO main repo is archived; several tools require license review before adoption.
- Screenshots or browser checks: not applicable, no UI runtime changed.
- DB checks: not applicable, no schema/runtime DB change.
- Product capability delta: Personal OS now has an AI Development Team OS research model and staged plan.
- Proof delta: static proof and docs-index proof targeted; no launch proof claimed.
- Blocker delta: formal launch blockers unchanged; agent-runtime blockers are now named and sequenced.
- Agent protocol-readiness delta: NANDA fields and external-registration boundary are explicit for AI Development Team OS.

## Remaining Risks

- Runtime safety still needs `AIDEVTEAM-002..008` before any sandbox pilot.
- External coding-agent adapters and local model runners need owner approval and permission profiles before use.
- License strategy must be reviewed before adopting `NOASSERTION`, GPL, or AGPL dependencies.
- Formal launch remains blocked by owner/operator evidence for `AUTH-005`, `WORK-009`, and `DEPLOY-002`.

## Final Status

- Status: `AIDEVTEAM-001` completed as research/plan artifact; verification passed.
- Recommended next task: `AIDEVTEAM-002` - create AI Development Team OS domain and adapter architecture contract.
