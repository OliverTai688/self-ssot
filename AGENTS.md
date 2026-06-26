<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Personal OS - Agent Rules

## 1. Project Identity

This repository is the Personal OS / Career Competency system: a DB-backed, AI-agent-assisted operating system for managing work projects, research objects, ingestion pipelines, workflow automation, life context, finance, chamber relationships, company strategy, and client-facing deliverables.

The goal is a closed-loop development system where AI agents repeatedly read product intent, inspect the codebase, select one high-leverage task, implement a small verified change, and update project memory.

## 2. Technical Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma 7.8 + PostgreSQL (Supabase)
- Server Actions + service-layer authorization
- Mock data and localStorage only where explicitly marked as prototype, demo, or fallback

Before writing Next.js code, read the relevant current docs under `node_modules/next/dist/docs/`.

## 3. Required Reading Before Any Task

Read these files before choosing or implementing a task:

| File | Role |
|---|---|
| `docs/00_manual-and-index/MAN-000_docs-usage-manual.md` | Documentation numbering and placement rules |
| `docs/00_manual-and-index/MAN-001_document-index.md` | Master navigation index |
| `docs/01_product-requirements/PRD-004_next-stage-development-plan.md` | Primary working PRD and roadmap |
| `docs/01_product-requirements/PRD-005_situation-driven-prd.md` | Module value propositions and acceptance philosophy |
| `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md` | v0.1 acceptance checklist |
| `docs/01_product-requirements/PRD-001_personal-os-situation.md` | User situation and reason this system exists |
| `docs/00_manual-and-index/MAN-002_development-loop.md` | Closed-loop development guide |
| `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md` | NANDA-inspired agent protocol, manifest, and registration-readiness rules |
| `docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md` | Next 30-loop maturity research target and three-loop research cadence |
| `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md` | SaaS/OS operating surface maturity standard for frontstage, settings, admin, modules, real data, and agent API/CLI |
| `docs/07_research-and-design/RES-005_conditional-l3-interface-scenario-architecture-gap-research.md` | Conditional L3 interface/scenario/architecture viewframe research for product maturity while owner-run proof remains Manual Ops |
| `docs/05_execution-plans/PLN-063_thirty-loop-launch-automation-plan.md` | Active 30-loop aggressive launch automation plan |
| `docs/2_agent-input/generated/agent-loop/development-strategy.md` | Active heartbeat loop strategy |
| `docs/2_agent-input/generated/agent-loop/loop-state.json` | Active heartbeat loop state |
| `docs/05_execution-plans/PLN-061_current-sprint.md` | Current sprint state |
| `docs/05_execution-plans/PLN-060_task-backlog.md` | Full task backlog |

For implementation tasks, also read the relevant `ARC`, `DBS`, `AUT`, `SCH`, `PLN`, `EXE`, `ACC`, or `RPT` docs listed in the task row.

## 4. Documentation Architecture

Docs follow the nuvaClub-style rule:

```txt
docs/<numbered-folder>/<TYPE>-<NNN>_<kebab-case-title>.<ext>
```

Numbering is by document type, not by feature module. When creating a new formal doc, find the highest existing number for that `TYPE` and use the next number.

| Folder | Purpose |
|---|---|
| `docs/00_manual-and-index/` | Manuals, operating guides, and indexes |
| `docs/01_product-requirements/` | PRDs, product vision, product requirements |
| `docs/02_architecture-and-rules/` | Architecture, authorization rules, DB contracts, schemas, migrations |
| `docs/03_feature-reference/` | Feature references and reusable source material |
| `docs/04_playbook/` | Playbooks and user-facing operating scripts |
| `docs/05_execution-plans/` | Plans, task backlogs, sprint files, implementation proposals |
| `docs/06_audits-and-reports/` | Audits, evaluations, inventories, readiness reports, completed logs |
| `docs/07_research-and-design/` | Research notes and design explorations |
| `docs/08_acceptance-and-qa/` | Acceptance criteria, QA checklists, launch gates |
| `docs/2_agent-input/` | Agent input, generated reports, raw datasets, and non-formal working material |

`docs/2_agent-input/` is intentionally outside the formal docs library. Use it for generated loop evidence, temporary research packets, raw datasets, and agent work products that should not receive formal document numbers.

## 5. Closed-Loop Development Cycle

Each development cycle must:

1. Read `AGENTS.md`.
2. Read `MAN-000`, `MAN-001`, the active strategy, loop state, current sprint, and backlog.
3. Read the last three completed reports under `docs/2_agent-input/generated/agent-loop/reports/`.
4. Run the Strategic Review Gate before task selection.
5. Select exactly one task from `PLN-060_task-backlog.md`, or create one narrowly if the user explicitly requested a task not yet listed.
6. Map the selected task to a v0.1 acceptance item, roadmap item, launch blocker, research hypothesis, or explicit new backlog row.
7. Read the relevant product, architecture, execution, and acceptance docs.
8. Inspect related code before planning edits.
9. Write a short implementation plan in the response when the change is non-trivial.
10. If the task touches AI agents, Agent Team OS, AI Input, Workflow, skill routing, external collaboration, MCP, A2A, NANDA, AgentFacts, or agent registration, run the NANDA Agent Protocol Gate from `ARC-028`.
11. Make the smallest useful change that creates a product capability delta, proof delta, blocker delta, or agent protocol-readiness delta.
12. Run the smallest meaningful verification or the strongest safe fallback proof.
13. Write an evidence report under `docs/2_agent-input/generated/agent-loop/reports/`.
14. Update `PLN-060_task-backlog.md` and `PLN-061_current-sprint.md` when task state or priority changes.
15. Update `docs/06_audits-and-reports/RPT-007_completed-log.md`.
16. Record remaining risks and propose the next task.

Use `docs/2_agent-input/generated/agent-loop/report-template.md` for evidence reports.

### Three-Loop Research Cadence

The next maturity phase uses `docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md` as the 30-loop research target and `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md` as the SaaS/OS operating-surface quality bar.

Every three loops must include one research-to-task gap review. That review must:

- reassess gaps across frontstage, member settings, admin, backend/BFF, module operating surfaces, AI agent workspaces, agent operation API/CLI, multi-agent coordination, and NANDA readiness;
- inspect local code/docs before proposing new surfaces;
- use official or primary sources when agent protocol, auth, provider, framework, deployment, security, or other current behavior matters;
- create or update a formal `RES`, `ARC`, `DBS`, `AUT`, `SCH`, `PLN`, `ACC`, or `RPT` artifact when the gap changes architecture, acceptance, or implementation direction;
- convert findings into executable backlog rows with scope, acceptance criteria, files likely affected, verification, risks, and stop conditions.

If a third-loop research review coincides with a fifth-loop launch review, combine them. The combined review still must produce at least one implementation-ready artifact, not only a status summary.

### Module Requirement Gap Escalation

When developing any module, if the agent discovers a requirement gap, ambiguous product behavior, missing architecture boundary, unclear actor workflow, weak AI-agent operating model, or a gap between the current implementation and a mature best-practice system, the agent must escalate the gap into research before expanding runtime code.

The escalation must:

- combine existing local context from PRD, ARC, DBS, AUT, SCH, PLN, ACC, RPT, source code, and recent loop evidence;
- use internet research when current outside practice matters, prioritizing official docs, primary sources, standards, high-quality technical references, and leading comparable products over generic articles;
- identify the best integrated approach for this repo instead of copying an external pattern blindly;
- generate or update a formal research, architecture, execution, schema, auth, acceptance, or report document in the proper docs folder;
- add the resulting implementation shape to `PLN-060_task-backlog.md`, `PLN-061_current-sprint.md`, `tasks.md`, and acceptance docs when behavior or criteria change;
- add source links, rejected alternatives, risks, stop conditions, and verification criteria to the evidence report;
- only then implement the smallest useful slice, or stop for direction if the research reveals high-risk scope.

For module gaps touching frontstage, member settings, admin, backend/BFF, AI agents, module agent workspaces, agent operation API/CLI, internal multi-agent coordination, public output, auth, persistence, or NANDA readiness, this escalation is mandatory.

### Strategic Review Gate

Before selecting a task, answer:

- What is the current primary product target or launch level?
- What changed in the last three completed loops?
- What blocker is currently preventing the next acceptance milestone or launch level?
- Is the candidate task new value, or a repeat of documentation, checklist, readiness, proposal, or evidence work?
- Which product capability, research hypothesis, acceptance item, or launch blocker will this task move?
- What will be more true after this loop than before it?

If the answers show repeated low-impact work, escalate to blocker analysis, proof work, or a higher-leverage implementation slice.

### Anti-Repetition Rule

If two consecutive loops are primarily documentation cleanup, checklist updates, readiness displays, proposal-only contracts, or evidence reports, the next loop must not do the same class of work unless it directly closes a named acceptance item or removes a launch blocker.

The next loop must instead choose one of:

- a runtime implementation slice;
- a contract, schema, or static proof;
- a local or disposable environment proof;
- a focused blocker analysis with an unblock plan;
- an acceptance test or verification harness.

If two consecutive loops are architecture/proof/evidence-heavy and the owner reports that scenarios or interface experience are not moving, the next no-proof fallback must improve a user-visible actor journey, scenario operating surface, runtime interaction, or real-data/BFF slice before creating another architecture-only artifact.

### Manual Blocker Fallback

When DB, auth, env, deployment, provider, or external service state blocks the ideal verification, do not only mark `MANUAL_REQUIRED` or `BLOCKED`.

Choose the strongest safe fallback available:

- contract test;
- schema review;
- static proof;
- mock-mode proof;
- local or disposable DB proof;
- route smoke test;
- setup checklist with exact readiness criteria.

If the same blocker appears in two loop reports or launch-level reviews, stop adjacent small tasks and produce a blocker analysis plus an unblock plan, unless the blocker can be removed immediately.

### Owner-Run Evidence Handoff

If the remaining evidence can be collected by the owner running one clear local, browser, or deployed-environment check, do not spend additional loops trying to gather adjacent evidence.

Instead:

- leave the exact command, URL, env prerequisites, and pass/fail signals;
- tell the owner to run that check and inspect the generated output directly;
- record that the launch claim remains unproven until the owner-provided evidence exists;
- move the next loop to the highest-leverage implementation, contract, blocker, or maturity task that does not require that owner-run evidence.

Do not claim a launch level from delegated evidence until the owner runs the check or provides the sanitized proof packet.

Stop and ask for direction when a task requires ambiguous schema changes, unclear auth boundaries, public output risk, external agent sharing, high-risk module writes, or scope expansion beyond the selected task.

### NANDA Agent Protocol Gate

Personal OS agents must evolve toward MIT NANDA-inspired agent protocol readiness: stable identity, explicit capability/skill manifests, discovery readiness, trust boundaries, observability, and controlled registration.

When a task creates, modifies, routes, evaluates, exposes, or registers any AI agent capability, it must:

- read `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`;
- identify affected AgentFacts-lite fields: identity, provider, lifecycle, endpoints, protocols, capabilities, skills, auth, trust, observability, and registry status;
- state whether the agent is only governance/documentation, internal runtime, protected-owner visible, or external-registerable;
- keep `externalRegisterable: false` unless endpoint, auth, trust, permission, public-safety, rollback, and human approval are complete;
- produce at least one concrete artifact: manifest inventory, schema/validation proof, registry/readiness BFF contract, adapter boundary, trust policy, or executable follow-up task;
- record source links and rejected alternatives when NANDA, AgentFacts, MCP, A2A, or registry behavior informed the change.

External registration, public agent directories, cross-organization agent collaboration, and any external agent access to private context remain `HUMAN_APPROVAL_REQUIRED`.

## 6. BFF-First Development Workflow

Use a Backend-for-Frontend strategy for all new operational features.

```txt
UI need
  -> BFF contract
  -> server action / route handler / Server Component loader
  -> requireUser()
  -> service-layer authorization
  -> domain service
  -> Prisma or approved adapter
  -> mapper / view model
  -> Client Component interaction
```

Rules:

- Define the UI-visible contract before editing runtime code.
- Decide whether the current pass is mock-only, BFF contract-only, or DB-backed.
- Do not let Client Components import Prisma models, database clients, provider secrets, or raw adapter payloads.
- Keep route handlers public-safe: validate input, hide sensitive errors, enforce auth and authorization before side effects.
- Prefer Server Components for initial data loading.
- Prefer Client Components for interaction, local UI state, mock-only workbenches, and safe optimistic state.
- For UI-only/mock prototypes, explicitly mark the data as mock and avoid hidden persistence.
- For DB-backed features, verify the smallest meaningful path: typecheck, DB validate/generate, build, and local/disposable DB checks where relevant.
- Add or update `tasks.md`, `PLN-060_task-backlog.md`, `PLN-061_current-sprint.md`, and acceptance docs when a BFF contract changes.

## 7. Research-To-Task Quality Gate

When solving a non-trivial issue, the agent must research the method before implementation and convert the result into an executable task shape.

Use this gate when the task touches:

- Auth, permission, security, public output, Client Portal, deployment, data persistence, or external integrations
- New UI patterns, member settings, admin workflows, frontstage journeys, or unfamiliar interaction models
- Backend/API/BFF contracts, framework APIs, provider behavior, browser behavior, or library behavior that may have changed
- A feature where reference websites, comparable products, or official docs can clarify the implementation pattern
- Any module-development requirement gap, missing workflow, unclear actor boundary, missing AI-agent operating surface, or architecture gap discovered while implementing

### Page Requirement Understanding Score Gate

Before a page-level UI, settings, admin, module, frontstage, or workflow page task becomes an implementation task, score requirement understanding from 0 to 100.

Score dimensions:

- Actor/job clarity: 0-20
- PRD/local evidence fit: 0-20
- Data/BFF/API clarity: 0-20
- UI interaction/reference-pattern confidence: 0-15
- Risk, auth, public-output, and high-risk boundary clarity: 0-15
- Acceptance and verification clarity: 0-10

Understanding levels:

- Low: 0-59. Run 5 research optimization rounds on the same page issue before creating implementation tasks.
- Medium: 60-79. Run 4 research optimization rounds on the same page issue before creating implementation tasks.
- High: 80-100. Run 3 research optimization rounds on the same page issue before creating implementation tasks.

Each research optimization round must stay on the same page requirement or issue, inspect one distinct lens, update the page requirement, and record selected and rejected implementation patterns. Suggested lenses are local PRD/code fit, comparable product or reference website, data/BFF/API boundary, risk/permission/public-output boundary, and acceptance/verification split.

Only after the required rounds are complete may the agent convert the page issue into executable backlog/task shape with scope, acceptance criteria, files likely affected, verification, risks, and stop conditions. If research reveals ambiguous auth, public output, high-risk writes, schema changes, external collaboration, or owner approval boundaries, lower the score or stop for direction before runtime code.

Research requirements:

1. Inspect local product, architecture, and acceptance docs first.
2. Inspect existing code patterns before inventing new ones.
3. When current external behavior matters, use official docs or primary sources; for UI/UX references, inspect comparable websites or products when useful.
4. Capture source links or local file references in the evidence report.
5. Summarize the selected implementation pattern and rejected alternatives.
6. Convert findings into an executable backlog/task shape: scope, acceptance criteria, files likely affected, verification, and risks.
7. Only then implement the smallest useful change.

Research is not complete when it is merely archived. It is complete only when it creates at least one verifiable artifact such as a data model, UI flow, BFF/API contract, prototype, test, acceptance criterion, validation checklist, user-facing workflow, or next implementation slice.

For NANDA or agent-protocol research, the artifact must be one of: AgentFacts-lite manifest, manifest schema, validation script, internal registry contract, adapter boundary, registration approval workflow, trust/visibility policy, or a focused implementation task.

If research shows the task is larger or riskier than the selected backlog row, update the task split and stop for direction when required by the high-risk rules.

## 8. Module Boundaries

| Module | Status | DB-backed | Auth |
|---|---|---|---|
| Work | Operational, proof-blocked | Yes | Explicit dev mock or Supabase path |
| Research | UI complete | Mock/state | Protected shell only |
| AI Input | UI complete + formal readiness | Mock/readiness | Gated |
| Workflow | UI mock / engine concepts | Partial/proposal | Protected shell only |
| Life | UI partial / FOPS shell | No | Protected shell only |
| Finance | FOPS shell / high-risk stub | No | Protected shell only |
| Chamber | FOPS shell / CRM proposal | No | Protected shell only |
| Company | FOPS shell / high-risk stub | No | Protected shell only |
| Client Portal | Fail-closed + gated DB BFF | Gated | Token-only public route |
| Agent Team OS | Internal AgentFacts-lite readiness | Generated manifests only | Protected owner/admin readiness |

Work is the only operational DB-backed module. All others are UI-first prototypes or planning surfaces until auth and persistence tasks are explicitly selected.

## 9. Data Rules

- Keep Prisma models separate from UI view models through mappers, services, or server action boundaries.
- Server Components handle initial data loading.
- Client Components handle interaction and optimistic state only when appropriate.
- All cross-user data access goes through service-layer authorization.
- Prisma schema changes require migration impact notes and human review where risk is high.
- Seed data may be derived from mock data, but seed data and runtime mock data are different things.
- AI-generated outputs based on internal data must preserve source IDs and relevant metadata.

## 10. Auth and Permission Rules

- `requireUser()` and module-level authorization are security boundaries, not conveniences.
- `assertCanAccessProject()` or equivalent service checks must protect project-scoped data.
- Client Portal must only expose data explicitly marked client-visible.
- Do not expose internal notes, tasks, deliverables, financial data, life data, company strategy, or private source material through public routes.
- Route guards and module permissions must be reviewed before expanding authenticated or public surfaces.
- `requireUser()` resolves either explicit development mock auth (`PERSONAL_OS_AUTH_MODE=mock`) or Supabase SSR claims. Real owner use is not launch-proven until Supabase public env, signed-in `/auth/status` evidence, and Profile mapping proof pass.

## 11. High-Risk Modules

Agents can suggest, draft, summarize, review, and propose.

Agents cannot silently write to high-risk modules. Human approval is required before final writes touching:

- Finance
- Life
- Client Portal
- Company Strategy
- Auth / Permission
- Public output
- External agent collaboration

External agents must never access the database directly. They receive scoped context packages only; their outputs are proposals awaiting human review.

`AGENTS.md`, `.codex/skills/*/SKILL.md`, and core governance docs must remain versioned and auditable.

## 12. UI/UX Rules

- Follow the existing dashboard shell, sidebar, header, and component patterns.
- Prefer dense, operational interfaces over landing-page layouts.
- Prefer clear operating surfaces over card-heavy information arrangements.
- Every module page must make the primary attention area obvious in the first viewport.
- Separate module operation, Agent workspace, records/audit, and settings/boundaries.
- Module Agent workspaces are bounded review/proposal surfaces, not toy chatbot panels.
- Records and audit pages prefer filterable tables, timelines, and drilldowns over decorative activity cards.
- When maturing frontstage, member/owner settings, admin/operator, module pages, real-data flows, or agent operation API/CLI, use `RES-002_saas-os-operating-surface-maturity-research.md` as the standard: resource index, command bar, detail surface, agent workspace, records/audit, settings/boundaries, BFF/API/CLI, and clear real/demo/mock/unavailable state.
- Keep text readable and inside parent containers on desktop and mobile.
- Avoid large redesigns unless the selected task explicitly asks for them.
- See `docs/02_architecture-and-rules/ARC-012_frontend-operating-surface.md` for the module operating surface pattern.

## 13. Testing and Verification Rules

Run the smallest useful verification:

```bash
# Type check
pnpm exec tsc --noEmit --pretty false

# DB validation (no connection needed)
pnpm db:validate
pnpm db:generate

# Build (use local disposable DB if Supabase is unreachable)
pnpm build

# Seed (only on local/disposable DB)
pnpm db:seed
```

Record commands and outcomes in the final response, the evidence report, and `docs/06_audits-and-reports/RPT-007_completed-log.md`.

## 14. Documentation Update Rules

When a task changes product behavior, update the relevant `PRD-*` doc and `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`.

When a task changes architecture, update the relevant `ARC-*`, `DBS-*`, `AUT-*`, `SCH-*`, or `MIG-*` document.

When a task completes, update:

- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/06_audits-and-reports/RPT-007_completed-log.md`
- an evidence report under `docs/2_agent-input/generated/agent-loop/reports/`

Preserve historical docs. Do not delete superseded docs unless explicitly asked.

## 15. 20-Minute Launch Automation

This repo has an active Codex heartbeat automation:

- Automation id: `personal-os-20m-aggressive-launch-loop`
- Cadence: every 20 minutes
- Strategy file: `docs/2_agent-input/generated/agent-loop/development-strategy.md`
- State file: `docs/2_agent-input/generated/agent-loop/loop-state.json`
- Formal plan: `docs/05_execution-plans/PLN-063_thirty-loop-launch-automation-plan.md`

The automation objective is to reach a complete online operating experience and then mature it through the next 30-loop research target in `RES-001` and the SaaS/OS surface standard in `RES-002`, including frontstage, member/owner settings, admin/operator page, backend architecture, BFF/API surfaces, auth, persistence, verification, per-module AI agent workspaces, owner-controlled agent operation API/CLI contracts, internal multi-agent coordination, and NANDA-aligned agent protocol readiness for every AI/agent surface.

When formal launch proof remains blocked by owner/operator setup, use `RES-005` to continue conditional L3 product maturity through interface, scenario, and architecture viewframe tasks. This may advance conditional product maturity, but it must not upgrade formal `launchLevels.current` to L1/L3/L4 without `AUTH-005`, `WORK-009` or `WORK-007`, and `DEPLOY-002` evidence.

Loop policy:

1. Each wakeup is one reviewable loop.
2. Start with the Strategic Review Gate and last-three-report anti-repeat check.
3. Prefer implementation, proof, or unblock work over planning when safe.
4. Pick the highest launch-leverage task, not the neatest small task.
5. Improve at least one actor surface or launch proof: frontstage, member/owner, admin/operator, backend/API, data, launch QA, or agent protocol/registry readiness.
6. If the same blocker has appeared twice, prioritize blocker analysis, fallback proof, or unblock plan over adjacent safe work.
7. If a task touches AI/agent capabilities, run the NANDA Agent Protocol Gate and leave a concrete manifest, registry, validation, adapter, or policy artifact.
8. Every third loop must run a research-to-task gap review against `RES-001` and `RES-002`, then convert at least one gap into an executable artifact.
9. Every fifth loop must run `docs/2_agent-input/generated/agent-loop/prompts/whole-site-gap-review-loop.md` and update launch level.
10. When proof prerequisites remain absent after architecture/proof/evidence-heavy loops, prefer a scenario-facing UI, interaction, or real-data/BFF maturity slice over another abstract readiness artifact.
11. Normal loops should use `docs/2_agent-input/generated/agent-loop/prompts/continue-loop.md`.
12. Every loop must update `loop-state.json` and write an evidence report with product capability delta, acceptance mapping, verification, NANDA alignment when applicable, and next decision.

Launch level target:

- Minimum by loop 30: `L3_FULL_FRONT_MEMBER_ADMIN_EXPERIENCE`
- Stretch by loop 30: `L4_HARDENED_PRIVATE_LAUNCH`

Post-30 convergence rule:

- Loop 30 is not a hard stop. If the final target is not achieved by loop 30, switch to `POST_30_CONVERGENCE` mode.
- In convergence mode, minimize remaining loops to the final target. Do not start exploratory, cosmetic, or parallel nice-to-have work.
- Each post-30 loop must select the shortest-path blocker with the highest launch leverage across auth, permissions, core UI flow, backend/API, DB persistence, deployment, or verification.
- Continue fifth-loop launch reviews after loop 30, but keep them short and action-biased.
- Stop only for the existing high-risk approval rules, a product decision, or a blocking external state.
