#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { config } from "dotenv";

const CONFIRMATION_TEXT = "I_UNDERSTAND_THIS_WRITES_TEST_DATA";
const DEFAULT_OUT =
  "docs/2_agent-input/generated/agent-loop/ai-input-source-workflow-proof/latest-proof-runner.json";
const PROOF_MARKER_RE =
  /ai[_-]?input[_-]?proof|source[_-]?workflow[_-]?proof|personal[_-]?os[_-]?ai[_-]?input[_-]?proof|disposable|scratch|test|local|tmp/i;
const VALUABLE_NAME_RE = /prod|production|primary|main|launch|supabase|live|real|owner|personal[_-]?os/i;

const REQUIRED_OBJECTS = [
  "SourceConnection",
  "SourceAsset",
  "AIWorkflowRun",
  "AIWorkItem",
  "SourceNamingProfile",
  "DataUnitProposal",
  "ModuleWriteIntent",
  "OperatingAuditEvent",
];

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

function parseArgs(argv) {
  const args = {
    run: false,
    json: false,
    out: null,
    help: false,
  };
  const filteredArgs = argv.filter((arg) => arg !== "--");

  for (let index = 0; index < filteredArgs.length; index += 1) {
    const arg = filteredArgs[index];

    if (arg === "--run") {
      args.run = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--out") {
      args.out = requiredValue(filteredArgs, index, "--out");
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function requiredValue(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function printHelp() {
  console.log("Check the AI Input Source Workflow proof-runner gate without connecting to a database.");
  console.log("");
  console.log("Dry-run safety packet, no DB connection and no DB writes:");
  console.log("  pnpm ai-input:proof");
  console.log("  pnpm ai-input:proof -- --json");
  console.log("");
  console.log("Operator write-gate check, still no DB connection in DATTR-024I:");
  console.log("  pnpm ai-input:proof -- --run --json");
  console.log("");
  console.log("Optional output packet:");
  console.log(`  pnpm ai-input:proof -- --json --out ${DEFAULT_OUT}`);
  console.log("");
  console.log("Required env before any future write-capable slice:");
  console.log("  AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL");
  console.log("  PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES=1");
  console.log(`  PERSONAL_OS_AI_INPUT_PROOF_CONFIRM=${CONFIRMATION_TEXT}`);
  console.log("  PERSONAL_OS_AI_INPUT_PROOF_ALLOW_REMOTE=1 only for approved disposable remote targets");
}

function selectedTarget() {
  if (process.env.AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL) {
    return {
      provided: true,
      source: "AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL",
      value: process.env.AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL,
    };
  }

  return {
    provided: false,
    source: "AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL",
    value: null,
  };
}

function classifyTarget(target) {
  if (!target.provided) {
    return {
      provided: false,
      source: target.source,
      parseable: false,
      protocolAllowed: false,
      hostClass: "missing",
      databaseNameHasProofMarker: false,
      databaseNameLooksValuable: false,
      remoteOverrideAccepted: false,
      targetUrlRedacted: true,
      hostRedacted: true,
    };
  }

  try {
    const url = new URL(target.value);
    const hostname = url.hostname.toLowerCase();
    const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
    const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
    const hostClass = localHosts.has(hostname) ? "local" : "remote";
    const protocolAllowed = url.protocol === "postgres:" || url.protocol === "postgresql:";
    const databaseNameHasProofMarker = PROOF_MARKER_RE.test(databaseName);
    const databaseNameLooksValuable = VALUABLE_NAME_RE.test(databaseName) && !databaseNameHasProofMarker;
    const remoteOverrideAccepted =
      hostClass === "remote" && process.env.PERSONAL_OS_AI_INPUT_PROOF_ALLOW_REMOTE === "1";

    return {
      provided: true,
      source: target.source,
      parseable: true,
      protocolAllowed,
      hostClass,
      databaseNameHasProofMarker,
      databaseNameLooksValuable,
      remoteOverrideAccepted,
      targetUrlRedacted: true,
      hostRedacted: true,
    };
  } catch {
    return {
      provided: true,
      source: target.source,
      parseable: false,
      protocolAllowed: false,
      hostClass: "unknown",
      databaseNameHasProofMarker: false,
      databaseNameLooksValuable: false,
      remoteOverrideAccepted: false,
      targetUrlRedacted: true,
      hostRedacted: true,
    };
  }
}

function buildSafety(args, targetInfo) {
  const missing = [];
  const warnings = [];
  const hasAllowWrites = process.env.PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES === "1";
  const hasConfirmation = process.env.PERSONAL_OS_AI_INPUT_PROOF_CONFIRM === CONFIRMATION_TEXT;
  const targetAllowed =
    targetInfo.hostClass === "local" ||
    (targetInfo.hostClass === "remote" && targetInfo.remoteOverrideAccepted);
  const targetSafe =
    targetInfo.provided &&
    targetInfo.parseable &&
    targetInfo.protocolAllowed &&
    targetAllowed &&
    targetInfo.databaseNameHasProofMarker &&
    !targetInfo.databaseNameLooksValuable;

  if (!targetInfo.provided) missing.push("AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL is not set.");
  if (targetInfo.provided && !targetInfo.parseable) missing.push("Selected proof database URL is not parseable.");
  if (targetInfo.provided && !targetInfo.protocolAllowed) {
    missing.push("Selected proof database URL must use postgres:// or postgresql://.");
  }
  if (targetInfo.provided && !targetAllowed) {
    missing.push(
      "Selected target must be local, or an approved disposable remote target must set PERSONAL_OS_AI_INPUT_PROOF_ALLOW_REMOTE=1.",
    );
  }
  if (targetInfo.provided && !targetInfo.databaseNameHasProofMarker) {
    missing.push("Selected proof database name must contain an AI Input/source workflow disposable marker.");
  }
  if (targetInfo.databaseNameLooksValuable) {
    missing.push("Selected proof database name looks valuable or production-like.");
  }
  if (args.run && !hasAllowWrites) missing.push("PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES=1 is missing.");
  if (args.run && !hasConfirmation) {
    missing.push(`PERSONAL_OS_AI_INPUT_PROOF_CONFIRM=${CONFIRMATION_TEXT} is missing.`);
  }
  if (targetInfo.hostClass === "remote" && targetInfo.remoteOverrideAccepted) {
    warnings.push("Remote disposable override is present; confirm this is not a valuable launch database.");
  }

  return {
    targetSafe,
    hasAllowWrites,
    hasConfirmation,
    targetAllowed,
    missing,
    warnings,
    canAttemptFutureProofWrites: targetSafe && hasAllowWrites && hasConfirmation,
  };
}

function plannedWriteSequence() {
  return [
    "Classify target without printing URL, host, credentials, or row identifiers.",
    "Require --run plus PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES=1 and the exact confirmation phrase.",
    "Apply only a human-reviewed Source Workflow migration draft to an approved local/disposable target.",
    "Create proof-only owner/profile context with example.invalid metadata.",
    "Create proof-only SourceConnection, SourceAsset, AIWorkflowRun, AIWorkItem, SourceNamingProfile, DataUnitProposal, and ModuleWriteIntent rows.",
    "Keep DataUnitProposal and ModuleWriteIntent proposal-only; do not write final Work, Research, Life, Finance, Chamber, Company, Client Portal, auth, permission, public-output, or external-collaboration rows.",
    "Emit or reference redacted ai-input.source-workflow audit evidence.",
    "Disconnect/reconnect before owner-scoped read verification.",
    "Delete proof-only rows by marker and owner scope.",
    "Verify cleanup count is zero for every proof object.",
  ];
}

function buildPayload(args) {
  const target = selectedTarget();
  const targetInfo = classifyTarget(target);
  const safety = buildSafety(args, targetInfo);
  const mode = args.run ? "run_requested_no_db_write" : "dry_run";
  const status = args.run
    ? safety.canAttemptFutureProofWrites
      ? "blocked_before_db_writes_by_dattr024i_boundary"
      : "blocked"
    : "dry_run_ready";

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    taskId: "DATTR-024I-PROOF-RUNNER",
    mode,
    status,
    canAttemptFutureProofWrites: safety.canAttemptFutureProofWrites,
    writesExecuted: false,
    target: {
      provided: targetInfo.provided,
      source: targetInfo.source,
      parseable: targetInfo.parseable,
      protocolAllowed: targetInfo.protocolAllowed,
      hostClass: targetInfo.hostClass,
      databaseNameHasProofMarker: targetInfo.databaseNameHasProofMarker,
      databaseNameLooksValuable: targetInfo.databaseNameLooksValuable,
      remoteOverrideAccepted: targetInfo.remoteOverrideAccepted,
      targetUrlRedacted: targetInfo.targetUrlRedacted,
      hostRedacted: targetInfo.hostRedacted,
    },
    confirmations: {
      runRequested: args.run,
      allowWrites: safety.hasAllowWrites,
      confirmationAccepted: safety.hasConfirmation,
      remoteOverride: process.env.PERSONAL_OS_AI_INPUT_PROOF_ALLOW_REMOTE === "1",
      confirmationPhrase: CONFIRMATION_TEXT,
    },
    safety: {
      targetSafe: safety.targetSafe,
      missing: safety.missing,
      warnings: safety.warnings,
      doesNotConnectToDatabase: true,
      doesNotApplyMigration: true,
      doesNotWriteDatabase: true,
      migrationApplyAllowed: false,
      runtimeReadAllowed: false,
      runtimeWriteAllowed: false,
      connectorRuntimeAllowed: false,
      providerDataAllowed: false,
      publicOutputAllowed: false,
      moduleFinalWriteAllowed: false,
      externalAgentDatabaseAccessAllowed: false,
      externalRegisterable: false,
      printsSecrets: false,
      excludedValues: [
        "database URLs",
        "database hosts",
        "database usernames",
        "database passwords",
        "Supabase keys",
        "tokens",
        "cookies",
        "raw auth claims",
        "profile IDs",
        "row IDs",
        "provider payloads",
        "source file bodies",
        "private source material",
        "target module final payloads",
      ],
    },
    requiredObjects: REQUIRED_OBJECTS,
    plannedWriteSequence: plannedWriteSequence(),
    blockedUntil: [
      "Human review approves MIG-003 and the create-only SQL draft for a disposable/local target.",
      "DATTR-024J-SERVICE-AUTHZ-RUNTIME implements requireUser(), owner scope, service authorization, and UI-safe mappers.",
      "DATTR-024K-RLS-AUDIT-STORAGE reviews RLS/audit storage or explicitly defers persisted audit storage for disposable proof only.",
      "Owner/operator supplies an approved local/disposable AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL and confirmations.",
    ],
    nextActions: safety.canAttemptFutureProofWrites
      ? [
          "Do not claim DB proof yet; DATTR-024I intentionally stops before DB connection and writes.",
          "Implement DATTR-024J-SERVICE-AUTHZ-RUNTIME before enabling any Source Workflow persistence reads/writes.",
          "Owner can keep this no-secret packet as evidence that target/write confirmations are ready.",
        ]
      : [
          "Provide an explicit local/disposable AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL when ready.",
          "Set PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES=1 only for a disposable proof run.",
          `Set PERSONAL_OS_AI_INPUT_PROOF_CONFIRM=${CONFIRMATION_TEXT}.`,
          "For a remote disposable target, set PERSONAL_OS_AI_INPUT_PROOF_ALLOW_REMOTE=1 only after confirming it is not valuable.",
          "Continue DATTR-024J-SERVICE-AUTHZ-RUNTIME while proof target evidence remains Manual Ops.",
        ],
    sourceRefs: [
      "docs/08_acceptance-and-qa/ACC-006_ai-input-source-workflow-proof-target.md",
      "docs/02_architecture-and-rules/MIG-003_ai-input-source-workflow-create-only-migration-draft.md",
      "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md",
      "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
    ],
    agentProtocol: {
      posture: "protected-owner/internal proof tooling only",
      affectedAgentFactsLiteFields: [
        "identity",
        "lifecycle",
        "capabilities",
        "skills",
        "auth",
        "trust",
        "observability",
        "registry status",
      ],
      externalRegisterable: false,
      externalAgentDatabaseAccessAllowed: false,
    },
  };
}

function writeOut(path, payload) {
  const outPath = resolve(process.cwd(), path);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function printHuman(payload) {
  console.log("Personal OS AI Input Source Workflow proof runner");
  console.log(`Task: ${payload.taskId}`);
  console.log(`Mode: ${payload.mode}`);
  console.log(`Status: ${payload.status}`);
  console.log(`Can attempt future proof writes: ${payload.canAttemptFutureProofWrites}`);
  console.log(`Writes executed: ${payload.writesExecuted}`);
  console.log(`Target provided: ${payload.target.provided}`);
  console.log(`Target host class: ${payload.target.hostClass}`);
  console.log(`Target has proof marker: ${payload.target.databaseNameHasProofMarker}`);
  console.log(`Missing: ${payload.safety.missing.length}`);
  for (const item of payload.safety.missing) {
    console.log(`- ${item}`);
  }
  for (const warning of payload.safety.warnings) {
    console.log(`Warning: ${warning}`);
  }
  console.log("Next actions:");
  for (const action of payload.nextActions) {
    console.log(`- ${action}`);
  }
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const payload = buildPayload(args);
  if (args.out) {
    writeOut(args.out ?? DEFAULT_OUT, payload);
  }

  if (args.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    printHuman(payload);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
