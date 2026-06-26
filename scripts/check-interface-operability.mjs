#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

const FILES = {
  shell: "src/components/layout/module-operating-shell.tsx",
  root: "src/app/page.tsx",
  login: "src/app/(auth)/login/page.tsx",
  dashboard: "src/app/(dashboard)/dashboard/page.tsx",
  settings: "src/app/(dashboard)/settings/page.tsx",
  admin: "src/app/(dashboard)/admin/page.tsx",
  agents: "src/app/(dashboard)/agents/page.tsx",
  aiInput: "src/app/(dashboard)/ai-input/page.tsx",
  work: "src/app/(dashboard)/work/page.tsx",
  research: "src/app/(dashboard)/research/page.tsx",
  workflow: "src/app/(dashboard)/workflow/page.tsx",
  finance: "src/app/(dashboard)/finance/page.tsx",
  chamber: "src/app/(dashboard)/chamber/page.tsx",
  company: "src/app/(dashboard)/company/page.tsx",
  life: "src/app/(dashboard)/life/page.tsx",
  clientPortal: "src/app/client/[token]/page.tsx",
  packageJson: "package.json",
  acceptance: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
  backlog: "docs/05_execution-plans/PLN-060_task-backlog.md",
  sprint: "docs/05_execution-plans/PLN-061_current-sprint.md",
  completedLog: "docs/06_audits-and-reports/RPT-007_completed-log.md",
  tasks: "tasks.md",
}

const PRIMARY_ROUTE_FILES = [
  ["frontstage", FILES.root],
  ["login", FILES.login],
  ["dashboard", FILES.dashboard],
  ["settings", FILES.settings],
  ["admin", FILES.admin],
  ["agents", FILES.agents],
  ["ai-input", FILES.aiInput],
  ["work", FILES.work],
  ["research", FILES.research],
  ["workflow", FILES.workflow],
  ["finance", FILES.finance],
  ["chamber", FILES.chamber],
  ["company", FILES.company],
  ["life", FILES.life],
  ["client-portal", FILES.clientPortal],
]

const BUILD_MANIFEST_ROUTES = [
  "/page",
  "/(auth)/login/page",
  "/(dashboard)/dashboard/page",
  "/(dashboard)/settings/page",
  "/(dashboard)/admin/page",
  "/(dashboard)/agents/page",
  "/(dashboard)/ai-input/page",
  "/(dashboard)/work/page",
  "/(dashboard)/research/page",
  "/(dashboard)/workflow/page",
  "/(dashboard)/finance/page",
  "/(dashboard)/chamber/page",
  "/(dashboard)/company/page",
  "/(dashboard)/life/page",
  "/client/[token]/page",
]

const MODULE_SURFACES = [
  ["finance", FILES.finance, ["financeRecords", "financeProposals", "financeAuditRows", "financeSettings", "highRiskNote", "privacyNote"]],
  ["chamber", FILES.chamber, ["chamberRecords", "chamberProposals", "chamberAuditRows", "chamberSettings", "privacyNote"]],
  ["company", FILES.company, ["companyRecords", "companyProposals", "companyAuditRows", "companySettings", "highRiskNote", "privacyNote"]],
  ["life", FILES.life, ["lifeRecords", "lifeProposals", "lifeAuditRows", "lifeSettings", "FitnessDashboard", "highRiskNote", "privacyNote"]],
]

const SHELL_MARKERS = [
  "ModuleOperatingShell",
  "type ShellTab = \"overview\" | \"operation\" | \"agent\" | \"records\" | \"settings\"",
  "ModuleOperatingRecord",
  "ModuleAgentProposal",
  "ModuleAuditRow",
  "ModuleSettingRow",
  "localRecords",
  "draftTitle",
  "proposalState",
  "localSettings",
]

const DOC_MARKERS = [
  "INTERFACE-002",
  "interface operability smoke",
  "pnpm interface:smoke:check",
  "Finance",
  "Chamber",
  "Company",
  "Life",
  "Client Portal",
]

const FORBIDDEN_PLACEHOLDER_PATTERNS = [
  /coming soon/i,
  /not enabled/i,
  /connect later/i,
  /尚未啟用/,
  /稍後連接/,
]

const FORBIDDEN_MODULE_IMPORT_PATTERNS = [
  /@prisma\/client/,
  /from\s+["']@\/lib\/db["']/,
  /from\s+["']@\/lib\/supabase\//,
  /from\s+["']next\/headers["']/,
  /process\.env/,
]

function parseArgs(argv) {
  const args = { json: false, out: null }
  const filtered = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filtered.length; index += 1) {
    const arg = filtered[index]
    if (arg === "--json") {
      args.json = true
      continue
    }
    if (arg === "--out") {
      args.out = filtered[index + 1] ?? null
      index += 1
      continue
    }
    if (arg === "--help" || arg === "-h") {
      console.log("Usage: pnpm interface:smoke:check [--json] [--out <path>]")
      process.exit(0)
    }
  }

  return args
}

function read(filePath) {
  const absolutePath = path.join(ROOT, filePath)
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : null
}

function validateMarkers({ label, text, markers, errors }) {
  if (text === null) {
    errors.push(`${label} is missing.`)
    return
  }

  const missing = markers.filter((marker) => !text.includes(marker))
  if (missing.length > 0) {
    errors.push(`${label} missing markers: ${missing.join(", ")}`)
  }
}

function validateForbiddenPatterns({ label, text, patterns, errors }) {
  if (!text) return
  const matches = patterns.filter((pattern) => pattern.test(text))
  if (matches.length > 0) {
    errors.push(`${label} contains forbidden placeholder or runtime boundary markers.`)
  }
}

function readBuildManifest() {
  const manifestPath = path.join(ROOT, ".next/server/app-paths-manifest.json")
  if (!fs.existsSync(manifestPath)) return null

  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  } catch {
    return "invalid"
  }
}

const args = parseArgs(process.argv.slice(2))
const errors = []
const warnings = []
const texts = Object.fromEntries(Object.entries(FILES).map(([key, file]) => [key, read(file)]))

for (const [label, file] of PRIMARY_ROUTE_FILES) {
  if (!read(file)) {
    errors.push(`Primary route ${label} is missing file ${file}.`)
  }
}

validateMarkers({ label: FILES.shell, text: texts.shell, markers: SHELL_MARKERS, errors })

for (const [label, file, markers] of MODULE_SURFACES) {
  const text = read(file)
  validateMarkers({
    label: `${label} operating surface`,
    text,
    markers: ["ModuleOperatingShell", "ModuleGuard", ...markers],
    errors,
  })
  validateForbiddenPatterns({
    label: `${label} operating surface`,
    text,
    patterns: FORBIDDEN_PLACEHOLDER_PATTERNS,
    errors,
  })
  validateForbiddenPatterns({
    label: `${label} operating surface`,
    text,
    patterns: FORBIDDEN_MODULE_IMPORT_PATTERNS,
    errors,
  })
}

validateMarkers({
  label: FILES.clientPortal,
  text: texts.clientPortal,
  markers: ["notFound()", "robots", "getClientPortalViewByToken", "force-dynamic"],
  errors,
})

validateMarkers({
  label: "acceptance/backlog/sprint/completed/tasks docs",
  text: [texts.acceptance, texts.backlog, texts.sprint, texts.completedLog, texts.tasks].filter(Boolean).join("\n"),
  markers: DOC_MARKERS,
  errors,
})

validateMarkers({
  label: FILES.packageJson,
  text: texts.packageJson,
  markers: ["interface:smoke:check", "check-interface-operability.mjs"],
  errors,
})

const buildManifest = readBuildManifest()
if (buildManifest === "invalid") {
  errors.push(".next/server/app-paths-manifest.json exists but is not valid JSON.")
} else if (buildManifest === null) {
  warnings.push("Build manifest not found; run pnpm build before using build-manifest route coverage as evidence.")
} else {
  const missingBuildRoutes = BUILD_MANIFEST_ROUTES.filter((route) => !Object.hasOwn(buildManifest, route))
  if (missingBuildRoutes.length > 0) {
    errors.push(`Build manifest missing routes: ${missingBuildRoutes.join(", ")}`)
  }
}

const payload = {
  id: "INTERFACE-002",
  status: errors.length === 0 ? "interface_operability_smoke_ready" : "failed",
  generatedAt: new Date().toISOString(),
  summary: {
    primaryRouteCount: PRIMARY_ROUTE_FILES.length,
    moduleSurfaceCount: MODULE_SURFACES.length,
    buildManifestChecked: buildManifest !== null && buildManifest !== "invalid",
    noSecretBoundaryChecked: true,
    publicOutputExpanded: false,
    writesDatabase: false,
    routeHandlerAdded: false,
  },
  files: FILES,
  routeLabels: PRIMARY_ROUTE_FILES.map(([label]) => label),
  moduleLabels: MODULE_SURFACES.map(([label]) => label),
  errors,
  warnings,
  nextAction:
    errors.length === 0
      ? "Use this smoke harness before launch-level reviews to prove the owner-operable interface source and route graph are still intact."
      : "Fix missing routes, module surface markers, placeholder regressions, or docs before claiming interface operability.",
}

if (args.out) {
  const outPath = path.join(ROOT, args.out)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`)
}

if (args.json) {
  console.log(JSON.stringify(payload, null, 2))
} else {
  console.log(`INTERFACE-002 interface operability smoke: ${payload.status}`)
  for (const warning of warnings) {
    console.warn(`- warning: ${warning}`)
  }
  for (const error of errors) {
    console.error(`- ${error}`)
  }
}

process.exit(errors.length === 0 ? 0 : 1)
