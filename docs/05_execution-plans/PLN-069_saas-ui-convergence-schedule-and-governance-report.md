# SaaS UI Convergence Schedule And Governance Report

**Document ID:** `PLN-069`
**Status:** Reopened after owner UX review. Marker cleanup and route expansion were completed, but UI-L4 Simplified SaaS product experience is not accepted and must continue through the handoff in `RPT-066`.
**Last updated:** 2026-08-23
**Parent target:** `PLN-068_chinese-first-simplified-saas-ui-convergence-plan.md`
**Runtime implementation:** Not changed by this document

## 1. Purpose

This report turns `PLN-068` into a staged development schedule that can move Personal OS toward:

```txt
UI-L4_FULL_BILINGUAL_SIMPLIFIED_AI_SAAS_CONSOLE
```

The schedule prioritizes a correct SaaS information architecture before visual polishing. It includes:

- design thinking for a calmer Chinese-first bilingual product surface;
- architecture thinking for BFF-first data, RBAC, and AI governance;
- implementation phases with verification and human review points;
- candidate new routes for RBAC and AI governance where the existing pages would become too crowded.

Owner decisions recorded on 2026-08-23:

- `UI-L4` is the immediate target.
- The proposed RBAC, AI governance, audit, system readiness, language, and member/settings routes may be created.
- The proposed RBAC role names are approved.
- Browser skill is an available judgment and verification resource, not a mandatory ritual at every stage. Use it when UI changes accumulate, when visual judgment is needed, or when the implementation needs a stronger basis.
- Core AI default policy requires plain-language explanation before any runtime action execution is enabled.

This document does not approve schema migrations, permission writes, provider activation, public output, autonomous agent execution, external registration, or launch-level upgrades.

## 2. Source Basis

### 2.1 Local Sources

- `AGENTS.md`
- `MAN-000_docs-usage-manual.md`
- `MAN-001_document-index.md`
- `MAN-002_development-loop.md`
- `PRD-001_personal-os-situation.md`
- `PRD-005_situation-driven-prd.md`
- `ACC-001_v0-1-operating-version.md`
- `RES-002_saas-os-operating-surface-maturity-research.md`
- `ARC-028_nanda-agent-protocol-alignment.md`
- `ARC-036_simplified-saas-operating-surface-design-pattern.md`
- `ARC-037_owneros-core-surface-bff-view-model-contract.md`
- `PLN-068_chinese-first-simplified-saas-ui-convergence-plan.md`
- `docs/2_agent-input/generated/agent-loop/reports/personal-os-browser-ui-structure-audit-20260823.md`
- Current sprint/backlog summaries through loop 227.

Local risk found:

- `MAN-001` still references `PRD-004_next-stage-development-plan.md`, but that file was not present in the current worktree during this review. Treat it as documentation drift to resolve separately; this schedule uses `PRD-001`, `PRD-005`, `RES-002`, `ARC-036`, `ARC-037`, and `PLN-068` as the active product basis.

### 2.2 External Sources

RBAC and permission modeling:

- [OpenFGA authorization concepts](https://openfga.dev/docs/authorization-concepts)
- [OpenFGA roles and permissions](https://openfga.dev/docs/modeling/roles-and-permissions)
- [GitHub organization roles](https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/roles-in-an-organization)
- [Stripe user roles](https://docs.stripe.com/get-started/account/teams/roles)
- [Clerk organizations roles and permissions](https://clerk.com/docs/guides/organizations/control-access/roles-and-permissions)
- [Vercel RBAC](https://vercel.com/docs/rbac)

AI governance and agent safety:

- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
- [NIST AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [Project NANDA](https://github.com/projnanda)
- [AgentFacts format](https://github.com/projnanda/agentfacts-format)
- [AgentFacts universal KYA standard](https://agentfacts.org/)

SaaS UI and implementation acceleration:

- [NN/g progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
- [Atlassian navigation system](https://atlassian.design/components/navigation-system)
- [Shopify app home index table composition](https://shopify.dev/docs/api/app-home/patterns/compositions/index-table)
- [IBM Carbon data table usage](https://carbondesignsystem.com/components/data-table/usage/)
- [shadcn/ui](https://ui.shadcn.com/docs)
- [Lucide React](https://lucide.dev/guide/react/)
- [Motion for React](https://motion.dev/docs)
- [Vercel AI Elements](https://elements.ai-sdk.dev/)
- [Magic UI](https://magicui.design/)

### 2.3 External Research Refresh For The Current Execution Pass

Added on 2026-08-23 after a focused implementation-oriented web research pass:

| Lens | Finding | Implementation use |
|---|---|---|
| Personal AI OS | A useful Personal OS is an assistant + memory + skills/agents + durable source layer, not just a decorative dashboard. | Treat `今日` as the daily reasoning surface, `/ai-input` as the capture/review desk, and settings/admin as governance rather than extra content. |
| SSOT | Single source of truth means each durable fact has one authoritative edit location; other surfaces may summarize, reference, or propose. | Normal pages should show summaries/proposals; writes stay behind BFF/service authorization, audit, and approval. |
| Simplified SaaS | Navigation and page hierarchy should reduce orientation cost before adding more features. | Prefer one page job, compact command bars, resource/detail surfaces, consistent empty states, and proof/debug details in admin. |
| Multi-agent / NANDA | Agent ecosystems need identity, discovery, capability metadata, trust boundaries, and observability before external registration. | Keep normal pages focused on what AI can propose; put AgentFacts-lite, risk, approval, and `externalRegisterable=false` posture in admin/governance. |
| Wizard simplification | Progressive disclosure is a strong fit for provider setup because it reveals account, scope, sync, governance, and review only when needed. | Keep source connection creation as a stepper with safety copy, not as a single dense settings form. Use AI Elements/shadcn-style composable primitives later only where they reduce bespoke UI. |

Additional sources used:

- [The Personal AI Operating System](https://www.iwoszapar.com/p/personal-ai-operating-system)
- [Atlassian: building a single source of truth](https://www.atlassian.com/work-management/knowledge-sharing/documentation/building-a-single-source-of-truth-ssot-for-your-team)
- [MuleSoft: what is single source of truth](https://www.mulesoft.com/integration/what-is-single-source-of-truth-ssot)
- [MIT Media Lab NANDA overview](https://nanda.media.mit.edu/)
- [MIT Media Lab: Algorithms to Unlock The Internet of AI Agents](https://www.media.mit.edu/projects/mit-nanda/overview/)
- [Project NANDA](https://projectnanda.org/)
- [NANDA Index architecture paper](https://arxiv.org/html/2508.03101v1)

Rejected implementation shortcuts:

- Do not copy a generic "AI dashboard" layout without Personal OS role-switching and SSOT boundaries.
- Do not turn every page into a chat surface; AI belongs in governed capture/proposal rails.
- Do not enable external agent registration, public output, provider execution, permission writes, or autonomous high-risk actions from this research.
- Do not use Magic UI/animation blocks as decoration unless they clarify state, attention, or transition.

## 3. Current Situation

Recent implementation loops already simplified many core runtime surfaces:

- `/dashboard`
- `/ai-input`
- `/settings`
- `/admin`
- `/work`
- `/research`
- `/company`
- `/agents`

However, browser audit still shows the product does not yet feel like a finished AI SaaS console:

- navigation layers compete with page-level tabs and local controls;
- proof/debug/task IDs leak into normal pages;
- card and border density remains high;
- unavailable states are too technical;
- settings and admin contain many readiness concepts but not yet a mature RBAC/AI governance control plane;
- browser smoke verification has often been deferred in favor of static checkers;
- full language switching is not yet implemented as a real product capability.

The next stage should therefore shift from "per-page simplification" to "whole-product convergence."

## 4. Design Thinking

### 4.1 Product Feeling

Target feeling:

```txt
small team SaaS console
  + personal operating system
  + governed AI command layer
  + Chinese-first calm interface
```

The product should not feel like an internal engineering readiness wall. It should feel like an owner workspace where the system says:

- what matters today;
- which module needs attention;
- what AI is allowed to do;
- what needs owner approval;
- what is blocked by setup, permission, or proof.

### 4.2 Visual And Interaction Rules

Use these rules for every protected route:

| Rule | Meaning |
|---|---|
| One primary job | The first viewport should make the page's job obvious. |
| One global nav | Sidebar is the product map; page tabs are only local views. |
| Command bar over prose | Prefer 1 primary action plus limited secondary actions over explanatory paragraphs. |
| Queue/detail default | Use lists, tables, split panes, detail drawers, and context rails before card grids. |
| Proof in admin | Normal pages show compact state chips; admin keeps task IDs, proof, launch state, and generated evidence. |
| Honest state | Real, demo, mock, proposal-only, manual setup, unavailable, and blocked states remain visible but concise. |
| Chinese-first bilingual | `zh-TW` is default; `en-US` must be available through the same copy keys. |
| AI as governed rail | AI can summarize, propose, draft, and execute only registered low-risk capabilities after policy allows it. |

### 4.3 Target Navigation

Recommended sidebar:

| Group | Routes | Notes |
|---|---|---|
| 今日 | `/dashboard` | Daily summary, next actions, owner comment input, Core AI proposals. |
| AI 工作 | `/ai-input`, `/inbox`, `/agents` | Capture, review, route, dry-run, and inspect AI proposals. |
| 核心作業 | `/work`, `/research`, `/company`, `/workflow` | Mature operating surfaces. |
| 系統 | `/settings`, `/admin` | Owner control plane and operator console. |
| 更多 | `/self`, `/chamber`, `/life`, `/finance`, lower-maturity modules | Collapsed until maturity improves. |

Normal pages should hide task IDs such as `AUTH-005`, `WORK-009`, and `OWNEROS-*`. Admin/detail/proof pages may show them.

### 4.4 Candidate New Routes

Add new routes only when they reduce clutter in existing primary pages.

| Candidate route | Purpose | Why it should exist |
|---|---|---|
| `/settings/language` | Language preference, locale preview, copy coverage status. | Full language switching is now an immediate goal, not future readiness. |
| `/settings/members` | Owner/member/team workspace memberships and invitations. | RBAC must be understandable without burying it in generic settings. |
| `/settings/roles` | Role presets, module grants, resource-level permission preview. | Permissions need a visible matrix before writes expand. |
| `/settings/ai-sharing` | Module-to-Core-AI sharing scope, redaction, retention, allowed actions. | This is the owner-facing control plane for "各 AI 模組向總 AI 分享". |
| `/admin/rbac` | Operator view of role assignments, permission drift, denial reasons, audit refs. | Admin needs proof and troubleshooting beyond normal settings. |
| `/admin/ai-governance` | Capability registry, risk policy, approval modes, blocked actions, AgentFacts posture. | AI governance should not crowd `/ai-input` or `/agents`. |
| `/admin/audit` | Cross-module audit/event records, proof links, filter/search. | Audit should be searchable rather than a wall of readiness cards. |
| `/admin/system-readiness` | Auth/env/deploy/manual-ops readiness. | Keeps setup evidence out of normal owner workflows. |

Route expansion rule:

- Start with nested routes only after the parent page becomes too dense.
- New routes should still share `OwnerOsSurfaceFrame`, command bar, resource index, detail pane, records/audit, and boundary panel.
- Every route must have a BFF view model before runtime data expansion.

## 5. Architecture Thinking

### 5.1 BFF-First Boundary

All UI work should follow:

```txt
UI need
  -> typed view model
  -> Server Component loader or Server Action
  -> requireUser()
  -> service-layer authorization
  -> domain service
  -> Prisma/provider adapter only when approved
  -> mapper
  -> Client Component interaction
```

Client Components receive serializable DTOs only. They must not import Prisma models, provider SDK payloads, raw auth claims, secrets, or internal evidence packets.

### 5.2 RBAC Interface Model

RBAC should be visible as a product control plane, not hidden in code.

Recommended model:

```txt
Workspace
  -> Member
  -> Role assignment
  -> Module grants
  -> Resource grants
  -> Capability grants
  -> Audit event
```

RBAC surfaces:

| Surface | Owner-facing purpose | Admin/operator purpose |
|---|---|---|
| `/settings/members` | Invite, review members, see active workspace membership. | Not the main proof surface. |
| `/settings/roles` | Understand what Owner/Manager/Editor/Viewer can do. | Show only user-safe labels. |
| `/admin/rbac` | Not primary owner workflow. | Inspect effective permissions, denials, drift, stale invitations, and audit. |

Role language:

| Role | Product label | Default posture |
|---|---|---|
| `OWNER` | 擁有者 | Full control; still audited. |
| `MANAGER` | 管理者 | Can manage selected workspace/module operations, not owner transfer by default. |
| `EDITOR` | 編輯者 | Can edit allowed module records. |
| `VIEWER` | 檢視者 | Read-only on granted resources. |
| `GUEST` | 外部訪客 | Explicit grants only; no inheritance. |

Permission UI should include:

- role assignment table;
- effective permission preview;
- "why denied" state;
- pending invite lifecycle;
- resource-level grant preview;
- module visibility and capability grants;
- audit refs for role changes;
- stop labels for unimplemented writes.

Architecture rule:

- Use RBAC for coarse membership roles.
- Keep a path open for relationship/resource grants where a flat role is not enough. OpenFGA-style modeling is a useful reference because workspace/team/resource relationships outgrow flat RBAC quickly.

### 5.3 AI Governance Interface Model

The Core AI must be governed as an internal protected orchestrator.

```txt
Module AI or module page
  -> sharing policy
  -> scoped context package
  -> Core AI inbox
  -> Today summary
  -> action proposal
  -> registered capability
  -> approval policy
  -> service authorization
  -> audit event
```

AI governance surfaces:

| Surface | Purpose |
|---|---|
| `/settings/ai-sharing` | Owner controls what each module can share with Core AI. |
| `/admin/ai-governance` | Operator inspects capability registry, blocked actions, risk levels, and AgentFacts-lite posture. |
| `/dashboard` | Owner sees Today's summary, AI-proposed next actions, and a comment input. |
| `/ai-input` | Owner reviews incoming context and proposals. |
| `/agents` | Owner dry-runs bounded agent commands and sees proof output. |

Core AI AgentFacts-lite posture:

- identity: `personal-os:core-ai-orchestrator`
- lifecycle: internal protected runtime target
- visibility: owner/admin protected
- external registration: `externalRegisterable=false`
- allowed by default: summarize, classify, draft, propose, create low-risk TODO drafts when approved by policy
- blocked by default: public output, external sending, high-risk writes, Finance finalization, permission changes, retention deletion, provider OAuth activation, external agent DB access

Capability registry fields:

| Field | Purpose |
|---|---|
| Capability id | Stable operation key such as `work.todo.create_draft`. |
| Module | Work, Research, Company, Workflow, and so on. |
| Input schema | What the AI or UI may submit. |
| Output schema | What the system returns. |
| Risk level | Low, medium, high, critical. |
| Approval mode | Draft only, owner approve, auto low-risk, disabled. |
| Auth scope | Required user/workspace/module permission. |
| Dry-run support | Whether the action can be simulated. |
| Audit event | Event name and required refs. |
| Rollback note | Undo/compensation policy or "not supported." |

Use NIST AI RMF as the governance lens:

- Govern: define policies, roles, approval, accountability.
- Map: identify context, actors, data, and risk.
- Measure: inspect outputs, denials, audits, drift, and failures.
- Manage: route to approval, rollback, disable, or manual ops.

Use OWASP LLM risk categories as product safety pressure:

- protect against prompt injection and tool misuse;
- validate model outputs before downstream actions;
- prevent sensitive information disclosure;
- limit excessive agency through capability registration, approval, and audit.

### 5.3.1 Core AI Default Policy In Plain Language

The Core AI default policy means:

```txt
AI can read only what you allow
  -> AI can summarize and suggest
  -> AI cannot freely execute every API
  -> executable actions must be registered as capabilities
  -> each capability has risk, permission, approval, dry-run, audit, and rollback rules
```

Practical examples:

| Owner intent | Safe default behavior |
|---|---|
| "幫我整理今天重點" | Core AI can summarize shared module context into `今日`. |
| "這個客戶案幫我排下一步" | Core AI can propose a draft TODO or next-action queue item. |
| "把研究想法轉成工作任務" | Core AI can create a proposal that links source context to a Work TODO draft. |
| "直接寄信給客戶" | Blocked by default; external sending needs explicit owner approval and provider setup. |
| "把 Finance 紀錄改掉" | Blocked by default; Finance is high-risk and stays proposal-only until separately approved. |
| "讓某成員可以看這個專案" | Blocked by default; permission changes require RBAC policy, owner approval, and audit. |

For the owner, the UI should feel like:

- `/settings/ai-sharing`: choose which modules may share what context to Core AI.
- `/dashboard`: see Today's summary and AI-proposed next actions.
- `/ai-input`: review raw context and proposals before they affect modules.
- `/admin/ai-governance`: inspect what AI is allowed to do and why something was blocked.

Owner understanding is required before enabling any real Core AI action runtime. Until then, Core AI action execution remains planning/proposal-only.

### 5.4 Audit And Evidence Model

Audit should be an operator product surface:

```txt
actor
  -> action
  -> target
  -> source refs
  -> agent refs
  -> risk and approval
  -> result
  -> evidence link
  -> retention/rollback status
```

Normal pages show a short history rail. `/admin/audit` owns filters, search, export-readiness, and detailed evidence.

### 5.5 Implementation And Issue Research Algorithm

Use this algorithm until `PLN-069` is genuinely complete.

```txt
Pick earliest incomplete stage
  -> score the page/job understanding quickly
  -> name the authoritative SSOT record and the proposal/derived surfaces
  -> name owner/member/admin/viewer visibility
  -> name whether AI can summarize, propose, draft, dry-run, or execute
  -> implement one small runtime slice
  -> if an issue becomes unclear, run bounded issue research
  -> convert the finding into a task/contract/rule
  -> continue implementation
  -> ask owner only for high-risk approval or product ambiguity
  -> use browser skill when accumulated UI needs visual judgment
```

Decision rules:

| Condition | Action |
|---|---|
| Requirement and risk are clear | Implement the smallest visible or BFF slice now. |
| UI direction is unclear | Research one focused SaaS/Product OS/SSOT reference lens, then update this plan or the relevant contract before coding. |
| RBAC, AI governance, public output, provider, schema, or irreversible writes are involved | Keep runtime proposal-only unless the owner explicitly approves the risky step. |
| A task id or proof detail is needed for engineering traceability | Put it in docs or `/admin`, not in normal owner pages. |
| A component can be accelerated by existing resources | Prefer local shared components first, then shadcn/ui-style composition, lucide-react icons, lightweight Motion micro-interactions, Magic UI blocks only where they improve clarity, and GitHub examples only after adapting to the local design contract. |
| A multi-agent or NANDA-facing feature is involved | Maintain stable identity, capability declaration, auth boundary, trust posture, auditability, and `externalRegisterable=false`. |
| A normal page shows task ids, proof commands, raw readiness walls, or provider details | Move them to docs or `/admin`; replace with a concise state chip and one safe next action. |
| A page cannot be explained to a human in one sentence | Stop broadening the UI; simplify its job or split the route before adding controls. |
| Full bilingual copy is missing on a first-viewport element | Move the copy into `src/lib/i18n/product-copy.ts` before polishing the component. |

Working interpretation from current research:

- Personal OS is treated as memory plus daily operation plus governed AI action, not just a second-brain archive.
- SSOT means each decision, source, proposal, permission, and audit trail needs one official place to inspect and one path to update.
- Simplified SaaS means stable navigation, one primary job per page, compact command bars, resource/detail layouts, and debug/proof state moved into admin.
- Multi-agent/NANDA readiness means agents can collaborate internally only through scoped capabilities and traceable contracts until external registration is explicitly approved.

Future agent prompt supplement:

```txt
Build Personal OS as a closed-loop, SSOT-backed, Chinese-first AI SaaS console.
Every page should be understandable without reading docs, hide engineering task ids from normal users,
and expose one clear next action. AI may capture, summarize, propose, and dry-run; execution requires
registered capability, RBAC/service authorization, auditability, and owner approval. Use research only
when it sharpens implementation, then convert it into a runtime or contract slice. Keep normal pages calm;
put proof, RBAC drift, provider readiness, and AgentFacts/NANDA posture in admin.
```

Final completion report must be created only after the target is actually complete. It will contain:

1. PersonalOS introduction and product feature explanation.
2. RBAC view classification, including route inventory and API inventory.
3. Next development goals, items, and recommendations.

## 6. Multi-Stage Development Schedule

This schedule assumes small reviewable implementation slices. Durations are rough working estimates, not commitments.

### Stage 0 - Owner Approval And Scope Lock

**Goal:** Confirm this schedule before runtime expansion.

| Item | Output |
|---|---|
| Owner decision | Approve, edit, or reject `PLN-069`. |
| Scope lock | Decide whether nested RBAC/AI governance routes can be created now. |
| Backlog expansion | Only after approval, mirror selected stages into `PLN-060` and sprint. |
| Verification rule | Browser skill is available as needed when UI changes accumulate, visual judgment is required, or a stronger UX basis is needed. |

Owner decisions recorded:

- `UI-L4` plus RBAC and AI governance routes are the correct next product target.
- `/settings/roles`, `/settings/ai-sharing`, `/admin/rbac`, and `/admin/ai-governance` may be created as first-class routes.
- Browser skill is not mandatory at every stage, but should be used when accumulated UI changes or uncertain UX decisions need visual evidence.
- Core AI default policy still needs owner understanding before runtime action execution is enabled.

### Stage 1 - Global SaaS Shell, Navigation, And Copy Registry

**Goal:** Make the app structure feel like one SaaS product.

Implementation tasks:

- Create or harden shared navigation grouping: `今日`, `AI 工作`, `核心作業`, `系統`, `更多`.
- Rename `/dashboard` display label to `今日`.
- Hide task IDs from normal owner pages.
- Add typed copy registry with `zh-TW` and `en-US` keys for primary navigation, page headers, state chips, commands, empty states, and form labels.
- Add shared state language for real/demo/mock/proposal/manual setup/blocked.

Likely files:

- `src/components/layout/app-sidebar.tsx`
- shared shell/layout components
- copy/i18n helper files
- route metadata or page header configuration
- route-specific simplified surface components

Verification:

- TypeScript.
- Static UI contract checker.
- Browser skill route walkthrough when sidebar/layout changes accumulate enough to require visual judgment.
- Mobile and desktop screenshots when text fit, navigation density, or first-viewport hierarchy is uncertain.

Human verification:

- Owner confirms nav labels feel like a formal product.
- Owner confirms hidden task IDs do not remove necessary day-to-day information.

### Stage 2 - Full Language Switching

**Goal:** Make bilingual switching real, not just planned.

Implementation tasks:

- Add language preference UI in `/settings/language` or a settings section.
- Add locale provider/server-safe copy helper.
- Persist preference only through the approved current state path. If persistence is not ready, use explicit local/demo state and label it honestly.
- Convert primary protected pages to copy keys:
  - `/dashboard`
  - `/ai-input`
  - `/inbox`
  - `/work`
  - `/research`
  - `/company`
  - `/agents`
  - `/workflow`
  - `/settings`
  - `/admin`

Acceptance:

- Switching `zh-TW` / `en-US` changes visible labels without route rewrites.
- Internal ids remain in admin/docs only.
- No mixed Chinese/English debug labels appear on normal owner pages unless intentional.

Verification:

- TypeScript.
- Copy coverage checker.
- Browser skill walkthrough on representative bilingual pages when copy/layout judgment needs visual evidence.

Human verification:

- Owner validates Traditional Chinese tone and English fallback quality.

### Stage 3 - Today, AI Input, Inbox Return Path

**Goal:** Make the core daily loop usable.

Product loop:

```txt
今日
  -> owner comment
  -> Core AI proposal
  -> AI Input review
  -> Inbox/source routing
  -> module TODO/API proposal
  -> audit
  -> return to 今日
```

Implementation tasks:

- `/dashboard` becomes `今日` with daily summary, action queue, comment input, module freshness, and AI proposal queue.
- `/ai-input` focuses on capture/review/route, with source/conversation index and proposal rail.
- `/inbox` becomes the return path for unresolved context and free-text replies.
- Keep provider/model calls disabled unless separately approved; UI can show proposal/dry-run state first.

Architecture requirements:

- Define Today BFF view model.
- Define owner comment DTO.
- Define AI proposal DTO.
- Define Inbox return-path DTO.
- Connect to existing OwnerConversation contract where safe.

Verification:

- Browser skill actor journey when enough Today/AI Input/Inbox interaction has accumulated:
  1. Open `今日`.
  2. Enter a comment.
  3. See proposal or dry-run placeholder.
  4. Navigate to AI Input.
  5. Return through Inbox.
- Static checkers and TypeScript.

Human verification:

- Owner confirms whether the daily loop matches how they want to work each morning and during interruptions.

### Stage 4 - RBAC And Team/Member Control Plane

**Goal:** Make roles, membership, and visibility understandable before expanding team workflows.

Implementation tasks:

- Add `/settings/members` for members, invitations, active workspace, pending/revoked states.
- Add `/settings/roles` for role matrix and effective permission preview.
- Add `/admin/rbac` for permission proof, drift, denials, and audit refs.
- Keep writes disabled or proposal-only unless existing service authorization and approval are already safe.

Architecture requirements:

- `requireUser()` for all protected RBAC surfaces.
- Service-layer authorization before any membership or permission mutation.
- Role assignment and resource grant DTOs.
- Effective permission preview.
- Denial reason vocabulary.
- Audit refs for every role-changing action.

Acceptance:

- Owner can answer "who can see or do what?" from settings.
- Admin can answer "why was this allowed or denied?" from admin.
- Guest/external users do not inherit broad access.

Verification:

- TypeScript.
- RBAC contract checker.
- Browser skill route walkthrough for owner/admin flows when route structure or denial states need visual judgment.
- Negative-state UI: viewer/editor/manager/owner labels, disabled actions, denial reasons.

Human verification:

- Owner validates role names and permission expectations before writes are enabled.

### Stage 5 - AI Governance And Capability Registry

**Goal:** Make Core AI powerful but bounded.

Implementation tasks:

- Add `/settings/ai-sharing` for module sharing scope, redaction, retention, allowed actions, and approval mode.
- Add `/admin/ai-governance` for capability registry, AgentFacts-lite posture, risk policy, blocked actions, dry-run support, and audit readiness.
- Add UI for low-risk capability proposals:
  - create draft TODO;
  - update TODO status after approval;
  - add note/comment;
  - link source to task;
  - prepare summary.
- High-risk actions remain blocked and visible:
  - send external message;
  - publish client-visible output;
  - modify Finance final records;
  - delete retained context;
  - change permissions;
  - provider OAuth/external registration.

Architecture requirements:

- Core AI remains internal protected.
- `externalRegisterable=false`.
- Capability registry is typed and checked.
- Every capability maps to auth, approval, dry-run, audit, and rollback.

Verification:

- NANDA/AgentFacts checker.
- Capability registry checker.
- Browser skill UI verification for settings/admin governance when risk/control clarity cannot be judged statically.
- No public output, provider call, DB write, or external registration unless separately approved.

Human verification:

- Owner validates module sharing defaults and which low-risk actions can eventually be auto-executed.

### Stage 6 - Module Surface Convergence

**Goal:** Bring core modules into one consistent operating grammar.

Priority order:

1. Work
2. Research
3. Company
4. Workflow
5. Self
6. Chamber
7. Life
8. Finance

Implementation tasks:

- Each module uses:
  - header;
  - command bar;
  - resource index;
  - detail pane;
  - AI proposal rail;
  - records/audit;
  - settings/boundary;
  - real/demo/mock/proposal/manual setup state.
- Secondary or immature modules stay under `更多`.
- Finance/Life/Company high-risk writes stay draft/proposal-only until owner approval and audit are complete.

Verification:

- Per-module static checker.
- Batch browser skill first-viewport screenshots after several module pages change or when layout quality is uncertain.
- Route smoke across desktop/mobile.

Human verification:

- Owner checks whether each module's primary job is obvious within five seconds.

### Stage 7 - Admin, Audit, Manual Ops, And System Readiness

**Goal:** Make `/admin` the place where engineering truth lives.

Implementation tasks:

- Add `/admin/audit` as searchable cross-module event/evidence surface.
- Add `/admin/system-readiness` for auth/env/deploy/manual-ops proof.
- Keep `/admin/detail/all` as archive, but do not make it the default operating page.
- Add filters for blockers, proof family, module, risk, freshness, and owner action.

Acceptance:

- Normal owner pages are clean.
- Admin pages can still expose exact task IDs, proof packets, and diagnostic status.
- Owner can quickly find what manual setup is blocking the next level.

Verification:

- Admin checker.
- Browser skill audit route walkthrough when proof density or operator scanability is uncertain.
- No-secret scan.

Human verification:

- Owner confirms admin is useful for operations without polluting normal workflow.

### Stage 8 - Whole-Site Browser UX Review

**Goal:** Confirm the product feels coherent.

Browser skill route set:

- `/dashboard`
- `/ai-input`
- `/inbox`
- `/work`
- `/research`
- `/company`
- `/workflow`
- `/agents`
- `/settings`
- `/settings/language`
- `/settings/members`
- `/settings/roles`
- `/settings/ai-sharing`
- `/admin`
- `/admin/rbac`
- `/admin/ai-governance`
- `/admin/audit`
- `/admin/system-readiness`
- public `/`
- `/login`
- `/client/[token]` fail-closed sample

Checks:

- first viewport is understandable;
- no text overlap;
- no overwhelming card walls;
- no normal-page task IDs;
- state chips are understandable;
- language switch works;
- sidebar grouping works;
- mobile layout remains usable;
- AI and RBAC controls are visibly gated.

Human verification:

- Owner runs or watches the browser walkthrough and marks pass/fail by route.

### Stage 9 - Owner Acceptance And Next Gate Decision

**Goal:** Request human verification before claiming UI convergence complete.

Owner acceptance checklist:

- I can understand `今日` without reading docs.
- I can switch Chinese/English and still operate primary pages.
- I can find AI Input, Inbox, Work, Research, Company, Workflow, Settings, Admin, and More.
- I can understand which modules share context to Core AI.
- I can see what Core AI is allowed to propose or execute.
- I can understand who has access to what.
- I can find proof/manual setup only when I need it.
- I can complete the daily loop without seeing engineering task IDs.

Completion claim:

- `UI-L4` can be claimed only after owner acceptance and enough static, runtime, or browser-assisted verification to support the claim.
- Browser skill should be used when visual proof is needed, route changes have accumulated, or the implementation needs a stronger UX judgment basis.
- Gate A/B/C remain separate and require their own runtime, auth, data, negative, deployment, and no-mock evidence.

## 7. Proposed Milestone Table

| Milestone | Main outcome | Rough effort | Browser skill cadence | Human verification |
|---|---|---:|---|---|
| M0 | Owner approves `PLN-069` | 0.5 day | No | Yes |
| M1 | Unified shell/nav/copy registry | 1-2 days | Use when layout judgment is needed | Yes |
| M2 | Full language switching | 1-2 days | Use for representative bilingual pages | Yes |
| M3 | Today + AI Input + Inbox loop | 2-3 days | Use for actor journey review | Yes |
| M4 | RBAC settings/admin routes | 2-3 days | Use for route structure and denial states | Yes |
| M5 | AI governance settings/admin routes | 2-3 days | Use for risk/control clarity | Yes |
| M6 | Module convergence | 3-5 days | Batch after several module pages | Yes |
| M7 | Admin/audit/manual ops consolidation | 1-2 days | Use if proof density is hard to judge statically | Yes |
| M8 | Whole-site UX review and fixes | 1-2 days | Full route review recommended | Yes |
| M9 | Owner acceptance and next Gate decision | 0.5 day | Optional owner/agent walkthrough | Yes |

## 8. Implementation Task Candidates

These task ids are proposed for owner review. Mirror them into backlog only after approval.

| Task id | Scope | Acceptance | Verification | Stop conditions |
|---|---|---|---|---|
| `OWNEROS-SCHED-001` | Approve this schedule and route stages into sprint/backlog. | Owner approvals and remaining Core AI clarification are recorded in `PLN-069`. | Docs review. | Do not enable Core AI runtime actions until owner understands and confirms the policy. |
| `OWNEROS-NAV-001` | Implement global sidebar grouping and `/dashboard` label `今日`. | Sidebar groups match `PLN-068`; secondary modules under `更多`; normal pages hide task IDs. | Typecheck, static checker, browser route review if layout judgment is needed. | Stop before changing auth or data loading. |
| `OWNEROS-I18N-002` | Implement full `zh-TW` / `en-US` primary shell switching. | Language preference changes primary protected page labels. | Copy checker, representative browser bilingual walkthrough when useful. | Stop before risky persistence if preference storage is unclear. |
| `OWNEROS-TODAY-002` | Build Today summary/comment/proposal UI contract. | `今日` shows daily summary, owner comment, proposals, module freshness. | Typecheck, static checker, browser actor journey when useful. | No provider call or autonomous execution without approval. |
| `OWNEROS-RBAC-001` | Create RBAC settings/admin view-model contract. | Members, roles, effective permissions, denials, audit refs modeled. | RBAC checker. | Stop before permission writes or schema migration. |
| `OWNEROS-RBAC-002` | Add `/settings/members`, `/settings/roles`, `/admin/rbac` UI shells. | Owner/admin can inspect access model and pending states. | Typecheck, RBAC checker, browser route walkthrough when useful. | No invitation/membership mutation unless selected separately. |
| `OWNEROS-AIGOV-001` | Create Core AI governance and capability registry contract. | Module sharing, capability risk, approval, dry-run, audit, AgentFacts posture modeled. | NANDA/capability checker. | No public output, provider activation, or external registration. |
| `OWNEROS-AIGOV-002` | Add `/settings/ai-sharing` and `/admin/ai-governance` UI shells. | Owner can see sharing policies; admin can inspect risk/blocked actions. | Typecheck, capability checker, browser route walkthrough when useful. | No high-risk writes or external agent DB access. |
| `OWNEROS-MODULE-UI-001` | Normalize Work/Research/Company/Workflow first. | Shared page grammar and compact proof state. | Static checkers; batch browser review after accumulated page changes. | Stop before high-risk final writes. |
| `OWNEROS-AUDIT-001` | Add `/admin/audit` and `/admin/system-readiness` shells. | Proof/manual ops searchable in admin, not normal pages. | Admin checker; browser review if proof density is hard to judge statically. | No env/provider/deploy mutation. |
| `OWNEROS-UX-REVIEW-001` | Run full browser UX review and fix highest-friction issues. | Owner-facing UI passes route checklist. | Browser skill screenshots and route notes. | Do not claim Gate A/B/C without separate evidence. |

## 9. Owner Decisions And Remaining Clarification

Owner has approved:

1. `UI-L4` as the immediate target: full `zh-TW` / `en-US` switching plus simplified SaaS console.
2. Route expansion for:
   - `/settings/language`
   - `/settings/members`
   - `/settings/roles`
   - `/settings/ai-sharing`
   - `/admin/rbac`
   - `/admin/ai-governance`
   - `/admin/audit`
   - `/admin/system-readiness`
3. RBAC role names:
   - `擁有者 / OWNER`
   - `管理者 / MANAGER`
   - `編輯者 / EDITOR`
   - `檢視者 / VIEWER`
   - `外部訪客 / GUEST`
4. Browser skill cadence:
   - It is not mandatory at every stage.
   - Use it when UI changes accumulate, visual hierarchy is uncertain, or a stronger judgment basis is needed.
   - Treat it as an available resource for route walkthroughs and screenshots, not as a fixed ceremony.

Still needs owner understanding before runtime action enablement:

- Core AI default policy:
  - module sharing is opt-in;
  - Core AI may summarize and propose;
  - TODO/API actions must be registered, authorized, audited, and approval-gated;
  - high-risk actions stay blocked.

Recommended owner decision:

```txt
Approve PLN-069 with staged execution.
Start with OWNEROS-NAV-001, OWNEROS-I18N-002, OWNEROS-TODAY-002.
Then implement RBAC and AI governance routes before module-wide visual polish.
```

## 10. Completion Definition

`PLN-068` purpose is complete only when:

- primary protected pages share one coherent SaaS structure;
- `/dashboard` is clearly `今日`;
- normal pages hide task IDs and raw proof walls;
- full `zh-TW` / `en-US` switching works;
- sidebar grouping and `更多` behavior are browser-verified;
- `/settings` exposes language, members/roles, module AI sharing, source boundaries, profile/workspace, and manual ops;
- `/admin` exposes RBAC proof, AI governance, audit, system readiness, and evidence;
- Core AI proposal/action surfaces are governed by capability registry, approval, audit, and `externalRegisterable=false`;
- RBAC effective permission and denial states are visible before writes expand;
- browser skill or owner walkthrough has been used when the UI has accumulated enough changes or when visual judgment was needed;
- the owner signs off through the checklist in Stage 9.

Until then, the UI target remains in progress. Gate A/B/C launch gates remain governed by their own evidence requirements.

## 11. Implementation Progress

### 2026-08-23 Runtime Slice

Completed in the first implementation-first pass:

| Area | Result | Files |
|---|---|---|
| `OWNEROS-NAV-001` | Sidebar now uses a simplified SaaS structure: `今日`, `AI 工作`, `核心作業`, `系統`, and collapsed `更多`. Secondary modules moved under `更多`; `/dashboard` displays as `今日`; normal navigation no longer uses `早安簡報` or `AI 匯入`. | `src/components/layout/app-sidebar.tsx`, `src/types/module-permission.ts`, `src/lib/mock/ai-panel/mock-responses.ts`, `src/app/(dashboard)/ai-input/ai-input-client.tsx` |
| Copy foundation | Added a typed product copy registry for `zh-TW` and `en-US` primary shell labels. | `src/lib/i18n/product-copy.ts` |
| `OWNEROS-I18N-002` partial | Added `ProductLanguageProvider` with localStorage preference. Sidebar and quick-capture header/modal now respond to `zh-TW` / `en-US`; `/settings/language` exposes an interactive language selector. | `src/lib/context/product-language-context.tsx`, `src/components/layout/app-header.tsx`, `src/app/(dashboard)/layout.tsx`, `src/components/owneros/language-settings-panel.tsx` |
| `OWNEROS-I18N-002` control-plane coverage | Added locale-aware rendering and English fallback content for settings/admin child control-plane pages. `/settings/language`, `/settings/members`, `/settings/roles`, `/settings/ai-sharing`, `/admin/rbac`, `/admin/ai-governance`, `/admin/audit`, and `/admin/system-readiness` now switch the shared control-plane headings, stats, tables, matrices, actions, and boundary note through the same product language context. | `src/components/owneros/control-plane-page.tsx`, `src/components/owneros/language-settings-panel.tsx`, `src/lib/owneros/control-plane-pages.ts` |
| `OWNEROS-RBAC-002` partial | Added read-only settings/admin route shells for members, roles, and RBAC inspection. | `src/app/(dashboard)/settings/members/page.tsx`, `src/app/(dashboard)/settings/roles/page.tsx`, `src/app/(dashboard)/admin/rbac/page.tsx` |
| `OWNEROS-AIGOV-002` partial | Added read-only route shells for AI sharing and AI governance, preserving `externalRegisterable=false` and proposal-only runtime posture. | `src/app/(dashboard)/settings/ai-sharing/page.tsx`, `src/app/(dashboard)/admin/ai-governance/page.tsx` |
| `OWNEROS-AUDIT-001` partial | Added read-only admin route shells for audit and system readiness / Manual Ops. | `src/app/(dashboard)/admin/audit/page.tsx`, `src/app/(dashboard)/admin/system-readiness/page.tsx` |
| Shared control plane | Added a reusable route-shell model and renderer so settings/admin child pages use the same compact SaaS pattern. | `src/lib/owneros/control-plane-pages.ts`, `src/components/owneros/control-plane-page.tsx` |
| `OWNEROS-TODAY-002` partial | Rebuilt `/dashboard` as the `今日` owner daily loop: summary metrics, compact action queue, owner comment input, local Core AI proposal draft, AI Workbench review link, Inbox return path, and compact admin handoff. Engineering task ids and proof commands no longer render in the normal Today page. | `src/app/(dashboard)/dashboard/page.tsx`, `src/app/(dashboard)/dashboard/today-client.tsx` |
| `OWNEROS-TODAY-002` BFF step | Upgraded the owner comment flow from local-only state to a protected server action and BFF DTO. The action calls `requireUser()`, validates input, returns a review-required Core AI proposal draft, and keeps provider calls, DB writes, public output, permission changes, and external registration disabled. | `src/app/(dashboard)/dashboard/actions.ts`, `src/lib/contracts/today-proposal.contract.ts`, `src/lib/services/today-proposal.service.ts`, `src/app/(dashboard)/dashboard/today-client.tsx` |
| Control-plane BFF step | Moved settings/admin child route shells behind a server-only loader that calls `requireUser()` before returning UI-safe view models. This keeps RBAC, AI governance, audit, and system readiness route expansion aligned with the BFF-first boundary before future writes. | `src/lib/services/owneros-control-plane.service.ts`, `src/app/(dashboard)/settings/*/page.tsx`, `src/app/(dashboard)/admin/*/page.tsx` |
| RBAC / AI governance inspection matrices | Added owner/admin matrix sections for role posture, module-to-Core-AI sharing policy, effective permission scenarios, denial reasons, and capability registry draft. This upgrades the control plane from prose-only readiness to a reviewable SaaS surface while keeping permission writes, provider calls, public output, and external agent registration disabled. | `src/lib/owneros/control-plane-pages.ts`, `src/components/owneros/control-plane-page.tsx` |
| Settings hub convergence | Replaced the proof-heavy `/settings` parent page with a bilingual owner control hub: language, members, roles, AI sharing, current state, safety boundaries, and a lower-priority module visibility rehearsal. Detailed proof and diagnostics now route toward Admin surfaces instead of occupying the first viewport. | `src/app/(dashboard)/settings/page.tsx`, `src/app/(dashboard)/settings/settings-hub-client.tsx` |
| Admin hub convergence | Replaced the heavy `/admin` parent page with a lightweight bilingual operator hub using `getAdminLaunchOverview()`. RBAC, AI governance, audit, system readiness, and full detail routes are now first-class entry points; `/admin/detail/all` now renders the detail shell instead of reusing the overview page. | `src/app/(dashboard)/admin/page.tsx`, `src/app/(dashboard)/admin/admin-hub-client.tsx`, `src/app/(dashboard)/admin/detail/all/page.tsx` |
| Language hydration fix | Changed `ProductLanguageProvider` to render the server-safe default locale first, then read localStorage after hydration. This removes route-level hydration mismatch while preserving local bilingual switching. | `src/lib/context/product-language-context.tsx` |
| Language metadata sync | Changed the root HTML default language to `zh-Hant-TW` and synced `document.documentElement.lang` from the active product language. This makes full language switching semantically consistent for the browser and assistive tooling, not only visually translated. | `src/app/layout.tsx`, `src/lib/context/product-language-context.tsx` |
| Shared control copy convergence | Moved global quick capture, account access control, mock/live state copy, and AI Input top-level surface copy into the typed product copy registry. This reduces hard-coded language drift in shared controls. | `src/lib/i18n/product-copy.ts`, `src/components/layout/app-header.tsx`, `src/components/layout/module-settings-control.tsx` |
| AI Input first-screen bilingual pass | Connected `/ai-input` subpage nav, hero/work desk, mock/live notice, chat landing title, quick prompts, cowork starters, input placeholders, import labels, and active mode labels to the product copy registry. English mode now has a coherent first-screen AI SaaS workspace instead of a mixed Chinese/English shell. | `src/lib/i18n/product-copy.ts`, `src/app/(dashboard)/ai-input/ai-input-client.tsx` |
| AI Input hydration stability | Replaced the default AI Input thread reference generated during initial render with a deterministic local reference. New user-created/source-created threads still generate references from client-side events, while initial server/client render no longer mismatches on the visible reference code. | `src/app/(dashboard)/ai-input/ai-input-client.tsx` |
| AI Input active-chat and subpage bilingual pass | Moved active-chat import status, import actions, idle-import hint, imported-safe state, thread menu labels, delete dialog copy, conversation transcript labels, system import messages, and AI Input subpage shell titles/descriptions into the product copy registry. This narrows the remaining AI Input language debt to deeper demo/source data rows and specialized source/workbench tables. | `src/lib/i18n/product-copy.ts`, `src/app/(dashboard)/ai-input/ai-input-client.tsx` |
| AI Input bilingual response pass | Added locale-aware provider instructions and local fallback responses for normal AI Input chat. English mode now asks configured providers to answer in English and falls back to English mock replies when provider calls are unavailable. This keeps runtime execution policy unchanged and does not enable new providers, DB writes, public output, or external registration. | `src/app/(dashboard)/ai-input/actions.ts`, `src/app/(dashboard)/ai-input/ai-input-client.tsx` |
| AI Input source-cowork transcript bilingual pass | Moved quick-import generated source coworking thread titles, toast copy, and LINE/RSS/Google Doc/Markdown/Image/Audio/Link/default coworking transcript messages into the product copy registry. English mode now creates English source coworking threads for mock imports while keeping provider execution disabled. | `src/lib/i18n/product-copy.ts`, `src/app/(dashboard)/ai-input/ai-input-client.tsx` |
| AI Input reference-control bilingual pass | Moved source reference suffixes, reference display prefix/separator, duplicate-reference toast, reference-added toast, and file/media reference descriptions into the product copy registry. Image/audio quick-import handlers now pass localized labels into generated source coworking thread titles instead of hard-coded Chinese labels. | `src/lib/i18n/product-copy.ts`, `src/app/(dashboard)/ai-input/ai-input-client.tsx` |
| AI Input workbench shell bilingual pass | Moved workbench console header, mock/formal badge, stat labels, notices, local tab labels, table titles, table columns, descriptions, empty states, pending proposal copy, and workflow status badges into the product copy registry. English mode now presents the AI Workbench shell and core table frame in English; row-level demo source data remains a separate data localization slice. | `src/lib/i18n/product-copy.ts`, `src/app/(dashboard)/ai-input/ai-input-client.tsx` |
| AI Input source-settings shell bilingual pass | Moved the source settings drawer title, boundary tooltip, description, add/manage connection actions, connected/setup/review counters, table title/columns/description, empty state, last/next sync labels, and connection/sync status badges into the product copy registry. English mode now presents the source settings control frame in English; row-level source data remains a separate data localization slice. | `src/lib/i18n/product-copy.ts`, `src/app/(dashboard)/ai-input/ai-input-client.tsx` |
| AI Input source-settings row bilingual pass | Added locale-aware mock source row copy for source index and source settings table data: source names, module labels, next actions, cadence, sync timestamps, risk labels, provider/type labels, missing-permission labels, and provenance labels. This keeps source governance visible in English mode without changing provider execution, persistence, or authorization posture. | `src/lib/i18n/product-copy.ts`, `src/app/(dashboard)/ai-input/ai-input-client.tsx` |
| AI Input workbench row bilingual pass | Added locale-aware mock row copy for AI Workbench workflow runs, review items, source environments, organizing results, and work log entries. English mode now presents the AI Workbench table rows in English, while the runtime remains mock/read-only and does not run sync, provider calls, DB writes, public output, or external registration. | `src/lib/i18n/product-copy.ts`, `src/app/(dashboard)/ai-input/ai-input-client.tsx` |
| AI Input source-settings review-policy bilingual pass | Moved the source settings human review policy table title, columns, description, and row copy into the product copy registry. English mode now explains risk, routing uncertainty, and source-quality handling without falling back to Chinese-only policy text. | `src/lib/i18n/product-copy.ts`, `src/app/(dashboard)/ai-input/ai-input-client.tsx` |
| AI Input source-settings existing-connection drawer copy pass | Added locale-aware copy for the existing-connection settings drawer tabs, sync/analysis policy fields, node labels/placeholders, routing module options, approval policy options, governance/privacy labels, action buttons, and save toast. Added explicit `type="button"` plus `onMouseDown` fallback for drawer tab buttons to reduce tab-click ambiguity. | `src/lib/i18n/product-copy.ts`, `src/app/(dashboard)/ai-input/ai-input-client.tsx` |
| AI Input source-connection wizard bilingual pass | Converted the mock/draft source connection wizard into a copy-driven flow for `zh-TW` and `en-US`: dialog header, stepper, provider cards, account status and impact preview, RSS/Gmail scope controls, sync/analysis options, governance settings, review summary, fail-closed state, footer actions, and success state now read from the product copy registry. The provider manifest remains fail-closed and this change does not enable OAuth, webhooks, provider calls, DB writes, public output, or external registration. | `src/components/ai/source-connections/source-connection-wizard.tsx`, `src/lib/i18n/product-copy.ts` |
| AI Input source-settings drawer tab semantics | Replaced the existing-connection drawer's ad hoc tab buttons with proper `tablist` / `tab` / `tabpanel` semantics, stable `data-source-settings-tab` hooks, `aria-selected`, `aria-controls`, and left/right keyboard movement. Browser verification confirmed `治理隱私` now switches to the governance panel. | `src/app/(dashboard)/ai-input/ai-input-client.tsx`, `src/lib/i18n/product-copy.ts` |
| Inbox return-path bilingual pass | Moved `/inbox` page chrome, mock import actions, tabs, tab descriptions, empty states, processing summaries, high-confidence review banner, source cards, source/status badges, lineage labels, normalized preview labels, evidence copy, and AI proposal card actions/statuses into the product copy registry. A targeted source scan now shows no Chinese hard-coded strings in the Inbox runtime files outside the `zh-TW` copy registry. This keeps the Inbox return path language-switchable without changing ingestion persistence, provider calls, DB writes, public output, or external registration. | `src/app/(dashboard)/inbox/page.tsx`, `src/components/ingestion/source-item-card.tsx`, `src/components/ingestion/normalized-content-preview.tsx`, `src/components/ingestion/source-type-badge.tsx`, `src/components/ingestion/processing-status-badge.tsx`, `src/components/ingestion/data-lineage-pipeline.tsx`, `src/components/ingestion/evidence-list.tsx`, `src/components/ai/triage-proposal-card.tsx`, `src/lib/i18n/product-copy.ts` |
| Agents command center bilingual pass | Moved `/agents` header, owner-only blocked state, command-center summary, route labels, dry-run/proposal controls, proposal packet panel, proof panel, parity panel, safety state, and module readiness table chrome into the product copy registry. Operation IDs, CLI/HTTP proof data, safety keys, and contract-provided command labels remain view-model data. This change keeps the Agent command surface internal, dry-run/proposal-only, and `externalRegisterable=false`; it does not enable execute mode, provider calls, DB writes, public output, or external registration. | `src/app/(dashboard)/agents/page.tsx`, `src/app/(dashboard)/agents/agent-command-center-client.tsx`, `src/lib/i18n/product-copy.ts` |
| Workflow automation surface bilingual pass | Moved `/workflow` header, enabled-rule/message summary, primary action, rules/audit tabs, agent registry labels, flow legend, rule list chrome, rule builder dialog controls, audit trail status labels, relative-time labels, agent names, and intent names into the product copy registry. Existing mock rule names, trace summaries, and message summaries remain row-level demo data for a later data-localization slice. This change does not enable workflow execution, provider calls, DB writes, public output, permission writes, or external agent registration. | `src/app/(dashboard)/workflow/page.tsx`, `src/app/(dashboard)/workflow/components/agent-registry-panel.tsx`, `src/app/(dashboard)/workflow/components/flow-visualizer.tsx`, `src/app/(dashboard)/workflow/components/rule-list.tsx`, `src/app/(dashboard)/workflow/components/rule-builder-dialog.tsx`, `src/app/(dashboard)/workflow/components/audit-trail.tsx`, `src/lib/i18n/product-copy.ts` |
| Work main operating desk bilingual pass | Moved `/work` main operating desk chrome, status/health/phase/visibility labels, role labels used by the first viewport, module view tabs, library toggle labels, agent proposal panel, records panel, settings/boundary panel, command bar, project queue summary, project readiness labels, client boundary rail, and attention strip into the product copy registry. DB project names, client names, workspace names, deep project-list copy, invitation flows, and project detail components remain separate Work localization slices. This change does not alter team workspace authorization, persistence, project writes, public output, provider calls, or external agent registration. | `src/app/(dashboard)/work/work-client.tsx`, `src/lib/i18n/product-copy.ts` |
| Work project list/card bilingual pass | Moved the `/work` workspace selector copy, workspace warning/fail-closed copy, focus/all-project headings, team read-only hint, project-list empty states, project filter tabs/sort labels, project card badges, role/access labels, progress labels, due-date language, client visibility, and read-only aria labels into the product copy registry. DB-backed project names, client names, workspace names, next actions, and external source values remain SSOT data. Add-project dialog, team collaboration/invitation sheets, and project detail subpages remain follow-up Work localization slices. | `src/app/(dashboard)/work/work-client.tsx`, `src/components/work/project/project-filter-bar.tsx`, `src/components/work/project/project-card.tsx`, `src/components/work/project/project-focus-card.tsx`, `src/lib/i18n/product-copy.ts` |
| Work add-project dialog bilingual pass | Moved the create-project trigger, dialog title, manual/AI mode labels, manual fields, upload dropzone, parse failure, file remove aria template, AI parsing state, editable preview fields, timeline/milestone labels, deliverable heading, success state, fallback error, and submit buttons into the product copy registry. AI parse output, uploaded filenames, project names, and deliverable names remain data. This change does not alter `createProject`, R2 upload, AI document parsing, refresh, DB writes, public output, provider setup, or authorization behavior. | `src/components/work/project/add-project-dialog.tsx`, `src/lib/i18n/product-copy.ts` |
| Work team-workspace creation bilingual pass | Moved the team-workspace creation trigger, disabled state, readiness notice, legacy compatibility notice, dialog title/description, owner-role warning, name field, boundary copy, action-code fallback errors, success state, pending state, retry hint, and footer actions into the product copy registry. The UI now maps server action codes to client copy instead of rendering raw server messages. This change does not alter `createTeamWorkspace`, authorization, idempotency, audit storage, DB writes, invitation lifecycle, project transfer, public output, provider setup, or external agent registration. | `src/components/work/workspace/create-team-workspace-dialog.tsx`, `src/lib/i18n/product-copy.ts` |
| Work invitation/collaboration sheet bilingual pass | Moved the team collaboration drawer, role/status/project-role labels, manual email handoff, mailto draft text, duplicate-invite safety state, invite form, field-level safe hints, revoke action, member list, invitation list, server-driven expiry note, footer boundary, and invitation acceptance card into the product copy registry. The client now maps invitation action codes to bilingual copy and avoids rendering raw server action messages or Chinese fallback time labels. This change does not alter invitation creation, revoke, acceptance, digest storage, auth, authorization, audit writes, email provider delivery, public output, DB schema, or external agent registration. | `src/components/work/workspace/team-collaboration-sheet.tsx`, `src/app/(dashboard)/work/page.tsx`, `src/lib/i18n/product-copy.ts` |
| Work share-link controls bilingual pass | Moved the client portal share-link unavailable, copied, and copy-link button labels into the product copy registry. This keeps the visible share-control copy bilingual while preserving the existing fail-closed token requirement; it does not create, rotate, revoke, publish, or expose any client portal token. | `src/components/work/share/share-link-button.tsx`, `src/lib/i18n/product-copy.ts` |
| Work task components bilingual pass | Moved task filters, task statuses, priority labels, visibility labels, AI-suggested badge, add/delete/toggle fallback errors, empty states, delete tooltip, date locale formatting, and the add-task sheet into the product copy registry. The UI no longer renders backend Chinese action errors directly, and this change does not alter task create/toggle/delete actions, authorization, persistence, public output, or client visibility rules. | `src/components/work/task/task-list.tsx`, `src/components/work/task/task-item.tsx`, `src/components/work/task/task-sheet.tsx`, `src/lib/i18n/product-copy.ts` |
| Work note components bilingual pass | Moved note source labels, AI/manual origin labels, client-visible badge, pin/delete/add actions, add-note dialog, note filters, sort controls, phase grouping labels, date locale formatting, empty states, and safe fallback errors into the product copy registry. The UI no longer renders backend Chinese note action errors directly, and this change does not alter note create/pin/delete actions, authorization, persistence, or client visibility rules. | `src/components/work/note/add-note-dialog.tsx`, `src/components/work/note/note-item.tsx`, `src/components/work/note/note-timeline.tsx`, `src/lib/i18n/product-copy.ts` |
| Work deliverable components bilingual pass | Moved deliverable type/status/visibility labels, add-deliverable dialog, deliverable table summary/empty/delivered-at labels, deliverable tree menu actions, delete titles, empty folder state, root add actions, visibility toggle titles, and safe fallback errors into the product copy registry. The UI no longer renders backend Chinese deliverable action errors directly, and this change does not alter deliverable create/update/delete actions, persistence, authorization, public output, or client visibility rules. | `src/components/work/deliverable/add-deliverable-dialog.tsx`, `src/components/work/deliverable/deliverable-table.tsx`, `src/components/work/deliverable/deliverable-tree.tsx`, `src/lib/i18n/product-copy.ts` |
| Work timeline component bilingual pass | Moved project timeline title, phase status labels, current-phase badge, completion summary, update timestamp label, and date locale formatting into the product copy registry. Timeline phase/milestone names remain project data. | `src/components/work/timeline/project-timeline-section.tsx`, `src/lib/i18n/product-copy.ts` |
| Work project detail subpage bilingual pass | Moved the project detail phase/health/due labels, adjunct AI boundary, formal data boundary, Client Portal publish gate, pre-publish checklist, client share/settings sections, hidden-from-client boundary, client draft state, Agent mock console, proposal queue, run log, Agent allow/deny boundary, records filters/table chrome, main tabs, quick stats, section headings, and linked-research-note title template into the product copy registry. The page no longer hard-codes Chinese UI copy, while project names, task titles, note bodies, deliverable titles, AI draft body, source meta, and timeline phase/milestone names remain data. This change does not alter project auth, Work CRUD actions, client portal token behavior, public output, Agent runtime, DB writes, or external registration. | `src/app/(dashboard)/work/[projectId]/project-detail-client.tsx`, `src/lib/i18n/product-copy.ts` |
| Work final hard-code sweep | Moved the remaining pulse source meta copy and Work loading-shell copy into the product copy registry. A final scan across `src/components/work` and `src/app/(dashboard)/work` returned no hard-coded Chinese strings, with project/user/data strings still allowed as runtime data. | `src/components/work/pulse/pulse-source-meta.tsx`, `src/app/(dashboard)/work/loading.tsx`, `src/lib/i18n/product-copy.ts` |
| Implementation/research algorithm | Expanded the implementation-first + issue-research algorithm with SSOT, RBAC, AI governance, and NANDA decision checks, plus a reusable future-agent prompt supplement. | `docs/05_execution-plans/PLN-069_saas-ui-convergence-schedule-and-governance-report.md` |

Verification run:

```bash
pnpm exec tsc --noEmit --pretty false
```

Result: passed.

Additional targeted verification after settings/admin hub convergence:

```bash
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/app/(dashboard)/settings/page.tsx src/app/(dashboard)/settings/settings-hub-client.tsx src/app/(dashboard)/admin/page.tsx src/app/(dashboard)/admin/admin-hub-client.tsx src/app/(dashboard)/admin/detail/all/page.tsx src/lib/context/product-language-context.tsx
```

Browser skill smoke:

- `/settings` loads as the simplified Chinese-first owner hub.
- `/admin` loads as the simplified operator hub.
- Switching `/settings/language` to English keeps `/admin` in English after navigation.
- New-tab browser console error count for this check: `0`.

Additional targeted verification after shared control and AI Input bilingual pass:

```bash
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/lib/i18n/product-copy.ts src/app/(dashboard)/ai-input/ai-input-client.tsx src/components/layout/app-header.tsx src/components/layout/module-settings-control.tsx
```

Result: passed.

Browser smoke after AI Input bilingual and hydration fix:

- Switched `/settings/language` to English through the product UI.
- Opened `/ai-input`.
- Confirmed visible English first-screen signals:
  - `AI Work Desktop`
  - `Welcome back, Oliver`
  - `Mock on`
  - `Personal AI chat`
- Confirmed old first-screen Chinese strings were absent:
  - `再度光臨`
  - `快速匯入`
  - `AI 匯入`
- Browser console error count: `0`.
- Reset language preference back to `zh-TW`.

Additional targeted verification after AI Input active-chat/subpage bilingual pass:

```bash
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/lib/i18n/product-copy.ts src/app/(dashboard)/ai-input/ai-input-client.tsx
```

Browser smoke:

- Switched `/settings/language` to English through the product UI.
- Opened `/ai-input`.
- Entered a disposable local message into the AI Input conversation textbox.
- Confirmed active-chat English signals:
  - `Chat status: kept in the chat window`
  - `Not imported into source analysis yet`
  - `Import to source analysis`
  - `Simulate idle 24h`
  - `Choose import source`
- Confirmed old primary Chinese active-chat strings were absent:
  - `再度光臨`
  - `手動匯入`
  - `模擬閒置匯入`
  - `來源 / 對話索引`
- Browser console error count: `0`.
- Reset language preference back to `zh-TW`.

Additional targeted verification after AI Input bilingual response pass:

```bash
rg -n "getAIResponse\\(" src
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/app/(dashboard)/ai-input/actions.ts src/app/(dashboard)/ai-input/ai-input-client.tsx
```

Result: passed. Browser send-message verification was intentionally skipped for this response slice because configured provider keys, if present, could transmit the disposable test prompt to an external model. The product behavior is still type-checked and scoped: no new provider is enabled, and the existing provider path now receives a locale-aware system instruction.

Additional targeted verification after AI Input source-cowork transcript bilingual pass:

```bash
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/lib/i18n/product-copy.ts src/app/(dashboard)/ai-input/ai-input-client.tsx
```

Browser smoke:

- Switched `/settings/language` to English through the product UI.
- Opened `/ai-input`.
- Clicked the local mock `RSS` quick import action.
- Confirmed source coworking English signals:
  - `RSS source coworking chat`
  - `[RSS collection agent]`
  - `[System intelligence]`
- Confirmed old coworking Chinese strings were absent:
  - `RSS 採集代理`
  - `系統智能`
  - `來源處理對話`
- Browser console error count: `0`.
- Reset language preference back to `zh-TW`.

Additional targeted verification after AI Input reference-control bilingual pass:

```bash
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/lib/i18n/product-copy.ts src/app/(dashboard)/ai-input/ai-input-client.tsx
rg -n "參考背景|引用脈絡|自系統檔案庫引用|自系統媒體庫引用|來源處理對話|\\\"圖片\\\"|\\\"語音\\\"" src/app/(dashboard)/ai-input/ai-input-client.tsx src/lib/i18n/product-copy.ts
```

Result: TypeScript and diff check passed. The scan shows the moved reference/source strings now live in the `zh-TW` copy registry rather than the AI Input runtime component.

Browser smoke:

- Switched `/settings/language` to English through the product UI.
- Opened `/ai-input`.
- Clicked the local mock `Image` quick import action.
- Confirmed source coworking English signals:
  - `Image source coworking chat`
  - `[Image analysis agent]`
- Confirmed old Chinese title/agent strings were absent:
  - `圖片 來源處理對話`
  - `圖片分析代理`
- Browser console error count: `0`.
- Reset language preference back to `zh-TW`.

Additional targeted verification after AI Input workbench shell bilingual pass:

```bash
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/lib/i18n/product-copy.ts src/app/(dashboard)/ai-input/ai-input-client.tsx
```

Browser smoke:

- Switched `/settings/language` to English through the product UI.
- Opened `/ai-input` and activated `AI Workbench`.
- Confirmed workbench shell English signals:
  - `Today workflow`
  - `Needs review`
  - `Source environment`
  - `Organized results`
  - `Work log`
  - `Showing workflow table state only`
- Confirmed table-frame English signals:
  - `SOURCE`
  - `STATUS`
  - `ORGANIZED RESULT`
  - `REFERENCE ID`
  - `Done`
  - `Partial`
  - `WHY IT NEEDS REVIEW`
  - `RISK`
- Browser console error count: `0`.
- Reset language preference back to `zh-TW`.

Additional targeted verification after AI Input source-settings shell bilingual pass:

```bash
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/lib/i18n/product-copy.ts src/app/(dashboard)/ai-input/ai-input-client.tsx docs/05_execution-plans/PLN-069_saas-ui-convergence-schedule-and-governance-report.md
```

Browser smoke:

- Switched `/settings/language` to English through the product UI.
- Opened `/ai-input` and activated `Sync settings`.
- Confirmed source-settings shell English signals:
  - `External Source Sync Settings`
  - `Source settings and sync management`
  - `Add connection`
  - `Connected`
  - `Needs setup`
  - `Last:`
  - `Next:`
  - `Configure`
- Browser console error count: `0`.
- Reset visible language preference back to `zh-TW`.

Additional targeted verification after language metadata sync:

```bash
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/lib/context/product-language-context.tsx src/app/layout.tsx src/lib/i18n/product-copy.ts src/app/(dashboard)/ai-input/ai-input-client.tsx docs/05_execution-plans/PLN-069_saas-ui-convergence-schedule-and-governance-report.md
```

Browser smoke:

- Switched `/settings/language` to English.
- Confirmed visible English state and `document.documentElement.lang === "en-US"`.
- Switched back to Traditional Chinese.
- Confirmed visible Chinese state and `document.documentElement.lang === "zh-Hant-TW"`.
- Browser console error count: `0`.

Additional targeted verification after AI Input source-settings row bilingual pass:

```bash
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/lib/i18n/product-copy.ts src/app/(dashboard)/ai-input/ai-input-client.tsx docs/05_execution-plans/PLN-069_saas-ui-convergence-schedule-and-governance-report.md src/lib/context/product-language-context.tsx src/app/layout.tsx
```

Browser smoke:

- Switched `/settings/language` to English.
- Opened `/ai-input`.
- Confirmed source index English row signals:
  - `LINE Chamber leadership group`
  - `Review 1 pending item`
- Activated `Sync settings`.
- Confirmed source settings row English signals:
  - `Google Drive Personal OS research folder`
  - `LINE · Messaging`
  - `Medium risk`
  - `Last: Today 09:14`
  - `Next: Tomorrow 08:30`
  - `Missing permission (hover to view)`
  - `Docs / Sheets / Slides source retained`
- Confirmed old source-row Chinese signals were absent from the visible source settings table:
  - `商會核心幹部群`
  - `最近 24 小時`
  - `明天 08:30`
  - `缺少授權`
  - `中風險`
- Browser console error count: `0`.
- Reset language preference back to `zh-TW`.
- Follow-up gap found: the lower review-policy/developer settings area under source settings still contains Chinese-only policy text and should be localized or simplified in a separate slice.

Additional targeted verification after AI Input workbench row bilingual pass:

```bash
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/lib/i18n/product-copy.ts src/app/(dashboard)/ai-input/ai-input-client.tsx docs/05_execution-plans/PLN-069_saas-ui-convergence-schedule-and-governance-report.md src/lib/context/product-language-context.tsx src/app/layout.tsx
```

Browser smoke:

- Switched `/settings/language` to English.
- Opened `/ai-input` and activated the local `AI Workbench` subpage.
- Confirmed Today workflow row English signals:
  - `Done · 34 messages · 1 item needs review`
  - `Manual CDR document import`
- Confirmed Needs review row English signals:
  - `Classification uncertain`
  - `Private phone number appeared in LINE group`
- Confirmed Source environment row English signals:
  - `Daily sync`
  - `Report anomalies only`
- Confirmed Organized results row English signals:
  - `EdTech data governance research package`
  - `Source naming`
- Confirmed Work log row English signals:
  - `LINE sync started`
  - `AI detected 3 possible action items`
- Confirmed old workbench-row Chinese signals were absent:
  - `分類不確定`
  - `每日同步`
  - `教育科技資料治理研究包`
  - `LINE 同步開始`
- Browser console error count: `0`.
- Reset language preference back to `zh-TW`.

Additional targeted verification after AI Input source-settings review-policy bilingual pass:

```bash
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/lib/i18n/product-copy.ts src/app/(dashboard)/ai-input/ai-input-client.tsx docs/05_execution-plans/PLN-069_saas-ui-convergence-schedule-and-governance-report.md src/lib/context/product-language-context.tsx src/app/layout.tsx
```

Browser smoke:

- Switched `/settings/language` to English.
- Opened `/ai-input` and activated `Sync settings`.
- Confirmed review-policy English signals:
  - `Human review policy`
  - `High-risk or personal-data fragment`
  - `Module classification is uncertain`
  - `Source quality or format detection conflict`
- Confirmed old review-policy Chinese signals were absent:
  - `人工確認政策`
  - `高風險或個資片段`
  - `模組分類不確定`
  - `來源品質或格式偵測衝突`
- Browser console error count: `0`.
- Reset language preference back to `zh-TW`.

Additional targeted verification after AI Input source-settings existing-connection drawer copy pass:

```bash
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/lib/i18n/product-copy.ts src/app/(dashboard)/ai-input/ai-input-client.tsx docs/05_execution-plans/PLN-069_saas-ui-convergence-schedule-and-governance-report.md src/lib/context/product-language-context.tsx src/app/layout.tsx
```

Browser smoke:

- Switched `/settings/language` to English.
- Opened `/ai-input`, activated `Sync settings`, and opened the first source `Configure` drawer.
- Confirmed sync/routing/approval drawer English signals:
  - `External sync policy`
  - `Enable scheduled auto-sync`
  - `Analysis trigger mode`
  - `Default publishing module`
  - `Allowed target modules`
  - `Finance module (high risk)`
  - `Risk level`
  - `Action proposal approval policy`
  - `Today notification settings`
  - `Save settings`
  - `Cancel`
- Confirmed old drawer Chinese signals were absent from those visited sections:
  - `外部同步政策`
  - `啟用排程自動同步`
  - `儲存設定`
  - `取消`
- Browser console error count: `0`.
- Follow-up risk found: browser automation did not successfully switch the drawer tab to `Governance privacy` even after the button type fallback. The code path is type-checked and localized, but the interaction should be manually/visually confirmed or revisited before claiming the drawer fully proven.
- Reset language preference back to `zh-TW`.

Additional targeted verification after source-connection wizard bilingual pass:

```bash
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/components/ai/source-connections/source-connection-wizard.tsx src/lib/i18n/product-copy.ts
```

Result: passed.

Browser skill check:

- `/ai-input` source settings opened in `zh-TW`; `新增連線` wizard first screen rendered as a simplified mock/draft-only source setup with explicit no-OAuth/no-webhook/no-DB-write boundary.
- Switched to `en-US` through `/settings/language`, reopened `/ai-input` source settings, and opened `Add connection`.
- English first screen had no Chinese text.
- Walked the RSS path through review. Browser check initially found a locale-state bug: a previously stored schedule value could render as `每 6 小時` inside the English review summary.
- Fixed this by canonicalizing schedule preset display labels before select rendering, draft creation, and review summary display.
- Rechecked the English RSS review path; result had no Chinese text and showed `Scheduled capture · Every 6 hours`.
- Reset language preference back to `zh-TW`.

Additional targeted verification after existing-connection drawer tab semantics:

```bash
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/app/(dashboard)/ai-input/ai-input-client.tsx src/lib/i18n/product-copy.ts
```

Browser skill check:

- Opened `/ai-input` source settings in `zh-TW`.
- Opened the first existing connection settings drawer.
- Confirmed 5 semantic tabs existed in the drawer tablist.
- Clicked `治理隱私`.
- Confirmed `data-source-settings-tab="governance"` had `aria-selected="true"` and the governance panel rendered retention, PII masking, and upload path settings.

Additional targeted verification after Inbox return-path bilingual pass:

```bash
rg -n "[\p{Han}]" src/app/(dashboard)/inbox/page.tsx src/components/ingestion/source-item-card.tsx src/components/ingestion/normalized-content-preview.tsx src/components/ingestion/source-type-badge.tsx src/components/ingestion/processing-status-badge.tsx src/components/ingestion/data-lineage-pipeline.tsx src/components/ingestion/evidence-list.tsx src/components/ai/triage-proposal-card.tsx
pnpm exec tsc --noEmit --pretty false
```

Result: the targeted Chinese hard-code scan returned no matches in the Inbox runtime files, and TypeScript passed. Browser verification was intentionally deferred because this slice was copy/contract-focused and the owner has allowed implementation-first loops when evidence collection can be done later.

Additional targeted verification after Agents command center bilingual pass:

```bash
rg -n "[\p{Han}]|Owner instruction|Command route|Proposal packet|Protected dry-run|Module operation|No local|No protected|Running owner|Blocked actions|Proposal outputs|Safety state|Approval required|Single-agent route|blocked writes" src/app/(dashboard)/agents
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/app/(dashboard)/agents/page.tsx src/app/(dashboard)/agents/agent-command-center-client.tsx
```

Result: the targeted `/agents` runtime scan returned no matches, TypeScript passed, and diff whitespace check passed for the tracked runtime files.

Additional targeted verification after Workflow automation surface bilingual pass:

```bash
rg -n "[\p{Han}]|新增規則|規則列表|事件日誌|Agent 狀態|圖例|尚無|使用者|獨佔|需批准|任意|編輯規則|Workflow 規則|觸發|目標|優先權|剛才|分鐘前|小時前|Workflow" src/app/(dashboard)/workflow
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/app/(dashboard)/workflow/page.tsx src/app/(dashboard)/workflow/components/agent-registry-panel.tsx src/app/(dashboard)/workflow/components/flow-visualizer.tsx src/app/(dashboard)/workflow/components/rule-list.tsx src/app/(dashboard)/workflow/components/rule-builder-dialog.tsx src/app/(dashboard)/workflow/components/audit-trail.tsx
```

Result: the targeted `/workflow` runtime scan returned no hard-coded Chinese UI copy; remaining matches were TypeScript identifiers such as `WorkflowRule` and `WorkflowPage`. TypeScript passed, and diff whitespace check passed for the tracked runtime files.

Additional targeted verification after Work main operating desk bilingual pass:

```bash
rg -n "Work Operating Desk|Project Queue|Project Readiness|Client Boundary|Manual Ops proof|Full Work list|Create project|No authorized Work project yet|No project selected|Delivery Queue|Formal proof pending|Work AI Proposal|Agent boundary|Settings / Boundary|Formal Gate A still needs|檔案庫|媒體庫|全部|使用者操作|系統事件" src/app/(dashboard)/work/work-client.tsx
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/app/(dashboard)/work/work-client.tsx
git diff --no-index --check /dev/null src/lib/i18n/product-copy.ts
```

Result: TypeScript passed and whitespace checks passed. The targeted Work main chrome scan only returned the deep project-list heading `全部專案`, confirming the selected first-viewport/main-desk slice is copy-driven while deeper Work project/workspace screens remain follow-up work.

Additional targeted verification after Work project list/card bilingual pass:

```bash
rg -n "workspaceRoleLabels|已加入的團隊|團隊工作區|工作區|專案唯讀索引|工作區選擇|個人工作區|可見專案|今日焦點|全部專案|尚無共同專案|尚無個人專案|此分類沒有專案|最近更新|截止日|任務進度|已逾期|今天截止|客戶可見|唯讀專案|健康度|存取來源|已分享|風險|檢視者|工作區管理權限" src/app/(dashboard)/work/work-client.tsx src/components/work/project/project-filter-bar.tsx src/components/work/project/project-card.tsx src/components/work/project/project-focus-card.tsx
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/app/(dashboard)/work/work-client.tsx src/components/work/project/project-filter-bar.tsx src/components/work/project/project-card.tsx src/components/work/project/project-focus-card.tsx
git diff --no-index --check /dev/null src/lib/i18n/product-copy.ts
```

Result: the targeted hard-code scan returned no matches for the selected Work list/card surface. TypeScript passed, and tracked runtime plus copy-registry whitespace checks passed.

Additional targeted verification after Work add-project dialog bilingual pass:

```bash
rg -n "新增專案|專案已建立|手動建立|AI 文件初始化|專案名稱|客戶名稱|解析失敗|拖曳|支援 PDF|移除|AI 正在解析|AI 解析完成|專案 Timeline|個階段|里程碑|關鍵交付物|建立中|開始 AI 解析|建立專案|專案：" src/components/work/project/add-project-dialog.tsx
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/components/work/project/add-project-dialog.tsx
git diff --no-index --check /dev/null src/lib/i18n/product-copy.ts
```

Result: the targeted AddProjectDialog hard-code scan returned no matches. TypeScript passed, and tracked runtime plus copy-registry whitespace checks passed.

Additional targeted verification after Work team-workspace creation bilingual pass:

```bash
rg -n "目前帳戶|建立團隊|團隊工作區|待完成|稽核儲存|請輸入|請先|OWNER 成員資格|已建立|尚未邀請|正在前往|你的角色|團隊名稱|品牌設計|這次只建立|不會寄送|直接重試|正在安全|取消|建立中|暫停|個人專案相容" src/components/work/workspace/create-team-workspace-dialog.tsx
rg -n "[\p{Han}]" src/components/work/workspace/create-team-workspace-dialog.tsx
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/components/work/workspace/create-team-workspace-dialog.tsx
```

Result: both targeted hard-code scans returned no matches for the selected team-workspace creation dialog. TypeScript passed, and tracked runtime whitespace check passed.

Additional targeted verification after Work invitation/collaboration sheet bilingual pass:

```bash
rg -n "[\p{Han}]" src/components/work/workspace/team-collaboration-sheet.tsx src/app/(dashboard)/work/page.tsx
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/components/work/workspace/team-collaboration-sheet.tsx src/app/(dashboard)/work/page.tsx src/lib/i18n/product-copy.ts
git diff --no-index --check /dev/null src/lib/i18n/product-copy.ts
```

Result: the targeted Chinese hard-code scan returned no matches for the selected team collaboration surface and Work page loader fallback. TypeScript passed, and tracked runtime plus copy-registry whitespace checks passed.

Additional targeted verification after Work share-link controls bilingual pass:

```bash
rg -n "[\p{Han}]" src/components/work/share/share-link-button.tsx
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/components/work/share/share-link-button.tsx src/lib/i18n/product-copy.ts
```

Result: the targeted hard-code scan returned no matches for the selected share-link control. TypeScript passed, and tracked runtime plus copy-registry whitespace checks passed.

Additional targeted verification after Work task components bilingual pass:

```bash
rg -n "[\p{Han}]" src/components/work/task/task-list.tsx src/components/work/task/task-item.tsx src/components/work/task/task-sheet.tsx
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/components/work/task/task-list.tsx src/components/work/task/task-item.tsx src/components/work/task/task-sheet.tsx src/lib/i18n/product-copy.ts
```

Result: the targeted hard-code scan returned no matches for the selected task components. TypeScript passed, and tracked runtime plus copy-registry whitespace checks passed.

Additional targeted verification after Work note components bilingual pass:

```bash
rg -n "[\p{Han}]" src/components/work/note/add-note-dialog.tsx src/components/work/note/note-item.tsx src/components/work/note/note-timeline.tsx
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/components/work/note/add-note-dialog.tsx src/components/work/note/note-item.tsx src/components/work/note/note-timeline.tsx src/lib/i18n/product-copy.ts
```

Result: the targeted hard-code scan returned no matches for the selected note components. TypeScript passed, and tracked runtime plus copy-registry whitespace checks passed.

Additional targeted verification after Work deliverable components bilingual pass:

```bash
rg -n "[\p{Han}]" src/components/work/deliverable/add-deliverable-dialog.tsx src/components/work/deliverable/deliverable-table.tsx src/components/work/deliverable/deliverable-tree.tsx
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/components/work/deliverable/add-deliverable-dialog.tsx src/components/work/deliverable/deliverable-table.tsx src/components/work/deliverable/deliverable-tree.tsx src/lib/i18n/product-copy.ts
```

Result: the targeted hard-code scan returned no matches for the selected deliverable components. TypeScript passed, and tracked runtime plus copy-registry whitespace checks passed.

Additional targeted verification after Work timeline component bilingual pass:

```bash
rg -n "[\p{Han}]" src/components/work/timeline/project-timeline-section.tsx
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/components/work/timeline/project-timeline-section.tsx src/lib/i18n/product-copy.ts
```

Result: the targeted hard-code scan returned no matches for the selected timeline component. TypeScript passed, and tracked runtime plus copy-registry whitespace checks passed.

Additional targeted verification after Work project detail subpage bilingual pass:

```bash
rg -n "[\p{Han}]" src/app/(dashboard)/work/[projectId]/project-detail-client.tsx
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/app/(dashboard)/work/[projectId]/project-detail-client.tsx src/lib/i18n/product-copy.ts
```

Result: the targeted hard-code scan returned no matches for the selected project detail subpage. TypeScript passed, and tracked runtime plus copy-registry whitespace checks passed.

Additional targeted verification after Work final hard-code sweep:

```bash
rg -n "[\p{Han}]" src/components/work src/app/(dashboard)/work
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/components/work/pulse/pulse-source-meta.tsx src/app/(dashboard)/work/loading.tsx src/lib/i18n/product-copy.ts
```

Result: the final Work surface hard-code scan returned no matches. TypeScript passed, and tracked runtime plus copy-registry whitespace checks passed.

PLN-069 UI-L4 local convergence completion update:

- The main protected owner-facing routes were reviewed with the browser skill: `/dashboard`, `/ai-input`, `/inbox`, `/work`, `/research`, `/company`, `/agents`, `/workflow`, `/settings`, `/settings/language`, `/settings/members`, `/settings/roles`, and `/settings/ai-sharing`.
- Browser-visible text on those normal pages no longer exposes `Gate A`, `externalRegisterable=false`, `AUTH-*`, `WORK-*`, `DEPLOY-*`, `Manual Ops`, `Mock data`, `Mock 開`, `OWNEROS-*`, or `DATTR-*` markers.
- Admin/proof routes intentionally retain launch evidence and task IDs where operator diagnosis needs them.
- `/dashboard` is now the `今日` daily loop. `/ai-input` is the compact AI work desk. `/settings` owns language, members, roles, AI sharing, owner/profile/env/manual setup surfaces. `/admin` owns RBAC, AI governance, audit, and system readiness.
- The AI provider server action for `/ai-input` now calls `requireUser()` before provider access. It still does not write DB records, publish public output, enable external registration, or execute autonomous provider workflows.
- Verification run:

```bash
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/lib/i18n/product-copy.ts src/app/(dashboard)/dashboard/today-client.tsx src/app/(dashboard)/settings/settings-client.tsx src/app/(dashboard)/ai-input/ai-input-client.tsx src/app/(dashboard)/ai-input/actions.ts src/app/(dashboard)/work/work-client.tsx src/app/(dashboard)/research/page.tsx src/app/(dashboard)/company/page.tsx src/app/(dashboard)/agents/agent-command-center-client.tsx src/app/(dashboard)/settings/settings-hub-client.tsx src/app/(dashboard)/settings/page.tsx src/lib/contracts/module-agent-command-catalog.contract.ts src/lib/owneros/control-plane-pages.ts
```

Result: TypeScript passed, whitespace check passed, and browser audit found no engineering/task/proof markers on the normal owner-facing pages listed above.

Open after PLN-069, not blocking the UI-L4 local convergence claim:

- Gate A/B/C still need separate auth, persistence, negative authorization, deployed/no-demo, and owner proof evidence.
- Legacy Research server actions still need BFF/service authorization hardening before a formal multi-user launch claim.
- `今日` proposal drafts should be persisted or queued only after audit storage and approval policy are selected.
- RBAC and AI governance inspection matrices should become persisted/service-backed DTOs only after approval policy and audit storage are selected.
- Non-RSS source-connection wizard provider paths should receive a follow-up browser sweep when they become the next active UI slice.
- Owner acceptance remains requested for product feel, wording, and workflow fit.

Final owner correction and UI handoff report: `docs/06_audits-and-reports/RPT-066_simplified-saas-ui-handoff-report.md`.
