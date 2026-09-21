#!/usr/bin/env node

import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { execFileSync } from "node:child_process"

const ROOT = fs.realpathSync(process.cwd())
const GATE_STATE_PATH =
  "docs/2_agent-input/generated/agent-loop/gates/owner-ai-work-desktop-gate-state.json"
const LOOP_STATE_PATH = "docs/2_agent-input/generated/agent-loop/loop-state.json"
const UI_REGISTRY_PATH = "docs/03_feature-reference/REF-003_ui-screen-registry.md"

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8")
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath))
}

function git(args) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim()
}

const gateState = readJson(GATE_STATE_PATH)
const loopState = readJson(LOOP_STATE_PATH)
const preflight = gateState.preflight ?? {}
const activation = gateState.activation ?? {}
const automationPath = path.join(
  os.homedir(),
  ".codex",
  "automations",
  loopState.automation?.id ?? "missing-automation-id",
  "automation.toml",
)
const automationText = fs.existsSync(automationPath)
  ? fs.readFileSync(automationPath, "utf8")
  : ""
const branch = git(["branch", "--show-current"])
const head = git(["rev-parse", "HEAD"])
const status = git(["status", "--porcelain"])
const registryText = readText(UI_REGISTRY_PATH)
const nodeModulesPath = path.join(ROOT, "node_modules")
const gmailVerifiedAt = Date.parse(
  gateState.notification?.gmailConnection?.lastVerifiedAt ?? "",
)
const gmailFresh =
  Number.isFinite(gmailVerifiedAt) &&
  Date.now() - gmailVerifiedAt <= 24 * 60 * 60 * 1000

let descendsFromCheckpoint = false
try {
  execFileSync("git", ["merge-base", "--is-ancestor", preflight.baselineCheckpoint, "HEAD"], {
    cwd: ROOT,
    stdio: "ignore",
  })
  descendsFromCheckpoint = true
} catch {
  descendsFromCheckpoint = false
}

let dependencyRuntimeTarget = null
try {
  dependencyRuntimeTarget = fs.realpathSync(nodeModulesPath)
} catch {
  dependencyRuntimeTarget = null
}

const checks = [
  {
    id: "release_identity",
    pass:
      ROOT === preflight.releaseWorktree &&
      branch === preflight.releaseBranch &&
      descendsFromCheckpoint,
    actual: { root: ROOT, branch, head },
  },
  {
    id: "release_worktree_clean",
    pass: status.length === 0,
    actual: status.length === 0 ? "clean" : "dirty",
  },
  {
    id: "dependency_runtime_ready",
    pass:
      activation.dependencyRuntime?.status === "READY_SHARED_SYMLINK" &&
      dependencyRuntimeTarget === activation.dependencyRuntime?.target,
    actual: dependencyRuntimeTarget ?? "missing",
  },
  {
    id: "automation_active_10m",
    pass:
      automationText.includes('status = "ACTIVE"') &&
      automationText.includes('rrule = "FREQ=MINUTELY;INTERVAL=10"') &&
      automationText.includes(preflight.releaseWorktree) &&
      automationText.includes(preflight.releaseBranch),
    actual: automationText ? "automation-config-present" : "automation-config-missing",
  },
  {
    id: "repository_lifecycle_active",
    pass:
      loopState.status === "ACTIVE_10_MIN_GATE_HEARTBEAT" &&
      loopState.automation?.status === "ACTIVE" &&
      activation.status === "ACTIVE_OWNER_APPROVED" &&
      preflight.normalHeartbeatAllowed === true &&
      preflight.resumeRequiresExplicitOwnerAuthorization === false,
    actual:
      loopState.status + "/" + loopState.automation?.status + "/" + activation.status,
  },
  {
    id: "run_lease_idle_before_first_wake",
    pass: gateState.runLease?.status === "IDLE",
    actual: gateState.runLease?.status ?? "missing",
  },
  {
    id: "gmail_fresh_fail_closed",
    pass:
      gateState.notification?.gateAEmail?.status === "NOT_TRIGGERED" &&
      gateState.notification?.gmailConnection?.status ===
        "CONNECTED_FRESH_REVERIFY_BEFORE_SEND" &&
      gateState.notification?.gmailConnection?.reverifyBeforeSend === true &&
      gmailFresh,
    actual:
      gateState.notification?.gateAEmail?.status +
      "/" +
      gateState.notification?.gmailConnection?.status,
  },
  {
    id: "all_delivery_gates_not_achieved",
    pass: Object.values(gateState.gates ?? {}).every(
      (gate) => gate.status === "NOT_ACHIEVED",
    ),
    actual: Object.values(gateState.gates ?? {})
      .map((gate) => gate.status)
      .join(","),
  },
  {
    id: "ui_registry_unselected",
    pass:
      registryText.includes("**Active UI:** `NONE`") &&
      activation.activeUiId === null,
    actual: activation.activeUiId ?? "NONE",
  },
  {
    id: "agent_protocol_internal_only",
    pass:
      gateState.safety?.externalRegisterable === false &&
      gateState.safety?.externalAgentDatabaseAccess === false &&
      gateState.safety?.publicOutputEnabled === false,
    actual: "internal-protected-only",
  },
]

const blockingIds = checks.filter((check) => !check.pass).map((check) => check.id)
const packet = {
  id: "OWNEROS-AUTO-003",
  generatedAt: new Date().toISOString(),
  status: blockingIds.length === 0 ? "PASS_ACTIVE" : "BLOCKED",
  root: ROOT,
  branch,
  head,
  checks,
  blockingIds,
  claims: {
    automationEnabled: blockingIds.length === 0,
    firstScheduledRunObserved: false,
    emailSent: false,
    deployed: false,
    providerActivated: false,
    gateAchieved: false,
    externalRegisterable: false,
  },
}

console.log(JSON.stringify(packet, null, 2))
process.exit(blockingIds.length === 0 ? 0 : 1)
