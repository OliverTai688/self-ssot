# SaaS OS Operating Surface Maturity Research

**Document ID:** `RES-002`
**Last updated:** 2026-06-21
**Status:** Active research-to-task reference
**Scope:** Frontstage, member/owner settings, admin/operator, module operating surfaces, real-data progression, AI agent workspaces, agent operation API/CLI, internal multi-agent coordination, NANDA readiness

---

## 1. Purpose

This document converts the owner's latest direction into a mature SaaS/OS operating-surface target.

Owner direction captured on 2026-06-21:

- Supabase public env and real auth proof can be configured.
- Local or disposable Work proof DB target is allowed.
- Development priority should follow the recommended launch-leverage path.
- All modules should mature toward real data, not permanent mock-only surfaces.
- AI agents should eventually cover every module and operational workflow.
- NANDA sequencing should follow the recommended safe path: internal runtime, owner-only API/CLI, trust/audit, then controlled external registration.
- Frontstage, member settings, admin, backend, and every module should become a mature SaaS/OS-grade operating surface.

The immediate product problem is not a lack of UI pages. The gap is that the system needs one integrated standard for how a mature operating page behaves: real authenticated data, clear resource management, actionable empty/loading/error states, auditability, approval boundaries, and AI-agent workspaces that can operate through explicit APIs rather than hidden UI state.

## 2. Source Basis

### Local sources

- `AGENTS.md`
- `docs/00_manual-and-index/MAN-002_development-loop.md`
- `docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md`
- `docs/02_architecture-and-rules/ARC-012_frontend-operating-surface.md`
- `docs/02_architecture-and-rules/ARC-026_admin-settings-audit-bff.md`
- `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`
- `docs/02_architecture-and-rules/AUT-005_owner-demo-account-boundary.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- Loop 45, 46, and 47 evidence reports

### External references reviewed

- [Shopify Polaris resource index layout](https://polaris-react.shopify.com/patterns/resource-index-layout)
- [Shopify Polaris index table](https://polaris-react.shopify.com/components/tables/index-table)
- [Shopify app home index table composition](https://shopify.dev/docs/api/app-home/patterns/compositions/index-table)
- [Shopify Polaris common actions](https://polaris-react.shopify.com/patterns/common-actions)
- [Atlassian navigation layout](https://atlassian.design/components/navigation-system/layout)
- [Atlassian dynamic table](https://atlassian.design/components/dynamic-table/)
- [GitHub enterprise audit log export](https://docs.github.com/en/enterprise-cloud%40latest/admin/monitoring-activity-in-your-enterprise/reviewing-audit-logs-for-your-enterprise/exporting-audit-log-activity-for-your-enterprise)
- [Stripe activity logs](https://docs.stripe.com/activity-logs)
- [Supabase auth audit logs](https://supabase.com/docs/guides/auth/audit-logs)
- [Supabase platform audit logs](https://supabase.com/docs/guides/security/platform-audit-logs)
- [Supabase PGAudit](https://supabase.com/docs/guides/database/extensions/pgaudit)
- [Project NANDA GitHub organization](https://github.com/projnanda)
- [A2A protocol GitHub repository](https://github.com/a2aproject/A2A)
- [Model Context Protocol 2025-06-18 specification](https://modelcontextprotocol.io/specification/2025-06-18)

## 3. Key Research Synthesis

Leading SaaS/admin systems converge on a few operating patterns:

- Resource collections are managed through scannable index surfaces with search, filters, sorting, pagination, row actions, and bulk actions.
- Page layout must separate navigation, content, action, and detail areas so users can predict where to look and what to do next.
- Empty states should explain the current system state and lead to the next useful action, not fill the page with decoration.
- Admin/operator surfaces need audit logs, exportable evidence, role/permission visibility, and no-secret operational status.
- AI-agent systems need capability manifests, explicit tool/context protocols, trust boundaries, observability, and registration controls before external discovery.

For Personal OS, the best integrated approach is to treat every module as a compact operational console:

```txt
Module OS surface
  -> attention header
  -> resource index or primary workbench
  -> command bar
  -> detail drawer or split pane
  -> agent workspace
  -> records/audit
  -> settings/boundaries
  -> BFF/API/CLI contract
  -> real-data readiness state
```

This extends `ARC-012`, but raises the bar from frontend shell to SaaS-grade operating behavior.

### Conditional L3 Viewframe Standard

`RES-005_conditional-l3-interface-scenario-architecture-gap-research.md` adds a three-layer viewframe that applies this operating-surface standard to post-30 convergence:

- **Interface layer:** every frontstage, login, dashboard, settings, admin, module, client, and agent surface must expose identity/mode, primary action, resource or workbench area, command path, detail/proposal area, records/audit or readiness history, settings/boundaries, and explicit real/demo/mock/unavailable state.
- **Scenario layer:** every major owner job must have a route from trigger to action to output to proof/audit to next task. Pages alone do not count as L3 maturity if the owner cannot move through the job.
- **Architecture layer:** every visible operation must map to a BFF/API/CLI/auth/audit/manual-ops boundary before runtime persistence or high-risk writes expand.

This viewframe creates a conditional product-maturity ladder from `C0_RESEARCH_READY` to `C-L3_CONDITIONAL_FULL_EXPERIENCE`. It does not change formal launch-level requirements: `AUTH-005`, `WORK-009` or `WORK-007`, and `DEPLOY-002` evidence remain required before formal L1/L3/L4 claims.

## 4. SaaS/OS Operating Surface Contract

Each mature surface must expose these layers.

| Layer | Required behavior | Personal OS implementation rule |
|---|---|---|
| Identity and mode | Show whether the user is owner, demo, mock, formal, or unavailable. | Use `AUT-005` boundary terms consistently. Do not make mock data look like production data. |
| Attention header | Show the one to three highest-priority items, risks, or proof blockers. | Avoid decorative hero/dashboard cards in protected app surfaces. |
| Resource index | Search, filter, sort, paginate, select, bulk-act, and open detail. | Default to tables, queues, split panes, timelines, or boards depending on module data. |
| Command bar | Put create/import/review/approve/sync/export commands near the relevant data. | Commands call BFF/server actions, never hidden client-only persistence. |
| Detail surface | Let the user inspect and act without losing list context. | Prefer drawer/split pane before adding isolated pages unless the workflow needs a full page. |
| Empty/loading/error | State the condition and next useful action. | No mock fallback in formal mode; fail closed for private/public risk. |
| Agent workspace | Show proposals, run status, allowed actions, rejected actions, and approval needs. | Agents propose by default; writes require service authorization and risk policy. |
| Records/audit | Filterable history of user actions, agent runs, approvals, syncs, errors, and exports. | Persist audit only after schema/BFF contract review; otherwise show readiness contract honestly. |
| Settings/boundaries | Role/module permissions, visibility, sync scope, data policy, agent permissions. | Owner/admin settings must distinguish current state from future capability. |
| API/CLI bridge | Owner-only operation contract for agent or CLI control. | Start with dry-run/read-only commands, then approval-based writes. |

## 5. Actor Surface Targets

### Public frontstage

Target: safe product entry and owner access path.

- Public page must not reveal private Work, Research, Life, Finance, Company, Chamber, AI Input, or client data.
- It should show product identity, owner login path, client-token boundary, service health handoff, and unavailable states.
- Mature next step: add real deployment/auth readiness indicators without leaking environment values or internal records.

### Member/owner settings

Target: the owner's personal control plane.

- Show account identity, Supabase/Profile mapping state, demo/mock/formal boundary, module permissions, data source connection states, AI-agent permission levels, and export/delete policies.
- Settings should use sections with tables/forms, not a marketing-style overview.
- Mature next step: `AUTH-MATURITY-002`, surfacing owner/demo boundary in settings/admin with clear real-account next actions.

### Admin/operator

Target: private launch and operations console.

- Show launch blockers, auth proof state, Work proof state, deployment marker, module readiness, agent registry readiness, audit readiness, and evidence links.
- Admin actions must be no-secret and guarded by owner/admin authorization.
- Mature next step: add an operator action registry showing which actions are read-only, dry-run, approval-required, or unavailable.

### Module pages

Target: one operating model across Work, Research, AI Input, Workflow, Life, Finance, Chamber, Company, Client Portal, and Agent Team OS.

- Each module gets Operation, Agent, Records, and Settings/Boundaries surfaces.
- Each module declares DB-backed/formal/mock state and the next real-data migration task.
- High-risk modules stay proposal/draft/approval-first until auth, permission, audit, and human approval paths exist.

### AI agent surfaces

Target: agents operate through contracts, not by scraping UI.

- Each agent has identity, capabilities, lifecycle, trust boundary, allowed operations, observability, registry status, and data-access scope.
- UI agent workspace, BFF/API route, and CLI command should describe the same operation contract.
- External registration remains blocked until endpoint, auth, scope, trust, rollback, public safety, observability, and human approval are complete.

## 6. Real-Data Progression Model

The owner direction is that all modules should become real data. The safe progression is:

| Stage | Meaning | Allowed next work |
|---|---|---|
| `mock-only` | UI prototype uses mock arrays or local state. | Add formal-mode empty/readiness state and BFF contract. |
| `seed-demo` | Repeatable demo rows exist in a disposable/local DB. | Map demo account boundary; do not treat as real owner data. |
| `formal-readiness` | Server-only BFF reports what is missing. | Add schema/service proposal and acceptance criteria. |
| `db-backed-read` | Authenticated owner can read real rows through service authorization. | Add records/audit and safe empty/error states. |
| `db-backed-write-draft` | Writes are drafts/proposals or low-risk owner-owned records. | Add audit, undo/rollback, and approval policy. |
| `db-backed-write-final` | Final module writes are allowed. | Only after auth, permission, audit, risk review, and module-specific acceptance. |
| `agent-operated` | Agents can call owner-only API/CLI operations. | Start dry-run/read-only, then approval-required writes. |
| `external-registerable` | Public agent registration is possible. | Human approval required; default remains false. |

This model lets every module move toward real data without silently converting high-risk mock UI into unsafe production writes.

## 7. Agent API/CLI Maturity Model

Agent operation should evolve in levels.

| Level | Capability | Contract |
|---|---|---|
| `L0_DOCS` | Governance, manifests, readiness docs only. | Current AgentFacts-lite inventory and registry check. |
| `L1_READ_ONLY_UI` | Owner sees agent readiness and proposals. | Protected settings/admin/agent workspaces. |
| `L2_DRY_RUN_CLI` | Owner can ask an agent operation to simulate changes. | `pnpm agent:op -- --dry-run ...` or equivalent script contract. |
| `L3_OWNER_API_READ` | Protected API exposes read-only operation contracts. | `requireUser()`, service auth, no raw secrets, audit-readiness. |
| `L4_APPROVAL_WRITE` | Agent can create proposals/write intents needing human approval. | ModuleWriteIntent or equivalent proposal queue. |
| `L5_BOUNDED_WRITE` | Low-risk writes can execute with policy and audit. | Explicit module policy, rollback, records, tests. |
| `L6_EXTERNAL_REGISTRY_READY` | Agent can be considered for NANDA/A2A/MCP exposure. | Endpoint, auth, scope, observability, trust attestations, human approval. |

Near-term work should target `L2_DRY_RUN_CLI` and `L3_OWNER_API_READ`, not external registration.

## 8. Module Maturity Targets

| Module | Current maturity read | Mature next target |
|---|---|---|
| Work | DB-backed operational, proof-blocked | Run disposable proof, then mature Work agent/records/settings into real audit-backed surfaces. |
| Research | UI-rich, mock/state | Add SourceAsset/DataUnit-backed BFF read model and ResearchAgent proposal queue. |
| AI Input | Formal readiness, no persistence | Split DATTR-024 into schema/service/BFF slices and persist SourceWorkflow objects. |
| Workflow | UI mock/proposal | Add workflow run/readiness BFF and agent operation dry-run contract. |
| Life | Privacy-first shell | Add owner-only private journal/check-in schema proposal before writes. |
| Finance | High-risk shell | Add draft-only financial record proposal queue; no final writes without approval. |
| Chamber | CRM proposal/shell | Add contacts/interactions/opportunities BFF read/write draft path. |
| Company | High-risk strategy shell | Add strategy decision records and approval-only agent proposal path. |
| Client Portal | Fail-closed/gated BFF | Implement token lifecycle, visibility audit, and real DB smoke. |
| Agent Team OS | Internal manifest readiness | Add owner-only operation registry, dry-run CLI, and approval policy matrix. |

## 9. Executable Task Seeds

These rows should be added or mirrored into the active backlog when selected.

| Task id | Title | Scope | Acceptance | Verification | Risk / stop condition |
|---|---|---|---|---|---|
| `SURFACE-MATURITY-001` | Create SaaS/OS operating surface maturity research | Formal research and loop integration | `RES-002` exists, is indexed, and generates implementation-ready tasks | docs scan, `git diff --check` | Documentation-only; does not unblock auth/DB proof |
| `SURFACE-MATURITY-002` | Add operating surface maturity checklist to settings/admin | Owner/admin can see per-module real-data, agent, records, and API/CLI state | Protected UI shows explicit state and next task per module | typecheck, route smoke | Must not show private records or secrets |
| `SURFACE-MATURITY-003` | Define shared module resource index contract | BFF/view-model contract for search/filter/sort/pagination/bulk actions | Contract covers Work first and maps all modules | docs + typecheck if types added | Stop before schema writes if module fields are ambiguous |
| `AGENT-OPS-001` | Define owner-only agent operation API/CLI dry-run contract | Agent operations have command ids, scopes, inputs, outputs, audit refs, dry-run mode | Contract and first no-op/dry-run script exist | `node --check`, dry-run JSON | No real writes, no external agent access |
| `AUDIT-OPS-001` | Propose append-only operating audit event schema | Cross-module audit event model and BFF read contract | Actor/action/target/result/source/agent/proof refs covered | docs + `pnpm db:validate` if schema drafted | Human review before migration |
| `REALDATA-001` | Create per-module mock-to-real-data migration matrix | Every module has current state, next data object, BFF route, acceptance, and proof | Matrix added to acceptance/backlog | docs scan | Do not silently remove mock UX before formal state works |
| `L3-UI-001` | Add conditional L3 interface completeness matrix/checker | Frontstage, login, dashboard, settings, admin, modules, Client Portal, and Agents are assessed against the interface layer viewframe | `pnpm interface:smoke:check`, new checker | Do not redesign broadly; inspect existing surfaces first |
| `L3-SCENARIO-001` | Add conditional L3 scenario route map/checker | Core owner jobs map trigger, actor, entry, data source, action, agent proposal, output, proof/audit, and next task | new checker, owner evidence and launch action checks | Stop before high-risk writes or public-output expansion |
| `L3-ARCH-001` | Add conditional L3 architecture claim gate/checker | Formal launch level, conditional Manual Ops, and conditional product maturity are separated and machine-checkable | `pnpm launch:manual-ops`, new checker, JSON parse | Do not mutate formal launch level without owner evidence |

## 10. Recommended Next Development Order

Given the owner's approvals and current blockers, the recommended order is:

1. If Supabase public env and signed-in `/auth/status` evidence are available, run `AUTH-005`.
2. If a disposable/local proof DB target is available, run `WORK-009`.
3. If neither proof path has the concrete target values yet, run `AUTH-MATURITY-002` or `SURFACE-MATURITY-002` to turn owner/demo/auth/module maturity state into a protected settings/admin operating surface.
4. Then implement `AGENT-OPS-001` as a dry-run CLI/API contract before any real multi-agent writes.
5. Then select one real-data module slice at a time, starting with Work proof, AI Input persistence split, Client Portal token lifecycle, or Chamber CRM if Work/auth are stable.

## 11. Rejected Alternatives

- Building more visual dashboard cards first. Rejected because mature SaaS/OS use depends on commandable resource surfaces, not decorative summaries.
- Converting all mock data into production writes in one pass. Rejected because each module needs auth, BFF, service authorization, audit, rollback, and risk-specific acceptance.
- Letting agents operate the browser UI directly as the primary integration method. Rejected because stable API/CLI contracts are safer, testable, auditable, and NANDA-aligned.
- Claiming NANDA readiness before runtime endpoints, auth/scopes, observability, trust claims, rollback, and human approval exist. Rejected by `ARC-028`.
- Adding external agent collaboration before owner-only internal operations work. Rejected because private context and high-risk modules require controlled context packages and human review.

## 12. Acceptance For This Research Track

This track is successful when:

- Every protected actor surface can say what is real, demo, mock, blocked, or unavailable.
- Every module has Operation, Agent, Records, and Settings/Boundaries targets.
- Every module has a real-data migration row with BFF contract, authorization, audit, acceptance, and verification.
- Agent workspaces and agent API/CLI use the same operation ids and permission model.
- Admin/operator can inspect launch proof, module maturity, agent readiness, and audit readiness without secrets.
- External agent registration remains disabled until the full NANDA-readiness gate passes and the owner approves it.
