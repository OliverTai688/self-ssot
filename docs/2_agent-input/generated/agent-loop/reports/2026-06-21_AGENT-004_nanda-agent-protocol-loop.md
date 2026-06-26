# AGENT-004 Evidence Report - NANDA Agent Protocol Loop Alignment

## Task

- Task ID: `AGENT-004`
- Title: Add NANDA agent protocol alignment to development loop
- Date: 2026-06-21
- Agent: Codex

## Source Docs Read

- `AGENTS.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/00_manual-and-index/MAN-002_development-loop.md`
- `docs/02_architecture-and-rules/ARC-019_agent-boundary-policy.md`
- `docs/02_architecture-and-rules/ARC-020_internal-agents.md`
- `docs/02_architecture-and-rules/ARC-021_skill-registry.md`
- `docs/02_architecture-and-rules/ARC-023_agent-team-os-operating-contract.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/05_execution-plans/PLN-063_thirty-loop-launch-automation-plan.md`
- `docs/2_agent-input/generated/agent-loop/development-strategy.md`
- `docs/2_agent-input/generated/agent-loop/prompts/continue-loop.md`
- `docs/2_agent-input/generated/agent-loop/prompts/whole-site-gap-review-loop.md`
- `docs/2_agent-input/generated/agent-loop/report-template.md`

## Scope

- In scope: Add a NANDA-inspired agent protocol alignment rule to the development loop; create a formal architecture contract; update automation prompts, strategy, plan, report template, backlog, sprint, and completed log.
- Out of scope: Runtime registry, manifest validation script, database schema changes, migrations, seed, public agent directory, NANDA Index registration, external collaboration runtime, or external endpoint exposure.

## Strategic Review

- Current launch level / target: Launch automation remains focused on L1/L3/L4 progression; this task adds a cross-cutting future-agent readiness gate without changing runtime launch level.
- Last three reports reviewed: recent loop governance/readiness evidence, current sprint, and completed log were inspected locally.
- Last-three-loop delta: Recent work hardened loop quality and public/client boundaries; this user request adds a recurring protocol-readiness objective for all AI agents.
- Repetition check: This is documentation/governance work, but it is a new explicit user-requested architecture constraint and creates follow-up implementation tasks.
- Current strongest blocker: Internal AI agents are governance roles without AgentFacts-like manifests, validation, internal registry readiness, or controlled registration workflow.
- Acceptance / roadmap / research / blocker mapping: Maps to Agent Team OS, external agent collaboration safety, L5 external-agent readiness, and the user's NANDA protocol alignment goal.
- Expected capability, proof, or blocker delta: Future AI/agent tasks must produce concrete AgentFacts-lite, validation, registry, adapter, or trust-policy artifacts instead of informal protocol claims.

## Research / Reference Basis

- Local docs/code reviewed: Agent boundary policy, internal agent profiles, skill registry, Agent Team OS contract, automation prompts, strategy, backlog/current sprint.
- External or reference websites reviewed:
  - https://github.com/projnanda
  - https://github.com/projnanda/projnanda
  - https://github.com/projnanda/nanda-index
  - https://github.com/projnanda/agentfacts-format
  - https://arxiv.org/abs/2508.03101
- Selected implementation pattern: Use a local AgentFacts-lite manifest contract first, then add manifest inventory, static validation, protected read-only readiness, and only later a human-approved external registration adapter.
- Rejected alternatives:
  - Directly registering agents with an external NANDA Index now, rejected because no endpoint, auth, trust, rollback, or approval workflow exists.
  - Adding Prisma models immediately, rejected because `ARC-023` already contains proposal-only models and runtime schema changes need migration review.
  - Treating NANDA as a one-time research doc, rejected because the user requested iterative research and practice inside the development loop.
- Task shape created or updated: `AGENT-004` done, `AGENT-005` internal manifest inventory, `AGENT-006` validation/readiness check, `AGENT-007` protected readiness surface.

## NANDA / Agent Protocol Alignment

- Applies?: Yes.
- Affected agents or capabilities: All internal agents in `ARC-020`, future Agent Team OS surfaces, AI Input, Workflow, skill routing, external collaboration, and registration surfaces.
- AgentFacts-lite fields changed: Defined required identity, provider, lifecycle, endpoints, protocols, capabilities, skills, auth, trust, observability, and registry status fields in `ARC-028`.
- Internal discovery / registry state: No runtime registry yet; `AGENT-005` will create generated AgentFacts-lite manifests as the first internal discovery artifact.
- External registration state: `externalRegisterable: false` by default; live external registration remains human-approval-required.
- Trust, auth, approval, and data-visibility boundaries: Reuses `ARC-019`; external agents never get direct DB access; public/external collaboration remains high-risk.
- Concrete protocol artifact created: Formal architecture contract, loop gate, report template fields, automation prompt rules, backlog implementation ladder.
- NANDA / AgentFacts / MCP / A2A sources reviewed: Project NANDA GitHub/docs, NANDA Index, AgentFacts format, NANDA enterprise architecture paper. MCP/A2A are referenced as future interop protocols through the NANDA source basis; no direct MCP/A2A implementation was changed.

## Changes

- Files changed:
  - `AGENTS.md`
  - `docs/00_manual-and-index/MAN-001_document-index.md`
  - `docs/00_manual-and-index/MAN-002_development-loop.md`
  - `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`
  - `docs/05_execution-plans/PLN-060_task-backlog.md`
  - `docs/05_execution-plans/PLN-061_current-sprint.md`
  - `docs/05_execution-plans/PLN-063_thirty-loop-launch-automation-plan.md`
  - `docs/06_audits-and-reports/RPT-007_completed-log.md`
  - `docs/2_agent-input/generated/agent-loop/development-strategy.md`
  - `docs/2_agent-input/generated/agent-loop/prompts/continue-loop.md`
  - `docs/2_agent-input/generated/agent-loop/prompts/whole-site-gap-review-loop.md`
  - `docs/2_agent-input/generated/agent-loop/report-template.md`
  - `docs/2_agent-input/generated/agent-loop/reports/2026-06-21_AGENT-004_nanda-agent-protocol-loop.md`
- Behavior changed: Future development loops must run the NANDA Agent Protocol Gate when touching AI/agent capability or registration readiness.
- Docs changed: Added formal NANDA alignment architecture, task tracking, completed log, and evidence.

## Verification

| Command | Result | Notes |
|---|---|---|
| `rg -n "NANDA Agent Protocol Gate|AgentFacts-lite|externalRegisterable|AGENT-004|AGENT-005"` | Pass | Confirms new protocol language appears across governance and loop files. |
| `git diff --check -- <touched files>` | Pass | No whitespace errors reported for tracked diffs. |
| `rg -n "[ \t]+$" <touched files>` | Pass | No trailing whitespace found. |
| `git status --short --untracked-files=all -- <touched files>` | Pass | `AGENTS.md` is tracked-modified; touched docs are currently untracked in this workspace. |

## Evidence

- Relevant output or observation: NANDA alignment is now a loop gate, a formal architecture doc, a report-template section, and a backlog ladder.
- Screenshots or browser checks: Not applicable; docs/governance only.
- DB checks: None required; no schema, migration, seed, or DB write occurred.
- Product capability delta: No direct runtime capability; governance capability added for future AI/agent protocol compliance.
- Proof delta: Future agent-related reports must include AgentFacts-lite field mapping and protocol artifact evidence.
- Blocker delta: Missing manifests/validation/registry readiness are now named as executable follow-up tasks.
- Agent protocol-readiness delta: `ARC-028` defines the local AgentFacts-lite contract and requires all future agent tasks to preserve controlled registration.
- Versioning note: most touched docs are untracked in the current worktree, so staging/versioning should be reviewed before commit or PR creation.

## Remaining Risks

- Internal agents still need actual AgentFacts-lite manifests (`AGENT-005`).
- Manifest schema validation and readiness checks do not exist yet (`AGENT-006`).
- No protected owner/admin readiness surface exists yet (`AGENT-007`).
- External NANDA registration remains intentionally blocked until auth, endpoint, trust, rollback, and human approval are ready.

## Final Status

- Status: DONE
- Recommended next task: `AGENT-005` when the next loop touches Agent Team OS, AI Input, Workflow, skill routing, or external collaboration; otherwise continue launch-critical `AUTH-005`, `WORK-007`, or `WORK-008` based on environment readiness.
