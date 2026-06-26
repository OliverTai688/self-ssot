#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PRISMA_SCHEMA_PATH = path.join(ROOT, "prisma/schema.prisma");
const DRAFT_DIR = path.join(
  ROOT,
  "prisma/migration-drafts/20260623_dattr_024h_source_workflow_create_only",
);
const DRAFT_SQL_PATH = path.join(DRAFT_DIR, "migration.sql");
const DRAFT_README_PATH = path.join(DRAFT_DIR, "README.md");
const MIG_DOC_PATH = path.join(
  ROOT,
  "docs/02_architecture-and-rules/MIG-003_ai-input-source-workflow-create-only-migration-draft.md",
);
const MAN_001_PATH = path.join(ROOT, "docs/00_manual-and-index/MAN-001_document-index.md");
const ACC_002_PATH = path.join(ROOT, "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md");
const BACKLOG_PATH = path.join(ROOT, "docs/05_execution-plans/PLN-060_task-backlog.md");
const SPRINT_PATH = path.join(ROOT, "docs/05_execution-plans/PLN-061_current-sprint.md");
const TASKS_PATH = path.join(ROOT, "tasks.md");
const COMPLETED_LOG_PATH = path.join(ROOT, "docs/06_audits-and-reports/RPT-007_completed-log.md");
const PACKAGE_JSON_PATH = path.join(ROOT, "package.json");

const REQUIRED_MODELS = [
  "SourceConnection",
  "SourceAsset",
  "AIWorkflowRun",
  "AIWorkItem",
  "SourceNamingProfile",
  "DataUnitProposal",
  "ModuleWriteIntent",
];

const REQUIRED_ENUMS = [
  "SourceProvider",
  "SourceConnectionStatus",
  "SourceAssetKind",
  "SourceAssetStatus",
  "AIWorkflowRunStatus",
  "AIWorkItemKind",
  "AIWorkItemStatus",
  "SourceProposalStatus",
  "ModuleWriteIntentStatus",
  "SourceApprovalLevel",
  "SourceRetentionClass",
];

const REQUIRED_TABLES = [
  "source_connections",
  "source_assets",
  "ai_workflow_runs",
  "ai_work_items",
  "source_naming_profiles",
  "data_unit_proposals",
  "module_write_intents",
];

const REQUIRED_SQL_MARKERS = [
  "DATTR-024H-MIGRATION-DRAFT",
  "Review draft only",
  "intentionally outside prisma/migrations",
  "CREATE TYPE \"source_provider\"",
  "CREATE TABLE \"source_connections\"",
  "CREATE TABLE \"source_assets\"",
  "CREATE TABLE \"ai_workflow_runs\"",
  "CREATE TABLE \"ai_work_items\"",
  "CREATE TABLE \"source_naming_profiles\"",
  "CREATE TABLE \"data_unit_proposals\"",
  "CREATE TABLE \"module_write_intents\"",
  "ENABLE ROW LEVEL SECURITY",
  "No policies are created in",
];

const REQUIRED_DOC_MARKERS = [
  "DATTR-024H-MIGRATION-DRAFT",
  "MIG-003",
  "prisma/migration-drafts/20260623_dattr_024h_source_workflow_create_only/migration.sql",
  "pnpm ai-input:migration-draft:check",
  "DATTR-024I-PROOF-RUNNER",
  "externalRegisterable=false",
];

const FORBIDDEN_SQL_PATTERNS = [
  /^\s*DROP\b/im,
  /^\s*TRUNCATE\b/im,
  /^\s*INSERT\b/im,
  /^\s*UPDATE\b/im,
  /^\s*DELETE\b/im,
  /^\s*COPY\b/im,
  /^\s*CREATE\s+POLICY\b/im,
  /^\s*CREATE\s+TRIGGER\b/im,
  /^\s*CREATE\s+FUNCTION\b/im,
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
      console.log("Usage: pnpm ai-input:migration-draft:check [--json] [--out <path>]");
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

function missingMarkers(text, markers) {
  return markers.filter((marker) => !text.includes(marker));
}

function ensureNoPendingDeployableDraft(errors) {
  const migrationsDir = path.join(ROOT, "prisma/migrations");
  const hits = [];

  if (!fs.existsSync(migrationsDir)) {
    return hits;
  }

  for (const entry of fs.readdirSync(migrationsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (entry.name.includes("dattr_024h") || entry.name.includes("source_workflow")) {
      hits.push(path.join(migrationsDir, entry.name));
    }
  }

  if (hits.length > 0) {
    errors.push(`Draft appears in deployable prisma/migrations: ${hits.map(relative).join(", ")}`);
  }

  return hits;
}

const args = parseArgs(process.argv.slice(2));
const errors = [];
const warnings = [];
const evidence = {};

const prismaSchemaText = readText(PRISMA_SCHEMA_PATH);
const draftSqlText = readText(DRAFT_SQL_PATH);
const draftReadmeText = readText(DRAFT_README_PATH);
const migDocText = readText(MIG_DOC_PATH);
const man001Text = readText(MAN_001_PATH);
const acc002Text = readText(ACC_002_PATH);
const backlogText = readText(BACKLOG_PATH);
const sprintText = readText(SPRINT_PATH);
const tasksText = readText(TASKS_PATH);
const completedLogText = readText(COMPLETED_LOG_PATH);
const packageJsonText = readText(PACKAGE_JSON_PATH);

for (const [label, text, filePath] of [
  ["Prisma schema", prismaSchemaText, PRISMA_SCHEMA_PATH],
  ["migration draft SQL", draftSqlText, DRAFT_SQL_PATH],
  ["migration draft README", draftReadmeText, DRAFT_README_PATH],
  ["MIG-003", migDocText, MIG_DOC_PATH],
  ["MAN-001", man001Text, MAN_001_PATH],
  ["ACC-002", acc002Text, ACC_002_PATH],
  ["PLN-060", backlogText, BACKLOG_PATH],
  ["PLN-061", sprintText, SPRINT_PATH],
  ["tasks.md", tasksText, TASKS_PATH],
  ["RPT-007", completedLogText, COMPLETED_LOG_PATH],
  ["package.json", packageJsonText, PACKAGE_JSON_PATH],
]) {
  if (text === null) {
    errors.push(`Missing ${label}: ${relative(filePath)}`);
  }
}

const deployableDraftHits = ensureNoPendingDeployableDraft(errors);

if (prismaSchemaText !== null) {
  const missingModels = REQUIRED_MODELS.filter((modelName) => !prismaSchemaText.includes(`model ${modelName} {`));
  if (missingModels.length > 0) {
    errors.push(`Prisma schema is missing Source Workflow models: ${missingModels.join(", ")}`);
  }

  const missingEnums = REQUIRED_ENUMS.filter((enumName) => !prismaSchemaText.includes(`enum ${enumName} {`));
  if (missingEnums.length > 0) {
    errors.push(`Prisma schema is missing Source Workflow enums: ${missingEnums.join(", ")}`);
  }

  const requiredSchemaMarkers = [
    "ownerId",
    "retentionClass",
    "redactionVersion",
    "secretRef",
    "providerAccountRef",
    "proofRef",
    "auditRef",
    "rollbackRef",
    "approvedByProfileId",
    "@@map(\"source_connections\")",
    "@@map(\"module_write_intents\")",
  ];
  const missingSchemaMarkers = missingMarkers(prismaSchemaText, requiredSchemaMarkers);
  if (missingSchemaMarkers.length > 0) {
    errors.push(`Prisma schema is missing required boundary markers: ${missingSchemaMarkers.join(", ")}`);
  }

  if (prismaSchemaText.includes("model OperatingAuditEvent {")) {
    errors.push("Prisma schema adds OperatingAuditEvent, but audit storage is still gated by AUDIT-OPS-004.");
  }

  evidence.prisma = {
    path: relative(PRISMA_SCHEMA_PATH),
    models: REQUIRED_MODELS,
    enums: REQUIRED_ENUMS,
  };
}

if (draftSqlText !== null) {
  const missingSqlMarkers = missingMarkers(draftSqlText, REQUIRED_SQL_MARKERS);
  if (missingSqlMarkers.length > 0) {
    errors.push(`Migration draft SQL is missing markers: ${missingSqlMarkers.join(", ")}`);
  }

  const missingRlsTables = REQUIRED_TABLES.filter(
    (tableName) => !draftSqlText.includes(`ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;`),
  );
  if (missingRlsTables.length > 0) {
    errors.push(`Migration draft SQL is missing fail-closed RLS enablement for: ${missingRlsTables.join(", ")}`);
  }

  const forbiddenHits = FORBIDDEN_SQL_PATTERNS.filter((pattern) => pattern.test(draftSqlText)).map(String);
  if (forbiddenHits.length > 0) {
    errors.push(`Migration draft SQL contains forbidden apply/runtime/destructive patterns: ${forbiddenHits.join(", ")}`);
  }

  evidence.sql = {
    path: relative(DRAFT_SQL_PATH),
    tables: REQUIRED_TABLES,
    failClosedRlsTables: REQUIRED_TABLES.length - missingRlsTables.length,
  };
}

if (draftReadmeText !== null) {
  const missingReadmeMarkers = missingMarkers(draftReadmeText, [
    "outside `prisma/migrations`",
    "not an applied or deployable Prisma migration",
    "DATTR-024I-PROOF-RUNNER",
    "human review",
  ]);
  if (missingReadmeMarkers.length > 0) {
    errors.push(`Migration draft README is missing markers: ${missingReadmeMarkers.join(", ")}`);
  }
}

if (migDocText !== null) {
  const missingMigDocMarkers = missingMarkers(migDocText, [
    ...REQUIRED_DOC_MARKERS,
    "https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production",
    "https://www.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations",
    "https://supabase.com/docs/guides/database/postgres/row-level-security",
    "https://www.postgresql.org/docs/current/gin.html",
  ]);
  if (missingMigDocMarkers.length > 0) {
    errors.push(`MIG-003 is missing markers: ${missingMigDocMarkers.join(", ")}`);
  }
}

for (const [label, text, filePath, markers] of [
  ["MAN-001", man001Text, MAN_001_PATH, ["MIG-003_ai-input-source-workflow-create-only-migration-draft.md"]],
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
    errors.push(`${label} is missing DATTR-024H markers: ${missing.join(", ")} (${relative(filePath)})`);
  }
}

if (packageJsonText !== null) {
  const packageJson = JSON.parse(packageJsonText);
  if (
    packageJson.scripts?.["ai-input:migration-draft:check"] !==
    "node scripts/check-ai-input-source-workflow-migration-draft.mjs"
  ) {
    errors.push("package.json is missing ai-input:migration-draft:check script.");
  }
}

const result = {
  id: "DATTR-024H-MIGRATION-DRAFT",
  status: errors.length === 0 ? "ready_for_migration_draft_review" : "failed",
  checkedAt: new Date().toISOString(),
  nextRunnableSlice: "DATTR-024I-PROOF-RUNNER",
  safetyGuards: {
    migrationDraftCreated: true,
    draftOutsidePrismaMigrations: deployableDraftHits.length === 0,
    migrationApplyAllowed: false,
    runtimeReadAllowed: false,
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
    `AI Input Source Workflow migration draft check passed: ${result.status} (${result.nextRunnableSlice})`,
  );
} else {
  console.error(`AI Input Source Workflow migration draft check failed with ${errors.length} error(s):`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
}

process.exit(errors.length === 0 ? 0 : 1);
