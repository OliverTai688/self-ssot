#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

const FILES = {
  wizard: "src/components/ai/source-connections/source-connection-wizard.tsx",
  client: "src/app/(dashboard)/ai-input/ai-input-client.tsx",
  packageJson: "package.json",
}

const CANONICAL_STEPS = [
  "provider",
  "account",
  "scope",
  "sync_analysis",
  "governance",
  "review",
]

const REQUIRED_PROVIDERS = [
  "line",
  "google_drive",
  "rss",
  "gmail",
  "github",
  "telegram",
]

const FORBIDDEN_RUNTIME_PATTERNS = [
  { label: "server action directive", pattern: /["']use server["']/ },
  { label: "network fetch", pattern: /\bfetch\s*\(/ },
  { label: "XMLHttpRequest", pattern: /\bXMLHttpRequest\b/ },
  { label: "WebSocket", pattern: /\bWebSocket\b/ },
  { label: "EventSource", pattern: /\bEventSource\b/ },
  { label: "sendBeacon", pattern: /\bnavigator\.sendBeacon\b/ },
  { label: "localStorage", pattern: /\blocalStorage\b/ },
  { label: "sessionStorage", pattern: /\bsessionStorage\b/ },
  { label: "indexedDB", pattern: /\bindexedDB\b/ },
  { label: "cookie access", pattern: /\bdocument\.cookie\b/ },
  { label: "environment access", pattern: /\bprocess\.env\b/ },
  { label: "Prisma client", pattern: /\bPrismaClient\b|@prisma\/client/ },
  { label: "Prisma or DB import", pattern: /@\/lib\/(?:db|prisma)(?:[/'"]|$)/ },
  { label: "database call", pattern: /\b(?:prisma|db)\.[A-Za-z_$][\w$]*\s*\(/ },
  { label: "Supabase client", pattern: /@supabase\/|\bcreateBrowserClient\b|\bcreateServerClient\b/ },
  { label: "provider SDK", pattern: /\bgoogleapis\b|@octokit\/|@line\/|node-telegram-bot-api/ },
  {
    label: "raw secret/token field",
    pattern:
      /\b(?:accessToken|refreshToken|clientSecret|botToken|webhookSecret|credentialRef|secretRef|oauthCode)\b/,
  },
]

const FORBIDDEN_GOOGLE_DOCS_PICKER_PATTERNS = [
  /\bid\s*:\s*["']google_docs["']/,
  /\bprovider\s*:\s*["']Google Docs["']/,
  /\bprovider(?:Id|Key)?\s*:\s*["']google_docs["']/,
  /\bvalue\s*=\s*["']google_docs["']/,
]

function read(relativePath) {
  const absolutePath = path.join(ROOT, relativePath)
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : null
}

function tokenPattern(token) {
  return new RegExp(`["']${token}["']`)
}

const contents = Object.fromEntries(
  Object.entries(FILES).map(([key, relativePath]) => [key, read(relativePath)])
)
const errors = []

function addError(fileKey, message) {
  errors.push(`${FILES[fileKey]}: ${message}`)
}

function requireFile(fileKey) {
  if (contents[fileKey] === null) {
    addError(fileKey, "file is missing")
    return false
  }
  return true
}

function requirePattern(fileKey, label, pattern) {
  const text = contents[fileKey]
  if (text !== null && !pattern.test(text)) {
    addError(fileKey, `missing ${label}`)
  }
}

requireFile("wizard")
requireFile("client")
requireFile("packageJson")

if (contents.wizard !== null) {
  requirePattern("wizard", "SourceConnectionWizard export", /\bSourceConnectionWizard\b/)
  requirePattern("wizard", "canonical step manifest", /\b(?:WIZARD_STEPS|STEP_ORDER|CANONICAL_STEPS)\b/)

  for (const step of CANONICAL_STEPS) {
    if (!tokenPattern(step).test(contents.wizard)) {
      addError("wizard", `missing canonical wizard step id: ${step}`)
    }
  }

  for (const provider of REQUIRED_PROVIDERS) {
    if (!tokenPattern(provider).test(contents.wizard)) {
      addError("wizard", `missing provider id: ${provider}`)
    }
  }

  requirePattern("wizard", "controlled Dialog", /<Dialog\b[^>]*\bopen=\{open\}/)
  requirePattern("wizard", "DialogContent", /<DialogContent\b/)
  requirePattern("wizard", "DialogTitle", /<DialogTitle\b/)
  requirePattern("wizard", "DialogDescription", /<DialogDescription\b/)
  requirePattern("wizard", "current-step semantics", /aria-current=/)
  requirePattern("wizard", "live-region feedback", /aria-live=/)
  requirePattern(
    "wizard",
    "accessible selectable controls",
    /type=["'](?:radio|checkbox)["']|role=["']radio["']|aria-pressed=/
  )

  requirePattern("wizard", "mock-only disclosure", /mock/i)
  requirePattern("wizard", "connection draft model", /\bSourceConnectionDraft\b/)
  requirePattern(
    "wizard",
    "provider account model",
    /\bProviderAccount\w*\b|\bMockProviderAccount\b|\bMockAccount\b/
  )
  requirePattern("wizard", "account identity selection", /\baccountId\b|\bselectedAccount\w*\b/)
  requirePattern("wizard", "multi-scope selection", /\bselectedScopes?\b|\bscopeIds\b|\bselectedFolderIds\b/)
  requirePattern("wizard", "duplicate-scope handling", /\bduplicate\w*\b|\bscopeFingerprint\b/i)
  requirePattern("wizard", "dependent-connection impact", /\bdependent\w*\b|\bimpact\w*\b/i)
  requirePattern("wizard", "account revoke behavior", /\brevoke\w*\b/i)

  for (const pattern of FORBIDDEN_GOOGLE_DOCS_PICKER_PATTERNS) {
    if (pattern.test(contents.wizard)) {
      addError("wizard", "exposes Google Docs as a top-level provider choice")
    }
  }
}

if (contents.client !== null) {
  requirePattern(
    "client",
    "wizard import",
    /@\/components\/ai\/source-connections\/source-connection-wizard/
  )
  requirePattern("client", "SourceConnectionWizard integration", /<SourceConnectionWizard\b/)
  requirePattern("client", "draft creation handler", /\bhandleConnectionDraftsCreated\b/)
  requirePattern("client", "onCreated integration", /\bonCreated=\{/)
  requirePattern("client", "mock-mode guard", /\bisMockDataEnabled\b/)
  requirePattern(
    "client",
    "fail-closed wizard open guard",
    /open=\{\s*isMockDataEnabled\s*&&|isMockDataEnabled\s*&&\s*\(?\s*<SourceConnectionWizard/
  )
  requirePattern(
    "client",
    "formal-mode disabled add action",
    /disabled=\{\s*!isMockDataEnabled\s*\}/
  )
  requirePattern("client", "in-memory mock draft mapping", /setConnectorsState\s*\(/)

  for (const pattern of FORBIDDEN_GOOGLE_DOCS_PICKER_PATTERNS) {
    if (pattern.test(contents.client)) {
      addError("client", "still exposes Google Docs as a standalone provider/source row")
    }
  }
}

for (const fileKey of ["wizard", "client"]) {
  const text = contents[fileKey]
  if (text === null) continue
  for (const { label, pattern } of FORBIDDEN_RUNTIME_PATTERNS) {
    if (pattern.test(text)) {
      addError(fileKey, `contains forbidden ${label}`)
    }
  }
}

if (contents.packageJson !== null) {
  requirePattern(
    "packageJson",
    "ai-input:connection-wizard:check script",
    /"ai-input:connection-wizard:check"\s*:\s*"node scripts\/check-ai-input-connection-wizard\.mjs"/
  )
}

const result = {
  id: "AIINPUT-CONN-003",
  status: errors.length === 0 ? "connection_wizard_mock_prototype_ready" : "failed",
  files: FILES,
  canonicalSteps: CANONICAL_STEPS,
  providers: REQUIRED_PROVIDERS,
  runtimeBoundary: "ui_mock_only_no_provider_or_persistence_runtime",
  errors,
}

console.log(`AI Input connection wizard: ${result.status}`)
console.log(`Steps: ${CANONICAL_STEPS.join(" -> ")}`)
console.log(`Providers: ${REQUIRED_PROVIDERS.join(", ")}`)

if (errors.length > 0) {
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}
