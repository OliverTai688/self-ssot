#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

const DEFAULT_OUT =
  "docs/2_agent-input/generated/agent-loop/manual-ops/latest-manual-ops-launch-gate.json"
const DEFAULT_DOCKER_OUT =
  "docs/2_agent-input/generated/agent-loop/manual-ops/latest-manual-ops-docker-readiness.json"

function parseArgs(argv) {
  const args = {
    json: false,
    out: DEFAULT_OUT,
    dockerOut: DEFAULT_DOCKER_OUT,
    help: false,
  }
  const filtered = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filtered.length; index += 1) {
    const arg = filtered[index]

    if (arg === "--json") {
      args.json = true
    } else if (arg === "--out") {
      args.out = requiredValue(filtered, index, "--out")
      index += 1
    } else if (arg === "--docker-out") {
      args.dockerOut = requiredValue(filtered, index, "--docker-out")
      index += 1
    } else if (arg === "--help" || arg === "-h") {
      args.help = true
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return args
}

function requiredValue(args, index, flag) {
  const value = args[index + 1]
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`)
  }
  return value
}

function printHelp() {
  console.log("Check the Personal OS conditional Manual Ops launch gate")
  console.log("")
  console.log("Usage:")
  console.log("  pnpm launch:manual-ops")
  console.log("  pnpm launch:manual-ops -- --json")
  console.log("  pnpm launch:manual-ops -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json")
}

function runJson(label, command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
  })

  if (result.error) {
    return {
      label,
      ok: false,
      exitCode: null,
      errorCategory: result.error.code ?? "SPAWN_FAILED",
      payload: null,
    }
  }

  try {
    return {
      label,
      ok: true,
      exitCode: result.status,
      payload: JSON.parse(result.stdout),
    }
  } catch {
    return {
      label,
      ok: false,
      exitCode: result.status,
      errorCategory: "NON_JSON_OUTPUT",
      payload: null,
    }
  }
}

function manualOp({
  id,
  area,
  blocks,
  status,
  ownerAction,
  command,
  evidenceTarget,
  passSignal,
  failSignal,
  risk = "medium",
  writesDatabase = false,
  requiresApproval = false,
}) {
  return {
    id,
    area,
    blocks,
    status,
    ownerAction,
    command,
    evidenceTarget,
    passSignal,
    failSignal,
    risk,
    writesDatabase,
    requiresApproval,
    printsSecrets: false,
  }
}

function buildManualOps({ launch, workTarget, docker }) {
  const launchPayload = launch.payload
  const workPayload = workTarget.payload
  const dockerPayload = docker.payload
  const rows = []

  const checks = launchPayload?.checks ?? {}
  const launchBlockedLabels =
    launchPayload?.rows?.filter((row) => row.status === "blocked").map((row) => row.label) ?? []
  const launchWarnLabels =
    launchPayload?.rows?.filter((row) => row.status === "warn").map((row) => row.label) ?? []

  if (!checks.supabasePublicUrlPresent || !checks.supabasePublishableOrAnonKeyPresent) {
    rows.push(
      manualOp({
        id: "manual.supabase-public-env",
        area: "Auth",
        blocks: ["AUTH-005", "L1_PRIVATE_ONLINE_WORK_OS"],
        status: "owner_action_required",
        ownerAction:
          "Configure Supabase public URL and publishable key in the intended launch environment, then rerun launch proof.",
        command:
          "pnpm launch:proof -- --out docs/2_agent-input/generated/agent-loop/reports/owner-launch-proof.json",
        evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-launch-proof.json",
        passSignal:
          "blockedLabels no longer include Supabase public URL or Supabase publishable key.",
        failSignal:
          "blockedLabels still include Supabase public URL or Supabase publishable key.",
      })
    )
  }

  rows.push(
    manualOp({
      id: "manual.signed-in-auth-status",
      area: "Auth",
      blocks: ["AUTH-005", "WORK-007", "L1_PRIVATE_ONLINE_WORK_OS"],
      status: "owner_action_required",
      ownerAction:
        "Sign in through /login, open /auth/status in the same browser session, save sanitized JSON, and run auth proof.",
      command:
        "pnpm auth:proof -- --status-json docs/2_agent-input/generated/agent-loop/reports/manual-auth-status-YYYYMMDD.json --out docs/2_agent-input/generated/agent-loop/reports/owner-auth-proof.json",
      evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-auth-proof.json",
      passSignal:
        "proofSummary.canRunAuth005=true and proofSummary.canProceedToWork007=true.",
      failSignal:
        "Auth status evidence is missing, unauthenticated, not Supabase-backed, Profile mapping fails, or owner Work scope is absent.",
    })
  )

  if (
    !checks.databaseUrlPresent ||
    !checks.databaseUrlParseable ||
    !checks.migrationDatabaseUrlPresent ||
    !checks.migrationDatabaseUrlParseable ||
    !checks.databaseHostResolves
  ) {
    rows.push(
      manualOp({
        id: "manual.runtime-db-readiness",
        area: "Database",
        blocks: ["WORK-007", "WORK-009", "L1_PRIVATE_ONLINE_WORK_OS"],
        status: "operator_action_required",
        ownerAction:
          "Provide a parseable runtime/migration PostgreSQL URL or use an approved disposable/local Work proof target.",
        command:
          "pnpm launch:proof -- --out docs/2_agent-input/generated/agent-loop/reports/owner-db-launch-proof.json",
        evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-db-launch-proof.json",
        passSignal: "proofSummary.canRunWork007=true in the intended environment.",
        failSignal:
          "Runtime or migration database URL is missing, not parseable, or DNS does not resolve.",
        risk: "high",
      })
    )
  }

  if (workPayload?.canRunWork009 !== true) {
    rows.push(
      manualOp({
        id: "manual.work-proof-target",
        area: "Work",
        blocks: ["WORK-009", "WORK-007", "L1_PRIVATE_ONLINE_WORK_OS"],
        status: "operator_action_required",
        ownerAction:
          "Provide only an approved local/disposable Work proof target and explicit write confirmations.",
        command:
          "pnpm work:proof-target:check -- --out docs/2_agent-input/generated/agent-loop/reports/owner-work-proof-target-readiness.json",
        evidenceTarget:
          "docs/2_agent-input/generated/agent-loop/reports/owner-work-proof-target-readiness.json",
        passSignal: "status=ready_for_work_009 and canRunWork009=true.",
        failSignal:
          "Target is missing, unsafe, not parseable, missing write confirmation, or remote override is absent.",
        risk: "high",
      })
    )
  }

  if (dockerPayload?.canRunDockerProof !== true) {
    rows.push(
      manualOp({
        id: "manual.docker-disposable-work-proof",
        area: "Work",
        blocks: ["WORK-009", "WORK-007"],
        status: "owner_action_required",
        ownerAction:
          "Start Docker and run the Docker disposable Work proof; inspect the child Work proof packet before claiming WORK-009.",
        command:
          "pnpm work:proof:docker-disposable -- --run --setup --out docs/2_agent-input/generated/agent-loop/reports/owner-work-docker-proof.json",
        evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-work-docker-proof.json",
        passSignal:
          "canRunDockerProof=true, child proof exits 0, Work proof status=passed, and cleanup passes.",
        failSignal:
          "Docker daemon is unavailable, setup fails, child Work proof fails, or cleanup fails.",
        risk: "high",
        writesDatabase: true,
        requiresApproval: true,
      })
    )
  }

  if (!checks.deploymentMarkerPresent) {
    rows.push(
      manualOp({
        id: "manual.deployment-marker-proof",
        area: "Deployment",
        blocks: ["DEPLOY-002", "L1_PRIVATE_ONLINE_WORK_OS"],
        status: "operator_action_required",
        ownerAction:
          "Run launch proof in the intended deployed or preview environment after auth and Work proof are meaningful.",
        command:
          "pnpm launch:proof -- --out docs/2_agent-input/generated/agent-loop/reports/owner-deployment-proof.json",
        evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-deployment-proof.json",
        passSignal: "proofSummary.canClaimL1=true in the intended launch environment.",
        failSignal: "Deployment marker is missing or auth/Work proof remains absent.",
      })
    )
  }

  const checkerFailures = [launch, workTarget, docker].filter((item) => !item.ok)
  const formalCanClaimL1 =
    checks.supabasePublicUrlPresent &&
    checks.supabasePublishableOrAnonKeyPresent &&
    checks.databaseUrlPresent &&
    checks.databaseUrlParseable &&
    checks.databaseHostResolves &&
    checks.effectiveAuthMode === "supabase" &&
    checks.deploymentMarkerPresent &&
    rows.length === 0

  const allBlockersAreManualOps = checkerFailures.length === 0 && rows.length > 0
  const conditionalManualOpsLevel = formalCanClaimL1
    ? "M2_MANUAL_EVIDENCE_READY_FOR_L1_REVIEW"
    : allBlockersAreManualOps
      ? "M1_MANUAL_OPS_READY"
      : "M0_MANUAL_OPS_BLOCKED"

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    taskId: "MANUAL-OPS-001",
    status:
      conditionalManualOpsLevel === "M0_MANUAL_OPS_BLOCKED"
        ? "manual_ops_blocked"
        : "manual_ops_ready",
    formalLaunchLevel: {
      current: "L0_LOCAL_PROTOTYPE",
      canUpgradeToL1Now: formalCanClaimL1,
      reason: formalCanClaimL1
        ? "Launch readiness prerequisites are present; AUTH-005, WORK-007, and formal review still need to record evidence."
        : "Formal L1 still requires auth/session, Work persistence, and deployment evidence.",
    },
    conditionalManualOps: {
      level: conditionalManualOpsLevel,
      canConditionallyUpgradeWorkflow: conditionalManualOpsLevel !== "M0_MANUAL_OPS_BLOCKED",
      meaning:
        conditionalManualOpsLevel === "M1_MANUAL_OPS_READY"
          ? "Product/runtime baselines are far enough along that remaining launch blockers can be handled as owner/operator Manual Ops, without claiming formal L1."
          : conditionalManualOpsLevel === "M2_MANUAL_EVIDENCE_READY_FOR_L1_REVIEW"
            ? "Manual evidence appears ready for formal L1 review, but the formal level is not changed by this checker."
            : "At least one checker failed before Manual Ops could be trusted.",
    },
    noUpgradeReasons: [
      ...new Set([
        ...launchBlockedLabels,
        ...launchWarnLabels.filter((label) => label === "Deployment marker"),
        "Auth status evidence",
        ...(workPayload?.canRunWork009 ? [] : ["Work proof target"]),
        ...(dockerPayload?.canRunDockerProof ? [] : ["Docker disposable Work proof"]),
      ]),
    ],
    manualOpsRows: rows,
    manualOpsSummary: {
      rowCount: rows.length,
      ownerActionCount: rows.filter((row) => row.status === "owner_action_required").length,
      operatorActionCount: rows.filter((row) => row.status === "operator_action_required").length,
      highRiskCount: rows.filter((row) => row.risk === "high").length,
      writesDatabaseCount: rows.filter((row) => row.writesDatabase).length,
      approvalRequiredCount: rows.filter((row) => row.requiresApproval).length,
      primaryManualOp: rows[0]?.id ?? "manual.evidence-review",
      nextAction:
        rows[0]?.ownerAction ??
        "Review formal launch proof and record AUTH-005, WORK-007, and DEPLOY-002 evidence before changing formal level.",
    },
    sourceChecks: {
      launchReadiness: {
        ok: launch.ok,
        exitCode: launch.exitCode,
        overallStatus: launchPayload?.overallStatus ?? "unknown",
        blockedLabels: launchBlockedLabels,
        warnLabels: launchWarnLabels,
      },
      workProofTarget: {
        ok: workTarget.ok,
        exitCode: workTarget.exitCode,
        status: workPayload?.status ?? "unknown",
        canRunWork009: workPayload?.canRunWork009 === true,
      },
      dockerDisposable: {
        ok: docker.ok,
        exitCode: docker.exitCode,
        status: dockerPayload?.status ?? "unknown",
        canRunDockerProof: dockerPayload?.canRunDockerProof === true,
        dockerDaemonAvailable: dockerPayload?.docker?.daemonAvailable === true,
      },
    },
    secretPolicy: {
      printsSecrets: false,
      excludedValues: [
        "Supabase URLs or keys",
        "database URLs or hosts",
        "cookies or tokens",
        "raw auth claims",
        "provider payloads",
        "profile IDs",
        "row IDs",
        "client share tokens",
        "Docker socket paths",
        "external registry credentials",
      ],
    },
  }
}

function writeOut(path, payload) {
  const outPath = resolve(process.cwd(), path)
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`)
}

function printHuman(payload) {
  console.log("Personal OS Manual Ops launch gate")
  console.log(`Status: ${payload.status}`)
  console.log(`Formal launch level: ${payload.formalLaunchLevel.current}`)
  console.log(`Can upgrade to L1 now: ${payload.formalLaunchLevel.canUpgradeToL1Now}`)
  console.log(`Conditional Manual Ops level: ${payload.conditionalManualOps.level}`)
  console.log(`Manual ops rows: ${payload.manualOpsSummary.rowCount}`)
  console.log("")
  console.log("No-upgrade reasons:")
  for (const reason of payload.noUpgradeReasons) console.log(`- ${reason}`)
  console.log("")
  console.log("Next action:")
  console.log(`- ${payload.manualOpsSummary.nextAction}`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  const launch = runJson("launch", process.execPath, ["scripts/check-launch-readiness.mjs", "--json"])
  const workTarget = runJson("workTarget", process.execPath, [
    "scripts/check-work-proof-target-readiness.mjs",
    "--json",
  ])
  const docker = runJson("docker", process.execPath, [
    "scripts/work-proof-docker-disposable.mjs",
    "--json",
    "--out",
    args.dockerOut,
  ])

  const payload = buildManualOps({ launch, workTarget, docker })
  writeOut(args.out, payload)

  if (args.json) {
    console.log(JSON.stringify(payload, null, 2))
  } else {
    printHuman(payload)
  }

  if (payload.status === "manual_ops_blocked") {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
