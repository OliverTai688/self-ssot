#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const CONTRACT_ID = "OWNEROS-BFF-001"
const UI_CONTRACT_ID = "OWNEROS-UI-003"
const CONTRACT_PATH = "src/lib/contracts/owneros-core-surface-bff.contract.ts"
const ARC_PATH = "docs/02_architecture-and-rules/ARC-037_owneros-core-surface-bff-view-model-contract.md"
const ACC_PATH = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const BACKLOG_PATH = "docs/05_execution-plans/PLN-060_task-backlog.md"
const SPRINT_PATH = "docs/05_execution-plans/PLN-061_current-sprint.md"
const COMPLETED_PATH = "docs/06_audits-and-reports/RPT-007_completed-log.md"
const TASKS_PATH = "tasks.md"
const INDEX_PATH = "docs/00_manual-and-index/MAN-001_document-index.md"
const PACKAGE_PATH = "package.json"

const REQUIRED_CONTRACT_MARKERS = [
  "OWNEROS_CORE_SURFACE_BFF_CONTRACT_ID",
  "OWNEROS_CORE_SURFACE_UI_CONTRACT_ID",
  "OWNEROS_CORE_SURFACE_BFF_SURFACES",
  "OWNEROS_CORE_SURFACE_COMPONENTS",
  "OWNEROS_CORE_SURFACE_BFF_INVARIANTS",
  "OWNEROS_CORE_SURFACE_RUNTIME_FLAGS",
  "OwnerOsSurfaceFrame",
  "OwnerOsCommandBar",
  "OwnerOsResourceIndex",
  "OwnerOsDetailPane",
  "OwnerOsAgentProposalPane",
  "OwnerOsRecordsAudit",
  "OwnerOsBoundaryPanel",
  "dashboard",
  "ai-input",
  "settings",
  "admin",
  "/dashboard",
  "/ai-input",
  "/settings",
  "/admin",
  "getDailyCommandCenter",
  "buildAIInputFormalReadinessContract",
  "loadAIInputSourceConnectionCatalog",
  "requireUser",
  "resolveCurrentUser",
  "getAdminLaunchOverview",
  "getAdminLaunchConsole",
  "server-component-loader",
  "service-authorization",
  "ui-safe-dto",
  "manual-ops-proof-handoff",
  "externalRegisterable: false",
  "publicOutputExpanded: false",
  "providerCall: false",
  "databaseWrite: false",
]

const REQUIRED_SOURCE_MARKERS = [
  "shopify.dev/docs/api/app-home/patterns/compositions/index-table",
  "polaris.shopify.com/patterns/common-actions",
  "atlassian.design/components/navigation-system/layout",
  "carbondesignsystem.com/components/data-table/usage",
  "design.gitlab.com",
]

const REQUIRED_ARC_MARKERS = [
  CONTRACT_ID,
  UI_CONTRACT_ID,
  "ARC-037",
  "Page Requirement Understanding Score",
  "94/100",
  "Round 1",
  "Round 2",
  "Round 3",
  "/dashboard",
  "/ai-input",
  "/settings",
  "/admin",
  "BFF View Model Matrix",
  "Shared Layout Component Contract",
  "NANDA Boundary",
  "externalRegisterable: false",
]

const REQUIRED_SHARED_DOC_MARKERS = [
  CONTRACT_ID,
  UI_CONTRACT_ID,
  "ARC-037_owneros-core-surface-bff-view-model-contract.md",
  "owneros:surface-bff:check",
]

const REQUIRED_TASK_MARKERS = [
  CONTRACT_ID,
  "OWNEROS-AIINPUT-UI-001",
  "OWNEROS-UI-003",
  "OWNEROS-UI-004",
]

const FORBIDDEN_CONTRACT_PATTERNS = [
  { label: "Prisma package import", pattern: /@prisma\/client/ },
  { label: "Prisma client", pattern: /\bPrismaClient\b/ },
  { label: "database client import", pattern: /from\s+["']@\/lib\/db["']/ },
  { label: "environment read", pattern: /\bprocess\.env\b/ },
  { label: "network fetch", pattern: /\bfetch\s*\(/ },
  { label: "request cookie read", pattern: /\bcookies\s*\(/ },
  { label: "request header read", pattern: /\bheaders\s*\(/ },
  { label: "server action marker", pattern: /["']use server["']/ },
  { label: "runtime enabled route marker", pattern: /\brouteHandlerCreated\s*:\s*true\b/ },
  { label: "runtime enabled server action marker", pattern: /\bserverActionCreated\s*:\s*true\b/ },
  { label: "runtime enabled DB write marker", pattern: /\bdatabaseWrite\s*:\s*true\b/ },
  { label: "runtime enabled provider marker", pattern: /\bproviderCall\s*:\s*true\b/ },
  { label: "public output enabled marker", pattern: /\bpublicOutputExpanded\s*:\s*true\b/ },
  { label: "external database access enabled marker", pattern: /\bexternalAgentDatabaseAccess\s*:\s*true\b/ },
  { label: "external registration enabled marker", pattern: /\bexternalRegisterable\s*:\s*true\b/ },
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
      console.log("Validate the OwnerOS core surface BFF/view-model contract")
      console.log("")
      console.log("Usage:")
      console.log("  pnpm owneros:surface-bff:check")
      console.log("  pnpm owneros:surface-bff:check -- --json")
      console.log("  pnpm owneros:surface-bff:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json")
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

function countToken(source, token) {
  return source.split(token).length - 1
}

async function buildProof() {
  const issues = []
  const contractSource = await readText(CONTRACT_PATH, issues)
  const arcSource = await readText(ARC_PATH, issues)
  const acceptanceSource = await readText(ACC_PATH, issues)
  const backlogSource = await readText(BACKLOG_PATH, issues)
  const sprintSource = await readText(SPRINT_PATH, issues)
  const completedSource = await readText(COMPLETED_PATH, issues)
  const tasksSource = await readText(TASKS_PATH, issues)
  const indexSource = await readText(INDEX_PATH, issues)
  const packageSource = await readText(PACKAGE_PATH, issues)

  requireMarkers(contractSource, REQUIRED_CONTRACT_MARKERS, CONTRACT_PATH, issues, "CONTRACT_MARKER_MISSING")
  requireMarkers(contractSource, REQUIRED_SOURCE_MARKERS, CONTRACT_PATH, issues, "SOURCE_REF_MISSING")
  rejectForbidden(contractSource, FORBIDDEN_CONTRACT_PATTERNS, CONTRACT_PATH, issues)

  requireMarkers(arcSource, REQUIRED_ARC_MARKERS, ARC_PATH, issues, "ARC_MARKER_MISSING")
  requireMarkers(arcSource, REQUIRED_SOURCE_MARKERS, ARC_PATH, issues, "ARC_SOURCE_REF_MISSING")
  requireMarkers(acceptanceSource, REQUIRED_SHARED_DOC_MARKERS, ACC_PATH, issues, "ACCEPTANCE_MARKER_MISSING")
  requireMarkers(backlogSource, REQUIRED_SHARED_DOC_MARKERS, BACKLOG_PATH, issues, "BACKLOG_MARKER_MISSING")
  requireMarkers(sprintSource, REQUIRED_SHARED_DOC_MARKERS, SPRINT_PATH, issues, "SPRINT_MARKER_MISSING")
  requireMarkers(completedSource, REQUIRED_SHARED_DOC_MARKERS, COMPLETED_PATH, issues, "COMPLETED_MARKER_MISSING")
  requireMarkers(tasksSource, [...REQUIRED_SHARED_DOC_MARKERS, ...REQUIRED_TASK_MARKERS], TASKS_PATH, issues, "TASKS_MARKER_MISSING")
  requireMarkers(indexSource, ["ARC-037_owneros-core-surface-bff-view-model-contract.md"], INDEX_PATH, issues, "INDEX_MARKER_MISSING")
  requireMarkers(packageSource, ['"owneros:surface-bff:check"'], PACKAGE_PATH, issues, "PACKAGE_SCRIPT_MISSING")

  const surfaceCount = ["surfaceId: \"dashboard\"", "surfaceId: \"ai-input\"", "surfaceId: \"settings\"", "surfaceId: \"admin\""].filter(
    (marker) => contractSource.includes(marker),
  ).length
  const componentCount = countToken(contractSource, "name: \"OwnerOs")

  if (surfaceCount !== 4) {
    issues.push({
      code: "SURFACE_COUNT_MISMATCH",
      path: CONTRACT_PATH,
      marker: "surface count",
      line: null,
      message: `${CONTRACT_PATH} must define exactly 4 core surfaces; found ${surfaceCount}.`,
    })
  }

  if (componentCount !== 7) {
    issues.push({
      code: "COMPONENT_COUNT_MISMATCH",
      path: CONTRACT_PATH,
      marker: "component count",
      line: null,
      message: `${CONTRACT_PATH} must define exactly 7 shared components; found ${componentCount}.`,
    })
  }

  return {
    id: CONTRACT_ID,
    uiContractId: UI_CONTRACT_ID,
    status: issues.length === 0 ? "PASS" : "FAIL",
    generatedAt: new Date().toISOString(),
    contractPath: CONTRACT_PATH,
    architectureDoc: ARC_PATH,
    checkerCommand: "pnpm owneros:surface-bff:check",
    surfaces: ["/dashboard", "/ai-input", "/settings", "/admin"],
    counts: {
      surfaces: surfaceCount,
      components: componentCount,
      invariants: REQUIRED_CONTRACT_MARKERS.filter((marker) =>
        [
          "server-component-loader",
          "service-authorization",
          "ui-safe-dto",
          "manual-ops-proof-handoff",
        ].includes(marker),
      ).length,
      issues: issues.length,
    },
    gateMapping: {
      gateA: "A2/A8 contract prerequisite only",
      gateB: "B1/B2/B4 future permission and shared surface prerequisite only",
      gateC: "C2/C3/C5 operator and UI hardening prerequisite only",
      gateAchieved: false,
    },
    runtimeFlags: {
      routeHandlerCreated: false,
      serverActionCreated: false,
      schemaMigrationIncluded: false,
      databaseRead: false,
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
    console.log(`${CONTRACT_ID} OwnerOS core surface BFF/view-model contract is ready.`)
  } else {
    console.error(`${CONTRACT_ID} OwnerOS core surface BFF/view-model contract failed:`)
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
