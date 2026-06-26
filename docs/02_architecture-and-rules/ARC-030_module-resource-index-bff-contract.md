# Module Resource Index BFF Contract

**Document ID:** `ARC-030`
**Last updated:** 2026-06-21
**Status:** Active BFF contract
**Scope:** Shared resource index contract for Work first, then Research, AI Input, Workflow, Life, Finance, Chamber, Company, Client Portal, and Agent Team OS

---

## 1. Purpose

`SURFACE-MATURITY-003` turns the `RES-002` SaaS/OS operating-surface research into an executable BFF contract for module resource indexes.

The goal is to prevent every module from inventing a different list surface, detail drawer, search model, filter model, bulk action model, and audit reference shape. Future module pages should start from this contract before adding route handlers, server actions, Prisma reads, UI state, or agent operations.

This contract is static/proof-first. It does not add routes, schema changes, migrations, DB reads, DB writes, public output, auth provider behavior, or module writes.

## 2. Source Basis

Local sources:

- `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md`
- `docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md`
- `docs/02_architecture-and-rules/ARC-012_frontend-operating-surface.md`
- `docs/02_architecture-and-rules/ARC-018_work-module-contract.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `src/lib/services/admin-readiness.service.ts`
- `src/app/(dashboard)/work/page.tsx`
- `src/app/actions/work.ts`
- `src/lib/services/project.service.ts`

External reference basis is inherited from `RES-002`, which reviewed resource-index, dynamic-table, audit-log, and agent-protocol patterns from Shopify Polaris, Atlassian, GitHub, Stripe, Supabase, Project NANDA, A2A, and MCP sources. This implementation does not depend on current external API behavior.

## 3. Contract Artifact

Runtime-neutral contract:

```txt
src/lib/contracts/module-resource-index.contract.ts
```

Static proof command:

```bash
pnpm module:index:check -- --out docs/2_agent-input/generated/agent-loop/reports/<proof>.json
```

The proof checks that the contract:

- covers all ten module keys;
- includes search, filters, sorts, columns, pagination, selection, row actions, bulk actions, detail panel, empty/loading/error/blocked states, and audit refs;
- declares no schema writes, module writes, or public output expansion;
- does not contain runtime markers for environment reads, provider clients, network calls, database clients, or direct request cookie/header access.

## 4. BFF Shape

Every module resource index must map to this shape before UI or DB work expands:

```txt
Protected or gated actor need
  -> ModuleResourceIndexContract
  -> UI-safe row view model
  -> search/filter/sort/pagination contract
  -> selection and action contract
  -> detail drawer payload contract
  -> empty/loading/error/blocked states
  -> audit refs and future operating audit event names
  -> service-layer authorization
  -> approved persistence adapter only when selected
```

Client Components must not import Prisma models, database clients, provider secrets, raw adapter payloads, session values, raw claims, private identifiers, or public-token internals.

## 5. Work-First Contract

Work is the first concrete target because it is the only operational DB-backed module.

The Work resource index contract includes:

- searchable fields: project name, client name, description, phase, status;
- filters: status, health, visibility, due date;
- sorts: recently updated, due soon, progress, name;
- columns: project, client, status, progress, open items, updated;
- cursor pagination with stable page-size options;
- multi-selection with `projectId` as the stable row id;
- row actions for open project, open detail, and WorkAgent review dry-run;
- bulk actions limited to proposal/export shapes, with bulk writes blocked until audit and approval policy exist;
- detail drawer sections for attention, tasks, notes summary, deliverables, agent proposals, and audit refs;
- future audit events for opening resources and requesting agent review.

This does not replace `ARC-018`. It gives the Work list and future module lists a shared BFF/view-model shape.

## 6. Module Coverage

| Module | Contract status | Next task | Write boundary |
|---|---|---|---|
| Work | `contract_ready` | `WORK-009` | Server action plus service-layer ownership checks; no bulk writes in this slice |
| Research | `prototype_mapped` | `REALDATA-001` | Needs SourceAsset/DataUnit BFF and citation provenance |
| AI Input | `prototype_mapped` | `DATTR-024` | Needs schema and service authorization before formal persistence |
| Workflow | `prototype_mapped` | `REALDATA-001` | Needs run model, rollback, and audit contract |
| Life | `contract_only_blocked` | `REALDATA-001` | Privacy-first; human approval before final writes |
| Finance | `contract_only_blocked` | `REALDATA-001` | Draft/proposal-only until audit, approval, and rollback |
| Chamber | `prototype_mapped` | `REALDATA-001` | Needs contact/interactions BFF and visibility boundaries |
| Company | `contract_only_blocked` | `REALDATA-001` | Human approval and decision audit before final writes |
| Client Portal | `contract_only_blocked` | `CLIENT-007` | Token-gated public BFF only after safe DB target and public-output proof |
| Agent Team OS | `prototype_mapped` | `AUDIT-OPS-001` | Dry-run/internal until auth, audit, and approval gates exist |

## 7. Accepted Pattern

Use a shared contract plus module-specific adapters.

Rationale:

- It keeps Work-first implementation concrete without freezing every module schema too early.
- It lets UIUXAgent and DBAgent agree on the BFF payload before runtime code.
- It allows high-risk modules to define index behavior without enabling unsafe writes.
- It creates an audit-event vocabulary before persisted audit exists.
- It gives future agent operations a stable resource surface to target.

## 8. Rejected Alternatives

- Building each module index independently. Rejected because module UX, action semantics, and audit refs would drift.
- Letting Client Components assemble indexes from raw rows. Rejected because it weakens Prisma/view-model boundaries.
- Adding a generic DB table or schema migration now. Rejected because most module fields and auth boundaries are not ready.
- Adding bulk write actions now. Rejected because audit, rollback, approval, and high-risk policies are not complete.
- Reusing protected owner index payloads for public Client Portal output. Rejected because public token routes require stricter filtering and fail-closed behavior.

## 9. Stop Conditions

Stop before implementation if a future task requires:

- new Prisma models or migrations without reviewed schema impact;
- module writes outside Work without explicit task selection and authorization review;
- public output expansion without Client Portal token/public-safety proof;
- high-risk writes for Life, Finance, Company, auth/permission, Client Portal, or external collaboration;
- direct agent DB access;
- raw provider/session/secret values in UI contracts.

## 10. Verification

Minimum verification for this contract:

```bash
node --check scripts/check-module-resource-index-contract.mjs
pnpm module:index:check -- --out docs/2_agent-input/generated/agent-loop/reports/<proof>.json
pnpm exec tsc --noEmit --pretty false
pnpm db:validate
git diff --check
```

`pnpm module:index:check` is the canonical static proof for `SURFACE-MATURITY-003`.
