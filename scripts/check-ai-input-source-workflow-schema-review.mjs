#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONTRACT_PATH = path.join(
  ROOT,
  "src/lib/contracts/ai-input-source-workflow-schema-review.contract.ts",
);
const SCHEMA_DOC_PATH = path.join(
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
const PRISMA_SCHEMA_PATH = path.join(ROOT, "prisma/schema.prisma");
const MIGRATION_DRAFT_DOC_PATH = path.join(
  ROOT,
  "docs/02_architecture-and-rules/MIG-003_ai-input-source-workflow-create-only-migration-draft.md",
);
const MIGRATION_DRAFT_SQL_PATH = path.join(
  ROOT,
  "prisma/migration-drafts/20260623_dattr_024h_source_workflow_create_only/migration.sql",
);

const REQUIRED_OBJECTS = [
  "SourceConnection",
  "SourceAsset",
  "AIWorkflowRun",
  "AIWorkItem",
  "DataUnitProposal",
  "ModuleWriteIntent",
  "OperatingAuditEvent",
];

const REQUIRED_MARKERS = [
  "AI_INPUT_SOURCE_WORKFLOW_SCHEMA_REVIEW_OBJECTS",
  "AI_INPUT_SOURCE_WORKFLOW_SCHEMA_REVIEW_MIGRATION_PLAN",
  "AI_INPUT_SOURCE_WORKFLOW_SCHEMA_REVIEW_SUMMARY",
  "DATTR-024B",
  "DATTR-024C",
  "SCH-003",
  "ownerProfileId",
  "requireUser()",
  "service-layer authorization",
  "retentionClass",
  "redactionVersion",
  "ai-input.source-workflow",
  "schemaWriteAllowed: false",
  "migrationApplyAllowed: false",
  "runtimeReadAllowed: false",
  "runtimeWriteAllowed: false",
  "connectorRuntimeAllowed: false",
  "publicOutputExpansionAllowed: false",
  "moduleFinalWriteAllowed: false",
  "externalAgentDatabaseAccessAllowed: false",
  "externalRegisterable: false",
];

const REQUIRED_OFFICIAL_REFS = [
  "https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production",
  "https://www.prisma.io/docs/orm/prisma-client/queries/transactions",
  "https://supabase.com/docs/guides/database/postgres/row-level-security",
  "https://supabase.com/docs/guides/database/vault",
  "https://www.postgresql.org/docs/current/ddl-constraints.html",
];

const FORBIDDEN_CONTRACT_PATTERNS = [
  "new PrismaClient",
  "process.env.DATABASE_URL",
  "process.env.SUPABASE",
  "fetch(",
  "createServerClient",
  "createClient(",
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
      console.log("Usage: pnpm ai-input:schema-review:check [--json] [--out <path>]");
      process.exit(0);
    }
  }

  return args;
}

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
}

function countOccurrences(text, marker) {
  return text.split(marker).length - 1;
}

function relative(filePath) {
  return path.relative(ROOT, filePath);
}

const args = parseArgs(process.argv.slice(2));
const errors = [];
const warnings = [];
const evidence = {};

const contractText = readText(CONTRACT_PATH);
const schemaDocText = readText(SCHEMA_DOC_PATH);
const splitDocText = readText(SPLIT_DOC_PATH);
const acceptanceDocText = readText(ACCEPTANCE_DOC_PATH);
const backlogText = readText(BACKLOG_PATH);
const packageJsonText = readText(PACKAGE_JSON_PATH);
const prismaSchemaText = readText(PRISMA_SCHEMA_PATH);
const migrationDraftDocText = readText(MIGRATION_DRAFT_DOC_PATH);
const migrationDraftSqlText = readText(MIGRATION_DRAFT_SQL_PATH);

for (const [name, text, filePath] of [
  ["contract", contractText, CONTRACT_PATH],
  ["schema doc", schemaDocText, SCHEMA_DOC_PATH],
  ["split doc", splitDocText, SPLIT_DOC_PATH],
  ["acceptance doc", acceptanceDocText, ACCEPTANCE_DOC_PATH],
  ["backlog", backlogText, BACKLOG_PATH],
  ["package.json", packageJsonText, PACKAGE_JSON_PATH],
  ["Prisma schema", prismaSchemaText, PRISMA_SCHEMA_PATH],
]) {
  if (text === null) {
    errors.push(`Missing ${name}: ${relative(filePath)}`);
  }
}

if (contractText !== null) {
  const missingMarkers = REQUIRED_MARKERS.filter((marker) => !contractText.includes(marker));
  if (missingMarkers.length > 0) {
    errors.push(`Contract is missing required markers: ${missingMarkers.join(", ")}`);
  }

  const missingObjects = REQUIRED_OBJECTS.filter((objectId) => !contractText.includes(`id: "${objectId}"`));
  if (missingObjects.length > 0) {
    errors.push(`Contract is missing required object entries: ${missingObjects.join(", ")}`);
  }

  const forbidden = FORBIDDEN_CONTRACT_PATTERNS.filter((pattern) => contractText.includes(pattern));
  if (forbidden.length > 0) {
    errors.push(`Contract contains runtime-only patterns: ${forbidden.join(", ")}`);
  }

  for (const structuralMarker of [
    "tableNameProposal:",
    "recommendedIndexes:",
    "stopConditions:",
    "auditEvents:",
  ]) {
    const count = countOccurrences(contractText, structuralMarker);
    if (count < REQUIRED_OBJECTS.length) {
      errors.push(
        `Contract has only ${count} ${structuralMarker} entries; expected at least ${REQUIRED_OBJECTS.length}.`,
      );
    }
  }

  evidence.contract = {
    path: relative(CONTRACT_PATH),
    requiredObjects: REQUIRED_OBJECTS,
    officialRefsPresent: REQUIRED_OFFICIAL_REFS.filter((url) => contractText.includes(url)),
    safetyGuardsPresent: REQUIRED_MARKERS.filter((marker) => marker.endsWith(": false")),
  };
}

if (schemaDocText !== null) {
  const missingDocObjects = REQUIRED_OBJECTS.filter((objectId) => !schemaDocText.includes(objectId));
  if (missingDocObjects.length > 0) {
    errors.push(`SCH-003 is missing required object sections: ${missingDocObjects.join(", ")}`);
  }

  const missingOfficialRefs = REQUIRED_OFFICIAL_REFS.filter((url) => !schemaDocText.includes(url));
  if (missingOfficialRefs.length > 0) {
    errors.push(`SCH-003 is missing official references: ${missingOfficialRefs.join(", ")}`);
  }

  for (const marker of [
    "Proposal-only",
    "No Prisma schema edit",
    "No migration apply",
    "No runtime DB read/write",
    "No connector runtime",
    "No public output expansion",
    "No module final write",
    "externalRegisterable: false",
    "DATTR-024C",
  ]) {
    if (!schemaDocText.includes(marker)) {
      errors.push(`SCH-003 is missing safety marker: ${marker}`);
    }
  }
}

if (splitDocText !== null && !splitDocText.includes("DATTR-024B")) {
  errors.push("ARC-031 no longer references DATTR-024B.");
}

if (acceptanceDocText !== null) {
  for (const marker of ["DATTR-024B", "SCH-003", "pnpm ai-input:schema-review:check"]) {
    if (!acceptanceDocText.includes(marker)) {
      errors.push(`ACC-002 is missing DATTR-024B acceptance marker: ${marker}`);
    }
  }
}

if (backlogText !== null) {
  for (const marker of ["DATTR-024B", "SCH-003", "ai-input:schema-review:check"]) {
    if (!backlogText.includes(marker)) {
      errors.push(`PLN-060 is missing DATTR-024B completion marker: ${marker}`);
    }
  }
}

if (packageJsonText !== null) {
  const packageJson = JSON.parse(packageJsonText);
  if (packageJson.scripts?.["ai-input:schema-review:check"] !== "node scripts/check-ai-input-source-workflow-schema-review.mjs") {
    errors.push("package.json is missing ai-input:schema-review:check script.");
  }
}

if (prismaSchemaText !== null) {
  const proposedModelsAlreadyApplied = REQUIRED_OBJECTS.filter((objectId) =>
    prismaSchemaText.includes(`model ${objectId}`),
  );
  const dattr024hMigrationDraftExists =
    proposedModelsAlreadyApplied.length > 0 &&
    migrationDraftDocText?.includes("DATTR-024H-MIGRATION-DRAFT") === true &&
    migrationDraftSqlText?.includes("DATTR-024H-MIGRATION-DRAFT") === true;

  if (proposedModelsAlreadyApplied.length > 0 && !dattr024hMigrationDraftExists) {
    errors.push(
      `Prisma schema already contains DATTR-024B proposed models, which violates this no-migration review slice: ${proposedModelsAlreadyApplied.join(", ")}`,
    );
  } else if (proposedModelsAlreadyApplied.length > 0) {
    warnings.push(
      `DATTR-024H migration draft has materialized Source Workflow models after the DATTR-024B no-migration review: ${proposedModelsAlreadyApplied.join(", ")}`,
    );
  }
  evidence.prisma = {
    path: relative(PRISMA_SCHEMA_PATH),
    proposedModelsApplied: proposedModelsAlreadyApplied,
    noMigrationReviewSlice: proposedModelsAlreadyApplied.length === 0,
    supersededByDattr024hMigrationDraft: dattr024hMigrationDraftExists,
  };
}

const result = {
  id: "DATTR-024B",
  status: errors.length === 0 ? "ready_for_schema_review_packet_use" : "failed",
  checkedAt: new Date().toISOString(),
  requiredObjects: REQUIRED_OBJECTS,
  nextRunnableSlice: "DATTR-024C",
  safetyGuards: {
    schemaWriteAllowed: false,
    migrationApplyAllowed: false,
    runtimeReadAllowed: false,
    runtimeWriteAllowed: false,
    connectorRuntimeAllowed: false,
    publicOutputExpansionAllowed: false,
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
  console.log("AI Input source workflow schema review check passed.");
  console.log(`Required objects: ${REQUIRED_OBJECTS.join(", ")}`);
  console.log("Next runnable slice: DATTR-024C");
} else {
  console.error("AI Input source workflow schema review check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
}

process.exit(errors.length === 0 ? 0 : 1);
