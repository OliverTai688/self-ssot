-- 營運工作台設定持久化（右上角帳號選單 → 基礎／個人／組織設定）。
--
-- Impact notes:
-- * Additive only. Two new tables and one new enum; no existing table, column,
--   constraint or index is altered, so an in-place apply cannot lose data.
-- * `user_settings` is per-profile and cascades with the profile.
-- * `organization_settings` is company-wide. Write authorization is enforced in
--   the service layer (負責人席位 only, src/lib/services/operating-settings.service.ts);
--   `updated_by_id` keeps the trace of who last changed a company-wide value and
--   is nulled rather than cascaded so history survives a profile deletion.
-- * `org_key` is denormalized on purpose: today there is a single organization,
--   and keeping the column now means真正多租戶時不必重建主鍵.
-- * RLS: this repository keeps row-level policies in `supabase/migrations`, not in
--   Prisma migrations, so no policy is created here. Until a policy is added, these
--   two tables are reachable only through the service layer, same as the other
--   Prisma-managed tables.

-- CreateEnum
CREATE TYPE "setting_scope" AS ENUM ('BASIC', 'PERSONAL');

-- CreateTable
CREATE TABLE "user_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "scope" "setting_scope" NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_key" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_settings_profile_scope_idx" ON "user_settings"("profile_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_profile_id_scope_key_key" ON "user_settings"("profile_id", "scope", "key");

-- CreateIndex
CREATE INDEX "organization_settings_org_key_idx" ON "organization_settings"("org_key");

-- CreateIndex
CREATE UNIQUE INDEX "organization_settings_org_key_key_key" ON "organization_settings"("org_key", "key");

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_settings" ADD CONSTRAINT "organization_settings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
