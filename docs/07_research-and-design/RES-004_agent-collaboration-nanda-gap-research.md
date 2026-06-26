# Agent Collaboration And NANDA Gap Research

**Document ID:** `RES-004`
**Last updated:** 2026-06-22
**Status:** Active loop-dev research-to-task target
**Related docs:** `ARC-028`, `ARC-029`, `RES-001`, `RES-002`, `ACC-002`, `PLN-060`, `PLN-061`

---

## 1. Question

Owner question:

- Does every module have an independent agent that can reason through CLI steps?
- Can those agents communicate externally through NANDA / MIT-style AI agent protocols?
- Can AI agents talk to each other and collaborate?
- Can the owner talk to one AI agent or command a group of AI agents?

Short answer:

Personal OS has moved from governance-only agent readiness to an internal owner-operated dry-run surface. The current local system has generated AgentFacts-lite manifests, dry-run CLI, a protected owner-only HTTP dry-run route, a 10-module command catalog, a proposal-only internal multi-agent bus, and a protected `/agents` command center. The next loop-dev target should connect the command center to the protected dry-run API proof response before any persisted task store, provider runtime, external adapter, or public registration work. External registration stays disabled.

---

## 2. Current Local State

| Surface | Current state | Gap |
|---|---|---|
| Agent inventory | 15 internal agents exist as AgentFacts-lite manifests under `docs/2_agent-input/generated/agent-loop/agent-registry/`. | Manifests are governance-only; no runtime agent process or endpoint exists. |
| Registry posture | `pnpm agent:registry:check` validates internal readiness and keeps `externalRegisterable: false`. | No runtime endpoint, auth scopes, trust attestations, telemetry evidence, registry target, rollback, or approval workflow. |
| CLI/API operation | `pnpm agent:op` and protected `POST /api/agent-operations/dry-run` support 10 shared module dry-run operations. | `/agents` does not yet call the protected route or render the returned proof DTO. No persisted task/audit record. |
| Module agent workspace | Generated manifests, protected readiness surfaces, and the 10-module command catalog exist. | Module-specific persisted proposal queues do not exist yet. |
| Owner single-agent command | Protected `/agents` lets the owner select a bounded operation and draft a local proposal packet. | The page does not yet run the protected server dry-run proof from the selected command. |
| Owner group command | Protected `/agents` supports four internal groups and group proposal packets. | No live provider-backed group runtime or persisted group task/thread store. |
| Agent-to-agent collaboration | `AGENT-011` defines a proposal-only task/message bus used by `/agents`. | No live group-agent provider runtime, persisted thread store, or persisted audit event. |
| External collaboration | Architecture target only through `ARC-028`. | No NANDA/A2A/MCP adapter, no external registry write, no public Agent Card/AgentFacts endpoint, no external agent access to scoped context packages. |

---

## 3. Protocol Research Synthesis

### NANDA / AgentFacts

Project NANDA frames the agent ecosystem around discovery, indexing, AgentFacts metadata, protocol bridges, and registry readiness. The local implication is that Personal OS should not expose agents externally until each agent has stable identity, capability metadata, endpoint policy, trust boundary, authentication, observability, and rollback evidence.

The NANDA enterprise paper describes secure agent ecosystems as needing discovery, authentication, capability verification, and cross-protocol collaboration. It also frames AgentFacts, NANDA Index, adapter layers, and Zero Trust Agentic Access as key infrastructure. For this repo, that supports the current `externalRegisterable: false` posture until auth, trust, and endpoint proof exist.

AgentFacts format material describes machine-readable metadata for capabilities, endpoints, performance metrics, and trust credentials. The local AgentFacts-lite manifests are an internal subset, not public compliance.

### A2A

A2A is useful as the model for agent-to-agent tasks and messages, not as an immediate external dependency. Its spec shape around Agent Cards, tasks, messages, task states, roles, and parts maps well to a future internal bus:

- `AgentCard` or equivalent = local manifest/readiness projection.
- `Task` = owner or agent initiated unit of work.
- `Message` = user or agent turn inside a task/context.
- `contextId`, `taskId`, and `referenceTaskIds` = traceable collaboration and cross-task linking.
- task states such as submitted, working, input-required, completed, failed, canceled, rejected, and auth-required = useful lifecycle vocabulary.

### MCP

MCP is best treated as a future tool/context bridge, not an agent collaboration bus by itself. The official MCP spec emphasizes hosts, clients, servers, tools, resources, prompts, JSON-RPC, and explicit user consent before tool invocation. For Personal OS, MCP alignment should mean:

- External tools are invoked only through scoped adapters.
- Tool execution requires owner-visible consent and audit.
- MCP servers never receive direct DB access.
- Tool descriptions are not trusted blindly.
- Private context is sent as explicit scoped packages, not raw database rows.

---

## 4. Selected Implementation Pattern

Use an internal-first, owner-protected, no-external-registration sequence:

1. Keep AgentFacts-lite manifests as the source of agent identity and capabilities.
2. Keep `ARC-029` as the protected owner-only dry-run API contract and route boundary.
3. Use the `AGENT-010` 10-module command catalog as the shared operation source for CLI and protected HTTP.
4. Use the `AGENT-011` internal multi-agent task/message bus as the proposal-only group command boundary.
5. Mature the protected `/agents` owner command center by wiring selected commands to the protected dry-run API proof panel.
6. Prepare a NANDA/A2A/MCP adapter approval package only after auth/session proof, deployment proof, source refresh, trust, rollback, public-safety review, and human approval exist.

This approach lets loop dev produce usable product increments while preserving the high-risk rules for auth, public output, high-risk module writes, and external collaboration.

---

## 5. Rejected Alternatives

| Alternative | Rejection reason |
|---|---|
| Register agents externally now | No protected runtime endpoint, auth scopes, trust evidence, rollback plan, deployment proof, or human approval. |
| Add public AgentFacts or Agent Card endpoint now | Would create public discovery surface before auth/public-output review. |
| Let external agents query the database directly | Violates the project boundary. External agents may only receive scoped context packages later. |
| Add autonomous agent writes | High-risk modules and final writes require owner approval; current system is proposal/dry-run first. |
| Implement group chat UI before task/audit contract | Would create an untraceable collaboration surface without lifecycle, redaction, approvals, or audit. |
| Use MCP as the whole agent protocol | MCP is a tool/context protocol; agent collaboration still needs task/message/participant and trust semantics. |

---

## 6. Maturity Levels

| Level | Meaning | Current status |
|---|---|---|
| `A0_MANIFEST_ONLY` | Agents exist as governance manifests. | Complete. |
| `A1_DRY_RUN_CLI` | Owner can dry-run known operations from CLI. | Complete for 10 shared module operations. |
| `A2_PROTECTED_OPERATION_API` | Owner/admin can call a protected dry-run BFF/API contract. | Route exists; next target is owner UI invocation and proof display through `AGENT-015`. |
| `A3_MODULE_AGENT_WORKSPACES` | Every module has a bounded agent workspace command catalog and proposal queue. | Command catalog complete; persisted module queues not implemented. |
| `A4_INTERNAL_MULTI_AGENT_BUS` | Agents can exchange task-scoped messages with audit and owner controls. | Proposal-only contract complete; no persisted/live runtime. |
| `A5_EXTERNAL_ADAPTER_APPROVAL_READY` | NANDA/A2A/MCP adapter plan has endpoint, auth, trust, rollback, and approval package. | Not implemented; must refresh current protocol sources before approval package. |
| `A6_EXTERNAL_REGISTERED` | Human-approved external registration and collaboration are live. | Explicitly blocked. |

---

## 7. Executable Loop-Dev Tasks

| Task id | Goal | Mode | Acceptance |
|---|---|---|---|
| `AGENT-008` | Research agent collaboration and NANDA/A2A/MCP gaps. | Research-to-task | This document exists, source links are recorded, and backlog rows `AGENT-009` through `AGENT-013` are executable. |
| `AGENT-009` | Add protected agent operation API dry-run BFF contract. | API/BFF contract or runtime if auth-safe | Mirrors `pnpm agent:op` through owner/admin protection, no DB/provider/external writes, no public endpoint. |
| `AGENT-010` | Define per-module agent workspace command catalog. | Contract/UI maturity | Each module maps to allowed command ids, proposal outputs, blocked writes, and UI entry surface. |
| `AGENT-011` | Define multi-agent conversation and task bus contract. | Architecture/schema proposal | Thread, task, message, participant, lifecycle, reference task ids, approval, audit, redaction, and retention are specified before runtime. |
| `AGENT-012` | Add owner AI command center single/group instruction surface. | Protected UI/BFF | Owner can choose one agent or a group, send a bounded command, and review proposal-only outputs. |
| `AGENT-015` | Wire owner AI command center to protected dry-run API proof panel. | Protected UI/BFF runtime | Owner can call the internal dry-run route from `/agents`, inspect a no-secret proof DTO, and keep local proposal packets distinct from server dry-run proof. |
| `AGENT-013` | Prepare external NANDA/A2A/MCP adapter approval package. | External collaboration approval | External adapter remains disabled; endpoint/auth/trust/scopes/rollback/public-safety/human approval checklist is ready. |

Loop priority after this research:

1. `AUTH-005` still preempts when Supabase public env plus signed-in `/auth/status` evidence exists.
2. `WORK-009` still preempts when `pnpm work:proof-target:check` reports `ready_for_work_009` and the target is confirmed disposable/local.
3. If both are absent, run `AGENT-015` as the next user-directed no-proof target after loop 78.
4. Keep `AGENT-013` blocked until auth/session proof, protected endpoint evidence, deployment proof, scopes/trust/rollback, public-safety review, current protocol source refresh, and explicit human approval exist.

## 7A. Loop 78 Update

Loop 78 refreshed this research after `AGENT-009`, `AGENT-014`, `AGENT-010`, `AGENT-011`, and `AGENT-012` were completed. The new shortest no-proof path is no longer "create an API route"; it is to make the protected owner UI use that route and render proof safely.

External-source update:

- NANDA sources still support an identity/index/protocol-bridge/attestation/onboarding interpretation rather than immediate public registration.
- A2A remains useful as the conceptual shape for tasks, participants, messages, parts, and lifecycle state.
- MCP has a newer official changelog after the locally cited 2025-06-18 spec, so external adapter work must include a source refresh before approval.

New executable artifact: `AGENT-015` protected command-center dry-run API proof panel.

---

## 8. Stop Conditions

Stop before implementation or ask for owner approval if the selected task would:

- expose a public agent directory, public AgentFacts endpoint, or public Agent Card;
- register with NANDA Index, A2A directory, MCP registry, or any external directory;
- create an externally reachable runtime endpoint without auth, scope, rate limit, rollback, and audit;
- let an external agent access the database directly;
- write to Finance, Life, Company Strategy, Client Portal, auth/permission, public output, or other high-risk modules without explicit approval;
- apply a Prisma migration or production database write;
- send private context to an external agent, provider, MCP server, or adapter without scoped context package approval.

---

## 9. Verification For This Research Slice

Minimum verification:

```bash
pnpm agent:op -- --list
pnpm agent:registry:check -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-20260622-agent-collaboration-registry-check.json
node -e "JSON.parse(require('fs').readFileSync('docs/2_agent-input/generated/agent-loop/loop-state.json', 'utf8')); console.log('loop-state json ok')"
git diff --check
```

This slice is current only when task memory points loop 79 to `AGENT-015` if `AUTH-005` and `WORK-009` remain blocked.

---

## 10. Sources

- Project NANDA: https://github.com/projnanda/projnanda
- Project NANDA public site: https://projectnanda.org/
- AgentFacts format: https://github.com/projnanda/agentfacts-format
- NANDA enterprise architecture paper: https://arxiv.org/html/2508.03101v1
- A2A protocol specification: https://a2a-protocol.org/latest/specification/
- A2A GitHub repository: https://github.com/a2aproject/A2A
- Model Context Protocol specification 2025-06-18: https://modelcontextprotocol.io/specification/2025-06-18
- Model Context Protocol 2025-11-25 changelog: https://modelcontextprotocol.io/specification/2025-11-25/changelog
- MCP tools specification: https://modelcontextprotocol.io/specification/2025-06-18/server/tools
