# OwnerOS Core Surface BFF View Model Contract

**Document ID:** `ARC-037`  
**Task ID:** `OWNEROS-BFF-001`  
**UI contract:** `OWNEROS-UI-003` foundation  
**Status:** Active architecture contract, no runtime expansion  
**Last updated:** 2026-08-21  

## 1. Purpose

The next OwnerOS phase should make the protected app feel like one small, useful SaaS tool instead of many unrelated readiness pages. `ARC-036` defines the visual operating grammar. This document adds the shared BFF and view-model contract for the four core surfaces that matter most for Gate A through Gate C:

- `/dashboard`
- `/ai-input`
- `/settings`
- `/admin`

This is a contract/checker slice. It does not redesign the runtime pages, add Server Actions, create route handlers, run provider calls, apply schema migrations, mutate data, enable public output, or claim Gate A/B/C achievement.

## 2. Local Source Review

Reviewed local inputs:

- `AGENTS.md`
- `RPT-062_scenario-system-contraction-and-internal-sharing-gap-audit.md`
- `PLN-067_owner-ai-work-desktop-and-company-sharing-contraction-plan.md`
- `ARC-028_nanda-agent-protocol-alignment.md`
- `ARC-035_owner-ai-work-desktop-chat-context-package-contract.md`
- `ARC-036_simplified-saas-operating-surface-design-pattern.md`
- `ACC-002_module-acceptance-criteria.md`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/ai-input/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `src/app/(dashboard)/admin/page.tsx`
- `src/lib/services/admin-readiness.service.ts`
- `src/lib/services/ai-input-readiness.service.ts`
- `src/lib/services/ai-input-source-connection-catalog.service.ts`
- `src/lib/services/auth.service.ts`

Relevant current loader facts:

- `/dashboard` already uses the protected Server Component loader `getDailyCommandCenter()`.
- `/ai-input` already loads `buildAIInputFormalReadinessContract()` and `loadAIInputSourceConnectionCatalog()` before passing UI-safe contracts into `AIInputClient`.
- `/settings` already resolves auth through `resolveCurrentUser()`, module permissions, owner evidence, source workflow readiness, and `buildAdminAuditBffContract()`.
- `/admin` already has a split between `getAdminLaunchOverview()` and `getAdminLaunchConsole()` so the default route can stay lighter than the full evidence console.

Dirty overlap note: `/ai-input`, `/settings`, and `/admin` runtime files have existing worktree changes. This slice intentionally avoids editing those runtime files and instead creates the shared contract that will guide the next page-by-page simplification.

## 3. External Reference Review

Current official or primary design references:

- [Shopify app home index table composition](https://shopify.dev/docs/api/app-home/patterns/compositions/index-table)
- [Shopify Polaris common actions](https://polaris.shopify.com/patterns/common-actions)
- [Atlassian navigation system layout](https://atlassian.design/components/navigation-system/layout/)
- [IBM Carbon data table usage](https://carbondesignsystem.com/components/data-table/usage/)
- [GitLab Pajamas design system](https://design.gitlab.com/)

Selected synthesis:

- Resource index plus detail is the default for operating queues, records, settings groups, source lists, launch blockers, and admin proof rows.
- Primary commands should be close to the object and represented as command policies, not free-floating buttons.
- Layout regions should stay stable: actor/mode, page job, command bar, index/workbench, detail/proposal, audit, boundary.
- Dense tables and indexes beat decorative cards when the owner must scan, compare, select, verify, or audit.
- A shared vocabulary prevents each module from inventing its own interaction model.

Rejected:

- A big-bang visual rewrite before auth/proof blockers are resolved.
- Client Components importing Prisma models, provider payloads, secrets, or raw service objects.
- Generic chat widgets for agent work instead of proposal, source, permission, audit, and owner-decision surfaces.
- Hiding formal-readiness, mock, unavailable, or Manual Ops state to make pages look more complete.

## 4. Page Requirement Understanding Score

| Dimension | Score | Reason |
|---|---:|---|
| Actor/job clarity | 20/20 | Owner, admin/operator, future team member, and AI proposal roles are explicit in `RPT-062`, `PLN-067`, and current page loaders. |
| PRD/local evidence fit | 19/20 | Local architecture and loop evidence already point to AI Work Desktop first, then settings/admin hardening. `PRD-004` is currently absent in the dirty worktree and remains a governance risk. |
| Data/BFF/API clarity | 19/20 | The four surfaces already have identifiable Server Component loaders and services; this contract standardizes their UI-safe DTO shape. |
| UI interaction/reference confidence | 14/15 | Official SaaS/admin systems converge on command, index, detail, audit, and boundary regions. |
| Risk/auth/public-output clarity | 14/15 | High-risk writes, public output, provider activation, external agent access, and registry exposure are explicitly stopped. |
| Acceptance/verification clarity | 8/10 | Static contract/checker proof is clear; runtime browser proof remains next-slice work. |
| **Total** | **94/100** | High understanding. Three same-issue research rounds are enough before executable task conversion. |

## 5. Research Optimization Rounds

### Round 1 - Local Product And Code Fit

Selected pattern: preserve the existing protected shell and current Server Component loaders, then standardize their output as UI-safe view models.

Rejected pattern: replacing `/ai-input`, `/settings`, and `/admin` in one large UI rewrite.

Requirement update: every core surface must expose one primary job, a command policy list, an index/workbench, a detail/proposal pane, audit/proof rows, and a boundary panel.

### Round 2 - BFF And Next.js Boundary

Selected pattern:

```txt
Server Component page
  -> protected loader
  -> requireUser() or resolveCurrentUser()
  -> service authorization
  -> domain service
  -> mapper/view model
  -> serializable Client Component props
```

The local Next.js 16 docs reviewed for this rule were Server and Client Components, fetching data, mutating data, data security, route handlers, and Link. The contract keeps internal dashboard/settings/admin reads in Server Components or services, not in public route handlers. Mutations must re-authorize in Server Actions when selected later.

Rejected pattern: client-side fetches to internal APIs for owner-only data, or route handlers used as internal BFFs without a public-safety reason.

Requirement update: Client Components receive DTOs only. They must not import database clients, provider SDK responses, raw auth claims, secrets, or internal evidence packets.

### Round 3 - Gate, NANDA, And High-Risk Boundary

Selected pattern: agent-facing UI is an internal proposal workspace with source ids, context, allowed operation, blocked write, audit ref, and next owner decision.

Rejected pattern: external agent collaboration, external registry readiness, public agent directory, or autonomous execution from UI simplification work.

Requirement update: all AgentFacts-lite posture for this slice remains internal/protected and `externalRegisterable: false`.

## 6. Shared Layout Component Contract

The machine-readable contract lives in:

- `src/lib/contracts/owneros-core-surface-bff.contract.ts`
- checker: `pnpm owneros:surface-bff:check`

Shared component vocabulary:

| Component | Purpose | Required BFF input |
|---|---|---|
| `OwnerOsSurfaceFrame` | Actor/mode, one primary job, state badges, Manual Ops proof handoff. | UI-safe surface metadata from the Server Component loader. |
| `OwnerOsCommandBar` | Primary commands such as create, attach, review, approve, sync, export, or dry-run. | Command policies with disabled reason, audit ref, and stop condition. |
| `OwnerOsResourceIndex` | Searchable/filterable/sortable resources, queues, blockers, settings groups, or proof rows. | Mapped view-model rows, not Prisma models or provider payloads. |
| `OwnerOsDetailPane` | Selected object summary, state, next decision, and handoff. | Redacted detail DTO with capability decision and source refs. |
| `OwnerOsAgentProposalPane` | AI scope, context, proposal, allowed operation, blocked write, and review requirement. | Trust state, source ids, audit refs, and NANDA internal-only posture. |
| `OwnerOsRecordsAudit` | Evidence, audit, proof, retry, retention, and rollback history. | No-secret rows linking only to allowed generated/local evidence. |
| `OwnerOsBoundaryPanel` | Auth, permission, source, retention, provider, public-output, and Manual Ops boundaries. | Current vs future/unavailable/approval-gated state split. |

## 7. BFF View Model Matrix

| Surface | Primary job | Current loader refs | UI-safe view models | Required slots | Next runtime task |
|---|---|---|---|---|---|
| `/dashboard` | Choose the next owner action across AI Work Desktop, Work, Inbox, Settings, Admin, and proof. | `getDailyCommandCenter()` | `DailyCommandCenterContract` | identity/mode, attention, command bar, resource index, detail/proposal, records/audit, Manual Ops | `DONE_OWNEROS-UI-002` |
| `/ai-input` | Capture source material or conversation input into authorized context and reviewable proposals. | `buildAIInputFormalReadinessContract()`, `loadAIInputSourceConnectionCatalog()`, `requireUser()` | `AIInputFormalReadinessContract`, `AIInputSourceConnectionCatalogDTO` | identity/mode, attention, command bar, resource index, detail, agent proposal, records/audit, settings/boundaries, Manual Ops | `OWNEROS-AIINPUT-UI-001` |
| `/settings` | Control owner identity, workspace, source, module, agent, environment, retention, and Manual Ops boundaries. | `resolveCurrentUser()`, module permission snapshot, `buildAdminAuditBffContract()` | `AuthResolution`, `ModulePermissionSnapshot`, `AdminAuditBffContract` | identity/mode, attention, resource index, detail, records/audit, settings/boundaries, Manual Ops | `OWNEROS-UI-003` |
| `/admin` | Inspect operator queues, launch blockers, audit proof, system readiness, and Manual Ops handoffs. | `getAdminLaunchOverview()`, `getAdminLaunchConsole()`, `buildAdminAuditBffContract()` | `AdminLaunchOverview`, `AdminLaunchConsole`, `AdminAuditBffContract` | identity/mode, attention, command bar, resource index, detail, records/audit, settings/boundaries, Manual Ops | `OWNEROS-UI-004` |

## 8. Runtime Safety Flags

This contract requires:

- `routeHandlerCreated: false`
- `serverActionCreated: false`
- `schemaMigrationIncluded: false`
- `databaseRead: false`
- `databaseWrite: false`
- `providerCall: false`
- `publicOutputExpanded: false`
- `externalAgentDatabaseAccess: false`
- `externalRegisterable: false`

These flags describe this slice, not the whole app. Existing protected loaders may already read local/configured state. This slice adds no new runtime read or write path.

## 9. NANDA Boundary

This task touches AI Input and agent proposal surfaces as UI/BFF governance only.

AgentFacts-lite posture:

- identity: unchanged
- provider: unchanged
- lifecycle: internal/protected planning only
- endpoints: unchanged
- protocols: unchanged
- capabilities: unchanged
- skills: unchanged
- auth: unchanged
- trust: clarified through BFF/view-model boundary
- observability: checker/evidence added
- registry: `externalRegisterable: false`

External registration, public directories, provider-backed autonomous execution, and external agent database access remain `HUMAN_APPROVAL_REQUIRED`.

## 10. Gate Mapping

- Gate A: prerequisite for A2 durable authorized context and A8 private deployed no-mock usability because `/ai-input` becomes a predictable owner workbench next.
- Gate B: prerequisite for member/team pilot surfaces because settings/admin BFF contracts prevent role and visibility drift.
- Gate C: prerequisite for C2/C3/C5 because operator failure, audit, retention, and UI hardening need one shared structure.

No Gate is achieved by this document. Gate achievement still requires fresh runtime, owner, deployed, negative, and no-mock evidence.

## 11. Executable Follow-Up Tasks

| Task id | Scope | Acceptance | Verification | Stop conditions |
|---|---|---|---|---|
| `OWNEROS-BFF-001` | Create this BFF/view-model contract, TypeScript contract, checker, docs, task memory, acceptance, and evidence. | Four core surfaces and seven shared components are checkable; forbidden runtime markers are absent. | `pnpm owneros:surface-bff:check`, typecheck, diff check, Gate A incomplete proof packet. | No runtime/schema/provider/public-output/external-registration changes. |
| `OWNEROS-AIINPUT-UI-001` | Rework `/ai-input` first viewport using `ARC-036` and this BFF contract. | One capture/review job, concise command bar, source/conversation index, proposal detail pane, source settings, audit, Manual Ops. | AI Input existing checkers, typecheck, browser smoke. | Stop before provider OAuth, source activation, DB write, AI final write, public output, or external agent access. |
| `OWNEROS-UI-003` | Rework `/settings` into owner/member/profile/env/manual-ops control-plane sections. | Settings index-detail uses the shared component vocabulary and BFF view-model split. | owner access/auth checkers, typecheck, browser smoke. | Stop before permission writes, retention deletion/export runtime, env mutation, provider activation, or secrets. |
| `OWNEROS-UI-004` | Rework `/admin` into operator queues, audit, system readiness, and proof handoff. | Admin default first viewport is concise, indexed, and read-only with detail routes preserved. | route identity, typecheck, browser smoke. | No admin mutation, deployment write, DB write, migration apply, launch claim, or env edit. |

## 12. Verification Contract

`pnpm owneros:surface-bff:check` validates:

- `ARC-037` and `MAN-001` index entry.
- `src/lib/contracts/owneros-core-surface-bff.contract.ts`.
- Package script registration.
- Acceptance, backlog, sprint, completed log, and `tasks.md` markers.
- Four surfaces: `/dashboard`, `/ai-input`, `/settings`, `/admin`.
- Seven shared component contracts.
- Required BFF invariants.
- Source reference markers.
- Forbidden runtime side-effect markers.
