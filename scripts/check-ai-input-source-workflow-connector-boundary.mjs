#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const CONTRACT_PATH = "src/lib/contracts/ai-input-source-workflow-connector-boundary.contract.ts";
const SPLIT_CONTRACT_PATH = "src/lib/contracts/ai-input-source-workflow-split.contract.ts";
const ARC_031_PATH = "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md";
const ACC_002_PATH = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md";
const BACKLOG_PATH = "docs/05_execution-plans/PLN-060_task-backlog.md";
const SPRINT_PATH = "docs/05_execution-plans/PLN-061_current-sprint.md";
const TASKS_PATH = "tasks.md";
const PACKAGE_JSON_PATH = "package.json";
const SECURITY_DOC_PATH = "docs/02_architecture-and-rules/AUT-001_source-intake-security-privacy.md";
const ADAPTER_DOC_PATH = "docs/02_architecture-and-rules/ARC-015_source-connection-adapter-contract.md";
const AUDIT_DOC_PATH = "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md";
const NANDA_DOC_PATH = "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md";

const REQUIRED_PROVIDERS = [
  "manual",
  "local_file",
  "url",
  "rss",
  "google_drive",
  "google_docs",
  "gmail",
  "line",
  "telegram",
  "github_markdown",
];

const REQUIRED_REQUIREMENT_AREAS = [
  "consent-scope",
  "pause-resume-revoke",
  "provider-event-verification",
  "replay-protection",
  "secret-separation",
  "retention-deletion",
  "audit-refs",
  "runtime-stop-conditions",
];

const REQUIRED_COMMANDS = [
  "ai-input.connector.scope.review",
  "ai-input.connector.consent.grant",
  "ai-input.connector.pause",
  "ai-input.connector.resume",
  "ai-input.connector.revoke",
  "ai-input.provider-event.receive",
  "ai-input.provider-event.verify",
  "ai-input.provider-event.reject_replay",
  "ai-input.provider-event.block",
  "ai-input.connector.retention.delete_request",
];

const REQUIRED_STATES = [
  "not_connected",
  "drafted_scope",
  "owner_consented",
  "paused_by_owner",
  "resume_requested",
  "revoke_requested",
  "revoked",
  "blocked_security_review",
  "blocked_provider_event",
  "retention_delete_requested",
];

const REQUIRED_AUDIT_ACTIONS = [
  "connector.scope_reviewed",
  "connector.consent_granted",
  "connector.paused",
  "connector.resumed",
  "connector.revoked",
  "connector.consent_changed",
  "provider_event.received",
  "provider_event.verified",
  "provider_event.blocked",
  "provider_event.replay_rejected",
  "retention.delete_requested",
];

const REQUIRED_CONTRACT_MARKERS = [
  "AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_BOUNDARY_PROVIDERS",
  "AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_CONSENT_STATES",
  "AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_BOUNDARY_REQUIREMENTS",
  "AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_COMMANDS",
  "AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_AUDIT_REFS",
  "AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_BOUNDARY_OFFICIAL_REFS",
  "AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_BOUNDARY_SUMMARY",
  "DATTR-024E-CONTRACT",
  "boundary_ready_no_runtime",
  "requireUser()",
  "service-layer authorization",
  "SourceConnection",
  "SourceAsset",
  "providerEventRef",
  "sourceConnectionRef",
  "ai-input.source-workflow",
  "externalRegisterable: false",
  "routeHandlerAllowedInDattr024eContract: false",
  "oauthRuntimeAllowed: false",
  "webhookRuntimeAllowed: false",
  "pollingRuntimeAllowed: false",
  "providerApiCallAllowed: false",
  "fileIngestionAllowed: false",
  "ocrTranscriptionAllowed: false",
  "rawAdapterPayloadExposureAllowed: false",
  "schemaWriteAllowed: false",
  "migrationApplyAllowed: false",
  "runtimeReadAllowed: false",
  "runtimeWriteAllowed: false",
  "publicOutputAllowed: false",
  "moduleFinalWriteAllowed: false",
  "externalCollaborationAllowed: false",
  "externalAgentDatabaseAccessAllowed: false",
];

const REQUIRED_STOP_MARKERS = [
  "No route handler in DATTR-024E-CONTRACT.",
  "No OAuth callback in DATTR-024E-CONTRACT.",
  "No webhook endpoint in DATTR-024E-CONTRACT.",
  "No polling job in DATTR-024E-CONTRACT.",
  "No provider API call in DATTR-024E-CONTRACT.",
  "No file ingestion in DATTR-024E-CONTRACT.",
  "No OCR or transcription in DATTR-024E-CONTRACT.",
  "No raw adapter payload exposure in DATTR-024E-CONTRACT.",
  "No Prisma schema edit in DATTR-024E-CONTRACT.",
  "No migration apply in DATTR-024E-CONTRACT.",
  "No DB read/write in DATTR-024E-CONTRACT.",
  "No public output expansion in DATTR-024E-CONTRACT.",
  "No module final write in DATTR-024E-CONTRACT.",
  "No external collaboration in DATTR-024E-CONTRACT.",
  "No external agent database access in DATTR-024E-CONTRACT.",
];

const REQUIRED_OFFICIAL_REFS = [
  "https://datatracker.ietf.org/doc/html/rfc7009",
  "https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries",
  "https://docs.stripe.com/webhooks",
  "https://docs.stripe.com/webhooks/signature",
  "https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html",
];

const REQUIRED_DOC_MARKERS = [
  "src/lib/contracts/ai-input-source-workflow-connector-boundary.contract.ts",
  "scripts/check-ai-input-source-workflow-connector-boundary.mjs",
  "pnpm ai-input:connector-boundary:check",
  "DATTR-024E-CONTRACT",
  "connector consent",
  "provider event",
  "replay protection",
  "secret separation",
  "retention",
  "externalRegisterable: false",
];

const FORBIDDEN_CONTRACT_PATTERNS = [
  { label: "Prisma client marker", pattern: /\bPrismaClient\b/ },
  { label: "database call marker", pattern: /\bdb\./ },
  { label: "environment read marker", pattern: /\bprocess\.env\b/ },
  { label: "provider client marker", pattern: /\bcreateClient\b/ },
  { label: "network call marker", pattern: /\bfetch\s*\(/ },
  { label: "request cookie read marker", pattern: /\bcookies\s*\(/ },
  { label: "request header read marker", pattern: /\bheaders\s*\(/ },
  { label: "database URL marker", pattern: /\bDATABASE_URL\b/ },
  { label: "Supabase env marker", pattern: /\bSUPABASE_/ },
];

function parseArgs(argv) {
  const args = { json: false, out: null, help: false };
  const filteredArgs = argv.filter((arg) => arg !== "--");

  for (let index = 0; index < filteredArgs.length; index += 1) {
    const arg = filteredArgs[index];
    if (arg === "--json") {
      args.json = true;
    } else if (arg === "--out") {
      const value = filteredArgs[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--out requires a file path");
      }
      args.out = value;
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log("Validate the AI Input Source Workflow connector boundary contract");
  console.log("");
  console.log("Usage:");
  console.log("  pnpm ai-input:connector-boundary:check");
  console.log("  pnpm ai-input:connector-boundary:check -- --json");
  console.log(
    "  pnpm ai-input:connector-boundary:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json",
  );
}

function repoPath(relativePath) {
  return resolve(process.cwd(), relativePath);
}

async function readText(relativePath) {
  return readFile(repoPath(relativePath), "utf8");
}

async function readOptional(relativePath) {
  try {
    return await readText(relativePath);
  } catch {
    return null;
  }
}

function lineFor(contents, token) {
  const lines = contents.split(/\r?\n/);
  const index = lines.findIndex((line) => line.includes(token));
  return index === -1 ? null : index + 1;
}

function addIssue(list, code, message, path, line = null) {
  list.push({ code, message, path, line });
}

function validateRequiredMarkers(contents, markers, errors, code, path) {
  for (const marker of markers) {
    if (!contents.includes(marker)) {
      addIssue(errors, code, `Missing required marker: ${marker}`, path, lineFor(contents, marker));
    }
  }
}

function validateForbiddenMarkers(contents, errors) {
  for (const item of FORBIDDEN_CONTRACT_PATTERNS) {
    const match = contents.match(item.pattern);
    if (match) {
      addIssue(
        errors,
        "FORBIDDEN_RUNTIME_MARKER",
        `Connector boundary contract contains ${item.label}.`,
        CONTRACT_PATH,
        lineFor(contents, match[0]),
      );
    }
  }
}

function validateCoverage(contents, errors) {
  const requirementCount = (contents.match(/area: "/g) ?? []).length;
  const commandCount = (contents.match(/id: "ai-input\./g) ?? []).length;
  const providerCount = REQUIRED_PROVIDERS.filter((provider) => contents.includes(`id: "${provider}"`)).length;
  const stopCount = REQUIRED_STOP_MARKERS.filter((marker) => contents.includes(marker)).length;

  for (const [label, count, minimum] of [
    ["requirement areas", requirementCount, REQUIRED_REQUIREMENT_AREAS.length],
    ["connector commands", commandCount, REQUIRED_COMMANDS.length],
    ["provider rows", providerCount, REQUIRED_PROVIDERS.length],
    ["stop conditions", stopCount, REQUIRED_STOP_MARKERS.length],
  ]) {
    if (count < minimum) {
      addIssue(
        errors,
        "CONNECTOR_BOUNDARY_COVERAGE_INCOMPLETE",
        `Expected at least ${minimum} ${label}, found ${count}.`,
        CONTRACT_PATH,
      );
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const errors = [];
  const warnings = [];

  const contractSource = await readOptional(CONTRACT_PATH);
  const splitContractSource = await readOptional(SPLIT_CONTRACT_PATH);
  const arc031 = await readOptional(ARC_031_PATH);
  const acc002 = await readOptional(ACC_002_PATH);
  const backlog = await readOptional(BACKLOG_PATH);
  const sprint = await readOptional(SPRINT_PATH);
  const tasks = await readOptional(TASKS_PATH);
  const packageJson = await readOptional(PACKAGE_JSON_PATH);
  const securityDoc = await readOptional(SECURITY_DOC_PATH);
  const adapterDoc = await readOptional(ADAPTER_DOC_PATH);
  const auditDoc = await readOptional(AUDIT_DOC_PATH);
  const nandaDoc = await readOptional(NANDA_DOC_PATH);

  for (const [label, source, filePath] of [
    ["connector boundary contract", contractSource, CONTRACT_PATH],
    ["split contract", splitContractSource, SPLIT_CONTRACT_PATH],
    ["ARC-031", arc031, ARC_031_PATH],
    ["ACC-002", acc002, ACC_002_PATH],
    ["PLN-060", backlog, BACKLOG_PATH],
    ["PLN-061", sprint, SPRINT_PATH],
    ["tasks.md", tasks, TASKS_PATH],
    ["package.json", packageJson, PACKAGE_JSON_PATH],
    ["AUT-001", securityDoc, SECURITY_DOC_PATH],
    ["ARC-015", adapterDoc, ADAPTER_DOC_PATH],
    ["DBS-006", auditDoc, AUDIT_DOC_PATH],
    ["ARC-028", nandaDoc, NANDA_DOC_PATH],
  ]) {
    if (source === null) {
      addIssue(errors, "REQUIRED_FILE_MISSING", `Missing ${label}: ${filePath}`, filePath);
    }
  }

  if (contractSource !== null) {
    validateRequiredMarkers(contractSource, REQUIRED_CONTRACT_MARKERS, errors, "CONNECTOR_BOUNDARY_MARKER_MISSING", CONTRACT_PATH);
    validateRequiredMarkers(
      contractSource,
      REQUIRED_PROVIDERS.map((provider) => `id: "${provider}"`),
      errors,
      "CONNECTOR_PROVIDER_MISSING",
      CONTRACT_PATH,
    );
    validateRequiredMarkers(
      contractSource,
      REQUIRED_REQUIREMENT_AREAS.map((area) => `area: "${area}"`),
      errors,
      "CONNECTOR_REQUIREMENT_AREA_MISSING",
      CONTRACT_PATH,
    );
    validateRequiredMarkers(
      contractSource,
      REQUIRED_COMMANDS.map((command) => `id: "${command}"`),
      errors,
      "CONNECTOR_COMMAND_MISSING",
      CONTRACT_PATH,
    );
    validateRequiredMarkers(
      contractSource,
      REQUIRED_STATES.map((state) => `id: "${state}"`),
      errors,
      "CONNECTOR_STATE_MISSING",
      CONTRACT_PATH,
    );
    validateRequiredMarkers(contractSource, REQUIRED_AUDIT_ACTIONS, errors, "CONNECTOR_AUDIT_ACTION_MISSING", CONTRACT_PATH);
    validateRequiredMarkers(contractSource, REQUIRED_STOP_MARKERS, errors, "CONNECTOR_STOP_CONDITION_MISSING", CONTRACT_PATH);
    validateRequiredMarkers(contractSource, REQUIRED_OFFICIAL_REFS, errors, "OFFICIAL_REFERENCE_MISSING", CONTRACT_PATH);
    validateForbiddenMarkers(contractSource, errors);
    validateCoverage(contractSource, errors);
  }

  if (splitContractSource !== null) {
    validateRequiredMarkers(
      splitContractSource,
      [
        "src/lib/contracts/ai-input-source-workflow-connector-boundary.contract.ts",
        "scripts/check-ai-input-source-workflow-connector-boundary.mjs",
        "pnpm ai-input:connector-boundary:check",
        "DATTR-024E",
        "status: \"done\"",
        "nextRunnableSlice: \"DATTR-024\"",
      ],
      errors,
      "SPLIT_CONTRACT_DATTR_024E_MARKER_MISSING",
      SPLIT_CONTRACT_PATH,
    );
  }

  for (const [label, source, path] of [
    ["ARC-031", arc031, ARC_031_PATH],
    ["ACC-002", acc002, ACC_002_PATH],
    ["PLN-060", backlog, BACKLOG_PATH],
    ["PLN-061", sprint, SPRINT_PATH],
    ["tasks.md", tasks, TASKS_PATH],
  ]) {
    if (source !== null) {
      validateRequiredMarkers(source, REQUIRED_DOC_MARKERS, errors, `${label}_CONNECTOR_BOUNDARY_DOC_MARKER_MISSING`, path);
    }
  }

  if (packageJson !== null && !packageJson.includes('"ai-input:connector-boundary:check"')) {
    addIssue(errors, "PACKAGE_SCRIPT_MISSING", "package.json is missing ai-input:connector-boundary:check.", PACKAGE_JSON_PATH);
  }

  for (const [label, source, path, markers] of [
    ["AUT-001", securityDoc, SECURITY_DOC_PATH, ["Scope consent", "Access revocation", "Retention Policy", "External agents"]],
    ["ARC-015", adapterDoc, ADAPTER_DOC_PATH, ["SourceConnectionConsent", "revoke", "webhook_receive", "SourceDeletionEvent"]],
    ["DBS-006", auditDoc, AUDIT_DOC_PATH, ["ai-input.source-workflow", "provider_event.blocked", "connector.revoked"]],
    ["ARC-028", nandaDoc, NANDA_DOC_PATH, ["externalRegisterable: false", "external agents never receive direct database access"]],
  ]) {
    if (source !== null) {
      validateRequiredMarkers(source, markers, errors, `${label}_REFERENCE_MARKER_MISSING`, path);
    }
  }

  const status = errors.length === 0 ? "ready_for_connector_boundary_contract_use" : "blocked";
  const proof = {
    id: "DATTR-024E-CONTRACT",
    status,
    checkedAt: new Date().toISOString(),
    contractPath: CONTRACT_PATH,
    splitContractPath: SPLIT_CONTRACT_PATH,
    architectureDoc: ARC_031_PATH,
    acceptanceDoc: ACC_002_PATH,
    requiredProviders: REQUIRED_PROVIDERS,
    requiredRequirementAreas: REQUIRED_REQUIREMENT_AREAS,
    requiredCommands: REQUIRED_COMMANDS,
    officialSourceRefs: REQUIRED_OFFICIAL_REFS,
    safetyGuards: {
      routeHandlerAllowedInDattr024eContract: false,
      oauthRuntimeAllowed: false,
      webhookRuntimeAllowed: false,
      pollingRuntimeAllowed: false,
      providerApiCallAllowed: false,
      fileIngestionAllowed: false,
      ocrTranscriptionAllowed: false,
      rawAdapterPayloadExposureAllowed: false,
      schemaWriteAllowed: false,
      migrationApplyAllowed: false,
      runtimeReadAllowed: false,
      runtimeWriteAllowed: false,
      publicOutputAllowed: false,
      moduleFinalWriteAllowed: false,
      externalCollaborationAllowed: false,
      externalAgentDatabaseAccessAllowed: false,
      externalRegisterable: false,
    },
    nextRecommendedTask:
      "AUTH-005 if auth/session evidence appears; WORK-009 if an approved proof DB target appears; otherwise DATTR-024 remains blocked until migration/authz/audit/proof approval.",
    errors,
    warnings,
  };

  if (args.out) {
    const outPath = repoPath(args.out);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  }

  if (args.json) {
    console.log(JSON.stringify(proof, null, 2));
  } else {
    console.log(`AI Input Source Workflow connector boundary contract: ${status}`);
    console.log(`Contract: ${CONTRACT_PATH}`);
    console.log(`Providers: ${REQUIRED_PROVIDERS.length}`);
    console.log(`Requirement areas: ${REQUIRED_REQUIREMENT_AREAS.length}`);
    console.log(`Commands: ${REQUIRED_COMMANDS.length}`);
    if (args.out) {
      console.log(`Proof written: ${args.out}`);
    }

    if (warnings.length > 0) {
      console.log("");
      console.log("Warnings:");
      for (const warning of warnings) {
        console.log(`- ${warning.code}: ${warning.message}`);
      }
    }

    if (errors.length > 0) {
      console.log("");
      console.log("Errors:");
      for (const error of errors) {
        const suffix = error.line ? ` (${error.path}:${error.line})` : ` (${error.path})`;
        console.log(`- ${error.code}: ${error.message}${suffix}`);
      }
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
