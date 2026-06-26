"use client"

import { UsersIcon } from "lucide-react"
import { AppHeader } from "@/components/layout/app-header"
import { ModuleGuard } from "@/components/layout/module-guard"
import {
  ModuleOperatingShell,
  type ModuleAgentProposal,
  type ModuleAuditRow,
  type ModuleOperatingRecord,
  type ModuleSettingRow,
} from "@/components/layout/module-operating-shell"

const chamberRecords: ModuleOperatingRecord[] = [
  {
    id: "chamber-001",
    title: "王理事 ESG lunch follow-up",
    subtitle: "關係維護 · 上次互動 6 天前",
    status: "active",
    priority: "P0",
    owner: "Owner",
    due: "明天",
    risk: "medium",
    description:
      "PRD 推論的商會核心工作：把理事關係、互動脈絡與下一步邀約集中在 CRM 操作面。",
    nextAction: "寄出 lunch follow-up，附上 Lisa 報表案例與下次活動邀請。",
    tags: ["director", "follow-up", "esg"],
    fields: [
      { label: "關係強度", value: "warm / trusted" },
      { label: "最後互動", value: "2026-06-15 LINE" },
      { label: "外部共享", value: "disabled" },
    ],
  },
  {
    id: "chamber-002",
    title: "7/18 活動講者候選名單",
    subtitle: "活動營運 · 需要確認出席",
    status: "review",
    priority: "P1",
    owner: "Owner",
    due: "本週",
    risk: "medium",
    description:
      "把商會活動的人、議題、出席狀態與講者邀約放在同一個操作 queue，避免散在 LINE 與文件中。",
    nextAction: "確認 3 位講者候選人的可出席時段與議題邊界。",
    tags: ["event", "speaker", "attendance"],
    fields: [
      { label: "候選講者", value: "3" },
      { label: "活動狀態", value: "planning" },
      { label: "下一個 gate", value: "manual outreach" },
    ],
  },
  {
    id: "chamber-003",
    title: "商會 LINE 關係摘要",
    subtitle: "AI 感知草稿 · 不含原始個資輸出",
    status: "active",
    priority: "P1",
    owner: "Agent proposal",
    due: "今天",
    risk: "medium",
    description:
      "以 UI 方式呈現未來 AI 關係感知的產物：只顯示關係摘要、提醒與下一步，不公開原始私訊。",
    nextAction: "Owner 審閱摘要是否準確，再決定是否轉成正式互動紀錄。",
    tags: ["line", "relationship", "agent-review"],
    fields: [
      { label: "資料來源", value: "manual / future source" },
      { label: "PII", value: "owner-only" },
      { label: "Agent 權限", value: "proposal only" },
    ],
  },
  {
    id: "chamber-004",
    title: "理事個資匯出規則",
    subtitle: "資料邊界 · 需正式策略",
    status: "blocked",
    priority: "P0",
    owner: "Owner",
    due: "待規則",
    risk: "high",
    description:
      "商會 CRM 會碰到聯絡人與互動資料；匯出或對外分享必須先有欄位級規則。",
    nextAction: "定義可匯出欄位、信任等級與人工批准流程。",
    tags: ["privacy", "export", "approval"],
    fields: [
      { label: "阻塞", value: "PII boundary" },
      { label: "可見性", value: "owner only" },
      { label: "外部 Agent", value: "disabled" },
    ],
  },
]

const chamberProposals: ModuleAgentProposal[] = [
  {
    id: "chamber-proposal-001",
    title: "把王理事 follow-up 轉成 Work 任務草稿",
    summary:
      "這個 follow-up 可能帶出合作機會，但不應自動建立正式 Work Project；先建立本機任務草稿讓 owner 選擇。",
    confidence: 83,
    risk: "medium",
    proposedAction: "建立本機 follow-up 草稿，標記為 owner review",
  },
  {
    id: "chamber-proposal-002",
    title: "活動講者名單用三段狀態管理",
    summary:
      "建議用候選、已邀請、已確認三段狀態，搭配最後互動時間與下一步提醒。",
    confidence: 78,
    risk: "low",
    proposedAction: "將活動候選名單拆成可篩選的 CRM queue",
  },
]

const chamberAuditRows: ModuleAuditRow[] = [
  {
    id: "chamber-audit-001",
    time: "今天 11:05",
    actor: "Owner",
    action: "檢視商會關係 queue",
    result: "4 筆 prototype CRM rows",
    tone: "neutral",
  },
  {
    id: "chamber-audit-002",
    time: "昨天 21:30",
    actor: "Agent",
    action: "產生 follow-up 建議",
    result: "proposal-only / owner review",
    tone: "warn",
  },
  {
    id: "chamber-audit-003",
    time: "本週",
    actor: "System",
    action: "阻擋聯絡人對外分享",
    result: "external sharing locked",
    tone: "good",
  },
]

const chamberSettings: ModuleSettingRow[] = [
  {
    id: "relationship-signals",
    label: "顯示關係熱度",
    description: "在操作面顯示 warm / trusted / cold 等本機關係訊號。",
    enabled: true,
  },
  {
    id: "agent-summaries",
    label: "允許 Agent 產生互動摘要",
    description: "Agent 只能產生摘要與下一步提案，不能自動傳訊或匯出名單。",
    enabled: true,
  },
  {
    id: "external-export",
    label: "允許聯絡人匯出",
    description: "涉及 PII，需欄位級政策與人工確認後才能啟用。",
    enabled: false,
    locked: true,
  },
]

export default function ChamberPage() {
  return (
    <ModuleGuard moduleKey="chamber">
      <div className="flex flex-col h-full overflow-hidden">
        <AppHeader title="商會" description="理事 CRM 與活動管理" />
        <main className="flex-1 overflow-y-auto">
          <ModuleOperatingShell
            icon={UsersIcon}
            operationLabel="理事聯絡人"
            operationDescription="理事名單、關係狀態與互動記錄"
            overviewItems={[
              { label: "待跟進聯絡人", placeholder: "王理事需要明天 follow-up；3 位講者候選待確認。" },
              { label: "即將舉辦活動", placeholder: "7/18 活動處於 planning，講者與出席名單待整理。" },
              { label: "關係強度概覽", placeholder: "warm 1、trusted 1、review 2；全部 owner-only。" },
            ]}
            operationPlaceholder="介面已可操作聯絡人 queue、活動籌備、Agent 摘要提案與隱私邊界。"
            records={chamberRecords}
            agentProposals={chamberProposals}
            auditRows={chamberAuditRows}
            settings={chamberSettings}
            privacyNote="聯絡人資料不對 Client Portal 或 Research 公開。外部共享前需明確標記。"
          />
        </main>
      </div>
    </ModuleGuard>
  )
}
