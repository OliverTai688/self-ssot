"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock3Icon,
  DatabaseIcon,
  FileTextIcon,
  FolderIcon,
  GitBranchIcon,
  InboxIcon,
  InfoIcon,
  LockKeyholeIcon,
  MessageSquareIcon,
  PlusIcon,
  RssIcon,
  RouteIcon,
  SendIcon,
  Settings2Icon,
  ShieldCheckIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useProductLanguage } from "@/lib/context/product-language-context"
import type { ProductCopy } from "@/lib/i18n/product-copy"
import { cn } from "@/lib/utils"
import type {
  AIInputSourceConnectionCatalogDTO,
  AIInputSourceConnectionProviderId,
  AIInputSourceConnectionProviderManifestDTO,
  AIInputSourceConnectionRiskLevel,
  AIInputSourceConnectionStepManifestDTO,
} from "@/types/ai-input-source-connection-catalog"

export type SourceConnectionProvider = AIInputSourceConnectionProviderId
type SourceConnectionWizardCopy = ProductCopy["aiInput"]["chat"]["sourceSettings"]["wizard"]

const SourceConnectionWizardCopyContext =
  React.createContext<SourceConnectionWizardCopy | null>(null)

function useSourceConnectionWizardCopy() {
  const copy = React.useContext(SourceConnectionWizardCopyContext)
  if (!copy) {
    throw new Error("SourceConnectionWizard copy is not available")
  }
  return copy
}

export type SourceConnectionSyncMode =
  | "manual"
  | "scheduled"
  | "provider_event"

export type SourceConnectionAnalysisMode =
  | "on_new_data"
  | "manual"
  | "scheduled"

export type SourceConnectionTargetModule =
  | "work"
  | "research"
  | "chamber"
  | "inbox"

export type SourceConnectionRiskLevel = AIInputSourceConnectionRiskLevel

export interface SourceConnectionDraft {
  id: string
  provider: SourceConnectionProvider
  providerLabel: string
  displayName: string
  accountId: string | null
  accountLabel: string
  scopeId: string
  scopeLabel: string
  syncMode: SourceConnectionSyncMode
  syncCadence: string
  analysisMode: SourceConnectionAnalysisMode
  targetModule: SourceConnectionTargetModule
  riskLevel: SourceConnectionRiskLevel
  approvalRule: "always_review" | "risk_based"
  retentionDays: number
  piiMaskingEnabled: boolean
  includeInMorningBrief: boolean
  includeSubfolders: boolean
  includeAttachments: boolean
  lifecycleStatus: "draft"
  mockOnly: true
}

export interface SourceConnectionWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialProvider?: SourceConnectionProvider | null
  onCreated?: (drafts: SourceConnectionDraft[]) => void
  catalog?: AIInputSourceConnectionCatalogDTO | null
}

interface ProviderDefinition {
  id: SourceConnectionProvider
  label: string
  shortLabel: string
  icon: LucideIcon
  description: string
  scopeLabel: string
  accountMode: string
  accountHelp: string
  risk: SourceConnectionRiskLevel
  runtimeLabel: string
  accent: string
  eventLabel?: string
  boundaryNotice?: string
  manifest: AIInputSourceConnectionProviderManifestDTO
  accountOptions: MockAccount[]
  scopeOptions: MockScope[]
  existingConnectionKeys: ReadonlySet<string>
}

type ProviderPresentation = Pick<
  ProviderDefinition,
  | "id"
  | "shortLabel"
  | "icon"
  | "description"
  | "accountHelp"
  | "runtimeLabel"
  | "accent"
  | "eventLabel"
  | "boundaryNotice"
>

interface MockAccount {
  id: string
  label: string
  detail: string
  status: "connected" | "reauth_required" | "revoked" | "unavailable"
  connectionCount: number
  dependentConnections: string[]
}

interface MockScope {
  id: string
  label: string
  detail: string
}

interface WizardState {
  provider: SourceConnectionProvider | null
  accountId: string
  scopeIds: string[]
  rssUrl: string
  gmailQuery: string
  includeSubfolders: boolean
  includeAttachments: boolean
  syncMode: SourceConnectionSyncMode
  syncCadence: string
  analysisMode: SourceConnectionAnalysisMode
  targetModule: SourceConnectionTargetModule
  riskLevel: SourceConnectionRiskLevel
  approvalRule: "always_review" | "risk_based"
  retentionDays: number
  piiMasking: boolean
  morningBrief: boolean
  namePrefix: string
}

export const WIZARD_STEPS = [
  { id: "provider", step: 1, label: "選擇來源", shortLabel: "來源" },
  { id: "account", step: 2, label: "連接帳號", shortLabel: "帳號" },
  { id: "scope", step: 3, label: "來源範圍", shortLabel: "範圍" },
  { id: "sync_analysis", step: 4, label: "同步與分析", shortLabel: "同步" },
  { id: "governance", step: 5, label: "路由與治理", shortLabel: "治理" },
  { id: "review", step: 6, label: "檢查並建立", shortLabel: "確認" },
] as const

const PROVIDER_PRESENTATIONS: ProviderPresentation[] = [
  {
    id: "line",
    shortLabel: "LINE",
    icon: MessageSquareIcon,
    description: "從啟用後開始接收已核准群組或聊天室的新事件。",
    accountHelp: "使用既有 LINE OA channel；此精靈不接收 channel secret 或 token。",
    runtimeLabel: "需 Webhook 與人工批准",
    accent: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    eventLabel: "Webhook 新事件",
    boundaryNotice: "LINE 不提供任意群組歷史文字匯入。正式連線只能從已驗證 Webhook 啟用後開始接收新事件。",
  },
  {
    id: "google_drive",
    shortLabel: "Drive",
    icon: FolderIcon,
    description: "選擇資料夾；Google Docs、Sheets、Slides 是其中的檔案類型。",
    accountHelp: "可重用既有 Google 帳號，或建立一筆待授權的帳號草稿。",
    runtimeLabel: "Scope proof 後才可啟用",
    accent: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    eventLabel: "Drive 變更通知",
  },
  {
    id: "rss",
    shortLabel: "RSS",
    icon: RssIcon,
    description: "以一個公開 feed URL 建立一個可獨立管理的來源。",
    accountHelp: "正式串接仍需伺服器端 URL 安全、redirect 與 SSRF 檢查。",
    runtimeLabel: "Mock URL 預覽",
    accent: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  {
    id: "gmail",
    shortLabel: "Gmail",
    icon: InboxIcon,
    description: "以 labels、查詢條件和郵件／討論串模式界定信箱來源。",
    accountHelp: "郵件本文與附件涉及受限制 scope；本精靈只建立草稿。",
    runtimeLabel: "Restricted scope 未批准",
    accent: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    eventLabel: "Gmail 變更通知",
    boundaryNotice: "郵件本文與附件涉及受限制 scope；此設定只會記錄需求，正式啟用仍需隱私與安全審核。",
  },
  {
    id: "github",
    shortLabel: "GitHub",
    icon: GitBranchIcon,
    description: "從已選 repositories 的 GitHub App installation 建立唯讀來源。",
    accountHelp: "僅規劃 selected repositories 與 read-only 權限，不收集 PAT。",
    runtimeLabel: "GitHub App pilot 待批准",
    accent: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    eventLabel: "GitHub Webhook",
    boundaryNotice: "預設唯讀、selected repositories；AGENTS.md、SKILL.md 與程式碼只會成為參考／提案輸入。",
  },
  {
    id: "telegram",
    shortLabel: "Telegram",
    icon: SendIcon,
    description: "由已核准 bot 接收選定群組、頻道或聊天室的新訊息。",
    accountHelp: "使用既有 bot identity；本精靈不顯示或收集 bot token。",
    runtimeLabel: "Bot privacy 與 Webhook 待驗證",
    accent: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
    eventLabel: "Telegram Webhook",
    boundaryNotice: "Bot privacy mode 與群組權限會決定可見訊息；不會宣稱同步 bot 從未獲准接收的歷史。",
  },
]

const MOCK_ACCOUNTS: Record<Exclude<SourceConnectionProvider, "rss">, MockAccount[]> = {
  line: [
    {
      id: "line-chamber",
      label: "商會營運 OA",
      detail: "Messaging API channel · 2 個連線",
      status: "connected",
      connectionCount: 2,
      dependentConnections: ["商會核心幹部群", "客戶 A 專案群"],
    },
    {
      id: "line-research",
      label: "研究協作 OA",
      detail: "需要重新確認 Webhook 設定",
      status: "reauth_required",
      connectionCount: 1,
      dependentConnections: ["研究協作群"],
    },
  ],
  google_drive: [
    {
      id: "google-owner",
      label: "owner@gmail.com",
      detail: "Google 帳號 · 3 個 Drive 資料夾連線",
      status: "connected",
      connectionCount: 3,
      dependentConnections: ["Personal OS 研究", "客戶 A 專案", "生活文件"],
    },
    {
      id: "google-research",
      label: "research@school.edu",
      detail: "Google Workspace · 1 個 Drive 資料夾連線",
      status: "connected",
      connectionCount: 1,
      dependentConnections: ["博論資料"],
    },
  ],
  gmail: [
    {
      id: "gmail-owner",
      label: "owner@gmail.com",
      detail: "Metadata scope · 1 個信箱連線",
      status: "connected",
      connectionCount: 1,
      dependentConnections: ["重要郵件"],
    },
    {
      id: "gmail-work",
      label: "work@company.example",
      detail: "需要重新授權 restricted scope",
      status: "reauth_required",
      connectionCount: 2,
      dependentConnections: ["客戶往來", "專案通知"],
    },
  ],
  github: [
    {
      id: "github-personal",
      label: "Personal installation",
      detail: "個人帳號 · 2 個 selected repositories",
      status: "connected",
      connectionCount: 2,
      dependentConnections: ["self-stucture-v1", "agent-registry"],
    },
    {
      id: "github-nuva",
      label: "nuva-club organization",
      detail: "組織 installation · 4 個連線",
      status: "connected",
      connectionCount: 4,
      dependentConnections: ["nuva-docs", "nuva-web", "client-a-docs", "operations"],
    },
  ],
  telegram: [
    {
      id: "telegram-research",
      label: "@research_intake_bot",
      detail: "Bot identity verified · 2 個 chats",
      status: "connected",
      connectionCount: 2,
      dependentConnections: ["Research Reading Room", "Personal OS Agent Log"],
    },
    {
      id: "telegram-ops",
      label: "@personal_os_ops_bot",
      detail: "Webhook 尚待設定",
      status: "reauth_required",
      connectionCount: 0,
      dependentConnections: [],
    },
  ],
}

const MOCK_SCOPES: Record<Exclude<SourceConnectionProvider, "rss">, MockScope[]> = {
  google_drive: [
    { id: "drive-research", label: "Personal OS 研究", detail: "我的雲端硬碟 / 研究" },
    { id: "drive-client-a", label: "客戶 A 專案", detail: "共用雲端硬碟 / 客戶交付" },
    { id: "drive-thesis", label: "博論資料", detail: "我的雲端硬碟 / 學術" },
  ],
  gmail: [
    { id: "gmail-important", label: "重要郵件", detail: "Label: IMPORTANT" },
    { id: "gmail-client", label: "客戶往來", detail: "Label: 客戶" },
    { id: "gmail-research", label: "研究訂閱", detail: "Label: 研究" },
  ],
  github: [
    { id: "github-personal-os", label: "self-stucture-v1", detail: "main · Markdown / Issues / PRs" },
    { id: "github-agent-registry", label: "agent-registry", detail: "main · Markdown only" },
    { id: "github-client-a", label: "client-a-docs", detail: "docs/* · private repository" },
  ],
  line: [
    { id: "line-chamber-core", label: "商會核心幹部群", detail: "Group · 從啟用後接收" },
    { id: "line-client-a", label: "客戶 A 專案群", detail: "Group · 從啟用後接收" },
    { id: "line-oa-direct", label: "OA 一對一訊息", detail: "Approved direct-message source" },
  ],
  telegram: [
    { id: "telegram-research-room", label: "Research Reading Room", detail: "Supergroup · Privacy mode 待確認" },
    { id: "telegram-agent-log", label: "Personal OS Agent Log", detail: "Private channel · Bot is admin" },
    { id: "telegram-direct", label: "Owner direct chat", detail: "Private chat · New updates only" },
  ],
}

const EXISTING_CONNECTION_KEYS = new Set([
  "line:line-chamber:line-chamber-core",
  "google_drive:google-owner:drive-research",
  "gmail:gmail-owner:gmail-important",
  "github:github-personal:github-personal-os",
  "telegram:telegram-research:telegram-research-room",
])

type WizardStepDefinition = {
  id: AIInputSourceConnectionStepManifestDTO["id"]
  step: AIInputSourceConnectionStepManifestDTO["ordinal"]
  label: string
  description: string
  shortLabel: string
}

type CatalogResolution =
  | {
      manifestStatus: "ready"
      providers: ProviderDefinition[]
      errors: readonly []
    }
  | {
      manifestStatus: "manifest_unavailable"
      providers: ProviderDefinition[]
      errors: readonly string[]
    }

type WizardStepCopyById = Record<
  AIInputSourceConnectionStepManifestDTO["id"],
  { label: string; description: string; shortLabel: string }
>

type WizardProviderCopyById = Record<
  SourceConnectionProvider,
  {
    label: string
    shortLabel: string
    description: string
    scopeLabel: string
    accountMode: string
    accountHelp: string
    runtimeLabel: string
    eventLabel?: string
    boundaryNotice?: string
  }
>

type WizardAccountCopyById = Record<
  string,
  { readonly label: string; readonly detail: string; readonly dependentConnections: readonly string[] }
>

type WizardScopeCopyById = Record<string, { label: string; detail: string }>

type WizardModuleCopyById = Record<
  SourceConnectionTargetModule,
  { label: string; detail: string }
>

function interpolateCopy(
  template: string,
  values: Record<string, string | number>
) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) =>
    values[key] === undefined ? match : String(values[key])
  )
}

function localizedAccountOptions(
  accounts: MockAccount[],
  wizardCopy: SourceConnectionWizardCopy
) {
  const accountCopyById = wizardCopy.accounts as WizardAccountCopyById

  return accounts.map((account) => {
    const accountCopy = accountCopyById[account.id]
    if (!accountCopy) return account

    return {
      ...account,
      label: accountCopy.label,
      detail: accountCopy.detail,
      dependentConnections: [...accountCopy.dependentConnections],
    }
  })
}

function localizedScopeOptions(
  scopes: MockScope[],
  wizardCopy: SourceConnectionWizardCopy
) {
  const scopeCopyById = wizardCopy.scopes as WizardScopeCopyById

  return scopes.map((scope) => ({
    ...scope,
    ...(scopeCopyById[scope.id] ?? {}),
  }))
}

function localizedProviderDefinitions(
  providers: ProviderDefinition[],
  wizardCopy: SourceConnectionWizardCopy
) {
  const providerCopyById = wizardCopy.providers as WizardProviderCopyById

  return providers.map((provider) => {
    const providerCopy = providerCopyById[provider.id]
    if (!providerCopy) return provider

    return {
      ...provider,
      label: providerCopy.label,
      shortLabel: providerCopy.shortLabel,
      description: providerCopy.description,
      scopeLabel: providerCopy.scopeLabel,
      accountMode: providerCopy.accountMode,
      accountHelp: providerCopy.accountHelp,
      runtimeLabel: providerCopy.runtimeLabel,
      eventLabel: providerCopy.eventLabel,
      boundaryNotice: providerCopy.boundaryNotice,
      accountOptions: localizedAccountOptions(provider.accountOptions, wizardCopy),
      scopeOptions: localizedScopeOptions(provider.scopeOptions, wizardCopy),
    }
  })
}

function moduleOptionsFor(wizardCopy: SourceConnectionWizardCopy) {
  const moduleCopyById = wizardCopy.modules as WizardModuleCopyById

  return MODULE_OPTIONS.map((module) => ({
    ...module,
    ...(moduleCopyById[module.id] ?? {}),
  }))
}

const REQUIRED_PROVIDER_IDS: readonly SourceConnectionProvider[] = [
  "line",
  "google_drive",
  "rss",
  "gmail",
  "github",
  "telegram",
]

const REQUIRED_RUNTIME_FLAG_KEYS: readonly (keyof AIInputSourceConnectionProviderManifestDTO["runtime"])[] = [
  "oauthEnabled",
  "secretStorageEnabled",
  "callbackEnabled",
  "webhookEnabled",
  "pollingEnabled",
  "providerApiCallEnabled",
  "databaseReadEnabled",
  "databaseWriteEnabled",
  "routeHandlerEnabled",
  "serverActionEnabled",
  "moduleFinalWriteEnabled",
  "publicOutputEnabled",
  "externalAgentDatabaseAccessEnabled",
  "externalRegistrationEnabled",
]

function runtimeFlagsAreClosed(
  runtime: AIInputSourceConnectionProviderManifestDTO["runtime"]
) {
  return (
    Object.keys(runtime).length === REQUIRED_RUNTIME_FLAG_KEYS.length &&
    REQUIRED_RUNTIME_FLAG_KEYS.every((key) => runtime[key] === false)
  )
}

export function validateProviderManifests(
  catalog: AIInputSourceConnectionCatalogDTO | null | undefined
): readonly string[] {
  const errors: string[] = []

  if (!catalog) return ["manifest_missing"]
  if (catalog.status !== "provider_manifest_catalog_ready") errors.push("catalog_unavailable")
  if (catalog.validation.status !== "valid") errors.push(...catalog.validation.errorCodes)
  if (catalog.mode !== "protected_static_no_secret_no_connector_runtime") {
    errors.push("unsafe_catalog_mode")
  }
  if (!runtimeFlagsAreClosed(catalog.runtime)) errors.push("catalog_runtime_not_closed")
  if (catalog.nanda.externalRegisterable || catalog.nanda.internalRuntimeEnabled) {
    errors.push("agent_registration_or_runtime_enabled")
  }

  const providerIds = catalog.providers.map((provider) => provider.provider)
  const uniqueProviderIds = new Set(providerIds)
  if (providerIds.length !== REQUIRED_PROVIDER_IDS.length || uniqueProviderIds.size !== providerIds.length) {
    errors.push("provider_manifest_count_or_identity_invalid")
  }
  for (const providerId of REQUIRED_PROVIDER_IDS) {
    if (!uniqueProviderIds.has(providerId)) errors.push(`provider_missing:${providerId}`)
  }

  const canonicalStepIds = WIZARD_STEPS.map((step) => step.id)
  for (const provider of catalog.providers) {
    if (provider.availability !== "mock_setup_only") {
      errors.push(`provider_availability_not_mock:${provider.provider}`)
    }
    if (!runtimeFlagsAreClosed(provider.runtime)) {
      errors.push(`provider_runtime_not_closed:${provider.provider}`)
    }
    if (provider.scope.nativeIdentifierExposed !== false) {
      errors.push(`native_identifier_exposed:${provider.provider}`)
    }
    if (provider.provider === "google_drive" && !provider.docsAsDriveFileSubtype) {
      errors.push("drive_docs_subtype_contract_missing")
    }
    if (provider.provider !== "google_drive" && provider.docsAsDriveFileSubtype) {
      errors.push(`docs_subtype_assigned_to_wrong_provider:${provider.provider}`)
    }
    const credentialless = provider.account.mode === "credentialless"
    if (credentialless === provider.account.requiresProviderAccount) {
      errors.push(`provider_account_requirement_invalid:${provider.provider}`)
    }
    if (
      provider.scope.selectionMode === "validated_url_input" &&
      (provider.scope.kind !== "rss_feed" || provider.account.requiresProviderAccount)
    ) {
      errors.push(`validated_url_scope_invalid:${provider.provider}`)
    }

    const orderedSteps = [...provider.steps].sort((left, right) => left.ordinal - right.ordinal)
    const stepIds = orderedSteps.map((step) => step.id)
    const invalidStepOrder =
      stepIds.length !== canonicalStepIds.length ||
      stepIds.some((stepId, index) => stepId !== canonicalStepIds[index])
    if (invalidStepOrder || orderedSteps.some((step) => step.runtimeActionAllowed !== false)) {
      errors.push(`provider_steps_invalid:${provider.provider}`)
    }
  }

  return [...new Set(errors)]
}

function catalogAccountOptions(
  catalog: AIInputSourceConnectionCatalogDTO,
  manifest: AIInputSourceConnectionProviderManifestDTO
): MockAccount[] {
  const instances = catalog.accountInstances.items.filter(
    (account) => account.provider === manifest.provider
  )
  if (instances.length === 0) {
    return manifest.account.requiresProviderAccount
      ? MOCK_ACCOUNTS[manifest.provider as Exclude<SourceConnectionProvider, "rss">]
      : []
  }

  return instances.map((account) => {
    const dependentConnections = catalog.scopeInstances.items
      .filter((scope) => scope.providerAccountId === account.id)
      .map((scope) => scope.displayLabel)

    return {
      id: account.id,
      label: account.displayLabel,
      detail: `${account.dependentConnectionCount} 個相依連線 · UI-safe account instance`,
      status:
        account.authorizationStatus === "reauthorization_required"
          ? "reauth_required"
          : account.authorizationStatus,
      connectionCount: account.dependentConnectionCount,
      dependentConnections,
    }
  })
}

function resolveProviderDefinitions(
  catalog: AIInputSourceConnectionCatalogDTO
): ProviderDefinition[] {
  return catalog.providers.map((manifest) => {
    const presentation = PROVIDER_PRESENTATIONS.find((item) => item.id === manifest.provider)
    if (!presentation) throw new Error(`Missing provider presentation: ${manifest.provider}`)

    const existingConnectionKeys = new Set(EXISTING_CONNECTION_KEYS)
    for (const scope of catalog.scopeInstances.items) {
      if (scope.providerAccountId) {
        existingConnectionKeys.add(`${scope.provider}:${scope.providerAccountId}:${scope.id}`)
      }
    }

    return {
      ...presentation,
      label: manifest.label,
      scopeLabel: manifest.scope.label,
      accountMode: manifest.account.identityLabel,
      risk: manifest.defaultRiskLevel,
      manifest,
      accountOptions: catalogAccountOptions(catalog, manifest),
      scopeOptions:
        manifest.scope.selectionMode === "validated_url_input"
          ? []
          : MOCK_SCOPES[manifest.provider as Exclude<SourceConnectionProvider, "rss">],
      existingConnectionKeys,
    }
  })
}

function resolveCatalog(
  catalog: AIInputSourceConnectionCatalogDTO | null | undefined
): CatalogResolution {
  const errors = validateProviderManifests(catalog)
  if (!catalog || errors.length > 0) {
    return { manifestStatus: "manifest_unavailable", providers: [], errors }
  }

  return {
    manifestStatus: "ready",
    providers: resolveProviderDefinitions(catalog),
    errors: [],
  }
}

function wizardStepsFor(
  provider: ProviderDefinition | null,
  providers: ProviderDefinition[],
  wizardCopy: SourceConnectionWizardCopy
) {
  const providerSteps = provider?.manifest.steps ?? providers[0]?.manifest.steps ?? []
  const stepCopyById = wizardCopy.steps as WizardStepCopyById

  return [...providerSteps]
    .sort((left, right) => left.ordinal - right.ordinal)
    .map(
      (step): WizardStepDefinition => ({
        id: step.id,
        step: step.ordinal,
        label: stepCopyById[step.id]?.label ?? step.label,
        description: stepCopyById[step.id]?.description ?? step.description,
        shortLabel:
          stepCopyById[step.id]?.shortLabel ??
          WIZARD_STEPS.find((canonical) => canonical.id === step.id)?.shortLabel ??
          step.label,
      })
    )
}

const MODULE_OPTIONS: Array<{
  id: SourceConnectionTargetModule
  label: string
  detail: string
}> = [
  { id: "inbox", label: "AI Inbox", detail: "先進收件匣，等待人工分流" },
  { id: "work", label: "Work", detail: "工作、客戶與專案提案" },
  { id: "research", label: "Research", detail: "研究資料與知識物件提案" },
  { id: "chamber", label: "Chamber", detail: "商會關係與互動提案" },
]

function makeInitialState(
  provider: SourceConnectionProvider | null | undefined,
  providers: ProviderDefinition[],
  wizardCopy?: SourceConnectionWizardCopy
): WizardState {
  const definition = providers.find((item) => item.id === provider)
  const accountRequired = definition?.manifest.account.requiresProviderAccount ?? true
  const validatedUrlScope = definition?.manifest.scope.selectionMode === "validated_url_input"
  const schedulePresets = wizardCopy?.schedulePresets

  return {
    provider: provider ?? null,
    accountId: accountRequired ? "" : "not_required",
    scopeIds: [],
    rssUrl: "",
    gmailQuery: "",
    includeSubfolders: true,
    includeAttachments: false,
    syncMode: validatedUrlScope ? "scheduled" : "manual",
    syncCadence: validatedUrlScope
      ? schedulePresets?.sixHours ?? "每 6 小時"
      : schedulePresets?.dailyMorning ?? "每日 09:00",
    analysisMode: "on_new_data",
    targetModule: validatedUrlScope ? "research" : "inbox",
    riskLevel: definition?.risk ?? "medium",
    approvalRule: "always_review",
    retentionDays: definition?.risk === "high" ? 30 : 90,
    piiMasking: true,
    morningBrief: false,
    namePrefix: "",
  }
}

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

function providerById(
  provider: SourceConnectionProvider | null,
  providers: ProviderDefinition[]
) {
  return providers.find((item) => item.id === provider) ?? null
}

function accountLabelFor(
  state: WizardState,
  provider: ProviderDefinition,
  wizardCopy: SourceConnectionWizardCopy
) {
  if (!provider.manifest.account.requiresProviderAccount) {
    return wizardCopy.accountLabels.notRequired
  }
  if (!state.accountId) return wizardCopy.accountLabels.notSelected
  if (state.accountId === "connect_new") return wizardCopy.accountLabels.connectNew

  return (
    provider.accountOptions.find((account) => account.id === state.accountId)?.label ??
    wizardCopy.accountLabels.pending
  )
}

function scopeSelectionFor(state: WizardState, provider: ProviderDefinition): MockScope[] {
  if (provider.manifest.scope.selectionMode === "validated_url_input") {
    const url = state.rssUrl.trim()
    return url ? [{ id: url, label: url, detail: provider.manifest.scope.label }] : []
  }

  const selected = provider.scopeOptions.filter((scope) =>
    state.scopeIds.includes(scope.id)
  )

  if (provider.manifest.scope.kind === "gmail_query" && selected.length > 0) {
    const query = state.gmailQuery.trim()
    return [
      {
        id: selected.map((scope) => scope.id).join("+"),
        label: `${selected.map((scope) => scope.label).join("、")}${query ? ` · ${query}` : ""}`,
        detail: "Gmail labels / query scope",
      },
    ]
  }

  return selected
}

function riskLabel(
  risk: SourceConnectionRiskLevel,
  wizardCopy: SourceConnectionWizardCopy
) {
  return wizardCopy.riskLabels[risk]
}

function syncModeLabel(
  mode: SourceConnectionSyncMode,
  provider: ProviderDefinition | null,
  wizardCopy: SourceConnectionWizardCopy
) {
  if (mode === "provider_event") return provider?.eventLabel ?? wizardCopy.syncModeLabels.providerEvent
  return wizardCopy.syncModeLabels[mode]
}

function schedulePresetLabel(value: string, wizardCopy: SourceConnectionWizardCopy) {
  const normalized = value.trim().toLowerCase()
  if (normalized === "每 6 小時" || normalized === "every 6 hours") {
    return wizardCopy.schedulePresets.sixHours
  }
  if (normalized === "每日 09:00" || normalized === "daily 09:00") {
    return wizardCopy.schedulePresets.dailyMorning
  }
  if (normalized === "每日 18:00" || normalized === "daily 18:00") {
    return wizardCopy.schedulePresets.dailyEvening
  }
  if (normalized === "每週一 09:00" || normalized === "every monday 09:00") {
    return wizardCopy.schedulePresets.weeklyMonday
  }
  return value
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-5 text-muted-foreground">{children}</p>
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <h3 className="font-heading text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function ChoiceCard({
  selected,
  onSelect,
  title,
  detail,
  meta,
  disabled = false,
}: {
  selected: boolean
  onSelect: () => void
  title: string
  detail: string
  meta?: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "group flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors outline-none",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
        selected
          ? "border-primary/45 bg-primary/[0.045]"
          : "border-border/70 bg-background hover:border-foreground/20 hover:bg-muted/30",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-input"
        )}
        aria-hidden="true"
      >
        {selected ? <CheckIcon className="size-3" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-foreground">{title}</span>
          {meta}
        </span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{detail}</span>
      </span>
    </button>
  )
}

export function SourceConnectionWizard({
  open,
  onOpenChange,
  initialProvider = null,
  onCreated,
  catalog,
}: SourceConnectionWizardProps) {
  const { copy } = useProductLanguage()
  const wizardCopy = copy.aiInput.chat.sourceSettings.wizard
  const catalogResolution = React.useMemo(() => resolveCatalog(catalog), [catalog])
  const providers = React.useMemo(
    () => localizedProviderDefinitions(catalogResolution.providers, wizardCopy),
    [catalogResolution.providers, wizardCopy]
  )
  const [step, setStep] = React.useState(initialProvider ? 2 : 1)
  const [state, setState] = React.useState<WizardState>(() =>
    makeInitialState(null, [], wizardCopy)
  )
  const [testStatus, setTestStatus] = React.useState<"idle" | "passed">("idle")
  const [createdDrafts, setCreatedDrafts] = React.useState<SourceConnectionDraft[]>([])

  React.useEffect(() => {
    if (!open) return

    let cancelled = false
    window.queueMicrotask(() => {
      if (cancelled) return
      const canUseInitialProvider = providers.some((provider) => provider.id === initialProvider)
      setStep(canUseInitialProvider ? 2 : 1)
      setState(makeInitialState(canUseInitialProvider ? initialProvider : null, providers, wizardCopy))
      setTestStatus("idle")
      setCreatedDrafts([])
    })

    return () => {
      cancelled = true
    }
  }, [initialProvider, open, providers, wizardCopy])

  const provider = providerById(state.provider, providers)
  const steps = wizardStepsFor(provider, providers, wizardCopy)
  const scopes = provider ? scopeSelectionFor(state, provider) : []
  const currentStep = steps.find((item) => item.step === step) ?? null

  const stepIsValid = React.useMemo(() => {
    if (catalogResolution.manifestStatus !== "ready" || !provider) return false
    if (step === 1) return state.provider !== null
    if (step === 2) {
      return !provider.manifest.account.requiresProviderAccount || Boolean(state.accountId)
    }
    if (step === 3) {
      if (provider.manifest.scope.selectionMode === "validated_url_input") {
        return isValidHttpUrl(state.rssUrl.trim())
      }
      return state.scopeIds.length > 0
    }
    return true
  }, [catalogResolution.manifestStatus, provider, state, step])

  function updateState(patch: Partial<WizardState>) {
    setState((current) => ({ ...current, ...patch }))
    setTestStatus("idle")
  }

  function selectProvider(nextProvider: SourceConnectionProvider) {
    if (!providers.some((item) => item.id === nextProvider)) return
    setState(makeInitialState(nextProvider, providers))
    setTestStatus("idle")
  }

  function toggleScope(scopeId: string) {
    if (!provider) return
    updateState({
      scopeIds: provider.manifest.scope.supportsMultipleScopes
        ? state.scopeIds.includes(scopeId)
          ? state.scopeIds.filter((id) => id !== scopeId)
          : [...state.scopeIds, scopeId]
        : state.scopeIds.includes(scopeId)
          ? []
          : [scopeId],
    })
  }

  function goNext() {
    if (!stepIsValid) return
    setStep((current) => Math.min(current + 1, steps.length))
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 1))
  }

  function createDrafts() {
    if (!provider || scopes.length === 0) return

    const timestamp = Date.now()
    const accountLabel = accountLabelFor(state, provider, wizardCopy)
    const drafts = scopes.map((scope, index): SourceConnectionDraft => ({
      id: `source-draft-${timestamp}-${index + 1}`,
      provider: provider.id,
      providerLabel: provider.shortLabel,
      displayName: state.namePrefix.trim()
        ? scopes.length > 1
          ? `${state.namePrefix.trim()} · ${scope.label}`
          : state.namePrefix.trim()
        : `${provider.shortLabel} · ${scope.label}`,
      accountId:
        !provider.manifest.account.requiresProviderAccount || state.accountId === "connect_new"
          ? null
          : state.accountId,
      accountLabel,
      scopeId: scope.id,
      scopeLabel: scope.label,
      syncMode: state.syncMode,
      syncCadence:
        state.syncMode === "scheduled"
          ? schedulePresetLabel(state.syncCadence, wizardCopy)
          : syncModeLabel(state.syncMode, provider, wizardCopy),
      analysisMode: state.analysisMode,
      targetModule: state.targetModule,
      riskLevel: state.riskLevel,
      approvalRule: state.approvalRule,
      retentionDays: state.retentionDays,
      piiMaskingEnabled: state.piiMasking,
      includeInMorningBrief: state.morningBrief,
      includeSubfolders:
        provider.manifest.scope.includeSubfoldersAvailable && state.includeSubfolders,
      includeAttachments:
        provider.manifest.scope.includeAttachmentsAvailable && state.includeAttachments,
      lifecycleStatus: "draft",
      mockOnly: true,
    }))

    setCreatedDrafts(drafts)
    onCreated?.(drafts)
  }

  function closeWizard() {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[92dvh] min-h-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
        showCloseButton={!createdDrafts.length}
      >
        <SourceConnectionWizardCopyContext.Provider value={wizardCopy}>
          {catalogResolution.manifestStatus !== "ready" || !currentStep ? (
            <ManifestUnavailableState
              errors={catalogResolution.errors}
              onClose={closeWizard}
            />
          ) : createdDrafts.length > 0 ? (
            <SuccessState
              drafts={createdDrafts}
              onClose={closeWizard}
              onAddAnother={() => {
                setStep(1)
                setState(makeInitialState(null, providers, wizardCopy))
                setTestStatus("idle")
                setCreatedDrafts([])
              }}
            />
          ) : (
            <>
            <DialogHeader className="border-b px-5 py-4 pr-12 sm:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle>{wizardCopy.title}</DialogTitle>
                <Badge variant="outline" className="border-amber-300/70 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                  {wizardCopy.badge}
                </Badge>
              </div>
              <DialogDescription>
                {wizardCopy.description}
              </DialogDescription>
            </DialogHeader>

            <div className="flex min-h-0 flex-1 flex-col md:flex-row">
              <WizardProgress currentStep={step} steps={steps} />

              <div className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
                  <div className="mx-auto w-full max-w-3xl">
                    <div className="mb-5">
                      <p className="text-xs font-medium text-muted-foreground">
                        {interpolateCopy(wizardCopy.stepCounter, {
                          current: step,
                          total: steps.length,
                        })}
                      </p>
                      <h2 className="mt-1 font-heading text-lg font-semibold tracking-tight text-foreground">
                        {currentStep.label}
                      </h2>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {currentStep.description}
                      </p>
                    </div>

                    <div aria-live="polite">
                      {step === 1 ? (
                        <ProviderStep
                          providers={providers}
                          selected={state.provider}
                          onSelect={selectProvider}
                        />
                      ) : null}
                      {step === 2 && provider ? (
                        <AccountStep
                          provider={provider}
                          accountId={state.accountId}
                          onSelect={(accountId) => updateState({ accountId, scopeIds: [] })}
                        />
                      ) : null}
                      {step === 3 && provider ? (
                        <ScopeStep
                          provider={provider}
                          state={state}
                          updateState={updateState}
                          toggleScope={toggleScope}
                        />
                      ) : null}
                      {step === 4 && provider ? (
                        <SyncStep provider={provider} state={state} updateState={updateState} />
                      ) : null}
                      {step === 5 && provider ? (
                        <GovernanceStep state={state} updateState={updateState} />
                      ) : null}
                      {step === 6 && provider ? (
                        <ReviewStep
                          provider={provider}
                          state={state}
                          scopes={scopes}
                          testStatus={testStatus}
                          onTest={() => setTestStatus("passed")}
                          updateState={updateState}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>

                <WizardFooter
                  step={step}
                  valid={stepIsValid}
                  provider={provider}
                  scopeCount={scopes.length}
                  stepCount={steps.length}
                  onBack={goBack}
                  onNext={goNext}
                  onClose={closeWizard}
                  onCreate={createDrafts}
                />
              </div>
            </div>
            </>
          )}
        </SourceConnectionWizardCopyContext.Provider>
      </DialogContent>
    </Dialog>
  )
}

function WizardProgress({
  currentStep,
  steps,
}: {
  currentStep: number
  steps: WizardStepDefinition[]
}) {
  const wizardCopy = useSourceConnectionWizardCopy()

  return (
    <aside className="shrink-0 border-b bg-muted/20 px-4 py-3 md:w-56 md:border-r md:border-b-0 md:px-4 md:py-5">
      <ol
        className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0"
        aria-label={wizardCopy.progressAriaLabel}
      >
        {steps.map((item) => {
          const completed = item.step < currentStep
          const active = item.step === currentStep
          return (
            <li key={item.id} className="shrink-0 md:w-full">
              <div
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors md:text-sm",
                  active && "bg-background font-medium text-foreground shadow-xs ring-1 ring-border/60",
                  completed && "text-foreground",
                  !active && !completed && "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                    completed && "border-primary bg-primary text-primary-foreground",
                    active && "border-primary text-primary",
                    !active && !completed && "border-border"
                  )}
                  aria-hidden="true"
                >
                  {completed ? <CheckIcon className="size-3" /> : item.step}
                </span>
                <span className="hidden md:inline">{item.label}</span>
                <span className="md:hidden">{item.shortLabel}</span>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="mt-6 hidden rounded-xl border border-dashed border-border/80 bg-background/70 p-3 md:block">
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <LockKeyholeIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
          {wizardCopy.safetyTitle}
        </div>
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
          {wizardCopy.safetyDescription}
        </p>
      </div>
    </aside>
  )
}

function ProviderStep({
  providers,
  selected,
  onSelect,
}: {
  providers: ProviderDefinition[]
  selected: SourceConnectionProvider | null
  onSelect: (provider: SourceConnectionProvider) => void
}) {
  const wizardCopy = useSourceConnectionWizardCopy()

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-muted-foreground">
        {wizardCopy.providerIntro}
      </p>
      <div className="grid gap-3 sm:grid-cols-2" role="list" aria-label={wizardCopy.providerListAriaLabel}>
        {providers.map((provider) => {
          const Icon = provider.icon
          const isSelected = selected === provider.id
          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => onSelect(provider.id)}
              aria-pressed={isSelected}
              className={cn(
                "group rounded-xl border p-4 text-left outline-none transition-all",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
                isSelected
                  ? "border-primary/50 bg-primary/[0.04] shadow-sm"
                  : "border-border/70 bg-background hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={cn("flex size-9 items-center justify-center rounded-lg", provider.accent)}>
                  <Icon className="size-4.5" aria-hidden="true" />
                </span>
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  {riskLabel(provider.risk, wizardCopy)}
                </Badge>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground">{provider.label}</h3>
              <p className="mt-1.5 min-h-10 text-xs leading-5 text-muted-foreground">
                {provider.description}
              </p>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                <span>{provider.scopeLabel}</span>
                {isSelected ? (
                <span className="inline-flex items-center gap-1 font-medium text-primary">
                    {wizardCopy.selectedLabel} <CheckIcon className="size-3" aria-hidden="true" />
                  </span>
                ) : (
                  <ChevronRightIcon className="size-3.5" aria-hidden="true" />
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AccountStep({
  provider,
  accountId,
  onSelect,
}: {
  provider: ProviderDefinition
  accountId: string
  onSelect: (accountId: string) => void
}) {
  const wizardCopy = useSourceConnectionWizardCopy()

  if (!provider.manifest.account.requiresProviderAccount) {
    return (
      <div className="space-y-5">
        <SectionHeading
          icon={RssIcon}
          title={wizardCopy.noAccountTitle}
          description={wizardCopy.noAccountDescription}
        />
        <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/70 p-4 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
          <div className="flex items-start gap-3">
            <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-medium">{wizardCopy.noAccountStatusTitle}</p>
              <p className="mt-1 text-xs leading-5 opacity-80">
                {wizardCopy.noAccountStatusDescription}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const accounts = provider.accountOptions

  return (
    <div className="space-y-5">
      <SectionHeading
        icon={provider.icon}
        title={interpolateCopy(wizardCopy.chooseAccountTitleTemplate, {
          provider: provider.shortLabel,
        })}
        description={provider.accountHelp}
      />

      <div
        className="space-y-2"
        role="radiogroup"
        aria-label={interpolateCopy(wizardCopy.accountRadiogroupTemplate, {
          provider: provider.label,
        })}
      >
        {accounts.map((account) => (
          <div key={account.id} className="rounded-xl border border-transparent has-[details[open]]:border-border/70 has-[details[open]]:bg-muted/15">
            <ChoiceCard
              selected={accountId === account.id}
              onSelect={() => onSelect(account.id)}
              disabled={account.status === "revoked" || account.status === "unavailable"}
              title={account.label}
              detail={account.detail}
              meta={
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    account.status === "connected"
                      ? "border-emerald-300/70 text-emerald-700 dark:text-emerald-300"
                      : "border-amber-300/70 text-amber-700 dark:text-amber-300"
                  )}
                >
                  {account.status === "connected"
                    ? wizardCopy.accountStatus.connected
                    : account.status === "reauth_required"
                      ? wizardCopy.accountStatus.reauth_required
                      : account.status === "revoked"
                        ? wizardCopy.accountStatus.revoked
                        : wizardCopy.accountStatus.unavailable}
                </Badge>
              }
            />
            <AccountImpactPreview account={account} />
          </div>
        ))}

        {provider.manifest.account.supportsMultipleAccounts ? (
          <ChoiceCard
            selected={accountId === "connect_new"}
            onSelect={() => onSelect("connect_new")}
            title={wizardCopy.connectNewTitle}
            detail={wizardCopy.connectNewDetail}
            meta={<PlusIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
          />
        ) : null}
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
        <LockKeyholeIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>
          {interpolateCopy(wizardCopy.accountBoundaryTemplate, {
            accountMode: provider.accountMode,
          })}
        </span>
      </div>
    </div>
  )
}

function AccountImpactPreview({ account }: { account: MockAccount }) {
  const wizardCopy = useSourceConnectionWizardCopy()
  const [previewAction, setPreviewAction] = React.useState<
    "idle" | "reauthorizeAccount" | "revokeAccount"
  >("idle")
  const dependentConnections = account.dependentConnections

  return (
    <details className="group px-3 pb-2">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-2 py-2 text-xs font-medium text-muted-foreground outline-none hover:bg-muted/50 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 [&::-webkit-details-marker]:hidden">
        <span>{wizardCopy.accountImpact.summary}</span>
        <ChevronRightIcon className="size-3.5 transition-transform group-open:rotate-90" aria-hidden="true" />
      </summary>
      <div className="mx-2 mb-1 rounded-lg border border-border/70 bg-background p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-foreground">{wizardCopy.accountImpact.healthTitle}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {account.status === "connected"
                ? wizardCopy.accountImpact.connectedDetail
                : wizardCopy.accountImpact.reauthDetail}
            </p>
          </div>
          <Badge variant={account.status === "connected" ? "secondary" : "outline"}>
            {interpolateCopy(wizardCopy.accountImpact.dependentCountTemplate, {
              count: account.connectionCount,
            })}
          </Badge>
        </div>

        <div className="mt-3 border-t border-border/60 pt-3">
          <p className="text-[11px] font-medium text-muted-foreground">
            {wizardCopy.accountImpact.dependentConnections}
          </p>
          {dependentConnections.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {dependentConnections.map((connection) => (
                <Badge key={connection} variant="outline" className="bg-muted/30 text-[10px]">
                  {connection}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">{wizardCopy.accountImpact.empty}</p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
          variant="outline"
          onClick={() => setPreviewAction("reauthorizeAccount")}
        >
            {wizardCopy.accountImpact.reauthorize}
          </Button>
          <Button
            type="button"
            size="sm"
          variant="destructive"
          onClick={() => setPreviewAction("revokeAccount")}
        >
            {wizardCopy.accountImpact.revoke}
          </Button>
        </div>

        <div className="mt-3" aria-live="polite">
          {previewAction === "reauthorizeAccount" ? (
            <p className="rounded-md bg-muted/50 px-2.5 py-2 text-[11px] leading-5 text-muted-foreground">
              {wizardCopy.accountImpact.reauthorizePreview}
            </p>
          ) : null}
          {previewAction === "revokeAccount" ? (
            <p className="rounded-md bg-destructive/5 px-2.5 py-2 text-[11px] leading-5 text-destructive">
              {interpolateCopy(wizardCopy.accountImpact.revokePreviewTemplate, {
                count: account.connectionCount,
              })}
            </p>
          ) : null}
        </div>
      </div>
    </details>
  )
}

function ScopeStep({
  provider,
  state,
  updateState,
  toggleScope,
}: {
  provider: ProviderDefinition
  state: WizardState
  updateState: (patch: Partial<WizardState>) => void
  toggleScope: (scopeId: string) => void
}) {
  const wizardCopy = useSourceConnectionWizardCopy()

  if (provider.manifest.scope.selectionMode === "validated_url_input") {
    const hasValue = Boolean(state.rssUrl.trim())
    const isValid = hasValue && isValidHttpUrl(state.rssUrl.trim())

    return (
      <div className="space-y-5">
        <SectionHeading
          icon={provider.icon}
          title={interpolateCopy(wizardCopy.rssScopeTitleTemplate, {
            scope: provider.manifest.scope.label,
          })}
          description={wizardCopy.rssScopeDescription}
        />
        <div className="space-y-2">
          <Label htmlFor="source-rss-url">{provider.manifest.scope.label}</Label>
          <Input
            id="source-rss-url"
            type="url"
            inputMode="url"
            value={state.rssUrl}
            onChange={(event) => updateState({ rssUrl: event.target.value })}
            placeholder="https://example.com/feed.xml"
            aria-describedby="source-rss-url-hint"
            aria-invalid={hasValue && !isValid}
          />
          <p id="source-rss-url-hint" className="text-xs leading-5 text-muted-foreground">
            {wizardCopy.rssHint}
          </p>
        </div>

        {hasValue ? (
          <div
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3",
              isValid
                ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20"
                : "border-destructive/30 bg-destructive/5"
            )}
          >
            {isValid ? (
              <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
            ) : (
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">
                {isValid ? wizardCopy.rssValid : wizardCopy.rssInvalid}
              </p>
              <p className="mt-1 break-all text-xs text-muted-foreground">{state.rssUrl}</p>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  const availableScopes = provider.scopeOptions

  return (
    <div className="space-y-5">
      <SectionHeading
        icon={provider.icon}
        title={interpolateCopy(wizardCopy.scopeTitleTemplate, {
          scope: provider.scopeLabel,
        })}
        description={wizardCopy.scopeDescription}
      />

      <div
        className="space-y-2"
        aria-label={interpolateCopy(wizardCopy.scopeAriaTemplate, {
          provider: provider.label,
        })}
      >
        {availableScopes.map((scope) => {
          const duplicateScope = provider.existingConnectionKeys.has(
            `${provider.id}:${state.accountId}:${scope.id}`
          )
          const selected = state.scopeIds.includes(scope.id)

          return (
            <ChoiceCard
              key={scope.id}
              selected={selected}
              onSelect={() => toggleScope(scope.id)}
              title={scope.label}
              detail={
                duplicateScope
                  ? interpolateCopy(wizardCopy.duplicateDetailTemplate, {
                      detail: scope.detail,
                    })
                  : scope.detail
              }
              disabled={duplicateScope}
              meta={
                duplicateScope ? (
                  <Badge variant="outline" className="border-amber-300/70 text-[10px] text-amber-700 dark:text-amber-300">
                    {wizardCopy.duplicateBadge}
                  </Badge>
                ) : selected ? (
                  <Badge variant="secondary" className="text-[10px]">{wizardCopy.draftBadge}</Badge>
                ) : null
              }
            />
          )
        })}
      </div>

      {provider.manifest.scope.includeSubfoldersAvailable ||
      provider.manifest.scope.fileSubtypeProvenance.length > 0 ? (
        <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
          {provider.manifest.scope.includeSubfoldersAvailable ? (
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={state.includeSubfolders}
                onChange={(event) => updateState({ includeSubfolders: event.target.checked })}
                className="mt-0.5 size-4 accent-primary"
              />
              <span>
                <span className="block text-sm font-medium">{wizardCopy.includeSubfoldersTitle}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {wizardCopy.includeSubfoldersDescription}
                </span>
              </span>
            </label>
          ) : null}
          {provider.manifest.scope.fileSubtypeProvenance.length > 0 ? (
            <div className="flex flex-wrap gap-1.5" aria-label={wizardCopy.fileTypesAriaLabel}>
              {provider.manifest.scope.fileSubtypeProvenance.map((type) => (
                <Badge key={type} variant="outline" className="bg-background text-[10px] text-muted-foreground">
                  {type}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {provider.manifest.scope.kind === "gmail_query" ? (
        <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
          <div className="space-y-2">
            <Label htmlFor="gmail-query">{wizardCopy.gmailQueryLabel}</Label>
            <Input
              id="gmail-query"
              value={state.gmailQuery}
              onChange={(event) => updateState({ gmailQuery: event.target.value })}
              placeholder="newer_than:30d has:attachment"
            />
            <FieldHint>{wizardCopy.gmailQueryHint}</FieldHint>
          </div>
          {provider.manifest.scope.includeAttachmentsAvailable ? (
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={state.includeAttachments}
                onChange={(event) => updateState({ includeAttachments: event.target.checked })}
                className="mt-0.5 size-4 accent-primary"
              />
              <span>
                <span className="block text-sm font-medium">{wizardCopy.includeAttachmentsTitle}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {wizardCopy.includeAttachmentsDescription}
                </span>
              </span>
            </label>
          ) : null}
        </div>
      ) : null}

      {provider.boundaryNotice ? (
        <ProviderBoundaryNotice>{provider.boundaryNotice}</ProviderBoundaryNotice>
      ) : null}
    </div>
  )
}

function ProviderBoundaryNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2.5 text-xs leading-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-100">
      <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}

function SyncStep({
  provider,
  state,
  updateState,
}: {
  provider: ProviderDefinition
  state: WizardState
  updateState: (patch: Partial<WizardState>) => void
}) {
  const wizardCopy = useSourceConnectionWizardCopy()
  const syncOptions: Array<{
    value: SourceConnectionSyncMode
    title: string
    detail: string
  }> = [
    { value: "manual", ...wizardCopy.syncOptions.manual },
    { value: "scheduled", ...wizardCopy.syncOptions.scheduled },
  ]

  if (provider.eventLabel) {
    syncOptions.push({
      value: "provider_event",
      title: provider.eventLabel,
      detail: wizardCopy.providerEventDetail,
    })
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={Clock3Icon}
        title={wizardCopy.syncSectionTitle}
        description={wizardCopy.syncSectionDescription}
      />

      <section className="space-y-3" aria-labelledby="sync-mode-heading">
        <div>
          <h3 id="sync-mode-heading" className="text-sm font-semibold text-foreground">
            {wizardCopy.syncModeTitle}
          </h3>
          <FieldHint>{wizardCopy.syncModeHint}</FieldHint>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {syncOptions.map((option) => (
            <ChoiceCard
              key={option.value}
              selected={state.syncMode === option.value}
              onSelect={() => updateState({ syncMode: option.value })}
              title={option.title}
              detail={option.detail}
            />
          ))}
        </div>

        {state.syncMode === "scheduled" ? (
          <div className="grid gap-2 pt-1 sm:max-w-xs">
            <Label htmlFor="sync-cadence">{wizardCopy.syncCadenceLabel}</Label>
            <select
              id="sync-cadence"
              value={schedulePresetLabel(state.syncCadence, wizardCopy)}
              onChange={(event) => updateState({ syncCadence: event.target.value })}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <option>{wizardCopy.schedulePresets.sixHours}</option>
              <option>{wizardCopy.schedulePresets.dailyMorning}</option>
              <option>{wizardCopy.schedulePresets.dailyEvening}</option>
              <option>{wizardCopy.schedulePresets.weeklyMonday}</option>
            </select>
            <FieldHint>{wizardCopy.syncTimezoneHint}</FieldHint>
          </div>
        ) : null}
      </section>

      <section className="space-y-3 border-t border-border/70 pt-5" aria-labelledby="analysis-mode-heading">
        <div>
          <h3 id="analysis-mode-heading" className="text-sm font-semibold text-foreground">
            {wizardCopy.analysisModeTitle}
          </h3>
          <FieldHint>{wizardCopy.analysisModeHint}</FieldHint>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <ChoiceCard
            selected={state.analysisMode === "on_new_data"}
            onSelect={() => updateState({ analysisMode: "on_new_data" })}
            title={wizardCopy.analysisOptions.on_new_data.title}
            detail={wizardCopy.analysisOptions.on_new_data.detail}
          />
          <ChoiceCard
            selected={state.analysisMode === "manual"}
            onSelect={() => updateState({ analysisMode: "manual" })}
            title={wizardCopy.analysisOptions.manual.title}
            detail={wizardCopy.analysisOptions.manual.detail}
          />
          <ChoiceCard
            selected={state.analysisMode === "scheduled"}
            onSelect={() => updateState({ analysisMode: "scheduled" })}
            title={wizardCopy.analysisOptions.scheduled.title}
            detail={wizardCopy.analysisOptions.scheduled.detail}
          />
        </div>
      </section>
    </div>
  )
}

function GovernanceStep({
  state,
  updateState,
}: {
  state: WizardState
  updateState: (patch: Partial<WizardState>) => void
}) {
  const wizardCopy = useSourceConnectionWizardCopy()
  const moduleOptions = moduleOptionsFor(wizardCopy)

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={ShieldCheckIcon}
        title={wizardCopy.governanceTitle}
        description={wizardCopy.governanceDescription}
      />

      <section className="space-y-3" aria-labelledby="target-module-heading">
        <div>
          <h3 id="target-module-heading" className="text-sm font-semibold text-foreground">
            {wizardCopy.targetModuleTitle}
          </h3>
          <FieldHint>{wizardCopy.targetModuleHint}</FieldHint>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {moduleOptions.map((module) => (
            <ChoiceCard
              key={module.id}
              selected={state.targetModule === module.id}
              onSelect={() => updateState({ targetModule: module.id })}
              title={module.label}
              detail={module.detail}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-5 border-t border-border/70 pt-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="risk-level">{wizardCopy.riskLevelLabel}</Label>
          <select
            id="risk-level"
            value={state.riskLevel}
            onChange={(event) =>
              updateState({ riskLevel: event.target.value as SourceConnectionRiskLevel })
            }
            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <option value="low">{wizardCopy.riskLabels.low}</option>
            <option value="medium">{wizardCopy.riskLabels.medium}</option>
            <option value="high">{wizardCopy.riskLabels.high}</option>
          </select>
          <FieldHint>{wizardCopy.riskLevelHint}</FieldHint>
        </div>

        <div className="space-y-2">
          <Label htmlFor="approval-rule">{wizardCopy.approvalRuleLabel}</Label>
          <select
            id="approval-rule"
            value={state.approvalRule}
            onChange={(event) =>
              updateState({
                approvalRule: event.target.value as WizardState["approvalRule"],
              })
            }
            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <option value="always_review">{wizardCopy.approvalRuleOptions.always_review}</option>
            <option value="risk_based">{wizardCopy.approvalRuleOptions.risk_based}</option>
          </select>
          <FieldHint>{wizardCopy.approvalRuleHint}</FieldHint>
        </div>

        <div className="space-y-2">
          <Label htmlFor="retention-days">{wizardCopy.retentionDaysLabel}</Label>
          <select
            id="retention-days"
            value={String(state.retentionDays)}
            onChange={(event) => updateState({ retentionDays: Number(event.target.value) })}
            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <option value="7">{wizardCopy.retentionOptions["7"]}</option>
            <option value="30">{wizardCopy.retentionOptions["30"]}</option>
            <option value="90">{wizardCopy.retentionOptions["90"]}</option>
            <option value="180">{wizardCopy.retentionOptions["180"]}</option>
          </select>
          <FieldHint>{wizardCopy.retentionDaysHint}</FieldHint>
        </div>

        <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={state.piiMasking}
              onChange={(event) => updateState({ piiMasking: event.target.checked })}
              className="mt-0.5 size-4 accent-primary"
            />
            <span>
              <span className="block text-sm font-medium">{wizardCopy.piiMaskingTitle}</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                {wizardCopy.piiMaskingDescription}
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={state.morningBrief}
              onChange={(event) => updateState({ morningBrief: event.target.checked })}
              className="mt-0.5 size-4 accent-primary"
            />
            <span>
              <span className="block text-sm font-medium">{wizardCopy.morningBriefTitle}</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                {wizardCopy.morningBriefDescription}
              </span>
            </span>
          </label>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3">
        <LockKeyholeIcon className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-foreground">{wizardCopy.publicOutputTitle}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {wizardCopy.publicOutputDescription}
          </p>
        </div>
      </div>
    </div>
  )
}

function ReviewStep({
  provider,
  state,
  scopes,
  testStatus,
  onTest,
  updateState,
}: {
  provider: ProviderDefinition
  state: WizardState
  scopes: MockScope[]
  testStatus: "idle" | "passed"
  onTest: () => void
  updateState: (patch: Partial<WizardState>) => void
}) {
  const wizardCopy = useSourceConnectionWizardCopy()
  const moduleOptions = moduleOptionsFor(wizardCopy)
  const Icon = provider.icon

  return (
    <div className="space-y-5">
      <SectionHeading
        icon={FileTextIcon}
        title={wizardCopy.reviewTitle}
        description={interpolateCopy(wizardCopy.reviewDescriptionTemplate, {
          count: scopes.length,
        })}
      />

      <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
        <div className="flex items-center gap-3">
          <span className={cn("flex size-9 items-center justify-center rounded-lg", provider.accent)}>
            <Icon className="size-4.5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{provider.label}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {accountLabelFor(state, provider, wizardCopy)}
            </p>
          </div>
          <Badge variant="outline">
            {interpolateCopy(wizardCopy.draftCountTemplate, { count: scopes.length })}
          </Badge>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="connection-name-prefix">
          {scopes.length > 1
            ? wizardCopy.namePrefixLabel
            : wizardCopy.connectionNameLabel}
        </Label>
        <Input
          id="connection-name-prefix"
          value={state.namePrefix}
          onChange={(event) => updateState({ namePrefix: event.target.value })}
          placeholder={
            scopes.length > 1
              ? interpolateCopy(wizardCopy.namePrefixPlaceholderTemplate, {
                  provider: provider.shortLabel,
                })
              : `${provider.shortLabel} · ${scopes[0]?.label ?? wizardCopy.sourceFallbackLabel}`
          }
        />
        <FieldHint>
          {scopes.length > 1
            ? wizardCopy.namePrefixHint
            : wizardCopy.connectionNameHint}
        </FieldHint>
      </div>

      <dl className="grid overflow-hidden rounded-xl border border-border/70 sm:grid-cols-2">
        <ReviewItem icon={FolderIcon} label={wizardCopy.reviewItems.scope}>
          <div className="space-y-1">
            {scopes.map((scope) => (
              <p key={scope.id} className="break-words">{scope.label}</p>
            ))}
          </div>
        </ReviewItem>
        <ReviewItem icon={Clock3Icon} label={wizardCopy.reviewItems.sync}>
          {syncModeLabel(state.syncMode, provider, wizardCopy)}
          {state.syncMode === "scheduled"
            ? ` · ${schedulePresetLabel(state.syncCadence, wizardCopy)}`
            : ""}
          <br />
          {wizardCopy.analysisSummary[state.analysisMode]}
        </ReviewItem>
        <ReviewItem icon={RouteIcon} label={wizardCopy.reviewItems.routing}>
          {moduleOptions.find((module) => module.id === state.targetModule)?.label ?? state.targetModule}
          <br />
          {wizardCopy.approvalRuleOptions[state.approvalRule]}
        </ReviewItem>
        <ReviewItem icon={DatabaseIcon} label={wizardCopy.reviewItems.privacy}>
          {riskLabel(state.riskLevel, wizardCopy)} ·{" "}
          {interpolateCopy(wizardCopy.daysTemplate, { days: state.retentionDays })}
          <br />
          {state.piiMasking ? wizardCopy.piiEnabled : wizardCopy.piiDisabled}
        </ReviewItem>
      </dl>

      <div className="rounded-xl border border-border/70 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{wizardCopy.mockCheckTitle}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {wizardCopy.mockCheckDescription}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={onTest}>
            <Settings2Icon data-icon="inline-start" />
            {wizardCopy.mockCheckButton}
          </Button>
        </div>
        <div className="mt-3" aria-live="polite">
          {testStatus === "passed" ? (
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-xs leading-5 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
              <CheckCircle2Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {wizardCopy.mockCheckPassed}
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
              <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {wizardCopy.mockCheckIdle}
            </div>
          )}
        </div>
      </div>

      <ProviderBoundaryNotice>
        {interpolateCopy(wizardCopy.reviewBoundaryTemplate, {
          runtime: provider.runtimeLabel,
        })}
      </ProviderBoundaryNotice>
    </div>
  )
}

function ReviewItem({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-border/70 p-4 last:border-b-0 sm:border-r sm:[&:nth-last-child(-n+2)]:border-b-0 sm:[&:nth-child(2n)]:border-r-0">
      <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-2 text-sm leading-6 text-foreground">{children}</dd>
    </div>
  )
}

function WizardFooter({
  step,
  stepCount,
  valid,
  provider,
  scopeCount,
  onBack,
  onNext,
  onClose,
  onCreate,
}: {
  step: number
  stepCount: number
  valid: boolean
  provider: ProviderDefinition | null
  scopeCount: number
  onBack: () => void
  onNext: () => void
  onClose: () => void
  onCreate: () => void
}) {
  const wizardCopy = useSourceConnectionWizardCopy()

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-t bg-background px-4 py-3 sm:px-6">
      <div>
        {step === 1 ? (
          <Button type="button" variant="ghost" onClick={onClose}>{wizardCopy.footerCancel}</Button>
        ) : (
          <Button type="button" variant="outline" onClick={onBack}>
            <ChevronLeftIcon data-icon="inline-start" />
            {wizardCopy.footerBack}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {step < stepCount ? (
          <Button type="button" onClick={onNext} disabled={!valid}>
            {wizardCopy.footerNext}
            <ChevronRightIcon data-icon="inline-end" />
          </Button>
        ) : (
          <Button type="button" onClick={onCreate} disabled={!provider || scopeCount === 0}>
            <PlusIcon data-icon="inline-start" />
            {scopeCount > 1
              ? interpolateCopy(wizardCopy.footerSaveMultipleDrafts, { count: scopeCount })
              : wizardCopy.footerSaveDraft}
          </Button>
        )}
      </div>
    </div>
  )
}

function ManifestUnavailableState({
  errors,
  onClose,
}: {
  errors: readonly string[]
  onClose: () => void
}) {
  const wizardCopy = useSourceConnectionWizardCopy()

  return (
    <div className="flex min-h-[420px] flex-col">
      <DialogHeader className="border-b px-5 py-4 pr-12 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <DialogTitle>{wizardCopy.manifestUnavailableTitle}</DialogTitle>
          <Badge variant="destructive">Manifest unavailable</Badge>
        </div>
        <DialogDescription>
          {wizardCopy.manifestUnavailableDescription}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-lg rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangleIcon className="size-5" aria-hidden="true" />
          </div>
          <h2 className="mt-4 font-heading text-base font-semibold text-foreground">
            {wizardCopy.manifestUnavailableCardTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {wizardCopy.manifestUnavailableCardDescription}
          </p>
          {errors.length > 0 ? (
            <div className="mt-4 rounded-lg border border-border/70 bg-background px-3 py-2.5 text-left">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Validation signals
              </p>
              <ul className="mt-2 space-y-1 font-mono text-[11px] text-muted-foreground">
                {errors.slice(0, 5).map((error) => (
                  <li key={error}>• {error}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <Button type="button" className="mt-5" onClick={onClose}>
            {wizardCopy.close}
          </Button>
        </div>
      </div>
    </div>
  )
}

function SuccessState({
  drafts,
  onClose,
  onAddAnother,
}: {
  drafts: SourceConnectionDraft[]
  onClose: () => void
  onAddAnother: () => void
}) {
  const wizardCopy = useSourceConnectionWizardCopy()

  return (
    <div className="flex min-h-[500px] flex-col">
      <DialogHeader className="sr-only">
        <DialogTitle>{wizardCopy.successTitle}</DialogTitle>
        <DialogDescription>{wizardCopy.successDescription}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-1 items-center justify-center overflow-y-auto px-5 py-10">
        <div className="w-full max-w-xl text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2Icon className="size-6" aria-hidden="true" />
          </div>
          <Badge variant="outline" className="mt-4 border-amber-300/70 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            {wizardCopy.badge}
          </Badge>
          <h2 className="mt-3 font-heading text-xl font-semibold tracking-tight text-foreground">
            {interpolateCopy(wizardCopy.successHeadingTemplate, { count: drafts.length })}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {wizardCopy.successBody}
          </p>

          <div className="mt-6 space-y-2 text-left">
            {drafts.map((draft) => (
              <div key={draft.id} className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/20 p-3">
                <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground ring-1 ring-border/70">
                  <FileTextIcon className="size-3.5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{draft.displayName}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {draft.accountLabel} · {draft.scopeLabel}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px]">Draft</Badge>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col-reverse justify-center gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={onAddAnother}>
              <PlusIcon data-icon="inline-start" />
              {wizardCopy.addAnother}
            </Button>
            <Button type="button" onClick={onClose}>{wizardCopy.done}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
