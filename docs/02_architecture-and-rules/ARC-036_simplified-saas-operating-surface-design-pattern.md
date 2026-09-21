# Simplified SaaS Operating Surface Design Pattern

**Document ID:** `ARC-036`  
**Task ID:** `OWNEROS-UI-001`  
**Status:** Active architecture and UI governance contract  
**Last updated:** 2026-08-21  
**Runtime implementation:** Not changed by this document

## 1. Purpose

The current Personal OS interface has many useful readiness, proof, and module surfaces, but the protected app experience is too verbose and inconsistent for fast daily use. This document defines one simplified SaaS-style operating pattern for Gate A, Gate B, and Gate C work.

The goal is not visual polish. The goal is a compact, predictable operating grammar:

```txt
actor and mode
  -> one primary job
  -> command bar
  -> resource index or workbench
  -> detail/proposal pane
  -> records/audit
  -> settings/boundaries
  -> exact Manual Ops or proof handoff
```

This extends `ARC-012`, `RES-002`, `RES-005`, `RPT-062`, and `PLN-067`. It does not achieve Gate A/B/C and does not change formal launch level.

## 2. Local Source Review

Reviewed:

- `AGENTS.md`
- `MAN-000`, `MAN-001`, `MAN-002`
- `ACC-001`, `ACC-002`
- `RES-001`, `RES-002`, `RES-005`
- `RPT-062`, `PLN-067`
- `loop-state.json`, Gate state, and recent loop 214/215 evidence
- `src/components/layout/module-operating-shell.tsx`
- `src/components/tables/data-table-shell.tsx`
- route files for dashboard, settings, admin, agents, AI Input, Work, Research, and module surfaces

Finding: the repo already has the bones of a mature operating surface, but the page-level experience has drift. Some pages emphasize evidence walls, repeated explanatory copy, large card groups, or page-specific controls instead of one shared command/index/detail/audit/settings model.

## 3. External Reference Review

Current official or primary reference sources reviewed:

- [Shopify app home index table composition](https://shopify.dev/docs/api/app-home/patterns/compositions/index-table)
- [Shopify Polaris common actions](https://polaris.shopify.com/patterns/common-actions)
- [Atlassian navigation system layout](https://atlassian.design/components/navigation-system/layout/)
- [IBM Carbon data table usage](https://carbondesignsystem.com/components/data-table/usage/)
- [GitLab Pajamas design system](https://design.gitlab.com/)

Selected synthesis:

- Shopify-style resource indexes are the right default for admin/work/resource management because they support search, filtering, sorting, rows, and actions.
- Atlassian-style layout separation is useful for keeping navigation, page identity, content, and contextual actions predictable.
- Carbon-style data tables fit Personal OS better than decorative card grids for scanning, comparison, selection, and bulk action.
- GitLab-style design system thinking supports one vocabulary and one pattern set across many product surfaces.

Rejected:

- A marketing/SaaS landing style inside the protected app.
- Rebuilding every page visually before Gate A proof.
- Treating each module as a unique bespoke UI.
- Adding more readiness text without commandable controls.
- Hiding mock/formal/unavailable state to make pages feel more complete.

## 4. Page Requirement Understanding Score

| Dimension | Score | Reason |
|---|---:|---|
| Actor/job clarity | 19/20 | Owner, member, admin/operator, module operator, and agent commander jobs are already named in `RPT-062` and acceptance docs. |
| PRD/local evidence fit | 19/20 | `PRD-001`, `PRD-005`, `RES-002`, `RES-005`, and current route/component patterns all point to reducing role-switching friction. |
| Data/BFF/API clarity | 17/20 | BFF-first boundaries are clear; several pages are still readiness-only or mock/formal split. |
| UI interaction/reference confidence | 14/15 | Official SaaS/admin design systems converge on index/detail/action/navigation patterns. |
| Risk/auth/public-output clarity | 14/15 | Auth, public output, high-risk modules, and external agent registration remain explicitly blocked where needed. |
| Acceptance/verification clarity | 9/10 | Existing interface and L3 checkers provide a base; this loop adds a focused design-pattern checker. |
| **Total** | **92/100** | High understanding. Three same-issue research rounds are enough before task conversion. |

## 5. Research Optimization Rounds

### Round 1 - Local Product And Code Fit

Selected pattern: preserve the existing protected shell and module operating shell, then add a stricter simplified page grammar before runtime redesign.

Rejected pattern: broad visual rebuild of every page in one loop.

Requirement update: every future page improvement must name one primary job and map visible actions to BFF/API/CLI/audit/manual-ops boundaries.

### Round 2 - Comparable SaaS/Admin Pattern

Selected pattern: use resource index plus detail pane as the default, with command bars near the affected objects and secondary actions tucked into predictable menus.

Rejected pattern: card-heavy dashboards where the user scans many summaries but cannot immediately operate.

Requirement update: Work, Research, AI Input, Company, Agents, Admin, and Settings should converge on the same slots: mode strip, command bar, index/workbench, detail/proposal, records/audit, settings/boundaries.

### Round 3 - Risk, Launch, And Agent Boundary

Selected pattern: keep honest state badges and Manual Ops handoffs visible while shortening prose. UI can become calmer without pretending that mock/proposal/manual states are production.

Rejected pattern: hiding blockers behind optimistic labels, or letting AI/agent panels look like free-form autonomous execution.

Requirement update: agent areas are proposal workspaces, not generic chat widgets. Gate A/B/C UI hardening must keep `externalRegisterable=false`, public output disabled, and high-risk writes approval-gated.

## 6. Contract

The machine-readable contract is:

- `src/lib/contracts/simplified-saas-operating-surface.contract.ts`
- checker: `pnpm ui:simplified-saas:check`

Required runtime-neutral safety flags:

- `routeHandlerCreated: false`
- `serverActionCreated: false`
- `schemaMigrationIncluded: false`
- `databaseRead: false`
- `databaseWrite: false`
- `providerCall: false`
- `publicOutputExpanded: false`
- `externalAgentDatabaseAccess: false`
- `externalRegisterable: false`

## 7. Simplified Operating Surface Rules

| Rule | Required behavior | Rejected pattern |
|---|---|---|
| One primary job per surface | First viewport names actor, mode, and one primary job. | Protected-app hero sections, long feature explanations, or overview grids before action. |
| Index-detail default | Resources use searchable/filterable/sortable indexes and stable detail panes. | Many isolated cards that cannot be scanned, sorted, selected, or audited. |
| Command bar before copy | Create/import/review/approve/sync/export/dry-run actions appear near the relevant resource. | Paragraphs that describe actions without a command or exact handoff. |
| Agent as proposal workspace | Agent sections show scope, context, proposal, allowed operation, blocked write, proof, and next owner decision. | Toy chatbot panels or AI copy without trust/audit boundaries. |
| Honest state language | Pages state real, demo, mock, formal-readiness, DB-backed, unavailable, or Manual Ops state. | Mock data styled like production data. |
| Audit and settings last mile | Trust-affecting actions have an audit/proof row and nearby boundary/settings explanation. | Standalone buttons without authorization, retention, or rollback visibility. |

## 8. Copy Budget

Protected operational pages should use short UI text:

| Element | Budget |
|---|---:|
| Header title | 7 words |
| Header subtitle | 18 words |
| Section intro | 24 words |
| Row label | 6 words |
| Empty state | 22 words |

If more explanation is needed, move it into docs, detail drawer, audit/proof row, or Manual Ops handoff. Do not fill the first viewport with feature descriptions.

## 9. Surface Targets

| Surface | Primary job | Default layout | Next task |
|---|---|---|---|
| `/` | Route owner to sign-in while preserving public/private boundary. | Single-column console | `OWNEROS-UI-002` |
| `/login` | Complete or diagnose real Google/Supabase sign-in. | Single-column console | `AUTH-005` |
| `/dashboard` | Choose the next owner action. | Split workbench | `OWNEROS-UI-002` |
| `/settings` | Control identity, workspace, source, module, agent, and retention boundaries. | Index-detail | `OWNEROS-UI-003` |
| `/admin` | Inspect launch blockers, evidence, operations, and proof handoffs. | Index-detail | `OWNEROS-UI-004` |
| `/ai-input` plus future unified chat | Capture source/conversation into authorized context and proposals. | Split workbench | `OWNEROS-002B` |
| `/work`, `/research`, `/company`, `/workflow`, `/life`, `/finance`, `/chamber` | Operate one module through resources, agents, records, and boundaries. | Index-detail | `OWNEROS-UI-005` |
| `/agents` | Run owner-only dry-run commands and inspect proposal/audit boundaries. | Split workbench | `OWNEROS-UI-006` |
| `/client/[token]` | Fail closed unless token can show client-visible records. | Token fail-closed | `CLIENT-007` |

## 10. Gate Mapping

This rule set advances Gate work only as a UI hardening prerequisite:

- Gate A: makes owner-private AI Work Desktop flows less verbose and more operable.
- Gate B: gives member/team surfaces one predictable permission and work model.
- Gate C: directly supports `C5_CORE_JOURNEY_UI_HARDENING`.

It does not satisfy Gate A/B/C criteria by itself. Gate achievement still requires current runtime, owner, deployed, no-mock, and negative evidence.

## 11. Executable Follow-Up Tasks

| Task id | Scope | Acceptance | Verification | Stop conditions |
|---|---|---|---|---|
| `OWNEROS-UI-001` | Create this simplified SaaS operating surface pattern and checker. | `ARC-036`, TS contract, checker, package script, backlog/sprint/acceptance/evidence exist. | `pnpm ui:simplified-saas:check`, typecheck, diff check. | No runtime/schema/DB/provider/public-output/external-registration changes. |
| `OWNEROS-UI-002` | Apply simplified first-viewport pattern to `/dashboard` and the owner AI Work Desktop entry. | One primary job, command bar, resource/workbench split, Manual Ops handoff, no hidden mock. | Typecheck, route/browser smoke, checker. | Stop before new provider/DB writes. |
| `OWNEROS-UI-003` | Simplify `/settings` into identity/workspace/source/module/agent/retention index-detail sections. | Less prose, consistent state badges, current vs future separated. | Typecheck, owner access checker, browser smoke. | Stop before permission writes or retention deletion runtime. |
| `OWNEROS-UI-004` | Simplify `/admin` evidence wall into indexed operator queues and detail surfaces. | First viewport shows blockers/actions; detail routes keep deep evidence. | Route identity, typecheck, browser smoke. | No admin mutations or deployment API writes. |
| `OWNEROS-UI-005` | Apply module rule to Work/Research/Company core module pages first. | Resource index, agent proposal, records/audit, settings/boundary slots aligned. | Interface smoke, module-specific checkers, typecheck. | Stop before high-risk final writes or Company publication runtime. |
| `OWNEROS-UI-006` | Simplify `/agents` command center around operation selection, proof, proposal, and audit. | One dry-run command path, proposal workspace, blocked write clarity. | Agent command/API/bus checkers, typecheck. | No execute mode, provider call, public endpoint, or external registration. |

## 12. NANDA And Agent Boundary

This task touches agent surfaces as UI governance only. No agent capability, endpoint, registry status, or provider runtime changes.

AgentFacts-lite interpretation:

- identity: unchanged
- capabilities: unchanged
- endpoints: unchanged
- protocols: unchanged
- trust: clarified through UI rules only
- observability: checker/evidence path added
- registry: all v1 agents remain `externalRegisterable: false`

External agent collaboration, public agent directories, NANDA registration, and direct external-agent DB access remain `HUMAN_APPROVAL_REQUIRED`.
