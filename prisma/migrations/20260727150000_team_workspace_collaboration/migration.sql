-- TEAMCOLLAB-005A canonical additive workspace collaboration migration.
-- Deployable migration artifact; applying it to any configured/valuable target
-- still requires the target-specific preflight, reviewed apply approval, and proof.

-- CreateEnum
CREATE TYPE "workspace_type" AS ENUM ('PERSONAL', 'TEAM');
CREATE TYPE "workspace_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "workspace_member_role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'GUEST');
CREATE TYPE "workspace_membership_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'LEFT', 'REMOVED');
CREATE TYPE "project_access_mode" AS ENUM ('PRIVATE', 'WORKSPACE_VISIBLE');
CREATE TYPE "project_access_role" AS ENUM ('VIEWER', 'COMMENTER', 'EDITOR', 'MANAGER');
CREATE TYPE "project_access_grant_status" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "collaboration_invitation_status" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');
CREATE TYPE "project_feedback_target_type" AS ENUM ('PROJECT', 'TASK', 'NOTE', 'DELIVERABLE', 'FILE', 'MEDIA');
CREATE TYPE "project_feedback_status" AS ENUM ('ACTIVE', 'RESOLVED', 'WITHDRAWN', 'DELETED');
CREATE TYPE "project_memory_candidate_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUPERSEDED', 'INVALIDATED');

-- Additive identity and project scope. Both identity columns stay nullable during cutover.
ALTER TABLE "profiles" ADD COLUMN "auth_user_id" UUID;
ALTER TABLE "projects" ADD COLUMN "workspace_id" UUID;
ALTER TABLE "projects" ADD COLUMN "access_mode" "project_access_mode" NOT NULL DEFAULT 'PRIVATE';

CREATE TABLE "workspaces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "workspace_type" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "workspace_status" NOT NULL DEFAULT 'ACTIVE',
    "default_project_access_role" "project_access_role" NOT NULL DEFAULT 'VIEWER',
    "ai_feedback_memory_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_by_profile_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workspace_memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "role" "workspace_member_role" NOT NULL DEFAULT 'MEMBER',
    "status" "workspace_membership_status" NOT NULL DEFAULT 'ACTIVE',
    "invited_by_profile_id" UUID,
    "joined_at" TIMESTAMP(3),
    "suspended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "workspace_memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "collaboration_invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "normalized_email" TEXT NOT NULL,
    "token_digest" TEXT NOT NULL,
    "workspace_role" "workspace_member_role" NOT NULL DEFAULT 'MEMBER',
    "project_id" UUID,
    "project_role" "project_access_role",
    "status" "collaboration_invitation_status" NOT NULL DEFAULT 'PENDING',
    "invited_by_profile_id" UUID NOT NULL,
    "accepted_by_profile_id" UUID,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "collaboration_invitations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "collaboration_invitations_project_pair_check" CHECK (
      ("project_id" IS NULL AND "project_role" IS NULL) OR
      ("project_id" IS NOT NULL AND "project_role" IS NOT NULL)
    )
);

CREATE TABLE "project_access_grants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "role" "project_access_role" NOT NULL,
    "status" "project_access_grant_status" NOT NULL DEFAULT 'ACTIVE',
    "granted_by_profile_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "project_access_grants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_feedback" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "author_profile_id" UUID NOT NULL,
    "target_type" "project_feedback_target_type" NOT NULL,
    "target_id" UUID,
    "body" TEXT NOT NULL,
    "status" "project_feedback_status" NOT NULL DEFAULT 'ACTIVE',
    "ai_use_eligible" BOOLEAN NOT NULL DEFAULT false,
    "ai_use_reason" TEXT,
    "current_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "project_feedback_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "project_feedback_current_version_positive_check" CHECK ("current_version" > 0)
);

CREATE TABLE "project_feedback_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "feedback_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "edited_by_profile_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_feedback_versions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "project_feedback_versions_version_positive_check" CHECK ("version" > 0)
);

CREATE TABLE "project_memory_candidates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "feedback_id" UUID NOT NULL,
    "feedback_version" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "proposed_rule" TEXT,
    "status" "project_memory_candidate_status" NOT NULL DEFAULT 'PENDING',
    "proposed_by_agent_id" TEXT NOT NULL,
    "reviewed_by_profile_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "invalidated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "project_memory_candidates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "project_memory_candidates_feedback_version_positive_check" CHECK ("feedback_version" > 0)
);

-- Stable uniqueness and lookup indexes.
CREATE UNIQUE INDEX "profiles_auth_user_id_key" ON "profiles"("auth_user_id");
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");
CREATE UNIQUE INDEX "workspaces_active_personal_creator_unique" ON "workspaces"("created_by_profile_id")
  WHERE "type" = 'PERSONAL' AND "status" = 'ACTIVE';
CREATE INDEX "workspaces_status_type_idx" ON "workspaces"("status", "type");
CREATE UNIQUE INDEX "workspace_memberships_workspace_profile_unique" ON "workspace_memberships"("workspace_id", "profile_id");
CREATE INDEX "workspace_memberships_profile_status_idx" ON "workspace_memberships"("profile_id", "status");
CREATE UNIQUE INDEX "collaboration_invitations_token_digest_key" ON "collaboration_invitations"("token_digest");
CREATE INDEX "collaboration_invitations_workspace_email_status_idx" ON "collaboration_invitations"("workspace_id", "normalized_email", "status");
CREATE INDEX "collaboration_invitations_expiry_status_idx" ON "collaboration_invitations"("expires_at", "status");
CREATE UNIQUE INDEX "project_access_grants_project_membership_unique" ON "project_access_grants"("project_id", "membership_id");
CREATE INDEX "project_access_grants_membership_role_status_idx" ON "project_access_grants"("membership_id", "role", "status");
CREATE INDEX "project_feedback_workspace_project_status_idx" ON "project_feedback"("workspace_id", "project_id", "status");
CREATE INDEX "project_feedback_author_created_idx" ON "project_feedback"("author_profile_id", "created_at");
CREATE UNIQUE INDEX "project_feedback_versions_feedback_version_unique" ON "project_feedback_versions"("feedback_id", "version");
CREATE INDEX "project_memory_candidates_workspace_project_status_idx" ON "project_memory_candidates"("workspace_id", "project_id", "status");
CREATE INDEX "project_memory_candidates_feedback_version_idx" ON "project_memory_candidates"("feedback_id", "feedback_version");
CREATE INDEX "projects_workspace_status_idx" ON "projects"("workspace_id", "status");

-- Relational constraints. Cross-row capability rules remain service/transaction checks.
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_created_by_profile_id_fkey"
  FOREIGN KEY ("created_by_profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_profile_id_fkey"
  FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_invited_by_profile_id_fkey"
  FOREIGN KEY ("invited_by_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "collaboration_invitations" ADD CONSTRAINT "collaboration_invitations_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collaboration_invitations" ADD CONSTRAINT "collaboration_invitations_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "collaboration_invitations" ADD CONSTRAINT "collaboration_invitations_invited_by_profile_id_fkey"
  FOREIGN KEY ("invited_by_profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "collaboration_invitations" ADD CONSTRAINT "collaboration_invitations_accepted_by_profile_id_fkey"
  FOREIGN KEY ("accepted_by_profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_access_grants" ADD CONSTRAINT "project_access_grants_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_access_grants" ADD CONSTRAINT "project_access_grants_membership_id_fkey"
  FOREIGN KEY ("membership_id") REFERENCES "workspace_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_access_grants" ADD CONSTRAINT "project_access_grants_granted_by_profile_id_fkey"
  FOREIGN KEY ("granted_by_profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_feedback" ADD CONSTRAINT "project_feedback_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_feedback" ADD CONSTRAINT "project_feedback_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_feedback" ADD CONSTRAINT "project_feedback_author_profile_id_fkey"
  FOREIGN KEY ("author_profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_feedback_versions" ADD CONSTRAINT "project_feedback_versions_feedback_id_fkey"
  FOREIGN KEY ("feedback_id") REFERENCES "project_feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_feedback_versions" ADD CONSTRAINT "project_feedback_versions_edited_by_profile_id_fkey"
  FOREIGN KEY ("edited_by_profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_memory_candidates" ADD CONSTRAINT "project_memory_candidates_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_memory_candidates" ADD CONSTRAINT "project_memory_candidates_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_memory_candidates" ADD CONSTRAINT "project_memory_candidates_feedback_id_feedback_version_fkey"
  FOREIGN KEY ("feedback_id", "feedback_version") REFERENCES "project_feedback_versions"("feedback_id", "version") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_memory_candidates" ADD CONSTRAINT "project_memory_candidates_reviewed_by_profile_id_fkey"
  FOREIGN KEY ("reviewed_by_profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: one active PERSONAL workspace and OWNER membership per legacy profile.
INSERT INTO "workspaces" (
  "id", "type", "name", "slug", "status", "default_project_access_role",
  "ai_feedback_memory_enabled", "created_by_profile_id", "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  'PERSONAL'::"workspace_type",
  COALESCE(NULLIF(BTRIM(p."full_name"), ''), p."email") || '''s workspace',
  'personal-' || REPLACE(p."id"::text, '-', ''),
  'ACTIVE'::"workspace_status",
  'VIEWER'::"project_access_role",
  false,
  p."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "profiles" p
WHERE NOT EXISTS (
  SELECT 1
  FROM "workspaces" w
  WHERE w."created_by_profile_id" = p."id"
    AND w."type" = 'PERSONAL'
    AND w."status" = 'ACTIVE'
);

INSERT INTO "workspace_memberships" (
  "id", "workspace_id", "profile_id", "role", "status", "joined_at", "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  w."id",
  p."id",
  'OWNER'::"workspace_member_role",
  'ACTIVE'::"workspace_membership_status",
  p."created_at",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "profiles" p
JOIN "workspaces" w
  ON w."created_by_profile_id" = p."id"
 AND w."type" = 'PERSONAL'
 AND w."status" = 'ACTIVE'
ON CONFLICT ("workspace_id", "profile_id") DO UPDATE
SET "role" = 'OWNER',
    "status" = 'ACTIVE',
    "joined_at" = COALESCE("workspace_memberships"."joined_at", EXCLUDED."joined_at"),
    "updated_at" = CURRENT_TIMESTAMP;

UPDATE "projects" p
SET "workspace_id" = w."id"
FROM "workspaces" w
WHERE p."workspace_id" IS NULL
  AND w."created_by_profile_id" = p."owner_id"
  AND w."type" = 'PERSONAL'
  AND w."status" = 'ACTIVE';

ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- No RLS policies, provider calls, invitation delivery, public routes, or AI memory promotion are created here.
