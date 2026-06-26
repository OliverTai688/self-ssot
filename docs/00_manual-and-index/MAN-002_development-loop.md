# Development Loop

**Document ID:** `MAN-002`
**Last updated:** 2026-06-21
**Purpose:** Standard closed-loop development cycle for Codex and future Personal OS agents.

---

## Cycle

1. Read root `AGENTS.md`.
2. Read `MAN-000_docs-usage-manual.md`, `MAN-001_document-index.md`, the active strategy, loop state, current sprint, and backlog.
3. Read `docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md` and `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md` during the next 30-loop maturity phase.
4. Read the last three completed loop reports.
5. Run the Strategic Review Gate.
6. Select exactly one task from `docs/05_execution-plans/PLN-060_task-backlog.md`, or create one narrowly when the user explicitly requests work not yet listed.
7. Map the task to one v0.1 acceptance item, roadmap item, launch blocker, research hypothesis, or explicit backlog row.
8. Read the relevant PRD, architecture, execution, research, and acceptance docs.
9. Inspect related code and existing tests before editing.
10. Write a short implementation plan when the task is non-trivial.
11. Run the NANDA Agent Protocol Gate when the task touches AI agents, Agent Team OS, AI Input, Workflow, skill routing, external collaboration, MCP, A2A, NANDA, AgentFacts, or agent registration.
12. Make the smallest useful code or doc change that creates a product capability delta, proof delta, blocker delta, or agent protocol-readiness delta.
13. Run verification or the strongest safe fallback proof.
14. Write an evidence report in `docs/2_agent-input/generated/agent-loop/reports/`.
15. Update backlog, current sprint, acceptance docs if needed, and completed log.
16. Record remaining risks and recommend the next task.

## Strategic Review Gate

Before task selection, answer:

- Current launch level or product target.
- What the last three loops completed.
- The strongest current blocker.
- Whether the candidate task repeats documentation, checklist, readiness, proposal, or evidence work.
- The acceptance item, roadmap item, research hypothesis, or blocker moved by the task.
- The product capability or proof that will exist after the loop.

If the same class of low-runtime work has repeated, choose blocker analysis, proof work, or a higher-leverage implementation slice.

## Three-Loop Research Cadence

During the `RES-001` maturity phase, every third loop must include a research-to-task gap review. Use `RES-002` as the SaaS/OS operating-surface standard when the review touches frontstage, member/owner settings, admin/operator, module pages, real-data progression, or agent operation API/CLI.

That review must cover the highest-leverage gaps across:

- frontstage and public-safe entry;
- member and owner settings;
- admin/operator and backend operations;
- BFF/API/server action contracts;
- module operation, Agent workspace, records/audit, and settings boundaries;
- AI agent operation API/CLI contracts;
- internal multi-agent communication and delegation;
- NANDA/AgentFacts/A2A/MCP registration readiness.

The third-loop research review must produce at least one concrete artifact:

- a formal research, architecture, schema, auth, execution, acceptance, or report document;
- an updated BFF/API contract;
- a schema proposal or migration review checklist;
- a verification harness or proof checklist;
- executable backlog rows with acceptance criteria, files likely affected, verification, risks, and stop rules.

If a third-loop research review lands on a fifth-loop launch review, combine them and keep both outputs: launch level assessment plus implementation-ready research artifacts.

## Module Requirement Gap Escalation

When implementation reveals a module requirement gap, unclear actor workflow, missing architecture boundary, weak AI-agent operating model, missing API/CLI surface, or a mismatch between the repo and mature best-practice systems, pause expansion and run a focused research escalation.

The escalation must:

- synthesize current local docs, source code, acceptance criteria, backlog rows, and recent evidence;
- use internet research when current external practice matters, prioritizing official docs, primary sources, standards, and leading comparable products;
- generate or update a formal `RES`, `ARC`, `DBS`, `AUT`, `SCH`, `PLN`, `ACC`, or `RPT` document as appropriate;
- convert the result into executable task rows with scope, acceptance criteria, likely files, verification, risks, and stop rules;
- record source links, selected pattern, rejected alternatives, and implementation risks in the evidence report.

This escalation is mandatory for gaps involving frontstage, member settings, admin, backend/BFF, persistence, public output, auth, module agent workspaces, agent operation API/CLI, internal multi-agent coordination, or NANDA readiness.

## Page Requirement Understanding Score Gate

Before a page-level UI, settings, admin, module, frontstage, or workflow task becomes an implementation task, score requirement understanding from 0 to 100.

Score dimensions:

- Actor/job clarity: 0-20
- PRD/local evidence fit: 0-20
- Data/BFF/API clarity: 0-20
- UI interaction/reference-pattern confidence: 0-15
- Risk, auth, public-output, and high-risk boundary clarity: 0-15
- Acceptance and verification clarity: 0-10

Understanding levels:

- Low: 0-59. Run 5 research optimization rounds on the same page issue before implementation.
- Medium: 60-79. Run 4 research optimization rounds on the same page issue before implementation.
- High: 80-100. Run 3 research optimization rounds on the same page issue before implementation.

Each research optimization round must keep the same page requirement as the subject, inspect a distinct lens, refine the requirement, and record selected and rejected implementation patterns. Use lenses such as local PRD/code fit, comparable product or reference website, data/BFF/API boundary, risk/permission/public-output boundary, and acceptance/verification split.

Implementation may start only after the required rounds produce executable task shape: scope, acceptance criteria, likely files, verification, risks, and stop rules. If the page task contains ambiguous auth, public output, high-risk writes, schema changes, external collaboration, or owner approval boundaries, reduce the score or stop for direction.

## NANDA Agent Protocol Gate

Read `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md` when a task creates, modifies, routes, evaluates, exposes, or registers an AI agent capability.

Answer:

- Which agent, capability, skill, route, workflow, or registry surface changed.
- Which AgentFacts-lite fields changed or remain missing.
- Whether the agent is governance-only, internal runtime, protected-owner visible, or external-registerable.
- Whether external registration, public endpoint exposure, or cross-organization collaboration is involved.
- Which auth, permission, approval, data visibility, and high-risk module boundaries apply.
- Which manifest, schema, validation, registry contract, adapter boundary, trust policy, or executable follow-up now exists.
- Which NANDA, AgentFacts, MCP, A2A, or registry source informed the decision.

If no concrete artifact can be produced, split the task until it can produce one.

## Anti-Repetition And Escalation

If two consecutive loops are primarily documentation cleanup, checklist updates, readiness displays, proposal-only contracts, or evidence reports, the next loop must not repeat that class of work unless it directly closes a named acceptance item or launch blocker.

If two consecutive loops are architecture/proof/evidence-heavy and the owner reports that scenarios or interface experience are not moving, the next no-proof fallback must improve a user-visible actor journey, scenario operating surface, runtime interaction, or real-data/BFF slice before creating another architecture-only artifact.

If the same blocker appears in two loop reports or launch-level reviews, the next loop must produce one of:

- blocker analysis and unblock plan;
- contract or schema proof;
- static proof;
- mock-mode proof;
- local or disposable DB proof;
- route smoke test;
- setup checklist with exact readiness criteria.

## Stop Conditions

Stop and ask for direction when:

- Build fails and the root cause is unclear.
- Schema changes require migration approval.
- Auth or permission boundary is ambiguous.
- A public output or Client Portal surface might expose private data.
- External agent collaboration needs scoped context approval.
- The task scope becomes larger than the selected backlog row.
- A high-risk module write is requested without explicit approval.

## Definition Of Done

A loop is complete only when:

- One task was selected and named.
- The Strategic Review Gate was answered.
- The three-loop research cadence was honored when the loop number or selected task requires it.
- Page-level tasks recorded the understanding score, level, required research optimization rounds, and completed same-issue synthesis before implementation.
- The NANDA Agent Protocol Gate was answered when the task touched AI/agent capability or registration readiness.
- The task maps to an acceptance item, roadmap item, research hypothesis, launch blocker, or explicit backlog row.
- Code or docs changed only within the selected task scope.
- Verification ran, or the strongest safe fallback proof is recorded.
- `PLN-060_task-backlog.md` and `PLN-061_current-sprint.md` are updated when task state changes.
- `RPT-007_completed-log.md` records the result, verification, and risks.
- A generated evidence report exists under `docs/2_agent-input/generated/agent-loop/reports/`.
- The report states product capability delta, proof delta, or blocker delta.
- The next recommended task is clear.

## Evidence Report Shape

Use `docs/2_agent-input/generated/agent-loop/report-template.md`.

At minimum, include:

- Task ID and title
- Source docs read
- Strategic review: last three reports, repetition check, current blocker
- Research cadence result when applicable
- Acceptance/roadmap/blocker mapping
- Implementation summary
- Files changed
- Verification commands and outcomes
- Product capability delta, proof delta, or blocker delta
- NANDA/AgentFacts-lite alignment delta when applicable
- Remaining risks
- Recommended next task
