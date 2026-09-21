"use client"

import type * as React from "react"
import { LockIcon } from "lucide-react"

import { AppHeader } from "@/components/layout/app-header"
import { ModuleGuard } from "@/components/layout/module-guard"
import { DetailDrawer } from "@/components/owneros/detail-drawer"
import { InsightRail } from "@/components/owneros/insight-rail"
import { useIsDemoAccount } from "@/lib/context/demo-account-context"
import { CompanyThemeScope } from "@/components/company/company-theme-scope"
import { CompanyThemeSwitcher } from "@/components/company/theme-switcher"

type CompanyLane = "私人思考" | "正式知識" | "政策" | "合約"
type CompanyRisk = "high" | "medium" | "low"

interface CompanyRecord {
  id: string
  title: string
  lane: CompanyLane
  visibility: string
  state: string
  priority: string
  due: string
  risk: CompanyRisk
  summary: string
  nextAction: string
  tags: string[]
}

interface CompanyReadinessRow {
  label: string
  state: string
  detail: string
}

interface CompanyBoundaryRow {
  label: string
  value: string
  locked: boolean
}

const exampleCompanyRecords: CompanyRecord[] = [
  {
    id: "company-001",
    title: "Q3 Personal OS 定位決策",
    lane: "私人思考",
    visibility: "僅 owner",
    state: "審核中",
    priority: "P0",
    due: "今天",
    risk: "high",
    summary:
      "在任何內容成為正式公司知識前，先把可銷售敘事、產品承諾與敏感定位留在私人策略 lane。",
    nextAction:
      "決定第一個商業敘事要聚焦私人 OS、客戶交付 cockpit，或創辦人作業系統。",
    tags: ["strategy", "positioning", "private"],
  },
  {
    id: "company-002",
    title: "正式知識升級規則",
    lane: "正式知識",
    visibility: "待核准",
    state: "待升級",
    priority: "P0",
    due: "本週",
    risk: "high",
    summary:
      "在私人策略、來源綜合或 AI 結論升級成正式公司知識前，先定義人工核准路徑。",
    nextAction: "正式寫入前，先回答公司發布權限與核准責任。",
    tags: ["publication", "approval", "knowledge"],
  },
  {
    id: "company-003",
    title: "客戶可見材料政策",
    lane: "政策",
    visibility: "內部",
    state: "公開輸出關閉",
    priority: "P0",
    due: "本週",
    risk: "high",
    summary:
      "公司策略、合約語句與內部決策預設僅內部可見；沒有明確核准前，不進入客戶可見區。",
    nextAction: "政策未定前，Client Portal 與公開輸出維持 fail-closed。",
    tags: ["public-output", "client-portal", "policy"],
  },
  {
    id: "company-004",
    title: "雲端合約續約檢查",
    lane: "合約",
    visibility: "owner/internal",
    state: "人工檢查",
    priority: "P1",
    due: "30 天",
    risk: "medium",
    summary:
      "追蹤會影響部署成本、客戶交付與營運風險的續約決策，但不把財務寫入混進公司策略頁。",
    nextAction: "進入財務任務前，先檢查續約條款、預算上限與部署證明影響。",
    tags: ["contract", "renewal", "ops"],
  },
]

const readinessRows: CompanyReadinessRow[] = [
  {
    label: "公司發布權限",
    state: "需 owner 決策",
    detail: "正式知識寫入或發布 runtime 前，仍需明確定義 owner 核准責任。",
  },
  {
    label: "正式資料路徑",
    state: "尚未接上",
    detail: "此頁目前是原型操作面，不新增 route handler、Server Action、DB 讀取或寫入。",
  },
  {
    label: "登入與身份",
    state: "待正式檢查",
    detail: "正式 owner 使用前仍需要登入狀態與 Profile 對應證據。",
  },
  {
    label: "部署後檢查",
    state: "待完成",
    detail: "部署後私有路由檢查與此本機 UI 收斂切片分開處理。",
  },
]

const boundaryRows: CompanyBoundaryRow[] = [
  { label: "不公開輸出", value: "Client Portal 與公開路由維持排除", locked: true },
  { label: "不自動發布", value: "正式知識升級仍需人工核准", locked: true },
  { label: "不做高風險寫入", value: "策略與合約變更維持審核模式", locked: true },
  { label: "不讓外部讀 DB", value: "外部 agent 不取得公司資料庫存取權", locked: true },
  { label: "對外登錄關閉", value: "僅作內部提案工作面", locked: true },
]

const exampleAuditRows = [
  { time: "今天", actor: "Owner", action: "開啟公司策略工作台", result: "原型狀態" },
  { time: "今天", actor: "System", action: "維持公司發布鎖定", result: "不公開輸出" },
  { time: "本週", actor: "Company AI", action: "建議 lane 分離", result: "僅提案" },
]

// 佈景主題共用：顏色一律走 company-tone token，不再寫死 Tailwind 色階。
const laneTone: Record<CompanyLane, string> = {
  私人思考: "company-tone company-tone-a",
  正式知識: "company-tone company-tone-b",
  政策: "company-tone company-tone-c",
  合約: "company-tone company-tone-d",
}

const riskTone: Record<CompanyRisk, string> = {
  high: "company-tone company-tone-danger",
  medium: "company-tone company-tone-warn",
  low: "company-tone company-tone-ok",
}

function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex min-h-7 items-center rounded-md border px-2.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  )
}

export default function CompanyPage() {
  // AUTH-013: the illustrative strategy/lane rows and their audit trail are
  // demo-account-only content. Every other signed-in account starts blank.
  // readinessRows/boundaryRows describe the module's real implementation
  // status and safety boundaries, so those stay unconditional.
  const isDemoAccount = useIsDemoAccount()
  const companyRecords = isDemoAccount ? exampleCompanyRecords : []
  const auditRows = isDemoAccount ? exampleAuditRows : []
  const primaryRecord = companyRecords[0]

  return (
    <ModuleGuard moduleKey="company">
      <CompanyThemeScope className="flex h-full flex-col overflow-hidden">
        <AppHeader title="公司" description="分離私人思考、正式知識、政策與合約，正式發布維持人工核准。" />
        <main className="flex-1 overflow-y-auto">
          <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 lg:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <InsightRail
                items={[
                  { label: "公司項目", value: companyRecords.length },
                  { label: "高風險", value: companyRecords.filter((r) => r.risk === "high").length, tone: "warn" },
                  { label: "P0", value: companyRecords.filter((r) => r.priority === "P0").length },
                ]}
                className="flex-1"
              />
              <CompanyThemeSwitcher />
              <DetailDrawer title="公司狀態與邊界" wide>
                <div className="space-y-5">
                  {primaryRecord && (
                    <div>
                      <p className="text-xs font-semibold">目前優先</p>
                      <div className="mt-2 rounded-md border p-3">
                        <Pill className={laneTone[primaryRecord.lane]}>{primaryRecord.lane}</Pill>
                        <p className="mt-2 text-sm font-semibold text-foreground">{primaryRecord.title}</p>
                        <p className="mt-2 text-xs leading-6 text-muted-foreground">
                          <span className="font-medium text-foreground">下一步：</span>
                          {primaryRecord.nextAction}
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold">設定檢查</p>
                    <div className="mt-2 grid gap-2">
                      {readinessRows.map((row) => (
                        <div key={row.label} className="rounded-md border p-2.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-foreground">{row.label}</span>
                            <Pill className="company-tone company-tone-warn">{row.state}</Pill>
                          </div>
                          <p className="mt-1.5 leading-5 text-muted-foreground">{row.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold">公司 AI 提案</p>
                    <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
                      公司 AI 可以摘要 lane 並建議升級封包，但不能發布私人策略、寫入正式知識或對外分享脈絡；僅在 owner 明確核准後升級。
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold">邊界</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {boundaryRows.map((row) => (
                        <div key={row.label} className="flex items-center gap-2 rounded-md border p-2.5 text-xs">
                          <LockIcon className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="font-medium text-foreground">{row.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold">紀錄 / 稽核</p>
                    <div className="mt-2 grid gap-1.5">
                      {auditRows.map((row) => (
                        <div
                          key={`${row.time}-${row.action}`}
                          className="grid gap-1 text-xs sm:grid-cols-[70px_80px_1fr_100px]"
                        >
                          <span className="text-muted-foreground">{row.time}</span>
                          <span className="font-medium">{row.actor}</span>
                          <span className="text-foreground">{row.action}</span>
                          <span className="text-muted-foreground">{row.result}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </DetailDrawer>
            </div>

            <div>
              <section
                id="company-lanes"
                className="rounded-lg border bg-background p-4"
                data-owneros-slot="resource-index company-lanes"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">公司 Lane</h2>
                    <p className="text-sm text-muted-foreground">
                      私人思考與正式知識在核准前保持分離。
                    </p>
                  </div>
                  <Pill className="company-tone company-tone-d">{companyRecords.length} 筆</Pill>
                </div>

                <div className="mt-4 divide-y rounded-md border">
                  {companyRecords.map((record) => (
                    <article key={record.id} className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_150px]">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill className={laneTone[record.lane]}>{record.lane}</Pill>
                          <Pill className={riskTone[record.risk]}>{record.risk === "high" ? "高" : record.risk === "medium" ? "中" : "低"}風險</Pill>
                          <span className="text-xs text-muted-foreground">{record.visibility}</span>
                        </div>
                        <h3 className="mt-2 text-sm font-semibold text-foreground">{record.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{record.summary}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {record.tags.map((tag) => (
                            <span key={tag} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-row justify-between gap-3 text-xs md:flex-col md:items-end">
                        <span className="font-medium text-foreground">{record.priority}</span>
                        <span className="text-muted-foreground">{record.state}</span>
                        <span className="text-muted-foreground">{record.due}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </section>
        </main>
      </CompanyThemeScope>
    </ModuleGuard>
  )
}
