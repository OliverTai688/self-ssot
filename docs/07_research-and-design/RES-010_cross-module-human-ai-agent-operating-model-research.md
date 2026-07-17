# Cross-Module Human-AI Agent Operating Model Research

**Document ID:** `RES-010`
**Last updated:** 2026-07-14
**Status:** Research / architecture synthesis of owner-confirmed product decisions — no runtime implementation, no Prisma schema, no migration in this document
**Trigger:** Companion document routed out of `RES-009_cross-module-resource-agent-records-tab-parity-gap-research.md` §Owner Decision Update. The owner confirmed twelve product decisions covering data/trigger model, analysis events, Inbox/Thread, Action Plan approval, automation permissions, the per-module agent model, Agent-tab content, multi-agent public conversation, cross-agent invitation, RACI, rejection/learning, and failure/recovery. `RES-009` stays scoped to tab-parity IA; this document is where the underlying operating model lives.

---

## 1. Purpose

`RES-009` answered "does every module have the same visible tabs?" It found the real gap was inconsistent *presentation* of Agent/Records surfaces, not a missing concept. This document answers a different, larger question the owner asked immediately after: **what should actually happen inside those tabs** — how data enters the system, when and how an agent analyzes it, how the result reaches a human, how a human approves or rejects an action, how one persistent agent per module behaves over time, how multiple agents talk to each other, and how the whole thing fails safely.

This is an architecture-synthesis document. Most of its content is not new invention — it takes twelve owner decisions and reconciles them against architecture this repo already has (`SCH-001`'s `AgentProfile`/`AgentRun`/`AgentMessage`/`AgentApprovalRequest`, `ARC-032`'s task/message bus, `ARC-029`'s operation/approval-level catalog, `DBS-006`'s audit event envelope, `RES-007`'s `SourceBatch`→`AIAnalysisConversation`→`InboxItem`→`ActionIntent` pipeline) and identifies exactly what is missing, extended, or genuinely new. Where local precedent runs out, it grounds the design in official external references (Temporal, Azure Architecture Center, AWS Builders' Library, OpenTelemetry, Git, PMI/RACI, OpenAI Codex Automations, and this repo's own already-cited A2A/NANDA/MCP sources).

## 2. Relationship To Existing Research and Architecture

| Existing doc | What it already covers | What this document adds |
|---|---|---|
| `RES-009` | Tab-level IA parity (資源/代理人/紀錄 tabs exist and are enabled everywhere) | Nothing — this doc is explicitly out of `RES-009`'s scope; §9 below is the routing record. |
| `RES-007` | AI Input/Inbox-specific pipeline: `SourceConnection → SourceBatch → AIAnalysisConversation → InboxItem → NormalizedRecordProposal → ActionIntent`, all gated on `IngestionAgent` and `AUT-007`'s polling boundary | Generalizes the *same shape* (data → agent analysis → one human-readable event → action approval) to **every module's own agent**, not only source ingestion; adds versioning/diff, memory pipeline, multi-agent conversation, RACI, and failure/recovery, none of which `RES-007` covers. |
| `SCH-001` | `AgentProfile`, `AgentRun`, `AgentApprovalRequest`, `AgentMessage`, `AgentInstructionSnapshot` Prisma proposal | Extends `AgentProfile` with schedule, cost/budget, and working-memory fields (§6.1); extends `AgentRun` with diff-only scope and cost/token fields (§6.2, §6.7). |
| `ARC-032` | Internal task/message bus: `AgentBusTask`, `AgentBusParticipant`, `AgentBusMessage`, `AgentBusProposal`, lifecycle states, A2A-derived vocabulary | Adds the **public multi-agent conversation** object and the **per-module private reflection record** that must not duplicate the full public transcript (§6.8); adds **cross-agent invitation** as an explicit owner-approved sub-flow of an existing task (§6.9). |
| `ARC-029` | Owner-only dry-run operation contract, approval levels, 10-module command catalog | Extends the operation lifecycle with **execution safety states** (waiting-approval / running / failed / partial / done) once a task moves beyond dry-run (§6.6); this is the state model behind the Global AI Task Center. |
| `DBS-006` | `OperatingAuditEvent` envelope, event families, retention classes | Adds the **memory pipeline** (Raw Record → Event Report → Memory Candidate → Approved Memory) as a distinct downstream classification of audit events, and adds failure/incident fields (§6.10). |
| `ARC-008` | `AIWorkflowRun`/`AIWorkflowStep`/`AIWorkItem` | Feeds the **Analysis Event** and **Resource Version/Diff** design (§6.2–§6.3) — `AIAnalysisConversation` (from `RES-007`) is the AI-Input-specific case; this document generalizes the pattern to any module's data. |
| `ARC-012`, `ARC-030` | Frontend operating surface, module resource index BFF | Resource Version/Diff (§6.2) extends the resource-index contract with version history; Agent-tab content (§7) extends the Agent-workspace default structure `ARC-012` §4 already sketches. |
| `RES-004` | NANDA/A2A/MCP protocol synthesis, already-cited external sources | Reused directly for §6.8/§6.9 vocabulary (`Task`, `Message`, `contextId`, `referenceTaskIds`, task states) — no new protocol research needed here. |
| `ARC-019`, `ARC-023` | Agent boundary policy, approval levels (`AUTO_READ`/`AUTO_PROPOSE`/`HUMAN_APPROVAL_REQUIRED`/`BLOCKED`), risk levels | Reused as the base vocabulary for the automation-permission matrix (§6.7), extended with the owner's action/target/data-scope/recipient/context dimensions. |

## 3. Owner-Confirmed Decisions (Decision Register)

Each decision below gets a stable id (`OPSDEC-01`…`OPSDEC-12`) for cross-referencing from backlog rows.

| ID | Decision area | Confirmed decision (summary) |
|---|---|---|
| `OPSDEC-01` | Data & trigger | New data saves to DB first, no default auto-analysis. Manual button, cron schedule, and condition-triggered analysis are all supported, managed from one settings/AI-Operations surface modeled on Codex Automations. Re-analysis after an update only diffs against the prior version by default (not a full re-analysis). Versioning follows a Git-like model: version, parent version, diff, change summary, linked Agent Run. |
| `OPSDEC-02` | Analysis Event, not per-item notification | One full analysis pass is one `Analysis Event`. One event maps to one Inbox message and one full report (context, trigger, data used, version diff, process, result, open questions, related files/links, next actions). The event log exports to Markdown. Markdown may become an AI/Docs long-term-memory candidate, but raw event text is never automatically treated as valid long-term memory — it must pass through Raw Record → Event Report → Memory Candidate → Approved Memory. |
| `OPSDEC-03` | Inbox & Thread | Inbox items read like a letter to a person (title, summary, context, process, result, attachments, links). One Analysis Event → one Inbox Item, in principle. An Inbox Item can be acted on directly or discussed first in a Thread; the Thread keeps updating events/questions/decisions/planned actions. Inbox is the cross-module human decision/triage hub — not another independent agent. |
| `OPSDEC-04` | Action Plan & approval | AI can call real module/site APIs to execute actions. Full action content is shown for confirmation before execution. Editable external content (client notices, emails) can be edited before sending. Accepting the AI's judgment and authorizing AI to execute are different states. The system needs a module task panel, a global AI task overview, and execution states: waiting for approval / running / failed / partial / done. |
| `OPSDEC-05` | Automatic execution permission | Tag documents: auto-allowed. Draft-task creation: auto-allowed. Project status change: allowed but risk/context-dependent. Duplicate-file deletion: never automatic. Client emails: agent can execute but defaults to preview + edit + confirm; trusted fixed schedules may get separate authorization. Finance category edits: auto-allowed. Payment-record creation: never automatic. Life private-data sharing to other modules: never automatic, always asks. Research data may be shared to Work per task need. Permission decisions must weigh action, target, data scope, recipient, and context together, not API name alone. |
| `OPSDEC-06` | Agent model | One persistent agent per module. Each agent has its own role, permissions, data scope, schedule, working memory, tasks, run history, and cost budget. `AgentRun` is one concrete analysis/execution instance. A shared Agent Runtime may back all agents; each module uses its own Agent Profile. |
| `OPSDEC-07` | Agent-tab questions | The Agent tab must answer: what is the agent doing now; recent completed/in-progress tasks; next schedule; recent agent-to-agent interactions and a per-agent interaction summary; recent judgment summary; current working hypotheses; open questions to verify; suggested next steps; which issues can be discussed with the agent; which models were used; input/output/cached token counts; per-run and per-period cost; budget/cost anomalies. Use human-verifiable concepts (judgment summary, working hypothesis, open question) — never raw hidden chain-of-thought. |
| `OPSDEC-08` | Public multi-agent conversation | A public conversation area (AI Input / AI Conversation Hub or similar) lets any agent propose a new multi-agent conversation, invite two or more agents, and let the human participate. Each conversation has a unique id, topic, participants, attachments, related events, and a final conclusion. After it ends, each participating module agent records — from its own module's perspective — why it joined, what viewpoint it offered, what it agreed/disagreed with, the impact on its module, follow-up thoughts/actions, and a link back to the public conversation. The full public transcript is not copied into every module. |
| `OPSDEC-09` | Inviting other agents mid-conversation | While talking to one module's agent, that agent may judge that another module's agent is needed, but must ask the owner before inviting — stating which agent, why, what data would be shared, and what would not be shared. Only after owner approval does the invited agent join. The original module agent stays the primary agent; invited agents are advisors/collaborators, not surprise takeovers. |
| `OPSDEC-10` | Cross-module responsibility / RACI | Cross-module Action Plans use `Human Owner` (final authority), `Case Owner Agent` (event's primary agent), `RACI Assignment` per Action Step (not once for the whole event), and `Action Plan Orchestrator` (technical sequencing/waiting/retry/compensation/status tracking). Each step has exactly one Accountable. A Research→Work case conversion needs an explicit handoff/new Work Case, not a silent primary-agent swap. |
| `OPSDEC-11` | Rejection, learning, context change | Rejecting an AI suggestion must ask why (misjudgment / insufficient evidence / right direction but wrong timing / too risky / don't want automation / already have another plan / other). Learned rules keep their originating context — one rejection is not inferred as a permanent preference. When new context conflicts with an existing memory/rule, create a Context Change Event, compare old vs. new context, generate a Markdown report, send an Inbox message, list questions for the owner, and only then add/amend/disable memory rules based on the answer. Never silently overwrite old records. |
| `OPSDEC-12` | Failure, retry, recovery | Grounded in Temporal/Azure/AWS/OpenTelemetry patterns: Retry Policy, exponential backoff, circuit breaker, idempotency key, expected-version/optimistic concurrency, transactional outbox, dead letter queue, saga orchestration, compensating action, partial success, waiting-for-human, incident report, and cross-module trace id. Distinguish transient / permanent / business-rule / permission / human-decision-blocked errors from partial success and irreversible operations. Outbound actions (e.g. email) are not assumed reversible — design correction/compensation/manual-handling instead of rollback. |

## 4. Source Basis

### 4.1 Local

- `docs/07_research-and-design/RES-009_cross-module-resource-agent-records-tab-parity-gap-research.md` — the document this one is routed out of; §Owner Decision Update there points here.
- `docs/07_research-and-design/RES-007_source-triggered-thinking-node-pipeline-and-action-fanout-research.md` — the fully-designed AI-Input/Inbox-specific instance of "data → agent analysis → human-readable event → action approval"; this document treats it as the reference implementation to generalize, not something to redesign.
- `docs/07_research-and-design/RES-004_agent-collaboration-nanda-gap-research.md` §3 — A2A vocabulary (`Task`, `Message`, `contextId`, `taskId`, `referenceTaskIds`, task states) reused directly for §6.8/§6.9; NANDA/AgentFacts/MCP posture reused unchanged.
- `docs/02_architecture-and-rules/ARC-032_internal-multi-agent-task-message-bus-contract.md` — `AgentBusTask`/`AgentBusParticipant`/`AgentBusMessage`/`AgentBusProposal`/lifecycle states; base for §6.8/§6.9/§6.5.
- `docs/02_architecture-and-rules/ARC-029_agent-operation-dry-run-contract.md` — operation contract, approval levels, 10-module command catalog; base for §6.6/§6.7.
- `docs/02_architecture-and-rules/ARC-023_agent-team-os-operating-contract.md`, `ARC-019_agent-boundary-policy.md` — `AUTO_READ`/`AUTO_PROPOSE`/`HUMAN_APPROVAL_REQUIRED`/`BLOCKED` and risk levels; base vocabulary for §6.7.
- `docs/02_architecture-and-rules/SCH-001_agent-team-os-schema-proposal.md` — `AgentProfile`/`AgentRun`/`AgentApprovalRequest`/`AgentMessage`/`AgentInstructionSnapshot`; base for §6.1.
- `docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md` — `OperatingAuditEvent` envelope, event families, retention classes; base for §6.10 and the memory pipeline in §6.3.
- `docs/02_architecture-and-rules/ARC-008_ai-source-workflow-layer.md`, `ARC-012_frontend-operating-surface.md`, `ARC-030_module-resource-index-bff-contract.md` — versioning/resource-index/agent-workspace base for §6.2, §7.
- `docs/02_architecture-and-rules/ARC-020_internal-agents.md` — 15-agent roster this document's per-module agent model (§6.1) maps onto directly; no new named agents are proposed.
- `docs/02_architecture-and-rules/AUT-007_ai-input-source-workflow-connector-runtime-approval.md` — polling/webhook boundary, reused unchanged for §6.1's schedule/condition triggers (a *local* schedule/condition evaluator is not external polling; a real external re-fetch on a timer still is, exactly as `RES-007` §3 already distinguished).
- `docs/05_execution-plans/PLN-060_task-backlog.md` — task-id prefix precedent (`AGENT-`, `SRCPIPE-`, `MODSHELL-`) used to pick this document's new prefix (`EVENTOPS-`) without collision (checked: unused as of loop 192).

### 4.2 External (official/primary sources)

| Topic | Source | Used for |
|---|---|---|
| Scheduled/triggered agent automations UX | [OpenAI Academy — Codex Automations](https://openai.com/academy/codex-automations/) | §6.1's "one settings/AI-Operations page" model: a per-automation prompt + schedule + persistent memory file, cron-shaped schedule, explicit run history — directly informs the Agent Schedule Center design (§6.6, `EVENTOPS-` tasks). |
| Saga pattern, compensation | [Temporal — Saga Design Pattern Explained](https://temporal.io/blog/saga-pattern-made-easy); [Azure Architecture Center — Saga design pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/saga) | §6.10: orchestration vs. choreography saga, compensating actions executed in reverse order on failure. |
| Idempotency | [Temporal — Error handling, Python SDK](https://docs.temporal.io/develop/python/best-practices/error-handling); [AWS Builders' Library — Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/) | §6.10: idempotency key = stable, deterministic id derived from the action's own identity (not a random token), so retries return the original result instead of repeating the effect. |
| Retry / exponential backoff / jitter | [AWS Builders' Library — Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/); [AWS Prescriptive Guidance — Retry with backoff pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/retry-backoff.html) | §6.10: capped exponential backoff with full jitter as the default retry shape; pair with circuit breaker so retries stop once a fault is confirmed persistent. |
| Circuit breaker, compensating transaction | [Azure Architecture Center — Circuit Breaker pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker); [Azure Architecture Center — Compensating Transaction pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/compensating-transaction) | §6.10: circuit breaker stops retrying a persistently-failing external call; compensating transaction is the business-level undo when a multi-step action partially completes. |
| Distributed tracing / cross-module correlation | [OpenTelemetry — Tracing API](https://opentelemetry.io/docs/specs/otel/trace/api/); [OpenTelemetry — Overview](https://opentelemetry.io/docs/specs/otel/overview/) | §6.10: trace id / span parent-child model as the shape for a cross-module Action Plan's execution trace (one trace id per Analysis Event or Action Plan; one span per Action Step/agent run). |
| RACI matrix | [PMI — Roles, responsibilities, and resources](https://www.pmi.org/learning/library/best-practices-managing-people-quality-management-7012); [Responsibility assignment matrix — Wikipedia, summarizing PMBOK/IPMA usage](https://en.wikipedia.org/wiki/Responsibility_assignment_matrix) | §6.5: Responsible/Accountable/Consulted/Informed definitions, and the rule that each deliverable (here: each Action Step) has exactly one Accountable. |
| Git object/version model | [git-scm.com — gitdatamodel](https://git-scm.com/docs/gitdatamodel); [git-scm.com — git-commit-tree](https://git-scm.com/docs/git-commit-tree) | §6.2: a version is an immutable snapshot with 0..n parents; a diff is computed on demand between two versions rather than stored as the primary artifact — Resource Version/Diff (§6.2) follows this shape (parent pointer + on-demand diff), not a stored-diff-chain model. |
| A2A task/message/context model | Already cited in `RES-004` §10 (`https://a2a-protocol.org/latest/specification/`, `https://github.com/a2aproject/A2A`) | §6.8/§6.9: `contextId`/`taskId`/`referenceTaskIds` reused for the public conversation object and its links back into per-module tasks. |

## 5. Research Rounds

Per `AGENTS.md` §7's Research-To-Task Quality Gate, at least three rounds were completed on this same cross-cutting issue before any executable task shape was written (§9).

### Round 1 — Local architecture/PRD fit

`SCH-001`, `ARC-032`, `ARC-029`, `DBS-006`, and `RES-007` already cover roughly 60% of the owner's twelve decisions in already-designed, not-yet-implemented form. The remaining 40% — Git-style versioning, the Analysis Event report format, the memory-classification pipeline, RACI-per-step, the public multi-agent conversation plus cross-agent invitation-with-approval, and the failure/recovery taxonomy — has no local precedent and needed genuinely new design work, captured in §6.

### Round 2 — Comparable pattern

Reused this repo's own already-completed protocol synthesis (`RES-004`) for agent-to-agent conversation vocabulary rather than re-researching A2A/NANDA/MCP from scratch. For the parts with no local or repo-external-citation precedent (versioning, saga/compensation, RACI, tracing, automation scheduling UX), went to primary sources instead of secondhand blog summaries: Git's own data-model docs, Temporal's and Azure's own pattern docs, AWS's own Builders' Library, OpenTelemetry's own spec, PMI's own RACI reference, and OpenAI's own Codex Automations page (§4.2).

### Round 3 — Risk/auth/data/failure boundary

Every new object in §6 was checked against `ARC-019`'s risk/approval levels and `AGENTS.md` §11's high-risk-module rule: nothing in this document authorizes autonomous high-risk writes, real outbound sends, real external polling/webhooks, or persisted DB rows. All twelve decisions are compatible with staying `AUTO_PROPOSE`/`HUMAN_APPROVAL_REQUIRED` at the write boundary; only the read/analysis/proposal layers move. The failure/recovery model (§6.10) explicitly does not assume reversibility for outbound actions, matching the owner's own instruction and `AUT-007`'s existing no-real-send boundary.

## 6. Recommended Architecture

### 6.1 Agent Model — One Continuous Agent Per Module

Extend `SCH-001`'s `AgentProfile` (already `key`, `moduleKey`, `defaultModelProvider`, `defaultModelName`) with fields the owner's continuity requirement needs:

```text
AgentProfile (extended)
  ...existing SCH-001 fields...
  scheduleConfig          // cron-shaped, mirrors OpenAI Codex Automations' schedule+prompt+memory shape
  workingMemoryRef        // pointer to this agent's own Approved Memory subset (§6.3)
  costBudgetPeriod        // e.g. monthly
  costBudgetLimit
  costBudgetCurrency
  dataScopeRefs           // module keys / resource kinds this agent may read
```

`AgentRun` (already `agentProfileId`, `taskRef`, `status`, `riskLevel`) gains:

```text
AgentRun (extended)
  triggerKind            // manual | scheduled | condition_met
  scopeKind              // full_reanalysis | diff_only (default diff_only per OPSDEC-01)
  resourceVersionFromId  // parent version analyzed from
  resourceVersionToId    // version analyzed to
  modelProvider, modelName
  inputTokens, outputTokens, cachedTokens
  costAmount, costCurrency
  traceId                // §6.10
```

One shared Agent Runtime (already implied by `ARC-023`'s "governance roles first" framing) executes every `AgentRun`; `AgentProfile` supplies the per-module role/scope/schedule/budget that makes runs of the same runtime behave differently per module. This matches `ARC-020`'s existing 15-agent roster — no new named agents are introduced by this document.

### 6.2 Data & Trigger Model — Diff-Only Re-Analysis, Git-Style Versioning

New data always lands as a stored resource version first; analysis is a separate, explicitly-triggered step — the same separation `RES-007` §3 already established for AI Input's sync-vs-analysis split, generalized to any module's resource (a Work deliverable edit, a Research note edit, a Chamber contact update, etc.):

```text
ResourceVersion
  id
  resourceType, resourceId      // e.g. work.deliverable, research.note
  parentVersionId                // 0 or 1 parent (linear history in v1; Git allows n, not needed yet)
  createdAt, createdBy
  changeSummary                  // short human-readable "what changed"
  contentRef                     // pointer to the actual stored content, not inlined here
```

Per the Git data model (§4.2), the diff between two versions is **computed on demand** (`diff(parentVersionId, id)`), not stored as a persisted artifact — a version's identity is the snapshot plus its parent pointer, exactly as Git commits do not store diffs, they compute them against the parent on request. This keeps `ResourceVersion` cheap to write and avoids a second source of truth that could drift from the actual content.

Trigger model (`OPSDEC-01`), reusing `RES-007`'s already-decided `manual_analysis`/`scheduled_analysis` distinction and extending it with a third kind:

| Trigger | Meaning | Gate |
|---|---|---|
| `manual` | Owner presses "分析" on a specific resource/version | None — always available. |
| `scheduled` | Cron-shaped schedule, configured once per agent or per resource | Local scheduler only; if the *source* of the resource requires an external re-fetch first, that remains `AUT-007`'s Polling gate exactly as `RES-007` §3 already scoped — this document does not reopen that gate. |
| `condition_met` | A declared condition over already-stored data becomes true (e.g. "3 unresolved questions accumulate", "a resource has been edited 5 times without analysis") | Local, evaluated against already-stored `ResourceVersion`/`AgentRun` rows — not an external call, same reasoning `RES-007` §3 used to distinguish `scheduled_analysis` from `scheduled_sync`. |

Default `AgentRun.scopeKind = diff_only`: the agent's prompt/context is built from `changeSummary` plus the actual diff between `resourceVersionFromId` and `resourceVersionToId`, not the full resource content, unless the owner explicitly requests a full re-analysis (`scopeKind = full_reanalysis`, e.g. after N accumulated diffs or on manual request).

### 6.3 Analysis Event, Report, and Memory Pipeline

An `AgentRun` that completes produces exactly one `AnalysisEvent` — the object the owner described as "one full analysis pass = one event = one Inbox message + one full report":

```text
AnalysisEvent
  id
  agentRunId                     // -> AgentRun (§6.1)
  moduleKey
  triggerKind                    // mirrors AgentRun.triggerKind
  triggerReason                  // human-readable: which cron fired, which condition became true, or "owner pressed 分析"
  resourceVersionFromId, resourceVersionToId
  reportMarkdownRef               // -> generated Markdown, see shape below
  inboxItemId                     // -> one InboxItem (RES-007 §12.3), reusing that object rather than inventing a duplicate
  status                          // completed | completed_with_open_questions | failed (see §6.10)
```

Report Markdown shape (fixed section order, matching the owner's list exactly):

```text
# Analysis Event: <title>

## 情境 (Context)
## 觸發原因 (Trigger)
## 使用資料 (Data Used)         <!-- resourceVersionFromId/ToId + diff summary -->
## 版本差異 (Version Diff)
## 分析與處理經過 (Process)
## 結果 (Result)
## 未解問題 (Open Questions)
## 相關檔案與連結 (Related Files/Links)
## 後續行動 (Next Actions)
```

This Markdown is the same artifact this document itself is written as — the repo already treats generated Markdown reports as first-class evidence (`docs/2_agent-input/generated/agent-loop/reports/*`), so `AnalysisEvent.reportMarkdownRef` should point into an equivalent generated-evidence location, filed under an AI/Docs category as the owner specified.

**Memory classification pipeline** (`OPSDEC-02`'s explicit rejection of "treat every event as valid long-term memory"):

```text
Raw Record            -- the AnalysisEvent + its report, as generated
    ↓ (no automatic promotion)
Event Report           -- the same artifact, now filed/indexed under AI/Docs
    ↓ owner or rule marks specific claims as reusable
Memory Candidate        -- a specific extracted claim/rule, with its originating AnalysisEvent + context conditions attached
    ↓ explicit owner approval (or a matching Context Change Event resolution, §6.9)
Approved Memory          -- what `AgentProfile.workingMemoryRef` (§6.1) may actually read at analysis time
```

Only `Approved Memory` feeds future `AgentRun` context. This directly satisfies `OPSDEC-02`'s "不應將所有事件全文直接視為有效長期記憶" and reuses the same four-stage discipline `OPSDEC-11`'s Context Change Event flow needs (§6.9) — one pipeline, not two.

### 6.4 Inbox & Thread — Cross-Module Handoff, Not Another Agent

`RES-007` §6 already designed `InboxItem` and its human-review flow in AI-Input-specific terms. This document confirms that design generalizes unchanged to every module's `AnalysisEvent` (§6.3 links `AnalysisEvent.inboxItemId` directly to `RES-007`'s existing `InboxItem` object — no new Inbox object is introduced), and adds the one piece `RES-007` did not need: a **persistent Thread** for ongoing discussion before an action is confirmed.

```text
InboxThread
  id
  inboxItemId                    // -> InboxItem (RES-007 §12.3)
  status                          // open | resolved | superseded_by_reanalysis
  entries                         // -> InboxThreadEntry[]
```

```text
InboxThreadEntry
  id
  threadId
  authorKind                      // owner | agent | system
  entryKind                        // question | answer | decision | planned_action | note
  body
  createdAt
```

The Thread keeps "updating events, questions, decisions, and planned actions" exactly as `OPSDEC-03` specifies; it is not a new agent — every `authorKind: agent` entry is still produced by the same module's continuous `AgentProfile` (§6.1) answering inside the existing Inbox surface, consistent with `OPSDEC-03`'s explicit "Inbox 是跨模組的人類決策與分流中心，不是另一個獨立 Agent."

### 6.5 Action Plan, RACI, and Orchestrator

Extends `ARC-032`'s `AgentBusTask` (already has `participants`, `approvalLevel`, `riskLevel`) with per-step assignment, since `ARC-032` currently assigns approval/risk once for the whole task, not per step — exactly the gap `OPSDEC-10` names:

```text
ActionPlan                        // one cross-module case; may map 1:1 to an AgentBusTask
  id
  humanOwnerRef                    // Human Owner, final authority
  caseOwnerAgentRef                 // Case Owner Agent — the module agent primarily responsible
  steps                             // -> ActionPlanStep[]
```

```text
ActionPlanStep
  id
  planId
  order
  description
  targetModule
  raci                              // { responsible, accountable, consulted[], informed[] }
  status                            // waiting_approval | running | failed | partial_completed | completed (§6.6)
  compensationOf                    // set if this step is a compensating action for a prior failed step (§6.10)
```

Rule from PMI/RACI (§4.2): `raci.accountable` is a single ref, never a list — `ARC-032`'s existing task-level `participants` array stays for *who is in the conversation*, while `raci` is the narrower *who owns this specific step's outcome*.

`Action Plan Orchestrator` is a runtime role, not a new agent: it sequences steps, waits on dependencies, retries per `RES-011`'s failure model (§6.10), and updates each step's status — technically similar to a Temporal workflow orchestrator (§4.2), scoped here to Personal OS's own steps rather than a general workflow engine.

`OPSDEC-10`'s Research→Work handoff rule: converting an `InboxThread`/`ActionPlan` whose `caseOwnerAgentRef` is `ResearchAgent` into a formal Work project must create an explicit `CaseHandoff` record (`fromAgentRef`, `toAgentRef`, `reason`, `newWorkCaseRef`) rather than silently reassigning `caseOwnerAgentRef` — matching `ARC-020`'s existing separation between `ResearchAgent` and `WorkAgent` charters.

### 6.6 Execution Safety and Approval States

`ARC-029`'s current operation lifecycle stops at dry-run/proposal. Once an `ActionIntent` (`RES-007` §12.5) or `ActionPlanStep` (§6.5) is owner-approved for real execution, it needs the states the owner asked for, which this document adds as `ArcAn029`'s natural extension rather than a competing state machine:

| State | Meaning | Maps to `ARC-032` lifecycle |
|---|---|---|
| `waiting_approval` | Proposal exists; owner has not yet approved execution | `proposal_ready` |
| `approved_not_executing` | Owner accepted the AI's judgment but has not yet authorized execution — `OPSDEC-04`'s explicit "accepting judgment ≠ authorizing execution" distinction | `approved_for_manual_action` (new: this state must not auto-advance to `running`) |
| `running` | Orchestrator is actively executing this step | new — not present in `ARC-032`, which stops before execution |
| `failed` | Step failed after exhausting retry policy (§6.10) | new |
| `partial_completed` | Step produced a partial effect (e.g. two of three recipients notified) | new |
| `completed` | Step finished successfully | `completed_no_write` is renamed/extended once real writes exist |

Two owner-visible surfaces read this state model:

- **Module task panel** — per-module view of that module's own `ActionPlanStep`/`AgentRun` rows.
- **Global AI Task Center** — cross-module view of every module's active/recent tasks, filterable by state, module, agent, and risk level; the natural home for the Agent Schedule Center (§6.1's `scheduleConfig`, rendered per `OpenAI Codex Automations`' schedule+prompt+memory model, §4.2) since both surfaces read the same `AgentRun`/`ActionPlanStep` rows.

### 6.7 Automation Permission Matrix

`OPSDEC-05`'s explicit instruction — judge by action, target, data scope, recipient, and context, not API name — becomes a policy table, not a single boolean per operation id (extending `ARC-029`'s per-operation `approvalLevel` with these four dimensions):

| Action example | Target/data scope | Recipient | Context sensitivity | Default approval |
|---|---|---|---|---|
| Tag a document | Internal metadata only | None (no external recipient) | Low | `AUTO_PROPOSE` → auto-apply |
| Create a draft task | Internal, draft state only | None | Low | `AUTO_PROPOSE` → auto-apply |
| Change project status | Internal, mutates a visible state | None, unless status change is client-visible | Depends on current status/risk — same status change can be low or high risk depending on what it unblocks | `AUTO_PROPOSE`, escalates to `HUMAN_APPROVAL_REQUIRED` when target status is client-visible or terminal (e.g. `archived`, `client_shared`) |
| Delete duplicate file | Destructive, irreversible | None | N/A — destructiveness alone is disqualifying | `BLOCKED` (never automatic) |
| Email a client | External, editable content | External human | High — tone/content risk | `HUMAN_APPROVAL_REQUIRED` with preview+edit+confirm by default; a specific trusted recurring schedule may be separately authorized per-schedule, not globally |
| Edit finance category | Internal classification only | None | Low-medium | `AUTO_PROPOSE` → auto-apply |
| Create payment record | Financial, hard to reverse | Potentially external (payee) | High | `BLOCKED` (never automatic) |
| Share Life data to another module | Cross-module, private data | Another internal module/agent | Always high — privacy-first per `ARC-020`'s `LifeAgent` charter | `HUMAN_APPROVAL_REQUIRED`, every time, no standing grant |
| Share Research data to Work | Cross-module, non-private | Another internal module/agent | Medium — depends on task need | `AUTO_PROPOSE` when tied to an explicit task/case; otherwise `HUMAN_APPROVAL_REQUIRED` |

This table is the seed of a machine-readable `AutomationPermissionPolicy` contract (backlog `EVENTOPS-014`), evaluated per `(action, targetModule, dataScope, recipientKind, contextRisk)` tuple rather than per operation-id string — this is the concrete fix for `OPSDEC-05`'s "不能只根據 API 名稱."

### 6.8 Public Multi-Agent Conversation

Extends `ARC-032`'s bus with one new public object, reusing A2A's `contextId`/`referenceTaskIds` vocabulary (§4.2, already adopted by `ARC-032` §2's interpretation notes):

```text
AgentPublicConversation
  id                                // = A2A-style contextId
  topic
  participants                      // AgentBusParticipant[] (ARC-032), owner may be one
  attachments
  relatedEventRefs                  // -> AnalysisEvent[] / InboxItem[] (§6.3/§6.4)
  turns                             // AgentBusMessage[] (ARC-032), tagged by participant
  conclusion
  status                            // reuses ARC-032 lifecycle states
```

Any participant (owner or agent) may propose creating one. Per-module reflection, recorded by each participating agent **after** the conversation ends, stays local to that module and does not duplicate the transcript (`OPSDEC-08`'s explicit "不要把完整公共聊天內容複製到所有模組"):

```text
AgentModuleReflection
  id
  conversationId                    // -> AgentPublicConversation.id
  moduleKey
  agentProfileId
  whyJoined
  viewpointOffered
  agreedWith, disagreedWith
  moduleImpact
  followUpThoughts
  publicConversationLink            // -> conversationId, for navigation only
```

### 6.9 Inviting Another Agent Mid-Conversation

A narrower, approval-gated sub-flow of §6.8, scoped to a single primary agent's *existing* task/conversation rather than starting a new public one:

```text
AgentInvitationRequest
  id
  originatingTaskRef                 // the primary agent's existing AgentBusTask
  proposedAgentProfileId
  reason
  dataToShare                        // explicit fields/refs
  dataNotToShare                     // explicit exclusions
  ownerApprovalStatus                // pending | approved | denied
```

Rule (`OPSDEC-09`): the invited agent may only join `originatingTaskRef` as an `AgentBusParticipant` with role `advisor`/`collaborator` (not `primary`) after `ownerApprovalStatus = approved`; the originating agent remains the task's `caseOwnerAgentRef` (§6.5) throughout.

### 6.10 Failure, Retry, and Recovery

Grounded directly in §4.2's external sources, mapped onto this repo's existing objects:

| Error category | Meaning | Handling |
|---|---|---|
| Transient | Network blip, rate limit, timeout | Retry with capped exponential backoff + full jitter (AWS Builders' Library); circuit breaker opens after repeated failures to stop hammering a persistently-failing dependency (Azure). |
| Permanent | Malformed input, resource no longer exists | No retry; mark `ActionPlanStep.status = failed` with `failureReason`, no automatic compensation attempt beyond what §6.5 already defines. |
| Business rule | Action violates a module's own rule (e.g. `OPSDEC-05`'s permission table blocks it) | No retry; surfaced as `blocked`, same vocabulary `ARC-032` §5 already reserves. |
| Permission | Auth/authorization boundary rejected the action | No retry; escalate to owner, never silently downgrade scope to force success. |
| Human-decision-blocked | Step is correctly waiting on `InboxThread` resolution (§6.4) or owner approval (§6.6) | Not a failure — `waiting_approval`, explicitly distinct from `failed`. |
| Partial success | Multi-target action (e.g. notify 3 recipients) succeeds for some, fails for others | `partial_completed` (§6.6); orchestrator records which targets succeeded so a retry only re-attempts the remainder — this *is* the idempotency-key discipline (Temporal/AWS, §4.2) applied at the per-target level. |
| Irreversible | Outbound sends, payments, external commitments | Never modeled as "rollback." Correction = a new compensating action (e.g. a follow-up email), not an undo of the original send (Azure's Compensating Transaction pattern, §4.2, applied literally: undo the *effect*, not the *event*). |

Supporting fields, added to `AgentRun`/`ActionPlanStep` rather than invented as new tables:

- `idempotencyKey` — deterministic, derived from `(planId, stepId, attemptGroup)`, not a random token, so a retried step returns/continues the same effect instead of duplicating it (Temporal, AWS).
- `expectedVersion` — optimistic-concurrency check against `ResourceVersion.id` (§6.2) before a step writes, so a step never silently overwrites a version it did not analyze.
- `outboxRef` — for any step whose effect must be externally visible (email, provider call), the step first writes an internal "intent to send" record (transactional outbox pattern) before the actual send, so a crash between decision and send is recoverable/inspectable rather than silently lost or silently duplicated.
- `dlqRef` — a step that exhausts retries moves to a dead-letter list for owner review rather than disappearing.
- `traceId` — one id per `AnalysisEvent` or `ActionPlan`, propagated to every `AgentRun`/`ActionPlanStep` it produces, mirroring OpenTelemetry's trace/span parent-child shape (§4.2) so a cross-module case can be reconstructed end-to-end.
- `IncidentReport` — generated (Markdown, same shape as §6.3) when a step reaches `failed` or the dead-letter list, distinct from the routine `AnalysisEvent` report.

## 7. Agent Tab Information Architecture

Directly answers `OPSDEC-07`, and is the content contract `RES-009`'s Agent tab (and `ModuleOperatingShell`'s existing 代理人 tab) should render once real data exists — no tab-level UI change is proposed here beyond what `RES-009` already recommended:

| Owner question | Backing object (this document) |
|---|---|
| What is the agent doing now | `AgentRun.status = running` for this `agentProfileId` |
| Recent completed/in-progress tasks | `AgentRun` list filtered by `agentProfileId`, ordered by `completedAt`/`startedAt` |
| Next schedule | `AgentProfile.scheduleConfig` next-fire time |
| Recent agent-to-agent interactions + per-agent summary | `AgentPublicConversation.participants` involving this agent + its own `AgentModuleReflection` rows (§6.8) |
| Recent judgment summary | `AnalysisEvent.reportMarkdownRef`'s 結果 (Result) section, most recent N |
| Current working hypotheses | `AnalysisEvent`'s 分析與處理經過 (Process) section, or an explicit `workingHypotheses` field if a dedicated one proves necessary later |
| Open questions to verify | `InboxItem`/`InboxThread` entries with `entryKind = question` still unresolved (§6.4) |
| Suggested next steps | `AnalysisEvent`'s 後續行動 (Next Actions) section |
| Which issues can be discussed with the agent | Open `InboxThread`s for this module, plus a "start a new thread" affordance |
| Models used, I/O/cached tokens | `AgentRun.modelProvider`/`modelName`/`inputTokens`/`outputTokens`/`cachedTokens` |
| Per-run and per-period cost | `AgentRun.costAmount` (per run); sum against `AgentProfile.costBudgetPeriod`/`costBudgetLimit` (per period) |
| Budget/cost anomalies | A derived comparison of period-to-date cost vs. `costBudgetLimit`, surfaced as a warning, not a new stored object |

Consistent with the owner's explicit instruction: every field above is a **human-verifiable summary or count**, never a raw model transcript or hidden reasoning dump.

## 8. Gap Findings

1. No object in the current codebase represents a resource version or a diff between two versions — every module's "history" today is either absent or a flat mock audit-row list (`RES-009` §3). `ResourceVersion` (§6.2) is a genuine new addition, not an extension of an existing type.
2. `RES-007`'s pipeline is AI-Input/Inbox-specific by design; nothing today generalizes "data → agent analysis → one event → one Inbox item" to Work, Research, Chamber, Finance, Life, or Company's own data changes. `AnalysisEvent` (§6.3) is the missing generalization.
3. The memory-classification pipeline (Raw Record → Event Report → Memory Candidate → Approved Memory) does not exist in any form; today, nothing in this repo distinguishes "an event happened" from "this is now a trusted rule the agent may rely on."
4. `ARC-032`'s task lifecycle stops at `approved_for_manual_action`/`completed_no_write` by design (no execution states exist yet) — `running`/`failed`/`partial_completed` (§6.6) are new states this document adds on top, not a redesign of `ARC-032`.
5. No per-step RACI exists anywhere; `ARC-032`'s `AgentBusTask.participants` is task-level, not step-level, which is exactly the gap `OPSDEC-10` names.
6. No automation-permission policy is expressed as a multi-dimensional table (action × target × data scope × recipient × context); today's approval levels are attached per operation id (`ARC-029` §5), which cannot express "project status change is sometimes auto and sometimes human-approval depending on which status."
7. `ARC-032` supports one flat task with any number of participants; it has no concept of a *public* conversation distinct from a *task-scoped* one, nor a per-module private reflection record that avoids duplicating the full transcript.
8. No failure/retry/recovery vocabulary exists anywhere in this repo's architecture docs today; `DBS-006`'s audit envelope records *what happened*, not *why an attempt failed or how it will be retried*.
9. Rejection reasons and context-sensitive memory are not modeled at all — a rejection today (where owner-approval flows exist) is a boolean, not a reason plus a context scope.

## 9. Out of Scope / Routed From RES-009

This section exists because the owner explicitly required `RES-009` to stay scoped to tab-parity IA. The following are confirmed **out of `RES-009`'s scope** and now live here instead:

- Everything in `OPSDEC-01` through `OPSDEC-12` (§3).
- The Agent tab's *content* model (§7) — `RES-009` only recommended that the tab be clickable and mock-labeled; it explicitly did not design what real data the tab should show once it exists. This document supplies that.
- Any Prisma schema, migration, route handler, server action, or runtime execution implementing §6 — all of §6 remains type-proposal/architecture-contract only, matching this repo's established discipline (`DBS-002`, `SCH-003`, `RES-006`, `RES-007`).

`RES-009`'s own tab-parity recommendation (`ModuleOperatingShell` rollout, Work module-list un-disable, Research/Workflow tab addition) is unaffected by this document and should proceed independently — this document does not gate `WORK-018`/`RESEARCH-002`/`WORKFLOW-001`.

## 10. Executable Task Shape

Task ids use a new `EVENTOPS-0NN` prefix (checked against `PLN-060` at loop 192 — unused) for the cross-cutting objects in §6, and continue the existing `AGENT-0NN` series (currently at `AGENT-016`) for agent-model/registry-adjacent work. All rows are docs-only (type proposals / architecture contracts) unless marked otherwise; none authorize schema migration, runtime execution, real external sends, or high-risk final writes.

| Task id | Title | Module | Scope | Acceptance criteria | Files likely affected | Verification | Risks / Stop conditions | Dependencies |
|---|---|---|---|---|---|---|---|---|
| `EVENTOPS-001` | Create ARC-033: Agent Operating Model contract | Cross-module / Architecture | New `ARC-033` documents `AgentProfile`/`AgentRun` extensions (§6.1), `ResourceVersion` (§6.2), and `AnalysisEvent` (§6.3) as type proposals | `ARC-033` exists, is indexed in `MAN-001`, cross-links `SCH-001`/`ARC-008`/`RES-007`/`RES-010` | `docs/02_architecture-and-rules/ARC-033_agent-operating-model-contract.md`, `MAN-001` | Docs review, `git diff --check` | None — docs-only. | `RES-010` (this doc) |
| `EVENTOPS-002` | Extend `SCH-001` with `AgentProfile`/`AgentRun` schedule, memory, and budget fields | Agent Team OS | Amend `SCH-001`'s Prisma proposal per §6.1 (do not implement migration) | `SCH-001` documents `scheduleConfig`, `workingMemoryRef`, `costBudgetPeriod/Limit/Currency`, `dataScopeRefs` on `AgentProfile` and `triggerKind`/`scopeKind`/version refs/token+cost fields/`traceId` on `AgentRun` | `docs/02_architecture-and-rules/SCH-001_agent-team-os-schema-proposal.md` | Docs review, `git diff --check` | Do not apply a migration; DB-001/AUTH-001 gate still applies per `SCH-001`'s own header. | `EVENTOPS-001` |
| `EVENTOPS-003` | Define `ResourceVersion` type proposal and diff-on-demand contract | Cross-module | Document `ResourceVersion` (§6.2) in `ARC-030` (module resource index contract already spans all modules) as an optional per-resource history extension | `ARC-030` documents `ResourceVersion`, parent-pointer model, and "diff computed on demand, not stored" rule, citing Git's data model | `docs/02_architecture-and-rules/ARC-030_module-resource-index-bff-contract.md` | Docs review, `git diff --check` | None — docs-only. | `EVENTOPS-001` |
| `EVENTOPS-004` | Define `AnalysisEvent` and report Markdown contract | Cross-module | Document `AnalysisEvent` (§6.3) and the fixed-section Markdown report shape in `ARC-033`; cross-link `RES-007`'s `InboxItem` as the linked object rather than duplicating it | `ARC-033` documents `AnalysisEvent`, links `inboxItemId` to `RES-007` §12.3's `InboxItem`, and specifies the 9-section report shape verbatim from §6.3 | `docs/02_architecture-and-rules/ARC-033_agent-operating-model-contract.md` | Docs review, `git diff --check` | Must not redefine `InboxItem` — extend/link only. | `EVENTOPS-001`, `EVENTOPS-003` |
| `EVENTOPS-005` | Define memory-classification pipeline contract | Cross-module | Document Raw Record → Event Report → Memory Candidate → Approved Memory (§6.3) as an extension of `DBS-006`'s audit envelope, plus the `AgentProfile.workingMemoryRef` read boundary | `DBS-006` (or `ARC-033`) documents all four stages, the explicit no-auto-promotion rule, and which stage `AgentRun` context-building may read from (`Approved Memory` only) | `docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md` or `ARC-033` | Docs review, `git diff --check` | None — docs-only. | `EVENTOPS-004` |
| `EVENTOPS-006` | Define `InboxThread`/`InboxThreadEntry` type proposal | Inbox | Document Thread objects (§6.4) as an extension of `RES-007`'s `InboxItem`, in `ARC-008` alongside the other `RES-007` type proposals | `ARC-008` documents `InboxThread`/`InboxThreadEntry`, explicitly states every `authorKind: agent` entry is produced by the same module's `AgentProfile`, not a new agent | `docs/02_architecture-and-rules/ARC-008_ai-source-workflow-layer.md` | Docs review, `git diff --check` | None — docs-only. | `RES-007` (existing), `EVENTOPS-002` |
| `EVENTOPS-007` | Mock UI: render `InboxThread` inside `/inbox`'s existing `InboxItem` detail view | Inbox | Mock-only UI; add a thread panel to an `InboxItem`'s detail view showing entries and allowing owner text entries | `src/app/(dashboard)/inbox/page.tsx` renders a mock thread with owner/agent entries; no persistence | `src/app/(dashboard)/inbox/page.tsx` | `pnpm exec tsc --noEmit --pretty false`, manual click-through | Coordinate with `RES-007`'s `SRCPIPE-030`..`033` sequencing; do not duplicate. | `EVENTOPS-006`, `SRCPIPE-030` |
| `EVENTOPS-008` | Extend `ARC-032` with per-step RACI and `ActionPlan`/`ActionPlanStep` | Cross-module | Document `ActionPlan`/`ActionPlanStep`/RACI (§6.5) as an extension of `AgentBusTask`, citing PMI RACI's single-Accountable rule | `ARC-032` documents `ActionPlan`, `ActionPlanStep`, `raci` shape, and the `CaseHandoff` object for cross-agent case conversion (§6.5) | `docs/02_architecture-and-rules/ARC-032_internal-multi-agent-task-message-bus-contract.md` | Docs review, `git diff --check` | None — docs-only. | `EVENTOPS-001` |
| `EVENTOPS-009` | Extend `ARC-029` with execution safety states | Agent Team OS | Document `waiting_approval`/`approved_not_executing`/`running`/`failed`/`partial_completed`/`completed` (§6.6) as `ARC-029`'s post-dry-run state model, explicitly not enabling real execution yet | `ARC-029` documents the state table from §6.6 and states these remain unreachable until a future execution-enabling task is separately approved | `docs/02_architecture-and-rules/ARC-029_agent-operation-dry-run-contract.md` | Docs review, `git diff --check` | Must not flip any operation's `allowedModes` away from `["dry_run"]` — states are documented, not activated. | `EVENTOPS-008` |
| `AGENT-017` | Design Global AI Task Center protected read surface | Agent Team OS | Protected `/agents` (or new `/agents/tasks`) read-only view aggregating `AgentRun`/`ActionPlanStep` mock rows across all 10 module command-catalog entries, filterable by state/module/agent/risk | Contract + mock UI shows the 6-state model (§6.6) across modules; no real execution | `docs/02_architecture-and-rules/ARC-029_agent-operation-dry-run-contract.md`, new UI under `src/app/(dashboard)/agents/` | `pnpm exec tsc --noEmit --pretty false`, `pnpm build`, manual smoke | Read-only; must not add a write path. | `EVENTOPS-009` |
| `AGENT-018` | Design Agent Schedule Center | Agent Team OS | Protected settings/AI-Operations surface per module: schedule config, condition config, last/next run, per-agent budget — modeled on OpenAI Codex Automations' prompt+schedule+memory shape (§4.2) | Mock UI lets owner view (not yet persist) each agent's `scheduleConfig`/`costBudget*`; explicit mock/no-scheduler-runtime labeling | `src/app/(dashboard)/agents/` or `src/app/(dashboard)/settings/` | `pnpm exec tsc --noEmit --pretty false`, `pnpm build`, manual smoke | No real cron/scheduler runtime in this task — config UI only. | `EVENTOPS-002` |
| `EVENTOPS-010` | Define `AgentPublicConversation`/`AgentModuleReflection` type proposal | Cross-module | Document §6.8's two objects as an `ARC-032` extension, reusing A2A `contextId` vocabulary already adopted there | `ARC-032` documents both objects and the explicit "do not copy full transcript into every module" rule | `docs/02_architecture-and-rules/ARC-032_internal-multi-agent-task-message-bus-contract.md` | Docs review, `git diff --check` | None — docs-only. | `EVENTOPS-008` |
| `EVENTOPS-011` | Define `AgentInvitationRequest` type proposal | Cross-module | Document §6.9's owner-approval-gated invitation flow as an `ARC-032` extension | `ARC-032` documents `AgentInvitationRequest`, the `advisor`/`collaborator`-not-`primary` role rule, and that `caseOwnerAgentRef` never silently changes | `docs/02_architecture-and-rules/ARC-032_internal-multi-agent-task-message-bus-contract.md` | Docs review, `git diff --check` | None — docs-only. | `EVENTOPS-010` |
| `EVENTOPS-012` | Define automation permission policy contract | Cross-module | Document the action×target×data-scope×recipient×context table (§6.7) as a machine-readable contract shape, seeded with the nine confirmed rows from `OPSDEC-05` | New `src/lib/contracts/automation-permission-policy.contract.ts` (type/shape only, no evaluator logic yet) plus `ARC-029` cross-link | `ARC-029` documents the policy dimensions; contract file exports the shape and the nine seeded rows | `pnpm exec tsc --noEmit --pretty false`, `git diff --check` | Contract only — no runtime evaluator wired to any real action in this task. | `EVENTOPS-009` |
| `EVENTOPS-013` | Define rejection-reason taxonomy and Context Change Event | Cross-module | Document the seven rejection reasons (`OPSDEC-11`) and `ContextChangeEvent` (compare old/new context, generate Markdown, Inbox message, question list, then amend memory) as an extension of §6.3's memory pipeline | `ARC-033` or `DBS-006` documents rejection-reason enum and `ContextChangeEvent` shape; explicit "never silently overwrite" rule stated | `docs/02_architecture-and-rules/ARC-033_agent-operating-model-contract.md` or `DBS-006` | Docs review, `git diff --check` | None — docs-only. | `EVENTOPS-005` |
| `EVENTOPS-014` | Define failure/recovery taxonomy and supporting fields | Cross-module | Document §6.10's error categories, `idempotencyKey`/`expectedVersion`/`outboxRef`/`dlqRef`/`traceId`, and `IncidentReport` as a `DBS-006` extension, citing Temporal/Azure/AWS/OpenTelemetry | `DBS-006` documents the error-category table, the five supporting fields, and `IncidentReport`'s Markdown shape (reusing §6.3's report format) | `docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md` | Docs review, `git diff --check` | None — docs-only. | `EVENTOPS-009` |
| `EVENTOPS-015` | Extend `IngestionAgent`/relevant AgentFacts-lite manifests for Analysis Event capability | Agent Team OS / NANDA readiness | Add `analysis-event-generation` (LOW, no approval) and `action-plan-step-execution` (MEDIUM/HIGH depending on module, `requiresHumanApproval: true`) capabilities to the manifests this design touches | `docs/2_agent-input/generated/agent-loop/agent-registry/internal-agent-manifests.agentfacts-lite.json` | `pnpm agent:registry:check` | Additive, non-runtime; bundle with any still-open manifest remediation from `RES-006`/`RES-007`. | `EVENTOPS-004`, `EVENTOPS-009` |
| `EVENTOPS-020` | First vertical slice: one module, mock end-to-end | Research (recommended — smallest blast radius, no high-risk data) | Build one module's full mock loop: manual-trigger `AgentRun` → `AnalysisEvent` with real 9-section Markdown → `InboxItem` → mock `InboxThread` → mock `ActionIntent` with `waiting_approval`/`approved_not_executing`/`completed` states visible, no real writes | End-to-end click-through demonstrates every object in §6 for one module without any DB write, matching `AGENTS.md` §6's mock-first discipline | `src/app/(dashboard)/research/`, possibly a new shared mock-data module under `src/lib/mock/agent-ops/` | `pnpm exec tsc --noEmit --pretty false`, `pnpm build`, manual click-through of the full loop | This is the proof task for the whole document — if any object in §6 proves unworkable in UI form, revise the doc before continuing to other modules. | `EVENTOPS-001`–`EVENTOPS-014` (docs), `RESEARCH-002` (`RES-009`'s Research tab task) |

## 11. Rejected Alternatives

| Alternative | Rejected because |
|---|---|
| Fold this content into `RES-009` | Explicit owner instruction: tab-parity IA and the operating model are different altitudes; mixing them would make `RES-009` unfocused and this document's much larger scope would dominate it. |
| Invent a new `InboxItem`-equivalent object for the general case | `RES-007`'s `InboxItem` is already general enough (title/summary/evidence/human-review-status); `AnalysisEvent.inboxItemId` links to it directly instead of duplicating. |
| Store diffs as a persisted chain alongside each version | Contradicts Git's own model (diff computed on demand from two snapshots plus parent pointer); a stored-diff chain is a second source of truth that can silently drift from the actual content. |
| One flat "approved/rejected" boolean for AI suggestions | Owner explicitly requires a reason taxonomy (`OPSDEC-11`) so learning stays context-scoped instead of inferring a permanent preference from one rejection. |
| A single task-level RACI assignment for a whole cross-module case | Owner explicitly requires RACI per Action Step, and PMI's own single-Accountable-per-deliverable rule only makes sense applied at the step (deliverable) level, not the whole case. |
| Treat "accept AI's judgment" and "authorize execution" as one state | Owner explicitly separated these; conflating them would let an owner's read-and-agree action accidentally trigger a real write. |
| Assume outbound actions (email, payment) can be rolled back | Azure's own Compensating Transaction pattern and this repo's `AUT-007` precedent both treat irreversible external effects as needing a *new* corrective action, not an undo; assuming rollback would misrepresent real-world capability to the owner. |
| Build a brand-new external multi-agent protocol for the public conversation | `ARC-032` already adapted A2A vocabulary for exactly this; reuse over reinvention, consistent with `RES-004`'s already-completed protocol synthesis. |
| Let an agent invite another agent without owner approval | Owner explicitly requires approval-before-invite (`OPSDEC-09`); auto-inviting would silently expand an agent's effective data access without consent. |
| Implement any of §6 as real Prisma schema/migration in this document | Matches this repo's established discipline (`DBS-002`, `SCH-003`, `RES-006`, `RES-007`) of type-proposal-first, migration-later; DB-001/AUTH-001 sequencing still applies. |

## 12. Verification

This document is a research/architecture-synthesis artifact: local-fit review, comparable-pattern review, and risk/failure-boundary review (§5) were completed; §10's rows are docs-only or mock-UI-only and each names its own verification command. No Prisma schema, migration, route handler, server action, DB read/write, provider call, external send, or high-risk final write is added by this document itself. Follow-on loops implementing any `EVENTOPS-*`/`AGENT-01{7,8}` row should run `pnpm exec tsc --noEmit --pretty false`, `git diff --check`, and (for mock-UI rows) `pnpm build` plus manual click-through, per `AGENTS.md` §13.

## 13. Next Loop Recommendation

Start with the docs-only architecture rows in dependency order: `EVENTOPS-001` (create `ARC-033`) → `EVENTOPS-002`/`003`/`004` (agent model, versioning, Analysis Event) → `EVENTOPS-005` (memory pipeline) → `EVENTOPS-008`/`009` (RACI/execution states) → `EVENTOPS-010`/`011` (public conversation/invitation) → `EVENTOPS-012`/`013`/`014` (permission policy, rejection/context-change, failure taxonomy) → `EVENTOPS-015` (manifest update). Once the doc layer is stable, `EVENTOPS-020` (first vertical slice, Research recommended) is the single highest-value proof task, since it is the only row that actually exercises the model end-to-end in a UI a human can click through. Do not start `AGENT-017`/`018` (Global Task Center / Schedule Center UI) before `EVENTOPS-009`'s state model and `EVENTOPS-002`'s schedule/budget fields exist in docs form — both UI tasks read that shape directly.
