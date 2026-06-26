#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONTRACT_PATH = path.join(
  ROOT,
  "src/lib/contracts/ai-input-source-workflow-persistence-sequence.contract.ts",
);
const REPORT_PATH = path.join(
  ROOT,
  "docs/06_audits-and-reports/RPT-024_loop-109-dattr-024-persistence-gap-review.md",
);
const MAN_001_PATH = path.join(ROOT, "docs/00_manual-and-index/MAN-001_document-index.md");
const ACC_002_PATH = path.join(ROOT, "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md");
const BACKLOG_PATH = path.join(ROOT, "docs/05_execution-plans/PLN-060_task-backlog.md");
const SPRINT_PATH = path.join(ROOT, "docs/05_execution-plans/PLN-061_current-sprint.md");
const TASKS_PATH = path.join(ROOT, "tasks.md");
const COMPLETED_LOG_PATH = path.join(ROOT, "docs/06_audits-and-reports/RPT-007_completed-log.md");
const PACKAGE_JSON_PATH = path.join(ROOT, "package.json");

const SUPPORT_DOC_PATHS = [
  "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md",
  "docs/02_architecture-and-rules/SCH-003_ai-input-source-workflow-schema-review.md",
  "docs/08_acceptance-and-qa/ACC-006_ai-input-source-workflow-proof-target.md",
  "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md",
  "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
  "docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md",
  "docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md",
].map((relativePath) => path.join(ROOT, relativePath));

const REQUIRED_GATE_IDS = [
  "proof-target-readiness",
  "schema-migration-draft",
  "service-authz-runtime",
  "rls-policy-review",
  "audit-storage-proof",
  "proof-runner",
  "connector-runtime-approval",
  "formal-mode-cutover",
];

const REQUIRED_CONTRACT_MARKERS = [
  "AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_REQUIRED_GATE_IDS",
  "AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_GATES",
  "AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_SOURCE_REFS",
  "AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_SUMMARY",
  "DATTR-024G-CONTRACT",
  "DATTR-024H-MIGRATION-DRAFT",
  "DATTR-024I-PROOF-RUNNER",
  "DATTR-024J-SERVICE-AUTHZ-RUNTIME",
  "DATTR-024K-RLS-AUDIT-STORAGE",
  "DATTR-024L-CONNECTOR-RUNTIME",
  "ready_for_persistence_sequence_use",
  "create-only schema and migration draft",
  "requireUser()",
  "ownerProfileId",
  "SourceConnection",
  "SourceAsset",
  "AIWorkflowRun",
  "AIWorkItem",
  "SourceNamingProfile",
  "DataUnitProposal",
  "ModuleWriteIntent",
  "OperatingAuditEvent",
  "row-level security",
  "operating audit",
  "externalRegisterable: false",
  "routeHandlerAllowed: false",
  "serverActionAllowedInDattr024gContract: false",
  "schemaWriteAllowedInDattr024gContract: false",
  "migrationCreateAllowedInDattr024gContract: false",
  "migrationApplyAllowed: false",
  "runtimeReadAllowed: false",
  "runtimeWriteAllowed: false",
  "proofWritesAllowedInDattr024gContract: false",
  "connectorRuntimeAllowed: false",
  "providerDataAllowed: false",
  "publicOutputAllowed: false",
  "externalAgentDatabaseAccessAllowed: false",
];

const REQUIRED_STOP_MARKERS = [
  "No route handler in DATTR-024G-CONTRACT.",
  "No server action in DATTR-024G-CONTRACT.",
  "No Prisma schema edit in DATTR-024G-CONTRACT.",
  "No migration create/apply in DATTR-024G-CONTRACT.",
  "No seed change in DATTR-024G-CONTRACT.",
  "No DB read/write in DATTR-024G-CONTRACT.",
  "No connector runtime in DATTR-024G-CONTRACT.",
  "No provider data read in DATTR-024G-CONTRACT.",
  "No public output expansion in DATTR-024G-CONTRACT.",
  "No external agent database access in DATTR-024G-CONTRACT.",
];

const REQUIRED_SOURCE_REFS = [
  "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md",
  "docs/02_architecture-and-rules/SCH-003_ai-input-source-workflow-schema-review.md",
  "docs/08_acceptance-and-qa/ACC-006_ai-input-source-workflow-proof-target.md",
  "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md",
  "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
  "docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md",
  "docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md",
  "docs/06_audits-and-reports/RPT-024_loop-109-dattr-024-persistence-gap-review.md",
  "https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production",
  "https://www.prisma.io/docs/orm/prisma-client/queries/transactions",
  "https://supabase.com/docs/guides/local-development",
  "https://supabase.com/docs/guides/database/postgres/row-level-security",
  "https://supabase.com/docs/guides/database/vault",
  "https://www.postgresql.org/docs/current/ddl-rowsecurity.html",
];

const REQUIRED_DOC_MARKERS = [
  "DATTR-024G-CONTRACT",
  "DATTR-024H-MIGRATION-DRAFT",
  "src/lib/contracts/ai-input-source-workflow-persistence-sequence.contract.ts",
  "scripts/check-ai-input-source-workflow-persistence-sequence.mjs",
  "pnpm ai-input:persistence-sequence:check",
  "persistence sequence",
  "create-only migration",
  "RLS",
  "audit storage",
  "proof-runner",
  "externalRegisterable=false",
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
      console.log("Usage: pnpm ai-input:persistence-sequence:check [--json] [--out <path>]");
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
const reportText = readText(REPORT_PATH);
const man001Text = readText(MAN_001_PATH);
const acc002Text = readText(ACC_002_PATH);
const backlogText = readText(BACKLOG_PATH);
const sprintText = readText(SPRINT_PATH);
const tasksText = readText(TASKS_PATH);
const completedLogText = readText(COMPLETED_LOG_PATH);
const packageJsonText = readText(PACKAGE_JSON_PATH);

for (const [label, text, filePath] of [
  ["persistence sequence contract", contractText, CONTRACT_PATH],
  ["RPT-024", reportText, REPORT_PATH],
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

for (const filePath of SUPPORT_DOC_PATHS) {
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing support doc: ${relative(filePath)}`);
  }
}

if (contractText !== null) {
  validateTextMarkers({
    text: contractText,
    markers: REQUIRED_CONTRACT_MARKERS,
    label: "Persistence sequence contract",
    filePath: CONTRACT_PATH,
    errors,
  });

  const missingGateIds = REQUIRED_GATE_IDS.filter((gateId) => !contractText.includes(`id: "${gateId}"`));
  if (missingGateIds.length > 0) {
    errors.push(`Persistence sequence contract is missing gate ids: ${missingGateIds.join(", ")}`);
  }

  const missingStops = REQUIRED_STOP_MARKERS.filter((marker) => !contractText.includes(marker));
  if (missingStops.length > 0) {
    errors.push(`Persistence sequence contract is missing stop markers: ${missingStops.join(", ")}`);
  }

  const missingSourceRefs = REQUIRED_SOURCE_REFS.filter((ref) => !contractText.includes(ref));
  if (missingSourceRefs.length > 0) {
    errors.push(`Persistence sequence contract is missing source refs: ${missingSourceRefs.join(", ")}`);
  }

  const forbiddenHits = FORBIDDEN_CONTRACT_PATTERNS.filter((pattern) => contractText.includes(pattern));
  if (forbiddenHits.length > 0) {
    errors.push(`Persistence sequence contract contains forbidden runtime markers: ${forbiddenHits.join(", ")}`);
  }

  evidence.gateCount = REQUIRED_GATE_IDS.filter((gateId) => contractText.includes(`id: "${gateId}"`)).length;
  evidence.hasNoRuntimeGuard = contractText.includes("sequence_gate_only_no_runtime");
  evidence.selectedNextImplementationTask = contractText.includes("selectedNextImplementationTask: \"DATTR-024H-MIGRATION-DRAFT\"");
}

for (const [label, text, filePath] of [
  ["RPT-024", reportText, REPORT_PATH],
  ["ACC-002", acc002Text, ACC_002_PATH],
  ["PLN-060", backlogText, BACKLOG_PATH],
  ["PLN-061", sprintText, SPRINT_PATH],
  ["tasks.md", tasksText, TASKS_PATH],
  ["RPT-007", completedLogText, COMPLETED_LOG_PATH],
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

if (man001Text !== null) {
  validateTextMarkers({
    text: man001Text,
    markers: ["RPT-024_loop-109-dattr-024-persistence-gap-review.md", "DATTR-024 persistence sequence gap review"],
    label: "MAN-001",
    filePath: MAN_001_PATH,
    errors,
  });
}

if (packageJsonText !== null) {
  try {
    const packageJson = JSON.parse(packageJsonText);
    const script = packageJson.scripts?.["ai-input:persistence-sequence:check"];
    if (script !== "node scripts/check-ai-input-source-workflow-persistence-sequence.mjs") {
      errors.push("package.json is missing ai-input:persistence-sequence:check script");
    }
  } catch (error) {
    errors.push(`package.json is not valid JSON: ${error.message}`);
  }
}

const payload = {
  status: errors.length === 0 ? "ready_for_persistence_sequence_use" : "failed",
  taskId: "DATTR-024G-CONTRACT",
  checkedAt: new Date().toISOString(),
  contract: relative(CONTRACT_PATH),
  report: relative(REPORT_PATH),
  evidence,
  warnings,
  errors,
  nextTask: "DATTR-024H-MIGRATION-DRAFT",
};

if (args.out) {
  const outPath = path.resolve(ROOT, args.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
}

if (args.json) {
  console.log(JSON.stringify(payload, null, 2));
} else if (errors.length === 0) {
  console.log(
    `AI Input Source Workflow persistence sequence check passed: ${payload.status} (${payload.nextTask})`,
  );
} else {
  console.error(`AI Input Source Workflow persistence sequence check failed with ${errors.length} error(s).`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
}

if (errors.length > 0) {
  process.exit(1);
}
