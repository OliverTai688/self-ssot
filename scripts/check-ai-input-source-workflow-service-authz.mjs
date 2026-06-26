#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONTRACT_PATH = path.join(
  ROOT,
  "src/lib/contracts/ai-input-source-workflow-service-authz.contract.ts",
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
const NANDA_DOC_PATH = path.join(
  ROOT,
  "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
);
const PROOF_TARGET_DOC_PATH = path.join(
  ROOT,
  "docs/08_acceptance-and-qa/ACC-006_ai-input-source-workflow-proof-target.md",
);

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

const REQUIRED_OPERATION_IDS = [
  "ai-input.source-workflow.list",
  "ai-input.source-workflow.detail",
  "ai-input.source-connection.review",
  "ai-input.source-asset.review",
  "ai-input.workflow-run.review",
  "ai-input.work-item.review",
  "ai-input.naming-profile.review",
  "ai-input.data-unit-proposal.review",
  "ai-input.module-write-intent.review",
  "ai-input.connector-consent.review",
  "ai-input.proof-target.review",
  "ai-input.audit-lineage.review",
];

const REQUIRED_MARKERS = [
  "AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_OBJECTS",
  "AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_REQUIRED_OPERATION_IDS",
  "AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_OPERATIONS",
  "AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_LAYERS",
  "AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_SOURCE_REFS",
  "AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_STOP_CONDITIONS",
  "AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_SUMMARY",
  "DATTR-024F-CONTRACT",
  "requireUser()",
  "service-layer authorization",
  "ownerProfileId",
  "redactionVersion",
  "retentionClass",
  "ai-input.source-workflow",
  "DataUnitProposal",
  "ModuleWriteIntent",
  "OperatingAuditEvent",
  "target module authorization",
  "externalRegisterable: false",
  "routeHandlerAllowed: false",
  "serverActionAllowedInDattr024fContract: false",
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
  "No route handler in DATTR-024F-CONTRACT.",
  "No server action in DATTR-024F-CONTRACT.",
  "No Prisma schema edit in DATTR-024F-CONTRACT.",
  "No migration apply in DATTR-024F-CONTRACT.",
  "No seed change in DATTR-024F-CONTRACT.",
  "No DB read/write in DATTR-024F-CONTRACT.",
  "No connector runtime in DATTR-024F-CONTRACT.",
  "No provider data read in DATTR-024F-CONTRACT.",
  "No public output expansion in DATTR-024F-CONTRACT.",
  "No module final write in DATTR-024F-CONTRACT.",
  "No external collaboration in DATTR-024F-CONTRACT.",
  "No external agent database access in DATTR-024F-CONTRACT.",
];

const REQUIRED_SOURCE_REFS = [
  "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md",
  "docs/02_architecture-and-rules/SCH-003_ai-input-source-workflow-schema-review.md",
  "docs/08_acceptance-and-qa/ACC-006_ai-input-source-workflow-proof-target.md",
  "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md",
  "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
  "docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md",
  "docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md",
  "https://nextjs.org/docs/app/getting-started/fetching-data",
  "https://nextjs.org/docs/app/getting-started/mutating-data",
  "https://nextjs.org/docs/app/guides/forms",
  "https://supabase.com/docs/guides/database/postgres/row-level-security",
  "https://www.prisma.io/docs/orm/prisma-client/queries/transactions",
];

const REQUIRED_DOC_MARKERS = [
  "src/lib/contracts/ai-input-source-workflow-service-authz.contract.ts",
  "scripts/check-ai-input-source-workflow-service-authz.mjs",
  "pnpm ai-input:service-authz:check",
  "DATTR-024F-CONTRACT",
  "service authorization",
  "requireUser()",
  "ownerProfileId",
  "SourceNamingProfile",
  "DataUnitProposal",
  "ModuleWriteIntent",
  "externalRegisterable: false",
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
  "import ",
  "from \"",
  "from '",
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
      console.log("Usage: pnpm ai-input:service-authz:check [--json] [--out <path>]");
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
const arc031Text = readText(ARC_031_PATH);
const acc002Text = readText(ACC_002_PATH);
const backlogText = readText(BACKLOG_PATH);
const sprintText = readText(SPRINT_PATH);
const tasksText = readText(TASKS_PATH);
const packageJsonText = readText(PACKAGE_JSON_PATH);
const auditDocText = readText(AUDIT_DOC_PATH);
const nandaDocText = readText(NANDA_DOC_PATH);
const proofTargetDocText = readText(PROOF_TARGET_DOC_PATH);

for (const [name, text, filePath] of [
  ["service authz contract", contractText, CONTRACT_PATH],
  ["ARC-031", arc031Text, ARC_031_PATH],
  ["ACC-002", acc002Text, ACC_002_PATH],
  ["PLN-060", backlogText, BACKLOG_PATH],
  ["PLN-061", sprintText, SPRINT_PATH],
  ["tasks.md", tasksText, TASKS_PATH],
  ["package.json", packageJsonText, PACKAGE_JSON_PATH],
  ["DBS-006", auditDocText, AUDIT_DOC_PATH],
  ["ARC-028", nandaDocText, NANDA_DOC_PATH],
  ["ACC-006", proofTargetDocText, PROOF_TARGET_DOC_PATH],
]) {
  if (text === null) {
    errors.push(`Missing ${name}: ${relative(filePath)}`);
  }
}

if (contractText !== null) {
  validateTextMarkers({
    text: contractText,
    markers: REQUIRED_MARKERS,
    label: "Service authz contract",
    filePath: CONTRACT_PATH,
    errors,
  });

  const missingObjects = REQUIRED_OBJECTS.filter((objectId) => !contractText.includes(`"${objectId}"`));
  if (missingObjects.length > 0) {
    errors.push(`Service authz contract is missing required objects: ${missingObjects.join(", ")}`);
  }

  const missingOperations = REQUIRED_OPERATION_IDS.filter((operationId) => !contractText.includes(`id: "${operationId}"`));
  if (missingOperations.length > 0) {
    errors.push(`Service authz contract is missing operations: ${missingOperations.join(", ")}`);
  }

  const missingStopMarkers = REQUIRED_STOP_MARKERS.filter((marker) => !contractText.includes(marker));
  if (missingStopMarkers.length > 0) {
    errors.push(`Service authz contract is missing stop markers: ${missingStopMarkers.join(", ")}`);
  }

  const missingSourceRefs = REQUIRED_SOURCE_REFS.filter((ref) => !contractText.includes(ref));
  if (missingSourceRefs.length > 0) {
    errors.push(`Service authz contract is missing source refs: ${missingSourceRefs.join(", ")}`);
  }

  for (const structuralMarker of [
    "bffBoundary:",
    "authBoundary:",
    "authorizationChecks:",
    "inputDtoRules:",
    "outputDtoRules:",
    "auditActions:",
    "approval:",
    "runtimeStage:",
    "agentBoundary:",
    "stopConditions:",
  ]) {
    const count = countOccurrences(contractText, structuralMarker);
    if (count < REQUIRED_OPERATION_IDS.length) {
      errors.push(
        `Service authz contract has only ${count} ${structuralMarker} entries; expected at least ${REQUIRED_OPERATION_IDS.length}.`,
      );
    }
  }

  const layerCount = countOccurrences(contractText, "boundary: ");
  if (layerCount < 5) {
    errors.push(`Service authz contract has only ${layerCount} authorization boundary entries; expected at least 5.`);
  }

  const forbidden = FORBIDDEN_CONTRACT_PATTERNS.filter((pattern) => contractText.includes(pattern));
  if (forbidden.length > 0) {
    errors.push(`Service authz contract contains runtime-only patterns: ${forbidden.join(", ")}`);
  }

  evidence.contract = {
    path: relative(CONTRACT_PATH),
    requiredObjects: REQUIRED_OBJECTS,
    requiredOperations: REQUIRED_OPERATION_IDS,
    operationCount: countOccurrences(contractText, "id: \"ai-input."),
    safetyGuardsPresent: REQUIRED_MARKERS.filter((marker) => marker.endsWith(": false")),
  };
}

for (const [label, text, filePath] of [
  ["ARC-031", arc031Text, ARC_031_PATH],
  ["ACC-002", acc002Text, ACC_002_PATH],
]) {
  if (text !== null) {
    validateTextMarkers({
      text,
      markers: REQUIRED_DOC_MARKERS,
      label,
      filePath,
      errors,
    });
  }
}

if (backlogText !== null) {
  for (const marker of ["DATTR-024F-CONTRACT", "DONE", "ai-input:service-authz:check"]) {
    if (!backlogText.includes(marker)) {
      errors.push(`PLN-060 is missing DATTR-024F marker: ${marker}`);
    }
  }
}

if (sprintText !== null) {
  for (const marker of ["Loop 108", "DATTR-024F-CONTRACT", "ai-input:service-authz:check"]) {
    if (!sprintText.includes(marker)) {
      errors.push(`PLN-061 is missing loop 108 service-authz marker: ${marker}`);
    }
  }
}

if (tasksText !== null) {
  for (const marker of ["DATTR-024F-CONTRACT", "DONE", "DATTR-024"]) {
    if (!tasksText.includes(marker)) {
      errors.push(`tasks.md is missing service-authz marker: ${marker}`);
    }
  }
}

if (packageJsonText !== null) {
  const packageJson = JSON.parse(packageJsonText);
  if (
    packageJson.scripts?.["ai-input:service-authz:check"] !==
    "node scripts/check-ai-input-source-workflow-service-authz.mjs"
  ) {
    errors.push("package.json is missing ai-input:service-authz:check script.");
  }
}

if (auditDocText !== null && !auditDocText.includes("ai-input.source-workflow")) {
  errors.push("DBS-006 no longer includes ai-input.source-workflow audit family.");
}

if (nandaDocText !== null && !nandaDocText.includes("externalRegisterable: false")) {
  warnings.push("ARC-028 does not include the exact externalRegisterable: false marker.");
}

if (proofTargetDocText !== null && !proofTargetDocText.includes("No runtime DB read/write in DATTR-024C.")) {
  errors.push("ACC-006 no longer preserves DATTR-024C no-runtime proof-target boundary.");
}

const result = {
  id: "DATTR-024F-CONTRACT",
  status: errors.length === 0 ? "ready_for_service_authz_contract_use" : "failed",
  checkedAt: new Date().toISOString(),
  contractPath: relative(CONTRACT_PATH),
  requiredObjects: REQUIRED_OBJECTS,
  requiredOperations: REQUIRED_OPERATION_IDS,
  nextRunnableSlice: "DATTR-024",
  safetyGuards: {
    routeHandlerAllowed: false,
    serverActionAllowedInDattr024fContract: false,
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
  console.log(`AI Input source workflow service authz contract: ${result.status}`);
  console.log(`Contract: ${result.contractPath}`);
  console.log(`Operations: ${REQUIRED_OPERATION_IDS.length}`);
  console.log(`Objects: ${REQUIRED_OBJECTS.length}`);
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
