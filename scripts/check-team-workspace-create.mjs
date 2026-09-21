#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

const FILES = {
  schema: "prisma/schema.prisma",
  migration:
    "prisma/migrations/20260727170000_team_workspace_creation_audit/migration.sql",
  service: "src/lib/services/team-workspace-command.service.ts",
  auditReadiness:
    "src/lib/services/team-workspace-audit-readiness.service.ts",
  action: "src/app/actions/team-workspace.ts",
  dialog: "src/components/work/workspace/create-team-workspace-dialog.tsx",
  page: "src/app/(dashboard)/work/page.tsx",
  client: "src/app/(dashboard)/work/work-client.tsx",
  dto: "src/types/workspace-project-index.ts",
  db: "src/lib/db.ts",
  proof: "scripts/team-workspace-create-disposable-proof.ts",
}

function parseArgs(argv) {
  const args = { json: false, out: null, help: false }
  const filtered = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filtered.length; index += 1) {
    const arg = filtered[index]
    if (arg === "--json") {
      args.json = true
    } else if (arg === "--out") {
      const value = filtered[index + 1]
      if (!value || value.startsWith("--")) {
        throw new Error("--out requires a file path")
      }
      args.out = value
      index += 1
    } else if (arg === "--help" || arg === "-h") {
      args.help = true
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return args
}

function printHelp() {
  console.log("Check the TEAMCOLLAB-005B create-team workspace write slice")
  console.log("")
  console.log("Usage:")
  console.log("  node scripts/check-team-workspace-create.mjs")
  console.log("  node scripts/check-team-workspace-create.mjs --json")
  console.log("  node scripts/check-team-workspace-create.mjs --out <repo-relative-path>")
}

function read(relativePath) {
  const absolutePath = path.join(ROOT, relativePath)
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : null
}

function all(text, patterns) {
  return text !== null && patterns.every((pattern) => pattern.test(text))
}

function any(text, patterns) {
  return text !== null && patterns.some((pattern) => pattern.test(text))
}

function none(text, patterns) {
  return text !== null && patterns.every((pattern) => !pattern.test(text))
}

function matchingLabels(text, entries) {
  if (text === null) return entries.map(({ label }) => label)
  return entries.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label)
}

function normalizeOutputPath(outPath) {
  const resolved = path.resolve(ROOT, outPath)
  const relative = path.relative(ROOT, resolved)
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("--out must stay inside the repository")
  }
  return resolved
}

function buildResult() {
  const texts = Object.fromEntries(
    Object.entries(FILES).map(([key, relativePath]) => [key, read(relativePath)]),
  )
  const checks = []

  function check(id, label, files, passed, evidence) {
    checks.push({ id, label, files, passed, evidence })
  }

  for (const [key, relativePath] of Object.entries(FILES)) {
    check(
      `file.${key}`,
      `${relativePath} exists`,
      [relativePath],
      texts[key] !== null,
      texts[key] === null ? "missing" : "readable",
    )
  }

  check(
    "schema.audit-event-model",
    "Prisma exposes OperatingAuditEvent with the idempotency uniqueness contract",
    [FILES.schema],
    all(texts.schema, [
      /model\s+OperatingAuditEvent\s*\{/,
      /actorRef\s+String\?/,
      /action\s+String/,
      /requestRef\s+String\?/,
      /@@unique\(\[actorRef,\s*action,\s*requestRef\]/,
      /@@map\(["']operating_audit_events["']\)/,
    ]),
    "requires the generic audit model and actor/action/requestRef unique tuple",
  )

  check(
    "migration.audit-invariants",
    "Migration constrains the first persisted writer to redacted workspace.created success events",
    [FILES.migration],
    all(texts.migration, [
      /CREATE TABLE ["']operating_audit_events["']/,
      /["']action["']\s*=\s*'workspace\.created'/,
      /["']module_key["']\s*=\s*'work'/,
      /["']target_type["']\s*=\s*'workspace'/,
      /["']result["']\s*=\s*'success'/,
      /["']risk_level["']\s*=\s*'HIGH'/,
      /["']human_approval_required["']\s*=\s*TRUE/i,
      /["']metadata["']\s*=\s*'\{\}'::jsonb/,
    ]),
    "requires exact workspace-created scope, owner approval, success result, and empty metadata",
  )

  check(
    "migration.hashed-idempotency",
    "Audit requestRef is a lowercase SHA-256 digest with a unique actor/action tuple",
    [FILES.migration],
    all(texts.migration, [
      /request_ref[^\n]*\^\[0-9a-f\]\{64\}\$/,
      /CREATE UNIQUE INDEX ["']operating_audit_events_actor_action_request_unique["'][\s\S]{0,180}["']actor_ref["'][\s\S]{0,80}["']action["'][\s\S]{0,80}["']request_ref["']/,
    ]),
    "requires a 64-hex DB check and the idempotency uniqueness index",
  )

  check(
    "migration.append-only",
    "Database rejects OperatingAuditEvent update and delete operations",
    [FILES.migration],
    all(texts.migration, [
      /CREATE (?:OR REPLACE )?FUNCTION ["']prevent_operating_audit_event_mutation["']/,
      /BEFORE UPDATE OR DELETE ON ["']operating_audit_events["']/,
      /ERRCODE\s*=\s*'55000'/,
    ]),
    "requires a DB-enforced append-only trigger",
  )

  check(
    "action.server-auth-validation",
    "Server Action validates name/idempotencyKey and resolves caller identity with requireUser",
    [FILES.action],
    all(texts.action, [
      /^\s*["']use server["']/m,
      /requireUser\s*\(\s*\)/,
      /name[\s\S]{0,240}(?:min\s*\(\s*2|max\s*\(\s*80)/,
      /idempotencyKey[\s\S]{0,160}uuid\s*\(/i,
      /createTeamWorkspace\w*ForProfile\s*\(/,
    ]),
    "requires use server, Zod-equivalent bounds/UUID validation, requireUser, and service delegation",
  )

  check(
    "action.safe-result-revalidation",
    "Action returns a safe state and revalidates Work without exposing raw errors",
    [FILES.action],
    all(texts.action, [
      /revalidatePath\s*\(\s*["']\/work["']\s*\)/,
      /workspaceId\s*:/,
      /status\s*:\s*["']success["']/,
    ]) &&
      none(texts.action, [
        /return\s+\{[^}]*error\s*:\s*error\b/s,
        /return\s+error\b/,
        /message\s*:\s*error\.message/,
        /stack\s*:\s*error\.stack/,
        /from\s+["']@\/lib\/db["']/,
      ]),
    "requires a workspace-id success DTO, Work revalidation, no DB import, and no raw error serialization",
  )

  check(
    "service.server-only-platform-owner",
    "Service is server-only and independently verifies the Profile OWNER platform role",
    [FILES.service],
    all(texts.service, [
      /import\s+["']server-only["']/,
      /(?:db|tx)\.profile\.(?:findUnique|findFirst)\s*\(/,
      /profile\.role\s*!==\s*["']OWNER["']/,
    ]),
    "platform eligibility must be re-established from DB state, not trusted from UI/action input",
  )

  check(
    "service.personal-preconditions",
    "Service requires exactly one active PERSONAL creator workspace with active OWNER membership",
    [FILES.service],
    all(texts.service, [
      /type\s*:\s*["']PERSONAL["']/,
      /createdByProfileId\s*:\s*profileId/,
      /status\s*:\s*["']ACTIVE["']/,
      /role\s*:\s*["']OWNER["']/,
      /(?:length|count)[\s\S]{0,80}(?:!==?\s*1|===?\s*1)/,
    ]),
    "requires creator equality plus exact cardinality, workspace status, membership status, and OWNER role",
  )

  check(
    "service.no-unscoped-owner-projects",
    "Service blocks callers who still own projects with a null workspaceId",
    [FILES.service],
    all(texts.service, [
      /(?:db|tx)\.project\.count\s*\(/,
      /ownerId\s*:\s*profileId/,
      /workspaceId\s*:\s*null/,
    ]),
    "requires an owner-equality count of legacy null-workspace projects",
  )

  check(
    "service.transactional-write-set",
    "TEAM workspace, active OWNER membership, and audit event share one transaction",
    [FILES.service],
    all(texts.service, [
      /db\.\$transaction\s*\(/,
      /\btx\.workspace\.create\s*\(/,
      /\btx\.workspaceMembership\.create\s*\(/,
      /\btx\.operatingAuditEvent\.create\s*\(/,
      /type\s*:\s*["']TEAM["']/,
      /role\s*:\s*["']OWNER["']/,
      /status\s*:\s*["']ACTIVE["']/,
    ]),
    "requires all three writes through the transaction client",
  )

  check(
    "service.idempotency-hash-and-replay",
    "Service hashes the UUID and returns the existing same-actor workspace on replay",
    [FILES.service],
    all(texts.service, [
      /createHash\s*\(\s*["']sha256["']\s*\)/,
      /requestRef/,
      /workspace\.created/,
      /(?:operatingAuditEvent\.(?:findUnique|findFirst)|actorRef_action_requestRef)/,
      /targetRef/,
    ]),
    "requires SHA-256 requestRef plus an existing audit/target lookup before or after unique conflict",
  )

  check(
    "service.direct-input-validation",
    "Direct service calls reject invalid names and UUIDs before any database work",
    [FILES.service],
    all(texts.service, [
      /normalizeCommandInput\s*\(/,
      /name\.length\s*<\s*2/,
      /name\.length\s*>\s*80/,
      /\\u0000-\\u001f\\u007f/,
      /UUID_PATTERN\.test\s*\(/,
      /const\s+normalizedInput\s*=\s*normalizeCommandInput\s*\(\s*input\s*\)/,
    ]) &&
      (texts.service?.indexOf("normalizeCommandInput(input)") ?? -1) <
        (texts.service?.indexOf("db.$transaction") ?? -1),
    "requires the action-equivalent bounds/control/UUID checks before opening a transaction",
  )

  check(
    "service.concurrent-idempotency-retry",
    "Concurrent same-key submissions use bounded SERIALIZABLE retry and authorized replay",
    [FILES.service],
    all(texts.service, [
      /MAX_TRANSACTION_ATTEMPTS\s*=\s*3/,
      /TransactionIsolationLevel\.Serializable/,
      /P2002/,
      /P2034/,
      /23505/,
      /40001/,
      /findIdempotentWorkspaceReplay\s*\(/,
      /for\s*\([^)]*attempt[^)]*MAX_TRANSACTION_ATTEMPTS/,
    ]),
    "requires three bounded attempts for unique/serialization conflicts plus a scoped replay lookup",
  )

  const catalogGuardCallCount = texts.service
    ? (texts.service.match(/isTeamCollaborationAuditStorageReady\s*\(/g) ?? [])
        .length
    : 0
  const auditCatalogText = `${texts.auditReadiness ?? ""}\n${texts.service ?? ""}`
  check(
    "service.audit-catalog-drift-guard",
    "Readiness and command fail closed unless the table, exact enabled append-only trigger/function, exact validated catalog/hash/no-secret CHECKs, and exact unique index exist",
    [FILES.service, FILES.auditReadiness, FILES.migration],
    all(auditCatalogText, [
      /to_regclass\s*\(\s*["']operating_audit_events["']\s*\)/,
      /FROM\s+pg_trigger/i,
      /tgenabled\s*<>\s*["']D["']/,
      /pg_get_triggerdef/,
      /trigger_function\.prosrc/,
      /trigger_function\.prorettype/,
      /operating_audit_events_append_only/,
      /FROM\s+pg_constraint/i,
      /pg_get_constraintdef/,
      /operating_audit_events_workspace_created_only_check/,
      /operating_audit_events_teamcollab_action_catalog_check/,
      /operating_audit_events_request_ref_hash_check/,
      /operating_audit_events_no_secret_metadata_check/,
      /convalidated/,
      /FROM\s+pg_index/i,
      /operating_audit_events_actor_action_request_unique/,
      /indisunique/,
      /indisvalid/,
      /indisready/,
      /indnkeyatts\s*=\s*3/,
      /indpred\s+IS\s+NULL/,
      /indexprs\s+IS\s+NULL/,
      /pg_get_indexdef[\s\S]{0,160}["']actor_ref["']/,
      /pg_get_indexdef[\s\S]{0,260}["']action["']/,
      /pg_get_indexdef[\s\S]{0,360}["']request_ref["']/,
      /audit_storage_unavailable/,
    ]) && catalogGuardCallCount >= 3,
    `catalog guard definition plus readiness/command calls required; occurrences=${catalogGuardCallCount}`,
  )

  check(
    "service.audit-redaction",
    "Persisted audit event contains the exact approved constants and no caller-controlled metadata",
    [FILES.service],
    all(texts.service, [
      /actorType\s*:\s*["']owner["']/,
      /moduleKey\s*:\s*["']work["']/,
      /(?:action\s*:\s*["']workspace\.created["']|action\s*:\s*WORKSPACE_CREATED_ACTION)/,
      /targetType\s*:\s*["']workspace["']/,
      /result\s*:\s*["']success["']/,
      /riskLevel\s*:\s*["']HIGH["']/,
      /approvalLevel\s*:\s*["']owner_review["']/,
      /humanApprovalRequired\s*:\s*true/,
      /sourceKind\s*:\s*["']server_action["']/,
      /metadata\s*:\s*\{\s*\}/,
      /(?:redactionVersion\s*:\s*["']teamcollab-005b-v1["']|redactionVersion\s*:\s*AUDIT_REDACTION_VERSION)/,
      /(?:retentionClass\s*:\s*["']high_risk_7_year_review_required["']|retentionClass\s*:\s*AUDIT_RETENTION_CLASS)/,
    ]) &&
      none(texts.service, [
      /sessionRef\s*:\s*(?!null\b)/,
      /ipAddressHash\s*:\s*(?!null\b)/,
      /userAgentHash\s*:\s*(?!null\b)/,
      /metadata\s*:\s*input/,
      ]) &&
      none(texts.service, [
        /actorDisplay\s*:/,
        /sourceRef\s*:/,
        /afterRef\s*:/,
      ]),
    "requires the migration-approved event shape and omits display/session/network/source/input payloads",
  )

  check(
    "ui.server-readiness-gate",
    "Create control is enabled only from server-provided readiness and unavailable in legacy mode",
    [FILES.dialog, FILES.client, FILES.page, FILES.dto],
    all(texts.dialog, [
      /readiness\.available/,
      /readiness\.code\s*===\s*["']ready["']/,
      /disabled/,
      /legacy/i,
    ]) &&
      any(`${texts.page ?? ""}\n${texts.client ?? ""}`, [/teamWorkspaceCreation/, /creationReadiness/i]),
    "requires server-derived readiness, disabled unavailable control, and a legacy compatibility explanation",
  )

  check(
    "ui.idempotent-pending-selection",
    "UI sends only name/idempotencyKey, prevents duplicate submit, and selects the returned workspace",
    [FILES.dialog],
    all(texts.dialog, [
      /crypto\.randomUUID\s*\(\s*\)/,
      /name=["']name["']/,
      /name=["']idempotencyKey["']/,
      /disabled\s*=\s*\{[^}]*isBusy/,
      /state\.workspaceId/,
      /(?:router\.push|Link)[\s\S]{0,180}workspace/,
    ]),
    "requires one UUID per mounted logical attempt, pending disable, and navigation by returned workspaceId",
  )

  const forbiddenUi = matchingLabels(texts.dialog, [
    { label: "localStorage", pattern: /\blocalStorage\b/ },
    { label: "sessionStorage", pattern: /\bsessionStorage\b/ },
    { label: "invitation action", pattern: /\b(?:send|create|accept)\w*Invitation\s*\(/ },
    { label: "provider call", pattern: /\b(?:resend|sendgrid|postmark|supabase)\b/i },
    { label: "project transfer", pattern: /\b(?:transfer|move)\w*Project\s*\(/i },
    { label: "feedback write", pattern: /\bcreate\w*Feedback\s*\(/i },
    { label: "memory write", pattern: /\b(?:train|create)\w*(?:Memory|Candidate)\s*\(/i },
  ])
  check(
    "ui.no-scope-expansion",
    "Create-team UI does not authorize via browser storage or invoke invite/transfer/feedback/AI providers",
    [FILES.dialog],
    texts.dialog !== null && forbiddenUi.length === 0,
    forbiddenUi.length === 0 ? "no forbidden scope markers" : forbiddenUi.join(", "),
  )

  const runtimeText = `${texts.service ?? ""}\n${texts.action ?? ""}\n${texts.dialog ?? ""}`
  check(
    "runtime.no-configured-db-target",
    "Runtime create slice never chooses a database URL or configured target",
    [FILES.service, FILES.action, FILES.dialog],
    !/(?:DATABASE_URL|DIRECT_DATABASE_URL|POSTGRES_URL|SUPABASE_DB_URL|process\.env)/.test(
      runtimeText,
    ),
    "database selection remains in the server DB adapter, never in action input or UI",
  )

  check(
    "proof.self-created-loopback-only",
    "Executable proof accepts no target URL and fingerprints a self-created loopback cluster",
    [FILES.proof],
    all(texts.proof, [
      /mkdtemp\s*\(/,
      /127\.0\.0\.1/,
      /initdb/,
      /pg_ctl/,
      /current_database\s*\(\s*\)/,
      /inet_server_addr\s*\(\s*\)/,
      /data_directory/,
      /TEAMCOLLAB_PROOF_ALLOW_LOCAL_WRITES/,
      /TEAMCOLLAB_PROOF_ALLOW_MIGRATION_APPLY/,
      /I_UNDERSTAND_THIS_WRITES_ONLY_TO_A_NEW_LOCAL_DISPOSABLE_DATABASE/,
      /accepts no database URL|no database URL/i,
    ]),
    "requires explicit gates, owned temp directory, local cluster creation, and server fingerprinting",
  )

  check(
    "proof.behavioral-cases",
    "Disposable proof covers success, concurrency, direct invalid inputs, drift, rollback, redaction, and append-only behavior",
    [FILES.proof, FILES.db],
    all(texts.proof, [
      /eligible/i,
      /idempoten/i,
      /Promise\.all\s*\(/,
      /concurrentSameIdempotency/,
      /direct_invalid_name/,
      /direct_invalid_uuid/,
      /not[_ -]?platform[_ -]?owner/i,
      /personal[_ -]?workspace[_ -]?required/i,
      /owner[_ -]?projects[_ -]?unscoped/i,
      /rollback/i,
      /no[_ -]?secret|redact/i,
      /append[_ -]?only/i,
      /55000/,
      /same_name_weakened_workspace_created_check/,
      /same_name_weakened_append_only_function/,
      /same_name_weakened_partial_unique_index/,
      /disposeDatabaseConnections/,
    ]) &&
      all(texts.db, [
        /disposeDatabaseConnections/,
        /pool\.end\s*\(\s*\)/,
        /self_created_disposable/,
      ]),
    "requires named proof assertions for every high-risk boundary plus explicit external-pool disposal",
  )

  const failed = checks.filter((entry) => !entry.passed)
  return {
    status: failed.length === 0 ? "passed" : "failed",
    task: "TEAMCOLLAB-005B",
    liveDatabaseUsed: false,
    configuredDatabaseAccepted: false,
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
    },
    checks,
  }
}

let args
try {
  args = parseArgs(process.argv.slice(2))
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(2)
}

if (args.help) {
  printHelp()
  process.exit(0)
}

const result = buildResult()
const serialized = JSON.stringify(result, null, 2)

if (args.out) {
  const outputPath = normalizeOutputPath(args.out)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, `${serialized}\n`, "utf8")
}

if (args.json || args.out) {
  console.log(serialized)
} else {
  for (const entry of result.checks) {
    console.log(`${entry.passed ? "PASS" : "FAIL"} ${entry.id}: ${entry.label}`)
  }
  console.log("")
  console.log(
    `${result.status.toUpperCase()}: ${result.summary.passed}/${result.summary.total} checks passed`,
  )
}

process.exitCode = result.status === "passed" ? 0 : 1
