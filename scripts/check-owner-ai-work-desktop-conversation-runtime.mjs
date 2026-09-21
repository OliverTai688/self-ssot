#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const CONTRACT_ID = "OWNEROS-002B"
const CONTRACT_PATH = "src/lib/contracts/owner-ai-work-desktop-conversation-runtime.contract.ts"
const LAUNCH_REVIEW_PATH =
  "docs/06_audits-and-reports/RPT-064_loop-227-short-launch-review-and-owner-conversation-routing.md"
const ACC_002_PATH = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const BACKLOG_PATH = "docs/05_execution-plans/PLN-060_task-backlog.md"
const SPRINT_PATH = "docs/05_execution-plans/PLN-061_current-sprint.md"
const TASKS_PATH = "tasks.md"
const COMPLETED_LOG_PATH = "docs/06_audits-and-reports/RPT-007_completed-log.md"
const PACKAGE_PATH = "package.json"

const REQUIRED_GATE_CRITERIA = [
  "A2_DURABLE_AUTHORIZED_CHAT_CONTEXT",
  "A5_INBOX_FREE_TEXT_RETURN_PATH",
]

const REQUIRED_SURFACES = ["/ai-input", "/inbox", "/dashboard", "/agents"]

const REQUIRED_AUTHZ_CHECKS = [
  "requireUser",
  "profile_workspace_membership",
  "personal_private_scope",
  "source_owner_or_grant",
  "visibility_lattice",
  "context_redaction",
  "inbox_origin_return_path",
  "audit_event_required",
  "negative_cross_owner",
]

const REQUIRED_CONTRACT_MARKERS = [
  "OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_CONTRACT_ID",
  "OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_STATUS",
  "OwnerAIWorkDesktopConversationThreadDto",
  "OwnerAIWorkDesktopMessageDto",
  "OwnerAIWorkDesktopContextPackageDto",
  "OwnerAIWorkDesktopInboxReturnPathDto",
  "OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_BFF_FLOW",
  "OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_FLAGS",
  "OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_CONTRACT",
  "Personal Private only",
  "routeHandlerCreated: false",
  "serverActionCreated: false",
  "schemaMigrationIncluded: false",
  "runtimePersistenceEnabled: false",
  "databaseRead: false",
  "databaseWrite: false",
  "aiProviderExecutionEnabled: false",
  "inboxReplyRuntimeEnabled: false",
  "sendsEmail: false",
  "publicOutputEnabled: false",
  "externalRuntimeEnabled: false",
  "externalAgentDatabaseAccess: false",
  "externalRegisterable: false",
]

const REQUIRED_DOC_MARKERS = [
  CONTRACT_ID,
  "owner:conversation-runtime:check",
  "OwnerConversation",
  "Inbox return path",
  "A2_DURABLE_AUTHORIZED_CHAT_CONTEXT",
  "A5_INBOX_FREE_TEXT_RETURN_PATH",
  "Gate A remains NOT_ACHIEVED",
  "externalRegisterable: false",
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
  { label: "inbox reply runtime enabled marker", pattern: /\binboxReplyRuntimeEnabled\s*:\s*true\b/ },
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
  console.log("Validate the Owner AI Work Desktop conversation runtime contract")
  console.log("")
  console.log("Usage:")
  console.log("  pnpm owner:conversation-runtime:check")
  console.log("  pnpm owner:conversation-runtime:check -- --json")
  console.log(
    "  pnpm owner:conversation-runtime:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json",
  )
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
      `${relativePath} is missing or unreadable: ${
        error instanceof Error ? error.message : String(error)
      }`,
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
  const launchReviewSource = await readTextOrIssue(LAUNCH_REVIEW_PATH, issues)
  const acceptanceSource = await readTextOrIssue(ACC_002_PATH, issues)
  const backlogSource = await readTextOrIssue(BACKLOG_PATH, issues)
  const sprintSource = await readTextOrIssue(SPRINT_PATH, issues)
  const tasksSource = await readTextOrIssue(TASKS_PATH, issues)
  const completedLogSource = await readTextOrIssue(COMPLETED_LOG_PATH, issues)
  const packageSource = await readTextOrIssue(PACKAGE_PATH, issues)

  requireMarkers(contractSource, REQUIRED_CONTRACT_MARKERS, CONTRACT_PATH, issues)
  requireMarkers(contractSource, REQUIRED_GATE_CRITERIA, CONTRACT_PATH, issues, "GATE_CRITERION_MISSING")
  requireMarkers(contractSource, REQUIRED_SURFACES, CONTRACT_PATH, issues, "SURFACE_MISSING")
  requireMarkers(contractSource, REQUIRED_AUTHZ_CHECKS, CONTRACT_PATH, issues, "AUTHZ_CHECK_MISSING")
  rejectForbidden(contractSource, FORBIDDEN_CONTRACT_PATTERNS, CONTRACT_PATH, issues)

  requireMarkers(launchReviewSource, REQUIRED_DOC_MARKERS, LAUNCH_REVIEW_PATH, issues, "REVIEW_MARKER_MISSING")
  requireMarkers(acceptanceSource, REQUIRED_DOC_MARKERS, ACC_002_PATH, issues, "ACCEPTANCE_MARKER_MISSING")
  requireMarkers(backlogSource, REQUIRED_DOC_MARKERS, BACKLOG_PATH, issues, "BACKLOG_MARKER_MISSING")
  requireMarkers(sprintSource, REQUIRED_DOC_MARKERS, SPRINT_PATH, issues, "SPRINT_MARKER_MISSING")
  requireMarkers(tasksSource, REQUIRED_DOC_MARKERS, TASKS_PATH, issues, "TASKS_MARKER_MISSING")
  requireMarkers(completedLogSource, REQUIRED_DOC_MARKERS, COMPLETED_LOG_PATH, issues, "COMPLETED_LOG_MARKER_MISSING")
  requireMarkers(packageSource, ['"owner:conversation-runtime:check"'], PACKAGE_PATH, issues, "PACKAGE_SCRIPT_MISSING")

  return {
    id: CONTRACT_ID,
    status: issues.length === 0 ? "PASS" : "FAIL",
    generatedAt: new Date().toISOString(),
    contractPath: CONTRACT_PATH,
    launchReviewPath: LAUNCH_REVIEW_PATH,
    gateCriteria: REQUIRED_GATE_CRITERIA,
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
      inboxReplyRuntimeEnabled: false,
      sendsEmail: false,
      publicOutputEnabled: false,
      externalRuntimeEnabled: false,
      externalAgentDatabaseAccess: false,
      externalRegisterable: false,
    },
    counts: {
      surfaces: REQUIRED_SURFACES.length,
      authzChecks: REQUIRED_AUTHZ_CHECKS.length,
      gateCriteria: REQUIRED_GATE_CRITERIA.length,
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
    console.log("[PASS] Owner AI Work Desktop conversation runtime contract is ready.")
    console.log(`- Contract: ${CONTRACT_PATH}`)
    console.log(`- Launch review: ${LAUNCH_REVIEW_PATH}`)
    console.log("- Gate criteria: A2 durable chat/context and A5 Inbox return path")
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
