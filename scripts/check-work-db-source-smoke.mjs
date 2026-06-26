#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

const FILES = {
  listPage: "src/app/(dashboard)/work/page.tsx",
  detailPage: "src/app/(dashboard)/work/[projectId]/page.tsx",
  workClient: "src/app/(dashboard)/work/work-client.tsx",
  detailClient: "src/app/(dashboard)/work/[projectId]/project-detail-client.tsx",
  actions: "src/app/actions/work.ts",
  service: "src/lib/services/project.service.ts",
  mapper: "src/lib/mappers/work.mapper.ts",
  db: "src/lib/db.ts",
  packageJson: "package.json",
  acceptance: "docs/08_acceptance-and-qa/ACC-004_work-refresh-proof-harness.md",
  backlog: "docs/05_execution-plans/PLN-060_task-backlog.md",
  sprint: "docs/05_execution-plans/PLN-061_current-sprint.md",
  completedLog: "docs/06_audits-and-reports/RPT-007_completed-log.md",
  tasks: "tasks.md",
}

const WORK_COMPONENT_DIR = "src/components/work"

const REQUIRED_ACTIONS_WITH_AUTH = [
  "getProjects",
  "getProjectById",
  "createProject",
  "updateProject",
  "deleteProject",
  "addProjectTask",
  "toggleProjectTaskComplete",
  "updateProjectTask",
  "deleteProjectTask",
  "addProjectNote",
  "toggleProjectNotePin",
  "updateProjectNote",
  "deleteProjectNote",
  "createProjectDeliverable",
  "updateProjectDeliverable",
  "updateProjectDeliverableVisibility",
  "deleteProjectDeliverable",
]

const REQUIRED_SERVICE_ASSERTIONS = [
  "getProjectDetailForProfile",
  "deleteProjectForProfile",
  "updateProjectForProfile",
  "createTaskForProject",
  "createNoteForProject",
  "createDeliverableForProject",
]

const REQUIRED_CHILD_AUTH_HELPERS = [
  "getTaskForProfile",
  "getNoteForProfile",
  "getDeliverableForProfile",
]

const FORBIDDEN_WORK_MOCK_PATTERNS = [
  { label: "@/lib/mock/work import", pattern: /from\s+["']@\/lib\/mock\/work(?:\/[^"']*)?["']/ },
  { label: "relative lib/mock/work import", pattern: /from\s+["'][^"']*lib\/mock\/work(?:\/[^"']*)?["']/ },
  { label: "mockProjectsFull", pattern: /\bmockProjectsFull\b/ },
  { label: "mockTasks", pattern: /\bmockTasks\b/ },
  { label: "mockNotes", pattern: /\bmockNotes\b/ },
  { label: "mockDeliverables", pattern: /\bmockDeliverables\b/ },
  { label: "mockProjects direct source", pattern: /\bmockProjects\b/ },
]

const FORBIDDEN_CLIENT_BOUNDARY_PATTERNS = [
  { label: "@prisma/client import", pattern: /from\s+["']@prisma\/client["']/ },
  { label: "@/lib/db import", pattern: /from\s+["']@\/lib\/db["']/ },
  { label: "project.service import", pattern: /from\s+["']@\/lib\/services\/project\.service["']/ },
  { label: "process.env in Work UI source", pattern: /process\.env/ },
]

function parseArgs(argv) {
  const args = { json: false, out: null, help: false }
  const filteredArgs = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filteredArgs.length; index += 1) {
    const arg = filteredArgs[index]

    if (arg === "--json") {
      args.json = true
    } else if (arg === "--out") {
      const value = filteredArgs[index + 1]
      if (!value || value.startsWith("--")) {
        throw new Error("--out requires a file path")
      }
      args.out = value
      index += 1
    } else if (arg === "--help" || arg === "-h") {
      args.help = true
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return args
}

function printHelp() {
  console.log("Check Work DB-backed source path without connecting to the database")
  console.log("")
  console.log("Usage:")
  console.log("  pnpm work:source:check")
  console.log("  pnpm work:source:check -- --json")
  console.log("  pnpm work:source:check -- --out docs/2_agent-input/generated/agent-loop/reports/<source-smoke>.json")
}

function absolute(filePath) {
  return path.join(ROOT, filePath)
}

function read(filePath) {
  const target = absolute(filePath)
  return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null
}

function listFiles(dirPath) {
  const root = absolute(dirPath)
  if (!fs.existsSync(root)) return []

  const entries = fs.readdirSync(root, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const relativePath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) return listFiles(relativePath)
    return relativePath
  })
}

function hasAll(text, markers) {
  if (text === null) return false
  return markers.every((marker) => text.includes(marker))
}

function missingMarkers(text, markers) {
  if (text === null) return markers
  return markers.filter((marker) => !text.includes(marker))
}

function getFunctionBody(text, functionName) {
  if (!text) return null

  const pattern = new RegExp(`(?:export\\s+)?async\\s+function\\s+${functionName}\\b`)
  const match = pattern.exec(text)
  if (!match) return null

  const rest = text.slice(match.index + 1)
  const next = /\n(?:export\s+)?async\s+function\s+\w+\b/.exec(rest)
  return text.slice(match.index, next ? match.index + 1 + next.index : undefined)
}

function scanForbidden(text, patterns) {
  if (!text) return []
  return patterns.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label)
}

function buildPayload() {
  const texts = Object.fromEntries(Object.entries(FILES).map(([key, file]) => [key, read(file)]))
  const workComponentFiles = listFiles(WORK_COMPONENT_DIR).filter((file) => /\.(ts|tsx)$/.test(file))
  const workUiFiles = [FILES.workClient, FILES.detailClient, ...workComponentFiles]
  const formalRuntimeFiles = [FILES.listPage, FILES.detailPage, FILES.actions, FILES.service, FILES.mapper]
  const markers = []
  const failures = []
  const warnings = []

  function addMarker({ id, label, file, passed, evidence, required = true }) {
    const marker = { id, label, file, passed, evidence, required }
    markers.push(marker)
    if (required && !passed) failures.push(`${id}: ${label}`)
  }

  for (const [key, file] of Object.entries(FILES)) {
    addMarker({
      id: `file:${key}`,
      label: `${file} exists`,
      file,
      passed: texts[key] !== null,
      evidence: texts[key] === null ? "missing" : "readable",
    })
  }

  addMarker({
    id: "work-list-page-server-action",
    label: "Work list page loads through getProjects server action",
    file: FILES.listPage,
    passed: hasAll(texts.listPage, [
      'import { getProjects } from "@/app/actions/work"',
      'export const dynamic = "force-dynamic"',
      "await getProjects()",
      "<WorkClient initialProjects={projects} />",
    ]),
    evidence: missingMarkers(texts.listPage, [
      'import { getProjects } from "@/app/actions/work"',
      'export const dynamic = "force-dynamic"',
      "await getProjects()",
      "<WorkClient initialProjects={projects} />",
    ]).join(", ") || "all required list-page markers present",
  })

  addMarker({
    id: "work-detail-page-server-action",
    label: "Work detail page loads through getProjectById server action",
    file: FILES.detailPage,
    passed: hasAll(texts.detailPage, [
      'import { getProjectById } from "@/app/actions/work"',
      'export const dynamic = "force-dynamic"',
      "await getProjectById",
      "notFound()",
      "<ProjectDetailClient",
    ]),
    evidence: missingMarkers(texts.detailPage, [
      'import { getProjectById } from "@/app/actions/work"',
      'export const dynamic = "force-dynamic"',
      "await getProjectById",
      "notFound()",
      "<ProjectDetailClient",
    ]).join(", ") || "all required detail-page markers present",
  })

  addMarker({
    id: "work-actions-server-service-boundary",
    label: "Work actions are server-only, validated, and routed to project service",
    file: FILES.actions,
    passed: hasAll(texts.actions, [
      '"use server"',
      'import { requireUser } from "@/lib/services/auth.service"',
      'from "@/lib/services/project.service"',
      'from "@/lib/mappers/work.mapper"',
      "z.object",
      "safeParse",
      "revalidatePath",
      "getProjectsForProfile",
      "getProjectDetailForProfile",
      "createProjectForProfile",
      "createTaskForProject",
      "createNoteForProject",
      "createDeliverableForProject",
    ]),
    evidence: missingMarkers(texts.actions, [
      '"use server"',
      'import { requireUser } from "@/lib/services/auth.service"',
      'from "@/lib/services/project.service"',
      'from "@/lib/mappers/work.mapper"',
      "z.object",
      "safeParse",
      "revalidatePath",
      "getProjectsForProfile",
      "getProjectDetailForProfile",
      "createProjectForProfile",
      "createTaskForProject",
      "createNoteForProject",
      "createDeliverableForProject",
    ]).join(", ") || "all required action-boundary markers present",
  })

  const actionsMissingRequireUser = REQUIRED_ACTIONS_WITH_AUTH.filter((functionName) => {
    const body = getFunctionBody(texts.actions, functionName)
    return !body || !body.includes("requireUser()")
  })
  addMarker({
    id: "work-actions-require-user",
    label: "Canonical Work action functions call requireUser()",
    file: FILES.actions,
    passed: actionsMissingRequireUser.length === 0,
    evidence:
      actionsMissingRequireUser.length === 0
        ? `${REQUIRED_ACTIONS_WITH_AUTH.length} canonical actions checked`
        : `missing requireUser in ${actionsMissingRequireUser.join(", ")}`,
  })

  addMarker({
    id: "work-service-db-backed",
    label: "Project service uses DB-backed project/task/note/deliverable models",
    file: FILES.service,
    passed: hasAll(texts.service, [
      'import { db } from "@/lib/db"',
      "db.project.findMany",
      "db.project.findUnique",
      "db.project.create",
      "db.project.update",
      "db.project.delete",
      "db.projectTask.create",
      "db.projectTask.update",
      "db.projectTask.delete",
      "db.projectNote.create",
      "db.projectNote.update",
      "db.projectNote.delete",
      "db.projectDeliverable.create",
      "db.projectDeliverable.update",
      "db.projectDeliverable.delete",
    ]),
    evidence: missingMarkers(texts.service, [
      'import { db } from "@/lib/db"',
      "db.project.findMany",
      "db.project.findUnique",
      "db.project.create",
      "db.project.update",
      "db.project.delete",
      "db.projectTask.create",
      "db.projectTask.update",
      "db.projectTask.delete",
      "db.projectNote.create",
      "db.projectNote.update",
      "db.projectNote.delete",
      "db.projectDeliverable.create",
      "db.projectDeliverable.update",
      "db.projectDeliverable.delete",
    ]).join(", ") || "all required service DB markers present",
  })

  addMarker({
    id: "work-service-project-owner-boundary",
    label: "Project service has owner-scoped project authorization",
    file: FILES.service,
    passed: hasAll(texts.service, [
      "assertCanAccessProject",
      "select: { ownerId: true }",
      "project.ownerId !== profileId",
      "throw new UnauthorizedError",
    ]),
    evidence: missingMarkers(texts.service, [
      "assertCanAccessProject",
      "select: { ownerId: true }",
      "project.ownerId !== profileId",
      "throw new UnauthorizedError",
    ]).join(", ") || "owner-scoped project authorization markers present",
  })

  const serviceMissingAssert = REQUIRED_SERVICE_ASSERTIONS.filter((functionName) => {
    const body = getFunctionBody(texts.service, functionName)
    return !body || !body.includes("assertCanAccessProject")
  })
  addMarker({
    id: "work-service-project-scope-before-writes",
    label: "Project-scoped service operations assert access before project data writes/reads",
    file: FILES.service,
    passed: serviceMissingAssert.length === 0,
    evidence:
      serviceMissingAssert.length === 0
        ? `${REQUIRED_SERVICE_ASSERTIONS.length} project-scoped service functions checked`
        : `missing assertCanAccessProject in ${serviceMissingAssert.join(", ")}`,
  })

  const childHelpersMissingOwnerCheck = REQUIRED_CHILD_AUTH_HELPERS.filter((functionName) => {
    const body = getFunctionBody(texts.service, functionName)
    return !body || !body.includes("ownerId") || !body.includes("profileId") || !body.includes("UnauthorizedError")
  })
  addMarker({
    id: "work-service-child-row-owner-boundary",
    label: "Task/note/deliverable helper lookups verify project ownership",
    file: FILES.service,
    passed: childHelpersMissingOwnerCheck.length === 0,
    evidence:
      childHelpersMissingOwnerCheck.length === 0
        ? `${REQUIRED_CHILD_AUTH_HELPERS.length} child-row helper boundaries checked`
        : `missing owner checks in ${childHelpersMissingOwnerCheck.join(", ")}`,
  })

  addMarker({
    id: "work-mapper-db-viewmodel-boundary",
    label: "Work mapper keeps Prisma models separate from UI view models",
    file: FILES.mapper,
    passed: hasAll(texts.mapper, [
      'from "@prisma/client"',
      'from "@/types/work"',
      "toProjectViewModel",
      "toTaskViewModel",
      "toNoteViewModel",
      "toDeliverableViewModel",
      'task.status === "DONE"',
    ]),
    evidence: missingMarkers(texts.mapper, [
      'from "@prisma/client"',
      'from "@/types/work"',
      "toProjectViewModel",
      "toTaskViewModel",
      "toNoteViewModel",
      "toDeliverableViewModel",
      'task.status === "DONE"',
    ]).join(", ") || "mapper markers present",
  })

  const formalMockFailures = formalRuntimeFiles.flatMap((file) => {
    const matches = scanForbidden(read(file), FORBIDDEN_WORK_MOCK_PATTERNS)
    return matches.map((match) => `${file}: ${match}`)
  })
  addMarker({
    id: "work-formal-runtime-no-mock-source",
    label: "Formal Work runtime source does not import Work mock data",
    file: formalRuntimeFiles.join(", "),
    passed: formalMockFailures.length === 0,
    evidence: formalMockFailures.length === 0 ? `${formalRuntimeFiles.length} formal runtime files checked` : formalMockFailures.join("; "),
  })

  const uiBoundaryFailures = workUiFiles.flatMap((file) => {
    const matches = [
      ...scanForbidden(read(file), FORBIDDEN_WORK_MOCK_PATTERNS),
      ...scanForbidden(read(file), FORBIDDEN_CLIENT_BOUNDARY_PATTERNS),
    ]
    return matches.map((match) => `${file}: ${match}`)
  })
  addMarker({
    id: "work-ui-no-db-or-mock-source-imports",
    label: "Work UI source avoids DB/client provider imports and Work mock-data imports",
    file: [FILES.workClient, FILES.detailClient, WORK_COMPONENT_DIR].join(", "),
    passed: uiBoundaryFailures.length === 0,
    evidence: uiBoundaryFailures.length === 0 ? `${workUiFiles.length} Work UI files checked` : uiBoundaryFailures.join("; "),
  })

  addMarker({
    id: "work-detail-adjunct-mock-boundary",
    label: "Work detail separates adjunct AI mock data from formal Work CRUD",
    file: FILES.detailClient,
    passed: hasAll(texts.detailClient, [
      'data-work-boundary="WORK-015-ADJUNCT-MOCK-GATE"',
      'data-work-boundary="WORK-015-FORMAL-CRUD-ONLY"',
      "<NoteTimeline initialNotes={projectNotes} projectId={projectId} />",
    ]),
    evidence:
      missingMarkers(texts.detailClient, [
        'data-work-boundary="WORK-015-ADJUNCT-MOCK-GATE"',
        'data-work-boundary="WORK-015-FORMAL-CRUD-ONLY"',
        "<NoteTimeline initialNotes={projectNotes} projectId={projectId} />",
      ]).join(", ") ||
      "adjunct AI prototype boundary is explicit and formal notes do not consume mock timeline",
  })

  addMarker({
    id: "work-detail-client-draft-boundary",
    label: "Work detail separates Client Portal publishing from AI client draft proposals",
    file: FILES.detailClient,
    passed: hasAll(texts.detailClient, [
      'data-work-boundary="WORK-016-CLIENT-PORTAL-PUBLISH-GATE"',
      'const clientPortalShareReady = project.visibility === "client_shared" && Boolean(project.clientToken)',
      'data-work-boundary="WORK-016-SHARE-LINK-INTERNAL-GATE"',
      'data-work-boundary="WORK-016-CLIENT-DRAFT-PROPOSAL-ONLY"',
    ]),
    evidence:
      missingMarkers(texts.detailClient, [
        'data-work-boundary="WORK-016-CLIENT-PORTAL-PUBLISH-GATE"',
        'const clientPortalShareReady = project.visibility === "client_shared" && Boolean(project.clientToken)',
        'data-work-boundary="WORK-016-SHARE-LINK-INTERNAL-GATE"',
        'data-work-boundary="WORK-016-CLIENT-DRAFT-PROPOSAL-ONLY"',
      ]).join(", ") ||
      "Client Portal share link is gated and AI client update draft is proposal-only",
  })

  addMarker({
    id: "work-detail-client-share-review-checklist",
    label: "Work detail renders a protected Client Portal pre-share review checklist",
    file: FILES.detailClient,
    passed: hasAll(texts.detailClient, [
      'data-work-boundary="WORK-017-CLIENT-SHARE-REVIEW-CHECKLIST"',
      '"WORK-017-CHECKLIST-ROW-VISIBILITY"',
      '"WORK-017-CHECKLIST-ROW-TOKEN"',
      '"WORK-017-CHECKLIST-ROW-CLIENT-VISIBLE-RECORDS"',
      '"WORK-017-CHECKLIST-ROW-AI-DRAFT"',
      '"WORK-017-CHECKLIST-ROW-NEXT-ACTION"',
      'const shareReady = project.visibility === "client_shared" && Boolean(project.clientToken)',
      'const hasConfirmedClientDraft = publicOutput?.status === "confirmed"',
      "const nextActionState",
    ]),
    evidence:
      missingMarkers(texts.detailClient, [
        'data-work-boundary="WORK-017-CLIENT-SHARE-REVIEW-CHECKLIST"',
        '"WORK-017-CHECKLIST-ROW-VISIBILITY"',
        '"WORK-017-CHECKLIST-ROW-TOKEN"',
        '"WORK-017-CHECKLIST-ROW-CLIENT-VISIBLE-RECORDS"',
        '"WORK-017-CHECKLIST-ROW-AI-DRAFT"',
        '"WORK-017-CHECKLIST-ROW-NEXT-ACTION"',
        'const shareReady = project.visibility === "client_shared" && Boolean(project.clientToken)',
        'const hasConfirmedClientDraft = publicOutput?.status === "confirmed"',
        "const nextActionState",
      ]).join(", ") ||
      "Client Portal pre-share checklist covers visibility, token, client-visible records, AI draft, and next action states",
  })

  addMarker({
    id: "package-script-present",
    label: "package.json exposes pnpm work:source:check",
    file: FILES.packageJson,
    passed: hasAll(texts.packageJson, ["work:source:check", "check-work-db-source-smoke.mjs"]),
    evidence: missingMarkers(texts.packageJson, ["work:source:check", "check-work-db-source-smoke.mjs"]).join(", ") || "package script present",
  })

  const docsText = [texts.acceptance, texts.backlog, texts.sprint, texts.completedLog, texts.tasks].filter(Boolean).join("\n")
  addMarker({
    id: "docs-task-memory-present",
    label: "Work source smoke is recorded in acceptance and task memory",
    file: [FILES.acceptance, FILES.backlog, FILES.sprint, FILES.completedLog, FILES.tasks].join(", "),
    passed: hasAll(docsText, ["WORK-013", "pnpm work:source:check", "Work DB source/static smoke", "not persistence proof"]),
    evidence:
      missingMarkers(docsText, ["WORK-013", "pnpm work:source:check", "Work DB source/static smoke", "not persistence proof"]).join(", ") ||
      "docs/task memory markers present",
  })

  const hasWork015Boundary = hasAll(texts.detailClient, [
    'data-work-boundary="WORK-015-ADJUNCT-MOCK-GATE"',
    'data-work-boundary="WORK-015-FORMAL-CRUD-ONLY"',
  ])

  if (texts.detailPage?.includes("mock-ai.service") && !hasWork015Boundary) {
    warnings.push(
      "Work detail page still reads AI pulse/timeline mock adapter data; WORK-013 treats this as adjunct AI prototype data, not formal Work CRUD source."
    )
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    taskId: "WORK-013",
    mode: "source_static_smoke",
    status: failures.length === 0 ? "ready_for_source_path_review" : "failed",
    doesNotConnectToDatabase: true,
    doesNotWriteDatabase: true,
    safety: {
      scannedLocalSourceOnly: true,
      printsSecrets: false,
      excludedValues: [
        "database URLs",
        "database hosts",
        "database passwords",
        "profile IDs",
        "project IDs",
        "task IDs",
        "note IDs",
        "deliverable IDs",
        "tokens",
        "cookies",
        "raw provider payloads",
      ],
    },
    checkedFiles: {
      formalRuntimeFiles,
      workUiFiles,
      docs: [FILES.acceptance, FILES.backlog, FILES.sprint, FILES.completedLog, FILES.tasks],
    },
    markers,
    failures,
    warnings,
    nextActions:
      failures.length === 0
        ? [
            "Keep WORK-013 as source regression proof only.",
            "Run AUTH-005 when Supabase public env plus signed-in /auth/status evidence is available.",
            "Run WORK-009 only after a local/disposable proof target and write confirmations are ready.",
          ]
        : [
            "Fix the failing source markers before claiming the Work DB source path is still intact.",
            "Do not run WORK-009 against a valuable database to compensate for source regressions.",
          ],
  }
}

function writeOut(filePath, payload) {
  const outPath = absolute(filePath)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`)
}

function printHuman(payload) {
  console.log(`WORK-013 Work DB source smoke: ${payload.status}`)
  console.log(`Markers checked: ${payload.markers.length}`)
  console.log(`Failures: ${payload.failures.length}`)
  for (const warning of payload.warnings) {
    console.warn(`- warning: ${warning}`)
  }
  for (const failure of payload.failures) {
    console.error(`- ${failure}`)
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    printHelp()
    return
  }

  const payload = buildPayload()
  if (args.out) writeOut(args.out, payload)

  if (args.json) {
    console.log(JSON.stringify(payload, null, 2))
  } else {
    printHuman(payload)
  }

  process.exitCode = payload.failures.length === 0 ? 0 : 1
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
