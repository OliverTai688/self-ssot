# RES-015 Evolution vs. Two Independent Agent Teams

**Date:** 2026-07-22  
**Language:** English source document  
**Status:** Discussion research, not a formal architecture decision  
**Question:** What changes if Personal OS evolves `RES-015` into the AI Development Team OS versus keeping `RES-015` and the AI Development Team as two independent agent teams?
**Owner direction addendum:** On 2026-07-22, the owner selected the Shared Team OS Trust Plane direction and clarified that AI Development Team OS should be a brand-new independent protected interface, not a tab, section, or extension of any existing Personal OS interface.

---

## 1. Executive Answer

There are three possible architectures:

1. **Integrated Evolution:** `RES-015` becomes the consent, context, owner-inbox, and rule-memory substrate of the AI Development Team OS.
2. **Two Independent Teams:** one agent team owns `RES-015` chat/reference/cross-agent consent, and another agent team owns AI development work.
3. **Hybrid Bounded-Context Architecture:** one shared trust/control plane, but two bounded operational contexts: Conversation/Consent and Development Execution.

The recommended path for Personal OS is the third:

> Keep one shared **Team OS trust plane** for identity, permissions, owner inbox, audit, rule memory, AgentFacts-lite, and evidence; treat `RES-015` and AI Development Team work as two bounded contexts inside that trust plane; give AI Development Team OS a brand-new independent interface rather than placing it inside existing `/agents`, `/ai-input`, admin/settings, Work, or module surfaces.

This gives Personal OS the main advantage of separation without prematurely creating duplicate governance, memory, agent registries, inboxes, approval systems, and observability stacks.

---

## 2. Current Personal OS Context

`RES-015` currently defines a cross-agent collaboration pattern:

```txt
Requester Agent asks Custodian Agent for context or permission
  -> Custodian checks Rule Memory
  -> allowed: scoped context is granted
  -> denied or ambiguous: Owner Inbox receives a decision request
  -> owner approves / rejects / narrows
  -> owner reason becomes future Rule Memory
```

`RES-023` evolves that pattern into development-team work:

```txt
Owner intent
  -> Coordinator Agent
  -> Requester/Custodian context request
  -> Owner Inbox if ambiguous
  -> Durable Workflow
  -> Worktree Sandbox
  -> Evidence and Review
  -> Experience Memory / Skill Candidate
```

The key decision is whether `RES-015` is:

- a **shared protocol layer** used by the development team, or
- a **separate agent team** with its own runtime, memory, policies, and inbox.

---

## 3. Web Research Basis

This comparison uses the following current/primary sources:

- LangChain multi-agent docs: multi-agent systems help with context management, distributed development, and parallelization; context engineering is central; not every complex task needs multi-agent architecture. Source: <https://docs.langchain.com/oss/python/langchain/multi-agent>
- Deep Agents docs: deep agents combine planning, subagents, filesystem, context management, long-term memory, human-in-the-loop approval, and learning over time. Source: <https://docs.langchain.com/oss/python/deepagents/overview>
- Deep Agents context engineering docs: subagents isolate heavy work and return concise results, keeping the main context clean. Source: <https://docs.langchain.com/oss/python/deepagents/context-engineering>
- OpenAI Agents SDK docs: the SDK is appropriate when different specialists need different instructions/tools/policies and when sessions, tracing, guardrails, or resumable approval flows matter. Source: <https://developers.openai.com/api/docs/guides/agents>
- OpenAI guardrails and human review docs: human review pauses sensitive actions so a person or policy can approve or reject them. Source: <https://developers.openai.com/api/docs/guides/agents/guardrails-approvals>
- Azure Architecture Center domain-analysis docs: bounded contexts let different parts of a domain use separate models and make integration points explicit through context maps. Source: <https://learn.microsoft.com/en-us/azure/architecture/microservices/model/domain-analysis>
- Martin Fowler on bounded contexts: DDD handles large models and teams by dividing them into bounded contexts and making their relationships explicit. Source: <https://martinfowler.com/bliki/BoundedContext.html>
- Microservices.io database-per-service pattern: each service's persistent data should be private and accessible only through its API. Source: <https://microservices.io/patterns/data/database-per-service.html>
- MCP docs: MCP standardizes how AI applications connect to tools, data sources, and workflows. Source: <https://modelcontextprotocol.io/docs/getting-started/intro>
- A2A protocol docs: A2A uses AgentCard, Task, Artifact, Message, and Part to support structured collaboration between agents. Source: <https://agent2agent.info/docs/introduction/>
- Temporal docs/blog: durable execution preserves workflow progress across crashes, long waits, and resumable workflows. Sources: <https://docs.temporal.io/temporal>, <https://temporal.io/blog/what-is-durable-execution>
- Project NANDA GitHub: NANDA focuses on agent discovery, AgentFacts, registry, interoperability, and trust infrastructure. Source: <https://github.com/projnanda/projnanda>

---

## 4. Architecture A: Integrated Evolution

In the integrated model, `RES-015` is not a separate team. It becomes the consent and context-sharing protocol used by the AI Development Team OS.

```txt
One Team OS
  -> shared identity / AgentFacts
  -> shared Rule Memory
  -> shared Owner Inbox
  -> shared audit / evidence
  -> shared workflow states
  -> AI Chat and AI Dev Team are different workflows inside the same control plane
```

### What becomes easier

- One owner inbox.
- One permission model.
- One rule-memory system.
- One audit/evidence trail.
- Easier reuse of decisions. A consent rule learned in AI Chat can later guide Development Agent context access.
- Less duplicated product UI.
- Lower short-term implementation cost.
- Easier to keep `externalRegisterable: false` across the whole agent layer.

### What becomes harder

- The architecture may become too central.
- Chat/context work and code-execution work can blur.
- The development team may inherit weaker boundaries from chat UX if not explicitly separated.
- A single memory/rule system can become overloaded.
- The blast radius of a governance bug is larger.

### When this model is best

- Early stage.
- One human owner.
- No live external agent runtime yet.
- No real shell/coding-agent execution yet.
- The main need is consistent governance, consent, audit, and owner decision learning.

This matches the current Personal OS phase.

---

## 5. Architecture B: Two Independent Agent Teams

In the two-team model, `RES-015` and AI Development Team become separate agent teams.

```txt
RES-015 Team
  -> AI Chat
  -> Reference Context
  -> Cross-agent consent
  -> Owner Inbox escalation
  -> Rule Memory for conversation/context access

AI Development Team
  -> Product planning
  -> Architecture
  -> Coding
  -> Testing
  -> Review
  -> Worktree sessions
  -> Evidence and skill promotion

Bridge
  -> A2A / MCP / Personal OS internal contract
  -> Context package exchange
  -> Owner approval for cross-team access
```

### What becomes easier

- Stronger conceptual separation.
- Better blast-radius control.
- Chat/reference rules cannot accidentally become code-execution rules.
- Development agents can have stricter shell, worktree, test, merge, and sandbox policies.
- The conversation team can remain lightweight and UX-focused.
- The development team can evolve toward agent runtime without contaminating AI Input chat.

### What becomes harder

- Two agent registries or identity spaces may drift.
- Two rule-memory systems may conflict.
- Two owner inbox paths may create duplicate decisions.
- Cross-team requests require a bridge protocol.
- More latency, more cost, more state reconciliation.
- Skill/memory promotion becomes more complex because learning must be scoped to the right team.
- The owner may need to understand two dashboards and two operational mental models.

### When this model is best

- Multiple human operators.
- Independent release cadence.
- Different data classification rules.
- Different runtime risks.
- External agent registration is real.
- Coding agents have shell/container/worktree execution.
- AI Chat and AI Dev Team are maintained by different people or require different compliance boundaries.

This is not the current Personal OS state, but it may become appropriate after a controlled coding-agent sandbox pilot exists.

---

## 6. Architecture C: Hybrid Bounded-Context Model

The hybrid model uses one shared trust plane but separates the operational contexts.

```txt
Shared Team OS Trust Plane
  -> Agent identity / AgentFacts-lite
  -> Owner Inbox
  -> BoundaryPolicy
  -> Rule Memory
  -> Audit / Evidence
  -> NANDA readiness posture
  -> External registration state

Bounded Context 1: Conversation / Consent
  -> AI Chat
  -> Reference Context
  -> AgentConsentRequest
  -> context package negotiation

Bounded Context 2: Development Execution
  -> DevTeamTask
  -> DevAgentAssignment
  -> DevWorktreeSession
  -> DevRunEvidence
  -> DevReviewDecision
  -> DevSkillCandidate
```

This model follows the bounded-context lesson from DDD: different parts of the domain may need separate models, but their relationships must be explicit through a context map.

### Why this is the recommended path

It avoids two bad extremes:

- It avoids a single large undifferentiated agent system.
- It avoids two isolated agent organizations that duplicate governance and drift apart.

In this model, `RES-015` is not "one more team." It is the **conversation/consent bounded context** and also a **pattern library** used by the AI Development Team.

---

## 7. Side-by-Side Comparison

| Dimension | Integrated Evolution | Two Independent Teams | Hybrid Bounded Context |
|---|---|---|---|
| Main idea | `RES-015` becomes the AI Dev Team's consent substrate | `RES-015` team and AI Dev Team are separate organizations | One trust plane, two bounded contexts |
| Best for | Early stage, one owner, no runtime agents | Mature runtime, different teams/risks | Current Personal OS direction |
| Owner UX | One dashboard/inbox | Two dashboards or many bridge prompts | One dashboard, context-specific surfaces |
| Rule Memory | Shared | Separate/federated | Shared rule plane, scoped rules |
| Agent identity | Single registry | Two registries or federated registry | Single AgentFacts-lite registry with context labels |
| Coordination cost | Low | High | Medium |
| Context isolation | Must be designed carefully | Strong by default | Strong per context, shared owner decisions |
| Runtime safety | Central policy, larger blast radius | Smaller blast radius, more integration complexity | Central policy plus execution-specific barriers |
| Evidence model | Unified | Duplicated or bridged | Unified evidence envelope with context-specific payloads |
| Skill promotion | Shared skill pipeline | Separate skill pipelines | Shared pipeline with context tags |
| A2A/MCP need | Later | Early | Later, at boundary points |
| Risk of confusion | One system can become too broad | Owner must reason about two agent orgs | Requires clear labels and contracts |

---

## 8. The Deep Difference

The real difference is not the number of agents.

The real difference is the **location of authority**.

### Integrated evolution

Authority sits in one Personal OS Team OS layer.

```txt
One owner decision loop
One rule memory
One audit trail
One identity registry
Many agent roles
```

This is simpler and coherent, but needs careful internal boundaries.

### Two independent teams

Authority is split across two agent organizations.

```txt
RES-015 Team owns context consent
AI Dev Team owns development execution
Bridge protocol controls cross-team access
Owner decides at boundaries
```

This is safer for mature runtime isolation, but creates integration overhead earlier.

### Hybrid

Authority is centralized for trust, but domain models are separated.

```txt
Shared trust plane
Separate bounded contexts
Explicit context map
Owner decisions become reusable but scoped rules
```

This is the best current compromise.

---

## 9. Recommended Product Interpretation

Personal OS should treat `RES-015` as:

1. a concrete AI Chat / Reference Context feature set,
2. a cross-agent consent and owner-decision protocol,
3. a reusable architecture pattern for any future agent-to-agent access,
4. not a fully independent agent team yet.

Personal OS should treat AI Development Team OS as:

1. a development-execution bounded context,
2. a future runtime surface for worktree-isolated coding agents,
3. a consumer of `RES-015` consent/rule-memory patterns,
4. not allowed to bypass shared Owner Inbox, AgentFacts, audit, or rule memory.

---

## 10. Recommended Implementation Shape

### Near term

Build one shared trust plane:

- `AgentFacts-lite`
- `BoundaryPolicy`
- `AgentRuleMemory`
- `OwnerInboxDecision`
- `AuditEvidenceEnvelope`
- `ContextPackage`

Then define two bounded contexts:

- `ConversationConsentContext`
- `DevelopmentExecutionContext`

### Middle term

Add explicit bridge objects:

- `CrossContextAccessRequest`
- `ContextPackageManifest`
- `DecisionRuleScope`
- `EvidenceRef`
- `SkillPromotionScope`

### Later

Only after runtime execution exists:

- Split execution workers.
- Add worktree/session manager.
- Add coding-agent adapter profiles.
- Consider A2A/MCP boundaries.
- Consider separate memory backends.
- Consider external registration.

---

## 11. Decision Criteria

Choose **integrated evolution** if:

- the goal is near-term product coherence,
- the owner wants one control surface,
- no runtime code execution exists yet,
- consent/rule memory should be reused quickly,
- implementation speed matters.

Choose **two independent teams** if:

- coding agents execute shell/container actions,
- AI Chat and AI Dev Team need different security classifications,
- different humans own the two areas,
- release cadence differs,
- external registration or agent-to-agent protocol exposure becomes real.

Choose **hybrid bounded context** if:

- one owner still governs the whole system,
- you need strong conceptual boundaries,
- you want shared identity/inbox/audit/rule memory,
- you want a later path to split runtime without duplicating governance now.

That is the current recommended path.

---

## 12. Proposed Decision For Personal OS

**Decision:** Use the Shared Team OS Trust Plane with bounded contexts, and make AI Development Team OS a new independent protected interface.

**Why:** Personal OS is not mature enough to justify two independent agent organizations, but it is already complex enough that AI Chat consent and AI Development execution should not be collapsed into one undifferentiated model.

**Product language:**

> Personal OS has one AI Team OS trust plane. Inside it, `RES-015` becomes the Conversation/Consent context, and AI Development Team OS becomes the Development Execution context. They share owner decisions, identity, audit, and rule memory, but they use different task models, risk controls, runtime gates, and interface homes. AI Development Team OS is a brand-new independent protected interface, not a subview of existing surfaces.

**Next architecture task:**

`AIDEVTEAM-002` should explicitly model:

- `ConversationConsentContext`
- `DevelopmentExecutionContext`
- `SharedAgentTrustPlane`
- `CrossContextAccessRequest`
- `ContextPackageManifest`
- `DecisionRuleScope`
- `IndependentAIDevelopmentTeamInterface`

---

## 13. Open Questions For Owner Discussion

1. Should `RES-015` remain mostly a feature area inside AI Input, or should it be renamed as a system-wide "Agent Consent Context"?
2. What should the new independent AI Development Team interface be called and where should its route live? Working proposal: `/ai-dev-team`, pending implementation design.
3. Should rule memory be global-by-default with scoped exceptions, or scoped-by-default with explicit promotion to global?
4. Should the first worktree sandbox pilot be allowed to request context from AI Chat history, or should it only use docs/code/backlog context?
5. When should Personal OS graduate from internal context packages to A2A/MCP-style protocol boundaries?

---

## 14. Bottom Line

Compared with "one independent `RES-015` agent team plus one independent AI Development Team," the current evolution is less like creating two companies and more like creating one operating system with two departments.

The current evolution says:

> Keep one trust, identity, inbox, audit, and memory layer. Separate the conversation-consent work from development-execution work as bounded contexts. Give AI Development Team OS its own independent interface now, but delay independent runtime teams until execution risk, team scale, or external interoperability forces the split.
