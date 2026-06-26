# Work Module Contract

Date: 2026-06-05

Status: `WORK-008_PROOF_HARNESS_READY_CLIENT-001_GATED`

Purpose: define the Work module action/service boundary before wiring the remaining CRUD UI.

## 1. Current Work Routes

| Route | File | Current role | Data source |
|---|---|---|---|
| `/work` | `src/app/(dashboard)/work/page.tsx` | Server Component loads project list and passes view models to `WorkClient`. | DB read through `src/app/actions/work.ts` |
| `/work/[projectId]` | `src/app/(dashboard)/work/[projectId]/page.tsx` | Server Component loads project detail, tasks, notes, deliverables, then passes view models to `ProjectDetailClient`. | DB read through `src/app/actions/work.ts`; pulse/timeline remain mock AI adapter |
| `/client/[token]` | `src/app/client/[token]/page.tsx`, `src/app/client/[token]/not-found.tsx` | Public client portal containment boundary with gated DB-backed BFF loader. | Fails closed by default; renders only when `PERSONAL_OS_ENABLE_CLIENT_PORTAL_DB=1`, token validation passes, and project/task/deliverable records are `CLIENT_VISIBLE` |

## 2. Current Work Components

| Component | File | Current persistence behavior |
|---|---|---|
| `WorkClient` | `src/app/(dashboard)/work/work-client.tsx` | Receives DB-backed initial project list. Filtering/sorting is local UI state. |
| `AddProjectDialog` | `src/components/work/project/add-project-dialog.tsx` | DB-backed project create through `createProject`; refreshes `/work` after success. |
| `ProjectDetailClient` | `src/app/(dashboard)/work/[projectId]/project-detail-client.tsx` | Receives DB-backed initial tasks/notes/deliverables. |
| `TaskList` | `src/components/work/task/task-list.tsx` | DB-backed task add/toggle through canonical Work actions; update/delete actions exist but no edit/delete UI is present yet. |
| `TaskSheet` | `src/components/work/task/task-sheet.tsx` | Produces UI-safe task input and closes only after successful DB-backed create. |
| `NoteTimeline` | `src/components/work/note/note-timeline.tsx` | DB-backed note add/pin through canonical Work actions; update/delete actions exist but no edit/delete UI is present yet. |
| `AddNoteDialog` | `src/components/work/note/add-note-dialog.tsx` | Produces UI-safe internal-only note input and closes only after successful DB-backed create. |
| `DeliverableTree` | `src/components/work/deliverable/deliverable-tree.tsx` | DB-backed deliverable create, file status update, and file visibility toggle through canonical Work actions. |
| `AddDeliverableDialog` | `src/components/work/deliverable/add-deliverable-dialog.tsx` | Produces UI-safe deliverable input and closes only after successful DB-backed create. |
| `ShareLinkButton` | `src/components/work/share/share-link-button.tsx` | Uses project `clientToken`; public page is contained and does not expose project content until DB-backed filtering lands. |

## 3. Current Work Data Sources

DB-backed today:

- Project list read.
- Project detail read.
- Project tasks read.
- Project notes read.
- Project deliverables read.

Local/mock today:

- AI pulse, public output draft, pulse source metadata, and timeline adapter.

Contained public output today:

- `/client/[token]` no longer reads Work mock data.
- `CLIENT-001` adds a server-only gated DB-backed loader in `src/lib/services/client-portal.service.ts`.
- The route still fails closed with safe unavailable/noindex output unless `PERSONAL_OS_ENABLE_CLIENT_PORTAL_DB=1` and persisted token/visibility checks pass.
- Public output excludes notes, internal IDs, `clientToken`, raw Prisma rows, and file URLs.

Seed/demo source:

- `src/lib/mock/work/*` remains the seed source for Work demo data.
- Runtime Work reads should prefer DB after DB-006.

## 4. Canonical Work Boundary

WORK-001 consolidates Work into this structure:

```txt
Client Component
  -> src/app/actions/work.ts
  -> requireUser()
  -> src/lib/services/project.service.ts
  -> service-layer ownership/resource checks
  -> Prisma
  -> src/lib/mappers/work.mapper.ts
  -> UI-safe view model / ActionResult
```

Canonical decisions:

- `src/app/actions/work.ts` is the public Work server action surface.
- `src/lib/services/project.service.ts` owns Prisma reads/writes and authorization checks.
- `src/lib/actions/work.ts` is only a compatibility re-export during Phase 1.
- `src/lib/actions/work.ts` must not directly import `db`.
- Work UI components should consume `src/types/work.ts` view models, not Prisma model shapes.
- `requireUser()` is still mock-admin backed; this limitation remains until `AUTH-001`.

## 5. Existing Surface Overlap

Before WORK-001:

| File | Responsibility | Problem |
|---|---|---|
| `src/app/actions/work.ts` | DB read actions: `getProjects`, `getProjectById` | Only read surface lived here. |
| `src/lib/actions/work.ts` | DB write actions: create/update/delete project/task/note/deliverable | Competing public action surface; imported `db` directly; some resource-level checks depended on caller-supplied `projectId`. |
| `src/lib/services/project.service.ts` | Project read/detail/delete and minimal deliverable create | Service layer was too thin for CRUD wiring. |

After WORK-001:

| File | Responsibility |
|---|---|
| `src/app/actions/work.ts` | Public read/write action contracts, validation, `requireUser()`, revalidation, mapper output. |
| `src/lib/services/project.service.ts` | Work data access layer: Prisma queries/mutations, project ownership checks, task/note/deliverable resource ownership checks. |
| `src/lib/actions/work.ts` | Backward-compatible re-export only. |

## 6. Work Action Contracts

All actions return `ActionResult<T>` for mutations:

```ts
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }
```

Read actions:

| Action | Return |
|---|---|
| `getProjects()` | `Promise<Project[]>` |
| `getProjectById(id)` | `Promise<{ project, tasks, notes, deliverables } | null>` |

Project actions:

| Action | Input | Return |
|---|---|---|
| `createProject(input)` | `name`, optional `clientName`, `description`, `status`, `phase`, `health`, `visibility`, `dueAt` | `ActionResult<Project>` |
| `updateProject(input)` | `id` plus optional project fields | `ActionResult<Project>` |
| `deleteProject(projectId)` | project UUID | `ActionResult<void>` |

Task actions:

| Action | Input | Return |
|---|---|---|
| `addProjectTask(projectId, input)` | `title`, optional `body`, `status`, `visibility`, `priority`, `source`, `dueAt` | `ActionResult<ProjectTask>` |
| `toggleProjectTaskComplete(taskId)` | task UUID | `ActionResult<ProjectTask>` |
| `updateProjectTask(taskId, input)` | optional task fields | `ActionResult<ProjectTask>` |
| `deleteProjectTask(taskId)` | task UUID | `ActionResult<void>` |

Note actions:

| Action | Input | Return |
|---|---|---|
| `addProjectNote(projectId, input)` | `body`, optional `title`, `source`, `visibility`, `origin`, `isPinned` | `ActionResult<ProjectNote>` |
| `toggleProjectNotePin(noteId)` | note UUID | `ActionResult<ProjectNote>` |
| `updateProjectNote(noteId, input)` | optional note fields | `ActionResult<ProjectNote>` |
| `deleteProjectNote(noteId)` | note UUID | `ActionResult<void>` |

Deliverable actions:

| Action | Input | Return |
|---|---|---|
| `createProjectDeliverable(projectId, input)` | `title`, optional `description`, `type`, `parentId`, `status`, `visibility`, `deliveredAt` | `ActionResult<ProjectDeliverable>` |
| `updateProjectDeliverable(deliverableId, input)` | optional deliverable fields except `type` and `parentId` | `ActionResult<ProjectDeliverable>` |
| `updateProjectDeliverableVisibility(deliverableId, visibility)` | deliverable UUID, `internal` or `client_visible` | `ActionResult<ProjectDeliverable>` |
| `deleteProjectDeliverable(deliverableId)` | deliverable UUID | `ActionResult<void>` |

Transition aliases:

- `toggleTaskComplete(taskId)` remains as an alias for older imports.
- `createDeliverable(inputWithProjectId)` remains as an alias for older imports.

## 7. Authorization Notes

- Every public Work mutation calls `requireUser()`.
- Project-scoped service functions call `assertCanAccessProject(profileId, projectId)`.
- Task/note/deliverable update/delete/toggle functions resolve the resource and verify `resource.project.ownerId === profileId`.
- Deliverable creation validates that `parentId`, when present, belongs to the same project and is a folder.
- `requireUser()` is still development mock-admin and must be replaced or constrained in `AUTH-001`.
- Public client visibility is solved only through the gated `CLIENT-001` BFF contract in `ARC-025`; Work owner routes and public Client Portal output remain separate trust boundaries.

## 8. Mapper / View Model Boundary

`src/lib/mappers/work.mapper.ts` remains the boundary from Prisma models to UI view models:

- Prisma uppercase enums become lowercase UI strings.
- `CLIENT_VISIBLE` maps to `client_visible` for tasks/notes/deliverables.
- `CLIENT_VISIBLE` maps to `client_shared` for project visibility.
- Date objects become ISO strings.

Client Components should continue to accept only `src/types/work.ts` shapes.

## 9. Follow-up Tasks

| Task id | Title | Status | Notes |
|---|---|---|---|
| `WORK-002` | Wire AddProjectDialog to createProject server action | DONE | Manual and AI-preview create flows call `createProject`; browser click QA can be repeated in `WORK-007`. |
| `WORK-003` | Wire TaskList to add/toggle/update/delete task actions | DONE | Add and toggle use canonical DB-backed actions; update/delete remain action-only because no edit/delete UI exists yet. |
| `WORK-004` | Wire NoteTimeline to add/pin/update/delete note actions | DONE | Add and pin use canonical DB-backed actions; update/delete remain action-only because no edit/delete UI exists yet. |
| `WORK-005` | Wire DeliverableTree to create/update visibility/delete deliverable actions | DONE | Create, status update, and visibility toggle use canonical DB-backed actions; delete/edit metadata remain action-only because no matching UI exists yet. |
| `WORK-006` | Ensure project progress is derived or transactionally maintained | DONE | Project task progress is derived from actual `ProjectTask` rows at read time. |
| `WORK-007` | Verify Work persistence after page refresh | TODO | Run after UI wiring and derived progress; include full browser click-through for project/task/note/deliverable/progress flows. |
| `WORK-008` | Prepare disposable Work refresh proof harness | DONE | `pnpm work:proof` provides a dry-run-first disposable DB harness for project/task/note/deliverable/progress refresh proof before final browser verification. |
| `CLIENT-001` | Convert `/client/[token]` to gated DB-backed public query | DONE | Implemented as `ARC-025`: env-gated, server-only, token-validated, client-visible project/task/deliverable filtering, notes/file URLs/internal IDs excluded. |

## 10. WORK-002 AddProjectDialog Wiring

Current behavior before WORK-002:

- Manual mode collected `name` and optional `clientName`.
- AI document mode parsed uploaded files into editable preview fields: `previewName`, `previewClient`, and `previewDue`.
- Both create buttons only displayed a Phase 1 simulated success message and closed the dialog; no database write occurred.

DB-backed behavior after WORK-002:

- `AddProjectDialog` imports and calls the canonical `createProject(input)` server action from `src/app/actions/work.ts`.
- Manual mode submits `name` and `clientName`.
- AI preview mode submits `previewName`, `previewClient`, and `previewDue`.
- The dialog shows a pending state while the action runs.
- On success, the dialog shows a short success state, resets, closes, and calls `router.refresh()`.
- On failure, the dialog stays open, preserves form data, and shows the action error.

Server action used:

```txt
AddProjectDialog
  -> createProject(input)
  -> requireUser()
  -> createProjectForProfile()
  -> Prisma project write
  -> toProjectViewModel()
  -> revalidatePath("/work")
  -> router.refresh()
```

Refresh and revalidation strategy:

- `createProject` calls `revalidatePath("/work")`.
- The client calls `router.refresh()` after success so the Server Component project list is reloaded.
- No optimistic project-list mutation was added in WORK-002.

Remaining limitations:

- Full browser click-through was not automated in this pass because the browser automation tool was unavailable.
- A disposable local DB service-level create plus `/work` route refresh was verified.
- Task, note, and deliverable create/update flows are DB-backed after `WORK-003` through `WORK-005`.
- `requireUser()` still resolves the seeded/mock admin user until `AUTH-001`.
- `/client/[token]` is contained by `CLIENT-002`; after `CLIENT-001` it still remains unavailable by default unless the DB gate, token validation, and visibility checks pass.

## 11. WORK-003 TaskList Wiring

Current behavior before WORK-003:

- `TaskList` initialized local state from `initialTasks`.
- `handleAddTask` created a client-only task ID with `t-${Date.now()}`.
- `handleToggleDone` only updated local component state.
- `TaskSheet` collected `title`, `priority`, and `visibility`, then closed immediately after local save.
- `TaskItem` displayed title, status, priority, visibility, source, and due date.
- Existing UI had no task edit or delete controls; `MoreHorizontalIcon` was imported but unused.

DB-backed behavior after WORK-003:

- `TaskList` imports canonical task actions from `src/app/actions/work.ts`.
- Add task calls `addProjectTask(projectId, input)`.
- Toggle completion calls `toggleProjectTaskComplete(taskId)`.
- Successful add prepends the returned UI-safe `ProjectTask` view model to local state.
- Successful toggle replaces the local task with the returned UI-safe `ProjectTask` view model.
- Failed add keeps the sheet open and shows the action error.
- Failed toggle rolls back to the previous local task list and shows the action error.
- Pending add disables the sheet fields/buttons.
- Pending toggle shows an inline spinner and prevents duplicate toggles.

Server actions used:

```txt
TaskList
  -> addProjectTask(projectId, input)
  -> requireUser()
  -> createTaskForProject()
  -> assertCanAccessProject()
  -> Prisma project task write
  -> toTaskViewModel()
  -> revalidatePath("/work")
  -> revalidatePath("/work/[projectId]")
  -> router.refresh()

TaskItem
  -> toggleProjectTaskComplete(taskId)
  -> requireUser()
  -> toggleTaskCompleteForProfile()
  -> task owner check through related project
  -> Prisma project task update
  -> toTaskViewModel()
  -> revalidatePath("/work")
  -> revalidatePath("/work/[projectId]")
  -> router.refresh()
```

Refresh and revalidation strategy:

- Task server actions call `revalidateWorkProject(projectId)`, which revalidates `/work` and `/work/${projectId}`.
- `TaskList` calls `router.refresh()` after successful add/toggle.
- The client also updates local state using the returned view model so the user sees the result immediately.

Edit/delete status:

- `updateProjectTask(taskId, input)` and `deleteProjectTask(taskId)` already exist as canonical server actions.
- WORK-003 did not add new edit/delete UI because no existing edit/delete controls were present.
- Future edit/delete UI can be wired without changing the public action contract.

Progress status:

- Project `tasksDone` / `tasksTotal` remained stored snapshot fields in WORK-003.
- Adding or toggling tasks updated the task list but did not yet transactionally update project progress counters during WORK-003.
- `WORK-006` resolved this by deriving runtime project progress from actual `ProjectTask` rows at read time.

Remaining limitations:

- Browser click-through was not automated in this pass because the browser automation tool was unavailable.
- Disposable local DB service-level create/toggle plus `/work/[projectId]` route refresh was verified.
- Note add/pin is DB-backed after `WORK-004`; deliverable create/status/visibility is DB-backed after `WORK-005`.
- `requireUser()` still resolves the seeded/mock admin user until `AUTH-001`.
- `/client/[token]` is contained by `CLIENT-002`; after `CLIENT-001` it still remains unavailable by default unless the DB gate, token validation, and visibility checks pass.

## 12. WORK-001 Verification

Commands:

```bash
pnpm exec tsc --noEmit --pretty false
pnpm db:validate
pnpm db:generate
pnpm build
```

Result:

- `pnpm exec tsc --noEmit --pretty false` passed.
- `pnpm db:validate` passed.
- `pnpm db:generate` passed.
- `pnpm build` with the default `.env.local` failed during `/work` prerender because the configured remote Supabase host was unreachable (`P1001`).
- A disposable local PostgreSQL database was initialized for verification.
- `pnpm db:migrate` and `pnpm db:seed` passed against that disposable DB.
- `pnpm build` passed with `DATABASE_URL` and `DIRECT_DATABASE_URL` pointed at the disposable DB.
- The disposable PostgreSQL cluster was stopped and removed.

## 13. WORK-002 Verification

Commands:

```bash
pnpm exec tsc --noEmit --pretty false
pnpm db:validate
pnpm db:generate
pnpm exec eslint src/components/work/project/add-project-dialog.tsx src/app/actions/work.ts src/lib/services/project.service.ts
pnpm build
```

Result:

- `pnpm exec tsc --noEmit --pretty false` passed.
- `pnpm db:validate` passed.
- `pnpm db:generate` generated Prisma Client v7.8.0 successfully.
- Targeted eslint for `AddProjectDialog`, Work actions, and project service passed.
- `pnpm build` passed with the default environment.

Disposable local DB verification:

```bash
pnpm db:migrate
pnpm db:seed
pnpm db:seed
pnpm exec tsx -e '<service-level Work project create check>'
pnpm dev --hostname 127.0.0.1 --port 3010
curl -sS http://127.0.0.1:3010/work | rg -n "WORK-002 Persistence Test|Codex QA"
```

Result:

- A disposable local PostgreSQL cluster was created under `/tmp/self-structure-v1-work-002-97920` on port `55433`.
- The first migration attempt failed because the connection URL omitted the local PostgreSQL user; Postgres logged `no PostgreSQL user name specified`.
- Re-running with `postgresql://pzps0964713@localhost:55433/self_structure_work002` applied `20260602155517_baseline_initial_schema`.
- `pnpm db:seed` passed twice.
- Service-level project creation increased the current user's project count from `5` to `6`.
- `/work` served by local dev server returned the new `WORK-002 Persistence Test` project and `Codex QA` client from the disposable DB.
- Browser click-through was not automated in this pass; it should be repeated manually or in `WORK-007`.
- The dev server and disposable PostgreSQL cluster were stopped.

## 14. WORK-003 Verification

Commands:

```bash
pnpm exec tsc --noEmit --pretty false
pnpm db:validate
pnpm db:generate
pnpm exec eslint src/components/work/task/task-list.tsx src/components/work/task/task-sheet.tsx src/components/work/task/task-item.tsx src/app/actions/work.ts src/lib/services/project.service.ts
pnpm build
```

Result:

- `pnpm exec tsc --noEmit --pretty false` passed.
- `pnpm db:validate` passed.
- `pnpm db:generate` generated Prisma Client v7.8.0 successfully.
- Targeted eslint initially caught a React rule violation for syncing `initialTasks` into local state through an effect; the effect was removed.
- Targeted eslint then passed.
- `pnpm build` passed with the default environment.

Disposable local DB verification:

```bash
pnpm db:migrate
pnpm db:seed
pnpm exec tsx -e '<service-level Work task create/toggle check>'
pnpm dev --hostname 127.0.0.1 --port 3011
curl -sS http://127.0.0.1:3011/work/ac4449c8-ac99-5386-b720-daf25909b9cd | rg -n "WORK-003 Persistence Task|90bf2b22-df85-4a18-be2f-05e362acbb52|\"status\":\"done\""
```

Result:

- A disposable local PostgreSQL cluster was created under `/tmp/self-structure-v1-work-003-16739` on port `55434`.
- Baseline migration applied successfully.
- `pnpm db:seed` passed.
- Service-level task creation increased the selected project's task count from `6` to `7`.
- Service-level toggle changed the test task from `todo` to `done` with `completedAt`.
- `/work/[projectId]` served by local dev server returned the new `WORK-003 Persistence Task` with status `done`.
- Browser click-through was not automated; repeat it manually or during `WORK-007`.
- The dev server was stopped, the disposable PostgreSQL cluster was stopped, and the temporary DB directory was removed.

## 15. WORK-004 NoteTimeline Wiring

Current behavior before WORK-004:

- `NoteTimeline` initialized local state from `initialNotes`.
- `handleAddNote` created a client-only note ID with `n-${Date.now()}`.
- `handleTogglePin` only updated local component state.
- `AddNoteDialog` collected optional `title`, required `body`, `source`, and `visibility`.
- The previous dialog included a `client_visible` option even though public note exposure is not part of v0.1.
- `NoteItem` displayed source, AI/manual origin, client-visible badge when present, title, preview, timestamp, and pin button.
- Existing UI had no note edit or delete controls.

DB-backed behavior after WORK-004:

- `NoteTimeline` imports canonical note actions from `src/app/actions/work.ts`.
- Add note calls `addProjectNote(projectId, input)`.
- Pin/unpin calls `toggleProjectNotePin(noteId)`.
- Successful add prepends the returned UI-safe `ProjectNote` view model to local state.
- Successful pin/unpin replaces the local note with the returned UI-safe `ProjectNote` view model.
- Failed add keeps the dialog open and shows the action error.
- Failed pin/unpin rolls back to the previous local note and shows the action error.
- Pending add disables dialog fields/buttons.
- Pending pin/unpin shows an inline spinner and prevents duplicate clicks.
- Research-linked notes that are projected into the timeline but are not `project_notes` UUID records are treated as read-only and cannot call note mutation actions.

Server actions used:

```txt
NoteTimeline
  -> addProjectNote(projectId, input)
  -> requireUser()
  -> createNoteForProject()
  -> assertCanAccessProject()
  -> Prisma project note write
  -> toNoteViewModel()
  -> revalidatePath("/work")
  -> revalidatePath("/work/[projectId]")
  -> router.refresh()

NoteItem
  -> toggleProjectNotePin(noteId)
  -> requireUser()
  -> toggleNotePinForProfile()
  -> note owner check through related project
  -> Prisma project note update
  -> toNoteViewModel()
  -> revalidatePath("/work")
  -> revalidatePath("/work/[projectId]")
  -> router.refresh()
```

Refresh and revalidation strategy:

- Note server actions call `revalidateWorkProject(projectId)`, which revalidates `/work` and `/work/${projectId}`.
- `NoteTimeline` calls `router.refresh()` after successful add/pin.
- The client also updates local state using the returned view model so the user sees the result immediately.

Internal note boundary:

- `AddNoteDialog` now creates internal-only notes in WORK-004.
- Notes do not appear in `/client/[token]`.
- No client-visible note behavior or public note exposure was added.
- Future public note exposure requires explicit human approval and ClientPortalAgent/AuthPermissionAgent review.

Edit/delete status:

- `updateProjectNote(noteId, input)` and `deleteProjectNote(noteId)` already exist as canonical server actions.
- WORK-004 did not add new edit/delete UI because no existing edit/delete controls were present.
- Future edit/delete UI can be wired without changing the public action contract.

Remaining limitations:

- Browser click-through was not automated in this pass.
- Disposable local DB service-level create/pin plus `/work/[projectId]` route refresh was verified.
- Deliverable create/status/visibility is DB-backed after `WORK-005`.
- `requireUser()` still resolves the seeded/mock admin user until `AUTH-001`.
- `/client/[token]` is contained by `CLIENT-002`; after `CLIENT-001` it still remains unavailable by default unless the DB gate, token validation, and visibility checks pass. Notes remain excluded from public output by default.

## 16. WORK-004 Verification

Commands:

```bash
pnpm exec tsc --noEmit --pretty false
pnpm db:validate
pnpm db:generate
pnpm exec eslint src/components/work/note/note-timeline.tsx src/components/work/note/add-note-dialog.tsx src/components/work/note/note-item.tsx src/app/actions/work.ts src/lib/services/project.service.ts
pnpm build
```

Result:

- `pnpm exec tsc --noEmit --pretty false` passed.
- `pnpm db:validate` passed.
- `pnpm db:generate` generated Prisma Client v7.8.0 successfully.
- Targeted eslint passed.
- `pnpm build` passed with the default environment.

Disposable local DB verification:

```bash
pnpm db:migrate
pnpm db:seed
pnpm exec tsx -e '<service-level Work note create/pin check>'
pnpm dev
curl -sS http://127.0.0.1:3012/work/ac4449c8-ac99-5386-b720-daf25909b9cd | rg -n "WORK-004 Persistence Note|dbe3b877-904c-4c26-8e25-b3fff1ee4134|isPinned"
```

Result:

- A disposable local PostgreSQL cluster was created under `/tmp/self-structure-v1-work-004-pg` on port `55436`.
- Baseline migration applied successfully.
- `pnpm db:seed` passed.
- The first `tsx -e` service check failed because top-level await is not supported with the current CJS eval output; the same check was rerun inside an async IIFE.
- Service-level note creation increased the selected project's note count from `6` to `7`.
- Service-level pin toggle changed the new note to `isPinned: true`.
- The persisted note kept `visibility: INTERNAL_ONLY`, `source: INTERNAL`, and `origin: MANUAL`.
- `/work/[projectId]` served by local dev server returned the new `WORK-004 Persistence Note` with `isPinned: true`.
- Browser click-through was not automated; repeat it manually or during `WORK-007`.
- The dev server was stopped, the disposable PostgreSQL cluster was stopped, and the temporary DB directory was removed.

## 17. WORK-005 DeliverableTree Wiring

Current behavior before WORK-005:

- `DeliverableTree` initialized local state from `initialDeliverables`.
- `handleSave` created a client-only deliverable ID with `d${Date.now()}-${projectId}`.
- `AddDeliverableDialog` collected type, parent folder, title, optional description, status, and visibility.
- `FileNode` displayed title, status, and visibility but had no DB-backed status or visibility controls.
- Existing UI had no deliverable delete or broad metadata edit controls.
- `DeliverableTree` is used in the Work tab and inside the Pulse tab deliverable structure section.

DB-backed behavior after WORK-005:

- `DeliverableTree` imports canonical deliverable actions from `src/app/actions/work.ts`.
- Create calls `createProjectDeliverable(projectId, input)`.
- File status update calls `updateProjectDeliverable(deliverableId, { status })`.
- File visibility toggle calls `updateProjectDeliverableVisibility(deliverableId, visibility)`.
- Successful create appends the returned UI-safe `ProjectDeliverable` view model to local state.
- Successful status/visibility updates replace the local deliverable with the returned UI-safe view model.
- Failed create keeps the dialog open and shows the action error.
- Failed status/visibility updates roll back to the previous local deliverable and show the action error.
- Pending create disables dialog fields/buttons.
- Pending status/visibility updates show an inline spinner and prevent duplicate clicks.
- `AddDeliverableDialog` now remains backward-compatible with the older `DeliverableTable` local-only callback shape.

Server actions used:

```txt
DeliverableTree
  -> createProjectDeliverable(projectId, input)
  -> requireUser()
  -> createDeliverableForProject()
  -> assertCanAccessProject()
  -> assertDeliverableParentInProject()
  -> Prisma project deliverable write
  -> toDeliverableViewModel()
  -> revalidatePath("/work")
  -> revalidatePath("/work/[projectId]")
  -> router.refresh()

FileNode status menu
  -> updateProjectDeliverable(deliverableId, { status })
  -> requireUser()
  -> updateDeliverableForProfile()
  -> deliverable owner check through related project
  -> Prisma project deliverable update
  -> toDeliverableViewModel()
  -> revalidatePath("/work")
  -> revalidatePath("/work/[projectId]")
  -> router.refresh()

FileNode visibility button
  -> updateProjectDeliverableVisibility(deliverableId, visibility)
  -> requireUser()
  -> updateDeliverableVisibilityForProfile()
  -> deliverable owner check through related project
  -> Prisma project deliverable update
  -> toDeliverableViewModel()
  -> revalidatePath("/work")
  -> revalidatePath("/work/[projectId]")
  -> router.refresh()
```

Refresh and revalidation strategy:

- Deliverable server actions call `revalidateWorkProject(projectId)`, which revalidates `/work` and `/work/${projectId}`.
- `DeliverableTree` calls `router.refresh()` after successful create/status/visibility mutations.
- The client also updates local state using the returned view model so the user sees the result immediately.

Delete/edit metadata status:

- `updateProjectDeliverable(deliverableId, input)` and `deleteProjectDeliverable(deliverableId)` already exist as canonical server actions.
- WORK-005 did not add a broad metadata editor or delete UI because no matching controls existed.
- Future edit/delete UI can be wired without changing the public action contract.

Client Portal visibility implications:

- Deliverables are internal by default unless marked `client_visible`.
- WORK-005 only updates Work project detail behavior.
- WORK-005 does not convert `/client/[token]` to DB and does not expose new data through the public route.
- CLIENT-002 contains `/client/[token]` by removing mock runtime reads and returning a safe unavailable/noindex boundary.
- `CLIENT-001` reads only `CLIENT_VISIBLE` deliverable records from the DB; file URLs remain excluded until public storage review.
- Any public/client-visible output still requires ClientPortalAgent and AuthPermissionAgent review.
- Internal notes remain excluded from Client Portal.

Remaining limitations:

- Browser click-through was not automated in this pass.
- Disposable local DB service-level create/status/visibility plus `/work/[projectId]` route refresh was verified.
- `requireUser()` still resolves the seeded/mock admin user until `AUTH-001`.
- `/client/[token]` remains unavailable by default unless `CLIENT-001` validates persisted tokens and filters DB records to client-visible output behind the explicit DB gate.
- `ProjectPulseSection` and the Work tab each render their own `DeliverableTree` instance; the invoking tree updates immediately, while full cross-instance click-through can be repeated in `WORK-007`.

## 18. WORK-005 Verification

Commands:

```bash
pnpm exec tsc --noEmit --pretty false
pnpm db:validate
pnpm db:generate
pnpm exec eslint src/components/work/deliverable/deliverable-tree.tsx src/components/work/deliverable/add-deliverable-dialog.tsx src/app/actions/work.ts src/lib/services/project.service.ts
pnpm build
```

Result:

- `pnpm exec tsc --noEmit --pretty false` initially failed because `AddDeliverableDialog` is also used by `DeliverableTable`; the dialog callback was made backward-compatible with void-return local handlers.
- `pnpm exec tsc --noEmit --pretty false` then passed.
- `pnpm db:validate` passed.
- `pnpm db:generate` generated Prisma Client v7.8.0 successfully.
- Targeted eslint passed.
- `pnpm build` passed with the default environment.

Disposable local DB verification:

```bash
pnpm db:migrate
pnpm db:seed
pnpm exec tsx -e '<service-level Work deliverable create/status/visibility check>'
pnpm dev
curl -sS http://127.0.0.1:3013/work/ac4449c8-ac99-5386-b720-daf25909b9cd | rg -n "WORK-005 Persistence Deliverable|a720e6e6-4847-4e70-abed-f7c355303634|\"status\":\"delivered\"|\"visibility\":\"client_visible\""
```

Result:

- A disposable local PostgreSQL cluster was created under `/tmp/self-structure-v1-work-005-pg` on port `55437`.
- Baseline migration applied successfully.
- `pnpm db:seed` passed.
- Service-level deliverable creation increased the selected project's deliverable count from `6` to `7`.
- Service-level status update changed the new deliverable to `DELIVERED`.
- Service-level visibility update changed the new deliverable to `CLIENT_VISIBLE`.
- `/work/[projectId]` served by local dev server returned the new `WORK-005 Persistence Deliverable` with `status: delivered` and `visibility: client_visible`.
- Browser click-through was not automated; repeat it manually or during `WORK-007`.
- The dev server was stopped, the disposable PostgreSQL cluster was stopped, and the temporary DB directory was removed.

## 19. WORK-006 Project Progress Strategy

Current storage:

- `Project.tasksDone` and `Project.tasksTotal` remain columns in Prisma and the database.
- Seed still writes those snapshot fields from `src/lib/mock/work/mock-projects.ts`.
- The snapshot columns are no longer treated as the runtime source of truth for Work v0.1 progress.

Current displays:

- `/work` project cards display `project.tasksDone / project.tasksTotal` and calculate a percentage from those values.
- `/work/[projectId]` QuickStat and `ProjectPulseSection` display the same view-model values.
- `ProjectFocusCard` and AI pulse widgets consume the `Project` view model and do not read Prisma fields directly.

Chosen strategy:

- WORK-006 uses Strategy A: derived progress.
- At read time, `tasksDone` is derived from `ProjectTask` rows whose status is `DONE`.
- At read time, `tasksTotal` is derived from the count of actual `ProjectTask` rows.
- The UI percentage remains `tasksTotal === 0 ? 0 : Math.round((tasksDone / tasksTotal) * 100)`.

Implementation:

- `getProjectsForProfile()` now includes task status values for each project list item.
- `getProjectDetailForProfile()` already includes full task rows.
- `toProjectViewModel()` now prefers relation-derived task counts when task rows are present.
- If no task relation is present, the mapper falls back to legacy snapshot fields for backward compatibility.
- Task mutation functions did not change because no transactional snapshot maintenance is needed.

Why this fits v0.1:

- It removes drift after task add/toggle/update/delete without adding transaction coupling.
- It keeps Prisma schema, migrations, and seed stable.
- It matches the current Server Component refresh flow: task actions revalidate and `router.refresh()` reloads project view models.

Remaining limitations:

- Snapshot fields still exist in the database and seed as legacy/demo hints.
- Some seeded project snapshot values intentionally differ from actual task rows; runtime UI now shows actual task-row progress.
- Full browser click-through for project/task/note/deliverable/progress refresh should be repeated in `WORK-007`.

## 20. WORK-006 Verification

Commands:

```bash
pnpm exec tsc --noEmit --pretty false
pnpm db:validate
pnpm db:generate
pnpm exec eslint src/lib/services/project.service.ts src/lib/mappers/work.mapper.ts
pnpm build
```

Result:

- TypeScript passed.
- Prisma validate passed.
- Prisma generate produced Prisma Client v7.8.0 successfully.
- Targeted eslint passed.
- Default `pnpm build` failed during `/work` prerender because `.env.local` points at an unreachable remote Supabase host (`P1001` on `db.dxzjaenslifcjkwzucjj.supabase.co`).

Disposable local DB verification:

```bash
pnpm db:migrate
pnpm db:seed
pnpm exec tsx -e '<service + mapper derived progress check>'
pnpm build
```

Result:

- A disposable local PostgreSQL cluster was created under `/tmp/self-structure-v1-work-006-pg.bVyWAc` on port `55438`.
- Baseline migration applied successfully.
- `pnpm db:seed` passed.
- The derived progress check used `Lisa Q2 Dashboard`.
- Before mutation, list and detail view models both returned `tasksDone=2` and `tasksTotal=6`, matching actual task rows.
- After adding a TODO task, the detail view model returned `tasksDone=2` and `tasksTotal=7`.
- After toggling that task to DONE, the detail view model returned `tasksDone=3` and `tasksTotal=7`, matching actual task rows.
- `pnpm build` passed with `DATABASE_URL` and `DIRECT_DATABASE_URL` pointed at the disposable local DB.
- The disposable PostgreSQL cluster was stopped and removed.
- A second disposable local PostgreSQL cluster was created under `/tmp/self-structure-v1-work-006-route-pg.J9zNb1` on port `55439` for route-level verification.
- After applying migration, seeding, adding `WORK-006 Route Progress Task`, and toggling it to DONE, `curl http://127.0.0.1:3014/work/ac4449c8-ac99-5386-b720-daf25909b9cd` returned a project payload with `tasksDone=3`, `tasksTotal=7`, and the persisted test task.
- The route-check dev server was stopped and the second disposable PostgreSQL cluster was removed.

## 21. WORK-008 Disposable Refresh Proof Harness

`WORK-008` adds `scripts/work-refresh-proof.mjs` and the `pnpm work:proof` package script.

The harness is intentionally dry-run-first:

```bash
pnpm work:proof
pnpm work:proof -- --json
```

Run mode writes only after an operator provides a disposable/local target and explicit confirmation:

```bash
WORK_PROOF_DATABASE_URL="postgresql://..." \
PERSONAL_OS_WORK_PROOF_ALLOW_WRITES=1 \
PERSONAL_OS_WORK_PROOF_CONFIRM=I_UNDERSTAND_THIS_WRITES_TEST_DATA \
pnpm work:proof -- --run
```

Proof behavior:

- Create a proof-only `Profile`.
- Create a proof-only `Project` with intentionally stale `tasksDone/tasksTotal` snapshot values.
- Create a task, note, and deliverable, then update them to `DONE`, pinned, and delivered/client-visible.
- Disconnect and reconnect with a fresh Prisma client to simulate a refresh read.
- Verify task/note/deliverable markers and derived progress `1/1`.
- Delete the proof profile and verify cascaded cleanup.

Boundaries:

- This is a local/disposable DB proof harness, not final `WORK-007` browser proof.
- The harness must not print database URLs, database hosts, profile IDs, project IDs, task IDs, note IDs, deliverable IDs, cookies, tokens, or provider payloads.
- `--setup` can run `pnpm db:deploy` against the selected proof URL, but only in run mode and only after the same write-safety confirmation.
- Do not use `--use-database-url` against a valuable database.
