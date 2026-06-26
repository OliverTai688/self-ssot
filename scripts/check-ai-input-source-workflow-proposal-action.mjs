#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONTRACT_PATH = path.join(
  ROOT,
  "src/lib/contracts/ai-input-source-workflow-proposal-action.contract.ts",
);
const SPLIT_CONTRACT_PATH = path.join(
  ROOT,
  "src/lib/contracts/ai-input-source-workflow-split.contract.ts",
);
const ARC_031_PATH = path.join(
  ROOT,
  "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md",
);
const ACC_002_PATH = path.join(ROOT, "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md");
const BACKLOG_PATH = path.join(ROOT, "docs/05_execution-plans/PLN-060_task-backlog.md");
const SPRINT_PATH = path.join(ROOT, "docs/05_execution-plans/PLN-061_current-sprint.md");
const TASKS_PATH = path.join(ROOT, "tasks.md");
const PACKAGE_JSON_PATH = path.join(ROOT, "package.json");
const AUDIT_DOC_PATH = path.join(
  ROOT,
  "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md",
);
const PROOF_TARGET_DOC_PATH = path.join(
  ROOT,
  "docs/08_acceptance-and-qa/ACC-006_ai-input-source-workflow-proof-target.md",
);
const NANDA_DOC_PATH = path.join(
  ROOT,
  "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
);

const REQUIRED_OBJECTS = ["DataUnitProposal", "ModuleWriteIntent", "OperatingAuditEvent"];

const REQUIRED_COMMANDS = [
  "ai-input.proposal.review",
  "ai-input.proposal.request_changes",
  "ai-input.proposal.approve_for_write_intent",
  "ai-input.proposal.reject",
  "ai-input.proposal.archive",
  "ai-input.write-intent.review",
  "ai-input.write-intent.approve_draft",
  "ai-input.write-intent.request_changes",
  "ai-input.write-intent.reject",
  "ai-input.write-intent.cancel",
];

const REQUIRED_STATES = [
  "drafted_by_agent",
  "needs_owner_review",
  "changes_requested",
  "approved_for_write_intent",
  "write_intent_draft",
  "approved_for_manual_apply",
  "rejected",
  "archived",
  "superseded",
  "blocked_high_risk",
];

const REQUIRED_APPROVAL_LEVELS = [
  "AUTO_PROPOSE_ONLY",
  "OWNER_REVIEW_REQUIRED",
  "HUMAN_APPROVAL_REQUIRED",
  "BLOCKED_UNTIL_PROOF_TARGET",
  "BLOCKED_HIGH_RISK",
];

const REQUIRED_MARKERS = [
  "AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_OBJECTS",
  "AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_STATES",
  "AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_APPROVAL_LEVELS",
  "AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_COMMANDS",
  "AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_AUDIT_REFS",
  "AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_ROLLBACK",
  "AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_HIGH_RISK_POLICY",
  "AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_STOP_CONDITIONS",
  "AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_SUMMARY",
  "DATTR-024D-CONTRACT",
  "DATTR-024E-CONTRACT",
  "requireUser()",
  "service-layer authorization",
  "ownerProfileId",
  "redactionVersion",
  "ai-input.source-workflow",
  "proposal.reviewed",
  "proposal.changes_requested",
  "proposal.approved",
  "proposal.rejected",
  "write_intent.reviewed",
  "write_intent.approved_draft",
  "write_intent.rejected",
  "sourceAssetRef",
  "dataUnitProposalRef",
  "moduleWriteIntentRef",
  "rollbackPlanRef",
  "externalRegisterable: false",
  "routeHandlerAllowed: false",
  "serverActionAllowedInDattr024dContract: false",
  "schemaWriteAllowed: false",
  "migrationApplyAllowed: false",
  "seedChangeAllowed: false",
  "runtimeReadAllowed: false",
  "runtimeWriteAllowed: false",
  "connectorRuntimeAllowed: false",
  "providerDataAllowed: false",
  "publicOutputAllowed: false",
  "moduleFinalWriteAllowed: false",
  "externalCollaborationAllowed: false",
  "externalAgentDatabaseAccessAllowed: false",
];

const REQUIRED_STOP_MARKERS = [
  "No route handler in DATTR-024D-CONTRACT.",
  "No server action in DATTR-024D-CONTRACT.",
  "No Prisma schema edit in DATTR-024D-CONTRACT.",
  "No migration apply in DATTR-024D-CONTRACT.",
  "No seed change in DATTR-024D-CONTRACT.",
  "No DB read/write in DATTR-024D-CONTRACT.",
  "No connector runtime in DATTR-024D-CONTRACT.",
  "No provider data read in DATTR-024D-CONTRACT.",
  "No public output expansion in DATTR-024D-CONTRACT.",
  "No module final write in DATTR-024D-CONTRACT.",
  "No external collaboration in DATTR-024D-CONTRACT.",
  "No external agent database access in DATTR-024D-CONTRACT.",
];

const REQUIRED_DOC_MARKERS = [
  "src/lib/contracts/ai-input-source-workflow-proposal-action.contract.ts",
  "scripts/check-ai-input-source-workflow-proposal-action.mjs",
  "pnpm ai-input:proposal-action:check",
  "DATTR-024D-CONTRACT",
  "DataUnitProposal",
  "ModuleWriteIntent",
  "OperatingAuditEvent",
  "ai-input.proposal.approve_for_write_intent",
  "ai-input.write-intent.approve_draft",
  "externalRegisterable: false",
];

const REQUIRED_SOURCE_REFS = [
  "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md",
  "docs/08_acceptance-and-qa/ACC-006_ai-input-source-workflow-proof-target.md",
  "docs/02_architecture-and-rules/SCH-003_ai-input-source-workflow-schema-review.md",
  "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md",
  "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
  "docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md",
  "docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md",
  "https://nextjs.org/docs/app/getting-started/mutating-data",
  "https://nextjs.org/docs/app/guides/forms",
  "https://supabase.com/docs/guides/database/postgres/row-level-security",
  "https://www.prisma.io/docs/orm/prisma-client/queries/transactions",
];

const FORBIDDEN_CONTRACT_PATTERNS = [
  "new PrismaClient",
  "PrismaPg",
  "new Pool",
  "process.env.",
  "fetch(",
  "createServerClient",
  "createClient(",
  "spawnSync(",
  "execSync(",
  "$transaction(",
  "revalidatePath(",
];

function parseArgs(argv) {
  const args = {
    json: false,
    out: null,
  };
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
      console.log("Usage: pnpm ai-input:proposal-action:check [--json] [--out <path>]");
      process.exit(0);
    }
  }

  return args;
}

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
}

function relative(filePath) {
  return path.relative(ROOT, filePath);
}

function countOccurrences(text, marker) {
  return text.split(marker).length - 1;
}

function validateTextMarkers({ text, markers, label, filePath, errors }) {
  const missing = markers.filter((marker) => !text.includes(marker));
  if (missing.length > 0) {
    errors.push(`${label} is missing markers: ${missing.join(", ")} (${relative(filePath)})`);
  }
}

const args = parseArgs(process.argv.slice(2));
const errors = [];
const warnings = [];
const evidence = {};

const contractText = readText(CONTRACT_PATH);
const splitContractText = readText(SPLIT_CONTRACT_PATH);
const arc031Text = readText(ARC_031_PATH);
const acc002Text = readText(ACC_002_PATH);
const backlogText = readText(BACKLOG_PATH);
const sprintText = readText(SPRINT_PATH);
const tasksText = readText(TASKS_PATH);
const packageJsonText = readText(PACKAGE_JSON_PATH);
const auditDocText = readText(AUDIT_DOC_PATH);
const proofTargetDocText = readText(PROOF_TARGET_DOC_PATH);
const nandaDocText = readText(NANDA_DOC_PATH);

for (const [name, text, filePath] of [
  ["proposal action contract", contractText, CONTRACT_PATH],
  ["split contract", splitContractText, SPLIT_CONTRACT_PATH],
  ["ARC-031", arc031Text, ARC_031_PATH],
  ["ACC-002", acc002Text, ACC_002_PATH],
  ["PLN-060", backlogText, BACKLOG_PATH],
  ["PLN-061", sprintText, SPRINT_PATH],
  ["tasks.md", tasksText, TASKS_PATH],
  ["package.json", packageJsonText, PACKAGE_JSON_PATH],
  ["DBS-006", auditDocText, AUDIT_DOC_PATH],
  ["ACC-006", proofTargetDocText, PROOF_TARGET_DOC_PATH],
  ["ARC-028", nandaDocText, NANDA_DOC_PATH],
]) {
  if (text === null) {
    errors.push(`Missing ${name}: ${relative(filePath)}`);
  }
}

if (contractText !== null) {
  validateTextMarkers({
    text: contractText,
    markers: REQUIRED_MARKERS,
    label: "Proposal action contract",
    filePath: CONTRACT_PATH,
    errors,
  });

  const missingObjects = REQUIRED_OBJECTS.filter((objectId) => !contractText.includes(`"${objectId}"`));
  if (missingObjects.length > 0) {
    errors.push(`Proposal action contract is missing required objects: ${missingObjects.join(", ")}`);
  }

  const missingCommands = REQUIRED_COMMANDS.filter((commandId) => !contractText.includes(`id: "${commandId}"`));
  if (missingCommands.length > 0) {
    errors.push(`Proposal action contract is missing commands: ${missingCommands.join(", ")}`);
  }

  const missingStates = REQUIRED_STATES.filter((stateId) => !contractText.includes(`id: "${stateId}"`));
  if (missingStates.length > 0) {
    errors.push(`Proposal action contract is missing states: ${missingStates.join(", ")}`);
  }

  const missingApprovals = REQUIRED_APPROVAL_LEVELS.filter((level) => !contractText.includes(`id: "${level}"`));
  if (missingApprovals.length > 0) {
    errors.push(`Proposal action contract is missing approval levels: ${missingApprovals.join(", ")}`);
  }

  const missingStopMarkers = REQUIRED_STOP_MARKERS.filter((marker) => !contractText.includes(marker));
  if (missingStopMarkers.length > 0) {
    errors.push(`Proposal action contract is missing stop markers: ${missingStopMarkers.join(", ")}`);
  }

  const missingSourceRefs = REQUIRED_SOURCE_REFS.filter((ref) => !contractText.includes(ref));
  if (missingSourceRefs.length > 0) {
    errors.push(`Proposal action contract is missing source refs: ${missingSourceRefs.join(", ")}`);
  }

  for (const structuralMarker of ["validation:", "rollback:", "stopConditions:"]) {
    const count = countOccurrences(contractText, structuralMarker);
    if (count < REQUIRED_COMMANDS.length) {
      errors.push(
        `Proposal action contract has only ${count} ${structuralMarker} entries; expected at least ${REQUIRED_COMMANDS.length}.`,
      );
    }
  }

  const auditActionCount = countOccurrences(contractText, "action: ");
  if (auditActionCount < 8) {
    errors.push(`Proposal action contract has only ${auditActionCount} audit action entries; expected at least 8.`);
  }

  const forbidden = FORBIDDEN_CONTRACT_PATTERNS.filter((pattern) => contractText.includes(pattern));
  if (forbidden.length > 0) {
    errors.push(`Proposal action contract contains runtime-only patterns: ${forbidden.join(", ")}`);
  }

  evidence.contract = {
    path: relative(CONTRACT_PATH),
    requiredObjects: REQUIRED_OBJECTS,
    requiredCommands: REQUIRED_COMMANDS,
    requiredStates: REQUIRED_STATES,
    approvalLevels: REQUIRED_APPROVAL_LEVELS,
    commandCount: countOccurrences(contractText, "id: \"ai-input."),
    safetyGuardsPresent: REQUIRED_MARKERS.filter((marker) => marker.endsWith(": false")),
  };
}

if (splitContractText !== null) {
  for (const marker of ["DATTR-024D", "proposal_action_contract", "DATTR-024E", "connector_boundary_review"]) {
    if (!splitContractText.includes(marker)) {
      errors.push(`Split contract is missing DATTR-024D/DATTR-024E marker: ${marker}`);
    }
  }
}

if (arc031Text !== null) {
  validateTextMarkers({
    text: arc031Text,
    markers: REQUIRED_DOC_MARKERS,
    label: "ARC-031",
    filePath: ARC_031_PATH,
    errors,
  });
}

if (acc002Text !== null) {
  validateTextMarkers({
    text: acc002Text,
    markers: REQUIRED_DOC_MARKERS,
    label: "ACC-002",
    filePath: ACC_002_PATH,
    errors,
  });
}

if (backlogText !== null) {
  for (const marker of ["DATTR-024D-CONTRACT", "DONE", "ai-input:proposal-action:check"]) {
    if (!backlogText.includes(marker)) {
      errors.push(`PLN-060 is missing DATTR-024D completion marker: ${marker}`);
    }
  }
}

if (sprintText !== null) {
  for (const marker of ["Loop 66", "DATTR-024D-CONTRACT", "ai-input:proposal-action:check"]) {
    if (!sprintText.includes(marker)) {
      errors.push(`PLN-061 is missing loop 66 proposal-action marker: ${marker}`);
    }
  }
}

if (tasksText !== null) {
  for (const marker of ["DATTR-024D-CONTRACT", "DONE", "DATTR-024E-CONTRACT"]) {
    if (!tasksText.includes(marker)) {
      errors.push(`tasks.md is missing proposal-action marker: ${marker}`);
    }
  }
}

if (packageJsonText !== null) {
  const packageJson = JSON.parse(packageJsonText);
  if (
    packageJson.scripts?.["ai-input:proposal-action:check"] !==
    "node scripts/check-ai-input-source-workflow-proposal-action.mjs"
  ) {
    errors.push("package.json is missing ai-input:proposal-action:check script.");
  }
}

if (auditDocText !== null && !auditDocText.includes("ai-input.source-workflow")) {
  errors.push("DBS-006 no longer includes ai-input.source-workflow audit family.");
}

if (proofTargetDocText !== null && !proofTargetDocText.includes("DATTR-024C")) {
  errors.push("ACC-006 no longer includes DATTR-024C proof target boundary.");
}

if (nandaDocText !== null && !nandaDocText.includes("externalRegisterable: false")) {
  warnings.push("ARC-028 does not include the exact externalRegisterable: false marker.");
}

const result = {
  id: "DATTR-024D-CONTRACT",
  status: errors.length === 0 ? "ready_for_proposal_action_contract_use" : "failed",
  checkedAt: new Date().toISOString(),
  contractPath: relative(CONTRACT_PATH),
  splitContractPath: relative(SPLIT_CONTRACT_PATH),
  requiredObjects: REQUIRED_OBJECTS,
  requiredCommands: REQUIRED_COMMANDS,
  requiredStates: REQUIRED_STATES,
  requiredApprovalLevels: REQUIRED_APPROVAL_LEVELS,
  completedFollowUpSlice: "DATTR-024E-CONTRACT",
  nextRunnableSlice: "DATTR-024",
  safetyGuards: {
    routeHandlerAllowed: false,
    serverActionAllowedInDattr024dContract: false,
    schemaWriteAllowed: false,
    migrationApplyAllowed: false,
    seedChangeAllowed: false,
    runtimeReadAllowed: false,
    runtimeWriteAllowed: false,
    connectorRuntimeAllowed: false,
    providerDataAllowed: false,
    publicOutputAllowed: false,
    moduleFinalWriteAllowed: false,
    externalCollaborationAllowed: false,
    externalAgentDatabaseAccessAllowed: false,
    externalRegisterable: false,
  },
  evidence,
  errors,
  warnings,
};

if (args.out) {
  fs.mkdirSync(path.dirname(path.join(ROOT, args.out)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, args.out), `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`AI Input source workflow proposal action contract: ${result.status}`);
  console.log(`Contract: ${result.contractPath}`);
  console.log(`Commands: ${REQUIRED_COMMANDS.length}`);
  console.log(`States: ${REQUIRED_STATES.length}`);
  console.log(`Next runnable slice: ${result.nextRunnableSlice}`);

  if (args.out) {
    console.log(`Proof written: ${args.out}`);
  }

  if (warnings.length > 0) {
    console.log("");
    console.log("Warnings:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (errors.length > 0) {
    console.log("");
    console.log("Errors:");
    for (const error of errors) {
      console.log(`- ${error}`);
    }
  }
}

if (errors.length > 0) {
  process.exitCode = 1;
}
