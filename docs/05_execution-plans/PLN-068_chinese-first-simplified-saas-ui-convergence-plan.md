# Chinese-First Simplified SaaS UI Convergence Plan

**Document ID:** `PLN-068`  
**Status:** Owner-reviewed target accepted with updates  
**Last updated:** 2026-08-23  
**Runtime implementation:** Not changed by this document  
**Source audit:** `docs/2_agent-input/generated/agent-loop/reports/personal-os-browser-ui-structure-audit-20260823.md`

## 1. Purpose

This plan defines a multi-stage path to turn Personal OS into a simpler, calmer SaaS interface with Traditional Chinese as the primary product language and full Chinese/English switching as an immediate product goal.

This is a target-setting document. It does not approve runtime changes, schema changes, provider calls, public output, permission writes, or launch-level claims.

## 2. Proposed Product Target

Target name: `UI-L4_FULL_BILINGUAL_SIMPLIFIED_AI_SAAS_CONSOLE`

Target statement:

> Personal OS should feel like one compact bilingual AI SaaS console: Traditional Chinese by default, full Chinese/English switching available, clear module navigation, one primary job per page, queue/detail work surfaces, concise action bars, visible but compact state boundaries, and a governed Core AI that turns module context into today's summary, next actions, and reviewable API/TODO proposals.

The target is not "make it pretty." The target is "make it easy to operate."

In a successful version, the owner can open any primary page and answer these in five seconds:

1. Where am I?
2. What is the main job of this page?
3. What item or queue needs my attention?
4. What action can I take now?
5. Is this page real, mock, unavailable, manual-ops, or proposal-only?

## 3. UI Level Ladder

| Level | Name | Meaning | Pass condition |
|---|---|---|---|
| `UI-L0` | Current mixed surface | Pages are operable but visually and structurally noisy. | Current state after browser audit. |
| `UI-L1` | Chinese-first navigation and copy baseline | Main labels, page titles, state chips, and owner-facing actions use consistent Traditional Chinese. | No primary protected page opens with mixed English/Chinese task labels unless intentional. |
| `UI-L2` | Core Gate A workbench simplified | `/ai-input`, `/inbox`, and `/dashboard` form one clear capture/review/return loop. | Owner can capture, review, route, and return to Inbox without parsing proof walls. |
| `UI-L3` | Full protected SaaS console | Core pages share the same SaaS operating skeleton. | `/dashboard`, `/ai-input`, `/inbox`, `/work`, `/research`, `/company`, `/agents`, `/workflow`, `/settings`, and `/admin` pass browser structure review. |
| `UI-L4` | Full bilingual SaaS console | Copy is structured and switchable for `zh-TW` / `en-US`. | Settings exposes language preference; primary protected pages switch display copy without rewriting components. |

Owner decision: full language switching is part of the immediate product goal. The next UI phase targets `UI-L4`, while still implementing through staged `UI-L1` -> `UI-L2` -> `UI-L3` -> `UI-L4` slices.

## 3.1 Owner Decisions Recorded

| Question | Owner decision | Product implication |
|---|---|---|
| Target level | Full language switching, not only readiness. | Build actual `zh-TW` / `en-US` copy switching as a planned runtime capability. |
| Dashboard label | Use `今日`. | `/dashboard` becomes the Today surface, not only a morning brief. |
| Task ids on normal pages | Hide task ids from formal UI. | Normal pages show user-facing state; docs/admin keep `AUTH-005`, `WORK-009`, and loop task ids. |
| Sidebar modules | Collapse secondary modules under `更多`. | Mature/core modules stay visible; less mature/high-risk modules move behind a secondary group. |
| Dashboard intelligence | Module AIs share to AI Input/Core AI by setting; Core AI generates Today's summary and next actions; user comments can request AI operation across module TODO/API functions. | Requires a governed AI orchestration and action-proposal layer before any broad API execution. |

## 4. Design Principles

1. Chinese-first, bilingual by design.

Owner-facing labels default to Traditional Chinese and can switch to English. Code identifiers, audit ids, and stable internal references stay English. Public-facing UI task ids are hidden in formal pages and documented in docs/admin surfaces.

2. One global navigation layer.

The sidebar is the global map. Page tabs and local navigation should only represent local views. Avoid stacking sidebar + top nav + inner tab bar + card grid when a queue/detail layout would work.

3. One primary job per page.

Each first viewport needs one obvious job. Examples:

- `/ai-input`: "整理輸入並產生可審核提案"
- `/inbox`: "處理待整理訊息"
- `/work`: "管理專案與下一步"
- `/admin`: "檢查阻塞與系統證據"

4. Queue/detail before cards.

Operational SaaS interfaces should default to searchable queues, compact rows, selected detail panes, and contextual actions. Cards are allowed for repeated records only when scanning remains easy.

5. State is honest but compact.

Do not hide mock/proposal/manual-ops/unavailable state. Do hide raw engineering vocabulary from normal work pages. The normal page gets a compact state chip; `/admin` gets full evidence.

6. AI is a proposal/control rail.

AI surfaces should not become toy chat panels. They should show source context, allowed operations, proposal content, blocked writes, audit refs, and the owner's next decision.

7. Proof belongs in admin.

Gate labels, raw task ids, launch proof, external registration flags, long readiness tables, and no-secret evidence packets belong in `/admin` or detail drilldowns, not in the first viewport of daily work pages.

8. Today's summary is generated from governed module sharing.

`今日` is not a static dashboard. It should be generated from module AI/context sharing settings, source provenance, module TODOs, and owner feedback. The Core AI can propose actions, but execution must go through allow-listed capabilities, service authorization, audit, and approval rules.

## 5. Chinese-First Copy And I18n Strategy

First phase: create bilingual copy discipline and a real language preference path without route-level locale complexity.

Required approach:

- Owner-facing UI copy uses Traditional Chinese by default.
- New shared components receive display labels from a copy map or typed copy object.
- Copy keys use stable English ids such as `aiInput.primaryJob`, `admin.blockerQueue`, `state.manualOps`.
- `zh-TW` and `en-US` values are required for primary navigation, page headers, command labels, state chips, empty states, and core form labels.
- Secondary/detail copy can start as `zh-TW` first only when it is admin/proof-only, but the key must exist.
- Technical ids such as `AUTH-005`, `WORK-009`, `OWNEROS-UI-006`, and `externalRegisterable=false` remain allowed in docs/admin/proof areas; normal pages show human labels such as `等待驗證`, `需手動設定`, or `僅限提案`.

Suggested copy states:

| Internal state | Owner-facing Chinese | English-ready meaning |
|---|---|---|
| `formal_ready` | 可正式使用 | Ready |
| `mock_enabled` | Demo 模式 | Demo mode |
| `manual_ops_required` | 需手動設定 | Manual setup needed |
| `proposal_only` | 僅產生提案 | Proposal only |
| `unavailable` | 暫不可用 | Unavailable |
| `proof_pending` | 等待驗證 | Proof pending |
| `blocked` | 目前受阻 | Blocked |

Language switch requirement:

- Add a setting in `/settings` for language preference.
- Primary protected pages should resolve copy through a shared locale provider or server-safe copy helper.
- Keep URLs stable and language-neutral for now.
- Do not start with route-level locale switching unless a later owner decision requires locale-specific URLs.

## 6. Target Information Architecture

Recommended sidebar grouping:

| Group | Routes | Chinese label direction |
|---|---|---|
| 今日 | `/dashboard` | `今日` |
| AI 工作 | `/ai-input`, `/inbox`, `/agents` | `AI 工作桌`, `收件匣`, `AI 指令` |
| 核心作業 | `/work`, `/research`, `/company`, `/workflow` | `工作`, `研究`, `公司`, `自動化` |
| 系統 | `/settings`, `/admin` | `設定`, `管理` |
| 更多 | `/self`, `/chamber`, `/life`, `/finance`, lower-maturity or high-risk surfaces | `更多` collapsed group containing `自己`, `商會`, `生活`, `財務` |

Owner decision:

- `/dashboard` is labeled `今日`.
- Secondary/high-risk modules collapse under `更多` until they mature.

`今日` contains daily summary, action queue, owner comments, AI-proposed next steps, proof handoff, and module context freshness.

## 6.1 Today And Core AI Orchestration Target

The owner wants each module AI to optionally share context with AI Input / the Core AI, then have the Core AI infer Today's dashboard summary and next actions. The owner should also be able to comment directly to the AI from `今日`; those comments can become proposals to update module TODOs or invoke approved API capabilities.

### 6.1.1 Required Model

```txt
Module page or module AI
  -> module sharing setting
  -> scoped context package
  -> AI Input / Core AI inbox
  -> Today summary and next-action proposal
  -> owner comment / feedback
  -> action proposal
  -> allow-listed capability execution
  -> audit record and module TODO/API update
```

### 6.1.2 Settings Surface

`/settings` needs an AI sharing section:

| Setting | Meaning |
|---|---|
| Module sharing toggle | Whether a module can share summaries/context to the Core AI. |
| Share scope | `summary only`, `tasks only`, `selected records`, `full module context package`, or `off`. |
| Sensitivity policy | Redaction and high-risk data rules before sharing. |
| Retention | How long shared context remains available to the Core AI. |
| Allowed actions | Which module actions can be proposed or executed after approval. |
| Approval mode | `draft only`, `owner approve`, `auto low-risk`, or `disabled`. |

### 6.1.3 Core AI Rules

The Core AI is an internal protected orchestrator, not an external-registerable agent.

AgentFacts-lite posture:

- identity: `personal-os:core-ai-orchestrator`
- lifecycle: internal protected runtime target
- capabilities: summarize module context, rank today actions, convert owner comments into action proposals
- blocked by default: public output, high-risk writes, external registration, direct external-agent DB access
- registry: `externalRegisterable=false`

### 6.1.4 API And TODO Operation Boundary

The phrase "任意 api 功能" should be interpreted as "any approved module API capability that is registered, authorized, audited, and risk-scored." It must not mean unrestricted arbitrary API execution.

Required capability registry fields:

- capability id
- module
- input schema
- output schema
- risk level
- auth requirement
- approval requirement
- dry-run support
- audit event name
- rollback or compensation note
- whether Core AI may propose, execute after approval, or never execute

Low-risk examples:

- create draft TODO
- update TODO status
- add comment/note
- link source to task
- prepare summary

High-risk or blocked examples until explicit owner approval:

- send external message
- publish client-visible output
- modify Finance records
- delete retained context
- change permissions
- trigger provider OAuth or external agent registration

## 7. Shared Page Skeleton

Every protected primary page should converge on this skeleton:

```txt
Sidebar
  Page header: Chinese title, one-line purpose, compact state chips
  Command bar: 1 primary command + up to 4 secondary commands
  Main surface:
    Left or top: queue/resource index
    Center: selected detail/work area
    Right/collapsed: AI proposal, context, boundary, or proof rail
  Lower surface:
    records/audit
    settings/boundaries
```

Hard limits for normal owner pages:

- No more than one global nav plus one local view selector.
- No more than five visible command buttons in the first viewport.
- No raw proof wall in the first viewport.
- No repeated long descriptions when a button, row, or status chip can carry the job.
- No hidden mock/proposal/manual-ops state.

Admin/detail exceptions:

- `/admin/detail/all` and proof routes may remain dense, but they must have search, filters, anchors, and summary rows before raw evidence.

## 8. Stackable Acceleration Resources

The UI rewrite should actively use mature resources to move faster. The rule is: borrow structure, primitives, and proven interaction patterns; do not copy a visual gimmick that weakens the Personal OS target.

### 8.1 Resource Stack

| Layer | Resource type | Recommended sources | Use for | Guardrail |
|---|---|---|---|---|
| Foundation primitives | shadcn/ui, Radix-style primitives, Tailwind tokens | https://ui.shadcn.com/docs, https://github.com/shadcn-ui/ui | Buttons, table, tabs, dialog, sheet, command palette, badges, skeletons, tooltip, forms | Add only needed components; do not run broad `add --all`; keep local theme and density rules. |
| Icon system | `lucide-react` | https://lucide.dev/guide/react/, https://github.com/lucide-icons/lucide | Sidebar icons, command buttons, row states, empty states, compact visual cues | Import icons individually for tree-shaking; use consistent size/stroke; include labels/tooltips for icon-only controls. |
| AI interface primitives | Vercel AI Elements | https://elements.ai-sdk.dev/, https://github.com/vercel/ai-elements | Conversation, message, prompt input, sources, tool calls, reasoning, task/queue UI | Use for AI Work Desktop patterns; still route through Personal OS BFF/auth/audit boundaries. |
| SaaS/admin layout references | Open-source dashboard and SaaS repos | https://github.com/Kiranism/next-shadcn-dashboard-starter, https://github.com/vercel/chatbot, https://github.com/shadcn-ui/chatbot-template | Table/filter/detail patterns, app shell, empty states, chat layout, settings/admin recipes | Reference and adapt patterns only after license/dependency review; never wholesale replace product IA. |
| Animated component accents | Magic UI | https://magicui.design/, https://github.com/magicuidesign/magicui | Empty states, subtle highlights, onboarding, loading, status emphasis | Use sparingly. No landing-page hero effects inside protected app. No decorative noise in work pages. |
| Motion engine | Motion for React / react-motion shorthand | https://motion.dev/docs | Panel transitions, row enter/exit, collapsible rail, reduced-motion aware microinteractions | Prefer current Motion for React APIs; verify before adding older `react-motion`; motion must clarify state changes and respect reduced motion. |
| Design inspiration | Leading SaaS products and official design-system docs | Shopify Polaris, Atlassian Design System, IBM Carbon, GitLab Pajamas | Resource index, action menu, table density, settings grouping | Extract behavior and hierarchy, not branding or ornamental style. |

### 8.2 Adoption Gate

Before using any external component, block, template, or animation in runtime code, record a short resource decision:

| Check | Required answer |
|---|---|
| Purpose | Which page job does this accelerate? |
| Fit | Does it support the queue/detail SaaS skeleton? |
| Copy | Can owner-facing text be moved into Chinese-first copy keys? |
| Accessibility | Does it preserve keyboard use, focus states, screen-reader labels, and reduced-motion behavior? |
| BFF/Auth | Does it avoid raw DB/provider/auth payloads in Client Components? |
| Dependency | What package, registry, or copied source does it add? |
| License | Is the source open/license-compatible for this repo? |
| Bundle/performance | Is the cost acceptable for a primary work page? |
| Rejection | What simpler local option was rejected, and why? |

If any answer is unclear, use the resource only as visual reference, not runtime code.

### 8.3 Approved Default Composition Recipes

Use these recipes before inventing custom UI:

| Page need | Fast composition |
|---|---|
| Queue/list page | shadcn `Table` or compact list + filter bar + selected detail `Sheet` |
| Settings/control plane | left section index + form/detail pane + status `Badge` + `Alert` for blocked state |
| Admin proof page | summary rows + filterable table + collapsible evidence detail |
| AI conversation | AI Elements conversation/message/prompt/sources patterns adapted to current BFF DTOs |
| Command palette | shadcn `Command` in a `Dialog` for global search/action jump |
| Manual Ops handoff | compact `Alert` + copyable command/path + admin detail link |
| Loading/empty/error | `Skeleton`, concise empty state, and one next action |
| Animated transition | Motion layout transition for side rail/open detail only |

### 8.4 Anti-Patterns

Do not use resources in ways that undermine the target:

- Do not import a full dashboard template and bend the product around it.
- Do not add decorative animated backgrounds, gradient orbs, marquee walls, confetti, or hero sections to protected work pages.
- Do not add Magic UI effects to every card or button.
- Do not mix multiple component libraries with competing primitives.
- Do not ship English-first template copy and "translate later" by hand.
- Do not add AI Elements runtime integration before BFF/auth/audit contracts are ready.
- Do not let borrowed components introduce client-side data fetching for protected owner data.

### 8.5 Target Resource Workflow

For each UI implementation slice:

1. Start from `PLN-068` page target and the browser audit issue.
2. Select at most one primary external resource family for the slice.
3. Inspect the source/docs and write the resource decision.
4. Adapt into the shared Personal OS skeleton.
5. Convert visible strings to Chinese-first copy keys.
6. Run local type/static checks.
7. Browser-smoke the target route when the slice changes layout.

This makes external resources an accelerator, not a new source of interface drift.

## 9. Multi-Stage Plan

### Phase 0 - Owner Target Review

Goal: confirm this document's target before runtime work.

Deliverables:

- `PLN-068` target and staged plan.
- Owner decision recorded: immediate `UI-L4` full language switching goal.
- Owner decision recorded: dashboard label is `今日`.
- Owner decision recorded: normal pages hide task ids; docs/admin keep them.
- Owner decision recorded: secondary modules collapse under `更多`.
- Owner decision recorded: `今日` includes Core AI orchestration fed by module AI sharing settings.

Exit criteria:

- Owner approves, adjusts, or rejects the target.

### Phase 1 - Copy And Layout Foundation

Goal: create the shared foundation so page work does not keep diverging and bilingual runtime switching is possible.

Tasks:

- `OWNEROS-COPY-001`: Define bilingual copy registry and naming rules.
- `OWNEROS-UI-007`: Define shared first-viewport component contract for concise SaaS pages.
- `OWNEROS-I18N-001`: Add language preference state, locale provider/helper, and `zh-TW` / `en-US` switching for primary protected shell copy without route-level locale URLs.
- `OWNEROS-UI-ACCEL-001`: Create a resource adoption checklist and approved component/source registry for shadcn/ui, `lucide-react`, AI Elements, Motion/react-motion, Magic UI, and selected GitHub reference repos.

Acceptance:

- Main owner-facing labels use Traditional Chinese.
- New page titles and action labels map to stable copy keys.
- English display values exist for primary navigation, page headers, commands, state chips, and core empty/loading/error states.
- `/settings` exposes language preference.
- Runtime UI slices can use external components only after the resource decision gate is recorded.

### Phase 1B - Core AI Sharing And Capability Governance

Goal: define the governed path for module AI sharing, Today generation, owner comments, and action proposals before any broad API operation.

Tasks:

- `OWNEROS-AI-ORCH-001`: Define Core AI orchestrator AgentFacts-lite manifest, module sharing settings, context package contract, and Today's summary BFF shape.
- `OWNEROS-AI-ORCH-002`: Define capability registry for module TODO/API actions with risk, approval, dry-run, audit, and rollback fields.
- `OWNEROS-TODAY-001`: Define `/dashboard` as `今日`, including summary, next actions, owner comment input, action proposal queue, and module context freshness.

Acceptance:

- Module AI sharing is opt-in per module and scoped by settings.
- Core AI can summarize and propose actions without unrestricted API execution.
- Owner comments become reviewable action proposals before mutation.
- High-risk modules and public output remain approval-gated.

### Phase 2 - Core AI Work Loop

Goal: make the Gate A work path feel immediately usable.

Routes:

- `/ai-input`
- `/inbox`
- `/dashboard`

Tasks:

- `OWNEROS-AIINPUT-UI-002`: Contract `/ai-input` into source/conversation index, central review, and collapsible proposal/context rail.
- `OWNEROS-INBOX-UI-001`: Convert `/inbox` to queue-first triage with selected item detail and return path.
- `OWNEROS-DASHBOARD-UI-002`: Rename `/dashboard` to `今日`, reduce proof text, and show Core AI summary/next-action proposal structure.

Acceptance:

- The owner can capture, review, route, and return without reading raw gate/proof language.
- First viewport shows one clear next action.
- Mock/formal/manual state remains visible but compact.
- Task ids stay hidden from normal UI and remain available through docs/admin.

### Phase 3 - Control Plane

Goal: make system state, setup, agent control, and proof understandable without flooding daily pages.

Routes:

- `/settings`
- `/admin`
- `/admin/detail/*`
- `/agents`

Tasks:

- `OWNEROS-SETTINGS-UI-002`: Build stable settings sections: identity, workspace, sources, modules, agents, language, env/manual ops.
- `OWNEROS-ADMIN-UI-002`: Make `/admin` an operator queue first, evidence drilldown second.
- `OWNEROS-AGENTS-UI-002`: Make `/agents` a command catalog with selected dry-run detail and proposal output.
- `OWNEROS-SETTINGS-AI-SHARING-001`: Add module AI sharing controls and approval modes to settings.

Acceptance:

- Owner can find setup and blockers from `/settings` or `/admin`.
- Technical proof is accessible but not forced into core work pages.
- Agent operations remain dry-run/proposal-only unless explicitly approved later.
- Language preference and module AI sharing policy are visible in settings.

### Phase 4 - Core Module Convergence

Goal: make operational modules feel like the same product.

Routes:

- `/work`
- `/work/[projectId]`
- `/research`
- `/research/*`
- `/company`
- `/workflow`

Tasks:

- `OWNEROS-WORK-UI-002`: Fix successful Work detail state and make project detail match the shared skeleton.
- `OWNEROS-RESEARCH-UI-002`: Fold research subpages into one shared research operating shell.
- `OWNEROS-COMPANY-UI-002`: Keep company lanes concise and move proof/safety detail to admin.
- `OWNEROS-WORKFLOW-UI-001`: Replace workflow card/button grid with run queue, trigger config, and detail state.

Acceptance:

- Each core module has a resource index, detail/work surface, AI proposal rail, records/audit, and boundary section.
- Subpages do not feel like separate products.

### Phase 5 - Secondary And High-Risk Modules

Goal: make prototype/high-risk modules honest but useful.

Routes:

- `/self`
- `/chamber`
- `/life`
- `/finance`
- `/client/[token]`

Tasks:

- `OWNEROS-SELF-UI-001`: Self reflection capture, theme timeline, private boundary.
- `OWNEROS-CHAMBER-UI-001`: CRM contact/follow-up/event queue.
- `OWNEROS-LIFE-UI-001`: Daily check-in first, fitness/routine secondary.
- `OWNEROS-FINANCE-UI-001`: Read/proposal-only finance table with high-risk boundary.
- `CLIENT-UI-001`: Client fail-closed page with useful owner/client next steps.

Acceptance:

- High-risk modules clearly say what is safe now and what is not enabled.
- Pages are operational prototypes, not generic placeholder panels.

### Phase 6 - Browser QA And Language Expansion Readiness

Goal: prove the simplified interface is coherent before adding deeper features.

Tasks:

- `OWNEROS-QA-UI-001`: Browser traversal smoke for all primary routes.
- `OWNEROS-QA-UI-002`: Mobile and narrow-width pass.
- `OWNEROS-I18N-002`: Add settings-level language preference placeholder and confirm copy-key coverage.

Acceptance:

- No primary protected page has horizontal overflow.
- No primary protected page exposes raw technical proof as the first interaction.
- Chinese copy is consistent across all primary pages.
- Future English UI can be added by completing `en-US` copy values, not by rewriting page components.

## 10. Recommended Implementation Order

Shortest safe order after owner approval:

1. `OWNEROS-COPY-001` - bilingual copy registry and Chinese/English naming taxonomy.
2. `OWNEROS-I18N-001` - settings-level language preference plus locale provider/helper.
3. `OWNEROS-UI-ACCEL-001` - approved acceleration resource registry and adoption gate.
4. `OWNEROS-AI-ORCH-001` - Core AI/module sharing/context package contract.
5. `OWNEROS-AI-ORCH-002` - approved capability registry for TODO/API proposals.
6. `OWNEROS-DASHBOARD-UI-002` - rename and structure `/dashboard` as `今日`.
7. `OWNEROS-AIINPUT-UI-002` - simplify the core AI Work Desktop.
8. `OWNEROS-INBOX-UI-001` - make Inbox the return path.
9. `OWNEROS-SETTINGS-UI-002` - add language/settings/control sections.
10. `OWNEROS-SETTINGS-AI-SHARING-001` - add module AI sharing controls.
11. `OWNEROS-ADMIN-UI-002` - move proof noise into indexed drilldowns.
12. `OWNEROS-WORK-UI-002` - fix Work detail load state and structure.
13. `OWNEROS-RESEARCH-UI-002` - unify research subpages.
14. `OWNEROS-WORKFLOW-UI-001` - make workflow queue-based.

This order favors actual owner use before broad module polish.

## 11. Stop Conditions

Stop and ask for owner direction before:

- Enabling full public output.
- Enabling provider-backed agent execution.
- Adding route-level locale switching that affects URLs, auth, cookies, or redirects.
- Making high-risk Finance/Life/Company final writes.
- Removing visible mock/proposal/manual-ops states.
- Changing DB schema only for UI simplification.
- Adding a large UI package/template dependency that changes app architecture or bundle shape.
- Copying a third-party template without license review and Personal OS skeleton adaptation.
- Letting Core AI execute unregistered or unapproved API capabilities.
- Allowing module sharing to include high-risk/private records without explicit owner settings and redaction rules.
- Making `今日` generate public output or send external messages without approval.

## 12. Owner Review Questions

Please evaluate these before implementation:

1. Confirm whether full language switching can be app-level settings based first, without URL-level locale routing.
2. Confirm whether `更多` should contain only `自己/商會/生活/財務`, or also lower-frequency routes such as `client preview`.
3. Confirm whether Core AI may auto-execute low-risk TODO edits after owner approval mode is configured, or should all actions remain proposal-only first.
4. Confirm whether Magic UI/Motion can be used for selected onboarding/empty-state sections, or only subtle microinteractions.

## 13. Non-Goals For This Plan

This plan does not:

- claim Gate A/B/C completion;
- change auth, permissions, schema, provider runtime, public routes, or deployment state;
- implement full translations;
- remove admin proof or manual ops evidence;
- hide product maturity limitations.

It only defines the target and staged route for a concise Chinese-first SaaS interface.
