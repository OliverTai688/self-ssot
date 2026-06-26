"use client"

import { BuildingIcon } from "lucide-react"
import { AppHeader } from "@/components/layout/app-header"
import { ModuleGuard } from "@/components/layout/module-guard"
import {
  ModuleOperatingShell,
  type ModuleAgentProposal,
  type ModuleAuditRow,
  type ModuleOperatingRecord,
  type ModuleSettingRow,
} from "@/components/layout/module-operating-shell"

const companyRecords: ModuleOperatingRecord[] = [
  {
    id: "company-001",
    title: "Q3 Personal OS 定位決策",
    subtitle: "策略文件 · owner-only",
    status: "active",
    priority: "P0",
    owner: "Owner",
    due: "今天",
    risk: "high",
    description:
      "公司策略模組先把高層決策、產品定位與不可外流資訊放在受控操作面，避免混入 Work 或 Client Portal。",
    nextAction: "確認 Q3 的第一個可銷售版本是否以 private OS / client deliverable cockpit 作為主敘事。",
    tags: ["strategy", "positioning", "owner-only"],
    fields: [
      { label: "保密層級", value: "owner_only" },
      { label: "決策狀態", value: "active review" },
      { label: "外部分享", value: "locked" },
    ],
  },
  {
    id: "company-002",
    title: "Cloud contract renewal review",
    subtitle: "合約追蹤 · 30 天內需決策",
    status: "review",
    priority: "P1",
    owner: "Owner",
    due: "本週",
    risk: "medium",
    description:
      "把與營運成本、部署、客戶交付相關的合約與續約決策集中，後續可接 Finance 成本與 Work 專案。",
    nextAction: "確認續約條款、成本上限與是否影響上線 proof。",
    tags: ["contract", "renewal", "ops"],
    fields: [
      { label: "到期窗口", value: "30 days" },
      { label: "關聯模組", value: "Finance / Work" },
      { label: "狀態", value: "manual review" },
    ],
  },
  {
    id: "company-003",
    title: "Client-visible material policy",
    subtitle: "SOP · public output gate",
    status: "active",
    priority: "P0",
    owner: "Owner",
    due: "本週",
    risk: "high",
    description:
      "定義哪些公司資料、案例、策略內容可以被輸出到 Client Portal 或簡報，預設全部不公開。",
    nextAction: "把可公開欄位與人工審核流程寫成 SOP，再接 Client Portal BFF。",
    tags: ["sop", "public-output", "client-portal"],
    fields: [
      { label: "預設", value: "internal" },
      { label: "公開條件", value: "client_visible + approval" },
      { label: "Agent", value: "summary-only" },
    ],
  },
  {
    id: "company-004",
    title: "Board-only strategy sharing policy",
    subtitle: "策略邊界 · 暫停外部協作",
    status: "blocked",
    priority: "P0",
    owner: "Owner",
    due: "待人工策略",
    risk: "high",
    description:
      "board_only 與 owner_only 資料不得被外部 agent、client portal 或研究模組讀取。",
    nextAction: "建立正式 confidential level policy 與審計要求。",
    tags: ["confidential", "blocked", "agent-boundary"],
    fields: [
      { label: "阻塞", value: "confidential policy" },
      { label: "對外", value: "disabled" },
      { label: "審計", value: "required before writes" },
    ],
  },
]

const companyProposals: ModuleAgentProposal[] = [
  {
    id: "company-proposal-001",
    title: "把策略文件切成 decision / contract / SOP 三種 lane",
    summary:
      "這三類物件需要不同保密與審核規則；先在 UI 中分 lane，後續 schema 才不會混成普通 note。",
    confidence: 88,
    risk: "medium",
    proposedAction: "保留三種 record 類型，新增正式 schema 時沿用 lane 概念",
  },
  {
    id: "company-proposal-002",
    title: "Client-visible policy 先從否定清單開始",
    summary:
      "所有 company strategy 預設 internal，只有明確標記 client_visible 並經人工核准才可輸出。",
    confidence: 91,
    risk: "low",
    proposedAction: "在設定中鎖定外部分享，直到 public-output BFF 完成",
  },
]

const companyAuditRows: ModuleAuditRow[] = [
  {
    id: "company-audit-001",
    time: "今天 12:10",
    actor: "Owner",
    action: "檢視 Q3 定位決策",
    result: "owner-only prototype",
    tone: "warn",
  },
  {
    id: "company-audit-002",
    time: "昨天 20:45",
    actor: "Agent",
    action: "提出 SOP 邊界建議",
    result: "未寫入正式文件",
    tone: "neutral",
  },
  {
    id: "company-audit-003",
    time: "本週",
    actor: "System",
    action: "鎖定外部分享",
    result: "Client Portal exclusion active",
    tone: "good",
  },
]

const companySettings: ModuleSettingRow[] = [
  {
    id: "strategy-lanes",
    label: "顯示 decision / contract / SOP lanes",
    description: "用操作分類協助 owner 掃描公司資料，而不是混成普通筆記。",
    enabled: true,
  },
  {
    id: "agent-summary",
    label: "Agent 可產生內部摘要",
    description: "Agent 只能在 owner-only 介面產生摘要與提案，不可對外發布。",
    enabled: true,
  },
  {
    id: "client-visible",
    label: "允許 Client Portal 讀取",
    description: "公司策略資料預設全部不可對外，需正式 public-output policy。",
    enabled: false,
    locked: true,
  },
  {
    id: "external-agent",
    label: "允許外部 Agent 協作",
    description: "外部 agent 不得存取公司策略資料。",
    enabled: false,
    locked: true,
  },
]

export default function CompanyPage() {
  return (
    <ModuleGuard moduleKey="company">
      <div className="flex flex-col h-full overflow-hidden">
        <AppHeader title="公司" description="公司營運與策略管理" />
        <main className="flex-1 overflow-y-auto">
          <ModuleOperatingShell
            icon={BuildingIcon}
            operationLabel="策略文件"
            operationDescription="公司策略、合約與內部 SOP"
            overviewItems={[
              { label: "關鍵決策", placeholder: "Q3 Personal OS 定位決策正在 active review。" },
              { label: "合約追蹤", placeholder: "Cloud contract renewal 進入 30 天決策窗口。" },
              { label: "SOP 狀態", placeholder: "Client-visible material policy 需要先完成人工邊界。" },
            ]}
            operationPlaceholder="介面已可操作策略決策、合約追蹤、SOP 邊界與 Agent 內部提案。"
            records={companyRecords}
            agentProposals={companyProposals}
            auditRows={companyAuditRows}
            settings={companySettings}
            highRisk
            highRiskNote="公司策略資料為高風險模組。策略內容、合約細節與內部決策均需人工確認後公開，Agent 不可主動分享。"
            privacyNote="公司策略資料不對 Client Portal、Research 或外部 Agent 公開。未明確標記為 client_visible 的文件均為內部機密。"
          />
        </main>
      </div>
    </ModuleGuard>
  )
}
