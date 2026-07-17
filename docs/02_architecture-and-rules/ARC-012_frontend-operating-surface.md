# Frontend Operating Surface

Date: 2026-06-07

Status: `FOPS-001_DONE`

Purpose: define the next large frontend development phase for Personal OS. The priority is to make every module operationally clear before adding more persistence or runtime automation.

This is a frontend-first planning document. It does not add routes, database models, migrations, connector runtime, or module writes.

Related docs:

- `AGENTS.md`
- `docs/product/P-PRD-002-next-stage-development-plan.md`
- `docs/architecture/module_map.md`
- `docs/architecture/agent_team_os.md`
- `docs/agents/internal_agents.md`
- `docs/architecture/ai_source_workflow_operating_layer.md`
- `docs/dev/bff_mvp_evaluation_report.md`

## 1. Core Direction

The next large development phase should focus on:

```txt
clear frontend function boundaries
  -> structured module operations
  -> module-specific Agent workspace
  -> module-specific records / audit subpage
  -> reviewed BFF contracts
  -> only then real persistence or automation
```

The goal is not to add more decorative module pages. The goal is to make each module feel like an operating surface with a clear next action, clear state, clear record trail, and a bounded place for AI/agent collaboration.

## 2. Attention Rule

Every page should answer one question immediately:

```txt
What needs my attention here?
```

Attention should not be hidden inside a grid of cards.

Each page should expose:

| Layer | Purpose |
|---|---|
| Attention header | The one to three things that need action or review now. |
| Primary operation surface | The table, queue, timeline, editor, graph, board, or workflow where work happens. |
| Context strip | Scope, filters, selected source/module/project, risk, mode, or agent status. |
| Action rail | Clear commands: create, review, approve, sync, export, assign, archive. |
| Records link | One-click path to history, audit, decisions, workflow runs, and agent logs. |

Design rule:

```txt
Cards are allowed for repeated items or compact summaries.
Cards must not be the default page structure.
```

Prefer:

- tables
- queues
- split panes
- timelines
- editors
- graphs
- kanban/board views when status matters
- compact command bars
- drilldown drawers

Avoid:

- nested cards
- marketing-style hero sections
- too many equal-weight summary cards
- broad dashboards where everything has the same attention weight
- page sections that look like floating card stacks

## 3. Common Module Subpage Pattern

Each major module should eventually follow a shared, predictable pattern while preserving module-specific structure.

```txt
/{module}
  overview / attention / command surface

/{module}/agent
  module agent workspace

/{module}/records
  module records, audit trail, decisions, runs

/{module}/settings or /{module}/boundaries
  permissions, visibility, sync, risk, module-specific governance

/{module}/{domain-subpage}
  module-specific operation surfaces
```

This is a frontend IA contract. The actual route shape can be incremental. A module may first implement the pattern as tabs inside an existing route, then split into real App Router subpages later.

## 4. Module Agent Workspace

Every module should have a module-specific Agent workspace.

The Agent workspace is not a chatbot toy. It is the module's review and collaboration surface for:

- agent suggestions
- source/data context
- proposed actions
- risk alerts
- review queue
- run history
- human approvals/rejections
- module write intents
- unresolved questions

Default structure:

| Area | Purpose |
|---|---|
| Agent attention queue | Items that need human review or decision. |
| Agent conversation / instruction area | Natural-language coworking with module context. |
| Proposal table | Draft actions, summaries, classifications, or write intents. |
| Boundary panel | What the agent can and cannot do in this module. |
| Run log | Recent agent runs, corrections, failures, and approvals. |

Agent workspace rules:

- Agents can propose, summarize, draft, and review.
- Agents cannot silently write high-risk data.
- Agents cannot bypass module service authorization.
- All AI-generated outputs based on internal data must preserve source IDs or evidence refs.
- Human approval is required before public/client-visible, Finance, Life, Company Strategy, Auth/Permission, or external sharing actions.

## 5. Records Subpage

Every module should have a records/audit subpage.

This is where the system remembers what happened.

Records should include:

- user actions
- server action results
- workflow runs
- agent proposals
- approvals and rejections
- module write intents
- source/data provenance
- visibility changes
- sync/import events
- errors and retries

Default presentation:

```txt
filterable table
  + timeline drilldown
  + linked source/module refs
  + risk/approval status
```

Avoid making records a decorative activity card wall.

## 5A. Module-Scoped File/Media Library Subpage

Added per `RES-016_module-scoped-file-and-media-library-tab-and-classification-routing-research.md` (owner-directed, decided 2026-07-16). Every module in scope (§5A.4) should eventually expose a read/export-only File Library and Media Library subpage, in addition to the primary operation, Agent, and Records subpages in §3–§5.

```txt
/{module}/library (or a "檔案庫"/"媒體庫" tab inside the module's existing tab surface)
  read-only File Library — view, open, download/export only
  read-only Media Library — view, open, download/export only
```

### 5A.1 Single Source of Truth, Not Single Capture Surface

Amended per `RES-019_sub-module-upload-sync-and-origin-reference-research.md` (owner-directed, decided 2026-07-16). The invariant is **one canonical asset store**, not "only one UI may create an asset." AI Input (`/ai-input` 檔案庫/媒體庫) remains the default upload/classification entry point, and a module's own File/Media Library subpage (§5A) stays read/export-only — that does not change.

What changes: a **sub-module** surface *inside* a module (a project, a task, a future discussion thread — a level below the module's own library tab) **may** expose an upload affordance, provided it funnels through the same shared asset-creation path the central library uses, so the upload becomes one row in the same store — never a module-local `File[]`/array held only in that component's own state and never written anywhere else. That local-only anti-pattern (uploaded content silently discarded once a dialog closes) is the exact failure `RES-019` found already shipped in `src/components/work/project/add-project-dialog.tsx`, and is the thing this rule forbids — not the existence of a sub-module upload button itself.

A human-initiated sub-module upload creates a `human_confirmed` classification link immediately (§5A.3) — no additional gate, the same way AI Input's own upload already works, including inside high-risk modules, since the human is acting directly inside that module's own UI. Only an *AI-initiated* attach-on-behalf-of-the-owner inside a high-risk module still requires the `ai_suggested` pending gate.

### 5A.2 Classification Model

An asset (file or media) can belong to **one or more** modules at once (e.g. an ESG report relevant to both 工作 and 商會). This is modeled as link rows (`LibraryAssetModuleLink { assetId, assetKind, moduleKey, classificationSource: "ai_suggested" | "human_confirmed" }`) — many rows per asset, each row still naming a single `moduleKey` — rather than an array field, to stay consistent with this repo's pervasive singular-`targetModule` contract convention (`src/lib/contracts/*.ts`). Do not add a raw `moduleKey[]` array field to an asset type; derive the display set from link rows instead.

### 5A.3 Risk Gate

Low-risk modules (`work`, `research`, `chamber`, `self`) may show an AI-suggested classification (`ai_suggested`) directly, labeled with an "AI 分類" badge, editable by the owner. High-risk modules (`finance`, `life`, `company`, per `AGENTS.md` §11) must not surface an AI-suggested classification in their own library subpage until the owner confirms it (`human_confirmed`); until then it is visible only inside AI Input's own library with a pending badge.

### 5A.4 Module Scope (Owner-Decided)

In scope (seven modules): `work`, `research`, `chamber`, `finance`, `life`, `company`, `self`. Out of scope: `ai-input` (already the upload/classification source), `inbox`, `dashboard`, `workflow` (queue/automation-first, not resource-holding). See `RES-016` §0A for the decision record.

### 5A.5 Reuse, Do Not Fork

Module-scoped library subpages must reuse the existing `FileLibraryPage`/`MediaLibraryPage` components (`src/components/ai/file-library/`, `src/components/ai/media-library/`) via a `mode: "full" | "module_readonly"` prop, filtered by `moduleKey`, rather than a bespoke per-module component. `module_readonly` mode hides the upload button and every mutating action (rename, tags, archive/delete, move-workspace, create/update snapshot), keeping only reference/open/view-info/view-versions/view-references plus a `download`/`export` action.

### 5A.6 Sub-Module Upload: Origin Context and Forward Contract

Added per `RES-019`. When a sub-module surface creates an asset (§5A.1), it must attach an origin context so the central library can show where the asset came from and link back to it:

```ts
interface LibraryAssetOriginContext {
  contextType: "project" | "task" | "deliverable" | "discussion_thread" | "chat_message" | "note"
  contextId: string
  contextLabel: string   // e.g. "專案：ESG 導入顧問案"
  href: string           // e.g. "/work/proj-123"
}
```

This is an additive, optional field on the existing `LibraryAssetModuleLink` row (§5A.2) — not a new table, not a `moduleKey[]`-style array, and not a "sync a copy to the central library" model. There is exactly one asset row; the origin context is metadata on its classification link describing which specific sub-module object captured it. AI Input's own library rows render this as a clickable "使用於" (used in) chip, distinct from and additive to the module-classification badges (§5A.2).

**Forward contract for features that do not exist yet:** no task-attachment or discussion-thread-attachment feature is built as of this writing. Whoever builds one later must follow §5A.1 and this section: funnel the upload through the shared asset-creation path, attach an `originContext`, and create a `human_confirmed` link immediately. Do not build a parallel local attachment store for that feature.

## 6. Module-specific Structure Blueprint

| Module | Primary operation surface | Agent subpage | Records subpage | Settings/boundary subpage | Notes |
|---|---|---|---|---|---|
| Dashboard | Morning attention and cross-module brief | `/dashboard/agent` or global assistant panel later | `/dashboard/records` | `/dashboard/settings` | Should remain attention-first, not a metrics card wall. |
| AI Input / Ingestion | Conversation + source workflow console | `/ai-input/agent` or AI 工作台 continuation | `/ai-input/records` | `/ai-input/sync` / `/ai-input/settings` | Existing subpages already point in this direction. |
| Inbox | Source triage queue | `/inbox/agent` | `/inbox/records` | `/inbox/settings` | Should be a queue/table, not only proposal cards. |
| Work | Project list/detail, tasks, notes, deliverables | `/work/agent` | `/work/records` | `/work/boundaries` | WorkAgent reviews project flow, client visibility, deliverables, and write intents. |
| Work project detail | Project command surface | project-level agent drawer or `/work/[projectId]/agent` later | `/work/[projectId]/records` later | client sharing boundary | Project detail can keep tabs but attention should be task/progress/client boundary clear. |
| Research | Research object network, sources, writing, graph | `/research/agent` | `/research/records` | `/research/settings` | ResearchAgent must preserve source/citation metadata and DataUnit evidence. |
| Workflow | Rules, runs, dispatch, audit | `/workflow/agent` | `/workflow/records` | `/workflow/settings` | Existing audit panel should become first-class records. |
| Life | Reflection, health/energy, personal signals | `/life/agent` | `/life/records` | `/life/privacy` | Privacy-first. Low interference. No public sharing. |
| Finance | Drafts, review queue, reports | `/finance/agent` | `/finance/records` | `/finance/policy` | Human approval for final financial writes. |
| Chamber | Contacts, referrals, meetings, opportunities | `/chamber/agent` | `/chamber/records` | `/chamber/privacy` | Relationship context should be operational: contacts, follow-ups, opportunities. |
| Company | Strategy, principles, initiatives, decisions | `/company/agent` | `/company/records` | `/company/boundaries` | High-risk strategy data; no external sharing without approval. |
| Client Portal | Public/client-visible data surface | internal ClientPortalAgent workspace, not public | `/client-portal/records` internal | `/client-portal/visibility` internal | Public page must stay filtered and simple. |
| Agent Team OS | Agent registry, skills, boundaries, audit | `/agents/registry` / `/agents/skills` | `/agents/audit` | `/agents/boundaries` | Future runtime only after governance/local registry is stable. |

## 7. Page Attention Patterns

Use these patterns depending on page type.

### Queue Page

Best for Inbox, Finance drafts, AI WorkItems, review tasks.

```txt
Attention header
  -> filter tabs
  -> table/list queue
  -> detail drawer
  -> decision buttons
```

### Command Surface

Best for Work project detail, Company strategy, Chamber relationship management.

```txt
Attention header
  -> command bar
  -> primary working pane
  -> right-side context/agent drawer
  -> records link
```

### Evidence / Research Surface

Best for Research, Source/DataUnit work.

```txt
Attention header
  -> source/data unit selector
  -> evidence list or graph
  -> writing/annotation pane
  -> citation/provenance drawer
```

### Workflow Surface

Best for Workflow and AI Input.

```txt
Attention header
  -> workflow runs table
  -> work items needing review
  -> run detail timeline
  -> correction/action controls
```

### Private Reflection Surface

Best for Life.

```txt
Attention header
  -> low-interference prompt
  -> timeline/reflection editor
  -> trend view
  -> privacy boundary
```

## 8. Frontend Boundary Rules

Separate these concepts clearly:

| Concept | Should live in | Should not be confused with |
|---|---|---|
| Current conversation context | AI Input `參考脈絡` | sync settings or source registry |
| Source intake rules | AI Input `同步設定` | current AI chat context |
| Review items | Module Agent workspace or AI 工作台 | final module records |
| Final module records | module primary operation surface | AI proposals |
| Audit and run history | module records subpage | decorative activity cards |
| Public/client-visible data | Client Portal boundary views | internal notes/tasks/source records |
| Agent instructions/boundaries | Agent workspace/settings | user-facing content |

## 9. BFF-first Implication

Frontend implementation order:

1. Define module IA and attention model.
2. Prototype UI-only/mock operating surface.
3. Define BFF-visible view models.
4. Add server loaders/actions.
5. Add service-layer authorization.
6. Persist with Prisma only after schema/migration review.
7. Add agent/workflow runtime only after proposal/review boundaries are visible.

This matches the current rule:

```txt
frontend interface first
  -> BFF contract
  -> real function
```

## 10. Next Task Track

Create a new task prefix:

```txt
FOPS-* = Frontend Operating Surface
```

Initial tasks:

| Task id | Title | Mode |
|---|---|---|
| `FOPS-001` | Define frontend operating surface and module attention model | docs/architecture |
| `FOPS-002` | Audit existing module routes against operating surface model | docs/report |
| `FOPS-003` | Prototype common module subpage navigation pattern | UI-only/mock |
| `FOPS-004` | Prototype module Agent workspace shell | UI-only/mock |
| `FOPS-005` | Prototype module records/audit subpage pattern | UI-only/mock |
| `FOPS-006` | Refactor Work IA toward operation/agent/records boundaries | UI-first |
| `FOPS-007` | Refactor Research IA toward evidence/agent/records boundaries | UI-first |
| `FOPS-008` | Define placeholder module operating surfaces for Finance, Chamber, Company, and Life | UI-first |

## 11. Completion Criteria For FOPS-001

This task is complete when the project can answer:

1. What is the common module operating surface?
2. What must every module page show as attention?
3. Where does a module Agent workspace belong?
4. Where do module records and audit trails belong?
5. How are operation pages different from Agent workspaces?
6. How are review items different from final module records?
7. How should modules avoid card-heavy layouts?
8. What are the first FOPS tasks after this planning pass?
9. How does this support BFF-first frontend development?
10. What should not be built yet?

## 12. Not Built Yet

Do not build these in FOPS-001:

- runtime module agent UI
- full `/agents` marketplace
- new Prisma schema
- migrations
- external connector runtime
- cross-module autonomous writes
- public/client-visible agent outputs
- complex redesign of every module in one pass

