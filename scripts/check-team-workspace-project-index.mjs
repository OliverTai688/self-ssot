#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

const FILES = {
  dto: "src/types/workspace-project-index.ts",
  mapper: "src/lib/mappers/team-workspace.mapper.ts",
  service: "src/lib/services/team-workspace.service.ts",
  page: "src/app/(dashboard)/work/page.tsx",
  client: "src/app/(dashboard)/work/work-client.tsx",
  projectCard: "src/components/work/project/project-card.tsx",
  focusCard: "src/components/work/project/project-focus-card.tsx",
  addProjectDialog: "src/components/work/project/add-project-dialog.tsx",
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
  console.log("Check the TEAMCOLLAB-005 protected workspace project-index read slice")
  console.log("")
  console.log("Usage:")
  console.log("  node scripts/check-team-workspace-project-index.mjs")
  console.log("  node scripts/check-team-workspace-project-index.mjs --json")
  console.log("  node scripts/check-team-workspace-project-index.mjs --out <path>")
}

function read(relativePath) {
  const absolutePath = path.join(ROOT, relativePath)
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : null
}

function listFiles(relativeDir) {
  const absoluteDir = path.join(ROOT, relativeDir)
  if (!fs.existsSync(absoluteDir)) return []

  return fs.readdirSync(absoluteDir, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(relativeDir, entry.name)
    return entry.isDirectory() ? listFiles(relativePath) : [relativePath]
  })
}

function all(text, patterns) {
  return text !== null && patterns.every((pattern) => pattern.test(text))
}

function any(text, patterns) {
  return text !== null && patterns.some((pattern) => pattern.test(text))
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
    "dto.project-index-contract",
    "WorkspaceProjectIndexDto exposes workspace choices, selected workspace state, and safe project rows",
    [FILES.dto],
    all(texts.dto, [
      /export\s+(?:type|interface)\s+WorkspaceProjectIndexDto\b/,
      /workspaces\s*:/,
      /projects\s*:/,
      /(?:selectedWorkspace|activeWorkspace|workspace)\s*:/,
      /detailHref\s*:\s*string\s*\|\s*null/,
      /capabilit(?:y|ies)/i,
    ]),
    "requires the named DTO, workspace/project collections, selected workspace, capability data, and nullable detailHref",
  )

  const dtoForbidden = matchingLabels(texts.dto, [
    { label: "membershipId", pattern: /\bmembershipId\b/ },
    { label: "invitation token/digest", pattern: /\b(?:tokenDigest|invitationToken|rawToken)\b/i },
    { label: "raw Project type includes clientToken", pattern: /\bproject\s*:\s*Project\b/ },
    { label: "owner/member email", pattern: /\b(?:ownerEmail|memberEmail|invitedEmail|email)\s*:/i },
    { label: "Prisma type import", pattern: /@prisma\/client|Prisma\./ },
    { label: "Date instance", pattern: /:\s*Date\b/ },
    { label: "BigInt instance", pattern: /:\s*bigint\b|\bBigInt\b/ },
    { label: "Map/Set instance", pattern: /:\s*(?:Map|Set|WeakMap|WeakSet)\s*</ },
    { label: "function-valued DTO field", pattern: /:\s*\([^)]*\)\s*=>/ },
  ])
  check(
    "dto.serializable-redacted",
    "Client DTO is serializable and omits membership IDs, direct tokens, and email leakage",
    [FILES.dto],
    texts.dto !== null && dtoForbidden.length === 0,
    dtoForbidden.length === 0 ? "no forbidden DTO boundary markers" : dtoForbidden.join(", "),
  )

  check(
    "page.direct-server-loader",
    "Work Server Component calls the team workspace loader directly",
    [FILES.page, FILES.service],
    all(texts.page, [
      /from\s+["']@\/lib\/services\/team-workspace\.service["']/,
      /\bgetWorkspaceProjectIndexForProfile\s*\(/,
      /await\s+(?:(?:get|load|list|resolve)\w*(?:Workspace|ProjectIndex)\w*\s*\(|Promise\.all\s*\()/,
      /<WorkClient\b/,
    ]) &&
      !any(texts.page, [
        /from\s+["']@\/app\/actions\/work["']/,
        /\bgetProjects\s*\(/,
        /fetch\s*\(/,
      ]),
    "direct service import/call required, including a direct call inside awaited Promise.all; server-action and HTTP read indirection forbidden",
  )

  check(
    "page.async-search-params",
    "Work page awaits async searchParams and forwards a selected workspace input",
    [FILES.page],
    all(texts.page, [
      /searchParams\s*:\s*Promise\s*</,
      /await\s+searchParams/,
      /workspace/i,
    ]),
    "expects Next.js async searchParams plus a workspace selection read",
  )

  const actionRouteFiles = listFiles("src/app")
    .filter((file) => /(?:^|\/)route\.(?:ts|tsx|js|mjs)$/.test(file))
    .filter((file) => {
      const source = read(file)
      return any(source, [
        /team-workspace\.service/,
        /WorkspaceProjectIndexDto/,
        /(?:get|load|list)\w*WorkspaceProjectIndex/,
      ])
    })
  check(
    "bff.no-route-handler-read",
    "Workspace project index does not add a GET/API route",
    actionRouteFiles,
    actionRouteFiles.length === 0,
    actionRouteFiles.length === 0 ? "no route handler imports the project-index path" : actionRouteFiles.join(", "),
  )

  check(
    "service.server-only-caller-identity",
    "Service is server-only and receives caller-derived profileId",
    [FILES.service],
    all(texts.service, [
      /import\s+["']server-only["']/,
      /profileId\s*:\s*string/,
      /(?:selectedWorkspaceId|requestedWorkspaceId|workspaceId)\s*(?:\?|:)\s*:?\s*string/,
    ]),
    "requires server-only plus profileId and selected-workspace inputs",
  )

  check(
    "service.active-membership-workspace-queries",
    "Service queries active memberships/workspaces before listing projects",
    [FILES.service],
    all(texts.service, [
      /status\s*:\s*["']ACTIVE["']/,
      /workspace\s*:/,
      /db\.project\.findMany\s*\(/,
    ]) && any(texts.service, [
      /db\.workspaceMembership\.findMany\s*\(/,
      /db\.workspace\.findMany\s*\(/,
    ]),
    "requires active membership loading and a separate project query",
  )

  check(
    "service.capability-resolver-and-exact-grant",
    "Every project is evaluated with the TEAMCOLLAB-003 resolver and exact persisted grant context",
    [FILES.service],
    all(texts.service, [
      /resolveTeamProjectCapabilities\s*\(/,
      /directGrant\s*:/,
      /membershipId\s*:/,
      /projectId\s*:/,
      /workspaceId\s*:/,
      /(?:grant\.)?status|ProjectAccessGrantStatus/,
    ]),
    "requires resolver usage and project/workspace/membership/status grant inputs",
  )

  check(
    "service.project-read-filter",
    "Project rows are returned only when project.read is present",
    [FILES.service],
    any(texts.service, [
      /capabilities\.includes\(\s*["']project\.read["']\s*\)/,
      /hasTeamProjectCapability\s*\([^,]+,\s*["']project\.read["']\s*\)/,
      /["']project\.read["'][\s\S]{0,160}\.(?:filter|flatMap)\s*\(/,
      /\.filter\s*\([\s\S]{0,180}["']project\.read["']/,
    ]),
    "requires an explicit project.read inclusion gate",
  )

  check(
    "service.invalid-selection-fallback",
    "Invalid or stale selected workspace IDs fall back only to an authorized workspace",
    [FILES.service, FILES.dto],
    any(texts.service, [
      /selectionFallback/,
      /fallbackReason/,
      /["']safe_fallback["']/,
      /requestedWorkspaceId[\s\S]{0,320}(?:find|some)\s*\([\s\S]{0,160}\?\?/,
      /selectedWorkspaceId[\s\S]{0,320}(?:find|some)\s*\([\s\S]{0,160}\?\?/,
    ]) && any(`${texts.service ?? ""}\n${texts.dto ?? ""}`, [/fallback/i, /selection/i]),
    "expects an explicit safe selection/fallback signal rather than trusting the query string",
  )

  check(
    "service.legacy-owner-compatibility",
    "Missing collaboration table and zero-membership cases use exact-owner legacy compatibility with an explicit label",
    [FILES.service, FILES.dto],
    all(texts.service, [
      /P2021/,
      /(?:membership(?:Rows|s)?\.length\s*===\s*0|!membership(?:Rows|s)?\.length)/,
      /legacy/i,
    ]) &&
      any(texts.service, [/ownerId\s*:\s*profileId/, /getProjectsForProfile\s*\(\s*profileId\s*\)/]) &&
      any(texts.dto, [/legacy/i]),
    "requires P2021 handling, zero-membership handling, ownerId equality, and a client-visible legacy label",
  )

  check(
    "service.unavailable-no-mock-fallback",
    "Unexpected database failures return unavailable and never fall back to mock projects",
    [FILES.service],
    any(texts.service, [
      /(?:state|status|kind|source)\s*:\s*["'](?:unavailable|UNAVAILABLE)["']/,
      /function\s+unavailable\w*\s*\(/i,
      /resource_unavailable/,
    ]) &&
      !any(texts.service, [
        /@\/lib\/mock\/work/,
        /\bmockProjects\w*\b/,
      ]),
    "requires an unavailable state and forbids mock/old-loader fallback",
  )

  check(
    "mapper.ui-safe-capability-projection",
    "Mapper emits UI-safe project DTOs with capability snapshots and nullable detailHref",
    [FILES.mapper],
    all(texts.mapper, [
      /detailHref\s*:/,
      /capabilit(?:y|ies)/i,
      /toProjectViewModel\s*\(/,
      /\{\s*clientToken(?:\s*:\s*\w+)?\s*,\s*\.\.\.\w+\s*\}\s*=\s*toProjectViewModel\s*\(/,
    ]) && !any(texts.mapper, [/@prisma\/client/, /email\s*:/i]),
    "requires the existing Work mapper, explicit clientToken redaction, and capability/detail projection without email output",
  )

  check(
    "ui.query-link-switcher",
    "Workspace switching uses Link query navigation and no localStorage authorization",
    [FILES.client],
    all(texts.client, [
      /from\s+["']next\/link["']/,
      /<Link\b/,
      /workspace/i,
      /href\s*=\s*\{?[^\n]*(?:\?|URLSearchParams|pathname)/,
    ]) && !any(texts.client, [/\blocalStorage\b/, /\bsessionStorage\b/]),
    "requires query-based Link navigation; browser storage is forbidden",
  )

  check(
    "ui.shared-read-only-detail-block",
    "Shared read-only projects render without a detail link",
    [FILES.client, FILES.projectCard, FILES.focusCard, FILES.dto],
    all(`${texts.projectCard ?? ""}\n${texts.focusCard ?? ""}`, [
      /detailHref/,
      /(?:(?:resolved)?DetailHref\s*\?|if\s*\([^)]*(?:resolved)?DetailHref|href\s*=\s*\{\s*(?:resolved)?DetailHref\s*\})/i,
    ]) &&
      all(texts.mapper, [
        /workspaceType\s*===\s*["']PERSONAL["']/,
        /detailHref\s*:\s*[\s\S]{0,220}ownerId[\s\S]{0,160}\?[\s\S]{0,120}:\s*null/,
      ]),
    "cards must branch on detailHref; only an exact-owner PERSONAL workspace may receive the legacy detail link, so TEAM rows stay null",
  )

  check(
    "ui.add-project-legacy-only",
    "AddProjectDialog remains available only in explicitly labelled legacy personal-write compatibility",
    [FILES.client, FILES.addProjectDialog],
    all(texts.client, [
      /AddProjectDialog/,
      /legacy/i,
      /(?:canCreateProject|canUseLegacyPersonalWrites|legacyWrite|legacyOwner|isLegacy)/,
    ]),
    "requires a legacy compatibility signal to guard AddProjectDialog",
  )

  const runtimeSurface = [
    texts.dto,
    texts.mapper,
    texts.service,
    texts.page,
    texts.client,
    texts.projectCard,
    texts.focusCard,
  ].filter(Boolean).join("\n")
  const forbiddenRuntimeHits = matchingLabels(runtimeSurface, [
    { label: "server action", pattern: /["']use server["']/ },
    { label: "route handler", pattern: /export\s+(?:async\s+)?function\s+(?:GET|POST|PUT|PATCH|DELETE)\b/ },
    { label: "workspace/invitation write", pattern: /\b(?:createTeamWorkspace|inviteWorkspaceMember|acceptCollaborationInvitation|revokeCollaborationInvitation|changeWorkspaceMemberRole|suspendWorkspaceMember)\s*\(/ },
    { label: "project transfer/access write", pattern: /\b(?:transferProjectToWorkspace|changeProjectAccessGrant)\s*\(/ },
    { label: "feedback/memory write", pattern: /\b(?:createProjectFeedback|updateProjectFeedback|deleteProjectFeedback|proposeFeedbackMemoryCandidate|approveOrRejectFeedbackMemoryCandidate)\s*\(/ },
    { label: "Prisma write", pattern: /db\.[A-Za-z]\w*\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/ },
    { label: "provider runtime", pattern: /@supabase\/supabase-js|@supabase\/ssr|\b(?:OpenAI|Anthropic)\b|\binviteUserByEmail\b/ },
    { label: "Client Portal/public route", pattern: /\/client\// },
    { label: "RLS claim/runtime", pattern: /\b(?:row level security|ENABLE ROW LEVEL SECURITY|CREATE POLICY)\b/i },
    { label: "AI runtime", pattern: /\b(?:fine[- ]?tun(?:e|ing)|chat\.completions|responses\.create|generateText)\b/i },
    { label: "external agent registration", pattern: /externalRegisterable\s*:\s*true/ },
  ])
  check(
    "scope.read-only-no-expansion",
    "Slice adds no invitation, transfer, provider, public, RLS, feedback-memory, or AI runtime",
    Object.values(FILES).filter((file) => file !== FILES.addProjectDialog),
    forbiddenRuntimeHits.length === 0,
    forbiddenRuntimeHits.length === 0 ? "no forbidden TEAMCOLLAB-006+ or public/provider runtime markers" : forbiddenRuntimeHits.join(", "),
  )

  const requiredChecks = checks.filter((entry) => !entry.id.startsWith("file.addProjectDialog"))
  const failures = requiredChecks.filter((entry) => !entry.passed)

  return {
    id: "TEAMCOLLAB-005-PROJECT-INDEX",
    status: failures.length === 0 ? "pass" : "fail",
    summary: {
      passed: requiredChecks.length - failures.length,
      failed: failures.length,
      total: requiredChecks.length,
    },
    safety: {
      readOnlySlice: forbiddenRuntimeHits.length === 0,
      serverAuthorizationRequired: true,
      localStorageAuthorizationAllowed: false,
      invitationRuntimeAllowed: false,
      transferRuntimeAllowed: false,
      publicOrProviderRuntimeAllowed: false,
      rlsClaimed: false,
      aiRuntimeAllowed: false,
    },
    checks,
    failures: failures.map(({ id, label, evidence }) => ({ id, label, evidence })),
  }
}

function printHuman(result) {
  const prefix = result.status === "pass" ? "[PASS]" : "[FAIL]"
  console.log(`${prefix} TEAMCOLLAB-005 protected workspace project index`)
  console.log(`- ${result.summary.passed}/${result.summary.total} required checks passed`)

  for (const check of result.checks) {
    console.log(`- [${check.passed ? "PASS" : "FAIL"}] ${check.id}: ${check.label}`)
    if (!check.passed) console.log(`  ${check.evidence}`)
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  const result = buildResult()
  const json = `${JSON.stringify(result, null, 2)}\n`

  if (args.out) {
    const outPath = normalizeOutputPath(args.out)
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, json, "utf8")
  }

  if (args.json) console.log(json.trimEnd())
  else printHuman(result)

  if (result.status !== "pass") process.exitCode = 1
}

try {
  main()
} catch (error) {
  console.error("[FAIL] TEAMCOLLAB-005 project-index checker")
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
}
