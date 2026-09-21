#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const TASK_ID = "OWNEROS-UI-002"
const DASHBOARD_PATH = "src/app/(dashboard)/dashboard/page.tsx"
const BACKLOG_PATH = "docs/05_execution-plans/PLN-060_task-backlog.md"
const SPRINT_PATH = "docs/05_execution-plans/PLN-061_current-sprint.md"
const ACCEPTANCE_PATH = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const COMPLETED_PATH = "docs/06_audits-and-reports/RPT-007_completed-log.md"
const TASKS_PATH = "tasks.md"
const PACKAGE_PATH = "package.json"

const REQUIRED_DASHBOARD_MARKERS = [
  "OWNEROS-UI-002-DASHBOARD-SURFACE",
  "data-owneros-slot=\"identity-mode-strip attention-header command-bar manual-ops-handoff\"",
  "data-owneros-slot=\"resource-index\"",
  "data-owneros-slot=\"detail-pane agent-proposal-pane\"",
  "data-owneros-slot=\"detail-pane manual-ops-handoff\"",
  "data-owneros-slot=\"records-audit-timeline\"",
  "Choose the next owner action",
  "AI Work Desktop",
  "Owner command queue",
  "Primary handoff",
  "Proof handoff",
  "Manual Ops",
  "getDailyCommandCenter",
  "export const dynamic = \"force-dynamic\"",
]

const REQUIRED_DOC_MARKERS = [
  TASK_ID,
  "dashboard:simplified:check",
  "OWNEROS-UI-002-DASHBOARD-SURFACE",
]

const FORBIDDEN_DASHBOARD_PATTERNS = [
  { label: "AI Input Client import", pattern: /\bAIInputClient\b/ },
  { label: "Prisma client import", pattern: /@prisma\/client/ },
  { label: "database client import", pattern: /from\s+["']@\/lib\/db["']/ },
  { label: "server action definition", pattern: /["']use server["']/ },
  { label: "provider fetch", pattern: /\bfetch\s*\(/ },
  { label: "browser storage", pattern: /\blocalStorage\b|\bsessionStorage\b/ },
  { label: "public output route", pattern: /\/client\/\[token\]|publicOutputExpanded\s*:\s*true/ },
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
      console.log("Validate the simplified owner dashboard operating surface")
      console.log("")
      console.log("Usage:")
      console.log("  pnpm dashboard:simplified:check")
      console.log("  pnpm dashboard:simplified:check -- --json")
      console.log("  pnpm dashboard:simplified:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json")
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
  const dashboard = await readText(DASHBOARD_PATH, issues)
  const backlog = await readText(BACKLOG_PATH, issues)
  const sprint = await readText(SPRINT_PATH, issues)
  const acceptance = await readText(ACCEPTANCE_PATH, issues)
  const completed = await readText(COMPLETED_PATH, issues)
  const tasks = await readText(TASKS_PATH, issues)
  const packageJson = await readText(PACKAGE_PATH, issues)

  requireMarkers(dashboard, REQUIRED_DASHBOARD_MARKERS, DASHBOARD_PATH, issues, "DASHBOARD_MARKER_MISSING")
  rejectForbidden(dashboard, FORBIDDEN_DASHBOARD_PATTERNS, DASHBOARD_PATH, issues)
  requireMarkers(packageJson, ['"dashboard:simplified:check"'], PACKAGE_PATH, issues, "PACKAGE_SCRIPT_MISSING")
  requireMarkers(backlog, REQUIRED_DOC_MARKERS, BACKLOG_PATH, issues, "BACKLOG_MARKER_MISSING")
  requireMarkers(sprint, REQUIRED_DOC_MARKERS, SPRINT_PATH, issues, "SPRINT_MARKER_MISSING")
  requireMarkers(acceptance, REQUIRED_DOC_MARKERS, ACCEPTANCE_PATH, issues, "ACCEPTANCE_MARKER_MISSING")
  requireMarkers(completed, REQUIRED_DOC_MARKERS, COMPLETED_PATH, issues, "COMPLETED_MARKER_MISSING")
  requireMarkers(tasks, REQUIRED_DOC_MARKERS, TASKS_PATH, issues, "TASKS_MARKER_MISSING")

  return {
    id: TASK_ID,
    status: issues.length === 0 ? "PASS" : "FAIL",
    generatedAt: new Date().toISOString(),
    dashboardPath: DASHBOARD_PATH,
    checkerCommand: "pnpm dashboard:simplified:check",
    surface: {
      mode: "protected_server_component",
      primaryJob: "Choose the next owner action",
      commandBarIncludes: ["/ai-input", "/work", "/inbox", "/settings", "/admin"],
      slots: [
        "identity-mode-strip",
        "attention-header",
        "command-bar",
        "resource-index",
        "detail-pane",
        "agent-proposal-pane",
        "records-audit-timeline",
        "manual-ops-handoff",
      ],
    },
    gateMapping: {
      gateA: "Owner-private operating entry and proof handoff usability only",
      gateB: "No member/team claim",
      gateC: "C5 UI hardening prerequisite only",
      gateAchieved: false,
    },
    runtimeFlags: {
      routeHandlerCreated: false,
      serverActionCreated: false,
      schemaMigrationIncluded: false,
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
    console.log(`${TASK_ID} simplified owner dashboard surface is ready.`)
  } else {
    console.error(`${TASK_ID} simplified owner dashboard surface failed:`)
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
