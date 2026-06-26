#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PROOF_RUNNER_PATH = path.join(ROOT, "scripts/ai-input-source-workflow-proof-runner.mjs");
const CHECKER_PATH = path.join(ROOT, "scripts/check-ai-input-source-workflow-proof-runner.mjs");
const PACKAGE_JSON_PATH = path.join(ROOT, "package.json");
const ARC_031_PATH = path.join(ROOT, "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md");
const MIG_003_PATH = path.join(
  ROOT,
  "docs/02_architecture-and-rules/MIG-003_ai-input-source-workflow-create-only-migration-draft.md",
);
const ACC_006_PATH = path.join(ROOT, "docs/08_acceptance-and-qa/ACC-006_ai-input-source-workflow-proof-target.md");
const ACC_002_PATH = path.join(ROOT, "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md");
const BACKLOG_PATH = path.join(ROOT, "docs/05_execution-plans/PLN-060_task-backlog.md");
const SPRINT_PATH = path.join(ROOT, "docs/05_execution-plans/PLN-061_current-sprint.md");
const TASKS_PATH = path.join(ROOT, "tasks.md");
const COMPLETED_LOG_PATH = path.join(ROOT, "docs/06_audits-and-reports/RPT-007_completed-log.md");

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

const REQUIRED_RUNNER_MARKERS = [
  "DATTR-024I-PROOF-RUNNER",
  "AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL",
  "PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES",
  "PERSONAL_OS_AI_INPUT_PROOF_CONFIRM",
  "PERSONAL_OS_AI_INPUT_PROOF_ALLOW_REMOTE",
  "I_UNDERSTAND_THIS_WRITES_TEST_DATA",
  "doesNotConnectToDatabase: true",
  "doesNotApplyMigration: true",
  "doesNotWriteDatabase: true",
  "externalAgentDatabaseAccessAllowed: false",
  "externalRegisterable: false",
  "printsSecrets: false",
  "database URLs",
  "database hosts",
  "dry_run_ready",
  "blocked_before_db_writes_by_dattr024i_boundary",
  "DATTR-024J-SERVICE-AUTHZ-RUNTIME",
];

const REQUIRED_DOC_MARKERS = [
  "DATTR-024I-PROOF-RUNNER",
  "scripts/ai-input-source-workflow-proof-runner.mjs",
  "scripts/check-ai-input-source-workflow-proof-runner.mjs",
  "pnpm ai-input:proof",
  "pnpm ai-input:proof-runner:check",
  "AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL",
  "PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES=1",
  "PERSONAL_OS_AI_INPUT_PROOF_CONFIRM=I_UNDERSTAND_THIS_WRITES_TEST_DATA",
  "DATTR-024J-SERVICE-AUTHZ-RUNTIME",
  "externalRegisterable=false",
];

function parseArgs(argv) {
  const args = { json: false, out: null };
  const filteredArgs = argv.filter((arg) => arg !== "--");

  for (let index = 0; index < filteredArgs.length; index += 1) {
    const arg = filteredArgs[index];
    if (arg === "--json") {
      args.json = true;
      continue;
    }
    if (arg === "--out") {
      args.out = filteredArgs[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log("Usage: pnpm ai-input:proof-runner:check [--json] [--out <path>]");
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
}

function relative(filePath) {
  return path.relative(ROOT, filePath);
}

function missingMarkers(text, markers) {
  return markers.filter((marker) => !text.includes(marker));
}

const args = parseArgs(process.argv.slice(2));
const errors = [];
const warnings = [];
const evidence = {};

const proofRunnerText = readText(PROOF_RUNNER_PATH);
const checkerText = readText(CHECKER_PATH);
const packageJsonText = readText(PACKAGE_JSON_PATH);
const arc031Text = readText(ARC_031_PATH);
const mig003Text = readText(MIG_003_PATH);
const acc006Text = readText(ACC_006_PATH);
const acc002Text = readText(ACC_002_PATH);
const backlogText = readText(BACKLOG_PATH);
const sprintText = readText(SPRINT_PATH);
const tasksText = readText(TASKS_PATH);
const completedLogText = readText(COMPLETED_LOG_PATH);

for (const [label, text, filePath] of [
  ["proof runner", proofRunnerText, PROOF_RUNNER_PATH],
  ["checker", checkerText, CHECKER_PATH],
  ["package.json", packageJsonText, PACKAGE_JSON_PATH],
  ["ARC-031", arc031Text, ARC_031_PATH],
  ["MIG-003", mig003Text, MIG_003_PATH],
  ["ACC-006", acc006Text, ACC_006_PATH],
  ["ACC-002", acc002Text, ACC_002_PATH],
  ["PLN-060", backlogText, BACKLOG_PATH],
  ["PLN-061", sprintText, SPRINT_PATH],
  ["tasks.md", tasksText, TASKS_PATH],
  ["RPT-007", completedLogText, COMPLETED_LOG_PATH],
]) {
  if (text === null) {
    errors.push(`Missing ${label}: ${relative(filePath)}`);
  }
}

if (proofRunnerText !== null) {
  const missingRunnerMarkers = missingMarkers(proofRunnerText, [
    ...REQUIRED_RUNNER_MARKERS,
    ...REQUIRED_OBJECTS,
  ]);
  if (missingRunnerMarkers.length > 0) {
    errors.push(`Proof runner is missing markers: ${missingRunnerMarkers.join(", ")}`);
  }

  evidence.proofRunner = {
    path: relative(PROOF_RUNNER_PATH),
    requiredObjects: REQUIRED_OBJECTS,
    dryRunFirst: proofRunnerText.includes("dry_run_ready"),
    noDbConnection: proofRunnerText.includes("doesNotConnectToDatabase: true"),
  };
}

if (checkerText !== null) {
  const missingCheckerMarkers = missingMarkers(checkerText, [
    "DATTR-024I-PROOF-RUNNER",
    "REQUIRED_RUNNER_MARKERS",
    "REQUIRED_DOC_MARKERS",
  ]);
  if (missingCheckerMarkers.length > 0) {
    errors.push(`Proof runner checker is missing self-check markers: ${missingCheckerMarkers.join(", ")}`);
  }
}

if (packageJsonText !== null) {
  const packageJson = JSON.parse(packageJsonText);
  if (packageJson.scripts?.["ai-input:proof"] !== "node scripts/ai-input-source-workflow-proof-runner.mjs") {
    errors.push("package.json is missing ai-input:proof script.");
  }
  if (
    packageJson.scripts?.["ai-input:proof-runner:check"] !==
    "node scripts/check-ai-input-source-workflow-proof-runner.mjs"
  ) {
    errors.push("package.json is missing ai-input:proof-runner:check script.");
  }
}

for (const [label, text, filePath, markers] of [
  ["ARC-031", arc031Text, ARC_031_PATH, REQUIRED_DOC_MARKERS],
  ["MIG-003", mig003Text, MIG_003_PATH, ["DATTR-024I-PROOF-RUNNER", "pnpm ai-input:proof"]],
  ["ACC-006", acc006Text, ACC_006_PATH, ["DATTR-024I-PROOF-RUNNER", "pnpm ai-input:proof"]],
  ["ACC-002", acc002Text, ACC_002_PATH, REQUIRED_DOC_MARKERS],
  ["PLN-060", backlogText, BACKLOG_PATH, REQUIRED_DOC_MARKERS],
  ["PLN-061", sprintText, SPRINT_PATH, REQUIRED_DOC_MARKERS],
  ["tasks.md", tasksText, TASKS_PATH, REQUIRED_DOC_MARKERS],
  ["RPT-007", completedLogText, COMPLETED_LOG_PATH, REQUIRED_DOC_MARKERS],
]) {
  if (text === null) {
    continue;
  }
  const missing = missingMarkers(text, markers);
  if (missing.length > 0) {
    errors.push(`${label} is missing DATTR-024I markers: ${missing.join(", ")} (${relative(filePath)})`);
  }
}

const result = {
  id: "DATTR-024I-PROOF-RUNNER",
  status: errors.length === 0 ? "ready_for_dry_run_first_proof_runner_use" : "failed",
  checkedAt: new Date().toISOString(),
  nextRunnableSlice: "DATTR-024J-SERVICE-AUTHZ-RUNTIME",
  safetyGuards: {
    dryRunFirst: true,
    dbConnectionAllowedByChecker: false,
    migrationApplyAllowed: false,
    runtimeWriteAllowed: false,
    connectorRuntimeAllowed: false,
    providerDataAllowed: false,
    publicOutputAllowed: false,
    moduleFinalWriteAllowed: false,
    externalAgentDatabaseAccessAllowed: false,
    externalRegisterable: false,
  },
  evidence,
  errors,
  warnings,
};

if (args.out) {
  const outPath = path.resolve(ROOT, args.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
}

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else if (errors.length === 0) {
  console.log(
    `AI Input Source Workflow proof runner check passed: ${result.status} (${result.nextRunnableSlice})`,
  );
} else {
  console.error(`AI Input Source Workflow proof runner check failed with ${errors.length} error(s):`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
}

process.exit(errors.length === 0 ? 0 : 1);
