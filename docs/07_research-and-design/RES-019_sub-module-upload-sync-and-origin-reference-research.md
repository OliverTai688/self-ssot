# Sub-Module Upload Sync and Origin-Reference Research

**Document ID:** `RES-019`
**Last updated:** 2026-07-16 (revision 2 — `MODLIB-008..012` implemented)
**Status:** Research / design — foundational implementation slice (`MODLIB-008..012`) landed this session
**Trigger:** Owner-directed product feedback, following directly from `RES-016`'s module-scoped library work: "以後子模塊也有可能上傳檔案或是媒體，如在任務或工作討論串的時候，是不是讓子模塊介面上傳媒體或是檔案的時候也可以同步一份到總檔案或是總媒體，並且標注它在哪裡（如連結或是ref之類的）" (in the future, sub-modules may also allow uploading files/media — e.g. during a task or work discussion thread — should that upload also sync a copy to the central File/Media Library, and annotate where it came from, such as a link or ref).

---

## 0. Implementation Status (2026-07-16, revision 2): `MODLIB-008..012` Landed

All five backlog rows from §8 were implemented and verified this session:

- **`MODLIB-008`/`MODLIB-012`** — `ARC-012` §5A.1 rewritten from "AI Input is the only upload entry point" to "one canonical asset store, not one UI"; a new §5A.6 documents the `LibraryAssetOriginContext` shape and the forward contract for not-yet-built task/discussion-thread attachment features (`MODLIB-012` folded in as planned, no separate implementation needed).
- **`MODLIB-009`** — `LibraryAssetOriginContext` added to `src/types/library-classification.ts`; `addAssetModuleLinkWithOrigin`/`getOriginContextForAsset` added to `src/lib/library/classification.ts`. **Necessary correction found during implementation:** `LibraryClassificationProvider` previously shared only classification *links*, not the underlying `FileAsset[]`/`MediaAsset[]` arrays — each `FileLibraryPage`/`MediaLibraryPage` instance held its own independent `useState(mockFileAssets)`. A sub-module upload would have had nowhere shared to write. Fixed by moving `fileAssets`/`mediaAssets` state into the provider itself, with `createFileAssetFromSubModuleUpload(asset, moduleKey, originContext)` as the one-call sub-module upload path. This also fixed a latent bug: previously, an asset "uploaded" via AI Input's own mock upload button would not have appeared in a module-scoped read-only tab (`RES-016`'s `MODLIB-005`), since those were reading from a disconnected local copy.
- **`MODLIB-010`** — `add-project-dialog.tsx`'s uploaded `File[]` now become real `FileAsset` rows (via `toFileAsset()` + `createFileAssetFromSubModuleUpload`) tagged `moduleKey: "work"` with an `originContext` pointing at the newly created project, once `createProject` succeeds. `parseProjectDocuments` itself is intentionally left as a mock parser (out of this document's scope) — only the previously-discarded file *content* is now preserved.
- **`MODLIB-011`** — a "使用於" (used in) chip renders in `FileAssetRow`, `FileDetailDrawer`, and `MediaLibraryPage`'s grid cards whenever `originContext` exists, as a `next/link` navigating to `originContext.href`, additive to (not replacing) `RES-016`'s module-classification badges.

**Verified via a temporary preview route** (created and deleted within this session, not committed), since this environment's Supabase DB is unreachable even with mock auth (same pre-existing limitation noted in `RES-016`): rendered `FileAssetRow` directly with a simulated sub-module-upload asset and confirmed the module badge ("工作") and the "使用於：專案：模擬測試專案" backlink both render with the correct `href`. `tsc --noEmit` and `pnpm build` both pass.

**Owner-run evidence still needed:** a full end-to-end click-through (open `/work`, use "新增專案" with a real file upload, confirm the project is created via a reachable Supabase DB and the file appears in AI Input's 檔案庫 tagged `work` with a working backlink) requires a reachable DB with a seeded `Profile` row — this document's component-level rendering verification is a strong proxy but not a substitute for that owner-run check.

## 1. Purpose

`RES-016` established AI Input as the single upload/classification entry point and gave modules a **read-only** library tab (`ARC-012` §5A.1: "the module's own library subpage never exposes an upload affordance"). The owner is now asking a forward-looking question that partially contradicts that rule: what happens when a sub-module surface *inside* a module (a project, a task, a future discussion thread) needs its own upload affordance, as naturally happens in project-management and chat tools?

This document determines: (a) whether this gap already exists in the codebase today (it does — see §3), (b) what "sync a copy to the central library" should actually mean (it should not be a copy at all — see §6), (c) what "annotate where it is" requires as a data model (an origin-context backlink — see §6), and (d) how this reconciles with `RES-016`/`ARC-012` §5A's single-upload-gate rule without discarding it.

## 2. Source Basis

Local docs and code reviewed:

- `docs/02_architecture-and-rules/ARC-012_frontend-operating-surface.md` §5A.1 ("Single Upload Gate") — the rule this document must reconcile with, added this session from `RES-016`.
- `docs/07_research-and-design/RES-016_module-scoped-file-and-media-library-tab-and-classification-routing-research.md` §6.2 — the `LibraryAssetModuleLink` classification model this document extends rather than replaces.
- `docs/02_architecture-and-rules/ARC-011_document-attribute-layer.md` §4, §6, §8 — `SourceProvenanceEvent`, `parentAssetId`, and the existing "LINE message attachment" pattern (`SourceAsset(assetKind by MIME, parentAssetId=<MESSAGE asset>)`) already model "an attachment captured from within another context, linked back to its parent" — the correct formal precedent to extend to in-app sub-module capture, rather than inventing a new concept.
- `docs/02_architecture-and-rules/SCH-002_source-asset-registry-schema-proposal.md` — confirms `SourceAssetLink` is asset-to-asset (citation graph), not asset-to-context; no existing schema proposal models "captured from UI context X."
- `src/components/work/project/add-project-dialog.tsx` (lines ~280–320) — **a live, already-shipped example of exactly the gap the owner is describing.** A real drag-and-drop `<input type="file" multiple>` upload UI exists in the "Add Project" flow ("拖曳或點擊上傳需求書、合約等文件"). The files are held in local `File[]` component state only.
- `src/lib/ai/project-init.ts` `parseProjectDocuments(_files, hint)` — confirms the uploaded files' content is **never read**: the `_files` parameter is unused (prefixed with `_`), and the function returns a fixed mock parse result regardless of what was uploaded. Once the dialog closes, the files are gone — not persisted to the File Library, not linked to the new project, not visible anywhere else in the app.
- `src/types/work.ts` `ProjectDeliverable` (§"Deliverable") — confirmed this type has **no file-content field at all** (`id`, `projectId`, `type: "folder" | "file"`, `title`, `status`, `visibility`, dates only) — a purely descriptive tree node, not a real attached file. This is the second place this exact gap will recur once deliverables get real file content.
- Grep confirmed: no task-comment, discussion-thread, or attachment concept exists anywhere in `src/types/work.ts` or `src/components/work/` today — the "任務或工作討論串" (task or work discussion thread) part of the owner's example is prospective design guidance for a feature that does not exist yet, not an audit of an existing one.
- `src/components/ai/file-library/file-references-panel.tsx` + `FileAssetReferences` (`src/types/file-library.ts`) — confirmed the existing "referenced by" model is **count-only** (`chats: number`, `evidence: number`, …), with click-through already stubbed as "尚未接上真實查詢（示範資料）" (not yet wired to a real lookup). No navigable back-reference exists anywhere in this codebase for any reference kind today — this document's origin-context design must not repeat that gap for the new capability it introduces.

## 3. Current-State Audit

| Surface | Has upload UI today? | Persists to central library? | Has origin backlink? |
|---|---|---|---|
| AI Input 檔案庫/媒體庫 | Yes (mock upload) | Yes — this **is** the central library | N/A (is the source of truth) |
| Work → Add Project dialog | **Yes** — real drag-and-drop, real `<input type="file">` | **No** — `parseProjectDocuments` ignores file content entirely; files vanish when the dialog closes | No |
| Work → Project Deliverables tab | No | N/A — `ProjectDeliverable` has no file-content field | N/A |
| Work → task attachment / discussion thread | Does not exist yet | N/A | N/A |
| Chamber / Finance / Life / Company / Research / Self sub-objects | No upload UI anywhere | N/A | N/A |

**Key finding: the failure mode the owner is worried about already exists in shipped code today (`add-project-dialog.tsx`), not only as a future risk.** This changes the shape of the response: rather than only writing a forward-looking design contract for a not-yet-built feature, this document should also fix the one concrete instance that already exists, as the reference implementation future sub-module upload surfaces should copy.

## 4. Key Finding: "Sync a Copy" Is the Wrong Frame

The owner's phrasing ("同步一份到總檔案庫" / "sync a copy to the central library") suggests two separate stores kept in sync. That would be the wrong design: it recreates exactly the duplication/orphan risk `RES-016`'s single-upload-gate rule was written to prevent, and it would require reconciling two divergent copies over time (what happens if the module-side "copy" is edited or deleted independently?).

The correct model — confirmed by this repo's own `ARC-011` precedent (`parentAssetId`, `SourceProvenanceEvent`, the LINE-message-attachment pattern) and by external comparable products (§5 Round 2) — is: **there is only ever one asset row.** A sub-module upload UI is a second *capture surface* for the same single File/Media Library, not a second store. What the sub-module UI needs is not "sync," but (a) a shared creation path so the asset lands in the one true library, and (b) an origin-context backlink so both sides can navigate to each other.

## 5. Understanding Score

Page Requirement Understanding Score Gate (`AGENTS.md` §7), applied to "sub-module upload sync and origin reference":

| Dimension | Score | Basis |
|---|---|---|
| Actor/job clarity | 15/20 | Owner's underlying need (no orphaned uploads, navigable backlinks) is clear; the concrete trigger surface (task/discussion thread) does not exist yet, so exact UI placement for that part is undefined. |
| PRD/local evidence fit | 17/20 | `ARC-011` already models attachment-from-parent-context; `RES-016`'s link model is a direct, already-built extension point. |
| Data/BFF/API clarity | 14/20 | Mock-mode only, no schema migration; the design is an additive field on an already-built mock model. |
| UI interaction/reference-pattern confidence | 11/15 | Badge/dialog patterns are reused from `RES-016`; the clickable "used in" backlink is a new (if simple) interaction with no exact in-repo precedent yet. |
| Risk/auth/public-output clarity | 12/15 | Reuses `RES-016`'s existing high-risk gate; the one new distinction (human-initiated in-context upload vs. AI-initiated attach) is narrow and low-risk. |
| Acceptance/verification clarity | 7/10 | Mock-mode proof is straightforward; fixing `add-project-dialog.tsx` touches a real (if currently broken) user flow, requiring more care than a pure addition. |
| **Total** | **76/100 — Medium** | Requires 4 research rounds before implementation tasks are cut (below). |

### Round 1 — Local code/PRD fit
Completed in §2–§4: confirmed the gap already exists in shipped code (`add-project-dialog.tsx`), confirmed `ProjectDeliverable` will hit the same gap next, confirmed no discussion-thread feature exists yet, confirmed `ARC-011` already has the right formal precedent (`parentAssetId`/`SourceProvenanceEvent`), confirmed the existing reference-count model has no navigable links anywhere to imitate or diverge from.

### Round 2 — Comparable pattern
No new external fetch was needed — the pattern is already consistent across this repo's own `ARC-011` precedent and the products `RES-002` §3 already synthesized: Notion (blocks/attachments live in one workspace file store, referenced from pages via block embeds, not duplicated per page), Linear/GitHub (an attachment uploaded inside an issue comment is stored once and shown both inline in the comment and in the issue's own attachment list), Google Drive (inserting a Drive file into a Doc keeps one file with an activity trail of "used in X," not a copy). All three confirm: **one canonical store, contextual backlinks** — exactly this document's §6 design, not a sync-copy model.

### Round 3 — Data/BFF/API boundary
The origin-context backlink is modeled as an **additive optional field on the already-built `LibraryAssetModuleLink` row** (`RES-016` §6.2), not a new table and not a schema migration — consistent with this repo's established caution (`DBS-002`, `SCH-003`, `MIG-003`) about not adding persistence ahead of a reviewed proposal. Mock-mode only.

### Round 4 — Risk/auth/public-output boundary
A sub-module upload is, by definition, an explicit human action taken by the owner inside that context — it should create a `human_confirmed` link immediately (no new gate needed), exactly like `RES-016`'s existing `FileWorkspaceDialog`/`ModuleClassificationDialog` flow. The one new distinction worth naming: if a future AI agent proposes attaching or generating a file *on the owner's behalf* inside a high-risk module (finance/life/company), that must still go through `RES-016`'s existing `ai_suggested` pending gate — this document does not change that rule, it only confirms sub-module *human* uploads are exempt from it, the same way AI Input's own upload already is.

## 6. Recommended Standard

1. **Amend `ARC-012` §5A.1 from "no upload UI in modules" to "single source of truth, not single capture surface."** A sub-module UI *may* expose an upload affordance, but only if the write path funnels through the same asset-creation function/context the central library uses (in mock-mode: the same `LibraryClassificationProvider`-adjacent asset list, not a local, module-private `File[]`/array). No sub-module UI may hold uploaded file content in local-only state that never reaches the central store — that is the exact anti-pattern `add-project-dialog.tsx` currently is.
2. **Extend `LibraryAssetModuleLink` (not a new table) with an optional origin context:**
   ```ts
   interface LibraryAssetOriginContext {
     contextType: "project" | "task" | "deliverable" | "discussion_thread" | "chat_message" | "note"
     contextId: string
     contextLabel: string   // e.g. "專案：ESG 導入顧問案"
     href: string           // e.g. "/work/proj-123"
   }
   ```
   Set on the link row created at upload time, alongside the existing `moduleKey`/`classificationSource`. This reuses `RES-016`'s model rather than inventing a parallel one, matching `ARC-011`'s `parentAssetId` pattern conceptually (attachment → parent context) while staying inside this repo's link-row convention (§4 of `RES-016`, avoiding a raw array field).
3. **A human-initiated sub-module upload creates a `human_confirmed` link immediately** — no additional gate beyond what `RES-016` already defines, including for high-risk modules, since the human is acting directly inside that module's own UI.
4. **The central AI Input library shows a "使用於" (used in) backlink** derived from `originContext`, as a clickable chip distinct from the existing module-classification badges (`RES-016` `MODLIB-004`) — module badges answer "which module(s)," the used-in chip answers "where specifically."
5. **Fix `add-project-dialog.tsx` first, as the reference implementation.** It is the one sub-module upload surface that already exists and is already broken (content silently discarded); making it funnel through the shared asset-creation path with an origin context pointing at the new project is the concrete, low-risk first slice future sub-module upload surfaces (deliverables, task attachments, discussion threads) should copy once they exist.
6. **Do not build task/discussion-thread attachments now.** That feature does not exist yet (§2, §3); this document only obligates whoever builds it later to follow points 1–4 above, per `ARC-012` §5A's amended contract — it is a design rule for future work, not a task to implement today.

## 7. Gap Findings

1. `add-project-dialog.tsx` already ships a real file-upload UI whose content is silently discarded (`parseProjectDocuments`'s unused `_files` param) — a live bug, not a hypothetical.
2. `ProjectDeliverable` has no file-content field; deliverables will hit the same discard-or-duplicate risk the moment real file attachment is added there.
3. `ARC-012` §5A.1's "Single Upload Gate," as currently worded, over-restricts by conflating "single source of truth" with "single UI surface" — it would block a legitimate future task-attachment feature that the owner explicitly wants supported.
4. No origin-context/backlink model exists anywhere in this codebase; `FileAssetReferences` is count-only with stubbed click-through, so this new capability has no existing pattern to accidentally diverge from, but also nothing to reuse besides `RES-016`'s link-row shape.
5. No task/discussion-thread feature exists yet — the owner's own example is explicitly prospective ("以後...可能"), confirmed by grep, not a currently-broken feature.

## 8. Executable Task Shape

| Task id | Title | Module | Scope | Acceptance criteria | Files likely affected | Verification | Risks / stop conditions |
|---|---|---|---|---|---|---|---|
| `MODLIB-008` | Amend `ARC-012` §5A.1 from "no module upload" to "single source of truth, not single capture surface" | Architecture / Docs | Rewrite §5A.1; document the `LibraryAssetOriginContext` extension and the human-upload-is-always-confirmed rule | `ARC-012` §5A no longer blanket-forbids sub-module upload UI; states the funnel requirement instead | `docs/02_architecture-and-rules/ARC-012_frontend-operating-surface.md` | Docs review | Docs-only. |
| `MODLIB-009` | Add `LibraryAssetOriginContext` to the classification link model | AI Input / Library | Extend `LibraryAssetModuleLink` (mock-mode) with optional `originContext`; add a helper to create a link with origin context in one call | New field compiles and is optional; existing links unaffected | `src/types/library-classification.ts`, `src/lib/library/classification.ts`, `src/lib/context/library-classification-context.tsx` | `pnpm exec tsc --noEmit --pretty false`, `pnpm build` | Additive/mock-only; no `SCH-002` schema change. |
| `MODLIB-010` | Fix `add-project-dialog.tsx` to create real File Library assets instead of discarding uploads | Work | Uploaded files in "Add Project" create `FileAsset` rows (via the shared library state) tagged `moduleKey: "work"` with `originContext` pointing at the newly created project; `parseProjectDocuments` may keep its mock parse-result behavior, but the files themselves must no longer be discarded | Files uploaded in Add Project appear in AI Input's 檔案庫 tagged to `work`, with a working "used in" link back to the project | `src/components/work/project/add-project-dialog.tsx`, `src/lib/ai/project-init.ts` | `pnpm exec tsc --noEmit --pretty false`, `pnpm build`, manual smoke (upload a file, create the project, confirm it appears in AI Input's library and `work`'s read-only tab) | Reference implementation for all future sub-module upload surfaces — get this one right before any other module copies the pattern. |
| `MODLIB-011` | Add a clickable "使用於" (used in) backlink to AI Input's file/media rows | AI Input | Render `originContext.contextLabel` as a `Link`-based chip (using `originContext.href`) alongside `RES-016`'s existing module-classification badges | Chip renders only when `originContext` exists; navigates correctly | `src/components/ai/file-library/file-asset-row.tsx`, `src/components/ai/file-library/file-detail-drawer.tsx`, `src/components/ai/media-library/media-library-page.tsx` | `pnpm exec tsc --noEmit --pretty false`, manual smoke | UI-only; distinct from and additive to `MODLIB-004`'s module badges, not a replacement. |
| `MODLIB-012` | Document the sub-module-upload contract for future task/discussion-thread features | Architecture / Docs | Not an implementation task — no such feature exists yet. Record in `ARC-012` §5A (as part of `MODLIB-008`) that any future task-attachment or discussion-thread-attachment UI must follow points 1–4 of §6 above | Contract is discoverable by whoever builds that feature later | `docs/02_architecture-and-rules/ARC-012_frontend-operating-surface.md` | Docs review | Forward-looking design rule, not a build task. Fold into `MODLIB-008` rather than tracking separately if that is simpler at implementation time. |

## 9. Rejected Alternatives

- **"Sync a copy" — maintain a module-local file list and a separate central-library copy, kept in sync.** Rejected: recreates the duplication/orphan-drift problem `RES-016`'s single-upload-gate rule exists to prevent; external comparable products (Notion, Linear/GitHub, Google Drive) all converge on one canonical store instead (§5 Round 2).
- **A new `SubModuleAttachment` table/type parallel to `LibraryAssetModuleLink`.** Rejected: `RES-016`'s link row already carries `moduleKey`/`classificationSource`; origin context is naturally an additive field on the same row, not a parallel concept, avoiding a second modeling convention for the same underlying fact ("this asset is connected to this module, from this specific place").
- **Build the task/discussion-thread attachment feature now.** Rejected: that feature does not exist yet (§2, §3); building UI for a non-existent parent feature would be speculative. This document instead records the contract that feature must follow once it is built (`MODLIB-012`).
- **Leave `add-project-dialog.tsx` as-is and treat this purely as forward design.** Rejected: the gap is already live and shipped, not hypothetical; fixing it now (`MODLIB-010`) is lower-risk than leaving a known silent-data-loss bug in place, and gives future sub-module upload work a concrete reference implementation instead of only a paper contract.
- **Redesign `FileAssetReferences` (chats/evidence/reports counts) into the same navigable-ref model in this pass.** Rejected as out of scope: it is a related, already-flagged-as-stubbed gap, but expanding this document to fix it too would mix two different backlog series. Noted in §2 as a related-but-separate item for whoever next touches `file-references-panel.tsx`.

## 10. Verification

This document itself is the primary artifact (research-to-task gate satisfied: local audit table finding a live existing bug, understanding score with 4 rounds, executable backlog rows with scope/acceptance/files/verification/risk, rejected alternatives). No runtime code was changed. Follow-up loops implementing any `MODLIB-00[8-9]`/`010`/`011` row should each run `pnpm exec tsc --noEmit --pretty false` and `pnpm build` plus a manual smoke, per `AGENTS.md` §13.

## 11. Next Loop Recommendation

Start with `MODLIB-008` (docs-only `ARC-012` amendment, no code) and `MODLIB-009` (additive origin-context field, foundational for the rest) in the same loop. Then `MODLIB-010` (fix the live `add-project-dialog.tsx` bug) is the highest-leverage next step since it turns this document's finding into an actual fix rather than only a contract, followed by `MODLIB-011` (the visible backlink chip) to make the fix observable from the AI Input side. `MODLIB-012` folds into `MODLIB-008`'s docs edit rather than needing separate implementation.
