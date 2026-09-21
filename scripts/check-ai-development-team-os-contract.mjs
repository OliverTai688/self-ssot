#!/usr/bin/env node

import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

const CONTRACT_PATH = "src/lib/contracts/ai-development-team-os.contract.ts"
const ARC_034_DOC = "docs/02_architecture-and-rules/ARC-034_ai-development-team-os-contract.md"
const RES_023_DOC = "docs/07_research-and-design/RES-023_ai-development-team-os-structural-research.md"
const RES_024_DOC = "docs/07_research-and-design/RES-024_shared-team-os-trust-plane-and-independent-ai-development-team-interface-research.md"
const RES_025_DOC = "docs/07_research-and-design/RES-025_github-reference-repositories-for-ai-development-team-os-research.md"

// 20 Core required terms that must exist in both contract and docs
const CORE_TERMS = [
  "SharedAgentTrustPlane",
  "ConversationConsentContext",
  "DevelopmentExecutionContext",
  "IndependentAIDevelopmentTeamInterface",
  "CrossContextAccessRequest",
  "ContextPackageManifest",
  "DecisionRuleScope",
  "AuditEvidenceEnvelope",
  "ExternalRegistrationGate",
  "RuntimeApprovalGate",
  "DevTeamTask",
  "DevAgentRole",
  "DevAgentAssignment",
  "DevContextRequest",
  "DevWorktreeSession",
  "CodingAgentAdapterPolicy",
  "DevRunEvidence",
  "DevReviewDecision",
  "DevExperienceMemory",
  "DevSkillCandidate"
]

// Mandatory safety markers representing Zeroth Trust compliance
const SAFETY_MARKERS = [
  "publicEndpointCreated: false",
  "routeHandlerCreated: false",
  "serverActionCreated: false",
  "databaseRead: false",
  "databaseWrite: false",
  "providerCall: false",
  "externalRuntimeEnabled: false",
  "externalRegistryWrite: false",
  "autonomousExecution: false",
  "highRiskFinalWrite: false",
  "persistedAuditNow: false",
  "externalAgentDatabaseAccess: false"
]

// Forbidden runtime/side-effect patterns in static contracts
const FORBIDDEN_PATTERNS = [
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
]

function repoPath(relativePath) {
  return resolve(process.cwd(), relativePath)
}

async function readText(relativePath) {
  return readFile(repoPath(relativePath), "utf8")
}

function lineFor(contents, token) {
  const lines = contents.split(/\r?\n/)
  const index = lines.findIndex((line) => line.includes(token))
  return index === -1 ? null : index + 1
}

async function runCheck() {
  const errors = []
  console.log(`[CHECK] Validating AI Development Team OS Contract at ${CONTRACT_PATH}...`)

  let contractSource
  try {
    contractSource = await readText(CONTRACT_PATH)
  } catch (error) {
    errors.push({ code: "FILE_MISSING", message: `Contract file missing: ${error.message}` })
    console.error(errors)
    process.exit(1)
  }

  // 1. Verify 20 core concepts
  for (const term of CORE_TERMS) {
    if (!contractSource.includes(term)) {
      errors.push({
        code: "CORE_TERM_MISSING",
        message: `Contract is missing core definition: ${term}`,
        path: CONTRACT_PATH
      })
    }
  }

  // 2. Verify safety markers
  for (const marker of SAFETY_MARKERS) {
    if (!contractSource.includes(marker)) {
      errors.push({
        code: "SAFETY_MARKER_MISSING",
        message: `Contract is missing safety invariant: ${marker}`,
        path: CONTRACT_PATH
      })
    }
  }

  // 3. Verify forbidden markers are absent
  for (const item of FORBIDDEN_PATTERNS) {
    const match = contractSource.match(item.pattern)
    if (match) {
      errors.push({
        code: "FORBIDDEN_RUNTIME_MARKER",
        message: `Contract contains forbidden marker: ${item.label}`,
        path: CONTRACT_PATH,
        line: lineFor(contractSource, match[0])
      })
    }
  }

  // 4. Verify ARC-034 file existence and markers
  console.log(`[CHECK] Validating documentation linkage...`)
  let arcDocSource
  try {
    arcDocSource = await readText(ARC_034_DOC)
  } catch (error) {
    errors.push({ code: "DOC_MISSING", message: `Architecture doc missing at ${ARC_034_DOC}: ${error.message}` })
  }

  if (arcDocSource) {
    for (const term of CORE_TERMS) {
      if (!arcDocSource.includes(term)) {
        errors.push({
          code: "DOC_TERM_MISSING",
          message: `Architecture doc ${ARC_034_DOC} is missing core concept reference: ${term}`,
          path: ARC_034_DOC
        })
      }
    }
  }

  // 5. Verify background research doc references exist
  const docsToCheck = [RES_023_DOC, RES_024_DOC, RES_025_DOC]
  for (const doc of docsToCheck) {
    try {
      await readText(doc)
    } catch {
      errors.push({ code: "DOC_REF_MISSING", message: `Required research reference document missing: ${doc}` })
    }
  }

  // Output results
  if (errors.length > 0) {
    console.error(`\n[FAIL] Validation failed with ${errors.length} errors:`)
    console.error(JSON.stringify(errors, null, 2))
    process.exit(1)
  } else {
    console.log("\n[PASS] AI Development Team OS contract validation succeeded!")
    console.log(`- 20/20 Core Terms validated.`)
    console.log(`- 12/12 Safety Markers validated.`)
    console.log(`- Forbidden runtime side-effect scan clean.`)
    console.log(`- Documentation cross-links intact.`)
    process.exit(0)
  }
}

runCheck()
