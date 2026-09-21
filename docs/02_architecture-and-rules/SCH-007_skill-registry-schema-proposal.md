# Skill Registry Schema Proposal

**Document ID:** `SCH-007`
**Date:** 2026-09-02
**Status:** IMPLEMENTED IN PRISMA SCHEMA

## 1. Decision

To support dynamically created and managed Agent Skills, and to enforce isolation between Personal and Team environments, the system will introduce a new `Skill` model bound directly to `Workspace`.

This allows skills to inherit the privacy and sharing boundaries of the workspace they belong to. `PERSONAL` workspaces will naturally yield strictly personal skills, while `TEAM` workspaces will yield skills accessible to all team members.

## 2. Proposed Enums

```prisma
enum SkillScope {
  GLOBAL
  WORKSPACE
  PERSONAL

  @@map("skill_scope")
}

enum SkillStatus {
  ACTIVE
  ARCHIVED
  DRAFT

  @@map("skill_status")
}
```

## 3. Proposed Models

```prisma
model Skill {
  id                 String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId        String?    @map("workspace_id") @db.Uuid
  workspace          Workspace? @relation("WorkspaceSkills", fields: [workspaceId], references: [id], onDelete: Cascade)
  name               String
  description        String?
  instructions       String
  scope              SkillScope @default(WORKSPACE)
  status             SkillStatus @default(ACTIVE)
  createdByProfileId String     @map("created_by_profile_id") @db.Uuid
  createdBy          Profile    @relation("SkillCreatedBy", fields: [createdByProfileId], references: [id], onDelete: Restrict)
  createdAt          DateTime   @default(now()) @map("created_at")
  updatedAt          DateTime   @updatedAt @map("updated_at")

  @@index([workspaceId, status])
  @@map("skills")
}
```

## 4. Updates to Existing Models

### Profile
Add:
```prisma
  createdSkills Skill[] @relation("SkillCreatedBy")
```

### Workspace
Add:
```prisma
  skills Skill[] @relation("WorkspaceSkills")
```

## 5. Invariants

1. If a Skill's `workspaceId` is non-null, its `scope` should logically align with the `Workspace.type` (e.g. `PERSONAL` scope for `PERSONAL` workspaces).
2. Global skills (`scope = GLOBAL`) will likely omit `workspaceId` because they belong to the entire system instance.
3. Users can only fetch and execute skills where they have an active `WorkspaceMembership` for the skill's `workspaceId` (or if it's GLOBAL).

## 6. Migration Impact

- This is a purely additive schema change. No data migration is required for existing rows.
- Existing static skills (`.codex/skills`) remain unaffected in the short term, but may eventually be synchronized into the `GLOBAL` scope within this schema.

## 7. Verification
- `pnpm db:validate`
- `pnpm db:generate`
