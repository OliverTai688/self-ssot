#!/usr/bin/env node

import { lookup } from "node:dns/promises"
import { config } from "dotenv"

config({ path: ".env.local", quiet: true })
config({ path: ".env", quiet: true })

const args = new Set(process.argv.slice(2).filter((arg) => arg !== "--"))
const strict = args.has("--strict")
const json = args.has("--json")

const has = (name) => Boolean(process.env[name])

function requestedAuthMode() {
  return process.env.PERSONAL_OS_AUTH_MODE === "mock" ? "mock" : "supabase"
}

function effectiveAuthMode() {
  if (requestedAuthMode() === "mock" && process.env.NODE_ENV !== "production") {
    return "mock"
  }

  return "supabase"
}

function parseUrl(value) {
  if (!value) return { present: false, hostPresent: false, valid: false }

  try {
    const url = new URL(value)
    return {
      present: true,
      hostPresent: Boolean(url.hostname),
      valid: true,
      hostname: url.hostname,
    }
  } catch {
    return { present: true, hostPresent: false, valid: false }
  }
}

async function checkDns(hostname) {
  if (!hostname) {
    return { checked: false, resolves: false, errorCode: "NO_HOST" }
  }

  try {
    await lookup(hostname)
    return { checked: true, resolves: true, errorCode: null }
  } catch (error) {
    return {
      checked: true,
      resolves: false,
      errorCode: error?.code ?? "DNS_LOOKUP_FAILED",
    }
  }
}

function row(status, label, signal, nextAction) {
  return { status, label, signal, nextAction }
}

function summarizeStatus(rows) {
  if (rows.some((item) => item.status === "blocked")) return "blocked"
  if (rows.some((item) => item.status === "warn")) return "warn"
  return "ready"
}

function printHuman(result) {
  console.log("Personal OS launch readiness")
  console.log(`Overall: ${result.overallStatus}`)
  console.log(`Generated at: ${result.generatedAt}`)
  console.log("")

  for (const item of result.rows) {
    console.log(`[${item.status}] ${item.label}`)
    console.log(`  signal: ${item.signal}`)
    console.log(`  next: ${item.nextAction}`)
  }

  console.log("")
  console.log("Next actions:")
  for (const action of result.nextActions) {
    console.log(`- ${action}`)
  }
}

const supabaseUrlPresent = has("NEXT_PUBLIC_SUPABASE_URL")
const supabaseKeyPresent = has("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || has("NEXT_PUBLIC_SUPABASE_ANON_KEY")
const runtimeDatabase = parseUrl(process.env.DATABASE_URL)
const cliDatabase = parseUrl(process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL)
const databaseDns = await checkDns(runtimeDatabase.hostname ?? cliDatabase.hostname)
const requestedMode = requestedAuthMode()
const activeMode = effectiveAuthMode()

const rows = [
  row(
    supabaseUrlPresent ? "ready" : "blocked",
    "Supabase public URL",
    supabaseUrlPresent ? "NEXT_PUBLIC_SUPABASE_URL is present." : "NEXT_PUBLIC_SUPABASE_URL is missing.",
    supabaseUrlPresent ? "No action." : "Set NEXT_PUBLIC_SUPABASE_URL in the launch environment."
  ),
  row(
    supabaseKeyPresent ? "ready" : "blocked",
    "Supabase publishable key",
    supabaseKeyPresent
      ? "A publishable or legacy anon key is present."
      : "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.",
    supabaseKeyPresent
      ? "No action."
      : "Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; use NEXT_PUBLIC_SUPABASE_ANON_KEY only for legacy projects."
  ),
  row(
    runtimeDatabase.present && runtimeDatabase.valid ? "ready" : "blocked",
    "Runtime database URL",
    runtimeDatabase.present
      ? runtimeDatabase.valid
        ? "DATABASE_URL is present and parseable."
        : "DATABASE_URL is present but not parseable."
      : "DATABASE_URL is missing.",
    runtimeDatabase.present && runtimeDatabase.valid
      ? "No action."
      : "Set DATABASE_URL for the Prisma-backed app runtime."
  ),
  row(
    cliDatabase.present && cliDatabase.valid ? "ready" : "blocked",
    "Migration database URL",
    cliDatabase.present
      ? cliDatabase.valid
        ? "DIRECT_DATABASE_URL or DATABASE_URL is present and parseable."
        : "DIRECT_DATABASE_URL or DATABASE_URL is present but not parseable."
      : "No DIRECT_DATABASE_URL or DATABASE_URL is available for Prisma CLI.",
    cliDatabase.present && cliDatabase.valid
      ? "No action."
      : "Set DIRECT_DATABASE_URL for migrations or DATABASE_URL for disposable/local verification."
  ),
  row(
    databaseDns.resolves ? "ready" : "blocked",
    "Database host DNS",
    databaseDns.resolves
      ? "The selected database host resolves."
      : `The selected database host does not resolve (${databaseDns.errorCode}).`,
    databaseDns.resolves
      ? "No action."
      : "Fix the database URL host, network/DNS access, or provide a disposable PostgreSQL URL."
  ),
  row(
    activeMode === "supabase" ? "ready" : "warn",
    "Auth runtime mode",
    `Requested auth mode is ${requestedMode}; effective mode is ${activeMode}.`,
    activeMode === "supabase"
      ? "Use /auth/status after signing in to prove Supabase session to Profile mapping."
      : "Do not use mock auth for online launch; unset PERSONAL_OS_AUTH_MODE or set NODE_ENV=production for final proof."
  ),
  row(
    has("VERCEL_ENV") ? "ready" : "warn",
    "Deployment marker",
    has("VERCEL_ENV") ? "VERCEL_ENV is present." : "VERCEL_ENV is missing in this local check.",
    has("VERCEL_ENV") ? "No action." : "For deployed proof, run this check in the launch environment as well."
  ),
]

const nextActions = rows
  .filter((item) => item.status !== "ready")
  .map((item) => item.nextAction)

if (nextActions.length === 0) {
  nextActions.push("Run /auth/status with a signed-in browser session, then run AUTH-005 and WORK-007.")
}

const result = {
  generatedAt: new Date().toISOString(),
  overallStatus: summarizeStatus(rows),
  checks: {
    supabasePublicUrlPresent: supabaseUrlPresent,
    supabasePublishableOrAnonKeyPresent: supabaseKeyPresent,
    databaseUrlPresent: runtimeDatabase.present,
    databaseUrlParseable: runtimeDatabase.valid,
    migrationDatabaseUrlPresent: cliDatabase.present,
    migrationDatabaseUrlParseable: cliDatabase.valid,
    databaseHostPresent: runtimeDatabase.hostPresent || cliDatabase.hostPresent,
    databaseHostDnsChecked: databaseDns.checked,
    databaseHostResolves: databaseDns.resolves,
    databaseHostError: databaseDns.errorCode,
    requestedAuthMode: requestedMode,
    effectiveAuthMode: activeMode,
    deploymentMarkerPresent: has("VERCEL_ENV"),
  },
  rows,
  nextActions: [...new Set(nextActions)],
}

if (json) {
  console.log(JSON.stringify(result, null, 2))
} else {
  printHuman(result)
}

if (strict && result.overallStatus === "blocked") {
  process.exitCode = 1
}
