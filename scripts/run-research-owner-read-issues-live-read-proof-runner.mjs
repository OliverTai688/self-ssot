#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { config } from "dotenv"

const TASK_ID =
  "RESEARCH-BFF-015-RESEARCH-OWNER-READ-ISSUES-LIVE-READ-PROOF-RUNNER-DRY-RUN-CLI"
const CONTRACT_TASK_ID =
  "RESEARCH-BFF-014-RESEARCH-OWNER-READ-ISSUES-LIVE-READ-PROOF-RUNNER-CONTRACT"
const SELECTED_FIELD_TASK_ID =
  "RESEARCH-BFF-013-RESEARCH-OWNER-READ-ISSUES-SELECTED-FIELD-RUNTIME-ADAPTER-PROOF"
const SERVICE_AUTHZ_TASK_ID =
  "RESEARCH-BFF-012-RESEARCH-OWNER-READ-ISSUES-SERVICE-AUTHZ-RUNTIME-PROOF"

const CONTRACT_SERVICE_PATH =
  "src/lib/services/research-owner-read-issues-live-read-proof-runner.service.ts"
const SELECTED_FIELD_SERVICE_PATH =
  "src/lib/services/research-owner-read-issues-selected-field-runtime-adapter.service.ts"
const SERVICE_AUTHZ_PATH =
  "src/lib/services/research-owner-read-issues-runtime-readiness.service.ts"
const REPORTS_DIR = "docs/2_agent-input/generated/agent-loop/reports"
const DEFAULT_OUT =
  "docs/2_agent-input/generated/agent-loop/research-owner-read-issues-live-read-proof/latest-dry-run.json"

const ALLOW_LIVE_READ_FLAG = "PERSONAL_OS_RESEARCH_READ_PROOF_ALLOW_LIVE_READ"
const CONFIRMATION_ENV = "PERSONAL_OS_RESEARCH_READ_PROOF_CONFIRM"
const CONFIRMATION_PHRASE = "I_UNDERSTAND_THIS_READS_OWNER_RESEARCH_DATA"
const PROOF_TARGET_ENV = "PERSONAL_OS_RESEARCH_READ_PROOF_TARGET"
const PROOF_MARKER_RE =
  /research[_-]?proof|research[_-]?read|research[_-]?owner[_-]?read|disposable|scratch|test|local|tmp/i
const VALUABLE_NAME_RE = /prod|production|primary|main|launch|supabase|live|real|owner|personal[_-]?os/i

const SELECTED_SCALAR_FIELDS = [
  "id",
  "title",
  "description",
  "status",
  "keywords",
  "disciplines",
  "regions",
  "methodType",
  "mainResearchQuestion",
  "workLinkage",
  "createdAt",
  "updatedAt",
]
const RELATION_COUNT_KEYS = ["sources", "concepts", "writingProjects"]

config({ path: ".env.local", quiet: true })
config({ path: ".env", quiet: true })

function parseArgs(argv) {
  const args = {
    dryRun: true,
    json: false,
    out: DEFAULT_OUT,
    help: false,
  }
  const filteredArgs = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filteredArgs.length; index += 1) {
    const arg = filteredArgs[index]

    if (arg === "--dry-run") {
      args.dryRun = true
      continue
    }

    if (arg === "--json") {
      args.json = true
      continue
    }

    if (arg === "--out") {
      const value = filteredArgs[index + 1]
      if (!value || value.startsWith("--")) {
        throw new Error("--out requires a file path")
      }
      args.out = value
      index += 1
      continue
    }

    if (arg === "--help" || arg === "-h") {
      args.help = true
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return args
}

function printHelp() {
  console.log("Run the Research owner read issues live-read proof runner in no-secret dry-run mode.")
  console.log("")
  console.log("Usage:")
  console.log("  pnpm research:read-issues-live-read-proof-runner:run")
  console.log("  pnpm research:read-issues-live-read-proof-runner:run -- --json")
  console.log(
    `  pnpm research:read-issues-live-read-proof-runner:run -- --json --out ${DEFAULT_OUT}`,
  )
  console.log("")
  console.log("Future live-read prerequisites are classified but never executed here:")
  console.log(`  ${ALLOW_LIVE_READ_FLAG}=1`)
  console.log(`  ${CONFIRMATION_ENV}=${CONFIRMATION_PHRASE}`)
  console.log(`  ${PROOF_TARGET_ENV}=local_or_disposable_or_owner_approved`)
}

function readText(relativePath) {
  const absolutePath = resolve(process.cwd(), relativePath)
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : null
}

function markerCheck(relativePath, markers) {
  const text = readText(relativePath)
  const missing = text === null ? markers : markers.filter((marker) => !text.includes(marker))

  return {
    path: relativePath,
    present: text !== null,
    markerReady: missing.length === 0,
    missing,
  }
}

function boolEnv(name, expectedValue) {
  const value = process.env[name]
  return {
    envName: name,
    provided: typeof value === "string" && value.length > 0,
    accepted: value === expectedValue,
    expectedValue,
    valueRedacted: true,
  }
}

function classifyProofTarget() {
  const value = process.env[PROOF_TARGET_ENV]

  if (!value) {
    return {
      envName: PROOF_TARGET_ENV,
      provided: false,
      classification: "missing_owner_approved_target",
      parseable: false,
      protocolAllowed: false,
      hostClass: "missing",
      databaseNameHasProofMarker: false,
      databaseNameLooksValuable: false,
      proofTargetReady: false,
      valueRedacted: true,
      hostRedacted: true,
    }
  }

  const normalized = value.trim().toLowerCase()
  if (["local", "disposable", "owner_approved", "local_or_disposable_or_owner_approved"].includes(normalized)) {
    return {
      envName: PROOF_TARGET_ENV,
      provided: true,
      classification: "declared_safe_owner_approved_category",
      parseable: false,
      protocolAllowed: false,
      hostClass: "declared_category",
      databaseNameHasProofMarker: true,
      databaseNameLooksValuable: false,
      proofTargetReady: true,
      valueRedacted: true,
      hostRedacted: true,
    }
  }

  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase()
    const localHosts = new Set(["localhost", "127.0.0.1", "::1"])
    const hostClass = localHosts.has(hostname) ? "local" : "remote"
    const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""))
    const protocolAllowed = url.protocol === "postgres:" || url.protocol === "postgresql:"
    const databaseNameHasProofMarker = PROOF_MARKER_RE.test(databaseName)
    const databaseNameLooksValuable =
      VALUABLE_NAME_RE.test(databaseName) && !databaseNameHasProofMarker
    const proofTargetReady =
      protocolAllowed &&
      hostClass === "local" &&
      databaseNameHasProofMarker &&
      !databaseNameLooksValuable

    return {
      envName: PROOF_TARGET_ENV,
      provided: true,
      classification: proofTargetReady
        ? "local_disposable_database_url"
        : hostClass === "remote"
          ? "remote_database_url_requires_manual_owner_approval"
          : "database_url_not_safe_for_research_read_proof",
      parseable: true,
      protocolAllowed,
      hostClass,
      databaseNameHasProofMarker,
      databaseNameLooksValuable,
      proofTargetReady,
      valueRedacted: true,
      hostRedacted: true,
    }
  } catch {
    return {
      envName: PROOF_TARGET_ENV,
      provided: true,
      classification: "unparseable_or_ambiguous_target",
      parseable: false,
      protocolAllowed: false,
      hostClass: "unknown",
      databaseNameHasProofMarker: false,
      databaseNameLooksValuable: false,
      proofTargetReady: false,
      valueRedacted: true,
      hostRedacted: true,
    }
  }
}

function latestAuthProofSummary() {
  const reportsPath = resolve(process.cwd(), REPORTS_DIR)
  if (!existsSync(reportsPath)) {
    return {
      available: false,
      latestPath: null,
      canRunAuth005: false,
      launchAuthPrereqsReady: false,
      authStatusReady: false,
      statusEvidenceProvided: false,
      rawPacketRedacted: true,
      nextAction: "Run pnpm auth:proof with sanitized signed-in /auth/status evidence.",
    }
  }

  const candidates = readdirSync(reportsPath)
    .filter((fileName) => /auth-proof\.json$/.test(fileName))
    .map((fileName) => {
      const absolutePath = join(reportsPath, fileName)
      return {
        fileName,
        absolutePath,
        mtimeMs: statSync(absolutePath).mtimeMs,
      }
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs)

  if (candidates.length === 0) {
    return {
      available: false,
      latestPath: null,
      canRunAuth005: false,
      launchAuthPrereqsReady: false,
      authStatusReady: false,
      statusEvidenceProvided: false,
      rawPacketRedacted: true,
      nextAction: "Run pnpm auth:proof with sanitized signed-in /auth/status evidence.",
    }
  }

  const latest = candidates[0]
  try {
    const packet = JSON.parse(readFileSync(latest.absolutePath, "utf8"))
    const summary = packet.proofSummary ?? {}
    const authStatusEvidence = packet.authStatusEvidence ?? {}

    return {
      available: true,
      latestPath: join(REPORTS_DIR, latest.fileName),
      canRunAuth005: summary.canRunAuth005 === true,
      launchAuthPrereqsReady: summary.launchAuthPrereqsReady === true,
      authStatusReady: summary.authStatusReady === true,
      statusEvidenceProvided: authStatusEvidence.provided === true,
      rawPacketRedacted: true,
      nextAction:
        typeof summary.nextAction === "string"
          ? summary.nextAction
          : "Run pnpm auth:proof with sanitized signed-in /auth/status evidence.",
    }
  } catch {
    return {
      available: true,
      latestPath: join(REPORTS_DIR, latest.fileName),
      canRunAuth005: false,
      launchAuthPrereqsReady: false,
      authStatusReady: false,
      statusEvidenceProvided: false,
      rawPacketRedacted: true,
      nextAction: "Latest auth proof packet was not parseable; recollect sanitized auth evidence.",
    }
  }
}

function dependencyState() {
  return {
    bff014: markerCheck(CONTRACT_SERVICE_PATH, [
      CONTRACT_TASK_ID,
      "live_read_proof_runner_contract_dry_run_no_live_research_read",
      "PERSONAL_OS_RESEARCH_READ_PROOF_ALLOW_LIVE_READ",
      "PERSONAL_OS_RESEARCH_READ_PROOF_CONFIRM",
      "I_UNDERSTAND_THIS_READS_OWNER_RESEARCH_DATA",
      "PERSONAL_OS_RESEARCH_READ_PROOF_TARGET",
      "liveReadExecutionAllowed: false",
      "runtimePrismaReadEnabled: false",
      "externalAgentDatabaseAccessAllowed: false",
      "externalRegisterable: false",
      "launchLevelUpgradeClaimed: false",
    ]),
    bff013: markerCheck(SELECTED_FIELD_SERVICE_PATH, [
      SELECTED_FIELD_TASK_ID,
      "selected_field_runtime_adapter_proof_gate_no_live_research_read",
      "selectedScalarFields",
      "relationCountKeys",
      "mapAuthorizedResearchIssueRowsToDtos",
      "livePrismaReadAllowed: false",
      "adapterExecutionAllowed: false",
    ]),
    bff012: markerCheck(SERVICE_AUTHZ_PATH, [
      SERVICE_AUTHZ_TASK_ID,
      "buildResearchOwnerReadIssuesServiceAuthzRuntimeProof",
      "runtimeRequireUserCallInThisSlice: true",
      "ownerIdentitySource: \"requireUser().profileId\"",
      "runtimeDbReadEnabled: false",
      "externalAgentDatabaseAccessAllowed: false",
    ]),
  }
}

function buildRows({ dependenciesReady, allowLiveRead, confirmation, proofTarget, authProof }) {
  return [
    {
      id: "dependency-chain",
      label: "BFF-014/013/012 dependency chain",
      readinessSignal: dependenciesReady
        ? "Contract, selected-field proof, and service-authz markers are present."
        : "One or more Research owner-read proof dependencies are missing markers.",
      passCriteria: "BFF-014, BFF-013, and BFF-012 remain no-live-read and no-public-output.",
      blockedPattern: "Live Research read before dependency markers are ready",
      tone: dependenciesReady ? "good" : "blocked",
    },
    {
      id: "owner-run-inputs",
      label: "Owner-run allow and confirmation",
      readinessSignal:
        allowLiveRead.accepted && confirmation.accepted
          ? "Explicit allow flag and owner confirmation phrase are present."
          : "Explicit allow flag or owner confirmation phrase is missing.",
      passCriteria: `${ALLOW_LIVE_READ_FLAG}=1 and ${CONFIRMATION_ENV}=${CONFIRMATION_PHRASE}`,
      blockedPattern: "Implicit live read from default environment state",
      tone: allowLiveRead.accepted && confirmation.accepted ? "warn" : "blocked",
    },
    {
      id: "proof-target-classification",
      label: "Proof target classification",
      readinessSignal: proofTarget.proofTargetReady
        ? "Proof target is classified as safe without printing raw target details."
        : "Proof target is missing, ambiguous, remote, or not marked disposable/local/owner-approved.",
      passCriteria: "Target is a declared safe category or a local disposable database URL with proof markers.",
      blockedPattern: "Ambiguous or valuable Research data target",
      tone: proofTarget.proofTargetReady ? "warn" : "blocked",
    },
    {
      id: "auth-proof-availability",
      label: "Auth proof availability",
      readinessSignal: authProof.canRunAuth005
        ? "Latest sanitized auth proof says AUTH-005 can run."
        : "Latest sanitized auth proof does not yet allow AUTH-005.",
      passCriteria: "Supabase public env, signed-in /auth/status, and Profile mapping proof are all present.",
      blockedPattern: "Owner-scoped Research read without authenticated owner/Profile proof",
      tone: authProof.canRunAuth005 ? "warn" : "blocked",
    },
    {
      id: "dry-run-boundary",
      label: "Dry-run boundary",
      readinessSignal:
        "liveReadExecutionAllowed=false, runtimePrismaReadEnabled=false, doesNotConnectToDatabase=true.",
      passCriteria: "This CLI emits readiness only and performs no Research DB read or write.",
      blockedPattern: "Proof runner connecting to DB or returning private Research data",
      tone: "good",
    },
  ]
}

function buildPayload() {
  const dependencies = dependencyState()
  const dependenciesReady = Object.values(dependencies).every((entry) => entry.markerReady)
  const allowLiveRead = boolEnv(ALLOW_LIVE_READ_FLAG, "1")
  const confirmation = boolEnv(CONFIRMATION_ENV, CONFIRMATION_PHRASE)
  const proofTarget = classifyProofTarget()
  const authProof = latestAuthProofSummary()
  const missing = []
  const warnings = []

  if (!dependenciesReady) missing.push("BFF-014/BFF-013/BFF-012 source markers are not all ready.")
  if (!allowLiveRead.accepted) missing.push(`${ALLOW_LIVE_READ_FLAG}=1 is missing.`)
  if (!confirmation.accepted) missing.push(`${CONFIRMATION_ENV}=${CONFIRMATION_PHRASE} is missing.`)
  if (!proofTarget.proofTargetReady) {
    missing.push(`${PROOF_TARGET_ENV} is missing or not classified as a safe proof target.`)
  }
  if (!authProof.canRunAuth005) {
    missing.push("AUTH-005 sanitized owner/Profile evidence is not ready.")
  }
  if (proofTarget.hostClass === "remote") {
    warnings.push("Remote Research proof targets require a separate manual owner approval loop.")
  }
  if (allowLiveRead.accepted && confirmation.accepted && proofTarget.proofTargetReady) {
    warnings.push("Owner-run live-read inputs are present, but this BFF-015 runner still refuses live reads.")
  }

  const futureLiveReadEligible =
    dependenciesReady &&
    allowLiveRead.accepted &&
    confirmation.accepted &&
    proofTarget.proofTargetReady &&
    authProof.canRunAuth005

  return {
    schemaVersion: 1,
    taskId: TASK_ID,
    status: dependenciesReady
      ? "dry_run_ready_no_live_research_read"
      : "dry_run_blocked_by_contract_marker_gap",
    mode: "owner_run_no_secret_dry_run_cli",
    generatedAt: new Date().toISOString(),
    dryRunOnly: true,
    selectedFamily: "issues",
    selectedModel: "ResearchThread",
    ownerIdentitySource: "requireUser().profileId",
    ownerScopePredicate: "ResearchThread.ownerId equals requireUser().profileId",
    plannedPrismaOperation: "prisma.researchThread.findMany",
    plannedWhere: "where: { ownerId: ownerProfileId }",
    stableSort: "updatedAt desc, id asc",
    defaultLimit: 50,
    selectedScalarFields: SELECTED_SCALAR_FIELDS,
    relationCountKeys: RELATION_COUNT_KEYS,
    plannedSelectShape: [...SELECTED_SCALAR_FIELDS, ...RELATION_COUNT_KEYS.map((key) => `_count.${key}`)],
    mapperFunction: "mapAuthorizedResearchIssueRowsToDtos",
    mapperInputBoundary: "authorized_rows_or_explicit_unavailable_state",
    mapperOutputBoundary: "ui_safe_research_issue_read_dto",
    dependencies,
    ownerRunInputs: {
      allowLiveRead,
      confirmation,
      proofTarget,
      authProof,
    },
    ownerRunReady:
      allowLiveRead.accepted &&
      confirmation.accepted &&
      proofTarget.proofTargetReady &&
      authProof.canRunAuth005,
    futureLiveReadEligible,
    liveReadExecutionAllowed: false,
    runtimeDbReadEnabled: false,
    runtimeDbWriteEnabled: false,
    runtimePrismaReadEnabled: false,
    adapterExecutionAllowed: false,
    routeHandlerEnabled: false,
    serverActionWriteEnabled: false,
    publicOutputEnabled: false,
    externalCollaborationEnabled: false,
    externalAgentDatabaseAccessAllowed: false,
    agentFinalWriteAllowed: false,
    externalRegisterable: false,
    launchLevelUpgradeClaimed: false,
    rows: buildRows({
      dependenciesReady,
      allowLiveRead,
      confirmation,
      proofTarget,
      authProof,
    }),
    safety: {
      doesNotConnectToDatabase: true,
      doesNotApplyMigration: true,
      doesNotWriteDatabase: true,
      doesNotReadResearchData: true,
      doesNotFetchNetwork: true,
      printsSecrets: false,
      redactedValues: [
        "Supabase URLs",
        "Supabase keys",
        "database URLs",
        "database hosts",
        "cookies",
        "tokens",
        "raw claims",
        "Profile ids",
        "owner emails",
        "raw Prisma rows",
        "source bodies",
        "private Research content",
      ],
    },
    missing,
    warnings,
    stopConditions: [
      "Stop before importing Prisma client, db clients, provider clients, cookies, headers, fetch, or Next route helpers.",
      "Stop before connecting to a database, executing a live Research read/write, applying schema/migration/seed changes, or adding route handlers/server actions.",
      "Stop before public output, external collaboration, external agent database access, Research agent final writes, external registration, or launch-level claims.",
      "Stop if owner identity, proof target classification, selected fields, mapper output, or no-secret evidence becomes ambiguous.",
    ],
    nextSafeAction: futureLiveReadEligible
      ? "Select a separate owner-approved live-read proof gate before any Prisma read; this dry-run packet does not execute the read."
      : "Keep collecting owner-run prerequisites; this packet is safe for owner inspection and does not prove formal launch readiness.",
  }
}

function writeJson(path, payload) {
  const absolutePath = resolve(process.cwd(), path)
  mkdirSync(dirname(absolutePath), { recursive: true })
  writeFileSync(absolutePath, `${JSON.stringify(payload, null, 2)}\n`)
  return path
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  const payload = buildPayload()
  const writtenPath = args.out ? writeJson(args.out, payload) : null

  if (args.json) {
    console.log(JSON.stringify({ ...payload, writtenPath }, null, 2))
    return
  }

  console.log(`${TASK_ID}: ${payload.status}`)
  console.log(`Written: ${writtenPath}`)
  console.log(`Future live-read eligible: ${payload.futureLiveReadEligible ? "yes" : "no"}`)
  if (payload.missing.length > 0) {
    console.log("Missing:")
    for (const item of payload.missing) console.log(`- ${item}`)
  }
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
