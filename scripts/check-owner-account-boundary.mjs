#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { config } from "dotenv"

config({ path: ".env.local", quiet: true })
config({ path: ".env", quiet: true })

const DEFAULT_OUT = "docs/2_agent-input/generated/agent-loop/auth-boundary/latest-auth-boundary-proof.json"
const DEFAULT_DEMO_EMAIL = "admin@example.com"

function parseArgs(argv) {
  const args = {
    out: DEFAULT_OUT,
    json: false,
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
    } else if (arg === "--json") {
      args.json = true
    } else if (arg === "--help" || arg === "-h") {
      args.help = true
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return args
}

function printHelp() {
  console.log("Check no-secret Personal OS owner/demo auth boundary")
  console.log("")
  console.log("Usage:")
  console.log("  pnpm auth:boundary")
  console.log("  pnpm auth:boundary -- --json")
  console.log("  pnpm auth:boundary -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json")
}

function requestedAuthMode() {
  return process.env.PERSONAL_OS_AUTH_MODE === "mock" ? "mock" : "supabase"
}

function effectiveAuthMode() {
  if (requestedAuthMode() === "mock" && process.env.NODE_ENV !== "production") {
    return "mock"
  }

  return "supabase"
}

function safeRead(path) {
  try {
    return readFileSync(resolve(process.cwd(), path), "utf8")
  } catch {
    return ""
  }
}

function extractStringConstant(source, name) {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*[\"']([^\"']+)[\"']`))
  return match?.[1] ?? null
}

function inspectSourceContracts() {
  const seedSource = safeRead("prisma/seed.ts")
  const authSource = safeRead("src/lib/services/auth.service.ts")
  const runtimeSource = safeRead("src/lib/auth/runtime.ts")

  const seedDemoEmail = extractStringConstant(seedSource, "DEMO_PROFILE_EMAIL")
  const authDefaultEmail = extractStringConstant(authSource, "DEFAULT_DEV_USER_EMAIL")

  return {
    seedDemoProfileEmailPresent: Boolean(seedDemoEmail),
    authDefaultDevEmailPresent: Boolean(authDefaultEmail),
    seedAndAuthDefaultMatch: Boolean(seedDemoEmail && authDefaultEmail && seedDemoEmail === authDefaultEmail),
    seedUsesOwnerRole: /DEMO_PROFILE_ROLE[\s\S]*OWNER/.test(seedSource),
    runtimeDisablesMockInProduction: /NODE_ENV\s*!==\s*["']production["']/.test(runtimeSource),
    runtimeRequiresExplicitMockMode: /PERSONAL_OS_AUTH_MODE/.test(runtimeSource),
    configuredDevEmailMatchesSeed:
      process.env.PERSONAL_OS_DEV_USER_EMAIL && seedDemoEmail
        ? process.env.PERSONAL_OS_DEV_USER_EMAIL === seedDemoEmail
        : null,
    demoEmailIsDefaultContract: seedDemoEmail === DEFAULT_DEMO_EMAIL && authDefaultEmail === DEFAULT_DEMO_EMAIL,
  }
}

function statusRow(status, label, signal, nextAction) {
  return { status, label, signal, nextAction }
}

function summarize(rows) {
  if (rows.some((row) => row.status === "blocked")) return "blocked"
  if (rows.some((row) => row.status === "warn")) return "warn"
  return "ready"
}

function buildProof() {
  const contracts = inspectSourceContracts()
  const requestedMode = requestedAuthMode()
  const activeMode = effectiveAuthMode()
  const devEmailSource = process.env.PERSONAL_OS_DEV_USER_EMAIL ? "custom_env" : "default_contract"
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const hasSupabaseKey = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const supabasePublicEnvReady = hasSupabaseUrl && hasSupabaseKey
  const customDevEmailMismatch = contracts.configuredDevEmailMatchesSeed === false

  const rows = [
    statusRow(
      contracts.seedDemoProfileEmailPresent &&
        contracts.authDefaultDevEmailPresent &&
        contracts.seedAndAuthDefaultMatch &&
        contracts.seedUsesOwnerRole
        ? "ready"
        : "blocked",
      "Demo profile seed contract",
      contracts.seedAndAuthDefaultMatch && contracts.seedUsesOwnerRole
        ? "Seed profile and auth default point to the same OWNER demo contract without printing the email."
        : "Seed profile and auth default contract are missing, mismatched, or not OWNER-shaped.",
      contracts.seedAndAuthDefaultMatch && contracts.seedUsesOwnerRole
        ? "No action."
        : "Align the seed demo profile and auth default dev user before relying on local demo mode."
    ),
    statusRow(
      contracts.runtimeRequiresExplicitMockMode && contracts.runtimeDisablesMockInProduction ? "ready" : "blocked",
      "Mock auth production guard",
      contracts.runtimeRequiresExplicitMockMode && contracts.runtimeDisablesMockInProduction
        ? "Mock auth requires explicit mode and is disabled when NODE_ENV is production."
        : "Runtime source does not prove explicit mock mode plus production fail-closed behavior.",
      contracts.runtimeRequiresExplicitMockMode && contracts.runtimeDisablesMockInProduction
        ? "No action."
        : "Review src/lib/auth/runtime.ts before any online auth claim."
    ),
    statusRow(
      customDevEmailMismatch ? "warn" : "ready",
      "Development demo identity",
      customDevEmailMismatch
        ? "A custom PERSONAL_OS_DEV_USER_EMAIL is configured and does not match the known demo seed contract."
        : `Development identity source is ${devEmailSource}; no email value is printed.`,
      customDevEmailMismatch
        ? "Use the seeded demo email for local mock mode or seed a matching disposable profile explicitly."
        : "No action."
    ),
    statusRow(
      activeMode === "supabase" ? "ready" : "warn",
      "Effective auth mode",
      `Requested auth mode is ${requestedMode}; effective auth mode is ${activeMode}.`,
      activeMode === "supabase"
        ? "Continue with Supabase session proof."
        : "Use mock auth only for local demo; unset PERSONAL_OS_AUTH_MODE before online proof."
    ),
    statusRow(
      supabasePublicEnvReady ? "ready" : "blocked",
      "Supabase public env",
      supabasePublicEnvReady
        ? "Supabase public URL and publishable/legacy anon key are present."
        : "Supabase public URL and/or publishable key are missing.",
      supabasePublicEnvReady
        ? "Run /auth/status from a signed-in browser session."
        : "Configure Supabase public env in the intended launch target without storing values in repo artifacts."
    ),
    statusRow(
      "warn",
      "Signed-in owner session evidence",
      "This command does not read cookies, tokens, /auth/status payloads, profile IDs, or actual emails.",
      "Use pnpm auth:proof with sanitized signed-in /auth/status JSON before running AUTH-005."
    ),
  ]

  const boundaryStatus = summarize(rows.slice(0, 3))
  const overallStatus = summarize(rows)
  const canUseLocalDemo =
    boundaryStatus !== "blocked" && activeMode === "mock" && !customDevEmailMismatch
  const canCollectSignedInAuthProof = activeMode === "supabase" && supabasePublicEnvReady

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceFiles: [
      "src/lib/services/auth.service.ts",
      "src/lib/auth/runtime.ts",
      "src/lib/supabase/env.ts",
      "prisma/seed.ts",
    ],
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
      ],
    },
    environmentSummary: {
      nodeEnvClass: process.env.NODE_ENV === "production" ? "production" : "non_production_or_unset",
      requestedAuthMode: requestedMode,
      effectiveAuthMode: activeMode,
      devUserEmailSource: devEmailSource,
      supabasePublicUrlPresent: hasSupabaseUrl,
      supabasePublishableOrAnonKeyPresent: hasSupabaseKey,
    },
    contractChecks: contracts,
    rows,
    proofSummary: {
      overallStatus,
      boundaryStatus,
      canUseLocalDemo,
      canCollectSignedInAuthProof,
      canRunAuth005: false,
      auth005BlockedBy: canCollectSignedInAuthProof
        ? ["Signed-in /auth/status evidence"]
        : ["Supabase public env", "Signed-in /auth/status evidence"],
      nextAction: canCollectSignedInAuthProof
        ? "Collect sanitized signed-in /auth/status JSON and run pnpm auth:proof -- --status-json <file>."
        : "Configure Supabase public env, then collect signed-in /auth/status evidence.",
    },
  }
}

function writeOut(path, payload) {
  const outPath = resolve(process.cwd(), path)
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`)
}

function printHuman(args, proof) {
  console.log(`Owner/demo auth boundary proof written: ${args.out}`)
  console.log(`Overall: ${proof.proofSummary.overallStatus}`)
  console.log(`Boundary: ${proof.proofSummary.boundaryStatus}`)
  console.log(`Can use local demo: ${proof.proofSummary.canUseLocalDemo}`)
  console.log(`Can collect signed-in auth proof: ${proof.proofSummary.canCollectSignedInAuthProof}`)
  console.log(`Can run AUTH-005: ${proof.proofSummary.canRunAuth005}`)
  console.log(`Next: ${proof.proofSummary.nextAction}`)
}

function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    printHelp()
    return
  }

  const proof = buildProof()
  writeOut(args.out, proof)

  if (args.json) {
    console.log(JSON.stringify(proof, null, 2))
  } else {
    printHuman(args, proof)
  }
}

try {
  main()
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
