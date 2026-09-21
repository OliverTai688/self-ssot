# Work Portfolio Import, Phase/Progress Tracking, Staffing Calendar, and Work Diary — Gap Research

**Document ID:** `RES-021`
**Last updated:** 2026-07-22
**Status:** Research round 1 of an estimated 5 (Low understanding score, see §6) — no schema, service, or UI implementation yet. Blocked on owner decisions in §7.
**Trigger:** Owner-directed request (verbatim): "今天我要執行的目標是把工作目前在執行的所有專案可以匯入進去...但是專案到底有幾個應該是要我手動設定好，然後可以全盤梳理每個專案的進度和從開始到結束的節奏階段，然後讓我知道如果給一個人或多個人做，日期上來說的重要節點忙碌程度大概會是什麼。最後我要有一個基於目標的文件、對應的行事曆來掌握我的專案節奏。另外每個專案應該都要有一個可以輸入工作日記情境的部分，用來記錄說實質的狀況，避免只用數據來推論任務進展。" (Import all currently-running work projects; project count should be manually declared by the owner, not auto-derived; fully map each project's progress and phase rhythm from start to end; show, for single- or multi-person staffing, what the busy/important date milestones look like; produce a goal-based document plus a matching calendar to track project rhythm; give every project a work-diary field to record real qualitative status, not just data-inferred progress.)

---

## 1. Purpose

Determine what it actually takes, in this codebase, to support: (a) manually declaring a portfolio of real in-flight work projects, (b) mapping each project's phase/progress rhythm end-to-end, (c) surfacing staffing-aware busy/milestone dates for one or more people, (d) a goal-based document + calendar view of project rhythm, and (e) a per-project free-text "work diary" for qualitative status. This document audits current Work-module capability against these five asks, scores requirement understanding per `AGENTS.md`'s Page Requirement Understanding Score Gate, and produces the round-1 local-fit lens plus the open questions needed before any backlog/implementation work starts.

## 2. Blocking Constraint: Google Drive Source Is Not Accessible This Session

The owner named `https://drive.google.com/drive/folders/1TsFfzrD9e5LQR3baCLW8w9fuuOty5TXQ` as the primary reference source for project content. The `claude.ai Google Drive` MCP connector is present but **not authorized** in this session, and this session is non-interactive, so the OAuth flow cannot run here. **No file from that folder has been read, listed, or referenced anywhere in this document.** Nothing about the owner's actual current projects is claimed, inferred, or fabricated below — every finding here is about the *system's* current capability, not about the owner's project content.

To unblock: the owner needs to authorize the Google Drive connector via claude.ai connector settings (or `claude mcp` / `/mcp` in an interactive session), after which a future turn can list/read the folder. Until then, real project intake can only happen through manual entry (typed in, or pasted from a doc the owner provides directly in chat).

## 3. Source Basis

Local docs and code reviewed (via a dedicated research pass): `AGENTS.md` §§3, 7, 8, 12; `PRD-001`, `PRD-004`, `PRD-005`; `ACC-001`, `ACC-002`; `PLN-012_work-module-plan.md`; `PLN-060_task-backlog.md`; `PLN-061_current-sprint.md`; `RES-001`, `RES-002`; `ARC-012_frontend-operating-surface.md`; `MAN-001`, `MAN-003`; `src/types/work.ts`; `src/app/(dashboard)/work/work-client.tsx`; `src/lib/mock/work/*`; `src/app/actions/work.ts`; `src/lib/actions/work.ts`; `src/lib/mappers/work.mapper.ts`; `prisma/schema.prisma` (`Project`, `ProjectTask`, `ProjectNote`, `ProjectDeliverable`); the last 3 files under `docs/2_agent-input/generated/agent-loop/reports/`; `docs/2_agent-input/generated/agent-loop/loop-state.json`.

## 4. Current-State Audit

- **Project data model** (`src/types/work.ts`, `prisma/schema.prisma:361`): `Project` has `status`, `phase` (`discovery | planning | execution | review | maintenance`), `health`, `visibility`, `startedAt`/`dueAt`, `tasksDone`/`tasksTotal` (derived, per `WORK-006` / `ACC-002`). **Single-owner only** — `Project.ownerId` is one FK to `Profile`, with no assignee/collaborator/staffing field anywhere in the schema or types.
- **Phase/milestone timeline**: a `ProjectTimeline`/`ProjectPhaseNode` (`startDate`/`endDate`/`status`) with `ProjectMilestone[]` (`title`/`date`/`status`) already exists in `src/types/work.ts` and renders in `src/components/work/timeline/project-timeline-section.tsx` — this is the closest existing concept to the owner's "phase rhythm from start to end" ask. **It is mock-data-only**: no matching Prisma model, no server action, no persistence. Only the 5 seeded mock projects (`src/lib/mock/work/mock-timeline.ts`) have one.
- **Project-list surface**: `src/app/(dashboard)/work/work-client.tsx` exposes `projects | library | agent | records` tabs. `projects` is a **list/table view only** — no kanban, no calendar, no gantt at the module level (the per-project timeline above is buried inside project detail, not a portfolio-wide view).
- **Staffing / multi-person workload**: zero. No `assignee` field, no membership/collaborator table, and (per `RES-020`/`ARC-033`, completed 2026-07-17) the system now has a *hardened* invariant that every Work row is visible only to its single `ownerId`. Any staffing/workload view spanning more than one person is a direct extension of that invariant and must be designed deliberately, not bypassed.
- **Work diary / qualitative status**: zero. `ProjectNote` (`origin: "ai"|"manual"`, `visibility`) is the closest existing free-text capture mechanism, but it is a general project-notes timeline (mixed with AI-generated notes), not a structured, date-stamped "how is this actually going" diary field. No `diary`/`journal` string exists anywhere in `src/`.
- **Calendar**: zero. No calendar model, view, or library dependency exists tied to Work; the only `calendar` hits in the repo are an unrelated icon and an ingestion source-type enum value (`google_calendar`).
- **Backlog/sprint state**: `PLN-060` has no rows for calendar, staffing, portfolio import, or diary. `PLN-061`'s current sprint is entirely launch-blocker/proof-chain focused (auth session proof, multi-tenant isolation, `WORK-009` disposable proof target), not Work feature development. Recent 3 loop reports (`MODLIB-008..012`, `MODLIB-001..005`, `RES-017`) did not touch this area — no repetition risk, but also no existing groundwork to build on beyond what's listed above.
- **Operating-surface pattern already established** (`ARC-012`, `RES-002`): resource index → command bar → detail surface → agent workspace → records/audit → settings/boundaries. Work's tab set already follows this shape structurally. Any new portfolio/calendar/diary surface should slot into this pattern rather than invent a new one.

## 5. Gap Analysis

| Owner ask | Current capability | Gap | Severity |
|---|---|---|---|
| Manually declare a portfolio of real projects | Full CRUD exists (`createProject` etc.) via `/work` UI; 5 mock projects seeded | None structurally — owner can already create real projects one at a time today. Gap is UX speed (no bulk/import path) and no field yet for "why this project exists / goal statement" beyond a plain description. | LOW (workable today, better with import) |
| Map full phase/progress rhythm start→end per project | `ProjectPhaseNode`/`ProjectMilestone` types exist but are mock-only, not persisted, not portfolio-wide | No Prisma model, no service, no server action, no portfolio-level (cross-project) view of phases | HIGH |
| Show busy/important-date milestones for 1 or N people | No staffing/assignee concept at all; strict single-owner isolation is now an enforced architecture invariant (`ARC-033`) | Requires an explicit, deliberate decision on what "multi-person" means here (see §7 Q2) before any schema change | HIGH (also touches the tenant-isolation invariant — must not casually punch a hole in it) |
| Goal-based document + calendar to track project rhythm | No calendar view/model anywhere; no "goal document" concept beyond a project's free-text description | Two new surfaces needed: a goal/rhythm document artifact, and a calendar/timeline view aggregating milestones across the declared portfolio | HIGH |
| Per-project work diary (qualitative, not metric-inferred) | `ProjectNote` exists but is a general/AI-mixed note stream, not a dated diary entry type | Needs either a new note "kind" (`diary`) on the existing model, or a dedicated `ProjectDiaryEntry` model — undecided, see §7 Q3 | MEDIUM |

## 6. Page Requirement Understanding Score (AGENTS.md gate)

| Dimension | Score | Why |
|---|---|---|
| Actor/job clarity | 8/20 | Owner is clear on intent but "one or multiple people" staffing model, and whether this is portfolio-wide or per-project-first, is undecided |
| PRD/local evidence fit | 5/20 | Neither `PRD-004` nor `PRD-005` mentions calendar, staffing, or diary for Work; this is new product surface, not a documented gap being closed |
| Data/BFF/API clarity | 4/20 | No Prisma models exist for milestone persistence, staffing, or diary; nothing to reuse beyond the mock-only timeline shape |
| UI interaction/reference-pattern confidence | 5/15 | `ARC-012`'s operating-surface pattern applies, but no calendar/gantt/workload UI pattern has been chosen or referenced yet |
| Risk/auth/public-output/high-risk boundary clarity | 6/15 | Staffing across people directly intersects the just-hardened `ARC-033` tenant-isolation invariant — must be resolved deliberately, not by accident |
| Acceptance/verification clarity | 2/10 | No acceptance criteria defined yet for any of the four new surfaces |
| **Total** | **30/100 — Low** | Per `AGENTS.md`, Low requires **5 research optimization rounds**, each on a distinct lens, before implementation tasks are created |

This document is **round 1 (local PRD/code fit)**. This session also resolves the Google Drive blocker question (§2) which is a prerequisite fact-gathering step, not one of the 5 lenses. Remaining rounds (comparable-product/reference-pattern for calendar+diary UX, data/BFF boundary design for milestone+staffing persistence, risk/permission boundary for any multi-person view, acceptance/verification split) should follow **after** the open questions in §7 are answered, since the answers change which lens matters most next.

## 7. Open Questions (need owner decision before further research/implementation)

1. **Google Drive access**: authorize the connector now (owner does this via claude.ai connector settings, outside this session) and re-run import from the real folder, or proceed with manual/pasted project entry for today and treat Drive import as a later task?
2. **Staffing scope**: is "one or multiple people" a *near-term real need* (you have specific collaborators whose workload must show up now) or a *default-supporting* concern (design so it's not blocked later, but only you use it today)? This directly decides whether we touch the `ARC-033` single-owner isolation invariant now or defer it.
3. **Work diary shape**: a lightweight dated free-text entry per project (fastest to ship, closest to existing `ProjectNote`), or a more structured entry (e.g. status/blocker/mood/next-step fields), or both (structured fields + free text)?
4. **First visible surface**: given all four gaps are real, which should land first — (a) a persisted phase/milestone timeline per project (closes the biggest "mock-only" gap), (b) a portfolio-wide calendar aggregating milestones across projects, or (c) the work-diary input? These can be sequenced; the answer changes the next backlog row.
5. **"Goal-based document"**: is this a single owner-level document (e.g. one page listing all projects' goals/targets) separate from the calendar, or should each project's existing description/goal field simply feed the calendar view directly (no separate document artifact)?
6. **Project count and identity**: roughly how many real projects are you expecting to declare (a handful vs. dozens) — this affects whether the list view needs bulk-entry/CSV-paste tooling now or whether one-at-a-time creation (already working) is sufficient for today.

## 8. Rejected Approaches (already ruled out by existing architecture, not by owner choice)

- **Auto-deriving project count/rhythm from Drive without owner review.** Rejected per the owner's own instruction ("應該是要我手動設定好") — Drive, once authorized, would be a *content reference*, not an authoritative project registry.
- **Building a general-purpose multi-tenant staffing/PM tool speculatively.** Rejected per `AGENTS.md`'s "don't design for hypothetical future requirements" and the fresh `ARC-033` invariant — staffing/multi-person visibility must be a deliberate, scoped decision (§7 Q2), not a default expansion.
- **Treating this as a calendar-app rebuild.** Rejected — the ask is project-rhythm visibility scoped to the owner's own portfolio, not a general calendaring product; the existing `ARC-012` records/detail-surface pattern is the more likely fit than a full calendar library integration, pending §7 Q4.

## 9. Next Steps / Stop Condition

Per the Research-to-Task Quality Gate and the Page Requirement Understanding Score Gate, this document does **not** convert into `PLN-060` backlog rows yet — understanding score is Low and §7's questions are unanswered. Next loop, once the owner answers §7: (a) log the answers as an addendum to this document, (b) run the remaining research rounds most relevant to those answers, (c) only then add scoped backlog rows (draft candidates: `WORKPM-001` persisted phase/milestone model, `WORKPM-002` portfolio calendar view, `WORKPM-003` work-diary entry type, `WORKPM-004` staffing/workload view — each pending confirmation before being entered into `PLN-060`).

## 10. Addendum — Owner Answers (2026-07-22, same session)

The owner answered all six §7 questions via `AskUserQuestion`:

1. **Google Drive access**: proceed with **manual project entry today**; Drive import stays deferred until the owner authorizes the connector outside this session (via claude.ai connector settings), then a later turn can list/read the folder.
2. **Staffing scope**: **single-person only for now** — no near-term real collaborator to model. `WORKPM-004` (multi-person staffing/workload) is marked `DEFERRED` in `PLN-060` Phase 16 and must not be built until a fresh owner confirmation appears, since it would require a deliberate, scoped extension of the `ARC-033` single-owner isolation invariant.
3. **Work diary shape**: **simple date + free text**, not a structured multi-field entry. Closest existing precedent is `ProjectNote`; the implementation decision (new `ProjectDiaryEntry` model vs. a `kind` discriminator on `ProjectNote`) is left to the implementing loop, favoring the smaller diff.
4. **First surface to build**: **persist the phase/milestone timeline first** (closes the "mock-only" gap, §4/§5's highest-severity item), before the portfolio calendar view. The calendar (`WORKPM-002`) explicitly depends on `WORKPM-001` shipping real data — it must not be built against mock timeline data.
5. **Goal-based document**: resolved 2026-07-22 (follow-up turn) — the owner wants **an independent "project goal overview" document/surface**, not a field folded into the calendar or into individual project descriptions. This is a distinct artifact: one owner-level view stating the goal/target for the declared portfolio, separate from (but cross-linking into) per-project detail and the `WORKPM-002` calendar. Tracked as `WORKPM-005` in `PLN-060` Phase 16.
6. **Project count/identity**: not asked as a forced-choice question this round; the owner will provide real project names/counts directly via manual entry (existing `createProject` action already supports this today — no blocking gap).

This resolves enough ambiguity to raise the Page Requirement Understanding Score for `WORKPM-001` specifically (persisted milestone model, single-owner, reusing an existing mock UI shape and the existing `ARC-033` owner-scoping pattern) to roughly **Medium (~60/100)** — actor/job and risk/boundary dimensions are now clear; data/BFF and acceptance-criteria dimensions still need the implementing loop to write the actual Prisma model, migration-impact note (`DBS-001`), and acceptance criteria before code changes. `WORKPM-002`/`WORKPM-003` remain lower-confidence until `WORKPM-001` lands. Backlog rows `WORKPM-001..004` are now registered in `docs/05_execution-plans/PLN-060_task-backlog.md` Phase 16, and `PLN-061_current-sprint.md` reflects this as the current owner-directed priority. `WORKPM-005` (goal-based document artifact) is intentionally not yet created — question 5 above is still open.
