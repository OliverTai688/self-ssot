#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

const DEFAULT_OUT = "docs/2_agent-input/generated/agent-loop/auth-session-proof/latest-auth-session-proof.json"
const STATUS_PATH = "/auth/status"
const KNOWN_AUTH_STATUSES = new Set([
  "authenticated",
  "mock_profile_missing",
  "supabase_config_missing",
  "supabase_session_missing",
  "supabase_profile_missing",
  "auth_check_failed",
])

function parseArgs(argv) {
  const args = {
    out: DEFAULT_OUT,
    statusJson: null,
    statusUrl: null,
  }
  const filteredArgs = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filteredArgs.length; index += 1) {
    const arg = filteredArgs[index]

    if (arg === "--out") {
      const value = filteredArgs[index + 1]
      if (!value || value.startsWith("--")) {
        throw new Error("--out requires a file path")
      }
      args.out = value
      index += 1
    } else if (arg === "--status-json") {
      const value = filteredArgs[index + 1]
      if (!value || value.startsWith("--")) {
        throw new Error("--status-json requires a file path")
      }
      args.statusJson = value
      index += 1
    } else if (arg === "--status-url") {
      const value = filteredArgs[index + 1]
      if (!value || value.startsWith("--")) {
        throw new Error("--status-url requires an /auth/status URL")
      }
      args.statusUrl = value
      index += 1
    } else if (arg === "--help" || arg === "-h") {
      args.help = true
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (args.statusJson && args.statusUrl) {
    throw new Error("Use either --status-json or --status-url, not both")
  }

  return args
}

function printHelp() {
  console.log("Collect no-secret Personal OS Supabase session proof")
  console.log("")
  console.log("Usage:")
  console.log("  pnpm auth:proof")
  console.log("  pnpm auth:proof -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json")
  console.log("  pnpm auth:proof -- --status-url https://app.example.com/auth/status")
  console.log("  pnpm auth:proof -- --status-url https://app.example.com/auth/status?proof=1")
  console.log("  pnpm auth:proof -- --status-json docs/2_agent-input/generated/agent-loop/reports/<auth-status>.json")
}

function runReadinessCheck() {
  const result = spawnSync(process.execPath, ["scripts/check-launch-readiness.mjs", "--json"], {
    cwd: process.cwd(),
    encoding: "utf8",
  })

  if (result.error) throw result.error

  if (result.status !== 0) {
    throw new Error(`launch readiness check failed with exit code ${result.status}`)
  }

  try {
    return JSON.parse(result.stdout)
  } catch (error) {
    throw new Error(`launch readiness check did not return valid JSON: ${error.message}`)
  }
}

function classifyUrl(url) {
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"])
  return localHosts.has(url.hostname.toLowerCase()) ? "local" : "remote"
}

function parseStatusUrl(value) {
  let url

  try {
    url = new URL(value)
  } catch {
    throw new Error("--status-url must be a valid http(s) URL")
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("--status-url must use http or https")
  }

  if (url.pathname !== STATUS_PATH) {
    throw new Error(`--status-url must point to ${STATUS_PATH}`)
  }

  return url
}

function safeEnum(value, allowed, fallback = "unknown") {
  return allowed.has(value) ? value : fallback
}

function summarizeStatusPayload(payload, source, metadata = {}) {
  const authStatus = safeEnum(payload?.authStatus, KNOWN_AUTH_STATUSES)
  const authMode = safeEnum(payload?.authMode, new Set(["mock", "supabase"]))
  const publicConfig = safeEnum(payload?.supabasePublicConfig, new Set(["configured", "missing"]))
  const ownerScopedProjectCount = payload?.work?.ownerScopedProjectCount
  const hasOwnerScopedProjectCount =
    Number.isInteger(ownerScopedProjectCount) && ownerScopedProjectCount >= 0
  const rawEmailPresent =
    typeof payload?.profile?.email === "string" && payload.profile.email.includes("@")
  const redactedEmailPresent = payload?.profile?.emailPresent === true

  return {
    source,
    provided: true,
    parseable: true,
    httpStatus: metadata.httpStatus ?? null,
    urlClass: metadata.urlClass ?? null,
    authenticated: payload?.authenticated === true,
    authMode,
    supabasePublicConfig: publicConfig,
    authStatus,
    profile: payload?.profile
      ? {
          emailPresent: rawEmailPresent || redactedEmailPresent,
          role: typeof payload.profile.role === "string" ? payload.profile.role : "unknown",
        }
      : null,
    work: payload?.work
      ? {
          ownerScopedProjectCountPresent: hasOwnerScopedProjectCount,
          ownerScopedProjectCount: hasOwnerScopedProjectCount ? ownerScopedProjectCount : null,
          ownerScope: payload.work.ownerScope === "profile" ? "profile" : "unknown",
        }
      : null,
    nextAction: typeof payload?.nextAction === "string" ? payload.nextAction : null,
  }
}

function missingStatusEvidence() {
  return {
    source: "not_provided",
    provided: false,
    parseable: false,
    httpStatus: null,
    urlClass: null,
    authenticated: false,
    authMode: "unknown",
    supabasePublicConfig: "unknown",
    authStatus: "unknown",
    profile: null,
    work: null,
    nextAction: "Run /auth/status from a signed-in browser session and provide sanitized JSON evidence.",
  }
}

function failedStatusEvidence(source, reason, metadata = {}) {
  return {
    source,
    provided: true,
    parseable: false,
    httpStatus: metadata.httpStatus ?? null,
    urlClass: metadata.urlClass ?? null,
    authenticated: false,
    authMode: "unknown",
    supabasePublicConfig: "unknown",
    authStatus: "unknown",
    profile: null,
    work: null,
    failureReason: reason,
    nextAction: "Recollect /auth/status?proof=1 as JSON without including cookies, tokens, raw claims, raw email, or provider payloads.",
  }
}

function readStatusJson(path) {
  try {
    const payload = JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"))
    return summarizeStatusPayload(payload, "status_json")
  } catch {
    return failedStatusEvidence("status_json", "STATUS_JSON_UNREADABLE_OR_INVALID")
  }
}

async function fetchStatusUrl(value) {
  const url = parseStatusUrl(value)
  const urlClass = classifyUrl(url)

  try {
    const response = await fetch(url, {
      redirect: "manual",
      headers: { Accept: "application/json" },
    })
    const text = await response.text()

    try {
      const payload = JSON.parse(text)
      return summarizeStatusPayload(payload, "status_url", {
        httpStatus: response.status,
        urlClass,
      })
    } catch {
      return failedStatusEvidence("status_url", "STATUS_URL_RESPONSE_NOT_JSON", {
        httpStatus: response.status,
        urlClass,
      })
    }
  } catch {
    return failedStatusEvidence("status_url", "STATUS_URL_FETCH_FAILED", { urlClass })
  }
}

async function collectStatusEvidence(args) {
  if (args.statusJson) return readStatusJson(args.statusJson)
  if (args.statusUrl) return fetchStatusUrl(args.statusUrl)
  return missingStatusEvidence()
}

function buildProof(readiness, statusEvidence) {
  const readinessBlockedLabels = readiness.rows
    .filter((row) => row.status === "blocked")
    .map((row) => row.label)
  const readinessWarnLabels = readiness.rows
    .filter((row) => row.status === "warn")
    .map((row) => row.label)

  const launchAuthPrereqsReady =
    readiness.checks.supabasePublicUrlPresent &&
    readiness.checks.supabasePublishableOrAnonKeyPresent &&
    readiness.checks.effectiveAuthMode === "supabase"

  const authStatusReady =
    statusEvidence.parseable &&
    statusEvidence.authenticated &&
    statusEvidence.authMode === "supabase" &&
    statusEvidence.supabasePublicConfig === "configured" &&
    statusEvidence.authStatus === "authenticated" &&
    statusEvidence.profile?.emailPresent === true &&
    statusEvidence.work?.ownerScopedProjectCountPresent === true &&
    statusEvidence.work?.ownerScope === "profile"

  const canRunAuth005 = launchAuthPrereqsReady && authStatusReady
  const blockedLabels = [...readinessBlockedLabels]

  if (!statusEvidence.provided) {
    blockedLabels.push("Auth status evidence")
  } else if (!statusEvidence.parseable) {
    blockedLabels.push("Auth status evidence parse")
  } else if (!statusEvidence.authenticated) {
    blockedLabels.push(`Auth status ${statusEvidence.authStatus}`)
  } else if (!authStatusReady) {
    blockedLabels.push("Auth status mapping incomplete")
  }

  const canProceedToWork007 =
    canRunAuth005 &&
    readiness.checks.databaseUrlPresent &&
    readiness.checks.databaseUrlParseable &&
    readiness.checks.databaseHostResolves

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceCommands: {
      readiness: "pnpm launch:check --json",
      authStatus: statusEvidence.source,
    },
    secretPolicy: {
      printsSecrets: false,
      excludedValues: [
        "Supabase URLs",
        "Supabase publishable or anon keys",
        "database URLs",
        "database hosts",
        "cookies",
        "tokens",
        "raw auth claims",
        "raw provider payloads",
        "profile IDs",
        "actual profile email values",
        "raw profile email values",
      ],
    },
    readiness,
    authStatusEvidence: statusEvidence,
    proofSummary: {
      overallStatus: canRunAuth005 ? "ready" : "blocked",
      launchAuthPrereqsReady,
      authStatusReady,
      canRunAuth005,
      canProceedToWork007,
      blockedLabels: [...new Set(blockedLabels)],
      warnLabels: readinessWarnLabels,
      expectedAuth005State: canRunAuth005 ? "READY_TO_RUN" : "BLOCKED_OR_SESSION_EVIDENCE_REQUIRED",
      nextAction: canRunAuth005
        ? "Record AUTH-005 with the signed-in browser session, then run Work owner smoke."
        : statusEvidence.nextAction ?? "Resolve blocked labels, then rerun auth proof.",
    },
    nextActions: [...new Set([...readiness.nextActions, statusEvidence.nextAction].filter(Boolean))],
  }
}

function writeOut(path, payload) {
  const outPath = resolve(process.cwd(), path)
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`)
}

function printHuman(args, proof) {
  console.log(`Auth session proof written: ${args.out}`)
  console.log(`Overall: ${proof.proofSummary.overallStatus}`)
  console.log(`Can run AUTH-005: ${proof.proofSummary.canRunAuth005}`)
  console.log(`Auth status evidence: ${proof.authStatusEvidence.source}`)
  console.log(`Blocked: ${proof.proofSummary.blockedLabels.join(", ") || "none"}`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    printHelp()
    return
  }

  const readiness = runReadinessCheck()
  const statusEvidence = await collectStatusEvidence(args)
  const proof = buildProof(readiness, statusEvidence)

  writeOut(args.out, proof)
  printHuman(args, proof)
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
