# Personal OS Browser UI Structure Audit - 2026-08-23

## Scope

Owner request: use the browser skill to traverse the current local app, record interface structure problems, and identify page-specific issues.

Method:

- Browser skill / in-app browser against `http://localhost:3000`.
- Authenticated local session using the current dev login state.
- Route inventory cross-checked with `src/app/**/page.tsx`.
- Static page metrics collected from DOM headings, link/button/input/table counts, border/rounded/card density, and visible risk signals.
- Dynamic route samples were opened where safe sample IDs or surfaced links existed.

External UX references used for direction:

- NN/g dashboard guidance: dashboards should reduce cognitive load and make important signals quick to understand. Source: https://www.nngroup.com/articles/dashboards-preattentive/
- Atlassian navigation redesign: unified navigation reduces mental-model switching across product areas. Source: https://www.atlassian.com/blog/design/how-we-built-a-navigation-that-works-for-everyone
- Material Design navigation rail: rail/top-level navigation should stay limited and predictable. Source: https://m3.material.io/components/navigation-rail/overview
- USWDS side navigation: avoid stacking horizontal and vertical navigation systems when simplification is possible. Source: https://designsystem.digital.gov/components/side-navigation/
- Vercel AI Elements: AI-native UI should be composed from focused conversation, message, input, status, and tool-display primitives. Source: https://elements.ai-sdk.dev/

Local standards used:

- `docs/02_architecture-and-rules/ARC-012_frontend-operating-surface.md`
- `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md`
- `docs/02_architecture-and-rules/ARC-036_simplified-saas-operating-surface-design-pattern.md`
- `docs/02_architecture-and-rules/ARC-037_owneros-core-surface-bff-view-model-contract.md`

## Routes Traversed

Primary/static routes:

`/`, `/ai-input`, `/dashboard`, `/inbox`, `/self`, `/work`, `/research`, `/research/issues`, `/research/sources`, `/research/events`, `/research/exploration`, `/research/people`, `/research/writing`, `/research/graph`, `/research/readiness`, `/chamber`, `/finance`, `/life`, `/company`, `/agents`, `/workflow`, `/settings`, `/admin`, `/admin/detail`, `/admin/detail/all`, `/client/sample-token`.

Dynamic/auth samples:

`/login?next=/ai-input` redirected to `/ai-input` because the current browser session is already authenticated.

`/work/p1` opened but showed `私人工作區暫時無法載入`, so the Work detail page structure could not be judged as a successful project detail state.

`/research/rt-1`, `/research/issues/iss-1`, `/research/writing/wp-1`, `/admin/detail/owner-evidence`, and `/client/tok-lisa-q2-2026` were opened.

Not formally covered:

- True signed-out login state, because preserving the owner's active login was more important than clearing auth state.
- Successful DB-backed `/work/[projectId]` detail state, because the sample route returned a workspace boundary state.
- Successful public client portal token state, because both sample and known mock token stayed unavailable/fail-closed.

## Top-Level Diagnosis

The app is operable, but the interface is not yet a simple owner-grade AI SaaS surface. The main issue is not visual polish; it is structural competition. Several pages expose product work, proof/debug state, module navigation, AI proposal state, and manual ops controls all in the same first viewport.

The target pattern should be:

1. One global sidebar.
2. One page header with title, current mode, and a compact status chip.
3. One command bar with only the next useful actions.
4. One resource index or queue.
5. One primary detail/work surface.
6. One collapsible context/right rail for AI proposal, source evidence, or manual ops.
7. Admin owns verbose proof, gate, readiness, and audit data.

## Global Structure Problems

1. Navigation is stacked too deeply.

Current pages often combine sidebar, top tabs, per-page command buttons, local left indexes, and right panels. This forces the owner to parse too many competing maps before acting. The sidebar should remain the only global navigation. Page tabs should be local and limited.

2. Primary action is frequently below or beside diagnostics.

`/ai-input` shows readiness cards and source/proposal panels before the actual owner work moment. `/admin` and `/research/readiness` are proof-first. For owner-facing pages, the main job should appear first; diagnostics should collapse into a status drawer or admin detail.

3. Proof language leaks into normal product use.

Visible strings like `Gate A not achieved`, `externalRegisterable=false`, `AUTH-*`, `OWNEROS-*`, repeated `Mock`, and `Manual Ops` are useful for development but noisy for daily use. They should be represented by a compact environment/status chip on normal pages and fully expanded only in `/admin`.

4. The visual system is border/card heavy.

Several pages have very high rounded/border density. Measured examples: `/research/readiness` had 414 border-class elements and 369 rounded-class elements; `/admin/detail/all` had 451 border-class elements and 324 rounded-class elements; `/agents` had 198 border-class elements and 194 rounded-class elements. The interface should use fewer framed boxes, more table/list density, and clearer section rhythm.

5. Language and naming are inconsistent.

Sidebar labels are mostly Chinese, while page titles include `Owner Command`, `AI Intake Center`, `Research Operating Desk`, `Agent Command Center`, and `Research formal readiness`. Keep internal/task labels in docs/admin; make owner-facing labels consistent and direct.

6. Similar modules do not share the same operating skeleton.

`/self`, `/chamber`, `/finance`, and `/life` use a generic module/detail layout. `/work`, `/research`, `/company`, `/agents`, `/admin`, and `/ai-input` each have different variants. A shared `OwnerSurface` contract should define header, command bar, index, detail, AI/context rail, and empty state.

7. Records/audit are often walls instead of operational tables.

Proof-heavy pages are long but not always scannable. Admin and readiness pages need filters, compact tables, and drilldowns. Owner-facing module pages should show only the relevant slice.

8. Empty/unavailable states are technical.

Examples: `/settings` showed `正在載入私人工作區`; `/work/p1` showed `私人工作區暫時無法載入`; client portal routes showed `客戶連結目前不可用`. These need human-level next steps and owner/operator actions.

## Page-Specific Issues

| Page | Observed Structure | Main Issue | Direction |
|---|---|---|---|
| `/` | Public boundary/launch readiness page | Reads like an internal proof page, not a simple entry | Keep public entry minimal: product name, owner login, environment state, no proof wall |
| `/login` | Authenticated session redirects to `/ai-input` | Signed-out state not audited in this pass | Keep signed-out login extremely small: email, six-code dev option when mock, provider status collapsed |
| `/ai-input` | AI Work Desktop with top tabs, readiness cards, source index, proposal detail, chat area | Core work surface is overloaded; first viewport competes between capture, review, readiness, source, and settings | Make it a two/three-pane workbench: conversation index, central chat/review, collapsible proposal/source rail |
| `/dashboard` | `Owner Command` page with queue/proof handoff/next actions | Sidebar says `早安簡報`, page says command center; purpose mismatch | Decide whether this is Morning Brief or Command Center; use one daily action queue |
| `/inbox` | Intake center with many buttons | 51 button-like elements; too many equal-weight actions | Make a queue-first page: raw item list, selected item detail, triage action strip |
| `/self` | Generic module focus/detail | Does not yet feel like a self-reflection workflow | Make primary flow: quick capture, reflection timeline, recurring themes, private boundary |
| `/work` | Work operating desk with project queue/readiness | Better direction, but still mixes readiness with work queue | Keep resource index and detail; move proof/readiness to compact status or admin |
| `/work/p1` | Boundary state | Project detail did not load in this session | Need a successful owner workspace detail state before judging detail UX |
| `/research` | Research operating desk | Duplicate heading pattern; root differs from older subpages | Use root as the unified research shell and treat subpages as tabs/views under one model |
| `/research/rt-1` | Research sandbox detail | Older sandbox style differs from new operating desk | Convert to issue/detail surface with material, output, and AI proposal rail |
| `/research/issues` | Issue list | Usable, but isolated from root shell | Fold into shared research shell with consistent command bar and filters |
| `/research/issues/iss-1` | Issue detail | Detail exists, but old layout lacks shared shell consistency | Use same resource-detail-context pattern as Work/Research root |
| `/research/sources` | Source library | Mostly list-like, fewer obvious structural problems | Add filter/search and source-to-issue attribution as primary controls |
| `/research/events` | CFP/event tracker | Card/list hybrid; still okay but separate style | Normalize to table/list with due-date priority and event detail |
| `/research/exploration` | Idea inbox | Reasonable page concept, but needs relation to issue workflow | Treat as inbox queue feeding issues and writing, not a separate mental model |
| `/research/people` | Academic network | Section/card grouping | Convert to people table plus relationship/detail pane |
| `/research/writing` | Writing project list | Sparse but acceptable | Add writing status table and selected project drawer |
| `/research/writing/wp-1` | Writing detail | Older standalone detail | Normalize to writing workspace with outline, feedback, source rail |
| `/research/graph` | Research graph view | Good specialized view, but needs shared shell/context | Keep as visualization mode under research; add clear return and filter affordances |
| `/research/readiness` | Massive readiness/proof surface | Very long, 414 borders, 369 rounded elements; too much for owner surface | Move under admin/proof center; owner research root gets only a compact readiness chip |
| `/chamber` | Generic module focus/detail | Too generic for CRM/relationship work | Primary surface should be contact/event/follow-up queue |
| `/finance` | Generic module focus/detail | High-risk module does not clearly show proposal-only/write boundary | Use read/proposal mode, transaction/cashflow table, explicit no-final-write boundary |
| `/life` | Life rhythm plus fitness tracker | 15 card-like elements and 14 inputs; fitness can dominate life OS | Make daily check-in first, then routines/health signals as secondary |
| `/company` | Company lanes/decisions/policies | Heading is a sentence; still exposes agent/boundary language | Make decision log + knowledge/policy lanes; move technical safety proof to admin |
| `/agents` | Agent command center and preflight/proof | Border-heavy and proof-heavy; command/action not crisp | Use agent catalog table, selected command detail, dry-run output, blocked actions drawer |
| `/workflow` | Workflow page with many buttons/cards | 36 buttons, 12 cards; lacks run queue/table | Make workflows a run queue plus trigger/config detail, with manual execution obvious |
| `/settings` | Workspace loading boundary in current session | The actual settings surface did not fully appear | Need resilient settings shell with Identity, Workspace, Sources, Modules, Agents, Env/Manual Ops |
| `/admin` | Admin control plane | Correct place for proof, but first page still competes between blocker, loop, overview, links | Make operator attention queue first; evidence moved to searchable drilldown |
| `/admin/detail` | Admin detail index | Useful, but detail index and fallback links are verbose | Make it a drilldown selector with filter/search |
| `/admin/detail/all` | Full launch console detail | 40 tables, 451 borders, very long | Keep as archive, but add anchor search/filter and avoid defaulting normal admin users here |
| `/admin/detail/owner-evidence` | Owner evidence section | Very long for a single section; 5 tables and many proof labels | Summarize by pass/fail row first; full evidence below collapsed |
| `/client/sample-token` | Fail-closed route | Secure but sparse | Add owner/client friendly reason and support/return path |
| `/client/tok-lisa-q2-2026` | Also unavailable/fail-closed | Known mock token does not produce usable client preview | Need either a valid preview token path or explicit manual ops guidance |

## Highest-Leverage Redesign Direction

Priority 1: Contract the AI Work Desktop.

`/ai-input` is the core Gate A workbench. It should become a calm capture/review workspace:

- left: conversation/source index;
- center: selected conversation, input, review queue, proposal decision;
- right: collapsible context/proposal/manual ops rail;
- top: page title, owner-private status, environment chip, one primary command.

Priority 2: Create one shared owner surface skeleton.

Apply the same frame to `/dashboard`, `/inbox`, `/work`, `/research`, `/company`, `/agents`, `/settings`, and `/admin`: header, command bar, resource index, detail surface, context rail, compact state chip.

Priority 3: Move verbose proof out of owner work pages.

Gate labels, launch evidence, `externalRegisterable`, `AUTH-*`, `OWNEROS-*`, and long readiness tables should live in `/admin` and detail pages. Owner work pages should show one readable state: `Mock`, `Needs setup`, `Ready`, or `Blocked`.

Priority 4: Normalize module pages.

Generic FOPS module pages should become concrete operating surfaces:

- Chamber: contacts, follow-ups, events.
- Finance: transactions, cashflow, proposal-only high-risk boundary.
- Life: daily check-in, routine, health signal timeline.
- Self: reflection capture, theme timeline, private notes.

Priority 5: Make unavailable states actionable.

Every boundary state should answer:

- What happened?
- What can the owner do next?
- Is this mock/dev/manual ops/production?
- Where is the admin/setup path?

## Proposed Implementation Slices

1. `OWNEROS-UI-AUDIT-001`: Add a shared UI issue tracker from this audit and map each route to a target pattern.
2. `OWNEROS-UI-004`: Refactor `/ai-input` into the contracted workbench shell, preserving current behavior.
3. `OWNEROS-UI-005`: Add reusable `OwnerSurfaceFrame`, `OwnerCommandBar`, `OwnerResourceIndex`, `OwnerContextRail`, and `EnvironmentChip`.
4. `OWNEROS-UI-006`: Move readiness/proof fragments from owner-facing pages into admin drilldowns; replace with compact status chips.
5. `OWNEROS-UI-007`: Rebuild `/settings` as a resilient control-plane shell even when workspace/profile data is loading or unavailable.

## Acceptance Notes

This audit does not claim UI completion. It proves browser traversal and identifies why the interface still feels messy:

- too many competing navigation layers;
- proof/debug state visible in owner workflows;
- inconsistent page skeletons;
- high border/card density;
- unavailable states without clear next action;
- module pages that are generic instead of workflow-specific.

The fastest path to a usable AI SaaS experience is not adding more pages. It is contracting the existing pages into one shared operational design pattern, starting with `/ai-input`.
