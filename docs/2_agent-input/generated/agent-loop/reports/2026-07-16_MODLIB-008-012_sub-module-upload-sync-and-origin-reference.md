# Agent Loop Evidence Report

## Task

- Task ID: `MODLIB-008`, `MODLIB-009`, `MODLIB-010`, `MODLIB-011`, `MODLIB-012`
- Title: Sub-module upload sync and origin-reference (implementation slice)
- Date: 2026-07-16
- Agent: Interactive session (Claude, user-directed — not the 20-minute autonomous heartbeat loop)

## Source Docs Read

- `AGENTS.md`
- `docs/07_research-and-design/RES-019_sub-module-upload-sync-and-origin-reference-research.md` (own research doc, written earlier this session)
- `docs/07_research-and-design/RES-016_module-scoped-file-and-media-library-tab-and-classification-routing-research.md`
- `docs/02_architecture-and-rules/ARC-012_frontend-operating-surface.md` §5A
- `docs/02_architecture-and-rules/ARC-011_document-attribute-layer.md` §4, §6
- `docs/05_execution-plans/PLN-060_task-backlog.md` Phase 14

## Scope

- In scope: `MODLIB-008` (ARC-012 §5A.1 amendment), `MODLIB-009` (origin-context data model + shared asset store fix), `MODLIB-010` (fix `add-project-dialog.tsx`'s discarded uploads), `MODLIB-011` ("使用於" backlink chip), `MODLIB-012` (folded into `MODLIB-008`).
- Out of scope: building a task/discussion-thread attachment feature (does not exist yet — `MODLIB-012` only documents the contract for it); redesigning `parseProjectDocuments`'s mock AI parsing (unchanged).

## Strategic Review

- Current strongest blocker: Supabase DB unreachable in this environment, same as noted in the prior `MODLIB-001..005` report — blocks full authenticated end-to-end click-through of `add-project-dialog.tsx`.
- Acceptance / roadmap / research / blocker mapping: Implements `RES-019`'s full backlog (`MODLIB-008..012`); amends `ARC-012` §5A.
- Expected capability, proof, or blocker delta: New capability (sub-module upload funnels into the same central library with a navigable origin backlink) plus a fixed latent bug (module-scoped read-only tabs now see the same shared asset array AI Input writes to, not a disconnected local copy).

## Research / Reference Basis

- Local docs/code reviewed: see Source Docs Read; also re-read `src/components/work/project/add-project-dialog.tsx`, `src/lib/ai/project-init.ts`, `src/app/actions/work.ts` (`createProject` return shape) before implementing.
- External or reference websites reviewed: none new — `RES-019` completed its research rounds (Notion/Linear/GitHub/Google Drive pattern synthesis) before this implementation session began.
- Task shape created or updated: `MODLIB-008..012` in `PLN-060_task-backlog.md` Phase 14 marked `DONE`.

## NANDA / Agent Protocol Alignment

- Applies?: No — UI/data-model only, no AI agent capability touched.

## Changes

- Files changed:
  - Edited: `docs/02_architecture-and-rules/ARC-012_frontend-operating-surface.md` (§5A.1 rewritten, new §5A.6), `src/types/library-classification.ts` (`LibraryAssetOriginContext`), `src/lib/library/classification.ts` (`addAssetModuleLinkWithOrigin`, `getOriginContextForAsset`), `src/lib/context/library-classification-context.tsx` (shared `fileAssets`/`mediaAssets` state moved into the provider; `createFileAssetFromSubModuleUpload`), `src/components/ai/file-library/file-library-page.tsx` (sources `assets`/`setAssets` from context instead of local `useState(mockFileAssets)`), `src/components/ai/media-library/media-library-page.tsx` (same, for media), `src/components/ai/file-library/file-asset-list.tsx`/`file-asset-row.tsx`/`file-detail-drawer.tsx` (origin-context prop threading + backlink chip), `src/components/work/project/add-project-dialog.tsx` (real `FileAsset` creation on upload, via `toFileAsset()` + `createFileAssetFromSubModuleUpload`)
  - Docs: `docs/02_architecture-and-rules/ARC-012_frontend-operating-surface.md`, `docs/05_execution-plans/PLN-060_task-backlog.md` (Phase 14 marked DONE), `docs/07_research-and-design/RES-019_...md` (§0 implementation status added), `docs/06_audits-and-reports/RPT-007_completed-log.md`
- Behavior changed: `add-project-dialog.tsx`'s uploaded files are no longer silently discarded — they become real, classified `FileAsset` rows visible in AI Input's library and in `work`'s module-scoped read-only tab, with a clickable backlink to the project. `FileLibraryPage`/`MediaLibraryPage` instances now share one canonical asset array app-wide instead of each holding an independent local copy.
- Docs changed: `ARC-012`, `PLN-060`, `RES-019`, `RPT-007`.

## Verification

| Command | Result | Notes |
|---|---|---|
| `pnpm exec tsc --noEmit --pretty false` | Pass | Clean throughout implementation. |
| `pnpm build` | Pass | `✓ Compiled successfully`, all routes generated. |
| `pnpm exec eslint <touched files>` | Pass | 0 errors, 0 new warnings. |
| Manual component-level smoke (temporary preview route, created and deleted within this session) | Pass | See Evidence. |

## Evidence

- Relevant output or observation: rendered `FileAssetRow` directly (via `curl` against a temporary preview route, since no browser automation tool is available) with a simulated sub-module-upload asset (`moduleKeys: ["work"]`, `originContext` pointing at a fake project). Confirmed the module badge "工作" renders once, and the backlink chip renders as `使用於：專案：模擬測試專案` inside an `<a href="/work/proj-sim-1">` — both the label and the href are correct.
- Screenshots or browser checks: none — no browser automation tool available in this environment.
- DB checks: none — Supabase DB unreachable from this environment even with `PERSONAL_OS_AUTH_MODE=mock` (same pre-existing limitation as the prior `MODLIB-001..005` report). `add-project-dialog.tsx`'s real `createProject` server action could not be exercised end-to-end; verification instead targeted the rendering logic that consumes its output.
- Product capability delta: sub-module uploads (piloted in `add-project-dialog.tsx`) now create real, classified, navigable-backlink assets in the one canonical File Library instead of vanishing; `ARC-012` now documents the contract any future sub-module upload surface (task attachments, discussion threads) must follow.
- Proof delta: component-level rendering verification of the full origin-context flow (data model → context → row/detail-drawer/media-card rendering) — stronger than typecheck-only, short of an owner-run authenticated click-through of the actual Add Project flow.
- Blocker delta: none removed — the pre-existing DB-unreachable blocker still prevents full authenticated verification of `createProject`. Not introduced or worsened.
- Agent protocol-readiness delta: N/A.

## Remaining Risks

- Full authenticated click-through (owner-run) of "Add Project" with a real file upload remains unproven; the owner should run `pnpm dev` with a reachable Supabase DB, create a project with an attached PDF/DOCX, and confirm it appears in AI Input's 檔案庫 tagged `work` with a working "使用於" link back to `/work/[projectId]`.
- `MODLIB-012`'s forward contract (task/discussion-thread attachments) is documentation only — no such feature exists yet, so it cannot be verified against a real implementation until one is built.
- The shared-asset-store fix (moving `fileAssets`/`mediaAssets` into `LibraryClassificationProvider`) touches the same components `RES-016`'s pilot (`chamber`, `work` read-only tabs) already uses — re-run a quick manual smoke on those two module tabs the next time either is touched, to confirm the refactor didn't regress `RES-016`'s already-verified behavior (a `tsc`/`build`-only pass was performed this loop, not a full re-run of `RES-016`'s specific route-level assertions).

## Final Status

- Status: `MODLIB-008` through `MODLIB-012` DONE and verified (tsc, build, component-level smoke). `RES-019`'s full backlog is now complete.
- Recommended next task: owner-run end-to-end verification of `add-project-dialog.tsx`'s upload flow once a reachable Supabase DB is available; otherwise, the next highest-leverage `MODLIB` work is `MODLIB-007` (rolling `RES-016`'s read-only library tab out to `research`/`finance`/`life`/`company`/`self`), which remains open from the prior loop.
