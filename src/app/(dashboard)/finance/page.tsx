"use client"

import { WalletIcon } from "lucide-react"
import { AppHeader } from "@/components/layout/app-header"
import { ModuleGuard } from "@/components/layout/module-guard"
import {
  ModuleOperatingShell,
  type ModuleAgentProposal,
  type ModuleAuditRow,
  type ModuleOperatingRecord,
  type ModuleSettingRow,
} from "@/components/layout/module-operating-shell"

const financeRecords: ModuleOperatingRecord[] = [
  {
    id: "finance-001",
    title: "Lisa 六月顧問費入帳確認",
    subtitle: "收入草稿 · 需人工確認後才能入帳",
    status: "active",
    priority: "P0",
    owner: "Owner",
    due: "今天",
    risk: "high",
    description:
      "根據 Work deliverable 與發票狀態推論的收入草稿。此列只作為操作介面 rehearsal，不代表已寫入財務帳本。",
    nextAction: "核對發票號碼、收款帳戶與實際入帳日期，確認後再進入正式 FinanceDraftEntry。",
    tags: ["income", "invoice", "manual-review"],
    fields: [
      { label: "預估金額", value: "TWD 120,000" },
      { label: "來源", value: "Work / Lisa Q3 reporting" },
      { label: "寫入邊界", value: "human confirm only" },
    ],
  },
  {
    id: "finance-002",
    title: "雲端工具月費分類",
    subtitle: "支出草稿 · Vercel / Supabase / OpenAI",
    status: "review",
    priority: "P1",
    owner: "Owner",
    due: "週五",
    risk: "medium",
    description:
      "把開發與 AI 服務月費集中成待分類支出，方便後續做現金流與專案成本觀察。",
    nextAction: "確認每筆支出屬於個人研發、客戶專案或公司營運，再決定是否歸檔。",
    tags: ["expense", "cloud", "ai-cost"],
    fields: [
      { label: "預估金額", value: "TWD 9,800" },
      { label: "分類候選", value: "R&D / Client ops / Company" },
      { label: "資料狀態", value: "prototype row" },
    ],
  },
  {
    id: "finance-003",
    title: "六月現金流安全線檢查",
    subtitle: "月度 owner review",
    status: "blocked",
    priority: "P0",
    owner: "Owner",
    due: "待真實帳本",
    risk: "high",
    description:
      "介面先提供安全線檢查位置；正式結果需要真實收入、支出、應收款與已確認餘額。",
    nextAction: "完成 FinanceDraftEntry schema 與人工確認流程後，再接正式現金流計算。",
    tags: ["cashflow", "blocked", "proof"],
    fields: [
      { label: "目標安全線", value: "3 個月固定支出" },
      { label: "阻塞", value: "Finance persistence not selected" },
      { label: "替代證據", value: "manual review checklist" },
    ],
  },
  {
    id: "finance-004",
    title: "五月雜支封存",
    subtitle: "完成狀態範例",
    status: "done",
    priority: "P2",
    owner: "Owner",
    due: "已完成",
    risk: "low",
    description: "示範已完成列如何在操作面呈現，避免財務模組只有空白或警示。",
    nextAction: "無下一步；正式版需由審計紀錄保留確認來源。",
    tags: ["archive", "monthly-review"],
    fields: [
      { label: "狀態", value: "closed example" },
      { label: "持久化", value: "not persisted" },
      { label: "審計", value: "local UI only" },
    ],
  },
]

const financeProposals: ModuleAgentProposal[] = [
  {
    id: "finance-proposal-001",
    title: "把收入與雲端成本分成兩個 review lane",
    summary:
      "收入列要優先核對收款與發票，支出列則先用用途分類；兩者都不能由 Agent 自動確認。",
    confidence: 86,
    risk: "medium",
    proposedAction: "將 finance-001 標為收入確認，finance-002 標為成本分類",
  },
  {
    id: "finance-proposal-002",
    title: "建立現金流安全線的人工檢查清單",
    summary:
      "在真實帳本前先用人工檢查項目定義安全線所需欄位，避免後續 schema 少掉必要證據。",
    confidence: 79,
    risk: "low",
    proposedAction: "新增一筆本機草稿，列出收入、固定支出、應收款與備用金欄位",
  },
]

const financeAuditRows: ModuleAuditRow[] = [
  {
    id: "finance-audit-001",
    time: "今天 10:20",
    actor: "Owner",
    action: "開啟 Finance draft review",
    result: "高風險資料維持 no-write prototype",
    tone: "warn",
  },
  {
    id: "finance-audit-002",
    time: "昨天 18:05",
    actor: "Agent",
    action: "提出雲端成本分類建議",
    result: "等待 owner 本機批准或拒絕",
    tone: "neutral",
  },
  {
    id: "finance-audit-003",
    time: "本週",
    actor: "System",
    action: "阻擋自動入帳",
    result: "human confirm only",
    tone: "good",
  },
]

const financeSettings: ModuleSettingRow[] = [
  {
    id: "drafts",
    label: "允許本機財務草稿",
    description: "可新增與整理草稿，但不會寫入正式帳本。",
    enabled: true,
  },
  {
    id: "agent-aggregate",
    label: "Agent 只可讀取彙總訊號",
    description: "Agent 不可讀取原始憑證、帳戶細節或完整交易明細。",
    enabled: true,
  },
  {
    id: "auto-confirm",
    label: "自動確認入帳",
    description: "財務寫入必須人工確認，正式版也維持關閉。",
    enabled: false,
    locked: true,
  },
  {
    id: "client-visible",
    label: "對 Client Portal 顯示",
    description: "財務資料不得對外部 portal 顯示。",
    enabled: false,
    locked: true,
  },
]

export default function FinancePage() {
  return (
    <ModuleGuard moduleKey="finance">
      <div className="flex flex-col h-full overflow-hidden">
        <AppHeader title="財務" description="收支記錄與現金流" />
        <main className="flex-1 overflow-y-auto">
          <ModuleOperatingShell
            icon={WalletIcon}
            operationLabel="收支記錄"
            operationDescription="收入、支出、發票與現金流追蹤"
            overviewItems={[
              { label: "本月現金流", placeholder: "預估淨流 +TWD 110,200；正式金額需人工確認後才可信。" },
              { label: "待確認交易", placeholder: "2 筆需要 owner review：Lisa 入帳、雲端工具月費。" },
              { label: "發票追蹤", placeholder: "1 筆收入草稿等待核對發票號碼與收款日期。" },
            ]}
            operationPlaceholder="介面已可操作收入、支出、現金流與人工確認流程；目前只更新本機狀態。"
            records={financeRecords}
            agentProposals={financeProposals}
            auditRows={financeAuditRows}
            settings={financeSettings}
            highRisk
            highRiskNote="財務資料為高風險模組。所有新增、修改、刪除均需人工確認。Agent 僅可分析與提案，不可自動寫入。"
            privacyNote="財務資料僅限本人存取，不對 Client Portal、Research 或其他模組公開。Agent 不可讀取原始財務憑證。"
          />
        </main>
      </div>
    </ModuleGuard>
  )
}
