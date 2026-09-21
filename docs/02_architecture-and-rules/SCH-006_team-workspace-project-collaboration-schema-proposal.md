# Team Workspace And Project Collaboration Schema Proposal

**Document ID:** `SCH-006`  
**Last updated:** 2026-07-27  
**Status:** IMPLEMENTED IN PRISMA SCHEMA — nondeployable draft/disposable proof only; no live migration approved  
**Source research:** `RES-026`  
**Supersedes:** `SCH-004`'s one-Profile/one-Tenant proposal

---

## 1. Decision

The durable collaboration boundary is `Workspace`, with many-to-many `WorkspaceMembership`.

```txt
Profile
  -> WorkspaceMembership
  -> Workspace
  -> Project
  -> ProjectAccessGrant
  -> ProjectFeedback
  -> ProjectMemoryCandidate
```

Do not implement `Profile.tenantId`. One identity must be able to keep a personal workspace and join multiple team workspaces.

## 2. Proposed Enums

```prisma
enum WorkspaceType {
  PERSONAL
  TEAM

  @@map("workspace_type")
}

enum WorkspaceStatus {
  ACTIVE
  SUSPENDED
  ARCHIVED

  @@map("workspace_status")
}

enum WorkspaceMemberRole {
  OWNER
  ADMIN
  MEMBER
  GUEST

  @@map("workspace_member_role")
}

enum WorkspaceMembershipStatus {
  ACTIVE
  SUSPENDED
  LEFT
  REMOVED

  @@map("workspace_membership_status")
}

enum ProjectAccessMode {
  PRIVATE
  WORKSPACE_VISIBLE

  @@map("project_access_mode")
}

enum ProjectAccessRole {
  VIEWER
  COMMENTER
  EDITOR
  MANAGER

  @@map("project_access_role")
}

enum ProjectAccessGrantStatus {
  ACTIVE
  INACTIVE

  @@map("project_access_grant_status")
}

enum CollaborationInvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
  REVOKED

  @@map("collaboration_invitation_status")
}

enum ProjectFeedbackTargetType {
  PROJECT
  TASK
  NOTE
  DELIVERABLE
  FILE
  MEDIA

  @@map("project_feedback_target_type")
}

enum ProjectFeedbackStatus {
  ACTIVE
  RESOLVED
  WITHDRAWN
  DELETED

  @@map("project_feedback_status")
}

enum ProjectMemoryCandidateStatus {
  PENDING
  APPROVED
  REJECTED
  SUPERSEDED
  INVALIDATED

  @@map("project_memory_candidate_status")
}
```

## 3. Proposed Models

```prisma
model Workspace {
  id                       String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  type                     WorkspaceType
  name                     String
  slug                     String            @unique
  status                   WorkspaceStatus   @default(ACTIVE)
  defaultProjectAccessRole ProjectAccessRole @default(VIEWER) @map("default_project_access_role")
  aiFeedbackMemoryEnabled  Boolean           @default(false) @map("ai_feedback_memory_enabled")
  createdByProfileId       String            @map("created_by_profile_id") @db.Uuid
  createdBy                Profile           @relation("WorkspaceCreatedBy", fields: [createdByProfileId], references: [id], onDelete: Restrict)
  createdAt                DateTime          @default(now()) @map("created_at")
  updatedAt                DateTime          @updatedAt @map("updated_at")

  memberships WorkspaceMembership[]
  invitations CollaborationInvitation[]
  projects    Project[]

  @@index([status, type])
  @@map("workspaces")
}

model WorkspaceMembership {
  id          String                    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId String                    @map("workspace_id") @db.Uuid
  workspace   Workspace                 @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  profileId   String                    @map("profile_id") @db.Uuid
  profile     Profile                   @relation(fields: [profileId], references: [id], onDelete: Cascade)
  role        WorkspaceMemberRole       @default(MEMBER)
  status      WorkspaceMembershipStatus @default(ACTIVE)
  invitedByProfileId String?            @map("invited_by_profile_id") @db.Uuid
  joinedAt    DateTime?                 @map("joined_at")
  suspendedAt DateTime?                 @map("suspended_at")
  createdAt   DateTime                  @default(now()) @map("created_at")
  updatedAt   DateTime                  @updatedAt @map("updated_at")

  projectGrants ProjectAccessGrant[]

  @@unique([workspaceId, profileId])
  @@index([profileId, status])
  @@map("workspace_memberships")
}

model CollaborationInvitation {
  id                 String                        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId        String                        @map("workspace_id") @db.Uuid
  workspace          Workspace                     @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  normalizedEmail    String                        @map("normalized_email")
  tokenDigest        String                        @unique @map("token_digest")
  workspaceRole      WorkspaceMemberRole           @default(MEMBER) @map("workspace_role")
  projectId          String?                       @map("project_id") @db.Uuid
  projectRole        ProjectAccessRole?            @map("project_role")
  status             CollaborationInvitationStatus @default(PENDING)
  invitedByProfileId String                        @map("invited_by_profile_id") @db.Uuid
  acceptedByProfileId String?                      @map("accepted_by_profile_id") @db.Uuid
  expiresAt          DateTime                      @map("expires_at")
  acceptedAt         DateTime?                     @map("accepted_at")
  revokedAt          DateTime?                     @map("revoked_at")
  createdAt          DateTime                      @default(now()) @map("created_at")
  updatedAt          DateTime                      @updatedAt @map("updated_at")

  @@index([workspaceId, normalizedEmail, status])
  @@index([expiresAt, status])
  @@map("collaboration_invitations")
}

model ProjectAccessGrant {
  id           String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId    String            @map("project_id") @db.Uuid
  project      Project           @relation(fields: [projectId], references: [id], onDelete: Cascade)
  membershipId String            @map("membership_id") @db.Uuid
  membership   WorkspaceMembership @relation(fields: [membershipId], references: [id], onDelete: Cascade)
  role         ProjectAccessRole
  status       ProjectAccessGrantStatus @default(ACTIVE)
  grantedByProfileId String      @map("granted_by_profile_id") @db.Uuid
  createdAt    DateTime          @default(now()) @map("created_at")
  updatedAt    DateTime          @updatedAt @map("updated_at")

  @@unique([projectId, membershipId])
  @@index([membershipId, role])
  @@map("project_access_grants")
}

model ProjectFeedback {
  id              String                    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId     String                    @map("workspace_id") @db.Uuid
  projectId       String                    @map("project_id") @db.Uuid
  project         Project                   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  authorProfileId String                    @map("author_profile_id") @db.Uuid
  targetType      ProjectFeedbackTargetType @map("target_type")
  targetId        String?                   @map("target_id") @db.Uuid
  body            String
  status          ProjectFeedbackStatus     @default(ACTIVE)
  aiUseEligible   Boolean                   @default(false) @map("ai_use_eligible")
  aiUseReason     String?                   @map("ai_use_reason")
  currentVersion  Int                       @default(1) @map("current_version")
  createdAt       DateTime                  @default(now()) @map("created_at")
  updatedAt       DateTime                  @updatedAt @map("updated_at")
  deletedAt       DateTime?                 @map("deleted_at")

  versions        ProjectFeedbackVersion[]
  memoryCandidates ProjectMemoryCandidate[]

  @@index([workspaceId, projectId, status])
  @@index([authorProfileId, createdAt])
  @@map("project_feedback")
}

model ProjectFeedbackVersion {
  id              String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  feedbackId      String          @map("feedback_id") @db.Uuid
  feedback        ProjectFeedback @relation(fields: [feedbackId], references: [id], onDelete: Cascade)
  version         Int
  body            String
  editedByProfileId String        @map("edited_by_profile_id") @db.Uuid
  createdAt       DateTime        @default(now()) @map("created_at")

  memoryCandidates ProjectMemoryCandidate[]

  @@unique([feedbackId, version])
  @@map("project_feedback_versions")
}

model ProjectMemoryCandidate {
  id                String                       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId       String                       @map("workspace_id") @db.Uuid
  projectId         String                       @map("project_id") @db.Uuid
  feedbackId        String                       @map("feedback_id") @db.Uuid
  feedbackVersion   Int                          @map("feedback_version")
  feedbackVersionRecord ProjectFeedbackVersion   @relation(fields: [feedbackId, feedbackVersion], references: [feedbackId, version], onDelete: Restrict)
  summary           String
  proposedRule      String?                      @map("proposed_rule")
  status            ProjectMemoryCandidateStatus @default(PENDING)
  proposedByAgentId String                       @map("proposed_by_agent_id")
  reviewedByProfileId String?                    @map("reviewed_by_profile_id") @db.Uuid
  reviewedAt        DateTime?                    @map("reviewed_at")
  invalidatedAt     DateTime?                    @map("invalidated_at")
  createdAt         DateTime                     @default(now()) @map("created_at")
  updatedAt         DateTime                     @updatedAt @map("updated_at")

  @@index([workspaceId, projectId, status])
  @@index([feedbackId, feedbackVersion])
  @@map("project_memory_candidates")
}
```

The proposal omits some inverse `Profile` relations for readability; the final Prisma draft must name them explicitly and pass `pnpm db:validate`.

`TEAMCOLLAB-004` now satisfies that requirement in `prisma/schema.prisma`. The complete implemented schema is canonical where this earlier abbreviated proposal omits named inverse relations. Its reviewed SQL remains outside `prisma/migrations`; see `MIG-004`.

## 4. Proposed Changes To Existing Models

### Profile

Add:

```prisma
authUserId           String?               @unique @map("auth_user_id") @db.Uuid
createdWorkspaces    Workspace[]           @relation("WorkspaceCreatedBy")
workspaceMemberships WorkspaceMembership[]
```

`authUserId` is nullable during transition. Email matching remains the current runtime until `AUTH-005`/migration proof establishes the Auth UID mapping. Do not claim RLS identity safety from this proposal alone.

### Project

Add:

```prisma
workspaceId String?           @map("workspace_id") @db.Uuid
workspace   Workspace?        @relation(fields: [workspaceId], references: [id], onDelete: Restrict)
accessMode  ProjectAccessMode @default(PRIVATE) @map("access_mode")

accessGrants ProjectAccessGrant[]
feedback     ProjectFeedback[]
```

Keep current `ownerId` during transition. Do not rename it in the first migration. It continues to serve the current runtime and identifies the legacy personal owner until every Work read/write uses the workspace access resolver.

## 5. Invariants

1. Every `Profile` has exactly one active `PERSONAL` workspace membership with role `OWNER`.
2. A `PERSONAL` workspace has exactly one active owner membership.
3. A `TEAM` workspace has at least one active `OWNER`.
4. A project belongs to exactly one workspace after backfill.
5. A project grant's membership must belong to the same workspace as the project.
6. A `GUEST` has no inherited access to workspace-visible projects.
7. Invitation email is normalized once and acceptance requires exact authenticated-email match.
8. Raw invitation tokens are never persisted.
9. Feedback author must have `COMMENTER` or stronger capability at write time.
10. Memory candidate source version must remain resolvable or be marked invalidated.
11. Client Portal tokens never create workspace membership or project write capability.

Cross-row invariants 1, 2, 3, and 5 require service/transaction checks and database tests; Prisma schema alone cannot express all of them.

## 6. Staged Migration

### Migration A — Additive Identity

- Add workspace/member/invitation/grant enums and tables.
- Add nullable `Profile.authUserId`.
- Add nullable `Project.workspaceId` and `accessMode`.
- No runtime authorization change.

### Migration B — Backfill Personal Workspaces

- Create one personal workspace per existing Profile.
- Add owner membership.
- Backfill every existing Project to its owner's personal workspace.
- Verify zero orphan projects and one personal owner membership per profile.

### Migration C — Dual-Read Capability Resolver

- Keep current `ownerId === profileId` path as compatibility fallback only for backfilled personal projects.
- Add fixture/disposable two-workspace positive/negative tests.
- Do not enable team writes yet.

### Migration D — Team Workspace And Invitations

- Enable team creation/invite/accept flows behind owner-approved feature gate.
- Verify revoke, expiry, suspension, duplicate acceptance, and email mismatch.

### Migration E — Project Transfer And Feedback

- Enable audited project transfer.
- Add feedback/version/memory-candidate tables and policies.
- Keep AI proposal-only.

### Migration F — Authorization Cutover And RLS Review

- Remove legacy owner fallback only after every Work service routes through the resolver.
- Decide whether `ownerId` becomes `createdByProfileId` in a later migration.
- Add and test RLS only for a JWT-aware data path; do not assume Prisma direct connection carries end-user identity.

## 7. Migration Impact

- High-risk auth/permission and production-data change.
- Backfill touches every Profile and Project.
- New workspace ownership changes authorization semantics from one owner to membership/capability.
- Existing Client Portal behavior must remain unchanged.
- Existing SourceAsset/AIWorkflowRun owner scope is not automatically converted to workspace scope in this plan; project-linked AI feedback stays project/workspace scoped through new records.
- Any future widening of Work file/media records needs separate workspace-scope review.

No migration may run against a valuable database without:

- explicit owner approval;
- a generated migration diff;
- disposable database rehearsal;
- row-count/backfill assertions;
- two-workspace negative tests;
- rollback/forward-fix packet;
- client-token non-regression proof.

## 8. Seed Impact

`prisma/seed.ts` must:

- create the demo Profile;
- create one demo personal workspace and owner membership;
- assign every seeded Work project to that workspace;
- optionally create a separate demo team only in explicit collaboration-demo mode;
- never create real email invitations or send provider emails.

## 9. Rollback / Forward-Fix

Before team writes, additive tables/nullable fields can be removed after validation.

After team projects or collaborator feedback exist, dropping workspace tables would destroy authorization context and is not an acceptable rollback. Use forward-fix:

- disable collaboration feature gate;
- preserve workspace/membership/grant rows;
- block new invites/transfers;
- restore last known access policy;
- repair inconsistent rows through an audited admin script;
- never collapse team contributions back into one owner's authorship.

## 10. Verification

- `pnpm db:validate`
- `pnpm db:generate`
- generated SQL review
- disposable DB migrate + seed + seed
- backfill assertions
- cross-workspace read/write denial matrix
- invitation expiry/revoke/email-mismatch tests
- project transfer stable-ID and Client Portal non-regression test
- feedback deletion/memory invalidation test
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

## 11. Stop Conditions

Stop before:

- editing `prisma/schema.prisma` without selecting a scoped task;
- applying any migration to the live Supabase database;
- adding a service secret to client code;
- creating/sending real invitations without explicit owner authorization and recipient scope;
- enabling team project writes before negative authz proof;
- enabling automatic AI memory promotion or provider fine-tuning;
- changing Client Portal public output.
