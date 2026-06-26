# D-PLAN-016: SourceActionItem → ModuleWriteIntent → Work Service Pipeline

**Task:** DATTR-006
**Date:** 2026-06-09
**Status:** DONE — contract reference; no service implementation until DATTR-002 Prisma + AUTH-001 complete

---

## Purpose

Define how an actionable item extracted from a source asset (e.g., a task mentioned in a LINE message, a deliverable referenced in a Google Doc) becomes a Work module entity (ProjectTask, ProjectNote, ProjectDeliverable) through a reviewed `ModuleWriteIntent`. This is the bridge between the ingestion pipeline and the Work module SSOT.

The pipeline enforces: human review before any module write, source metadata preservation, and full lineage from source → proposal → commit.

---

## 1. Pipeline Overview

```txt
SourceAsset (MESSAGE / DOCUMENT / etc.)
  -> [AI extraction run (AIWorkflowRun)]
  -> SourceActionItem  (what the AI thinks should happen)
  -> [Human review in AI workbench]
  -> ModuleWriteIntent (approved action)
  -> [Work service: requireUser() + assertCanAccessProject()]
  -> ProjectTask / ProjectNote / ProjectDeliverable
  -> SourceLineage (audit link: Work entity → SourceAsset)
```

No step may be skipped. A `SourceActionItem` must not directly write to the Work module without becoming a reviewed `ModuleWriteIntent` first.

---

## 2. SourceActionItem Structure

When an AI extraction run identifies an actionable item:

```typescript
interface SourceActionItemPayload {
  sourceAssetId: string          // FK to SourceAsset
  ownerId: string                // owner profile ID
  actionType: "TASK" | "NOTE" | "RESEARCH_LINK" | "DELIVERABLE"
  targetModule: "work" | "research" | "chamber" | "life" | "finance"
  summary: string                // human-readable description of the action
  detail: {
    // For actionType: "TASK"
    title?: string
    description?: string
    dueDate?: string             // ISO 8601
    priority?: "HIGH" | "MEDIUM" | "LOW"
    suggestedProjectId?: string  // agent suggestion only; human confirms

    // For actionType: "NOTE"
    content?: string
    suggestedProjectId?: string

    // For actionType: "DELIVERABLE"
    title?: string
    deliverableType?: string
    suggestedProjectId?: string

    // For actionType: "RESEARCH_LINK"
    title?: string
    url?: string
    notes?: string
  }
  status: "PENDING"              // always PENDING at creation
  sourceEvidenceRef?: string     // which passage triggered this action item
}
```

Rules:
- `suggestedProjectId` is a proposal, not a command. Human must confirm which project to write to.
- `status` starts as `"PENDING"`. Human sets it to `"CONVERTED"` (approved) or `"REJECTED"`.
- `detail` is validated against the target module's write schema before presenting to the user.

---

## 3. ModuleWriteIntent Structure

When the user approves a `SourceActionItem`, a `ModuleWriteIntent` is created:

```typescript
interface ModuleWriteIntentPayload {
  ownerId: string
  sourceId?: string              // FK to SourceActionItem
  targetModule: "work"           // only Work is DB-backed in v0.1
  targetEntityType: "project_task" | "project_note" | "project_deliverable"
  targetProjectId: string        // human-confirmed project ID
  status: "PENDING_COMMIT"
  proposedFields: {
    // Mirrors the Work service create payloads
    // ProjectTask: title, description, priority, dueDate
    // ProjectNote: content, isInternal
    // ProjectDeliverable: title, deliverableType, description
  }
  sourceMetadata: {
    sourceAssetId: string
    sourceAssetKind: string      // "MESSAGE", "DOCUMENT", etc.
    evidenceRef?: string         // which passage the action came from
    capturedAt: string           // when the source was captured
    provider?: string            // "line", "google_docs", etc.
  }
}
```

The `sourceMetadata` block is preserved through commit and recorded in `SourceLineage` after the Work entity is created.

---

## 4. Review Surface (AI Workbench)

The user reviews pending `SourceActionItem` records in the "需要確認" tab of the AI workbench. The review UI must show:

| Field | Display |
|---|---|
| Source | Asset title + kind + provider |
| Evidence | The specific passage that triggered the action |
| Action type | TASK / NOTE / DELIVERABLE / RESEARCH_LINK |
| Summary | AI-generated description |
| Suggested project | Project name (editable) |
| Proposed fields | Editable form (title, description, priority, due date) |
| Actions | Approve (→ ModuleWriteIntent) / Reject / Edit |

On **Approve**:
1. User confirms or changes `targetProjectId`
2. User edits `proposedFields` if needed
3. Server action creates `ModuleWriteIntent{ status: "PENDING_COMMIT" }`
4. Server action immediately calls Work service commit (or queues for batch)
5. On success: `SourceActionItem.status = "CONVERTED"`, `writeIntentId` set
6. On failure: `ModuleWriteIntent.status = "FAILED"`, error shown to user

On **Reject**:
1. `SourceActionItem.status = "REJECTED"`
2. No `ModuleWriteIntent` created

---

## 5. Work Service Commit

The commit path follows the existing BFF-first Work service pattern (WORK-001):

```typescript
// Server action (protected)
async function commitWriteIntent(writeIntentId: string, userId: string) {
  const writeIntent = await getModuleWriteIntent(writeIntentId, userId)
  // requireUser() already called at server action boundary

  if (writeIntent.targetModule !== "work") {
    throw new Error("Only Work module writes are supported in v0.1")
  }

  // assertCanAccessProject guards every write
  await assertCanAccessProject(writeIntent.targetProjectId, userId)

  if (writeIntent.targetEntityType === "project_task") {
    const task = await createProjectTask({
      projectId: writeIntent.targetProjectId,
      title: writeIntent.proposedFields.title,
      description: writeIntent.proposedFields.description,
      priority: writeIntent.proposedFields.priority,
      dueDate: writeIntent.proposedFields.dueDate,
    })
    await recordSourceLineage(writeIntent, task.id, "project_task")
    await markWriteIntentCommitted(writeIntentId, task.id)
    return task
  }

  if (writeIntent.targetEntityType === "project_note") {
    const note = await createProjectNote({
      projectId: writeIntent.targetProjectId,
      content: writeIntent.proposedFields.content,
      isInternal: true, // source-derived notes are always internal by default
    })
    await recordSourceLineage(writeIntent, note.id, "project_note")
    await markWriteIntentCommitted(writeIntentId, note.id)
    return note
  }

  // Deliverables follow the same pattern
}
```

Critical constraints:
- `requireUser()` is called at the server action boundary (already enforced by the existing Work action surface)
- `assertCanAccessProject()` is called before every write — no exceptions
- Source-derived notes default to `isInternal: true` — they are not visible to clients until explicitly changed
- Source-derived deliverables default to `visibility: "internal"` for the same reason

---

## 6. SourceLineage Record

After a successful commit, a `SourceLineage` record links the Work entity back to the source:

```typescript
interface SourceLineagePayload {
  writeIntentId: string
  targetEntityType: string       // "project_task", "project_note", "project_deliverable"
  targetEntityId: string         // ID of the created Work entity
  sourceAssetId: string
  sourceAssetKind: string
  evidenceRef?: string
  committedAt: string
  committedBy: string            // user profile ID
}
```

This record enables:
- "Where did this task come from?" — drill down from Work entity to source
- Governance audit ("which source assets created Work entries in this period?")
- Evidence traceability for research and deliverable review

---

## 7. State Machine

```
SourceActionItem.status:
  PENDING → CONVERTED (on human approval + successful commit)
  PENDING → REJECTED  (on human rejection)
  PENDING → EXPIRED   (TTL: 30 days with no action)

ModuleWriteIntent.status:
  PENDING_COMMIT → COMMITTED (on successful Work service write)
  PENDING_COMMIT → FAILED    (on Work service error)
  PENDING_COMMIT → CANCELLED (if user cancels before commit)
```

---

## 8. Boundaries and Safety Rules

| Rule | Reason |
|---|---|
| No direct `ProjectTask` creation from source extraction | Prevents AI from silently writing to Work SSOT |
| `suggestedProjectId` is a hint, not a command | Prevents incorrect project assignment |
| Source-derived notes/deliverables default to `isInternal = true` | Prevents accidental client visibility |
| `assertCanAccessProject()` before every commit | Prevents cross-user data access |
| `SourceActionItem` TTL of 30 days | Prevents stale proposals accumulating |
| No automatic batch commit without explicit human approval | All writes are human-gated |
| External agents cannot call `commitWriteIntent` | Only authenticated user sessions may commit |

---

## Acceptance Criteria

- [x] Full pipeline documented: SourceAsset → SourceActionItem → ModuleWriteIntent → Work service → SourceLineage
- [x] SourceActionItem payload structure (all actionTypes, status machine, suggestedProjectId rules)
- [x] ModuleWriteIntent payload with sourceMetadata block
- [x] Review surface fields and Approve/Reject behavior
- [x] Work service commit pseudocode with requireUser() + assertCanAccessProject() enforcement
- [x] SourceLineage record structure
- [x] State machine for both SourceActionItem and ModuleWriteIntent
- [x] Safety rules and boundaries table
- [ ] SourceActionItem + ModuleWriteIntent Prisma models added to schema (follow-on after DATTR-002)
- [ ] Server action `commitWriteIntent` implemented (follow-on after AUTH-001 + Supabase)
- [ ] AI workbench review UI for SourceActionItem (follow-on after DATTR-024)
