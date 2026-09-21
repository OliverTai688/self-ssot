# ARC-034 - AI Development Team OS Domain and Adapter Architecture Contract

**Document ID:** `ARC-034`  
**Date:** 2026-07-24  
**Status:** Governance and Architecture Contract  
**Runtime Implementation:** `src/lib/contracts/ai-development-team-os.contract.ts` and `pnpm agent:devteam:check` provide the machine-readable contract proof. No Prisma schema migration, direct database read/write, provider call, public output, or sandbox execution is enabled.

---

## 1. Purpose

This document defines the formal domain and adapter architecture contract for the **AI Development Team OS**. Following the owner's choice to adopt a **Shared Team OS Trust Plane** and establish a **brand-new independent protected interface**, this contract defines the 20 core domain and adapter objects, their state constraints, their safety invariants, and their mapping to existing Personal OS structures.

---

## 2. Source Basis

This contract is grounded in the following local and external sources:

- **Local Sources:**
  - `RES-023_ai-development-team-os-structural-research.md` - evolved requester/custodian diagram, layered architecture layers, tool-selection matrix.
  - `RES-024_shared-team-os-trust-plane-and-independent-ai-development-team-interface-research.md` - trust plane boundary, separate bounded contexts, independent protected interface route concept.
  - `RES-025_github-reference-repositories-for-ai-development-team-os-research.md` - evaluation of external codebases (Pane, Superset, OpenHands, OpenCode, Goose, Plandex) and licensing gates.
  - `ARC-028_nanda-agent-protocol-alignment.md` - AgentFacts-lite schemas, registry postures, and Zero Zero Trust boundaries.
  - `ARC-032_internal-multi-agent-task-message-bus-contract.md` - task, participant, and message bus invariants.
  - `DBS-006_operating-audit-event-schema-contract.md` - append-only operating audit event schema envelope.

- **External Sources:**
  - **Project NANDA & AgentFacts URN Format:** Describes stable identity and registries.
  - **Model Context Protocol (MCP):** Standards for secure context sharing and tool registration.
  - **LangGraph & Deep Agents:** State/workflow management, human-in-the-loop checkpoint boundaries.
  - **Zero Trust Agentic Access (ZTAA) principles:** Default deny, context scoping, and sandbox compute containment.

---

## 3. Bounded Context and Trust Plane

To prevent context contamination and data leaks, the architecture distinguishes the shared security infrastructure from task-specific workflows.

### 3.1 Shared Team OS Trust Plane
Represents the unified, append-only security infrastructure. It is the sole authority for agent identity (`AgentFactsLite`), permission/risk policies (`BoundaryPolicy`), human deadlock/consent decisions (`OwnerInboxDecision`), audit traces (`AuditEvidenceEnvelope`), and reusable lessons (`AgentRuleMemory`). 

### 3.2 Bounded Contexts
- **Conversation/Consent Context (`RES-015`):** Bounded context governing natural chat, in-context reference pickers, and consent requests.
- **Development/Execution Context (AI Development Team OS):** Bounded context governing tasks, roles, assignments, worktree sandboxes, testing, reviews, and skill promotion.

---

## 4. Bounded Context Objects Mapping Matrix

The contract defines 20 distinct objects, mapping each to existing Personal OS features:

| Contract Object | Context/Plane | Purpose | Existing Mapping / Anchor |
|---|---|---|---|
| **1. SharedAgentTrustPlane** | Trust Plane | Represents the unified security and trust infrastructure. | Existing Agent Team OS infrastructure, `BoundaryPolicy` |
| **2. ConversationConsentContext** | Bounded Context | Governs natural human-agent chat and reference mapping. | `AIAnalysisConversation`, `InboxItem` |
| **3. DevelopmentExecutionContext** | Bounded Context | Governs task execution, testing, review, and promotion. | Worktree session and execution telemetry |
| **4. IndependentAIDevelopmentTeamInterface** | Bounded Context | Bounded protected UI workspace (`/ai-dev-team`). | Dedicated frontend shell route, no tab/section of other views |
| **5. CrossContextAccessRequest** | Bounded Context | Request context packages from other bounded contexts. | `AgentConsentRequest` URN mapping |
| **6. ContextPackageManifest** | Trust Plane | Serialized context package referencing verified assets/docs. | `SourceProvenanceEvent`, `FileAssetSnapshot` |
| **7. DecisionRuleScope** | Trust Plane | Specifies rule applicability (e.g. module, agent, global). | `AgentRuleMemory.scope` |
| **8. AuditEvidenceEnvelope** | Trust Plane | Append-only trace linking runs/tests to audit. | `DBS-006` Audit Event formats |
| **9. ExternalRegistrationGate** | Trust Plane | Policy gate enforcing `externalRegisterable: false`. | `ARC-028` registration rules |
| **10. RuntimeApprovalGate** | Trust Plane | Intercepts shell, file, and provider calls for review. | `ARC-029` dry-run API validation |
| **11. DevTeamTask** | Bounded Context | Single, owner-approved development target. | `AgentBusTask` and `PLN-060` rows |
| **12. DevAgentRole** | Bounded Context | Long-lived specialist role (Developer, QA, Reviewer). | URN `AgentProfile` labels |
| **13. DevAgentAssignment** | Bounded Context | Association of a role to a task with a defined budget. | `AgentRun` profile allocation |
| **14. DevContextRequest** | Bounded Context | Scoped request to module custodian for schemas/code. | `CollaborationRequest` mapping |
| **15. DevWorktreeSession** | Bounded Context | Branch, folder, and process state for task isolation. | Git branch/worktree, future Pane-style session |
| **16. CodingAgentAdapterPolicy** | Bounded Context | Bounded execution rules for external coding adapters. | Adapter wrapper configuration |
| **17. DevRunEvidence** | Bounded Context | Trace outcomes, diff summaries, test reports, and logs. | `EventReport`, S3/R2 artifacts |
| **18. DevReviewDecision** | Bounded Context | Reviewer or owner verdict (approve, reject, revise). | `InboxItem` / `ActionPlan` check |
| **19. DevExperienceMemory** | Bounded Context | Qualitative learning to promote as a rule candidate. | `MemoryCandidate` |
| **20. DevSkillCandidate** | Bounded Context | Verified procedure to promote into rule memory. | `.codex/skills/*` template candidates |

---

## 5. Development/Execution Domain Model Invariants

Every development task context package, execution run, and review decision must adhere to the following invariants:

1. **Deterministic Identity:** All identifiers (`taskId`, `roleId`, `sessionId`, `runId`) must be URN-based and deterministic. No database internal IDs, user tokens, cookies, or secrets may reside in these payloads.
2. **Context Containment:** A `DevWorktreeSession` is restricted to task-specific files defined in the `DevTeamTask`. The agent cannot traverse folders outside the worktree.
3. **HITL Deadlock Resolution:** If a `DevContextRequest` is blocked or ambiguous, it MUST emit a `CrossContextAccessRequest` to the Owner Inbox. The task transitions to `input_required` and pauses execution.
4. **Evidence-Linked Promotion:** A `DevSkillCandidate` can only be promoted to Rule Memory after:
   - A `DevReviewDecision` of type `APPROVE` exists.
   - All tests in `DevRunEvidence` pass.
   - The owner explicitly signs off on the skill manifest rewrite.
5. **Fail-Closed Adapters:** All coding adapters mapped via `CodingAgentAdapterPolicy` must run under the `RuntimeApprovalGate`. Default action is to intercept and dry-run block.

---

## 6. Safety Policy Invariants

In order to meet NANDA-alignment security gates, the contract establishes strict safety invariants:

- `publicEndpointCreated: false` (Zero public endpoints exposed for developer tasks)
- `externalRuntimeEnabled: false` (No active provider API loops running autonomously)
- `externalRegistryWrite: false` (External NANDA, MCP, or A2A registers are read-only placeholders)
- `databaseWrite: false` (Agents cannot write database records; they emit proposals only)
- `highRiskFinalWrite: false` (Finance, Life, Strategy, and Client Portal are fail-closed to modifications)
- `externalAgentDatabaseAccess: false` (External agents never receive database access)

---

## 7. Next Task Sequencing

1. `AIDEVTEAM-003`: Define isolated Git worktree/session manager contract.
2. `AIDEVTEAM-004`: Define durable development workflow state machine and checkpoints.
3. `AIDEVTEAM-005`: Define agent memory, versioning, and skill-promotion contract.
4. `AIDEVTEAM-006`: Create independent AI Development Team protected interface (`/ai-dev-team`).
