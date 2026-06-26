"use client"

import { HeartIcon } from "lucide-react"
import { AppHeader } from "@/components/layout/app-header"
import { ModuleGuard } from "@/components/layout/module-guard"
import {
  ModuleOperatingShell,
  type ModuleAgentProposal,
  type ModuleAuditRow,
  type ModuleOperatingRecord,
  type ModuleSettingRow,
} from "@/components/layout/module-operating-shell"
import { FitnessDashboard } from "@/components/life/fitness-dashboard"

const lifeRecords: ModuleOperatingRecord[] = [
  {
    id: "life-001",
    title: "今日能量與睡眠檢查",
    subtitle: "晨間狀態 · 私人紀錄",
    status: "active",
    priority: "P0",
    owner: "Owner",
    due: "今天",
    risk: "medium",
    description:
      "Life 模組把健康、節律與個人記憶放在 owner-only 操作面。這筆資料用來 rehearsing 每日狀態記錄流程。",
    nextAction: "記錄昨晚睡眠、今日能量、身體感受與最重要的一件事。",
    tags: ["daily", "sleep", "energy"],
    fields: [
      { label: "能量", value: "3 / 5" },
      { label: "睡眠", value: "6.5h / estimate" },
      { label: "可見性", value: "private" },
    ],
  },
  {
    id: "life-002",
    title: "體重與飲食週回顧",
    subtitle: "健康趨勢 · 等待 owner review",
    status: "review",
    priority: "P1",
    owner: "Owner",
    due: "週日",
    risk: "medium",
    description:
      "保留既有 FitnessDashboard 的輸入體驗，同時在操作 queue 中顯示週回顧與下一步。",
    nextAction: "補齊本週飲食特殊情況與體重趨勢，決定下週調整。",
    tags: ["fitness", "food", "weekly-review"],
    fields: [
      { label: "回顧窗口", value: "7 days" },
      { label: "資料狀態", value: "local prototype" },
      { label: "Agent", value: "suggestion only" },
    ],
  },
  {
    id: "life-003",
    title: "個人記憶：家人與重要事件",
    subtitle: "memory wall · owner-only",
    status: "active",
    priority: "P1",
    owner: "Owner",
    due: "本週",
    risk: "high",
    description:
      "個人記憶資料比一般任務更敏感；介面只提供本機操作與邊界設定，不會對外共享。",
    nextAction: "整理近期重要事件，標記哪些可被 LifeAgent 用於提醒，哪些永久私密。",
    tags: ["memory", "privacy", "family"],
    fields: [
      { label: "資料層級", value: "private / sensitive" },
      { label: "外部分享", value: "locked" },
      { label: "保留策略", value: "manual decision" },
    ],
  },
  {
    id: "life-004",
    title: "健康資料匯出規則",
    subtitle: "隱私政策 · 需正式 BFF",
    status: "blocked",
    priority: "P0",
    owner: "Owner",
    due: "待隱私策略",
    risk: "high",
    description:
      "健康與個人記憶資料不可在沒有明確 consent、欄位規則與審計之前匯出或提供給其他模組。",
    nextAction: "定義 Life privacy policy、Agent 可讀欄位與匯出 stop condition。",
    tags: ["privacy", "export", "blocked"],
    fields: [
      { label: "阻塞", value: "privacy BFF not selected" },
      { label: "預設", value: "no export" },
      { label: "審計", value: "required" },
    ],
  },
]

const lifeProposals: ModuleAgentProposal[] = [
  {
    id: "life-proposal-001",
    title: "今天先降低認知負荷",
    summary:
      "能量偏中低時，建議把 Work 今日目標壓到一個完成項，其他放進 review，不做自動排程。",
    confidence: 76,
    risk: "low",
    proposedAction: "新增本機草稿：今日只推進一件最重要的事",
  },
  {
    id: "life-proposal-002",
    title: "週回顧需要分開健康資料與情緒筆記",
    summary:
      "健康數據、飲食記錄與情緒筆記敏感度不同，正式 schema 應該拆開資料邊界。",
    confidence: 84,
    risk: "medium",
    proposedAction: "將 Life persistence 後續任務拆成 daily log、fitness、memory wall",
  },
]

const lifeAuditRows: ModuleAuditRow[] = [
  {
    id: "life-audit-001",
    time: "今天 08:10",
    actor: "Owner",
    action: "檢視今日能量",
    result: "private prototype row",
    tone: "neutral",
  },
  {
    id: "life-audit-002",
    time: "昨天 22:40",
    actor: "Agent",
    action: "產生週回顧提案",
    result: "等待 owner 決定",
    tone: "warn",
  },
  {
    id: "life-audit-003",
    time: "本週",
    actor: "System",
    action: "鎖定健康資料外部分享",
    result: "no export / no public output",
    tone: "good",
  },
]

const lifeSettings: ModuleSettingRow[] = [
  {
    id: "daily-checkin",
    label: "顯示每日 check-in",
    description: "在 Life 操作面顯示能量、睡眠與今日焦點。",
    enabled: true,
  },
  {
    id: "life-agent",
    label: "LifeAgent 可產生建議",
    description: "只產生 owner 可審閱建議，不自動寫入其他模組。",
    enabled: true,
  },
  {
    id: "cross-module",
    label: "允許其他模組讀取生活資料",
    description: "生活與健康資料預設不得被 Work、Research、Client Portal 或外部 Agent 讀取。",
    enabled: false,
    locked: true,
  },
  {
    id: "export",
    label: "允許健康資料匯出",
    description: "需要正式 privacy policy、consent 與審計後才能啟用。",
    enabled: false,
    locked: true,
  },
]

export default function LifePage() {
  return (
    <ModuleGuard moduleKey="life">
      <div className="flex h-full flex-col overflow-hidden bg-background">
        <AppHeader title="生活" description="健康、節律與個人記憶" />

        <main className="flex-1 overflow-y-auto">
          <ModuleOperatingShell
            icon={HeartIcon}
            operationLabel="生活節律"
            operationDescription="每日能量、健康追蹤、節律回顧與個人記憶邊界"
            overviewItems={[
              { label: "今日能量", placeholder: "目前以 3/5 作為 rehearsal 狀態；可新增本機草稿更新。" },
              { label: "今日焦點", placeholder: "把 Work / Life 交界壓成一件最重要的事，避免過載。" },
              { label: "本週回顧", placeholder: "體重、飲食、睡眠與情緒筆記分開處理，預設 owner-only。" },
            ]}
            operationPlaceholder="介面已可操作每日 check-in、健康週回顧、個人記憶、LifeAgent 提案與隱私邊界。"
            records={lifeRecords}
            agentProposals={lifeProposals}
            auditRows={lifeAuditRows}
            settings={lifeSettings}
            highRisk
            highRiskNote="生活、健康與個人記憶屬於高隱私資料。Agent 只能提案，不可自動同步、匯出或寫入其他模組。"
            privacyNote="生活模組為私人資料。健康、節律與個人記憶資料不對 Client Portal、Research、Work 或任何外部系統公開。"
          >
            <section className="rounded-lg border bg-background">
              <div className="border-b px-4 py-3">
                <h3 className="text-sm font-semibold">Fitness tracker</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  既有健康儀表板保留在 Life 總覽；目前仍是本機 prototype，不寫入正式資料。
                </p>
              </div>
              <div className="p-4">
                <FitnessDashboard />
              </div>
            </section>
          </ModuleOperatingShell>
        </main>
      </div>
    </ModuleGuard>
  )
}
