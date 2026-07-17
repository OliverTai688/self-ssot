# Cross-Module Resource / Agent / Records Tab Parity Gap Research

**Document ID:** `RES-009`
**Last updated:** 2026-07-14 (revision 2 — owner decision update; scope held to tab-parity IA, companion document created)
**Status:** Research / design — no runtime implementation in this document
**Trigger:** Owner-directed product feedback: "我希望每個模組都可以有這幾個 tab 來讓人與 AI 可以進行共同管理，目前只有工作模組有" (every module should have the 專案/代理人/紀錄-style tabs for human+AI co-management; today only Work has them), attached against the Work module top nav (`專案` active, `代理人` / `紀錄` shown greyed-out with "即將"). **Revision 2 trigger:** immediately after this document's first version, the owner confirmed twelve much larger product decisions about what should actually *run inside* those tabs (data/trigger model, Analysis Events, Inbox/Thread, Action Plan approval, automation permissions, per-module agent continuity, multi-agent conversation, RACI, rejection/learning, failure/recovery) and explicitly asked that this document's scope stay narrow while a new companion document carries the larger model.

---

## 1. Purpose

The owner's stated mental model is: Work is the only module with a resource / agent / records tab set, and the other ten modules need it too. That premise is only half true. This document audits all 11 permissioned modules against the pattern `AGENTS.md` §12 and `ARC-012` already prescribe, finds that a shared component (`ModuleOperatingShell`) already ships a fuller version of this pattern in five modules than Work's own module-level nav does, and converts the real remaining gap into executable backlog rows.

This matters because the owner's literal ask ("copy Work's tabs everywhere") would propagate the *weaker* implementation (hard-disabled, unclickable stub tabs) instead of the *stronger* one (enabled tabs with mock-labeled Agent/Records content) that already exists elsewhere in the codebase. Research before implementation prevents that regression.

**This document answers "do the tabs exist and are they consistent?" only.** It does not answer "what should the Agent tab actually show" or "how does data get from a source into an Inbox message" — those questions are now answered in `RES-010` (§1A below).

## 1A. Owner Decision Update (2026-07-14, revision 2)

Immediately after this document's first version was written, the owner confirmed twelve additional product decisions, spanning: DB-first data storage with manual/cron/condition-triggered analysis and diff-only re-analysis with Git-style versioning; one `Analysis Event` per full analysis pass, mapping to one Inbox message and one full Markdown report, with a Raw Record → Event Report → Memory Candidate → Approved Memory classification pipeline (not automatic long-term memory); Inbox Items that read like a letter with an optional discussion `Thread`; Action Plans requiring explicit execution confirmation, editable external content, and a distinction between "accepting AI's judgment" and "authorizing execution"; a per-action-type automation-permission table judged by action/target/data-scope/recipient/context, not API name; one persistent Agent per module with its own role/scope/schedule/memory/budget, `AgentRun` as one concrete instance; ten specific questions the Agent tab must answer; a public multi-agent conversation surface plus per-module private reflection records; owner-approval-gated invitation of another module's agent mid-conversation; RACI applied per Action Step (not per event) alongside a Case Owner Agent, Human Owner, and Action Plan Orchestrator; a rejection-reason taxonomy plus context-scoped learning and an explicit Context Change Event flow; and a failure/retry/recovery model grounded in Saga/circuit-breaker/idempotency/dead-letter-queue/tracing patterns.

**This is a different altitude than tab parity.** Tab parity (this document) is about whether a visible UI surface exists and is consistently enabled. The owner's twelve decisions are about what data model, agent behavior, and safety architecture back that surface once it does something real. Folding all of that into this document would make it lose focus and would bury the tab-parity findings under a much larger scope.

**Per the owner's explicit instruction, this document's scope stays held to tab-parity IA.** The full model is now documented in a new companion document:

> **`RES-010_cross-module-human-ai-agent-operating-model-research.md`** — Cross-Module Human-AI Agent Operating Model Research. Covers the Agent model (§6.1), data/trigger/versioning (§6.2), Analysis Event/report/memory pipeline (§6.3), Inbox Thread (§6.4), Action Plan/RACI/Orchestrator (§6.5), execution safety states (§6.6), automation permission matrix (§6.7), public multi-agent conversation (§6.8), cross-agent invitation (§6.9), failure/recovery (§6.10), the Agent tab's content contract (§7), and a full executable task backlog (`EVENTOPS-0NN`, plus `AGENT-017`/`018`).

See §9 below for exactly what moved out of this document and why.

## 2. Source Basis

Local docs and code reviewed:

- `docs/02_architecture-and-rules/ARC-012_frontend-operating-surface.md` §3–§6 — the existing IA contract: every module should eventually expose `/{module}`, `/{module}/agent`, `/{module}/records`, `/{module}/settings`, implementable first as tabs inside one route.
- `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md` §3, §9 — resource index → agent workspace → records/audit → settings/boundaries as the shared SaaS/OS surface standard, with external references already cited (Shopify Polaris index table, Atlassian Dynamic Table, Supabase PGAudit).
- `docs/02_architecture-and-rules/ARC-030_module-resource-index-bff-contract.md` — the future BFF shape for the resource-index tab once a module goes real-data.
- `docs/02_architecture-and-rules/DBS-005_per-module-real-data-migration-matrix.md` — confirms only Work is DB-backed; all others are mock/UI-first, so any tab work here is UI-only by design.
- `AGENTS.md` §8 (Module Boundaries table), §12 (UI/UX Rules), §7 (Research-To-Task Quality Gate, Page Requirement Understanding Score Gate).
- `src/types/module-permission.ts` — canonical list of 11 modules: `ai-input, dashboard, inbox, self, work, research, chamber, finance, life, company, workflow`.
- `src/app/(dashboard)/work/work-client.tsx` (`MODULE_VIEWS`, `AgentModuleView`, `RecordsModuleView`) — Work's module-level tab nav.
- `src/app/(dashboard)/work/[projectId]/project-detail-client.tsx` (`AgentTab`, `RecordsTab`) — Work's project-detail-level tabs (a second, different treatment of the same "not yet proven" state).
- `src/components/layout/module-operating-shell.tsx` — the shared five-tab component (`總覽 / 操作 / 代理人 / 紀錄 / 設定`) already used by `self`, `chamber`, `finance`, `life`, `company`.
- `src/app/(dashboard)/{self,chamber,finance,life,company}/page.tsx` — confirmed shell usage and per-module `ModuleOperatingRecord[]` / `ModuleAgentProposal[]` data.
- `src/app/(dashboard)/research/page.tsx`, `research/layout.tsx` — confirmed no shared tab bar; IA is a dashboard of links to separate sub-routes (`/research/sources`, `/research/writing`, `/research/graph`, `/research/events`, `/research/issues`, `/research/people`, `/research/exploration`, `/research/readiness`).
- `src/app/(dashboard)/workflow/page.tsx` — confirmed no tab bar; `AgentRegistryPanel` and `AuditTrail` render as permanently-visible split-pane sections, not as switchable tabs.
- `src/app/(dashboard)/ai-input/ai-input-client.tsx`, `inbox/page.tsx`, `dashboard/page.tsx` — confirmed no resource/agent/records tab concept at all; each has its own bespoke, workflow/triage-shaped IA.
- `docs/05_execution-plans/PLN-060_task-backlog.md` — `WORK-007` (persistence proof) status is `BLOCKED`, confirming Work's module-level Agent/Records disable is a deliberate, still-valid gate rather than stale code; task-id prefix precedent (`WORK-`, `RESEARCH-`, `INTERFACE-`, `UIUX-`) used for new row numbering.
- `docs/07_research-and-design/RES-010_cross-module-human-ai-agent-operating-model-research.md` (revision 2 addition) — the companion document carrying everything in §1A; cross-referenced here so a reader lands in the right document for the right question.

## 3. Current-State Audit

| Module | Top-level tab bar? | Resource tab | Agent tab | Records tab | Data backing | Notes |
|---|---|---|---|---|---|---|
| `self` | Yes — `ModuleOperatingShell` (5 tabs) | 總覽/操作 | ✅ enabled, mock proposals, approve/reject flips local state | ✅ enabled, mock audit rows | Local `useState` only | Reference implementation |
| `chamber` | Yes — `ModuleOperatingShell` | 總覽/操作 | ✅ enabled | ✅ enabled | Local `useState` only | Reference implementation |
| `finance` | Yes — `ModuleOperatingShell` | 總覽/操作 | ✅ enabled | ✅ enabled | Local `useState` only | Reference implementation, high-risk labeled |
| `life` | Yes — `ModuleOperatingShell` | 總覽/操作 | ✅ enabled | ✅ enabled | Local `useState` only | Reference implementation, privacy labeled |
| `company` | Yes — `ModuleOperatingShell` | 總覽/操作 | ✅ enabled | ✅ enabled | Local `useState` only | Reference implementation, high-risk labeled |
| `work` (module list) | Yes — bespoke pill nav (`MODULE_VIEWS`) | 專案 (only enabled tab) | ❌ **hard-disabled**, unclickable, "即將" | ❌ **hard-disabled**, unclickable, "即將" | N/A (DB-backed resource tab; tabs never render) | The module the owner screenshotted. Gate condition (`需 AUTH-001 + WORK-007`) is still valid per backlog (`WORK-007 = BLOCKED`), but the *treatment* — an unclickable tab instead of an enabled tab with mock content — is weaker than every FOPS-shell module above. |
| `work` (project detail) | Yes — bespoke `Tabs` (5 tabs: 總覽/工作/客戶/代理人/紀錄) | 總覽/工作 | ✅ enabled, mock proposals with disabled accept/reject buttons + boundary panel | ✅ enabled, empty-state table | Local `useState` / real project data for 總覽/工作/客戶 | A *third*, different treatment of the same gate: tab is clickable, content is visible, but action buttons inside are disabled. Better than the module-list treatment, still inconsistent with the shell's fully-interactive local-state simulation. |
| `research` | No | Dashboard of link-cards to 8 sub-routes | None at module top level | None at module top level | Mock/state per sub-route | Biggest structural gap: no place a user or agent can land that says "here is Research's agent queue" or "here is Research's record trail" without already knowing which of 8 sub-routes to open. |
| `workflow` | No (split-pane, not tabs) | `AgentRegistryPanel` + rule list + `FlowVisualizer` always visible together | Present as content (`AgentRegistryPanel`), not as a distinct tab | Present as content (`AuditTrail`), not as a distinct tab | Mock `WorkflowRule` state | Functionally closest to done — the three concerns already exist — but not exposed as the tab pattern the owner is asking to see everywhere for consistency. |
| `ai-input` | No (own subpage nav: `AI 對話 / 參考脈絡 / 檔案庫 / 圖片庫 / 同步設定 / AI 工作台`) | `AI 工作台` is closest to a resource view | `AI 對話` is the de facto agent surface, not labeled/shaped like the other modules' Agent tab | `工作紀錄` exists as a table section inside `AI 工作台`, not a first-class Records tab | Mock, per `RES-006` | Already the most agent-native module; forcing the generic 3-tab shape on top would likely fragment an already-coherent, more advanced IA. Needs a scope decision, not a mechanical copy. |
| `inbox` | No | Triage queue is the primary (only) surface | None | None | Mock | Single-purpose queue page; smallest module. Its future shape is being redesigned by `RES-007` (`InboxItem`/`InboxThread`) independent of this document's tab-parity question. |
| `dashboard` | No | Morning-brief cards are the primary surface | None | None | Mixed | Per `ARC-012` §6, Dashboard's "agent" surface may just be the global assistant panel, not a dedicated tab — needs the same scope decision as `ai-input`. |

**11 modules total. 5 already have full parity (`self/chamber/finance/life/company`). Work has two *different*, both weaker, treatments. Research and Workflow have zero tab-level exposure despite having most of the underlying content already. AI Input, Inbox, and Dashboard are structurally different job-shapes where a mechanical copy may not be the right fit.**

## 4. Key Finding: The Maturity Inversion

Work is the repo's only DB-backed, most-proven module (`AGENTS.md` §8), yet its module-level Agent/Records exposure is the *weakest* in the whole app — literally unclickable — while five mock-only FOPS-shell modules already ship the *fullest* version (clickable tabs, simulated proposals, approve/reject interaction, badges disclosing "Prototype / no DB write"). This is backwards from what a user browsing the app would expect, and it is very likely the direct cause of the owner's screenshot and request: Work looks less capable than modules that are earlier in their build-out, because Work chose the more conservative (hard-disabled) UI treatment for an unproven backend, while the shell chose the more informative (enabled + labeled-mock) treatment for a backend that was never going to be proven in this phase anyway.

The fix is not "add tabs to every module" as a blanket instruction — it is "finish rolling out the *already-designed and already-proven* `ModuleOperatingShell` pattern (or an equivalent) to the modules that lack it, and correct Work's module-list tab treatment to match the shell's convention instead of hard-disabling."

## 5. Understanding Score

Page Requirement Understanding Score Gate (`AGENTS.md` §7), applied to "cross-module tab parity":

| Dimension | Score | Basis |
|---|---|---|
| Actor/job clarity | 18/20 | Owner explicitly wants human+AI co-management surfaced uniformly; actor is Owner across all modules. |
| PRD/local evidence fit | 19/20 | `ARC-012` already specifies the exact target IA; `DBS-005`/`AGENTS.md` §8 already state per-module real/mock status. |
| Data/BFF/API clarity | 14/20 | UI-only slice is unambiguous (all non-Work modules are mock by design); real BFF backing per module remains an open, separately-scoped migration (`DBS-005`, `ARC-030`). |
| UI interaction/reference-pattern confidence | 14/15 | `ModuleOperatingShell` is a working, in-repo reference implementation already used by 5 modules — the strongest possible precedent. |
| Risk/auth/public-output clarity | 13/15 | No high-risk final writes; local-state-only "approve/reject" is already the established safe pattern; Work's real DB status requires care not to imply persistence where none exists. |
| Acceptance/verification clarity | 8/10 | Typecheck/build + visual/manual tab-click smoke is sufficient; no new BFF contract to verify in this slice. |
| **Total** | **86/100 — High** | Requires 3 research rounds on the same page issue before implementation tasks are cut (below). |

### Round 1 — Local code/PRD fit
Completed in §3–§4 above: full 11-module audit against `ARC-012`, confirming the shell already exists and is under-applied, and that Work's disable state is real gate state, not stale code.

### Round 2 — Comparable pattern
`RES-002` §3 already surveyed external references for this exact shape (resource index + agent workspace + audit log): Shopify Polaris index tables, Atlassian Dynamic Table, Supabase PGAudit-style audit logs. No new external research was needed — the strongest comparable pattern is the repo's own `ModuleOperatingShell`, which already encodes those references into a working component. Re-fetching the same external sources would not change the recommendation.

### Round 3 — Risk/auth/data boundary
Confirmed via `AGENTS.md` §8/§11 and `DBS-005`: every module except Work is explicitly mock/no-DB, so extending the shell's tab pattern to them carries no auth or high-risk-write exposure — it is a UI-only, additive change. Work is the one module where the tab *content* must stay labeled "mock/no-DB" even after the tab itself becomes clickable, so the fix there is presentation-only (match the shell's enabled+labeled convention), not a change to what WORK-007 gates.

## 6. Recommended Standard

Amend `ARC-012` (do not create a competing new architecture doc) with an explicit **minimum module tab contract**:

1. Every module route (`/{module}` or its top-level client component) exposes at minimum three tabs/views: a primary resource/operation view (module-specific), `代理人` (Agent), and `紀錄` (Records). `總覽` and `設定`/`邊界` may be folded in per `ModuleOperatingShell`'s existing 5-tab shape or added later; they are not required for parity with the owner's ask.
2. **Never hard-disable an Agent/Records tab.** If the module's real backend is unproven (e.g. Work pending `WORK-007`), the tab stays clickable and renders mock/simulated content with an explicit `Prototype / no DB write` or `Mock` badge — the convention `ModuleOperatingShell` and Work's own project-detail `AgentTab`/`RecordsTab` already use. A hard-disabled, unclickable tab communicates "this doesn't exist yet" when the accurate message is "this is a working simulation of what will exist."
3. Adopting the shared `ModuleOperatingShell` component is the default path for modules whose primary content is a resource list/queue (`research`, `workflow`). Modules whose primary content is already a conversation/triage flow (`ai-input`, `inbox`, `dashboard`) require an explicit scope decision rather than mechanical adoption — see MODSHELL-005 below.
4. **What the Agent/Records tabs actually render, once real data exists, is out of this document's scope.** The Agent tab's content contract (the ten questions the owner wants it to answer) and the Records tab's eventual data source (`AnalysisEvent`, audit events) are defined in `RES-010` §7 and §6.3/§6.10. This document only governs tab *presence* and *enabled state*.

## 7. Gap Findings

1. Work's module-list Agent/Records tabs (`work-client.tsx` `MODULE_VIEWS`) are hard-disabled (`available: false`, `disabled` on the `<button>`), the weakest treatment in the app, despite the underlying gate (`WORK-007`) being identical in spirit to what `ModuleOperatingShell` already handles by staying enabled-with-mock-badge.
2. Work has two different in-app treatments of the same "backend unproven" state (module-list: unclickable; project-detail: clickable with disabled inner buttons) — an internal inconsistency independent of the cross-module question.
3. Research has zero module-level Agent/Records exposure; its 8 sub-routes bury any agent/records concept behind navigation the owner would have to already know exists.
4. Workflow has the underlying content (`AgentRegistryPanel`, `AuditTrail`) but exposes it as always-visible split panes, not as the tab-switch pattern used everywhere else — inconsistent IA between otherwise-similar-maturity modules.
5. AI Input, Inbox, and Dashboard do not fit the resource/agent/records shape as directly (queue/conversation-first, not resource-list-first); applying the pattern mechanically risks fragmenting IA that is already more advanced in AI Input's case (`RES-006`).
6. No formal doc currently states the "never hard-disable, always enabled+labeled-mock" convention — it exists only as an emergent pattern in `ModuleOperatingShell`, so future modules risk repeating Work's regression.
7. **(Revision 2 addition)** Even once every module's Agent/Records tabs are clickable and mock-labeled (`WORK-018`/`RESEARCH-002`/`WORKFLOW-001` below), they will render placeholder content until `RES-010`'s `AnalysisEvent`/`AgentRun`/`InboxThread` objects exist — this document's fixes make the *tabs* consistent; `RES-010`'s fixes make the *content* real. Neither is complete without the other, but they are sequenced independently (tab-parity work does not block on `RES-010`, and vice versa).

## 8. Executable Task Shape

| Task id | Title | Module | Scope | Acceptance criteria | Files likely affected | Verification | Risks / stop conditions |
|---|---|---|---|---|---|---|---|
| `MODSHELL-001` | Amend ARC-012 with minimum module tab contract | Architecture / Docs | Add §8 to `ARC-012` codifying the 3-tab minimum and the "never hard-disable, enabled+labeled-mock" convention from this doc's §6 | `ARC-012` documents the contract; `MAN-001`/`ACC-002` reference it where relevant | `docs/02_architecture-and-rules/ARC-012_frontend-operating-surface.md`, `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md` | Docs review, `git diff --check` | None — docs-only. |
| `WORK-018` | Un-disable Work module-list Agent/Records tabs with mock-labeled content | Work | Replace `MODULE_VIEWS`' `available: false` gating in `work-client.tsx` with the shell convention: clickable tabs, `AgentModuleView`/`RecordsModuleView` render existing stub content plus an explicit `Prototype / Mock — 需 WORK-007 完成後啟用真實資料` badge, matching `AgentTab`/`RecordsTab`'s existing project-detail treatment | Both Work tabs are clickable; content matches project-detail's mock convention; `WORK-007` gate note is preserved verbatim so the real-data cutover trigger stays documented | `src/app/(dashboard)/work/work-client.tsx` | `pnpm exec tsc --noEmit --pretty false`, `pnpm build`, manual tab-click smoke | UI-only; do not imply persistence or wire any Server Action; do not change `WORK-007` status. |
| `RESEARCH-002` | Add Agent/Records tabs to Research module | Research | Add a top-level tab bar to `research/page.tsx` (or adopt `ModuleOperatingShell`) exposing 總覽 (existing dashboard content), 代理人 (mock `ResearchAgent` proposal queue per `ARC-020`), 紀錄 (mock audit rows); keep existing 8 sub-routes reachable from 總覽 unchanged | Research module has a discoverable Agent/Records surface without removing existing sub-route navigation | `src/app/(dashboard)/research/page.tsx`, possibly a new `research-client.tsx` | `pnpm exec tsc --noEmit --pretty false`, `pnpm build`, manual smoke | Must preserve source/citation metadata references per `ARC-020` ResearchAgent charter; no DB reads/writes. Good candidate for `RES-010`'s `EVENTOPS-020` first vertical slice once tabs land. |
| `WORKFLOW-001` | Expose Workflow's existing Agent/Records content as switchable tabs | Workflow | Wrap existing `AgentRegistryPanel` and `AuditTrail` in a tab switcher (資源=rule list/`FlowVisualizer`, 代理人=`AgentRegistryPanel`, 紀錄=`AuditTrail`) instead of permanent split panes | Same content, now tab-switchable, consistent with other modules' IA | `src/app/(dashboard)/workflow/page.tsx` | `pnpm exec tsc --noEmit --pretty false`, `pnpm build`, manual smoke | Low risk — pure layout change, no data/logic change. |
| `MODSHELL-005` | Owner scope decision: AI Input / Inbox / Dashboard tab-shape fit | AI Input, Inbox, Dashboard | Not an implementation task. Present the owner with the fact that these three modules are queue/conversation-first (not resource-list-first) and ask whether they want (a) the generic 3-tab shape bolted on anyway for visual consistency, (b) an explicit mapping of their existing surfaces to the Agent/Records role (e.g. AI Input's `AI 對話`→Agent, `工作台`'s 工作紀錄 table→Records) with no new UI, or (c) exclude these three from the parity requirement entirely | A recorded owner decision in `PLN-061`/`PLN-060`, not new code | none until decision made | none | Ambiguous scope per `AGENTS.md` §7 — stop for owner direction before writing UI for these three. Note: `RES-007` has separately redesigned `/inbox`'s data model (`InboxItem`); this decision is only about tab *shape*, not `/inbox`'s content redesign. |

**Everything in `RES-010`'s `EVENTOPS-0NN`/`AGENT-017`/`AGENT-018` series is a separate task series, not a modification of the five rows above.** See `RES-010` §10 for that backlog.

## 9. Out of Scope / Routed to Companion Document

The following are confirmed **out of this document's scope** as of revision 2, and now live in `RES-010` instead:

| Topic | Where it lives now |
|---|---|
| Data/trigger model, diff-only re-analysis, Git-style resource versioning | `RES-010` §6.1–§6.2 |
| `Analysis Event`, its Markdown report shape, and the memory-classification pipeline | `RES-010` §6.3 |
| `Inbox Thread` (ongoing discussion attached to an Inbox Item) | `RES-010` §6.4 |
| Action Plan, execution confirmation, "accept judgment vs. authorize execution," execution safety states | `RES-010` §6.5–§6.6 |
| Automation permission matrix (action/target/data-scope/recipient/context) | `RES-010` §6.7 |
| Per-module persistent Agent model, `AgentRun`, Agent tab content contract | `RES-010` §6.1, §7 |
| Public multi-agent conversation and per-module reflection records | `RES-010` §6.8 |
| Owner-approval-gated cross-agent invitation | `RES-010` §6.9 |
| Cross-module RACI, Case Owner Agent, Action Plan Orchestrator, Research→Work handoff | `RES-010` §6.5 |
| Rejection-reason taxonomy and Context Change Event | `RES-010` §6.9 (owner decision), synthesized in `RES-010` §6.3/§6.9 |
| Failure/retry/recovery model (saga, circuit breaker, idempotency, DLQ, tracing) | `RES-010` §6.10 |

**What stays decided vs. still open**, for a reader who wants the status at a glance:

- **Decided (owner-confirmed product direction, architecture now drafted in `RES-010`):** all twelve items in §1A / the table above.
- **Still open / needs implementation-time verification:** every object in `RES-010` §6 remains a type proposal, not applied schema; whether `ResourceVersion` needs more than one parent (Git allows merge commits; this design assumes linear history until a real need for branching appears); the exact UI location of the Global AI Task Center and Agent Schedule Center (`RES-010` `AGENT-017`/`018` are design tasks, not yet built); which module should host `EVENTOPS-020`'s first vertical slice (Research is recommended, not mandated).
- **Unaffected by any of this:** this document's own five task rows (`MODSHELL-001`, `WORK-018`, `RESEARCH-002`, `WORKFLOW-001`, `MODSHELL-005`) — tab-parity work proceeds independently of `RES-010`'s sequencing.

## 10. Rejected Alternatives

- **Copy `work-client.tsx`'s pill-nav pattern to every module.** Rejected: this is the demonstrably weaker of the two patterns already in the codebase (hard-disable vs. enabled+labeled-mock); copying it would regress the five modules that already do better.
- **Build a brand-new shared tab component from scratch.** Rejected: `ModuleOperatingShell` already exists, is proven in five modules, and matches `ARC-012`/`RES-002`'s prescribed shape; reuse over reinvention.
- **Force `ai-input`/`inbox`/`dashboard` into the generic shape immediately.** Rejected for this loop: their IA is queue/conversation-first and, in AI Input's case, already more advanced than the generic shell (`RES-006`); mechanical adoption risks fragmenting a better-than-baseline surface. Routed to an owner scope decision (`MODSHELL-005`) instead of silent implementation.
- **Treat this as purely a documentation gap.** Rejected: `ARC-012` already documents the target; the real gap is inconsistent implementation plus one regressive UI convention (Work's hard-disable), so the artifact must include code-touching backlog rows, not only a doc amendment.
- **(Revision 2) Fold the owner's twelve new decisions into this document.** Rejected per explicit owner instruction: tab-parity IA and the underlying Agent/Analysis/Action-Plan operating model are different altitudes of design work; combining them would bury a focused, already-actionable tab-parity backlog under a much larger architecture synthesis. Routed to `RES-010` instead (§1A, §9).
- **(Revision 2) Delay this document's five task rows until `RES-010`'s architecture is fully specified.** Rejected: the tab-parity fixes (`WORK-018`, `RESEARCH-002`, `WORKFLOW-001`) are UI-presentation-only and do not depend on any object in `RES-010` §6 existing yet — sequencing them behind `RES-010` would be an unnecessary and unjustified delay to an already-scoped, low-risk fix.

## 11. Verification

This document itself is the primary artifact (research-to-task gate satisfied: local audit table, understanding score, 3 rounds, executable backlog rows with scope/acceptance/files/verification/risk). No runtime code was changed. Follow-up loops implementing `WORK-018`, `RESEARCH-002`, or `WORKFLOW-001` should each run `pnpm exec tsc --noEmit --pretty false` and `pnpm build` plus a manual tab-click smoke, per `AGENTS.md` §13.

## 12. Next Loop Recommendation

Start with `WORK-018` (lowest risk, directly resolves the owner's screenshot, single file) and `MODSHELL-001` (docs amendment, no code) in the same loop, then `RESEARCH-002` and `WORKFLOW-001` in subsequent loops. Raise `MODSHELL-005` to the owner before touching `ai-input`, `inbox`, or `dashboard`. **Independently**, `RES-010`'s docs-only architecture rows (`EVENTOPS-001` through `EVENTOPS-015`) can proceed in parallel — they touch different files and have no shared dependency with this document's five rows, except that `RES-010`'s `EVENTOPS-020` first-vertical-slice task benefits from `RESEARCH-002` landing first so Research already has a tab surface to build the vertical slice inside.

---

## Revision 2 Summary

**Added/changed in this revision:**

- New §1A "Owner Decision Update" recording the twelve owner-confirmed decisions and routing them to a new companion document.
- §1 gained one sentence clarifying this document only answers tab *presence/enabled-state*, not tab *content*.
- §2 (Source Basis) gained one new entry: `RES-010`.
- §6 (Recommended Standard) gained point 4, explicitly deferring "what the tabs render" to `RES-010`.
- §7 (Gap Findings) gained finding 7, naming the tabs-vs-content sequencing relationship to `RES-010`.
- §8 (Executable Task Shape) gained one clarifying line: `RES-010`'s task series is separate, not a modification of this document's five rows.
- New §9 "Out of Scope / Routed to Companion Document" — a full mapping table of what moved, plus an explicit decided/open/unaffected breakdown.
- §10 (Rejected Alternatives, renumbered from §9) gained two new rows about the fold-in-vs-separate-document decision and the no-artificial-delay decision.
- §12 (Next Loop Recommendation, renumbered from §11) gained a note that `RES-010`'s docs-only rows can proceed in parallel.
- No change to this document's original five task rows (`MODSHELL-001`, `WORK-018`, `RESEARCH-002`, `WORKFLOW-001`, `MODSHELL-005`) — they remain exactly as originally scoped.

**Owner decisions confirmed this session:** all twelve items listed in §1A (full detail and architecture synthesis in `RES-010` §3's decision register, `OPSDEC-01` through `OPSDEC-12`).

**Still pending decision or verification:** see §9's "decided vs. still open" breakdown — in short, the product direction is confirmed, but every data object in `RES-010` §6 remains an unimplemented type proposal, and the exact host location/module for the Global AI Task Center, Agent Schedule Center, and first vertical slice are recommendations, not final choices.

**New companion document:** `RES-010_cross-module-human-ai-agent-operating-model-research.md` — Cross-Module Human-AI Agent Operating Model Research. Purpose: carry the twelve owner-confirmed decisions about Agent continuity, Analysis Events, versioning, Inbox Threads, Action Plans/RACI, execution safety, automation permissions, multi-agent conversation/invitation, rejection/learning, and failure/recovery into a researched, externally-grounded architecture with an executable backlog, without diluting this document's tab-parity focus.

**Next minimal loop:** implement `WORK-018` (single file, UI-only, directly resolves the owner's screenshot) together with `MODSHELL-001` (docs-only `ARC-012` amendment) — both are low-risk, already-scoped, and require no further research. In parallel or immediately after, start `RES-010`'s `EVENTOPS-001` (create `ARC-033`) since it is the dependency root for that document's entire backlog.
