#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const TASK_ID = "OWNEROS-AIINPUT-UI-001"
const AI_INPUT_CLIENT_PATH = "src/app/(dashboard)/ai-input/ai-input-client.tsx"
const AI_INPUT_PAGE_PATH = "src/app/(dashboard)/ai-input/page.tsx"
const BACKLOG_PATH = "docs/05_execution-plans/PLN-060_task-backlog.md"
const SPRINT_PATH = "docs/05_execution-plans/PLN-061_current-sprint.md"
const ACCEPTANCE_PATH = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const COMPLETED_PATH = "docs/06_audits-and-reports/RPT-007_completed-log.md"
const TASKS_PATH = "tasks.md"
const PACKAGE_PATH = "package.json"

const REQUIRED_CLIENT_MARKERS = [
  "OWNEROS-AIINPUT-UI-001-SURFACE",
  "data-owneros-slot=\"identity-mode-strip attention-header command-bar manual-ops-handoff\"",
  "data-owneros-slot=\"resource-index source-conversation-index\"",
  "data-owneros-slot=\"detail-pane agent-proposal-pane\"",
  "data-owneros-slot=\"settings-boundaries records-audit manual-ops-handoff\"",
  "AI Work Desktop",
  "Capture, review, route",
  "Source / conversation index",
  "Proposal detail",
  "Settings and boundaries",
  "Audit and Manual Ops",
  "Gate A not achieved",
  "externalRegisterable=false",
  "No provider runtime",
  "No DB write",
  "No public output",
]

const REQUIRED_PAGE_MARKERS = [
  "export const dynamic = \"force-dynamic\"",
  "buildAIInputFormalReadinessContract",
  "loadAIInputSourceConnectionCatalog",
  "AIInputClient",
]

const REQUIRED_DOC_MARKERS = [
  TASK_ID,
  "ai-input:simplified:check",
  "OWNEROS-AIINPUT-UI-001-SURFACE",
]

const FORBIDDEN_CLIENT_PATTERNS = [
  { label: "Prisma client import", pattern: /@prisma\/client/ },
  { label: "database client import", pattern: /from\s+["']@\/lib\/db["']/ },
  { label: "environment variable access", pattern: /\bprocess\.env\b/ },
  { label: "public output enabled", pattern: /publicOutput(?:Expanded|Allowed|Enabled)\s*[:=]\s*true/ },
  { label: "external registration enabled", pattern: /externalRegisterable\s*[:=]\s*true|externalRegistrationEnabled\s*[:=]\s*true/ },
  { label: "provider runtime enabled", pattern: /providerApiRuntime(?:Allowed|Enabled)\s*[:=]\s*true|providerCall\s*[:=]\s*true/ },
  { label: "database write enabled", pattern: /databaseWrite(?:Allowed|Enabled)?\s*[:=]\s*true|dbWrite\s*[:=]\s*true/ },
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
      console.log("Validate the simplified OwnerOS AI Input work desktop surface")
      console.log("")
      console.log("Usage:")
      console.log("  pnpm ai-input:simplified:check")
      console.log("  pnpm ai-input:simplified:check -- --json")
      console.log("  pnpm ai-input:simplified:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json")
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
  const client = await readText(AI_INPUT_CLIENT_PATH, issues)
  const page = await readText(AI_INPUT_PAGE_PATH, issues)
  const backlog = await readText(BACKLOG_PATH, issues)
  const sprint = await readText(SPRINT_PATH, issues)
  const acceptance = await readText(ACCEPTANCE_PATH, issues)
  const completed = await readText(COMPLETED_PATH, issues)
  const tasks = await readText(TASKS_PATH, issues)
  const packageJson = await readText(PACKAGE_PATH, issues)

  requireMarkers(client, REQUIRED_CLIENT_MARKERS, AI_INPUT_CLIENT_PATH, issues, "CLIENT_MARKER_MISSING")
  requireMarkers(page, REQUIRED_PAGE_MARKERS, AI_INPUT_PAGE_PATH, issues, "PAGE_MARKER_MISSING")
  rejectForbidden(client, FORBIDDEN_CLIENT_PATTERNS, AI_INPUT_CLIENT_PATH, issues)
  requireMarkers(packageJson, ['"ai-input:simplified:check"'], PACKAGE_PATH, issues, "PACKAGE_SCRIPT_MISSING")
  requireMarkers(backlog, REQUIRED_DOC_MARKERS, BACKLOG_PATH, issues, "BACKLOG_MARKER_MISSING")
  requireMarkers(sprint, REQUIRED_DOC_MARKERS, SPRINT_PATH, issues, "SPRINT_MARKER_MISSING")
  requireMarkers(acceptance, REQUIRED_DOC_MARKERS, ACCEPTANCE_PATH, issues, "ACCEPTANCE_MARKER_MISSING")
  requireMarkers(completed, REQUIRED_DOC_MARKERS, COMPLETED_PATH, issues, "COMPLETED_MARKER_MISSING")
  requireMarkers(tasks, REQUIRED_DOC_MARKERS, TASKS_PATH, issues, "TASKS_MARKER_MISSING")

  return {
    id: TASK_ID,
    status: issues.length === 0 ? "PASS" : "FAIL",
    generatedAt: new Date().toISOString(),
    aiInputClientPath: AI_INPUT_CLIENT_PATH,
    aiInputPagePath: AI_INPUT_PAGE_PATH,
    checkerCommand: "pnpm ai-input:simplified:check",
    surface: {
      mode: "protected_server_component_loader_with_client_interaction",
      primaryJob: "Capture, review, route",
      commandBarIncludes: ["Capture", "Review", "Sources", "Context", "Manual Ops"],
      slots: [
        "identity-mode-strip",
        "attention-header",
        "command-bar",
        "resource-index",
        "source-conversation-index",
        "detail-pane",
        "agent-proposal-pane",
        "settings-boundaries",
        "records-audit",
        "manual-ops-handoff",
      ],
    },
    gateMapping: {
      gateA: "Owner-private AI Work Desktop usability prerequisite only",
      gateB: "No member/team claim",
      gateC: "C5 UI hardening prerequisite only",
      gateAchieved: false,
    },
    nanda: {
      lifecycle: "protected_owner_visible_ui_only",
      protocols: ["internal"],
      endpointChanged: false,
      externalRegisterable: false,
      registrationStatus: "not_registered",
    },
    runtimeFlags: {
      routeHandlerCreated: false,
      serverActionCreated: false,
      schemaMigrationIncluded: false,
      databaseReadAdded: false,
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
    console.log(`${TASK_ID} simplified AI Input work desktop surface is ready.`)
  } else {
    console.error(`${TASK_ID} simplified AI Input work desktop surface failed:`)
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
