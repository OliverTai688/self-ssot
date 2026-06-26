import type { ProjectPhase } from "@/types/work"

export interface ParsedProjectPhase {
  phase: ProjectPhase
  label: string
  startDate: string
  endDate: string
  milestones: { title: string; date: string }[]
}

export interface ProjectInitResult {
  name?: string
  clientName?: string
  description?: string
  startDate?: string
  dueDate?: string
  phases: ParsedProjectPhase[]
  keyDeliverables: string[]
  confidence: "high" | "medium" | "low"
}

// Phase 1 mock — simulates AI document parsing with a realistic delay
export async function parseProjectDocuments(
  _files: File[],
  hint?: string
): Promise<ProjectInitResult> {
  await new Promise((resolve) => setTimeout(resolve, 2200))

  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() + 7)

  const fmt = (d: Date) => d.toISOString().split("T")[0]
  const addDays = (d: Date, n: number) => {
    const r = new Date(d)
    r.setDate(r.getDate() + n)
    return r
  }

  return {
    name: hint || undefined,
    clientName: undefined,
    description:
      "根據需求書與合約文件，本專案涵蓋需求確認、設計執行、交付審核等完整流程。",
    startDate: fmt(start),
    dueDate: fmt(addDays(start, 90)),
    phases: [
      {
        phase: "discovery",
        label: "需求探索",
        startDate: fmt(start),
        endDate: fmt(addDays(start, 14)),
        milestones: [
          { title: "需求確認會議", date: fmt(addDays(start, 7)) },
          { title: "範疇確認簽核", date: fmt(addDays(start, 14)) },
        ],
      },
      {
        phase: "planning",
        label: "規劃設計",
        startDate: fmt(addDays(start, 15)),
        endDate: fmt(addDays(start, 35)),
        milestones: [
          { title: "設計稿初稿", date: fmt(addDays(start, 28)) },
          { title: "客戶回饋確認", date: fmt(addDays(start, 35)) },
        ],
      },
      {
        phase: "execution",
        label: "執行開發",
        startDate: fmt(addDays(start, 36)),
        endDate: fmt(addDays(start, 70)),
        milestones: [
          { title: "Beta 版本完成", date: fmt(addDays(start, 56)) },
          { title: "UAT 驗收", date: fmt(addDays(start, 70)) },
        ],
      },
      {
        phase: "review",
        label: "審查交付",
        startDate: fmt(addDays(start, 71)),
        endDate: fmt(addDays(start, 84)),
        milestones: [
          { title: "最終交付物提交", date: fmt(addDays(start, 80)) },
          { title: "客戶驗收完成", date: fmt(addDays(start, 84)) },
        ],
      },
    ],
    keyDeliverables: ["需求確認書", "設計稿", "完整原始碼", "使用者手冊"],
    confidence: "medium",
  }
}
