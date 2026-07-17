# Personal OS Loop 193 Evidence Report: Human-AI Event Operating Model Research

**Date:** 2026-07-14
**Selected task:** `EVENTOPS-021`
**Loop type:** Owner-directed research and architecture artifact
**Formal launch level:** `L0_LOCAL_PROTOTYPE` unchanged
**Manual Ops level:** `M1_MANUAL_OPS_READY` unchanged
**Conditional product maturity:** `C3_ARCHITECTURE_GATE_READY` unchanged

---

## 1. Task Selection

The owner explicitly requested a new Human-AI Event Operating Model research document covering Analysis Events, persistent module agents, conversations, Inbox decisions, Action Plans, RACI, execution, records, audit, and memory.

`RES-010` already existed, so the next available formal research ID was `RES-011`.

Selected task: `EVENTOPS-021`, created and completed as docs-only research.

## 2. Required Local Context Read

Read or re-read:

- `AGENTS.md`
- `docs/07_research-and-design/RES-009_cross-module-resource-agent-records-tab-parity-gap-research.md`
- `docs/07_research-and-design/RES-010_cross-module-human-ai-agent-operating-model-research.md`
- `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`
- `docs/02_architecture-and-rules/ARC-029_agent-operation-dry-run-contract.md`
- `docs/02_architecture-and-rules/ARC-032_internal-multi-agent-task-message-bus-contract.md`
- `docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md`
- `docs/07_research-and-design/RES-007_source-triggered-thinking-node-pipeline-and-action-fanout-research.md`
- `docs/02_architecture-and-rules/ARC-008_ai-source-workflow-layer.md`
- `docs/02_architecture-and-rules/SCH-001_agent-team-os-schema-proposal.md`
- `docs/02_architecture-and-rules/ARC-020_internal-agents.md`
- `docs/02_architecture-and-rules/ARC-012_frontend-operating-surface.md`
- `docs/02_architecture-and-rules/ARC-030_module-resource-index-bff-contract.md`
- `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md`
- `docs/00_manual-and-index/MAN-000_docs-usage-manual.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- Last three completed reports: loops 190, 191, and 192.

Related code inspected:

- `src/lib/contracts/module-agent-command-catalog.contract.ts`
- `src/components/layout/module-operating-shell.tsx`
- `src/lib/workflow/types.ts`
- `src/lib/workflow/mock-data.ts`
- `src/app/(dashboard)/inbox/page.tsx`
- `src/types/ingestion.ts`
- `src/lib/contracts/operating-audit-event.contract.ts`
- `src/lib/actions/research-threads.ts`

## 3. Strategic Review Gate

| Question | Answer |
|---|---|
| Current primary target | Formal launch remains `L0_LOCAL_PROTOTYPE`; Manual Ops remains `M1_MANUAL_OPS_READY`; conditional product maturity remains `C3_ARCHITECTURE_GATE_READY`. |
| Last three loops | Loop 190 separated AI chat from immediate ingestion; loop 191 added source coworking threads and file/image library references; loop 192 created quick-capture/multimodal extension research. |
| Current blocker | Formal launch proof still needs owner/operator evidence for deployment, auth/session, and Work proof. This owner-directed research preempts the overdue launch review. |
| Repeat risk | This is another research/docs loop, but it is an explicit owner request and creates an implementation-ready architecture/backlog artifact, not a status-only report. |
| Capability moved | Human-AI event collaboration now has a shared event, execution, audit, and memory model that future UI/BFF/schema work can use. |
| More true after loop | `AnalysisEvent` is now the central unit tying versions, agent runs, Inbox, Thread, Action Plan, RACI, execution, audit, trace, and memory together. |

## 4. Research Rounds

### Round 1: Local Code And PRD Fit

Findings:

- `RES-010` already covered a broad Human-AI operating model but did not fully expand all requested object responsibilities, lifecycle state split, UI surface IA, report template, failure matrix, and first vertical slice.
- `SCH-001` provides the starting point for `AgentProfile` and `AgentRun`.
- `ARC-032` provides a proposal-only multi-agent task/message bus.
- `ARC-029` provides dry-run operation boundaries and must remain `allowedModes: ["dry_run"]`.
- `DBS-006` provides the append-only audit event envelope.
- `RES-007` already selected saved-first/manual-or-scheduled analysis for AI Input.
- Existing `/inbox` and workflow code are mock/prototype surfaces and do not yet implement event-level Inbox or execution.

Selected local pattern: extend existing contracts instead of creating a parallel runtime model.

### Round 2: Comparable Architecture

Official/primary references used:

- OpenAI Agents SDK orchestration, handoffs, guardrails/human review, tracing, and SDK overview.
- OpenAI Codex manual for scheduled tasks, memories, and compliance/audit surfaces.
- Git official data and diff docs.
- PMI RACI reference.
- Temporal retry policies, Saga guidance, and pause/resume recovery pattern.
- AWS retry with backoff, transactional outbox, and SQS dead-letter queues.
- Azure Saga, compensating transaction, circuit breaker, and event sourcing.
- OpenTelemetry traces.
- A2A protocol specification.
- OWASP Logging Cheat Sheet.

Selected external pattern: durable event/workflow state, idempotent action steps, owner-approved handoffs, traceable spans, and append-only audit/memory review.

### Round 3: Risk, Auth, Privacy, And Failure Boundaries

Findings:

- Life private data must be default-deny for cross-module sharing.
- Research-to-Work sharing can be allowed when task-relevant and scoped.
- External email, deletion, payment, public output, and permission changes remain high-risk.
- Timeout means unknown, not failure.
- Version conflict must stop execution and regenerate preview.
- Memory must go through candidate/review/approved/superseded/revoked states.

Selected boundary: no execution, external collaboration, or schema work in this loop.

## 5. NANDA / Agent Protocol Gate

Applies: Yes.

Affected AgentFacts-lite fields:

- identity: persistent module agents and future invited agent participation.
- provider: internal Personal OS module agents only.
- lifecycle: protected-owner visible, proposal/runtime-design only.
- endpoints: none added.
- protocols: internal now; A2A/NANDA only as future alignment reference.
- capabilities: future analysis event generation, scoped invitation, action preview, execution proposal, memory candidate handling.
- skills: analysis, summarization, classification, planning, invitation proposal, risk evaluation.
- auth/trust: owner approval required for invites, data sharing, external communication, high-risk execution, and external registration.
- observability: future trace/span/audit/event report fields documented.
- registry: `externalRegisterable=false`.

Concrete artifact: `RES-011` plus backlog rows `EVENTOPS-022..040`.

No external registration, public endpoint, external agent DB access, or cross-organization collaboration was added.

## 6. Changes

Created:

- `docs/07_research-and-design/RES-011_human-ai-event-operating-model-research.md`
- `docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-193-20260714-human-ai-event-operating-model-research.md`

Updated:

- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/06_audits-and-reports/RPT-007_completed-log.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `tasks.md`

## 7. Product Capability Delta

The system now has a formal, event-centric architecture reference for:

- saved-first version/diff analysis;
- persistent module agents versus concrete agent runs;
- one analysis event mapping to one primary Inbox item and one report;
- Thread and multi-agent Conversation boundaries;
- owner-approved invited-agent context sharing;
- per-step ActionPlan/RACI;
- action preview and execution approval separation;
- retry/outbox/DLQ/saga/compensation/manual recovery;
- Activity/Audit/Trace separation;
- memory candidate review and context-change handling;
- UI surfaces needed for a full Human-AI collaboration operating loop.

## 8. Verification

Commands:

| Command | Result |
|---|---|
| `rg -n "RES-011|EVENTOPS-021|EVENTOPS-040" docs/00_manual-and-index/MAN-001_document-index.md docs/05_execution-plans/PLN-060_task-backlog.md docs/05_execution-plans/PLN-061_current-sprint.md docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md docs/06_audits-and-reports/RPT-007_completed-log.md tasks.md docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-193-20260714-human-ai-event-operating-model-research.md` | Pass; markers found across index, backlog, sprint, acceptance, completed log, tasks, and evidence report. |
| `rg -n "[ \\t]+$" docs/07_research-and-design/RES-011_human-ai-event-operating-model-research.md docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-193-20260714-human-ai-event-operating-model-research.md` | Pass; no matches, exit code 1. |
| `node -e "JSON.parse(require('fs').readFileSync('docs/2_agent-input/generated/agent-loop/loop-state.json','utf8')); console.log('loop-state ok')"` | Pass; `loop-state ok`. |
| `git diff --check -- docs/00_manual-and-index/MAN-001_document-index.md docs/05_execution-plans/PLN-060_task-backlog.md docs/05_execution-plans/PLN-061_current-sprint.md docs/06_audits-and-reports/RPT-007_completed-log.md docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md docs/2_agent-input/generated/agent-loop/loop-state.json tasks.md` | Pass. |

No `pnpm exec tsc`, `pnpm db:validate`, `pnpm db:generate`, or `pnpm build` was required because this loop modified docs/task-memory artifacts only.

## 9. Remaining Risks

- `RES-011` is architecture research, not implementation.
- `EVENTOPS-022` should formalize the domain model before any TypeScript contract, schema proposal, or UI slice.
- `/inbox` versus `/ai-input` final event IA may need owner decision before runtime UI work.
- The overdue launch-level review still needs to run because loops 190-193 were owner-directed work after loop 189.
- Formal launch remains blocked by owner/operator evidence for deployment, auth/session, and Work proof.

## 10. Next Decision

Recommended next global loop: run the overdue launch-level review unless owner-directed work preempts again.

Recommended next event-model slice: `EVENTOPS-022`, a formal Human-AI Event Domain Model architecture contract.
