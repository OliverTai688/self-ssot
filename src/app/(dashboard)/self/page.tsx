"use client";

import { UserIcon } from "lucide-react"
import { AppHeader } from "@/components/layout/app-header"
import { ModuleGuard } from "@/components/layout/module-guard"
import {
  ModuleOperatingShell,
  type ModuleAgentProposal,
  type ModuleAuditRow,
  type ModuleOperatingRecord,
  type ModuleSettingRow,
} from "@/components/layout/module-operating-shell"
import { useIngestion } from "@/lib/context/ingestion-context"

const preloadedReflections: ModuleOperatingRecord[] = [
  {
    id: "refl-001",
    title: "心智模型與決策路徑反思",
    subtitle: "深度整理 · 個人反思",
    status: "active",
    priority: "P0",
    owner: "Owner",
    due: "今天",
    risk: "low",
    description: "反思今日在處理緊急專案時的決策流程。發現在時間壓力下容易陷入單點思考，應該在行動前增加一個 5 分鐘的緩衝評估期。",
    nextAction: "在下一次重大決策時，主動開啟決策樹評估，並將評估記錄在此。",
    tags: ["mindset", "decision", "daily"],
    fields: [
      { label: "情緒感受", value: "平靜中帶有警覺" },
      { label: "思考維度", value: "決策路徑" },
      { label: "可見性", value: "僅限自己" },
    ],
  },
  {
    id: "refl-002",
    title: "多工切換的認知負荷分析",
    subtitle: "每週回顧 · 工作反思",
    status: "done",
    priority: "P1",
    owner: "Owner",
    due: "已完成",
    risk: "low",
    description: "本週多次在寫扣、回覆 LINE 和撰寫研究論文之間频繁切換，導致下半天專注力崩潰。實驗：上午完全關閉通訊軟體，專注於單一核心任務。",
    nextAction: "評估上午專注時間從 1.5h 提升到 3h 的效果，並於下週日做統計。",
    tags: ["productivity", "focus", "weekly"],
    fields: [
      { label: "睡眠相關", value: "影響專注" },
      { label: "改善方向", value: "任務阻斷" },
    ],
  },
]

const selfSettings: ModuleSettingRow[] = [
  {
    id: "auto-ingest-reflection",
    label: "自動整理反思日記",
    description: "開啟後，反思對話匯入時 AI 會自動整理成結構化日記。",
    enabled: true,
  },
  {
    id: "privacy-mode",
    label: "極致隱私保護",
    description: "反思與自我對話內容預設在本機加密，絕不上傳外部雲端或共享給協作者。",
    enabled: true,
    locked: true,
  },
]

const selfAuditRows: ModuleAuditRow[] = [
  {
    id: "self-audit-001",
    time: "今天 09:20",
    actor: "Owner",
    action: "新增心智模型反思",
    result: "成功儲存於本地加密庫",
    tone: "good",
  },
]

export default function SelfPage() {
  const { rawSourceItems, proposals } = useIngestion()

  // 1. Map raw source items that belong to reflection/self into records
  const dynamicRecords: ModuleOperatingRecord[] = rawSourceItems
    .filter((item) => {
      const title = item.title || ""
      const rawText = item.rawText || ""
      return title.includes("反思") || title.includes("自己") || rawText.includes("反思")
    })
    .map((item) => {
      const title = item.title || "無標題對話"
      const rawText = item.rawText || ""
      return {
        id: item.id,
        title: title.length > 30 ? title.slice(0, 27) + "..." : title,
        subtitle: "對話紀錄 · 來源分析匯入",
        status: "done" as const,
        priority: "P2",
        owner: "Owner",
        due: "已匯入",
        risk: "low",
        description: rawText,
        nextAction: "已歸檔至反思歷史，可點擊「紀錄」分頁進行全文檢索。",
        tags: ["reflection", "imported"],
        fields: [
          { label: "擷取時間", value: item.capturedAt.slice(0, 10) },
          { label: "來源類型", value: "對話擷取" },
        ],
      }
    })

  const allRecords = [...preloadedReflections, ...dynamicRecords]

  // 2. Map pending proposals for Self/Reflection
  const dynamicProposals: ModuleAgentProposal[] = proposals
    .filter(
      (p) =>
        p.status === "pending" &&
        (p.suggestedPlacement?.includes("自己") || p.detectedType?.includes("反思") || p.suggestedPlacement?.includes("反思"))
    )
    .map((p) => ({
      id: p.id,
      title: p.detectedType || "反思對話建議",
      summary: p.summary,
      confidence: p.confidence === "high" ? 92 : p.confidence === "medium" ? 78 : 55,
      risk: "low",
      proposedAction: p.recommendation,
    }))

  const activeAuditRows = [
    ...selfAuditRows,
    ...rawSourceItems
      .filter((item) => {
        const title = item.title || ""
        return title.includes("反思") || title.includes("自己")
      })
      .map((item, idx) => ({
        id: `self-audit-dyn-${idx}`,
        time: item.capturedAt.slice(11, 16),
        actor: "AI",
        action: "自動辨識反思內容並導入",
        result: "已生成審查提案",
        tone: "neutral" as const,
      })),
  ]

  return (
    <ModuleGuard moduleKey="self">
      <div className="flex h-full flex-col overflow-hidden bg-background">
        <AppHeader title="自己" description="個人反思與自我整理專區" />

        <main className="flex-1 overflow-y-auto">
          <ModuleOperatingShell
            icon={UserIcon}
            operationLabel="反思整理"
            operationDescription="記錄心智模型、情緒脈絡與每週自我總結"
            overviewItems={[
              { label: "目前心境", placeholder: "良好。已建立 5 分鐘決策緩衝機制以減輕負載。" },
              { label: "本週主旨", placeholder: "上午時間專注單一任務，隔離多工干擾。" },
            ]}
            operationPlaceholder="此模組已連結 AI Input，任何「反思」模式的對話紀錄匯入後，AI 會在此分頁生成日記摘要建議。"
            records={allRecords}
            agentProposals={dynamicProposals}
            auditRows={activeAuditRows}
            settings={selfSettings}
            moduleKey="self"
            agentLabel="自我AI"
          />
        </main>
      </div>
    </ModuleGuard>
  )
}
