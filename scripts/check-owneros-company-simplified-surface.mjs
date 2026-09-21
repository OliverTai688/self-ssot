#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const TASK_ID = "OWNEROS-UI-005"
const COMPANY_PAGE_PATH = "src/app/(dashboard)/company/page.tsx"
const BACKLOG_PATH = "docs/05_execution-plans/PLN-060_task-backlog.md"
const SPRINT_PATH = "docs/05_execution-plans/PLN-061_current-sprint.md"
const ACCEPTANCE_PATH = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const COMPLETED_PATH = "docs/06_audits-and-reports/RPT-007_completed-log.md"
const TASKS_PATH = "tasks.md"
const PACKAGE_PATH = "package.json"

const REQUIRED_COMPANY_PAGE_MARKERS = [
  "OWNEROS-UI-005-COMPANY-SURFACE",
  "data-owneros-slot=\"identity-mode-strip attention-header command-bar manual-ops-handoff\"",
  "data-owneros-slot=\"resource-index company-lanes\"",
  "data-owneros-slot=\"detail-pane company-readiness\"",
  "data-owneros-slot=\"agent-proposal-pane proposal-review\"",
  "data-owneros-slot=\"records-audit company-audit\"",
  "data-owneros-slot=\"settings-boundaries company-boundary\"",
  "Company Operating Desk",
  "Separate private thinking, formal knowledge, policies, contracts, and Company AI proposals.",
  "High-risk strategy module",
  "Prototype state",
  "Formal knowledge pending",
  "Owner private thinking",
  "Formal shared knowledge",
  "Company Lanes",
  "Company Readiness",
  "Company AI Proposal",
  "Records / Audit",
  "Settings / Boundary",
  "Manual Ops proof",
  "AUTH-005",
  "COMPANY-BFF",
  "DEPLOY-002",
  "No public output",
  "No Company publication runtime",
  "No high-risk write",
  "No external agent DB access",
  "externalRegisterable=false",
  "New decision",
  "Full Company list",
]

const REQUIRED_DOC_MARKERS = [
  TASK_ID,
  "company:simplified:check",
  "OWNEROS-UI-005-COMPANY-SURFACE",
]

const FORBIDDEN_COMPANY_PAGE_PATTERNS = [
  { label: "Prisma client import", pattern: /@prisma\/client/ },
  { label: "database client import", pattern: /from\s+["']@\/lib\/db["']/ },
  { label: "server action definition", pattern: /["']use server["']/ },
  { label: "provider runtime enabled", pattern: /providerApiRuntime(?:Allowed|Enabled)\s*[:=]\s*true|providerCall\s*[:=]\s*true/ },
  { label: "public output enabled", pattern: /publicOutput(?:Expanded|Allowed|Enabled)?\s*[:=]\s*true/ },
  { label: "Company publication enabled", pattern: /companyPublication(?:Allowed|Enabled|Runtime)?\s*[:=]\s*true/ },
  { label: "Company runtime DB read enabled", pattern: /company(?:Db|Database)Read(?:Allowed|Enabled)?\s*[:=]\s*true/ },
  { label: "Company runtime DB write enabled", pattern: /company(?:Db|Database)Write(?:Allowed|Enabled)?\s*[:=]\s*true/ },
  { label: "client-visible runtime enabled", pattern: /clientVisible(?:Allowed|Enabled)?\s*[:=]\s*true/ },
  { label: "formal knowledge write enabled", pattern: /formalKnowledgeWrite(?:Allowed|Enabled)?\s*[:=]\s*true/ },
  { label: "C-level runtime enabled", pattern: /cLevelRuntime(?:Allowed|Enabled)?\s*[:=]\s*true/ },
  { label: "high risk write enabled", pattern: /highRiskWrite(?:Allowed|Enabled)?\s*[:=]\s*true/ },
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
      console.log("Validate the simplified OwnerOS Company operating surface")
      console.log("")
      console.log("Usage:")
      console.log("  pnpm company:simplified:check")
      console.log("  pnpm company:simplified:check -- --json")
      console.log(
        "  pnpm company:simplified:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json",
      )
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
  const companyPage = await readText(COMPANY_PAGE_PATH, issues)
  const backlog = await readText(BACKLOG_PATH, issues)
  const sprint = await readText(SPRINT_PATH, issues)
  const acceptance = await readText(ACCEPTANCE_PATH, issues)
  const completed = await readText(COMPLETED_PATH, issues)
  const tasks = await readText(TASKS_PATH, issues)
  const packageJson = await readText(PACKAGE_PATH, issues)

  requireMarkers(companyPage, REQUIRED_COMPANY_PAGE_MARKERS, COMPANY_PAGE_PATH, issues, "COMPANY_MARKER_MISSING")
  rejectForbidden(companyPage, FORBIDDEN_COMPANY_PAGE_PATTERNS, COMPANY_PAGE_PATH, issues)
  requireMarkers(packageJson, ['"company:simplified:check"'], PACKAGE_PATH, issues, "PACKAGE_SCRIPT_MISSING")
  requireMarkers(backlog, REQUIRED_DOC_MARKERS, BACKLOG_PATH, issues, "BACKLOG_MARKER_MISSING")
  requireMarkers(sprint, REQUIRED_DOC_MARKERS, SPRINT_PATH, issues, "SPRINT_MARKER_MISSING")
  requireMarkers(acceptance, REQUIRED_DOC_MARKERS, ACCEPTANCE_PATH, issues, "ACCEPTANCE_MARKER_MISSING")
  requireMarkers(completed, REQUIRED_DOC_MARKERS, COMPLETED_PATH, issues, "COMPLETED_MARKER_MISSING")
  requireMarkers(tasks, REQUIRED_DOC_MARKERS, TASKS_PATH, issues, "TASKS_MARKER_MISSING")

  return {
    id: TASK_ID,
    status: issues.length === 0 ? "PASS" : "FAIL",
    generatedAt: new Date().toISOString(),
    route: "/company",
    companyPagePath: COMPANY_PAGE_PATH,
    checkerCommand: "pnpm company:simplified:check",
    surface: {
      mode: "protected_owner_visible_prototype_company_strategy_surface",
      primaryJob: "Separate private thinking, formal knowledge, policies, contracts, and Company AI proposals.",
      commandBarIncludes: ["New decision", "Full Company list", "Company Readiness", "Manual Ops proof"],
      lanes: ["Owner private thinking", "Formal shared knowledge", "Policy", "Contract"],
      slots: [
        "identity-mode-strip",
        "attention-header",
        "command-bar",
        "resource-index",
        "detail-pane",
        "agent-proposal-pane",
        "records-audit-timeline",
        "settings-boundaries",
        "manual-ops-handoff",
      ],
    },
    gateMapping: {
      gateA: "A4 Work/Research/Company owner path and A8 core no-mock usability prerequisite only",
      gateB: "B4 internal AI public-space/member pilot prerequisite only; no public output enabled",
      gateC: "C5 core journey UI hardening prerequisite only",
      gateAchieved: false,
    },
    nanda: {
      lifecycle: "protected_owner_visible_internal_company_ai_proposal_surface",
      protocols: ["internal"],
      endpointChanged: false,
      providerRuntimeChanged: false,
      externalRegisterable: false,
      registrationStatus: "not_registered",
    },
    safety: {
      routeHandlerCreated: false,
      serverActionCreated: false,
      schemaMigrationIncluded: false,
      databaseReadAdded: false,
      databaseWriteAdded: false,
      providerCallAdded: false,
      publicOutputExpanded: false,
      companyPublicationRuntimeAdded: false,
      highRiskWriteAdded: false,
      clientVisibleRuntimeAdded: false,
      cLevelRuntimeAdded: false,
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
    const outPath = repoPath(args.out)
    await mkdir(dirname(outPath), { recursive: true })
    await writeFile(outPath, `${JSON.stringify(proof, null, 2)}\n`)
  }

  if (args.json) {
    console.log(JSON.stringify(proof, null, 2))
  } else if (proof.status === "PASS") {
    console.log(`PASS ${TASK_ID}: simplified Company operating surface contract is present.`)
  } else {
    console.error(`FAIL ${TASK_ID}: simplified Company operating surface contract has ${proof.issues.length} issue(s).`)
    for (const issue of proof.issues) {
      console.error(`- [${issue.code}] ${issue.path}${issue.line ? `:${issue.line}` : ""} ${issue.message}`)
    }
  }

  if (proof.status !== "PASS") {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
