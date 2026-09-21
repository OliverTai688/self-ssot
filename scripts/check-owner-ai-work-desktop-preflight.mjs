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
const PROMPT_PATH =
  "docs/2_agent-input/generated/agent-loop/prompts/owner-ai-work-desktop-gate-loop.md"
const CONTRACT_PATH = "src/lib/contracts/owner-ai-work-desktop-gate.contract.ts"
const GATE_CHECKER_PATH = "scripts/check-owner-ai-work-desktop-gates.mjs"
const PILOT_CRITERION = "B6_OWNER_PLUS_ALL_ACTIVE_MEMBERS_MIN_ONE_NON_OWNER_PILOT"
const RETIRED_PILOT_CRITERION = "B6_OWNER_PLUS_TWO_TO_THREE_MEMBER_PILOT"

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

function includesAll(text, markers) {
  return markers.every((marker) => text.includes(marker))
}

const gateState = readJson(GATE_STATE_PATH)
const loopState = readJson(LOOP_STATE_PATH)
const preflight = gateState.preflight ?? {}
const automationPath = path.join(
  os.homedir(),
  ".codex",
  "automations",
  loopState.automation?.id ?? "missing-automation-id",
  "automation.toml",
)
const automationText = fs.existsSync(automationPath) ? fs.readFileSync(automationPath, "utf8") : ""
const promptText = readText(PROMPT_PATH)
const registryText = readText(UI_REGISTRY_PATH)
const contractText = readText(CONTRACT_PATH)
const checkerText = readText(GATE_CHECKER_PATH)
const branch = git(["branch", "--show-current"])
const head = git(["rev-parse", "HEAD"])
const status = git(["status", "--porcelain"])

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

const checks = [
  {
    id: "release_worktree_path",
    pass: ROOT === preflight.releaseWorktree,
    actual: ROOT,
  },
  {
    id: "release_branch",
    pass: branch === preflight.releaseBranch,
    actual: branch,
  },
  {
    id: "release_checkpoint_ancestry",
    pass: descendsFromCheckpoint,
    actual: head,
  },
  {
    id: "release_worktree_clean",
    pass: status.length === 0,
    actual: status.length === 0 ? "clean" : "dirty",
  },
  {
    id: "automation_paused_10m",
    pass:
      automationText.includes('status = "PAUSED"') &&
      automationText.includes('rrule = "FREQ=MINUTELY;INTERVAL=10"'),
    actual: automationText ? "automation-config-present" : "automation-config-missing",
  },
  {
    id: "automation_release_target",
    pass:
      automationText.includes(preflight.releaseWorktree) &&
      automationText.includes(preflight.releaseBranch),
    actual: automationText ? "prompt-checked" : "automation-config-missing",
  },
  {
    id: "repository_state_paused",
    pass:
      loopState.status === "PREFLIGHT_CONFIGURED_HEARTBEAT_PAUSED" &&
      loopState.automation?.status === "PAUSED" &&
      ["CONFIGURED_PAUSED", "PASS_PAUSED_READY_FOR_OWNER_REVIEW"].includes(
        preflight.status,
      ) &&
      preflight.normalHeartbeatAllowed === false,
    actual: `${loopState.status}/${loopState.automation?.status}/${preflight.status}`,
  },
  {
    id: "all_delivery_gates_not_achieved",
    pass: Object.values(gateState.gates ?? {}).every((gate) => gate.status === "NOT_ACHIEVED"),
    actual: Object.values(gateState.gates ?? {}).map((gate) => gate.status).join(","),
  },
  {
    id: "freshness_rebase_required",
    pass:
      gateState.proofPolicy?.maxAgeHours === 72 &&
      gateState.proofPolicy?.currentEvidenceStatus === "STALE_REBASE_REQUIRED",
    actual: gateState.proofPolicy?.currentEvidenceStatus ?? "missing",
  },
  {
    id: "gmail_fail_closed_before_send",
    pass:
      gateState.notification?.gateAEmail?.status === "NOT_TRIGGERED" &&
      gateState.notification?.gmailConnection?.status ===
        "CONNECTED_STALE_REVERIFY_REQUIRED" &&
      gateState.notification?.gmailConnection?.reverifyBeforeSend === true,
    actual: `${gateState.notification?.gateAEmail?.status}/${gateState.notification?.gmailConnection?.status}`,
  },
  {
    id: "pilot_contract_promoted",
    pass:
      includesAll(contractText, [PILOT_CRITERION]) &&
      includesAll(checkerText, [PILOT_CRITERION]) &&
      gateState.gates?.gateB?.remainingCriterionIds?.includes(PILOT_CRITERION) &&
      !includesAll(`${contractText}\n${checkerText}\n${promptText}`, [RETIRED_PILOT_CRITERION]),
    actual: PILOT_CRITERION,
  },
  {
    id: "ui_registry_unselected",
    pass:
      registryText.includes("**Active UI:** `NONE`") &&
      promptText.includes("The Registry is the only Screen ID source"),
    actual: "NONE",
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
  id: "OWNEROS-AUTO-002",
  generatedAt: new Date().toISOString(),
  status: blockingIds.length === 0 ? "PASS_PAUSED_READY_FOR_OWNER_REVIEW" : "BLOCKED",
  root: ROOT,
  branch,
  head,
  checks,
  blockingIds,
  claims: {
    automationStarted: false,
    emailSent: false,
    deployed: false,
    providerActivated: false,
    gateAchieved: false,
    externalRegisterable: false,
  },
}

console.log(JSON.stringify(packet, null, 2))
process.exit(blockingIds.length === 0 ? 0 : 1)
