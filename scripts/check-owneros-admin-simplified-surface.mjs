#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const TASK_ID = "OWNEROS-UI-004"
const ADMIN_PATH = "src/app/(dashboard)/admin/page.tsx"
const BACKLOG_PATH = "docs/05_execution-plans/PLN-060_task-backlog.md"
const SPRINT_PATH = "docs/05_execution-plans/PLN-061_current-sprint.md"
const ACCEPTANCE_PATH = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const COMPLETED_PATH = "docs/06_audits-and-reports/RPT-007_completed-log.md"
const TASKS_PATH = "tasks.md"
const PACKAGE_PATH = "package.json"

const REQUIRED_ADMIN_MARKERS = [
  "OWNEROS-UI-004-ADMIN-SURFACE",
  "data-owneros-slot=\"identity-mode-strip attention-header command-bar manual-ops-handoff\"",
  "data-owneros-slot=\"resource-index operator-queue\"",
  "data-owneros-slot=\"detail-pane system-readiness\"",
  "data-owneros-slot=\"records-audit proof-handoff\"",
  "Admin Control Plane",
  "Inspect launch blockers, audit proof, system readiness, and Manual Ops",
  "Blocker Queue",
  "Proof Queue",
  "System Readiness",
  "Audit / Records",
  "Gate A not achieved",
  "externalRegisterable=false",
  "AUTH-005",
  "WORK-009",
  "DEPLOY-002",
  "No admin mutation",
  "No env edit",
  "No deployment API write",
  "No DB write",
  "No provider runtime",
  "Full details",
  "getAdminLaunchOverview",
  "getAdminLaunchConsole",
  "export const dynamic = \"force-dynamic\"",
]

const REQUIRED_DOC_MARKERS = [
  TASK_ID,
  "admin:simplified:check",
  "OWNEROS-UI-004-ADMIN-SURFACE",
]

const FORBIDDEN_ADMIN_PATTERNS = [
  { label: "Prisma client import", pattern: /@prisma\/client/ },
  { label: "database client import", pattern: /from\s+["']@\/lib\/db["']/ },
  { label: "server action definition", pattern: /["']use server["']/ },
  { label: "provider fetch", pattern: /\bfetch\s*\(/ },
  { label: "browser storage", pattern: /\blocalStorage\b|\bsessionStorage\b/ },
  { label: "admin mutation enabled", pattern: /adminMutation(?:Allowed|Enabled)?\s*[:=]\s*true/ },
  { label: "environment mutation enabled", pattern: /envMutation(?:Allowed|Enabled)?\s*[:=]\s*true/ },
  { label: "deployment API write enabled", pattern: /deployment(?:Api)?Write(?:Allowed|Enabled)?\s*[:=]\s*true/ },
  { label: "database write enabled", pattern: /databaseWrite(?:Allowed|Enabled)?\s*[:=]\s*true|dbWrite\s*[:=]\s*true/ },
  { label: "provider runtime enabled", pattern: /providerApiRuntime(?:Allowed|Enabled)\s*[:=]\s*true|providerCall\s*[:=]\s*true/ },
  { label: "public output enabled", pattern: /publicOutput(?:Expanded|Allowed|Enabled)\s*[:=]\s*true/ },
  { label: "external registration enabled", pattern: /externalRegisterable\s*[:=]\s*true|externalRegistrationEnabled\s*[:=]\s*true/ },
  { label: "external agent database access enabled", pattern: /externalAgentDatabaseAccess(?:Allowed|Enabled)?\s*[:=]\s*true/ },
]

function parseArgs(argv) {
  const args = { json: false, out: null }
  const filtered = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filtered.length; index += 1) {
    const arg = filtered[index]
    if (arg === "--json") {
      args.json = true
      continue
    }
    if (arg === "--out") {
      const value = filtered[index + 1]
      if (!value || value.startsWith("--")) {
        throw new Error("--out requires a file path")
      }
      args.out = value
      index += 1
      continue
    }
    if (arg === "--help" || arg === "-h") {
      console.log("Validate the simplified OwnerOS admin operator surface")
      console.log("")
      console.log("Usage:")
      console.log("  pnpm admin:simplified:check")
      console.log("  pnpm admin:simplified:check -- --json")
      console.log("  pnpm admin:simplified:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json")
      process.exit(0)
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  return args
}

function repoPath(relativePath) {
  return resolve(process.cwd(), relativePath)
}

async function readText(relativePath, issues) {
  try {
    return await readFile(repoPath(relativePath), "utf8")
  } catch (error) {
    issues.push({
      code: "FILE_MISSING",
      path: relativePath,
      marker: null,
      line: null,
      message: `${relativePath} is missing or unreadable: ${error instanceof Error ? error.message : String(error)}`,
    })
    return ""
  }
}

function lineFor(source, token) {
  const lines = source.split(/\r?\n/)
  const index = lines.findIndex((line) => line.includes(token))
  return index === -1 ? null : index + 1
}

function requireMarkers(source, markers, path, issues, code) {
  for (const marker of markers) {
    if (!source.includes(marker)) {
      issues.push({
        code,
        path,
        marker,
        line: null,
        message: `${path} is missing required marker: ${marker}`,
      })
    }
  }
}

function rejectForbidden(source, patterns, path, issues) {
  for (const item of patterns) {
    const match = source.match(item.pattern)
    if (match) {
      issues.push({
        code: "FORBIDDEN_RUNTIME_MARKER",
        path,
        marker: item.label,
        line: lineFor(source, match[0]),
        message: `${path} contains forbidden runtime marker: ${item.label}`,
      })
    }
  }
}

async function buildProof() {
  const issues = []
  const admin = await readText(ADMIN_PATH, issues)
  const backlog = await readText(BACKLOG_PATH, issues)
  const sprint = await readText(SPRINT_PATH, issues)
  const acceptance = await readText(ACCEPTANCE_PATH, issues)
  const completed = await readText(COMPLETED_PATH, issues)
  const tasks = await readText(TASKS_PATH, issues)
  const packageJson = await readText(PACKAGE_PATH, issues)

  requireMarkers(admin, REQUIRED_ADMIN_MARKERS, ADMIN_PATH, issues, "ADMIN_MARKER_MISSING")
  rejectForbidden(admin, FORBIDDEN_ADMIN_PATTERNS, ADMIN_PATH, issues)
  requireMarkers(packageJson, ['"admin:simplified:check"'], PACKAGE_PATH, issues, "PACKAGE_SCRIPT_MISSING")
  requireMarkers(backlog, REQUIRED_DOC_MARKERS, BACKLOG_PATH, issues, "BACKLOG_MARKER_MISSING")
  requireMarkers(sprint, REQUIRED_DOC_MARKERS, SPRINT_PATH, issues, "SPRINT_MARKER_MISSING")
  requireMarkers(acceptance, REQUIRED_DOC_MARKERS, ACCEPTANCE_PATH, issues, "ACCEPTANCE_MARKER_MISSING")
  requireMarkers(completed, REQUIRED_DOC_MARKERS, COMPLETED_PATH, issues, "COMPLETED_MARKER_MISSING")
  requireMarkers(tasks, REQUIRED_DOC_MARKERS, TASKS_PATH, issues, "TASKS_MARKER_MISSING")

  return {
    id: TASK_ID,
    status: issues.length === 0 ? "PASS" : "FAIL",
    generatedAt: new Date().toISOString(),
    adminPath: ADMIN_PATH,
    checkerCommand: "pnpm admin:simplified:check",
    surface: {
      mode: "protected_server_component_operator_control_plane",
      primaryJob: "Inspect launch blockers, audit proof, system readiness, and Manual Ops",
      commandBarIncludes: ["Blockers", "Proof", "System", "Audit", "Manual Ops"],
      slots: [
        "identity-mode-strip",
        "attention-header",
        "command-bar",
        "resource-index",
        "operator-queue",
        "detail-pane",
        "system-readiness",
        "records-audit",
        "proof-handoff",
        "manual-ops-handoff",
      ],
    },
    gateMapping: {
      gateA: "Private deployed no-mock/admin proof handoff usability prerequisite only",
      gateB: "No member/team pilot claim",
      gateC: "C2/C3/C5 operator readiness and UI hardening prerequisite only",
      gateAchieved: false,
    },
    nanda: {
      lifecycle: "protected_operator_visible_boundary_surface",
      protocols: ["internal"],
      endpointChanged: false,
      externalRegisterable: false,
      registrationStatus: "not_registered",
    },
    runtimeFlags: {
      routeHandlerCreated: false,
      serverActionCreated: false,
      schemaMigrationIncluded: false,
      adminMutation: false,
      envMutation: false,
      deploymentApiWrite: false,
      databaseWrite: false,
      providerCall: false,
      publicOutputExpanded: false,
      externalAgentDatabaseAccess: false,
      externalRegisterable: false,
    },
    issues,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const proof = await buildProof()
  const json = JSON.stringify(proof, null, 2)

  if (args.out) {
    await mkdir(dirname(repoPath(args.out)), { recursive: true })
    await writeFile(repoPath(args.out), `${json}\n`, "utf8")
  }

  if (args.json || args.out) {
    console.log(json)
  } else if (proof.status === "PASS") {
    console.log(`${TASK_ID} simplified admin operator surface is ready.`)
  } else {
    console.error(`${TASK_ID} simplified admin operator surface failed:`)
    for (const issue of proof.issues) {
      console.error(`- ${issue.message}`)
    }
  }

  process.exit(proof.status === "PASS" ? 0 : 1)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
