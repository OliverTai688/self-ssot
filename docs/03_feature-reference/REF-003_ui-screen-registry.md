# Personal OS UI Screen Registry

**Document ID:** `REF-003`

**Status:** Active — 唯一 UI ID Single Source of Truth

**Approved by:** Product Owner, 2026-08-31

**Last route inventory:** 2026-08-31

**Active UI:** `UI-088` — owner-approved 圓展 v5 fidelity revision — COMPLETED, UI-memory (2026-09-13)

## 1. Registry Authority

This document is the only authoritative UI Screen ID registry for Personal OS.

- Every routable screen receives exactly one stable `UI-XXX` ID here.
- IDs are never renumbered, reused, or inferred from route order.
- `OWNEROS-UI-*`, `UICLEAN-*`, `FOPS-*`, `L3-UI-*`, and similar identifiers remain task, contract, or implementation references. They are not Screen IDs.
- A route rename keeps its UI ID and updates the route/source columns.
- A removed screen keeps a tombstone row with status `RETIRED`; its ID is never recycled.
- A new routable screen must be registered here after Product Owner scope approval and before screen-specific Review begins.
- Layouts, tabs, drawers, dialogs, command palettes, loading states, empty states, error states, and not-found states are dependencies or acceptance states of their parent screen unless the Product Owner explicitly promotes one into a standalone screen.
- No agent may select an Active UI from priority, severity, route order, maturity, or status. The Product Owner names the Active UI.

## 2. Refactor Lifecycle

The `saas-ui-refactor-director` lifecycle is authoritative:

```txt
NOT_REVIEWED -> REVIEWING -> PROPOSAL -> FEEDBACK -> APPROVED
             -> IMPLEMENTING -> VALIDATING -> COMPLETED
```

Rules:

- Naming a UI starts Review only; it does not authorize code changes.
- Only explicit Product Owner approval of the current proposal permits `IMPLEMENTING`.
- Only implementation plus required validation permits `COMPLETED`.
- Returning to a completed UI enters Revision Mode and preserves prior decisions.
- `Refactor status` is not priority and does not claim launch readiness.

## 3. Runtime Truth Labels

| Label | Meaning |
|---|---|
| `PUBLIC_REAL` | Public runtime surface with real route behavior. |
| `AUTH_PROOF_BLOCKED` | Auth path exists, but required real actor/deployed proof is incomplete. |
| `DB_BACKED_PROOF_BLOCKED` | DB-backed path exists, but formal actor/deployment/negative proof is incomplete. |
| `PARTIAL_REAL` | Some real BFF/provider/data behavior exists alongside incomplete persistence, integration, or fallback behavior. |
| `PROTOTYPE` | UI-first, mock/state, local, readiness, or proposal surface; not formal runtime completion. |
| `DRY_RUN_ONLY` | Protected dry-run/proposal behavior; execution remains disabled. |
| `READ_ONLY_CONTROL_PLANE` | Protected inspection/settings/admin surface without the full write lifecycle. |
| `GATED_DEFERRED` | Fail-closed or deferred surface outside the current launch core. |

Runtime truth is descriptive evidence, not a refactor status or Gate result.

## 4. UI Registry

All rows begin at `NOT_REVIEWED` because the skill-based, ID-scoped Human Review process starts with this registry. Earlier UI implementation remains evidence, not implied review completion.

### 4.1 Public And Authentication

| UI ID | Screen | Route | Actor / access | Primary job | Source | Runtime truth | Refactor status |
|---|---|---|---|---|---|---|---|
| `UI-001` | Public Entry | `/` | Public visitor | Understand Personal OS and enter the protected product. | `src/app/page.tsx` | `PUBLIC_REAL` | `NOT_REVIEWED` |
| `UI-002` | Sign In | `/login` | Visitor / invited user | Establish a permitted Personal OS session. | `src/app/(auth)/login/page.tsx` | `AUTH_PROOF_BLOCKED` | `NOT_REVIEWED` |
| `UI-003` | Client Portal | `/client/[token]` | Token-authorized external client | Read only explicitly client-visible project information. | `src/app/client/[token]/page.tsx` | `GATED_DEFERRED` | `NOT_REVIEWED` |

### 4.2 Daily And AI Work

| UI ID | Screen | Route | Actor / access | Primary job | Source | Runtime truth | Refactor status |
|---|---|---|---|---|---|---|---|
| `UI-010` | Today | `/dashboard` | Protected owner/member | See today's attention queue, summary, and next action. | `src/app/(dashboard)/dashboard/page.tsx` | `PARTIAL_REAL` | `NOT_REVIEWED` |
| `UI-011` | AI Work Desktop | `/ai-input` | Protected owner/member | Discuss, capture, attach context, and prepare reviewable proposals. | `src/app/(dashboard)/ai-input/page.tsx` | `PARTIAL_REAL` | `NOT_REVIEWED` |
| `UI-012` | Inbox | `/inbox` | Protected owner/member | Review incoming items and return a text response to its origin. | `src/app/(dashboard)/inbox/page.tsx` | `PROTOTYPE` | `NOT_REVIEWED` |
| `UI-013` | Agent Command Center | `/agents` | Protected owner/operator | Select a bounded agent capability, dry-run it, and inspect the proposal. | `src/app/(dashboard)/agents/page.tsx` | `DRY_RUN_ONLY` | `NOT_REVIEWED` |
| `UI-014` | Workflow | `/workflow` | Protected owner/operator | Inspect and configure reviewable workflow rules and runs. | `src/app/(dashboard)/workflow/page.tsx` | `PROTOTYPE` | `NOT_REVIEWED` |

### 4.3 Work

| UI ID | Screen | Route | Actor / access | Primary job | Source | Runtime truth | Refactor status |
|---|---|---|---|---|---|---|---|
| `UI-020` | Work Portfolio | `/work` | Protected owner / authorized team member | Find projects, see next work, and start an allowed project action. | `src/app/(dashboard)/work/page.tsx` | `DB_BACKED_PROOF_BLOCKED` | `NOT_REVIEWED` |
| `UI-021` | Work Project Detail | `/work/[projectId]` | Project-authorized member | Operate one project's tasks, notes, deliverables, files, and AI proposals. | `src/app/(dashboard)/work/[projectId]/page.tsx` | `DB_BACKED_PROOF_BLOCKED` | `NOT_REVIEWED` |

### 4.4 Research

| UI ID | Screen | Route | Actor / access | Primary job | Source | Runtime truth | Refactor status |
|---|---|---|---|---|---|---|---|
| `UI-030` | Research Desk | `/research` | Protected owner/member | Organize research questions, sources, evidence gaps, and outputs. | `src/app/(dashboard)/research/page.tsx` | `PROTOTYPE` | `NOT_REVIEWED` |
| `UI-031` | Research Thread | `/research/[threadId]` | Research-authorized member | Develop one research thread across ideas, literature, and outputs. | `src/app/(dashboard)/research/[threadId]/page.tsx` | `PROTOTYPE` | `NOT_REVIEWED` |
| `UI-032` | Research Issues | `/research/issues` | Research-authorized member | Find and manage the research issue portfolio. | `src/app/(dashboard)/research/issues/page.tsx` | `PROTOTYPE` | `NOT_REVIEWED` |
| `UI-033` | Research Issue Detail | `/research/issues/[issueId]` | Research-authorized member | Inspect one issue's questions, sources, writing, and relationships. | `src/app/(dashboard)/research/issues/[issueId]/page.tsx` | `PROTOTYPE` | `NOT_REVIEWED` |
| `UI-034` | Research Sources | `/research/sources` | Research-authorized member | Find and classify research source material. | `src/app/(dashboard)/research/sources/page.tsx` | `PROTOTYPE` | `NOT_REVIEWED` |
| `UI-035` | Research People | `/research/people` | Research-authorized member | Track authors, reviewers, speakers, and research relationships. | `src/app/(dashboard)/research/people/page.tsx` | `PROTOTYPE` | `NOT_REVIEWED` |
| `UI-036` | Research Events | `/research/events` | Research-authorized member | Track conferences, CFPs, deadlines, and submission opportunities. | `src/app/(dashboard)/research/events/page.tsx` | `PROTOTYPE` | `NOT_REVIEWED` |
| `UI-037` | Research Exploration Inbox | `/research/exploration` | Research-authorized member | Capture and develop unassigned ideas and hypotheses. | `src/app/(dashboard)/research/exploration/page.tsx` | `PROTOTYPE` | `NOT_REVIEWED` |
| `UI-038` | Research Relationship Graph | `/research/graph` | Research-authorized member | Explore relationships among research objects. | `src/app/(dashboard)/research/graph/page.tsx` | `PROTOTYPE` | `NOT_REVIEWED` |
| `UI-039` | Research Writing | `/research/writing` | Research-authorized member | Manage the research writing portfolio and stage. | `src/app/(dashboard)/research/writing/page.tsx` | `PROTOTYPE` | `NOT_REVIEWED` |
| `UI-040` | Research Writing Project | `/research/writing/[writingProjectId]` | Research-authorized member | Draft and review one writing project. | `src/app/(dashboard)/research/writing/[writingProjectId]/page.tsx` | `PROTOTYPE` | `NOT_REVIEWED` |
| `UI-041` | Research Readiness | `/research/readiness` | Protected owner/operator | Inspect Research formal-readiness blockers and handoffs. | `src/app/(dashboard)/research/readiness/page.tsx` | `READ_ONLY_CONTROL_PLANE` | `NOT_REVIEWED` |

### 4.5 Company

| UI ID | Screen | Route | Actor / access | Primary job | Source | Runtime truth | Refactor status |
|---|---|---|---|---|---|---|---|
| `UI-050` | Company | `/company` | Protected owner / authorized company member | Review private thinking, formal knowledge proposals, policies, and contracts. | `src/app/(dashboard)/company/page.tsx` | `PROTOTYPE` | `NOT_REVIEWED` |

### 4.6 Personal And Deferred Modules

| UI ID | Screen | Route | Actor / access | Primary job | Source | Runtime truth | Refactor status |
|---|---|---|---|---|---|---|---|
| `UI-060` | Self | `/self` | Protected owner | Review private reflection and personal context. | `src/app/(dashboard)/self/page.tsx` | `PROTOTYPE` | `NOT_REVIEWED` |
| `UI-061` | Life | `/life` | Protected owner | Review private life and wellbeing records. | `src/app/(dashboard)/life/page.tsx` | `PROTOTYPE` | `NOT_REVIEWED` |
| `UI-062` | Finance | `/finance` | Protected owner | Review finance drafts without silent finalization. | `src/app/(dashboard)/finance/page.tsx` | `PROTOTYPE` | `NOT_REVIEWED` |
| `UI-063` | Chamber | `/chamber` | Protected owner | Review relationship and chamber follow-up context. | `src/app/(dashboard)/chamber/page.tsx` | `PROTOTYPE` | `NOT_REVIEWED` |

### 4.7 Settings

| UI ID | Screen | Route | Actor / access | Primary job | Source | Runtime truth | Refactor status |
|---|---|---|---|---|---|---|---|
| `UI-070` | Settings | `/settings` | Protected owner/member | Find and change available personal or workspace settings. | `src/app/(dashboard)/settings/page.tsx` | `READ_ONLY_CONTROL_PLANE` | `NOT_REVIEWED` |
| `UI-071` | Language Settings | `/settings/language` | Protected owner/member | Choose and preview the product language. | `src/app/(dashboard)/settings/language/page.tsx` | `READ_ONLY_CONTROL_PLANE` | `NOT_REVIEWED` |
| `UI-072` | Member Settings | `/settings/members` | Protected owner/admin | Review members, invitations, and workspace access. | `src/app/(dashboard)/settings/members/page.tsx` | `READ_ONLY_CONTROL_PLANE` | `NOT_REVIEWED` |
| `UI-073` | Role Settings | `/settings/roles` | Protected owner/admin | Understand roles and effective permission boundaries. | `src/app/(dashboard)/settings/roles/page.tsx` | `READ_ONLY_CONTROL_PLANE` | `NOT_REVIEWED` |
| `UI-074` | AI Sharing Settings | `/settings/ai-sharing` | Protected owner/admin | Control which module context may be shared with Core AI. | `src/app/(dashboard)/settings/ai-sharing/page.tsx` | `READ_ONLY_CONTROL_PLANE` | `NOT_REVIEWED` |

### 4.8 Admin And Operator

| UI ID | Screen | Route | Actor / access | Primary job | Source | Runtime truth | Refactor status |
|---|---|---|---|---|---|---|---|
| `UI-080` | Admin | `/admin` | Protected owner/operator | Find launch, system, audit, RBAC, and AI-governance diagnostics. | `src/app/(dashboard)/admin/page.tsx` | `READ_ONLY_CONTROL_PLANE` | `NOT_REVIEWED` |
| `UI-081` | Admin RBAC | `/admin/rbac` | Protected owner/operator | Inspect effective permissions, denials, and role drift. | `src/app/(dashboard)/admin/rbac/page.tsx` | `READ_ONLY_CONTROL_PLANE` | `NOT_REVIEWED` |
| `UI-082` | Admin AI Governance | `/admin/ai-governance` | Protected owner/operator | Inspect AI capabilities, approval posture, and registration boundaries. | `src/app/(dashboard)/admin/ai-governance/page.tsx` | `READ_ONLY_CONTROL_PLANE` | `NOT_REVIEWED` |
| `UI-083` | Admin Audit | `/admin/audit` | Protected owner/operator | Search authorized operating and governance events. | `src/app/(dashboard)/admin/audit/page.tsx` | `READ_ONLY_CONTROL_PLANE` | `NOT_REVIEWED` |
| `UI-084` | Admin System Readiness | `/admin/system-readiness` | Protected owner/operator | Inspect auth, environment, deployment, provider, and recovery readiness. | `src/app/(dashboard)/admin/system-readiness/page.tsx` | `READ_ONLY_CONTROL_PLANE` | `NOT_REVIEWED` |
| `UI-085` | Admin Detail Index | `/admin/detail` | Protected owner/operator | Choose a detailed diagnostic section. | `src/app/(dashboard)/admin/detail/page.tsx` | `READ_ONLY_CONTROL_PLANE` | `NOT_REVIEWED` |
| `UI-086` | Admin Full Detail | `/admin/detail/all` | Protected owner/operator | Inspect the complete detailed readiness view. | `src/app/(dashboard)/admin/detail/all/page.tsx` | `READ_ONLY_CONTROL_PLANE` | `NOT_REVIEWED` |
| `UI-087` | Admin Section Detail | `/admin/detail/[section]` | Protected owner/operator | Inspect one named diagnostic section. | `src/app/(dashboard)/admin/detail/[section]/page.tsx` | `READ_ONLY_CONTROL_PLANE` | `NOT_REVIEWED` |

## 5. Prior Implementation Reference Mapping

These mappings preserve existing evidence without turning task IDs into Screen IDs:

| Screen ID | Existing task / implementation reference |
|---|---|
| `UI-010` | `OWNEROS-UI-002` dashboard simplification |
| `UI-011` | `OWNEROS-AIINPUT-UI-001` AI Input simplification |
| `UI-013` | `OWNEROS-UI-006` Agent command-center simplification |
| `UI-020`, `UI-030`, `UI-050` | `OWNEROS-UI-005` Work/Research/Company passes |
| `UI-070` | `OWNEROS-UI-003` Settings simplification |
| `UI-080` | `OWNEROS-UI-004` Admin simplification |
| All protected operating surfaces | `OWNEROS-UI-001`, `ARC-036`, and `OWNEROS-BFF-001` are shared pattern/BFF references, not screens. |

## 6. Confirmed Global Decisions

### GD-001 — Operational UI Does Not Contain Rule Manuals

**Decision:** Normal product pages show the primary job, current actionable state, concise restriction or denial reason when required, and the next action. Rule manuals, architecture explanations, launch-gate prose, task IDs, proof instructions, raw capability fields, and long governance explanations belong in the web user manual or Admin diagnostics.

**Exceptions:** Immediate safety confirmation, legal consent, destructive-action warning, permission denial, and setup blocker copy required for a user decision.

**Approved:** Product Owner, 2026-08-30.

### GD-002 — BFF-First UI Boundary

Operational UI follows:

```txt
UI need
  -> typed UI-safe view model
  -> Server Component loader or protected action/route
  -> requireUser()
  -> service-layer authorization
  -> domain service
  -> approved Prisma/provider adapter
  -> mapper/redaction
  -> Client Component interaction
```

Client Components do not receive Prisma models, raw auth claims, provider payloads, secrets, or internal proof packets. This decision constrains implementation but does not add explanatory architecture text to product pages.

## 7. Starting A Screen Review

The Product Owner starts work by naming exactly one ID, for example:

```txt
看 UI-011
```

That changes only the named screen to `REVIEWING`. The review must inspect the registered source, direct components, data/BFF dependencies, prior decisions, responsive behavior, and loading/empty/error states. No code changes occur until the Product Owner approves the resulting proposal.

## 2026-09-13 Owner-approved 圓展 UI phase

本次使用者批准 PLN-070 全階段自主實作，含必要共用元件與套件；既定範圍不逐頁重問，行為或範圍改變才詢問。這個特定授權優先於上方原本的一頁一批預設，其他畫面流程不變。所選 B 空間方案、原型 v4/v5 與 PRD-006 為批准設計，完整修正見 REF-004/decisions.md D09／D10；當前版面以指定 v5 為準。

| UI ID | Screen | Route | Actor / access | Primary job | Source | Runtime truth | Refactor status |
|---|---|---|---|---|---|---|---|
| `UI-088` | 圓展營運工作台 | `/company/operating` | Protected signed-in user; labelled synthetic actor preview | 個人／公司空間，日誌、專案、今日、時間線、文件／Evidence、財務、容量與承諾的 UI 操作 | `src/app/(operating)/company/operating/page.tsx`, `src/components/yuanzhan/*` | `PROTOTYPE` | `COMPLETED` |

UI-088 的 tabs／drawers 是同一工作台的依賴，不新增假 UI ID。另沿用 UI-050 Company sidebar 作入口，原正式模組不替換。獨立 route group 使用原 auth resolver，避免 dashboard root 正式 library loader 將業務資料注入 UI store。
