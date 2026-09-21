"use client"

import Link from "next/link"
import { CheckCircle2Icon, LockIcon, SettingsIcon, SparklesIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ControlPlaneShell } from "@/components/owneros/control-plane-shell"
import { settingsNavItems } from "@/components/owneros/control-plane-nav"
import { useProductLanguage } from "@/lib/context/product-language-context"
import type { ProductLocale } from "@/lib/i18n/product-copy"
import type { ModulePermissionSnapshot } from "@/types/module-permission"
import { CompanyAppearanceSettings } from "@/components/company/appearance-settings"
import { SettingsClient } from "./settings-client"

type SettingsTone = "good" | "warn" | "blocked" | "neutral"

export interface SettingsHubModel {
  authMode: string
  authStatus: string
  authTone: SettingsTone
  email: string
  role: string
  workProjects: string
  enabledModuleCount: number
  disabledModuleCount: number
  enabledModulePreview: string
  modulePermissionSource: string
  sourceConnectionSummary: string
  sourceConnectionTone: SettingsTone
  agentManifestCount: number
  sourceAgentCount: number
  manualOpsCount: number
  primaryOwnerAction: string
  authBoundaryStatus: string
  proofHandoff: string
}

const settingsCopy = {
  "zh-TW": {
    title: "Personal Settings",
    description: "管理個人身份、系統偏好與私密模組設定 (如 Life, Finance)。",
    eyebrow: "Personal control",
    state: "安全模式",
    heading: "個人設定控制台",
    body: "這裡管理您的個人帳號、授權狀態及專屬於您的私密模組。團隊與組織的設定請前往 Workspace/Org。",
    primaryAction: "系統就緒",
    secondaryAction: "AI 治理",
    metrics: {
      account: "帳號",
      modules: "模組",
      manualOps: "人工設定",
      mode: "模式",
    },
    contextTitle: "個人狀態",
    about: "安全邊界",
    contextRows: {
      email: "Email",
      role: "Global Role",
      workProjects: "工作專案",
      moduleSource: "模組來源",
      sourceConnections: "來源連接",
      agentBoundary: "Agent 邊界",
      proofHandoff: "Proof handoff",
    },
    agentBoundaryTemplate: "{count}/{total} 份 manifest 就緒；對外登錄關閉。",
    boundaries: [
      ["生活與財務隔離", "Life 與 Finance 模組嚴格限定於個人 (PERSONAL) Workspace 使用，團隊無權存取。"],
      ["不啟用 provider", "LINE、Gmail、Drive、AI provider 仍保持 setup/readiness 狀態。"],
      ["不做公開輸出", "Core AI 只能整理與提案；外部傳送與 public output 需要明確核准。"],
    ],
    moduleTitle: "個人模組狀態",
    appearanceTitle: "佈景主題",
  },
  "en-US": {
    title: "Personal Settings",
    description: "Manage personal identity, system preferences, and private modules (e.g. Life, Finance).",
    eyebrow: "Personal control",
    state: "Safe mode",
    heading: "Personal settings console",
    body: "Manage your account, auth state, and private modules here. For team configurations, use Workspace/Org settings.",
    primaryAction: "System readiness",
    secondaryAction: "AI governance",
    metrics: {
      account: "Account",
      modules: "Modules",
      manualOps: "Manual setup",
      mode: "Mode",
    },
    contextTitle: "Personal state",
    about: "Safety boundaries",
    contextRows: {
      email: "Email",
      role: "Global Role",
      workProjects: "Work projects",
      moduleSource: "Module source",
      sourceConnections: "Source connections",
      agentBoundary: "Agent boundary",
      proofHandoff: "Proof handoff",
    },
    agentBoundaryTemplate: "{count}/{total} manifests ready; external registration is off.",
    boundaries: [
      ["Life & Finance Isolated", "Life and Finance modules are strictly locked to PERSONAL workspaces. Teams cannot access them."],
      ["No provider activation", "LINE, Gmail, Drive, and AI providers stay in setup/readiness mode."],
      ["No public output", "Core AI can summarize and propose; external sending and public output need explicit approval."],
    ],
    moduleTitle: "Personal module state",
    appearanceTitle: "Appearance",
  },
} satisfies Record<ProductLocale, Record<string, unknown>>

function toneVariant(tone: SettingsTone) {
  if (tone === "good") return "secondary" as const
  if (tone === "blocked") return "destructive" as const
  return "outline" as const
}

export function SettingsHubClient({
  model,
  permissionSnapshot,
}: {
  model: SettingsHubModel
  permissionSnapshot: ModulePermissionSnapshot
}) {
  const { locale } = useProductLanguage()
  const copy = settingsCopy[locale]

  const contextRows = [
    [copy.contextRows.email, model.email],
    [copy.contextRows.role, model.role],
    [copy.contextRows.workProjects, model.workProjects],
    [copy.contextRows.moduleSource, model.modulePermissionSource],
    [copy.contextRows.sourceConnections, model.sourceConnectionSummary],
    [
      copy.contextRows.agentBoundary,
      String(copy.agentBoundaryTemplate)
        .replace("{count}", String(model.agentManifestCount))
        .replace("{total}", String(model.sourceAgentCount)),
    ],
    [copy.contextRows.proofHandoff, model.proofHandoff],
  ]

  return (
    <ControlPlaneShell
      title={copy.title}
      description={copy.description}
      eyebrow={copy.eyebrow}
      stateLabel={copy.state}
      stateTone="neutral"
      navItems={settingsNavItems}
      activeHref="/settings"
      aboutTitle={copy.about}
      aboutContent={
        <div className="grid gap-3">
          {copy.boundaries.map(([label, body]) => (
            <div key={label} className="flex items-start gap-2">
              <LockIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-foreground">{label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      }
      actions={
        <>
          <Button variant="outline" size="sm" render={<Link href="/admin/ai-governance" />}>
            <SparklesIcon className="size-3.5" />
            {copy.secondaryAction}
          </Button>
          <Button size="sm" render={<Link href="/admin/system-readiness" />}>
            <SettingsIcon className="size-3.5" />
            {copy.primaryAction}
          </Button>
        </>
      }
    >
      <section className="grid overflow-hidden rounded-lg border bg-background sm:grid-cols-4">
        {[
          [copy.metrics.account, model.authStatus, model.authTone],
          [copy.metrics.modules, `${model.enabledModuleCount}/${model.enabledModuleCount + model.disabledModuleCount}`, "neutral"],
          [copy.metrics.manualOps, `${model.manualOpsCount}`, model.manualOpsCount > 0 ? "warn" : "good"],
          [copy.metrics.mode, model.authMode, "neutral"],
        ].map(([label, value, tone]) => (
          <div key={label} className="border-b px-3 py-2.5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
              <Badge variant={toneVariant(tone as SettingsTone)} className="text-[10px]">
                {tone === "good" ? <CheckCircle2Icon className="size-3" /> : <LockIcon className="size-3" />}
              </Badge>
            </div>
            <p className="mt-1 truncate text-sm font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border bg-background">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">{copy.contextTitle}</h2>
        </div>
        <dl className="grid gap-x-6 gap-y-2 p-4 text-sm sm:grid-cols-2">
          {contextRows.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[11px] text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 truncate font-medium" title={value}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-lg border bg-background">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">{copy.appearanceTitle}</h2>
        </div>
        <CompanyAppearanceSettings />
      </section>

      <section className="rounded-lg border bg-background">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">{copy.moduleTitle}</h2>
        </div>
        <SettingsClient permissionSnapshot={permissionSnapshot} />
      </section>
    </ControlPlaneShell>
  )
}
