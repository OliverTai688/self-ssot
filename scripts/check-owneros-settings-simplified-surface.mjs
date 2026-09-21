#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const TASK_ID = "OWNEROS-UI-003"
const SETTINGS_PATH = "src/app/(dashboard)/settings/page.tsx"
const BACKLOG_PATH = "docs/05_execution-plans/PLN-060_task-backlog.md"
const SPRINT_PATH = "docs/05_execution-plans/PLN-061_current-sprint.md"
const ACCEPTANCE_PATH = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const COMPLETED_PATH = "docs/06_audits-and-reports/RPT-007_completed-log.md"
const TASKS_PATH = "tasks.md"
const PACKAGE_PATH = "package.json"

const REQUIRED_SETTINGS_MARKERS = [
  "OWNEROS-UI-003-SETTINGS-SURFACE",
  "data-owneros-slot=\"identity-mode-strip attention-header command-bar manual-ops-handoff\"",
  "data-owneros-slot=\"resource-index settings-control-plane\"",
  "data-owneros-slot=\"detail-pane boundary-panel\"",
  "data-owneros-slot=\"records-audit manual-ops-handoff\"",
  "Settings Control Plane",
  "Control identity, workspace, sources, modules, agents, env, and Manual Ops",
  "Identity / Profile",
  "Owner / Member Workspace",
  "Source Connections",
  "Module Permissions",
  "Agent Boundaries",
  "Environment / Manual Ops",
  "Gate A not achieved",
  "externalRegisterable=false",
  "No permission write",
  "No env mutation",
  "No provider runtime",
  "Manual Ops",
  "resolveCurrentUser",
  "buildAdminAuditBffContract",
]

const REQUIRED_DOC_MARKERS = [
  TASK_ID,
  "settings:simplified:check",
  "OWNEROS-UI-003-SETTINGS-SURFACE",
]

const FORBIDDEN_SETTINGS_PATTERNS = [
  { label: "Prisma client import", pattern: /@prisma\/client/ },
  { label: "database client import", pattern: /from\s+["']@\/lib\/db["']/ },
  { label: "server action definition", pattern: /["']use server["']/ },
  { label: "provider fetch", pattern: /\bfetch\s*\(/ },
  { label: "browser storage", pattern: /\blocalStorage\b|\bsessionStorage\b/ },
  { label: "permission write enabled", pattern: /permissionWrite(?:Allowed|Enabled)?\s*[:=]\s*true/ },
  { label: "environment mutation enabled", pattern: /envMutation(?:Allowed|Enabled)?\s*[:=]\s*true/ },
  { label: "provider runtime enabled", pattern: /providerApiRuntime(?:Allowed|Enabled)\s*[:=]\s*true|providerCall\s*[:=]\s*true/ },
  { label: "retention delete enabled", pattern: /retentionDelete(?:Allowed|Enabled)?\s*[:=]\s*true/ },
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
      console.log("Validate the simplified OwnerOS settings control-plane surface")
      console.log("")
      console.log("Usage:")
      console.log("  pnpm settings:simplified:check")
      console.log("  pnpm settings:simplified:check -- --json")
      console.log("  pnpm settings:simplified:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json")
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
  const settings = await readText(SETTINGS_PATH, issues)
  const backlog = await readText(BACKLOG_PATH, issues)
  const sprint = await readText(SPRINT_PATH, issues)
  const acceptance = await readText(ACCEPTANCE_PATH, issues)
  const completed = await readText(COMPLETED_PATH, issues)
  const tasks = await readText(TASKS_PATH, issues)
  const packageJson = await readText(PACKAGE_PATH, issues)

  requireMarkers(settings, REQUIRED_SETTINGS_MARKERS, SETTINGS_PATH, issues, "SETTINGS_MARKER_MISSING")
  rejectForbidden(settings, FORBIDDEN_SETTINGS_PATTERNS, SETTINGS_PATH, issues)
  requireMarkers(packageJson, ['"settings:simplified:check"'], PACKAGE_PATH, issues, "PACKAGE_SCRIPT_MISSING")
  requireMarkers(backlog, REQUIRED_DOC_MARKERS, BACKLOG_PATH, issues, "BACKLOG_MARKER_MISSING")
  requireMarkers(sprint, REQUIRED_DOC_MARKERS, SPRINT_PATH, issues, "SPRINT_MARKER_MISSING")
  requireMarkers(acceptance, REQUIRED_DOC_MARKERS, ACCEPTANCE_PATH, issues, "ACCEPTANCE_MARKER_MISSING")
  requireMarkers(completed, REQUIRED_DOC_MARKERS, COMPLETED_PATH, issues, "COMPLETED_MARKER_MISSING")
  requireMarkers(tasks, REQUIRED_DOC_MARKERS, TASKS_PATH, issues, "TASKS_MARKER_MISSING")

  return {
    id: TASK_ID,
    status: issues.length === 0 ? "PASS" : "FAIL",
    generatedAt: new Date().toISOString(),
    settingsPath: SETTINGS_PATH,
    checkerCommand: "pnpm settings:simplified:check",
    surface: {
      mode: "protected_server_component_control_plane",
      primaryJob: "Control identity, workspace, sources, modules, agents, env, and Manual Ops",
      commandBarIncludes: ["Identity", "Workspace", "Sources", "Modules", "Agents", "Manual Ops"],
      slots: [
        "identity-mode-strip",
        "attention-header",
        "command-bar",
        "resource-index",
        "settings-control-plane",
        "detail-pane",
        "boundary-panel",
        "records-audit",
        "manual-ops-handoff",
      ],
    },
    gateMapping: {
      gateA: "Owner-private settings and proof handoff usability prerequisite only",
      gateB: "Member/workspace controls remain non-mutating until selected later",
      gateC: "C5 UI hardening prerequisite only",
      gateAchieved: false,
    },
    nanda: {
      lifecycle: "protected_owner_visible_boundary_surface",
      protocols: ["internal"],
      endpointChanged: false,
      externalRegisterable: false,
      registrationStatus: "not_registered",
    },
    runtimeFlags: {
      routeHandlerCreated: false,
      serverActionCreated: false,
      schemaMigrationIncluded: false,
      permissionWrite: false,
      envMutation: false,
      retentionDeleteRuntime: false,
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

  if (args.out) {
    const outputPath = repoPath(args.out)
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8")
  }

  if (args.json) {
    console.log(JSON.stringify(proof, null, 2))
  } else {
    console.log(`${proof.id}: ${proof.status}`)
    if (proof.issues.length > 0) {
      for (const issue of proof.issues) {
        const location = issue.line ? `${issue.path}:${issue.line}` : issue.path
        console.log(`- [${issue.code}] ${location} ${issue.message}`)
      }
    }
  }

  if (proof.status !== "PASS") {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
