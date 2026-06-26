#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONTRACT_PATH = path.join(
  ROOT,
  "src/lib/contracts/ai-input-source-workflow-proof-target.contract.ts",
);
const PROOF_TARGET_DOC_PATH = path.join(
  ROOT,
  "docs/08_acceptance-and-qa/ACC-006_ai-input-source-workflow-proof-target.md",
);
const SCHEMA_REVIEW_DOC_PATH = path.join(
  ROOT,
  "docs/02_architecture-and-rules/SCH-003_ai-input-source-workflow-schema-review.md",
);
const SPLIT_DOC_PATH = path.join(
  ROOT,
  "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md",
);
const ACCEPTANCE_DOC_PATH = path.join(
  ROOT,
  "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
);
const BACKLOG_PATH = path.join(ROOT, "docs/05_execution-plans/PLN-060_task-backlog.md");
const PACKAGE_JSON_PATH = path.join(ROOT, "package.json");

const REQUIRED_OBJECTS = [
  "SourceConnection",
  "SourceAsset",
  "AIWorkflowRun",
  "AIWorkItem",
  "DataUnitProposal",
  "ModuleWriteIntent",
  "OperatingAuditEvent",
];

const REQUIRED_AREAS = [
  "target-selection",
  "write-confirmation",
  "migration-boundary",
  "data-isolation",
  "cleanup-rollback",
  "audit-proof",
  "secret-redaction",
  "rls-authz",
  "transaction-behavior",
  "stop-condition",
];

const REQUIRED_MARKERS = [
  "AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_OBJECTS",
  "AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_ENV",
  "AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_REQUIREMENTS",
  "AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_SEQUENCE",
  "AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_SUMMARY",
  "DATTR-024C",
  "AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL",
  "PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES=1",
  "PERSONAL_OS_AI_INPUT_PROOF_CONFIRM=I_UNDERSTAND_THIS_WRITES_TEST_DATA",
  "PERSONAL_OS_AI_INPUT_PROOF_ALLOW_REMOTE=1",
  "AI-INPUT-SOURCE-WORKFLOW-PROOF",
  "example.invalid",
  "ownerProfileId",
  "requireUser()",
  "service-layer authorization",
  "ai-input.source-workflow",
  "proof.target_reviewed",
  "proof.started",
  "proof.records_created",
  "proof.reconnected",
  "proof.cleaned_up",
  "proof.blocked",
  "writesAllowedByDefault: false",
  "runtimeReadAllowedInDattr024c: false",
  "runtimeWriteAllowedInDattr024c: false",
  "migrationApplyAllowed: false",
  "valuableDatabaseAllowed: false",
  "providerDataAllowed: false",
  "connectorRuntimeAllowed: false",
  "publicOutputAllowed: false",
  "moduleFinalWriteAllowed: false",
  "externalAgentDatabaseAccessAllowed: false",
  "externalRegisterable: false",
];

const REQUIRED_DOC_MARKERS = [
  "No Prisma schema edit in DATTR-024C",
  "No migration apply in DATTR-024C",
  "No runtime DB read/write in DATTR-024C",
  "No connector runtime in DATTR-024C",
  "No provider data in DATTR-024C",
  "No public output expansion in DATTR-024C",
  "No module final write in DATTR-024C",
  "No external agent database access in DATTR-024C",
  "externalRegisterable: false",
  "AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL",
  "PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES=1",
  "PERSONAL_OS_AI_INPUT_PROOF_CONFIRM=I_UNDERSTAND_THIS_WRITES_TEST_DATA",
  "PERSONAL_OS_AI_INPUT_PROOF_ALLOW_REMOTE=1",
  "pnpm ai-input:proof-target:check",
];

const REQUIRED_OFFICIAL_REFS = [
  "https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production",
  "https://www.prisma.io/docs/orm/prisma-client/queries/transactions",
  "https://supabase.com/docs/guides/local-development",
  "https://supabase.com/docs/guides/database/postgres/row-level-security",
  "https://www.postgresql.org/docs/current/ddl-constraints.html",
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
      console.log("Usage: pnpm ai-input:proof-target:check [--json] [--out <path>]");
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

const args = parseArgs(process.argv.slice(2));
const errors = [];
const warnings = [];
const evidence = {};

const contractText = readText(CONTRACT_PATH);
const proofTargetDocText = readText(PROOF_TARGET_DOC_PATH);
const schemaReviewDocText = readText(SCHEMA_REVIEW_DOC_PATH);
const splitDocText = readText(SPLIT_DOC_PATH);
const acceptanceDocText = readText(ACCEPTANCE_DOC_PATH);
const backlogText = readText(BACKLOG_PATH);
const packageJsonText = readText(PACKAGE_JSON_PATH);

for (const [name, text, filePath] of [
  ["proof target contract", contractText, CONTRACT_PATH],
  ["ACC-006 proof target doc", proofTargetDocText, PROOF_TARGET_DOC_PATH],
  ["SCH-003 schema review doc", schemaReviewDocText, SCHEMA_REVIEW_DOC_PATH],
  ["ARC-031 split doc", splitDocText, SPLIT_DOC_PATH],
  ["ACC-002 acceptance doc", acceptanceDocText, ACCEPTANCE_DOC_PATH],
  ["PLN-060 backlog", backlogText, BACKLOG_PATH],
  ["package.json", packageJsonText, PACKAGE_JSON_PATH],
]) {
  if (text === null) {
    errors.push(`Missing ${name}: ${relative(filePath)}`);
  }
}

if (contractText !== null) {
  const missingMarkers = REQUIRED_MARKERS.filter((marker) => !contractText.includes(marker));
  if (missingMarkers.length > 0) {
    errors.push(`Proof target contract is missing required markers: ${missingMarkers.join(", ")}`);
  }

  const missingObjects = REQUIRED_OBJECTS.filter((objectId) => !contractText.includes(`"${objectId}"`));
  if (missingObjects.length > 0) {
    errors.push(`Proof target contract is missing required objects: ${missingObjects.join(", ")}`);
  }

  const missingAreas = REQUIRED_AREAS.filter((area) => !contractText.includes(`area: "${area}"`));
  if (missingAreas.length > 0) {
    errors.push(`Proof target contract is missing required areas: ${missingAreas.join(", ")}`);
  }

  for (const structuralMarker of ["requirement:", "acceptance:", "rejects:"]) {
    const count = countOccurrences(contractText, structuralMarker);
    if (count < REQUIRED_AREAS.length) {
      errors.push(
        `Proof target contract has only ${count} ${structuralMarker} entries; expected at least ${REQUIRED_AREAS.length}.`,
      );
    }
  }

  const forbidden = FORBIDDEN_CONTRACT_PATTERNS.filter((pattern) => contractText.includes(pattern));
  if (forbidden.length > 0) {
    errors.push(`Proof target contract contains runtime-only patterns: ${forbidden.join(", ")}`);
  }

  evidence.contract = {
    path: relative(CONTRACT_PATH),
    requiredObjects: REQUIRED_OBJECTS,
    requiredAreas: REQUIRED_AREAS,
    safetyGuardsPresent: REQUIRED_MARKERS.filter((marker) => marker.endsWith(": false")),
    officialRefsPresent: REQUIRED_OFFICIAL_REFS.filter((url) => contractText.includes(url)),
  };
}

if (proofTargetDocText !== null) {
  const missingDocMarkers = REQUIRED_DOC_MARKERS.filter((marker) => !proofTargetDocText.includes(marker));
  if (missingDocMarkers.length > 0) {
    errors.push(`ACC-006 is missing proof target markers: ${missingDocMarkers.join(", ")}`);
  }

  const missingDocObjects = REQUIRED_OBJECTS.filter((objectId) => !proofTargetDocText.includes(objectId));
  if (missingDocObjects.length > 0) {
    errors.push(`ACC-006 is missing required objects: ${missingDocObjects.join(", ")}`);
  }

  const missingOfficialRefs = REQUIRED_OFFICIAL_REFS.filter((url) => !proofTargetDocText.includes(url));
  if (missingOfficialRefs.length > 0) {
    errors.push(`ACC-006 is missing official references: ${missingOfficialRefs.join(", ")}`);
  }
}

if (schemaReviewDocText !== null && !schemaReviewDocText.includes("DATTR-024C")) {
  errors.push("SCH-003 no longer routes to DATTR-024C.");
}

if (splitDocText !== null) {
  for (const marker of ["DATTR-024C", "ACC-006", "pnpm ai-input:proof-target:check"]) {
    if (!splitDocText.includes(marker)) {
      errors.push(`ARC-031 is missing DATTR-024C marker: ${marker}`);
    }
  }
}

if (acceptanceDocText !== null) {
  for (const marker of ["DATTR-024C", "ACC-006", "pnpm ai-input:proof-target:check"]) {
    if (!acceptanceDocText.includes(marker)) {
      errors.push(`ACC-002 is missing DATTR-024C marker: ${marker}`);
    }
  }
}

if (backlogText !== null) {
  for (const marker of ["DATTR-024C", "ACC-006", "ai-input:proof-target:check"]) {
    if (!backlogText.includes(marker)) {
      errors.push(`PLN-060 is missing DATTR-024C marker: ${marker}`);
    }
  }
}

if (packageJsonText !== null) {
  const packageJson = JSON.parse(packageJsonText);
  if (
    packageJson.scripts?.["ai-input:proof-target:check"] !==
    "node scripts/check-ai-input-source-workflow-proof-target.mjs"
  ) {
    errors.push("package.json is missing ai-input:proof-target:check script.");
  }
}

const result = {
  id: "DATTR-024C",
  status: errors.length === 0 ? "ready_for_proof_target_boundary_use" : "failed",
  checkedAt: new Date().toISOString(),
  requiredObjects: REQUIRED_OBJECTS,
  requiredAreas: REQUIRED_AREAS,
  nextRecommendedTask:
    "AUTH-005 or WORK-009 if proof prerequisites appear; otherwise loop 63 RES-001/RES-002 research-to-task review.",
  safetyGuards: {
    writesAllowedByDefault: false,
    runtimeReadAllowedInDattr024c: false,
    runtimeWriteAllowedInDattr024c: false,
    migrationApplyAllowed: false,
    valuableDatabaseAllowed: false,
    providerDataAllowed: false,
    connectorRuntimeAllowed: false,
    publicOutputAllowed: false,
    moduleFinalWriteAllowed: false,
    externalAgentDatabaseAccessAllowed: false,
  },
  officialSourceRefs: REQUIRED_OFFICIAL_REFS,
  evidence,
  warnings,
  errors,
};

if (args.out) {
  const outPath = path.resolve(ROOT, args.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
}

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else if (errors.length === 0) {
  console.log("AI Input source workflow proof target boundary check passed.");
  console.log(`Required objects: ${REQUIRED_OBJECTS.join(", ")}`);
  console.log("Status: ready_for_proof_target_boundary_use");
} else {
  console.error("AI Input source workflow proof target boundary check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
}

process.exit(errors.length === 0 ? 0 : 1);
