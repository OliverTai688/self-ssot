#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const CONTRACT_PATH = "src/lib/contracts/research-model-reconciliation.contract.ts"
const FORMAL_READINESS_CONTRACT_PATH = "src/lib/contracts/research-formal-readiness.contract.ts"
const SCHEMA_PATH = "prisma/schema.prisma"
const TYPES_PATH = "src/types/research.ts"
const THREAD_ACTIONS_PATH = "src/lib/actions/research-threads.ts"
const SOURCE_ACTIONS_PATH = "src/lib/actions/research-sources.ts"
const WRITING_ACTIONS_PATH = "src/lib/actions/research-writing.ts"
const EVENT_ACTIONS_PATH = "src/lib/actions/research-events.ts"
const DBS_003_DOC = "docs/02_architecture-and-rules/DBS-003_research-db-model-decision.md"
const DBS_005_DOC = "docs/02_architecture-and-rules/DBS-005_per-module-real-data-migration-matrix.md"
const ACC_002_DOC = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const BACKLOG_DOC = "docs/05_execution-plans/PLN-060_task-backlog.md"
const SPRINT_DOC = "docs/05_execution-plans/PLN-061_current-sprint.md"
const TASKS_DOC = "tasks.md"
const PACKAGE_JSON = "package.json"

const REQUIRED_TRANSITIONAL_PRISMA_MODELS = [
  "ResearchThread",
  "ResearchSource",
  "ResearchConcept",
  "ResearchWritingProject",
  "ResearchWritingSection",
  "AIFeedbackRun",
  "ResearchDigest",
  "ResearchEvent",
  "AcademicPerson",
]

const REQUIRED_CANONICAL_FAMILIES = [
  "issues",
  "threads",
  "questions",
  "sources",
  "concepts",
  "ideas",
  "writing-projects",
  "writing-sections",
  "feedback-runs",
  "events",
  "people",
  "links",
  "graph-projection",
  "records-audit",
  "agent-proposals",
]

const REQUIRED_CONTRACT_MARKERS = [
  "RESEARCH_MODEL_RECONCILIATION_CONTRACT",
  "RESEARCH_MODEL_RECONCILIATION_SUMMARY",
  "RESEARCH_MODEL_TRANSITIONAL_PRISMA_MODELS",
  "RESEARCH_MODEL_OWNER_SCOPED_BFF_READ_DTO_PATH",
  "RESEARCH_MODEL_CANONICAL_FAMILIES",
  "RESEARCH_MODEL_TYPED_LINKS",
  "RESEARCH_MODEL_UNSAFE_CURRENT_ACTIONS",
  "RESEARCH-MODEL-001-RESEARCH-ISSUE-THREAD-RECONCILIATION",
  "contract_only_no_runtime_db",
  "partial_thread_first_transitional",
  "DBS-003 previous no-research-tables statement is superseded",
  "ResearchIssue",
  "ResearchThread",
  "ResearchLink",
  "typed owner-scoped issue table or explicitly renamed thread mapping",
  "transitional bridge to issues, not canonical parent for all resources",
  "explicit typed link table with source/target families, relation, provenance, and audit refs",
  "Server Component loader",
  "requireUser()",
  "Research service authorization",
  "Prisma or approved adapter",
  "UI-safe DTO",
  "Client Component interaction",
  "src/lib/actions/research-threads.ts",
  "src/lib/actions/research-sources.ts",
  "src/lib/actions/research-writing.ts",
  "src/lib/actions/research-events.ts",
  "ownerId",
  "threadId",
  "runtimeDbReadAllowed: false",
  "runtimeDbWriteAllowed: false",
  "schemaMigrationAllowed: false",
  "migrationApplyAllowed: false",
  "seedChangeAllowed: false",
  "routeHandlerAllowed: false",
  "serverActionWriteAllowed: false",
  "publicOutputAllowed: false",
  "externalCollaborationAllowed: false",
  "externalAgentDatabaseAccessAllowed: false",
  "agentFinalWriteAllowed: false",
  "externalRegisterable: false",
  "launchLevelUpgradeClaimed: false",
  "protected_owner_visible_proposal_only",
]

const REQUIRED_DBS_003_MARKERS = [
  "RESEARCH_MODEL_RECONCILIATION_CONTRACT",
  "partial thread-first transitional",
  "DBS-003 previous no-research-tables statement is superseded",
  "ResearchThread",
  "ResearchIssue",
  "ResearchLink",
  "future owner-scoped BFF read DTO path",
  "Existing Research server actions remain unsafe for formal use",
  "No migration is authorized by this decision update",
]

const REQUIRED_ACC_MARKERS = [
  "RESEARCH-MODEL-001 Research Issue Thread Reconciliation Acceptance",
  "pnpm research:model:check",
  "machine-checkable model reconciliation contract",
  "Current `ResearchThread`, `ResearchSource`, `ResearchConcept`, `ResearchWritingProject`, `ResearchWritingSection`, `AIFeedbackRun`, `ResearchDigest`, `ResearchEvent`, and `AcademicPerson` tables are treated as transitional",
]

const REQUIRED_BACKLOG_MARKERS = [
  "RESEARCH-MODEL-001-RESEARCH-ISSUE-THREAD-RECONCILIATION",
  "src/lib/contracts/research-model-reconciliation.contract.ts",
  "scripts/check-research-model-reconciliation.mjs",
  "pnpm research:model:check",
]

const REQUIRED_FOLLOWUP_MARKERS = [
  "LOOP-147-RESEARCH-GAP-REVIEW",
  "RESEARCH-BFF-001-RESEARCH-OWNER-SCOPED-READ-DTO-CONTRACT",
]

const FORBIDDEN_CONTRACT_PATTERNS = [
  { label: "Prisma client import marker", pattern: /@prisma\/client/ },
  { label: "database client import marker", pattern: /from\s+["']@\/lib\/db["']/ },
  { label: "database client call marker", pattern: /\bdb\./ },
  { label: "environment read marker", pattern: /\bprocess\.env\b/ },
  { label: "provider client marker", pattern: /\bcreateClient\s*\(/ },
  { label: "network call marker", pattern: /\bfetch\s*\(/ },
  { label: "database URL marker", pattern: /\bDATABASE_URL\b/ },
  { label: "privileged provider env marker", pattern: /\bSUPABASE_/ },
  { label: "request cookie read marker", pattern: /\bcookies\s*\(/ },
  { label: "request header read marker", pattern: /\bheaders\s*\(/ },
  { label: "route handler request marker", pattern: /\bNextRequest\b/ },
  { label: "route handler response marker", pattern: /\bNextResponse\b/ },
  { label: "server action marker", pattern: /["']use server["']/ },
]

const FORBIDDEN_TRUE_MARKERS = [
  "runtimeDbReadAllowed: true",
  "runtimeDbWriteAllowed: true",
  "schemaMigrationAllowed: true",
  "migrationApplyAllowed: true",
  "seedChangeAllowed: true",
  "routeHandlerAllowed: true",
  "serverActionWriteAllowed: true",
  "publicOutputAllowed: true",
  "externalCollaborationAllowed: true",
  "externalAgentDatabaseAccessAllowed: true",
  "agentFinalWriteAllowed: true",
  "externalRegisterable: true",
  "launchLevelUpgradeClaimed: true",
]

function parseArgs(argv) {
  const args = { json: false, out: null, help: false }
  const filteredArgs = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filteredArgs.length; index += 1) {
    const arg = filteredArgs[index]

    if (arg === "--json") {
      args.json = true
    } else if (arg === "--out") {
      const value = filteredArgs[index + 1]
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
  console.log("Validate the Personal OS Research model reconciliation contract")
  console.log("")
  console.log("Usage:")
  console.log("  pnpm research:model:check")
  console.log("  pnpm research:model:check -- --json")
  console.log("  pnpm research:model:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json")
}

function repoPath(relativePath) {
  return resolve(process.cwd(), relativePath)
}

async function readText(relativePath) {
  return readFile(repoPath(relativePath), "utf8")
}

async function exists(relativePath) {
  try {
    await readText(relativePath)
    return true
  } catch {
    return false
  }
}

function lineFor(contents, token) {
  const lines = contents.split(/\r?\n/)
  const index = lines.findIndex((line) => line.includes(token))
  return index === -1 ? null : index + 1
}

function addIssue(list, code, message, path, line = null) {
  list.push({ code, message, path, line })
}

function validateMarkers(contents, markers, path, errors) {
  for (const marker of markers) {
    if (!contents.includes(marker)) {
      addIssue(errors, "REQUIRED_MARKER_MISSING", `Missing marker: ${marker}`, path)
    }
  }
}

function validateForbiddenRuntimeMarkers(contents, errors) {
  for (const item of FORBIDDEN_CONTRACT_PATTERNS) {
    const match = contents.match(item.pattern)
    if (match) {
      addIssue(
        errors,
        "FORBIDDEN_RUNTIME_MARKER",
        `Contract source contains ${item.label}.`,
        CONTRACT_PATH,
        lineFor(contents, match[0])
      )
    }
  }

  for (const marker of FORBIDDEN_TRUE_MARKERS) {
    if (contents.includes(marker)) {
      addIssue(errors, "FORBIDDEN_TRUE_SAFETY_MARKER", `Forbidden true marker: ${marker}`, CONTRACT_PATH)
    }
  }
}

function validateTransitionalPrismaModels(contractSource, schemaSource, errors) {
  for (const model of REQUIRED_TRANSITIONAL_PRISMA_MODELS) {
    if (!contractSource.includes(`"${model}"`)) {
      addIssue(errors, "TRANSITIONAL_MODEL_MISSING_FROM_CONTRACT", `Missing model ${model}`, CONTRACT_PATH)
    }

    if (!schemaSource.includes(`model ${model}`)) {
      addIssue(errors, "TRANSITIONAL_MODEL_MISSING_FROM_SCHEMA", `Prisma schema missing model ${model}`, SCHEMA_PATH)
    }
  }
}

function validateCanonicalFamilies(contractSource, errors) {
  for (const family of REQUIRED_CANONICAL_FAMILIES) {
    if (!contractSource.includes(`id: "${family}"`)) {
      addIssue(errors, "CANONICAL_FAMILY_MISSING", `Missing family ${family}`, CONTRACT_PATH)
    }
  }
}

function validateResearchTypes(typeSource, errors) {
  const markers = [
    "export interface ResearchIssue",
    "export interface ResearchThread",
    "export interface ResearchQuestion",
    "export interface ResearchSource",
    "export interface ResearchConcept",
    "export interface ResearchIdeaV2",
    "export interface ResearchWritingProject",
    "export interface WritingSection",
    "export interface AIFeedbackRun",
    "export interface ResearchEvent",
    "export interface AcademicPerson",
    "export interface ResearchLink",
    "export type ResearchRelationType",
  ]

  validateMarkers(typeSource, markers, TYPES_PATH, errors)
}

function validateUnsafeActionEvidence(actionSources, errors) {
  const checks = [
    {
      path: THREAD_ACTIONS_PATH,
      contents: actionSources.threads,
      markers: ["ownerId", "getResearchThreads(ownerId", "createResearchThread", "updateResearchThread"],
    },
    {
      path: SOURCE_ACTIONS_PATH,
      contents: actionSources.sources,
      markers: ["threadId", "getSourcesByThread", "addResearchSource", "upsertResearchConcept"],
    },
    {
      path: WRITING_ACTIONS_PATH,
      contents: actionSources.writing,
      markers: ["threadId", "researchWritingProject", "AIFeedbackRun"],
    },
    {
      path: EVENT_ACTIONS_PATH,
      contents: actionSources.events,
      markers: ["threadId", "researchEvent", "researchDigest"],
    },
  ]

  for (const check of checks) {
    validateMarkers(check.contents, check.markers, check.path, errors)
  }
}

async function validateDocs(errors) {
  const docs = [
    { path: DBS_003_DOC, markers: REQUIRED_DBS_003_MARKERS },
    { path: ACC_002_DOC, markers: REQUIRED_ACC_MARKERS },
    { path: BACKLOG_DOC, markers: REQUIRED_BACKLOG_MARKERS },
    { path: SPRINT_DOC, markers: ["Loop 146", "RESEARCH-MODEL-001", ...REQUIRED_FOLLOWUP_MARKERS] },
    { path: TASKS_DOC, markers: ["RESEARCH-MODEL-001", ...REQUIRED_FOLLOWUP_MARKERS] },
    { path: PACKAGE_JSON, markers: ['"research:model:check": "node scripts/check-research-model-reconciliation.mjs"'] },
    { path: DBS_005_DOC, markers: ["Research", "model naming needs reconciliation with `DBS-003`"] },
    {
      path: FORMAL_READINESS_CONTRACT_PATH,
      markers: ["RESEARCH-MODEL-001-RESEARCH-ISSUE-THREAD-RECONCILIATION"],
    },
  ]

  for (const doc of docs) {
    if (!(await exists(doc.path))) {
      addIssue(errors, "REFERENCED_DOC_MISSING", `Referenced document is missing: ${doc.path}`, doc.path)
      continue
    }

    const contents = await readText(doc.path)
    validateMarkers(contents, doc.markers, doc.path, errors)
  }
}

async function buildProof() {
  const errors = []
  const contractSource = await readText(CONTRACT_PATH)
  const schemaSource = await readText(SCHEMA_PATH)
  const typeSource = await readText(TYPES_PATH)
  const actionSources = {
    threads: await readText(THREAD_ACTIONS_PATH),
    sources: await readText(SOURCE_ACTIONS_PATH),
    writing: await readText(WRITING_ACTIONS_PATH),
    events: await readText(EVENT_ACTIONS_PATH),
  }

  validateMarkers(contractSource, REQUIRED_CONTRACT_MARKERS, CONTRACT_PATH, errors)
  validateTransitionalPrismaModels(contractSource, schemaSource, errors)
  validateCanonicalFamilies(contractSource, errors)
  validateResearchTypes(typeSource, errors)
  validateUnsafeActionEvidence(actionSources, errors)
  validateForbiddenRuntimeMarkers(contractSource, errors)
  await validateDocs(errors)

  const proof = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    command: "pnpm research:model:check",
    taskId: "RESEARCH-MODEL-001-RESEARCH-ISSUE-THREAD-RECONCILIATION",
    status: errors.length === 0 ? "ready_for_research_model_reconciliation_use" : "blocked",
    contract: {
      path: CONTRACT_PATH,
      mode: "contract_only_no_runtime_db",
      currentPrismaState: "partial_thread_first_transitional",
      staleDbs003StatementSuperseded: contractSource.includes(
        "DBS-003 previous no-research-tables statement is superseded"
      ),
      transitionalModelCount: REQUIRED_TRANSITIONAL_PRISMA_MODELS.length,
      canonicalFamilyCount: REQUIRED_CANONICAL_FAMILIES.length,
      typedLinkGroupsPresent:
        contractSource.includes("evidence-links") &&
        contractSource.includes("workflow-links") &&
        contractSource.includes("relationship-links"),
      futureBffPathPresent:
        contractSource.includes("Server Component loader") &&
        contractSource.includes("requireUser()") &&
        contractSource.includes("Research service authorization") &&
        contractSource.includes("Prisma or approved adapter") &&
        contractSource.includes("UI-safe DTO") &&
        contractSource.includes("Client Component interaction"),
    },
    modelMapping: {
      transitionalPrismaModels: REQUIRED_TRANSITIONAL_PRISMA_MODELS.map((model) => ({
        model,
        presentInContract: contractSource.includes(`"${model}"`),
        presentInSchema: schemaSource.includes(`model ${model}`),
      })),
      canonicalFamilies: REQUIRED_CANONICAL_FAMILIES.map((family) => ({
        family,
        presentInContract: contractSource.includes(`id: "${family}"`),
      })),
      typeLayerMarkers: {
        researchIssue: typeSource.includes("export interface ResearchIssue"),
        researchThread: typeSource.includes("export interface ResearchThread"),
        researchLink: typeSource.includes("export interface ResearchLink"),
        relationType: typeSource.includes("export type ResearchRelationType"),
      },
    },
    unsafeActions: {
      threadActionsMarked: contractSource.includes("research-thread-actions"),
      sourceConceptActionsMarked: contractSource.includes("research-source-concept-actions"),
      writingActionsMarked: contractSource.includes("research-writing-actions"),
      eventDigestActionsMarked: contractSource.includes("research-event-digest-actions"),
      callerSuppliedOwnerOrThreadEvidencePresent:
        actionSources.threads.includes("ownerId") &&
        actionSources.sources.includes("threadId") &&
        actionSources.writing.includes("threadId") &&
        actionSources.events.includes("threadId"),
    },
    docs: {
      dbs003: DBS_003_DOC,
      acc002: ACC_002_DOC,
      backlog: BACKLOG_DOC,
      sprint: SPRINT_DOC,
      tasks: TASKS_DOC,
      dbs005: DBS_005_DOC,
    },
    safety: {
      connectsToDatabase: false,
      readsDatabase: false,
      writesDatabase: false,
      mutatesSchema: false,
      appliesMigration: false,
      changesSeedData: false,
      addsRouteHandler: false,
      addsServerActionWrite: false,
      expandsPublicOutput: false,
      enablesExternalCollaboration: false,
      externalAgentDatabaseAccessAllowed: false,
      enablesAgentFinalWrites: false,
      externalRegisterable: false,
      launchLevelUpgradeClaimed: false,
    },
    checks: {
      contractMarkers: REQUIRED_CONTRACT_MARKERS.map((marker) => ({
        marker,
        present: contractSource.includes(marker),
      })),
      forbiddenRuntimeMarkers: FORBIDDEN_CONTRACT_PATTERNS.map((item) => ({
        label: item.label,
        present: item.pattern.test(contractSource),
      })),
      forbiddenTrueMarkers: FORBIDDEN_TRUE_MARKERS.map((marker) => ({
        marker,
        present: contractSource.includes(marker),
      })),
    },
    errors,
  }

  return proof
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    printHelp()
    return
  }

  const proof = await buildProof()

  if (args.out) {
    const outPath = repoPath(args.out)
    await mkdir(dirname(outPath), { recursive: true })
    await writeFile(outPath, `${JSON.stringify(proof, null, 2)}\n`)
  }

  if (args.json) {
    console.log(JSON.stringify(proof, null, 2))
  } else if (proof.errors.length === 0) {
    console.log(
      `Research model reconciliation ready: ${proof.contract.transitionalModelCount} transitional Prisma models, ${proof.contract.canonicalFamilyCount} canonical families, no runtime/write markers.`
    )
  } else {
    console.error(`Research model reconciliation blocked with ${proof.errors.length} issue(s):`)
    for (const error of proof.errors) {
      const location = error.line ? `${error.path}:${error.line}` : error.path
      console.error(`- [${error.code}] ${location} ${error.message}`)
    }
  }

  process.exitCode = proof.errors.length === 0 ? 0 : 1
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
