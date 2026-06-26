# NANDA Agent Protocol Alignment

**Document ID:** `ARC-028`
**Last updated:** 2026-06-21
**Status:** Governance and architecture contract
**Runtime implementation:** Staged; no external registration by default

---

## 1. Purpose

Personal OS should evolve so every internal AI role, module agent, skill-backed agent, workflow agent, and future external collaborator can be described, governed, discovered, and eventually registered through a NANDA-inspired protocol shape.

This document turns that goal into a development-loop rule:

- Research NANDA and adjacent agent protocol patterns repeatedly as they evolve.
- Convert each research pass into a small implementation or proof artifact.
- Keep every agent compatible with an AgentFacts-lite manifest before any public or external registration.
- Preserve Personal OS security boundaries: external agents never receive direct database access, and public or high-risk writes require human approval.

This is an alignment target, not a claim that the current repo is fully NANDA-compliant.

## 2. Source Basis

Current alignment is based on these primary sources:

- Project NANDA GitHub organization: https://github.com/projnanda
- Project NANDA core docs and README: https://github.com/projnanda/projnanda
- NANDA Index reference service: https://github.com/projnanda/nanda-index
- AgentFacts format: https://github.com/projnanda/agentfacts-format
- NANDA Index enterprise architecture paper: https://arxiv.org/abs/2508.03101

Relevant patterns from those sources:

- Agents need discovery, capability verification, and secure coordination.
- Indexes and registries support registration, lookup, search, allocation, and cross-index discovery.
- AgentFacts-style metadata describes identity, provider, endpoints, capabilities, skills, telemetry, quality metrics, trust, and verification.
- NANDA architecture emphasizes global discovery, capability attestation, cross-protocol interoperability, Zero Trust Agentic Access, and enterprise visibility/control.

## 3. Alignment Principles

Every Personal OS AI agent must move toward these properties:

| Principle | Personal OS interpretation |
|---|---|
| Stable identity | Each agent has a stable key, label, version, owner module, lifecycle status, and source-of-truth doc or manifest. |
| Capability declaration | Capabilities and skills are explicit, scoped, risk-rated, and mapped to allowed modules and input/output modes. |
| Trust boundary | Auth, permission, approval, data visibility, and blocked actions are declared before the agent can act. |
| Discovery readiness | Agents can be found in an internal registry before any external registry exposure. |
| Protocol neutrality | Internal agents should not be locked to one provider; future adapters may bridge internal APIs, HTTPS, MCP, A2A, or NANDA-style indexes. |
| Observability | Runs, evidence reports, verification commands, and telemetry claims must be traceable. |
| Registration control | External registration, public endpoint exposure, or external agent collaboration requires explicit human approval. |

## 4. AgentFacts-Lite Manifest

Until a final runtime schema is approved, Personal OS uses an AgentFacts-lite contract for design, docs, generated manifests, and validation scripts.

Minimum fields:

```json
{
  "id": "personal-os:product-manager-agent",
  "agent_name": "urn:agent:personal-os:ProductManagerAgent",
  "label": "ProductManagerAgent",
  "description": "Keeps product intent, roadmap, and task sequencing coherent.",
  "version": "0.1.0",
  "provider": {
    "name": "Personal OS",
    "url": null
  },
  "lifecycle": {
    "status": "governance-only",
    "ownerModule": "product",
    "sourceOfTruth": "docs/02_architecture-and-rules/ARC-020_internal-agents.md"
  },
  "endpoints": {
    "internal": [],
    "external": []
  },
  "protocols": ["internal"],
  "capabilities": [
    {
      "id": "task-prioritization",
      "description": "Convert product intent into executable backlog slices.",
      "riskLevel": "LOW",
      "requiresHumanApproval": false,
      "allowedTargetModules": ["docs", "backlog"]
    }
  ],
  "skills": [],
  "auth": {
    "methods": [],
    "requiredScopes": []
  },
  "trust": {
    "approvalLevel": "AUTO_PROPOSE",
    "dataVisibilityLevel": "repo-docs",
    "boundaryPolicy": "docs/02_architecture-and-rules/ARC-019_agent-boundary-policy.md",
    "attestations": []
  },
  "observability": {
    "evidenceReports": [],
    "lastVerification": null,
    "telemetryClaims": []
  },
  "registry": {
    "internalDiscoverable": true,
    "externalRegisterable": false,
    "registrationStatus": "not-registered",
    "registryTargets": []
  }
}
```

Rules:

- Do not invent metrics, certifications, uptime, trust scores, or external registrations.
- Use `externalRegisterable: false` until endpoint, auth, trust, permission, and public safety are reviewed.
- Treat missing manifest fields as a blocker for external registration and a TODO for internal readiness.
- Keep raw provider secrets, tokens, cookies, database URLs, profile IDs, and private records out of manifests.

## 5. Development Loop Gate

Any task that touches these areas must run a NANDA Agent Protocol Gate:

- `ARC-019` through `ARC-024` agent governance docs
- `ARC-028` itself
- AI Input, Workflow, Agent Team OS, skill registry, task routing, AI service adapters
- MCP, A2A, NANDA, AgentFacts, external registries, or external agent collaboration
- Any runtime feature that creates, modifies, routes, evaluates, or exposes an AI agent capability

Gate questions:

1. Does this create, rename, modify, expose, route, or deprecate an agent or agent capability?
2. Which AgentFacts-lite fields are added, changed, or still missing?
3. Is the agent internally discoverable, and where is the source-of-truth manifest or registry row?
4. Would this require external registration, public endpoint exposure, or cross-organization collaboration?
5. What auth, permission, approval, data visibility, and high-risk module boundaries apply?
6. What verification, evidence report, manifest validation, or trust attestation exists after the task?
7. What NANDA or adjacent protocol source was reviewed, and what implementation choice did it justify?

## 6. Research And Practice Cadence

Research is not complete unless it produces a concrete artifact.

Each NANDA-alignment loop must leave at least one of:

- AgentFacts-lite manifest inventory
- manifest JSON schema or validation script
- internal agent registry document or BFF contract
- registry route or server-only read model
- protocol adapter boundary
- trust/approval/visibility policy update
- evidence report with source links and rejected alternatives
- executable backlog task with acceptance criteria and verification

Fifth-loop launch reviews must include agent protocol readiness when recent work touched AI, Workflow, Agent Team OS, external collaboration, or registration.

## 7. Phased Implementation

| Phase | Goal | Allowed work | Blocked work |
|---|---|---|---|
| A. Governance alignment | Add loop rules and source-backed architecture | Docs, backlog, evidence, research notes | Runtime registration claims |
| B. Internal manifest inventory | Create AgentFacts-lite records for every internal agent | Generated manifests, docs, validation script | Public endpoints |
| C. Internal validation | Check manifests in CI/local scripts | JSON schema, static validation, source scans | External registry writes |
| D. Internal registry surface | Read-only discovery for owner/admin | Server-only BFF, protected UI, audit evidence | Public agent directory |
| E. External adapter proposal | Design NANDA Index / MCP / A2A bridge | Adapter contract, threat model, approval workflow | Live registration without approval |
| F. Controlled registration | Register selected safe agents | Human-approved registration, rollback plan, audit | Direct DB access for external agents |

## 8. Relationship To Existing Agent Docs

- `ARC-019_agent-boundary-policy.md` remains the approval and risk policy.
- `ARC-020_internal-agents.md` remains the initial virtual team definition.
- `ARC-021_skill-registry.md` remains the skill source list.
- `ARC-022_task-routing.md` remains task routing guidance.
- `ARC-023_agent-team-os-operating-contract.md` already proposes `ExternalAgentRegistry` and `NandaBridgeConfig`; those remain proposal-only until migration review and explicit approval.
- `ARC-024_ai-service-adapter-boundary.md` remains the AI provider boundary.

## 9. Acceptance Criteria

Personal OS is NANDA-alignment ready when:

- Every internal agent in `ARC-020` has an AgentFacts-lite manifest.
- Each manifest validates against the approved local schema.
- Each capability has risk level, approval level, allowed modules, and data visibility.
- High-risk agents are not externally registerable by default.
- Registry status is visible in a protected owner/admin surface.
- External registration requires a human-approved plan, endpoint review, auth review, rollback plan, and evidence report.
- Evidence reports identify NANDA/protocol source links when protocol behavior informed a task.

## 10. Immediate Backlog

Recommended next slices:

1. `AGENT-005`: Inventory internal agents into AgentFacts-lite manifests. Completed.
2. `AGENT-006`: Add local manifest schema validation and a no-secret registry readiness check. Completed.
3. `AGENT-007`: Add protected read-only Agent Protocol readiness surface in admin/settings or Agent Team OS. Completed.
4. `AGENT-008`: Research agent collaboration and NANDA/A2A/MCP gaps, then convert them into executable loop-dev rows. Completed in `RES-004_agent-collaboration-nanda-gap-research.md`.
5. `AGENT-009`: Add a protected owner/admin dry-run BFF/API contract mirroring `pnpm agent:op`, or stop at contract-only proof if auth/session evidence is absent.
6. `AGENT-010`: Define the per-module agent workspace command catalog across Work, Research, AI Input, Workflow, Life, Finance, Chamber, Company, Client Portal, and Agent Team OS.
7. `AGENT-011`: Define the internal multi-agent task/message bus contract before any group-agent runtime.
8. `AGENT-012`: Add the owner AI command center for single-agent and group-agent instructions with proposal-only outputs.
9. `AGENT-013`: Prepare the external NANDA/A2A/MCP adapter approval package while keeping external registration disabled.

Do not start external registration before `AUTH-005`, `WORK-007`, deployment marker proof, protected operation API proof, auth/scopes, trust evidence, rollback, public-safety review, and explicit human approval are complete.
