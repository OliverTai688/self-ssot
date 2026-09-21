#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const CONTRACT_ID = "OWNEROS-002A"
const CONTRACT_PATH = "src/lib/contracts/owner-ai-work-desktop-chat-context.contract.ts"
const ARC_035_PATH =
  "docs/02_architecture-and-rules/ARC-035_owner-ai-work-desktop-chat-context-package-contract.md"
const ACC_002_PATH = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const BACKLOG_PATH = "docs/05_execution-plans/PLN-060_task-backlog.md"
const SPRINT_PATH = "docs/05_execution-plans/PLN-061_current-sprint.md"
const TASKS_PATH = "tasks.md"
const INDEX_PATH = "docs/00_manual-and-index/MAN-001_document-index.md"
const PACKAGE_PATH = "package.json"

const REQUIRED_SOURCE_TYPES = [
  "work_project",
  "work_task",
  "file_asset",
  "media_asset",
  "research_thread",
  "research_source",
  "company_private_note",
  "company_formal_knowledge",
  "inbox_thread",
  "agent_diary_entry",
  "source_connection_artifact",
]

const REQUIRED_VISIBILITY_LEVELS = [
  "personal_private",
  "team_project",
  "company_internal",
  "c_level",
  "external_client_disabled",
]

const REQUIRED_AUTHZ_CHECKS = [
  "requireUser",
  "profile_workspace_membership",
  "source_owner_or_grant",
  "visibility_lattice",
  "c_level_gate",
  "context_redaction",
  "negative_cross_owner",
]

const REQUIRED_CONTRACT_MARKERS = [
  "OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_CONTRACT_ID",
  "OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_STATUS",
  "A2_DURABLE_AUTHORIZED_CHAT_CONTEXT",
  "OwnerAIWorkDesktopConversationDto",
  "OwnerAIWorkDesktopMessageDto",
  "OwnerAIWorkDesktopContextPackageDto",
  "OwnerAIWorkDesktopContextReferenceDto",
  "OwnerAIWorkDesktopContextResolutionCheck",
  "OwnerAIWorkDesktopContextPackageManifest",
  "OWNER_AI_WORK_DESKTOP_CONTEXT_PACKAGE_MANIFEST",
  "OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_RUNTIME_FLAGS",
  "OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_ACCEPTANCE_ROWS",
  "schemaMigrationIncluded: false",
  "runtimePersistenceEnabled: false",
  "databaseRead: false",
  "databaseWrite: false",
  "aiProviderExecutionEnabled: false",
  "sendsEmail: false",
  "publicOutputEnabled: false",
  "externalAgentDatabaseAccess: false",
  "externalRegisterable: false",
]

const REQUIRED_DOC_MARKERS = [
  CONTRACT_ID,
  "A2_DURABLE_AUTHORIZED_CHAT_CONTEXT",
  "ContextPackage",
  "requireUser()",
  "Personal Private",
  "externalRegisterable: false",
  "external agent database access",
  "schema migration",
  "cross-owner denial",
  "Requirement Understanding Score",
  "Round 1",
  "Round 2",
  "Round 3",
]

const REQUIRED_SHARED_DOC_MARKERS = [
  CONTRACT_ID,
  "owner:chat-context:check",
  "ARC-035_owner-ai-work-desktop-chat-context-package-contract.md",
]

const FORBIDDEN_CONTRACT_PATTERNS = [
  { label: "Prisma client marker", pattern: /\bPrismaClient\b/ },
  { label: "database client call marker", pattern: /\bdb\./ },
  { label: "environment read marker", pattern: /\bprocess\.env\b/ },
  { label: "provider client marker", pattern: /\bcreateClient\b/ },
  { label: "network call marker", pattern: /\bfetch\s*\(/ },
  { label: "request cookie read marker", pattern: /\bcookies\s*\(/ },
  { label: "request header read marker", pattern: /\bheaders\s*\(/ },
  { label: "database URL env marker", pattern: /\bDATABASE_URL\b/ },
  { label: "privileged Supabase env marker", pattern: /\bSUPABASE_/ },
  { label: "external registration enabled marker", pattern: /\bexternalRegisterable\s*:\s*true\b/ },
  { label: "runtime persistence enabled marker", pattern: /\bruntimePersistenceEnabled\s*:\s*true\b/ },
  { label: "provider execution enabled marker", pattern: /\baiProviderExecutionEnabled\s*:\s*true\b/ },
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
      printHelp()
      process.exit(0)
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  return args
}

function printHelp() {
  console.log("Validate the Owner AI Work Desktop chat ContextPackage contract")
  console.log("")
  console.log("Usage:")
  console.log("  pnpm owner:chat-context:check")
  console.log("  pnpm owner:chat-context:check -- --json")
  console.log("  pnpm owner:chat-context:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json")
}

function repoPath(relativePath) {
  return resolve(process.cwd(), relativePath)
}

async function readText(relativePath) {
  return readFile(repoPath(relativePath), "utf8")
}

async function readTextOrIssue(relativePath, issues) {
  try {
    return await readText(relativePath)
  } catch (error) {
    addIssue(
      issues,
      "FILE_MISSING",
      `${relativePath} is missing or unreadable: ${error instanceof Error ? error.message : String(error)}`,
      relativePath,
    )
    return ""
  }
}

function lineFor(contents, token) {
  const lines = contents.split(/\r?\n/)
  const index = lines.findIndex((line) => line.includes(token))
  return index === -1 ? null : index + 1
}

function addIssue(issues, code, message, path, line = null) {
  issues.push({ code, message, path, line })
}

function requireMarkers(source, markers, path, issues, code = "REQUIRED_MARKER_MISSING") {
  for (const marker of markers) {
    if (!source.includes(marker)) {
      addIssue(issues, code, `${path} is missing required marker: ${marker}`, path)
    }
  }
}

function rejectForbidden(source, patterns, path, issues) {
  for (const item of patterns) {
    const match = source.match(item.pattern)
    if (match) {
      addIssue(
        issues,
        "FORBIDDEN_RUNTIME_MARKER",
        `${path} contains forbidden runtime marker: ${item.label}`,
        path,
        lineFor(source, match[0]),
      )
    }
  }
}

async function buildProof() {
  const issues = []
  const contractSource = await readTextOrIssue(CONTRACT_PATH, issues)
  const arcSource = await readTextOrIssue(ARC_035_PATH, issues)
  const acceptanceSource = await readTextOrIssue(ACC_002_PATH, issues)
  const backlogSource = await readTextOrIssue(BACKLOG_PATH, issues)
  const sprintSource = await readTextOrIssue(SPRINT_PATH, issues)
  const tasksSource = await readTextOrIssue(TASKS_PATH, issues)
  const indexSource = await readTextOrIssue(INDEX_PATH, issues)
  const packageSource = await readTextOrIssue(PACKAGE_PATH, issues)

  requireMarkers(contractSource, REQUIRED_CONTRACT_MARKERS, CONTRACT_PATH, issues)
  requireMarkers(contractSource, REQUIRED_SOURCE_TYPES, CONTRACT_PATH, issues, "SOURCE_TYPE_MISSING")
  requireMarkers(contractSource, REQUIRED_VISIBILITY_LEVELS, CONTRACT_PATH, issues, "VISIBILITY_LEVEL_MISSING")
  requireMarkers(contractSource, REQUIRED_AUTHZ_CHECKS, CONTRACT_PATH, issues, "AUTHZ_CHECK_MISSING")
  rejectForbidden(contractSource, FORBIDDEN_CONTRACT_PATTERNS, CONTRACT_PATH, issues)

  requireMarkers(arcSource, REQUIRED_DOC_MARKERS, ARC_035_PATH, issues, "ARC_MARKER_MISSING")
  requireMarkers(acceptanceSource, REQUIRED_SHARED_DOC_MARKERS, ACC_002_PATH, issues, "ACCEPTANCE_MARKER_MISSING")
  requireMarkers(backlogSource, REQUIRED_SHARED_DOC_MARKERS, BACKLOG_PATH, issues, "BACKLOG_MARKER_MISSING")
  requireMarkers(sprintSource, REQUIRED_SHARED_DOC_MARKERS, SPRINT_PATH, issues, "SPRINT_MARKER_MISSING")
  requireMarkers(tasksSource, REQUIRED_SHARED_DOC_MARKERS, TASKS_PATH, issues, "TASKS_MARKER_MISSING")
  requireMarkers(indexSource, ["ARC-035_owner-ai-work-desktop-chat-context-package-contract.md"], INDEX_PATH, issues, "INDEX_MARKER_MISSING")
  requireMarkers(packageSource, ['"owner:chat-context:check"'], PACKAGE_PATH, issues, "PACKAGE_SCRIPT_MISSING")

  return {
    id: CONTRACT_ID,
    status: issues.length === 0 ? "PASS" : "FAIL",
    generatedAt: new Date().toISOString(),
    contractPath: CONTRACT_PATH,
    architectureDoc: ARC_035_PATH,
    gateCriterion: "A2_DURABLE_AUTHORIZED_CHAT_CONTEXT",
    contractOnly: true,
    gateAchieved: false,
    runtimeFlags: {
      routeHandlerCreated: false,
      serverActionCreated: false,
      schemaMigrationIncluded: false,
      runtimePersistenceEnabled: false,
      databaseRead: false,
      databaseWrite: false,
      aiProviderExecutionEnabled: false,
      sendsEmail: false,
      publicOutputEnabled: false,
      externalRuntimeEnabled: false,
      externalAgentDatabaseAccess: false,
      externalRegisterable: false,
    },
    counts: {
      sourceTypes: REQUIRED_SOURCE_TYPES.length,
      visibilityLevels: REQUIRED_VISIBILITY_LEVELS.length,
      authzChecks: REQUIRED_AUTHZ_CHECKS.length,
      issues: issues.length,
    },
    issues,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const proof = await buildProof()

  if (args.out) {
    await mkdir(dirname(repoPath(args.out)), { recursive: true })
    await writeFile(repoPath(args.out), `${JSON.stringify(proof, null, 2)}\n`)
  }

  if (args.json || args.out) {
    console.log(JSON.stringify(proof, null, 2))
  } else if (proof.status === "PASS") {
    console.log("[PASS] Owner AI Work Desktop chat ContextPackage contract is ready.")
    console.log("- Contract: src/lib/contracts/owner-ai-work-desktop-chat-context.contract.ts")
    console.log("- Architecture: docs/02_architecture-and-rules/ARC-035_owner-ai-work-desktop-chat-context-package-contract.md")
    console.log("- Gate criterion: A2_DURABLE_AUTHORIZED_CHAT_CONTEXT")
    console.log("- Runtime flags: all disabled; Gate A remains NOT_ACHIEVED.")
  } else {
    console.error(`[FAIL] ${CONTRACT_ID} checker found ${proof.issues.length} issue(s).`)
    console.error(JSON.stringify(proof.issues, null, 2))
  }

  process.exit(proof.status === "PASS" ? 0 : 1)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
