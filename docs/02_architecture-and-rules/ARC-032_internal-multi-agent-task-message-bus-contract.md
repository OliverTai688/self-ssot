# Internal Multi-Agent Task Message Bus Contract

**Document ID:** `ARC-032`
**Last updated:** 2026-06-22
**Status:** Architecture contract implemented as `AGENT-011` static/proposal bus contract
**Runtime implementation:** `src/lib/contracts/agent-task-message-bus.contract.ts` and `pnpm agent:bus:check` now provide the machine-readable contract proof. No Prisma schema, migration, seed, route handler, server action, database read/write, external adapter, provider call, public output, or live group-agent runtime is implemented.

---

## 1. Purpose

Personal OS now has internal AgentFacts-lite manifests, protected owner/admin readiness surfaces, a dry-run CLI, an internal protected dry-run HTTP route, and a 10-module command catalog. The next missing layer is an internal task/message bus so the owner can later instruct one agent or a bounded group of agents without creating an untraceable chat surface.

`AGENT-011` defines this bus before `AGENT-012` builds the owner AI command center UI.

The bus is for internal proposal and coordination only:

```txt
owner instruction or agent proposal
  -> scoped task
  -> participants
  -> messages
  -> proposal outputs
  -> approval gates
  -> future audit event
```

It is not external collaboration, autonomous execution, or direct database access by agents.

## 2. Source Basis

Local sources reviewed:

- `ARC-023_agent-team-os-operating-contract.md`
- `ARC-028_nanda-agent-protocol-alignment.md`
- `ARC-029_agent-operation-dry-run-contract.md`
- `RES-004_agent-collaboration-nanda-gap-research.md`
- `DBS-006_operating-audit-event-schema-contract.md`
- `ACC-002_module-acceptance-criteria.md`
- `PLN-060_task-backlog.md`
- `PLN-061_current-sprint.md`
- `docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-74-20260622-module-agent-command-catalog.md`

Primary external protocol sources checked during loop 75:

- Project NANDA GitHub organization: https://github.com/projnanda
- Project NANDA core repository: https://github.com/projnanda/projnanda
- A2A protocol repository: https://github.com/a2aproject/A2A
- MCP 2025-06-18 specification: https://modelcontextprotocol.io/specification/2025-06-18

Local interpretation:

- NANDA-style readiness supports stable identity, capability, trust, auth, observability, and registration controls.
- A2A is useful vocabulary for tasks, messages, participants, task states, and role-based turns.
- MCP is a future tool/context bridge, not a replacement for Personal OS owner approval, task lifecycle, or audit boundaries.

## 3. Contract Scope

In scope for `AGENT-011`:

- A machine-readable internal task/message bus contract.
- Participant roles for owner, internal agents, future external placeholder, and system.
- Task lifecycle states.
- Message parts and references.
- Proposal output boundaries.
- Approval and high-risk stop conditions.
- Audit event mapping to `DBS-006`.
- Validation script or static proof for the contract.

Out of scope for `AGENT-011`:

- Live chat UI.
- Public endpoint.
- External NANDA, A2A, or MCP publication.
- External agent context package delivery.
- Autonomous execution.
- Prisma schema edit, migration, seed, or persisted message rows.
- Provider calls or tool invocation.
- High-risk final writes.

## 4. Bus Objects

`AGENT-011` defines these TypeScript contract objects under `src/lib/contracts/` before any UI/runtime:

| Object | Purpose | Required fields |
|---|---|---|
| `AgentBusTask` | A bounded unit of owner/agent work. | `id`, `title`, `targetModule`, `operationId`, `state`, `riskLevel`, `approvalLevel`, `createdBy`, `participants`, `sourceRefs`, `auditRefs`, `blockedActions` |
| `AgentBusParticipant` | Actor in the task. | `participantId`, `kind`, `agentLabel`, `role`, `permissions`, `externalRegisterable` |
| `AgentBusMessage` | A message or turn inside the task. | `messageId`, `taskId`, `sender`, `role`, `parts`, `references`, `visibility`, `createdAtLabel` |
| `AgentBusMessagePart` | Structured content inside a message. | `kind`, `text`, `artifactRef`, `proposalRef`, `proofRef`, `redactionPolicy` |
| `AgentBusProposal` | Reviewable output. | `proposalId`, `taskId`, `summary`, `targetModule`, `riskLevel`, `approvalRequired`, `writeBlocked`, `nextOwnerAction` |
| `AgentBusAuditMapping` | Future audit link. | `eventFamily`, `sourceKind`, `operationId`, `proofRef`, `retentionClass` |

All identifiers in the first contract should be deterministic labels or relative proof references, not profile ids, DB ids, cookies, tokens, provider payload ids, or private record ids.

## 5. Task Lifecycle

Allowed states:

| State | Meaning |
|---|---|
| `draft` | Owner or system has prepared a bounded task but no agent turn has started. |
| `submitted` | Owner submitted the task for internal dry-run/proposal work. |
| `working` | Internal agent is drafting or reviewing. |
| `input_required` | Owner input is needed before continuing. |
| `proposal_ready` | Agent output is ready for owner review. |
| `approved_for_manual_action` | Owner approved a manual next step, not an autonomous write. |
| `rejected` | Owner rejected the proposal or route. |
| `blocked` | Stop condition or missing proof prevents continuation. |
| `completed_no_write` | Task ended without runtime write. |

No `executed`, `auto_written`, or `external_sent` state is allowed in `AGENT-011`.

## 6. Participant Rules

Allowed participant kinds:

| Kind | Allowed now | Rule |
|---|---:|---|
| `owner` | Yes | Owner can submit instructions and approve/reject proposals. |
| `internal_agent` | Yes | Internal agents may read scoped repo/proof context and produce proposals. |
| `system` | Yes | System can record routing, validation, and blocked states. |
| `external_agent_placeholder` | Documentation only | May appear only as a disabled future placeholder. |
| `external_agent_runtime` | No | Blocked until `AGENT-013` approval gates pass. |

Internal agents must map to generated AgentFacts-lite labels. Unknown labels fail validation.

## 7. Data And Visibility Policy

The bus may reference:

- module keys;
- command ids from `AGENT-010`;
- generated proof file paths;
- formal document paths;
- safe labels from AgentFacts-lite manifests;
- proposal summaries;
- owner-visible next action labels.

The bus must not include:

- database URLs or hosts;
- Supabase service keys, publishable keys, cookies, tokens, or raw claims;
- raw provider payloads;
- raw private record bodies;
- profile ids or public token verifier values;
- direct external agent callback URLs;
- unredacted finance, life, company strategy, or client-visible content.

## 8. Approval And Stop Conditions

Always stop before:

- external registration;
- public agent directory or public Agent Card/AgentFacts endpoint;
- external agent context package delivery;
- direct database access by any external agent;
- final writes to Finance, Life, Company Strategy, Client Portal, auth/permission, or public output;
- Prisma migration or seed;
- runtime provider/tool call;
- persisted audit write before the audit storage implementation is approved.

High-risk task proposals must set `approvalRequired: true` and `writeBlocked: true`.

## 9. Audit Mapping

Future persisted events should use `DBS-006`:

```txt
eventFamily: agent.operation
sourceKind: internal_agent_bus
result: dry-run | proposal | blocked | rejected | completed_no_write
operationId: AGENT-010 command id when applicable
proofRef: generated evidence report path
retentionClass: security_1_year by default, high_risk_7_year_review_required for critical modules
```

`AGENT-011` does not append audit rows yet. It creates a redacted audit mapping that a future `AUDIT-OPS` runtime implementation can persist.

## 10. AGENT-011 Implementation Shape

Implemented files:

- `src/lib/contracts/agent-task-message-bus.contract.ts`
- `scripts/check-agent-task-message-bus-contract.mjs`
- `package.json`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-76-20260622-agent-task-message-bus.md`

Checker command:

```bash
pnpm agent:bus:check
```

Minimum checker requirements now enforced:

- Contract exports task, participant, message, proposal, lifecycle, and audit mapping constants.
- Contract references all participant kinds and allowed lifecycle states.
- Contract imports or mirrors the 10 `AGENT-010` operation ids.
- High-risk modules are marked approval-required and write-blocked.
- External participant runtime is disabled.
- Forbidden runtime markers are absent: `PrismaClient`, `db.`, `process.env`, `fetch(`, provider clients, cookies, tokens, and external registry writes.

## 11. Acceptance Criteria

`AGENT-011` is complete when:

- The internal bus contract exists as machine-readable source.
- A checker command reports ready for contract use.
- The contract covers task/thread, message, participant, lifecycle, proposal output, approval, audit, redaction, retention, and stop conditions.
- It maps to `AGENT-010` command ids and generated AgentFacts-lite labels.
- It creates no live group chat, route handler, server action, schema change, migration, seed, DB read/write, provider call, external adapter, public endpoint, high-risk final write, external agent database access, or public output.

## 12. Rejected Alternatives

| Alternative | Rejected because |
|---|---|
| Build group chat UI before a bus contract | Would create untraceable owner/agent collaboration without lifecycle, audit, approval, or redaction semantics. |
| Use A2A externally now | External endpoint, auth/scopes, trust, deployment proof, rollback, and approval are missing. |
| Use MCP as the task bus | MCP is better for tool/context exposure; Personal OS still needs owner task lifecycle, proposals, and audit mapping. |
| Persist AgentMessage rows immediately | Schema/auth/audit storage review and proof target are not ready. |
| Let external agents query DB or private context | Violates Personal OS trust and public-output boundaries. |
