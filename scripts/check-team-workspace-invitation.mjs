#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const FILES = {
  schema: "prisma/schema.prisma",
  service: "src/lib/services/team-workspace-invitation.service.ts",
  action: "src/app/actions/team-workspace-invitation.ts",
  types: "src/types/team-workspace-invitation.ts",
  panel: "src/components/work/workspace/team-collaboration-sheet.tsx",
  auditReadiness: "src/lib/services/team-workspace-audit-readiness.service.ts",
}

const failures = []
const passes = []

function read(relativePath) {
  const absolutePath = path.join(ROOT, relativePath)
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : null
}

function check(id, description, fileNames, condition, hint) {
  if (condition) {
    passes.push({ id, description })
    console.log(`PASS ${id} ${description}`)
    return
  }
  failures.push({ id, description, files: fileNames, hint })
  console.error(`FAIL ${id} ${description}`)
  console.error(`  files: ${fileNames.join(", ")}`)
  console.error(`  hint: ${hint}`)
}

function all(text, patterns) {
  return typeof text === "string" && patterns.every((pattern) => pattern.test(text))
}

function none(text, patterns) {
  return typeof text === "string" && patterns.every((pattern) => !pattern.test(text))
}

function findInvitationMigration() {
  const directory = path.join(ROOT, "prisma/migrations")
  if (!fs.existsSync(directory)) return null
  const candidates = fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      relativePath: path.join("prisma/migrations", entry.name, "migration.sql"),
      name: entry.name,
    }))
    .filter(({ relativePath }) => fs.existsSync(path.join(ROOT, relativePath)))
    .map((candidate) => ({ ...candidate, text: read(candidate.relativePath) }))
    .filter(({ text }) =>
      /workspace\.member\.invited|workspace\.invitation\.accepted|workspace\.invitation\.revoked|workspace\.invitation\.expired/.test(
        text ?? "",
      ),
    )
    .sort((left, right) => left.name.localeCompare(right.name))
  return candidates.at(-1) ?? null
}

const texts = Object.fromEntries(
  Object.entries(FILES).map(([key, relativePath]) => [key, read(relativePath)]),
)
const migration = findInvitationMigration()
const runtimeTexts = [texts.service, texts.action, texts.types, texts.panel]
  .filter(Boolean)
  .join("\n")

check(
  "files.contract",
  "Invitation service, action, DTO, UI panel, and a scoped audit migration exist",
  [...Object.values(FILES), migration?.relativePath ?? "prisma/migrations/*invitation*/migration.sql"],
  Object.values(texts).every((text) => typeof text === "string") && migration !== null,
  "Add the BFF-first invitation vertical slice and its exact audit-catalog migration.",
)

check(
  "schema.lifecycle",
  "Schema retains digest-only invitation state and membership/grant uniqueness",
  [FILES.schema],
  all(texts.schema, [
    /enum\s+CollaborationInvitationStatus\s*{[\s\S]*?PENDING[\s\S]*?ACCEPTED[\s\S]*?EXPIRED[\s\S]*?REVOKED/,
    /model\s+CollaborationInvitation\s*{[\s\S]*?normalizedEmail\s+String[\s\S]*?tokenDigest\s+String\s+@unique/,
    /@@unique\(\[workspaceId,\s*profileId\]/,
    /@@unique\(\[projectId,\s*membershipId\]/,
  ]),
  "Keep raw tokens out of Prisma and preserve one membership/grant per subject.",
)

check(
  "service.server-only",
  "Invitation persistence is server-only and uses the shared database boundary",
  [FILES.service],
  all(texts.service, [/import\s+["']server-only["']/, /@\/lib\/db|from\s+["']\.\.\/db["']/]),
  "Import server-only and the canonical server DB adapter.",
)

check(
  "service.input-bounds",
  "Direct service calls validate UUIDs, email bounds, role enums, expiry, and idempotency input",
  [FILES.service],
  all(texts.service, [
    /UUID_PATTERN|\.uuid\(\)/,
    /normalize(?:Invitation)?Email|normalizedEmail/,
    /(?:254|320)|EMAIL_MAX|MAX_EMAIL/,
    /WorkspaceMemberRole|workspaceRole/,
    /ProjectAccessRole|projectRole/,
    /expiresAt|expiry|INVITATION_TTL/,
    /idempotency|requestRef/i,
  ]),
  "Treat exported service functions as hostile-input boundaries, not only the action.",
)

check(
  "service.email-normalization",
  "One canonical email normalization path trims, normalizes, and lowercases",
  [FILES.service],
  all(texts.service, [
    /function\s+normalize(?:Invitation)?Email\s*\(/,
    /\.trim\(\)/,
    /\.normalize\(["']NFKC["']\)/,
    /\.toLowerCase\(\)/,
  ]),
  "Use one NFKC + trim + lowercase function for create and accept exact comparison.",
)

check(
  "service.token-digest",
  "Raw tokens use cryptographic randomness and only a one-way digest is persisted",
  [FILES.service],
  all(texts.service, [
    /randomBytes\s*\(\s*(?:32|48|64)\s*\)/,
    /createHash\s*\(\s*["']sha256["']\s*\)|createHmac\s*\(/,
    /tokenDigest/,
  ]) &&
    none(texts.schema, [/\brawToken\b|\btoken\s+String/]),
  "Generate at least 256 random bits; persist only tokenDigest, never a raw token column.",
)

check(
  "service.exact-email",
  "Acceptance compares the authenticated verified email to the normalized invited email",
  [FILES.service],
  all(texts.service, [
    /verifiedEmail|authenticatedEmail|profileEmail/,
    /normalizedEmail/,
    /email_mismatch|invitation_email_mismatch|wrong_email/i,
  ]),
  "Fail closed unless the verified authenticated email exactly equals normalizedEmail.",
)

check(
  "service.pending-unexpired-unused",
  "Acceptance requires PENDING, unexpired, unrevoked, and unused state",
  [FILES.service],
  all(texts.service, [
    /PENDING/,
    /expiresAt/,
    /ACCEPTED/,
    /REVOKED/,
    /acceptedAt|acceptedByProfileId/,
  ]),
  "Recheck all lifecycle predicates inside the acceptance transaction.",
)

check(
  "service.transactional-idempotency",
  "Create/accept/revoke writes are transactional and boundedly idempotent",
  [FILES.service],
  all(texts.service, [
    /\$transaction\s*\(/,
    /upsert|P2002|findUnique|findFirst/,
    /idempotent|idempotency|requestRef/i,
  ]),
  "Converge replays on one invitation/membership/grant/audit write set.",
)

check(
  "service.inviter-authz",
  "Only active workspace OWNER/ADMIN can create or revoke invitations",
  [FILES.service],
  all(texts.service, [
    /ACTIVE/,
    /resolveTeamWorkspaceCapabilities/,
    /workspace\.members\.invite/,
    /not_authorized|forbidden|workspace_member_invite_denied/i,
  ]),
  "Load active membership in the transaction and deny every other global/workspace role.",
)

check(
  "service.role-escalation",
  "ADMIN cannot invite OWNER; only an active workspace OWNER may grant OWNER",
  [FILES.service],
  all(texts.service, [
    /workspaceRole/,
    /OWNER/,
    /owner_invite_requires_owner|role_escalation|cannot_invite_owner/i,
  ]),
  "Recheck inviter role in the transaction; ADMIN may not escalate another identity to OWNER.",
)

check(
  "service.project-scope",
  "Optional project grants require the project to belong to the invited workspace",
  [FILES.service],
  all(texts.service, [
    /projectId/,
    /workspaceId/,
    /project_scope_invalid|project_workspace_mismatch|cross_workspace|project_not_in_workspace/i,
    /projectAccessGrant|project_access_grants|projectGrant/i,
  ]),
  "Look up project.workspaceId server-side and fail closed before granting access.",
)

check(
  "service.guest-boundary",
  "GUEST receives no implicit grant; any optional project grant is explicit and same-workspace",
  [FILES.service],
  all(texts.service, [
    /GUEST/,
    /projectId/,
    /projectRole/,
    /projectAccessGrant|project_access_grants|projectGrant/i,
  ]),
  "A guest shell may exist without project access; create a grant only when projectId/projectRole are explicitly supplied.",
)

check(
  "service.reinvite-invalidates-old-token",
  "Reinvite rotates the token and invalidates earlier pending tokens",
  [FILES.service],
  all(texts.service, [
    /REVOKED|EXPIRED/,
    /tokenDigest/,
    /reinvite|existingPending|previousInvitation|pendingInvitations/i,
  ]),
  "A new invite must never leave an older token usable for the same workspace/email scope.",
)

check(
  "service.active-membership-reinvite-denied",
  "An existing ACTIVE membership cannot receive another usable invitation",
  [FILES.service],
  all(texts.service, [
    /workspaceMembership|workspace_memberships/,
    /ACTIVE/,
    /already_active_member|active_membership_exists|membership_already_active/i,
  ]),
  "Check the workspace/profile membership after resolving the normalized email; return a stable denial and create no PENDING token.",
)

check(
  "service.audit-catalog-gate",
  "Every mutation fails closed unless the exact append-only invitation audit catalog is ready",
  [FILES.service, FILES.auditReadiness, migration?.relativePath ?? "invitation audit migration"],
  all(`${texts.service ?? ""}\n${texts.auditReadiness ?? ""}`, [
    /isTeamCollaborationAuditStorageReady/,
    /pg_constraint/,
    /pg_trigger/,
    /pg_get_(?:constraintdef|triggerdef)/,
    /teamCollaborationCatalogConstraintReady/,
    /audit_storage_unavailable/i,
  ]),
  "Check exact constraints/index/append-only trigger, not table-name presence alone.",
)

check(
  "migration.audit-events",
  "Migration admits exactly the scoped invitation event family alongside workspace.created",
  [migration?.relativePath ?? "prisma/migrations/*invitation*/migration.sql"],
  all(migration?.text, [
    /workspace\.created/,
    /workspace\.member\.invited/,
    /workspace\.invitation\.accepted/,
    /workspace\.invitation\.revoked/,
    /workspace\.invitation\.expired/,
    /CHECK\s*\(/i,
    /redaction_version/,
    /metadata/,
  ]),
  "Replace the 005B-only CHECK with a reviewed exact action/redaction catalog.",
)

check(
  "migration.audit-no-secret",
  "Invitation audit catalog requires hashed request refs and empty metadata",
  [migration?.relativePath ?? "invitation audit migration"],
  all(migration?.text, [
    /operating_audit_events_request_ref_hash_check/,
    /operating_audit_events_no_secret_metadata_check/,
    /operating_audit_events_append_only|prevent_operating_audit_event_mutation/,
  ]),
  "Migration/service readiness must retain exact hash, empty-metadata, and append-only catalog artifacts.",
)

check(
  "service.audit-redaction",
  "Audit rows use empty metadata and never copy raw email/token/invitation URL",
  [FILES.service],
  all(texts.service, [
    /metadata:\s*\{\}/,
    /redactionVersion|redaction_version/,
    /workspace\.member\.invited/,
    /workspace\.invitation\.accepted/,
    /workspace\.invitation\.revoked/,
    /workspace\.invitation\.expired/,
  ]) &&
    none(texts.service, [
      /metadata:\s*\{[^}]*(?:email|token|invitationUrl|rawToken)/s,
      /actorDisplay:\s*(?:normalizedEmail|authenticatedEmail|verifiedEmail)/,
      /targetDisplay:\s*(?:normalizedEmail|authenticatedEmail|verifiedEmail)/,
    ]),
  "Persist only opaque IDs/digests and `{}` metadata in invitation audit events.",
)

check(
  "service.audit-denials",
  "Wrong-email, expired, revoked, and reused acceptance outcomes are auditable without being rolled back",
  [FILES.service],
  all(texts.service, [
    /email_mismatch|invitation_email_mismatch|wrong_email/i,
    /workspace\.invitation\.expired/,
    /result:\s*["']blocked["']|["']blocked["']/,
    /workspace\.invitation\.accepted/,
    /workspace\.invitation\.revoked/,
  ]),
  "Persist the redacted denial event in a transaction outcome that is not discarded by the thrown safe error.",
)

check(
  "service.delivery-manual-only",
  "Formal delivery is explicit MANUAL_EMAIL_LINK with zero provider call",
  [FILES.service, FILES.types],
  /MANUAL_EMAIL_LINK/.test(runtimeTexts) &&
    none(runtimeTexts, [
      /inviteUserByEmail\s*\(/,
      /auth\.admin\./,
      /sendgrid|resend|postmark|nodemailer/i,
      /SUPABASE_SERVICE_ROLE_KEY/,
    ]),
  "Return a one-time manual link; do not call an email/Auth provider in this slice.",
)

check(
  "types.one-time-secret",
  "Raw token/manual link is success-only and explicitly one-time",
  [FILES.types, FILES.action],
  all(runtimeTexts, [
    /oneTime|one_time|一次性|copyOnce|manualInvitationUrl|invitationUrl/,
    /MANUAL_EMAIL_LINK/,
  ]),
  "Keep the secret out of list/read DTOs and expose it only in the successful create response.",
)

check(
  "action.require-user",
  "All server actions derive identity from requireUser and validate untrusted input",
  [FILES.action],
  all(texts.action, [
    /["']use server["']/,
    /requireUser\s*\(/,
    /safeParse|\.parse\s*\(/,
    /create.*Invitation/i,
    /accept.*Invitation/i,
    /revoke.*Invitation/i,
  ]),
  "Do not accept actor/profile/email verification as client authorization evidence.",
)

check(
  "action.safe-errors",
  "Action maps service failures to finite UI-safe codes without exception or secret leakage",
  [FILES.action, FILES.types],
  all(runtimeTexts, [
    /email_mismatch|invitation_email_mismatch|wrong_email/i,
    /invitation_expired|expired/i,
    /invitation_revoked|revoked/i,
    /audit_storage_unavailable/i,
    /unavailable/,
  ]) &&
    none(texts.action, [/return\s+.*error\.message/s, /stack\s*:/, /DATABASE_URL/]),
  "Return a closed union of redacted codes/messages; never serialize raw exceptions.",
)

check(
  "panel.boundary",
  "Team settings panel exposes members/invitations, manual delivery, and safe lifecycle actions",
  [FILES.panel],
  all(texts.panel, [
    /邀請|Invitation/i,
    /成員|Member/i,
    /MANUAL_EMAIL_LINK|手動|複製/i,
    /撤銷|Revoke/i,
    /到期|Expired/i,
  ]),
  "Render explicit real/manual state and do not imply provider email was sent.",
)

check(
  "runtime.no-provider-or-adjacent-writes",
  "Invitation slice contains no provider runtime, public route, feedback/memory, transfer, or Client Portal write",
  [FILES.service, FILES.action, FILES.panel],
  none(runtimeTexts, [
    /ProjectFeedback|projectFeedback|ProjectMemoryCandidate|projectMemoryCandidate/,
    /clientToken|CLIENT_VISIBLE/,
    /project\.update\s*\(|workspaceId:\s*(?:target|destination)/,
    /app\/(?:api\/)?public|client\//,
  ]),
  "Keep TEAMCOLLAB-006 limited to invitation, membership, optional direct grant, and audit.",
)

check(
  "runtime.no-secret-config",
  "No invitation implementation references service-role/provider secrets",
  [FILES.service, FILES.action, FILES.panel],
  none(runtimeTexts, [
    /SUPABASE_SERVICE_ROLE_KEY/,
    /SENDGRID_API_KEY/,
    /RESEND_API_KEY/,
    /POSTMARK_SERVER_TOKEN/,
  ]),
  "Do not add provider credentials until a separately approved delivery adapter task.",
)

console.log(
  JSON.stringify(
    {
      status: failures.length === 0 ? "passed" : "failed",
      task: "TEAMCOLLAB-006",
      target: "invitation_lifecycle_static_security_contract",
      passed: passes.length,
      failed: failures.length,
      configuredDatabaseAccessed: false,
      providerCallsMade: false,
      adjacentFeatureWrites: false,
      migration: migration?.relativePath ?? null,
      failures,
    },
    null,
    2,
  ),
)

if (failures.length > 0) process.exitCode = 1
