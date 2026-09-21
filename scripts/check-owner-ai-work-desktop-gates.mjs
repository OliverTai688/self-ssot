#!/usr/bin/env node

import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"

const ROOT = process.cwd()
const CONTRACT_ID = "OWNEROS-GATE-001"
const GATE_STATE_PATH = "docs/2_agent-input/generated/agent-loop/gates/owner-ai-work-desktop-gate-state.json"
const LOOP_STATE_PATH = "docs/2_agent-input/generated/agent-loop/loop-state.json"
const CONTRACT_PATH = "src/lib/contracts/owner-ai-work-desktop-gate.contract.ts"
const PACKAGE_PATH = "package.json"
const PROMPT_PATH = "docs/2_agent-input/generated/agent-loop/prompts/owner-ai-work-desktop-gate-loop.md"
const RPT_062_PATH =
  "docs/06_audits-and-reports/RPT-062_scenario-system-contraction-and-internal-sharing-gap-audit.md"
const PLN_067_PATH =
  "docs/05_execution-plans/PLN-067_owner-ai-work-desktop-and-company-sharing-contraction-plan.md"
const ACC_002_PATH = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"

const GATES = {
  gateA: {
    key: "gateA",
    id: "OWNER_PRIVATE_AI_WORK_DESKTOP_READY",
    label: "Gate A",
    criteria: [
      "A1_REAL_GOOGLE_OWNER_AUTH",
      "A2_DURABLE_AUTHORIZED_CHAT_CONTEXT",
      "A3_R2_FILE_LIBRARY_MULTI_CONTEXT",
      "A4_WORK_RESEARCH_COMPANY_REAL_OWNER_PATHS",
      "A5_INBOX_FREE_TEXT_RETURN_PATH",
      "A6_AGENT_DIARY_AND_SKILL_CANDIDATE",
      "A7_LINE_DRIVE_GMAIL_OWNER_PROOF",
      "A8_PRIVATE_DEPLOYED_NO_MOCK_CORE_PROOF",
    ],
  },
  gateB: {
    key: "gateB",
    id: "COMPANY_TEAM_PILOT_READY",
    label: "Gate B",
    criteria: [
      "B1_INVITED_MEMBER_ONBOARDING_AND_OFFBOARDING",
      "B2_SHARED_WORK_ROLE_ENFORCEMENT",
      "B3_VISIBILITY_AND_CLEVEL_NEGATIVE_PROOF",
      "B4_INTERNAL_AI_PUBLIC_SPACE",
      "B5_AUTHORIZED_MEMBER_AGENT_SUMMARIES",
      "B6_OWNER_PLUS_ALL_ACTIVE_MEMBERS_MIN_ONE_NON_OWNER_PILOT",
    ],
  },
  gateC: {
    key: "gateC",
    id: "HARDENED_INTERNAL_ROLLOUT_READY",
    label: "Gate C",
    criteria: [
      "C1_MIGRATION_AND_RECOVERY",
      "C2_OPERATIONS_AND_PROVIDER_FAILURE",
      "C3_AUDIT_RETENTION_REVOCATION",
      "C4_ADVERSARIAL_ISOLATION",
      "C5_CORE_JOURNEY_UI_HARDENING",
      "C6_PILOT_FINDINGS_CLOSED",
    ],
  },
}

const PROHIBITED_EVIDENCE_KINDS = new Set([
  "mock",
  "static",
  "proposal_only",
  "conditional",
  "stale",
  "manual_review_only",
  "single_happy_path_only",
])

const REQUIRED_PACKET_FIELDS = [
  "gate.id",
  "gate.status",
  "targetEnvironment",
  "authMode",
  "testedCommit",
  "deployedCommit",
  "freshness",
  "mockFallbackUsed",
  "runtimeEvidencePresent",
  "ownerEvidencePresent",
  "individualChecks",
  "blockingIds",
  "reportPath",
  "reportSha256",
]

function parseArgs(argv) {
  const args = {
    gate: "gateA",
    out: null,
    allowIncomplete: false,
  }
  const filtered = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filtered.length; index += 1) {
    const arg = filtered[index]
    if (arg === "--gate") {
      args.gate = normalizeGateArg(filtered[index + 1])
      index += 1
      continue
    }
    if (arg === "--json") {
      continue
    }
    if (arg === "--out") {
      args.out = filtered[index + 1] ?? null
      index += 1
      continue
    }
    if (arg === "--allow-incomplete") {
      args.allowIncomplete = true
      continue
    }
    if (arg === "--help" || arg === "-h") {
      printHelp()
      process.exit(0)
    }
  }

  return args
}

function normalizeGateArg(raw) {
  if (!raw) return "gateA"
  const value = raw.toLowerCase()
  if (value === "a" || value === "gatea") return "gateA"
  if (value === "b" || value === "gateb") return "gateB"
  if (value === "c" || value === "gatec") return "gateC"
  if (value === "all") return "all"
  throw new Error(`Unknown gate "${raw}". Use a, b, c, or all.`)
}

function printHelp() {
  console.log(
    [
      "Usage: pnpm gate:a:check [-- --allow-incomplete] [-- --out <path>]",
      "       node scripts/check-owner-ai-work-desktop-gates.mjs --gate a|b|c|all",
      "",
      "Emits no-secret JSON. Exit 0 only when the selected gate is fully achieved,",
      "unless --allow-incomplete is supplied for evidence capture.",
    ].join("\n"),
  )
}

function readText(relativePath) {
  const absolutePath = path.join(ROOT, relativePath)
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : null
}

function readJson(relativePath, fallback) {
  const text = readText(relativePath)
  if (!text) return fallback
  try {
    return JSON.parse(text)
  } catch (error) {
    return {
      ...fallback,
      __parseError: error instanceof Error ? error.message : String(error),
    }
  }
}

function fileHash(relativePath) {
  const text = readText(relativePath)
  if (!text) return null
  return crypto.createHash("sha256").update(text).digest("hex")
}

function getCurrentCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    return null
  }
}

function safeEnvValue(name, fallback) {
  const raw = process.env[name]
  if (!raw) return fallback
  if (/https?:\/\//i.test(raw) || /[?=&]/.test(raw) || raw.length > 80) {
    return "[configured-redacted]"
  }
  return raw
}

function normalizeEvidence(raw, criterionId) {
  if (typeof raw === "string") {
    return {
      criterionId: raw,
      status: "BLOCKED",
      kind: "legacy_string",
      recordedAt: null,
      expiresAt: null,
      testedCommit: null,
      deployedCommit: null,
      runtimeEvidence: false,
      ownerEvidence: false,
      negativeEvidence: false,
      mockFallbackUsed: false,
      reportPath: null,
      reportSha256: null,
    }
  }

  if (!raw || typeof raw !== "object") {
    return {
      criterionId,
      status: "BLOCKED",
      kind: "unknown",
      recordedAt: null,
      expiresAt: null,
      testedCommit: null,
      deployedCommit: null,
      runtimeEvidence: false,
      ownerEvidence: false,
      negativeEvidence: false,
      mockFallbackUsed: false,
      reportPath: null,
      reportSha256: null,
    }
  }

  return {
    criterionId: String(raw.criterionId ?? raw.id ?? criterionId),
    status: String(raw.status ?? "BLOCKED").toUpperCase(),
    kind: String(raw.kind ?? raw.evidenceKind ?? "unknown"),
    recordedAt: raw.recordedAt ?? raw.generatedAt ?? null,
    expiresAt: raw.expiresAt ?? null,
    testedCommit: raw.testedCommit ?? raw.commit ?? null,
    deployedCommit: raw.deployedCommit ?? null,
    runtimeEvidence: raw.runtimeEvidence === true || raw.runtimeEvidencePresent === true,
    ownerEvidence: raw.ownerEvidence === true || raw.ownerEvidencePresent === true,
    negativeEvidence: raw.negativeEvidence === true || raw.negativeEvidencePresent === true,
    mockFallbackUsed: raw.mockFallbackUsed === true,
    reportPath: raw.reportPath ?? null,
    reportSha256: raw.reportSha256 ?? null,
  }
}

function isFresh(record, now) {
  if (!record.recordedAt) return false
  const recordedAt = Date.parse(record.recordedAt)
  if (!Number.isFinite(recordedAt)) return false
  if (now.getTime() - recordedAt > 72 * 60 * 60 * 1000) return false
  if (record.expiresAt) {
    const expiresAt = Date.parse(record.expiresAt)
    if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) return false
  }
  return true
}

function classifyCriterion({ criterionId, records, currentCommit, now, gateKey }) {
  const matches = records.filter((record) => record.criterionId === criterionId)
  const blockingIds = []

  if (matches.length === 0) {
    blockingIds.push(`${criterionId}_EVIDENCE_MISSING`)
  }

  let selected = matches.find((record) => record.status === "PASS") ?? matches[0] ?? null
  if (!selected) {
    selected = normalizeEvidence(null, criterionId)
  }

  const hasValidPass = matches.some((record) => {
    const localBlockers = buildRecordBlockers({ criterionId, record, currentCommit, now, gateKey })
    return localBlockers.length === 0
  })

  if (!hasValidPass && matches.length > 0) {
    blockingIds.push(...buildRecordBlockers({ criterionId, record: selected, currentCommit, now, gateKey }))
  }

  return {
    id: criterionId,
    status: hasValidPass ? "PASS" : "BLOCKED",
    evidenceKind: selected.kind,
    blockingIds,
    reportPath: selected.reportPath,
    reportSha256: selected.reportSha256,
  }
}

function buildRecordBlockers({ criterionId, record, currentCommit, now, gateKey }) {
  const blockers = []
  if (record.status !== "PASS") blockers.push(`${criterionId}_NOT_PASS`)
  if (PROHIBITED_EVIDENCE_KINDS.has(record.kind)) {
    blockers.push(`${criterionId}_PROHIBITED_${record.kind.toUpperCase()}`)
  }
  if (!isFresh(record, now)) blockers.push(`${criterionId}_STALE_OR_UNDATED`)
  if (!record.runtimeEvidence) blockers.push(`${criterionId}_RUNTIME_EVIDENCE_MISSING`)
  if (!record.ownerEvidence) blockers.push(`${criterionId}_OWNER_EVIDENCE_MISSING`)
  if (!record.negativeEvidence) blockers.push(`${criterionId}_NEGATIVE_EVIDENCE_MISSING`)
  if (record.mockFallbackUsed) blockers.push(`${criterionId}_MOCK_FALLBACK_USED`)
  if (!record.reportPath) blockers.push(`${criterionId}_REPORT_PATH_MISSING`)
  if (!record.reportSha256) blockers.push(`${criterionId}_REPORT_SHA256_MISSING`)
  if (currentCommit && record.testedCommit && record.testedCommit !== currentCommit) {
    blockers.push(`${criterionId}_COMMIT_MISMATCH`)
  }
  if (gateKey === "gateA" && !record.deployedCommit) {
    blockers.push(`${criterionId}_DEPLOYED_COMMIT_MISSING`)
  }
  return blockers
}

function validateStaticContract({ packageText, contractText, promptText, accText }) {
  const blockers = []

  const requiredPackageMarkers = [
    "gate:a:check",
    "gate:b:check",
    "gate:c:check",
    "check-owner-ai-work-desktop-gates.mjs",
  ]
  for (const marker of requiredPackageMarkers) {
    if (!packageText?.includes(marker)) blockers.push(`STATIC_PACKAGE_MARKER_MISSING_${marker}`)
  }

  const requiredContractMarkers = [
    "OWNEROS-GATE-001",
    "OWNER_AI_WORK_DESKTOP_GATE_CRITERIA",
    "OWNER_AI_WORK_DESKTOP_PROHIBITED_EVIDENCE_KINDS",
    "OWNER_AI_WORK_DESKTOP_REQUIRED_PROOF_FIELDS",
    "externalRegisterable: false",
  ]
  for (const marker of requiredContractMarkers) {
    if (!contractText?.includes(marker)) blockers.push(`STATIC_CONTRACT_MARKER_MISSING_${marker}`)
  }

  for (const marker of ["pnpm gate:a:check", "Gate A", "Gmail", "attachment"]) {
    if (!promptText?.includes(marker)) blockers.push(`STATIC_PROMPT_MARKER_MISSING_${marker}`)
  }

  for (const marker of ["OWNEROS-GATE-001", "pnpm gate:a:check", "static/docs/readiness evidence alone cannot pass"]) {
    if (!accText?.includes(marker)) blockers.push(`STATIC_ACCEPTANCE_MARKER_MISSING_${marker}`)
  }

  return blockers
}

function buildGatePacket({ gateKey, gateState, loopState, currentCommit, now }) {
  const gateDefinition = GATES[gateKey]
  const stateGate = gateState?.gates?.[gateKey] ?? {}
  const records = Array.isArray(stateGate.evidence)
    ? stateGate.evidence.map((record) => normalizeEvidence(record, "UNKNOWN"))
    : []
  const checks = gateDefinition.criteria.map((criterionId) =>
    classifyCriterion({ criterionId, records, currentCommit, now, gateKey }),
  )

  const staticBlockers = validateStaticContract({
    packageText: readText(PACKAGE_PATH),
    contractText: readText(CONTRACT_PATH),
    promptText: readText(PROMPT_PATH),
    accText: readText(ACC_002_PATH),
  })

  const blockingIds = [...checks.flatMap((check) => check.blockingIds), ...staticBlockers]

  if (gateState?.__parseError) blockingIds.push("GATE_STATE_JSON_PARSE_FAILED")
  if (loopState?.__parseError) blockingIds.push("LOOP_STATE_JSON_PARSE_FAILED")
  if (stateGate.status !== "ACHIEVED") blockingIds.push(`${gateDefinition.id}_STATE_NOT_ACHIEVED`)
  if (!stateGate.reportPath) blockingIds.push(`${gateDefinition.id}_REPORT_PATH_MISSING`)
  if (gateKey === "gateA" && !safeEnvValue("PERSONAL_OS_DEPLOYED_COMMIT", null)) {
    blockingIds.push("GATE_A_DEPLOYED_COMMIT_ENV_MISSING")
  }
  if (gateKey === "gateA" && loopState?.launchLevels?.current !== "L1_PRIVATE_ONLINE_WORK_OS") {
    blockingIds.push("GATE_A_FORMAL_L1_NOT_RECORDED")
  }

  const uniqueBlockingIds = Array.from(new Set(blockingIds)).sort()
  const staleCriterionIds = checks
    .filter((check) => check.blockingIds.some((id) => id.endsWith("_STALE_OR_UNDATED")))
    .map((check) => check.id)

  return {
    id: CONTRACT_ID,
    generatedAt: now.toISOString(),
    gate: {
      key: gateDefinition.key,
      id: gateDefinition.id,
      label: gateDefinition.label,
      status: uniqueBlockingIds.length === 0 ? "ACHIEVED" : "NOT_ACHIEVED",
      stateStatus: stateGate.status ?? "UNKNOWN",
    },
    targetEnvironment: safeEnvValue("PERSONAL_OS_GATE_TARGET_ENV", safeEnvValue("VERCEL_ENV", "local")),
    authMode: safeEnvValue("PERSONAL_OS_AUTH_MODE", "unspecified"),
    testedCommit: currentCommit,
    deployedCommit: safeEnvValue("PERSONAL_OS_DEPLOYED_COMMIT", null),
    freshness: {
      status: staleCriterionIds.length === 0 && checks.some((check) => check.status === "PASS") ? "fresh" : "blocked",
      maxAgeHours: 72,
      staleCriterionIds,
    },
    mockFallbackUsed: records.some((record) => record.mockFallbackUsed || record.kind === "mock"),
    runtimeEvidencePresent: records.some((record) => record.runtimeEvidence),
    ownerEvidencePresent: records.some((record) => record.ownerEvidence),
    individualChecks: checks,
    blockingIds: uniqueBlockingIds,
    reportPath: stateGate.reportPath ?? null,
    reportSha256: stateGate.reportSha256 ?? null,
    documents: {
      gateState: GATE_STATE_PATH,
      loopState: LOOP_STATE_PATH,
      prompt: PROMPT_PATH,
      scenarioAudit: RPT_062_PATH,
      plan: PLN_067_PATH,
      acceptance: ACC_002_PATH,
      contract: CONTRACT_PATH,
      contractSha256: fileHash(CONTRACT_PATH),
    },
    requiredProofFields: REQUIRED_PACKET_FIELDS,
    safety: {
      printsSecrets: false,
      mutatesDatabase: false,
      mutatesProvider: false,
      sendsEmail: false,
      gmailSendAttempted: false,
      publicOutputEnabled: false,
      externalAgentDatabaseAccess: false,
      externalRegisterable: false,
    },
  }
}

function buildPayload(args) {
  const gateState = readJson(GATE_STATE_PATH, {})
  const loopState = readJson(LOOP_STATE_PATH, {})
  const currentCommit = getCurrentCommit()
  const now = new Date()
  const selectedGateKeys = args.gate === "all" ? ["gateA", "gateB", "gateC"] : [args.gate]
  const gates = selectedGateKeys.map((gateKey) =>
    buildGatePacket({ gateKey, gateState, loopState, currentCommit, now }),
  )
  const allBlockingIds = Array.from(new Set(gates.flatMap((gate) => gate.blockingIds))).sort()

  if (gates.length === 1) {
    return gates[0]
  }

  return {
    id: CONTRACT_ID,
    generatedAt: now.toISOString(),
    gate: {
      key: "all",
      id: "OWNER_AI_WORK_DESKTOP_ALL_GATES",
      label: "Gate A/B/C",
      status: allBlockingIds.length === 0 ? "ACHIEVED" : "NOT_ACHIEVED",
    },
    targetEnvironment: gates[0]?.targetEnvironment ?? "local",
    authMode: gates[0]?.authMode ?? "unspecified",
    testedCommit: currentCommit,
    deployedCommit: gates[0]?.deployedCommit ?? null,
    freshness: {
      status: allBlockingIds.length === 0 ? "fresh" : "blocked",
      maxAgeHours: 72,
      staleCriterionIds: gates.flatMap((gate) => gate.freshness.staleCriterionIds),
    },
    mockFallbackUsed: gates.some((gate) => gate.mockFallbackUsed),
    runtimeEvidencePresent: gates.some((gate) => gate.runtimeEvidencePresent),
    ownerEvidencePresent: gates.some((gate) => gate.ownerEvidencePresent),
    individualChecks: gates.flatMap((gate) => gate.individualChecks),
    blockingIds: allBlockingIds,
    reportPath: null,
    reportSha256: null,
    gates,
    requiredProofFields: REQUIRED_PACKET_FIELDS,
    safety: {
      printsSecrets: false,
      mutatesDatabase: false,
      mutatesProvider: false,
      sendsEmail: false,
      gmailSendAttempted: false,
      publicOutputEnabled: false,
      externalAgentDatabaseAccess: false,
      externalRegisterable: false,
    },
  }
}

function writeOut(relativePath, payload) {
  const absolutePath = path.join(ROOT, relativePath)
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
  fs.writeFileSync(absolutePath, `${JSON.stringify(payload, null, 2)}\n`)
}

const args = parseArgs(process.argv.slice(2))
const payload = buildPayload(args)
const complete = payload.gate.status === "ACHIEVED"

if (args.out) {
  writeOut(args.out, payload)
}

console.log(JSON.stringify(payload, null, 2))

process.exit(complete || args.allowIncomplete ? 0 : 1)
