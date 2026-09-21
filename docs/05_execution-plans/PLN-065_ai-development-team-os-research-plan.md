# PLN-065 - AI Development Team OS Research Plan

**Document ID:** `PLN-065`  
**Date:** 2026-07-22  
**Status:** Active research-to-implementation plan  
**Companion research:** `RES-023_ai-development-team-os-structural-research.md`, `RES-024_shared-team-os-trust-plane-and-independent-ai-development-team-interface-research.md`, `RES-025_github-reference-repositories-for-ai-development-team-os-research.md`  
**Architecture lens:** evolve `RES-015` requester/custodian/owner-inbox/rule-memory diagram into development-team execution, evidence, memory, and skill promotion.

---

## 1. Objective

Create an implementation-ready path for Personal OS to become an AI Development Team OS without prematurely enabling uncontrolled agent execution.

The plan answers three owner-specified questions:

1. How can multiple agents safely develop in parallel?
2. How can individual and team memory be versioned?
3. How can completed task experience become reusable team skill only after evidence, tests, and review?

---

## 2. Planning Principles

- Treat AI developers as long-lived agents with role, skill version, task assignment, memory, budget, and trust boundary.
- Treat every development action as a task/event, not free-form agent chatter.
- Use `RES-015`'s consent/request/deadlock/rule-memory model for cross-agent access.
- Use one branch/worktree/session per development task before any formal merge.
- Keep `externalRegisterable: false` until endpoint, auth, trust, observability, rollback, deployment, public-safety review, and human approval exist.
- Keep agents away from direct production DB/secrets and high-risk final writes.
- Promote experience into memory/skills only from evidence-backed, reviewed outcomes.

---

## 2A. Owner Direction - Shared Trust Plane, Independent AI Development Team Interface

Owner decision on 2026-07-22:

- Develop toward a **Shared Team OS Trust Plane**.
- `RES-015` Conversation/Consent and AI Development Team OS share trust infrastructure: identity, AgentFacts-lite, BoundaryPolicy, Owner Inbox, Rule Memory, audit, evidence, and external-registration posture.
- AI Development Team OS is not a tab, section, or extension of `/agents`, `/ai-input`, `/admin`, `/settings`, `/work`, or any existing module interface.
- AI Development Team OS should have a brand-new independent protected interface with its own information architecture.
- Existing protected surfaces may inform route-guard, shell, table, timeline, and evidence-display patterns, but they are not the product home for this surface.

Recommended route naming remains proposal-only until implementation, but future file planning should assume a dedicated surface such as `src/app/(dashboard)/ai-dev-team/*` rather than `src/app/(dashboard)/agents/*`.

---

## 3. RES-015 Evolution Requirement

Every implementation slice in this plan must preserve the following shape:

```txt
Owner intent
  -> Team command surface
  -> Coordinator assigns task
  -> Requester agent asks for context/authority
  -> Custodian agent checks Rule Memory / AgentFacts-lite
  -> Allowed: scoped context package
  -> Denied or ambiguous: Owner Inbox
  -> Owner decision writes rule memory
  -> Durable workflow resumes
  -> Worktree/session produces evidence
  -> Review and approval
  -> Memory/skill candidate
```

This prevents the architecture from drifting into a free-running multi-agent chat room.

---

## 4. Planned Backlog

| Task id | Title | Status | Priority | Risk | Scope | Acceptance | Verification | Stop conditions |
|---|---|---|---|---|---|---|---|---|
| `AIDEVTEAM-001` | Create structural research and research plan | DONE | P0 | LOW | Produce `RES-023`, `PLN-065`, backlog/sprint/completed-log/evidence updates. | RES-015-style evolved diagram exists; OSS index evaluated by layer; NANDA and safety boundaries explicit; follow-up rows exist. | Docs scan, `pnpm agent:registry:check`, `pnpm agent:bus:check`, `git diff --check`. | No runtime agent execution, schema migration, provider call, external registration, or code merge automation. |
| `AIDEVTEAM-010` | Shared Team OS Trust Plane and independent interface boundary research | DONE | P0 | LOW | Produce `RES-024` and Chinese companion; clarify that Shared Team OS Trust Plane is shared while AI Development Team OS gets a brand-new protected interface. | Trust plane, bounded contexts, cross-context request flow, rejected existing-interface homes, and corrected `AIDEVTEAM-002`/`006` implications exist. | Docs scan, `pnpm agent:registry:check`, `pnpm agent:bus:check`, JSON parse, `git diff --check`. | No route/UI code, runtime execution, schema migration, provider call, external registration, or code merge automation. |
| `AIDEVTEAM-011` | GitHub reference repository research for AI Development Team OS | DONE | P0 | LOW | Produce `RES-025` and Chinese companion; rank current GitHub references for independent interface, worktree/session, adapter runtime, review/evidence, governance, protocol, and license/maintenance fit. | Agent Canvas/Paperclip/Pane/Superset/Agent Deck/Parallel Code, OpenHands/OpenCode/Goose/Plandex/Aider/Open SWE/SWE-agent/PR-Agent/ACP/Zeroshot/Agyn are mapped to Personal OS components and future tasks. | External source scan, GitHub API metadata sample, `pnpm agent:registry:check`, `pnpm agent:bus:check`, JSON parse, `git diff --check`. | No route/UI code, runtime execution, schema migration, provider call, external registration, external agent access, or code merge automation. |
| `AIDEVTEAM-002` | AI Development Team OS domain and adapter architecture contract | TODO | P0 | MEDIUM | Create the formal `ARC-*` contract for `SharedAgentTrustPlane`, `ConversationConsentContext`, `DevelopmentExecutionContext`, `IndependentAIDevelopmentTeamInterface`, `CrossContextAccessRequest`, `ContextPackageManifest`, `DecisionRuleScope`, `AuditEvidenceEnvelope`, `ExternalRegistrationGate`, `RuntimeApprovalGate`, `DevTeamTask`, `DevAgentRole`, `DevAgentAssignment`, `DevContextRequest`, `DevWorktreeSession`, `CodingAgentAdapterPolicy`, `DevRunEvidence`, `DevReviewDecision`, `DevExperienceMemory`, and `DevSkillCandidate`, including a `RES-025` reference-repository mapping. | Contract maps every object to existing `AgentBusTask`, `AnalysisEvent`, `InboxItem`, `MemoryCandidate`, `AgentFacts-lite`, dry-run agent operation contracts, and the reference repo categories; no migration implied; AI Development Team remains independent from existing interfaces. | Docs marker scan, `pnpm agent:registry:check`, `pnpm agent:bus:check`, `git diff --check`. | Stop if contract implies live execution, direct DB access by agents, external endpoint exposure, or embedding AI Development Team inside an existing surface. |
| `AIDEVTEAM-003` | Isolated Git worktree/session manager contract | TODO | P0 | MEDIUM | Define branch/worktree/process/log/diff lifecycle inspired by `RES-025` Pane/Superset/Agent Deck/Parallel Code patterns but owned by Personal OS. | One task maps to one branch/worktree/session; session records terminal/process state, files touched, diff summary, evidence refs, cleanup state; no agent launched. | Static contract checker or docs scan, `git diff --check`. | Stop before spawning external coding agents, background terminals, containers, or applying unreviewed diffs. |
| `AIDEVTEAM-004` | Durable development workflow state machine | TODO | P1 | MEDIUM | Define LangGraph/DeepAgents/Temporal-informed state machine for plan, context request, run, test, review, inbox escalation, and resume. | States and transitions include HITL checkpoints, retry, cancellation, evidence requirements, and deadlock handling; maps to `RES-011` AnalysisEvent lifecycle. | Static state-machine contract checker, `git diff --check`. | Stop before deploying Temporal/NATS or enabling runtime queue workers. |
| `AIDEVTEAM-005` | Agent memory, versioning, and skill-promotion contract | TODO | P1 | HIGH | Define Letta/Graphiti-informed individual memory, team fact memory, rule memory, evidence memory, and skill-candidate versioning. | Memory is source-linked, time-aware, reviewable, and reversible; skill promotion requires tests/evidence/reviewer or owner approval; `.codex/skills` edits require explicit owner approval. | Static schema/contract checker, NANDA field scan, `git diff --check`. | Stop if memory promotion can silently alter core rules or skills. |
| `AIDEVTEAM-006` | Independent AI Development Team protected interface | TODO | P2 | MEDIUM | Create a brand-new protected AI Development Team interface, separate from `/agents`, `/ai-input`, `/admin`, `/settings`, `/work`, and all existing module surfaces. It should expose tasks, roles, worktree sessions, evidence, adapter registry, memory candidates, and blocked runtime gates inside its own information architecture. | Owner can inspect AI Development Team readiness and future operations from a dedicated interface informed by `RES-025` Agent Canvas/Paperclip/Superset/Pane references; no runtime execution button is active without explicit approval path; the surface is not nested inside existing Agent Team OS, AI Input, admin, settings, or module pages. | `pnpm exec tsc --noEmit --pretty false`, local protected route smoke if available, UI text/container check. | Stop before adding actual external agent launch, public output, or DB writes outside approved BFF path. |
| `AIDEVTEAM-007` | Coding-agent adapter permission profiles | TODO | P1 | HIGH | Compare OpenHands, OpenCode, Goose, Plandex, Aider, Open SWE, SWE-agent, PR-Agent, ACP-compatible agents, Codex CLI, local models, and worktree runners against Personal OS permission levels. | Defines read-only plan, proposal edit, sandbox execute, reviewer-only, protocol endpoint, owner-approved merge, and blocked high-risk profiles; direct DB/secret access denied. | Static adapter-policy checker, `git diff --check`. | Stop before invoking adapters against repo files or shell without explicit owner approval and sandbox scope. |
| `AIDEVTEAM-008` | Observability and artifact evidence contract | TODO | P1 | MEDIUM | Define OpenTelemetry/Grafana/Loki/R2/Garage-informed evidence refs for traces, logs, screenshots, test reports, diffs, and cost. | Every run has owner-safe evidence references, no raw secrets, and artifact retention/visibility class; R2 remains preferred near-term store from `RES-022`. | Static evidence-contract checker, `git diff --check`. | Stop before adding telemetry exporters, external dashboards, or artifact uploads using live credentials. |
| `AIDEVTEAM-009` | Controlled single-task coding-agent sandbox pilot | BLOCKED | P2 | HIGH | Run one low-risk task through an isolated worktree and proposal-only coding-agent adapter. | Only after explicit owner approval; task must be non-high-risk, no public output, no DB migration, no core governance edit; produces diff, tests, evidence, and reviewer decision; no automatic merge. | `pnpm exec tsc --noEmit --pretty false`, task-specific tests, evidence report, owner review. | Blocked until `AIDEVTEAM-002..008` define enough boundaries and owner explicitly approves the pilot. |

---

## 5. Files Likely Affected By Future Tasks

| Area | Likely files |
|---|---|
| Architecture contract | `docs/02_architecture-and-rules/ARC-0NN_ai-development-team-os-contract.md` |
| Static contracts | `src/lib/contracts/*dev-team*.contract.ts`, `scripts/check-*dev-team*.mjs`, `package.json` |
| AI Development Team UI | New dedicated protected surface, likely `src/app/(dashboard)/ai-dev-team/*` and `src/components/ai-dev-team/*` (route name proposal-only); do not implement as a child of `/agents`, `/ai-input`, `/admin`, `/settings`, `/work`, or existing module pages |
| Workflow/event model | existing `agent-task-message-bus` contracts, future `AnalysisEvent` docs/contracts |
| Memory/skills | `docs/02_architecture-and-rules/*memory*`, `.codex/skills/*` only with explicit owner approval |
| Evidence/artifacts | `docs/2_agent-input/generated/agent-loop/reports/`, future R2 artifact references |

---

## 6. Verification Strategy

Before runtime:

- docs marker scan
- static contract checker
- `pnpm agent:registry:check`
- `pnpm agent:bus:check`
- `pnpm exec tsc --noEmit --pretty false` when TypeScript changes
- `git diff --check`

Before any sandbox pilot:

- owner-approved scope
- safe branch/worktree
- no high-risk modules
- no DB migration
- no public output
- no direct DB/secret access
- explicit rollback/cleanup path
- tests and evidence recorded before review

Before any external registration:

- endpoint
- auth
- scopes
- trust policy
- observability
- rollback
- public-safety review
- deployment evidence
- explicit human approval

---

## 7. Research Output Requirements

Each future task must update:

- `PLN-060_task-backlog.md`
- `PLN-061_current-sprint.md`
- `tasks.md`
- `RPT-007_completed-log.md`
- evidence report under `docs/2_agent-input/generated/agent-loop/reports/`

If behavior changes, also update acceptance docs. If architecture changes, update the relevant `ARC`, `SCH`, `DBS`, or `AUT` document.

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Agents pollute main branch with unreviewed code | One task per branch/worktree; no auto-merge; owner/reviewer gate. |
| Agents learn bad lessons | Evidence-backed `MemoryCandidate` and `SkillCandidate` review before promotion. |
| Agents exceed scope or cost | Budget, stop rules, task states, and owner-visible run controls. |
| Agents leak private context to external tools | Context packages only; no direct DB/secrets; external collaboration remains blocked. |
| Runtime stack grows too early | Contract-first plan; Temporal/NATS/vLLM/Grafana deferred until local proof justifies them. |
| License conflicts | Treat `NOASSERTION`, GPL, and AGPL tools as research references until strategy review completes. |

---

## 9. Next Recommended Task

`AIDEVTEAM-002` should be the next AI Development Team OS task if the owner continues this line:

> Create the formal architecture contract mapping AI development team domain objects to the existing Agent Team OS, AnalysisEvent, Inbox, MemoryCandidate, AgentFacts-lite, and dry-run operation contracts.

It should include a `RES-025` reference-repository mapping for interface, worktree/session, adapter, review/evidence, governance, and protocol categories. This is the smallest useful artifact before any worktree manager, agent runtime, memory engine, or UI control surface.
