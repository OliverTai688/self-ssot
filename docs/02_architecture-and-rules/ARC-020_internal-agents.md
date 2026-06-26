# Internal Agents

**Purpose:** Define the initial virtual team for Codex-assisted development. These are governance roles first, not runtime agents.

## Agent Table

| Agent | Purpose | Owned module / concern | Allowed actions | Blocked actions | Approval required | Expected outputs | Related skills |
|---|---|---|---|---|---|---|---|
| ProductManagerAgent | Keep product vision, PRD, v0.1 scope, and task sequencing coherent. | Product docs, roadmap, task backlog | Convert PRDs into tasks, prioritize backlog, define acceptance criteria | Directly edit high-risk runtime logic without task approval | Scope changes, PRD conflicts, public commitments | Phase plans, task definitions, acceptance criteria | `prd-to-task-planning`, `closed-loop-sprint` |
| DBAgent | Protect database contract and persistence strategy. | Prisma schema, migrations, seed flow, DB docs | Review schema, propose migrations, inspect enum consistency, write DB contract notes | Apply risky schema changes without migration impact notes | Any schema migration, data deletion, auth-related DB change | Migration risk checklist, DB contract updates | `db-contract-review` |
| WorkAgent | Move Work module toward DB-backed operational CRUD. | Work routes, tasks, notes, deliverables, project services | Implement Work CRUD through approved server actions and service boundaries | Bypass `requireUser()` or `assertCanAccessProject()` | Client-visible output, schema changes | Work CRUD implementation notes and acceptance checks | `work-crud-implementation` |
| ResearchAgent | Preserve research network intent and source traceability. | Research pages, research types, source/citation flow | Map research PRDs to DB tasks, review source metadata and links | Drop source IDs, citation metadata, or research context | Research DB model changes, external source sharing | Research migration notes, source traceability checks | `prd-to-task-planning`, `db-contract-review` |
| IngestionAgent | Govern raw input classification and triage routing. | AI Input, Inbox, ingestion context, triage proposals | Create proposal flows, route to module drafts, preserve evidence | Directly write Finance, Client Portal, or public data | Finance/public/client-visible writes | Triage proposal spec, routing audit notes | `codebase-audit`, `closed-loop-sprint` |
| WorkflowAgent | Keep automation rules and dispatch auditable. | Workflow engine, rule builder, agent messages | Review rule execution, audit trail, automation status | Bypass module permissions or approval gates | High-risk automation, cross-module writes | Workflow audit notes, rule risk checks | `codebase-audit`, `closed-loop-sprint` |
| UIUXAgent | Improve usability without unnecessary redesign. | UI components, layout, visual hierarchy | Propose and implement small UI changes, review responsive states | Large redesigns without explicit task scope | Public/client-facing UX changes, major navigation changes | UI audit notes, small patches, screenshot checklist | `uiux-iteration` |
| AuthPermissionAgent | Protect route guards and authorization boundaries. | Auth service, module permissions, app-layer auth | Review `requireUser()`, guards, ownership checks, permission flows | Relax auth or expose data without policy | Any auth, permission, client portal, RLS-like change | Authorization checklist, risk notes | `auth-permission-review` |
| ClientPortalAgent | Protect public sharing and client visibility. | `/client/[token]`, client-visible fields, token strategy | Review visibility filters, public page UX, token lifecycle | Expose internal notes or private project state | Public output, token changes, client-visible changes | Client boundary checklist | `auth-permission-review`, `uiux-iteration` |
| LifeAgent | Protect privacy-first life and health context. | Life module, health/energy context, memories | Summarize and propose low-interference life observations | Public or external sharing of life data | Any external sharing or irreversible health/finance write | Privacy-first notes and task proposals | `prd-to-task-planning` |
| FinanceAgent | Keep finance data human-approved and auditable. | Finance drafts, reports, categorization | Detect finance drafts, propose categories, prepare reports | Finalize transactions or irreversible decisions | All final finance writes and public finance reports | Finance proposal notes and approval checklist | `auth-permission-review`, `db-contract-review` |
| CompanyAgent | Preserve company strategy context. | Company strategy, operating principles, project alignment | Propose strategy notes, link projects to company axes | Share strategy externally without approval | Company strategy publication or external sharing | Strategy alignment notes | `prd-to-task-planning` |
| ChamberAgent | Manage relationship context and referral workflows. | Chamber CRM, contacts, opportunities, meeting prep | Propose contact notes, referral context, meeting prep | Expose private relationship insights without approval | External sharing and partner-visible relationship data | Relationship context notes | `prd-to-task-planning`, `uiux-iteration` |
| QAAgent | Verify implementation and prevent regressions. | Build, smoke tests, acceptance criteria | Run verification, inspect edge cases, update test gaps | Ignore failed commands or unverified claims | Releasing changes with known failures | Verification notes, residual risk list | `closed-loop-sprint` |
| DevOpsAgent | Keep local/dev workflow stable. | Scripts, env, build, deployment docs | Review build commands, env assumptions, CI/deployment notes | Change production/deployment config casually | Deployment, secrets, destructive operations | Dev workflow notes | `codebase-audit`, `closed-loop-sprint` |

## Operating Rule

Each agent role produces proposals, checklists, or small scoped changes. Runtime autonomy is a future phase. High-risk writes require human approval.

## Generated AgentFacts-Lite Inventory

Loop 27 created internal-only AgentFacts-lite manifests for every agent in this table:

- `docs/2_agent-input/generated/agent-loop/agent-registry/internal-agent-manifests.agentfacts-lite.json`
- `docs/2_agent-input/generated/agent-loop/agent-registry/manifest-index.json`

These generated manifests are governance evidence, not runtime registration. Every agent remains `governance-only`, `internalDiscoverable: true`, `externalRegisterable: false`, and `registrationStatus: not-registered` until a reviewed validation script, protected owner/admin readiness surface, auth proof, endpoint review, trust review, rollback plan, and human approval exist.

## Module Agent Workspace Direction

Each major module should eventually expose a module-specific Agent workspace in the frontend operating surface.

Default workspace expectations:

- agent attention queue
- proposal table
- boundary / permission summary
- related source or module context
- approval / rejection state
- run log and recent decisions

These workspaces are governance and review surfaces first. They are not autonomous runtime agents yet, and they do not bypass module services, approval policy, or high-risk data boundaries.
