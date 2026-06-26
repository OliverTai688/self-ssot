#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const CONTRACT_PATH = "src/lib/contracts/research-formal-readiness.contract.ts"
const SURFACE_SERVICE_PATH = "src/lib/services/research-formal-readiness.service.ts"
const SURFACE_PAGE_PATH = "src/app/(dashboard)/research/readiness/page.tsx"
const RESEARCH_HUB_PAGE_PATH = "src/app/(dashboard)/research/page.tsx"
const ACCEPTANCE_DOC = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const BACKLOG_DOC = "docs/05_execution-plans/PLN-060_task-backlog.md"
const TASKS_DOC = "tasks.md"
const LOOP_141_REPORT = "docs/06_audits-and-reports/RPT-040_loop-141-research-realdata-gap-review.md"

const REQUIRED_RESOURCE_FAMILIES = [
  "issues",
  "sources",
  "concepts",
  "writing-projects",
  "questions",
  "events",
  "people",
  "links",
  "graph",
  "agent-proposals",
  "records-readiness",
]

const REQUIRED_CONTRACT_MARKERS = [
  "RESEARCH_FORMAL_READINESS_CONTRACT",
  "RESEARCH_FORMAL_READINESS_SUMMARY",
  "RESEARCH-OPS-001-RESEARCH-FORMAL-READINESS-BFF",
  "contract_only_no_db_runtime",
  "protected_owner_research",
  "useResearch() localStorage/mock UI state",
  "partial thread-first Prisma Research models",
  "existing unsafe-for-formal server actions",
  "ResearchIssue",
  "ResearchThread",
  "Server Component loader",
  "requireUser()",
  "Research service authorization",
  "Prisma or approved adapter",
  "UI-safe DTO",
  "Client Component interaction",
  "blockedWriteOperations",
  "runtimeDbReadAllowed: false",
  "runtimeDbWriteAllowed: false",
  "schemaMigrationAllowed: false",
  "migrationApplyAllowed: false",
  "routeHandlerAllowed: false",
  "serverActionWriteAllowed: false",
  "publicOutputAllowed: false",
  "externalCollaborationAllowed: false",
  "agentFinalWriteAllowed: false",
  "externalRegisterable: false",
  "hiddenMockToFormalClaimAllowed: false",
  "launchLevelUpgradeClaimed: false",
  "RESEARCH-OPS-002-RESEARCH-FORMAL-READINESS-SURFACE",
]

const REQUIRED_DOC_MARKERS = [
  {
    path: ACCEPTANCE_DOC,
    markers: [
      "RESEARCH-OPS-001 Research Formal Readiness BFF Acceptance",
      "RESEARCH-OPS-002 Research Formal Readiness Surface Acceptance",
      "/research/readiness",
      "pnpm research:readiness:check",
      "no hidden mock-to-formal claim",
    ],
  },
  {
    path: BACKLOG_DOC,
    markers: [
      "RESEARCH-OPS-001-RESEARCH-FORMAL-READINESS-BFF",
      "RESEARCH-OPS-002-RESEARCH-FORMAL-READINESS-SURFACE",
    ],
  },
  {
    path: TASKS_DOC,
    markers: [
      "RESEARCH-OPS-001-RESEARCH-FORMAL-READINESS-BFF",
      "RESEARCH-OPS-002-RESEARCH-FORMAL-READINESS-SURFACE",
    ],
  },
  {
    path: LOOP_141_REPORT,
    markers: ["86/100", "Research module formal real-data/readiness", "three same-issue research optimization rounds"],
  },
]

const REQUIRED_SURFACE_ARTIFACT_MARKERS = [
  {
    path: SURFACE_SERVICE_PATH,
    markers: [
      "server-only",
      "buildResearchFormalReadinessSurface",
      "RESEARCH-OPS-002-RESEARCH-FORMAL-READINESS-SURFACE",
      "resourceFamilyCount",
      "blockedWriteOperations",
      "externalRegisterable: false",
      "launchLevelUpgradeClaimed",
    ],
  },
  {
    path: SURFACE_PAGE_PATH,
    markers: [
      "buildResearchFormalReadinessSurface",
      "Research formal readiness surface",
      "Current state split",
      "Future BFF path",
      "Resource-family readiness",
      "Blocked writes",
      "Agent and safety boundary",
      "No Research persistence",
      "external collaboration",
    ],
  },
  {
    path: RESEARCH_HUB_PAGE_PATH,
    markers: [
      "href=\"/research/readiness\"",
      "Research formal readiness",
      "Issue/Thread blocker",
      "proposal-only agent boundary",
    ],
  },
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
]

const FORBIDDEN_SURFACE_RUNTIME_PATTERNS = [
  ...FORBIDDEN_CONTRACT_PATTERNS,
  { label: "server action marker", pattern: /["']use server["']/ },
  { label: "schema migration marker", pattern: /\bprisma\s+migrate\b/ },
]

function parseArgs(argv) {
  const args = {
    json: false,
    out: null,
    help: false,
  }
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
  console.log("Validate the Personal OS Research formal readiness/read BFF contract")
  console.log("")
  console.log("Usage:")
  console.log("  pnpm research:readiness:check")
  console.log("  pnpm research:readiness:check -- --json")
  console.log(
    "  pnpm research:readiness:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json"
  )
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

function validateResourceFamilies(contents, errors) {
  for (const resourceFamily of REQUIRED_RESOURCE_FAMILIES) {
    if (!contents.includes(`id: "${resourceFamily}"`)) {
      addIssue(
        errors,
        "RESOURCE_FAMILY_MISSING",
        `Contract source is missing Research resource family: ${resourceFamily}`,
        CONTRACT_PATH
      )
    }
  }
}

function validateForbiddenMarkers(contents, errors) {
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
}

function validateForbiddenSurfaceRuntimeMarkers(contents, path, errors) {
  for (const item of FORBIDDEN_SURFACE_RUNTIME_PATTERNS) {
    const match = contents.match(item.pattern)
    if (match) {
      addIssue(
        errors,
        "FORBIDDEN_SURFACE_RUNTIME_MARKER",
        `Surface artifact contains ${item.label}.`,
        path,
        lineFor(contents, match[0])
      )
    }
  }
}

function validateBooleanFalseMarkers(contents, errors) {
  const falseMarkers = [
    "runtimeDbReadAllowed: false",
    "runtimeDbWriteAllowed: false",
    "schemaMigrationAllowed: false",
    "migrationApplyAllowed: false",
    "seedChangeAllowed: false",
    "routeHandlerAllowed: false",
    "serverActionWriteAllowed: false",
    "connectorRuntimeAllowed: false",
    "providerRuntimeAllowed: false",
    "publicOutputAllowed: false",
    "externalCollaborationAllowed: false",
    "agentFinalWriteAllowed: false",
    "externalRegisterable: false",
    "hiddenMockToFormalClaimAllowed: false",
    "launchLevelUpgradeClaimed: false",
  ]

  for (const marker of falseMarkers) {
    const count = (contents.match(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length
    if (count < 1) {
      addIssue(errors, "FALSE_SAFETY_MARKER_MISSING", `Expected safety marker: ${marker}`, CONTRACT_PATH)
    }
  }
}

async function validateSurfaceArtifacts(errors) {
  for (const artifact of REQUIRED_SURFACE_ARTIFACT_MARKERS) {
    if (!(await exists(artifact.path))) {
      addIssue(errors, "SURFACE_ARTIFACT_MISSING", `Surface artifact is missing: ${artifact.path}`, artifact.path)
      continue
    }

    const contents = await readText(artifact.path)
    validateMarkers(contents, artifact.markers, artifact.path, errors)

    if (artifact.path !== RESEARCH_HUB_PAGE_PATH) {
      validateForbiddenSurfaceRuntimeMarkers(contents, artifact.path, errors)
    }
  }
}

async function validateDocs(errors) {
  for (const doc of REQUIRED_DOC_MARKERS) {
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
  const surfaceServiceSource = (await exists(SURFACE_SERVICE_PATH)) ? await readText(SURFACE_SERVICE_PATH) : ""
  const surfacePageSource = (await exists(SURFACE_PAGE_PATH)) ? await readText(SURFACE_PAGE_PATH) : ""
  const hubPageSource = (await exists(RESEARCH_HUB_PAGE_PATH)) ? await readText(RESEARCH_HUB_PAGE_PATH) : ""

  validateMarkers(contractSource, REQUIRED_CONTRACT_MARKERS, CONTRACT_PATH, errors)
  validateResourceFamilies(contractSource, errors)
  validateBooleanFalseMarkers(contractSource, errors)
  validateForbiddenMarkers(contractSource, errors)
  await validateSurfaceArtifacts(errors)
  await validateDocs(errors)

  const proof = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    command: "pnpm research:readiness:check",
    taskId: "RESEARCH-OPS-002-RESEARCH-FORMAL-READINESS-SURFACE",
    status: errors.length === 0 ? "ready_for_research_formal_readiness_surface" : "blocked",
    contract: {
      path: CONTRACT_PATH,
      contractTaskId: "RESEARCH-OPS-001-RESEARCH-FORMAL-READINESS-BFF",
      acceptanceDoc: ACCEPTANCE_DOC,
      backlogDoc: BACKLOG_DOC,
      tasksDoc: TASKS_DOC,
      loop141ResearchReport: LOOP_141_REPORT,
      resourceFamilyCount: REQUIRED_RESOURCE_FAMILIES.length,
      futureBffPathPresent:
        contractSource.includes("Server Component loader") &&
        contractSource.includes("requireUser()") &&
        contractSource.includes("Research service authorization") &&
        contractSource.includes("Prisma or approved adapter") &&
        contractSource.includes("UI-safe DTO"),
      noHiddenMockToFormalClaim: contractSource.includes("hiddenMockToFormalClaimAllowed: false"),
      launchLevelUpgradeClaimed: false,
    },
    surface: {
      servicePath: SURFACE_SERVICE_PATH,
      pagePath: SURFACE_PAGE_PATH,
      hubPath: RESEARCH_HUB_PAGE_PATH,
      protectedRoute: "/research/readiness",
      resourceFamilySummaryPresent: surfacePageSource.includes("Resource-family readiness"),
      stateSplitPresent: surfacePageSource.includes("Current state split"),
      futureBffPathPresent: surfacePageSource.includes("Future BFF path"),
      blockedWritesPresent: surfacePageSource.includes("Blocked writes"),
      agentBoundaryPresent: surfacePageSource.includes("Agent and safety boundary"),
      hubEntryPresent: hubPageSource.includes("href=\"/research/readiness\""),
      serviceUsesContractOnly:
        surfaceServiceSource.includes("RESEARCH_FORMAL_READINESS_CONTRACT") &&
        !surfaceServiceSource.includes("@prisma/client") &&
        !surfaceServiceSource.includes("process.env"),
    },
    checks: {
      requiredMarkers: REQUIRED_CONTRACT_MARKERS.map((marker) => ({
        marker,
        present: contractSource.includes(marker),
      })),
      surfaceMarkers: REQUIRED_SURFACE_ARTIFACT_MARKERS.map((artifact) => ({
        path: artifact.path,
        markers: artifact.markers.map((marker) => ({
          marker,
          present:
            artifact.path === SURFACE_SERVICE_PATH
              ? surfaceServiceSource.includes(marker)
              : artifact.path === SURFACE_PAGE_PATH
                ? surfacePageSource.includes(marker)
                : hubPageSource.includes(marker),
        })),
      })),
      resourceFamilies: REQUIRED_RESOURCE_FAMILIES.map((resourceFamily) => ({
        resourceFamily,
        present: contractSource.includes(`id: "${resourceFamily}"`),
      })),
      forbiddenRuntimeMarkers: FORBIDDEN_CONTRACT_PATTERNS.map((item) => ({
        label: item.label,
        present: item.pattern.test(contractSource),
      })),
      forbiddenSurfaceRuntimeMarkers: FORBIDDEN_SURFACE_RUNTIME_PATTERNS.map((item) => ({
        label: item.label,
        servicePresent: item.pattern.test(surfaceServiceSource),
        pagePresent: item.pattern.test(surfacePageSource),
      })),
      referencedDocs: Object.fromEntries(
        await Promise.all(REQUIRED_DOC_MARKERS.map(async (doc) => [doc.path, await exists(doc.path)]))
      ),
    },
    safety: {
      readsEnv: false,
      connectsToDatabase: false,
      readsDatabase: false,
      writesDatabase: false,
      mutatesSchema: false,
      appliesMigration: false,
      changesSeedData: false,
      addsRouteHandler: false,
      addsServerActionWrite: false,
      callsProvider: false,
      callsNetwork: false,
      expandsPublicOutput: false,
      enablesExternalCollaboration: false,
      enablesAgentFinalWrites: false,
      externalRegisterable: false,
      launchLevelUpgradeClaimed: false,
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
      `Research formal readiness surface ready: ${proof.contract.resourceFamilyCount} resource families, protected UI surface present, no runtime/write markers.`
    )
  } else {
    console.error(`Research formal readiness surface blocked with ${proof.errors.length} issue(s):`)
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
